# /// script
# requires-python = ">=3.11"
# dependencies = ["regex"]
# ///
# Sinhala Wikipedia ダンプ(bz2)を流し読みして akshara 頻度を集計する。
#   - XML の <text> 本文だけを対象(タグ/テンプレ/英数字は akshara にならないので雑な除去で十分)
#   - akshara 分割は scripts/_akshara.split_aksharas を再利用(結合子音を1単位に保つ)
#   - 出力: akshara_freq_wikipedia.csv (akshara, codepoints, freq) ← コミット対象
#
# 目的: 手元 SinOCR(1135行)では測れない「結合 akshara の実在・利用実績」を、
#       数千万語規模の Wikipedia 本文で頻度として裏取りする。
import bz2
import os
import re
import sys
import unicodedata as ud
from collections import Counter

import regex

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "..", "scripts")
sys.path.insert(0, SCRIPTS)
from _akshara import split_aksharas  # noqa: E402

DUMP = os.path.join(HERE, "data", "siwiki-latest-pages-articles.xml.bz2")
OUT = os.path.join(HERE, "akshara_freq_wikipedia.csv")

SINHALA = regex.compile(r"[඀-෿‍]+")  # シンハラブロック + ZWJ の連なりだけ抽出
TAG = re.compile(r"<[^>]+>")
# wiki マークアップの定型ノイズ(本文中のシンハラには影響しないが念のため落とす)
NOISE = re.compile(r"\{\{[^}]*\}\}|\[\[[^\]]*\]\]|<ref[^>]*>.*?</ref>", re.S)


def iter_text(path):
    """<text ...>...</text> の中身をストリームで yield する。"""
    inside = False
    buf = []
    text_open = re.compile(r"<text\b[^>]*>")
    with bz2.open(path, "rt", encoding="utf-8") as fp:
        for line in fp:
            if not inside:
                m = text_open.search(line)
                if m:
                    inside = True
                    line = line[m.end() :]
                else:
                    continue
            if "</text>" in line:
                buf.append(line.split("</text>")[0])
                yield "".join(buf)
                buf = []
                inside = False
            else:
                buf.append(line)


def main():
    if not os.path.exists(DUMP):
        sys.exit(f"dump not found: {DUMP}\n  run: bash download.sh")

    counter = Counter()
    n_pages = 0
    n_sinhala_runs = 0
    for raw in iter_text(DUMP):
        n_pages += 1
        txt = NOISE.sub(" ", raw)
        txt = TAG.sub(" ", txt)
        for run in SINHALA.findall(txt):
            n_sinhala_runs += 1
            for ak in split_aksharas(run):
                ak = ud.normalize("NFC", ak)
                if ak:
                    counter[ak] += 1
        if n_pages % 5000 == 0:
            print(f"  pages={n_pages} distinct_akshara={len(counter)}", file=sys.stderr)

    total = sum(counter.values())
    with open(OUT, "w", encoding="utf-8") as fp:
        fp.write("akshara,codepoints,freq\n")
        for ak, c in counter.most_common():
            cps = " ".join(f"U+{ord(ch):04X}" for ch in ak)
            # akshara にカンマは出ないが安全のため引用
            fp.write(f'"{ak}","{cps}",{c}\n')

    print(f"pages={n_pages}  sinhala_runs={n_sinhala_runs}")
    print(f"distinct akshara={len(counter)}  total tokens={total}")
    print(f"wrote: {OUT}")


if __name__ == "__main__":
    main()
