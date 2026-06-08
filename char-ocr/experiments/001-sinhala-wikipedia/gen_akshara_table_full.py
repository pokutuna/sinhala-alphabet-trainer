# /// script
# requires-python = ">=3.11"
# dependencies = ["regex", "uharfbuzz", "pandas"]
# ///
# ルール&文字セットから全 akshara 組み合わせ(L1-L7)を列挙し、1枚の表にする。
#
# 各行の情報:
#   - 結合した akshara(NFC)とコードポイント・生成レベル
#   - 視覚統合キー visual_key = Noto の shape 結果 gid 列(エンコード違い=ZWJ有無/split
#     matra を畳む。同じ見た目は同じ key)
#   - フォント描画可否 renderable + 専用合字融合フラグ fused_{noto,mn,sangam}
#     (実在の弱シグナル: 実在する結合だけ合字を持つ傾向)
#   - 分解パーツ parts_nfd(Unicode 素片の名前)
#   - ②メイングリフ main_glyph(修飾を剥がした素の土台)
#   - ③修飾パーツ mod_parts(位置つき。例 "u@BELOW")← ②③ヘッドのクラスに対応
#   - 読み reading(ISO 15919。app/data/sinhala.json を辞書に組み立て)
#   - 実在裏取り wiki_freq(Sinhala Wikipedia 集計)・in_454(手書きデータ)
#
# 出力: akshara_table_full.csv (experiments/001 配下・コミット対象)
import csv
import json
import os
import sys
import unicodedata as ud

import regex  # noqa: F401  (_akshara が要求)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")  # char-ocr/
REPO = os.path.join(ROOT, "..")  # repo root
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import _akshara as A  # noqa: E402

FONT = os.path.join(ROOT, "tmp", "NotoSansSinhala.ttf")
FONT_PATHS = {
    "noto": FONT,
    "mn": "/System/Library/Fonts/Supplemental/Sinhala MN.ttc",
    "sangam": "/System/Library/Fonts/Supplemental/Sinhala Sangam MN.ttc",
}
SINHALA_JSON = os.path.join(REPO, "app", "data", "sinhala.json")
WIKI_FREQ = os.path.join(HERE, "akshara_freq_wikipedia.csv")
OUT = os.path.join(HERE, "akshara_table_full.csv")

HAL = "්"
ZWJ = "‍"

# Q8: u/ū が角型化する子音(B群)/ 特殊合字(C群)。base コードポイント集合で決定振り。
B_SET = set("කගඟතභශ")  # 角型
C_SET = set("රළ")  # 特殊合字


def assigned(cp):
    try:
        ud.name(chr(cp))
        return True
    except ValueError:
        return False


IV = [chr(c) for c in range(0x0D85, 0x0D97) if assigned(c)]  # 独立母音 18
C = [chr(c) for c in range(0x0D9A, 0x0DC7) if assigned(c)]  # 子音 41
DV = [chr(c) for c in range(0x0DCF, 0x0DE0) if assigned(c)]  # 母音記号 17(0DCF..0DDF)
VM = ["ං", "ඃ"]  # anusvara / visarga


def load_readings():
    """app/data/sinhala.json から glyph→rom 辞書を組む(子音/独立母音/母音記号)。"""
    with open(SINHALA_JSON, encoding="utf-8") as fp:
        d = json.load(fp)
    cons_rom = {c["glyph"]: c["rom"] for c in d["consonants"]}
    iv_rom = {v["glyph"]: v["rom"] for v in d["independent_vowels"]}
    sign_rom = {s["sign"]: s["rom"] for s in d["vowel_signs"] if s.get("sign")}
    sign_pos = {
        s["sign"]: s.get("position", "") for s in d["vowel_signs"] if s.get("sign")
    }
    return cons_rom, iv_rom, sign_rom, sign_pos


def reading_of(ak, cons_rom, iv_rom, sign_rom):
    """素朴な ISO 15919 風転写。base子音(rom 末尾 a を子音単独なら除去)+ 母音記号 rom。
    辞書に無い片は U+XXXX を出す(sinhala.json は Unicode 全割当を網羅しないため)。"""
    roles = A.decompose_roles(ak)
    base = roles["base"]
    if base is None:
        return ""
    # 独立母音が base
    if base in iv_rom:
        out = iv_rom[base]
    elif base in cons_rom:
        out = cons_rom[base]  # "ka" 等(固有 a 込み)
    else:
        out = f"U+{ord(base):04X}"
    # 後続子音(結合)
    for nx in roles["nexts"]:
        r = cons_rom.get(nx, f"U+{ord(nx):04X}")
        out += "-" + r
    # hal止め: 末尾 a を落とす
    if roles["hal"] and out.endswith("a"):
        out = out[:-1]
    # 母音記号: 子音の固有 a を母音記号 rom で置換
    posts = roles["posts"]
    if posts:
        # split matra 等は NFC に戻して sign 辞書引き
        sign_str = ud.normalize("NFC", "".join(posts))
        srom = sign_rom.get(sign_str)
        if srom is not None:
            if out.endswith("a"):
                out = out[:-1] + srom
            else:
                out += srom
        else:
            # anusvara/visarga 等
            for p in posts:
                if p == "ං":
                    out += "ṃ"
                elif p == "ඃ":
                    out += "ḥ"
                else:
                    out += sign_rom.get(p, f"+U+{ord(p):04X}")
    return out


def u_shape_label(base):
    """Q8: post に u/ū があるときの視覚形ラベル(base 集合で決定振り)。"""
    if base in B_SET:
        return "u_角型"
    if base in C_SET:
        return "u_合字"
    return "u_下垂"


def mod_parts_of(ak, sign_pos):
    """③修飾パーツを位置つきで返す。Q8 の u は視覚形で割る。"""
    roles = A.decompose_roles(ak)
    base = roles["base"]
    parts = []
    if roles["hal"]:
        parts.append("hal@TOP")
    for p in roles["posts"]:
        name = ud.name(p, f"U+{ord(p):04X}")
        # u/ū は視覚形ラベルに割る
        if p in ("ු", "ූ"):  # u, ū
            tag = u_shape_label(base)
            suffix = "ū" if p == "ූ" else "u"
            parts.append(f"{tag}({suffix})@BELOW")
        elif p == "ං":
            parts.append("anusvara@ABOVE")
        elif p == "ඃ":
            parts.append("visarga@RIGHT")
        else:
            # NFC に戻して position 辞書引き(split片は個別 sign 名で)
            pos = sign_pos.get(p, "")
            posq = {
                "right": "RIGHT",
                "top": "ABOVE",
                "left": "PRE",
                "bottom": "BELOW",
                "none": "POST",
            }.get(pos, "POST")
            parts.append(f"{name}@{posq}")
    return " + ".join(parts)


def fonts_load():
    out = {}
    for k, p in FONT_PATHS.items():
        if os.path.exists(p):
            out[k] = A.load_font(p)
    return out


def main():
    cons_rom, iv_rom, sign_rom, sign_pos = load_readings()
    fonts = fonts_load()
    noto = fonts["noto"]

    # Wikipedia 頻度
    wiki = {}
    if os.path.exists(WIKI_FREQ):
        with open(WIKI_FREQ, encoding="utf-8") as fp:
            r = csv.DictReader(fp)
            for row in r:
                wiki[ud.normalize("NFC", row["akshara"])] = int(row["freq"])

    # 454
    sys.path.insert(0, os.path.join(ROOT, "data", "labels"))
    try:
        from handwritten_constants import TRUE_LABEL

        set454 = set(ud.normalize("NFC", x.strip()) for x in TRUE_LABEL[:454])
    except Exception:
        set454 = set()

    # ルール生成(レベルごと)
    population = {}  # ak -> level (最初に出た level を採用)

    def add(ak, level):
        ak = ud.normalize("NFC", ak)
        if ak and ak not in population:
            population[ak] = level

    for v in IV:
        add(v, "L1_iv")
    for c in C:
        add(c, "L2_cons")
    for c in C:
        add(c + HAL, "L3_hal")
    for c in C:
        for dv in DV:
            add(c + dv, "L4_cons_dv")
    for c in C:
        for m in VM:
            add(c + m, "L5_cons_vm")
    # L6: ZWJ 結合(ra/ya 結合)+ 全子音ペア
    for c1 in C:
        for c2 in C:
            add(c1 + HAL + ZWJ + c2, "L6_zwj_conj")
    # L7: 横並び結合(C+hal+C)
    for c1 in C:
        for c2 in C:
            add(c1 + HAL + c2, "L7_linear_conj")
    # L8: 生産的な ZWJ 結合(rakaransaya `ර`/ yansaya `ය`)+ 母音記号 + hal止め。
    #     454 実データ・Wikipedia 高頻度(`ක්‍රි` 40756 等)で実在。全子音ペア×DV の
    #     爆発(28577)は避け、ra/ya 結合に限る(それ以外の結合+母音記号は稀)。
    for c1 in C:
        for c2 in ("ර", "ය"):
            stem = c1 + HAL + ZWJ + c2
            for dv in DV:
                add(stem + dv, "L8_zwj_conj_dv")
            add(stem + HAL, "L8_zwj_conj_dv")  # rakaransaya/yansaya の hal止め

    rows = []
    for ak, level in population.items():
        gl = A.shape(ak, noto)
        rend = A.renderable(gl)
        visual_key = "-".join(str(g["gid"]) for g in gl)
        roles = A.decompose_roles(ak)
        nfd = ud.normalize("NFD", ak)
        # フォント別融合
        fused = {}
        for k, f in fonts.items():
            g = A.shape(ak, f)
            n = len(g)
            fused[k] = bool(ZWJ in ak and n == 1)
        row = {
            "akshara": ak,
            "codepoints": " ".join(f"U+{ord(c):04X}" for c in ak),
            "level": level,
            "visual_key": visual_key,
            "glyph_count_noto": len(gl),
            "renderable": rend,
            "fused_noto": fused.get("noto"),
            "fused_mn": fused.get("mn"),
            "fused_sangam": fused.get("sangam"),
            "main_glyph": roles["base"] or "",
            "mod_parts": mod_parts_of(ak, sign_pos),
            "nexts": " ".join(roles["nexts"]),
            "parts_nfd": " + ".join(ud.name(c, f"U+{ord(c):04X}") for c in nfd),
            "reading": reading_of(ak, cons_rom, iv_rom, sign_rom),
            "wiki_freq": wiki.get(ak, 0),
            "in_454": ak in set454,
        }
        rows.append(row)

    cols = [
        "akshara",
        "codepoints",
        "level",
        "visual_key",
        "glyph_count_noto",
        "renderable",
        "fused_noto",
        "fused_mn",
        "fused_sangam",
        "main_glyph",
        "mod_parts",
        "nexts",
        "parts_nfd",
        "reading",
        "wiki_freq",
        "in_454",
    ]
    # 並び: renderable 優先 → wiki_freq 降順
    rows.sort(key=lambda r: (not r["renderable"], -r["wiki_freq"]))
    with open(OUT, "w", encoding="utf-8", newline="") as fp:
        w = csv.DictWriter(fp, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    # サマリ
    n = len(rows)
    rend = sum(1 for r in rows if r["renderable"])
    attested = sum(1 for r in rows if r["wiki_freq"] > 0)
    att5 = sum(1 for r in rows if r["wiki_freq"] >= 5)
    in454 = sum(1 for r in rows if r["in_454"])
    vk = len(set(r["visual_key"] for r in rows if r["renderable"]))
    print(f"全 akshara(規則生成): {n}")
    print(f"  renderable           : {rend}")
    print(f"  wiki_freq>0 (実在)   : {attested}")
    print(f"  wiki_freq>=5         : {att5}")
    print(f"  in_454               : {in454}")
    print(f"  視覚統合後クラス数(renderable, visual_key distinct): {vk}")
    print("\nレベル別 (規則生成数 / うち wiki実在 / うち renderable):")
    from collections import Counter

    lv = Counter(r["level"] for r in rows)
    for level in [
        "L1_iv",
        "L2_cons",
        "L3_hal",
        "L4_cons_dv",
        "L5_cons_vm",
        "L6_zwj_conj",
        "L7_linear_conj",
        "L8_zwj_conj_dv",
    ]:
        tot = lv.get(level, 0)
        att = sum(1 for r in rows if r["level"] == level and r["wiki_freq"] > 0)
        rn = sum(1 for r in rows if r["level"] == level and r["renderable"])
        print(f"  {level:16s} {tot:5d} / 実在 {att:5d} / 描画 {rn:5d}")
    print(f"\nwrote: {OUT}")


if __name__ == "__main__":
    main()
