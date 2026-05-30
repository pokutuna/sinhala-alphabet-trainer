import { consonants, independentVowels } from "~/lib/sinhala";

/**
 * Lesson courses ordered for step-by-step learning, from the smallest readable
 * set outward to its derivations:
 *  1. basic-vowels      基本母音      — short independent vowels
 *  2. consonants-major  基本子音      — high-frequency pure consonants (the bare a-form)
 *  3. syllables         音節を作る     — a consonant + each vowel sign = a syllable
 *  4. long-vowels       長音          — the long (dīrgha) counterparts
 *  5. consonants-other  濁音・鼻濁音など — voiced / nasal / しゃ系 derivations
 *  6. consonants-aspirated 息付き・外来音 — aspirated + borrowed
 */
export type Course =
  | "basic-vowels"
  | "consonants-major"
  | "syllables"
  | "long-vowels"
  | "consonants-other"
  | "consonants-aspirated";

export interface LessonCourse {
  id: Course;
  label: string;
  /** Short one-liner (shown in the progress bar / tab title). */
  desc: string;
  /** A sentence or two on what this course covers and why it comes here. */
  about: string;
}

export const COURSES: LessonCourse[] = [
  {
    id: "basic-vowels",
    label: "基本母音",
    desc: "短い独立母音(あ〜)",
    about:
      "まずは単独で書く短い母音 6 つ。すべての音の土台になるので、形と読みをここで覚えます。",
  },
  {
    id: "consonants-major",
    label: "基本子音",
    desc: "高頻度の基本子音(素の a の形)",
    about:
      "よく使う基本の子音。子音は単独だと固有の「a」を含んだ音(か・さ・た…)になります。",
  },
  {
    id: "syllables",
    label: "音節を作る",
    desc: "子音 ka に母音記号を付ける(ka ki ku…)",
    about:
      "子音 ka に母音記号(pilla)を付けると、母音が差し替わって ka・ki・ku… と音が変わります。組み立ての仕組みを体験しましょう。",
  },
  {
    id: "long-vowels",
    label: "長音",
    desc: "伸ばす音(長母音)",
    about:
      "基本母音を伸ばした長い母音。短母音と対になっていて、長さで意味が変わります。",
  },
  {
    id: "consonants-other",
    label: "濁音・鼻濁音など",
    desc: "基本子音からの派生(濁・鼻・しゃ系)",
    about:
      "基本子音から派生した、濁音・鼻濁音・しゃ系など。基本子音を覚えてから取り組むと形の関係が見えます。",
  },
  {
    id: "consonants-aspirated",
    label: "息付き・外来音",
    desc: "有気音(息付き)とふぁ",
    about:
      "息を強く出す有気音(主にサンスクリット由来)と、外来音の「ふぁ」。出番は少なめなので最後に。",
  },
];

const consonantByRom = new Map(consonants.map((c) => [c.rom, c]));
const idsForRoms = (roms: string[]): string[] =>
  roms.map((rom) => {
    const c = consonantByRom.get(rom);
    if (!c) throw new Error(`unknown consonant rom: ${rom}`);
    return c.id;
  });

// 基本子音: high-frequency pure consonants, in gojūon-ish articulation order.
const MAJOR_ROMS = [
  "ka",
  "ga",
  "sa",
  "ca",
  "ja",
  "ta",
  "da",
  "na",
  "ṭa",
  "ḍa",
  "ha",
  "pa",
  "ba",
  "ma",
  "ya",
  "ra",
  "la",
  "ḷa",
  "va",
];

// 濁音・鼻濁音など: nasals / prenasalized / sibilant しゃ系.
const OTHER_ROMS = [
  "ⁿga",
  "ṅa",
  "śa",
  "ṣa",
  "ña",
  "ⁿja",
  "ṇa",
  "ⁿḍa",
  "ⁿda",
  "ᵐba",
];

// 息付き・外来音: aspirated (息付き) consonants, then borrowed ふぁ.
const ASPIRATED_ROMS = [
  "kha",
  "gha",
  "cha",
  "jha",
  "ṭha",
  "ḍha",
  "tha",
  "dha",
  "pha",
  "bha",
  "fa",
];

// 音節を作る: the representative consonant ka, combined with each short vowel
// sign. Built as syllable ids so the lesson flips through ka ki ku ke ko…
const SYLLABLE_CONSONANT_ROM = "ka";
const SHORT_SIGN_ROMS = ["a", "æ", "i", "u", "e", "o"];
const syllableIds = (): string[] =>
  SHORT_SIGN_ROMS.map((sRom) => `syl:${SYLLABLE_CONSONANT_ROM}:${sRom}`);

/** The ordered list of char ids for a course. */
export function lessonIds(course: Course): string[] {
  switch (course) {
    case "basic-vowels":
      return independentVowels
        .filter((v) => !v.misra && v.len === "short")
        .map((v) => v.id);
    case "consonants-major":
      return idsForRoms(MAJOR_ROMS);
    case "syllables":
      return syllableIds();
    case "long-vowels":
      return independentVowels
        .filter((v) => !v.misra && v.len === "long")
        .map((v) => v.id);
    case "consonants-other":
      return idsForRoms(OTHER_ROMS);
    case "consonants-aspirated":
      return idsForRoms(ASPIRATED_ROMS);
    default:
      return [];
  }
}
