import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "~/scripts/path/types";
import { studyRating } from "./effective-rating";

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
