import type { Consonant, VowelSign } from "~/lib/sinhala";

const POSITION_LABEL: Record<string, string> = {
  left: "左",
  right: "右",
  top: "上",
  bottom: "下",
  both: "左右",
  none: "なし",
};

/** Human-readable position word for a vowel sign ("上" / "左右" ...). */
export function positionLabel(position: string): string {
  return POSITION_LABEL[position] ?? position;
}

/**
 * Describe how a vowel sign attaches to a consonant, e.g.
 *   「子音の 上 に i の記号（is pilla）」
 * Returns null for the inherent vowel (no sign).
 */
export function describeComposition(
  consonant: Consonant,
  sign: VowelSign,
): string | null {
  if (sign.position === "none" || sign.sign === "") {
    return `${consonant.glyph} はそのままで「${consonant.rom}」（固有の a）。`;
  }
  const pos = positionLabel(sign.position);
  const where =
    sign.position === "both"
      ? `子音を ${pos} で挟むように`
      : `子音の ${pos} に`;
  return `${where} ${sign.rom} の記号（${sign.name}）を付ける。`;
}

/** Describe a vowel sign on its own (carrier-independent). */
export function describeSign(sign: VowelSign): string {
  if (sign.position === "none" || sign.sign === "") {
    return "記号なし（子音そのままで固有の a）。";
  }
  const pos = positionLabel(sign.position);
  const where = sign.position === "both" ? `${pos}で挟む` : `${pos}に付く`;
  return `${sign.name}：子音の ${where}。`;
}
