import {
  type Consonant,
  composeSyllable,
  consonants,
  independentVowels,
  type SinhalaChar,
  type Vowel,
  type VowelSign,
  vowelSigns,
} from "~/lib/sinhala";

/**
 * Two-way transliteration between Japanese kana and the Sinhala script.
 *
 * There is no official kana↔Sinhala table; both directions are approximations.
 * The mapping decisions here follow colloquial-Sinhala conventions and the
 * attested spellings of Japanese names on Sinhala Wikipedia. See the full
 * write-up with sources in docs/transliteration.md. In brief:
 *  - No aspiration contrast in spoken Sinhala, so か→ක (non-aspirated).
 *  - た/だ行: dental ත/ද primary, retroflex ට/ඩ alternative. な行 is dental な
 *    only (retroflex ණ /ɳ/ is no longer phonemic).
 *  - ら行 → ර (r) primary; ල (l) for an explicit L (retroflex ළ is non-phonemic).
 *  - ち→ච, し→ෂ (dedicated palatal letters); dental/sibilant rows are alternatives.
 *  - ふ → ෆ (f, the written standard, cf. 富士 ෆූජි); ප (p) is the colloquial alt.
 *  - ん → න් (n + hal) by default; ං before か/が (velar), ම් before ぱ/ば/ま.
 *  - 促音っ doubles the next consonant (っか → ක්ක).
 *  - 長音 maps to the long (dīrgha) vowel signs.
 * Because several Japanese sounds map 1:N, JP→Sinhala results carry candidate
 * alternatives so the UI can let the user switch consonants.
 */

// ---------------------------------------------------------------------------
// shared lookups
// ---------------------------------------------------------------------------

const consonantByRom = new Map(consonants.map((c) => [c.rom, c]));
const vowelByRom = new Map(independentVowels.map((v) => [v.rom, v]));
const signByRom = new Map(vowelSigns.map((s) => [s.rom, s]));

function cons(rom: string): Consonant {
  const c = consonantByRom.get(rom);
  if (!c) throw new Error(`unknown consonant rom: ${rom}`);
  return c;
}
function vow(rom: string): Vowel {
  const v = vowelByRom.get(rom);
  if (!v) throw new Error(`unknown vowel rom: ${rom}`);
  return v;
}
function sign(rom: string): VowelSign {
  const s = signByRom.get(rom);
  if (!s) throw new Error(`unknown vowel-sign rom: ${rom}`);
  return s;
}

// ---------------------------------------------------------------------------
// JP → Sinhala
// ---------------------------------------------------------------------------

/** The five Japanese vowels, in あいうえお order, as Sinhala vowel-sign roms. */
const VOWEL_ROW = ["a", "i", "u", "e", "o"] as const;
type VowelKey = (typeof VOWEL_ROW)[number];

/**
 * Onset families: a Japanese consonant row mapped to one or more Sinhala
 * consonant roms. The first rom is the representative (primary) candidate; the
 * rest are alternatives shown when the user taps a syllable.
 */
interface Onset {
  /** Sinhala consonant roms, primary first. */
  roms: string[];
  /** Per-row kana so we can build accurate input keys for あ/い/う/え/お. */
  kana: Record<VowelKey, string>;
}

/**
 * Build the kana row for an onset from a kana prefix, e.g. "k" → か/き/く/け/こ.
 * We spell rows out explicitly to keep yōon/voicing exact.
 */
function row(a: string, i: string, u: string, e: string, o: string) {
  return { a, i, u, e, o };
}

/** Short vowel-sign rom → its long (dīrgha) partner. */
const SHORT_TO_LONG_SIGN: Record<string, string> = {
  a: "ā",
  æ: "ǣ",
  i: "ī",
  u: "ū",
  e: "ē",
  o: "ō",
};

/**
 * Which bare-vowel かな lengthens a preceding vowel of a given 段 (vowel key).
 * Japanese long vowels written as vowel sequences: お段+う/お → ō, え段+い/え →
 * ē, う段+う → ū, あ段+あ → ā, い段+い → ī. (e.g. とう→tō, せい→sē, おおきい.)
 * This is heuristic — sequences like 思う(おも・う) or えいご(e-i-go) are not
 * long, so the un-lengthened reading is always kept as an alternative candidate.
 */
const LENGTHENS: Record<VowelKey, ReadonlySet<string>> = {
  a: new Set(["あ"]),
  i: new Set(["い"]),
  u: new Set(["う"]),
  e: new Set(["い", "え"]),
  o: new Set(["う", "お"]),
};

/** Plain kana mora (gojūon + dakuten/handakuten), keyed by full mora. */
const MORA: Record<string, { onset: Onset }> = {};

/**
 * Reading-direction kana, built from the canonical rows below: primary
 * consonant rom → vowel sign rom → kana. Decoupled from the JP→Sinhala-only
 * overrides (ふ/ゔ) so reading e.g. පු stays "ぷ", not the override's "ふ".
 */
const KANA_TABLE: Record<string, Partial<Record<string, string>>> = {};

/**
 * Register a Sinhala consonant rom → かな reading for the reading direction.
 * First writer wins (so a later voiced/handakuten row never clobbers an
 * earlier one), and the long (dīrgha) partner is filled in alongside.
 */
function registerReading(rom: string, vk: VowelKey, kana: string) {
  KANA_TABLE[rom] ??= {};
  if (KANA_TABLE[rom][vk] == null) {
    KANA_TABLE[rom][vk] = kana;
    const longRom = SHORT_TO_LONG_SIGN[vk];
    if (longRom) KANA_TABLE[rom][longRom] = `${kana}ー`;
  }
}

function defineRow(kana: Record<VowelKey, string>, roms: string[]) {
  const onset: Onset = { roms, kana };
  const primary = roms[0];
  for (const vk of VOWEL_ROW) {
    const k = kana[vk];
    if (!k) continue;
    MORA[k] = { onset };
    registerReading(primary, vk, k);
  }
}

// あ行 (bare vowels) is handled separately (no consonant), see vowelMora below.
defineRow(row("か", "き", "く", "け", "こ"), ["ka"]);
defineRow(row("が", "ぎ", "ぐ", "げ", "ご"), ["ga"]);
defineRow(row("さ", "し", "す", "せ", "そ"), ["sa"]);
defineRow(row("ざ", "じ", "ず", "ぜ", "ぞ"), ["ja", "sa"]);
// た行: dental ta primary, retroflex ṭa alternative.
defineRow(row("た", "ち", "つ", "て", "と"), ["ta", "ṭa"]);
defineRow(row("だ", "ぢ", "づ", "で", "ど"), ["da", "ḍa"]);
// な行: dental な only — retroflex ණ /ɳ/ is no longer phonemic in modern Sinhala.
defineRow(row("な", "に", "ぬ", "ね", "の"), ["na"]);
defineRow(row("は", "ひ", "ふ", "へ", "ほ"), ["ha"]);
defineRow(row("ば", "び", "ぶ", "べ", "ぼ"), ["ba"]);
defineRow(row("ぱ", "ぴ", "ぷ", "ぺ", "ぽ"), ["pa"]);
defineRow(row("ま", "み", "む", "め", "も"), ["ma"]);
defineRow(row("や", "", "ゆ", "", "よ"), ["ya"]);
// ら行: ර (r) primary; ල (l) for an explicit L. Retroflex ළ /ɭ/ is non-phonemic.
defineRow(row("ら", "り", "る", "れ", "ろ"), ["ra", "la"]);
defineRow(row("わ", "", "", "", "を"), ["va"]);

// ふ → the dedicated loan letter ෆ (f) is the written standard (cf. 富士 ෆූජි);
// ප (p) is the colloquial /p/-substitution alternative.
MORA.ふ = {
  onset: { roms: ["fa", "pa"], kana: row("", "", "ふ", "", "") },
};
// ゔ (v) → va is fine via わ row's va; add the explicit ゔ mora.
MORA.ゔ = { onset: { roms: ["va"], kana: row("", "", "ゔ", "", "") } };

// Palatal rows: Japanese ち [tɕ] / し [ɕ] map more faithfully to the dedicated
// palatal letters ච (ca /tʃ/) / ෂ (ṣa /ʃ/) than to the dental た / sibilant さ
// rows. The dental/sibilant approximations stay as alternatives. These also feed
// the yōon path (ちゃ→චා, しゃ→ෂ + vowel) — see yoonCandidates, which renders
// palatal onsets as plain syllables without the yansaya (-ya) conjunct.
const PALATAL_ROMS = new Set(["ca", "ja", "ṣa", "śa"]);
MORA.ち = {
  onset: { roms: ["ca", "ta", "ṭa"], kana: row("", "ち", "", "", "") },
};
MORA.し = {
  onset: { roms: ["ṣa", "śa", "sa"], kana: row("", "し", "", "", "") },
};

// Reading direction: let ච / ෂ read back as the ちゃ / しゃ rows (ち / し for the
// i column). registerReading is first-writer-wins, so these don't disturb the
// dental/sibilant rows that own た / さ.
const CA_ROW = row("ちゃ", "ち", "ちゅ", "ちぇ", "ちょ");
const SHA_ROW = row("しゃ", "し", "しゅ", "しぇ", "しょ");
for (const vk of VOWEL_ROW) {
  if (CA_ROW[vk]) registerReading("ca", vk, CA_ROW[vk]);
  if (SHA_ROW[vk]) registerReading("ṣa", vk, SHA_ROW[vk]);
}

/** Bare-vowel mora (あ行) → independent vowel. */
const VOWEL_MORA: Record<string, VowelKey> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
};

/**
 * A Sinhala candidate for one input mora. Carries the candidate character's
 * *own* reading (rom + kana) so both the chip and the picker can show "ぷ /
 * pu" consistently, plus a short disambiguation note (e.g. "歯音", "r").
 */
export interface Candidate {
  /** The composed Sinhala char (syllable, vowel, or vowel sign). */
  char: SinhalaChar;
  /** Rendered glyph. */
  glyph: string;
  /** Romanization of the Sinhala char, e.g. "ka", "rā", "kyo". */
  rom: string;
  /** かな approximation of the Sinhala char, e.g. "ぷ", "らー". */
  kana: string;
  /** Short note distinguishing this candidate from its siblings, e.g. "歯音". */
  note?: string;
}

/** One converted unit of input. */
export type Segment =
  | {
      kind: "mapped";
      /** The original source text for this segment (kana or romaji). */
      source: string;
      /** The input mora's own かな reading (= source for kana input). */
      sourceKana: string;
      /** Candidate Sinhala renderings, primary first. */
      candidates: Candidate[];
    }
  | {
      kind: "error";
      /** Verbatim source that could not be converted. */
      source: string;
    }
  | {
      kind: "space";
      /** The original whitespace, preserved for copy / round-tripping. */
      source: string;
    };

const SMALL_TO_LARGE: Record<string, string> = {
  ぁ: "あ",
  ぃ: "い",
  ぅ: "う",
  ぇ: "え",
  ぉ: "お",
  ゃ: "や",
  ゅ: "ゆ",
  ょ: "よ",
};

/** Katakana → hiragana for the BMP kana block. */
function toHiragana(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  // Katakana ァ(0x30A1)..ヶ(0x30F6) → Hiragana by -0x60.
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCodePoint(code - 0x60);
  }
  // 長音符 ー stays as-is (handled in the segmenter).
  return ch;
}

/** Short note distinguishing same-vowel consonant candidates, by consonant rom. */
const CONS_NOTE: Record<string, string> = {
  ta: "歯音",
  ṭa: "反舌音",
  da: "歯音",
  ḍa: "反舌音",
  na: "歯音",
  ra: "r",
  la: "l",
  ca: "口蓋音",
  ja: "じ",
  sa: "す系",
  ṣa: "そり舌 sh",
  śa: "sh",
  pa: "p",
  fa: "f",
  va: "ゔ/わ",
};

/**
 * Build candidates for an onset + vowel, primary consonant first. All
 * candidates approximate the same input mora, so they share its かな (`sourceKana`)
 * — the precise per-letter identity lives in `rom` (e.g. pu vs fu) and `note`.
 */
function syllableCandidates(
  onset: Onset,
  vk: VowelKey,
  sourceKana: string,
): Candidate[] {
  const vs = sign(vk);
  const ambiguous = onset.roms.length > 1;
  return onset.roms.map((cRom) => {
    const c = cons(cRom);
    const syl = composeSyllable(c, vs);
    return {
      char: syl,
      glyph: syl.glyph,
      rom: syl.rom,
      kana: sourceKana,
      note: ambiguous ? CONS_NOTE[cRom] : undefined,
    };
  });
}

function vowelCandidate(vk: VowelKey, sourceKana: string): Candidate {
  const v = vow(vk);
  return { char: v, glyph: v.glyph, rom: v.rom, kana: sourceKana };
}

/**
 * Is this code point inside a kana or kana-adjacent range we segment over?
 * (hiragana, katakana, prolonged-sound mark, and small kana).
 */
function isKana(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x3041 && code <= 0x3096) || // hiragana
    (code >= 0x30a1 && code <= 0x30fa) || // katakana
    ch === "ー" ||
    ch === "ｰ"
  );
}

// ---------------------------------------------------------------------------
// mora tokens: a shared intermediate so the kana and romaji front-ends produce
// the same kinds of unit, and one builder turns tokens into candidate segments.
// ---------------------------------------------------------------------------

type MoraToken =
  | { t: "vowel"; src: string; kana: string; vk: VowelKey }
  | { t: "syllable"; src: string; kana: string; onset: Onset; vk: VowelKey }
  | {
      t: "yoon";
      src: string;
      kana: string;
      onset: Onset;
      vk: VowelKey;
    }
  | { t: "nasal"; src: string; kana: string }
  | { t: "long"; src: string } // 長音: lengthens the previous token
  | { t: "sokuon"; src: string } // 促音: not renderable → error
  | { t: "space"; src: string } // whitespace: kept as a gap, not an error
  | { t: "error"; src: string };

/** Whitespace we keep as a spacer rather than flagging as unconvertible. */
function isSpace(ch: string): boolean {
  return ch === " " || ch === "　" || ch === "\t";
}

const YANSAYA = "්‍ය"; // yansaya conjunct (-ya), ් + ZWJ + ය

/** Which あいうえお column a kana sits in, by matching its onset's kana row. */
function vowelOf(hira: string, onset: Onset): VowelKey {
  for (const vk of VOWEL_ROW) {
    if (onset.kana[vk] === hira) return vk;
  }
  return "a";
}

/** Tokenize hiragana-normalized Japanese text into mora tokens. */
function tokenizeKana(input: string): MoraToken[] {
  const chars = Array.from(input);
  const tokens: MoraToken[] = [];
  let i = 0;

  while (i < chars.length) {
    const raw = chars[i];

    if (isSpace(raw)) {
      tokens.push({ t: "space", src: raw });
      i++;
      continue;
    }
    if (!isKana(raw)) {
      tokens.push({ t: "error", src: raw });
      i++;
      continue;
    }
    if (raw === "ー" || raw === "ｰ") {
      tokens.push({ t: "long", src: raw });
      i++;
      continue;
    }

    const hira = toHiragana(raw);

    if (hira === "っ") {
      tokens.push({ t: "sokuon", src: raw });
      i++;
      continue;
    }
    if (hira === "ん") {
      tokens.push({ t: "nasal", src: raw, kana: raw });
      i++;
      continue;
    }
    if (hira in VOWEL_MORA) {
      tokens.push({ t: "vowel", src: raw, kana: raw, vk: VOWEL_MORA[hira] });
      i++;
      continue;
    }

    // Yōon: base + small や/ゆ/よ.
    const next = i + 1 < chars.length ? toHiragana(chars[i + 1]) : "";
    if (/[やゆよ]/.test(SMALL_TO_LARGE[next] ?? "")) {
      const base = MORA[hira];
      if (base) {
        const large = SMALL_TO_LARGE[next];
        const vk: VowelKey = large === "ゆ" ? "u" : large === "よ" ? "o" : "a";
        tokens.push({
          t: "yoon",
          src: raw + chars[i + 1],
          kana: raw + chars[i + 1],
          onset: base.onset,
          vk,
        });
        i += 2;
        continue;
      }
    }

    const mora = MORA[hira];
    if (mora) {
      tokens.push({
        t: "syllable",
        src: raw,
        kana: raw,
        onset: mora.onset,
        vk: vowelOf(hira, mora.onset),
      });
      i++;
      continue;
    }

    // Small vowel kana left over (ぁぃぅぇぉ) → its large vowel.
    if (VOWEL_MORA[SMALL_TO_LARGE[hira]] != null) {
      tokens.push({
        t: "vowel",
        src: raw,
        kana: SMALL_TO_LARGE[hira],
        vk: VOWEL_MORA[SMALL_TO_LARGE[hira]],
      });
      i++;
      continue;
    }

    tokens.push({ t: "error", src: raw });
    i++;
  }

  return tokens;
}

/** The onset family a token carries (syllable/yōon), or null otherwise. */
function onsetOf(tok: MoraToken | undefined): Onset | null {
  if (!tok) return null;
  if (tok.t === "syllable" || tok.t === "yoon") return tok.onset;
  return null;
}

/** Build the mapped segment for a single mora token (vowel/syllable/yōon). */
function moraSegment(
  tok: Extract<MoraToken, { t: "vowel" | "syllable" | "yoon" }>,
): Segment {
  const candidates =
    tok.t === "vowel"
      ? [vowelCandidate(tok.vk, tok.kana)]
      : tok.t === "syllable"
        ? syllableCandidates(tok.onset, tok.vk, tok.kana)
        : yoonCandidates(tok.onset, tok.vk, tok.kana);
  return { kind: "mapped", source: tok.src, sourceKana: tok.kana, candidates };
}

/** Build candidate-bearing segments from a token stream (shared by both inputs). */
function tokensToSegments(tokens: MoraToken[]): Segment[] {
  const segments: Segment[] = [];

  const pushError = (s: string) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === "error") last.source += s;
    else segments.push({ kind: "error", source: s });
  };

  // The vowel 段 of the previous mora, for detecting long-vowel sequences
  // (とう → tō). Cleared after a non-mora token or a successful lengthening, so
  // lengthening never chains (とうう stays とう + う).
  let prevVk: VowelKey | null = null;

  const pushSpace = (s: string) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === "space") last.source += s;
    else segments.push({ kind: "space", source: s });
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    switch (tok.t) {
      case "error":
        pushError(tok.src);
        prevVk = null;
        break;
      case "space":
        pushSpace(tok.src);
        prevVk = null;
        break;
      case "sokuon": {
        // 促音 doubles the following consonant (っか → ක්ක). Build the next
        // mora's segment and geminate it; if the next token has no consonant
        // onset (vowel/ん/end), gemination is impossible → verbatim error.
        const next = tokens[idx + 1];
        if (next && (next.t === "syllable" || next.t === "yoon")) {
          segments.push(geminate(moraSegment(next), tok.src));
          idx++; // consumed the following mora
          prevVk = next.vk;
        } else {
          pushError(tok.src);
          prevVk = null;
        }
        break;
      }
      case "long": {
        if (!applyLongMark(segments, tok.src)) pushError(tok.src);
        prevVk = null;
        break;
      }
      case "nasal":
        segments.push(
          nasalSegment(tok.src, tok.kana, onsetOf(tokens[idx + 1])),
        );
        prevVk = null;
        break;
      case "vowel": {
        // A bare vowel after a matching 段 lengthens it in place (とう → තෝ),
        // with the un-lengthened reading kept as an alternative candidate.
        if (
          prevVk &&
          LENGTHENS[prevVk].has(tok.kana) &&
          applyVowelLengthening(segments, tok.vk, tok.src, tok.kana)
        ) {
          prevVk = null;
          break;
        }
        segments.push(moraSegment(tok));
        prevVk = tok.vk;
        break;
      }
      case "syllable":
      case "yoon":
        segments.push(moraSegment(tok));
        prevVk = tok.vk;
        break;
    }
  }

  return segments;
}

/**
 * Convert Japanese text to segments. Accepts kana, romaji, or a mix of the two
 * (the tokenizer auto-detects per run), so callers don't pick an input mode.
 * Unknown characters become verbatim error segments for the UI to flag.
 */
export function japaneseToSinhala(input: string): Segment[] {
  return tokensToSegments(tokenizeJapanese(input));
}

// ---------------------------------------------------------------------------
// romaji front-end
// ---------------------------------------------------------------------------

/**
 * romaji syllable → the hiragana it spells. Built by spelling each kana in the
 * MORA / VOWEL tables in Hepburn-ish romaji (with common alternates), so the
 * romaji path reuses exactly the same onsets and candidate logic as kana.
 */
const ROMAJI_TO_KANA: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const put = (rom: string, kana: string) => {
    if (!(rom in map)) map[rom] = kana;
  };

  // bare vowels
  for (const [kana, vk] of Object.entries(VOWEL_MORA)) put(vk, kana);

  // Hepburn onset spellings per Sinhala primary rom. Multiple spellings allowed.
  const ONSET_SPELLINGS: Record<string, string[]> = {
    ka: ["k"],
    ga: ["g"],
    sa: ["s"],
    ja: ["z"], // ざじずぜぞ. じゃ/じゅ/じょ are handled as yōon; じ via IRREGULAR.
    ta: ["t"],
    da: ["d"],
    na: ["n"],
    ha: ["h"],
    ba: ["b"],
    pa: ["p"],
    ma: ["m"],
    ya: ["y"],
    ra: ["r", "l"], // ら行: r primary; allow typing l too
    va: ["w", "v"],
  };
  // Irregular Hepburn mora that don't follow consonant+vowel spelling.
  const IRREGULAR: Record<string, string> = {
    shi: "し",
    si: "し",
    chi: "ち",
    ti: "ち",
    tsu: "つ",
    tu: "つ",
    fu: "ふ",
    hu: "ふ",
    ji: "じ",
    zi: "じ",
    fa: "ふぁ",
    she: "しぇ",
    che: "ちぇ",
    je: "じぇ",
  };

  for (const [kana, { onset }] of Object.entries(MORA)) {
    // find this kana's vowel column and primary onset rom
    const primary = onset.roms[0];
    const spellings = ONSET_SPELLINGS[primary];
    if (!spellings) continue;
    for (const vk of VOWEL_ROW) {
      if (onset.kana[vk] !== kana) continue;
      for (const cprefix of spellings) put(cprefix + vk, kana);
    }
  }
  for (const [rom, kana] of Object.entries(IRREGULAR)) put(rom, kana);

  // yōon spellings: ky/gy/.../ + a/u/o, plus sh/ch/j variants.
  const YOON_PREFIX: Record<string, string> = {
    ky: "き",
    gy: "ぎ",
    sy: "し",
    sh: "し",
    ty: "ち",
    ch: "ち",
    ny: "に",
    hy: "ひ",
    by: "び",
    py: "ぴ",
    my: "み",
    ry: "り",
    jy: "じ",
    j: "じ",
  };
  for (const [prefix, baseKana] of Object.entries(YOON_PREFIX)) {
    const small: Record<VowelKey, string> = {
      a: "ゃ",
      u: "ゅ",
      o: "ょ",
      i: "",
      e: "",
    };
    for (const vk of ["a", "u", "o"] as const) {
      put(prefix + vk, baseKana + small[vk]);
    }
  }
  return map;
})();

/** romaji syllable keys, longest first, so we match greedily. */
const ROMAJI_KEYS = Object.keys(ROMAJI_TO_KANA).sort(
  (a, b) => b.length - a.length,
);

const isLatinLetter = (ch: string) => /[a-z]/i.test(ch);

const MACRON_VOWEL: Record<string, string> = {
  ā: "a",
  ī: "i",
  ū: "u",
  ē: "e",
  ō: "o",
};
/** Sentinel inserted in place of a macron's "+ long" so it attaches to the
 *  preceding consonant: tōkyō → t,o,LONG,k,y,o,LONG → と + 長 + きょ + 長. */
const LONG_SENTINEL = "\u0001";

/**
 * Tokenize Japanese text into mora tokens. Handles romaji (greedy longest
 * syllable match, double-consonant sokuon kk→っ, trailing/standalone n→ん,
 * macrons and "-"/"~" as long marks) and hands any run of kana to
 * tokenizeKana, so kana, romaji, and mixed input all work. Unknown runs become
 * errors.
 */
function tokenizeJapanese(input: string): MoraToken[] {
  // Expand macron vowels to plain vowel + a long sentinel so a consonant before
  // the macron (tō) still forms its syllable before the long mark applies.
  const lower = Array.from(input.toLowerCase())
    .map((c) => (c in MACRON_VOWEL ? MACRON_VOWEL[c] + LONG_SENTINEL : c))
    .join("");
  const chars = Array.from(lower);
  const tokens: MoraToken[] = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    // long mark (explicit -, ー, ~, ˉ, or the macron sentinel)
    if (
      ch === "-" ||
      ch === "ー" ||
      ch === "~" ||
      ch === "ˉ" ||
      ch === LONG_SENTINEL
    ) {
      tokens.push({ t: "long", src: ch === LONG_SENTINEL ? "" : ch });
      i++;
      continue;
    }
    if (isSpace(ch)) {
      tokens.push({ t: "space", src: input[i] ?? ch });
      i++;
      continue;
    }
    // A run of kana (or kana-adjacent marks) — hand it to the kana tokenizer so
    // mixed かな/ローマ字 input (e.g. "ありgatou") just works.
    if (isKana(ch)) {
      let j = i;
      while (j < chars.length && isKana(chars[j])) j++;
      tokens.push(...tokenizeKana(chars.slice(i, j).join("")));
      i = j;
      continue;
    }
    if (!isLatinLetter(ch)) {
      tokens.push({ t: "error", src: input[i] ?? ch });
      i++;
      continue;
    }

    // sokuon: doubled consonant (kk, tt, ...) but not "nn" (=ん) and not a vowel.
    const nextCh = chars[i + 1];
    if (
      ch === nextCh &&
      ch !== "n" &&
      !"aiueo".includes(ch) &&
      isLatinLetter(ch)
    ) {
      tokens.push({ t: "sokuon", src: input[i] ?? ch });
      i++;
      continue;
    }

    // ん: "nn" or "n'" → ん; bare "n" not followed by a vowel/y → ん.
    if (ch === "n") {
      if (nextCh === "n") {
        tokens.push({ t: "nasal", src: lower.slice(i, i + 2), kana: "ん" });
        i += 2;
        continue;
      }
      if (nextCh === "'") {
        tokens.push({ t: "nasal", src: lower.slice(i, i + 2), kana: "ん" });
        i += 2;
        continue;
      }
      if (nextCh == null || !/[aiueoy]/.test(nextCh)) {
        tokens.push({ t: "nasal", src: ch, kana: "ん" });
        i++;
        continue;
      }
    }

    // greedy longest syllable match
    const rest = lower.slice(i);
    const key = ROMAJI_KEYS.find((k) => rest.startsWith(k));
    if (key) {
      const kana = ROMAJI_TO_KANA[key];
      tokens.push(...tokenizeKana(kana));
      i += key.length;
      continue;
    }

    tokens.push({ t: "error", src: input[i] ?? ch });
    i++;
  }

  return tokens;
}

const ANUSVARA = "ං"; // anusvara ං = /ŋ/

/** ん as anusvara ං (the velar nasal /ŋ/), a sign-like candidate. */
function anusvaraCandidate(note?: string): Candidate {
  const char: SinhalaChar = {
    // a minimal sign-like SinhalaChar; only display fields are used by the UI.
    id: "s:ṃ",
    family: "sign",
    rom: "ṃ",
    ipa: "ŋ",
    kana: "ん",
    sign: ANUSVARA,
    name: "anusvara",
    position: "right",
  };
  return { char, glyph: ANUSVARA, rom: "ṃ", kana: "ん", note };
}

/** ん as a nasal consonant + hal kirīma (න් or ම්). */
function viramaNasalCandidate(rom: "na" | "ma", note?: string): Candidate {
  const c = cons(rom);
  const base = rom.replace(/a$/, ""); // "n" / "m"
  return {
    char: c,
    glyph: c.glyph + VIRAMA,
    rom: base,
    kana: "ん",
    note,
  };
}

/**
 * ん/ン. Default is න් (n + hal kirīma), matching attested spellings (ජපන්,
 * රාමෙන්). The following consonant shifts the preferred form: velar か/が →
 * anusvara ං /ŋ/; labial ぱ/ば/ま → ම් /m/. The contextually-preferred form is
 * the first candidate; the others stay available as alternatives.
 */
function nasalSegment(
  source: string,
  sourceKana: string,
  next: Onset | null,
): Segment {
  const nextRom = next?.roms[0];
  const velar = nextRom === "ka" || nextRom === "ga";
  const labial = nextRom === "pa" || nextRom === "ba" || nextRom === "ma";

  const dental = viramaNasalCandidate("na", "n");
  const anusvara = anusvaraCandidate("ガ行鼻 ŋ");
  const labialNasal = viramaNasalCandidate("ma", "m");

  let candidates: Candidate[];
  if (velar) candidates = [anusvara, dental];
  else if (labial) candidates = [labialNasal, dental, anusvara];
  else candidates = [dental, anusvara];

  return { kind: "mapped", source, sourceKana, candidates };
}

/**
 * 促音 (っ): geminate a mapped segment by prefixing each candidate's onset
 * consonant + hal kirīma (っか → ක්ක). The doubling consonant is taken from each
 * candidate's own char so alternatives stay consistent (っと → ත්ත / ට්ට). The
 * sokuon source (っ) is folded into the segment so the chip reads back correctly.
 */
function geminate(seg: Segment, sokuonSrc: string): Segment {
  if (seg.kind !== "mapped") return seg;
  // Consonants whose gemination is phonologically marginal in Sinhala.
  const MARGINAL = new Set(["ha", "fa", "ṣa", "śa"]);
  const candidates = seg.candidates
    .map((c) => geminateCandidate(c, MARGINAL))
    .filter((c): c is Candidate => c !== null);
  if (candidates.length === 0) {
    // Nothing doublable (e.g. a bare vowel) — fall back to the plain segment.
    return seg;
  }
  return {
    kind: "mapped",
    source: sokuonSrc + seg.source,
    sourceKana: `っ${seg.sourceKana}`,
    candidates,
  };
}

function geminateCandidate(
  c: Candidate,
  marginal: Set<string>,
): Candidate | null {
  const char = c.char;
  const base =
    char.family === "syllable"
      ? char.consonant
      : char.family === "consonant"
        ? char
        : null;
  if (!base) return null; // vowels can't geminate
  const note = marginal.has(base.rom)
    ? [c.note, "重子音は近似"].filter(Boolean).join(" / ")
    : c.note;
  return {
    char,
    glyph: base.glyph + VIRAMA + c.glyph,
    rom: base.rom.replace(/a$/, "") + c.rom,
    kana: `っ${c.kana}`,
    note: note || undefined,
  };
}

/**
 * Yōon (きゃ/しゃ/ちゃ …). Non-palatal onsets take the yansaya (-ya) conjunct,
 * e.g. きゃ → ක්‍ය. Palatal onsets (ち→ච, し→ෂ, じ→ජ) are already palatal, so
 * they render as a plain consonant + vowel syllable with no yansaya, e.g.
 * ちゃ → චා, しゃ → ෂ + ā, じゃ → ජ + ā.
 */
function yoonCandidates(
  onset: Onset,
  vk: VowelKey,
  sourceKana: string,
): Candidate[] {
  const vs = sign(vk);
  const ambiguous = onset.roms.length > 1;
  return onset.roms.map((cRom) => {
    const c = cons(cRom);
    const note = ambiguous ? CONS_NOTE[cRom] : undefined;
    if (PALATAL_ROMS.has(cRom)) {
      const syl = composeSyllable(c, vs);
      return {
        char: syl,
        glyph: syl.glyph,
        rom: syl.rom,
        kana: sourceKana,
        note,
      };
    }
    const baseRom = c.rom.replace(/a$/, "");
    return {
      char: c,
      glyph: c.glyph + YANSAYA + vs.sign,
      rom: `${baseRom}y${vk}`,
      kana: sourceKana,
      note,
    };
  });
}

/**
 * Apply a 長音符 ー by lengthening the preceding mapped segment's vowel in
 * place: the short vowel sign is replaced by its long (dīrgha) partner — e.g.
 * と තො → とー තෝ — rather than stacking a stray sign. The ー is folded into the
 * segment's source so the chip still reads back correctly. Returns false when
 * there is no preceding lengthenable segment (→ verbatim error).
 */
function applyLongMark(segments: Segment[], mark: string): boolean {
  const last = segments[segments.length - 1];
  if (last?.kind !== "mapped") return false;
  const lengthened = last.candidates
    .map((c) => lengthenCandidate(c))
    .filter((c): c is Candidate => c !== null);
  if (lengthened.length === 0) return false;
  last.candidates = lengthened;
  last.source += mark;
  last.sourceKana += "ー";
  return true;
}

/**
 * Merge a bare-vowel token into the preceding mapped segment as a long vowel
 * (とう → තෝ), keeping the un-lengthened two-glyph reading (තො + උ) as an
 * alternative candidate so false positives (思う, えいご) can be corrected. Each
 * preceding candidate yields [long, short] in order. Returns false when the
 * previous segment can't be lengthened (→ caller emits a normal vowel segment).
 */
function applyVowelLengthening(
  segments: Segment[],
  vk: VowelKey,
  src: string,
  kana: string,
): boolean {
  const last = segments[segments.length - 1];
  if (last?.kind !== "mapped") return false;
  const tail = vowelCandidate(vk, kana); // the bare-vowel reading we'd otherwise emit
  const merged: Candidate[] = [];
  for (const c of last.candidates) {
    const long = lengthenCandidate(c);
    if (!long) return false; // not lengthenable → keep as separate vowel
    // long primary drops the appended "ー" marker from its kana; show the
    // actual two-kana source instead (e.g. とう, not とー).
    merged.push({ ...long, kana: c.kana + kana });
    merged.push({
      char: tail.char,
      glyph: c.glyph + tail.glyph,
      rom: c.rom + tail.rom,
      kana: c.kana + tail.kana,
      note: c.note,
    });
  }
  last.candidates = merged;
  last.source += src;
  last.sourceKana += kana;
  return true;
}

/**
 * Rebuild a candidate with its vowel lengthened (short sign → long sign).
 * Handles independent vowels, plain syllables, and yōon (consonant-base
 * candidates whose glyph already carries a short sign). Returns null when the
 * candidate has no lengthenable vowel.
 */
function lengthenCandidate(c: Candidate): Candidate | null {
  const char = c.char;

  // independent vowel: あ අ → あー ආ
  if (char.family === "vowel") {
    const longRom = SHORT_TO_LONG_SIGN[char.rom];
    const longVowel = longRom ? vowelByRom.get(longRom) : undefined;
    if (!longVowel) return null;
    return {
      char: longVowel,
      glyph: longVowel.glyph,
      rom: longVowel.rom,
      kana: `${c.kana}ー`,
    };
  }

  // plain syllable: replace its short vowel sign with the long one.
  if (char.family === "syllable") {
    const longRom = SHORT_TO_LONG_SIGN[char.sign.rom];
    const longSign = longRom ? signByRom.get(longRom) : undefined;
    if (!longSign) return null;
    const syl = composeSyllable(char.consonant, longSign);
    return {
      char: syl,
      glyph: syl.glyph,
      rom: syl.rom,
      kana: `${c.kana}ー`,
      note: c.note,
    };
  }

  // yōon (consonant base): the short vowel sign is the trailing combining mark
  // on the glyph; swap it for the long sign.
  if (char.family === "consonant") {
    const shortSignChar = Array.from(c.glyph).find((m) =>
      signByCombining.has(m),
    );
    const shortSign = shortSignChar
      ? signByCombining.get(shortSignChar)
      : undefined;
    if (!shortSign) return null;
    const longRom = SHORT_TO_LONG_SIGN[shortSign.rom];
    const longSign = longRom ? signByRom.get(longRom) : undefined;
    if (!longSign) return null;
    return {
      char,
      glyph: c.glyph.replace(shortSign.sign, longSign.sign),
      rom: c.rom.replace(/.$/, longSign.rom),
      kana: `${c.kana}ー`,
      note: c.note,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sinhala → reading
// ---------------------------------------------------------------------------

const VIRAMA = "්"; // hal kirīma ්
const ZWJ = "‍";

const consByGlyph = new Map(consonants.map((c) => [c.glyph, c]));
const vowelByGlyph = new Map(independentVowels.map((v) => [v.glyph, v]));
const signByCombining = new Map(
  vowelSigns.filter((s) => s.sign !== "").map((s) => [s.sign, s]),
);

/** One readable unit of a Sinhala string. */
export type ReadSegment =
  | {
      kind: "syllable";
      source: string;
      glyph: string;
      rom: string;
      kana: string;
      ipa: string;
    }
  | { kind: "error"; source: string }
  | { kind: "space"; source: string };

/** Combining marks that attach to the preceding base (signs, virama, anusvara). */
function isCombining(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  // Sinhala combining vowel signs + virama live in 0x0DCA..0x0DDF, plus
  // anusvara/visarga at 0x0D82/0x0D83.
  return (
    (code >= 0x0dca && code <= 0x0ddf) || code === 0x0d82 || code === 0x0d83
  );
}

function isSinhala(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x0d80 && code <= 0x0dff;
}

/**
 * Parse a Sinhala string into readable syllable segments. Each base consonant
 * absorbs a following vowel sign / virama; independent vowels stand alone.
 * Non-Sinhala runs become verbatim error segments.
 */
export function sinhalaToReading(input: string): ReadSegment[] {
  const chars = Array.from(input);
  const out: ReadSegment[] = [];
  let i = 0;

  const pushError = (s: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === "error") last.source += s;
    else out.push({ kind: "error", source: s });
  };
  const pushSpace = (s: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === "space") last.source += s;
    else out.push({ kind: "space", source: s });
  };

  while (i < chars.length) {
    const ch = chars[i];

    if (isSpace(ch)) {
      pushSpace(ch);
      i++;
      continue;
    }
    if (!isSinhala(ch)) {
      pushError(ch);
      i++;
      continue;
    }

    // Anusvara on its own (rare leading) → show as ṃ.
    if (ch === "ං") {
      out.push({
        kind: "syllable",
        source: ch,
        glyph: ch,
        rom: "ṃ",
        kana: "ん",
        ipa: "ŋ",
      });
      i++;
      continue;
    }

    const c = consByGlyph.get(ch);
    if (c) {
      // gather trailing combining marks (sign / virama / anusvara / ZWJ).
      let j = i + 1;
      let combining = "";
      while (j < chars.length && (isCombining(chars[j]) || chars[j] === ZWJ)) {
        combining += chars[j];
        j++;
      }
      out.push(readConsonant(c, combining, ch + combining));
      i = j;
      continue;
    }

    const v = vowelByGlyph.get(ch);
    if (v) {
      out.push({
        kind: "syllable",
        source: ch,
        glyph: v.glyph,
        rom: v.rom,
        kana: v.kana,
        ipa: v.ipa,
      });
      i++;
      continue;
    }

    // Lone combining mark or unsupported Sinhala char.
    pushError(ch);
    i++;
  }

  return out;
}

function readConsonant(
  c: Consonant,
  combining: string,
  source: string,
): ReadSegment {
  const glyph = c.glyph + combining;
  const baseRom = c.rom.replace(/a$/, "");

  // hal kirīma (consonant only, inherent a removed).
  if (combining.includes(VIRAMA) && !combining.includes(ZWJ)) {
    return {
      kind: "syllable",
      source,
      glyph,
      rom: baseRom,
      kana: stripVowelKana(c.kana),
      ipa: c.ipa,
    };
  }

  // anusvara after the syllable.
  const hasAnusvara = combining.includes("ං");

  // find a vowel sign in the combining marks.
  const signChar = Array.from(combining).find((m) => signByCombining.has(m));
  const sign = signChar ? signByCombining.get(signChar) : undefined;

  if (sign) {
    const syl = composeSyllable(c, sign);
    return {
      kind: "syllable",
      source,
      glyph,
      rom: syl.rom + (hasAnusvara ? "ṃ" : ""),
      kana: (signKana(c, sign) || syl.kana) + (hasAnusvara ? "ん" : ""),
      ipa: syl.ipa + (hasAnusvara ? "ŋ" : ""),
    };
  }

  // bare consonant = inherent a.
  return {
    kind: "syllable",
    source,
    glyph,
    rom: c.rom + (hasAnusvara ? "ṃ" : ""),
    kana: c.kana + (hasAnusvara ? "ん" : ""),
    ipa: `${c.ipa}a${hasAnusvara ? "ŋ" : ""}`,
  };
}

/** Drop the trailing vowel of a kana approximation (e.g. か → k(子音)). */
function stripVowelKana(kana: string): string {
  // The data's kana already encodes consonant+a; for hal we just show it raw
  // with a marker, since there's no clean "consonant-only" kana.
  return `${kana}(子音)`;
}

/**
 * Best-effort kana for a consonant + vowel sign. The dataset only stores kana
 * for the inherent-a row, so we splice the consonant's onset with the sign's
 * vowel kana for the other rows.
 */
function signKana(c: Consonant, sign: VowelSign): string {
  if (sign.rom === "a") return c.kana;
  return KANA_TABLE[c.rom]?.[sign.rom] ?? "";
}
