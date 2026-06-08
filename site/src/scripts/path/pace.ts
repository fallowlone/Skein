// src/scripts/path/pace.ts
// Pure: planned-vs-completed pace against a deadline. "Done" is inferred from the baseline
// snapshot (required minutes when the deadline was set) minus what currently remains — work
// that has left the path because its concepts became known. No clock here; `nowMs` is injected.
const DAY = 86_400_000;
const BEHIND = 0.9;       // ratio below this → behind
const AHEAD = 1.1;        // ratio above this → ahead
const DATA_FLOOR = 0.05;  // need >5% of the window elapsed before a verdict (day-0 noise guard)

export type PaceStatus = "ahead" | "on-track" | "behind" | "no-data";
export interface Pace {
  doneMin: number;
  expectedDoneMin: number;
  ratio: number;
  status: PaceStatus;
  projectedFinishMs: number | null;
  behindDays: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function pace(
  baselineMin: number, currentRequiredMin: number,
  startedAtMs: number, nowMs: number, targetMs: number,
): Pace {
  const span = targetMs - startedAtMs;
  const elapsed = nowMs - startedAtMs;
  const elapsedFrac = span > 0 ? clamp01(elapsed / span) : 0;
  const doneMin = Math.max(0, baselineMin - currentRequiredMin);
  const expectedDoneMin = baselineMin * elapsedFrac;
  const ratio = expectedDoneMin > 0 ? doneMin / expectedDoneMin : 1;

  // Projected finish from the realized rate; null until there's a non-zero rate to extrapolate.
  const rate = elapsed > 0 ? doneMin / elapsed : 0; // minutes-of-work per ms
  const projectedFinishMs = rate > 0 ? Math.round(nowMs + currentRequiredMin / rate) : null;
  const behindDays = projectedFinishMs && projectedFinishMs > targetMs
    ? Math.ceil((projectedFinishMs - targetMs) / DAY) : 0;

  let status: PaceStatus;
  if (elapsedFrac < DATA_FLOOR) status = "no-data";
  else if (ratio < BEHIND) status = "behind";
  else if (ratio > AHEAD) status = "ahead";
  else status = "on-track";

  return { doneMin, expectedDoneMin, ratio, status, projectedFinishMs, behindDays };
}
