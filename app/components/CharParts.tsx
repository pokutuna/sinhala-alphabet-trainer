import { describeComposition, positionLabel } from "~/lib/explain";
import { getPartsArt, type PartsArt, partColor } from "~/lib/parts";
import {
  type Consonant,
  type SinhalaChar,
  type VowelSign,
  vowelSigns,
} from "~/lib/sinhala";

const BASE_COLOR = partColor("consonant_base");
const SIGN_COLOR = partColor("vowel_sign");

// representative signs to demo on a consonant (covers right/top/bottom/left/both)
const DEMO_SIGN_ROMS = ["a", "ā", "i", "u", "e", "o"];

interface CharPartsProps {
  char: SinhalaChar;
}

/**
 * Part-by-part visualization. Three safe layers:
 *  1. hand-made internal-part SVG (only for chars that have it)
 *  2. 2-color split of base + vowel sign, with the attach position
 *  3. text description (fallback / supplement)
 */
export function CharParts({ char }: CharPartsProps) {
  const art = getPartsArt(char.id);
  if (art) return <PartsSvg art={art} />;

  if (char.family === "consonant") return <ConsonantParts char={char} />;
  if (char.family === "sign") return <SignParts sign={char} />;
  // independent vowel: a standalone letter with no base/sign split
  return (
    <p className="text-sm text-gray-600 dark:text-gray-300">
      独立母音(単独で書く形)。子音には母音記号(pilla)として付きます。
    </p>
  );
}

/** A 2-color glyph: consonant base in one color, vowel sign in another. */
function SplitGlyph({
  base,
  sign,
  className = "",
}: {
  base: string;
  sign: string;
  className?: string;
}) {
  return (
    <span className={`sinhala ${className}`}>
      <span style={{ color: BASE_COLOR }}>{base}</span>
      {sign && <span style={{ color: SIGN_COLOR }}>{sign}</span>}
    </span>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      <LegendItem color={BASE_COLOR} label="子音字 (base)" />
      <LegendItem color={SIGN_COLOR} label="母音記号 (pilla)" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function ConsonantParts({ char }: { char: Consonant }) {
  const demos = DEMO_SIGN_ROMS.map((rom) =>
    vowelSigns.find((s) => s.rom === rom),
  ).filter((s): s is VowelSign => !!s);

  return (
    <div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        子音字{" "}
        <SplitGlyph
          base={char.glyph}
          sign=""
          className="text-xl align-middle"
        />{" "}
        に母音記号を付けると音が変わります。色は{" "}
        <span style={{ color: BASE_COLOR }}>子音字</span> と{" "}
        <span style={{ color: SIGN_COLOR }}>母音記号</span> の対応です。
      </p>
      <div className="flex flex-wrap gap-3">
        {demos.map((sign) => (
          <div
            key={sign.id}
            className="flex w-16 flex-col items-center rounded-lg border border-gray-200 py-2 dark:border-gray-700"
            title={describeComposition(char, sign) ?? undefined}
          >
            <SplitGlyph
              base={char.glyph}
              sign={sign.sign}
              className="text-3xl leading-none"
            />
            <span className="mt-1 text-[0.65rem] text-gray-500">
              {char.rom.replace(/a$/, "") + (sign.rom === "a" ? "a" : sign.rom)}
            </span>
            <span className="text-[0.6rem] text-gray-400">
              {sign.position === "none" ? "—" : positionLabel(sign.position)}
            </span>
          </div>
        ))}
      </div>
      <Legend />
    </div>
  );
}

function SignParts({ sign }: { sign: VowelSign }) {
  // show the sign on the carrier ka, split into base + sign
  const carrier = "ක";
  return (
    <div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        キャリア{" "}
        <SplitGlyph base={carrier} sign="" className="text-xl align-middle" />{" "}
        に{" "}
        {sign.position === "none"
          ? "記号は付きません(固有の a)"
          : `${positionLabel(sign.position)} へ付きます`}
        。
      </p>
      <div className="flex items-center gap-4">
        <SplitGlyph
          base={carrier}
          sign={sign.sign}
          className="text-5xl leading-none"
        />
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <div>
            読み: <span className="font-medium">{sign.rom}</span> / {sign.ipa}
          </div>
          <div className="text-gray-500">{sign.name}</div>
        </div>
      </div>
      <Legend />
    </div>
  );
}

/** Hand-made internal-part SVG art (Hook / Spiral / Terminal …). */
function PartsSvg({ art }: { art: PartsArt }) {
  return (
    <div>
      <svg
        viewBox={art.viewBox}
        role="img"
        aria-label="文字のパーツ分解"
        className="h-40 w-40"
      >
        <title>文字のパーツ分解</title>
        {art.spans.flatMap((span) =>
          span.paths.map((d) => (
            <path key={`${span.role}-${d}`} d={d} fill={partColor(span.role)} />
          )),
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {art.spans.map((span) => (
          <LegendItem
            key={span.role}
            color={partColor(span.role)}
            label={span.label}
          />
        ))}
      </div>
    </div>
  );
}
