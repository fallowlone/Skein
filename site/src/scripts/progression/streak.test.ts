import { describe, it, expect } from "vitest";
import { updateStreak } from "./streak";

const s0 = { lastActiveDay: "", count: 0, best: 0 };
describe("streak", () => {
  it("starts a streak", () => { expect(updateStreak(s0, "2026-05-29")).toEqual({ lastActiveDay: "2026-05-29", count: 1, best: 1 }); });
  it("increments on the next day", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 3, best: 3 }, "2026-05-30")).toEqual({ lastActiveDay: "2026-05-30", count: 4, best: 4 });
  });
  it("is a no-op on the same day", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 3, best: 5 }, "2026-05-29")).toEqual({ lastActiveDay: "2026-05-29", count: 3, best: 5 });
  });
  it("resets after a gap but keeps best", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 9, best: 9 }, "2026-06-02")).toEqual({ lastActiveDay: "2026-06-02", count: 1, best: 9 });
  });
});
