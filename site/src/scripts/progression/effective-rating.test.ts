import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "~/scripts/path/types";
import { studyRating } from "./effective-rating";
import { blendRating } from "./effective-rating";
import { highWater } from "./effective-rating";
import { barRatingForGoal, hasEnoughEvidence } from "./effective-rating";
import { projectRatingDate } from "./effective-rating";
import { evidenceProgress } from "./effective-rating";

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

const DAY = 86_400_000;
const T = Date.UTC(2026, 6, 15); // deadline 2026-07-15

describe("projectRatingDate", () => {
  it("already at/above target ⇒ reached, no projected date", () => {
    const r = projectRatingDate(620, 600, T + 5 * DAY, T);
    expect(r).toEqual({ reached: true, projectedMs: null, daysAheadBehind: 0 });
  });
  it("below target, finish after deadline ⇒ positive days behind", () => {
    const finish = T + 5 * DAY;
    const r = projectRatingDate(500, 600, finish, T);
    expect(r.reached).toBe(false);
    expect(r.projectedMs).toBe(finish);
    expect(r.daysAheadBehind).toBe(5);
  });
  it("below target, finish before deadline ⇒ negative days (ahead)", () => {
    const r = projectRatingDate(500, 600, T - 3 * DAY, T);
    expect(r.daysAheadBehind).toBe(-3);
  });
  it("no projected finish ⇒ null date, zero days", () => {
    const r = projectRatingDate(500, 600, null, T);
    expect(r).toEqual({ reached: false, projectedMs: null, daysAheadBehind: 0 });
  });
});

describe("evidenceProgress", () => {
  const big = new Set(["a", "b", "c", "d", "e", "f"]);
  it("counts frontier concepts at or above tau as proven", () => {
    const e = evidenceProgress(big, K({ a: 0.9, b: 0.7, c: 0.6, d: 0.59, e: 0.2 }), 0.6, 5);
    expect(e.proven).toBe(3);     // a,b,c >= 0.6 ; d=0.59 below ; e below
    expect(e.needed).toBe(5);
    expect(e.met).toBe(false);
  });
  it("met flips true at the minEvidence threshold", () => {
    const e = evidenceProgress(big, K({ a: 0.9, b: 0.9, c: 0.9, d: 0.9, e: 0.9 }), 0.6, 5);
    expect(e.proven).toBe(5);
    expect(e.met).toBe(true);
  });
  it("hasEnoughEvidence agrees with evidenceProgress.met (gate unchanged)", () => {
    const k = K({ a: 0.9, b: 0.9, c: 0.9, d: 0.9 });
    expect(hasEnoughEvidence(big, k, 0.6, 5)).toBe(evidenceProgress(big, k, 0.6, 5).met);
    expect(hasEnoughEvidence(big, k, 0.6, 5)).toBe(false); // 4 < 5
  });
  it("counts beyond minEvidence (proven is not capped at needed)", () => {
    const e = evidenceProgress(big, K({ a: 0.9, b: 0.9, c: 0.9, d: 0.9, e: 0.9, f: 0.9 }), 0.6, 5);
    expect(e.proven).toBe(6);
    expect(e.needed).toBe(5);
    expect(e.met).toBe(true);
  });
  it("empty frontier proves nothing", () => {
    const e = evidenceProgress(new Set(), K({}), 0.6, 5);
    expect(e.proven).toBe(0);
    expect(e.met).toBe(false);
  });
});
