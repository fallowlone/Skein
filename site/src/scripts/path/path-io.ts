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
import { masteryOf, applyReviewEvidence } from "./knowledge";
import { recordAttempt, type AttemptRec } from "~/scripts/practice-state";
import { dueBefore, recordReview, allCards, type Card } from "~/scripts/review-state";
import { unitStruggleFractions } from "./practice-signal";
import { buildDoNow, type DoNowItem } from "./do-now";
import diagnosticsBundle from "~/content/path/diagnostics-bundle.json";
import { buildConceptGraph } from "./graph";
import { userState, importUserState } from "~/scripts/user-state";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { seedFromPretest } from "./pretest-seed";
import { pickProbe, placementPlan, type DiagItem } from "./calibration";
import { DOMAIN_FAMILIES } from "./mastery-field";
import { targetFrontier } from "./planner";
import {
  studyRating,
  blendRating,
  highWater,
  hasEnoughEvidence,
  barRatingForGoal,
  projectRatingDate,
  evidenceProgress,
  type RatingForecast,
  type EvidenceProgress,
} from "~/scripts/progression/effective-rating";
import { ratingToRank } from "~/scripts/progression/ranks";
import { calibrationFreshness, type CalibrationFreshness } from "~/scripts/progression/calibration-freshness";
import committedOverrides from "~/content/path/concept-overrides.json";
import type { Overrides } from "./graph";
import { applyOverridesFull, mergeOverrides, loosenUnitEdges } from "./overrides";
import { serializeStateBundle, parseStateBundle } from "./state-io";
import { resolveIrt, priorFor, collapse, type SelfPlace, type Irt } from "./bayes";
import type { Band } from "./types";
import { rankWeakSpots, type WeakSpot } from "./weak-spots";

// ── pure helpers (unit-tested) ─────────────────────────────────────────────────
export function unitsFromMap(map: Record<string, { teaches: string[]; requires: string[]; estMin: number }>): UnitConcepts[] {
  return Object.entries(map).map(([unit, v]) => ({
    unit, track: unit.split("/")[0] as UnitConcepts["track"], teaches: v.teaches, requires: v.requires, estMin: v.estMin,
  }));
}

// Collapse the depthTier config (string or per-track map) to a single tier for scheduling. v1
// uses the string form; a per-track map falls back to "middle" (mirrors DeadlineSection).
export function tierOf(cfg: PathConfig): Tier {
  return typeof cfg.depthTier === "string" ? cfg.depthTier : "middle";
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

// Searchable target picker: taught + clean-label concepts matching the query on label[lang] or id.
// "Clean" mirrors the keystone filter — drops long-tail junk ids/labels (e.g. "--cpu-prof", " foo").
export function searchConcepts(concepts: Concept[], taught: Set<string>, query: string, lang: "en" | "ru", limit = 20): Concept[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const clean = (c: Concept) =>
    taught.has(c.id) && /^[a-z0-9]/i.test(c.id) && c.label[lang] === c.label[lang].trim() && c.label[lang].length > 1;
  const out: Concept[] = [];
  for (const c of concepts) {
    if (!clean(c)) continue;
    if (c.label[lang].toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

// Move `from` adjacent to `to` in the full visible unit-id sequence (DnD reorder).
// When dragging down (fromIdx < toIdx), inserts after `to`; when dragging up, inserts before `to`.
// No-op if from === to or either id is absent.
export function reorderList(unitIds: string[], from: string, to: string): string[] {
  const fromIdx = unitIds.indexOf(from);
  const toIdx = unitIds.indexOf(to);
  if (from === to || fromIdx === -1 || toIdx === -1) return unitIds;
  const arr = unitIds.filter((u) => u !== from);
  const ti = arr.indexOf(to);
  arr.splice(fromIdx < toIdx ? ti + 1 : ti, 0, from);
  return arr;
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

const BAND_ORDER: Record<string, number> = { foundations: 0, surface: 1, middle: 2, advanced: 3 };

// Pure (exported for tests): ids of a track's concepts whose band is at or below the ceiling.
export function conceptsUpToBand(all: Concept[], track: string, upTo: string): string[] {
  const cap = BAND_ORDER[upTo] ?? 0;
  return all.filter((c) => c.track === track && (BAND_ORDER[c.band] ?? 0) <= cap).map((c) => c.id);
}

export function serializeKnowledge(state: KnowledgeState): [string, ConceptMastery][] {
  return [...state.entries()];
}
export function deserializeKnowledge(arr: [string, ConceptMastery][]): KnowledgeState {
  return new Map(arr);
}
// ── (Task 2 appends the content bundle + signals + mutations below this line) ──
import { buildPath } from "./planner";
import { schedulePlan, studyDays, availableMinutes } from "./schedule";
import { emptyState, applySelfDeclare, applyDiagnostic, applyStudyEvidence, applyPracticeStruggle, decay } from "./knowledge";
import { mergeConfig, clampConfig, coldStartConfig } from "./config";
import type { DeadlineConfig } from "./types";
import { tierEffort } from "./tier-effort";
import { pace, type Pace } from "./pace";
import { suggestFixes, bestCombo, type Fix, type LeverInputs } from "./optimize";
import { fullRequiredMin, goalDropDeltaMin, trackExcludeDeltaMin } from "./optimize-deltas";
import { normalizeRanks } from "./goal-rank";
import type { Tier } from "./types";

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
const taughtConcepts = new Set(units.flatMap((u) => u.teaches));
// Units that teach ≥1 diagnosed concept — precomputed once so a card render is O(1),
// not O(units) (matters in deadline mode where the path is not stepsAhead-sliced).
const quickCheckUnits = new Set(units.filter((u) => u.teaches.some((c) => diagnosedConcepts.has(c))).map((u) => u.unit));

const graph = buildConceptGraph(concepts);
// NOTE: `graph` is a const evaluated at module load; loadKnowledge (below) reads it but is only
// *called* by the `knowledge` signal init further down, so `graph` is always initialized first.
const diagnostics = diagnosticsBundle as Record<string, { concept: string; items: DiagItem[] }>;

export const content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, quickCheckUnits, unitTitleById, trackOrder, diagnostics, graph, taughtConcepts };

// ── persistence (versioned, mirrors user-state.ts) ─────────────────────────────
import { signal, effect } from "@preact/signals";
const K_KEY = "awesome.path-knowledge.v1";
const C_KEY = "awesome.path-config.v1";
const O_KEY = "awesome.path-overrides.v1";
function loadOverrides(): Overrides {
  const base: Overrides = { addEdges: [], removeEdges: [], retag: [] };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(O_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        addEdges: Array.isArray(p.addEdges) ? p.addEdges : [],
        removeEdges: Array.isArray(p.removeEdges) ? p.removeEdges : [],
        retag: [],
      };
    }
  } catch { /* keep base */ }
  return base;
}

function loadKnowledge(): KnowledgeState {
  if (typeof window === "undefined") return emptyState();
  // Non-empty stored state wins — including when it fails to parse (corrupt data is NOT a cold start,
  // so we must never discard it by re-seeding). Only genuinely-absent storage seeds from the pretest.
  const raw = localStorage.getItem(K_KEY);
  if (raw !== null) {
    try { return deserializeKnowledge(JSON.parse(raw)); } catch { return emptyState(); }
  }
  // Truly empty + a prior pretest → seed concept confidences from it (cold-start personalization).
  const pretest = userState.value.pretest;
  if (pretest) return seedFromPretest(emptyState(), graph, pretest, pretestQuestions, advancedQuestions, Date.now());
  return emptyState();
}
// `coldStart` true → swap the cold-start goal in for a brand-new learner; false → keep the
// general DEFAULT_CONFIG goal (an existing learner who has knowledge but no stored config).
function defaultStoredConfig(coldStart = false): StoredPathConfig {
  const base = coldStart ? mergeConfig(coldStartConfig()) : mergeConfig({});
  return { ...(base as StoredPathConfig), view: { order: [] } };
}
function loadConfig(): StoredPathConfig {
  if (typeof window === "undefined") return defaultStoredConfig();
  try {
    const raw = localStorage.getItem(C_KEY);
    // Genuine cold start = no persisted path state at all (no config AND no knowledge). A learner
    // with stored knowledge but no config is NOT cold — keep the general default, don't retarget them.
    if (!raw) return defaultStoredConfig(localStorage.getItem(K_KEY) === null);
    const stored = JSON.parse(raw);
    const merged = mergeConfig(stored) as StoredPathConfig;
    merged.view = { order: stored.view?.order ?? [] };
    return merged;
  } catch { return defaultStoredConfig(); }
}

export const knowledge = signal<KnowledgeState>(loadKnowledge());
export const config = signal<StoredPathConfig>(loadConfig());
export const overrides = signal<Overrides>(loadOverrides());

if (typeof window !== "undefined") {
  effect(() => { try { localStorage.setItem(K_KEY, JSON.stringify(serializeKnowledge(knowledge.value))); } catch {} });
  effect(() => { try { localStorage.setItem(C_KEY, JSON.stringify(config.value)); } catch {} });
  effect(() => { try { localStorage.setItem(O_KEY, JSON.stringify(overrides.value)); } catch {} });
}

// ── study evidence: graded practice progress → concept confidence ──────────────
const PRACTICE_PREFIX = "atlas.practice.";
const ATTEMPTS_PREFIX = "atlas.practice-attempts.";
// Small weight: a struggle signal nudges confidence down, it does not collapse it (mirrors the
// modest reading/practice study-evidence weights). Erosion floors at config.weights.decayFloor.
const PRACTICE_STRUGGLE_WEIGHT = 0.25;
const unitLessonCounts = new Map<string, number>(
  (unitsJson as any[]).map((u) => [u.id as string, ((u.lessons as string[]) ?? []).length]),
);
// unit id → ordered full lesson keys ("<track>/<unit>/<lesson-slug>"), the do-now scan order.
const unitLessonKeys = new Map<string, string[]>(
  (unitsJson as any[]).map((u) => [
    u.id as string,
    ((u.lessons as string[]) ?? []).map((slug) => `${u.id}/${slug}`),
  ]),
);

// Pure (exported for tests): per-unit touched/done lesson shares from raw practice-progress
// maps keyed by lesson key ("<track>/<unit>/<lesson>"; PracticeSection's storage shape).
export function unitPracticeFractions(
  progress: Map<string, Record<string, string>>,
  lessonCounts: Map<string, number>,
): Map<string, { touchedFrac: number; doneFrac: number }> {
  const touched = new Map<string, Set<string>>();
  const done = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, unit: string, lesson: string) => {
    const s = m.get(unit) ?? new Set<string>();
    s.add(lesson);
    m.set(unit, s);
  };
  for (const [lessonKey, tasks] of progress) {
    const seg = lessonKey.split("/");
    if (seg.length < 3) continue; // lab keys and other non-lesson entries
    const unitId = `${seg[0]}/${seg[1]}`;
    const lesson = seg.slice(2).join("/");
    const statuses = Object.values(tasks ?? {});
    if (!statuses.length) continue;
    add(touched, unitId, lesson);
    if (statuses.includes("done")) add(done, unitId, lesson);
  }
  const out = new Map<string, { touchedFrac: number; doneFrac: number }>();
  for (const [unitId, set] of touched) {
    const count = lessonCounts.get(unitId) ?? 0;
    if (!count) continue;
    out.set(unitId, {
      touchedFrac: Math.min(1, set.size / count),
      doneFrac: Math.min(1, (done.get(unitId)?.size ?? 0) / count),
    });
  }
  return out;
}

function readPracticeProgress(): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  if (typeof window === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PRACTICE_PREFIX)) continue;
    try {
      const v = JSON.parse(localStorage.getItem(k) ?? "{}");
      if (v && typeof v === "object" && !Array.isArray(v)) out.set(k.slice(PRACTICE_PREFIX.length), v);
    } catch { /* corrupt entry — skip */ }
  }
  return out;
}

// Fold graded-practice progress into concept confidence. Idempotent and monotone: never lowers,
// never overrides diagnostic/declared evidence; when nothing increases, the signal keeps its
// reference, so running on every page load causes no persist churn.
export function refreshStudyEvidence(): void {
  const fractions = unitPracticeFractions(readPracticeProgress(), unitLessonCounts);
  if (!fractions.size) return;
  const { lessons: wL, practice: wP } = config.value.weights;
  const now = Date.now();
  let next = knowledge.value;
  for (const [unitId, f] of fractions) {
    const taught = teachesByUnit.get(unitId);
    if (taught) next = applyStudyEvidence(next, taught, f.touchedFrac, f.doneFrac, wL, wP, now);
  }
  knowledge.value = next;
}
if (typeof window !== "undefined") refreshStudyEvidence();

// ── practice-attempt outcomes: struggle → downward knowledge signal + fail→resurface ──────────
// Mirror of readPracticeProgress for the graded-outcomes store (atlas.practice-attempts.*).
export function readAttemptsAll(): Map<string, Record<string, AttemptRec>> {
  const out = new Map<string, Record<string, AttemptRec>>();
  if (typeof window === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(ATTEMPTS_PREFIX)) continue;
    try {
      const v = JSON.parse(localStorage.getItem(k) ?? "{}");
      if (v && typeof v === "object" && !Array.isArray(v)) out.set(k.slice(ATTEMPTS_PREFIX.length), v);
    } catch { /* corrupt entry — skip */ }
  }
  return out;
}

// Fold repeated practice failures into a downward confidence nudge for the struggling unit's
// taught concepts. Mirror of refreshStudyEvidence but downward: only erodes activity-sourced
// confidence (applyPracticeStruggle guards diagnostic/declared), bounded by decayFloor, and
// keeps the signal reference when nothing lowers — so running on every load causes no churn.
export function refreshPracticeSignal(): void {
  const fractions = unitStruggleFractions(readAttemptsAll(), unitLessonCounts);
  if (!fractions.size) return;
  const floor = config.value.weights.decayFloor;
  const now = Date.now();
  let next = knowledge.value;
  for (const [unitId, f] of fractions) {
    if (f.struggleFrac <= 0) continue;
    const taught = teachesByUnit.get(unitId);
    if (taught) next = applyPracticeStruggle(next, taught, f.struggleFrac, floor, PRACTICE_STRUGGLE_WEIGHT, now);
  }
  knowledge.value = next;
}
if (typeof window !== "undefined") refreshPracticeSignal();

// Review-health weight: a fully-healthy unit → confidence 0.7 (above masteryThreshold ~0.6 = known);
// a half-lapsed unit → 0.35 (below it → the concept re-enters the path via effectiveKnowledge).
const REVIEW_EVIDENCE_WEIGHT = 0.7;

// ── review evidence: SM-2 card health → concept confidence ─────────────────────
// Pure (exported for tests): per-unit review health from the card store. healthFrac is the share of
// a unit's REVIEWED cards (lastReviewedAt != null) currently in good standing. Unreviewed cards carry
// no signal and are excluded; a unit with no reviewed cards is omitted from the map.
//
// Only cards whose lessonKey is a "<track>/<unit>/…" path join here. PRACTICE cards carry the
// route-derived key. RETRIEVAL cards are seeded with the canonical key by a build-time remark
// plugin (remark-retrieval-lessonkey) that stamps lessonKey="<track>/<unit>/<slug>" onto every
// RetrievalDrawer node from frontmatter — so both join (Phase 3b closed the retrieval loop). A
// drawer in a non-lesson MDX (no track/unit/slug frontmatter) keeps its bare `id` and is dropped
// by the seg<2 guard below — a harmless no-op, not a regression.
export function unitReviewHealth(cards: Card[], now: number): Map<string, number> {
  const reviewed = new Map<string, number>();
  const healthy = new Map<string, number>();
  for (const c of cards) {
    if (c.lastReviewedAt == null) continue;
    const seg = c.lessonKey.split("/");
    if (seg.length < 2) continue;
    const unitId = `${seg[0]}/${seg[1]}`;
    reviewed.set(unitId, (reviewed.get(unitId) ?? 0) + 1);
    const isHealthy = c.sched.reps >= 2 && c.dueAt > now && c.sched.lapses === 0;
    if (isHealthy) healthy.set(unitId, (healthy.get(unitId) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [unitId, total] of reviewed) out.set(unitId, (healthy.get(unitId) ?? 0) / total);
  return out;
}

// Fold per-unit review health into concept confidence. Mirror of refreshStudyEvidence: keeps the
// knowledge reference when nothing changes (no persist churn on every load). SSR-safe.
export function refreshReviewEvidence(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const health = unitReviewHealth(allCards(), now);
  if (!health.size) return;
  const floor = config.value.weights.decayFloor;
  let next = knowledge.value;
  for (const [unitId, healthFrac] of health) {
    const taught = teachesByUnit.get(unitId);
    if (taught) next = applyReviewEvidence(next, taught, healthFrac, REVIEW_EVIDENCE_WEIGHT, floor, now);
  }
  knowledge.value = next;
}
if (typeof window !== "undefined") refreshReviewEvidence();

/** Recompute the study-derived effective rating from decayed knowledge and persist the
 *  high-water peak + EMA into progression. Reactive: reruns on knowledge/config change.
 *  Reads user state via peek() so the userState write does not re-trigger this effect. */
function syncEffectiveRating(): void {
  const s = userState.peek();
  const goalObjs = config.value.goals
    .map((g) => goalById.get(g.id))
    .filter(Boolean) as Goal[];
  if (!goalObjs.length) {
    const fallback = goalById.get("senior-fullstack");
    if (fallback) goalObjs.push(fallback);
  }
  const sorted = [...config.value.goals].sort((a, b) => a.priority - b.priority);
  const primaryId = sorted[0]?.id ?? "senior-fullstack";
  const barRating = barRatingForGoal(primaryId);
  const frontier = new Set(targetFrontier(goalObjs, config.value, concepts));
  const K = effectiveKnowledge();
  if (!hasEnoughEvidence(frontier, K)) return;
  const placement = s.pretest?.rating ?? 0;
  const prog = s.progression;
  const raw = studyRating(frontier, K, barRating);
  const { ema, effective } = blendRating(placement, prog.studyEma, raw);
  const peak = highWater(prog.peakRating, effective);
  if (peak === prog.peakRating && ema === prog.studyEma) return;
  userState.value = {
    ...s,
    progression: { ...prog, peakRating: peak, studyEma: ema, studyRatingAt: Date.now() },
  };
}

if (typeof window !== "undefined") {
  effect(() => {
    // Subscribe to the signals that should drive a recompute.
    knowledge.value;
    config.value;
    syncEffectiveRating();
  });
}

// Due-review read-model (fixes computePath's srsDue: []). SSR-safe: [] when there is no window.
export function dueReviews(now = Date.now()): { cardKey: string; lessonKey: string }[] {
  if (typeof window === "undefined") return [];
  return dueBefore(now).map((c) => ({ cardKey: c.cardKey, lessonKey: c.lessonKey }));
}

// Record a graded practice outcome: always log the attempt; on a fail, advance the task's SRS
// card (grade "again" → interval 0) so the flunked task resurfaces due-soon. SSR-safe.
export function recordPracticeOutcome(lessonKey: string, taskId: string, passed: boolean): void {
  if (typeof window === "undefined") return;
  recordAttempt(lessonKey, taskId, passed);
  if (!passed) recordReview(`${lessonKey}::practice::${taskId}`, "again");
}

// Read-model assembling the "do this now" action list (do-now.ts). Lead units come from the
// computed path; lesson keys from the content bundle; mastery from a unit's first taught concept
// against the decayed knowledge; due reviews from the SRS store. `tasksByLesson` is injectable —
// the path bundle does not carry per-lesson practice tasks, so by default a unit only yields a
// task row when the UI supplies real tasks; reviews always surface regardless.
export function computeDoNow(opts?: {
  tasksByLesson?: (lessonKey: string) => { id: string; difficulty: string }[];
  maxUnits?: number;
  path?: Path; // pass an already-computed path to avoid a second (expensive) set-cover build per render
}): DoNowItem[] {
  const eff = effectiveKnowledge();
  const path = opts?.path ?? computePath().path;
  // A unit resolves to the mastery of its first taught concept (its representative knowledge level).
  const masteryOfUnit = (unitId: string): number => {
    const first = teachesByUnit.get(unitId)?.[0];
    return first ? masteryOf(eff, first) : 0;
  };
  return buildDoNow({
    leadUnits: path.steps,
    unitLessons: unitLessonKeys,
    lessonStatus: (lessonKey) => readPracticeProgress().get(lessonKey) ?? {},
    mastery: masteryOfUnit,
    threshold: config.value.weights.masteryThreshold,
    dueReviewKeys: dueReviews(),
    tasksByLesson: opts?.tasksByLesson ?? (() => []),
    maxUnits: opts?.maxUnits ?? 3,
  });
}

// ── recompute (the single entry point; reads signals → subscribes the caller) ──
// Memoize the override application by the overrides signal's identity — the signal is replaced
// (not mutated) on every edit, so an identity hit means nothing changed. Keeps unrelated renders
// (knob drags, pins) from paying applyOverridesFull's graph rebuild when overrides are non-empty.
let _applyCache: { key: Overrides; result: { concepts: Concept[]; units: UnitConcepts[]; droppedLocal: boolean } } | null = null;
function effectiveContent(): { concepts: Concept[]; units: UnitConcepts[]; droppedLocal: boolean } {
  const key = overrides.value;
  if (_applyCache && _applyCache.key === key) return _applyCache.result;
  const result = applyOverridesFull(concepts, units, committedOverrides as Overrides, key);
  _applyCache = { key, result };
  return result;
}

// Read-model: knowledge with time decay applied (stale confidence erodes toward decayFloor and
// re-enters the path). Always computed from the RAW signal — decay is never persisted, so it
// cannot compound across loads. Reading `knowledge.value` inside keeps signal subscriptions alive.
export function effectiveKnowledge(): KnowledgeState {
  return decay(knowledge.value, graph, Date.now(), config.value.weights.decayFloor);
}

// Cold-start view = a brand-new learner with no surveyed knowledge yet. Drives the
// Planning screen's onboarding: when true PathView shows only the welcome banner + one
// "Calibrate" CTA and tucks every config section behind a collapsed disclosure.
export function isColdStartView(knowledgeSize: number): boolean {
  return knowledgeSize === 0;
}

export function computePath(): { path: Path; schedule?: Schedule; droppedLocal: boolean } {
  const cfg = config.value;
  const now = Date.now();
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  const { concepts: eff, units: effUnits, droppedLocal } = effectiveContent();
  const raw = buildPath({
    state: effectiveKnowledge(), goals: goalObjs, config: cfg,
    content: { concepts: eff, units: effUnits, goalById }, srsDue: [], now, trackOrder,
  });
  const path: Path = { steps: applyViewOrder(raw.steps, cfg.view.order) };
  const schedule = cfg.deadline ? schedulePlan(path, cfg.deadline, now, tierOf(cfg)) : undefined;
  return { path, schedule, droppedLocal };
}

// Assemble the planner BuildInput from current signals + (optionally overridden) config.
function buildInputFor(cfg: StoredPathConfig) {
  const { concepts: eff, units: effUnits } = effectiveContent();
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  return {
    state: effectiveKnowledge(), goals: goalObjs, config: cfg,
    content: { concepts: eff, units: effUnits, goalById }, srsDue: [], now: Date.now(), trackOrder,
  };
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

// Batch self-placement: declare every concept of `track` up to `upTo` band as known. Replaces
// dozens of per-concept declares for a learner who already worked with the stack; a later direct
// diagnostic still overrides any individual concept. Undo (known=false) REMOVES the declared
// entries instead of declaring them unknown — a declared-false entry is STRONG evidence that
// would block future study-evidence and propagation lifts, which is not what "never mind" means.
export function declareTrackUpTo(track: string, upTo: string, known = true): void {
  const ids = conceptsUpToBand(concepts, track, upTo);
  if (known) {
    let next = knowledge.value;
    const now = Date.now();
    for (const id of ids) next = applySelfDeclare(next, id, true, now);
    knowledge.value = next;
    return;
  }
  const next = new Map(knowledge.value);
  for (const id of ids) {
    const m = next.get(id);
    if (m?.source === "declared") next.delete(id); // never wipe diagnostic/activity evidence
  }
  knowledge.value = next;
}
export function pinUnit(unitId: string): void { setCfg({ view: { order: togglePin(config.value.view.order, unitId) } }); }
export function moveUnit(unitId: string, dir: "up" | "down"): void { setCfg({ view: { order: moveInOrder(config.value.view.order, unitId, dir) } }); }
export function reorderPath(unitIds: string[], from: string, to: string): void { setCfg({ view: { order: reorderList(unitIds, from, to) } }); }
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
export function setDeadline(d: DeadlineConfig | undefined): void {
  if (!d) { setCfg({ deadline: undefined }); return; }
  const prev = config.value.deadline;
  const tier = tierOf(config.value);
  // Required minutes of the FULL path under the current goals/knowledge (deadline-independent).
  const required = fullRequiredMin(buildInputFor({ ...config.value, deadline: d }), tier);
  let next: DeadlineConfig;
  if (!prev?.startedAtMs) {
    next = { ...d, startedAtMs: Date.now(), baselineRequiredMin: required };
  } else {
    // Keep the original anchor; raise the baseline only if scope grew (so "done" never goes negative).
    next = { ...d, startedAtMs: prev.startedAtMs, baselineRequiredMin: Math.max(prev.baselineRequiredMin ?? 0, required) };
  }
  setCfg({ deadline: next });
}
export function resetPath(): void {
  knowledge.value = emptyState();
  // Reset returns the learner to a brand-new state, so the fresh config uses the cold-start goal.
  config.value = defaultStoredConfig(true);
  if (typeof window !== "undefined") { try { localStorage.removeItem(K_KEY); localStorage.removeItem(C_KEY); } catch {} }
}

export function loosenUnit(unitId: string): void {
  overrides.value = mergeOverrides(overrides.value, { removeEdges: loosenUnitEdges(unitId, units, concepts) });
}
export function addOverrideEdge(concept: string, requires: string, kind: "add" | "remove"): void {
  const patch: Overrides = kind === "add" ? { addEdges: [{ concept, requires }] } : { removeEdges: [{ concept, requires }] };
  overrides.value = mergeOverrides(overrides.value, patch);
}
export function removeOverrideEntry(kind: "add" | "remove", concept: string, requires: string): void {
  const cur = overrides.value;
  const drop = (es: { concept: string; requires: string }[] = []) => es.filter((e) => !(e.concept === concept && e.requires === requires));
  overrides.value = kind === "add" ? { ...cur, addEdges: drop(cur.addEdges) } : { ...cur, removeEdges: drop(cur.removeEdges) };
}
export function clearOverrides(): void {
  overrides.value = { addEdges: [], removeEdges: [], retag: [] };
}
export function conceptExists(id: string): boolean { return conceptById.has(id); }

export function exportState(now: number): void {
  const bundle = serializeStateBundle(
    { knowledge: knowledge.value, config: config.value, overrides: overrides.value, userState: userState.value },
    now,
  );
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `awesome-path-state-${now}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export function importState(text: string): { ok: true } | { ok: false; error: string } {
  const r = parseStateBundle(text);
  if (!r.ok) return r;
  const b = r.bundle;
  try {
    // Build every section first; assigning signals can't throw, so we commit only after all
    // sections parse cleanly — no half-write on a malformed-but-version-valid bundle.
    const nextKnowledge = b.pathKnowledge ? deserializeKnowledge(b.pathKnowledge) : undefined;
    let nextConfig: StoredPathConfig | undefined;
    if (b.pathConfig) {
      const merged = mergeConfig(b.pathConfig as any) as StoredPathConfig;
      const order = (b.pathConfig as any).view?.order;
      merged.view = { order: Array.isArray(order) ? order : [] };
      nextConfig = merged;
    }
    const nextOverrides = b.pathOverrides
      ? { addEdges: b.pathOverrides.addEdges ?? [], removeEdges: b.pathOverrides.removeEdges ?? [], retag: [] }
      : undefined;
    if (nextKnowledge) knowledge.value = nextKnowledge;
    if (nextConfig) config.value = nextConfig;
    if (nextOverrides) overrides.value = nextOverrides;
    if (b.userState) importUserState(b.userState as any);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

export function activeGoals() {
  return config.value.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
}
export function applyDiagnosticResult(concept: string, correctFrac: number): void {
  knowledge.value = applyDiagnostic(knowledge.value, graph, concept, correctFrac, Date.now());
}
export function nextCalibrationProbe(): string | null {
  const frontier = targetFrontier(activeGoals(), config.value, concepts);
  return pickProbe(effectiveKnowledge(), graph, frontier, diagnosedConcepts, config.value.weights.masteryThreshold);
}

// Stratified general placement: 8 domain families × `perFamily` keystone probes, re-planned by
// the caller between families so earlier propagation prunes later probes.
export function placementBatches(exclude: Set<string>, perFamily = 2): { family: string; concepts: string[] }[] {
  const fams = DOMAIN_FAMILIES.map((f) => ({ key: f.key, tracks: f.tracks as string[] }));
  return placementPlan(effectiveKnowledge(), graph, diagnosedConcepts, fams, perFamily, exclude);
}
export function unitProbeConcepts(unitId: string): string[] {
  return (teachesByUnit.get(unitId) ?? []).filter((c) => diagnosedConcepts.has(c));
}

// ── probabilistic placement bridge (bayes.ts ↔ runtime content/knowledge) ──────
// Connects the pure Bayes model to the committed content bundle: band/irt/family
// lookups, prior seeding from self-placement, and posterior write-back via applyDiagnostic.
export function conceptBand(id: string): Band {
  return (conceptById.get(id)?.band ?? "surface") as Band;
}

// IRT for a concept's first item (used to rank concepts by expected info-gain).
export function conceptIrt(id: string): Irt {
  // bundle mcq items carry `choices` at runtime though DiagItem does not declare it.
  const it = diagnostics[id]?.items?.[0] as (DiagItem & { choices?: unknown[] }) | undefined;
  const choices = Array.isArray(it?.choices) ? it.choices.length : 0;
  return resolveIrt(it?.irt, conceptBand(id), it?.type ?? "mcq", choices);
}

// IRT for a specific answered item (used during posterior updates).
export function itemIrt(conceptId: string, item: { type: "mcq" | "blanks"; choices?: unknown[]; irt?: Irt }): Irt {
  const choices = Array.isArray(item.choices) ? item.choices.length : 0;
  return resolveIrt(item.irt, conceptBand(conceptId), item.type, choices);
}

// Diagnosable concepts of a domain family (by track membership).
export function familyConcepts(familyKey: string): string[] {
  const fam = DOMAIN_FAMILIES.find((f) => f.key === familyKey);
  if (!fam) return [];
  const tracks = new Set(fam.tracks as string[]);
  return [...diagnosedConcepts].filter((id) => tracks.has(conceptById.get(id)?.track as string));
}

export const families = () =>
  DOMAIN_FAMILIES.map((f) => ({ key: f.key, label: f.label, hue: f.hue, tracks: f.tracks as string[] }));

// Initial prior map for a set of concepts from per-family self-placement.
export function seedPriors(conceptIds: string[], selfByFamily: Record<string, SelfPlace>): Map<string, number> {
  const famOf = new Map<string, string>();
  for (const f of DOMAIN_FAMILIES) for (const tr of f.tracks as string[]) famOf.set(tr, f.key);
  const priors = new Map<string, number>();
  for (const id of conceptIds) {
    const track = conceptById.get(id)?.track as string;
    const self = selfByFamily[famOf.get(track) ?? ""] ?? "never";
    priors.set(id, priorFor(self, conceptBand(id)));
  }
  return priors;
}

// Collapse a final posterior map into KnowledgeState (source "diagnostic"), reusing applyDiagnostic
// so propagation-on-write matches legacy calibrate and existing guards hold.
// Note: propagation thresholds intentionally differ between the in-flight Bayes model
// (bayes.PASS=0.7 / FAIL=0.3) and this committed write-back (applyDiagnostic's PASS_HIGH=0.6 /
// FAIL_LOW=0.4) — the write-back deliberately follows the legacy calibrate contract.
export function writePlacementPosteriors(posteriors: Map<string, number>, now: number): void {
  let next = knowledge.value;
  for (const [id, p] of posteriors) {
    const { confidence } = collapse(p);
    next = applyDiagnostic(next, graph, id, confidence, now);
  }
  knowledge.value = next;
}

// ── deadline read-models for the UI (pace + optimization suggestions) ──────────
export function currentPace(): Pace | null {
  const cfg = config.value;
  const dl = cfg.deadline;
  if (!dl?.startedAtMs || dl.baselineRequiredMin == null) return null;
  const { path } = computePath();
  const tier = tierOf(cfg);
  const required = path.steps.reduce((n, s) => n + Math.round(s.estMin * tierEffort(tier)), 0);
  // Scope growth (content updates re-adding units) must never read as regress: when required
  // exceeds the stored baseline, the baseline is effectively the new required.
  const baseline = Math.max(dl.baselineRequiredMin, required);
  const now = Date.now();
  const sd = (a: number, b: number) => studyDays(a, b, dl.perWeekdayHours, dl.blackoutDates ?? [], dl.tzOffsetMin);
  const HORIZON_MS = 365 * 86_400_000;
  return pace({
    baselineMin: baseline,
    currentRequiredMin: required,
    elapsedAvailMin: availableMinutes(sd(dl.startedAtMs, Math.min(now, dl.targetDateMs))),
    totalAvailMin: availableMinutes(sd(dl.startedAtMs, dl.targetDateMs)),
    futureDays: sd(now, dl.targetDateMs + HORIZON_MS),
    targetMs: dl.targetDateMs,
    nowMs: now,
  });
}

// Build the LeverInputs from the live schedule + what-if deltas, then suggest fixes.
export function currentFixes(): { fixes: Fix[]; combo: Fix[]; deficitMin: number } {
  const cfg = config.value;
  const dl = cfg.deadline;
  const { path, schedule } = computePath();
  if (!dl || !schedule) return { fixes: [], combo: [], deficitMin: 0 };

  const deficitMin = schedule.feasibility.verdict === "over" ? schedule.feasibility.deltaMin : 0;
  const behind = currentPace()?.status === "behind";
  // Healthy plan and on/ahead of pace → no suggestions needed; skip all lever computation.
  if (deficitMin <= 0 && !behind) return { fixes: [], combo: [], deficitMin: 0 };

  const tier = tierOf(cfg);
  const now = Date.now();

  // raise-hours: add H to every currently-active weekday remaining to the date.
  const remainingHours = (perDay: number[]) =>
    availableMinutes(studyDays(now, dl.targetDateMs, perDay, dl.blackoutDates ?? [], dl.tzOffsetMin));
  const baseAvail = remainingHours(dl.perWeekdayHours);
  const bump = (h: number) => remainingHours(dl.perWeekdayHours.map((x) => (x > 0 ? x + h : x))) - baseAvail;
  const raiseHours = [{ hours: 0.5, deltaMin: bump(0.5) }, { hours: 1, deltaMin: bump(1) }].filter((r) => r.deltaMin > 0);

  // extend-date: add D days of availability at the current weekday pattern.
  const extend = (days: number) =>
    availableMinutes(studyDays(now, dl.targetDateMs + days * 86_400_000, dl.perWeekdayHours, dl.blackoutDates ?? [], dl.tzOffsetMin)) - baseAvail;
  const extendDate = [{ days: 7, deltaMin: extend(7) }, { days: 14, deltaMin: extend(14) }].filter((e) => e.deltaMin > 0);

  // lower-depth: one tier step down, if any (cheap arithmetic).
  const lower: Record<Tier, Tier | null> = { senior: "middle", middle: "junior", junior: null };
  const lowerTier = lower[tier];
  const required = path.steps.reduce((n, s) => n + Math.round(s.estMin * tierEffort(tier)), 0);
  const lowerDepth = lowerTier
    ? { tier: lowerTier, deltaMin: Math.max(0, required - Math.round(required * (tierEffort(lowerTier) / tierEffort(tier)))) }
    : undefined;

  // Scope-cut levers (expensive: each calls buildPath twice). Only compute when there is a real deficit.
  let dropGoal: LeverInputs["dropGoal"]; let excludeTrack: LeverInputs["excludeTrack"];
  if (deficitMin > 0) {
    const input = buildInputFor(cfg);
    const ranked = normalizeRanks(cfg.goals);
    const lowestRankId = ranked.length ? ranked[ranked.length - 1].id : null;
    if (lowestRankId) {
      dropGoal = { goalId: lowestRankId, label: goalById.get(lowestRankId)?.label.en ?? lowestRankId, deltaMin: goalDropDeltaMin(input, tier, lowestRankId) };
    }
    const pathTracks = [...new Set(path.steps.map((s) => s.track))].filter((trk) => !cfg.excludedTracks.includes(trk));
    // 0.5 floor mirrors planner's goalTrackWeight and guards Math.max() against an empty goals list (→ -Infinity → NaN sort).
    const weightOf = (trk: string) => Math.max(0.5, ...input.goals.map((g) => g.trackWeights[trk as keyof typeof g.trackWeights] ?? 0.5));
    const lowestTrack = pathTracks.sort((a, b) => weightOf(a) - weightOf(b))[0];
    if (lowestTrack) excludeTrack = { track: lowestTrack, deltaMin: trackExcludeDeltaMin(input, tier, lowestTrack) };
  }

  const levers: LeverInputs = { deficitMin, raiseHours, extendDate, lowerDepth, dropGoal, excludeTrack, behind: !!behind };
  const fixes = suggestFixes(levers);
  return { fixes, combo: bestCombo(fixes, deficitMin), deficitMin };
}

// Apply a single fix descriptor through existing mutators.
export function applyFix(fix: Fix): void {
  const cfg = config.value;
  const dl = cfg.deadline;
  switch (fix.kind) {
    case "raise-hours": {
      if (!dl) return;
      const h = fix.patch.hours as number;
      setDeadline({ ...dl, perWeekdayHours: dl.perWeekdayHours.map((x) => (x > 0 ? x + h : x)) });
      break;
    }
    case "extend-date": {
      if (!dl) return;
      setDeadline({ ...dl, targetDateMs: dl.targetDateMs + (fix.patch.days as number) * 86_400_000 });
      break;
    }
    case "lower-depth":
      setKnob({ depthTier: fix.patch.tier as Tier });
      break;
    case "drop-goal":
      setGoals(cfg.goals.filter((g) => g.id !== (fix.patch.goalId as string)));
      break;
    case "exclude-track":
      toggleExcludedTrack(fix.patch.track as string);
      break;
  }
}

export function applyCombo(combo: Fix[]): void { for (const f of combo) applyFix(f); }

/** Live weak-spots for the planning UI: units teaching below-mastery goal-frontier concepts
 *  that the learner keeps failing (practice struggle or SRS lapses), ranked by priority.
 *  Empty when there is no failure signal — the normal path then drives (no remediation trap). */
export function currentWeakSpots(): WeakSpot[] {
  if (typeof window === "undefined") return [];
  const cfg = config.value; // subscribe
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  if (!goalObjs.length) {
    const fallback = goalById.get("senior-fullstack");
    if (fallback) goalObjs.push(fallback);
  }
  const frontier = new Set(targetFrontier(goalObjs, cfg, concepts));
  return rankWeakSpots({
    frontier,
    knowledge: effectiveKnowledge(), // subscribes to knowledge via decay(knowledge.value, …)
    masteryThreshold: cfg.weights.masteryThreshold,
    teachesByUnit,
    struggleByUnit: unitStruggleFractions(readAttemptsAll(), unitLessonCounts),
    healthByUnit: unitReviewHealth(allCards(), Date.now()),
  });
}

/** How close the study rating is to going live (the evidence gate in syncEffectiveRating).
 *  Mirrors the goal frontier that gate builds; SSR-safe (null off-window). Lets the dashboard
 *  show an "X/N proven" badge while the rating is still provisional instead of a frozen number. */
export function currentEvidenceProgress(): EvidenceProgress | null {
  if (typeof window === "undefined") return null;
  const goalObjs = config.value.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  if (!goalObjs.length) {
    const fb = goalById.get("senior-fullstack");
    if (fb) goalObjs.push(fb);
  }
  const frontier = new Set(targetFrontier(goalObjs, config.value, concepts));
  return evidenceProgress(frontier, effectiveKnowledge());
}

export interface Readiness {
  displayRating: number;
  displayRank: string;
  placedRating: number;
  movedUp: boolean;
  barRating: number;
  forecast: RatingForecast | null;
  pace: Pace | null;
  weakSpots: WeakSpot[];
  interviewReadiness: number | null;
  recalibration: CalibrationFreshness;
  evidence: EvidenceProgress | null;
}

/** One bundle for the readiness dashboard: live rank (high-water), the senior-by-date
 *  forecast, weak spots, and the persisted interview readiness. Reuses the existing tested
 *  selectors; SSR-safe ([] / nulls on the server). */
export function currentReadiness(): Readiness {
  const s = userState.value;            // subscribe
  const cfg = config.value;             // subscribe
  const pretest = s.pretest;
  const placedRating = pretest?.rating ?? 0;
  const peakRating = s.progression.peakRating ?? 0;
  const displayRating = Math.max(placedRating, peakRating);
  const displayRank = ratingToRank(displayRating).id;
  const movedUp = !!pretest && displayRating > placedRating;

  const goalsSorted = [...cfg.goals].sort((a, b) => a.priority - b.priority);
  const goalId = goalsSorted[0]?.id ?? "senior-fullstack";
  const barRating = barRatingForGoal(goalId);
  const effRating = Math.max(placedRating, s.progression.studyEma ?? 0);
  const dl = cfg.deadline;
  const p = typeof window === "undefined" ? null : currentPace();
  const forecast = dl ? projectRatingDate(effRating, barRating, p?.projectedFinishMs ?? null, dl.targetDateMs) : null;

  return {
    displayRating,
    displayRank,
    placedRating,
    movedUp,
    barRating,
    forecast,
    pace: p,
    weakSpots: typeof window === "undefined" ? [] : currentWeakSpots(),
    interviewReadiness: s.progression.interviewReadiness ?? null,
    recalibration: calibrationFreshness(
      pretest?.rating ?? null,
      pretest?.takenAt ?? null,
      s.progression.studyEma,
      Date.now(),
    ),
    evidence: typeof window === "undefined" ? null : currentEvidenceProgress(),
  };
}

