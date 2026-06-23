import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "~/scripts/path/types";
import { studyRating } from "./effective-rating";
import { blendRating } from "./effective-rating";

// Build a KnowledgeState from { conceptId: confidence } pairs.
const K = (pairs: Record<string, number>): KnowledgeState =>
  new Map(Object.entries(pairs).map(([id, confidence]) => [id, { confidence, source: "activity" as const, lastAt: 0 }]));

describe("studyRating", () => {
  it("full coverage of the frontier reaches the bar rating", () => {
    const frontier = new Set(["a", "b"]);
    expect(studyRating(frontier, K({ a: 1, b: 1 }), 600)).toBe(600);
  });
  it("half coverage is half the bar (rounded), missing concepts count as 0", () => {
    const frontier = new Set(["a", "b"]);
    expect(studyRating(frontier, K({ a: 1 }), 600)).toBe(300); // b missing ⇒ 0
  });
  it("empty frontier returns the floor (default 0)", () => {
    expect(studyRating(new Set(), K({}), 600)).toBe(0);
  });
  it("clamps per-concept confidence to [0,1]", () => {
    const frontier = new Set(["a"]);
    expect(studyRating(frontier, K({ a: 5 }), 600)).toBe(600); // clamped to 1
  });
});

describe("blendRating", () => {
  it("first sample: ema equals the raw study rating", () => {
    expect(blendRating(0, undefined, 200).ema).toBe(200);
  });
  it("placement is a floor: effective is never below placement", () => {
    expect(blendRating(500, undefined, 200).effective).toBe(500);
  });
  it("study above placement raises effective to the ema", () => {
    expect(blendRating(100, undefined, 300).effective).toBe(300);
  });
  it("ema smooths a single session (alpha 0.3)", () => {
    // 0.3*200 + 0.7*100 = 130
    expect(blendRating(0, 100, 200).ema).toBe(130);
  });
});
