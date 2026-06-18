// src/scripts/path/pace.ts
// Pure: planned-vs-completed pace against a deadline, measured in PLANNED STUDY MINUTES, not
// wall-clock — a weekends-only learner must not drift "behind" every weekday. "Done" is inferred
// from the baseline snapshot (required minutes when the deadline was set) minus what currently
// remains. No clock here; all calendar math is injected by the caller (path-io currentPace).
const DAY = 86_400_000;
const BEHIND = 0.9;       // ratio below this → behind
const AHEAD = 1.1;        // ratio above this → ahead
const DATA_FLOOR = 0.05;  // need >5% of planned minutes elapsed before a verdict (day-0 noise guard)

export type PaceStatus = "ahead" | "on-track" | "behind" | "no-data";
export interface Pace {
  doneMin: number;
  expectedDoneMin: number;
  ratio: number;
  status: PaceStatus;
  projectedFinishMs: number | null;
  behindDays: number;
  /** True when the projected finish was pinned to the last horizon day because the realized
   *  rate is too low to cover the remaining work within the supplied future-day calendar.
   *  When true, the projected finish is optimistic — the real finish may be later. */
  clamped: boolean;
}

export interface PaceInputs {
  baselineMin: number;        // scaled required minutes when the deadline was activated
  currentRequiredMin: number; // scaled required minutes remaining now
  elapsedAvailMin: number;    // planned study minutes from activation to now
  totalAvailMin: number;      // planned study minutes from activation to the target date
  futureDays: { date: string; minutes: number }[]; // study days from now to an extended horizon
  targetMs: number;
  nowMs: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function pace(inp: PaceInputs): Pace {
  const { baselineMin, currentRequiredMin, elapsedAvailMin, totalAvailMin, futureDays, targetMs, nowMs } = inp;
  const elapsedFrac = totalAvailMin > 0 ? clamp01(elapsedAvailMin / totalAvailMin) : 0;
  const doneMin = Math.max(0, baselineMin - currentRequiredMin);
  const expectedDoneMin = baselineMin * elapsedFrac;
  const ratio = expectedDoneMin > 0 ? doneMin / expectedDoneMin : 1;

  // Projected finish: realized productivity per PLANNED study minute, walked over the future
  // study-day calendar. Clamps to the supplied horizon's last day when the rate is too low to
  // cover the remaining work inside it; null until there's a non-zero rate to extrapolate.
  const rate = elapsedAvailMin > 0 ? doneMin / elapsedAvailMin : 0;
  let projectedFinishMs: number | null = null;
  let clamped = false;
  if (currentRequiredMin === 0) {
    projectedFinishMs = nowMs;
  } else if (rate > 0 && futureDays.length) {
    let needAvail = currentRequiredMin / rate;
    for (const d of futureDays) {
      needAvail -= d.minutes;
      if (needAvail <= 0) { projectedFinishMs = Date.parse(`${d.date}T00:00:00Z`); break; }
    }
    if (projectedFinishMs === null) {
      // Rate is too low to finish within the supplied horizon; pin to the last day and flag it.
      projectedFinishMs = Date.parse(`${futureDays[futureDays.length - 1].date}T00:00:00Z`);
      clamped = true;
    }
  }
  const behindDays = projectedFinishMs !== null && projectedFinishMs > targetMs
    ? Math.ceil((projectedFinishMs - targetMs) / DAY) : 0;

  let status: PaceStatus;
  if (elapsedFrac < DATA_FLOOR) status = "no-data";
  else if (ratio < BEHIND) status = "behind";
  else if (ratio > AHEAD) status = "ahead";
  else status = "on-track";

  return { doneMin, expectedDoneMin, ratio, status, projectedFinishMs, behindDays, clamped };
}
