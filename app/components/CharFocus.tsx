import { useEffect, useRef } from "react";
import { CharDetail } from "~/components/CharDetail";
import type { SinhalaChar } from "~/lib/sinhala";

interface CharFocusProps {
  char: SinhalaChar;
  onClose: () => void;
}

/** A modal shell around the shared CharDetail view. */
export function CharFocus({ char, onClose }: CharFocusProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

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
          className="absolute top-4 right-4 rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ✕
        </button>

        <CharDetail char={char} variant="modal" />
      </div>
    </div>
  );
}
