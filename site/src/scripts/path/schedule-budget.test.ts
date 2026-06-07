import { describe, it, expect } from "vitest";
import { scheduleBudget } from "./schedule-budget";
import type { Schedule } from "./types";

// deltaMin is a positive magnitude in every verdict (see schedule.ts feasibility()).
function sched(minsPerDay: number[], verdict: "fits" | "over" | "under", deltaMin: number): Schedule {
  return {
    days: minsPerDay.map((m, i) => ({ date: `2026-07-0${i + 1}`, minutes: m, steps: [] })),
    feasibility: { verdict, deltaMin, dropped: [] },
    countdownDays: minsPerDay.length,
  };
}

describe("scheduleBudget", () => {
  it("under: need = avail - slack, fully covered", () => {
    const b = scheduleBudget(sched([60, 60, 60], "under", 60)); // avail 180, slack 60
    expect(b.availMin).toBe(180);
    expect(b.needMin).toBe(120);
    expect(b.deltaMin).toBe(60);
    expect(b.pct).toBe(100);
  });
  it("over: need = avail + deficit, pct < 100", () => {
    const b = scheduleBudget(sched([60, 60], "over", 120)); // avail 120, deficit 120 → need 240
    expect(b.availMin).toBe(120);
    expect(b.needMin).toBe(240);
    expect(b.pct).toBe(50);
  });
  it("fits with zero slack: need == avail, full", () => {
    const b = scheduleBudget(sched([60], "fits", 0));
    expect(b.needMin).toBe(60);
    expect(b.pct).toBe(100);
  });
  it("zero need is safe (no division by zero)", () => {
    const b = scheduleBudget(sched([0], "fits", 0));
    expect(b.needMin).toBe(0);
    expect(b.pct).toBe(100);
  });
});
