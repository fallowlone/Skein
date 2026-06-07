// scripts/depth-audit/audit.test.ts
import { describe, it, expect } from "vitest";
import { runAudit, gate, barFromEnv, DEFAULT_BAR } from "./audit";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const unit = (key: string, o: number): UnitGradeResult =>
  ({ unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01-x`, scores: mk(o), justification: "j" }] });

const grades = [unit("networking/03-deep", 4), unit("apis/01-thin", 3), unit("math/01-numbers", 2)];

describe("runAudit", () => {
  it("gates spine units on the bar and lists foundations separately", () => {
    const { json } = runAudit(grades, 3.5);
    expect(json.summary.spineTotal).toBe(2);
    expect(json.summary.spineFailing).toBe(1);
    expect(json.summary.foundationsCount).toBe(1);
  });
});

describe("gate", () => {
  it("returns failing spine units among the named units, ignoring foundations", () => {
    const r = gate(grades, ["apis/01-thin", "math/01-numbers"], 3.5);
    expect(r.failing).toEqual(["apis/01-thin"]); // math is foundation → not gated
  });
  it("passes when the named spine unit clears the bar", () => {
    const r = gate(grades, ["networking/03-deep"], 3.5);
    expect(r.failing).toEqual([]);
  });
});

describe("barFromEnv", () => {
  it("defaults to DEFAULT_BAR and reads DEPTH_BAR when valid", () => {
    expect(barFromEnv({})).toBe(DEFAULT_BAR);
    expect(barFromEnv({ DEPTH_BAR: "4" })).toBe(4);
    expect(barFromEnv({ DEPTH_BAR: "junk" })).toBe(DEFAULT_BAR);
  });
});
