// site/src/scripts/path/schedule-budget.ts
//
// Pure helper for the deadline budget bar: hours available vs hours needed.
// NOTE on the schedule contract (see schedule.ts feasibility()): `deltaMin` is a
// POSITIVE MAGNITUDE in every verdict — slack when "fits"/"under", deficit when "over".
// The direction is carried by `verdict`, not by the sign. Branch on it here.
import type { Schedule } from "./types";

export interface Budget { availMin: number; needMin: number; deltaMin: number; pct: number; }

export function scheduleBudget(s: Schedule): Budget {
  const availMin = s.days.reduce((a, d) => a + (d.minutes || 0), 0);
  const delta = s.feasibility.deltaMin; // >= 0 magnitude
  const over = s.feasibility.verdict === "over";
  const needMin = over ? availMin + delta : Math.max(0, availMin - delta);
  const pct = needMin === 0 ? 100 : Math.min(100, Math.round((availMin / needMin) * 100));
  return { availMin, needMin, deltaMin: delta, pct };
}
