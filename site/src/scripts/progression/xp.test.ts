import { describe, it, expect } from "vitest";
import { xpFromState, levelFromXp } from "./xp";

const empty = { pretest: null, history: {}, retrieval: {}, progression: { achievements: {} } } as any;
const active = {
  pretest: { stage2: {} },
  history: { a: {}, b: {}, c: {} },
  retrieval: { x: {}, y: {} },
  progression: { achievements: { "first-blood": 1, "deep-diver": 2 } },
} as any;

describe("xp", () => {
  it("is zero-ish for empty and monotonic in activity", () => {
    expect(xpFromState(empty, 0)).toBeLessThan(xpFromState(active, 5));
  });
  it("counts the documented signals", () => {
    expect(xpFromState(active, 5)).toBe(150 + 30 + 30 + 50 + 40);
  });
  it("levelFromXp grows and reports progress to next", () => {
    const lo = levelFromXp(0); const hi = levelFromXp(1000);
    expect(lo.level).toBe(1); expect(hi.level).toBeGreaterThan(lo.level);
    expect(hi.toNext).toBeGreaterThan(0);
  });
});
