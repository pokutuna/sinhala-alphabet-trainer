import { useSearchParams } from "react-router";
import { CharDetail } from "~/components/CharDetail";
import { Glyph } from "~/components/Glyph";
import { COURSES, type Course, lessonIds } from "~/lib/lessons";
import { getCharById, glyphOf } from "~/lib/sinhala";
import type { Route } from "./+types/lesson";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "レッスン | Sinhala Trainer" },
    { name: "description", content: "シンハラ文字を1文字ずつ学ぶ" },
  ];
}

export default function LessonPage() {
  const [params, setParams] = useSearchParams();
  // fall back to the first course for missing / unknown (e.g. old bookmarked)
  // course params, so lessonIds always resolves to a real id list.
  const courseParam = params.get("course");
  const course: Course = COURSES.some((c) => c.id === courseParam)
    ? (courseParam as Course)
    : COURSES[0].id;
  const ids = lessonIds(course);
  const rawI = Number(params.get("i") ?? 0);
  const i = Number.isFinite(rawI)
    ? Math.min(Math.max(0, Math.trunc(rawI)), ids.length - 1)
    : 0;
  const current = getCharById(ids[i]);

  const setCourse = (c: Course) => {
    const next = new URLSearchParams(params);
    next.set("course", c);
    next.delete("i");
    setParams(next);
  };

  const goTo = (index: number) => {
    const target = Math.min(Math.max(0, index), ids.length - 1);
    const next = new URLSearchParams(params);
    next.set("i", String(target));
    setParams(next);
  };

  const go = (delta: number) => goTo(i + delta);

  const progress = ids.length ? ((i + 1) / ids.length) * 100 : 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        レッスン
      </h1>

      {/* course tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {COURSES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCourse(c.id)}
            title={c.desc}
            className={
              course === c.id
                ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* course description */}
      <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-gray-700 dark:bg-blue-950/40 dark:text-gray-200">
        {COURSES.find((c) => c.id === course)?.about}
      </p>

      {/* progress */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>
            {i + 1} / {ids.length}
          </span>
          <span>{COURSES.find((c) => c.id === course)?.desc}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* jump strip: every char in the course (glyph + reading), click to jump */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {ids.map((id, idx) => {
          const c = getCharById(id);
          if (!c) return null;
          const active = idx === i;
          return (
            <button
              key={id}
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
                className="text-lg leading-none text-gray-900 dark:text-white"
              />
              <span className="mt-0.5 max-w-full truncate text-[0.6rem] leading-tight text-gray-500">
                {c.rom}
              </span>
            </button>
          );
        })}
      </div>

      {/* detail card */}
      {current && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <CharDetail char={current} variant="page" />
        </div>
      )}

      {/* prev / next */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i <= 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          ← 前へ
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i >= ids.length - 1}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          次へ →
        </button>
      </div>
    </main>
  );
}
