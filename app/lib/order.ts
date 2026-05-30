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

/** The 5 stop vargas — the dense part of the matrix (rows). */
export const MATRIX_PLACES: Place[] = [
  "velar",
  "palatal",
  "retroflex",
  "dental",
  "labial",
];

/** The stop/nasal manner columns shown in the main matrix. */
export const MATRIX_MANNERS: Manner[] = [
  "voiceless",
  "voiceless_aspirated",
  "voiced",
  "voiced_aspirated",
  "nasal",
  "prenasalized",
];

export interface ConsonantMatrix {
  /** rows[place] -> manner -> consonant | null (stop cells hold at most one). */
  rows: { place: Place; cells: (Consonant | null)[] }[];
  /** The avarga letters arranged as a separate small grid (see AVARGA_*). */
  avarga: AvargaMatrix;
}

/** Avarga places as columns of the small grid. labial is included for fa
 *  (ふぁ, 唇摩擦音) — the one borrowed letter whose manner (fricative) falls
 *  outside the stop grid even though its place sits in the stop square. */
export const AVARGA_PLACES: Place[] = [
  "semivowel",
  "liquid",
  "sibilant",
  "labial",
  "glottal",
];

/** Avarga manners as the two rows of the small grid. */
export const AVARGA_MANNERS: Manner[] = ["approximant", "fricative"];

export interface AvargaMatrix {
  /** rows[manner] -> place -> consonants (a cell may hold several, e.g.
   *  approximant×liquid = ra la ḷa; empty cells are an empty array). */
  rows: { manner: Manner; cells: Consonant[][] }[];
}

/** Build the stop place×manner matrix plus the avarga manner×place grid.
 *  `misra` toggles borrowed letters; empty cells stay empty so grids align. */
export function consonantMatrix(opts: { misra: boolean }): ConsonantMatrix {
  const pool = consonants.filter((c) => (opts.misra ? true : !c.misra));
  const sortKey = (a: Consonant, b: Consonant) =>
    consonantSortKey(a) - consonantSortKey(b);
  const find = (place: Place, manner: Manner) =>
    pool.find((c) => c.place === place && c.manner === manner) ?? null;
  const cellOf = (place: Place, manner: Manner) =>
    pool.filter((c) => c.place === place && c.manner === manner).sort(sortKey);

  const rows = MATRIX_PLACES.map((place) => ({
    place,
    cells: MATRIX_MANNERS.map((manner) => find(place, manner)),
  }));

  const avarga: AvargaMatrix = {
    rows: AVARGA_MANNERS.map((manner) => ({
      manner,
      cells: AVARGA_PLACES.map((place) => cellOf(place, manner)),
    })),
  };

  return { rows, avarga };
}

// --- consonant glyph-family groups (for the vowel-sign mode's 2-step picker) ---

/**
 * Consonants grouped by glyph family: a "base form" (the varga's voiceless
 * letter, or a representative) anchors each group, and the related letters
 * (aspirates / voiced / nasal / prenasalized of the same articulation, which
 * share the base glyph shape) follow in varga order. Covers all 40 letters.
 */
export interface ConsonantGroup {
  /** rom of the base/representative letter (also the group id). */
  baseRom: string;
  /** Short Japanese label for the group chip. */
  label: string;
  /** Member consonants in display order (the base first). */
  members: Consonant[];
}

const consonantByRomOrder = new Map(consonants.map((c) => [c.rom, c]));
const conByRom = (rom: string): Consonant => {
  const c = consonantByRomOrder.get(rom);
  if (!c) throw new Error(`unknown consonant rom: ${rom}`);
  return c;
};

/** group base rom -> member roms (base first, then glyph-related letters). */
const CONSONANT_GROUP_DEFS: {
  baseRom: string;
  label: string;
  roms: string[];
}[] = [
  {
    baseRom: "ka",
    label: "ka 系",
    roms: ["ka", "kha", "ga", "gha", "ṅa", "ⁿga"],
  },
  {
    baseRom: "ca",
    label: "ca 系",
    roms: ["ca", "cha", "ja", "jha", "ña", "ⁿja"],
  },
  {
    baseRom: "ṭa",
    label: "ṭa 系",
    roms: ["ṭa", "ṭha", "ḍa", "ḍha", "ṇa", "ⁿḍa"],
  },
  {
    baseRom: "ta",
    label: "ta 系",
    roms: ["ta", "tha", "da", "dha", "na", "ⁿda"],
  },
  {
    baseRom: "pa",
    label: "pa 系",
    roms: ["pa", "pha", "ba", "bha", "ma", "ᵐba", "fa"],
  },
  { baseRom: "ya", label: "ya 系", roms: ["ya", "ra", "la", "va", "ḷa"] },
  { baseRom: "sa", label: "sa 系", roms: ["śa", "ṣa", "sa", "ha"] },
];

export const CONSONANT_GROUPS: ConsonantGroup[] = CONSONANT_GROUP_DEFS.map(
  (g) => ({
    baseRom: g.baseRom,
    label: g.label,
    members: g.roms.map(conByRom),
  }),
);
