import { describe, it, expect } from "vitest";
import { isDue, comparisonTarget, type MonologueMeta } from "./monologue";

const m = (at: number): MonologueMeta => ({ id: String(at), at, durationSec: 180 });
const DAY = 86_400_000;

describe("monologue checkpoint", () => {
  it("isDue: true only when no recording in the last 28 days (monthly cadence)", () => {
    expect(isDue([], 100 * DAY)).toBe(true);          // never recorded → due
    expect(isDue([m(70 * DAY)], 100 * DAY)).toBe(true);  // 30 days ago → due
    expect(isDue([m(80 * DAY)], 100 * DAY)).toBe(false); // 20 days ago → not yet
    expect(isDue([m(90 * DAY)], 100 * DAY)).toBe(false); // 10 days ago → not yet
  });
  it("comparisonTarget: the newest recording at least ~90 days older than the latest", () => {
    const list = [m(10 * DAY), m(50 * DAY), m(150 * DAY)];
    expect(comparisonTarget(list)?.at).toBe(50 * DAY);
    expect(comparisonTarget([m(150 * DAY)])).toBeNull();
  });
});
