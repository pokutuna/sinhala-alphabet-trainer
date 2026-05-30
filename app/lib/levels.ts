import {
  type Consonant,
  consonants,
  getCharById,
  independentVowels,
  type SinhalaChar,
  vowelSigns,
} from "~/lib/sinhala";

export type LevelId = "lv1" | "lv2" | "lv3" | "lv4" | "lv5";

export interface Level {
  id: LevelId;
  label: string;
  /** Short description of what this level adds. */
  desc: string;
}

export const LEVELS: Level[] = [
  {
    id: "lv1",
    label: "Lv1 基本子音",
    desc: "純粋子音の無声・有声・鼻音・半母音・摩擦",
  },
  { id: "lv2", label: "Lv2 基本母音", desc: "独立母音 6 対" },
  { id: "lv3", label: "Lv3 母音記号", desc: "母音記号 pilla（基本 12 種）" },
  {
    id: "lv4",
    label: "Lv4 残りの子音",
    desc: "そり舌・前鼻音化など純粋子音の残り",
  },
  {
    id: "lv5",
    label: "Lv5 混成字母",
    desc: "有気音・サンスクリット用など (miśra)",
  },
];

// Lv1: high-frequency pure consonants (voiceless / voiced / nasal ම න /
// approximants / fricatives). Ordered velar -> labial, then liquids/sibilants.
const LV1_CONSONANT_ROMS = [
  "ka",
  "ga",
  "ca",
  "ja",
  "ṭa",
  "ḍa",
  "ta",
  "da",
  "na",
  "pa",
  "ba",
  "ma",
  "ya",
  "ra",
  "la",
  "va",
  "sa",
  "ha",
  "ḷa",
];

const lv1Ids = LV1_CONSONANT_ROMS.map((rom) => `c:${rom}`);

// Lv2: basic independent vowels (non-misra).
const lv2Ids = independentVowels.filter((v) => !v.misra).map((v) => v.id);

// Lv3: basic vowel signs. au is the only misra vowel sign, so keep it for Lv5.
const lv3Ids = vowelSigns.filter((s) => s.rom !== "au").map((s) => s.id);

// Lv4: remaining pure consonants not already in Lv1.
const lv1ConsonantSet = new Set(lv1Ids);
const lv4Ids = consonants
  .filter((c) => !c.misra && !lv1ConsonantSet.has(c.id))
  .map((c) => c.id);

// Lv5: all misra characters (consonants, vowels, and the au vowel sign).
const lv5Ids = [
  ...consonants.filter((c) => c.misra).map((c) => c.id),
  ...independentVowels.filter((v) => v.misra).map((v) => v.id),
  ...vowelSigns.filter((s) => s.rom === "au").map((s) => s.id),
];

const LEVEL_IDS: Record<LevelId, string[]> = {
  lv1: lv1Ids,
  lv2: lv2Ids,
  lv3: lv3Ids,
  lv4: lv4Ids,
  lv5: lv5Ids,
};

/** ids belonging to a single level. */
export function idsForLevel(level: LevelId): string[] {
  return LEVEL_IDS[level];
}

/** ids from lv1 up to and including the given level (cumulative). */
export function cumulativeUpTo(level: LevelId): string[] {
  const out: string[] = [];
  for (const l of LEVELS) {
    out.push(...LEVEL_IDS[l.id]);
    if (l.id === level) break;
  }
  return out;
}

// --- consonant bands for the composition chart (Japanese kana grouping) ---

/**
 * Six independently-toggleable categories, distinguished by color in the
 * chart (no separator rows). Each consonant belongs to exactly one:
 *  seion     清音          — plain か/さ/た/な/ま/や/ら/わ type sounds
 *  dakuon    濁音・半濁音    — voiced が/だ/ば + half-voiced ぱ
 *  yoon      拗音          — palatalized ちゃ/じゃ/しゃ
 *  nasal     鼻濁音         — prenasalized んが/んじゃ/んだ/んば + ṅa
 *  aspirated 息付き         — aspirated か(息)/た(息)… (息付き, Sanskrit)
 *  other     外来音         — borrowed sounds (ふぁ)
 */
export type ConsonantBandId =
  | "seion"
  | "dakuon"
  | "yoon"
  | "nasal"
  | "aspirated"
  | "other";

export interface ConsonantBand {
  id: ConsonantBandId;
  label: string;
  consonants: Consonant[];
}

const consonantByRom = new Map(consonants.map((c) => [c.rom, c]));
const con = (rom: string): Consonant => {
  const c = consonantByRom.get(rom);
  if (!c) throw new Error(`unknown consonant rom: ${rom}`);
  return c;
};

/** The category each consonant belongs to. */
const BAND_BY_ROM: Record<string, ConsonantBandId> = {
  // 清音: plain voiceless stops, the base nasals (な/ま行), base fricatives, semivowels/liquids
  ka: "seion",
  ṭa: "seion",
  ta: "seion",
  na: "seion",
  ña: "seion",
  ṇa: "seion",
  ma: "seion",
  sa: "seion",
  ha: "seion",
  ya: "seion",
  ra: "seion",
  la: "seion",
  ḷa: "seion",
  va: "seion",
  // 濁音・半濁音: voiced stops + half-voiced ぱ
  ga: "dakuon",
  ḍa: "dakuon",
  da: "dakuon",
  ba: "dakuon",
  pa: "dakuon",
  // 拗音: palatal ちゃ/じゃ + sibilant しゃ
  ca: "yoon",
  ja: "yoon",
  śa: "yoon",
  ṣa: "yoon",
  // 鼻濁音: prenasalized + ṅa
  ṅa: "nasal",
  ⁿga: "nasal",
  ⁿja: "nasal",
  ⁿḍa: "nasal",
  ⁿda: "nasal",
  ᵐba: "nasal",
  // 息付き: aspirated (voiceless/voiced aspirated)
  kha: "aspirated",
  gha: "aspirated",
  cha: "aspirated",
  jha: "aspirated",
  ṭha: "aspirated",
  ḍha: "aspirated",
  tha: "aspirated",
  dha: "aspirated",
  pha: "aspirated",
  bha: "aspirated",
  // 外来音: borrowed sounds
  fa: "other",
};

const bandOf = (rom: string): ConsonantBandId => {
  const b = BAND_BY_ROM[rom];
  if (!b) throw new Error(`no band for consonant rom: ${rom}`);
  return b;
};

/**
 * Canonical chart row order, based on the Japanese gojūon rows
 * (あ→か→さ→た→な→は→ま→や→ら→わ). Within each row the related kin
 * (voiced, palatalized, prenasalized, aspirated, retroflex) sit right after the
 * plain anchor, so toggling a band on slots its rows into place. な行 is its own
 * row (the base nasals); retroflex stops fold into た行. Covers all 40
 * consonants exactly once.
 */
const CHART_ROW_ROMS = [
  // か行
  "ka",
  "ga",
  "ⁿga",
  "ṅa",
  "kha",
  "gha",
  // さ行 (さ・しゃ・じゃ)
  "sa",
  "śa",
  "ṣa",
  "ja",
  "ⁿja",
  "jha",
  // た行 (歯 + そり舌 + ちゃ)
  "ta",
  "da",
  "ⁿda",
  "ṭa",
  "ḍa",
  "ⁿḍa",
  "ca",
  "tha",
  "dha",
  "ṭha",
  "ḍha",
  "cha",
  // な行 (base nasals)
  "na",
  "ña",
  "ṇa",
  // は行 (は・ぱ・ば・ふぁ)
  "ha",
  "pa",
  "ba",
  "ᵐba",
  "fa",
  "pha",
  "bha",
  // ま行
  "ma",
  // や行
  "ya",
  // ら行
  "ra",
  "la",
  "ḷa",
  // わ行
  "va",
];

/** Display label for each band. */
export const BAND_LABELS: Record<ConsonantBandId, string> = {
  seion: "清音",
  dakuon: "濁音・半濁音",
  yoon: "拗音",
  nasal: "鼻濁音",
  aspirated: "息付き",
  other: "外来音",
};

export const CONSONANT_BANDS: ConsonantBand[] = (
  [
    "seion",
    "dakuon",
    "yoon",
    "nasal",
    "aspirated",
    "other",
  ] as ConsonantBandId[]
).map((id) => ({
  id,
  label: BAND_LABELS[id],
  consonants: CHART_ROW_ROMS.filter((rom) => bandOf(rom) === id).map(con),
}));

// --- interleaved chart-row model for the composition table ---

/** Which bands the composition chart currently shows; each toggled
 *  independently. The chart row order is fixed regardless of which are on. */
export interface ChartBands {
  seion: boolean;
  dakuon: boolean;
  yoon: boolean;
  nasal: boolean;
  aspirated: boolean;
  other: boolean;
}

/** A row in the composition chart, tagged with its band for coloring. */
export interface ChartRow {
  band: ConsonantBandId;
  consonant: Consonant;
}

/** The ordered chart rows, filtered to the bands currently toggled on. */
export function chartRows(bands: ChartBands): ChartRow[] {
  return CHART_ROW_ROMS.map((rom) => ({
    band: bandOf(rom),
    consonant: con(rom),
  })).filter((row) => bands[row.band]);
}

/** Resolve a list of ids to characters, dropping any unknown ids. */
export function charsForIds(ids: string[]): SinhalaChar[] {
  return ids.map((id) => getCharById(id)).filter((c): c is SinhalaChar => !!c);
}

/**
 * Dev-time check: every id referenced by a level must exist in the dataset.
 * Returns the list of missing ids (empty when all valid).
 */
export function validateLevels(): string[] {
  const missing: string[] = [];
  for (const l of LEVELS) {
    for (const id of LEVEL_IDS[l.id]) {
      if (!getCharById(id)) missing.push(id);
    }
  }
  return missing;
}
