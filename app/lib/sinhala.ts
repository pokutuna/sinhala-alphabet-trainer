import rawData from "~/data/sinhala.json";

// --- Raw JSON shapes (as stored in app/data/sinhala.json) ---

export interface RawConsonant {
  glyph: string;
  rom: string;
  ipa: string;
  kana: string;
  place: string;
  manner: string;
  misra: boolean;
  note: string;
  mnemonic?: string;
}

export interface RawVowel {
  glyph: string;
  rom: string;
  ipa: string;
  kana: string;
  len: string;
  pair: string;
  misra: boolean;
  mnemonic?: string;
}

export interface RawVowelSign {
  rom: string;
  ipa: string;
  kana: string;
  sign: string;
  name: string;
  position: string;
}

export interface RawIrregular {
  syllable: string;
  base: string;
  sign: string;
  note: string;
}

export interface RawConjunct {
  name: string;
  form: string;
  example: string;
  note: string;
}

export interface FontInfo {
  family: string;
  style: string;
  url: string;
  note: string;
}

export interface PartRole {
  role: string;
  desc: string;
  suggest_color: string;
}

interface RawData {
  meta: {
    title: string;
    script: string;
    type: string;
    romanization: string;
    notes: string[];
  };
  vowel_signs: RawVowelSign[];
  hal: RawVowelSign;
  independent_vowels: RawVowel[];
  consonants: RawConsonant[];
  irregular_forms: RawIrregular[];
  conjuncts: RawConjunct[];
  parts_coloring: { description: string; roles: PartRole[]; note: string };
  fonts: { google_fonts: FontInfo[]; compare_tip: string };
  quiz: unknown;
  display_modes: unknown;
}

const data = rawData as RawData;

// --- Enriched entities with stable ids ---

export type CharFamily = "consonant" | "vowel" | "sign";

/** A reading field that can be shown / quizzed on. */
export type ReadingField = "rom" | "ipa" | "kana";

export interface Consonant extends RawConsonant {
  id: string; // c:<rom>
  family: "consonant";
}

export interface Vowel extends RawVowel {
  id: string; // v:<rom>
  family: "vowel";
}

export interface VowelSign extends RawVowelSign {
  id: string; // s:<rom>
  family: "sign";
}

/** A composed syllable = consonant + vowel sign, shown like a character. */
export interface Syllable {
  id: string; // syl:<consonantRom>:<signRom>
  family: "syllable";
  consonant: Consonant;
  sign: VowelSign;
  glyph: string;
  rom: string;
  ipa: string;
  kana: string;
}

export type SinhalaChar = Consonant | Vowel | VowelSign | Syllable;

export const consonants: Consonant[] = data.consonants.map((c) => ({
  ...c,
  id: `c:${c.rom}`,
  family: "consonant",
}));

export const independentVowels: Vowel[] = data.independent_vowels.map((v) => ({
  ...v,
  id: `v:${v.rom}`,
  family: "vowel",
}));

export const vowelSigns: VowelSign[] = data.vowel_signs.map((s) => ({
  ...s,
  id: `s:${s.rom}`,
  family: "sign",
}));

export const hal = data.hal;
export const irregularForms = data.irregular_forms;
export const conjuncts = data.conjuncts;
export const fonts = data.fonts;
export const partsColoring = data.parts_coloring;
export const meta = data.meta;

// --- id index ---

const byId = new Map<string, SinhalaChar>();
for (const c of [...consonants, ...independentVowels, ...vowelSigns]) {
  byId.set(c.id, c);
}

export function getCharById(id: string): SinhalaChar | undefined {
  if (id.startsWith("syl:")) {
    const [, cRom, sRom] = id.split(":");
    const consonant = consonants.find((c) => c.rom === cRom);
    const sign = vowelSigns.find((s) => s.rom === sRom);
    if (consonant && sign) return composeSyllable(consonant, sign);
    return undefined;
  }
  return byId.get(id);
}

export const allChars: SinhalaChar[] = [
  ...consonants,
  ...independentVowels,
  ...vowelSigns,
];

/** Pure-Sinhala (śuddha) consonants only. */
export const pureConsonants = consonants.filter((c) => !c.misra);

/** Non-misra vowel signs (the basic 12 pilla, excluding au). */
export const basicVowelSigns = vowelSigns.filter((s) => s.rom !== "au");

// --- vowel-column categories for the composition chart ---

/**
 * Each basic vowel sign belongs to exactly one category:
 *  short = the short vowels (a/æ/i/u/e/o), always shown
 *  long  = the long (dīrgha) vowels (ā/ǣ/ī/ū/ē/ō), shown optionally
 */
export type VowelCategory = "short" | "long";

/** roms of the long (dīrgha) basic vowel signs. */
const LONG_SIGN_ROMS = new Set(["ā", "ǣ", "ī", "ū", "ē", "ō"]);

export function isLongSign(s: VowelSign): boolean {
  return LONG_SIGN_ROMS.has(s.rom);
}

export function vowelCategory(s: VowelSign): VowelCategory {
  return isLongSign(s) ? "long" : "short";
}

/**
 * The vowel-sign columns to show, in canonical (data) order. The short vowels
 * are always shown; long vowels are included only when `long` is on.
 */
export function vowelColumns(opts: { long: boolean }): VowelSign[] {
  return basicVowelSigns.filter((s) => (isLongSign(s) ? opts.long : true));
}

/**
 * A composition-chart column: one short vowel slot and its long (dīrgha)
 * partner. The chart never widens for long vowels; instead each column carries
 * both, and the long member is shown as an extra row when long is toggled on.
 */
export interface VowelSlot {
  shortSign: VowelSign;
  longSign?: VowelSign;
  shortVowel?: Vowel;
  longVowel?: Vowel;
}

/** The 6 short vowel slots (a/æ/i/u/e/o), each paired with its long partner
 *  sign and the matching independent vowels (for the header rows). */
export function vowelSlots(): VowelSlot[] {
  const signByRom = new Map(vowelSigns.map((s) => [s.rom, s]));
  const vowelByRom = new Map(independentVowels.map((v) => [v.rom, v]));
  return basicVowelSigns
    .filter((s) => !isLongSign(s))
    .map((shortSign) => {
      const shortVowel = vowelByRom.get(shortSign.rom);
      // the short independent vowel's `pair` is its long partner's rom.
      const longRom = shortVowel?.pair;
      return {
        shortSign,
        longSign: longRom ? signByRom.get(longRom) : undefined,
        shortVowel,
        longVowel: longRom ? vowelByRom.get(longRom) : undefined,
      };
    });
}

/** Reading label for a character in a given field. */
export function reading(c: SinhalaChar, field: ReadingField): string {
  return c[field];
}

/** The glyph to render for a character (vowel signs render on a carrier ka). */
export const CARRIER = "ක";

export function glyphOf(c: SinhalaChar): string {
  if (c.family === "sign") {
    return CARRIER + c.sign;
  }
  return c.glyph;
}

/** Compose a consonant with a vowel sign into a syllable. */
export function composeSyllable(
  consonant: Consonant,
  sign: VowelSign,
): Syllable {
  // consonant.rom ends in "a" (the inherent vowel); replace it with the sign's
  // vowel, except for the inherent "a" sign which keeps the bare consonant.
  const base = consonant.rom.replace(/a$/, "");
  const rom = sign.rom === "a" ? consonant.rom : base + sign.rom;
  return {
    id: `syl:${consonant.rom}:${sign.rom}`,
    family: "syllable",
    consonant,
    sign,
    glyph: consonant.glyph + sign.sign,
    rom,
    // consonant.ipa carries no vowel; sign.ipa is the vowel → concatenation
    ipa: consonant.ipa + sign.ipa,
    // kana is only reliable for the inherent-a row (か/が…); leave others blank
    kana: sign.rom === "a" ? consonant.kana : "",
  };
}
