// scripts/depth-audit/classify.ts
// Beginner /learn tracks — graded but reported separately, not gated against the senior bar.
export const FOUNDATIONS = new Set(["math", "base-cs", "algorithms"]);

export type LessonClass = "teaching" | "auxiliary";

/** Auxiliary = navigation/exercise entries that legitimately score low and must not
 *  count toward a unit's teaching depth: project, drill, quiz-*, 00-start-here overviews. */
export function classifyLesson(lessonKey: string): LessonClass {
  const slug = lessonKey.split("/").pop() ?? "";
  if (slug === "project" || slug === "drill" || slug.startsWith("quiz-")) return "auxiliary";
  if (lessonKey.includes("/00-start-here/")) return "auxiliary";
  return "teaching";
}

export function trackOf(unitKey: string): string {
  return unitKey.split("/")[0];
}

export function isFoundation(unitKey: string): boolean {
  return FOUNDATIONS.has(trackOf(unitKey));
}
