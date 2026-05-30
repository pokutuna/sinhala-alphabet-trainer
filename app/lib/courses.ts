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
 * Lesson courses, split into *steps* keyed by the rule / part that the step
 * teaches (長音化, 濁音化, 有気音化, 母音記号…). Each course opens with a single
 * "rule card" explaining the change, then flips through the letters that the
 * rule produces one at a time — so e.g. the long vowels are introduced once as
 * "add the lengthening part", not as a repeated "letter + its long form".
 *
 * The character lists are derived from the data (`manner` / `len` / `misra`)
 * rather than hand-listed roms, so the courses stay in sync with the dataset.
 */

// --- badges: surface frequency / exception status straight from the data ---

export type BadgeTone = "neutral" | "warn" | "info" | "muted";

export interface Badge {
  label: string;
  tone: BadgeTone;
  /** Longer explanation shown on hover / in the detail view. */
  title: string;
}

/**
 * Badges for a character, derived from `misra` (borrowed/Sanskrit) and `note`
 * (rarity / spelling-only / loanword). A pure śuddha letter with no note gets
 * no badge — its very plainness signals "learn this one first".
 */
export function badgesFor(char: SinhalaChar): Badge[] {
  const badges: Badge[] = [];
  const note = "note" in char ? char.note : "";
  const misra = "misra" in char ? char.misra : false;

  if (note.includes("まれ")) {
    badges.push({
      label: "まれ",
      tone: "warn",
      title: "現代シンハラ語ではほとんど使われない字。",
    });
  }
  if (note.includes("綴り字")) {
    badges.push({
      label: "綴り字専用",
      tone: "info",
      title: "発音は対応する基本子音と同じで、綴りの区別のためだけに残る字。",
    });
  }
  if (note.includes("外来")) {
    badges.push({
      label: "外来語",
      tone: "info",
      title: "外来語を書くための字。",
    });
  }
  if (misra) {
    badges.push({
      label: "借用",
      tone: "muted",
      title:
        "サンスクリット・パーリ語などからの借用字 (miśra)。純粋シンハラ語の表記には不要なことが多い。",
    });
  }
  return badges;
}

// --- course model ---

export type CourseId =
  | "vowels"
  | "long"
  | "consonants"
  | "signs"
  | "voiced"
  | "nasal"
  | "aspirated"
  | "borrowed";

/** The rule / part the course teaches, shown once at the top of the course. */
export interface RuleNote {
  /** Heading, e.g.「長音化」 */
  title: string;
  /** A sentence or two explaining the change / part. */
  body: string;
}

/** One letter inside a course. */
export interface CourseChar {
  id: string;
  /** Relation to its source letter, e.g.「a の長音」「ka を濁らせた音」. */
  relation?: string;
  badges: Badge[];
}

export interface LessonCourse {
  id: CourseId;
  /** Number shown in the index (1-based). */
  step: number;
  /** Course title, e.g.「長音化」 */
  label: string;
  /** One-liner for the index card. */
  short: string;
  rule: RuleNote;
  chars: CourseChar[];
}

// --- helpers to build CourseChar lists from the data ---

const consonantByRom = new Map(consonants.map((c) => [c.rom, c]));

const courseChar = (char: SinhalaChar, relation?: string): CourseChar => ({
  id: char.id,
  relation,
  badges: badgesFor(char),
});

/** The base (a-form) rom a derived consonant comes from: same place, voiceless. */
function baseConsonantRom(c: Consonant): string | undefined {
  const base = consonants.find(
    (o) => o.place === c.place && o.manner === "voiceless",
  );
  return base?.rom;
}

// --- character sets per rule (data-driven) ---

const shortVowels: Vowel[] = independentVowels.filter(
  (v) => !v.misra && v.len === "short",
);
const longVowels: Vowel[] = independentVowels.filter(
  (v) => !v.misra && v.len === "long",
);
const extraVowels: Vowel[] = independentVowels.filter((v) => v.misra);

// 基本子音: the high-frequency pure letters — plain voiceless stops, the base
// nasals (na ma), base fricatives (sa ha) and approximants (ya ra la va).
// Spelling-only / rare pure nasals (ṇa) and ḷa go to later courses.
const BASIC_CONSONANT_MANNERS = new Set([
  "voiceless",
  "fricative",
  "approximant",
]);
const basicConsonants: Consonant[] = consonants.filter(
  (c) =>
    !c.misra &&
    !c.note.includes("綴り字") &&
    (BASIC_CONSONANT_MANNERS.has(c.manner) ||
      // the two everyday nasals な/ま (other nasals are rare/spelling-only)
      c.rom === "na" ||
      c.rom === "ma"),
);

const voicedConsonants: Consonant[] = consonants.filter(
  (c) => !c.misra && c.manner === "voiced",
);

// 鼻音・前鼻音: prenasalized (んが系) + the pure nasals not already taught as
// basic (ṇa: spelling-only). na/ma are basic; ña/ṅa are misra (借用 course).
const nasalConsonants: Consonant[] = consonants.filter(
  (c) =>
    (c.manner === "prenasalized" && !c.misra) ||
    (c.manner === "nasal" && !c.misra && (c.note.includes("綴り字") || false)),
);

const aspiratedConsonants: Consonant[] = consonants.filter(
  (c) => c.manner === "voiceless_aspirated" || c.manner === "voiced_aspirated",
);

// 借用・外来: leftover misra consonants (śa ṣa, the rare nasals, prenasalized
// ⁿja) and the loanword fa, plus the borrowed vowels.
const taught = new Set<string>(
  [
    ...basicConsonants,
    ...voicedConsonants,
    ...nasalConsonants,
    ...aspiratedConsonants,
  ].map((c) => c.rom),
);
const borrowedConsonants: Consonant[] = consonants.filter(
  (c) => !taught.has(c.rom),
);

// 母音記号 (pilla): ka + each sign, short signs first then long, then au.
const SIGN_ORDER = [
  "a",
  "æ",
  "i",
  "u",
  "e",
  "o",
  "ā",
  "ǣ",
  "ī",
  "ū",
  "ē",
  "ō",
  "au",
];
const signByRom = new Map(vowelSigns.map((s) => [s.rom, s]));
const ka = consonantByRom.get("ka");
function signCourseChars(): CourseChar[] {
  if (!ka) throw new Error("missing consonant ka");
  return SIGN_ORDER.map((rom) => signByRom.get(rom))
    .filter((s): s is VowelSign => !!s)
    .map((sign) => {
      const syl = composeSyllable(ka, sign);
      const relation =
        sign.sign === "" ? "記号なし(固有の a)" : `${sign.name}(${sign.rom})`;
      return { id: syl.id, relation, badges: [] };
    });
}

// --- course definitions ---

export const COURSES: LessonCourse[] = [
  {
    id: "vowels",
    step: 1,
    label: "基本の母音",
    short: "単独で書く短い母音 6 つ",
    rule: {
      title: "母音はすべての土台",
      body: "単独で書く短い母音 6 つ。子音に付く音もここが基準になるので、形と読みをまず覚えます。",
    },
    chars: shortVowels.map((v) => courseChar(v)),
  },
  {
    id: "long",
    step: 2,
    label: "長音化",
    short: "伸ばすパーツを足すと長母音に",
    rule: {
      title: "長音化 = 伸ばすパーツを足す",
      body: "短母音に「伸ばすパーツ」を足すと長母音になります。新しい音ではなく、短母音を長くしただけ。1 つずつ対応を確認しましょう。",
    },
    chars: longVowels.map((v) =>
      courseChar(v, v.pair ? `${v.pair} の長音` : undefined),
    ),
  },
  {
    id: "consonants",
    step: 3,
    label: "基本の子音",
    short: "高頻度の素の子音(子音+a)",
    rule: {
      title: "子音は素で「子音 + a」",
      body: "子音字は単独で固有の a を含んだ音(か・さ・た…)になります。まずはよく使う素の子音から。",
    },
    chars: basicConsonants.map((c) => courseChar(c)),
  },
  {
    id: "signs",
    step: 4,
    label: "母音記号 (pilla)",
    short: "子音に記号を付けて ka→ki→ku…",
    rule: {
      title: "母音記号 (pilla) で音節を作る",
      body: "子音「ka」に母音記号を付けると、内蔵の a が差し替わって ka・ki・ku… と変わります。記号が付く位置(上・下・左・右)に注目。",
    },
    chars: signCourseChars(),
  },
  {
    id: "voiced",
    step: 5,
    label: "濁音化",
    short: "素の子音を濁らせる(有声化)",
    rule: {
      title: "濁音化 = 声を加える",
      body: "素の子音に声を加えると濁音になります(か→が、た→だ…)。形も元の子音と似ているので、対応で覚えましょう。",
    },
    chars: voicedConsonants.map((c) => {
      const base = baseConsonantRom(c);
      return courseChar(c, base ? `${base} を濁らせた音` : undefined);
    }),
  },
  {
    id: "nasal",
    step: 6,
    label: "鼻音・前鼻音",
    short: "鼻にかかる音 / 鼻音+子音が 1 字に",
    rule: {
      title: "鼻音・前鼻音",
      body: "鼻にかかる音と、鼻音と子音が一体になった前鼻音(んが・んだ…)。基本の な・ま は学習済みなので、ここでは残りを扱います。",
    },
    chars: nasalConsonants.map((c) => {
      const base = baseConsonantRom(c);
      return courseChar(
        c,
        c.manner === "prenasalized" && base ? `${base} 行の前鼻音` : undefined,
      );
    }),
  },
  {
    id: "aspirated",
    step: 7,
    label: "有気音化",
    short: "息を強く出す音(主にサンスクリット)",
    rule: {
      title: "有気音化 = 息を強く出す",
      body: "息を強く出す音(息付き)。主にサンスクリット由来で出番は少なめ。素の子音と対応していて、形も似ています。",
    },
    chars: aspiratedConsonants.map((c) => {
      const base = baseConsonantRom(c);
      return courseChar(c, base ? `${base} の息付き` : undefined);
    }),
  },
  {
    id: "borrowed",
    step: 8,
    label: "借用・外来",
    short: "借用の歯擦音・外来音・その他母音",
    rule: {
      title: "借用・外来の字",
      body: "サンスクリット由来の歯擦音(しゃ系)や外来音(ふぁ)、二重母音など。出番は少ないので最後に。",
    },
    chars: [
      ...borrowedConsonants.map((c) => courseChar(c)),
      ...extraVowels.map((v) => courseChar(v)),
    ],
  },
];

const courseById = new Map(COURSES.map((c) => [c.id, c]));

export function getCourse(id: string): LessonCourse | undefined {
  return courseById.get(id as CourseId);
}

/** Ordered char ids for a course. */
export function courseIds(id: CourseId): string[] {
  return getCourse(id)?.chars.map((c) => c.id) ?? [];
}
