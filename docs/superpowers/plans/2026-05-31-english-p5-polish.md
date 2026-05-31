# English P5 — Daily-driver Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the English layer — English achievements in the shared registry, a hub progress dashboard, a compact synced `englishSummary` (FSRS card deck stays local), and minimal streak/catch-up polish.

**Architecture:** Pure-code phase (no content fan-out). New `english/stats.ts` derives progress (known-by-band, counts, summary) from the existing `englishState` + vocab decks — no `userState` dependency. New `english/sync.ts` runs a reactive `effect` that mirrors a small `englishSummary` into `userState.progression` (the only English→userState writer, breaking any `state↔stats` cycle). English badges join the existing `ACHIEVEMENTS[]` registry via new `AchievementCtx` fields, awarded by the existing `ProfilePanel` lazy-award loop. A new `EnglishDashboard` island sits atop the hub.

**Tech Stack:** Astro 5, Preact + `@preact/signals`, Tailwind, Vitest, TypeScript. All commands from `site/`.

---

## File Structure

**Create:**
- `src/english/stats.ts` — pure progress derivation: `knownByBand`, `knownTotal`, `readUnitsCount`, `gradedOutputCount`, `grammarDoneCount`, `collocationDoneCount`, `englishSummary`.
- `src/english/stats.test.ts` — stats gates.
- `src/english/sync.ts` — `summaryChanged` + `startEnglishSync` (reactive mirror into `userState.progression.englishSummary`).
- `src/english/sync.test.ts` — sync effect behavior.
- `src/components/english/EnglishDashboard.tsx` — hub progress panel island.

**Modify:**
- `src/scripts/progression/types.ts` — `AchievementCtx` English fields + `EnglishSummary` type + `Progression.englishSummary?`.
- `src/scripts/progression/achievements.ts` — append nine `en-*` achievement defs.
- `src/scripts/progression/achievements.test.ts` — bump count gate + assert English defs/predicates.
- `src/scripts/account-sync.ts` — `mergeEnglishSummary` inside `mergeProgression`.
- `src/scripts/account-sync.test.ts` — merge-summary tests.
- `src/components/progression/ProfilePanel.tsx` — extend `ctx` with English fields.
- `src/components/english/Today.tsx` — overdue surfacing + welcome-back.
- `src/pages/[lang]/english/index.astro` — mount `EnglishDashboard` atop the hub.

---

## Task 1: Types — AchievementCtx fields + EnglishSummary

**Files:**
- Modify: `src/scripts/progression/types.ts`

- [ ] **Step 1: Add English fields to `AchievementCtx` and the `EnglishSummary` type**

In `src/scripts/progression/types.ts`, extend `AchievementCtx` (append fields inside the interface):

```ts
export interface AchievementCtx {
  drillsSolved: number;
  drillUnitsWithSolve: number;
  noHintSolve: boolean;
  hourOfDay: number;
  seniorAnswers: number;
  pillarsVisited: number;
  englishKnown: number;            // total known English words (placement-seeded ∪ matured)
  englishBand: "none" | "A2" | "B1" | "B2";
  englishReadUnits: number;
  englishGraded: boolean;          // any AI-graded output attempt (scoreBand set)
  englishGrammarDone: number;
  englishCollocationDone: number;
}
```

Add the `EnglishSummary` type and extend `Progression`:

```ts
export interface EnglishSummary {
  knownTotal: number;
  knownByBand: { A2: number; B1: number; B2: number };
  band: "none" | "A2" | "B1" | "B2";
  readUnits: number;
  grammarDone: number;
  collocationDone: number;
  graded: boolean;
  updatedAt: number;     // epoch ms; merge tiebreaker for `band`
}

export interface Progression {
  xp: number;
  level: number;
  achievements: Record<string, number>;
  streak: { lastActiveDay: string; count: number; best: number };
  titles: string[];
  englishSummary?: EnglishSummary;   // optional → old payloads stay valid
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: no errors. (Existing `ctx` literals in ProfilePanel will now be type-incomplete — that's fixed in Task 6; tsc may flag ProfilePanel. If so, note it and continue — Task 6 resolves it. To keep tsc green between tasks, the fields are added to ProfilePanel in Task 6; running the per-task vitest suites below does not typecheck, so this is acceptable.)

- [ ] **Step 3: Commit**

```bash
git add src/scripts/progression/types.ts
git commit -m "feat(english): AchievementCtx English fields + EnglishSummary type"
```

---

## Task 2: English stats module

**Files:**
- Create: `src/english/stats.ts`
- Test: `src/english/stats.test.ts`

- [ ] **Step 1: Write the failing test**

`src/english/stats.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { resetEnglish, setPlacement, markUnitRead, markGrammarDone, markCollocationDone, recordOutputAttempt } from "./state";
import { knownByBand, knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount, englishSummary } from "./stats";

const T = 1_700_000_000_000;

describe("english stats", () => {
  beforeEach(() => resetEnglish());

  it("knownByBand buckets placement-seeded ids by band and sums to knownTotal", () => {
    // ngsl:0001 is A2, a B1 id (rank 801-2000) and a B2 id (nawl:* or ngsl:2001+)
    setPlacement({ estimatedKnown: 3, band: "B1", takenAt: T }, ["ngsl:0001", "ngsl:0900", "nawl:0001"]);
    const kb = knownByBand();
    expect(kb.A2).toBeGreaterThanOrEqual(1);
    expect(kb.B1).toBeGreaterThanOrEqual(1);
    expect(kb.B2).toBeGreaterThanOrEqual(1);
    expect(knownTotal()).toBe(kb.A2 + kb.B1 + kb.B2);
  });

  it("counts read units, graded output, grammar and collocation completion", () => {
    expect(readUnitsCount()).toBe(0);
    markUnitRead("u1", [], T);
    expect(readUnitsCount()).toBe(1);

    expect(gradedOutputCount()).toBe(0);
    recordOutputAttempt("t1", "B1", T);          // graded (scoreBand set)
    recordOutputAttempt("t2", undefined, T);     // self-assessed (no scoreBand)
    expect(gradedOutputCount()).toBe(1);

    markGrammarDone("grammar:passive");
    markCollocationDone("colloc:exceptions");
    expect(grammarDoneCount()).toBe(1);
    expect(collocationDoneCount()).toBe(1);
  });

  it("englishSummary assembles a consistent snapshot", () => {
    setPlacement({ estimatedKnown: 1, band: "A2", takenAt: T }, ["ngsl:0001"]);
    markUnitRead("u1", [], T);
    const s = englishSummary(T);
    expect(s.knownTotal).toBe(s.knownByBand.A2 + s.knownByBand.B1 + s.knownByBand.B2);
    expect(s.band).toBe("A2");
    expect(s.readUnits).toBe(1);
    expect(s.graded).toBe(false);
    expect(s.updatedAt).toBe(T);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bunx vitest run src/english/stats.test.ts`
Expected: FAIL — cannot import from `./stats` (module missing).

- [ ] **Step 3: Implement `stats.ts`**

`src/english/stats.ts`:

```ts
// site/src/english/stats.ts
// Pure progress derivation over englishState + vocab decks. NO userState dependency.
import type { Band, EnglishSummary } from "~/english/types";
import { vocabA2 } from "./data/vocab-a2";
import { vocabB1 } from "./data/vocab-b1";
import { vocabB2 } from "./data/vocab-b2";
import { englishState, isKnown, getPlacement } from "./state";

// id → band, built once.
const BAND_OF = new Map<string, Band>();
for (const e of [...vocabA2, ...vocabB1, ...vocabB2]) BAND_OF.set(e.id, e.band);

export function knownByBand(): Record<Band, number> {
  const out: Record<Band, number> = { A2: 0, B1: 0, B2: 0 };
  for (const [id, band] of BAND_OF) if (isKnown(id)) out[band]++;
  return out;
}

export function knownTotal(): number {
  const k = knownByBand();
  return k.A2 + k.B1 + k.B2;
}

export function readUnitsCount(): number {
  return Object.keys(englishState.value.readUnits).length;
}

export function gradedOutputCount(): number {
  return Object.values(englishState.value.outputAttempts).filter((a) => a.scoreBand).length;
}

export function grammarDoneCount(): number {
  return Object.keys(englishState.value.grammarDone).length;
}

export function collocationDoneCount(): number {
  return Object.keys(englishState.value.collocationDone).length;
}

export function englishSummary(now: number): EnglishSummary {
  const kb = knownByBand();
  return {
    knownTotal: kb.A2 + kb.B1 + kb.B2,
    knownByBand: kb,
    band: getPlacement()?.band ?? "none",
    readUnits: readUnitsCount(),
    grammarDone: grammarDoneCount(),
    collocationDone: collocationDoneCount(),
    graded: gradedOutputCount() > 0,
    updatedAt: now,
  };
}
```

Note: `EnglishSummary` is defined in `progression/types.ts` (Task 1). To avoid a cross-layer
type import from english into progression, **re-export it from `english/types.ts`**: add to
`src/english/types.ts`:

```ts
export type { EnglishSummary } from "~/scripts/progression/types";
```

- [ ] **Step 4: Run to verify it passes**

Run: `bunx vitest run src/english/stats.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/english/stats.ts src/english/stats.test.ts src/english/types.ts
git commit -m "feat(english): stats module — known-by-band, counts, summary"
```

---

## Task 3: English achievement defs

**Files:**
- Modify: `src/scripts/progression/achievements.ts`
- Test: `src/scripts/progression/achievements.test.ts`

- [ ] **Step 1: Update the test (bump count gate + assert English defs)**

In `src/scripts/progression/achievements.test.ts`:

a. Extend `ctx0` with the new English fields (all zero/false):

```ts
const ctx0 = { drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false, hourOfDay: 12, seniorAnswers: 0, pillarsVisited: 0, englishKnown: 0, englishBand: "none", englishReadUnits: 0, englishGraded: false, englishGrammarDone: 0, englishCollocationDone: 0 } as any;
```

b. Bump the count assertion and add an English block:

```ts
  it("defines ≥33 achievements, each with id + bilingual label + predicate", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(33);
    for (const a of ACHIEVEMENTS) { expect(a.id).toBeTruthy(); expect(a.label.en && a.label.ru).toBeTruthy(); expect(typeof a.predicate).toBe("function"); }
  });

  it("English achievements fire on the right ctx thresholds", () => {
    const empty2 = { pretest: null, history: {}, retrieval: {}, progression: { achievements: {} } } as any;
    expect(evaluateAchievements(empty2, { ...ctx0, englishKnown: 500 })).toContain("en-words-500");
    expect(evaluateAchievements(empty2, { ...ctx0, englishKnown: 2000 })).toContain("en-words-2000");
    expect(evaluateAchievements(empty2, { ...ctx0, englishBand: "B2" })).toEqual(expect.arrayContaining(["en-band-b1", "en-band-b2"]));
    expect(evaluateAchievements(empty2, { ...ctx0, englishGraded: true })).toContain("en-first-graded");
    expect(evaluateAchievements(empty2, { ...ctx0, englishReadUnits: 10 })).toContain("en-reader-10");
    expect(evaluateAchievements(empty2, ctx0)).not.toContain("en-words-500");
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `bunx vitest run src/scripts/progression/achievements.test.ts`
Expected: FAIL — count < 33 and `en-*` ids absent.

- [ ] **Step 3: Append the nine English defs to `ACHIEVEMENTS[]`**

In `src/scripts/progression/achievements.ts`, add before the closing `];` of `ACHIEVEMENTS`:

```ts
  { id: "en-words-500", icon: "🔤", xp: 30, label: { en: "Word Hoard", ru: "Запас слов" }, desc: { en: "Know 500 English words", ru: "Знать 500 английских слов" }, predicate: (_s, c) => c.englishKnown >= 500 },
  { id: "en-words-2000", icon: "📘", xp: 70, label: { en: "Lexicon", ru: "Лексикон" }, desc: { en: "Know 2000 English words", ru: "Знать 2000 английских слов" }, predicate: (_s, c) => c.englishKnown >= 2000 },
  { id: "en-words-5000", icon: "🧠", xp: 150, label: { en: "Fluent Reader", ru: "Свободное чтение" }, desc: { en: "Know 5000 English words", ru: "Знать 5000 английских слов" }, predicate: (_s, c) => c.englishKnown >= 5000 },
  { id: "en-band-b1", icon: "🇬🇧", xp: 40, label: { en: "Reached B1", ru: "Достиг B1" }, desc: { en: "Reach B1 English", ru: "Достичь уровня B1" }, predicate: (_s, c) => c.englishBand === "B1" || c.englishBand === "B2" },
  { id: "en-band-b2", icon: "🎓", xp: 90, label: { en: "Reached B2", ru: "Достиг B2" }, desc: { en: "Reach B2 English", ru: "Достичь уровня B2" }, predicate: (_s, c) => c.englishBand === "B2" },
  { id: "en-first-graded", icon: "✍️", xp: 25, label: { en: "Graded Writer", ru: "Письмо с оценкой" }, desc: { en: "Get your first AI-graded writing", ru: "Получить первую AI-оценку письма" }, predicate: (_s, c) => c.englishGraded },
  { id: "en-reader-10", icon: "📰", xp: 30, label: { en: "Reader", ru: "Читатель" }, desc: { en: "Read 10 English texts", ru: "Прочитать 10 английских текстов" }, predicate: (_s, c) => c.englishReadUnits >= 10 },
  { id: "en-reader-40", icon: "📚", xp: 60, label: { en: "Bookworm", ru: "Книжный червь EN" }, desc: { en: "Read 40 English texts", ru: "Прочитать 40 английских текстов" }, predicate: (_s, c) => c.englishReadUnits >= 40 },
  { id: "en-grammar-5", icon: "🧩", xp: 25, label: { en: "Grammar Drilled", ru: "Грамматика в деле" }, desc: { en: "Practice five grammar points", ru: "Отработать пять грамматических тем" }, predicate: (_s, c) => c.englishGrammarDone >= 5 },
```

- [ ] **Step 4: Run to verify it passes**

Run: `bunx vitest run src/scripts/progression/achievements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/achievements.ts src/scripts/progression/achievements.test.ts
git commit -m "feat(english): nine English achievements in the shared registry"
```

---

## Task 4: Sync the summary — mergeEnglishSummary

**Files:**
- Modify: `src/scripts/account-sync.ts`
- Test: `src/scripts/account-sync.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/account-sync.test.ts` (inside the `describe("mergeProgress", …)` block or a new one):

```ts
  it("merges englishSummary: max per count, OR graded, latest band by updatedAt", () => {
    const sumA = { knownTotal: 100, knownByBand: { A2: 80, B1: 20, B2: 0 }, band: "B1", readUnits: 5, grammarDone: 2, collocationDone: 1, graded: false, updatedAt: 200 };
    const sumB = { knownTotal: 60, knownByBand: { A2: 50, B1: 10, B2: 0 }, band: "A2", readUnits: 9, grammarDone: 1, collocationDone: 3, graded: true, updatedAt: 100 };
    const local = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [], englishSummary: sumA }, history: {}, retrieval: {} } as any;
    const server = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [], englishSummary: sumB }, history: {}, retrieval: {} } as any;
    const es = mergeProgress(local, server).progression.englishSummary!;
    expect(es.knownTotal).toBe(100);
    expect(es.knownByBand).toEqual({ A2: 80, B1: 20, B2: 0 });
    expect(es.readUnits).toBe(9);          // max
    expect(es.collocationDone).toBe(3);    // max
    expect(es.graded).toBe(true);          // OR
    expect(es.band).toBe("B1");            // newer updatedAt (200) wins
    expect(es.updatedAt).toBe(200);
  });

  it("keeps the present englishSummary when only one side has it", () => {
    const sum = { knownTotal: 10, knownByBand: { A2: 10, B1: 0, B2: 0 }, band: "A2", readUnits: 0, grammarDone: 0, collocationDone: 0, graded: false, updatedAt: 5 };
    const local = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] }, history: {}, retrieval: {} } as any;
    const server = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [], englishSummary: sum }, history: {}, retrieval: {} } as any;
    expect(mergeProgress(local, server).progression.englishSummary).toEqual(sum);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `bunx vitest run src/scripts/account-sync.test.ts`
Expected: FAIL — `englishSummary` is `undefined` (not yet merged).

- [ ] **Step 3: Implement `mergeEnglishSummary` + wire into `mergeProgression`**

In `src/scripts/account-sync.ts`, add the import and helper:

```ts
import type { PretestResult, Progression, EnglishSummary } from "./progression/types";
```

```ts
function mergeEnglishSummary(a?: EnglishSummary, b?: EnglishSummary): EnglishSummary | undefined {
  if (!a) return b;
  if (!b) return a;
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  return {
    knownTotal: Math.max(a.knownTotal, b.knownTotal),
    knownByBand: {
      A2: Math.max(a.knownByBand.A2, b.knownByBand.A2),
      B1: Math.max(a.knownByBand.B1, b.knownByBand.B1),
      B2: Math.max(a.knownByBand.B2, b.knownByBand.B2),
    },
    band: newer.band,
    readUnits: Math.max(a.readUnits, b.readUnits),
    grammarDone: Math.max(a.grammarDone, b.grammarDone),
    collocationDone: Math.max(a.collocationDone, b.collocationDone),
    graded: a.graded || b.graded,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}
```

In `mergeProgression`, add the field to the returned object (after `titles`):

```ts
    titles: Array.from(new Set([...(a?.titles ?? []), ...b.titles])),
    englishSummary: mergeEnglishSummary(a?.englishSummary, b?.englishSummary),
```

- [ ] **Step 4: Run to verify it passes**

Run: `bunx vitest run src/scripts/account-sync.test.ts`
Expected: PASS (all existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/account-sync.ts src/scripts/account-sync.test.ts
git commit -m "feat(english): merge englishSummary across devices (monotonic)"
```

---

## Task 5: Reactive summary mirror — english/sync.ts

**Files:**
- Create: `src/english/sync.ts`
- Test: `src/english/sync.test.ts`

- [ ] **Step 1: Write the failing test**

`src/english/sync.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { resetEnglish, setPlacement, markUnitRead } from "./state";
import { userState } from "~/scripts/user-state";
import { summaryChanged, startEnglishSync } from "./sync";
import { englishSummary } from "./stats";

const T = 1_700_000_000_000;

describe("english sync", () => {
  beforeEach(() => {
    resetEnglish();
    userState.value = { ...userState.value, progression: { ...userState.value.progression, englishSummary: undefined } };
  });

  it("summaryChanged is false for an equal snapshot (ignoring updatedAt)", () => {
    const a = englishSummary(T);
    const b = englishSummary(T + 999);   // only updatedAt differs
    expect(summaryChanged(a, b)).toBe(false);
    expect(summaryChanged(undefined, b)).toBe(true);
  });

  it("startEnglishSync mirrors the summary into progression and updates on change", () => {
    const stop = startEnglishSync(() => T);
    // initial run writes a summary
    expect(userState.value.progression.englishSummary).toBeDefined();
    const before = userState.value.progression.englishSummary!;
    expect(before.readUnits).toBe(0);
    // a mutation that changes the summary triggers a rewrite
    markUnitRead("u1", [], T);
    expect(userState.value.progression.englishSummary!.readUnits).toBe(1);
    stop();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bunx vitest run src/english/sync.test.ts`
Expected: FAIL — cannot import from `./sync`.

- [ ] **Step 3: Implement `sync.ts`**

`src/english/sync.ts`:

```ts
// site/src/english/sync.ts
// Mirrors a compact English summary into userState.progression so it syncs and
// feeds achievements/dashboard. The ONLY English→userState writer. A reactive
// effect avoids a state↔stats import cycle (stats stays pure).
import { effect } from "@preact/signals";
import { englishState } from "./state";
import { englishSummary } from "./stats";
import { userState } from "~/scripts/user-state";
import type { EnglishSummary } from "~/english/types";

/** True if any non-timestamp field differs (updatedAt is ignored). */
export function summaryChanged(prev: EnglishSummary | undefined, next: EnglishSummary): boolean {
  if (!prev) return true;
  return (
    prev.knownTotal !== next.knownTotal ||
    prev.band !== next.band ||
    prev.readUnits !== next.readUnits ||
    prev.grammarDone !== next.grammarDone ||
    prev.collocationDone !== next.collocationDone ||
    prev.graded !== next.graded ||
    prev.knownByBand.A2 !== next.knownByBand.A2 ||
    prev.knownByBand.B1 !== next.knownByBand.B1 ||
    prev.knownByBand.B2 !== next.knownByBand.B2
  );
}

/**
 * Register the mirror. Returns the effect disposer. `now` is injectable for
 * tests. Reads userState via `.peek()` so writing it does not re-trigger the
 * effect (the effect only subscribes to englishState).
 */
export function startEnglishSync(now: () => number = () => Date.now()) {
  return effect(() => {
    englishState.value; // subscribe to English changes only
    const prev = userState.peek().progression.englishSummary;
    const next = englishSummary(now());
    if (!summaryChanged(prev, next)) return;
    const us = userState.peek();
    userState.value = { ...us, progression: { ...us.progression, englishSummary: next } };
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bunx vitest run src/english/sync.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/english/sync.ts src/english/sync.test.ts
git commit -m "feat(english): reactive englishSummary mirror into progression"
```

---

## Task 6: ProfilePanel — award English achievements

**Files:**
- Modify: `src/components/progression/ProfilePanel.tsx`

- [ ] **Step 1: Add imports**

After the existing `import { englishKnownTotal } from "~/english/state";`, add the placement
getter and stats:

```tsx
import { englishKnownTotal, getPlacement } from "~/english/state";
import { knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
```

(Replace the existing single `englishKnownTotal` import line with the combined one above.)

- [ ] **Step 2: Extend the `ctx` object with the six English fields**

Replace the `ctx` line:

```tsx
  const ctx = { drillsSolved, drillUnitsWithSolve, noHintSolve, hourOfDay: new Date().getHours(), seniorAnswers, pillarsVisited };
```

with:

```tsx
  const ctx = {
    drillsSolved, drillUnitsWithSolve, noHintSolve, hourOfDay: new Date().getHours(),
    seniorAnswers, pillarsVisited,
    englishKnown: knownTotal(),
    englishBand: getPlacement()?.band ?? "none",
    englishReadUnits: readUnitsCount(),
    englishGraded: gradedOutputCount() > 0,
    englishGrammarDone: grammarDoneCount(),
    englishCollocationDone: collocationDoneCount(),
  } as const;
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: 0 errors. (`evaluateAchievements(s, ctx)` now type-complete; English badges award via
the existing `useEffect([])`.)

- [ ] **Step 4: Commit**

```bash
git add src/components/progression/ProfilePanel.tsx
git commit -m "feat(english): award English achievements from the profile panel"
```

---

## Task 7: EnglishDashboard island + hub mount

**Files:**
- Create: `src/components/english/EnglishDashboard.tsx`
- Modify: `src/pages/[lang]/english/index.astro`

- [ ] **Step 1: Write the component**

`src/components/english/EnglishDashboard.tsx`:

```tsx
// site/src/components/english/EnglishDashboard.tsx
import { useEffect } from "preact/hooks";
import { englishState, getPlacement, dueWordIds, englishKnownTotal } from "~/english/state";
import { knownByBand, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import { startEnglishSync } from "~/english/sync";
import { userState } from "~/scripts/user-state";
import { englishXp } from "~/english/xp";
import { ACHIEVEMENTS } from "~/scripts/progression/achievements";
import { BAND_SIZE } from "~/english/data/bands";
import type { Band } from "~/english/types";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };
const BANDS: Band[] = ["A2", "B1", "B2"];
const now = () => Date.now();

export default function EnglishDashboard({ lang }: Props) {
  englishState.value; userState.value; // subscribe
  useEffect(() => { const stop = startEnglishSync(); return stop; }, []);

  const summary = userState.value.progression.englishSummary;
  // Prefer live local state; fall back to synced summary on a fresh device.
  const hasLocal = Object.keys(englishState.value.words).length > 0 || !!getPlacement();
  const kb = hasLocal ? knownByBand() : (summary?.knownByBand ?? { A2: 0, B1: 0, B2: 0 });
  const total = kb.A2 + kb.B1 + kb.B2;
  const band = getPlacement()?.band ?? summary?.band ?? "none";
  const read = hasLocal ? readUnitsCount() : (summary?.readUnits ?? 0);
  const grammar = hasLocal ? grammarDoneCount() : (summary?.grammarDone ?? 0);
  const colloc = hasLocal ? collocationDoneCount() : (summary?.collocationDone ?? 0);
  const graded = hasLocal ? gradedOutputCount() : (summary?.graded ? 1 : 0);
  const due = dueWordIds(Object.keys(englishState.value.words), now()).length;
  const streak = userState.value.progression.streak;
  const enXp = englishXp(englishKnownTotal());

  const earned = ACHIEVEMENTS.filter(
    (a) => a.id.startsWith("en-") && a.id in (userState.value.progression.achievements ?? {}),
  );

  const L = {
    title: lang === "en" ? "Your English" : "Твой английский",
    words: lang === "en" ? "words known" : "слов знаешь",
    band: lang === "en" ? "level" : "уровень",
    read: lang === "en" ? "texts read" : "текстов прочитано",
    grammar: lang === "en" ? "grammar" : "грамматика",
    colloc: lang === "en" ? "phrases" : "фразы",
    graded: lang === "en" ? "graded writings" : "оценок письма",
    due: lang === "en" ? "due today" : "к повтору",
    streak: lang === "en" ? "day streak" : "дней подряд",
    xp: lang === "en" ? "English XP" : "XP за английский",
  };

  const Bar = ({ b }: { b: Band }) => {
    const pct = Math.min(100, Math.round((kb[b] / BAND_SIZE[b]) * 100));
    return (
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-mono uppercase text-muted w-6">{b}</span>
        <div class="flex-1 h-2 bg-rule rounded-[2px] overflow-hidden">
          <div class="h-full bg-ink" style={`width:${pct}%`} />
        </div>
        <span class="text-[11px] font-mono text-muted w-16 text-right">{kb[b]}/{BAND_SIZE[b]}</span>
      </div>
    );
  };

  const Stat = ({ n, label }: { n: number; label: string }) => (
    <div class="flex flex-col">
      <span class="font-display text-[20px] font-bold text-ink">{n}</span>
      <span class="text-[11px] text-muted">{label}</span>
    </div>
  );

  return (
    <div class="max-w-[620px] mx-auto bg-card border border-rule-strong rounded-[2px] p-6 flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <div class="meta">{L.title}</div>
        <div class="text-[12px] font-mono text-muted">{band === "none" ? "—" : band} · {total} {L.words}</div>
      </div>
      <div class="flex flex-col gap-2">{BANDS.map((b) => <Bar key={b} b={b} />)}</div>
      <div class="grid grid-cols-3 gap-4">
        <Stat n={read} label={L.read} />
        <Stat n={grammar} label={L.grammar} />
        <Stat n={colloc} label={L.colloc} />
        <Stat n={graded} label={L.graded} />
        <Stat n={due} label={L.due} />
        <Stat n={streak?.count ?? 0} label={L.streak} />
      </div>
      <div class="flex items-center justify-between border-t border-rule pt-3">
        <div class="text-[12px] font-mono text-muted">{enXp} {L.xp}</div>
        {earned.length ? (
          <div class="flex gap-1">{earned.map((a) => <span key={a.id} title={a.label[lang]} class="text-[16px]">{a.icon}</span>)}</div>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount atop the hub**

In `src/pages/[lang]/english/index.astro`, add the import after the `Today` import:

```astro
import EnglishDashboard from "../../../components/english/EnglishDashboard.tsx";
```

Insert the dashboard section directly after the `<h1>…</h1>` header block (before the Today
`<section>`):

```astro
  <section class="mb-12">
    <EnglishDashboard client:visible lang={lang} />
  </section>
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: 0 errors. Hub now has 5 `client:visible` islands (Dashboard/Today/Reading/Grammar/Output)
on a 2-segment route — outside the lesson hydration cap.

- [ ] **Step 4: Commit**

```bash
git add src/components/english/EnglishDashboard.tsx "src/pages/[lang]/english/index.astro"
git commit -m "feat(english): hub progress dashboard (bands, activity, streak, badges)"
```

---

## Task 8: Today — streak / catch-up polish

**Files:**
- Modify: `src/components/english/Today.tsx`

- [ ] **Step 1: Add imports for userState + today**

Add near the top imports:

```tsx
import { userState } from "~/scripts/user-state";
import { todayISO } from "~/scripts/progression/streak";
```

- [ ] **Step 2: Compute overdue total + welcome-back flag**

After the existing `due` useMemo, add:

```tsx
  const dueTotal = useMemo(() => dueWordIds(startedIds, now()).length, [startedIds]);
  const welcomeBack = useMemo(() => {
    const last = userState.value.progression.streak.lastActiveDay;
    if (!last) return false;
    const days = Math.round((Date.parse(todayISO()) - Date.parse(last)) / 86_400_000);
    return days >= 2;
  }, [userState.value]);
```

- [ ] **Step 3: Add the labels + render lines**

Add to `L`:

```tsx
    waiting: lang === "en" ? `reviews waiting — capped at ${REVIEW_CAP} today` : `повторений ждёт — сегодня лимит ${REVIEW_CAP}`,
    welcome: lang === "en" ? "Welcome back — your streak is safe. Pick up where you left off." : "С возвращением — серия сохранена. Продолжай с того места, где остановился.",
```

In the returned JSX, immediately after the opening `<div class="max-w-[620px] mx-auto flex flex-col gap-8">`, add the welcome-back banner:

```tsx
      {welcomeBack ? (
        <div class="text-[13px] text-ink bg-card border border-rule rounded-[2px] px-4 py-3">{L.welcome}</div>
      ) : null}
```

And in the reviews row, surface the overdue overflow — replace the existing due row block:

```tsx
      <div class="flex items-center gap-4">
        <div class="text-[13px] font-mono text-muted">{L.due}: <span class="text-ink font-semibold">{due.length}</span></div>
        {due.length ? <div class="text-[12px] text-muted">{L.reviewHint}</div> : <div class="text-[13px] text-ink">{L.allClear}</div>}
      </div>
```

with:

```tsx
      <div class="flex items-center gap-4 flex-wrap">
        <div class="text-[13px] font-mono text-muted">{L.due}: <span class="text-ink font-semibold">{due.length}</span></div>
        {due.length ? <div class="text-[12px] text-muted">{L.reviewHint}</div> : <div class="text-[13px] text-ink">{L.allClear}</div>}
        {dueTotal > REVIEW_CAP ? <div class="text-[12px] text-muted">· {dueTotal} {L.waiting}</div> : null}
      </div>
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/english/Today.tsx
git commit -m "feat(english): surface overdue reviews + welcome-back in Today"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the English + progression test suites**

Run: `bunx vitest run src/english src/scripts`
Expected: PASS — stats, sync, achievements, account-sync, plus all pre-existing tests.

- [ ] **Step 2: Full build + warning baseline**

Run: `bun run build`
Expected: 0 errors; warnings ≤ 1271 (no regression). Page count unchanged (no new routes).

- [ ] **Step 3: Manual visual check**

Open `/en/english/` and `/ru/english/`: the dashboard renders atop the hub with per-band bars,
activity stats, streak, English XP and any earned badges; Today shows the overdue line when the
due pile exceeds 30 and the welcome-back banner after a 2-day gap. Open `/en/profile/` and
confirm English badges appear once their thresholds are met.

- [ ] **Step 4: Final commit (if verification fixups were needed)**

```bash
git add -A
git commit -m "chore(english): P5 verification fixups"
```

---

## Notes for the executor

- **No content fan-out** this phase — pure code. No 2-concurrent subagent waves needed.
- **Import direction is load-bearing:** `stats.ts` and `state.ts` must NOT import `userState`.
  Only `sync.ts` writes `userState` (via `.peek()` to avoid a re-trigger loop). Keep it that way.
- **`englishKnown` = isKnown-based total** (placement-seeded ∪ matured) via `knownTotal()` — a
  user who places at B1 legitimately earns the 2000-word badge. This is distinct from the
  matured-only `englishKnownTotal()` that feeds XP; do not conflate them.
- All commands run from `site/`.
```
