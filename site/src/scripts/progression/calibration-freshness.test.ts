import { describe, it, expect } from "vitest";
import { calibrationFreshness } from "./calibration-freshness";

const NOW = 1_000 * 86_400_000; // day 1000 in epoch-days
const daysAgo = (d: number) => NOW - d * 86_400_000;

describe("calibrationFreshness", () => {
  it("is not stale when there is no placement", () => {
    const f = calibrationFreshness(null, null, 500, NOW);
    expect(f.stale).toBe(false);
    expect(f.reason).toBeNull();
  });

  it("is not stale right after a fresh placement with no study gain", () => {
    const f = calibrationFreshness(400, daysAgo(1), 400, NOW);
    expect(f.stale).toBe(false);
    expect(f.studyGain).toBe(0);
  });

  it("flags stale by gain when study outran placement by a band", () => {
    const f = calibrationFreshness(400, daysAgo(10), 480, NOW); // +80 ≥ 70
    expect(f.stale).toBe(true);
    expect(f.reason).toBe("gain");
    expect(f.studyGain).toBe(80);
  });

  it("does not flag a small gain below the threshold", () => {
    const f = calibrationFreshness(400, daysAgo(10), 440, NOW); // +40 < 70
    expect(f.stale).toBe(false);
    expect(f.reason).toBeNull();
  });

  it("flags stale by age when long elapsed and there is real study movement", () => {
    const f = calibrationFreshness(400, daysAgo(90), 420, NOW); // 90d ≥ 60, gain 20 > 0
    expect(f.stale).toBe(true);
    expect(f.reason).toBe("age");
    expect(f.daysSinceCalibration).toBe(90);
  });

  it("does not nag an idle old account with zero study movement", () => {
    const f = calibrationFreshness(400, daysAgo(120), 400, NOW); // old but no gain
    expect(f.stale).toBe(false);
    expect(f.reason).toBeNull();
  });

  it("treats undefined studyEma as zero gain", () => {
    const f = calibrationFreshness(400, daysAgo(90), undefined, NOW);
    expect(f.studyGain).toBe(0);
    expect(f.stale).toBe(false);
  });

  it("honours custom thresholds", () => {
    const f = calibrationFreshness(400, daysAgo(5), 430, NOW, { staleGain: 25 });
    expect(f.stale).toBe(true);
    expect(f.reason).toBe("gain");
  });

  it("clamps negative gain and never reports negative days", () => {
    const f = calibrationFreshness(500, NOW + 86_400_000, 400, NOW); // takenAt in the future, ema below
    expect(f.studyGain).toBe(0);
    expect(f.daysSinceCalibration).toBe(0);
  });
});
