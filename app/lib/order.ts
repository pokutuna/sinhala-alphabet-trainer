import {
  type Consonant,
  consonants,
  independentVowels,
  type Vowel,
} from "~/lib/sinhala";

// --- phonological (varga) ordering shared by the Hōḍiya list & the matrix ---

/** Articulation places in traditional varga order, then the avarga groups. */
export const PLACE_ORDER = [
  "velar",
  "palatal",
  "retroflex",
  "dental",
  "labial",
  "semivowel",
  "liquid",
  "sibilant",
  "glottal",
] as const;

export type Place = (typeof PLACE_ORDER)[number];

/** Manners in traditional order: stops by voicing/aspiration, then nasal,
 *  prenasalized, and the avarga manners (approximant, fricative). */
export const MANNER_ORDER = [
  "voiceless",
  "voiceless_aspirated",
  "voiced",
  "voiced_aspirated",
  "nasal",
  "prenasalized",
  "approximant",
  "fricative",
] as const;

export type Manner = (typeof MANNER_ORDER)[number];

/** Japanese labels for places (for section / row headers). */
export const PLACE_LABEL: Record<Place, string> = {
  velar: "軟口蓋 (ka 行)",
  palatal: "硬口蓋 (ca 行)",
  retroflex: "そり舌 (ṭa 行)",
  dental: "歯 (ta 行)",
  labial: "唇 (pa 行)",
  semivowel: "半母音",
  liquid: "流音",
  sibilant: "歯擦音",
  glottal: "声門",
};

/** Japanese labels for the stop-manner matrix columns. */
export const MANNER_LABEL: Record<Manner, string> = {
  voiceless: "無声",
  voiceless_aspirated: "無声有気",
  voiced: "有声",
  voiced_aspirated: "有声有気",
  nasal: "鼻音",
  prenasalized: "前鼻音化",
  approximant: "接近音",
  fricative: "摩擦音",
};

const placeRank = new Map(PLACE_ORDER.map((p, i) => [p, i]));
const mannerRank = new Map(MANNER_ORDER.map((m, i) => [m, i]));

function consonantSortKey(c: Consonant): number {
  const p = placeRank.get(c.place as Place) ?? PLACE_ORDER.length;
  const m = mannerRank.get(c.manner as Manner) ?? MANNER_ORDER.length;
  return p * 100 + m;
}

/** Consonants in traditional Hōḍiya (varga) order. `misra` toggles the
 *  borrowed/Sanskrit letters; when off, only pure (śuddha) letters appear. */
export function hodiyaConsonants(opts: { misra: boolean }): Consonant[] {
  return consonants
    .filter((c) => (opts.misra ? true : !c.misra))
    .sort((a, b) => consonantSortKey(a) - consonantSortKey(b));
}

/** Independent vowels in Hōḍiya order: short→long pairs first, then the
 *  pairless / borrowed vowels (ai au), with misra gated by the toggle. */
export function hodiyaVowels(opts: { misra: boolean }): Vowel[] {
  const list = independentVowels.filter((v) => (opts.misra ? true : !v.misra));
  // independentVowels is already authored short→long, ṛ ṝ, ai, au — keep it.
  return list;
}

// --- consonant matrix (place × manner) ---

/** The places that form the classic 5×stop varga grid. */
export const MATRIX_PLACES: Place[] = [
  "velar",
  "palatal",
  "retroflex",
  "dental",
  "labial",
];

/** The manner columns shown in the matrix (the stop/nasal manners). */
export const MATRIX_MANNERS: Manner[] = [
  "voiceless",
  "voiceless_aspirated",
  "voiced",
  "voiced_aspirated",
  "nasal",
  "prenasalized",
];

export interface ConsonantMatrix {
  /** rows[place] -> manner -> consonant | null (null = empty cell). */
  rows: { place: Place; cells: (Consonant | null)[] }[];
  /** Letters whose place is outside the 5-varga grid (semivowel, liquid,
   *  sibilant, glottal); rendered as a flowing list under the grid. */
  avarga: Consonant[];
}

/** Build the place×manner matrix. `misra` toggles borrowed letters; off cells
 *  become empty placeholders so the grid stays aligned. */
export function consonantMatrix(opts: { misra: boolean }): ConsonantMatrix {
  const pool = consonants.filter((c) => (opts.misra ? true : !c.misra));
  const find = (place: Place, manner: Manner) =>
    pool.find((c) => c.place === place && c.manner === manner) ?? null;

  const rows = MATRIX_PLACES.map((place) => ({
    place,
    cells: MATRIX_MANNERS.map((manner) => find(place, manner)),
  }));

  const gridPlaces = new Set<string>(MATRIX_PLACES);
  const avarga = pool
    .filter((c) => !gridPlaces.has(c.place))
    .sort((a, b) => consonantSortKey(a) - consonantSortKey(b));

  return { rows, avarga };
}
