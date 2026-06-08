// site/src/scripts/path/schedule.test.ts
import { describe, it, expect } from "vitest";
import { studyDays, availableMinutes, feasibility, schedulePlan } from "./schedule";
import type { PathStep, DeadlineConfig } from "./types";
import { tierEffort } from "./tier-effort";

// 2026-06-08 is a Monday (UTC). Use UTC (tzOffsetMin 0) for predictable civil days.
const MON_2026_06_08 = Date.UTC(2026, 5, 8);
const DAY = 86_400_000;

const cfg = (over: Partial<DeadlineConfig> = {}): DeadlineConfig => ({
  targetDateMs: MON_2026_06_08 + 7 * DAY,            // one week out
  perWeekdayHours: [2, 2, 2, 2, 2, 0, 0],            // Mon..Fri 2h, weekend off
  tzOffsetMin: 0,
  ...over,
});

const step = (unit: string, estMin: number): PathStep =>
  ({ unit, track: "networking", unlocks: [], reason: "", kind: "learn", estMin });

describe("schedule", () => {
  it("studyDays enumerates only days with hours, honoring weekday mask", () => {
    const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0);
    expect(days.map((d) => d.date)).toEqual(["2026-06-08","2026-06-09","2026-06-10","2026-06-11","2026-06-12"]); // Mon..Fri, weekend skipped
    expect(days[0].minutes).toBe(120);
  });

  it("blackoutDates remove a day", () => {
    const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 3 * DAY, [2,2,2,2,2,0,0], ["2026-06-09"], 0);
    expect(days.map((d) => d.date)).toEqual(["2026-06-08","2026-06-10"]);
  });

  it("availableMinutes sums the week", () => {
    expect(availableMinutes(studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0))).toBe(600);
  });

  it("feasibility = fits when budget covers required", () => {
    const f = feasibility(500, 600, []);
    expect(f.verdict).toBe("fits");
    expect(f.dropped).toEqual([]);
  });

  it("feasibility = under when budget materially exceeds required", () => {
    const f = feasibility(300, 600, []);   // 600 > 300*1.25 = 375 -> under
    expect(f.verdict).toBe("under");
    expect(f.dropped).toEqual([]);
    expect(f.deltaMin).toBe(300);
  });

  it("over-budget triage drops lowest-ROI units and reports them", () => {
    // required 800 > available 600; droppable sorted by ROI asc: drop until it fits.
    const f = feasibility(800, 600, [
      { id: "low-roi-unit", estMin: 120, roi: 0.1 },
      { id: "mid-roi-unit", estMin: 120, roi: 0.5 },
    ]);
    expect(f.verdict).toBe("over");
    expect(f.dropped).toEqual(["low-roi-unit", "mid-roi-unit"]); // both dropped, lowest ROI first
    expect(f.deltaMin).toBe(200);
  });

  it("schedulePlan packs steps into days up to each day's minutes", () => {
    const path = { steps: [step("a", 90), step("b", 90), step("c", 90)] };
    const s = schedulePlan(path, cfg(), MON_2026_06_08);
    expect(s.days[0].steps.map((x) => x.unit)).toEqual(["a"]);          // 90 <= 120, next (180) overflows
    expect(s.days[1].steps.map((x) => x.unit)).toEqual(["b"]);
    expect(s.countdownDays).toBe(7);
  });

  it("schedulePlan reports an unplaceable oversized step as over, not fits", () => {
    // a single 200-min step cannot fit any 120-min day → must surface as over + dropped, not "fits"
    const s = schedulePlan({ steps: [step("big", 200)] }, cfg(), MON_2026_06_08);
    expect(s.feasibility.verdict).toBe("over");
    expect(s.feasibility.dropped).toContain("big");
  });
});

describe("schedulePlan — tier scales required minutes", () => {
  it("junior packs more (or equal) steps than senior in the same budget", () => {
    const path = { steps: [step("a", 120), step("b", 120), step("c", 120)] };
    const jr = schedulePlan(path, cfg(), MON_2026_06_08, "junior");
    const sr = schedulePlan(path, cfg(), MON_2026_06_08, "senior");
    const placed = (s: ReturnType<typeof schedulePlan>) => s.days.reduce((n, d) => n + d.steps.length, 0);
    expect(placed(jr)).toBeGreaterThanOrEqual(placed(sr));
  });

  it("defaults to middle (1.0) when tier omitted — back-compat with existing callers", () => {
    const path = { steps: [step("a", 120)] };
    const def = schedulePlan(path, cfg(), MON_2026_06_08);
    const mid = schedulePlan(path, cfg(), MON_2026_06_08, "middle");
    expect(def.feasibility).toEqual(mid.feasibility);
  });

  it("senior depth can flip fits → over (deep-read costs 1.25x)", () => {
    // 5 days * 120 min = 600 budget; 5 steps * 100 min = 500 required at middle (fits),
    // 625 at senior (over).
    const path = { steps: Array.from({ length: 5 }, (_, i) => step(`u${i}`, 100)) };
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "middle").feasibility.verdict).not.toBe("over");
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "senior").feasibility.verdict).toBe("over");
    expect(tierEffort("senior")).toBe(1.25); // anchors the arithmetic above
  });
});
