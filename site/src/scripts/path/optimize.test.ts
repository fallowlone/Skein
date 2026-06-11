// src/scripts/path/optimize.test.ts
import { describe, it, expect } from "vitest";
import { suggestFixes, bestCombo, type LeverInputs } from "./optimize";

const base: LeverInputs = {
  deficitMin: 300,
  raiseHours: [{ hours: 0.5, deltaMin: 150 }, { hours: 1, deltaMin: 300 }],
  extendDate: [{ days: 7, deltaMin: 120 }, { days: 14, deltaMin: 240 }],
  lowerDepth: { tier: "junior", deltaMin: 200 },
  dropGoal: { goalId: "backend-job", label: "Backend job", deltaMin: 400 },
  excludeTrack: { track: "queues", deltaMin: 90 },
  behind: false,
};

describe("suggestFixes", () => {
  it("flags closesGap when a single lever's delta covers the deficit", () => {
    const fixes = suggestFixes(base);
    const oneHour = fixes.find((f) => f.kind === "raise-hours" && (f.patch as any).hours === 1)!;
    expect(oneHour.closesGap).toBe(true); // 300 >= 300
    const halfHour = fixes.find((f) => f.kind === "raise-hours" && (f.patch as any).hours === 0.5)!;
    expect(halfHour.closesGap).toBe(false); // 150 < 300
  });

  it("orders least-disruptive first (raise-hours before drop-goal)", () => {
    const fixes = suggestFixes(base);
    const firstRaise = fixes.findIndex((f) => f.kind === "raise-hours");
    const firstDrop = fixes.findIndex((f) => f.kind === "drop-goal");
    expect(firstRaise).toBeLessThan(firstDrop);
  });

  it("returns [] when there is no deficit and not behind", () => {
    expect(suggestFixes({ ...base, deficitMin: 0, behind: false })).toEqual([]);
  });

  it("still surfaces catch-up levers when behind even if the budget fits", () => {
    const fixes = suggestFixes({ ...base, deficitMin: 0, behind: true });
    expect(fixes.some((f) => f.kind === "raise-hours")).toBe(true);
    expect(fixes.some((f) => f.kind === "drop-goal")).toBe(false); // scope cuts not offered when only behind
  });
});

describe("bestCombo", () => {
  it("returns the minimal in-order prefix whose summed delta covers the deficit", () => {
    const fixes = suggestFixes(base);
    const combo = bestCombo(fixes, 300);
    const sum = combo.reduce((n, f) => n + f.deltaMin, 0);
    expect(sum).toBeGreaterThanOrEqual(300);
    const shorter = combo.slice(0, -1).reduce((n, f) => n + f.deltaMin, 0);
    expect(shorter).toBeLessThan(300);
  });

  it("bestCombo takes one lever per kind — hour variants are alternatives, not additive", () => {
    const fixes = suggestFixes({
      deficitMin: 1000,
      raiseHours: [{ hours: 0.5, deltaMin: 300 }, { hours: 1, deltaMin: 600 }],
      extendDate: [{ days: 7, deltaMin: 300 }],
      behind: false,
    });
    const combo = bestCombo(fixes, 1000);
    expect(combo.filter((f) => f.kind === "raise-hours")).toHaveLength(1);
    expect(combo.find((f) => f.kind === "raise-hours")!.deltaMin).toBe(600); // strongest variant
    expect(combo.find((f) => f.kind === "extend-date")!.deltaMin).toBe(300);
  });
});
