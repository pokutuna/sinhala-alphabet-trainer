import { useEffect, useRef, useState } from "react";
import { Glyph } from "~/components/Glyph";
import { describeSign } from "~/lib/explain";
import {
  type Consonant,
  fonts,
  glyphOf,
  hal,
  type SinhalaChar,
  type VowelSign,
} from "~/lib/sinhala";
import { useFontLoader } from "~/lib/useFontLoader";

interface CharFocusProps {
  char: SinhalaChar;
  onClose: () => void;
}

const COMPARE_FAMILIES = fonts.google_fonts.map((f) => f.family);

export function CharFocus({ char, onClose }: CharFocusProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [font, setFont] = useState<string>("Noto Sans Sinhala");

  // load all comparison fonts (they are shown side-by-side by default)
  useFontLoader(COMPARE_FAMILIES);

  // focus the dialog on open; restore focus to the trigger on close
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const glyph = glyphOf(char);
  const mnemonic = "mnemonic" in char ? char.mnemonic : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop: a real button so it is keyboard/focus accessible */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${char.rom} の詳細`}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl outline-none dark:bg-gray-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-4 top-4 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ✕
        </button>

        {/* big glyph */}
        <div className="flex flex-col items-center pt-6">
          <Glyph
            text={glyph}
            fontFamily={font}
            className="block px-6 py-2 text-8xl text-gray-900 dark:text-white sm:text-9xl"
          />
          {char.family === "sign" && (
            <p className="mt-1 text-sm text-gray-500">
              キャリア「ක」に付けた形
            </p>
          )}
        </div>

        {/* readings */}
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Reading label="ローマ字" value={char.rom} />
          <Reading label="発音記号" value={char.ipa} />
          <Reading label="かな(近似)" value={char.kana} />
        </dl>

        {/* mnemonic */}
        {mnemonic ? (
          <Section title="形の覚え方">
            <p className="text-gray-700 dark:text-gray-200">{mnemonic}</p>
          </Section>
        ) : null}

        {/* composition (vowel signs) */}
        {char.family === "sign" && (
          <Section title="組み立て">
            <p className="text-gray-700 dark:text-gray-200">
              {describeSign(char as VowelSign)}
            </p>
          </Section>
        )}

        {/* note (consonants/irregular hints) */}
        {"note" in char && char.note ? (
          <Section title="メモ">
            <p className="text-gray-700 dark:text-gray-200">{char.note}</p>
          </Section>
        ) : null}

        {/* hal hint for consonants */}
        {char.family === "consonant" && (
          <Section title="子音だけにする (hal)">
            <p className="text-gray-700 dark:text-gray-200">
              <Glyph text={(char as Consonant).glyph + hal.sign} /> のように{" "}
              {hal.name}（{hal.sign}）を足すと固有の a が消えて子音単独になる。
            </p>
          </Section>
        )}

        {/* font comparison: all fonts side-by-side; click one to use it above */}
        <Section title="フォント (グリフの違い)">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fonts.google_fonts.map((f) => {
              const active = f.family === font;
              return (
                <button
                  key={f.family}
                  type="button"
                  onClick={() => setFont(f.family)}
                  aria-pressed={active}
                  className={
                    active
                      ? "flex flex-col items-center rounded-lg border border-blue-500 bg-blue-50 p-2 dark:border-blue-400 dark:bg-blue-950"
                      : "flex flex-col items-center rounded-lg border border-gray-200 p-2 hover:border-blue-300 dark:border-gray-700"
                  }
                >
                  <Glyph
                    text={glyph}
                    fontFamily={f.family}
                    className="block text-3xl text-gray-900 dark:text-white"
                  />
                  <span className="mt-1 block w-full truncate text-center text-[0.65rem] text-gray-500">
                    {f.family}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 py-2 dark:bg-gray-800">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-lg font-medium text-gray-900 dark:text-white">
        {value || "—"}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-500">{title}</h3>
      {children}
    </section>
  );
}
