import { describe, it, expect } from "vitest";
import { normalizeRanks, goalWeightFactor } from "./goal-rank";

describe("normalizeRanks", () => {
  it("collapses arbitrary priority numbers to consecutive ranks 1..N by ascending priority", () => {
    const r = normalizeRanks([{ id: "a", priority: 7 }, { id: "b", priority: 2 }]);
    expect(r).toEqual([{ id: "b", rank: 1 }, { id: "a", rank: 2 }]);
  });
  it("breaks ties by id for determinism", () => {
    const r = normalizeRanks([{ id: "z", priority: 1 }, { id: "a", priority: 1 }]);
    expect(r).toEqual([{ id: "a", rank: 1 }, { id: "z", rank: 2 }]);
  });
});

describe("goalWeightFactor", () => {
  it("rank 1 dominates: factor = N for rank 1, 1 for rank N", () => {
    expect(goalWeightFactor(1, 3)).toBe(3);
    expect(goalWeightFactor(3, 3)).toBe(1);
  });
  it("single goal → factor 1", () => {
    expect(goalWeightFactor(1, 1)).toBe(1);
  });
  it("never returns below 1", () => {
    expect(goalWeightFactor(5, 3)).toBe(1);
  });
});
