// scripts/depth-audit/report.test.ts
import { describe, it, expect } from "vitest";
import { buildReport } from "./report";
import { aggregateUnit } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const unit = (key: string, o: number): UnitGradeResult =>
  ({ unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01-x`, scores: mk(o), justification: "j" }] });
// a unit whose only lesson is auxiliary → no teaching content
const navUnit = (key: string): UnitGradeResult =>
  ({ unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01-overview`, scores: mk(1), justification: "j" }] });

describe("buildReport", () => {
  it("splits spine / no-teaching / foundations and gates only scored spine units", () => {
    const scores = [
      aggregateUnit(unit("networking/03-deep", 4)),
      aggregateUnit(unit("apis/01-thin", 3)),
      aggregateUnit(unit("math/01-numbers", 2)),         // foundation — not gated
      aggregateUnit(navUnit("frontend/00-start-here")),  // no teaching content
    ];
    const { json, markdown } = buildReport(scores, 3.5);
    expect(json.bar).toBe(3.5);
    expect(json.scale).toBe("absolute");
    expect(json.summary.spineTotal).toBe(2);             // deep + thin (nav excluded)
    expect(json.summary.spineFailing).toBe(1);           // apis 3.0 < 3.5; nav NOT counted
    expect(json.summary.noTeachingCount).toBe(1);
    expect(json.summary.foundationsCount).toBe(1);
    expect(json.noTeaching[0].unitKey).toBe("frontend/00-start-here");
    expect(json.foundations[0].unitKey).toBe("math/01-numbers");
    expect(markdown).toContain("## Spine");
    expect(markdown).toContain("## No teaching content");
    expect(markdown).toContain("## Foundations");
    expect(markdown).toContain("FAIL");
  });
});
