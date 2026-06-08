// site/src/scripts/path/optimize-deltas.ts
// Pure: "what-if" deltas in scaled required minutes for the scope-cutting levers. buildPath
// slices to pace.stepsAhead unless a deadline is set, so we force a truthy deadline to always
// measure the FULL path. These feed optimize.ts (which itself stays free of buildPath).
import type { BuildInput } from "./planner";
import { buildPath } from "./planner";
import { tierEffort } from "./tier-effort";
import type { Tier, DeadlineConfig } from "./types";

// A truthy stand-in so buildPath returns the full (un-sliced) path; its fields are never read there.
const FULL: DeadlineConfig = {
  targetDateMs: Number.MAX_SAFE_INTEGER,
  perWeekdayHours: [8, 8, 8, 8, 8, 8, 8],
  tzOffsetMin: 0,
};

export function fullRequiredMin(input: BuildInput, tier: Tier): number {
  const config = { ...input.config, deadline: input.config.deadline ?? FULL };
  const path = buildPath({ ...input, config });
  const e = tierEffort(tier);
  return path.steps.reduce((n, s) => n + Math.round(s.estMin * e), 0);
}

export function goalDropDeltaMin(input: BuildInput, tier: Tier, dropGoalId: string): number {
  const base = fullRequiredMin(input, tier);
  const goals = input.goals.filter((g) => g.id !== dropGoalId);
  const config = { ...input.config, goals: input.config.goals.filter((g) => g.id !== dropGoalId) };
  return Math.max(0, base - fullRequiredMin({ ...input, goals, config }, tier));
}

export function trackExcludeDeltaMin(input: BuildInput, tier: Tier, track: string): number {
  const base = fullRequiredMin(input, tier);
  const config = { ...input.config, excludedTracks: [...input.config.excludedTracks, track] };
  return Math.max(0, base - fullRequiredMin({ ...input, config }, tier));
}
