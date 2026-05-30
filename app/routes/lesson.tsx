import { Link, useSearchParams } from "react-router";
import { CharBadges } from "~/components/CharBadges";
import { CharDetail } from "~/components/CharDetail";
import { Glyph } from "~/components/Glyph";
import { COURSES, getCourse, type LessonCourse } from "~/lib/courses";
import { getCharById, glyphOf } from "~/lib/sinhala";
import type { Route } from "./+types/lesson";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "レッスン | Sinhala Trainer" },
    {
      name: "description",
      content: "シンハラ文字を、変化の規則ごとに段階を追って学ぶ",
    },
  ];
}

export default function LessonPage() {
  const [params] = useSearchParams();
  const course = getCourse(params.get("course") ?? "");
  return course ? <CoursePage course={course} /> : <CourseIndex />;
}

// --- index: pick a course (step) ---

function CourseIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-bold text-2xl text-gray-900 dark:text-white">
        レッスン
      </h1>
      <p className="mb-6 text-gray-600 text-sm dark:text-gray-300">
        文字を「変化の規則・パーツ」ごとに段階分け。上から順に進めると、母音 →
        子音 → 組み立て → 派生(濁音・鼻音・有気音…)とたどれます。
      </p>

      <ol className="space-y-3">
        {COURSES.map((c) => (
          <li key={c.id}>
            <Link
              to={`/lesson?course=${c.id}`}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-sm text-white">
                {c.step}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-gray-900 dark:text-white">
                  {c.label}
                </span>
                <span className="block text-gray-500 text-sm">{c.short}</span>
              </span>
              <span className="ml-auto shrink-0 text-gray-400 text-xs">
                {c.chars.length} 字
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}

// --- course page: rule card + flip through characters one at a time ---

function CoursePage({ course }: { course: LessonCourse }) {
  const [params, setParams] = useSearchParams();
  const chars = course.chars;

  const rawI = Number(params.get("i") ?? 0);
  const i = Number.isFinite(rawI)
    ? Math.min(Math.max(0, Math.trunc(rawI)), chars.length - 1)
    : 0;
  const entry = chars[i];
  const current = entry ? getCharById(entry.id) : undefined;

  const goTo = (index: number) => {
    const target = Math.min(Math.max(0, index), chars.length - 1);
    const next = new URLSearchParams(params);
    next.set("i", String(target));
    setParams(next);
  };
  const go = (delta: number) => goTo(i + delta);

  const progress = chars.length ? ((i + 1) / chars.length) * 100 : 0;
  const nextCourse = COURSES[COURSES.findIndex((c) => c.id === course.id) + 1];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/lesson"
          className="text-blue-600 text-sm hover:underline dark:text-blue-400"
        >
          ← コース一覧
        </Link>
        <span className="text-gray-400 text-sm">
          ステップ {course.step} / {COURSES.length}
        </span>
      </div>

      <h1 className="mb-3 font-bold text-2xl text-gray-900 dark:text-white">
        {course.label}
      </h1>

      {/* rule card: shown once for the whole course */}
      <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/40">
        <p className="font-semibold text-gray-900 text-sm dark:text-white">
          {course.rule.title}
        </p>
        <p className="mt-1 text-gray-700 text-sm dark:text-gray-200">
          {course.rule.body}
        </p>
      </div>

      {/* progress */}
      <div className="mb-4">
        <div className="mb-1 text-gray-500 text-xs">
          {i + 1} / {chars.length}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* jump strip */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {chars.map((ch, idx) => {
          const c = getCharById(ch.id);
          if (!c) return null;
          const active = idx === i;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => goTo(idx)}
              aria-current={active ? "true" : undefined}
              title={c.rom}
              className={
                active
                  ? "flex w-11 flex-col items-center justify-center rounded-lg border-2 border-blue-600 bg-blue-50 px-1 py-1 dark:bg-blue-950"
                  : "flex w-11 flex-col items-center justify-center rounded-lg border border-gray-200 px-1 py-1 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }
            >
              <Glyph
                text={glyphOf(c)}
                className="text-lg text-gray-900 leading-none dark:text-white"
              />
              <span className="mt-0.5 max-w-full truncate text-[0.6rem] text-gray-500 leading-tight">
                {c.rom}
              </span>
            </button>
          );
        })}
      </div>

      {/* detail card */}
      {current && entry && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          {(entry.relation || entry.badges.length > 0) && (
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
              {entry.relation && (
                <span className="text-gray-500 text-sm">{entry.relation}</span>
              )}
              <CharBadges badges={entry.badges} />
            </div>
          )}
          <CharDetail char={current} variant="page" />
        </div>
      )}

      {/* prev / next */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i <= 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          ← 前へ
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i >= chars.length - 1}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          次へ →
        </button>
      </div>

      {/* end-of-course: go to the next step */}
      {i >= chars.length - 1 && nextCourse && (
        <Link
          to={`/lesson?course=${nextCourse.id}`}
          className="mt-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40"
        >
          <span className="text-gray-700 text-sm dark:text-gray-200">
            次のステップ: <strong>{nextCourse.label}</strong>
          </span>
          <span className="text-blue-600 text-sm dark:text-blue-400">→</span>
        </Link>
      )}
    </main>
  );
}
