import { describe, it, expect } from "vitest";
import { updateStreak, type Streak } from "./streak";

const s0 = { lastActiveDay: "", count: 0, best: 0 };
describe("streak", () => {
  it("starts a streak", () => { expect(updateStreak(s0, "2026-05-29")).toEqual({ lastActiveDay: "2026-05-29", count: 1, best: 1, freezes: 0 }); });
  it("increments on the next day", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 3, best: 3 }, "2026-05-30")).toEqual({ lastActiveDay: "2026-05-30", count: 4, best: 4, freezes: 0 });
  });
  it("is a no-op on the same day", () => {
    const prev = { lastActiveDay: "2026-05-29", count: 3, best: 5 };
    expect(updateStreak(prev, "2026-05-29")).toBe(prev);
  });
  it("resets after a gap but keeps best", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 9, best: 9 }, "2026-06-02")).toEqual({ lastActiveDay: "2026-06-02", count: 1, best: 9, freezes: 0 });
  });
});

const S = (lastActiveDay: string, count: number, best = count, freezes = 0): Streak => ({ lastActiveDay, count, best, freezes });

describe("updateStreak freeze grace", () => {
  it("consecutive day increments the count", () => {
    expect(updateStreak(S("2026-06-01", 3), "2026-06-02").count).toBe(4);
  });
  it("earns a freeze every 7th day, capped at 2", () => {
    const r = updateStreak(S("2026-06-06", 6, 6, 0), "2026-06-07"); // count -> 7
    expect(r.count).toBe(7);
    expect(r.freezes).toBe(1);
    const capped = updateStreak(S("2026-06-13", 13, 13, 2), "2026-06-14"); // count -> 14, already at cap
    expect(capped.freezes).toBe(2);
  });
  it("one missed day is forgiven when a freeze is available (count holds, freeze consumed)", () => {
    const r = updateStreak(S("2026-06-01", 5, 5, 1), "2026-06-03"); // gap 2
    expect(r.count).toBe(5);
    expect(r.freezes).toBe(0);
    expect(r.lastActiveDay).toBe("2026-06-03");
  });
  it("missed day with no freeze resets the streak to 1", () => {
    expect(updateStreak(S("2026-06-01", 5, 5, 0), "2026-06-03").count).toBe(1);
  });
  it("two or more missed days always resets even with a freeze", () => {
    expect(updateStreak(S("2026-06-01", 5, 5, 2), "2026-06-05").count).toBe(1); // gap 4
  });
  it("same day is a no-op", () => {
    const prev = S("2026-06-01", 5, 5, 1);
    expect(updateStreak(prev, "2026-06-01")).toBe(prev);
  });
});
