import { describe, it, expect } from "vitest";
import { validateUnitGrade } from "./grade-store";

const good = {
  unitKey: "demo/01-unit",
  graderModel: "claude-sonnet-4-6",
  grades: [{
    lessonKey: "demo/01-unit/01-a",
    scores: { mechanism: 3, tradeoff: 2, failureMode: 4, realNumbers: 3, seniorDepth: 4, practiceCoverage: 2 },
    justification: "covers failure modes well",
  }],
};

describe("validateUnitGrade", () => {
  it("accepts a well-formed unit grade", () => {
    expect(validateUnitGrade(good).ok).toBe(true);
  });
  it("rejects an out-of-range score", () => {
    const bad = structuredClone(good); bad.grades[0].scores.mechanism = 9;
    expect(validateUnitGrade(bad).ok).toBe(false);
  });
  it("rejects a missing dimension", () => {
    const bad = structuredClone(good); delete (bad.grades[0].scores as any).tradeoff;
    expect(validateUnitGrade(bad).ok).toBe(false);
  });
  it("rejects junk", () => {
    expect(validateUnitGrade(null).ok).toBe(false);
    expect(validateUnitGrade({ grades: "nope" }).ok).toBe(false);
  });
});
