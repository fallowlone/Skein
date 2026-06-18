# Planning-Engine: Learner-Productivity Plan Network

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the planning engine produce the shortest *sound* learning path to job-ready-with-depth for a single learner, by fixing the binding constraint — placement accuracy — and hardening forecast honesty.

**Why this, grounded in measurement (2026-06-18):**
- Engine ordering/scheduling/cost logic is **already correct** (DAG-validated, decay as read-model clamped, inclusive deadline day, baseline guard, partial-unit cost). Verified by 4-layer code map.
- The binding constraint is **placement**: only **145 / 5035** concepts (2.9%) have diagnostic banks. The plan is built from known-state, but known-state is ~3% measured → it over-teaches (shows known material) or under-teaches (skips depth).
- Diagnostic results **propagate** through the concept DAG (`applyDiagnostic` lifts ancestors on pass, lowers descendants on fail), so the lever is **keystone** concepts, not uniform coverage.
- Measured reach: current 145 banks already cover **42%** by propagation (2117 concepts). Greedy keystone targeting lifts this to ~**53% at top-200**, ~**57% at top-300**, then plateaus. 1597 concepts are isolated leaves (no edges) → only self-declare/own-bank can place them.

**Learner goal mapping:** "качественный программист / не лениться думать / получить работу" → existing preset `job-ready-junior` (`target.rule = "track-band=surface..middle"`, `goals.json`). Surface..middle already includes middle-band depth. Plan B Task 1 keeps that resolution single-sourced; the campaign authors *understanding/transfer* diagnostics (not trivia) to honour the "не лениться думать" intent.

**Tech Stack:** TypeScript (pure modules in `src/scripts/path/`), Vitest (`bun run test` → `vitest run`), Preact islands (`src/components/path/`), Node ESM build scripts (`scripts/path/*.mjs`), JSON content (`src/content/path/`).

## Global Constraints
- Test runner is **`bun run test`** (= `vitest run`). NEVER `bun test`.
- Planner core stays **pure** (no signals, no DOM, no clock) — clock/IO injected. Mirror existing `planner.ts` / `calibration.ts` style.
- `src/lint/rules/path.ts` **mirrors** `planner.resolveGoalTargets`; any change to goal-resolution must keep both in sync OR (Plan B Task 1) collapse them to one source.
- Build-time edge changes must pass `scripts/path/acyclic-gate.mjs` (Kahn) — no cycle ever ships.
- Content/data scripts must be **deterministic** (no clock/random/network) and diff-clean on rerun, like `build-path-data.mjs`.
- Bilingual parity: any authored diagnostic bank is EN + RU or it fails `validate-diag-banks.mjs`.

---

## Plan Network — sequencing

| Plan | What | Leverage | Cost | Depends on |
|---|---|---|---|---|
| **B** | Engine honesty + de-dup goal-resolution | Trust in forecast; removes drift gotcha | Low | — (do first, independent) |
| **A-code** | Goal-aware keystone ranking module + wire into calibration + emit authoring worklist | Makes calibration short & high-coverage; produces the worklist for A-content | Medium | B Task 1 (single goal-resolution source) |
| **A-content** | Author top-N undiagnosed keystone banks from the worklist | Placement 42%→~57% on the job-ready frontier | High (LLM campaign) | A-code (worklist) |
| **C** | Placement-completeness meter + fast self-declare for leaves | Learner sees/fixes blind spots; covers 1597 leaves propagation can't | Low-Med | A-code (completeness needs ranking) |

Each plan produces working, testable software on its own. **A-content** is a content campaign (LLM authoring via Workflow), not bite-sized TDD — it is specified at the end as a campaign with gates, not as code tasks.

---

# PLAN B — Engine honesty + de-dup

**Goal:** One source of truth for goal-resolution, and forecasts that never silently lie.

**Architecture:** Extract `resolveGoalTargets` into a shared pure module imported by both the planner and the lint rule. Add explicit warnings where the engine currently degrades silently (missing practice `estMin`, optimistically clamped pace).

**File Structure:**
- `src/scripts/path/goal-resolve.ts` (NEW) — sole `resolveGoalTargets` + `targetFrontier` home.
- `src/scripts/path/planner.ts` (MODIFY) — import from `goal-resolve.ts`, delete local copy.
- `src/lint/rules/path.ts` (MODIFY) — import `resolveGoalTargets`, delete the mirrored `resolveGoal`.
- `src/scripts/path/pace.ts` (MODIFY) — add `clamped: boolean` to the pace read-model.
- `scripts/path/build-path-data.mjs` (MODIFY) — warn (non-fatal) when a lesson has no practice `estMin`.

### Task 1: Single goal-resolution source

**Files:**
- Create: `src/scripts/path/goal-resolve.ts`
- Modify: `src/scripts/path/planner.ts` (remove local `resolveGoalTargets`/`targetFrontier`, re-export from new module)
- Modify: `src/lint/rules/path.ts` (remove mirrored `resolveGoal`, import shared fn)
- Test: `src/scripts/path/goal-resolve.test.ts`

**Interfaces:**
- Produces: `resolveGoalTargets(goal: Goal, concepts: Concept[]): string[]`, `targetFrontier(goals: Goal[], config: PathConfig, concepts: Concept[]): Set<string>` — identical signatures to the current `planner.ts` exports so all callers keep working.

- [ ] **Step 1: Write the failing test** — pin the three DSL branches + exclusions against the real catalog so refactor is behaviour-preserving.

```ts
import { describe, it, expect } from "vitest";
import { content } from "./path-io"; // concepts catalog
import { resolveGoalTargets, targetFrontier } from "./goal-resolve";

describe("goal-resolve", () => {
  it("track-band=surface..middle returns core-track concepts within [surface,middle]", () => {
    const goal = { id: "job-ready-junior", label: { en: "", ru: "" },
      target: { rule: "track-band=surface..middle" }, trackWeights: { networking: 1 } } as any;
    const ids = resolveGoalTargets(goal, content.concepts);
    const byId = new Map(content.concepts.map(c => [c.id, c]));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const b = byId.get(id)!.band;
      expect(["surface", "middle"]).toContain(b);
    }
  });
  it("explicit target.concepts pass through unchanged", () => {
    const goal = { id: "x", label: { en: "", ru: "" }, target: { concepts: ["bit", "byte"] }, trackWeights: {} } as any;
    expect(resolveGoalTargets(goal, content.concepts).sort()).toEqual(["bit", "byte"]);
  });
  it("targetFrontier unions goals + customTargets minus excludedTracks", () => {
    const cfg = { customTargets: ["big_o"], excludedTracks: [] } as any;
    const fr = targetFrontier([], cfg, content.concepts);
    expect(fr.has("big_o")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/scripts/path/goal-resolve.test.ts`
Expected: FAIL — `Cannot find module './goal-resolve'`.

- [ ] **Step 3: Create `goal-resolve.ts`** by moving the *exact* current bodies of `resolveGoalTargets` and `targetFrontier` out of `planner.ts:14-69` (copy verbatim, including the `BAND_RANK` / core-track `trackWeights >= 1` logic and the three regex branches `band>=`, `track-band>=`, `track-band=LO..HI`). Import `Goal`, `Concept`, `PathConfig` from `./types`.

- [ ] **Step 4: Rewire `planner.ts`** — delete the moved bodies; add `export { resolveGoalTargets, targetFrontier } from "./goal-resolve";` and import them for internal use in `buildPath`.

- [ ] **Step 5: Rewire `src/lint/rules/path.ts`** — delete the local `resolveGoal` (lines ~94-132) and its duplicate regex branches; import `resolveGoalTargets` from `../../scripts/path/goal-resolve` and call it where `resolveGoal` was used. Keep the lint assertion "every goal resolves to ≥1 concept".

- [ ] **Step 6: Run the full path suite + lint unit**

Run: `bun run test src/scripts/path/`
Expected: PASS (all existing planner/goal tests still green — behaviour preserved).
Then Run: `bun run test src/lint/` (or the repo's lint test path). Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/path/goal-resolve.ts src/scripts/path/goal-resolve.test.ts src/scripts/path/planner.ts src/lint/rules/path.ts
git commit -m "refactor(path): single source for goal-resolution (de-dup planner vs lint mirror)"
```

### Task 2: Pace exposes optimistic-clamp flag

**Files:**
- Modify: `src/scripts/path/pace.ts` (add `clamped` to return type + set it when projected finish hits the horizon end)
- Modify: `src/scripts/path/path-io.ts` (`currentPace()` passes the flag through unchanged)
- Modify: `src/components/path/planning/DeadlineSection.tsx` (render a one-line "projection capped" note when `clamped`)
- Test: `src/scripts/path/pace.test.ts` (add case)

**Interfaces:**
- Produces: `Pace` return type gains `clamped: boolean` (true when realized `rate` is too low to finish within the horizon and the projected finish was pinned to the last study day).

- [ ] **Step 1: Add failing test** to `pace.test.ts`:

```ts
it("flags clamped when realized rate cannot finish within horizon", () => {
  const p = pace({
    baselineMin: 6000, currentRequiredMin: 5800,
    elapsedFrac: 0.5, elapsedAvailMin: 100, doneMin: 200,
    futureDays: [{ date: "2026-07-01", minutes: 30 }], targetMs: Date.parse("2026-07-01"),
  } as any);
  expect(p.clamped).toBe(true);
});
```

- [ ] **Step 2: Run to verify fail** — `bun run test src/scripts/path/pace.test.ts` → FAIL (`clamped` undefined).

- [ ] **Step 3: Implement** — in `pace.ts:40-54`, where the projected-finish walk pins to the last horizon day when `rate` is too low, set a local `clamped = true` in that branch (default `false`), and include `clamped` in the returned object.

- [ ] **Step 4: Run to verify pass** — `bun run test src/scripts/path/pace.test.ts` → PASS.

- [ ] **Step 5: Wire UI** — in `DeadlineSection.tsx`, when `currentPace().clamped`, render `<p class="hint">{lang==="ru"?"Прогноз упёрся в горизонт — реальный финиш может быть позже":"Projection capped — actual finish may be later"}</p>`.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/path/pace.ts src/scripts/path/pace.test.ts src/scripts/path/path-io.ts src/components/path/planning/DeadlineSection.tsx
git commit -m "feat(path): surface optimistic pace-clamp so forecast stops silently lying"
```

### Task 3: Build warns on missing practice estMin

**Files:**
- Modify: `scripts/path/build-path-data.mjs` (extract estMin fallback into a pure helper; collect + report lessons that fell back; non-fatal)
- Test: `scripts/path/build-path-data.test.mjs`

- [ ] **Step 1: Add failing test** — extract the fallback decision into pure `estMinFor(lessonId, practiceMap, proseMin)` returning `{ min, fellBack }`.

```js
import { test, expect } from "vitest";
import { estMinFor } from "./build-path-data.mjs";
test("missing practice falls back and flags", () => {
  expect(estMinFor("x/y/01-a", {}, 12)).toEqual({ min: 12, fellBack: true });
  expect(estMinFor("x/y/01-a", { "x/y/01-a": 9 }, 12)).toEqual({ min: 9, fellBack: false });
});
```

- [ ] **Step 2: Run to verify fail** — `bun run test scripts/path/build-path-data.test.mjs` → FAIL (no `estMinFor` export).

- [ ] **Step 3: Implement** — refactor inline estMin logic into exported `estMinFor(...)`; accumulate `fellBack` ids; after harvest `console.error(\`[build-path-data] \${n} lessons used prose estMin (no practice file): \${first10.join(", ")}\`)`. Keep exit code 0.

- [ ] **Step 4: Run to verify pass** — `bun run test scripts/path/build-path-data.test.mjs` → PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/path/build-path-data.mjs scripts/path/build-path-data.test.mjs
git commit -m "feat(path): warn when a lesson's estMin silently falls back to prose estimate"
```

---

# PLAN A-code — Goal-aware keystone ranking

**Goal:** Given the learner's goal frontier, order calibration probes so each answered question maximally collapses *uncertainty about what to teach*, and emit a prioritized worklist of undiagnosed keystones to author next.

**Architecture:** New pure module `keystone.ts`. Reach of a concept = size of (ancestors ∪ descendants) in the override-applied graph (a correct answer lifts ancestors, a wrong one lowers descendants). Rank by **marginal** frontier-coverage via greedy set-cover (not raw reach) so probes don't pile redundant coverage. Two consumers: (a) calibration probe ordering, (b) an authoring worklist of the highest-marginal **undiagnosed** keystones.

**File Structure:**
- `src/scripts/path/keystone.ts` (NEW) — `conceptReach`, `rankKeystones`, `keystoneWorklist`.
- `src/scripts/path/calibration.ts` (MODIFY) — `placementPlan` consults keystone order for tie-breaking among diagnosable frontier concepts.
- `scripts/path/keystone-worklist.mjs` (NEW) — CLI that writes `src/content/path/keystone-worklist.json` (the A-content input).

### Task 1: Reach + greedy marginal ranking

**Files:**
- Create: `src/scripts/path/keystone.ts`
- Test: `src/scripts/path/keystone.test.ts`

**Interfaces:**
- Produces:
  - `conceptReach(graph: ConceptGraph, id: string): number` — `ancestors(id).size + descendants(id).size`.
  - `rankKeystones(graph: ConceptGraph, frontier: Set<string>, candidates: string[]): string[]` — greedy: repeatedly pick the candidate whose closure adds the most *not-yet-covered* frontier concepts; ties → higher raw reach, then lexicographic id. Returns candidates in pick order.
  - `keystoneWorklist(graph: ConceptGraph, frontier: Set<string>, diagnosable: Set<string>, k: number): { id: string; marginal: number }[]` — same greedy over `candidates = frontier-closure minus diagnosable`, capped at `k`, each row carrying the marginal coverage it added.

- [ ] **Step 1: Write the failing test** on a tiny hand-built graph (deterministic, no catalog):

```ts
import { describe, it, expect } from "vitest";
import { buildConceptGraph } from "./graph";
import { conceptReach, rankKeystones, keystoneWorklist } from "./keystone";

const concepts = [
  { id: "a", label:{en:"",ru:""}, track:"t", band:"surface", requires: [] },
  { id: "b", label:{en:"",ru:""}, track:"t", band:"surface", requires: ["a"] },
  { id: "c", label:{en:"",ru:""}, track:"t", band:"middle",  requires: ["b"] },
  { id: "d", label:{en:"",ru:""}, track:"t", band:"middle",  requires: ["a"] },
] as any;

describe("keystone", () => {
  const g = buildConceptGraph(concepts);
  it("reach counts ancestors + descendants", () => {
    expect(conceptReach(g, "b")).toBe(2); // anc {a} + desc {c}
  });
  it("greedy ranks the widest-marginal-coverage candidate first", () => {
    const frontier = new Set(["a","b","c","d"]);
    const order = rankKeystones(g, frontier, ["c","d","b"]);
    expect(order[0]).toBe("c"); // closure {a,b,c} covers 3 frontier; ties to b on count, wins on reach
  });
  it("worklist excludes already-diagnosable and caps at k", () => {
    const wl = keystoneWorklist(g, new Set(["a","b","c","d"]), new Set(["c"]), 2);
    expect(wl.map(r => r.id)).not.toContain("c");
    expect(wl.length).toBeLessThanOrEqual(2);
    expect(wl[0].marginal).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `bun run test src/scripts/path/keystone.test.ts` → FAIL (`Cannot find module './keystone'`).

- [ ] **Step 3: Implement `keystone.ts`** using existing `ancestors`/`descendants` from `graph.ts`:

```ts
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

function closureSet(g: ConceptGraph, id: string): Set<string> {
  const s = new Set<string>([id]);
  for (const a of ancestors(g, id)) s.add(a);
  for (const d of descendants(g, id)) s.add(d);
  return s;
}

export function conceptReach(g: ConceptGraph, id: string): number {
  return ancestors(g, id).size + descendants(g, id).size;
}

export function rankKeystones(g: ConceptGraph, frontier: Set<string>, candidates: string[]): string[] {
  const covered = new Set<string>();
  const pool = [...candidates];
  const out: string[] = [];
  while (pool.length) {
    let best = pool[0], bestGain = -1, bestReach = -1;
    for (const id of pool) {
      const cl = closureSet(g, id);
      let gain = 0; for (const x of cl) if (frontier.has(x) && !covered.has(x)) gain++;
      const reach = cl.size;
      if (gain > bestGain || (gain === bestGain && reach > bestReach) ||
          (gain === bestGain && reach === bestReach && id < best)) {
        best = id; bestGain = gain; bestReach = reach;
      }
    }
    out.push(best);
    for (const x of closureSet(g, best)) if (frontier.has(x)) covered.add(x);
    pool.splice(pool.indexOf(best), 1);
  }
  return out;
}

export function keystoneWorklist(
  g: ConceptGraph, frontier: Set<string>, diagnosable: Set<string>, k: number,
): { id: string; marginal: number }[] {
  const cand = new Set<string>();
  for (const f of frontier) for (const x of closureSet(g, f)) if (!diagnosable.has(x)) cand.add(x);
  const ordered = rankKeystones(g, frontier, [...cand]);
  const covered = new Set<string>();
  const rows: { id: string; marginal: number }[] = [];
  for (const id of ordered) {
    let m = 0; for (const x of closureSet(g, id)) if (frontier.has(x) && !covered.has(x)) m++;
    if (m <= 0) continue;
    for (const x of closureSet(g, id)) if (frontier.has(x)) covered.add(x);
    rows.push({ id, marginal: m });
    if (rows.length >= k) break;
  }
  return rows;
}
```

- [ ] **Step 4: Run to verify pass** — `bun run test src/scripts/path/keystone.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/keystone.ts src/scripts/path/keystone.test.ts
git commit -m "feat(path): goal-aware keystone reach + greedy marginal ranking"
```

### Task 2: Calibration prefers keystone order among diagnosable frontier concepts

**Files:**
- Modify: `src/scripts/path/calibration.ts` (`placementPlan` tie-break uses `rankKeystones`)
- Test: `src/scripts/path/calibration.test.ts` (add a case asserting the higher-reach diagnosable concept is probed earlier when band-preference ties)

- [ ] **Step 1: Add failing test** — reuse the small-graph fixture from keystone.test.ts (4 concepts a→b→c, a→d). Build a frontier of all four, mark `c` and `d` both diagnosable middle-band, and assert `placementPlan` plans the higher-reach one (`c`, reach 2) before `d` (reach 1).

```ts
it("among same-band diagnosable probes, higher keystone reach goes first", () => {
  const g = buildConceptGraph(concepts); // same fixture as keystone.test.ts
  const plan = placementPlan(g, new Set(["a","b","c","d"]), new Set(["c","d"]));
  const order = plan.map(p => p.concept ?? p);
  expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
});
```

- [ ] **Step 2: Run to verify fail** — `bun run test src/scripts/path/calibration.test.ts` → FAIL.

- [ ] **Step 3: Implement** — in `placementPlan`, after the existing band-preference stratification (middle→surface→advanced→foundations), order *within* each band by `rankKeystones(graph, frontier, bandDiagnosable)` instead of id. Keep express-mode cap behaviour intact. If `placementPlan`'s current signature lacks the diagnosable set, thread it through from the caller (`calibration.ts` already loads `diagnostics-index`).

- [ ] **Step 4: Run to verify pass** — `bun run test src/scripts/path/calibration.test.ts` → PASS (existing cases still green).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/calibration.ts src/scripts/path/calibration.test.ts
git commit -m "feat(path): calibration probes high-reach keystones first (shorter, higher-coverage placement)"
```

### Task 3: Worklist CLI for the authoring campaign

**Files:**
- Create: `scripts/path/keystone-worklist.mjs`
- Create: `src/content/path/keystone-worklist.json` (generated output, committed)
- Create: `scripts/path/keystone-worklist.test.mjs`
- Modify: `package.json` (add `"path:keystone": "node scripts/path/keystone-worklist.mjs"`)

**Interfaces:**
- Produces `keystone-worklist.json`: `{ goal: string, k: number, rows: { id, label, band, track, marginal }[] }` — ordered authoring targets for A-content.

- [ ] **Step 1: Implement the CLI** — load `concepts.json` + `concept-overrides.json`, `buildConceptGraph`, resolve the `job-ready-junior` frontier via `resolveGoalTargets` (from Plan B Task 1), load diagnosable set from `diagnostics-index.json`, call `keystoneWorklist(graph, frontier, diagnosable, 200)`, attach labels/band/track, write JSON sorted by pick order. Deterministic (no clock/random).

- [ ] **Step 2: Run it**

Run: `bun run path:keystone`
Expected: writes `src/content/path/keystone-worklist.json` with ~150-200 rows, each `marginal >= 1`; rerun is byte-identical.

- [ ] **Step 3: Sanity-assert coverage** — `keystone-worklist.test.mjs` asserts the summed marginal of all rows is > 600 (the campaign meaningfully expands job-ready coverage) and no row id is already in `diagnostics-index.json`.

- [ ] **Step 4: Commit**

```bash
git add scripts/path/keystone-worklist.mjs scripts/path/keystone-worklist.test.mjs src/content/path/keystone-worklist.json package.json
git commit -m "feat(path): emit goal-aware keystone authoring worklist for diagnostic expansion"
```

---

# PLAN C — Placement-completeness meter + leaf self-declare

**Goal:** Let the learner *see* how much of their goal frontier is actually measured vs declared vs guessed, and quickly seed the isolated leaves that propagation can never place.

**File Structure:**
- `src/scripts/path/completeness.ts` (NEW) — pure `frontierCompleteness(...)`.
- `src/components/path/planning/PlacementMeter.tsx` (NEW) — renders the meter + a "declare the rest" affordance.
- `src/components/path/PathView.tsx` (MODIFY) — mount the meter near GoalSection.

### Task 1: Completeness read-model

**Files:**
- Create: `src/scripts/path/completeness.ts`
- Test: `src/scripts/path/completeness.test.ts`

**Interfaces:**
- Produces: `frontierCompleteness(frontier: Set<string>, state: KnowledgeState, diagnosable: Set<string>, graph: ConceptGraph): { measured: number; declared: number; propagated: number; guessed: number; total: number }` — each concept in the frontier closure bucketed by the **strongest** evidence: `diagnostic` → measured, `declared` → declared, `activity` → propagated, none → guessed.

- [ ] **Step 1: Write failing test** on a small graph + a `KnowledgeState` map with mixed sources; assert the four buckets sum to `total` and a `diagnostic`-sourced concept lands in `measured`.

```ts
import { describe, it, expect } from "vitest";
import { buildConceptGraph } from "./graph";
import { frontierCompleteness } from "./completeness";
it("buckets by strongest source and sums to total", () => {
  const g = buildConceptGraph([
    { id:"a",label:{en:"",ru:""},track:"t",band:"surface",requires:[] },
    { id:"b",label:{en:"",ru:""},track:"t",band:"middle",requires:["a"] },
  ] as any);
  const state = new Map([["a",{ confidence:1, source:"diagnostic", lastAt:0 }]]) as any;
  const r = frontierCompleteness(new Set(["a","b"]), state, new Set(["a"]), g);
  expect(r.measured).toBe(1);
  expect(r.measured + r.declared + r.propagated + r.guessed).toBe(r.total);
});
```

- [ ] **Step 2: Run to verify fail** — `bun run test src/scripts/path/completeness.test.ts` → FAIL.

- [ ] **Step 3: Implement** — iterate the frontier closure; for each concept read `state.get(id)?.source`; bucket by precedence diagnostic > declared > activity > none; count.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(path): frontier placement-completeness read-model"`.

### Task 2: Meter UI + leaf declare

**Files:**
- Create: `src/components/path/planning/PlacementMeter.tsx`
- Modify: `src/components/path/PathView.tsx` (mount under GoalSection)

- [ ] **Step 1:** Render a 4-segment bar (measured/declared/propagated/guessed) from `frontierCompleteness(...)`, with a label like "62% of your goal is measured or declared". When `guessed > 0.2 * total`, show a button "Declare what you already know" that opens the existing `SelfPlacement` (per-track `declareTrackUpTo`) — the only way to place the 1597 isolated leaves.
- [ ] **Step 2:** Mount in `PathView.tsx` between GoalSection and NextPath.
- [ ] **Step 3: Visual-verify** both themes EN/RU via the dev server (no Chrome → structural check of rendered HTML acceptable).
- [ ] **Step 4: Commit** — `git commit -m "feat(path): placement-completeness meter + leaf self-declare prompt"`.

---

# A-content — Keystone diagnostic authoring campaign (content, not TDD)

**Goal:** Author EN+RU diagnostic banks for the top undiagnosed keystones in `keystone-worklist.json`, lifting job-ready-frontier placement coverage from ~42% toward ~57%.

**Not bite-sized TDD** — this is an LLM authoring campaign. Run it via the `Workflow` tool (the repo's established bulk-authoring pattern; see memory: scenario/sandbox campaigns), pipelining over `keystone-worklist.json` rows:

1. For each worklist row (batch ~20), author a diagnostic bank matching the existing schema (`src/content/path/diagnostics/<id>.json`): `{ concept, items: [{ id, type: "mcq"|"blanks", answer, irt?: {a,b,c} }] }`, EN+RU, middle+/senior depth — test *understanding/transfer*, not trivia (honours "не лениться думать").
2. After each batch: `node scripts/path/validate-diag-banks.mjs` (schema + bilingual parity gate) and `node scripts/path/build-diag-bundle.mjs` (rebuild `diagnostics-bundle.json` + `diagnostics-index.json`).
3. Gate: rerun `bun run path:keystone` — the worklist shrinks as authored ids leave the undiagnosed set; stop when the next row's marginal drops below a threshold (≈ coverage plateau near 57%).
4. Adversarially verify a sample: each authored bank's `answer` must be unambiguously correct, distractors plausible (dispatch a verifier subagent per batch).

**Acceptance:** `validate-diag-banks.mjs` clean; `diagnostics-index.json` count rises 145 → ~300; `placement-integration.test.ts` shows a synthetic job-ready learner reaches a settled plan in fewer probes than before.

---

## Self-Review

**Spec coverage:** Placement bottleneck → A-code + A-content. Forecast honesty → Plan B (pace clamp, estMin warn). De-dup drift gotcha → Plan B Task 1. Leaf coverage (1597 isolated) → Plan C self-declare. Learner-visible trust → Plan C meter. Goal preset matches depth intent → `job-ready-junior` rule `surface..middle` includes middle band (verified).

**Placeholder scan:** All test bodies are concrete code. A-code Task 2 reuses the Task 1 fixture explicitly. A-content is intentionally a campaign spec, not TDD (LLM authoring), with hard gates.

**Type consistency:** `resolveGoalTargets`/`targetFrontier` signatures identical across Plan B Task 1 and A-code Task 3. `ConceptGraph`, `ancestors`, `descendants`, `buildConceptGraph` are the real `graph.ts` exports (verified in code map). `KnowledgeState`/`ConceptMastery.source` buckets match `types.ts` (`pretest|diagnostic|activity|declared`). `placementPlan` extended with a diagnosable-set arg in A-code Task 2; the worklist CLI and calibration both read diagnosable from `diagnostics-index.json`.

**Sequence:** B → A-code → A-content → C. B Task 1 unblocks A-code Task 3 (shared `resolveGoalTargets`). C Task 1 reuses A-code's diagnosable/graph inputs.
