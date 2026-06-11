// site/src/scripts/path/schedule.test.ts
import { describe, it, expect } from "vitest";
import { studyDays, availableMinutes, feasibility, schedulePlan } from "./schedule";
import type { PathStep, DeadlineConfig } from "./types";
import { tierEffort } from "./tier-effort";

// 2026-06-08 is a Monday (UTC). Use UTC (tzOffsetMin 0) for predictable civil days.
const MON_2026_06_08 = Date.UTC(2026, 5, 8);
const DAY = 86_400_000;

const cfg = (over: Partial<DeadlineConfig> = {}): DeadlineConfig => ({
  targetDateMs: MON_2026_06_08 + 6 * DAY,            // Sunday; Mon..Fri 2h → 600 min budget
  perWeekdayHours: [2, 2, 2, 2, 2, 0, 0],            // Mon..Fri 2h, weekend off
  tzOffsetMin: 0,
  ...over,
});

const step = (unit: string, estMin: number): PathStep =>
  ({ unit, track: "networking", unlocks: [], reason: "", kind: "learn", estMin });

describe("schedule", () => {
  it("studyDays enumerates days with hours, deadline day inclusive", () => {
    const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0);
    // Mon..Fri + the deadline Monday itself; weekend skipped
    expect(days.map((d) => d.date)).toEqual(
      ["2026-06-08","2026-06-09","2026-06-10","2026-06-11","2026-06-12","2026-06-15"]);
    expect(days[0].minutes).toBe(120);
  });

  it("blackoutDates remove a day", () => {
    const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 3 * DAY, [2,2,2,2,2,0,0], ["2026-06-09"], 0);
    expect(days.map((d) => d.date)).toEqual(["2026-06-08","2026-06-10","2026-06-11"]); // Thu (deadline) included
  });

  it("availableMinutes sums the window including the deadline day", () => {
    expect(availableMinutes(studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0))).toBe(720);
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

  it("schedulePlan splits a step across days instead of wasting day tails", () => {
    const path = { steps: [step("a", 90), step("b", 90), step("c", 90)] };
    const s = schedulePlan(path, cfg(), MON_2026_06_08);
    // 120-min days: day0 = a(90)+b(30), day1 = b(60)+c(60), day2 = c(30)
    expect(s.days[0].steps.map((x) => x.unit)).toEqual(["a", "b"]);
    expect(s.days[1].steps.map((x) => x.unit)).toEqual(["b", "c"]);
    expect(s.days[2].steps.map((x) => x.unit)).toEqual(["c"]);
    expect(s.feasibility.verdict).not.toBe("over"); // 270 required, 600 available
    expect(s.countdownDays).toBe(6);
  });

  it("a step larger than any single day is split, not dropped (the false-over bug)", () => {
    // 200-min step, 120-min days: occupies day0 (120) + day1 (80). Used to fall off entirely.
    const s = schedulePlan({ steps: [step("big", 200)] }, cfg(), MON_2026_06_08);
    expect(s.feasibility.verdict).not.toBe("over");
    expect(s.days[0].steps.map((x) => x.unit)).toEqual(["big"]);
    expect(s.days[1].steps.map((x) => x.unit)).toEqual(["big"]);
    expect(s.feasibility.dropped).toEqual([]);
  });

  it("over verdict reports the honest total deficit and drops only the true overflow", () => {
    // 6 × 120 = 720 required > 600 available → exactly the last unit fails to place.
    const path = { steps: Array.from({ length: 6 }, (_, i) => step(`u${i}`, 120)) };
    const s = schedulePlan(path, cfg(), MON_2026_06_08);
    expect(s.feasibility.verdict).toBe("over");
    expect(s.feasibility.deltaMin).toBe(120);          // required − available, not sum-of-dropped
    expect(s.feasibility.dropped).toEqual(["u5"]);
  });
});

describe("schedulePlan — tier scales required minutes", () => {
  it("tier scales the verdict: junior under, middle fits, senior over on the same path", () => {
    // budget 600; 5 × 100 → junior 325 (600 > 325*1.25 → under), middle 500 (fits), senior 625 (over)
    const path = { steps: Array.from({ length: 5 }, (_, i) => step(`u${i}`, 100)) };
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "junior").feasibility.verdict).toBe("under");
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "middle").feasibility.verdict).toBe("fits");
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "senior").feasibility.verdict).toBe("over");
    expect(tierEffort("senior")).toBe(1.25); // anchors the arithmetic above
  });

  it("defaults to middle (1.0) when tier omitted — back-compat with existing callers", () => {
    const path = { steps: [step("a", 120)] };
    const def = schedulePlan(path, cfg(), MON_2026_06_08);
    const mid = schedulePlan(path, cfg(), MON_2026_06_08, "middle");
    expect(def.feasibility).toEqual(mid.feasibility);
  });

});
