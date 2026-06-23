// src/scripts/progression/calibration-freshness.ts
//
// Is the learner's ability estimate still fresh? Placement (/calibrate) sets a rating FLOOR at a
// point in time. As the learner studies, their study-derived ability (studyEma) climbs above that
// floor. When study has clearly outrun the placement — or a long time has passed with real
// movement — the placement is stale: a quick re-calibration would lift the floor and let the
// engine pick difficulty from a truer baseline. Pure (clock passed in), reused by currentReadiness.

const DAY = 86_400_000;
// A full rank division is ≈ 60–80 rating points (ranks.ts). If study has lifted the learner this far
// above their placement floor, re-measuring would likely raise the floor and recalibrate difficulty.
const STALE_GAIN = 70;
const STALE_DAYS = 60;

export interface CalibrationFreshness {
  stale: boolean;
  daysSinceCalibration: number;
  studyGain: number; // max(0, studyEma - placement): how far study has outrun the placement floor
  reason: "gain" | "age" | null;
}

export function calibrationFreshness(
  placement: number | null, // pretest.rating; null ⇒ never calibrated
  takenAt: number | null, // pretest.takenAt
  studyEma: number | undefined,
  now: number,
  opts: { staleGain?: number; staleDays?: number } = {},
): CalibrationFreshness {
  const staleGain = opts.staleGain ?? STALE_GAIN;
  const staleDays = opts.staleDays ?? STALE_DAYS;
  if (placement == null || takenAt == null) {
    return { stale: false, daysSinceCalibration: 0, studyGain: 0, reason: null };
  }
  const ema = studyEma ?? 0;
  const studyGain = Math.max(0, ema - placement);
  const daysSinceCalibration = Math.max(0, Math.floor((now - takenAt) / DAY));
  // gain path: study clearly outran placement → the floor is stale regardless of age
  if (studyGain >= staleGain) {
    return { stale: true, daysSinceCalibration, studyGain, reason: "gain" };
  }
  // age path: a lot of time has passed AND there is real study movement (never nag an idle account)
  if (daysSinceCalibration >= staleDays && studyGain > 0) {
    return { stale: true, daysSinceCalibration, studyGain, reason: "age" };
  }
  return { stale: false, daysSinceCalibration, studyGain, reason: null };
}
