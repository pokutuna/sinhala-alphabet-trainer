# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
# app/data/sinhala.json の現 rom が、シンハラ語ローマ字転写の主要 2 規格
#   - ISO 15919(国際標準。vocalic = 環記号 r̥/l̥、anusvara = ṁ)
#   - IAST / ALA-LC(学術・図書目録。vocalic = 点 ṛ/ḷ、anusvara = ṃ)
# のどちらに従っているかを棚卸しし、混在・衝突・規格差を一覧化する。
#
# 出力: romanization_audit.csv(category, glyph, codepoint, current_rom, iso15919, iast,
#                              follows, note, wiki_freq)
# 目的: 「まず現状を調査・文書化」— 統一方針を決める前の事実確認。
import csv
import json
import os
import sys
import unicodedata as ud

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
JSON = os.path.join(REPO, "app", "data", "sinhala.json")
FREQ = os.path.join(HERE, "akshara_freq_wikipedia.csv")
OUT = os.path.join(HERE, "romanization_audit.csv")

# 規格差が出る文字だけ、ISO 15919 と IAST/ALA-LC の正解を手で持つ
# (出典: ISO 15919 / IAST 対照。vocalic は ISO=環記号, IAST=下点。anusvara ISO=ṁ, IAST=ṃ)
# キーは glyph(独立母音/子音)または sign(母音記号)。
ISO = {
    # vocalic r / l(独立母音)
    "ඍ": "r̥",
    "ඎ": "r̥̄",
    "ඏ": "l̥",
    "ඐ": "l̥̄",
    # vocalic r / l(母音記号)
    "ෘ": "r̥",
    "ෲ": "r̥̄",
    "ෟ": "l̥",
    "ෳ": "l̥̄",
    # 鼻音化記号
    "ං": "ṁ",
    "ඃ": "ḥ",
    # retroflex 子音(ISO/IAST 同じ = ḷ/ṇ。差は無いが衝突源として記録)
    "ළ": "ḷa",
    "ණ": "ṇa",
}
IAST = {
    "ඍ": "ṛ",
    "ඎ": "ṝ",
    "ඏ": "ḷ",
    "ඐ": "ḹ",
    "ෘ": "ṛ",
    "ෲ": "ṝ",
    "ෟ": "ḷ",
    "ෳ": "ḹ",
    "ං": "ṃ",
    "ඃ": "ḥ",
    "ළ": "ḷa",
    "ණ": "ṇa",
}


def follows(cur, iso, iast):
    """現 rom がどちらの規格に一致するか。"""
    if iso == iast:
        return "both/neutral" if cur == iso else "neither"
    if cur == iso:
        return "ISO15919"
    if cur == iast:
        return "IAST/ALA-LC"
    return "neither"


def main():
    d = json.load(open(JSON, encoding="utf-8"))

    # akshara 頻度 → 「その glyph/sign を含む akshara の総度数」を粗く集計
    contains_freq = {}
    if os.path.exists(FREQ):
        for r in csv.DictReader(open(FREQ, encoding="utf-8")):
            ak = ud.normalize("NFC", r["akshara"])
            f = int(r["freq"])
            for ch in set(ak):
                contains_freq[ch] = contains_freq.get(ch, 0) + f

    rows = []

    def emit(category, glyph, cur_rom):
        if glyph not in ISO:  # 規格差の出る対象だけ監査
            return
        iso, iast = ISO[glyph], IAST[glyph]
        rows.append(
            {
                "category": category,
                "glyph": glyph,
                "codepoint": f"U+{ord(glyph):04X}" if len(glyph) == 1 else "",
                "current_rom": cur_rom,
                "iso15919": iso,
                "iast_alalc": iast,
                "follows": follows(cur_rom, iso, iast),
                "differs": "yes" if iso != iast else "no(同一)",
                "wiki_freq": contains_freq.get(glyph, 0),
            }
        )

    for v in d["independent_vowels"]:
        emit("independent_vowel", v["glyph"], v["rom"])
    for s in d["vowel_signs"]:
        if s.get("sign"):
            emit("vowel_sign", s["sign"], s["rom"])
    for c in d["consonants"]:
        emit("consonant", c["glyph"], c["rom"])

    rows.sort(key=lambda r: (-r["wiki_freq"], r["category"]))
    with open(OUT, "w", encoding="utf-8", newline="") as fp:
        w = csv.DictWriter(
            fp,
            fieldnames=[
                "category",
                "glyph",
                "codepoint",
                "current_rom",
                "iso15919",
                "iast_alalc",
                "follows",
                "differs",
                "wiki_freq",
            ],
        )
        w.writeheader()
        w.writerows(rows)

    # 端末向けサマリ
    print(f"監査対象(規格差が出うる文字)={len(rows)}")
    by = {}
    for r in rows:
        by[r["follows"]] = by.get(r["follows"], 0) + 1
    print("現 rom の準拠先:", dict(by))
    print()
    print(
        f"{'cat':<18}{'glyph':<6}{'cur':<6}{'ISO':<6}{'IAST':<6}{'follows':<14}{'freq':>10}"
    )
    for r in rows:
        print(
            f"{r['category']:<18}{r['glyph']:<5} {r['current_rom']:<5} "
            f"{r['iso15919']:<5} {r['iast_alalc']:<5} {r['follows']:<14}{r['wiki_freq']:>10,}"
        )
    print(f"\nwrote: {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
