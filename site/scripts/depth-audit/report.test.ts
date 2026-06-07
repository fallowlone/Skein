// scripts/depth-audit/report.test.ts
import { describe, it, expect } from "vitest";
import { buildReport } from "./report";
import { aggregateUnit } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const unit = (key: string, o: number): UnitGradeResult =>
  ({ unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01-x`, scores: mk(o), justification: "j" }] });

describe("buildReport", () => {
  it("splits spine from foundations and gates spine on the absolute bar", () => {
    const scores = [
      aggregateUnit(unit("networking/03-deep", 4)),
      aggregateUnit(unit("apis/01-thin", 3)),
      aggregateUnit(unit("math/01-numbers", 2)), // foundation — not gated
    ];
    const { json, markdown } = buildReport(scores, 3.5);
    expect(json.bar).toBe(3.5);
    expect(json.scale).toBe("absolute");
    expect(json.summary.spineTotal).toBe(2);
    expect(json.summary.spineFailing).toBe(1); // apis 3.0 < 3.5
    expect(json.summary.foundationsCount).toBe(1);
    expect(json.foundations[0].unitKey).toBe("math/01-numbers");
    // spine markdown lists the failing unit and flags FAIL; foundations are in their own section
    expect(markdown).toContain("## Spine");
    expect(markdown).toContain("## Foundations");
    expect(markdown).toContain("FAIL");
  });
});
