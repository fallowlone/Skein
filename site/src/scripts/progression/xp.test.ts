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

describe("xpFromState path bonus param", () => {
  const base = { pretest: null, history: {}, retrieval: {}, progression: undefined } as any;
  it("adds the path bonus when provided", () => {
    expect(xpFromState(base, 0, 0, 40)).toBe(40);
  });
  it("defaults to 0 (omitted param leaves the total unchanged)", () => {
    expect(xpFromState(base, 0, 0)).toBe(xpFromState(base, 0, 0, 0));
    expect(xpFromState(base, 0, 0)).toBe(0);
  });
  it("ignores a negative bonus", () => {
    expect(xpFromState(base, 0, 0, -100)).toBe(0);
  });
});
