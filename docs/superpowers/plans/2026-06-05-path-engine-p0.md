# Path Engine P0 (Pure Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic, fully-unit-tested pure core of the personalized path engine (concept graph, knowledge state, diagnostic selection, path planner, deadline scheduler, config) against a hand-seeded 3-track fixture, proving the whole what-to-learn-next + schedule loop before any content bootstrap or UI.

**Architecture:** Seven pure TypeScript modules under `site/src/scripts/path/`, no I/O and no `Date.now()` (all clock values passed in), mirroring the discipline of the `competency.ts` module this engine replaces. A hand-authored mini concept graph (networking + databases + distributed) drives TDD. Tests are co-located `*.test.ts` run by Vitest.

**Tech Stack:** TypeScript, Vitest 2.1 (`bunx vitest run`), `~` → `src/` path alias. Band type reused from `~/components/atlas/track-band`; `Track`/`Tier` from `~/types`.

**Scope note:** This plan covers **P0 only** (spec §11). P1 (LLM content bootstrap), P2 (UI), P3 (polish) get their own plans authored after P0 locks the exported types and signatures — planning their tasks in full detail now would depend on not-yet-final interfaces.

**Reference spec:** `docs/superpowers/specs/2026-06-05-personalized-path-engine-design.md`

---

## File Structure

All paths relative to `site/`.

- `src/scripts/path/types.ts` — all shared types (Concept, UnitConcepts, KnowledgeState, Goal, PathConfig, PathStep, Path, Schedule, Feasibility, …). No logic.
- `src/scripts/path/__fixtures__/mini-graph.ts` — hand-seeded 3-track concepts, unit-concepts, goals; the single source of truth for every test's data.
- `src/scripts/path/graph.ts` — concept DAG: build (+overrides), validateAcyclic, topoSort, ancestors, descendants, induceUnitGraph.
- `src/scripts/path/config.ts` — PathConfig DEFAULTS + clamp/validate/merge.
- `src/scripts/path/knowledge.ts` — KnowledgeState ops: seed, applyDiagnostic (+propagation), applyActivity, applySelfDeclare, decay, masteryOf, isKnown.
- `src/scripts/path/diagnostic-select.ts` — nextProbe (max-info-gain concept to test).
- `src/scripts/path/planner.ts` — targetFrontier, missingConcepts, conceptsToUnits, orderUnits, interleaveReviews, buildPath.
- `src/scripts/path/schedule.ts` — studyDays, availableMinutes, feasibility (+over-budget triage), schedulePlan.

Each module has a co-located `*.test.ts`. Single-file test command: `bunx vitest run src/scripts/path/<name>.test.ts`. Full suite: `bun run test`.

---

## Task 0: Types + fixtures scaffold

**Files:**
- Create: `src/scripts/path/types.ts`
- Create: `src/scripts/path/__fixtures__/mini-graph.ts`
- Test: `src/scripts/path/__fixtures__/mini-graph.test.ts`

- [ ] **Step 1: Write `types.ts`** (no logic, so it has no dedicated failing test; it is validated by every later test compiling against it)

```ts
// site/src/scripts/path/types.ts
import type { Track, Tier } from "~/types";
import type { Band } from "~/components/atlas/track-band";

export type { Band };

export interface Concept {
  id: string;
  label: { en: string; ru: string };
  track: Track;
  band: Band;
  requires: string[]; // concept-level prereq ids (DAG edges)
}

export interface UnitConcepts {
  unit: string; // "<track>/<unit-slug>"
  track: Track;
  teaches: string[];
  requires: string[];
  estMin: number;
}

export type Source = "pretest" | "diagnostic" | "activity" | "declared";
export interface ConceptMastery { confidence: number; source: Source; lastAt: number; }
export type KnowledgeState = Map<string, ConceptMastery>;

export interface Goal {
  id: string;
  label: { en: string; ru: string };
  target: { rule?: string; concepts?: string[] };
  trackWeights: Partial<Record<Track, number>>;
}

export interface DeadlineConfig {
  targetDateMs: number;
  perWeekdayHours: number[]; // length 7, Mon..Sun; 0 = day off
  blackoutDates?: string[];  // ISO "YYYY-MM-DD"
  tzOffsetMin: number;       // minutes; keeps the core clock-free
}

export interface PathWeights {
  prior: number; lessons: number; practice: number; recency: number;
  masteryThreshold: number; // concept "known" cutoff
  decayFloor: number;       // base confidence floor after decay
}

export interface PathConfig {
  version: number;
  goals: { id: string; priority: number }[];
  customTargets?: string[];
  excludedTracks: string[];
  breadthVsDepth: number; // 0 = depth-first … 1 = breadth-first
  depthTier: Tier | Partial<Record<Track, Tier>>;
  pace: { stepsAhead: number; srsAggressiveness: number };
  weights: PathWeights;
  deadline?: DeadlineConfig;
}

export type StepKind = "learn" | "review" | "check";
export interface PathStep {
  unit: string; track: Track; unlocks: string[]; reason: string; kind: StepKind; estMin: number;
}
export interface Path { steps: PathStep[]; }

export interface Feasibility { verdict: "fits" | "over" | "under"; deltaMin: number; dropped: string[]; }
export interface DayPlan { date: string; minutes: number; steps: PathStep[]; }
export interface Schedule { days: DayPlan[]; feasibility: Feasibility; countdownDays: number; }
```

- [ ] **Step 2: Write `mini-graph.ts` fixture**

```ts
// site/src/scripts/path/__fixtures__/mini-graph.ts
import type { Concept, UnitConcepts, Goal } from "../types";

// 3 tracks, 9 concepts, cross-track edges (replication requires tcp-handshake + mvcc).
export const CONCEPTS: Concept[] = [
  { id: "ip-addressing",   label: { en: "IP addressing", ru: "IP-адресация" },     track: "networking", band: "foundations", requires: [] },
  { id: "ports-sockets",   label: { en: "Ports & sockets", ru: "Порты и сокеты" }, track: "networking", band: "foundations", requires: [] },
  { id: "tcp-handshake",   label: { en: "TCP handshake", ru: "TCP-рукопожатие" },  track: "networking", band: "middle",      requires: ["ip-addressing", "ports-sockets"] },
  { id: "tls",             label: { en: "TLS", ru: "TLS" },                         track: "networking", band: "middle",      requires: ["tcp-handshake"] },
  { id: "relational-model",label: { en: "Relational model", ru: "Реляционная модель" }, track: "databases", band: "surface", requires: [] },
  { id: "indexing",        label: { en: "Indexing", ru: "Индексы" },               track: "databases",  band: "middle",      requires: ["relational-model"] },
  { id: "mvcc",            label: { en: "MVCC", ru: "MVCC" },                       track: "databases",  band: "advanced",    requires: ["indexing"] },
  { id: "replication",     label: { en: "Replication", ru: "Репликация" },         track: "distributed",band: "middle",      requires: ["mvcc", "tcp-handshake"] },
  { id: "consensus",       label: { en: "Consensus", ru: "Консенсус" },            track: "distributed",band: "advanced",    requires: ["replication"] },
];

export const UNITS: UnitConcepts[] = [
  { unit: "networking/01-ip",        track: "networking",  teaches: ["ip-addressing", "ports-sockets"], requires: [],                          estMin: 30 },
  { unit: "networking/02-tcp",       track: "networking",  teaches: ["tcp-handshake"],                  requires: ["ip-addressing", "ports-sockets"], estMin: 40 },
  { unit: "networking/03-tls",       track: "networking",  teaches: ["tls"],                            requires: ["tcp-handshake"],           estMin: 50 },
  { unit: "databases/01-rel",        track: "databases",   teaches: ["relational-model"],               requires: [],                          estMin: 30 },
  { unit: "databases/02-index",      track: "databases",   teaches: ["indexing"],                       requires: ["relational-model"],        estMin: 45 },
  { unit: "databases/03-mvcc",       track: "databases",   teaches: ["mvcc"],                           requires: ["indexing"],                estMin: 60 },
  { unit: "distributed/01-repl",     track: "distributed", teaches: ["replication"],                    requires: ["mvcc", "tcp-handshake"],   estMin: 55 },
  { unit: "distributed/02-consensus",track: "distributed", teaches: ["consensus"],                      requires: ["replication"],             estMin: 70 },
];

export const GOALS: Goal[] = [
  { id: "senior-fullstack", label: { en: "Senior fullstack", ru: "Senior fullstack" }, target: { rule: "band>=middle" },
    trackWeights: { networking: 1.0, databases: 1.0, distributed: 1.0 } },
  { id: "backend-job", label: { en: "Backend job", ru: "Бэкенд-работа" }, target: { concepts: ["indexing", "mvcc", "tcp-handshake"] },
    trackWeights: { databases: 1.0, networking: 0.8, distributed: 0.6 } },
];

// Deterministic track ordering passed into the planner (mirrors tracks.json `order`).
export const TRACK_ORDER = new Map<string, number>([
  ["networking", 1], ["databases", 2], ["distributed", 3],
]);
```

- [ ] **Step 3: Write the fixture sanity test**

```ts
// site/src/scripts/path/__fixtures__/mini-graph.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS } from "./mini-graph";

describe("mini-graph fixture", () => {
  it("every concept's requires resolve to known ids", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const c of CONCEPTS) for (const r of c.requires) expect(ids.has(r)).toBe(true);
  });
  it("every concept is taught by at least one unit", () => {
    const taught = new Set(UNITS.flatMap((u) => u.teaches));
    for (const c of CONCEPTS) expect(taught.has(c.id)).toBe(true);
  });
  it("explicit goal targets reference real concepts", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const g of GOALS) for (const t of g.target.concepts ?? []) expect(ids.has(t)).toBe(true);
  });
});
```

- [ ] **Step 4: Run the test**

Run: `bunx vitest run src/scripts/path/__fixtures__/mini-graph.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/types.ts src/scripts/path/__fixtures__/
git commit -m "feat(path): P0 types + mini-graph fixture"
```

---

## Task 1: `graph.ts` — concept DAG operations

**Files:**
- Create: `src/scripts/path/graph.ts`
- Test: `src/scripts/path/graph.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/graph.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS } from "./__fixtures__/mini-graph";
import { buildConceptGraph, validateAcyclic, topoSort, ancestors, descendants, induceUnitGraph } from "./graph";

describe("graph", () => {
  const g = buildConceptGraph(CONCEPTS);

  it("validateAcyclic passes for the fixture", () => {
    expect(validateAcyclic(g).ok).toBe(true);
  });

  it("detects a cycle", () => {
    const cyclic = buildConceptGraph([
      { id: "a", label: { en: "a", ru: "a" }, track: "networking", band: "middle", requires: ["b"] },
      { id: "b", label: { en: "b", ru: "b" }, track: "networking", band: "middle", requires: ["a"] },
    ]);
    expect(validateAcyclic(cyclic).ok).toBe(false);
  });

  it("topoSort places prereqs before dependents", () => {
    const order = topoSort(g);
    const idx = (id: string) => order.indexOf(id);
    expect(idx("ip-addressing")).toBeLessThan(idx("tcp-handshake"));
    expect(idx("tcp-handshake")).toBeLessThan(idx("replication"));
    expect(idx("indexing")).toBeLessThan(idx("mvcc"));
    expect(idx("mvcc")).toBeLessThan(idx("replication")); // cross-track
  });

  it("ancestors returns transitive prereqs", () => {
    expect(ancestors(g, "replication")).toEqual(
      new Set(["mvcc", "tcp-handshake", "indexing", "relational-model", "ip-addressing", "ports-sockets"]),
    );
  });

  it("descendants returns transitive dependents", () => {
    expect(descendants(g, "tcp-handshake")).toEqual(new Set(["tls", "replication", "consensus"]));
  });

  it("applies addEdges / removeEdges overrides", () => {
    const g2 = buildConceptGraph(CONCEPTS, { removeEdges: [{ concept: "tls", requires: "tcp-handshake" }] });
    expect(ancestors(g2, "tls").has("tcp-handshake")).toBe(false);
    const g3 = buildConceptGraph(CONCEPTS, { addEdges: [{ concept: "indexing", requires: "ip-addressing" }] });
    expect(ancestors(g3, "indexing").has("ip-addressing")).toBe(true);
  });

  it("induceUnitGraph links units that teach a required concept", () => {
    const ug = induceUnitGraph(UNITS, g);
    expect(ug.get("networking/02-tcp")).toEqual(["networking/01-ip"]);
    expect(new Set(ug.get("distributed/01-repl"))).toEqual(new Set(["databases/03-mvcc", "networking/02-tcp"]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/graph.test.ts`
Expected: FAIL — cannot find module `./graph`.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/path/graph.ts
import type { Concept, UnitConcepts } from "./types";

export interface ConceptGraph {
  nodes: Map<string, Concept>;
  requires: Map<string, string[]>;   // id -> direct prereq ids
  requiredBy: Map<string, string[]>; // id -> direct dependents
}

export interface Overrides {
  addEdges?: { concept: string; requires: string }[];
  removeEdges?: { concept: string; requires: string }[];
  retag?: { unit: string; teaches?: string[]; requires?: string[] }[];
}

export function buildConceptGraph(concepts: Concept[], overrides?: Overrides): ConceptGraph {
  const nodes = new Map<string, Concept>();
  const requires = new Map<string, string[]>();
  for (const c of concepts) {
    nodes.set(c.id, c);
    requires.set(c.id, [...c.requires]);
  }
  for (const e of overrides?.addEdges ?? []) {
    const arr = requires.get(e.concept) ?? [];
    if (!arr.includes(e.requires)) arr.push(e.requires);
    requires.set(e.concept, arr);
  }
  for (const e of overrides?.removeEdges ?? []) {
    requires.set(e.concept, (requires.get(e.concept) ?? []).filter((r) => r !== e.requires));
  }
  const requiredBy = new Map<string, string[]>();
  for (const [id, reqs] of requires) {
    for (const r of reqs) {
      const arr = requiredBy.get(r) ?? [];
      arr.push(id);
      requiredBy.set(r, arr);
    }
  }
  return { nodes, requires, requiredBy };
}

// Kahn's algorithm; ids processed in sorted order for deterministic output.
export function topoSort(g: ConceptGraph): string[] {
  const indeg = new Map<string, number>();
  for (const id of g.nodes.keys()) indeg.set(id, (g.requires.get(id) ?? []).length);
  const ready = [...indeg].filter(([, d]) => d === 0).map(([id]) => id).sort();
  const out: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    out.push(id);
    for (const dep of (g.requiredBy.get(id) ?? []).slice().sort()) {
      const d = (indeg.get(dep) ?? 0) - 1;
      indeg.set(dep, d);
      if (d === 0) { ready.push(dep); ready.sort(); }
    }
  }
  return out;
}

export function validateAcyclic(g: ConceptGraph): { ok: boolean; cycle?: string[] } {
  const order = topoSort(g);
  if (order.length === g.nodes.size) return { ok: true };
  const placed = new Set(order);
  return { ok: false, cycle: [...g.nodes.keys()].filter((id) => !placed.has(id)) };
}

function closure(start: string, adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(adj.get(start) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of adj.get(id) ?? []) stack.push(n);
  }
  return seen;
}

export const ancestors = (g: ConceptGraph, id: string): Set<string> => closure(id, g.requires);
export const descendants = (g: ConceptGraph, id: string): Set<string> => closure(id, g.requiredBy);

// Unit A is a prereq of unit U iff A teaches a concept U directly requires.
export function induceUnitGraph(units: UnitConcepts[], _g: ConceptGraph): Map<string, string[]> {
  const teacherOf = new Map<string, string[]>(); // concept -> units teaching it
  for (const u of units) for (const c of u.teaches) {
    const arr = teacherOf.get(c) ?? [];
    arr.push(u.unit);
    teacherOf.set(c, arr);
  }
  const out = new Map<string, string[]>();
  for (const u of units) {
    const prereqUnits = new Set<string>();
    for (const c of u.requires) for (const t of teacherOf.get(c) ?? []) if (t !== u.unit) prereqUnits.add(t);
    out.set(u.unit, [...prereqUnits].sort());
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/graph.test.ts`
Expected: PASS (7 passing).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/graph.ts src/scripts/path/graph.test.ts
git commit -m "feat(path): concept DAG ops (build/topo/closure/induce)"
```

---

## Task 2: `config.ts` — PathConfig defaults + clamp/merge

**Files:**
- Create: `src/scripts/path/config.ts`
- Test: `src/scripts/path/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/config.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, mergeConfig, clampConfig } from "./config";

describe("config", () => {
  it("DEFAULT_CONFIG is internally valid (clamp is a no-op on it)", () => {
    expect(clampConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
  });
  it("clamps breadthVsDepth and priorities into range", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, breadthVsDepth: 5, pace: { stepsAhead: -3, srsAggressiveness: 9 } });
    expect(c.breadthVsDepth).toBe(1);
    expect(c.pace.stepsAhead).toBe(1);          // floor of 1 step
    expect(c.pace.srsAggressiveness).toBe(1);   // 0..1
  });
  it("mergeConfig overlays a stored partial onto defaults", () => {
    const c = mergeConfig({ excludedTracks: ["frontend"], goals: [{ id: "backend-job", priority: 2 }] });
    expect(c.excludedTracks).toEqual(["frontend"]);
    expect(c.goals).toEqual([{ id: "backend-job", priority: 2 }]);
    expect(c.breadthVsDepth).toBe(DEFAULT_CONFIG.breadthVsDepth); // untouched fields keep defaults
  });
  it("normalizes a too-old version by re-merging onto current defaults", () => {
    const c = mergeConfig({ version: 0 } as any);
    expect(c.version).toBe(DEFAULT_CONFIG.version);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/config.test.ts`
Expected: FAIL — cannot find module `./config`.

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/config.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/config.ts src/scripts/path/config.test.ts
git commit -m "feat(path): PathConfig defaults + clamp/merge"
```

---

## Task 3: `knowledge.ts` — knowledge state + propagation + decay

**Files:**
- Create: `src/scripts/path/knowledge.ts`
- Test: `src/scripts/path/knowledge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/knowledge.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import {
  emptyState, masteryOf, isKnown, applyDiagnostic, applyActivity, applySelfDeclare, decay,
  ACTIVITY_CAP, PROP_UP_FACTOR,
} from "./knowledge";

const g = buildConceptGraph(CONCEPTS);
const NOW = 1_000_000_000_000;

describe("knowledge", () => {
  it("masteryOf is 0 for an untouched concept", () => {
    expect(masteryOf(emptyState(), "tcp-handshake")).toBe(0);
  });

  it("applyDiagnostic sets confidence and lifts prereqs (down the closure)", () => {
    const s = applyDiagnostic(emptyState(), g, "replication", 1, NOW);
    expect(masteryOf(s, "replication")).toBe(1);
    // passing an advanced concept lifts every prereq to >= correctFrac*PROP_UP_FACTOR
    expect(masteryOf(s, "tcp-handshake")).toBeCloseTo(PROP_UP_FACTOR, 5);
    expect(masteryOf(s, "mvcc")).toBeCloseTo(PROP_UP_FACTOR, 5);
    expect(masteryOf(s, "ip-addressing")).toBeCloseTo(PROP_UP_FACTOR, 5);
  });

  it("a failed basic concept lowers its dependents (up the closure)", () => {
    let s = applyDiagnostic(emptyState(), g, "tls", 0.9, NOW); // tls high
    s = applyDiagnostic(s, g, "tcp-handshake", 0.1, NOW);       // but fail the prereq
    expect(masteryOf(s, "tls")).toBeLessThanOrEqual(0.1);       // dependent dragged down
  });

  it("applyActivity bumps taught concepts but never above ACTIVITY_CAP nor over diagnostic evidence", () => {
    let s = applyActivity(emptyState(), ["indexing"], 1, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(ACTIVITY_CAP, 5);
    s = applyDiagnostic(s, g, "indexing", 0.95, NOW);   // stronger evidence wins
    s = applyActivity(s, ["indexing"], 1, NOW);          // activity must not lower it
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.95, 5);
  });

  it("applySelfDeclare marks known/unknown", () => {
    const s = applySelfDeclare(emptyState(), "mvcc", true, NOW);
    expect(isKnown(s, "mvcc", 0.6)).toBe(true);
    const s2 = applySelfDeclare(s, "mvcc", false, NOW);
    expect(isKnown(s2, "mvcc", 0.6)).toBe(false);
  });

  it("decay erodes stale confidence toward the floor, fresh is untouched", () => {
    const s = applyDiagnostic(emptyState(), g, "indexing", 1, NOW);
    const fresh = decay(s, g, NOW + 10 * 86_400_000, 0.85);
    expect(masteryOf(fresh, "indexing")).toBe(1);                 // < 30d: no decay
    const stale = decay(s, g, NOW + 200 * 86_400_000, 0.85);
    expect(masteryOf(stale, "indexing")).toBeCloseTo(0.85, 5);    // >= 120d: floor
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/knowledge.test.ts`
Expected: FAIL — cannot find module `./knowledge`.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/path/knowledge.ts
import type { KnowledgeState, ConceptMastery, Source } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

const DAY = 86_400_000;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const ACTIVITY_CAP = 0.5;   // activity alone can't exceed this
export const PROP_UP_FACTOR = 0.8; // share of a passed concept's confidence granted to prereqs
export const PASS_HIGH = 0.6;      // >= => "passed", propagate up-closure lift
export const FAIL_LOW = 0.4;       // <  => "failed", propagate down to dependents
const FRESH_DAYS = 30, STALE_DAYS = 120;
const STRONG: Source[] = ["diagnostic", "declared"];

export const emptyState = (): KnowledgeState => new Map();

export function masteryOf(state: KnowledgeState, concept: string): number {
  return state.get(concept)?.confidence ?? 0;
}
export const isKnown = (state: KnowledgeState, concept: string, threshold: number): boolean =>
  masteryOf(state, concept) >= threshold;

function setMastery(state: KnowledgeState, id: string, m: ConceptMastery): KnowledgeState {
  const next = new Map(state);
  next.set(id, m);
  return next;
}

export function applyDiagnostic(
  state: KnowledgeState, g: ConceptGraph, concept: string, correctFrac: number, now: number,
): KnowledgeState {
  let next = setMastery(state, concept, { confidence: clamp01(correctFrac), source: "diagnostic", lastAt: now });
  if (correctFrac >= PASS_HIGH) {
    const lift = correctFrac * PROP_UP_FACTOR;
    for (const a of ancestors(g, concept)) {
      if (masteryOf(next, a) < lift) next = setMastery(next, a, { confidence: lift, source: "diagnostic", lastAt: now });
    }
  } else if (correctFrac < FAIL_LOW) {
    for (const d of descendants(g, concept)) {
      if (masteryOf(next, d) > correctFrac) next = setMastery(next, d, { confidence: clamp01(correctFrac), source: "diagnostic", lastAt: now });
    }
  }
  return next;
}

export function applyActivity(state: KnowledgeState, taught: string[], weight: number, now: number): KnowledgeState {
  let next = state;
  const target = clamp01(ACTIVITY_CAP * clamp01(weight));
  for (const c of taught) {
    const cur = next.get(c);
    if (cur && STRONG.includes(cur.source)) continue;     // never override stronger evidence
    if (masteryOf(next, c) >= target) continue;           // never lower
    next = setMastery(next, c, { confidence: target, source: "activity", lastAt: now });
  }
  return next;
}

export function applySelfDeclare(state: KnowledgeState, concept: string, known: boolean, now: number): KnowledgeState {
  return setMastery(state, concept, { confidence: known ? 1 : 0, source: "declared", lastAt: now });
}

// Linear decay from 1.0 (≤FRESH) to `floor` (≥STALE). Never raises; never decays declared=0/1 below floor logic applies uniformly.
export function decay(state: KnowledgeState, _g: ConceptGraph, now: number, floor: number): KnowledgeState {
  const next = new Map<string, ConceptMastery>();
  for (const [id, m] of state) {
    const days = (now - m.lastAt) / DAY;
    let factor = 1;
    if (days >= STALE_DAYS) factor = 0;
    else if (days > FRESH_DAYS) factor = 1 - (days - FRESH_DAYS) / (STALE_DAYS - FRESH_DAYS);
    const confidence = floor + (m.confidence - floor) * factor;
    next.set(id, { ...m, confidence: m.confidence <= floor ? m.confidence : confidence });
  }
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/knowledge.test.ts`
Expected: PASS (6 passing).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/knowledge.ts src/scripts/path/knowledge.test.ts
git commit -m "feat(path): knowledge state, propagation, decay"
```

---

## Task 4: `diagnostic-select.ts` — next probe (max info gain)

**Files:**
- Create: `src/scripts/path/diagnostic-select.ts`
- Test: `src/scripts/path/diagnostic-select.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/diagnostic-select.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { emptyState, applyDiagnostic } from "./knowledge";
import { nextProbe } from "./diagnostic-select";

const g = buildConceptGraph(CONCEPTS);

describe("nextProbe", () => {
  const frontier = ["consensus", "tls", "mvcc"];

  it("picks the unknown concept that prunes the most graph", () => {
    // consensus sits atop the deepest chain -> highest |ancestors|+|descendants|.
    expect(nextProbe(emptyState(), g, frontier, 0.6)).toBe("consensus");
  });

  it("returns null once the frontier is calibrated (no ambiguous concepts left)", () => {
    let s = emptyState();
    for (const c of [...frontier, ...CONCEPTS.map((x) => x.id)]) s = applyDiagnostic(s, g, c, 1, 0);
    expect(nextProbe(s, g, frontier, 0.6)).toBeNull();
  });

  it("is deterministic under ties (sorted id tie-break)", () => {
    const a = nextProbe(emptyState(), g, ["tls", "mvcc"], 0.6);
    const b = nextProbe(emptyState(), g, ["mvcc", "tls"], 0.6);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/diagnostic-select.test.ts`
Expected: FAIL — cannot find module `./diagnostic-select`.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/path/diagnostic-select.ts
import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";
import { masteryOf } from "./knowledge";

const AMBIG_LO = 0.3, AMBIG_HI = 0.7;

// A concept is worth probing if its confidence is unknown/ambiguous. Among the
// frontier ∪ their ancestors, pick the one whose answer prunes the most graph
// (|ancestors|+|descendants|). Deterministic tie-break by id.
export function nextProbe(
  state: KnowledgeState, g: ConceptGraph, frontier: string[], _threshold: number,
): string | null {
  const candidates = new Set<string>();
  for (const f of frontier) {
    candidates.add(f);
    for (const a of ancestors(g, f)) candidates.add(a);
  }
  let best: string | null = null;
  let bestGain = -1;
  for (const id of [...candidates].sort()) {
    const conf = masteryOf(state, id);
    const ambiguous = !state.has(id) || (conf > AMBIG_LO && conf < AMBIG_HI);
    if (!ambiguous) continue;
    const gain = ancestors(g, id).size + descendants(g, id).size;
    if (gain > bestGain) { bestGain = gain; best = id; }
  }
  return best;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/diagnostic-select.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/diagnostic-select.ts src/scripts/path/diagnostic-select.test.ts
git commit -m "feat(path): adaptive next-probe selection"
```

---

## Task 5: `planner.ts` — frontier → missing → units → ordered path

**Files:**
- Create: `src/scripts/path/planner.ts`
- Test: `src/scripts/path/planner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/planner.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { DEFAULT_CONFIG } from "./config";
import { emptyState, applyDiagnostic } from "./knowledge";
import {
  resolveGoalTargets, targetFrontier, missingConcepts, conceptsToUnits, orderUnits, buildPath,
} from "./planner";
import type { PathConfig, Goal } from "./types";

const g = buildConceptGraph(CONCEPTS);
const byId = new Map(CONCEPTS.map((c) => [c.id, c]));
const goalById = new Map(GOALS.map((x) => [x.id, x]));
const cfg = (over: Partial<PathConfig> = {}): PathConfig => ({ ...DEFAULT_CONFIG, ...over });

describe("planner", () => {
  it("resolveGoalTargets expands a band>=middle rule", () => {
    const t = resolveGoalTargets(GOALS[0], CONCEPTS);
    expect(new Set(t)).toEqual(new Set(["tcp-handshake", "tls", "indexing", "mvcc", "replication", "consensus"]));
  });

  it("resolveGoalTargets uses explicit concept lists", () => {
    expect(new Set(resolveGoalTargets(GOALS[1], CONCEPTS))).toEqual(new Set(["indexing", "mvcc", "tcp-handshake"]));
  });

  it("targetFrontier drops excluded tracks", () => {
    const f = targetFrontier([GOALS[0]], cfg({ excludedTracks: ["distributed"] }), CONCEPTS);
    expect(f.some((id) => byId.get(id)!.track === "distributed")).toBe(false);
  });

  it("missingConcepts is the topo-ordered closure of not-yet-known targets", () => {
    const frontier = ["mvcc"];
    const m = missingConcepts(frontier, emptyState(), g, 0.6);
    expect(m).toEqual(["relational-model", "indexing", "mvcc"]); // prereqs first
  });

  it("missingConcepts omits already-known concepts and their satisfied prereqs", () => {
    const s = applyDiagnostic(emptyState(), g, "indexing", 1, 0); // lifts relational-model too
    const m = missingConcepts(["mvcc"], s, g, 0.6);
    expect(m).toEqual(["mvcc"]);
  });

  it("orderUnits puts prereq-ready units first; depth mode groups by track order", () => {
    const units = conceptsToUnits(["tcp-handshake", "mvcc", "indexing", "relational-model", "ip-addressing", "ports-sockets"], UNITS);
    const ordered = orderUnits(units, {
      config: cfg({ breadthVsDepth: 0 }), state: emptyState(), graph: g, units: UNITS,
      goals: [GOALS[0]], concepts: CONCEPTS, trackOrder: TRACK_ORDER,
    });
    const names = ordered.map((u) => u.unit);
    expect(names.indexOf("networking/01-ip")).toBeLessThan(names.indexOf("networking/02-tcp"));
    expect(names.indexOf("databases/01-rel")).toBeLessThan(names.indexOf("databases/02-index"));
    // depth: networking (track order 1) block precedes databases (2)
    expect(names.indexOf("networking/02-tcp")).toBeLessThan(names.indexOf("databases/01-rel"));
  });

  it("buildPath returns at most pace.stepsAhead learn steps, each unlocking a target concept", () => {
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]], config: cfg({ pace: { stepsAhead: 3, srsAggressiveness: 0 } }),
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    expect(path.steps.length).toBe(3);
    expect(path.steps[0].unit).toBe("networking/01-ip"); // foundations frontier first
    expect(path.steps.every((s) => s.kind === "learn")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/planner.test.ts`
Expected: FAIL — cannot find module `./planner`.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/path/planner.ts
import type { Concept, Goal, KnowledgeState, PathConfig, UnitConcepts, Path, PathStep, Band, Track } from "./types";
import type { ConceptGraph } from "./graph";
import { topoSort, ancestors } from "./graph";
import { isKnown } from "./knowledge";

const BAND_RANK: Record<Band, number> = { foundations: 0, surface: 1, middle: 2, advanced: 3 };
const SENIOR_WEIGHT: Record<Band, number> = { middle: 1.0, surface: 0.9, advanced: 0.8, foundations: 0.4 };

export function resolveGoalTargets(goal: Goal, concepts: Concept[]): string[] {
  if (goal.target.concepts) return [...goal.target.concepts];
  const rule = goal.target.rule ?? "";
  const m = rule.match(/^band>=(\w+)$/);
  if (m) {
    const min = BAND_RANK[m[1] as Band] ?? 0;
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
  return w || 0.5;
}

export function orderUnits(units: UnitConcepts[], ctx: OrderCtx): UnitConcepts[] {
  const byId = new Map(ctx.concepts.map((c) => [c.id, c]));
  const threshold = ctx.config.weights.masteryThreshold;
  const ready = (u: UnitConcepts) => u.requires.every((c) => isKnown(ctx.state, c, threshold));
  const bandOf = (u: UnitConcepts): Band => byId.get(u.teaches[0])?.band ?? "middle";
  const value = (u: UnitConcepts) => goalTrackWeight(u.track, ctx.goals, ctx.config) * SENIOR_WEIGHT[bandOf(u)];

  const depthMode = ctx.config.breadthVsDepth < 0.5;
  const withMeta = units.map((u) => ({ u, ready: ready(u) ? 1 : 0, value: value(u), to: ctx.trackOrder.get(u.track) ?? 99 }));

  if (depthMode) {
    return withMeta
      .sort((a, b) => b.ready - a.ready || a.to - b.to || a.u.unit.localeCompare(b.u.unit) || b.value - a.value)
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
  if (!srsDue.length || aggressiveness <= 0) return steps;
  const every = Math.max(1, Math.round((1 - aggressiveness) * 4) + 1); // aggr 1 → every 1, aggr 0 → every 5
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
  const { buildConceptGraph } = require("./graph") as typeof import("./graph"); // graph is pure; build once
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
```

> Note: `buildPath` uses `require("./graph")` to keep the call site simple; if the repo is ESM-strict in tests, replace with a top-level `import { buildConceptGraph } from "./graph"`. Verify in Step 4 — if Vitest errors on `require`, switch to the static import (it is already imported for types).

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/planner.test.ts`
Expected: PASS (7 passing). If a `require is not defined` error appears, change the top of `planner.ts` to `import { topoSort, ancestors, buildConceptGraph } from "./graph";` and delete the inline `require` line in `buildPath`, then re-run.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/planner.ts src/scripts/path/planner.test.ts
git commit -m "feat(path): planner — frontier, missing closure, unit ordering, buildPath"
```

---

## Task 6: `schedule.ts` — deadline mode (study days, feasibility, triage)

**Files:**
- Create: `src/scripts/path/schedule.ts`
- Test: `src/scripts/path/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/schedule.test.ts
import { describe, it, expect } from "vitest";
import { studyDays, availableMinutes, feasibility, schedulePlan } from "./schedule";
import type { PathStep, DeadlineConfig } from "./types";

// 2026-06-08 is a Monday (UTC). Use UTC (tzOffsetMin 0) for predictable civil days.
const MON_2026_06_08 = Date.UTC(2026, 5, 8);
const DAY = 86_400_000;

const cfg = (over: Partial<DeadlineConfig> = {}): DeadlineConfig => ({
  targetDateMs: MON_2026_06_08 + 7 * DAY,            // one week out
  perWeekdayHours: [2, 2, 2, 2, 2, 0, 0],            // Mon..Fri 2h, weekend off
  tzOffsetMin: 0,
  ...over,
});

const step = (unit: string, estMin: number): PathStep =>
  ({ unit, track: "networking", unlocks: [], reason: "", kind: "learn", estMin });

describe("schedule", () => {
  it("studyDays enumerates only days with hours, honoring weekday mask", () => {
    const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0);
    expect(days.map((d) => d.date)).toEqual(["2026-06-08","2026-06-09","2026-06-10","2026-06-11","2026-06-12"]); // Mon..Fri, weekend skipped
    expect(days[0].minutes).toBe(120);
  });

  it("blackoutDates remove a day", () => {
    const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 3 * DAY, [2,2,2,2,2,0,0], ["2026-06-09"], 0);
    expect(days.map((d) => d.date)).toEqual(["2026-06-08","2026-06-10"]);
  });

  it("availableMinutes sums the week", () => {
    expect(availableMinutes(studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0))).toBe(600);
  });

  it("feasibility = fits when budget covers required", () => {
    const f = feasibility(500, 600, []);
    expect(f.verdict).toBe("fits");
    expect(f.dropped).toEqual([]);
  });

  it("over-budget triage drops lowest-ROI units and reports them", () => {
    // required 800 > available 600; droppable sorted by ROI asc: drop until it fits.
    const f = feasibility(800, 600, [
      { id: "low-roi-unit", estMin: 120, roi: 0.1 },
      { id: "mid-roi-unit", estMin: 120, roi: 0.5 },
    ]);
    expect(f.verdict).toBe("over");
    expect(f.dropped).toContain("low-roi-unit");      // lowest ROI dropped first
    expect(f.deltaMin).toBe(200);
  });

  it("schedulePlan packs steps into days up to each day's minutes", () => {
    const path = { steps: [step("a", 90), step("b", 90), step("c", 90)] };
    const s = schedulePlan(path, cfg(), MON_2026_06_08);
    expect(s.days[0].steps.map((x) => x.unit)).toEqual(["a"]);          // 90 <= 120, next (180) overflows
    expect(s.days[1].steps.map((x) => x.unit)).toEqual(["b"]);
    expect(s.countdownDays).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/schedule.test.ts`
Expected: FAIL — cannot find module `./schedule`.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/path/schedule.ts
import type { Path, PathStep, DeadlineConfig, Feasibility, DayPlan, Schedule } from "./types";

const DAY = 86_400_000;

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
  const SLACK = 0.15;
  if (requiredMin <= availableMin) {
    const under = availableMin - requiredMin > availableMin * SLACK;
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

export function schedulePlan(path: Path, cfg: DeadlineConfig, nowMs: number): Schedule {
  const days = studyDays(nowMs, cfg.targetDateMs, cfg.perWeekdayHours, cfg.blackoutDates ?? [], cfg.tzOffsetMin);
  const plan: DayPlan[] = days.map((d) => ({ date: d.date, minutes: d.minutes, steps: [] }));
  const required = path.steps.reduce((n, s) => n + s.estMin, 0);
  const available = availableMinutes(days);

  let di = 0, used = 0;
  const placed = new Set<string>();
  for (const step of path.steps) {
    while (di < plan.length && used + step.estMin > plan[di].minutes) { di++; used = 0; }
    if (di >= plan.length) break;
    plan[di].steps.push(step);
    used += step.estMin;
    placed.add(step.unit);
  }
  const dropUnits = path.steps.filter((s) => !placed.has(s.unit))
    .map((s) => ({ id: s.unit, estMin: s.estMin, roi: 1 / Math.max(1, s.estMin) }));
  const feas = feasibility(required, available, dropUnits);

  const countdownDays = Math.max(0, Math.ceil((cfg.targetDateMs - nowMs) / DAY));
  return { days: plan, feasibility: feas, countdownDays };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/schedule.test.ts`
Expected: PASS (6 passing). If a date string is off by one, confirm the test uses `Date.UTC` and `tzOffsetMin: 0` (the helper is pure UTC-civil).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/schedule.ts src/scripts/path/schedule.test.ts
git commit -m "feat(path): deadline scheduler — study days, feasibility triage, day plan"
```

---

## Task 7: End-to-end integration test + full-suite + typecheck

**Files:**
- Create: `src/scripts/path/engine.integration.test.ts`

- [ ] **Step 1: Write the end-to-end test** (cold-start learner with a deadline → a dated, feasible-or-triaged plan)

```ts
// site/src/scripts/path/engine.integration.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { DEFAULT_CONFIG } from "./config";
import { emptyState, applyDiagnostic } from "./knowledge";
import { buildConceptGraph } from "./graph";
import { buildPath } from "./planner";
import { schedulePlan } from "./schedule";
import type { PathConfig } from "./types";

const goalById = new Map(GOALS.map((g) => [g.id, g]));
const DAY = 86_400_000;
const MON = Date.UTC(2026, 5, 8);

describe("engine integration", () => {
  it("cold-start senior-fullstack path starts at foundations and respects prereqs", () => {
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]],
      config: { ...DEFAULT_CONFIG, pace: { stepsAhead: 8, srsAggressiveness: 0 } },
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    const names = path.steps.map((s) => s.unit);
    expect(names[0]).toBe("networking/01-ip");
    expect(names.indexOf("networking/02-tcp")).toBeLessThan(names.indexOf("distributed/01-repl"));
    expect(names.indexOf("databases/03-mvcc")).toBeLessThan(names.indexOf("distributed/01-repl"));
  });

  it("a learner who already knows mvcc + tcp gets a shorter path", () => {
    let s = emptyState();
    s = applyDiagnostic(s, buildConceptGraph(CONCEPTS), "mvcc", 1, 0);          // lifts indexing, relational-model
    s = applyDiagnostic(s, buildConceptGraph(CONCEPTS), "tcp-handshake", 1, 0); // lifts ip/ports
    const path = buildPath({
      state: s, goals: [GOALS[1]], // backend-job: indexing, mvcc, tcp-handshake — all known/derivable
      config: { ...DEFAULT_CONFIG, pace: { stepsAhead: 8, srsAggressiveness: 0 } },
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    expect(path.steps.length).toBe(0); // nothing left to learn for that goal
  });

  it("deadline mode produces a dated plan and flags over-budget with dropped scope", () => {
    const config: PathConfig = {
      ...DEFAULT_CONFIG,
      deadline: { targetDateMs: MON + 3 * DAY, perWeekdayHours: [1,1,1,0,0,0,0], tzOffsetMin: 0 }, // Mon..Wed 1h = 180 min
    };
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]], config,
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: MON, trackOrder: TRACK_ORDER,
    });
    const sched = schedulePlan(path, config.deadline!, MON);
    expect(sched.days.length).toBe(3);
    expect(sched.feasibility.verdict).toBe("over");        // full senior path >> 180 min
    expect(sched.feasibility.dropped.length).toBeGreaterThan(0);
    expect(sched.countdownDays).toBe(3);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `bunx vitest run src/scripts/path/engine.integration.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 3: Run the full unit suite**

Run: `bun run test`
Expected: all prior tests still pass plus the new `src/scripts/path/*` files (no regressions). Confirm count increased by the path tests.

- [ ] **Step 4: Typecheck**

Run: `bun run check`
Expected: no new TypeScript errors in `src/scripts/path/`. (Pre-existing repo errors unrelated to `path/` are out of scope — note them, don't fix here.)

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/engine.integration.test.ts
git commit -m "test(path): end-to-end engine integration (cold-start, known-skip, deadline triage)"
```

---

## Self-Review (completed during authoring)

**Spec coverage (P0 scope only):**
- Concept DAG + overrides + induced unit graph → Task 1. ✓
- Knowledge state: diagnostic propagation, activity cap, self-declare, decay → Task 3. ✓
- Diagnostic selection (max info gain) → Task 4. ✓
- Planner: frontier (goal rules + explicit + custom + excluded tracks), missing closure, units, ordering under breadth/depth + goal priority + senior weight, review interleave, N-step slice → Task 5. ✓
- Deadline scheduler: study-day enumeration (weekday mask + blackouts + tz), available minutes, over-budget ROI triage with explicit dropped set, dated day plan, countdown → Task 6. ✓
- Config: defaults + clamp + merge (all four knob groups incl. deadline) → Task 2. ✓
- Cold-start default goal senior-fullstack at foundations frontier → Task 7 integration. ✓
- Pure, no `Date.now()`, no I/O; `~` alias; co-located Vitest tests → all tasks. ✓

**Out of P0 (own later plans):** content bootstrap scripts (P1), validators/lint rule (P1), `concept-overrides.json` wiring beyond graph support (P1), pretest→concept seeding from real pretest data (P1/P2), all UI (P2), export/import + LLM explain (P3). The `Overrides` type and `applyDiagnostic` propagation are built P0-ready so P1/P2 plug in without core changes.

**Placeholder scan:** no TBD/TODO; every code step is complete and runnable. The one conditional (`require` vs static import in `buildPath`) is explicitly resolved in Task 5 Step 4.

**Type consistency:** `KnowledgeState`, `PathConfig`, `PathStep`, `Concept`, `UnitConcepts`, `Goal`, `Feasibility`, `Schedule` names/shapes are identical across `types.ts` and every consumer. `masteryThreshold` is the single "known" cutoff used by `knowledge`, `planner`, `diagnostic-select`. `buildConceptGraph`/`topoSort`/`ancestors`/`descendants`/`induceUnitGraph` signatures match between `graph.ts` and callers.
