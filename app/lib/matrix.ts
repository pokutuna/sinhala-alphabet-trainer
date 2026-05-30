import { type Consonant, consonants } from "~/lib/sinhala";

/** Place rows of the consonant matrix, in articulation order. */
export const PLACES: { key: string; label: string }[] = [
  { key: "velar", label: "軟口蓋 (のど)" },
  { key: "palatal", label: "硬口蓋 (前舌)" },
  { key: "retroflex", label: "そり舌" },
  { key: "dental", label: "歯" },
  { key: "labial", label: "唇" },
];

/** Manner columns of the consonant matrix. */
export const MANNERS: { key: string; label: string }[] = [
  { key: "voiceless", label: "無声" },
  { key: "voiceless_aspirated", label: "無声有気" },
  { key: "voiced", label: "有声" },
  { key: "voiced_aspirated", label: "有声有気" },
  { key: "nasal", label: "鼻音" },
  { key: "prenasalized", label: "前鼻音化" },
];

/** Consonants that don't fit the place×manner grid (semivowels, sibilants…). */
export const OFF_GRID_MANNERS = new Set(["approximant", "fricative"]);

export interface MatrixCell {
  place: string;
  manner: string;
  char: Consonant | null;
}

/**
 * Build the place×manner grid from the given consonant pool.
 * Returns rows aligned to PLACES, each with cells aligned to MANNERS.
 */
export function buildMatrix(pool: Consonant[]): MatrixCell[][] {
  return PLACES.map((p) =>
    MANNERS.map((m) => ({
      place: p.key,
      manner: m.key,
      char: pool.find((c) => c.place === p.key && c.manner === m.key) ?? null,
    })),
  );
}

/** Consonants from the pool that are not part of the place×manner grid. */
export function offGridConsonants(pool: Consonant[]): Consonant[] {
  return pool.filter((c) => OFF_GRID_MANNERS.has(c.manner));
}

export type { Consonant };
export { consonants };
