// Pure targeting policy: which teaching spine lessons should get which scenario type.
import { isFoundation } from "../depth-audit/classify";

export type ScenarioType = "incident" | "debug" | "review";

export interface LessonMeta {
  lessonKey: string;
  track: string;
  level: "zero" | "junior" | "middle" | "senior" | null;
  lessonType: "concept" | "coding" | "topic" | null;
  /** coverage set, incl. runtime markers: "sandbox-js","sandbox-sql","fix-js","fix-sql" */
  types: Set<string>;
  taskCount: number;
  atCap: boolean;
}

const hasAny = (s: Set<string>, ...keys: string[]) => keys.some((k) => s.has(k));

export function candidatesFor(type: ScenarioType, lessons: LessonMeta[]): LessonMeta[] {
  return lessons.filter((l) => {
    if (isFoundation(l.lessonKey)) return false;
    if (l.atCap) return false;
    if (l.types.has(type)) return false;
    switch (type) {
      case "incident":
        return l.level === "middle" || l.level === "senior" || l.level === null;
      case "debug":
        return l.lessonType === "coding" || hasAny(l.types, "sandbox-js", "sandbox-sql", "fix-js", "fix-sql");
      case "review":
        return l.level === "senior" || hasAny(l.types, "design", "fix", "fix-js", "fix-sql");
    }
  });
}
