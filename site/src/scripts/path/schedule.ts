// site/src/scripts/path/schedule.ts
import type { Path, DeadlineConfig, Feasibility, DayPlan, Schedule, Tier } from "./types";
import { tierEffort } from "./tier-effort";

const DAY = 86_400_000;
const UNDER_RATIO = 1.25; // >25% spare budget => "under" (room for more), else "fits"

// Civil date from an epoch-day count (Howard Hinnant's algorithm), returns "YYYY-MM-DD".
function civilFromDays(z: number): string {
  z += 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const yy = m <= 2 ? y + 1 : y;
  return `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Mon=0 … Sun=6. Epoch day 0 (1970-01-01) was a Thursday → +3.
const weekdayMon0 = (epochDay: number): number => ((epochDay % 7) + 3 + 7) % 7;

export function studyDays(
  nowMs: number, targetMs: number, perWeekdayHours: number[], blackouts: string[], tzOffsetMin: number,
): { date: string; minutes: number }[] {
  const off = tzOffsetMin * 60_000;
  const startDay = Math.floor((nowMs + off) / DAY);
  const endDay = Math.floor((targetMs + off) / DAY);
  const black = new Set(blackouts);
  const out: { date: string; minutes: number }[] = [];
  for (let d = startDay; d < endDay; d++) {
    const date = civilFromDays(d);
    if (black.has(date)) continue;
    const hours = perWeekdayHours[weekdayMon0(d)] ?? 0;
    if (hours > 0) out.push({ date, minutes: Math.round(hours * 60) });
  }
  return out;
}

export const availableMinutes = (days: { minutes: number }[]): number =>
  days.reduce((n, d) => n + d.minutes, 0);

// Over-budget triage: drop lowest-ROI droppables until required fits the budget.
export function feasibility(
  requiredMin: number, availableMin: number, droppable: { id: string; estMin: number; roi: number }[],
): Feasibility {
  if (requiredMin <= availableMin) {
    // "under" only when there is budget for materially more than required (>= UNDER_RATIO slack),
    // so the UI can offer added depth/breadth; otherwise it simply "fits".
    const under = requiredMin > 0 && availableMin > requiredMin * UNDER_RATIO;
    return { verdict: under ? "under" : "fits", deltaMin: availableMin - requiredMin, dropped: [] };
  }
  const sorted = [...droppable].sort((a, b) => a.roi - b.roi || a.id.localeCompare(b.id));
  const dropped: string[] = [];
  let remaining = requiredMin;
  for (const u of sorted) {
    if (remaining <= availableMin) break;
    dropped.push(u.id);
    remaining -= u.estMin;
  }
  return { verdict: "over", deltaMin: requiredMin - availableMin, dropped };
}

export function schedulePlan(path: Path, cfg: DeadlineConfig, nowMs: number, tier: Tier = "middle"): Schedule {
  const effort = tierEffort(tier);
  const scale = (m: number) => Math.round(m * effort);

  const days = studyDays(nowMs, cfg.targetDateMs, cfg.perWeekdayHours, cfg.blackoutDates ?? [], cfg.tzOffsetMin);
  const plan: DayPlan[] = days.map((d) => ({ date: d.date, minutes: d.minutes, steps: [] }));
  const required = path.steps.reduce((n, s) => n + scale(s.estMin), 0);
  const available = availableMinutes(days);

  // Place steps in path order, splitting a step across as many days as it needs — a unit's
  // scaled cost routinely exceeds a single day's budget (median unit 75 min, p90 295 min vs a
  // 1–2 h day). A step appears in every day it occupies; budgeting uses the scaled cost while
  // the step keeps its canonical estMin for display. Splitting wastes nothing, so a step is
  // unplaced iff the total budget is exhausted.
  let di = 0, used = 0;
  const placed = new Set<string>();
  outer: for (const step of path.steps) {
    let left = scale(step.estMin);
    while (left > 0) {
      while (di < plan.length && used >= plan[di].minutes) { di++; used = 0; }
      if (di >= plan.length) break outer;
      plan[di].steps.push(step);
      const take = Math.min(plan[di].minutes - used, left);
      used += take;
      left -= take;
    }
    placed.add(step.unit);
  }
  // roi here is a cost-only placeholder (1/cost): with no per-step value field yet, longer
  // steps are dropped first. Replace with value/cost once steps carry a learning-value weight.
  const dropUnits = path.steps.filter((s) => !placed.has(s.unit))
    .map((s) => ({ id: s.unit, estMin: scale(s.estMin), roi: 1 / Math.max(1, scale(s.estMin)) }));
  const feas: Feasibility = feasibility(required, available, dropUnits);

  const countdownDays = Math.max(0, Math.ceil((cfg.targetDateMs - nowMs) / DAY));
  return { days: plan, feasibility: feas, countdownDays };
}
