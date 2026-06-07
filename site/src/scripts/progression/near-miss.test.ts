import { describe, it, expect } from "vitest";
import { nearMiss } from "./near-miss";
import type { AchievementCtx } from "./types";

const ctx0: AchievementCtx = { drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false, hourOfDay: 12, seniorAnswers: 0, pillarsVisited: 0, englishKnown: 0, englishBand: "none", englishReadUnits: 0, englishGraded: false, englishGrammarDone: 0, englishCollocationDone: 0 };
const state = { history: {}, retrieval: {}, progression: { streak: { best: 24, count: 0, lastActiveDay: "" } } } as any;

describe("nearMiss", () => {
  it("returns locked numeric marks closest to their target, < 100%, top 3", () => {
    const ctx = { ...ctx0, drillsSolved: 20, pillarsVisited: 4 };
    const r = nearMiss(state, ctx, new Set());
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(3);
    expect(r.every((m) => m.pct < 100 && m.target > 0)).toBe(true);
    expect(r.every((m) => m.current <= m.target)).toBe(true);
    expect(r.some((m) => m.id === "streak-30")).toBe(true); // best 24/30 = 80%
  });
  it("excludes already-earned marks", () => {
    const ctx = { ...ctx0, drillsSolved: 20 };
    const r = nearMiss(state, ctx, new Set(["streak-30", "drill-sergeant"]));
    expect(r.some((m) => m.id === "streak-30" || m.id === "drill-sergeant")).toBe(false);
  });
  it("returns nothing on a fresh account with no progress", () => {
    expect(nearMiss({ history: {}, retrieval: {}, progression: { streak: { best: 0 } } } as any, ctx0, new Set())).toEqual([]);
  });
});
