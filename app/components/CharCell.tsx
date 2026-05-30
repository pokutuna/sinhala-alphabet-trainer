import { Glyph } from "~/components/Glyph";
import { glyphOf, type SinhalaChar } from "~/lib/sinhala";

interface CharCellProps {
  char: SinhalaChar;
  onSelect: (id: string) => void;
}

/** A clickable cell showing a large glyph and its romanization.
 *  Fills its grid track and keeps a fixed height so rows stay aligned. */
export function CharCell({ char, onSelect }: CharCellProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(char.id)}
      className="flex h-14 w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 sm:h-16"
    >
      <Glyph
        text={glyphOf(char)}
        className="text-2xl leading-none text-gray-900 dark:text-white"
      />
      <span className="text-[0.65rem] text-gray-500">{char.rom}</span>
    </button>
  );
}

/** An empty placeholder cell to keep matrix alignment. */
export function EmptyCell() {
  return (
    <div className="h-14 w-full rounded-lg border border-dashed border-gray-200/60 dark:border-gray-800 sm:h-16" />
  );
}
