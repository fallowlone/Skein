// site/src/scripts/path/config.ts
import type { PathConfig } from "./types";

export const CONFIG_VERSION = 1;
// Returns `lo` for non-finite input so a corrupted localStorage value can't propagate NaN.
const clamp = (x: number, lo: number, hi: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);

// The goal a brand-new learner (no persisted path state) starts on. A job-ready arc
// (junior → middle) is the right first target; senior-fullstack stays the general base
// goal for the merge of any *stored* config so we never mutate an existing learner's goal.
export const COLD_START_GOAL_ID = "job-ready-junior";

export const DEFAULT_CONFIG: PathConfig = {
  version: CONFIG_VERSION,
  goals: [{ id: "senior-fullstack", priority: 1 }],
  excludedTracks: [],
  breadthVsDepth: 0.3, // lean depth-first by default
  depthTier: "middle",
  pace: { stepsAhead: 5, srsAggressiveness: 0.5 },
  weights: { lessons: 0.35, practice: 0.4, masteryThreshold: 0.6, decayFloor: 0.3 },
};

// Cold-start config: DEFAULT_CONFIG with the job-ready goal swapped in. Used ONLY when there
// is no persisted path state at all — a stored config is always merged onto DEFAULT_CONFIG,
// which keeps that learner's own goals.
export function coldStartConfig(): PathConfig {
  return { ...DEFAULT_CONFIG, goals: [{ id: COLD_START_GOAL_ID, priority: 1 }] };
}

export function clampConfig(c: PathConfig): PathConfig {
  const stepsAhead = Number.isFinite(c.pace.stepsAhead) ? Math.max(1, Math.round(c.pace.stepsAhead)) : 1;
  return {
    ...c,
    // depthTier is a free-form Tier union (or per-track map); it isn't range-clamped here —
    // it's validated where it's consumed (content depth selection), not in the pure core.
    goals: c.goals.map((g) => ({ ...g, priority: Math.max(1, Number.isFinite(g.priority) ? g.priority : 1) })),
    breadthVsDepth: clamp(c.breadthVsDepth, 0, 1),
    pace: {
      stepsAhead,
      srsAggressiveness: clamp(c.pace.srsAggressiveness, 0, 1),
    },
    weights: {
      ...c.weights,
      lessons: clamp(c.weights.lessons, 0, 1),
      practice: clamp(c.weights.practice, 0, 1),
      masteryThreshold: clamp(c.weights.masteryThreshold, 0.1, 0.95),
      // must stay below masteryThreshold's floor (0.1..0.95): a decayFloor above the threshold
      // makes decay incapable of ever un-knowing a concept (the pre-repair 0.85 default bug)
      decayFloor: clamp(c.weights.decayFloor, 0, 0.5),
    },
  };
}

// Overlay a stored (possibly partial / stale) config onto current defaults, then clamp.
export function mergeConfig(stored: Partial<PathConfig>): PathConfig {
  const merged: PathConfig = {
    ...DEFAULT_CONFIG,
    ...stored,
    version: CONFIG_VERSION,
    pace: { ...DEFAULT_CONFIG.pace, ...(stored.pace ?? {}) },
    weights: { ...DEFAULT_CONFIG.weights, ...(stored.weights ?? {}) },
  };
  return clampConfig(merged);
}
