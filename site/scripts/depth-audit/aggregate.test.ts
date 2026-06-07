import { describe, it, expect } from "vitest";
import { aggregateUnit, FLOOR } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (over: number): UnitGradeResult["grades"][number]["scores"] =>
  ({ mechanism: over, tradeoff: over, failureMode: over, realNumbers: over, seniorDepth: over, practiceCoverage: over });

const unit = (a: number, b: number): UnitGradeResult => ({
  unitKey: "t/u", graderModel: "m",
  grades: [
    { lessonKey: "t/u/01", scores: mk(a), justification: "" },
    { lessonKey: "t/u/02", scores: mk(b), justification: "" },
  ],
});

describe("aggregateUnit", () => {
  it("averages dimensions across lessons", () => {
    const r = aggregateUnit(unit(4, 2));
    expect(r.dimMean.seniorDepth).toBe(3);
    expect(r.overall).toBeCloseTo(3, 5);
  });
  it("fails when a single lesson is below the floor even if the mean clears the bar", () => {
    const r = aggregateUnit(unit(5, 1)); // mean 3, but lesson 2 seniorDepth=1 < FLOOR
    expect(r.minSeniorDepth).toBe(1);
    expect(r.passes(2.5)).toBe(false);
  });
  it("passes when overall clears the bar and no lesson is below the floor", () => {
    const r = aggregateUnit(unit(3, 4));
    expect(r.passes(3)).toBe(true);
  });
  it("FLOOR is 2", () => expect(FLOOR).toBe(2));
});
