# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "regex", "uharfbuzz"]
# ///
# 実在する akshara を1枚の表に書き出す。
#   - 実在性 : SinOCR コーパスの出現頻度
#   - 手書き : Kaggle 454 に含まれるか
#   - フォント: Noto Sans Sinhala で描けるか(◌/notdef が出ないか)
#   - 分解   : HarfBuzz シェーピングの (gid, グリフ名, 位置) 列 + 配置パターン
#   - 素部品 : NFD 分解した素パーツの Unicode 名
#
# 目的: 「実在する文字 × 分解結果(配置込み) × フォント描画可否」を一望し、
#       合成データの母集団選定・454の穴・(gid,位置)分類の検証に使う。
# 出力: tmp/akshara_table.csv
import os
import sys
import regex
import unicodedata as ud
from collections import Counter

import pandas as pd
import uharfbuzz as hb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
FONT = os.path.join(ROOT, "tmp", "NotoSansSinhala.ttf")
OUT = os.path.join(ROOT, "tmp", "akshara_table.csv")

INVALID = {"uni25CC", "space", ".notdef"}
ZWJ = 0x200D

# 描画フォント。Noto を主、Sinhala MN/Sangam を比較用に持つ。
# 融合(ZWJ結合が1グリフ化)はフォント依存なので複数で測る。
# Sinhala MN は ra結合を「右肩の小印」で描く別流儀 = 手書きの書き方バリエーション。
FONT_PATHS = {
    "noto": (FONT, 0),
    "mn": ("/System/Library/Fonts/Supplemental/Sinhala MN.ttc", 0),
    "sangam": ("/System/Library/Fonts/Supplemental/Sinhala Sangam MN.ttc", 0),
}


def load_font(path):
    with open(path, "rb") as fp:
        return hb.Font(hb.Face(fp.read()))


fonts = {}
for k, (path, _idx) in FONT_PATHS.items():
    if os.path.exists(path):
        fonts[k] = load_font(path)
font = fonts["noto"]


def split_aksharas(text):
    """hal(0DCA)/ZWJ(200D) で終わるクラスタは次と連結し、結合子音を1 akshara に保つ。
    素朴な \\X(拡張書記素クラスタ)だと結合子音が2片に割れるので連結ルールが必須。"""
    cl = regex.findall(r"\X", text)
    out, buf = [], ""
    for x in cl:
        if not any(0x0D80 <= ord(c) <= 0x0DFF or ord(c) == 0x200D for c in x):
            if buf:
                out.append(buf)
                buf = ""
            continue
        buf += x
        if x and ord(x[-1]) in (0x0DCA, 0x200D):
            continue
        out.append(buf)
        buf = ""
    if buf:
        out.append(buf)
    return out


def shape(s, fnt=None):
    fnt = fnt or font
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    hb.shape(fnt, buf, {})
    glyphs = []
    for i, p in zip(buf.glyph_infos, buf.glyph_positions):
        glyphs.append(
            {
                "gid": i.codepoint,
                "name": fnt.get_glyph_name(i.codepoint) or f"gid{i.codepoint}",
                "y": p.y_offset,
                "adv": p.x_advance,
                "notdef": i.codepoint == 0,
            }
        )
    return glyphs


def place(glyphs):
    """HarfBuzz の返却順(reorder 済み視覚順)と advance で位置を判定する。
    x 座標は使わない(prebase kombuva は adv=0/x=0 で base と同じ x になる)。"""
    if not glyphs:
        return []
    base_i = next((i for i, g in enumerate(glyphs) if g["adv"] > 0), 0)
    tagged = []
    for i, g in enumerate(glyphs):
        if i == base_i:
            pos = "BASE"
        elif i < base_i:
            pos = "PRE"
        elif g["adv"] > 0:
            pos = "NEXT"
        elif g["y"] > 0:
            pos = "ABOVE"
        elif g["y"] < 0:
            pos = "BELOW"
        else:
            pos = "POST"
        tagged.append((g, pos))
    return tagged


def renderable(glyphs):
    real = [g for g in glyphs if not g["notdef"] and g["name"] not in INVALID]
    bad = any(g["notdef"] for g in glyphs) or any(
        g["name"] == "uni25CC" for g in glyphs
    )
    return bool(real) and not bad


def part_name(c):
    try:
        return ud.name(c)
    except ValueError:
        return f"U+{ord(c):04X}"


def load_corpus_freq():
    base = os.path.join(ROOT, "data", "corpus", "sinocr")
    texts = []
    for split in ["train", "test"]:
        df = pd.read_csv(os.path.join(base, split, "data.csv"))
        texts += [str(t) for t in df["text"].tolist()]
    return Counter(ud.normalize("NFC", ak) for t in texts for ak in split_aksharas(t))


def load_454():
    sys.path.insert(0, os.path.join(ROOT, "data", "labels"))
    from handwritten_constants import TRUE_LABEL

    return set(ud.normalize("NFC", l.strip()) for l in TRUE_LABEL[:454])


def main():
    freq = load_corpus_freq()
    set454 = load_454()

    # 母集団 = コーパス実在 akshara ∪ 454 ラベル(454 にしか無いものも拾う)
    population = set(freq) | set454

    rows = []
    for ak in population:
        glyphs = shape(ak)
        tagged = place(glyphs)
        decomp = " ".join(f"{g['gid']}:{g['name']}@{pos}" for g, pos in tagged)
        pattern = "+".join(pos for _, pos in tagged) if tagged else "EMPTY"
        nfd = ud.normalize("NFD", ak)

        # ZWJ結合か(コードポイント由来 = フォント非依存の本質)
        is_zwj = ZWJ in (ord(c) for c in ak)
        # 各フォントでのグリフ数と「ZWJ結合が1グリフに融合するか」
        per_font = {}
        for k, fnt in fonts.items():
            g = shape(ak, fnt)
            per_font[k] = (len(g), renderable(g))

        row = {
            "akshara": ak,
            "codepoints": " ".join(f"U+{ord(c):04X}" for c in ak),
            "corpus_freq": freq.get(ak, 0),
            "in_454": ak in set454,
            "renderable": renderable(glyphs),
            "glyph_count": len(glyphs),
            "placement": pattern,
            "decomp_gid_pos": decomp,
            "parts_nfd": " + ".join(part_name(c) for c in nfd),
            # フラグ: ZWJ結合(フォント非依存)
            "is_zwj_conjunct": is_zwj,
        }
        # フォント別: グリフ数 + 融合フラグ(ZWJ結合かつ1グリフ=完全融合)
        for k in FONT_PATHS:
            n, rend = per_font.get(k, (None, None))
            row[f"glyphs_{k}"] = n
            row[f"fused_{k}"] = (is_zwj and n == 1) if n is not None else None
        rows.append(row)

    df = pd.DataFrame(rows).sort_values(
        ["renderable", "corpus_freq"], ascending=[False, False]
    )
    df.to_csv(OUT, index=False)

    # サマリ
    print(f"母集団 akshara 数: {len(df)}  (コーパス {len(freq)} ∪ 454 {len(set454)})")
    print(f"  描ける(renderable=True) : {df['renderable'].sum()}")
    print(f"  描けない                : {(~df['renderable']).sum()}")
    print(f"  454 に含まれる           : {df['in_454'].sum()}")
    print(f"  コーパス頻度>0           : {(df['corpus_freq'] > 0).sum()}")
    print("\n配置パターン分布(描けるもののみ):")
    sub = df[df["renderable"]]
    for pat, c in sub["placement"].value_counts().items():
        print(f"  {pat:24s} {c:4d}")

    print(f"\nZWJ結合 akshara: {df['is_zwj_conjunct'].sum()}")
    print("フォント別「1グリフに完全融合する ZWJ結合」の数(=特殊融合グリフ):")
    for k in FONT_PATHS:
        col = f"fused_{k}"
        if col in df:
            print(f"  {k:8s}: {df[col].fillna(False).sum()}")
    print(f"\n書き出し: {OUT}")


if __name__ == "__main__":
    main()
