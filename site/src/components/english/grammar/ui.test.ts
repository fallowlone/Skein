import { describe, it, expect } from "vitest";
import type { CardState } from "~/english/scheduler/types";
import type { BandCoverage } from "~/english/grammar-coverage";
import { masteryView, cefrRange, coverageSegments, familyHue, isLevelLocked } from "./ui";

const NOW = 1_700_000_000_000;

function card(p: Partial<CardState>): CardState {
  return {
    due: NOW,
    stability: 0,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    last_review: null,
    ...p,
  };
}

describe("masteryView", () => {
  it("treats undefined / zero-rep cards as new with strength 0", () => {
    expect(masteryView(undefined, NOW)).toEqual({ state: "new", strength: 0, dueDays: null });
    expect(masteryView(card({ reps: 0 }), NOW).state).toBe("new");
  });

  it("classifies a fresh started card as learning", () => {
    const v = masteryView(card({ reps: 1, scheduled_days: 2 }), NOW);
    expect(v.state).toBe("learning");
    expect(v.strength).toBeGreaterThan(0);
    expect(v.strength).toBeLessThan(20);
  });

  it("classifies a settled card as review", () => {
    expect(masteryView(card({ reps: 4, scheduled_days: 10 }), NOW).state).toBe("review");
  });

  it("classifies a long-interval card as mature with clamped strength", () => {
    const v = masteryView(card({ reps: 6, scheduled_days: 60 }), NOW);
    expect(v.state).toBe("mature");
    expect(v.strength).toBe(100);
  });

  it("reports days until due", () => {
    const v = masteryView(card({ reps: 2, scheduled_days: 5, due: NOW + 2 * 86_400_000 }), NOW);
    expect(v.dueDays).toBe(2);
  });
});

describe("cefrRange", () => {
  it("renders a single level verbatim", () => {
    expect(cefrRange(["B1"])).toBe("B1");
  });
  it("renders a span with an en-dash", () => {
    expect(cefrRange(["B1", "B2", "C1"])).toBe("B1–C1");
  });
});

describe("coverageSegments", () => {
  it("splits into three segments summing to ~100", () => {
    const b: BandCoverage = { cefr: "B1", total: 100, covered: 74, waived: 8, missing: new Array(18).fill("x"), pct: 82 };
    const s = coverageSegments(b);
    expect(s.covered).toBe(74);
    expect(s.waived).toBe(8);
    expect(s.notYet).toBe(18);
    expect(s.covered + s.waived + s.notYet).toBe(100);
  });
  it("is fully covered when the band is empty", () => {
    const b: BandCoverage = { cefr: "A0", total: 0, covered: 0, waived: 0, missing: [], pct: 100 };
    expect(coverageSegments(b)).toEqual({ covered: 100, notYet: 0, waived: 0 });
  });
  it("never lets the three segments exceed 100% (rounding overflow guard)", () => {
    // 67.5% + 32.5% would each round up to 68 + 33 = 101 without the clamp.
    const b: BandCoverage = { cefr: "B2", total: 200, covered: 135, waived: 65, missing: [], pct: 100 };
    const s = coverageSegments(b);
    expect(s.covered + s.notYet + s.waived).toBeLessThanOrEqual(100);
  });
});

describe("familyHue", () => {
  it("returns a domain hue for a known family", () => {
    expect(familyHue("tenses")).toBe("var(--d-backend)");
  });
  it("falls back to muted for the sentinel", () => {
    expect(familyHue("unclassified")).toBe("var(--muted)");
  });
});

describe("isLevelLocked", () => {
  it("locks C1/C2 until a B2 placement", () => {
    expect(isLevelLocked("C1", undefined)).toBe(true);
    expect(isLevelLocked("C2", "B1")).toBe(true);
    expect(isLevelLocked("C1", "B2")).toBe(false);
    expect(isLevelLocked("B2", undefined)).toBe(false);
  });
});
