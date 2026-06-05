// site/src/scripts/path/config.ts
import type { PathConfig } from "./types";

export const CONFIG_VERSION = 1;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const DEFAULT_CONFIG: PathConfig = {
  version: CONFIG_VERSION,
  goals: [{ id: "senior-fullstack", priority: 1 }],
  excludedTracks: [],
  breadthVsDepth: 0.3, // lean depth-first by default
  depthTier: "middle",
  pace: { stepsAhead: 5, srsAggressiveness: 0.5 },
  weights: { prior: 0.25, lessons: 0.35, practice: 0.4, recency: 1.0, masteryThreshold: 0.6, decayFloor: 0.85 },
};

export function clampConfig(c: PathConfig): PathConfig {
  return {
    ...c,
    breadthVsDepth: clamp(c.breadthVsDepth, 0, 1),
    pace: {
      stepsAhead: Math.max(1, Math.round(c.pace.stepsAhead)),
      srsAggressiveness: clamp(c.pace.srsAggressiveness, 0, 1),
    },
    weights: {
      ...c.weights,
      masteryThreshold: clamp(c.weights.masteryThreshold, 0.1, 0.95),
      decayFloor: clamp(c.weights.decayFloor, 0, 1),
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
