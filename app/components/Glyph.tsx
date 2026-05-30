interface GlyphProps {
  text: string;
  className?: string;
  /** CSS font-family to force (for font comparison); defaults to the .sinhala family. */
  fontFamily?: string;
}

/** Renders Sinhala text with the Sinhala font stack. */
export function Glyph({ text, className = "", fontFamily }: GlyphProps) {
  return (
    <span
      className={`sinhala ${className}`}
      style={
        fontFamily
          ? { ["--sinhala-font" as string]: `"${fontFamily}"` }
          : undefined
      }
    >
      {text}
    </span>
  );
}
