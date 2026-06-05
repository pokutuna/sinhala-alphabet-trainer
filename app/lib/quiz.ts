import { confusableAmong } from "~/lib/confusion";
import { glyphOf, type SinhalaChar } from "~/lib/sinhala";

export type QuizField = "glyph" | "rom" | "ipa" | "kana";

export interface QuizConfig {
  /** What is shown as the prompt. */
  promptField: QuizField;
  /** What the choices answer with. */
  answerField: QuizField;
  /** Number of choices including the correct one. */
  choiceCount: number;
}

export interface QuizChoice {
  char: SinhalaChar;
  label: string;
}

export interface Question {
  char: SinhalaChar;
  promptLabel: string;
  choices: QuizChoice[];
  config: QuizConfig;
}

/** Render a character into the given quiz field. */
export function fieldValue(char: SinhalaChar, field: QuizField): string {
  if (field === "glyph") return glyphOf(char);
  return char[field];
}

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate one question from a pool.
 * Distractors are drawn first from confusion-group members within the pool,
 * then fall back to other pool members. Choices never duplicate the answer
 * label, so options stay unambiguous.
 * Pass excludeId to prevent a specific character from being selected as the target.
 */
export function generateQuestion(
  pool: SinhalaChar[],
  config: QuizConfig,
  rng: Rng = Math.random,
  excludeId?: string,
): Question {
  const answerable = pool.filter(
    (c) => fieldValue(c, config.answerField) !== "",
  );
  const promptable = answerable.filter(
    (c) => fieldValue(c, config.promptField) !== "",
  );
  const targetPool = promptable.length ? promptable : answerable;
  const filteredPool = excludeId
    ? targetPool.filter((c) => c.id !== excludeId)
    : targetPool;
  const target = pick(filteredPool.length ? filteredPool : targetPool, rng);

  const answerLabel = fieldValue(target, config.answerField);

  // candidates with a distinct answer label
  const candidates = answerable.filter(
    (c) =>
      c.id !== target.id && fieldValue(c, config.answerField) !== answerLabel,
  );

  const confusable = shuffle(confusableAmong(target, candidates), rng);
  const others = shuffle(
    candidates.filter((c) => !confusable.includes(c)),
    rng,
  );

  const want = config.choiceCount - 1;
  const distractors = [...confusable, ...others].slice(0, want);

  const choices = shuffle(
    [target, ...distractors].map((char) => ({
      char,
      label: fieldValue(char, config.answerField),
    })),
    rng,
  );

  return {
    char: target,
    promptLabel: fieldValue(target, config.promptField),
    choices,
    config,
  };
}
