import { DIMENSIONS, type DimScores, type UnitGradeResult } from "./types";
import { weightedOverall } from "./rubric";

export const FLOOR = 2;

export interface UnitScore {
  unitKey: string;
  lessonCount: number;
  dimMean: DimScores;
  overall: number;            // weighted, 0..5
  minSeniorDepth: number;
  minFailureMode: number;
  worstLesson: string;        // lessonKey with the lowest weighted overall
  passes: (bar: number) => boolean;
}

export function aggregateUnit(u: UnitGradeResult): UnitScore {
  const n = u.grades.length;
  const dimMean = Object.fromEntries(
    DIMENSIONS.map((d) => [d, u.grades.reduce((s, g) => s + g.scores[d], 0) / n]),
  ) as DimScores;
  const overall = weightedOverall(dimMean);
  const minSeniorDepth = Math.min(...u.grades.map((g) => g.scores.seniorDepth));
  const minFailureMode = Math.min(...u.grades.map((g) => g.scores.failureMode));
  const worstLesson = [...u.grades].sort((a, b) => weightedOverall(a.scores) - weightedOverall(b.scores))[0].lessonKey;
  return {
    unitKey: u.unitKey, lessonCount: n, dimMean, overall, minSeniorDepth, minFailureMode, worstLesson,
    passes: (bar: number) => overall >= bar && minSeniorDepth >= FLOOR && minFailureMode >= FLOOR,
  };
}

export function aggregateAll(units: UnitGradeResult[]): UnitScore[] {
  return units.map(aggregateUnit).sort((a, b) => a.overall - b.overall);
}
