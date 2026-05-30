import { useEffect } from "react";

/** Google Fonts family name -> css2 query family segment. */
function familyToQuery(family: string): string {
  return family.replace(/ /g, "+");
}

const loaded = new Set<string>();

/**
 * Lazily injects a Google Fonts <link> for the given families the first time
 * they are needed (e.g. when the font-comparison view opens). Noto Sans Sinhala
 * is loaded eagerly in root.tsx, so it is skipped here.
 */
export function useFontLoader(families: string[]): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    for (const family of families) {
      if (family === "Noto Sans Sinhala" || loaded.has(family)) continue;
      loaded.add(family);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${familyToQuery(
        family,
      )}&display=swap`;
      document.head.appendChild(link);
    }
  }, [families]);
}
