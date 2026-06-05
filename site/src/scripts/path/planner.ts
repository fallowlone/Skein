// site/src/scripts/path/planner.ts
import type { Concept, Goal, KnowledgeState, PathConfig, UnitConcepts, Path, PathStep, Band, Track } from "./types";
import type { ConceptGraph } from "./graph";
import { topoSort, ancestors, buildConceptGraph } from "./graph";
import { isKnown } from "./knowledge";

const BAND_RANK: Record<Band, number> = { foundations: 0, surface: 1, middle: 2, advanced: 3 };
// Senior-readiness priority by band: middle is the sweet spot; advanced is deferred until the
// learner is near the ceiling; foundations are prerequisite, not the frontier. (Mirrors the
// retired competency.ts weighting.)
const SENIOR_WEIGHT: Record<Band, number> = { middle: 1.0, surface: 0.9, advanced: 0.8, foundations: 0.4 };

export function resolveGoalTargets(goal: Goal, concepts: Concept[]): string[] {
  if (goal.target.concepts) return [...goal.target.concepts];
  const rule = goal.target.rule ?? "";
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

// Topo-ordered closure of every target concept the learner does not yet know.
export function missingConcepts(frontier: string[], state: KnowledgeState, g: ConceptGraph, threshold: number): string[] {
  const needed = new Set<string>();
  for (const f of frontier) {
    if (!isKnown(state, f, threshold)) {
      needed.add(f);
      for (const a of ancestors(g, f)) if (!isKnown(state, a, threshold)) needed.add(a);
    }
  }
  return topoSort(g).filter((id) => needed.has(id));
}

export function conceptsToUnits(missing: string[], units: UnitConcepts[]): UnitConcepts[] {
  const need = new Set(missing);
  return units.filter((u) => u.teaches.some((c) => need.has(c)));
}

export interface OrderCtx {
  config: PathConfig; state: KnowledgeState; graph: ConceptGraph; units: UnitConcepts[];
  goals: Goal[]; concepts: Concept[]; trackOrder: Map<string, number>;
}

function goalTrackWeight(track: Track, goals: Goal[], config: PathConfig): number {
  let w = 0;
  for (const g of goals) {
    const prio = config.goals.find((x) => x.id === g.id)?.priority ?? 1;
    w += (g.trackWeights[track] ?? 0.5) * prio;
  }
  return w || 0.5; // 0.5 floor: a track always carries some weight unless excludedTracks removes it
}

export function orderUnits(units: UnitConcepts[], ctx: OrderCtx): UnitConcepts[] {
  const byId = new Map(ctx.concepts.map((c) => [c.id, c]));
  const threshold = ctx.config.weights.masteryThreshold;
  const ready = (u: UnitConcepts) => u.requires.every((c) => isKnown(ctx.state, c, threshold));
  // Fallback "foundations" (lowest weight) so a unit teaching an unregistered concept id is
  // de-prioritised rather than silently boosted to the top.
  const bandOf = (u: UnitConcepts): Band => byId.get(u.teaches[0])?.band ?? "foundations";
  const value = (u: UnitConcepts) => goalTrackWeight(u.track, ctx.goals, ctx.config) * SENIOR_WEIGHT[bandOf(u)];

  const depthMode = ctx.config.breadthVsDepth < 0.5;
  const withMeta = units.map((u) => ({ u, ready: ready(u) ? 1 : 0, value: value(u), to: ctx.trackOrder.get(u.track) ?? 99 }));

  if (depthMode) {
    return withMeta
      .sort((a, b) => a.to - b.to || b.ready - a.ready || a.u.unit.localeCompare(b.u.unit) || b.value - a.value)
      .map((m) => m.u);
  }
  // breadth: ready-first, then round-robin tracks (each round one unit per track, by value).
  const sorted = withMeta.sort((a, b) => b.ready - a.ready || b.value - a.value || a.u.unit.localeCompare(b.u.unit));
  const byTrack = new Map<string, UnitConcepts[]>();
  for (const m of sorted) { const arr = byTrack.get(m.u.track) ?? []; arr.push(m.u); byTrack.set(m.u.track, arr); }
  const tracks = [...byTrack.keys()].sort((x, y) => (ctx.trackOrder.get(x) ?? 99) - (ctx.trackOrder.get(y) ?? 99));
  const out: UnitConcepts[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const t of tracks) { const arr = byTrack.get(t)!; if (arr.length) { out.push(arr.shift()!); added = true; } }
  }
  return out;
}

export function interleaveReviews(steps: PathStep[], srsDue: PathStep[], aggressiveness: number): PathStep[] {
  // aggressiveness 0 disables in-path reviews entirely (srsDue stays for the /review surface, not the path).
  if (!srsDue.length || aggressiveness <= 0) return steps;
  const every = Math.max(1, Math.round((1 - aggressiveness) * 4) + 1); // aggr 1 → every step; approaches every 5 as aggr → 0+
  const out: PathStep[] = [];
  const queue = [...srsDue];
  steps.forEach((s, i) => {
    out.push(s);
    if (queue.length && (i + 1) % every === 0) out.push(queue.shift()!);
  });
  out.push(...queue);
  return out;
}

export interface BuildInput {
  state: KnowledgeState; goals: Goal[]; config: PathConfig;
  content: { concepts: Concept[]; units: UnitConcepts[]; goalById: Map<string, Goal> };
  srsDue: PathStep[]; now: number; trackOrder: Map<string, number>;
}

export function buildPath(input: BuildInput): Path {
  const { state, goals, config, content, srsDue, trackOrder } = input;
  const graph = buildConceptGraph(content.concepts);
  const byId = new Map(content.concepts.map((c) => [c.id, c]));

  const frontier = targetFrontier(goals, config, content.concepts);
  const missing = missingConcepts(frontier, state, graph, config.weights.masteryThreshold);
  const missingSet = new Set(missing);
  const units = conceptsToUnits(missing, content.units);
  const ordered = orderUnits(units, { config, state, graph, units: content.units, goals, concepts: content.concepts, trackOrder });

  const learn: PathStep[] = ordered.map((u) => {
    const unlocks = u.teaches.filter((c) => missingSet.has(c));
    const labels = unlocks.map((c) => byId.get(c)?.label.en ?? c).join(", ");
    return { unit: u.unit, track: u.track, unlocks, reason: `Unlocks ${labels}`, kind: "learn", estMin: u.estMin };
  });

  const withReviews = interleaveReviews(learn, srsDue, config.pace.srsAggressiveness);
  const steps = config.deadline ? withReviews : withReviews.slice(0, config.pace.stepsAhead);
  return { steps };
}
