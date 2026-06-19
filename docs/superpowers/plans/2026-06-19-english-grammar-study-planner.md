# English Grammar Study Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive, deadline-forecasted grammar study planner over the existing Spec-A grammar corpus (`grammarTopics`) — it decides what to study/review next, ordered CEFR-banded + value-ranked, capped to a daily minute budget, hard-gated to the learner's current band.

**Architecture:** Five units. Pure planner core (`grammar-plan.ts`) consumes slim topic metadata + live FSRS mastery + EGP coverage + a target-CEFR/deadline goal and emits an ordered step list. A thin forecaster (`grammar-schedule.ts`) reuses the Track-free date/budget primitives already exported from `scripts/path/schedule.ts`. Goal state lives in `english/state.ts`. UI is one new parent island (`GrammarHome`) with Plan|Browse tabs, mounting the existing `GrammarAtlas` as the Browse child; plan rows link to the existing topic route.

**Tech Stack:** Astro 5, Preact + `@preact/signals`, TypeScript, Vitest, Tailwind. Spec: `docs/superpowers/specs/2026-06-19-english-grammar-study-planner-design.md`.

## Global Constraints

- Bun is the runner: `bun run test` (Vitest), `bun run build` (Astro + linter). NOT `bun test`.
- Imports use the `~/` alias (`~` → `site/src/`); no `..` relative segments across dirs.
- Bilingual or it fails the i18n linter: every new user-facing string is EN+RU.
- Hydration cap = 5 islands/page. The grammar page must stay within cap — the planner adds **one** parent island (`GrammarHome`) and renders `GrammarAtlas` as a non-hydrated child of it.
- Planner core (`grammar-plan.ts`, `grammar-schedule.ts`) MUST NOT import the fullstack `Path`/`Track`/`PathStep` types or `buildPath`/`schedulePlan`. Only `studyDays`, `availableMinutes`, `feasibility` may be imported from `~/scripts/path/schedule`.
- All planner core files are pure: no signals, no `astro:content`, no DOM. Mirrors `grammar-coverage.ts`.
- Immutable updates only (spread); `englishState` is a signal — never mutate `.value` in place.
- Run all commands from `site/`: `cd /Users/artemmac/dev/awesome-everything/site`.

## Existing interfaces this plan consumes (verbatim, do not redefine)

```ts
// ~/english/grammar-types
export type Cefr = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_ORDER: Cefr[];
export const cefrIndex: (c: Cefr) => number;            // index into CEFR_ORDER
export type GrammarTopic = { id: string; title: Bi; cefr: Cefr; levels: Cefr[];
  family: GrammarFamily; egp: string[]; related: string[]; /* …+lessons,gen,crossTopic */ };

// ~/english/types
export type Bi = { en: string; ru: string };
export type Band = "A2" | "B1" | "B2";

// ~/english/scheduler/types
export type CardState = { due: number; reps: number; scheduled_days: number; /* …fsrs fields */ };
export type Grade = "again" | "hard" | "good" | "easy";

// ~/english/grammar-mastery
export function isTopicDue(card: CardState | undefined, now: Date): boolean; // NOTE: Date, not ms

// ~/english/grammar-coverage
export type BandCoverage = { cefr: Cefr; total: number; covered: number; waived: number; missing: string[]; pct: number };
export type GrammarCoverage = { bands: BandCoverage[]; overallPct: number; missingTotal: number };
export function computeGrammarCoverage(topics, inventory, waivers): GrammarCoverage;

// ~/scripts/path/schedule   (Track-free primitives — the ONLY allowed imports from path/)
export function studyDays(nowMs, targetMs, perWeekdayHours: number[], blackouts: string[], tzOffsetMin: number): { date: string; minutes: number }[];
export const availableMinutes: (days: { minutes: number }[]) => number;
export function feasibility(requiredMin: number, availableMin: number, droppable: { id: string; estMin: number; roi: number }[]): { verdict: "fits"|"under"|"over"; deltaMin: number; dropped: string[] };

// ~/english/data/grammar/index   — full corpus + lookup
export const grammarTopics: GrammarTopic[];
// ~/english/data/egp/index
export const EGP_INVENTORY;       // EgpEntry[]
// ~/english/data/egp/waivers
export const COVERAGE_WAIVERS;    // Waiver[]
// ~/components/english/grammar/strings
export function gt(key: string, lang: Locale): string;
```

---

### Task 1: Goal state in `english/state.ts`

**Files:**
- Modify: `src/english/state.ts` (add `grammarGoal` to `EnglishState`, `defaults`, `load`, `resetEnglish`; add getter/setter/clear)
- Test: `src/english/grammar-goal.test.ts` (new)

**Interfaces:**
- Produces:
  ```ts
  export type GrammarGoal = { targetCefr: Cefr; deadlineMs: number; perWeekdayHours: number[]; tzOffsetMin: number };
  // on EnglishState: grammarGoal?: GrammarGoal
  export function getGrammarGoal(): GrammarGoal | undefined;
  export function setGrammarGoal(goal: GrammarGoal): void;
  export function clearGrammarGoal(): void;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/english/grammar-goal.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { englishState, getGrammarGoal, setGrammarGoal, clearGrammarGoal, resetEnglish, type GrammarGoal } from "./state";

const goal: GrammarGoal = { targetCefr: "B2", deadlineMs: 1_900_000_000_000, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0 };

describe("grammar goal state", () => {
  beforeEach(() => resetEnglish());
  it("is undefined by default", () => { expect(getGrammarGoal()).toBeUndefined(); });
  it("round-trips through set/get", () => { setGrammarGoal(goal); expect(getGrammarGoal()).toEqual(goal); });
  it("clears", () => { setGrammarGoal(goal); clearGrammarGoal(); expect(getGrammarGoal()).toBeUndefined(); });
  it("resetEnglish wipes the goal", () => { setGrammarGoal(goal); resetEnglish(); expect(getGrammarGoal()).toBeUndefined(); });
  it("does not mutate prior state object", () => {
    const before = englishState.value; setGrammarGoal(goal);
    expect(englishState.value).not.toBe(before); expect(before.grammarGoal).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-goal`
Expected: FAIL — `getGrammarGoal` / `setGrammarGoal` / `clearGrammarGoal` / `GrammarGoal` not exported.

- [ ] **Step 3: Implement in `state.ts`**

Add the type + import near the top (Cefr import):
```ts
import type { Cefr } from "./grammar-types";
export type GrammarGoal = { targetCefr: Cefr; deadlineMs: number; perWeekdayHours: number[]; tzOffsetMin: number };
```
Add to `EnglishState` type:
```ts
  grammarGoal?: GrammarGoal;
```
`defaults` needs nothing (optional field stays `undefined`). In `load()`'s returned object add:
```ts
    grammarGoal: parsed.grammarGoal && typeof parsed.grammarGoal === "object" ? parsed.grammarGoal : undefined,
```
In `resetEnglish()` the rebuilt object already omits `grammarGoal` (stays undefined) — confirm no explicit carry-over. Add the accessors at the end of the file:
```ts
export function getGrammarGoal(): GrammarGoal | undefined {
  return englishState.value.grammarGoal;
}
export function setGrammarGoal(goal: GrammarGoal): void {
  englishState.value = { ...englishState.value, grammarGoal: goal };
}
export function clearGrammarGoal(): void {
  const { grammarGoal: _drop, ...rest } = englishState.value;
  englishState.value = { ...rest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-goal`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/english/state.ts src/english/grammar-goal.test.ts
git commit -m "feat(grammar): persist target-CEFR + deadline study goal"
```

---

### Task 2: Cost model, mastery predicate, planner types in `grammar-plan.ts`

**Files:**
- Create: `src/english/grammar-plan.ts`
- Test: `src/english/grammar-plan-cost.test.ts`

**Interfaces:**
- Consumes: `Cefr`, `cefrIndex` (`~/english/grammar-types`); `CardState` (`~/english/scheduler/types`); `Bi` (`~/english/types`).
- Produces:
  ```ts
  export type PlanTopic = { id: string; title: Bi; cefr: Cefr; levels: Cefr[]; egp: string[]; related: string[] };
  export type GrammarStepKind = "learn" | "review";
  export type GrammarStep = { topicId: string; cefr: Cefr; kind: GrammarStepKind; reason: Bi; estMin: number; value: number };
  export function isMastered(card: CardState | undefined, now: number): boolean;
  export function estMin(topic: PlanTopic, targetCefr: Cefr): number;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/english/grammar-plan-cost.test.ts
import { describe, it, expect } from "vitest";
import { isMastered, estMin, type PlanTopic } from "./grammar-plan";
import type { CardState } from "./scheduler/types";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const card = (over: Partial<CardState>): CardState =>
  ({ due: NOW + 30 * DAY, reps: 5, scheduled_days: 30, ...over } as unknown as CardState);

const topic = (over: Partial<PlanTopic>): PlanTopic =>
  ({ id: "t", title: { en: "", ru: "" }, cefr: "B1", levels: ["B1"], egp: [], related: [], ...over });

describe("isMastered", () => {
  it("false when no card", () => expect(isMastered(undefined, NOW)).toBe(false));
  it("false when never reviewed", () => expect(isMastered(card({ reps: 0 }), NOW)).toBe(false));
  it("false when interval below 21d", () => expect(isMastered(card({ scheduled_days: 10 }), NOW)).toBe(false));
  it("false when mature but currently due", () => expect(isMastered(card({ scheduled_days: 30, due: NOW - DAY }), NOW)).toBe(false));
  it("true when mature and not due", () => expect(isMastered(card({ scheduled_days: 30, due: NOW + DAY }), NOW)).toBe(true));
});

describe("estMin", () => {
  it("counts authored levels up to target × 8 + 5 practice", () =>
    expect(estMin(topic({ levels: ["B1", "B2"] }), "B2")).toBe(2 * 8 + 5));
  it("excludes levels above target", () =>
    expect(estMin(topic({ levels: ["B1", "B2", "C1"] }), "B2")).toBe(2 * 8 + 5));
  it("at least one level always counts", () =>
    expect(estMin(topic({ levels: ["B1"] }), "B2")).toBe(1 * 8 + 5));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-plan-cost`
Expected: FAIL — `./grammar-plan` has no exports.

- [ ] **Step 3: Implement `grammar-plan.ts` (types + cost + predicate only)**

```ts
// src/english/grammar-plan.ts
// Pure adaptive grammar planner. No I/O, no signals — mirrors grammar-coverage.ts.
// See docs/superpowers/specs/2026-06-19-english-grammar-study-planner-design.md.
import type { Bi } from "./types";
import type { Cefr } from "./grammar-types";
import { cefrIndex } from "./grammar-types";
import type { CardState } from "./scheduler/types";

// Cost model (tunable; single source for planner + forecaster).
const MIN_PER_LESSON = 8;
const MIN_PRACTICE = 5;
export const MIN_REVIEW = 3;
const MATURE_DAYS = 21; // mirrors the word/grammar mastery threshold in state.ts / ui.ts

export type PlanTopic = { id: string; title: Bi; cefr: Cefr; levels: Cefr[]; egp: string[]; related: string[] };
export type GrammarStepKind = "learn" | "review";
export type GrammarStep = { topicId: string; cefr: Cefr; kind: GrammarStepKind; reason: Bi; estMin: number; value: number };

/** Mastered = a started card whose interval reached MATURE_DAYS and is not currently due. */
export function isMastered(card: CardState | undefined, now: number): boolean {
  return !!card && card.reps > 0 && card.scheduled_days >= MATURE_DAYS && card.due > now;
}

/** Minutes to learn a topic: authored levels up to the target × per-lesson + one practice pass. */
export function estMin(topic: PlanTopic, targetCefr: Cefr): number {
  const ti = cefrIndex(targetCefr);
  const levels = topic.levels.filter((l) => cefrIndex(l) <= ti);
  const count = Math.max(1, levels.length);
  return count * MIN_PER_LESSON + MIN_PRACTICE;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-plan-cost`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/english/grammar-plan.ts src/english/grammar-plan-cost.test.ts
git commit -m "feat(grammar): planner cost model + mastery predicate"
```

---

### Task 3: Band gating + step generation in `buildGrammarPlan`

**Files:**
- Modify: `src/english/grammar-plan.ts`
- Test: `src/english/grammar-plan-gen.test.ts`

**Interfaces:**
- Consumes: `isTopicDue` (`~/english/grammar-mastery`); `GrammarCoverage` (`~/english/grammar-coverage`); `CEFR_ORDER`, `cefrIndex` (`~/english/grammar-types`); `GrammarGoal` (`~/english/state`); types from Task 2.
- Produces:
  ```ts
  export type GrammarPlan = { steps: GrammarStep[]; today: GrammarStep[]; currentBand: Cefr; targetCefr: Cefr };
  export type BuildPlanInput = {
    topics: PlanTopic[]; cardOf: (id: string) => CardState | undefined; coverage: GrammarCoverage;
    placementBand: Cefr; goal: GrammarGoal; dailyBudgetMin: number; now: number;
  };
  export function currentBand(topics: PlanTopic[], cardOf: (id: string) => CardState | undefined, placementBand: Cefr, targetCefr: Cefr, now: number): Cefr;
  export function buildGrammarPlan(input: BuildPlanInput): GrammarPlan;
  ```
  (This task's `buildGrammarPlan` produces correct `steps` in generation order with `value: 0` and `today: []`; Task 4 adds the deterministic sort, value, and `today` cap.)

- [ ] **Step 1: Write the failing test**

```ts
// src/english/grammar-plan-gen.test.ts
import { describe, it, expect } from "vitest";
import { buildGrammarPlan, currentBand, type PlanTopic } from "./grammar-plan";
import type { GrammarCoverage } from "./grammar-coverage";
import type { GrammarGoal } from "./state";
import type { CardState } from "./scheduler/types";

const NOW = 1_800_000_000_000, DAY = 86_400_000;
const goal: GrammarGoal = { targetCefr: "B2", deadlineMs: NOW + 60 * DAY, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0 };
const emptyCov: GrammarCoverage = { bands: [], overallPct: 100, missingTotal: 0 };
const mature: CardState = { due: NOW + 30 * DAY, reps: 5, scheduled_days: 30 } as unknown as CardState;
const due: CardState = { due: NOW - DAY, reps: 4, scheduled_days: 9 } as unknown as CardState;
const T = (id: string, cefr: PlanTopic["cefr"], over: Partial<PlanTopic> = {}): PlanTopic =>
  ({ id, title: { en: id, ru: id }, cefr, levels: [cefr], egp: [], related: [], ...over });

const build = (topics: PlanTopic[], cardOf: (id: string) => CardState | undefined, placementBand: PlanTopic["cefr"]) =>
  buildGrammarPlan({ topics, cardOf, coverage: emptyCov, placementBand, goal, dailyBudgetMin: 999, now: NOW });

describe("band gate + step generation", () => {
  it("excludes learn steps above the current band (hard gate)", () => {
    const plan = build([T("a", "A2"), T("b", "B2")], () => undefined, "A2");
    const ids = plan.steps.map((s) => s.topicId);
    expect(ids).toContain("a"); expect(ids).not.toContain("b");
  });
  it("advances the band when all current-band topics are mastered", () => {
    const cardOf = (id: string) => (id === "a" ? mature : undefined);
    const plan = build([T("a", "A2"), T("b", "B1")], cardOf, "A2");
    expect(plan.currentBand).toBe("B1");
    expect(plan.steps.map((s) => s.topicId)).toContain("b");
  });
  it("surfaces a due started card as a review step regardless of band", () => {
    const cardOf = (id: string) => (id === "hi" ? due : undefined);
    const plan = build([T("hi", "B2")], cardOf, "A2");
    const step = plan.steps.find((s) => s.topicId === "hi");
    expect(step?.kind).toBe("review");
  });
  it("never lists a mastered topic as a learn step", () => {
    const plan = build([T("a", "A2")], () => mature, "A2");
    expect(plan.steps.find((s) => s.topicId === "a")).toBeUndefined();
  });
  it("respects the target ceiling", () => {
    const plan = build([T("a", "A2"), T("hi", "C1")], () => undefined, "B2");
    expect(plan.steps.map((s) => s.topicId)).not.toContain("hi");
  });
});

describe("currentBand", () => {
  it("stays at placement when current-band topics are unmastered", () => {
    expect(currentBand([T("a", "A2")], () => undefined, "A2", "B2", NOW)).toBe("A2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-plan-gen`
Expected: FAIL — `buildGrammarPlan` / `currentBand` not exported.

- [ ] **Step 3: Implement generation + gating (append to `grammar-plan.ts`)**

```ts
import { isTopicDue } from "./grammar-mastery";
import type { GrammarCoverage } from "./grammar-coverage";
import { CEFR_ORDER } from "./grammar-types";
import type { GrammarGoal } from "./state";

export type GrammarPlan = { steps: GrammarStep[]; today: GrammarStep[]; currentBand: Cefr; targetCefr: Cefr };
export type BuildPlanInput = {
  topics: PlanTopic[]; cardOf: (id: string) => CardState | undefined; coverage: GrammarCoverage;
  placementBand: Cefr; goal: GrammarGoal; dailyBudgetMin: number; now: number;
};

const isReview = (card: CardState | undefined, now: number): boolean =>
  !!card && card.reps > 0 && isTopicDue(card, new Date(now));

/** Topics whose entry CEFR === band and are within target. */
const bandLearnTopics = (topics: PlanTopic[], band: Cefr, targetCefr: Cefr): PlanTopic[] =>
  topics.filter((t) => t.cefr === band && cefrIndex(t.cefr) <= cefrIndex(targetCefr));

/** Walk the band up from placement while every learn-eligible topic at the band is mastered. */
export function currentBand(
  topics: PlanTopic[], cardOf: (id: string) => CardState | undefined,
  placementBand: Cefr, targetCefr: Cefr, now: number,
): Cefr {
  let bi = cefrIndex(placementBand);
  const ti = cefrIndex(targetCefr);
  while (bi < ti) {
    const here = bandLearnTopics(topics, CEFR_ORDER[bi], targetCefr);
    const allMastered = here.length > 0 && here.every((t) => isMastered(cardOf(t.id), now));
    if (!allMastered) break;
    bi++;
  }
  return CEFR_ORDER[bi];
}

const reviewReason: Bi = { en: "Due for review", ru: "Пора повторить" };
const learnReason: Bi = { en: "New for your level", ru: "Новое для твоего уровня" };

export function buildGrammarPlan(input: BuildPlanInput): GrammarPlan {
  const { topics, cardOf, placementBand, goal, now } = input;
  const target = goal.targetCefr;
  const band = currentBand(topics, cardOf, placementBand, target, now);
  const bi = cefrIndex(band);
  const ti = cefrIndex(target);
  const steps: GrammarStep[] = [];

  for (const t of topics) {
    const card = cardOf(t.id);
    if (isReview(card, now)) {
      steps.push({ topicId: t.id, cefr: t.cefr, kind: "review", reason: reviewReason, estMin: MIN_REVIEW, value: 0 });
      continue;
    }
    if (isMastered(card, now)) continue;
    const ci = cefrIndex(t.cefr);
    if (ci > bi || ci > ti) continue; // hard band gate + target ceiling
    steps.push({ topicId: t.id, cefr: t.cefr, kind: "learn", reason: learnReason, estMin: estMin(t, target), value: 0 });
  }
  // value + deterministic ordering + today-cap arrive in Task 4.
  return { steps, today: [], currentBand: band, targetCefr: target };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-plan-gen`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/english/grammar-plan.ts src/english/grammar-plan-gen.test.ts
git commit -m "feat(grammar): plan step generation + band hard-gate + unlock"
```

---

### Task 4: Value ranking, deterministic order, today-budget cap

**Files:**
- Modify: `src/english/grammar-plan.ts` (compute `value`, sort `steps`, fill `today`)
- Test: `src/english/grammar-plan-order.test.ts`

**Interfaces:**
- Produces (exported for test): `export function stepValue(topic: PlanTopic, card: CardState | undefined, missing: Set<string>, targetCefr: Cefr, now: number): number;`
- `buildGrammarPlan` now returns sorted `steps` and a budget-capped `today`.

Ordering rules (in the comparator):
1. reviews before learns;
2. ascending CEFR (`cefrIndex`);
3. descending `value`;
4. keep `related` confusables adjacent (stable secondary key = smallest id among self ∪ present-related);
5. `topicId` ascending (determinism across recompute).

Value weights: `W_GAP = 10` per own-egp id in the missing set; `W_NOCARD = 30` (no card) / `W_WEAKCARD = 15` (started, not mastered); `W_FOUND = 2 × max(0, targetIdx − entryIdx)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/english/grammar-plan-order.test.ts
import { describe, it, expect } from "vitest";
import { buildGrammarPlan, stepValue, type PlanTopic } from "./grammar-plan";
import type { GrammarCoverage } from "./grammar-coverage";
import type { GrammarGoal } from "./state";
import type { CardState } from "./scheduler/types";

const NOW = 1_800_000_000_000, DAY = 86_400_000;
const goal: GrammarGoal = { targetCefr: "B2", deadlineMs: NOW + 60 * DAY, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0 };
const T = (id: string, cefr: PlanTopic["cefr"], over: Partial<PlanTopic> = {}): PlanTopic =>
  ({ id, title: { en: id, ru: id }, cefr, levels: [cefr], egp: [], related: [], ...over });
const cov = (missing: string[]): GrammarCoverage =>
  ({ bands: [{ cefr: "A2", total: 9, covered: 0, waived: 0, missing, pct: 0 }], overallPct: 0, missingTotal: missing.length });

describe("stepValue", () => {
  it("scores coverage-gap topics above non-gap peers", () => {
    const miss = new Set(["egp.1"]);
    const hi = stepValue(T("a", "A2", { egp: ["egp.1"] }), undefined, miss, "B2", NOW);
    const lo = stepValue(T("b", "A2", { egp: ["egp.9"] }), undefined, miss, "B2", NOW);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("ordering + today cap", () => {
  const build = (topics: PlanTopic[], cardOf: (id: string) => CardState | undefined, missing: string[], dailyBudgetMin: number) =>
    buildGrammarPlan({ topics, cardOf, coverage: cov(missing), placementBand: "A2", goal, dailyBudgetMin, now: NOW });

  it("reviews come before learn steps", () => {
    const due: CardState = { due: NOW - DAY, reps: 3, scheduled_days: 8 } as unknown as CardState;
    const plan = build([T("learn", "A2"), T("rev", "A2")], (id) => (id === "rev" ? due : undefined), [], 999);
    expect(plan.steps[0].kind).toBe("review");
  });
  it("higher-value topic sorts first within a band", () => {
    const plan = build([T("low", "A2", { egp: ["x"] }), T("high", "A2", { egp: ["egp.1"] })], () => undefined, ["egp.1"], 999);
    const learns = plan.steps.filter((s) => s.kind === "learn").map((s) => s.topicId);
    expect(learns[0]).toBe("high");
  });
  it("is deterministic across recompute (stable id tiebreak)", () => {
    const mk = () => build([T("b", "A2"), T("a", "A2")], () => undefined, [], 999).steps.map((s) => s.topicId);
    expect(mk()).toEqual(mk());
  });
  it("today is the prefix that fits the daily budget", () => {
    // two A2 learn topics, estMin = 1*8+5 = 13 each; budget 20 fits exactly one.
    const plan = build([T("a", "A2"), T("b", "A2")], () => undefined, [], 20);
    expect(plan.today.length).toBe(1);
    expect(plan.steps.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-plan-order`
Expected: FAIL — `stepValue` not exported; ordering/today assertions fail.

- [ ] **Step 3: Implement value + sort + today cap**

Add the weights + `stepValue` near the cost constants:
```ts
const W_GAP = 10, W_NOCARD = 30, W_WEAKCARD = 15, W_FOUND = 2;

export function stepValue(topic: PlanTopic, card: CardState | undefined, missing: Set<string>, targetCefr: Cefr, now: number): number {
  const gap = topic.egp.reduce((n, id) => n + (missing.has(id) ? 1 : 0), 0) * W_GAP;
  const weakness = card ? (isMastered(card, now) ? 0 : W_WEAKCARD) : W_NOCARD;
  const foundational = Math.max(0, cefrIndex(targetCefr) - cefrIndex(topic.cefr)) * W_FOUND;
  return gap + weakness + foundational;
}
```

Replace the body of `buildGrammarPlan` after the generation loop (the `// value … Task 4` comment and the old `return`) with:
```ts
  const missing = new Set<string>(input.coverage.bands.flatMap((b) => b.missing));
  // assign value to learn steps (reviews stay 0 — they sort first by kind anyway)
  for (const s of steps) {
    if (s.kind !== "learn") continue;
    const t = topics.find((x) => x.id === s.topicId)!;
    s.value = stepValue(t, cardOf(s.topicId), missing, target, now);
  }
  const relatedOf = new Map(topics.map((t) => [t.id, t.related] as const));
  const present = new Set(steps.map((s) => s.topicId));
  // cluster key: smallest id among {self} ∪ related present in this step set — keeps confusables adjacent.
  const clusterKey = (id: string): string => {
    const rel = (relatedOf.get(id) ?? []).filter((r) => present.has(r));
    return [id, ...rel].sort()[0];
  };
  const kindRank = (k: GrammarStepKind) => (k === "review" ? 0 : 1);
  steps.sort((a, b) =>
    kindRank(a.kind) - kindRank(b.kind) ||
    cefrIndex(a.cefr) - cefrIndex(b.cefr) ||
    b.value - a.value ||
    clusterKey(a.topicId).localeCompare(clusterKey(b.topicId)) ||
    a.topicId.localeCompare(b.topicId),
  );
  const today: GrammarStep[] = [];
  let used = 0;
  for (const s of steps) {
    if (used + s.estMin > input.dailyBudgetMin) continue;
    today.push(s); used += s.estMin;
  }
  return { steps, today, currentBand: band, targetCefr: target };
```

- [ ] **Step 4: Run tests (new + prior planner tests still green)**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-plan`
Expected: PASS — `grammar-plan-cost`, `grammar-plan-gen`, `grammar-plan-order` all green.

- [ ] **Step 5: Commit**

```bash
git add src/english/grammar-plan.ts src/english/grammar-plan-order.test.ts
git commit -m "feat(grammar): value ranking, deterministic order, daily-budget today cap"
```

---

### Task 5: Forecast in `grammar-schedule.ts`

**Files:**
- Create: `src/english/grammar-schedule.ts`
- Test: `src/english/grammar-schedule.test.ts`

**Interfaces:**
- Consumes: `studyDays`, `availableMinutes`, `feasibility` (`~/scripts/path/schedule`); `GrammarPlan`, `GrammarStep` (`~/english/grammar-plan`); `GrammarGoal` (`~/english/state`).
- Produces:
  ```ts
  export type GrammarForecast = { verdict: "fits"|"under"|"over"; requiredMin: number; availableMin: number; countdownDays: number; dropped: string[] };
  export function dailyBudgetMinutes(goal: GrammarGoal, now: number): number; // today's weekday hours × 60
  export function forecastGrammarPlan(plan: GrammarPlan, goal: GrammarGoal, now: number): GrammarForecast;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/english/grammar-schedule.test.ts
import { describe, it, expect } from "vitest";
import { forecastGrammarPlan, dailyBudgetMinutes } from "./grammar-schedule";
import type { GrammarPlan, GrammarStep } from "./grammar-plan";
import type { GrammarGoal } from "./state";

const DAY = 86_400_000;
// Mon 2025-01-06 00:00 UTC
const MON = Date.UTC(2025, 0, 6);
const learn = (id: string, est: number, value = 10): GrammarStep =>
  ({ topicId: id, cefr: "B1", kind: "learn", reason: { en: "", ru: "" }, estMin: est, value });
const plan = (steps: GrammarStep[]): GrammarPlan => ({ steps, today: [], currentBand: "B1", targetCefr: "B2" });
const goal = (over: Partial<GrammarGoal> = {}): GrammarGoal =>
  ({ targetCefr: "B2", deadlineMs: MON + 6 * DAY, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0, ...over });

describe("dailyBudgetMinutes", () => {
  it("reads the weekday slot (Monday → 60)", () => expect(dailyBudgetMinutes(goal(), MON)).toBe(60));
  it("0 on a day-off weekday (Saturday)", () => expect(dailyBudgetMinutes(goal(), MON + 5 * DAY)).toBe(0));
});

describe("forecastGrammarPlan", () => {
  it("fits when required ≤ available", () => {
    const f = forecastGrammarPlan(plan([learn("a", 30)]), goal(), MON);
    expect(f.verdict).toBe("fits"); expect(f.requiredMin).toBe(30);
  });
  it("over when required exceeds available, and suggests drops", () => {
    const f = forecastGrammarPlan(plan([learn("a", 5000), learn("b", 5000, 1)]), goal(), MON);
    expect(f.verdict).toBe("over"); expect(f.dropped.length).toBeGreaterThan(0);
  });
  it("counts down inclusive of the deadline day", () => {
    const f = forecastGrammarPlan(plan([learn("a", 10)]), goal(), MON);
    expect(f.countdownDays).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-schedule`
Expected: FAIL — `./grammar-schedule` has no exports.

- [ ] **Step 3: Implement `grammar-schedule.ts`**

```ts
// src/english/grammar-schedule.ts
// Deadline forecast for the grammar plan. Reuses ONLY the Track-free date/budget
// primitives from the fullstack scheduler — no Path/Track coupling.
import { studyDays, availableMinutes, feasibility } from "~/scripts/path/schedule";
import type { GrammarPlan } from "./grammar-plan";
import type { GrammarGoal } from "./state";

const DAY = 86_400_000;

export type GrammarForecast = {
  verdict: "fits" | "under" | "over";
  requiredMin: number;
  availableMin: number;
  countdownDays: number;
  dropped: string[];
};

/** Minutes available to study today, from the goal's per-weekday hours (Mon=0…Sun=6). */
export function dailyBudgetMinutes(goal: GrammarGoal, now: number): number {
  const off = goal.tzOffsetMin * 60_000;
  const epochDay = Math.floor((now + off) / DAY);
  const weekdayMon0 = ((epochDay % 7) + 3 + 7) % 7; // epoch day 0 was Thursday
  return Math.round((goal.perWeekdayHours[weekdayMon0] ?? 0) * 60);
}

export function forecastGrammarPlan(plan: GrammarPlan, goal: GrammarGoal, now: number): GrammarForecast {
  const requiredMin = plan.steps.reduce((n, s) => n + s.estMin, 0);
  const days = studyDays(now, goal.deadlineMs, goal.perWeekdayHours, [], goal.tzOffsetMin);
  const availableMin = availableMinutes(days);
  const droppable = plan.steps
    .filter((s) => s.kind === "learn")
    .map((s) => ({ id: s.topicId, estMin: s.estMin, roi: (s.value || 1) / Math.max(1, s.estMin) }));
  const feas = feasibility(requiredMin, availableMin, droppable);
  const countdownDays = Math.max(0, Math.ceil((goal.deadlineMs - now) / DAY));
  return { verdict: feas.verdict, requiredMin, availableMin, countdownDays, dropped: feas.dropped };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar-schedule`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/english/grammar-schedule.ts src/english/grammar-schedule.test.ts
git commit -m "feat(grammar): deadline forecast reusing track-free schedule primitives"
```

---

### Task 6: UI copy in `grammar/strings.ts`

**Files:**
- Modify: `src/components/english/grammar/strings.ts` (add planner keys to the `gt` tables, EN+RU)
- Test: `src/components/english/grammar/strings-plan.test.ts`

**Interfaces:**
- Consumes: `gt(key, lang)` (existing).
- Produces keys: `plan_tab`, `browse_tab`, `goal_title`, `goal_target`, `goal_deadline`, `goal_hours`, `goal_save`, `goal_change`, `fc_fits`, `fc_under`, `fc_over`, `fc_countdown`, `today_title`, `plan_full_title`, `plan_empty`, `locked_band` — each EN+RU.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/english/grammar/strings-plan.test.ts
import { describe, it, expect } from "vitest";
import { gt } from "./strings";

const KEYS = ["plan_tab","browse_tab","goal_title","goal_target","goal_deadline","goal_hours","goal_save","goal_change","fc_fits","fc_under","fc_over","fc_countdown","today_title","plan_full_title","plan_empty","locked_band"];

describe("planner strings", () => {
  it("every planner key resolves non-empty in EN and RU, and is translated", () => {
    for (const k of KEYS) {
      expect(gt(k, "en"), `${k}.en`).toBeTruthy();
      expect(gt(k, "ru"), `${k}.ru`).toBeTruthy();
      expect(gt(k, "en")).not.toBe(gt(k, "ru"));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test strings-plan`
Expected: FAIL — keys resolve to the missing-key fallback / empty.

- [ ] **Step 3: Add the keys**

Open `src/components/english/grammar/strings.ts`. It holds an EN table and a RU table that `gt` reads (inspect the existing object shape first and match it exactly — same quoting, same trailing-comma style). Add to the **EN** table:
```ts
  plan_tab: "Plan", browse_tab: "Browse",
  goal_title: "Set your grammar goal", goal_target: "Target level", goal_deadline: "Weeks to goal",
  goal_hours: "Study hours per weekday", goal_save: "Start plan", goal_change: "Change goal",
  fc_fits: "On track", fc_under: "Room to spare", fc_over: "Behind pace",
  fc_countdown: "days left", today_title: "Today", plan_full_title: "Your path",
  plan_empty: "All caught up — nothing due.", locked_band: "Unlocks as you master this level",
```
Add to the **RU** table:
```ts
  plan_tab: "План", browse_tab: "Обзор",
  goal_title: "Поставь цель по грамматике", goal_target: "Целевой уровень", goal_deadline: "Недель до цели",
  goal_hours: "Часы занятий по будням", goal_save: "Начать план", goal_change: "Изменить цель",
  fc_fits: "В графике", fc_under: "Есть запас", fc_over: "Отстаём от темпа",
  fc_countdown: "дней осталось", today_title: "Сегодня", plan_full_title: "Твой путь",
  plan_empty: "Всё пройдено — ничего не запланировано.", locked_band: "Откроется, когда освоишь этот уровень",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test strings-plan`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/english/grammar/strings.ts src/components/english/grammar/strings-plan.test.ts
git commit -m "feat(grammar): bilingual planner UI strings"
```

---

### Task 7: `GrammarPlanner.tsx` — goal-setter + plan view

**Files:**
- Create: `src/components/english/grammar/GrammarPlanner.tsx`
- Modify: `src/components/english/grammar/grammar.css` (append `.gplan-*` rules — reuse existing tokens; no new palette)
- Test: `src/components/english/grammar/GrammarPlanner.test.tsx`

**Interfaces:**
- Consumes: `buildGrammarPlan`, `type PlanTopic`, `type GrammarStep`, `type GrammarStepKind` (`~/english/grammar-plan`); `forecastGrammarPlan`, `dailyBudgetMinutes` (`~/english/grammar-schedule`); `englishState`, `getPlacement`, `getGrammarGoal`, `setGrammarGoal`, `clearGrammarGoal`, `grammarCardOf`, `type GrammarGoal` (`~/english/state`); `type GrammarCoverage` (`~/english/grammar-coverage`); `gt` (`./strings`); `type Cefr`, `CEFR_ORDER`, `cefrIndex` (`~/english/grammar-types`); `type Locale` (`~/i18n`).
- Produces: `export type GrammarPlannerProps = { lang: Locale; topics: PlanTopic[]; coverage: GrammarCoverage };` and `export default function GrammarPlanner(props): JSX.Element`. Coverage is **passed in** (computed server-side, Task 8) so the full corpus is never bundled.

- [ ] **Step 1: Write the failing render test**

```tsx
// src/components/english/grammar/GrammarPlanner.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import GrammarPlanner from "./GrammarPlanner";
import { resetEnglish, setPlacement } from "~/english/state";
import type { PlanTopic } from "~/english/grammar-plan";
import type { GrammarCoverage } from "~/english/grammar-coverage";

const topics: PlanTopic[] = [
  { id: "present-simple", title: { en: "Present simple", ru: "Present simple" }, cefr: "A2", levels: ["A2"], egp: [], related: [] },
];
const coverage: GrammarCoverage = { bands: [], overallPct: 100, missingTotal: 0 };

describe("GrammarPlanner", () => {
  beforeEach(() => { resetEnglish(); setPlacement({ estimatedKnown: 0, band: "A2", takenAt: 0 }, []); });

  it("shows the goal-setter when no goal is set", () => {
    render(<GrammarPlanner lang="en" topics={topics} coverage={coverage} />);
    expect(screen.getByText(/Set your grammar goal/i)).toBeTruthy();
  });

  it("shows the plan after a goal is saved", () => {
    render(<GrammarPlanner lang="en" topics={topics} coverage={coverage} />);
    fireEvent.click(screen.getByText(/Start plan/i));
    expect(screen.getByText(/Today/i)).toBeTruthy();
    expect(screen.getByText(/Present simple/i)).toBeTruthy();
  });
});
```
**Harness note:** if `@testing-library/preact` is not a dev dep (check `package.json` and look for an existing `*.test.tsx` island test to copy the project's convention), replace this with a pure smoke test that imports `buildGrammarPlan` + `forecastGrammarPlan`, feeds the props' shape, and asserts `today.length > 0` and `verdict === "fits"`; verify the component itself through the Task 8 build + manual visual check.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test GrammarPlanner`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `GrammarPlanner.tsx`**

```tsx
// src/components/english/grammar/GrammarPlanner.tsx
import { useMemo, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { type Cefr, CEFR_ORDER, cefrIndex } from "~/english/grammar-types";
import type { GrammarCoverage } from "~/english/grammar-coverage";
import { buildGrammarPlan, type PlanTopic, type GrammarStep } from "~/english/grammar-plan";
import { forecastGrammarPlan, dailyBudgetMinutes } from "~/english/grammar-schedule";
import {
  englishState, getPlacement, getGrammarGoal, setGrammarGoal, clearGrammarGoal, grammarCardOf, type GrammarGoal,
} from "~/english/state";
import { gt } from "./strings";

const DAY = 86_400_000;
const TARGETS: Cefr[] = ["A2", "B1", "B2", "C1", "C2"];

export type GrammarPlannerProps = { lang: Locale; topics: PlanTopic[]; coverage: GrammarCoverage };

export default function GrammarPlanner({ lang, topics, coverage }: GrammarPlannerProps) {
  englishState.value; // subscribe to mastery/goal changes
  const goal = getGrammarGoal();
  if (!goal) return <GoalSetter lang={lang} />;

  const now = Date.now();
  const placementBand = (getPlacement()?.band ?? "A2") as Cefr;
  const dailyBudgetMin = dailyBudgetMinutes(goal, now);
  const plan = useMemo(
    () => buildGrammarPlan({ topics, cardOf: grammarCardOf, coverage, placementBand, goal, dailyBudgetMin, now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics, coverage, englishState.value, goal.targetCefr, goal.deadlineMs, dailyBudgetMin],
  );
  const forecast = useMemo(() => forecastGrammarPlan(plan, goal, now), [plan, goal]);

  const verdictKey = forecast.verdict === "fits" ? "fc_fits" : forecast.verdict === "under" ? "fc_under" : "fc_over";
  const titleById = new Map(topics.map((t) => [t.id, t.title]));
  const bandIdx = cefrIndex(plan.currentBand);

  const learns = plan.steps.filter((s) => s.kind === "learn");
  const byBand = CEFR_ORDER
    .map((c) => ({ cefr: c, steps: learns.filter((s) => s.cefr === c) }))
    .filter((g) => g.steps.length > 0);

  const Row = ({ s }: { s: GrammarStep }) => {
    const locked = s.kind === "learn" && cefrIndex(s.cefr) > bandIdx;
    const inner = (
      <>
        <span class="gplan-row-title">{titleById.get(s.topicId)?.[lang] ?? s.topicId}</span>
        <span class="gplan-row-meta">{s.cefr}{s.kind === "review" ? " · ↻" : ""}</span>
      </>
    );
    return locked
      ? <div class="gplan-row locked" aria-disabled="true" title={gt("locked_band", lang)}>{inner}</div>
      : <a class="gplan-row" href={`/${lang}/english/grammar/${s.topicId}`}>{inner}</a>;
  };

  return (
    <div class="gplan">
      <div class={"gplan-fc " + forecast.verdict}>
        <span class="gplan-fc-verdict">{gt(verdictKey, lang)}</span>
        <span class="gplan-fc-count">{forecast.countdownDays} {gt("fc_countdown", lang)}</span>
        <button type="button" class="btn ghost btn-sm" onClick={() => clearGrammarGoal()}>{gt("goal_change", lang)}</button>
      </div>

      <section class="gplan-today">
        <h2>{gt("today_title", lang)}</h2>
        {plan.today.length === 0
          ? <p class="meta">{gt("plan_empty", lang)}</p>
          : plan.today.map((s) => <Row key={s.topicId} s={s} />)}
      </section>

      <section class="gplan-full">
        <h2>{gt("plan_full_title", lang)}</h2>
        {byBand.map((g) => (
          <div class="gplan-band" key={g.cefr}>
            <div class="gplan-band-head">{g.cefr}</div>
            {g.steps.map((s) => <Row key={s.topicId} s={s} />)}
          </div>
        ))}
      </section>
    </div>
  );
}

function GoalSetter({ lang }: { lang: Locale }) {
  const [target, setTarget] = useState<Cefr>("B2");
  const [weeks, setWeeks] = useState(12);
  const [hours, setHours] = useState(1);
  const save = () => {
    const goal: GrammarGoal = {
      targetCefr: target,
      deadlineMs: Date.now() + weeks * 7 * DAY,
      perWeekdayHours: [hours, hours, hours, hours, hours, 0, 0].map((h) => Math.max(0, h)),
      tzOffsetMin: -new Date().getTimezoneOffset(),
    };
    setGrammarGoal(goal);
  };
  return (
    <div class="gplan-goalset">
      <h2>{gt("goal_title", lang)}</h2>
      <label>{gt("goal_target", lang)}
        <select value={target} onChange={(e) => setTarget((e.target as HTMLSelectElement).value as Cefr)}>
          {TARGETS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>{gt("goal_deadline", lang)}
        <input type="number" min={1} max={104} value={weeks}
          onInput={(e) => setWeeks(Math.max(1, Number((e.target as HTMLInputElement).value) || 1))} />
      </label>
      <label>{gt("goal_hours", lang)}
        <input type="number" min={0} max={12} step={0.5} value={hours}
          onInput={(e) => setHours(Math.max(0, Number((e.target as HTMLInputElement).value) || 0))} />
      </label>
      <button type="button" class="btn" onClick={save}>{gt("goal_save", lang)}</button>
    </div>
  );
}
```

Append to `grammar.css` (reuse existing tokens; do not invent a palette):
```css
.gplan { display: flex; flex-direction: column; gap: 1.25rem; max-width: 640px; margin: 0 auto; }
.gplan-fc { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; border: 1px solid var(--rule); border-radius: 2px; }
.gplan-fc.over { border-color: var(--d-frontend); }
.gplan-fc-verdict { font-weight: 600; }
.gplan-fc-count { color: var(--muted); font-size: 13px; }
.gplan-fc .btn { margin-left: auto; }
.gplan-today h2, .gplan-full h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 0 0 .5rem; }
.gplan-band-head { font-family: var(--mono, monospace); font-size: 11px; color: var(--muted); margin: .75rem 0 .25rem; }
.gplan-row { display: flex; align-items: baseline; gap: .5rem; padding: .6rem .8rem; border: 1px solid var(--rule); border-radius: 2px; margin-bottom: .35rem; text-decoration: none; color: var(--ink); }
.gplan-row:hover { border-color: var(--rule-strong); }
.gplan-row.locked { opacity: .45; cursor: not-allowed; }
.gplan-row-meta { margin-left: auto; font-size: 12px; color: var(--muted); font-family: var(--mono, monospace); }
.gplan-goalset { display: flex; flex-direction: column; gap: .75rem; max-width: 420px; margin: 2rem auto; }
.gplan-goalset label { display: flex; flex-direction: column; gap: .25rem; font-size: 13px; color: var(--muted); }
```

- [ ] **Step 4: Run the test**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test GrammarPlanner`
Expected: PASS (or the pure-smoke variant passes if no component harness).

- [ ] **Step 5: Commit**

```bash
git add src/components/english/grammar/GrammarPlanner.tsx src/components/english/grammar/GrammarPlanner.test.tsx src/components/english/grammar/grammar.css
git commit -m "feat(grammar): GrammarPlanner island — goal-setter + plan view"
```

---

### Task 8: `GrammarHome` parent tab + `grammar.astro` wiring + full build

**Files:**
- Create: `src/components/english/grammar/GrammarHome.tsx`
- Modify: `src/pages/[lang]/english/grammar.astro` (mount `GrammarHome`; enrich props with `egp`+`related`; pass server-computed coverage)
- Modify: `src/components/english/grammar/grammar.css` (`.ghome-tabs`)

**Interfaces:**
- Consumes: `GrammarPlanner` (Task 7); `GrammarAtlas` (`./GrammarAtlas`, default export, props `{ lang; topics: AtlasTopic[] }` where `AtlasTopic = { id; title; cefr; levels; family }`); `type PlanTopic` (`~/english/grammar-plan`); `type GrammarFamily` (`~/english/grammar-types`); `type GrammarCoverage` (`~/english/grammar-coverage`); `gt` (`./strings`); `type Locale` (`~/i18n`).
- Produces: `export type HomeTopic = PlanTopic & { family: GrammarFamily };` and `export default function GrammarHome(props: { lang: Locale; topics: HomeTopic[]; coverage: GrammarCoverage }): JSX.Element`. `HomeTopic` is a superset of both `PlanTopic` and `AtlasTopic`, so both children accept it.

- [ ] **Step 1: Write `GrammarHome.tsx`**

```tsx
// src/components/english/grammar/GrammarHome.tsx
// Parent tab shell: Plan (default) | Browse. One hydrated island; GrammarAtlas
// renders as a non-hydrated child so the grammar page stays within the island cap.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { GrammarFamily } from "~/english/grammar-types";
import type { PlanTopic } from "~/english/grammar-plan";
import type { GrammarCoverage } from "~/english/grammar-coverage";
import GrammarPlanner from "./GrammarPlanner";
import GrammarAtlas from "./GrammarAtlas";
import { gt } from "./strings";

export type HomeTopic = PlanTopic & { family: GrammarFamily };
type Props = { lang: Locale; topics: HomeTopic[]; coverage: GrammarCoverage };
type Tab = "plan" | "browse";

export default function GrammarHome({ lang, topics, coverage }: Props) {
  const [tab, setTab] = useState<Tab>("plan");
  return (
    <div>
      <div class="ghome-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "plan"} class={"btn " + (tab === "plan" ? "" : "ghost")} onClick={() => setTab("plan")}>{gt("plan_tab", lang)}</button>
        <button type="button" role="tab" aria-selected={tab === "browse"} class={"btn " + (tab === "browse" ? "" : "ghost")} onClick={() => setTab("browse")}>{gt("browse_tab", lang)}</button>
      </div>
      {tab === "plan"
        ? <GrammarPlanner lang={lang} topics={topics} coverage={coverage} />
        : <GrammarAtlas lang={lang} topics={topics} />}
    </div>
  );
}
```
Append to `grammar.css`:
```css
.ghome-tabs { display: flex; gap: .4rem; justify-content: center; margin: 0 0 1.5rem; }
```

- [ ] **Step 2: Rework `grammar.astro`**

Replace the file body with:
```astro
---
import Topic from "~/layouts/Topic.astro";
import GrammarHome from "~/components/english/grammar/GrammarHome.tsx";
import "~/components/english/grammar/grammar.css";
import { grammarTopics } from "~/english/data/grammar/index";
import { computeGrammarCoverage } from "~/english/grammar-coverage";
import { EGP_INVENTORY } from "~/english/data/egp/index";
import { COVERAGE_WAIVERS } from "~/english/data/egp/waivers";
import { type Locale, isLocale, t } from "~/i18n";
import { selectOther } from "~/scripts/build-incremental";

export function getStaticPaths() {
  return selectOther([{ params: { lang: "en" } }, { params: { lang: "ru" } }]);
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");

// Slim metadata for the islands (full lessons/gen stay server-side). The planner
// also needs egp (coverage value) + related (cluster tie-break).
const topics = grammarTopics.map((tp) => ({
  id: tp.id, title: tp.title, cefr: tp.cefr, levels: tp.levels,
  family: tp.family, egp: tp.egp, related: tp.related,
}));
const coverage = computeGrammarCoverage(grammarTopics, EGP_INVENTORY, COVERAGE_WAIVERS);

const back = lang === "ru" ? "← Хаб" : "← Hub";
const cov = lang === "ru" ? "Покрытие →" : "Coverage →";
---
<Topic title={t("nav.english", lang)} lang={lang}>
  <div class="flex items-center gap-5 mb-2 text-[12px]">
    <a class="meta" href={`/${lang}/english/`}>{back}</a>
    <a class="meta" href={`/${lang}/english/grammar/coverage`}>{cov}</a>
  </div>
  <GrammarHome client:visible lang={lang} topics={topics} coverage={coverage} />
</Topic>
```

- [ ] **Step 3: Typecheck + unit tests**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test grammar`
Expected: PASS — all grammar planner/schedule/strings/component tests green.

- [ ] **Step 4: Full build (lint + i18n parity + hydration cap)**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: build completes; `dist/lint-report.json` shows 0 errors; the grammar page reports ≤ 5 islands; i18n parity passes. The full build can be ~25 min — a dev-render smoke of `/en/english/grammar` + `/ru/english/grammar` is an acceptable fast pre-check first.

- [ ] **Step 5: Visual check (structural)**

Load `/en/english/grammar` and `/ru/english/grammar`: with no goal the goal-setter renders; after "Start plan", Today + Your path render; the Browse tab still shows the Atlas; a plan row links to `/<lang>/english/grammar/<topic>`; above-band rows are dimmed.

- [ ] **Step 6: Commit**

```bash
git add src/components/english/grammar/GrammarHome.tsx src/pages/[lang]/english/grammar.astro src/components/english/grammar/grammar.css
git commit -m "feat(grammar): Plan|Browse tab shell + grammar.astro planner wiring"
```

---

## Self-Review (completed)

**Spec coverage:** Unit 1 → Task 1; Unit 2 (planner core) → Tasks 2–4; Unit 3 (forecast) → Task 5; Unit 4 (cost model) → Task 2; Unit 5 (UI: GrammarHome + GrammarPlanner + astro) → Tasks 6–8. Decisions 1–7 all land: deadline forecast (5), target+deadline goal (1), Plan|Browse tabs atop the grammar page (8), CEFR-banded value ranking + related tie-break (4), live recompute / persist-goal-only (1,7), daily-budget today cap (4), hard band gate + mastery unlock (3).

**Placeholder scan:** none — every code step carries full code; the only conditional is Task 7's component-test harness fallback, which gives an explicit pure-smoke alternative.

**Type consistency:** `PlanTopic` (Task 2) flows unchanged into Tasks 3/4/7/8; `GrammarStep`/`GrammarPlan` consistent across planner + forecast + UI; `GrammarGoal` defined in Task 1, consumed by 3/5/7; `isTopicDue` correctly wrapped in `new Date(now)` (Task 3); only `studyDays`/`availableMinutes`/`feasibility` imported from `path/` (Task 5), honoring the no-Track-coupling constraint; `HomeTopic` superset satisfies both child prop types (Task 8).

**Known follow-ups (out of scope, spec §8):** pace/ETA from `hoursLog`; unified cross-skill plan; re-tune `estMin` constants against real lesson counts after first build.
