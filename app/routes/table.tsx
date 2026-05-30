import { useSearchParams } from "react-router";
import { CharCell } from "~/components/CharCell";
import { CharFocus } from "~/components/CharFocus";
import { Glyph } from "~/components/Glyph";
import { type ChartBands, type ConsonantBandId, chartRows } from "~/lib/levels";
import {
  AVARGA_PLACES,
  consonantMatrix,
  hodiyaConsonants,
  hodiyaVowels,
  MANNER_LABEL,
  MATRIX_MANNERS,
  PLACE_LABEL,
} from "~/lib/order";
import {
  type Consonant,
  composeSyllable,
  getCharById,
  type Vowel,
  type VowelCategory,
  type VowelSlot,
  vowelSigns,
  vowelSlots,
} from "~/lib/sinhala";
import type { Route } from "./+types/table";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "文字表 | Sinhala Trainer" },
    { name: "description", content: "シンハラ文字を表で見る" },
  ];
}

type Mode = "hodiya" | "matrix" | "chart" | "signs";

// Modes grouped by viewpoint: わかりやすさ (chart) → 調音ベース (matrix) →
// ネイティブ向け (hodiya) → 母音記号の補助表 (signs). Independent vowels are
// covered by the chart's top "vowel row", so there is no separate vowel mode.
const MODES: { id: Mode; label: string }[] = [
  { id: "chart", label: "合成表 (子音×母音)" },
  { id: "matrix", label: "子音マトリクス (調音)" },
  { id: "hodiya", label: "ホーディヤ順 (一覧)" },
  { id: "signs", label: "母音記号 (pilla)" },
];

/** Modes where the miśra (borrowed/Sanskrit) letters can be toggled in. The
 *  matrix always shows every letter (its purpose is the full articulation
 *  system), so only the hodiya list keeps the toggle. */
const MISRA_MODES = new Set<Mode>(["hodiya"]);

/** A small rose dot marking miśra (borrowed/Sanskrit) letters. Subtle: cells
 *  look identical to pure Sinhala apart from this dot under the romanization. */
function MisraDot() {
  return (
    <span
      role="img"
      aria-label="混成字母"
      title="混成字母 (miśra): 借用語・梵語用。発音は対応する純粋字母と同じ"
      className="block h-1 w-1 rounded-full bg-rose-500/70"
    />
  );
}

// --- vowel categories: button color <-> column-header color correspondence ---
// `header` tints the romaji header strongly; `cell` is the faint background for
// the data rows so the short vs long rows read as two bands matching the toggle
// button colors (sky = short, amber = long).
const VOWEL_CATEGORY_STYLE: Record<
  VowelCategory,
  { label: string; button: string; header: string; cell: string }
> = {
  short: {
    label: "短音",
    button: "bg-sky-600 text-white",
    header: "bg-sky-100 dark:bg-sky-900/40",
    cell: "bg-sky-50/50 dark:bg-sky-950/20",
  },
  long: {
    label: "長音",
    button: "bg-amber-600 text-white",
    header: "bg-amber-100 dark:bg-amber-900/40",
    cell: "bg-amber-50/60 dark:bg-amber-950/20",
  },
};

// --- row (consonant) band toggle: option <-> row-header color ---
// Four independently-toggled consonant categories. Each has a toggle-button
// color and a matching faint row tint so the chart distinguishes categories by
// color alone (no separator rows).
const BAND_OPTIONS: {
  id: ConsonantBandId;
  label: string;
  button: string;
  header: string;
}[] = [
  {
    id: "seion",
    label: "清音",
    button: "bg-emerald-600 text-white",
    header: "bg-emerald-50 dark:bg-emerald-900/30",
  },
  {
    id: "dakuon",
    label: "濁音・半濁音",
    button: "bg-violet-600 text-white",
    header: "bg-violet-50 dark:bg-violet-900/30",
  },
  {
    id: "yoon",
    label: "拗音",
    button: "bg-amber-600 text-white",
    header: "bg-amber-50 dark:bg-amber-900/30",
  },
  {
    id: "other",
    label: "鼻濁音・その他",
    button: "bg-rose-600 text-white",
    header: "bg-rose-50 dark:bg-rose-900/30",
  },
];

const BAND_HEADER = new Map(BAND_OPTIONS.map((b) => [b.id, b.header]));

export default function TablePage() {
  const [params, setParams] = useSearchParams();
  const mode = (params.get("mode") as Mode) || "chart";
  // miśra (borrowed/Sanskrit) letters off by default; ?misra=on adds them in
  // the hodiya / matrix / vowels views.
  const showMisra = params.get("misra") === "on";
  // chart column toggle: short vowels are always shown; long vowels are
  // optional and turned on via ?vowels=long
  const showLong = params.get("vowels") === "long";
  // chart row toggle: 清音 / 濁音半濁音 / 拗音 / 鼻濁音その他 are toggled
  // independently via a comma list ?band=seion,dakuon. Default (absent) = 清音.
  const bandParam = params.get("band");
  const bandSet = new Set(
    (bandParam ?? "seion").split(",").filter(Boolean) as ConsonantBandId[],
  );
  const chartBands: ChartBands = {
    seion: bandSet.has("seion"),
    dakuon: bandSet.has("dakuon"),
    yoon: bandSet.has("yoon"),
    other: bandSet.has("other"),
  };
  // matrix base vowel: each cell shows the consonant + this vowel sign (default
  // a = bare consonant). ?base=<short rom>, ?mlong=on swaps to the long partner.
  const matrixBase = params.get("base") ?? "a";
  const matrixLong = params.get("mlong") === "on";
  const matrixSlots = vowelSlots();
  const matrixSlot =
    matrixSlots.find((s) => s.shortSign.rom === matrixBase) ?? matrixSlots[0];
  const matrixSign =
    matrixLong && matrixSlot.longSign
      ? matrixSlot.longSign
      : matrixSlot.shortSign;
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

  // toggle one chart band on/off independently; persists as ?band=seion,dakuon.
  // 清音 always stays available, so the absent-param default (清音 only) is "".
  const toggleBand = (id: ConsonantBandId) => {
    const nextSet = new Set(bandSet);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    const next = new URLSearchParams(params);
    const value = (["seion", "dakuon", "yoon", "other"] as ConsonantBandId[])
      .filter((b) => nextSet.has(b))
      .join(",");
    if (value === "seion" || value === "") next.delete("band");
    else next.set("band", value);
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

      {/* sticky toolbar: stays pinned to the top while the (often tall) table
          scrolls underneath, so the mode / vowel / band toggles are always
          reachable on PC and mobile. The translucent blurred backdrop keeps the
          table rows readable as they pass behind it. On narrow screens each
          chip row scrolls horizontally instead of wrapping into a tall block. */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gray-200 bg-white/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-gray-700 dark:bg-gray-900/85 dark:supports-[backdrop-filter]:bg-gray-900/70">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={
                mode === m.id
                  ? "shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white"
                  : "shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        {MISRA_MODES.has(mode) && (
          <div className="-mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4 pb-1 text-sm sm:flex-wrap sm:overflow-visible">
            <span className="shrink-0 text-xs text-gray-500">
              混成字母 (miśra):
            </span>
            <button
              type="button"
              onClick={() => setParam("misra", showMisra ? null : "on")}
              aria-pressed={showMisra}
              className={
                showMisra
                  ? "shrink-0 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  : "shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }
            >
              {showMisra ? "✓ 表示中" : "+ 借用語・梵語用を追加"}
            </button>
            {showMisra && (
              <span className="hidden shrink-0 items-center gap-1 text-xs text-gray-500 sm:inline-flex">
                <MisraDot />
                の印 = 借用語・梵語用 (発音は対応する純粋字母と同じ)
              </span>
            )}
          </div>
        )}

        {mode === "chart" && (
          <div className="mt-2 space-y-1.5 text-sm">
            {/* column (vowel) toggle: short always on, long optional */}
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible">
              <span className="shrink-0 text-xs text-gray-500">母音 (列):</span>
              {/* always-on short chip */}
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${VOWEL_CATEGORY_STYLE.short.button}`}
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
                    ? `shrink-0 rounded-full px-3 py-1 text-xs font-medium ${VOWEL_CATEGORY_STYLE.long.button}`
                    : "shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                }
              >
                {showLong ? "✓ " : "+ "}
                {VOWEL_CATEGORY_STYLE.long.label}
              </button>
            </div>

            {/* row (consonant band) toggles — each band on/off independently */}
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible">
              <span className="shrink-0 text-xs text-gray-500">子音 (行):</span>
              {BAND_OPTIONS.map((o) => {
                const on = chartBands[o.id];
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleBand(o.id)}
                    aria-pressed={on}
                    className={
                      on
                        ? `shrink-0 rounded-full px-3 py-1 text-xs font-medium ${o.button}`
                        : "shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    }
                  >
                    {on ? "✓ " : "+ "}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "matrix" && (
          <div className="-mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4 pb-1 text-sm sm:flex-wrap sm:overflow-visible">
            <span className="shrink-0 text-xs text-gray-500">母音:</span>
            {matrixSlots.map((s) => {
              const on = s.shortSign.rom === matrixBase;
              const rom =
                matrixLong && s.longSign ? s.longSign.rom : s.shortSign.rom;
              return (
                <button
                  key={s.shortSign.id}
                  type="button"
                  onClick={() => setParam("base", s.shortSign.rom)}
                  aria-pressed={on}
                  className={
                    on
                      ? "shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white"
                      : "shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  }
                >
                  {rom}
                </button>
              );
            })}
            {/* long toggle: swaps every chip (and the matrix) to its long pair */}
            <button
              type="button"
              onClick={() => setParam("mlong", matrixLong ? null : "on")}
              aria-pressed={matrixLong}
              className={
                matrixLong
                  ? "shrink-0 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  : "shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              }
            >
              {matrixLong ? "✓ 長音" : "+ 長音"}
            </button>
          </div>
        )}
      </div>

      {mode === "hodiya" && <HodiyaList misra={showMisra} onSelect={select} />}
      {mode === "matrix" && (
        <ConsonantMatrixTable sign={matrixSign} onSelect={select} />
      )}
      {mode === "chart" && (
        <SyllableGrid
          showLong={showLong}
          bands={chartBands}
          onSelect={select}
        />
      )}
      {mode === "signs" && <SignTable onSelect={select} />}

      <p className="mt-6 text-sm text-gray-500">
        セルをタップすると、その文字の詳細(大きな表示・覚え方・フォント比較)が
        見られます。
      </p>

      {selected && <CharFocus char={selected} onClose={close} />}
    </main>
  );
}

/** A CharCell with an unobtrusive miśra dot below it (same look otherwise). */
function MisraCell({
  char,
  misra,
  onSelect,
}: {
  char: Parameters<typeof CharCell>[0]["char"];
  misra: boolean;
  onSelect: (id: string) => void;
}) {
  if (!misra) return <CharCell char={char} onSelect={onSelect} />;
  return (
    <div className="relative">
      <CharCell char={char} onSelect={onSelect} />
      <span className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
        <MisraDot />
      </span>
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
  bands,
  onSelect,
}: {
  showLong: boolean;
  bands: ChartBands;
  onSelect: (id: string) => void;
}) {
  // 6 fixed columns (a/æ/i/u/e/o slots). The chart never widens for long
  // vowels; instead the long member shows as an extra row.
  const slots = vowelSlots();

  // chart rows in fixed articulation order, filtered to the toggled-on bands.
  // Each row carries its category, shown by the label cell's color.
  const rows = chartRows(bands);

  const gridStyle = {
    gridTemplateColumns: `3.5rem repeat(${slots.length}, minmax(2.5rem, 1fr))`,
  };

  // when both lengths are shown, faintly tint each row by its category so the
  // short/long pair reads as two bands matching the toggle button colors.
  const shortTone = showLong ? VOWEL_CATEGORY_STYLE.short.cell : undefined;
  const longTone = VOWEL_CATEGORY_STYLE.long.cell;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="grid text-center" style={gridStyle}>
        {/* header: romanization only (a/æ/i…). short always; long added as a
            second header row, tinted amber to match the long toggle button. */}
        <div className="sticky left-0 z-10 border-r border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        {slots.map((slot) => (
          <div
            key={`h-short:${slot.shortSign.id}`}
            className={`border-b border-gray-200 py-1 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200 ${VOWEL_CATEGORY_STYLE.short.header}`}
          >
            {slot.shortSign.rom}
          </div>
        ))}
        {showLong && (
          <>
            <div className="sticky left-0 z-10 border-r border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
            {slots.map((slot) => (
              <div
                key={`h-long:${slot.longSign?.id ?? slot.shortSign.id}`}
                className={`border-b border-gray-200 py-1 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200 ${VOWEL_CATEGORY_STYLE.long.header}`}
              >
                {slot.longSign?.rom ?? ""}
              </div>
            ))}
          </>
        )}

        {/* "vowel row(s)": the independent (word-initial) vowel glyphs. The bare
            vowel has a different shape than the on-consonant sign, so it gets
            its own row(s), labelled 母音. The consonant label spans both lengths. */}
        <div
          style={showLong ? { gridRow: "span 2" } : undefined}
          className="sticky left-0 z-10 flex items-center justify-center border-r border-b border-gray-200 bg-gray-100 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          独立母音
        </div>
        {slots.map((slot) => (
          <VowelGlyphCell
            key={`v-short:${slot.shortSign.id}`}
            vowel={slot.shortVowel}
            onSelect={onSelect}
            tone={shortTone}
          />
        ))}
        {showLong &&
          slots.map((slot) => (
            <VowelGlyphCell
              key={`v-long:${slot.longSign?.id ?? slot.shortSign.id}`}
              vowel={slot.longVowel}
              onSelect={onSelect}
              tone={longTone}
            />
          ))}

        {/* chart rows in fixed order; no separator rows. Each row's category is
            shown by the color of its sticky label cell (清音/濁音/拗音/その他). */}
        {rows.map((row) => {
          const c = row.consonant;
          const rowHeaderTint =
            BAND_HEADER.get(row.band) ?? "bg-gray-100 dark:bg-gray-800";
          return (
            <Fragmentish key={`con:${c.id}`}>
              {/* header column: the bare consonant; spans both length rows.
                  kana disambiguates duplicates like た(そり舌) vs た. */}
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                style={showLong ? { gridRow: "span 2" } : undefined}
                className={`sticky left-0 z-10 flex flex-col items-center justify-center border-r border-b border-gray-200 px-0.5 py-1 hover:brightness-95 dark:border-gray-700 ${rowHeaderTint}`}
                title={`${c.rom} (${c.kana}) の詳細`}
              >
                <Glyph
                  text={c.glyph}
                  className="text-lg leading-none text-gray-800 dark:text-gray-100"
                />
                <span className="text-[0.6rem] font-medium text-gray-600 dark:text-gray-300">
                  {c.rom}
                </span>
                <span className="text-[0.5rem] leading-tight text-gray-400">
                  {c.kana}
                </span>
              </button>
              {/* short row */}
              {slots.map((slot) => (
                <SyllableCell
                  key={`short:${c.id}:${slot.shortSign.id}`}
                  consonant={c}
                  sign={slot.shortSign}
                  onSelect={onSelect}
                  tone={shortTone}
                />
              ))}
              {/* long row */}
              {showLong &&
                slots.map((slot) =>
                  slot.longSign ? (
                    <SyllableCell
                      key={`long:${c.id}:${slot.longSign.id}`}
                      consonant={c}
                      sign={slot.longSign}
                      onSelect={onSelect}
                      tone={longTone}
                    />
                  ) : (
                    <div
                      key={`long-empty:${c.id}:${slot.shortSign.id}`}
                      className={`border-b border-gray-100 dark:border-gray-800 ${longTone}`}
                    />
                  ),
                )}
            </Fragmentish>
          );
        })}
      </div>
    </div>
  );
}

/** A cell in the "母音" row showing an independent (word-initial) vowel glyph.
 *  `tone` faintly tints the row (sky=short / amber=long) to match the toggle. */
function VowelGlyphCell({
  vowel,
  onSelect,
  tone,
}: {
  vowel?: Vowel;
  onSelect: (id: string) => void;
  tone?: string;
}) {
  if (!vowel) {
    return (
      <div
        className={`border-b border-gray-200 dark:border-gray-700 ${tone ?? ""}`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(vowel.id)}
      title={`${vowel.rom} (独立母音)`}
      className={`border-b border-gray-200 py-1 hover:brightness-95 dark:border-gray-700 ${tone ?? ""}`}
    >
      <Glyph
        text={vowel.glyph}
        className="block text-lg leading-none text-gray-800 dark:text-gray-100"
      />
      <span className="text-[0.55rem] text-gray-400">{vowel.rom}</span>
    </button>
  );
}

/** A single composed-syllable cell (consonant + vowel sign). `tone` faintly
 *  tints the row (sky=short / amber=long) so the two length rows are distinct. */
function SyllableCell({
  consonant,
  sign,
  onSelect,
  tone,
}: {
  consonant: Consonant;
  sign: VowelSlot["shortSign"];
  onSelect: (id: string) => void;
  tone?: string;
}) {
  const syl = composeSyllable(consonant, sign);
  return (
    <button
      type="button"
      onClick={() => onSelect(syl.id)}
      title={syl.rom}
      className={`flex flex-col items-center justify-center border-b border-gray-100 py-1 hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-gray-800 ${tone ?? ""}`}
    >
      <Glyph
        text={syl.glyph}
        className="text-xl leading-none text-gray-900 dark:text-white"
      />
      <span className="text-[0.6rem] text-gray-400">{syl.rom}</span>
    </button>
  );
}

/** A bare consonant cell used by the hodiya list & the matrix. miśra letters
 *  look identical apart from a small dot under the romanization. */
function ConsonantCell({
  c,
  onSelect,
}: {
  c: Consonant;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c.id)}
      title={`${c.rom} の詳細`}
      className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-200 bg-white transition-colors hover:border-blue-400 hover:bg-blue-50 sm:h-16 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      <Glyph
        text={c.glyph}
        className="text-2xl leading-none text-gray-900 dark:text-white"
      />
      <span className="text-[0.65rem] text-gray-500">{c.rom}</span>
      {c.misra && (
        <span className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
          <MisraDot />
        </span>
      )}
    </button>
  );
}

/** A matrix cell: the consonant composed with the chosen base vowel sign
 *  (a = bare consonant). Fills its grid cell and centers its content. */
function MatrixCell({
  c,
  sign,
  onSelect,
}: {
  c: Consonant;
  sign: VowelSlot["shortSign"];
  onSelect: (id: string) => void;
}) {
  const syl = composeSyllable(c, sign);
  return (
    <button
      type="button"
      onClick={() => onSelect(syl.id)}
      title={`${syl.rom} の詳細`}
      className="flex h-full flex-col items-center justify-center gap-0.5 rounded-md px-1.5 py-1 transition-colors hover:bg-blue-50 dark:hover:bg-gray-700"
    >
      <Glyph
        text={syl.glyph}
        className="text-xl leading-none text-gray-900 dark:text-white"
      />
      <span className="text-[0.6rem] text-gray-500">{syl.rom}</span>
    </button>
  );
}

/** Hōḍiya order: the native traditional alphabet sequence — independent vowels
 *  first, then consonants in varga (place × manner) order. */
function HodiyaList({
  misra,
  onSelect,
}: {
  misra: boolean;
  onSelect: (id: string) => void;
}) {
  const vowels = hodiyaVowels({ misra });
  const cons = hodiyaConsonants({ misra });

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          独立母音 (svara)
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {vowels.map((v) => (
            <MisraCell
              key={v.id}
              char={v}
              misra={v.misra}
              onSelect={onSelect}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          子音 (vyañjana) — 調音順
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {cons.map((c) => (
            <ConsonantCell key={c.id} c={c} onSelect={onSelect} />
          ))}
        </div>
      </section>
      <p className="text-xs text-gray-500">
        ネイティブの伝統配列 (හෝඩිය)。母音群のあと、子音を調音位置 (軟口蓋→唇→…)
        × 調音法 (無声→有声→鼻音…) の順に並べています。
      </p>
    </div>
  );
}

/** Consonant matrix shown as two aligned grids:
 *  - the dense stop grid: rows = the 5 stop places, columns = stop/nasal manners
 *  - the avarga grid: rows = 接近音/摩擦音, columns = 半母音/流音/歯擦音/声門
 *    (a cell may hold several letters, e.g. 接近音×流音 = ra la ḷa).
 *  `sign` is the base vowel each cell is composed with (a = bare consonant). */
function ConsonantMatrixTable({
  sign,
  onSelect,
}: {
  sign: VowelSlot["shortSign"];
  onSelect: (id: string) => void;
}) {
  // the matrix always shows every letter (pure + borrowed); its purpose is the
  // complete articulation system. Borrowed letters keep a subtle miśra dot.
  const { rows, avarga } = consonantMatrix({ misra: true });
  const stopGridStyle = {
    gridTemplateColumns: `5.5rem repeat(${MATRIX_MANNERS.length}, minmax(3rem, 1fr))`,
  };
  const avargaGridStyle = {
    gridTemplateColumns: `5.5rem repeat(${AVARGA_PLACES.length}, minmax(3rem, 1fr))`,
  };

  return (
    <div className="space-y-5">
      {/* stop grid: place × manner (the dense varga square) */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="grid min-w-[36rem] text-center" style={stopGridStyle}>
          <div className="border-r border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          {MATRIX_MANNERS.map((m) => (
            <div
              key={m}
              className="border-b border-gray-200 bg-gray-50 px-1 py-1.5 text-[0.65rem] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300"
            >
              {MANNER_LABEL[m]}
            </div>
          ))}

          {rows.map((row) => (
            <Fragmentish key={row.place}>
              <div className="flex items-center justify-start border-r border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-[0.65rem] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                {PLACE_LABEL[row.place]}
              </div>
              {row.cells.map((c, idx) =>
                c ? (
                  <div
                    key={c.id}
                    className="flex items-center justify-center border-b border-gray-100 p-1 dark:border-gray-800"
                  >
                    <MatrixCell c={c} sign={sign} onSelect={onSelect} />
                  </div>
                ) : (
                  <div
                    key={`${row.place}:${MATRIX_MANNERS[idx]}`}
                    className="border-b border-gray-100 bg-gray-50/40 dark:border-gray-800 dark:bg-gray-900/20"
                  />
                ),
              )}
            </Fragmentish>
          ))}
        </div>
      </div>

      {/* avarga grid: manner × place — semivowel/liquid (接近音) and
          sibilant/glottal (摩擦音) that fall outside the stop square. */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          その他 (avarga) — 接近音・摩擦音
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <div
            className="grid min-w-[28rem] text-center"
            style={avargaGridStyle}
          >
            <div className="border-r border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
            {AVARGA_PLACES.map((p) => (
              <div
                key={p}
                className="border-b border-gray-200 bg-gray-50 px-1 py-1.5 text-[0.65rem] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300"
              >
                {PLACE_LABEL[p]}
              </div>
            ))}

            {avarga.rows.map((row) => (
              <Fragmentish key={row.manner}>
                <div className="flex items-center justify-start border-r border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-[0.65rem] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                  {MANNER_LABEL[row.manner]}
                </div>
                {row.cells.map((cell, idx) =>
                  cell.length > 0 ? (
                    <div
                      key={`${row.manner}:${AVARGA_PLACES[idx]}`}
                      className="flex flex-wrap items-center justify-center gap-1 border-b border-gray-100 p-1 dark:border-gray-800"
                    >
                      {cell.map((c) => (
                        <MatrixCell
                          key={c.id}
                          c={c}
                          sign={sign}
                          onSelect={onSelect}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      key={`${row.manner}:${AVARGA_PLACES[idx]}`}
                      className="border-b border-gray-100 bg-gray-50/40 dark:border-gray-800 dark:bg-gray-900/20"
                    />
                  ),
                )}
              </Fragmentish>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// small helper to render cells as siblings inside the grid
function Fragmentish({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
