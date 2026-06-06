import { describe, it, expect } from "vitest";
import { completedStepCount, pathStepBonusXp, PATH_STEP_BONUS } from "./path-xp";
import type { KnowledgeState, UnitConcepts, ConceptMastery } from "~/scripts/path/types";

const known = (ids: string[]): KnowledgeState =>
  new Map(ids.map((id) => [id, { confidence: 1, source: "declared", lastAt: 0 } as ConceptMastery]));

const U = (unit: string, teaches: string[]): UnitConcepts =>
  ({ unit, track: "networking" as UnitConcepts["track"], teaches, requires: [], estMin: 10 });

const UNITS = [U("a/01", ["x", "y"]), U("a/02", ["z"]), U("a/03", [])];

describe("path-xp", () => {
  it("counts a unit whose every taught concept is known", () => {
    expect(completedStepCount(known(["x", "y"]), UNITS, 0.6)).toBe(1);
  });
  it("does not count a partially-known unit", () => {
    expect(completedStepCount(known(["x"]), UNITS, 0.6)).toBe(0);
  });
  it("never counts a unit that teaches nothing", () => {
    expect(completedStepCount(known(["x", "y", "z"]), UNITS, 0.6)).toBe(2); // a/01 + a/02, not a/03
  });
  it("respects the threshold", () => {
    const weak: KnowledgeState = new Map([["z", { confidence: 0.4, source: "activity", lastAt: 0 }]]);
    expect(completedStepCount(weak, [U("a/02", ["z"])], 0.6)).toBe(0);
    expect(completedStepCount(weak, [U("a/02", ["z"])], 0.3)).toBe(1);
  });
  it("pathStepBonusXp = count * PATH_STEP_BONUS", () => {
    expect(pathStepBonusXp(known(["x", "y", "z"]), UNITS, 0.6)).toBe(2 * PATH_STEP_BONUS);
    expect(PATH_STEP_BONUS).toBe(20);
  });
});
