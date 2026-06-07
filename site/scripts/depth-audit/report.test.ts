import { describe, it, expect } from "vitest";
import { buildReport } from "./report";
import { aggregateUnit } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const unit = (key: string, o: number): UnitGradeResult => ({
  unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01`, scores: mk(o), justification: "j" }],
});

describe("buildReport", () => {
  it("emits json with the bar and units sorted worst-first in the markdown", () => {
    const scores = [aggregateUnit(unit("t/deep", 4)), aggregateUnit(unit("t/thin", 1))];
    const { json, markdown } = buildReport(scores, { bar: 3, f1: 1 } as any);
    expect(json.bar).toBe(3);
    expect(json.units).toHaveLength(2);
    expect(json.summary.failing).toBe(1);
    // worst unit appears before the deep one
    expect(markdown.indexOf("t/thin")).toBeLessThan(markdown.indexOf("t/deep"));
    expect(markdown).toContain("FAIL");
  });
});
