// scripts/depth-audit/aggregate.ts
import { DIMENSIONS, type DimScores, type UnitGradeResult } from "./types";
import { weightedOverall } from "./rubric";
import { classifyLesson } from "./classify";

export interface UnitScore {
  unitKey: string;
  scored: boolean;             // false when the unit has no teaching lessons
  teachingCount: number;
  auxiliaryCount: number;
  dimMean: DimScores;          // mean over teaching lessons (all-zero when scored:false)
  overall: number;             // teaching-only weighted mean, 0..5 (0 when scored:false)
  worstTeachingLesson: string | null;
  passes: (bar: number) => boolean;
}

export function aggregateUnit(u: UnitGradeResult): UnitScore {
  const teaching = u.grades.filter((g) => classifyLesson(g.lessonKey) === "teaching");
  const auxiliaryCount = u.grades.length - teaching.length;

  if (teaching.length === 0) {
    const zero = Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as DimScores;
    return {
      unitKey: u.unitKey, scored: false, teachingCount: 0, auxiliaryCount,
      dimMean: zero, overall: 0, worstTeachingLesson: null, passes: () => false,
    };
  }

  const n = teaching.length;
  const dimMean = Object.fromEntries(
    DIMENSIONS.map((d) => [d, teaching.reduce((s, g) => s + g.scores[d], 0) / n]),
  ) as DimScores;
  const overall = weightedOverall(dimMean);
  const worstTeachingLesson = [...teaching]
    .sort((a, b) => weightedOverall(a.scores) - weightedOverall(b.scores))[0].lessonKey;

  return {
    unitKey: u.unitKey, scored: true, teachingCount: n, auxiliaryCount,
    dimMean, overall, worstTeachingLesson,
    passes: (bar: number) => overall >= bar,
  };
}

export function aggregateAll(units: UnitGradeResult[]): UnitScore[] {
  return units.map(aggregateUnit).sort((a, b) => a.overall - b.overall);
}
