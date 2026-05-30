import { useSearchParams } from "react-router";
import { CharCell, EmptyCell } from "~/components/CharCell";
import { CharFocus } from "~/components/CharFocus";
import { Glyph } from "~/components/Glyph";
import { bandsUpTo, type ConsonantBandId } from "~/lib/levels";
import {
  composeSyllable,
  getCharById,
  glyphOf,
  independentVowels,
  isLongSign,
  type Vowel,
  type VowelCategory,
  vowelCategory,
  vowelColumns,
  vowelSigns,
} from "~/lib/sinhala";
import type { Route } from "./+types/table";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "文字表 | Sinhala Trainer" },
    { name: "description", content: "シンハラ文字を表で見る" },
  ];
}

type Mode = "chart" | "vowels" | "signs";

const MODES: { id: Mode; label: string }[] = [
  { id: "chart", label: "合成表 (子音×母音)" },
  { id: "vowels", label: "独立母音" },
  { id: "signs", label: "母音記号 (pilla)" },
];

// --- vowel categories: button color <-> column-header color correspondence ---
const VOWEL_CATEGORY_STYLE: Record<
  VowelCategory,
  { label: string; button: string; header: string }
> = {
  short: {
    label: "短音",
    button: "bg-sky-600 text-white",
    header: "bg-sky-100 dark:bg-sky-900/40",
  },
  long: {
    label: "長音",
    button: "bg-amber-600 text-white",
    header: "bg-amber-100 dark:bg-amber-900/40",
  },
};

// --- row (consonant) band toggle: option <-> row-header color ---
const BAND_OPTIONS: {
  id: ConsonantBandId;
  label: string;
  button: string;
  header: string;
}[] = [
  {
    id: "basic",
    label: "基本",
    button: "bg-emerald-600 text-white",
    header: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  {
    id: "rest",
    label: "+残りの子音",
    button: "bg-violet-600 text-white",
    header: "bg-violet-50 dark:bg-violet-900/30",
  },
  {
    id: "misra",
    label: "+混成字母",
    button: "bg-rose-600 text-white",
    header: "bg-rose-50 dark:bg-rose-900/30",
  },
];

const BAND_HEADER = new Map(BAND_OPTIONS.map((b) => [b.id, b.header]));

export default function TablePage() {
  const [params, setParams] = useSearchParams();
  const mode = (params.get("mode") as Mode) || "chart";
  // chart column toggle: short vowels are always shown; long vowels are
  // optional and turned on via ?vowels=long
  const showLong = params.get("vowels") === "long";
  // chart row toggle: how far down the consonant frequency bands to show
  const bandParam = params.get("band");
  const band: ConsonantBandId =
    bandParam === "rest" || bandParam === "misra" ? bandParam : "basic";
  const selectedId = params.get("char");
  const selected = selectedId ? getCharById(selectedId) : undefined;

  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params);
    next.set("mode", m);
    next.delete("char");
    setParams(next);
  };

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  const select = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("char", id);
    setParams(next);
  };

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete("char");
    setParams(next);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        文字表
      </h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={
              mode === m.id
                ? "rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "chart" && (
        <div className="mb-4 space-y-2 text-sm">
          {/* column (vowel) toggle: short always on, long optional */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">母音 (列):</span>
            {/* always-on short chip */}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${VOWEL_CATEGORY_STYLE.short.button}`}
            >
              {VOWEL_CATEGORY_STYLE.short.label}（常に表示）
            </span>
            {/* long on/off */}
            <button
              type="button"
              onClick={() => setParam("vowels", showLong ? null : "long")}
              aria-pressed={showLong}
              className={
                showLong
                  ? `rounded-full px-3 py-1 text-xs font-medium ${VOWEL_CATEGORY_STYLE.long.button}`
                  : "rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }
            >
              {showLong ? "✓ " : "+ "}
              {VOWEL_CATEGORY_STYLE.long.label}
            </button>
          </div>

          {/* row (consonant band) toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">子音 (行):</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
              {BAND_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() =>
                    setParam("band", o.id === "basic" ? null : o.id)
                  }
                  aria-pressed={band === o.id}
                  className={
                    band === o.id
                      ? `px-3 py-1 font-medium ${o.button}`
                      : "bg-white px-3 py-1 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200"
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "chart" && (
        <SyllableGrid showLong={showLong} band={band} onSelect={select} />
      )}
      {mode === "vowels" && <VowelTable onSelect={select} />}
      {mode === "signs" && <SignTable onSelect={select} />}

      <p className="mt-6 text-sm text-gray-500">
        セルをタップすると、その文字の詳細(大きな表示・覚え方・フォント比較)が
        見られます。
      </p>

      {selected && <CharFocus char={selected} onClose={close} />}
    </main>
  );
}

function VowelTable({ onSelect }: { onSelect: (id: string) => void }) {
  // group short/long pairs by the short member's order
  const shorts = independentVowels.filter((v) => v.len !== "long");
  const longByPair = new Map<string, Vowel>();
  for (const v of independentVowels) {
    if (v.len === "long") longByPair.set(v.pair, v);
  }

  return (
    <div className="grid max-w-md grid-cols-2 gap-2">
      <div className="col-span-1 text-center text-xs text-gray-500">短</div>
      <div className="col-span-1 text-center text-xs text-gray-500">長</div>
      {shorts.map((s) => {
        const long = longByPair.get(s.rom);
        return (
          <Fragmentish key={s.id}>
            <CharCell char={s} onSelect={onSelect} />
            {long ? (
              <CharCell char={long} onSelect={onSelect} />
            ) : (
              <EmptyCell />
            )}
          </Fragmentish>
        );
      })}
    </div>
  );
}

function SignTable({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-sm text-gray-500">
        キャリア
        <Glyph text="ක" className="text-2xl text-gray-900 dark:text-white" />
        に母音記号を付けた形で表示しています。
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {vowelSigns.map((s) => (
          <CharCell key={s.id} char={s} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function SyllableGrid({
  showLong,
  band,
  onSelect,
}: {
  showLong: boolean;
  band: ConsonantBandId;
  onSelect: (id: string) => void;
}) {
  // columns = short vowels (always) + optionally long; each column's header is
  // tinted by its own category so it matches the toggle button color.
  const cols = vowelColumns({ long: showLong });

  // rows = consonant bands up to the chosen band; each band's row headers are
  // tinted to match its toggle button.
  const bands = bandsUpTo(band);
  const totalCols = cols.length + 1;

  const gridStyle = {
    gridTemplateColumns: `3.5rem repeat(${cols.length}, minmax(2.5rem, 1fr))`,
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div
        className={`grid text-center ${cols.length > 6 ? "min-w-[40rem]" : ""}`}
        style={gridStyle}
      >
        {/* corner */}
        <div className="sticky left-0 z-10 border-r border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        {/* header row: vowel signs (shown on carrier ka), tinted per category */}
        {cols.map((s) => {
          const tint = VOWEL_CATEGORY_STYLE[vowelCategory(s)].header;
          return (
            <div
              key={s.id}
              className={`border-b border-gray-200 py-1.5 dark:border-gray-700 ${tint}`}
            >
              <Glyph
                text={glyphOf(s)}
                className="block text-lg leading-none text-gray-800 dark:text-gray-100"
              />
              <span className="text-[0.65rem] font-medium text-gray-600 dark:text-gray-300">
                {s.rom}
                {isLongSign(s) ? "ː" : ""}
              </span>
            </div>
          );
        })}

        {/* consonant rows, grouped by frequency band */}
        {bands.map((b) => {
          const rowHeaderTint =
            BAND_HEADER.get(b.id) ?? "bg-gray-100 dark:bg-gray-800";
          return (
            <Fragmentish key={b.id}>
              {/* band separator label spanning the full width */}
              <div
                className="bg-gray-50 px-2 py-0.5 text-left text-[0.65rem] font-medium text-gray-500 dark:bg-gray-900/60"
                style={{ gridColumn: `1 / ${totalCols + 1}` }}
              >
                {b.label}
              </div>

              {b.consonants.map((c) => (
                <Fragmentish key={c.id}>
                  {/* header column: the bare consonant, tinted by band */}
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`sticky left-0 z-10 flex flex-col items-center justify-center border-r border-b border-gray-200 py-1 hover:brightness-95 dark:border-gray-700 ${rowHeaderTint}`}
                    title={`${c.rom} の詳細`}
                  >
                    <Glyph
                      text={c.glyph}
                      className="text-lg leading-none text-gray-800 dark:text-gray-100"
                    />
                    <span className="text-[0.6rem] font-medium text-gray-600 dark:text-gray-300">
                      {c.rom}
                    </span>
                  </button>
                  {cols.map((s) => {
                    const syl = composeSyllable(c, s);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelect(c.id)}
                        title={syl.rom}
                        className="flex flex-col items-center justify-center border-b border-gray-100 py-1 hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-gray-800"
                      >
                        <Glyph
                          text={syl.glyph}
                          className="text-xl leading-none text-gray-900 dark:text-white"
                        />
                        <span className="text-[0.6rem] text-gray-400">
                          {syl.rom}
                        </span>
                      </button>
                    );
                  })}
                </Fragmentish>
              ))}
            </Fragmentish>
          );
        })}
      </div>
    </div>
  );
}

// small helper to render cells as siblings inside the grid
function Fragmentish({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
