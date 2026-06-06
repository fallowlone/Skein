// src/scripts/path/path-io.ts
//
// Impure adapter for the path engine (spec §6). Owns the committed content bundle,
// client persistence (versioned localStorage), and the single recompute entry point.
// The pure P0 core (graph/knowledge/planner/schedule/config) is consumed, never modified.
// This is the ONLY place Date.now() / localStorage are touched.
import type { Concept, Goal, KnowledgeState, ConceptMastery, UnitConcepts, PathStep, PathConfig, Path, Schedule } from "./types";

// ── committed content (Vite bundles these into the island chunk) ───────────────
import conceptsJson from "~/content/path/concepts.json";
import unitConceptsJson from "~/content/path/unit-concepts.json";
import goalsJson from "~/content/path/goals.json";
import diagnosticsIndex from "~/content/path/diagnostics-index.json";
import unitsJson from "~/content/units.json";
import tracksJson from "~/content/tracks.json";
import { masteryOf } from "./knowledge";
import diagnosticsBundle from "~/content/path/diagnostics-bundle.json";
import { buildConceptGraph } from "./graph";
import { userState } from "~/scripts/user-state";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { seedFromPretest } from "./pretest-seed";
import { pickProbe } from "./calibration";
import { targetFrontier } from "./planner";

// ── pure helpers (unit-tested) ─────────────────────────────────────────────────
export function unitsFromMap(map: Record<string, { teaches: string[]; requires: string[]; estMin: number }>): UnitConcepts[] {
  return Object.entries(map).map(([unit, v]) => ({
    unit, track: unit.split("/")[0] as UnitConcepts["track"], teaches: v.teaches, requires: v.requires, estMin: v.estMin,
  }));
}

export function applyViewOrder(steps: PathStep[], order: string[]): PathStep[] {
  if (!order.length) return steps;
  const rank = new Map(order.map((u, i) => [u, i]));
  const pinned = steps.filter((s) => rank.has(s.unit)).sort((a, b) => rank.get(a.unit)! - rank.get(b.unit)!);
  const rest = steps.filter((s) => !rank.has(s.unit));
  return [...pinned, ...rest];
}

export function togglePin(order: string[], unit: string): string[] {
  return order.includes(unit) ? order.filter((u) => u !== unit) : [...order, unit];
}

export function moveInOrder(order: string[], unit: string, dir: "up" | "down"): string[] {
  const next = order.includes(unit) ? [...order] : [...order, unit];
  const i = next.indexOf(unit);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export interface TrackMastery { track: string; known: number; total: number; avg: number; }
export function masteryByTrack(state: KnowledgeState, concepts: Concept[], threshold: number): TrackMastery[] {
  const m = new Map<string, { known: number; total: number; sum: number }>();
  for (const c of concepts) {
    const t = m.get(c.track) ?? { known: 0, total: 0, sum: 0 };
    const conf = masteryOf(state, c.id);
    t.total++; t.sum += conf; if (conf >= threshold) t.known++;
    m.set(c.track, t);
  }
  return [...m.entries()]
    .map(([track, v]) => ({ track, known: v.known, total: v.total, avg: v.total ? v.sum / v.total : 0 }))
    .sort((a, b) => a.track.localeCompare(b.track));
}

export function serializeKnowledge(state: KnowledgeState): [string, ConceptMastery][] {
  return [...state.entries()];
}
export function deserializeKnowledge(arr: [string, ConceptMastery][]): KnowledgeState {
  return new Map(arr);
}
// ── (Task 2 appends the content bundle + signals + mutations below this line) ──
import { buildPath } from "./planner";
import { schedulePlan } from "./schedule";
import { emptyState, applySelfDeclare, applyDiagnostic } from "./knowledge";
import { mergeConfig, clampConfig } from "./config";
import type { DeadlineConfig } from "./types";

// View-only state the pure core ignores (pin/reorder). Persisted with the config.
export interface PathView { order: string[] }
export type StoredPathConfig = PathConfig & { view: PathView };

const concepts = conceptsJson as Concept[];
const units = unitsFromMap(unitConceptsJson as any);
const goals = goalsJson as Goal[];
const goalById = new Map(goals.map((g) => [g.id, g]));
const conceptById = new Map(concepts.map((c) => [c.id, c]));
const diagnosedConcepts = new Set(diagnosticsIndex as string[]);
const unitTitleById = new Map((unitsJson as any[]).map((u) => [u.id, u.title as { en: string; ru: string }]));
const trackOrder = new Map((tracksJson as any[]).map((t) => [t.slug as string, t.order as number]));
const teachesByUnit = new Map(units.map((u) => [u.unit, u.teaches]));
// Units that teach ≥1 diagnosed concept — precomputed once so a card render is O(1),
// not O(units) (matters in deadline mode where the path is not stepsAhead-sliced).
const quickCheckUnits = new Set(units.filter((u) => u.teaches.some((c) => diagnosedConcepts.has(c))).map((u) => u.unit));

const graph = buildConceptGraph(concepts);
const diagnostics = diagnosticsBundle as Record<string, { concept: string; items: import("./calibration").DiagItem[] }>;

export const content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, quickCheckUnits, unitTitleById, trackOrder, diagnostics, graph };

// ── persistence (versioned, mirrors user-state.ts) ─────────────────────────────
import { signal, effect } from "@preact/signals";
const K_KEY = "awesome.path-knowledge.v1";
const C_KEY = "awesome.path-config.v1";

function loadKnowledge(): KnowledgeState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(K_KEY);
    if (raw) return deserializeKnowledge(JSON.parse(raw));
  } catch { /* fall through to seed */ }
  // Empty state + a prior pretest → seed concept confidences from it (cold-start personalization).
  const pretest = userState.value.pretest;
  if (pretest) return seedFromPretest(emptyState(), graph, pretest, pretestQuestions, advancedQuestions, Date.now());
  return emptyState();
}
function defaultStoredConfig(): StoredPathConfig {
  return { ...(mergeConfig({}) as StoredPathConfig), view: { order: [] } };
}
function loadConfig(): StoredPathConfig {
  if (typeof window === "undefined") return defaultStoredConfig();
  try {
    const raw = localStorage.getItem(C_KEY);
    if (!raw) return defaultStoredConfig();
    const stored = JSON.parse(raw);
    const merged = mergeConfig(stored) as StoredPathConfig;
    merged.view = { order: stored.view?.order ?? [] };
    return merged;
  } catch { return defaultStoredConfig(); }
}

export const knowledge = signal<KnowledgeState>(loadKnowledge());
export const config = signal<StoredPathConfig>(loadConfig());

if (typeof window !== "undefined") {
  effect(() => { try { localStorage.setItem(K_KEY, JSON.stringify(serializeKnowledge(knowledge.value))); } catch {} });
  effect(() => { try { localStorage.setItem(C_KEY, JSON.stringify(config.value)); } catch {} });
}

// ── recompute (the single entry point; reads signals → subscribes the caller) ──
export function computePath(): { path: Path; schedule?: Schedule } {
  const cfg = config.value;
  const now = Date.now();
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  const raw = buildPath({
    state: knowledge.value, goals: goalObjs, config: cfg,
    content: { concepts, units, goalById }, srsDue: [], now, trackOrder,
  });
  const path: Path = { steps: applyViewOrder(raw.steps, cfg.view.order) };
  const schedule = cfg.deadline ? schedulePlan(path, cfg.deadline, now) : undefined;
  return { path, schedule };
}

// ── mutation helpers (write through signals → autosave → reactive recompute) ──
// Re-clamp on every write so "stored config is always valid" holds between reloads,
// not just at load. clampConfig preserves view/goals/deadline (it spreads the input).
const setCfg = (patch: Partial<StoredPathConfig>) => { config.value = clampConfig({ ...config.value, ...patch }) as StoredPathConfig; };

export function declareKnown(concept: string, known: boolean): void {
  knowledge.value = applySelfDeclare(knowledge.value, concept, known, Date.now());
}
export function skipUnit(unitId: string): void {
  let next = knowledge.value;
  for (const c of teachesByUnit.get(unitId) ?? []) next = applySelfDeclare(next, c, true, Date.now());
  knowledge.value = next;
}
export function pinUnit(unitId: string): void { setCfg({ view: { order: togglePin(config.value.view.order, unitId) } }); }
export function moveUnit(unitId: string, dir: "up" | "down"): void { setCfg({ view: { order: moveInOrder(config.value.view.order, unitId, dir) } }); }
export function isPinned(unitId: string): boolean { return config.value.view.order.includes(unitId); }

export function setGoals(g: { id: string; priority: number }[]): void { setCfg({ goals: g }); }
export function toggleCustomTarget(id: string): void {
  const cur = config.value.customTargets ?? [];
  setCfg({ customTargets: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
}
export function toggleExcludedTrack(track: string): void {
  const cur = config.value.excludedTracks;
  setCfg({ excludedTracks: cur.includes(track) ? cur.filter((x) => x !== track) : [...cur, track] });
}
export function setKnob(patch: Partial<Pick<PathConfig, "breadthVsDepth" | "depthTier" | "pace" | "weights">>): void { setCfg(patch as Partial<StoredPathConfig>); }
export function setDeadline(d: DeadlineConfig | undefined): void { setCfg({ deadline: d }); }
export function resetPath(): void {
  knowledge.value = emptyState();
  config.value = defaultStoredConfig();
  if (typeof window !== "undefined") { try { localStorage.removeItem(K_KEY); localStorage.removeItem(C_KEY); } catch {} }
}

export function activeGoals() {
  return config.value.goals.map((g) => goalById.get(g.id)).filter(Boolean) as import("./types").Goal[];
}
export function applyDiagnosticResult(concept: string, correctFrac: number): void {
  knowledge.value = applyDiagnostic(knowledge.value, graph, concept, correctFrac, Date.now());
}
export function nextCalibrationProbe(): string | null {
  const frontier = targetFrontier(activeGoals(), config.value, concepts);
  return pickProbe(knowledge.value, graph, frontier, diagnosedConcepts, config.value.weights.masteryThreshold);
}
export function unitProbeConcepts(unitId: string): string[] {
  return (teachesByUnit.get(unitId) ?? []).filter((c) => diagnosedConcepts.has(c));
}
