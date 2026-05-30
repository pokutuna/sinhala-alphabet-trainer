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
 * Four independently-toggleable categories, distinguished by color in the
 * chart (no separator rows). Each consonant belongs to exactly one:
 *  seion  清音          — plain か/た/さ/な/は/ま/ら type sounds
 *  dakuon 濁音・半濁音    — voiced が/だ/ば + half-voiced ぱ
 *  yoon   拗音          — palatalized ちゃ/じゃ/しゃ/にゃ (and aspirated kin)
 *  other  鼻濁音・その他  — prenasalized んが/んだ/んば + remaining (息付き, ふぁ…)
 */
export type ConsonantBandId = "seion" | "dakuon" | "yoon" | "other";

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
  ka: "seion",
  ṭa: "seion",
  ta: "seion",
  sa: "seion",
  na: "seion",
  ṇa: "seion",
  ha: "seion",
  ma: "seion",
  ya: "seion",
  ra: "seion",
  la: "seion",
  ḷa: "seion",
  va: "seion",
  ga: "dakuon",
  ḍa: "dakuon",
  da: "dakuon",
  ba: "dakuon",
  pa: "dakuon",
  ca: "yoon",
  cha: "yoon",
  ja: "yoon",
  jha: "yoon",
  ña: "yoon",
  ⁿja: "yoon",
  śa: "yoon",
  ṣa: "yoon",
  ⁿga: "other",
  ṅa: "other",
  ⁿḍa: "other",
  ⁿda: "other",
  ᵐba: "other",
  fa: "other",
  kha: "other",
  gha: "other",
  ṭha: "other",
  ḍha: "other",
  tha: "other",
  dha: "other",
  pha: "other",
  bha: "other",
};

const bandOf = (rom: string): ConsonantBandId => {
  const b = BAND_BY_ROM[rom];
  if (!b) throw new Error(`no band for consonant rom: ${rom}`);
  return b;
};

/**
 * Canonical chart row order: the articulation families velar→labial, then
 * sibilant / glottal / semivowel-liquid. Within each family the related kin
 * (voiced, palatalized, prenasalized, aspirated) sit right after their plain
 * anchor, so toggling a band on slots its rows into place. Covers all 40
 * consonants exactly once.
 */
const CHART_ROW_ROMS = [
  // velar か
  "ka",
  "ga",
  "ⁿga",
  "ṅa",
  "kha",
  "gha",
  // palatal ちゃ (all 拗音)
  "ca",
  "ja",
  "ⁿja",
  "ña",
  "cha",
  "jha",
  // retroflex た(そり舌)
  "ṭa",
  "ḍa",
  "ⁿḍa",
  "ṇa",
  "ṭha",
  "ḍha",
  // dental た
  "ta",
  "da",
  "ⁿda",
  "na",
  "tha",
  "dha",
  // labial ま/ぱ/ば
  "ma",
  "ba",
  "pa",
  "ᵐba",
  "bha",
  "pha",
  "fa",
  // sibilant さ/しゃ
  "sa",
  "śa",
  "ṣa",
  // glottal は
  "ha",
  // semivowel / liquid や・ら・わ
  "ya",
  "ra",
  "la",
  "ḷa",
  "va",
];

/** Display label for each band. */
export const BAND_LABELS: Record<ConsonantBandId, string> = {
  seion: "清音",
  dakuon: "濁音・半濁音",
  yoon: "拗音",
  other: "鼻濁音・その他",
};

export const CONSONANT_BANDS: ConsonantBand[] = (
  ["seion", "dakuon", "yoon", "other"] as ConsonantBandId[]
).map((id) => ({
  id,
  label: BAND_LABELS[id],
  consonants: CHART_ROW_ROMS.filter((rom) => bandOf(rom) === id).map(con),
}));

/** Every consonant id in chart order — used by the lesson course. */
export function allConsonantIdsInOrder(): string[] {
  return CHART_ROW_ROMS.map((rom) => con(rom).id);
}

// --- interleaved chart-row model for the composition table ---

/** Which bands the composition chart currently shows; each toggled
 *  independently. The chart row order is fixed regardless of which are on. */
export interface ChartBands {
  seion: boolean;
  dakuon: boolean;
  yoon: boolean;
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
