import { useMemo, useState } from "react";
import { Glyph } from "~/components/Glyph";
import {
  charsForIds,
  cumulativeUpTo,
  LEVELS,
  type LevelId,
} from "~/lib/levels";
import {
  fieldValue,
  generateQuestion,
  type Question,
  type QuizChoice,
  type QuizConfig,
  type QuizField,
} from "~/lib/quiz";
import type { SinhalaChar } from "~/lib/sinhala";
import type { Route } from "./+types/quiz";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "クイズ | Sinhala Trainer" },
    { name: "description", content: "シンハラ文字の読みを当てるクイズ" },
  ];
}

type Direction = "glyph_to_reading" | "reading_to_glyph";

const READINGS: { id: QuizField; label: string }[] = [
  { id: "rom", label: "ローマ字" },
  { id: "ipa", label: "発音記号" },
  { id: "kana", label: "かな(近似)" },
];

function buildConfig(direction: Direction, reading: QuizField): QuizConfig {
  return direction === "glyph_to_reading"
    ? { promptField: "glyph", answerField: reading, choiceCount: 4 }
    : { promptField: reading, answerField: "glyph", choiceCount: 4 };
}

export default function QuizPage() {
  const [level, setLevel] = useState<LevelId>("lv1");
  const [direction, setDirection] = useState<Direction>("glyph_to_reading");
  const [reading, setReading] = useState<QuizField>("rom");
  const [started, setStarted] = useState(false);

  const pool = useMemo(() => charsForIds(cumulativeUpTo(level)), [level]);
  const config = useMemo(
    () => buildConfig(direction, reading),
    [direction, reading],
  );

  if (!started) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          クイズ
        </h1>

        <Field label="出題範囲 (難易度・累積)">
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLevel(l.id)}
                className={pill(level === l.id)}
                title={l.desc}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="出題方向">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirection("glyph_to_reading")}
              className={pill(direction === "glyph_to_reading")}
            >
              文字 → 読み
            </button>
            <button
              type="button"
              onClick={() => setDirection("reading_to_glyph")}
              className={pill(direction === "reading_to_glyph")}
            >
              読み → 文字
            </button>
          </div>
        </Field>

        <Field label="読みの表記">
          <div className="flex flex-wrap gap-2">
            {READINGS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReading(r.id)}
                className={pill(reading === r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Field>

        <p className="mb-4 text-sm text-gray-500">
          出題対象: {pool.length} 文字
        </p>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          開始
        </button>
      </main>
    );
  }

  return (
    <QuizRunner pool={pool} config={config} onExit={() => setStarted(false)} />
  );
}

function QuizRunner({
  pool,
  config,
  onExit,
}: {
  pool: SinhalaChar[];
  config: QuizConfig;
  onExit: () => void;
}) {
  const [question, setQuestion] = useState<Question>(() =>
    generateQuestion(pool, config),
  );
  const [picked, setPicked] = useState<QuizChoice | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);

  const answered = picked !== null;
  const isPromptGlyph = config.promptField === "glyph";

  const choose = (choice: QuizChoice) => {
    if (answered) return;
    const correct = choice.char.id === question.char.id;
    setPicked(choice);
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
    }));
    setStreak((st) => (correct ? st + 1 : 0));
  };

  const next = () => {
    setPicked(null);
    setQuestion(generateQuestion(pool, config, Math.random, question.char.id));
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between text-sm text-gray-500">
        <button type="button" onClick={onExit} className="hover:underline">
          ← 設定に戻る
        </button>
        <span>
          正解 {score.correct}/{score.total}・連続 {streak}
        </span>
      </div>

      {/* prompt */}
      <div className="mb-8 flex min-h-40 flex-col items-center justify-center rounded-2xl bg-gray-50 p-6 dark:bg-gray-800">
        {isPromptGlyph ? (
          <Glyph
            text={question.promptLabel}
            className="text-8xl text-gray-900 dark:text-white"
          />
        ) : (
          <span className="text-5xl font-medium text-gray-900 dark:text-white">
            {question.promptLabel}
          </span>
        )}
        <p className="mt-3 text-sm text-gray-500">
          {isPromptGlyph ? "この文字の読みは?" : "この読みの文字は?"}
        </p>
      </div>

      {/* choices */}
      <div className="grid grid-cols-2 gap-3">
        {question.choices.map((choice) => (
          <ChoiceButton
            key={choice.char.id}
            choice={choice}
            answered={answered}
            isCorrect={choice.char.id === question.char.id}
            isPicked={picked?.char.id === choice.char.id}
            renderGlyph={config.answerField === "glyph"}
            onClick={() => choose(choice)}
          />
        ))}
      </div>

      {/* feedback */}
      {answered && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p className="mb-2 font-medium text-gray-900 dark:text-white">
            {picked?.char.id === question.char.id ? "正解!" : "不正解"}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
            <Glyph
              text={fieldValue(question.char, "glyph")}
              className="text-3xl text-gray-900 dark:text-white"
            />
            <span>rom: {question.char.rom}</span>
            <span>ipa: {question.char.ipa}</span>
            <span>かな: {question.char.kana}</span>
          </p>
          <button
            type="button"
            onClick={next}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
          >
            次の問題
          </button>
        </div>
      )}
    </main>
  );
}

function ChoiceButton({
  choice,
  answered,
  isCorrect,
  isPicked,
  renderGlyph,
  onClick,
}: {
  choice: QuizChoice;
  answered: boolean;
  isCorrect: boolean;
  isPicked: boolean;
  renderGlyph: boolean;
  onClick: () => void;
}) {
  let cls =
    "rounded-xl border-2 p-4 text-center transition-colors border-gray-200 dark:border-gray-700 hover:border-blue-400";
  if (answered) {
    if (isCorrect) {
      cls =
        "rounded-xl border-2 p-4 text-center border-green-500 bg-green-50 dark:bg-green-900/30";
    } else if (isPicked) {
      cls =
        "rounded-xl border-2 p-4 text-center border-red-400 bg-red-50 dark:bg-red-900/30";
    } else {
      cls =
        "rounded-xl border-2 p-4 text-center border-gray-200 opacity-60 dark:border-gray-700";
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={answered} className={cls}>
      {renderGlyph ? (
        <Glyph
          text={choice.label}
          className="text-5xl text-gray-900 dark:text-white"
        />
      ) : (
        <span className="text-xl font-medium text-gray-900 dark:text-white">
          {choice.label}
        </span>
      )}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-gray-500">{label}</h2>
      {children}
    </div>
  );
}

function pill(active: boolean): string {
  return active
    ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
    : "rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200";
}
