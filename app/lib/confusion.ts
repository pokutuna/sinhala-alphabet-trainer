import type { SinhalaChar } from "~/lib/sinhala";

/**
 * Groups of characters that learners commonly confuse — by sound, by shape, or
 * by the short/long vowel distinction. Used to pick higher-quality quiz
 * distractors. Each entry lists character ids.
 */
const CONFUSION_GROUPS: string[][] = [
  // dental vs retroflex stops
  ["c:ta", "c:ṭa"],
  ["c:da", "c:ḍa"],
  // nasals
  ["c:na", "c:ṇa"],
  ["c:ma", "c:na"],
  // r / l / retroflex l
  ["c:ra", "c:la", "c:ḷa"],
  // voiceless vs voiced (same place)
  ["c:ka", "c:ga"],
  ["c:ca", "c:ja"],
  ["c:pa", "c:ba"],
  // prenasalized set
  ["c:ⁿga", "c:ⁿḍa", "c:ⁿda", "c:ᵐba"],
  // sibilants
  ["c:sa", "c:śa", "c:ṣa"],
  // semivowels / approximants that look round
  ["c:ya", "c:va"],

  // vowels: short / long pairs
  ["v:a", "v:ā"],
  ["v:æ", "v:ǣ"],
  ["v:i", "v:ī"],
  ["v:u", "v:ū"],
  ["v:e", "v:ē"],
  ["v:o", "v:ō"],
  // vowels that look alike
  ["v:a", "v:æ"],
  ["v:e", "v:o"],

  // vowel signs: short / long pairs
  ["s:ā", "s:a"],
  ["s:æ", "s:ǣ"],
  ["s:i", "s:ī"],
  ["s:u", "s:ū"],
  ["s:e", "s:ē"],
  ["s:o", "s:ō"],
];

// id -> set of confusable ids (excluding itself)
const confusionIndex = new Map<string, Set<string>>();
for (const group of CONFUSION_GROUPS) {
  for (const id of group) {
    let set = confusionIndex.get(id);
    if (!set) {
      set = new Set();
      confusionIndex.set(id, set);
    }
    for (const other of group) {
      if (other !== id) set.add(other);
    }
  }
}

/** ids known to be confusable with the given character. */
export function confusableIds(id: string): string[] {
  return [...(confusionIndex.get(id) ?? [])];
}

/** Among candidates, those confusable with the target (target excluded). */
export function confusableAmong(
  target: SinhalaChar,
  candidates: SinhalaChar[],
): SinhalaChar[] {
  const set = confusionIndex.get(target.id);
  if (!set) return [];
  return candidates.filter((c) => c.id !== target.id && set.has(c.id));
}
