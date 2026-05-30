import { bandsUpTo, idsForLevel } from "~/lib/levels";

export type Course = "vowels" | "consonants";

export interface LessonCourse {
  id: Course;
  label: string;
  desc: string;
}

export const COURSES: LessonCourse[] = [
  { id: "vowels", label: "母音", desc: "独立母音 → 母音記号(pilla)" },
  { id: "consonants", label: "子音", desc: "基本 → 残り → 混成 の頻度順" },
];

/**
 * The ordered list of char ids for a course.
 *  vowels      = basic independent vowels (lv2), then vowel signs (lv3)
 *  consonants  = consonant frequency bands (basic → rest → misra)
 */
export function lessonIds(course: Course): string[] {
  if (course === "vowels") {
    return [...idsForLevel("lv2"), ...idsForLevel("lv3")];
  }
  return bandsUpTo("misra").flatMap((b) => b.consonants.map((c) => c.id));
}
