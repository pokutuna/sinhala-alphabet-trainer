import { useMemo, useState } from "react";
import { Glyph } from "~/components/Glyph";
import {
  type Candidate,
  japaneseToSinhala,
  type ReadSegment,
  type Segment,
  sinhalaToReading,
} from "~/lib/transliterate";
import type { Route } from "./+types/convert";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "コンバーター | Sinhala Trainer" },
    {
      name: "description",
      content:
        "日本語(かな・ローマ字)とシンハラ文字を相互変換。読み付きで表示し、複数候補は文字を押して切り替え。",
    },
  ];
}

type Direction = "to_sinhala" | "from_sinhala";

const SAMPLES: Record<Direction, string> = {
  to_sinhala: "ありがとう",
  from_sinhala: "ආයුබෝවන්",
};

export default function ConvertPage() {
  const [direction, setDirection] = useState<Direction>("to_sinhala");
  const [input, setInput] = useState("");

  const toSinhala = direction === "to_sinhala";

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
        コンバーター
      </h1>
      <p className="mb-5 text-sm text-gray-500">
        音ベースの近似変換です。かな・ローマ字はどちらでも(混在も)OK。公式の対応表は無いため、複数候補がある音は文字を押して切り替えられます。
      </p>

      {/* direction toggle */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDirection("to_sinhala")}
          className={pill(toSinhala)}
        >
          日本語 → シンハラ
        </button>
        <button
          type="button"
          onClick={() => setDirection("from_sinhala")}
          className={pill(!toSinhala)}
        >
          シンハラ → 読み
        </button>
      </div>

      {/* input */}
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="convert-input"
          className="text-sm font-semibold text-gray-500"
        >
          {toSinhala ? "かな・ローマ字を入力" : "シンハラ文字を入力"}
        </label>
        <button
          type="button"
          onClick={() => setInput(SAMPLES[direction])}
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          例を入れる
        </button>
      </div>
      <textarea
        id="convert-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder={toSinhala ? "例: ありがとう / arigatou" : "例: ආයුබෝවන්"}
        className="mb-6 w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-lg text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        // Sinhala input should render with the Sinhala font.
        style={
          !toSinhala
            ? { fontFamily: '"Noto Sans Sinhala", sans-serif' }
            : undefined
        }
      />

      {toSinhala ? <ToSinhala input={input} /> : <FromSinhala input={input} />}
    </main>
  );
}

// ---------------------------------------------------------------------------
// → Sinhala (kana / romaji / mixed — auto-detected by the tokenizer)
// ---------------------------------------------------------------------------

function ToSinhala({ input }: { input: string }) {
  // Convert line by line so input newlines are preserved in the output.
  const lines = useMemo(
    () => input.split("\n").map((line) => japaneseToSinhala(line)),
    [input],
  );

  // Picks are keyed by an input signature so editing drops stale selections.
  const sig = useMemo(
    () =>
      lines
        .flat()
        .map((s) => s.source)
        .join("|"),
    [lines],
  );
  const [picksBySig, setPicksBySig] = useState<
    Record<string, Record<string, number>>
  >({});
  const [openAt, setOpenAt] = useState<string | null>(null);
  const picks = picksBySig[sig] ?? {};

  if (input.trim() === "") {
    return <EmptyHint text="ここに変換結果が出ます。" />;
  }

  const combined = lines
    .map((segs, li) =>
      segs
        .map((s, i) =>
          s.kind === "mapped"
            ? (s.candidates[picks[`${li}:${i}`] ?? 0]?.glyph ?? "")
            : s.source,
        )
        .join(""),
    )
    .join("\n");

  return (
    <section>
      <OutputHeader text="変換結果 (シンハラ)" copy={combined} sinhala />
      <div className="space-y-2">
        {withLineKeys(lines).map(({ segs, key: lineKey, li }) => (
          <OutputLine key={lineKey}>
            {withKeys(segs).map(({ seg, key, i }) => {
              const at = `${li}:${i}`;
              if (seg.kind === "space") return <SpaceChip key={key} />;
              if (seg.kind === "error")
                return <ErrorChip key={key} text={seg.source} />;
              return (
                <MappedChip
                  key={key}
                  segment={seg}
                  picked={picks[at] ?? 0}
                  open={openAt === at}
                  onToggle={() => setOpenAt(openAt === at ? null : at)}
                  onPick={(idx) => {
                    setPicksBySig((all) => ({
                      ...all,
                      [sig]: { ...(all[sig] ?? {}), [at]: idx },
                    }));
                    setOpenAt(null);
                  }}
                />
              );
            })}
          </OutputLine>
        ))}
      </div>
      <LegendNote />
    </section>
  );
}

function MappedChip({
  segment,
  picked,
  open,
  onToggle,
  onPick,
}: {
  segment: Extract<Segment, { kind: "mapped" }>;
  picked: number;
  open: boolean;
  onToggle: () => void;
  onPick: (idx: number) => void;
}) {
  const current = segment.candidates[picked] ?? segment.candidates[0];
  const hasAlternatives = segment.candidates.length > 1;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={hasAlternatives ? onToggle : undefined}
        className={`flex min-w-[3rem] flex-col items-center rounded-lg border px-2 py-1.5 transition-colors ${
          hasAlternatives
            ? "cursor-pointer border-amber-300 bg-amber-50 hover:border-amber-400 dark:border-amber-700/60 dark:bg-amber-900/20"
            : "cursor-default border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        }`}
        title={hasAlternatives ? "他の候補に切り替え" : undefined}
      >
        <Glyph
          text={current.glyph}
          className="text-3xl leading-tight text-gray-900 dark:text-white"
        />
        {/* 入力 → シンハラ字の読み */}
        <span className="mt-1 text-[11px] leading-tight text-gray-500">
          {segment.source}
          <span className="text-gray-300 dark:text-gray-600"> → </span>
          <span className="text-gray-700 dark:text-gray-200">
            {current.rom}
          </span>
        </span>
        {(current.note || hasAlternatives) && (
          <span className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
            {current.note ?? ""}
            {hasAlternatives ? " ▾" : ""}
          </span>
        )}
      </button>

      {open && hasAlternatives && (
        <div className="absolute left-0 top-full z-10 mt-1 w-max min-w-[9rem] max-w-[18rem] rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <p className="px-2 py-1 text-[10px] text-gray-400">
            「{segment.sourceKana}」の候補
          </p>
          {segment.candidates.map((cand, idx) => (
            <CandidateRow
              key={`${cand.glyph}:${cand.rom}`}
              candidate={cand}
              active={idx === picked}
              isPrimary={idx === 0}
              onClick={() => onPick(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  active,
  isPrimary,
  onClick,
}: {
  candidate: Candidate;
  active: boolean;
  isPrimary: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
        active
          ? "bg-blue-50 dark:bg-blue-900/30"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <Glyph
        text={candidate.glyph}
        className="min-w-9 shrink-0 text-center text-2xl leading-tight text-gray-900 dark:text-white"
      />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="break-all text-sm text-gray-800 dark:text-gray-100">
          {candidate.rom}
        </span>
        {candidate.note && (
          <span className="text-[11px] text-gray-500">{candidate.note}</span>
        )}
      </span>
      {isPrimary && (
        <span className="shrink-0 rounded bg-gray-200 px-1 text-[9px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          代表
        </span>
      )}
    </button>
  );
}

function LegendNote() {
  return (
    <p className="mt-4 text-xs text-gray-500">
      <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-200 align-middle dark:bg-amber-700/60" />
      の文字は複数の候補があります(歯音/反舌音、r/l
      など)。押すと一覧から切り替えられます。表示は「入力 → 文字の読み」です。
    </p>
  );
}

// ---------------------------------------------------------------------------
// Sinhala → reading
// ---------------------------------------------------------------------------

function FromSinhala({ input }: { input: string }) {
  const lines = useMemo(
    () => input.split("\n").map((line) => sinhalaToReading(line)),
    [input],
  );

  if (input.trim() === "") {
    return <EmptyHint text="ここに読み(かな・ローマ字)が出ます。" />;
  }

  const kana = lines
    .map((segs) =>
      segs.map((s) => (s.kind === "syllable" ? s.kana : s.source)).join(""),
    )
    .join("\n");

  return (
    <section>
      <OutputHeader text="読み" copy={kana} />
      <div className="space-y-2">
        {withLineKeys(lines).map(({ segs, key: lineKey }) => (
          <OutputLine key={lineKey}>
            {withKeys(segs).map(({ seg, key }) => {
              if (seg.kind === "space") return <SpaceChip key={key} />;
              if (seg.kind === "error")
                return <ErrorChip key={key} text={seg.source} />;
              return <ReadChip key={key} segment={seg} />;
            })}
          </OutputLine>
        ))}
      </div>
    </section>
  );
}

function ReadChip({
  segment,
}: {
  segment: Extract<ReadSegment, { kind: "syllable" }>;
}) {
  return (
    <div className="flex min-w-[3rem] flex-col items-center rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900">
      <Glyph
        text={segment.glyph}
        className="text-3xl leading-tight text-gray-900 dark:text-white"
      />
      <span className="mt-1 text-xs leading-tight text-gray-700 dark:text-gray-200">
        {segment.kana || "—"}
      </span>
      <span className="text-[10px] leading-tight text-gray-400">
        {segment.rom}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// shared bits
// ---------------------------------------------------------------------------

/** A single output row: chips wrap within it, and empty lines keep their height. */
function OutputLine({ children }: { children: React.ReactNode }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="flex min-h-[3.5rem] flex-wrap items-start gap-1.5">
      {hasContent ? children : <span className="text-gray-300">&nbsp;</span>}
    </div>
  );
}

function ErrorChip({ text }: { text: string }) {
  return (
    <span
      className="flex min-w-[3rem] flex-col items-center justify-center rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-red-700 dark:border-red-700/60 dark:bg-red-900/30 dark:text-red-300"
      title="変換できない文字(そのまま出力)"
    >
      <span className="break-all text-2xl leading-tight">{text}</span>
      <span className="mt-0.5 text-[9px] leading-none">変換不可</span>
    </span>
  );
}

function SpaceChip() {
  // 空白はエラーにせず、出力に小さな間隔として表示する
  return <span className="w-3 shrink-0" aria-hidden="true" />;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-700">
      {text}
    </div>
  );
}

function OutputHeader({
  text,
  copy,
  sinhala,
}: {
  text: string;
  copy: string;
  sinhala?: boolean;
}) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      // clipboard may be unavailable; ignore.
    }
  };
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-gray-500">
        {text}
        {sinhala && copy.trim() !== "" && (
          <Glyph
            text={` ${copy.split("\n")[0]}`}
            className="ml-1 font-normal text-gray-400"
          />
        )}
      </h2>
      {copy.trim() !== "" && (
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          {done ? "コピーしました" : "コピー"}
        </button>
      )}
    </div>
  );
}

function pill(active: boolean): string {
  return active
    ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
    : "rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200";
}

/**
 * Attach a stable React key to each segment based on its character offset in
 * the input, so keys survive reordering as the user edits (and we avoid keying
 * purely on the array index). `i` is still returned for index-based state.
 */
function withKeys<T extends { source: string }>(
  segments: T[],
): { seg: T; key: string; i: number }[] {
  let offset = 0;
  return segments.map((seg, i) => {
    const key = `${offset}:${seg.source}`;
    offset += seg.source.length;
    return { seg, key, i };
  });
}

/**
 * Stable per-line keys based on a running line offset + content, so identical
 * lines (e.g. two blank lines) stay distinct without keying on the bare index.
 * `li` is still returned for index-based pick addressing.
 */
function withLineKeys<T extends { source: string }>(
  lines: T[][],
): { segs: T[]; key: string; li: number }[] {
  let offset = 0;
  return lines.map((segs, li) => {
    const content = segs.map((s) => s.source).join("");
    const key = `${offset}:${content}`;
    offset += content.length + 1; // +1 for the stripped newline
    return { segs, key, li };
  });
}
