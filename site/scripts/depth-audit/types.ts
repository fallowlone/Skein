// scripts/depth-audit/types.ts
export type Status = "stub" | "draft" | "ready";
export type Level = "zero" | "junior" | "middle" | "senior";

export const DIMENSIONS = [
  "mechanism",        // does it explain HOW it works, not just what
  "tradeoff",         // are competing options + when-to-pick made explicit
  "failureMode",      // does it cover how it breaks / what goes wrong
  "realNumbers",      // concrete latencies/sizes/limits, not hand-waving
  "seniorDepth",      // overall middle+/senior altitude vs documentation-shallow
  "practiceCoverage", // is there practice, and does it span apply->stretch incl. an incident-shaped task
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type DimScores = Record<Dimension, number>; // each integer 0..5

export interface LessonRef {
  lessonKey: string;          // "track/unit/slug" (path-derived)
  track: string;
  unitKey: string;            // "track/unit"
  slug: string;
  status: Status;
  level: Level | null;
  path: string;               // abs path to index.mdx
  practicePath: string | null;// abs path to practice json, or null
}

export interface UnitRef {
  unitKey: string;            // "track/unit"
  track: string;
  unit: string;               // bare unit dir name
  lessons: LessonRef[];
}

export interface LessonGrade {
  lessonKey: string;
  scores: DimScores;
  justification: string;      // one line
}

export interface UnitGradeResult {
  unitKey: string;
  grades: LessonGrade[];
  graderModel: string;
}
