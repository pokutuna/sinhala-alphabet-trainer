# /// script
# requires-python = ">=3.11"
# ///
import unicodedata
src = open("data/labels/handwritten_constants.py", encoding="utf-8").read()
ns = {}; exec(src, ns); labels = ns["TRUE_LABEL"]

ZWJ = "‍"; AL = "්"  # ZWJ, virama (hal)
# 末尾の余分2件(データフォルダなし)は除外して 454 に揃える
labels = labels[:454]

# 壊れ FM Abhaya 残骸 → 変換候補(datasets.md の調査結果より)
BROKEN = {
    425: ("COda", "ඣ系派生(CO=ඣ)"),  # folder426
    449: ("HQ",   "්‍යූ (yansa+ū)"),    # folder450
    452: ("H",    "්‍ය (yansa)"),       # folder453
    453: ("Hq",   "්‍යු (yansa+u)"),    # folder454
}

def is_sinhala(c): return 0x0D80 <= ord(c) <= 0x0DFF
def role(cp):
    o = ord(cp)
    if 0x0D85 <= o <= 0x0D96: return "independent_vowel"
    if 0x0D9A <= o <= 0x0DC6: return "consonant"
    if o == 0x0DCA: return "virama"
    if (0x0DCF <= o <= 0x0DDF) or (0x0DF2 <= o <= 0x0DF3): return "vowel_sign"
    if o in (0x0D82, 0x0D83): return "sign"
    return "other"
def short(c):
    n = unicodedata.name(c, "?")
    return (n.replace("SINHALA ","").replace("LETTER ","")
             .replace("VOWEL SIGN ","").replace("SIGN ",""))

print("| folder | 合成字 | 基本字 | 修飾(母音記号・hal・記号) |")
print("| --- | --- | --- | --- |")
for i, s in enumerate(labels):
    folder = i + 1
    s2 = s.strip()
    if i in BROKEN:
        raw, cand = BROKEN[i]
        print(f"| {folder} | ⚠`{raw}`(壊れ) | (要確定) | {cand} |")
        continue
    base = [c for c in s2 if role(c) in ("consonant", "independent_vowel")]
    mods = [c for c in s2 if role(c) in ("vowel_sign", "sign")]
    mod_parts = []
    if AL in s2: mod_parts.append("්(hal)")
    if ZWJ in s2: mod_parts.append("ZWJ")
    for m in mods: mod_parts.append(f"{m}({short(m)})")
    bparts = " + ".join(base) if base else "-"
    mparts = " + ".join(mod_parts) if mod_parts else "(なし)"
    print(f"| {folder} | {s2} | {bparts} | {mparts} |")
