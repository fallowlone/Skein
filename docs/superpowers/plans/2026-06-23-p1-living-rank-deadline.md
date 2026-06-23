# P1 — Living Rank + Deadline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the visible learner rank and the deadline forecast move from real study (decayed `KnowledgeState`), not only the one-time placement test — truthfully, and never punitively.

**Architecture:** A new PURE module `src/scripts/progression/effective-rating.ts` derives a study rating from goal-frontier coverage, blends it with the placement rating as a floor (`max` + EMA), and exposes a monotonic high-water badge plus an honest rating-date forecast. Thin glue in `path-io.ts` recomputes it reactively (a `@preact/signals` `effect` on `knowledge`/`config`) and persists `peakRating`/`studyEma` into the existing `progression` object. Consumers (`ProfilePanel`, `achievements`, `TodayFocus`) read the derived rating instead of `pretest.rating` alone.

**Tech Stack:** TypeScript, Preact + `@preact/signals`, Astro 5, Vitest (`vitest run`), bun.

## Global Constraints

- Imports use the `~/` alias (`~` → `site/src/`); never `..` relative segments. (verbatim project rule)
- Hydration cap = 5 client islands per page; do not add new islands. (verbatim project rule)
- Every reader-facing string is bilingual EN + RU, switched on `lang`. (verbatim project rule)
- Pure functions take no clock: NO `Date.now()` / `new Date()` inside `effective-rating.ts`; tests pass explicit epoch-ms. Glue code in `path-io.ts` may call `Date.now()`. (Vitest workers disallow argless `new Date()` in some path tests; mirror existing `pace.test.ts` which passes ms.)
- No `console.log` in committed code.
- Rating scale is `0–1000`. Senior bar = rating `600` (`senior-engineer-1` min, market-annotated "≈ the senior bar").
- Gate for each task: the task's Vitest tests pass AND `bun run test` stays green; integration/UI tasks additionally pass `bun run build` and a dev-curl of the named page in EN + RU. (Project memory: logic/content must gate on build+test, not lint alone.)
- Commit after each task. Commit type: `feat`/`test`/`refactor` per change.
- Work on branch `feat/adaptive-loop-activation` (already created from `main`). Run commands from `site/` unless noted.

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/scripts/progression/types.ts` | `Progression` type | Modify — add `peakRating?`, `studyEma?`, `studyRatingAt?` |
| `src/scripts/user-state.ts` | state store + `defaultProgression()` | Modify — initializers unchanged (new fields optional); no required change beyond confirming compile |
| `src/scripts/progression/effective-rating.ts` | PURE rating derivation | Create |
| `src/scripts/progression/effective-rating.test.ts` | unit tests for the pure module | Create |
| `src/scripts/path/path-io.ts` | glue: reactive recompute + persist | Modify — add import, `syncEffectiveRating()`, `effect(...)` |
| `src/components/progression/ProfilePanel.tsx` | rank UI host | Modify — pass `displayRating`; add "placed X → now Y" |
| `src/scripts/progression/achievements.ts` | rank achievements | Modify — predicates read derived rating |
| `src/scripts/progression/achievements.test.ts` | achievement tests | Create or modify (mirror existing test file if present) |
| `src/components/path/planning/TodayFocus.tsx` | deadline focus surface | Modify — add "reach senior bar by `<date>`" line |

Verified anchors (do not re-derive): `progression` initializer `user-state.ts:41`; `defaultProgression()` `user-state.ts:124-126`; `RANKS`/`ratingToRank` `ranks.ts:16-47`; market annotations `ranks.ts:30-39` (`senior-engineer-1` min 600); `effectiveKnowledge()` `path-io.ts:455-457`; evidence-refresh top-level calls `path-io.ts:311,346,395`; `concepts` `path-io.ts:144`; `goalById` `path-io.ts:147`; `targetFrontier` imported `path-io.ts:28` (from `./planner`); `userState` imported into path-io `path-io.ts:23` (no reverse import → no cycle); `KnowledgeState = Map<string, {confidence; source; lastAt}>` `types.ts:24-25`; rank predicates `achievements.ts:31-34`; `evaluateAchievements` `achievements.ts:47-51`; `RankNow`/`RankLadder` render `ProfilePanel.tsx:129-130`, props from `userState.value.pretest` `ProfilePanel.tsx:67-68`; `currentPace()` used in `TodayFocus.tsx` (~line 118) and `DeadlineSection.tsx`; `Pace.projectedFinishMs` `pace.ts:12-23`; test style `pace.test.ts:1-16`; runner `vitest run`.

---

### Task 1: Extend `Progression` with study-derived rating fields

**Files:**
- Modify: `src/scripts/progression/types.ts` (the `Progression` interface)
- (Confirm only) `src/scripts/user-state.ts:124-126` `defaultProgression()` — new fields are optional, no change required.

**Interfaces:**
- Produces: `Progression` now carries optional `peakRating?: number`, `studyEma?: number`, `studyRatingAt?: number`. All later tasks read/write these.

- [ ] **Step 1: Add the optional fields to the `Progression` interface**

In `src/scripts/progression/types.ts`, locate the `Progression` interface (the type whose shape is `{ xp, level, achievements, streak, titles }`) and add three optional fields:

```ts
export interface Progression {
  xp: number;
  level: number;
  achievements: Record<string, number>;
  streak: { lastActiveDay: string; count: number; best: number };
  titles: string[];
  // Study-derived rating (P1 — living rank). Absent ⇒ no study signal yet; fall back to pretest.
  peakRating?: number;   // monotonic high-water of effectiveRating (visible rank; never decreases)
  studyEma?: number;     // EMA of studyRating, carried into the next blend
  studyRatingAt?: number; // epoch ms of last recompute
}
```

Keep the existing fields exactly as they are; only append the three optional lines. (If the existing field types differ slightly from above, preserve the existing ones — only add the three new optional fields.)

- [ ] **Step 2: Type-check the change**

Run: `bun run build` (or `bunx tsc --noEmit` if faster locally)
Expected: build/type-check passes; no errors about `Progression`.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything/site
git add src/scripts/progression/types.ts
git commit -m "feat(progression): add peakRating/studyEma fields to Progression type"
```

---

### Task 2: `studyRating` — coverage of the goal frontier → rating

**Files:**
- Create: `src/scripts/progression/effective-rating.ts`
- Test: `src/scripts/progression/effective-rating.test.ts`

**Interfaces:**
- Consumes: `KnowledgeState` from `~/scripts/path/types` (`Map<string, { confidence: number; source; lastAt: number }>`).
- Produces: `studyRating(frontier: Set<string>, knowledge: KnowledgeState, barRating: number, floorRating?: number): number`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/progression/effective-rating.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "~/scripts/path/types";
import { studyRating } from "./effective-rating";

// Build a KnowledgeState from { conceptId: confidence } pairs.
const K = (pairs: Record<string, number>): KnowledgeState =>
  new Map(Object.entries(pairs).map(([id, confidence]) => [id, { confidence, source: "activity" as const, lastAt: 0 }]));

describe("studyRating", () => {
  it("full coverage of the frontier reaches the bar rating", () => {
    const frontier = new Set(["a", "b"]);
    expect(studyRating(frontier, K({ a: 1, b: 1 }), 600)).toBe(600);
  });
  it("half coverage is half the bar (rounded), missing concepts count as 0", () => {
    const frontier = new Set(["a", "b"]);
    expect(studyRating(frontier, K({ a: 1 }), 600)).toBe(300); // b missing ⇒ 0
  });
  it("empty frontier returns the floor (default 0)", () => {
    expect(studyRating(new Set(), K({}), 600)).toBe(0);
  });
  it("clamps per-concept confidence to [0,1]", () => {
    const frontier = new Set(["a"]);
    expect(studyRating(frontier, K({ a: 5 }), 600)).toBe(600); // clamped to 1
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: FAIL — `studyRating` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/scripts/progression/effective-rating.ts`:

```ts
import type { KnowledgeState } from "~/scripts/path/types";

/** Coverage of the goal frontier mapped onto the 0–1000 rating scale.
 *  coverage = mean clamped confidence over the frontier; missing concepts ⇒ 0.
 *  Full coverage ≈ the goal's bar rating; a higher-bar goal raises the ceiling. */
export function studyRating(
  frontier: Set<string>,
  knowledge: KnowledgeState,
  barRating: number,
  floorRating = 0,
): number {
  if (frontier.size === 0) return floorRating;
  let sum = 0;
  for (const id of frontier) {
    const m = knowledge.get(id);
    sum += m ? Math.max(0, Math.min(1, m.confidence)) : 0;
  }
  const coverage = sum / frontier.size;
  return Math.round(floorRating + (barRating - floorRating) * coverage);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/effective-rating.ts src/scripts/progression/effective-rating.test.ts
git commit -m "feat(progression): studyRating — goal-frontier coverage to rating"
```

---

### Task 3: `blendRating` — placement floor + EMA of study

**Files:**
- Modify: `src/scripts/progression/effective-rating.ts`
- Modify: `src/scripts/progression/effective-rating.test.ts`

**Interfaces:**
- Produces: `blendRating(placementRating: number, prevStudyEma: number | undefined, studyRatingRaw: number, alpha?: number): { ema: number; effective: number }`.

- [ ] **Step 1: Write the failing test** (append to the test file)

```ts
import { blendRating } from "./effective-rating";

describe("blendRating", () => {
  it("first sample: ema equals the raw study rating", () => {
    expect(blendRating(0, undefined, 200).ema).toBe(200);
  });
  it("placement is a floor: effective is never below placement", () => {
    expect(blendRating(500, undefined, 200).effective).toBe(500);
  });
  it("study above placement raises effective to the ema", () => {
    expect(blendRating(100, undefined, 300).effective).toBe(300);
  });
  it("ema smooths a single session (alpha 0.3)", () => {
    // 0.3*200 + 0.7*100 = 130
    expect(blendRating(0, 100, 200).ema).toBe(130);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: FAIL — `blendRating` not exported.

- [ ] **Step 3: Write minimal implementation** (append to `effective-rating.ts`)

```ts
/** Blend study into placement: placement is a FLOOR, study only adds on top (max).
 *  EMA damps single-session jitter. */
export function blendRating(
  placementRating: number,
  prevStudyEma: number | undefined,
  studyRatingRaw: number,
  alpha = 0.3,
): { ema: number; effective: number } {
  const ema = prevStudyEma === undefined
    ? studyRatingRaw
    : Math.round(alpha * studyRatingRaw + (1 - alpha) * prevStudyEma);
  return { ema, effective: Math.max(placementRating, ema) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/effective-rating.ts src/scripts/progression/effective-rating.test.ts
git commit -m "feat(progression): blendRating — placement floor + study EMA"
```

---

### Task 4: `highWater` — monotonic visible badge

**Files:**
- Modify: `src/scripts/progression/effective-rating.ts`
- Modify: `src/scripts/progression/effective-rating.test.ts`

**Interfaces:**
- Produces: `highWater(prevPeak: number | undefined, effective: number): number`.

- [ ] **Step 1: Write the failing test** (append)

```ts
import { highWater } from "./effective-rating";

describe("highWater", () => {
  it("undefined previous peak returns the current effective", () => {
    expect(highWater(undefined, 500)).toBe(500);
  });
  it("never decreases below the previous peak", () => {
    expect(highWater(700, 500)).toBe(700); // decay must not demote the badge
  });
  it("rises when effective exceeds the peak", () => {
    expect(highWater(500, 620)).toBe(620);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: FAIL — `highWater` not exported.

- [ ] **Step 3: Write minimal implementation** (append)

```ts
/** Visible rank uses the high-water mark — earned rank is never taken away. */
export function highWater(prevPeak: number | undefined, effective: number): number {
  return Math.max(prevPeak ?? 0, effective);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/effective-rating.ts src/scripts/progression/effective-rating.test.ts
git commit -m "feat(progression): highWater — monotonic visible rank"
```

---

### Task 5: `barRatingForGoal` + `hasEnoughEvidence`

**Files:**
- Modify: `src/scripts/progression/effective-rating.ts`
- Modify: `src/scripts/progression/effective-rating.test.ts`

**Interfaces:**
- Produces: `barRatingForGoal(goalId: string): number`; `hasEnoughEvidence(frontier: Set<string>, knowledge: KnowledgeState, tau?: number, minEvidence?: number): boolean`.

- [ ] **Step 1: Write the failing test** (append)

```ts
import { barRatingForGoal, hasEnoughEvidence } from "./effective-rating";

describe("barRatingForGoal", () => {
  it("senior-fullstack maps to the senior bar (600)", () => {
    expect(barRatingForGoal("senior-fullstack")).toBe(600);
  });
  it("job-ready-junior maps to the junior ceiling (450)", () => {
    expect(barRatingForGoal("job-ready-junior")).toBe(450);
  });
  it("unknown goal defaults to the senior bar (600)", () => {
    expect(barRatingForGoal("whatever")).toBe(600);
  });
});

describe("hasEnoughEvidence", () => {
  const K = (pairs: Record<string, number>): KnowledgeState =>
    new Map(Object.entries(pairs).map(([id, confidence]) => [id, { confidence, source: "activity" as const, lastAt: 0 }]));
  it("false when fewer than minEvidence concepts clear tau", () => {
    expect(hasEnoughEvidence(new Set(["a", "b", "c"]), K({ a: 0.9, b: 0.9 }), 0.6, 5)).toBe(false);
  });
  it("true when at least minEvidence concepts clear tau", () => {
    const f = new Set(["a", "b", "c", "d", "e"]);
    expect(hasEnoughEvidence(f, K({ a: 0.7, b: 0.7, c: 0.7, d: 0.7, e: 0.7 }), 0.6, 5)).toBe(true);
  });
  it("confidence below tau does not count", () => {
    const f = new Set(["a", "b", "c", "d", "e"]);
    expect(hasEnoughEvidence(f, K({ a: 0.5, b: 0.5, c: 0.5, d: 0.5, e: 0.5 }), 0.6, 5)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: FAIL — symbols not exported.

- [ ] **Step 3: Write minimal implementation** (append)

```ts
/** Goal → rating bar, anchored on the rank ladder's market annotations:
 *  apprentice-1=125 (junior baseline), engineer-1=450 (junior ceiling / entry-middle),
 *  engineer-2=500 (middle interviews), senior-engineer-1=600 (the senior bar). Tunable in P2. */
const GOAL_BAR: Record<string, number> = {
  "senior-fullstack": 600,
  "ai-engineer": 600,
  "interview-prep": 600,
  "job-ready-junior": 450,
};
export function barRatingForGoal(goalId: string): number {
  return GOAL_BAR[goalId] ?? 600;
}

/** Suppress the "now Y" surface until enough frontier concepts are genuinely cleared,
 *  so a sparse early signal can't mislead. */
export function hasEnoughEvidence(
  frontier: Set<string>,
  knowledge: KnowledgeState,
  tau = 0.6,
  minEvidence = 5,
): boolean {
  let n = 0;
  for (const id of frontier) {
    const m = knowledge.get(id);
    if (m && m.confidence >= tau) n++;
  }
  return n >= minEvidence;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/effective-rating.ts src/scripts/progression/effective-rating.test.ts
git commit -m "feat(progression): barRatingForGoal + hasEnoughEvidence gate"
```

---

### Task 6: `projectRatingDate` — honest rating-crossing forecast

**Files:**
- Modify: `src/scripts/progression/effective-rating.ts`
- Modify: `src/scripts/progression/effective-rating.test.ts`

**Interfaces:**
- Produces: `interface RatingForecast { reached: boolean; projectedMs: number | null; daysAheadBehind: number }` and `projectRatingDate(effectiveRating: number, targetRating: number, projectedFinishMs: number | null, targetDateMs: number): RatingForecast`.
- Design note: v1 equates "reach the goal's bar" with the path-completion date the existing `pace()` already projects (`Pace.projectedFinishMs`), since the planner builds the path to cover the goal frontier. `daysAheadBehind` is signed vs the deadline (`>0` behind, `<0` ahead).

- [ ] **Step 1: Write the failing test** (append)

```ts
import { projectRatingDate } from "./effective-rating";
const DAY = 86_400_000;
const T = Date.UTC(2026, 6, 15); // deadline 2026-07-15

describe("projectRatingDate", () => {
  it("already at/above target ⇒ reached, no projected date", () => {
    const r = projectRatingDate(620, 600, T + 5 * DAY, T);
    expect(r).toEqual({ reached: true, projectedMs: null, daysAheadBehind: 0 });
  });
  it("below target, finish after deadline ⇒ positive days behind", () => {
    const finish = T + 5 * DAY;
    const r = projectRatingDate(500, 600, finish, T);
    expect(r.reached).toBe(false);
    expect(r.projectedMs).toBe(finish);
    expect(r.daysAheadBehind).toBe(5);
  });
  it("below target, finish before deadline ⇒ negative days (ahead)", () => {
    const r = projectRatingDate(500, 600, T - 3 * DAY, T);
    expect(r.daysAheadBehind).toBe(-3);
  });
  it("no projected finish ⇒ null date, zero days", () => {
    const r = projectRatingDate(500, 600, null, T);
    expect(r).toEqual({ reached: false, projectedMs: null, daysAheadBehind: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: FAIL — `projectRatingDate` not exported.

- [ ] **Step 3: Write minimal implementation** (append)

```ts
export interface RatingForecast {
  reached: boolean;            // effective rating already at/above target
  projectedMs: number | null;  // projected date the rating crosses target (path-completion proxy)
  daysAheadBehind: number;     // >0 behind deadline, <0 ahead, 0 on-time/unknown
}

const FORECAST_DAY = 86_400_000;

/** v1: the rating crosses the goal bar when the goal-frontier path completes, which pace()
 *  already projects as projectedFinishMs. Honest because clearing knowledge raises the path's
 *  remaining minutes and pushes that date out; the high-water badge is unaffected. */
export function projectRatingDate(
  effectiveRating: number,
  targetRating: number,
  projectedFinishMs: number | null,
  targetDateMs: number,
): RatingForecast {
  if (effectiveRating >= targetRating) return { reached: true, projectedMs: null, daysAheadBehind: 0 };
  if (projectedFinishMs === null) return { reached: false, projectedMs: null, daysAheadBehind: 0 };
  const daysAheadBehind = Math.round((projectedFinishMs - targetDateMs) / FORECAST_DAY);
  return { reached: false, projectedMs: projectedFinishMs, daysAheadBehind };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/progression/effective-rating.test.ts`
Expected: PASS (whole file green).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/effective-rating.ts src/scripts/progression/effective-rating.test.ts
git commit -m "feat(progression): projectRatingDate — rating-crossing forecast"
```

---

### Task 7: Glue — reactive recompute in `path-io.ts`

**Files:**
- Modify: `src/scripts/path/path-io.ts` (add import; add `syncEffectiveRating()` + `effect(...)` after line 395)

**Interfaces:**
- Consumes: `studyRating`, `blendRating`, `highWater`, `hasEnoughEvidence`, `barRatingForGoal` (Task 2–6); in-scope `effectiveKnowledge()`, `concepts` (`path-io.ts:144`), `goalById` (`path-io.ts:147`), `targetFrontier` (`path-io.ts:28`), `config`, `knowledge`, `userState` (`path-io.ts:23`).
- Produces: a `@preact/signals` `effect` that, on every `knowledge`/`config` change, writes `progression.peakRating`/`studyEma`/`studyRatingAt`. No new exports.
- Cycle/loop safety: read user state with `userState.peek()` (NOT `.value`) inside the recompute so writing `userState.value` does not re-trigger the effect.

- [ ] **Step 1: Add the import and `effect` to the signals import**

At the top of `src/scripts/path/path-io.ts`, add to the existing `@preact/signals` import the `effect` symbol (the same import that already brings in `signal`). Then add:

```ts
import {
  studyRating,
  blendRating,
  highWater,
  hasEnoughEvidence,
  barRatingForGoal,
} from "~/scripts/progression/effective-rating";
```

Confirm `Goal` is imported in this file (it is used by `computePath`); if not, add it to the existing `./types` import.

- [ ] **Step 2: Add `syncEffectiveRating()` and register the effect**

Immediately AFTER the existing `if (typeof window !== "undefined") refreshReviewEvidence();` line (`path-io.ts:395`), append:

```ts
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
```

(If `targetFrontier`'s signature in `./planner` differs from `(goals, config, concepts)`, adjust the call to match — the build will surface the exact expected arguments.)

- [ ] **Step 3: Verify existing tests still pass and the project type-checks/builds**

Run: `bun run test`
Expected: PASS (no regressions; pure-module tests included).

Run: `bun run build`
Expected: build succeeds (lint + render). No type errors in `path-io.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/path/path-io.ts
git commit -m "feat(path): reactively derive effective rating from study and persist peak"
```

---

### Task 8: `ProfilePanel` — show the living rank + "placed X → now Y"

**Files:**
- Modify: `src/components/progression/ProfilePanel.tsx` (read sites `:67-68`, render `:129-130`)

**Interfaces:**
- Consumes: `userState.value.progression.peakRating` (Task 1/7), `ratingToRank` from `~/scripts/progression/ranks`.
- Produces: `RankNow`/`RankLadder` driven by `displayRating = max(pretest.rating, peakRating)`; a bilingual "placed at X → now Y" note when study has raised the rank.

- [ ] **Step 1: Add the `ratingToRank` import (if absent) and compute `displayRating`**

Ensure this import exists near the top of `ProfilePanel.tsx`:

```ts
import { ratingToRank } from "~/scripts/progression/ranks";
```

Where `pretest` is read (`ProfilePanel.tsx:67-68`), add right after:

```ts
const peakRating = s.progression.peakRating ?? 0;
const displayRating = Math.max(pretest?.rating ?? 0, peakRating);
const displayRank = ratingToRank(displayRating).id;
const movedUp = !!pretest && displayRating > pretest.rating;
```

- [ ] **Step 2: Drive the rank components with `displayRating`**

Replace the two render lines (`ProfilePanel.tsx:129-130`):

```tsx
<RankNow lang={lang} rank={pretest.rank} rating={pretest.rating} confidence={pretest.confidence} />
<RankLadder lang={lang} rating={pretest.rating} />
```

with:

```tsx
<RankNow lang={lang} rank={displayRank} rating={displayRating} confidence={pretest.confidence} />
{movedUp && (
  <p class="rank-progress-note" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.75;">
    {lang === "ru"
      ? `Размещён на ${pretest.rating} → сейчас ${displayRating}`
      : `Placed at ${pretest.rating} → now ${displayRating}`}
  </p>
)}
<RankLadder lang={lang} rating={displayRating} />
```

(Match the surrounding markup's class/style conventions if the file uses CSS modules or utility classes; the inline style above is a safe fallback. Do not add a new hydrated island.)

- [ ] **Step 3: Build and dev-curl the profile page in EN + RU**

Run: `bun run build`
Expected: build succeeds.

Run (in one terminal): `bun run dev` — then in another:
```bash
curl -s http://localhost:4321/en/profile | grep -i "now\|rank" | head
curl -s http://localhost:4321/ru/profile | grep -i "сейчас\|rank" | head
```
(Use the actual profile route if it differs — find it under `src/pages/`; the panel host page. Expected: page renders without error; rank markup present.)

- [ ] **Step 4: Commit**

```bash
git add src/components/progression/ProfilePanel.tsx
git commit -m "feat(progression): ProfilePanel shows living rank + placed→now note"
```

---

### Task 9: Rank achievements fire from study, not only placement

**Files:**
- Modify: `src/scripts/progression/achievements.ts` (predicates `:31-34`)
- Create/Modify: `src/scripts/progression/achievements.test.ts`

**Interfaces:**
- Consumes: `progression.peakRating` (Task 1). The predicate signature already receives `s: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">`.
- Produces: rank predicates read `s.progression.peakRating ?? s.pretest?.rating ?? 0`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/progression/achievements.test.ts` (if a test file already exists, append the `describe` block):

```ts
import { describe, it, expect } from "vitest";
import { evaluateAchievements } from "./achievements";

const ctx: any = {}; // rank predicates ignore ctx; other achievements stay false on empty state.
const base = { pretest: null as any, history: {}, retrieval: {}, progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] } as any };

describe("rank achievements track study", () => {
  it("fires rank-engineer from study peakRating with no pretest", () => {
    const s = { ...base, progression: { ...base.progression, peakRating: 460 } };
    expect(evaluateAchievements(s, ctx)).toContain("rank-engineer");
  });
  it("still fires from pretest.rating when no study peak (backward compatible)", () => {
    const s = { ...base, pretest: { rating: 460 } as any };
    expect(evaluateAchievements(s, ctx)).toContain("rank-engineer");
  });
  it("does not fire rank-senior below 750", () => {
    const s = { ...base, progression: { ...base.progression, peakRating: 700 } };
    expect(evaluateAchievements(s, ctx)).not.toContain("rank-senior");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/achievements.test.ts`
Expected: FAIL — `rank-engineer` not in result (predicate still reads only `s.pretest.rating`, and `pretest` is null).

- [ ] **Step 3: Update the four rank predicates**

In `achievements.ts:31-34`, change each rank predicate from `(s) => !!s.pretest && s.pretest.rating >= N` to read the derived rating. Keep the same thresholds:

```ts
{ id: "rank-engineer", icon: "🛠️", xp: 30, label: { en: "Engineer", ru: "Инженер" }, desc: { en: "Reach the Engineer tier", ru: "Достичь тира Engineer" }, predicate: (s) => (s.progression.peakRating ?? s.pretest?.rating ?? 0) >= 450 },
{ id: "rank-senior", icon: "🧭", xp: 60, label: { en: "Made Senior", ru: "Дорос до senior" }, desc: { en: "Reach the Staff tier (senior)", ru: "Достичь тира Staff (senior)" }, predicate: (s) => (s.progression.peakRating ?? s.pretest?.rating ?? 0) >= 750 },
{ id: "rank-architect", icon: "🏛️", xp: 90, label: { en: "Architect", ru: "Архитектор" }, desc: { en: "Reach the Architect tier", ru: "Достичь тира Architect" }, predicate: (s) => (s.progression.peakRating ?? s.pretest?.rating ?? 0) >= 930 },
{ id: "distinguished", icon: "👑", xp: 150, label: { en: "Distinguished", ru: "Distinguished" }, desc: { en: "Reach the apex rank", ru: "Достичь апекс-ранга" }, predicate: (s) => (s.progression.peakRating ?? s.pretest?.rating ?? 0) >= 990 },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/progression/achievements.test.ts`
Expected: PASS. Then `bun run test` to confirm no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/achievements.ts src/scripts/progression/achievements.test.ts
git commit -m "feat(progression): rank achievements gate on study-derived rating"
```

---

### Task 10: `TodayFocus` — "reach the senior bar by `<date>`" line

**Files:**
- Modify: `src/components/path/planning/TodayFocus.tsx`

**Interfaces:**
- Consumes: in-component `currentPace()` (already imported, ~line 118), `config.value`, `userState.value`; pure `barRatingForGoal`, `projectRatingDate` (Task 5/6); `ratingToRank` from `~/scripts/progression/ranks`.
- Produces: one bilingual line forecasting the date the effective rating crosses the goal bar, with ahead/behind days. No new island.

- [ ] **Step 1: Add imports**

Near the top of `TodayFocus.tsx` add (skip any already present):

```ts
import { userState } from "~/scripts/user-state";
import { ratingToRank } from "~/scripts/progression/ranks";
import { barRatingForGoal, projectRatingDate } from "~/scripts/progression/effective-rating";
```

- [ ] **Step 2: Compute the forecast inside the component**

Inside `TodayFocus`, after `const p = currentPace();` (~line 118), add:

```ts
const us = userState.value;
const dl = config.value.deadline;
const goalsSorted = [...config.value.goals].sort((a, b) => a.priority - b.priority);
const goalId = goalsSorted[0]?.id ?? "senior-fullstack";
const barRating = barRatingForGoal(goalId);
const effRating = Math.max(us.pretest?.rating ?? 0, us.progression.studyEma ?? 0);
const rf = dl ? projectRatingDate(effRating, barRating, p?.projectedFinishMs ?? null, dl.targetDateMs) : null;
const barLabel = ratingToRank(barRating).label[lang];
const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const aheadBehind = (d: number) =>
  d > 0 ? (lang === "ru" ? `на ${d} дн. позже дедлайна` : `${d} days behind deadline`)
  : d < 0 ? (lang === "ru" ? `на ${-d} дн. раньше` : `${-d} days ahead`)
  : (lang === "ru" ? "точно к дедлайну" : "right on deadline");
```

- [ ] **Step 3: Render the line**

In the component's returned JSX, near the catch-up action, add:

```tsx
{rf && rf.reached && (
  <p class="rating-forecast" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.8;">
    {lang === "ru" ? `Ты достиг планки ${barLabel}` : `You've reached the ${barLabel} bar`}
  </p>
)}
{rf && !rf.reached && rf.projectedMs && (
  <p class="rating-forecast" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.8;">
    {lang === "ru"
      ? `При текущем темпе достигнешь планки ${barLabel} к ${fmtDate(rf.projectedMs)} — ${aheadBehind(rf.daysAheadBehind)}`
      : `At this pace you reach the ${barLabel} bar by ${fmtDate(rf.projectedMs)} — ${aheadBehind(rf.daysAheadBehind)}`}
  </p>
)}
```

- [ ] **Step 4: Build and dev-curl the planning page in EN + RU**

Run: `bun run build`
Expected: build succeeds.

Run `bun run dev`, then:
```bash
curl -s http://localhost:4321/en/roadmap | grep -i "pace\|bar\|reach" | head
curl -s http://localhost:4321/ru/roadmap | grep -i "темпе\|планки" | head
```
(Use the actual route that hosts `TodayFocus` — find it under `src/pages/` if `/roadmap` differs. Expected: renders without error; the forecast line appears when a deadline + pace exist.)

- [ ] **Step 5: Commit**

```bash
git add src/components/path/planning/TodayFocus.tsx
git commit -m "feat(path): TodayFocus forecasts reaching the seniority bar by date"
```

---

## Final verification (after all tasks)

- [ ] Run `bun run test` — all unit tests green (including `effective-rating.test.ts`, `achievements.test.ts`).
- [ ] Run `bun run build` — full build + lint + render clean.
- [ ] Manual check (dev server): with a deadline set, completing lessons/practice moves the rank "now Y" upward on `/profile` and the forecast date on the planning page; clearing knowledge does NOT lower the visible rank (high-water) but DOES push the forecast date out.
- [ ] Per project memory, this logic change is gated on build + test (not lint alone). Confirm both passed before opening a PR for P1.

## Self-Review notes (author)

- **Spec coverage:** rank tracks study → Tasks 1–4,7,8; deadline-to-rank forecast → Tasks 5,6,10; achievements retarget → Task 9; min-evidence gate + EMA smoothing + high-water → Tasks 3,4,5,7; data model (`peakRating`/`studyEma`) → Task 1; reuse of `effectiveKnowledge`/`ratingToRank`/`targetFrontier`/`pace` → Task 7,10. All P1 spec sections mapped.
- **Type consistency:** `RatingForecast` shape and `studyRating`/`blendRating`/`highWater`/`barRatingForGoal`/`hasEnoughEvidence`/`projectRatingDate` signatures are identical across the module, glue (Task 7), and UI (Task 10).
- **Known v1 simplifications (documented, deferred):** rating-crossing date proxied by `pace.projectedFinishMs`; `GOAL_BAR` hardcoded (P2 curates `senior-fullstack` frontier and may move bars); routes for dev-curl confirmed by the implementer against `src/pages/`.
