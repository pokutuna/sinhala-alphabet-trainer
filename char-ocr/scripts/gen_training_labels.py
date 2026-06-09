# /// script
# requires-python = ">=3.11"
# dependencies = ["regex", "uharfbuzz"]
# ///
# 学習ステップ ①②③ が共通の語彙辞書のもとで使える正解ラベルを生成する。
# 画像は一切読まない(ラベルのみ)。フォルダ番号 → akshara → 役割分解 → ID 化。
#
# 入力:
#   data/labels/handwritten_constants.py  (TRUE_LABEL。先頭 454 = folder 1..454)
#   _akshara.decompose_roles / renderable (役割分解・描画可否。フォント非依存ロジック)
#   tmp/NotoSansSinhala.ttf                (描画可否判定にのみ使用)
#
# 出力 (tmp/labels/):
#   vocab.json        共有語彙辞書。visual/base/next/post の4語彙 + ID。
#                     これがヘッド次元と採点キーを固定する(①②③で不変)。
#   train_454.csv     folder ごとの各ヘッド正解 ID(① visual / ② base+hal+next+post / 視覚 gid列)。
#   excluded_454.csv  除外フォルダと理由(描画不能 / base なし = 母音記号単独・Latin残骸)。
#
# レイヤ分離(docs/model-design.md「大原則」):
#   - 出力ラベルは L2(OCR の認識単位)。① visual は (gid,位置) 列、②③ は L1(コードポイント
#     由来の base/next/post)を**参照して**逆分解した役割ヘッド。依存は L2→L1 の一方向。
#   - conjunct(L1: 子音 2 つ以上 = hal_chain≥2)は **OCR ラベルに入れない**。視覚的な積み(stack)
#     とは別物(`න්න`/`ද්‍ර` は conjunct=True でも stack=1)で、画素と 1 対 1 でないため。連数が要る
#     解析は L1 の count_conjuncts を別途使う。
#
# 設計の根拠: docs/model-design.md, docs/glyph-placement.md,
#             memory/sinhala-part-decomposition.md
import importlib.util
import json
import os
import unicodedata as ud

import _akshara as A

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
LABELS_PY = os.path.join(ROOT, "data", "labels", "handwritten_constants.py")
FONT = os.path.join(ROOT, "tmp", "NotoSansSinhala.ttf")
OUT_DIR = os.path.join(ROOT, "tmp", "labels")

N_FOLDERS = 454  # 先頭 454 件が folder 1..454 に対応(末尾 ං/ර් は余分)


def load_true_label():
    spec = importlib.util.spec_from_file_location("hwc", LABELS_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.TRUE_LABEL


def main():
    labels = load_true_label()[:N_FOLDERS]
    font = A.load_font(FONT)

    # --- フォルダごとに分解。描画可否と base 有無で valid/excluded に振り分け ---
    rows = []  # valid: (folder, akshara, decomp)
    excluded = []  # (folder, akshara, reason)
    for i, raw in enumerate(labels):
        folder = i + 1
        ak = ud.normalize("NFC", raw.strip())  # 前後空白ノイズ(' ඟෑ' 等)を除去
        glyphs = A.shape(ak, font)
        if not A.renderable(glyphs):
            excluded.append((folder, raw, "not-renderable"))
            continue
        d = A.decompose_roles(ak)
        if d["base"] is None:
            # base 子音/独立母音を持たない = 母音記号単独 / Latin 残骸。akshara として不成立
            excluded.append((folder, raw, "no-base"))
            continue
        rows.append((folder, ak, d))

    # --- 共有語彙を構築(valid 行から収集 → ソートで ID 固定)---
    # visual: akshara 丸ごと(① baseline のクラス)。
    # base/next/post: 役割ヘッド(② parts)。post 片は順序を持つので multi-hot でなく
    #   「並びそのもの」を語彙化し、組合せをまたぐ素片を語彙に入れる。
    visual = sorted({ak for _, ak, _ in rows})
    bases = sorted({d["base"] for _, _, d in rows})
    nexts = sorted({c for _, _, d in rows for c in d["nexts"]})
    posts = sorted({c for _, _, d in rows for c in d["posts"]})

    def index(seq):
        return {c: i for i, c in enumerate(seq)}

    visual_id, base_id = index(visual), index(bases)
    next_id, post_id = index(nexts), index(posts)

    def names(seq):
        return [
            {
                "char": c,
                "codepoint": "+".join("%04X" % ord(x) for x in c),
                "name": "/".join(ud.name(x, "?") for x in c),
            }
            for c in seq
        ]

    vocab = {
        "n_folders": N_FOLDERS,
        "n_valid": len(rows),
        "n_excluded": len(excluded),
        # 役割ヘッドの語彙(② parts head の出力次元)
        "visual": names(visual),  # ① 丸ごと分類
        "base": names(bases),  # 主役の基底子音/独立母音
        "next": names(nexts),  # 結合する後続子音(横並び + ra/ya 結合の素子音)
        "post": names(posts),  # 母音記号/anusvara の素片(split matra 展開後)
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "vocab.json"), "w", encoding="utf-8") as fp:
        json.dump(vocab, fp, ensure_ascii=False, indent=2)

    # --- train_454.csv: folder ごとに全ヘッドの正解 ID ---
    # post/next は順序つき列なので "i;j;k"(ID を ; 連結)で1セルに格納。空は ""。
    # gid_seq = L2(OCR 認識単位): 画素に描かれた (gid:name@位置) 列。① visual の実体。
    #   融合グリフ(kivowelsinh 等)は 1 単位、split matra は別 gid に分かれる。
    # conjunct(L1)は出力しない(レイヤ分離。冒頭コメント参照)。
    header = [
        "folder",
        "akshara",
        "visual_id",
        "base_id",
        "hal",
        "next_ids",
        "post_ids",
        "gid_seq",
    ]
    lines = [",".join(header)]
    for folder, ak, d in rows:
        next_ids = ";".join(str(next_id[c]) for c in d["nexts"])
        post_ids = ";".join(str(post_id[c]) for c in d["posts"])
        gid_seq = " ".join(
            f"{g['gid']}:{g['name']}@{pos}" for g, pos in A.place(A.shape(ak, font))
        )
        lines.append(
            ",".join(
                [
                    str(folder),
                    ak,
                    str(visual_id[ak]),
                    str(base_id[d["base"]]),
                    str(int(d["hal"])),
                    next_ids,
                    post_ids,
                    gid_seq,
                ]
            )
        )
    with open(os.path.join(OUT_DIR, "train_454.csv"), "w", encoding="utf-8") as fp:
        fp.write("\n".join(lines) + "\n")

    # --- excluded_454.csv ---
    ex_lines = ["folder,akshara,reason"]
    for folder, raw, reason in excluded:
        ex_lines.append("%d,%s,%s" % (folder, raw, reason))
    with open(os.path.join(OUT_DIR, "excluded_454.csv"), "w", encoding="utf-8") as fp:
        fp.write("\n".join(ex_lines) + "\n")

    # --- サマリ ---
    print("valid    : %d folders" % len(rows))
    print("excluded : %d folders" % len(excluded))
    for folder, raw, reason in excluded:
        print("   folder %3d  %-6r  %s" % (folder, raw, reason))
    print(
        "vocab    : visual=%d base=%d next=%d post=%d"
        % (len(visual), len(bases), len(nexts), len(posts))
    )
    print("out      : %s" % OUT_DIR)


if __name__ == "__main__":
    main()
