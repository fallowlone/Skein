// scripts/depth-audit/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { aggregateUnit } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const lesson = (key: string, o: number) => ({ lessonKey: key, scores: mk(o), justification: "" });

describe("aggregateUnit (teaching-only)", () => {
  it("averages teaching lessons and ignores auxiliary entries", () => {
    const u: UnitGradeResult = {
      unitKey: "t/u", graderModel: "m",
      grades: [
        lesson("t/u/01-real", 4),
        lesson("t/u/02-real", 2),
        lesson("t/u/project", 0),     // auxiliary — excluded
        lesson("t/u/quiz-choice", 0), // auxiliary — excluded
      ],
    };
    const r = aggregateUnit(u);
    expect(r.teachingCount).toBe(2);
    expect(r.auxiliaryCount).toBe(2);
    expect(r.dimMean.seniorDepth).toBe(3); // (4+2)/2, auxiliary 0s ignored
    expect(r.overall).toBeCloseTo(3, 5);
    expect(r.scored).toBe(true);
  });

  it("passes iff teaching overall >= bar (no per-lesson floor)", () => {
    const u: UnitGradeResult = {
      unitKey: "t/u", graderModel: "m",
      grades: [lesson("t/u/01-junior-intro", 2), lesson("t/u/06-senior", 5)], // mean 3.5
    };
    const r = aggregateUnit(u);
    expect(r.overall).toBeCloseTo(3.5, 5);
    expect(r.passes(3.5)).toBe(true);   // a low junior-tier lesson does NOT fail the unit
    expect(r.passes(3.6)).toBe(false);
  });

  it("marks a unit with no teaching lessons as scored:false and not passing", () => {
    const u: UnitGradeResult = {
      unitKey: "t/u", graderModel: "m",
      grades: [lesson("t/u/project", 3), lesson("t/u/quiz-short", 4)],
    };
    const r = aggregateUnit(u);
    expect(r.scored).toBe(false);
    expect(r.teachingCount).toBe(0);
    expect(r.passes(0)).toBe(false);
  });
});
