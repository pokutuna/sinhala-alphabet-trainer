import { partsColoring } from "~/lib/sinhala";

/**
 * Hand-authored "letter anatomy" art for the part-by-part visualization.
 *
 * A font cannot be split into anatomical parts (Hook / Spiral / Terminal …)
 * programmatically — each character is a single glyph path with no internal
 * boundaries. So internal-part coloring is provided as hand-made SVG, added one
 * character at a time. Characters without art fall back to the safe text /
 * position visualization in CharParts.
 */

export type PartRoleKey =
  | "consonant_base"
  | "vowel_sign"
  | "hal"
  | "conjunct"
  | "hook"
  | "spiral"
  | "terminal";

export interface PartSpan {
  role: PartRoleKey;
  /** Japanese label shown in the legend, e.g. 「フック」 */
  label: string;
  /** One or more SVG path `d` values that make up this part. */
  paths: string[];
}

export interface PartsArt {
  charId: string;
  /** SVG viewBox, e.g. "0 0 100 100". */
  viewBox: string;
  /** Parts in draw order. */
  spans: PartSpan[];
}

// Colors come from the dataset's parts_coloring roles where available, with a
// few extra anatomical roles defined here.
const ROLE_COLOR: Record<PartRoleKey, string> = {
  consonant_base: "#2b6cb0",
  vowel_sign: "#dd6b20",
  hal: "#718096",
  conjunct: "#805ad5",
  hook: "#2f855a",
  spiral: "#b7791f",
  terminal: "#c53030",
};

// Pull any overrides from the dataset so colors stay in one place.
for (const r of partsColoring.roles) {
  if (r.role in ROLE_COLOR) {
    ROLE_COLOR[r.role as PartRoleKey] = r.suggest_color;
  }
}

export function partColor(role: PartRoleKey): string {
  return ROLE_COLOR[role];
}

/**
 * Hand-made anatomy art, keyed by char id (e.g. "c:ka").
 * Empty for now — added a few characters at a time (step C of the plan).
 */
const ART: Record<string, PartsArt> = {};

export function getPartsArt(id: string): PartsArt | undefined {
  return ART[id];
}
