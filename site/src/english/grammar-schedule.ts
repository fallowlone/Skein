// Deadline forecast for the grammar plan. Reuses ONLY the Track-free date/budget
// primitives from the fullstack scheduler — no Path/Track coupling.
import { studyDays, availableMinutes, feasibility } from "~/scripts/path/schedule";
import type { GrammarPlan } from "./grammar-plan";
import type { GrammarGoal } from "./state";

const DAY = 86_400_000;

export type GrammarForecast = {
  verdict: "fits" | "under" | "over";
  requiredMin: number;
  availableMin: number;
  countdownDays: number;
  dropped: string[];
};

/** Minutes available to study today, from the goal's per-weekday hours (Mon=0…Sun=6). */
export function dailyBudgetMinutes(goal: GrammarGoal, now: number): number {
  const off = goal.tzOffsetMin * 60_000;
  const epochDay = Math.floor((now + off) / DAY);
  const weekdayMon0 = ((epochDay % 7) + 3 + 7) % 7; // epoch day 0 was Thursday
  return Math.round((goal.perWeekdayHours[weekdayMon0] ?? 0) * 60);
}

export function forecastGrammarPlan(plan: GrammarPlan, goal: GrammarGoal, now: number): GrammarForecast {
  const requiredMin = plan.steps.reduce((n, s) => n + s.estMin, 0);
  const days = studyDays(now, goal.deadlineMs, goal.perWeekdayHours, [], goal.tzOffsetMin);
  const availableMin = availableMinutes(days);
  const droppable = plan.steps
    .filter((s) => s.kind === "learn")
    .map((s) => ({ id: s.topicId, estMin: s.estMin, roi: (s.value || 1) / Math.max(1, s.estMin) }));
  const feas = feasibility(requiredMin, availableMin, droppable);
  const countdownDays = Math.max(0, Math.ceil((goal.deadlineMs - now) / DAY));
  return { verdict: feas.verdict, requiredMin, availableMin, countdownDays, dropped: feas.dropped };
}
