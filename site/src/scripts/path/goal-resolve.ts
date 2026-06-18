// site/src/scripts/path/goal-resolve.ts
//
// Single source of truth for goal → target-concept-id resolution.
// Previously this logic was duplicated in planner.ts and src/lint/rules/path.ts;
// both now import from here.

import type { Band, Concept, Goal, PathConfig } from "./types";

const BAND_RANK: Record<Band, number> = { foundations: 0, surface: 1, middle: 2, advanced: 3 };

export function resolveGoalTargets(goal: Goal, concepts: Concept[]): string[] {
  if (goal.target.concepts) return [...goal.target.concepts];
  const rule = goal.target.rule ?? "";

  // track-band>=<band>: middle+ (or given band+) concepts in this goal's CORE tracks only —
  // a core track is a trackWeights entry with weight >= 1. Support tracks (< 1) bias ordering
  // via goalTrackWeight but are NOT targeted, so the frontier stays scoped to the role.
  const tb = rule.match(/^track-band>=(\w+)$/);
  if (tb) {
    const min = BAND_RANK[tb[1] as Band];
    if (min === undefined) return [];
    const core = new Set(
      Object.entries(goal.trackWeights).filter(([, w]) => (w ?? 0) >= 1).map(([t]) => t),
    );
    return concepts.filter((c) => core.has(c.track) && BAND_RANK[c.band] >= min).map((c) => c.id);
  }

  // track-band=<lo>..<hi>: concepts in this goal's CORE tracks whose band falls inside the
  // inclusive range. Horizon-bounded goals (junior → middle) need the UPPER bound —
  // "track-band>=surface" would target advanced too. Core/support semantics match track-band>=.
  const tbr = rule.match(/^track-band=(\w+)\.\.(\w+)$/);
  if (tbr) {
    const lo = BAND_RANK[tbr[1] as Band];
    const hi = BAND_RANK[tbr[2] as Band];
    if (lo === undefined || hi === undefined) return [];
    const core = new Set(
      Object.entries(goal.trackWeights).filter(([, w]) => (w ?? 0) >= 1).map(([t]) => t),
    );
    return concepts
      .filter((c) => core.has(c.track) && BAND_RANK[c.band] >= lo && BAND_RANK[c.band] <= hi)
      .map((c) => c.id);
  }

  const m = rule.match(/^band>=(\w+)$/);
  if (m) {
    const min = BAND_RANK[m[1] as Band];
    if (min === undefined) return []; // unknown band token → no targets (avoid matching the whole catalogue)
    return concepts.filter((c) => BAND_RANK[c.band] >= min).map((c) => c.id);
  }
  return [];
}

export function targetFrontier(goals: Goal[], config: PathConfig, concepts: Concept[]): string[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const excluded = new Set(config.excludedTracks);
  const out = new Set<string>();
  for (const g of goals) for (const id of resolveGoalTargets(g, concepts)) {
    const c = byId.get(id);
    if (c && !excluded.has(c.track)) out.add(id);
  }
  for (const id of config.customTargets ?? []) {
    const c = byId.get(id);
    if (c && !excluded.has(c.track)) out.add(id);
  }
  return [...out].sort();
}
