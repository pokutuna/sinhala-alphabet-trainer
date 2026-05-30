import { allConsonantIdsInOrder, idsForLevel } from "~/lib/levels";

export type Course = "vowels" | "consonants";

export interface LessonCourse {
  id: Course;
  label: string;
  desc: string;
}

export const COURSES: LessonCourse[] = [
  { id: "vowels", label: "母音", desc: "独立母音 → 母音記号(pilla)" },
  {
    id: "consonants",
    label: "子音",
    desc: "清音 → 濁音・半濁音 → 拗音 → 鼻濁音・その他",
  },
];

/**
 * The ordered list of char ids for a course.
 *  vowels      = basic independent vowels (lv2), then vowel signs (lv3)
 *  consonants  = all consonants in chart order (清音 → 濁音 → 拗音 → その他)
 */
export function lessonIds(course: Course): string[] {
  if (course === "vowels") {
    return [...idsForLevel("lv2"), ...idsForLevel("lv3")];
  }
  return allConsonantIdsInOrder();
}
