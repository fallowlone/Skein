# Planning: Role Goals, Depth-as-Time, Deadline Optimizer, Pace & Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend/fullstack/devops role goals, make reading-depth a real time lever, compute quantified deadline-optimization suggestions + pace tracking, surface a "today" focus, move planning above the path list, fix goal-priority semantics, and de-duplicate the goal/deadline editors.

**Architecture:** New pure, unit-tested modules under `site/src/scripts/path/` (`tier-effort`, `goal-rank`, `pace`, `optimize`, `optimize-deltas`) consumed by the existing impure adapter `path-io.ts`. Thin Preact components in `site/src/components/path/planning/` render over signals. P0 graph/knowledge untouched except one additive goal-rule form and two optional `DeadlineConfig` fields.

**Tech Stack:** Astro 5 + Preact + `@preact/signals`, TypeScript, Vitest, `bun` (run from `site/`).

**Spec:** `docs/superpowers/specs/2026-06-08-planning-roles-deadline-optimizer-design.md`

**Conventions for every task below**
- All commands run from `/Users/artemmac/dev/awesome-everything/site`.
- Run a single test file: `bun run test -- src/scripts/path/<file>.test.ts` (Vitest). Run all unit tests: `bun run test`.
- Full gate (Astro build + 9-rule linter): `bun run build`. Expected: build succeeds, lint clean.
- Commit messages use the repo's `content(...)`/`feat(...)`/`fix(...)` style. Do **not** push (user pushes manually); do **not** branch unless the user asks (work proceeds on `main` per the user's standing flow for this repo).

---

## File map

**Create (pure + tested):**
- `src/scripts/path/tier-effort.ts` — tier → effort multiplier.
- `src/scripts/path/tier-effort.test.ts`
- `src/scripts/path/goal-rank.ts` — normalize priorities → consecutive ranks + weight factor.
- `src/scripts/path/goal-rank.test.ts`
- `src/scripts/path/pace.ts` — planned-vs-done pace model.
- `src/scripts/path/pace.test.ts`
- `src/scripts/path/optimize.ts` — assemble + rank fix suggestions over precomputed deltas.
- `src/scripts/path/optimize.test.ts`
- `src/scripts/path/optimize-deltas.ts` — pure full-path required-minute deltas (drop-goal / exclude-track).
- `src/scripts/path/optimize-deltas.test.ts`

**Create (components):**
- `src/components/path/planning/HoursPicker.tsx` — reusable weekday-hours grid with −/+.
- `src/components/path/planning/TodayFocus.tsx` — "today / next up" card.

**Modify:**
- `src/scripts/path/types.ts` — `DeadlineConfig.startedAtMs?`, `.baselineRequiredMin?`.
- `src/scripts/path/planner.ts` — `track-band>=` rule; rank-weighted `goalTrackWeight`.
- `src/scripts/path/planner.test.ts` — cases for both.
- `src/scripts/path/schedule.ts` — tier-scaled minutes.
- `src/scripts/path/schedule.test.ts` — tier-scaling case.
- `src/scripts/path/path-io.ts` — pass tier to `schedulePlan`; baseline stamping; optimize/pace adapter helpers.
- `src/content/path/goals.json` — +3 role presets.
- `src/scripts/path/__fixtures__/mini-graph.ts` — add a `track-band>=` role goal for tests.
- `src/components/path/planning/DeadlineSection.tsx` — use HoursPicker; suggestions panel; pace row.
- `src/components/path/planning/GoalSection.tsx` — rank UI + live explainer + inline refine block.
- `src/components/path/PathView.tsx` — layout reorder; mount TodayFocus; remove goals modal.
- `src/styles/planning-screen.css` — styles for HoursPicker −/+, today card, suggestions, pace row.

**Delete:**
- `src/components/path/GoalPicker.tsx` (last task, after re-homing its features).

---

## Task 1: `tier-effort.ts` — depth → time multiplier

**Files:**
- Create: `src/scripts/path/tier-effort.ts`
- Test: `src/scripts/path/tier-effort.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/path/tier-effort.test.ts
import { describe, it, expect } from "vitest";
import { tierEffort } from "./tier-effort";

describe("tierEffort", () => {
  it("middle is the canonical 1.0", () => {
    expect(tierEffort("middle")).toBe(1.0);
  });
  it("junior skims cheaper, senior deep-reads dearer; strictly monotonic", () => {
    expect(tierEffort("junior")).toBeLessThan(tierEffort("middle"));
    expect(tierEffort("senior")).toBeGreaterThan(tierEffort("middle"));
  });
  it("falls back to 1.0 for an unknown tier token", () => {
    // @ts-expect-error — guarding the runtime fallback for a corrupt per-track map collapse
    expect(tierEffort("nonsense")).toBe(1.0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/tier-effort.test.ts`
Expected: FAIL — `Cannot find module './tier-effort'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/scripts/path/tier-effort.ts
// Pure: reading-depth tier → effort multiplier on a unit's canonical estMin.
// estMin is authored at the "middle" tier, so middle === 1.0. Junior skims (cheaper),
// senior deep-reads (dearer). Used by schedule.ts to budget deadline minutes by depth.
import type { Tier } from "~/types";

const EFFORT: Record<Tier, number> = { junior: 0.65, middle: 1.0, senior: 1.25 };

export function tierEffort(tier: Tier): number {
  return EFFORT[tier] ?? 1.0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/tier-effort.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/tier-effort.ts src/scripts/path/tier-effort.test.ts
git commit -m "feat(path): tierEffort — depth tier as a time multiplier"
```

---

## Task 2: `goal-rank.ts` — normalize priorities to ranks + weight factor

**Files:**
- Create: `src/scripts/path/goal-rank.ts`
- Test: `src/scripts/path/goal-rank.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/path/goal-rank.test.ts
import { describe, it, expect } from "vitest";
import { normalizeRanks, goalWeightFactor } from "./goal-rank";

describe("normalizeRanks", () => {
  it("collapses arbitrary priority numbers to consecutive ranks 1..N by ascending priority", () => {
    // magnitude is irrelevant: 2 vs 7 only encodes order
    const r = normalizeRanks([{ id: "a", priority: 7 }, { id: "b", priority: 2 }]);
    expect(r).toEqual([{ id: "b", rank: 1 }, { id: "a", rank: 2 }]);
  });
  it("breaks ties by id for determinism", () => {
    const r = normalizeRanks([{ id: "z", priority: 1 }, { id: "a", priority: 1 }]);
    expect(r).toEqual([{ id: "a", rank: 1 }, { id: "z", rank: 2 }]);
  });
});

describe("goalWeightFactor", () => {
  it("rank 1 dominates: factor = N for rank 1, 1 for rank N", () => {
    expect(goalWeightFactor(1, 3)).toBe(3);
    expect(goalWeightFactor(3, 3)).toBe(1);
  });
  it("single goal → factor 1", () => {
    expect(goalWeightFactor(1, 1)).toBe(1);
  });
  it("never returns below 1", () => {
    expect(goalWeightFactor(5, 3)).toBe(1); // out-of-range rank clamps to the floor
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/goal-rank.test.ts`
Expected: FAIL — `Cannot find module './goal-rank'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/scripts/path/goal-rank.ts
// Pure: goal priority semantics. The stored `priority` number means importance where the
// SMALLEST number is the most important goal; magnitude is irrelevant — only order counts.
// normalizeRanks collapses whatever numbers the user enters into consecutive ranks (1..N),
// and goalWeightFactor inverts rank into a planner weight so rank 1 carries the most weight.
export interface RankedGoal { id: string; rank: number; }

export function normalizeRanks(goals: { id: string; priority: number }[]): RankedGoal[] {
  return [...goals]
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .map((g, i) => ({ id: g.id, rank: i + 1 }));
}

// rank 1 → N (most weight); rank N → 1; out-of-range / N<=0 → floor of 1.
export function goalWeightFactor(rank: number, n: number): number {
  return Math.max(1, n - rank + 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/goal-rank.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/goal-rank.ts src/scripts/path/goal-rank.test.ts
git commit -m "feat(path): goal-rank — priority 1 = most important, planner weight inverts rank"
```

---

## Task 3: planner `track-band>=` rule form

**Files:**
- Modify: `src/scripts/path/planner.ts:13-23` (`resolveGoalTargets`)
- Modify: `src/scripts/path/__fixtures__/mini-graph.ts` (add a role goal)
- Test: `src/scripts/path/planner.test.ts`

- [ ] **Step 1: Add a `track-band>=` goal to the fixture**

In `src/scripts/path/__fixtures__/mini-graph.ts`, append to the `GOALS` array (after `backend-job`):

```ts
  { id: "frontend-dev", label: { en: "Frontend dev", ru: "Frontend-разработчик" }, target: { rule: "track-band>=middle" },
    // core (weight 1 → targeted): networking; support (weight < 1 → order-only): databases
    trackWeights: { networking: 1.0, databases: 0.7 } },
```

- [ ] **Step 2: Write the failing test**

Append to `src/scripts/path/planner.test.ts`:

```ts
import { resolveGoalTargets } from "./planner";
import { CONCEPTS, GOALS } from "./__fixtures__/mini-graph";

describe("resolveGoalTargets — track-band>= rule", () => {
  const frontendDev = GOALS.find((g) => g.id === "frontend-dev")!;

  it("targets only middle+ concepts in CORE tracks (weight >= 1), excluding support tracks", () => {
    const ids = resolveGoalTargets(frontendDev, CONCEPTS);
    // core track networking middle+: tcp-handshake, tls. databases is support (0.7) → excluded.
    expect(ids.sort()).toEqual(["tcp-handshake", "tls"]);
  });

  it("ignores foundations/surface bands even in a core track", () => {
    const ids = resolveGoalTargets(frontendDev, CONCEPTS);
    expect(ids).not.toContain("ip-addressing"); // foundations
    expect(ids).not.toContain("ports-sockets"); // foundations
  });

  it("returns [] for an unknown band token", () => {
    const bad = { ...frontendDev, target: { rule: "track-band>=nonsense" } };
    expect(resolveGoalTargets(bad, CONCEPTS)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/planner.test.ts`
Expected: FAIL — `track-band>=` falls through to `return []`, so `ids` is `[]` not `["tcp-handshake","tls"]`.

- [ ] **Step 4: Implement the rule**

Replace `resolveGoalTargets` in `src/scripts/path/planner.ts` (lines 13-23) with:

```ts
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

  const m = rule.match(/^band>=(\w+)$/);
  if (m) {
    const min = BAND_RANK[m[1] as Band];
    if (min === undefined) return []; // unknown band token → no targets (avoid matching the whole catalogue)
    return concepts.filter((c) => BAND_RANK[c.band] >= min).map((c) => c.id);
  }
  return [];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/planner.test.ts`
Expected: PASS (existing planner tests + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/scripts/path/planner.ts src/scripts/path/planner.test.ts src/scripts/path/__fixtures__/mini-graph.ts
git commit -m "feat(path): track-band>= goal rule — target core-track middle+ concepts"
```

---

## Task 4: planner rank-weighted `goalTrackWeight`

**Files:**
- Modify: `src/scripts/path/planner.ts:65-72` (`goalTrackWeight`) and `:74-119` (`orderUnits`)
- Test: `src/scripts/path/planner.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/path/planner.test.ts`:

```ts
import { orderUnits } from "./planner";
import { UNITS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { emptyState } from "./knowledge";
import { DEFAULT_CONFIG } from "./config";

describe("orderUnits — rank-weighted goal influence", () => {
  const graph = buildConceptGraph(CONCEPTS);
  const base = {
    state: emptyState(), graph, units: UNITS, concepts: CONCEPTS,
    trackOrder: TRACK_ORDER,
    goals: [
      { id: "g-net", label: { en: "", ru: "" }, target: { rule: "band>=middle" }, trackWeights: { networking: 1 } },
      { id: "g-db",  label: { en: "", ru: "" }, target: { rule: "band>=middle" }, trackWeights: { databases: 1 } },
    ],
  };

  it("rank 1 goal's track outranks rank 2 goal's track in breadth mode", () => {
    // breadth mode so `value()` (goal weight) participates in the sort tiebreak
    const cfg = { ...DEFAULT_CONFIG, breadthVsDepth: 0.9,
      goals: [{ id: "g-db", priority: 1 }, { id: "g-net", priority: 2 }] };
    const ordered = orderUnits(UNITS, { ...base, config: cfg });
    const firstDbIdx = ordered.findIndex((u) => u.track === "databases");
    const firstNetIdx = ordered.findIndex((u) => u.track === "networking");
    // databases is the rank-1 goal → its track should not be strictly after networking on weight
    expect(firstDbIdx).toBeLessThanOrEqual(firstNetIdx + 1);
  });
});
```

> Note: ordering is dominated by prereqs + track order; this test asserts the rank-1 goal's
> track is not deprioritized. The precise position is governed by the topo emission. If the
> fixture makes the assertion brittle, assert instead on `goalTrackWeight` directly by
> exporting it (preferred) — see Step 4.

- [ ] **Step 2: Make `goalTrackWeight` testable — export it and rank-weight it**

Replace `goalTrackWeight` in `src/scripts/path/planner.ts` (lines 65-72) with an exported, rank-aware version, and import the helper at the top of the file:

Add to the imports block at the top of `planner.ts`:

```ts
import { normalizeRanks, goalWeightFactor } from "./goal-rank";
```

Replace the function:

```ts
// Exported for unit tests. `ranks` maps goalId → normalized rank (1 = most important);
// the weight factor inverts rank so the rank-1 goal's tracks carry the most weight.
export function goalTrackWeight(track: Track, goals: Goal[], ranks: Map<string, number>): number {
  const n = ranks.size;
  let w = 0;
  for (const g of goals) {
    const rank = ranks.get(g.id) ?? n || 1; // unranked → least weight; n=0 guard → 1
    w += (g.trackWeights[track] ?? 0.5) * goalWeightFactor(rank, n || 1);
  }
  return w || 0.5; // 0.5 floor: a track always carries some weight unless excludedTracks removes it
}
```

- [ ] **Step 3: Thread ranks through `orderUnits`**

In `orderUnits` (around line 74-80), build the rank map once and pass it to `value()`:

Find:

```ts
  const value = (u: UnitConcepts) => goalTrackWeight(u.track, ctx.goals, ctx.config) * SENIOR_WEIGHT[bandOf(u)];
```

Replace with:

```ts
  const ranks = new Map(normalizeRanks(ctx.config.goals).map((r) => [r.id, r.rank]));
  const value = (u: UnitConcepts) => goalTrackWeight(u.track, ctx.goals, ranks) * SENIOR_WEIGHT[bandOf(u)];
```

- [ ] **Step 4: Replace the brittle ordering test with a direct `goalTrackWeight` test**

Replace the `describe("orderUnits — rank-weighted goal influence", ...)` block added in Step 1 with:

```ts
import { goalTrackWeight } from "./planner";
import { normalizeRanks } from "./goal-rank";

describe("goalTrackWeight — rank inverts into weight", () => {
  const goals = [
    { id: "g-net", label: { en: "", ru: "" }, target: { rule: "band>=middle" }, trackWeights: { networking: 1 } },
    { id: "g-db",  label: { en: "", ru: "" }, target: { rule: "band>=middle" }, trackWeights: { databases: 1 } },
  ];
  it("rank-1 goal's track weighs more than rank-2 goal's track", () => {
    const ranks = new Map(normalizeRanks([{ id: "g-db", priority: 1 }, { id: "g-net", priority: 2 }]).map((r) => [r.id, r.rank]));
    expect(goalTrackWeight("databases", goals, ranks)).toBeGreaterThan(goalTrackWeight("networking", goals, ranks));
  });
  it("floors at 0.5 for an untargeted track", () => {
    const ranks = new Map([["g-net", 1]]);
    expect(goalTrackWeight("frontend", [goals[0]], ranks)).toBe(0.5);
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test -- src/scripts/path/planner.test.ts`
Expected: PASS. If any existing planner test referenced the old `goalTrackWeight(track, goals, config)` signature, update it to the `(track, goals, ranks)` form.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/path/planner.ts src/scripts/path/planner.test.ts
git commit -m "feat(path): rank-weighted goalTrackWeight — rank 1 goal dominates ordering"
```

---

## Task 5: tier-scaled `schedulePlan`

**Files:**
- Modify: `src/scripts/path/schedule.ts:1-2,66-94`
- Test: `src/scripts/path/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/path/schedule.test.ts`:

```ts
import { tierEffort } from "./tier-effort";

describe("schedulePlan — tier scales required minutes", () => {
  it("junior packs more steps than senior in the same budget", () => {
    const path = { steps: [step("a", 120), step("b", 120), step("c", 120)] };
    // one week, Mon..Fri 2h = 600 min available
    const jr = schedulePlan(path, cfg(), MON_2026_06_08, "junior");
    const sr = schedulePlan(path, cfg(), MON_2026_06_08, "senior");
    const placed = (s: ReturnType<typeof schedulePlan>) => s.days.reduce((n, d) => n + d.steps.length, 0);
    expect(placed(jr)).toBeGreaterThanOrEqual(placed(sr));
  });

  it("defaults to middle (1.0) when tier omitted — back-compat with existing callers", () => {
    const path = { steps: [step("a", 120)] };
    const def = schedulePlan(path, cfg(), MON_2026_06_08);
    const mid = schedulePlan(path, cfg(), MON_2026_06_08, "middle");
    expect(def.feasibility).toEqual(mid.feasibility);
  });

  it("senior depth can flip fits → over (deep-read costs 1.25x)", () => {
    // 5 days * 120 min = 600 budget; 5 steps * 100 min = 500 required at middle (fits),
    // 625 at senior (over).
    const path = { steps: Array.from({ length: 5 }, (_, i) => step(`u${i}`, 100)) };
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "middle").feasibility.verdict).not.toBe("over");
    expect(schedulePlan(path, cfg(), MON_2026_06_08, "senior").feasibility.verdict).toBe("over");
    expect(tierEffort("senior")).toBe(1.25); // anchors the arithmetic above
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/schedule.test.ts`
Expected: FAIL — `schedulePlan` takes 3 args; the 4th `tier` is ignored, so junior/senior behave identically and the senior-over case stays "fits".

- [ ] **Step 3: Implement tier scaling**

In `src/scripts/path/schedule.ts`, update the imports (line 1-2):

```ts
// site/src/scripts/path/schedule.ts
import type { Path, DeadlineConfig, Feasibility, DayPlan, Schedule, Tier } from "./types";
import { tierEffort } from "./tier-effort";
```

Replace `schedulePlan` (lines 66-94) with:

```ts
export function schedulePlan(path: Path, cfg: DeadlineConfig, nowMs: number, tier: Tier = "middle"): Schedule {
  const effort = tierEffort(tier);
  const scale = (m: number) => Math.round(m * effort);

  const days = studyDays(nowMs, cfg.targetDateMs, cfg.perWeekdayHours, cfg.blackoutDates ?? [], cfg.tzOffsetMin);
  const plan: DayPlan[] = days.map((d) => ({ date: d.date, minutes: d.minutes, steps: [] }));
  const required = path.steps.reduce((n, s) => n + scale(s.estMin), 0);
  const available = availableMinutes(days);

  let di = 0, used = 0;
  const placed = new Set<string>();
  for (const step of path.steps) {
    const cost = scale(step.estMin);
    while (di < plan.length && used + cost > plan[di].minutes) { di++; used = 0; }
    if (di >= plan.length) break;
    plan[di].steps.push(step); // step keeps its canonical estMin for display; budgeting uses `cost`
    used += cost;
    placed.add(step.unit);
  }
  // roi here is a cost-only placeholder (1/cost): with no per-step value field yet, longer
  // steps are dropped first. Replace with value/cost once steps carry a learning-value weight.
  const dropUnits = path.steps.filter((s) => !placed.has(s.unit))
    .map((s) => ({ id: s.unit, estMin: scale(s.estMin), roi: 1 / Math.max(1, scale(s.estMin)) }));
  const feas: Feasibility = dropUnits.length
    ? { verdict: "over", deltaMin: dropUnits.reduce((n, d) => n + d.estMin, 0), dropped: dropUnits.map((d) => d.id) }
    : feasibility(required, available, dropUnits);

  const countdownDays = Math.max(0, Math.ceil((cfg.targetDateMs - nowMs) / DAY));
  return { days: plan, feasibility: feas, countdownDays };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test -- src/scripts/path/schedule.test.ts`
Expected: PASS (existing 8 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/schedule.ts src/scripts/path/schedule.test.ts
git commit -m "feat(path): schedulePlan scales required minutes by reading-depth tier"
```

---

## Task 6: `DeadlineConfig` fields + `pace.ts`

**Files:**
- Modify: `src/scripts/path/types.ts:34-39`
- Create: `src/scripts/path/pace.ts`
- Test: `src/scripts/path/pace.test.ts`

- [ ] **Step 1: Add the optional fields to `DeadlineConfig`**

In `src/scripts/path/types.ts`, replace the `DeadlineConfig` interface (lines 34-39):

```ts
export interface DeadlineConfig {
  targetDateMs: number;
  perWeekdayHours: number[]; // length 7, Mon..Sun; 0 = day off
  blackoutDates?: string[];  // ISO "YYYY-MM-DD"
  tzOffsetMin: number;       // minutes; keeps the core clock-free
  startedAtMs?: number;          // when the deadline was first activated (pace baseline anchor)
  baselineRequiredMin?: number;  // scaled required minutes at activation; raised if scope grows
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/scripts/path/pace.test.ts
import { describe, it, expect } from "vitest";
import { pace } from "./pace";

const DAY = 86_400_000;
const start = Date.UTC(2026, 5, 1);
const target = start + 100 * DAY;

describe("pace", () => {
  it("on-track: done matches the elapsed fraction", () => {
    const now = start + 50 * DAY;               // 50% elapsed
    const p = pace(1000, 500, start, now, target); // baseline 1000, 500 remaining → 500 done = 50%
    expect(p.doneMin).toBe(500);
    expect(p.expectedDoneMin).toBe(500);
    expect(p.status).toBe("on-track");
    expect(p.behindDays).toBe(0);
  });

  it("behind: done lags the elapsed fraction and projects past the target", () => {
    const now = start + 50 * DAY;
    const p = pace(1000, 800, start, now, target); // only 200 done at 50% elapsed
    expect(p.doneMin).toBe(200);
    expect(p.status).toBe("behind");
    expect(p.projectedFinishMs).toBeGreaterThan(target);
    expect(p.behindDays).toBeGreaterThan(0);
  });

  it("ahead: done exceeds expectation", () => {
    const now = start + 25 * DAY;                // 25% elapsed
    const p = pace(1000, 400, start, now, target); // 600 done already
    expect(p.status).toBe("ahead");
  });

  it("no-data before the elapsed floor (avoids day-0 noise)", () => {
    const now = start + 1 * DAY;                 // 1% elapsed
    expect(pace(1000, 1000, start, now, target).status).toBe("no-data");
  });

  it("projectedFinish is null when nothing is done yet (rate 0)", () => {
    const now = start + 50 * DAY;
    expect(pace(1000, 1000, start, now, target).projectedFinishMs).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/pace.test.ts`
Expected: FAIL — `Cannot find module './pace'`.

- [ ] **Step 4: Write the implementation**

```ts
// src/scripts/path/pace.ts
// Pure: planned-vs-completed pace against a deadline. "Done" is inferred from the baseline
// snapshot (required minutes when the deadline was set) minus what currently remains — work
// that has left the path because its concepts became known. No clock here; `nowMs` is injected.
const DAY = 86_400_000;
const BEHIND = 0.9;       // ratio below this → behind
const AHEAD = 1.1;        // ratio above this → ahead
const DATA_FLOOR = 0.05;  // need >5% of the window elapsed before a verdict (day-0 noise guard)

export type PaceStatus = "ahead" | "on-track" | "behind" | "no-data";
export interface Pace {
  doneMin: number;
  expectedDoneMin: number;
  ratio: number;
  status: PaceStatus;
  projectedFinishMs: number | null;
  behindDays: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function pace(
  baselineMin: number, currentRequiredMin: number,
  startedAtMs: number, nowMs: number, targetMs: number,
): Pace {
  const span = targetMs - startedAtMs;
  const elapsed = nowMs - startedAtMs;
  const elapsedFrac = span > 0 ? clamp01(elapsed / span) : 0;
  const doneMin = Math.max(0, baselineMin - currentRequiredMin);
  const expectedDoneMin = baselineMin * elapsedFrac;
  const ratio = expectedDoneMin > 0 ? doneMin / expectedDoneMin : 1;

  // Projected finish from the realized rate; null until there's a non-zero rate to extrapolate.
  const rate = elapsed > 0 ? doneMin / elapsed : 0; // minutes-of-work per ms
  const projectedFinishMs = rate > 0 ? Math.round(nowMs + currentRequiredMin / rate) : null;
  const behindDays = projectedFinishMs && projectedFinishMs > targetMs
    ? Math.ceil((projectedFinishMs - targetMs) / DAY) : 0;

  let status: PaceStatus;
  if (elapsedFrac < DATA_FLOOR) status = "no-data";
  else if (ratio < BEHIND) status = "behind";
  else if (ratio > AHEAD) status = "ahead";
  else status = "on-track";

  return { doneMin, expectedDoneMin, ratio, status, projectedFinishMs, behindDays };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/pace.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/scripts/path/types.ts src/scripts/path/pace.ts src/scripts/path/pace.test.ts
git commit -m "feat(path): pace model + DeadlineConfig baseline fields"
```

---

## Task 7: `optimize-deltas.ts` — pure full-path required-minute deltas

**Files:**
- Create: `src/scripts/path/optimize-deltas.ts`
- Test: `src/scripts/path/optimize-deltas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/path/optimize-deltas.test.ts
import { describe, it, expect } from "vitest";
import { fullRequiredMin, goalDropDeltaMin, trackExcludeDeltaMin } from "./optimize-deltas";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { emptyState } from "./knowledge";
import { DEFAULT_CONFIG } from "./config";

const goalById = new Map(GOALS.map((g) => [g.id, g]));
const baseInput = (goalIds: string[]) => ({
  state: emptyState(),
  goals: goalIds.map((id) => goalById.get(id)!),
  config: { ...DEFAULT_CONFIG, goals: goalIds.map((id, i) => ({ id, priority: i + 1 })) },
  content: { concepts: CONCEPTS, units: UNITS, goalById },
  srsDue: [], now: 0, trackOrder: TRACK_ORDER,
});

describe("optimize-deltas", () => {
  it("fullRequiredMin scales by tier and counts the whole path (no stepsAhead slice)", () => {
    const mid = fullRequiredMin(baseInput(["senior-fullstack"]), "middle");
    const jr = fullRequiredMin(baseInput(["senior-fullstack"]), "junior");
    expect(mid).toBeGreaterThan(0);
    expect(jr).toBeLessThan(mid); // junior is cheaper
  });

  it("goalDropDeltaMin is the minutes that leave the path when a goal is dropped", () => {
    const delta = goalDropDeltaMin(baseInput(["senior-fullstack", "backend-job"]), "middle", "backend-job");
    expect(delta).toBeGreaterThanOrEqual(0);
  });

  it("trackExcludeDeltaMin is the minutes of a track's units removed from the path", () => {
    const delta = trackExcludeDeltaMin(baseInput(["senior-fullstack"]), "middle", "distributed");
    expect(delta).toBeGreaterThan(0); // distributed units exist in the senior-fullstack path
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/optimize-deltas.test.ts`
Expected: FAIL — `Cannot find module './optimize-deltas'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/scripts/path/optimize-deltas.ts
// Pure: "what-if" deltas in scaled required minutes for the scope-cutting levers. buildPath
// slices to pace.stepsAhead unless a deadline is set, so we force a truthy deadline to always
// measure the FULL path. These feed optimize.ts (which itself stays free of buildPath).
import type { BuildInput } from "./planner";
import { buildPath } from "./planner";
import { tierEffort } from "./tier-effort";
import type { Tier } from "./types";

// A truthy stand-in so buildPath returns the full (un-sliced) path; its fields are never read there.
const FULL = {} as BuildInput["config"]["deadline"];

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/optimize-deltas.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/optimize-deltas.ts src/scripts/path/optimize-deltas.test.ts
git commit -m "feat(path): optimize-deltas — full-path required-minute what-if deltas"
```

---

## Task 8: `optimize.ts` — assemble + rank fix suggestions

**Files:**
- Create: `src/scripts/path/optimize.ts`
- Test: `src/scripts/path/optimize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/path/optimize.test.ts
import { describe, it, expect } from "vitest";
import { suggestFixes, bestCombo, type LeverInputs } from "./optimize";

const base: LeverInputs = {
  deficitMin: 300,
  raiseHours: [{ hours: 0.5, deltaMin: 150 }, { hours: 1, deltaMin: 300 }],
  extendDate: [{ days: 7, deltaMin: 120 }, { days: 14, deltaMin: 240 }],
  lowerDepth: { tier: "junior", deltaMin: 200 },
  dropGoal: { goalId: "backend-job", label: "Backend job", deltaMin: 400 },
  excludeTrack: { track: "queues", deltaMin: 90 },
  behind: false,
};

describe("suggestFixes", () => {
  it("flags closesGap when a single lever's delta covers the deficit", () => {
    const fixes = suggestFixes(base);
    const oneHour = fixes.find((f) => f.kind === "raise-hours" && (f.patch as any).hours === 1)!;
    expect(oneHour.closesGap).toBe(true); // 300 >= 300
    const halfHour = fixes.find((f) => f.kind === "raise-hours" && (f.patch as any).hours === 0.5)!;
    expect(halfHour.closesGap).toBe(false); // 150 < 300
  });

  it("orders least-disruptive first (raise-hours before drop-goal)", () => {
    const fixes = suggestFixes(base);
    const firstRaise = fixes.findIndex((f) => f.kind === "raise-hours");
    const firstDrop = fixes.findIndex((f) => f.kind === "drop-goal");
    expect(firstRaise).toBeLessThan(firstDrop);
  });

  it("returns [] when there is no deficit and not behind", () => {
    expect(suggestFixes({ ...base, deficitMin: 0, behind: false })).toEqual([]);
  });

  it("still surfaces catch-up levers when behind even if the budget fits", () => {
    const fixes = suggestFixes({ ...base, deficitMin: 0, behind: true });
    expect(fixes.some((f) => f.kind === "raise-hours")).toBe(true);
    expect(fixes.some((f) => f.kind === "drop-goal")).toBe(false); // scope cuts not offered when only behind
  });
});

describe("bestCombo", () => {
  it("returns the minimal in-order prefix whose summed delta covers the deficit", () => {
    const fixes = suggestFixes(base);
    const combo = bestCombo(fixes, 300);
    const sum = combo.reduce((n, f) => n + f.deltaMin, 0);
    expect(sum).toBeGreaterThanOrEqual(300);
    // dropping the last element would leave it short → minimal
    const shorter = combo.slice(0, -1).reduce((n, f) => n + f.deltaMin, 0);
    expect(shorter).toBeLessThan(300);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/optimize.test.ts`
Expected: FAIL — `Cannot find module './optimize'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/scripts/path/optimize.ts
// Pure: turn precomputed lever deltas into ordered, quantified fix suggestions. All calendar
// and what-if math is done by the caller (schedule.ts / optimize-deltas.ts) and passed in as
// numbers, so this module stays a deterministic assembler + ranker with no graph/clock access.
import type { Tier } from "./types";

export type FixKind = "raise-hours" | "extend-date" | "lower-depth" | "drop-goal" | "exclude-track";

export interface Fix {
  kind: FixKind;
  deltaMin: number;                 // minutes added to availability OR removed from required
  closesGap: boolean;               // does this single lever cover the deficit?
  patch: Record<string, unknown>;   // descriptor the adapter applies via existing mutators
}

export interface LeverInputs {
  deficitMin: number;                                   // budget deficit (or pace catch-up minutes when behind)
  raiseHours: { hours: number; deltaMin: number }[];    // e.g. +0.5h, +1h on each active weekday
  extendDate: { days: number; deltaMin: number }[];     // e.g. +7d, +14d
  lowerDepth?: { tier: Tier; deltaMin: number };        // present only if a lower tier exists
  dropGoal?: { goalId: string; label: string; deltaMin: number };
  excludeTrack?: { track: string; deltaMin: number };
  behind: boolean;                                      // pace status → offer catch-up even if budget fits
}

// Disruption order: tweak availability first, cut scope last.
const ORDER: FixKind[] = ["raise-hours", "extend-date", "lower-depth", "exclude-track", "drop-goal"];
const SCOPE_CUTS = new Set<FixKind>(["exclude-track", "drop-goal"]);

export function suggestFixes(inp: LeverInputs): Fix[] {
  const deficit = inp.deficitMin;
  if (deficit <= 0 && !inp.behind) return [];

  const mk = (kind: FixKind, deltaMin: number, patch: Record<string, unknown>): Fix =>
    ({ kind, deltaMin, closesGap: deltaMin >= deficit && deficit > 0, patch });

  const fixes: Fix[] = [];
  for (const r of inp.raiseHours) fixes.push(mk("raise-hours", r.deltaMin, { hours: r.hours }));
  for (const e of inp.extendDate) fixes.push(mk("extend-date", e.deltaMin, { days: e.days }));
  if (inp.lowerDepth) fixes.push(mk("lower-depth", inp.lowerDepth.deltaMin, { tier: inp.lowerDepth.tier }));
  if (inp.excludeTrack) fixes.push(mk("exclude-track", inp.excludeTrack.deltaMin, { track: inp.excludeTrack.track }));
  if (inp.dropGoal) fixes.push(mk("drop-goal", inp.dropGoal.deltaMin, { goalId: inp.dropGoal.goalId, label: inp.dropGoal.label }));

  // When only "behind" (budget fits), offer catch-up levers but not scope cuts.
  const visible = deficit > 0 ? fixes : fixes.filter((f) => !SCOPE_CUTS.has(f.kind));

  return visible.sort((a, b) =>
    ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.deltaMin - b.deltaMin);
}

// Minimal in-order prefix whose summed delta covers the deficit (greedy on the disruption order).
export function bestCombo(fixes: Fix[], deficitMin: number): Fix[] {
  if (deficitMin <= 0) return [];
  // Prefer a single lever that closes the gap (least disruptive first).
  const single = fixes.find((f) => f.closesGap);
  if (single) return [single];
  const combo: Fix[] = [];
  let sum = 0;
  for (const f of fixes) {
    if (sum >= deficitMin) break;
    combo.push(f);
    sum += f.deltaMin;
  }
  return combo;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/optimize.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/optimize.ts src/scripts/path/optimize.test.ts
git commit -m "feat(path): optimize — ranked, quantified deadline fix suggestions"
```

---

## Task 9: `goals.json` — 3 role presets

**Files:**
- Modify: `src/content/path/goals.json`
- Test: `src/scripts/path/goals-content.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// src/scripts/path/goals-content.test.ts
import { describe, it, expect } from "vitest";
import goals from "../../content/path/goals.json";
import concepts from "../../content/path/concepts.json";
import { resolveGoalTargets } from "./planner";
import type { Goal, Concept } from "./types";

const byId = new Map((goals as Goal[]).map((g) => [g.id, g]));

describe("role goal presets", () => {
  it.each(["frontend-dev", "fullstack-dev", "devops-engineer"])("%s exists with EN+RU labels and track-band rule", (id) => {
    const g = byId.get(id)!;
    expect(g).toBeTruthy();
    expect(g.label.en.length).toBeGreaterThan(0);
    expect(g.label.ru.length).toBeGreaterThan(0);
    expect(g.target.rule).toBe("track-band>=middle");
    expect(Object.values(g.trackWeights).some((w) => w === 1)).toBe(true); // has >=1 core track
  });

  it.each(["frontend-dev", "fullstack-dev", "devops-engineer"])("%s resolves to a non-empty, sane target frontier", (id) => {
    const ids = resolveGoalTargets(byId.get(id)!, concepts as Concept[]);
    expect(ids.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/scripts/path/goals-content.test.ts`
Expected: FAIL — the 3 ids are absent from `goals.json`.

- [ ] **Step 3: Append the 3 presets to `goals.json`**

Insert these objects into the array in `src/content/path/goals.json` (after `ai-engineer`, before the closing `]`). Track slugs are verified against `tracks.json`:

```jsonc
  {
    "id": "frontend-dev",
    "label": { "en": "Become a frontend developer", "ru": "Стать frontend-разработчиком" },
    "target": { "rule": "track-band>=middle" },
    "trackWeights": {
      "frontend": 1, "browser": 1, "typescript": 1, "js-engine": 1,
      "performance": 0.8, "apis": 0.7, "networking": 0.6, "security": 0.6
    }
  },
  {
    "id": "fullstack-dev",
    "label": { "en": "Become a fullstack developer", "ru": "Стать fullstack-разработчиком" },
    "target": { "rule": "track-band>=middle" },
    "trackWeights": {
      "frontend": 1, "backend": 1, "databases": 1, "apis": 1, "typescript": 1,
      "system-design": 0.9, "node": 0.8, "caching": 0.7, "networking": 0.7, "browser": 0.7, "security": 0.6
    }
  },
  {
    "id": "devops-engineer",
    "label": { "en": "Become a DevOps engineer", "ru": "Стать DevOps-инженером" },
    "target": { "rule": "track-band>=middle" },
    "trackWeights": {
      "ci-cd": 1, "aws": 1, "deployment": 1, "observability": 1, "networking": 1,
      "distributed": 0.8, "security": 0.8, "system-design": 0.7, "backend": 0.6
    }
  }
```

(Remember the comma after the `ai-engineer` object's closing brace. `goals.json` is strict JSON — strip the `//` comments above; they are for the plan only.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/scripts/path/goals-content.test.ts`
Expected: PASS (6 cases).

- [ ] **Step 5: Commit**

```bash
git add src/content/path/goals.json src/scripts/path/goals-content.test.ts
git commit -m "content(path): frontend/fullstack/devops role goals (track-band>= rule)"
```

---

## Task 10: `path-io.ts` adapter — tier, baseline, optimize/pace wiring

**Files:**
- Modify: `src/scripts/path/path-io.ts`
- Test: `src/scripts/path/path-io.test.ts`

- [ ] **Step 1: Add imports**

At the top of `path-io.ts` (with the other pure-helper imports near line 107-111), add:

```ts
import { tierEffort } from "./tier-effort";
import { pace, type Pace } from "./pace";
import { suggestFixes, bestCombo, type Fix, type LeverInputs } from "./optimize";
import { fullRequiredMin, goalDropDeltaMin, trackExcludeDeltaMin } from "./optimize-deltas";
import { normalizeRanks } from "./goal-rank";
import { studyDays, availableMinutes } from "./schedule";
import type { Tier } from "./types";
```

- [ ] **Step 2: Add a `tierOf` helper and pass tier into `schedulePlan`**

Add near the other helpers (after `unitsFromMap`):

```ts
// Collapse the depthTier config (string or per-track map) to a single tier for scheduling. v1
// uses the string form; a per-track map falls back to "middle" (mirrors DeadlineSection).
export function tierOf(cfg: PathConfig): Tier {
  return typeof cfg.depthTier === "string" ? cfg.depthTier : "middle";
}
```

In `computePath()` (line 221), change the schedule call to pass the tier:

```ts
  const schedule = cfg.deadline ? schedulePlan(path, cfg.deadline, now, tierOf(cfg)) : undefined;
```

- [ ] **Step 3: Build the `BuildInput` factory (reused by baseline + deltas)**

Add a private helper near `computePath`:

```ts
// Assemble the planner BuildInput from current signals + (optionally overridden) config.
function buildInputFor(cfg: StoredPathConfig) {
  const { concepts: eff, units: effUnits } = effectiveContent();
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  return {
    state: knowledge.value, goals: goalObjs, config: cfg,
    content: { concepts: eff, units: effUnits, goalById }, srsDue: [], now: Date.now(), trackOrder,
  };
}
```

- [ ] **Step 4: Stamp the pace baseline in `setDeadline`**

Replace `setDeadline` (line 253) with:

```ts
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
```

- [ ] **Step 5: Expose `currentPace()` and `currentFixes()` read-models**

Add at the end of `path-io.ts`:

```ts
// ── deadline read-models for the UI (pace + optimization suggestions) ──────────
export function currentPace(): Pace | null {
  const cfg = config.value;
  const dl = cfg.deadline;
  if (!dl?.startedAtMs || dl.baselineRequiredMin == null) return null;
  const { path } = computePath();
  const tier = tierOf(cfg);
  const required = path.steps.reduce((n, s) => n + Math.round(s.estMin * tierEffort(tier)), 0);
  return pace(dl.baselineRequiredMin, required, dl.startedAtMs, Date.now(), dl.targetDateMs);
}

// Build the LeverInputs from the live schedule + what-if deltas, then suggest fixes.
export function currentFixes(): { fixes: Fix[]; combo: Fix[]; deficitMin: number } {
  const cfg = config.value;
  const dl = cfg.deadline;
  const { path, schedule } = computePath();
  if (!dl || !schedule) return { fixes: [], combo: [], deficitMin: 0 };

  const tier = tierOf(cfg);
  const now = Date.now();
  const deficitMin = schedule.feasibility.verdict === "over" ? schedule.feasibility.deltaMin : 0;
  const p = currentPace();
  const behind = p?.status === "behind";

  // raise-hours: add H to every currently-active weekday remaining to the date.
  const remainingHours = (perDay: number[]) =>
    availableMinutes(studyDays(now, dl.targetDateMs, perDay, dl.blackoutDates ?? [], dl.tzOffsetMin));
  const baseAvail = remainingHours(dl.perWeekdayHours);
  const bump = (h: number) => remainingHours(dl.perWeekdayHours.map((x) => (x > 0 ? x + h : x))) - baseAvail;
  const raiseHours = [{ hours: 0.5, deltaMin: bump(0.5) }, { hours: 1, deltaMin: bump(1) }]
    .filter((r) => r.deltaMin > 0);

  // extend-date: add D days of availability at the current weekday pattern.
  const extend = (days: number) =>
    availableMinutes(studyDays(now, dl.targetDateMs + days * 86_400_000, dl.perWeekdayHours, dl.blackoutDates ?? [], dl.tzOffsetMin)) - baseAvail;
  const extendDate = [{ days: 7, deltaMin: extend(7) }, { days: 14, deltaMin: extend(14) }]
    .filter((e) => e.deltaMin > 0);

  // lower-depth: one tier step down, if any.
  const lower: Record<Tier, Tier | null> = { senior: "middle", middle: "junior", junior: null };
  const lowerTier = lower[tier];
  const required = path.steps.reduce((n, s) => n + Math.round(s.estMin * tierEffort(tier)), 0);
  const lowerDepth = lowerTier
    ? { tier: lowerTier, deltaMin: Math.max(0, required - Math.round(required * (tierEffort(lowerTier) / tierEffort(tier)))) }
    : undefined;

  // drop-goal: lowest-rank active goal.
  const ranked = normalizeRanks(cfg.goals);
  const lowestRankId = ranked.length ? ranked[ranked.length - 1].id : null;
  const input = buildInputFor(cfg);
  const dropGoal = lowestRankId
    ? { goalId: lowestRankId, label: goalById.get(lowestRankId)?.label.en ?? lowestRankId, deltaMin: goalDropDeltaMin(input, tier, lowestRankId) }
    : undefined;

  // exclude-track: lowest-weight non-excluded track present in the path.
  const pathTracks = [...new Set(path.steps.map((s) => s.track))].filter((t) => !cfg.excludedTracks.includes(t));
  const weightOf = (t: string) => Math.max(...input.goals.map((g) => g.trackWeights[t as keyof typeof g.trackWeights] ?? 0.5));
  const lowestTrack = pathTracks.sort((a, b) => weightOf(a) - weightOf(b))[0];
  const excludeTrack = lowestTrack
    ? { track: lowestTrack, deltaMin: trackExcludeDeltaMin(input, tier, lowestTrack) }
    : undefined;

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
```

- [ ] **Step 6: Add a focused adapter test**

Append to `src/scripts/path/path-io.test.ts`:

```ts
import { tierOf } from "./path-io";
import { DEFAULT_CONFIG } from "./config";

describe("tierOf", () => {
  it("returns the string tier", () => {
    expect(tierOf({ ...DEFAULT_CONFIG, depthTier: "junior" })).toBe("junior");
  });
  it("falls back to middle for a per-track map", () => {
    expect(tierOf({ ...DEFAULT_CONFIG, depthTier: { frontend: "senior" } })).toBe("middle");
  });
});
```

- [ ] **Step 7: Run tests + typecheck**

Run: `bun run test -- src/scripts/path/path-io.test.ts`
Expected: PASS (existing + 2 new).
Run: `bunx tsc --noEmit -p tsconfig.json` (or `bun run build` in a later task) to confirm types compose.
Expected: no type errors in the path modules.

- [ ] **Step 8: Commit**

```bash
git add src/scripts/path/path-io.ts src/scripts/path/path-io.test.ts
git commit -m "feat(path): adapter wiring — tier scheduling, pace baseline, fix suggestions"
```

---

## Task 11: `HoursPicker.tsx` — reusable weekday-hours grid with −/+

**Files:**
- Create: `src/components/path/planning/HoursPicker.tsx`
- Modify: `src/styles/planning-screen.css` (append styles)

- [ ] **Step 1: Create the component**

```tsx
// src/components/path/planning/HoursPicker.tsx
// Reusable weekday-hours grid. Explicit −/+ buttons per day (the old grid was click-to-increase
// only); also supports wheel + arrow keys. Used by DeadlineSection and (formerly) GoalPicker.
import type { Locale } from "~/i18n";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAYS: Record<Locale, string[]> = {
  en: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  ru: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
};
const UNIT: Record<Locale, string> = { en: "h", ru: "ч" };
const WEEK_NOTE: Record<Locale, (h: number, off: number) => string> = {
  en: (h, off) => `${fmtH(h)} h/week · ${off} day(s) off`,
  ru: (h, off) => `${fmtH(h)} ч в неделю · выходных: ${off}`,
};

export function fmtH(h: number): string { return Number.isInteger(h) ? String(h) : h.toFixed(1); }
export function clampHour(v: number, max = 12): number { return Math.max(0, Math.min(max, Math.round(v * 2) / 2)); }

export default function HoursPicker(
  { lang, hours, onSet, max = 12 }: { lang: Locale; hours: number[]; onSet: (i: number, v: number) => void; max?: number },
) {
  const bump = (i: number, delta: number) => onSet(i, clampHour((hours[i] ?? 0) + delta, max));
  const total = hours.reduce((a, b) => a + b, 0);
  const off = hours.filter((h) => h === 0).length;

  return (
    <div>
      <div class="hp-grid">
        {DAY_KEYS.map((_, i) => {
          const h = hours[i] ?? 0;
          return (
            <div key={i} class="hp-day">
              <div class="hp-name">{DAYS[lang][i]}</div>
              <button type="button" class="hp-btn dec" aria-label={`${DAYS[lang][i]} −`}
                onClick={() => bump(i, -0.5)} disabled={h <= 0}>−</button>
              <div
                class={`hp-val${h === 0 ? " off" : ""}`}
                role="spinbutton"
                tabIndex={0}
                aria-label={lang === "ru" ? `${DAYS[lang][i]}, часов` : `${DAYS[lang][i]} hours`}
                aria-valuenow={h} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${fmtH(h)} ${UNIT[lang]}`}
                onWheel={(e) => { e.preventDefault(); bump(i, e.deltaY < 0 ? 0.5 : -0.5); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); bump(i, 0.5); }
                  if (e.key === "ArrowDown") { e.preventDefault(); bump(i, -0.5); }
                }}
              >
                <span class="hv">{h === 0 ? "·" : fmtH(h)}</span>
                <span class="hu">{UNIT[lang]}</span>
              </div>
              <button type="button" class="hp-btn inc" aria-label={`${DAYS[lang][i]} +`}
                onClick={() => bump(i, 0.5)} disabled={h >= max}>+</button>
            </div>
          );
        })}
      </div>
      <div class="hp-note">{WEEK_NOTE[lang](total, off)}</div>
    </div>
  );
}
```

- [ ] **Step 2: Append styles to `planning-screen.css`**

```css
/* HoursPicker — −/+ weekday grid */
.hp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--s-2, .5rem); }
.hp-day { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.hp-name { font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-3, #8a8378); }
.hp-btn { width: 100%; border: 1px solid var(--line, #d9d3c7); background: var(--paper, #faf7f0); border-radius: 6px; line-height: 1.4; cursor: pointer; font-size: 1rem; }
.hp-btn:disabled { opacity: .35; cursor: default; }
.hp-val { width: 100%; text-align: center; border: 1px solid var(--line, #d9d3c7); border-radius: 6px; padding: .35rem 0; cursor: ns-resize; }
.hp-val.off { color: var(--ink-3, #8a8378); }
.hp-val .hv { font-weight: 600; } .hp-val .hu { font-size: .7rem; margin-left: 2px; color: var(--ink-3, #8a8378); }
.hp-note { margin-top: var(--s-2, .5rem); font-size: .8rem; color: var(--ink-2, #6b6459); }
```

- [ ] **Step 3: Verify it builds (no isolated test runner for components here)**

Run: `bun run build`
Expected: build succeeds (the component compiles; not yet mounted, so no visual change). Lint clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/path/planning/HoursPicker.tsx src/styles/planning-screen.css
git commit -m "feat(planning): reusable HoursPicker with explicit -/+ controls"
```

---

## Task 12: `DeadlineSection` — use HoursPicker, add suggestions panel + pace row

**Files:**
- Modify: `src/components/path/planning/DeadlineSection.tsx`
- Modify: `src/styles/planning-screen.css`

- [ ] **Step 1: Replace the internal `WeekHoursGrid` with `HoursPicker` and add read-models**

In `DeadlineSection.tsx`:

1. Update imports (top of file):

```ts
import HoursPicker from "./HoursPicker";
import { config, content, computePath, setDeadline, setKnob, currentPace, currentFixes, applyFix, applyCombo } from "~/scripts/path/path-io";
import type { Fix } from "~/scripts/path/optimize";
```

2. Delete the local `WeekHoursGrid` function (lines ~78-119) and the now-unused `clampHour`/`fmtH`/`DAY_KEYS` if they are only used by it. Keep `fmtH` if used elsewhere in the file (the verdict/budget rows use `fmtH`) — import it from HoursPicker instead to avoid duplication:

```ts
import HoursPicker, { fmtH } from "./HoursPicker";
```

Remove the file-local `function fmtH(...)` and `function clampHour(...)` and the `DAY_KEYS` const.

3. In the JSX where `<WeekHoursGrid lang={lang} hours={hours} onSet={setHour} />` was rendered (the hours `field-row`), use:

```tsx
              <HoursPicker lang={lang} hours={hours} onSet={setHour} />
```

- [ ] **Step 2: Add localized strings for pace + suggestions**

Add to the `L.en` object:

```ts
    paceHead: "Pace",
    paceDone: (done: number, total: number) => `Done ${done} of ${total} h`,
    paceBehind: (days: number) => `~${days} day(s) behind at your current pace`,
    paceAhead: "Ahead of your planned pace",
    paceOnTrack: "On your planned pace",
    paceFinish: (d: string) => `projected finish ${d}`,
    fixHead: "How to make it fit",
    fixRaise: (h: number, save: number) => `+${fmtH(h)} h on each weekday — frees ${Math.round(save / 60)} h`,
    fixExtend: (d: number, save: number) => `Move the date +${d} days — frees ${Math.round(save / 60)} h`,
    fixDepth: (tier: string, save: number) => `Read at ${tier} depth — saves ${Math.round(save / 60)} h`,
    fixDrop: (label: string, save: number) => `Drop goal “${label}” — saves ${Math.round(save / 60)} h`,
    fixExclude: (track: string, save: number) => `Exclude track ${track} — saves ${Math.round(save / 60)} h`,
    fixApply: "Apply", fixAuto: "Optimize for me", fixFits: "✓ closes the gap",
```

Add to `L.ru`:

```ts
    paceHead: "Темп",
    paceDone: (done: number, total: number) => `Сделано ${done} из ${total} ч`,
    paceBehind: (days: number) => `отстаёшь ~${days} дн. при текущем темпе`,
    paceAhead: "С опережением графика",
    paceOnTrack: "В графике",
    paceFinish: (d: string) => `прогноз финиша ${d}`,
    fixHead: "Как уложиться",
    fixRaise: (h: number, save: number) => `+${fmtH(h)} ч в каждый будний день — освободит ${Math.round(save / 60)} ч`,
    fixExtend: (d: number, save: number) => `Сдвинь дату на +${d} дн. — освободит ${Math.round(save / 60)} ч`,
    fixDepth: (tier: string, save: number) => `Читай на глубине ${tier} — сэкономит ${Math.round(save / 60)} ч`,
    fixDrop: (label: string, save: number) => `Снять цель «${label}» — сэкономит ${Math.round(save / 60)} ч`,
    fixExclude: (track: string, save: number) => `Исключить трек ${track} — сэкономит ${Math.round(save / 60)} ч`,
    fixApply: "Применить", fixAuto: "Оптимизировать за меня", fixFits: "✓ закрывает дефицит",
```

- [ ] **Step 3: Render pace + suggestions inside `DeadlineOutput`**

In `DeadlineOutput`, after the `<p class="v-honest">{honest}</p>` line and before the dated-schedule block, add:

```tsx
      <PaceRow lang={lang} />
      <FixList lang={lang} />
```

Then add two components at the bottom of the file:

```tsx
function fixLabel(lang: Locale, t: typeof L["en"] | typeof L["ru"], f: Fix): string {
  const save = f.deltaMin;
  switch (f.kind) {
    case "raise-hours":  return t.fixRaise(f.patch.hours as number, save);
    case "extend-date":  return t.fixExtend(f.patch.days as number, save);
    case "lower-depth":  return t.fixDepth(f.patch.tier as string, save);
    case "drop-goal":    return t.fixDrop((f.patch.label as string) ?? (f.patch.goalId as string), save);
    case "exclude-track":return t.fixExclude(f.patch.track as string, save);
  }
}

function FixList({ lang }: { lang: Locale }) {
  const t = L[lang];
  const { fixes, combo, deficitMin } = currentFixes();
  if (fixes.length === 0) return null;
  return (
    <div class="fixlist">
      <div class="panel-head" style="margin:var(--s-3) 0 var(--s-2)"><span class="ph-label">{t.fixHead}</span></div>
      <ul class="fix-items">
        {fixes.map((f, i) => (
          <li key={i} class="fix-item">
            <span class="fix-text">{fixLabel(lang, t, f)}{f.closesGap && <em class="fix-fits"> {t.fixFits}</em>}</span>
            <button type="button" class="btn btn-sm" onClick={() => applyFix(f)}>{t.fixApply}</button>
          </li>
        ))}
      </ul>
      {deficitMin > 0 && combo.length > 0 && (
        <button type="button" class="btn btn-primary btn-sm fix-auto" onClick={() => applyCombo(combo)}>{t.fixAuto}</button>
      )}
    </div>
  );
}

function PaceRow({ lang }: { lang: Locale }) {
  const t = L[lang];
  const p = currentPace();
  if (!p || p.status === "no-data") return null;
  const dl = config.value.deadline!;
  const doneH = Math.round(p.doneMin / 60);
  const totalH = Math.round((dl.baselineRequiredMin ?? 0) / 60);
  const finish = p.projectedFinishMs ? new Date(p.projectedFinishMs).toISOString().slice(0, 10) : null;
  const state = p.status === "behind" ? t.paceBehind(p.behindDays) : p.status === "ahead" ? t.paceAhead : t.paceOnTrack;
  return (
    <div class={`pace-row ${p.status}`}>
      <span class="ph-label">{t.paceHead}</span>
      <span class="pace-done">{t.paceDone(doneH, totalH)}</span>
      <span class="pace-state">{state}</span>
      {finish && p.status === "behind" && <span class="pace-finish">{t.paceFinish(finish)}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Append styles**

```css
/* deadline pace + fix suggestions */
.pace-row { display: flex; flex-wrap: wrap; gap: var(--s-2, .5rem); align-items: baseline; margin-top: var(--s-2, .5rem); font-size: .85rem; }
.pace-row.behind .pace-state { color: var(--warn, #b4690e); font-weight: 600; }
.pace-row.ahead .pace-state { color: var(--ok, #2f7d4f); }
.fix-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--s-2, .5rem); }
.fix-item { display: flex; justify-content: space-between; align-items: center; gap: var(--s-2, .5rem); font-size: .85rem; }
.fix-fits { color: var(--ok, #2f7d4f); font-style: normal; font-size: .78rem; }
.fix-auto { margin-top: var(--s-3, .75rem); }
```

- [ ] **Step 5: Verify build + visual**

Run: `bun run build`
Expected: build succeeds, lint clean.
Then start the dev server and open `/ru/roadmap` + `/en/roadmap`, set a near deadline so the verdict is "over", and confirm: HoursPicker shows −/+; suggestions list appears with hour figures; "Optimize for me" applies and flips the verdict; pace row renders after a baseline exists (set deadline, reload). Note any rough edges but do not block the commit on cosmetic-only issues.

- [ ] **Step 6: Commit**

```bash
git add src/components/path/planning/DeadlineSection.tsx src/styles/planning-screen.css
git commit -m "feat(planning): deadline suggestions + pace row; HoursPicker in DeadlineSection"
```

---

## Task 13: `GoalSection` — rank UI + live explainer + inline refine block

**Files:**
- Modify: `src/components/path/planning/GoalSection.tsx`
- Modify: `src/styles/planning-screen.css`

- [ ] **Step 1: Rewrite `GoalSection` to use ranks, an explainer, and an inline refine block**

Replace the body of `GoalSection.tsx` with the version below. It (a) shows the rank number with ↑/↓ reorder, (b) prints a live time-share explainer per active goal using `goalWeightFactor`, and (c) folds the former GoalPicker features (custom-target search + excluded-track chips) into a collapsible "refine" block that replaces the old "+ Custom goal" modal trigger.

```tsx
// src/components/path/planning/GoalSection.tsx
// 01 · GOAL — preset goals as toggle cards with a clear rank (1 = most important; rank 1 gets
// the most time) and a live time-share explainer. A collapsible "refine" block holds custom
// concept targets + excluded tracks (formerly the GoalPicker modal — now inline, single source).
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Goal } from "~/scripts/path/types";
import {
  config, content, setGoals, toggleCustomTarget, toggleExcludedTrack, searchConcepts,
} from "~/scripts/path/path-io";
import { normalizeRanks, goalWeightFactor } from "~/scripts/path/goal-rank";

const L = {
  en: {
    tracks: (n: number) => `${n} track${n === 1 ? "" : "s"}`,
    concepts: (n: number) => `${n} concept${n === 1 ? "" : "s"}`,
    share: (pct: number) => `#${0} → ~${pct}% of plan time`, // replaced below; kept for type-shape
    rankNote: (rank: number, pct: number) => `#${rank} · ~${pct}% of plan time`,
    refine: "Refine / custom targets", hide: "Hide",
    targets: "Custom targets", search: "Search concepts to target…",
    exclude: "Excluded tracks", up: "more important", down: "less important",
  },
  ru: {
    tracks: (n: number) => `${n} трек${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    concepts: (n: number) => `${n} концепт${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    share: (pct: number) => `~${pct}%`,
    rankNote: (rank: number, pct: number) => `№${rank} · ~${pct}% времени плана`,
    refine: "Уточнить / свои цели", hide: "Скрыть",
    targets: "Свои цели", search: "Найти концепты для цели…",
    exclude: "Исключённые треки", up: "важнее", down: "менее важно",
  },
} as const;

function goalMeta(lang: Locale, g: Goal): string {
  const t = L[lang];
  const trackN = Object.keys(g.trackWeights ?? {}).length;
  const conceptN = g.target?.concepts?.length ?? 0;
  const parts: string[] = [];
  if (trackN > 0) parts.push(t.tracks(trackN));
  if (conceptN > 0) parts.push(t.concepts(conceptN));
  return parts.join(" · ");
}

export default function GoalSection({ lang }: { lang: Locale }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const active = cfg.goals;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const ranked = normalizeRanks(active);
  const n = ranked.length;
  const rankOf = (id: string) => ranked.find((r) => r.id === id)?.rank ?? null;
  // Time-share: a goal's weight factor over the sum of all active factors.
  const factorSum = ranked.reduce((s, r) => s + goalWeightFactor(r.rank, n), 0) || 1;
  const shareOf = (rank: number) => Math.round((goalWeightFactor(rank, n) / factorSum) * 100);

  // Toggle on → append at the next (least-important) rank, encoded as priority = max+1.
  const toggle = (id: string) => {
    if (active.some((g) => g.id === id)) {
      setGoals(active.filter((g) => g.id !== id));
    } else {
      const nextPrio = active.length ? Math.max(...active.map((g) => g.priority)) + 1 : 1;
      setGoals([...active, { id, priority: nextPrio }]);
    }
  };

  // Reorder: rewrite priorities to the new rank order so normalizeRanks stays consistent.
  const move = (id: string, dir: "up" | "down") => {
    const order = [...ranked].map((r) => r.id);
    const i = order.indexOf(id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setGoals(order.map((gid, idx) => ({ id: gid, priority: idx + 1 })));
  };

  const custom = cfg.customTargets ?? [];
  const results = searchConcepts(content.concepts, content.taughtConcepts, q, lang, 20).filter((c) => !custom.includes(c.id));
  const tracks = [...new Set(content.concepts.map((c) => c.track))].sort();

  return (
    <div>
      <div class="goals">
        {content.goals.map((g) => {
          const rank = rankOf(g.id);
          const on = rank !== null;
          return (
            <div key={g.id} class={`goal-wrap${on ? " on" : ""}`}>
              <button type="button" class="goal" aria-pressed={on} onClick={() => toggle(g.id)}>
                {on && <span class="g-prio">{rank}</span>}
                <span class="g-name">{g.label[lang]}</span>
                <span class="g-meta">{goalMeta(lang, g)}</span>
              </button>
              {on && (
                <div class="g-rank">
                  <span class="g-share">{t.rankNote(rank!, shareOf(rank!))}</span>
                  <span class="g-arrows">
                    <button type="button" aria-label={t.up} disabled={rank === 1} onClick={() => move(g.id, "up")}>↑</button>
                    <button type="button" aria-label={t.down} disabled={rank === n} onClick={() => move(g.id, "down")}>↓</button>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" class="goal-refine-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? t.hide : t.refine}
      </button>

      {open && (
        <div class="goal-refine">
          <h3>{t.targets}</h3>
          <div class="chips">
            {custom.map((id) => (
              <button key={id} class="chip on" onClick={() => toggleCustomTarget(id)}>
                {content.conceptById.get(id)?.label[lang] ?? id} ✕
              </button>
            ))}
          </div>
          <input class="refine-search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder={t.search} />
          {results.length > 0 && (
            <ul class="refine-results">
              {results.map((c) => (
                <li key={c.id}>
                  <button onClick={() => { toggleCustomTarget(c.id); setQ(""); }}>
                    <span>{c.label[lang]}</span><span class="r-track">{c.track}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3>{t.exclude}</h3>
          <div class="chips">
            {tracks.map((tr) => {
              const offTrack = cfg.excludedTracks.includes(tr);
              return <button key={tr} class={`chip${offTrack ? " excluded" : ""}`} onClick={() => toggleExcludedTrack(tr)}>{tr}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Append styles**

```css
/* goal rank + refine block */
.goal-wrap { display: flex; flex-direction: column; }
.g-rank { display: flex; justify-content: space-between; align-items: center; padding: 2px var(--s-2, .5rem); font-size: .78rem; color: var(--ink-2, #6b6459); }
.g-arrows button { border: 1px solid var(--line, #d9d3c7); background: var(--paper, #faf7f0); border-radius: 4px; padding: 0 .35rem; margin-left: 2px; cursor: pointer; }
.g-arrows button:disabled { opacity: .35; cursor: default; }
.goal-refine-toggle { margin-top: var(--s-3, .75rem); font-size: .85rem; text-decoration: underline; color: var(--ink-2, #6b6459); background: none; border: 0; cursor: pointer; }
.goal-refine { margin-top: var(--s-2, .5rem); padding: var(--s-3, .75rem); border: 1px solid var(--line, #d9d3c7); border-radius: 8px; }
.goal-refine h3 { font-size: .85rem; font-weight: 600; margin: var(--s-2, .5rem) 0; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { border: 1px solid var(--line, #d9d3c7); border-radius: 6px; padding: 2px 8px; font-size: .75rem; background: var(--paper, #faf7f0); cursor: pointer; }
.chip.on { border-color: #6ba3d6; background: #eaf3fb; }
.chip.excluded { border-color: #d68a8a; background: #fbeaea; color: #9a3b3b; }
.refine-search { display: block; width: 100%; margin: var(--s-2, .5rem) 0; padding: .3rem .5rem; border: 1px solid var(--line, #d9d3c7); border-radius: 6px; font-size: .85rem; }
.refine-results { list-style: none; margin: 0 0 var(--s-2); padding: 0; max-height: 12rem; overflow-y: auto; border: 1px solid var(--line, #d9d3c7); border-radius: 6px; }
.refine-results button { display: flex; justify-content: space-between; width: 100%; padding: .3rem .5rem; background: none; border: 0; text-align: left; font-size: .85rem; cursor: pointer; }
.refine-results button:hover { background: #f1ede4; }
.r-track { color: var(--ink-3, #8a8378); font-size: .75rem; }
```

- [ ] **Step 3: Build (GoalSection signature changed — `onCustom` prop removed; PathView still passes it until Task 15)**

Run: `bun run build`
Expected: a TypeScript error in `PathView.tsx` because it still passes `onCustom` to `GoalSection`. That is fixed in Task 15. To keep this task self-contained, temporarily make `onCustom` optional is NOT needed — instead Task 15 immediately follows. If you want a green build at this checkpoint, proceed to Task 15 before running the full build, and commit both together. Otherwise commit now and accept the known transient type error until Task 15.

> Recommended: commit GoalSection here, then do Task 15 (PathView) next; run the full build at the end of Task 15.

- [ ] **Step 4: Commit**

```bash
git add src/components/path/planning/GoalSection.tsx src/styles/planning-screen.css
git commit -m "feat(planning): goal rank UI + live time-share + inline refine block"
```

---

## Task 14: `TodayFocus.tsx` — "today / next up" card

**Files:**
- Create: `src/components/path/planning/TodayFocus.tsx`
- Modify: `src/styles/planning-screen.css`

- [ ] **Step 1: Create the component**

```tsx
// src/components/path/planning/TodayFocus.tsx
// Top-of-screen focus: what to do TODAY. Deadline set → today's schedule row; otherwise the
// next path step. When behind/over, surfaces the single best catch-up action inline.
import type { Locale } from "~/i18n";
import { config, content, computePath, currentPace, currentFixes, applyFix } from "~/scripts/path/path-io";
import unitsJson from "~/content/units.json";

type UnitMeta = { track: string; slug: string; firstLesson?: string };
const UNIT_META = new Map<string, UnitMeta>(
  (unitsJson as Array<{ id: string; slug: string; track: string; lessons: string[] }>).map((u) => [u.id, { track: u.track, slug: u.slug, firstLesson: u.lessons?.[0] }]),
);
function startHref(lang: Locale, unitId: string): string | null {
  const m = UNIT_META.get(unitId);
  return m?.firstLesson ? `/${lang}/learn/${m.track}/${m.slug}/${m.firstLesson}` : null;
}

const L = {
  en: { today: "Today", next: "Next up", start: "Start", min: (m: number) => `~${m} min`,
    done: "Nothing due — you're on top of your plan.", behind: (d: number) => `Behind ~${d} day(s).`, apply: "Apply" },
  ru: { today: "Сегодня", next: "Дальше", start: "Начать", min: (m: number) => `~${m} мин`,
    done: "На сегодня ничего — ты в графике.", behind: (d: number) => `Отстаёшь ~${d} дн.`, apply: "Применить" },
} as const;

export default function TodayFocus({ lang }: { lang: Locale }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const { path, schedule } = computePath();

  // Today's units (deadline mode) or the next step.
  let head = t.next;
  let units: { unit: string; title: string }[] = [];
  let minutes = 0;
  if (schedule) {
    const firstDay = schedule.days.find((d) => d.steps.length > 0);
    if (firstDay) {
      head = t.today;
      minutes = firstDay.minutes;
      units = firstDay.steps.map((s) => ({ unit: s.unit, title: content.unitTitleById.get(s.unit)?.[lang] ?? s.unit }));
    }
  } else if (path.steps.length > 0) {
    const s = path.steps[0];
    units = [{ unit: s.unit, title: content.unitTitleById.get(s.unit)?.[lang] ?? s.unit }];
    minutes = s.estMin;
  }

  if (units.length === 0) return <section class="today-card empty"><p>{t.done}</p></section>;

  const href = startHref(lang, units[0].unit);
  const p = currentPace();
  const { combo } = currentFixes();
  const catchUp = (p?.status === "behind" || (schedule?.feasibility.verdict === "over")) ? combo[0] : undefined;

  return (
    <section class="today-card">
      <div class="tc-main">
        <span class="tc-head">{head}</span>
        <span class="tc-units">{units.map((u) => u.title).join(" · ")}</span>
        <span class="tc-min">{t.min(minutes)}</span>
        {href && <a class="btn btn-primary btn-sm" href={href}><span>{t.start}</span><span class="arrow">→</span></a>}
      </div>
      {catchUp && (
        <div class="tc-catchup">
          {p?.status === "behind" && <span>{t.behind(p.behindDays)}</span>}
          <button type="button" class="btn btn-sm" onClick={() => applyFix(catchUp)}>{t.apply}</button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Append styles**

```css
/* today focus card */
.today-card { border: 1px solid var(--line, #d9d3c7); border-left: 3px solid var(--accent, #2c6fb0); border-radius: 10px; padding: var(--s-3, .75rem) var(--s-4, 1rem); margin-bottom: var(--s-4, 1rem); background: var(--paper, #faf7f0); }
.today-card.empty { border-left-color: var(--ok, #2f7d4f); color: var(--ink-2, #6b6459); }
.tc-main { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s-3, .75rem); }
.tc-head { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--accent, #2c6fb0); font-weight: 700; }
.tc-units { font-weight: 600; }
.tc-min { color: var(--ink-3, #8a8378); font-size: .85rem; }
.tc-catchup { display: flex; align-items: center; gap: var(--s-2, .5rem); margin-top: var(--s-2, .5rem); font-size: .85rem; color: var(--warn, #b4690e); }
```

- [ ] **Step 3: Build check (component not yet mounted)**

Run: `bun run build`
Expected: compiles (mounted in Task 15). If you deferred the Task 13 build error, that error still stands until Task 15 — proceed.

- [ ] **Step 4: Commit**

```bash
git add src/components/path/planning/TodayFocus.tsx src/styles/planning-screen.css
git commit -m "feat(planning): TodayFocus card (today's units + catch-up action)"
```

---

## Task 15: `PathView` — layout reorder, mount TodayFocus, remove goals modal

**Files:**
- Modify: `src/components/path/PathView.tsx`

- [ ] **Step 1: Update imports**

Remove the `GoalPicker` import; add `TodayFocus`:

```ts
import TodayFocus from "./planning/TodayFocus";
// (delete) import GoalPicker from "./GoalPicker";
```

- [ ] **Step 2: Drop the "goals" modal from state and JSX**

Change the modal state union to drop `"goals"`:

```ts
  const [modal, setModal] = useState<null | "config">(null);
```

Remove the `{modal === "goals" && <GoalPicker ... />}` line near the bottom.

- [ ] **Step 3: Reorder sections + mount TodayFocus; update section indices**

Reorder the JSX so planning sits on top. The new order: XP strip → cold banner → droppedLocal → **TodayFocus** → **01 GOAL** → **02 DEADLINE** → **03 PATH** → **04 MAP** → Advanced. Update the `L` section labels accordingly:

In `L.en`: `secGoal: "01 · GOAL", secDl: "02 · INSTRUMENT", secPath: "03 · PATH", secMap: "04 · INSTRUMENT"`.
In `L.ru`: `secGoal: "01 · ЦЕЛЬ", secDl: "02 · ИНСТРУМЕНТ", secPath: "03 · ПУТЬ", secMap: "04 · ИНСТРУМЕНТ"`.

Replace the section markup block (from the cold-start/droppedLocal area through Advanced knobs) with:

```tsx
      {/* droppedLocal warning */}
      {droppedLocal && <p class="banner dropped">{t.droppedNote}</p>}

      {/* TODAY focus */}
      <TodayFocus lang={lang} />

      {/* 01 · GOAL */}
      <section class="screen-section" aria-labelledby="goal-h">
        <div class="sec-head">
          <span class="sec-index">{t.secGoal}</span>
          <h2 id="goal-h">{t.goalHead}</h2>
          <span class="sec-note">{t.goalNote}</span>
        </div>
        <GoalSection lang={lang} />
      </section>

      {/* 02 · INSTRUMENT — deadline */}
      <section class="screen-section" aria-labelledby="dl-h">
        <div class="sec-head">
          <span class="sec-index">{t.secDl}</span>
          <h2 id="dl-h">{t.dlHead}</h2>
          <span class="sec-note">{t.dlNote}</span>
        </div>
        <DeadlineSection lang={lang} />
      </section>

      {/* 03 · PATH — next units */}
      <section class="screen-section" aria-labelledby="next-h">
        <div class="sec-head">
          <span class="sec-index">{t.secPath}</span>
          <h2 id="next-h">{t.pathHead}</h2>
          <span class="sec-note">{t.pathNote}</span>
        </div>
        <NextPath lang={lang} onQuickCheck={(u) => setQuickUnit(u)} />
      </section>

      {/* 04 · INSTRUMENT — concept-mastery map */}
      <section class="screen-section" aria-labelledby="map-h">
        <div class="sec-head">
          <span class="sec-index">{t.secMap}</span>
          <h2 id="map-h">{t.mapHead}</h2>
          <span class="sec-note">{t.mapNote}</span>
        </div>
        <ConceptMasteryMap lang={lang} />
      </section>

      {/* Advanced knobs */}
      <section class="screen-section">
        <AdvancedKnobs lang={lang} onGraphEdits={() => setModal("config")} />
      </section>
```

(`GoalSection` no longer takes `onCustom` — the refine block is inline now.)

- [ ] **Step 4: Full build (now green — Task 13's transient error resolves here)**

Run: `bun run build`
Expected: build succeeds, lint clean. If TypeScript flags an unused `GoalPicker` import or `modal === "goals"`, remove the leftover.

- [ ] **Step 5: Visual check**

Open `/en/roadmap` and `/ru/roadmap`: planning (Today → Goal → Deadline) is above the path list; goal cards show rank + time-share + ↑/↓; the "Refine" toggle reveals custom-target search + excluded-track chips; the old "+ Custom goal" modal no longer opens.

- [ ] **Step 6: Commit**

```bash
git add src/components/path/PathView.tsx
git commit -m "feat(planning): planning-first layout + TodayFocus; drop goals modal trigger"
```

---

## Task 16: Delete `GoalPicker.tsx` (de-dup) + final gate

**Files:**
- Delete: `src/components/path/GoalPicker.tsx`

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "GoalPicker" src` 
Expected: no matches (PathView import + usage already removed in Task 15). If any remain, remove them.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/path/GoalPicker.tsx
```

- [ ] **Step 3: Full test suite + build gate**

Run: `bun run test`
Expected: all unit tests pass (new path modules + existing).
Run: `bun run build`
Expected: build succeeds, lint clean, page count unchanged from baseline.

- [ ] **Step 4: i18n parity sanity check**

Confirm every new UI string added in Tasks 11-15 has both `en` and `ru` entries in its component `L` map (no `glossary.json` change needed — no new locked terms). Spot-check `/ru/roadmap` for untranslated English leaking through.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(planning): remove duplicated GoalPicker modal — single goal/deadline editor"
```

---

## Self-review (completed during planning)

**Spec coverage:**
- Part 1 roles → Tasks 3 (rule), 9 (presets). ✅
- Part 2 depth-as-time → Tasks 1 (tierEffort), 5 (schedule), 10 (tierOf wiring). ✅
- Part 3 optimization → Tasks 7 (deltas), 8 (optimize), 10 (currentFixes/applyFix/applyCombo), 12 (UI). ✅
- Part 4 pace → Tasks 6 (pace + types), 10 (currentPace), 12 (PaceRow). ✅
- Part 5 today focus → Task 14, mounted in 15. ✅
- Part 6 layout → Task 15. ✅
- Part 7 hours picker → Task 11, used in 12 (and the GoalPicker copy is deleted in 16). ✅
- Part 8 priority + de-dup → Tasks 2 (goal-rank), 4 (planner), 13 (GoalSection rank UI + inline refine), 15/16 (remove modal). ✅

**Type consistency:** `Fix`/`LeverInputs` from `optimize.ts` are reused verbatim in `path-io.ts` and `DeadlineSection`. `Pace` from `pace.ts` reused in `path-io` + `DeadlineSection`. `tierOf`/`tierEffort` signatures consistent across schedule/path-io. `goalTrackWeight` signature change `(track, goals, ranks)` is updated at its only call site (`orderUnits`) in the same task (4). `setDeadline` keeps its `(DeadlineConfig | undefined)` signature; baseline is added internally. `GoalSection` prop change (drop `onCustom`) is reconciled in Task 15.

**Placeholder scan:** no TBD/TODO; every code step shows full code; role weights are concrete (calibratable, but present). The only deliberate cross-task dependency (GoalSection build error until PathView lands) is called out explicitly in Task 13 Step 3.
