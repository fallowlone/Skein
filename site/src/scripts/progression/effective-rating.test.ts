import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "~/scripts/path/types";
import { studyRating } from "./effective-rating";
import { blendRating } from "./effective-rating";
import { highWater } from "./effective-rating";
import { barRatingForGoal, hasEnoughEvidence } from "./effective-rating";

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

describe("highWater", () => {
  it("undefined previous peak returns the current effective", () => {
    expect(highWater(undefined, 500)).toBe(500);
  });
  it("never decreases below the previous peak", () => {
    expect(highWater(700, 500)).toBe(700); // decay must not demote the badge
  });
  it("rises when effective exceeds the peak", () => {
    expect(highWater(500, 620)).toBe(620);
  });
});

describe("barRatingForGoal", () => {
  it("senior-fullstack maps to the senior bar (600)", () => {
    expect(barRatingForGoal("senior-fullstack")).toBe(600);
  });
  it("job-ready-junior maps to the junior ceiling (450)", () => {
    expect(barRatingForGoal("job-ready-junior")).toBe(450);
  });
  it("unknown goal defaults to the senior bar (600)", () => {
    expect(barRatingForGoal("whatever")).toBe(600);
  });
});

describe("hasEnoughEvidence", () => {
  const K = (pairs: Record<string, number>): KnowledgeState =>
    new Map(Object.entries(pairs).map(([id, confidence]) => [id, { confidence, source: "activity" as const, lastAt: 0 }]));
  it("false when fewer than minEvidence concepts clear tau", () => {
    expect(hasEnoughEvidence(new Set(["a", "b", "c"]), K({ a: 0.9, b: 0.9 }), 0.6, 5)).toBe(false);
  });
  it("true when at least minEvidence concepts clear tau", () => {
    const f = new Set(["a", "b", "c", "d", "e"]);
    expect(hasEnoughEvidence(f, K({ a: 0.7, b: 0.7, c: 0.7, d: 0.7, e: 0.7 }), 0.6, 5)).toBe(true);
  });
  it("confidence below tau does not count", () => {
    const f = new Set(["a", "b", "c", "d", "e"]);
    expect(hasEnoughEvidence(f, K({ a: 0.5, b: 0.5, c: 0.5, d: 0.5, e: 0.5 }), 0.6, 5)).toBe(false);
  });
});
