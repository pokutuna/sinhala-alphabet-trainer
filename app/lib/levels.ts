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

// --- consonant frequency bands for the composition chart ---

export type ConsonantBandId = "basic" | "rest" | "misra";

export interface ConsonantBand {
  id: ConsonantBandId;
  label: string;
  /** consonants newly introduced at this band (not in earlier bands). */
  consonants: Consonant[];
}

const lv1ConsonantOrder = new Map(lv1Ids.map((id, i) => [id, i]));

/**
 * Consonants grouped into cumulative frequency bands:
 *  basic = Lv1 high-frequency pure consonants (in learning order)
 *  rest  = remaining pure consonants (Lv4)
 *  misra = miśra characters (Lv5 consonants)
 */
export const CONSONANT_BANDS: ConsonantBand[] = [
  {
    id: "basic",
    label: "基本子音",
    consonants: consonants
      .filter((c) => lv1ConsonantOrder.has(c.id))
      .sort(
        (a, b) =>
          (lv1ConsonantOrder.get(a.id) ?? 0) -
          (lv1ConsonantOrder.get(b.id) ?? 0),
      ),
  },
  {
    id: "rest",
    label: "残りの純粋子音",
    consonants: consonants.filter(
      (c) => !c.misra && !lv1ConsonantOrder.has(c.id),
    ),
  },
  {
    id: "misra",
    label: "混成字母 (miśra)",
    consonants: consonants.filter((c) => c.misra),
  },
];

/** Bands from the first up to and including the given band (cumulative). */
export function bandsUpTo(band: ConsonantBandId): ConsonantBand[] {
  const out: ConsonantBand[] = [];
  for (const b of CONSONANT_BANDS) {
    out.push(b);
    if (b.id === band) break;
  }
  return out;
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
