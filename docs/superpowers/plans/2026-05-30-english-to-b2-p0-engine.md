# English → B2 — P0 Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the slice's hand-rolled Leitner SRS with a real FSRS scheduler behind a swappable interface, and wire English study activity into the site's existing XP + streak progression — no new content required.

**Architecture:** A pure `Scheduler` interface isolates the algorithm; an FSRS implementation wraps the `ts-fsrs` library, converting our JSON-serializable `CardState` (epoch-ms dates) to/from ts-fsrs `Card` (Date objects) so persistence and tests stay deterministic. `english/state.ts` stores one `CardState` per word and drives the Review tab. Study activity calls the existing `recordActiveDay()` (streak) and contributes to the existing derived `xpFromState()` so English shares one streak/level with the rest of the site.

**Tech Stack:** TypeScript, Preact + @preact/signals, ts-fsrs, Vitest, Astro 5.

**Spec:** `docs/superpowers/specs/2026-05-30-english-to-b2-design.md` (§4 engine, §5 integration).

**Out of P0 (later phases):** placement test (needs banded vocab → P1), real vocab lists (P1), reading/output/grammar (P2–P4). The seed reading unit and its words remain the only content; P0 makes the *engine* underneath them correct.

**Conventions:** All commands run from `site/`. Tests are co-located `*.test.ts`. Run a single test file with `bunx vitest run <path>`. The `~` alias maps to `site/src`.

---

### Task 1: Add the ts-fsrs dependency

**Files:**
- Modify: `site/package.json` (dependencies)

- [ ] **Step 1: Install**

Run (from `site/`):
```bash
bun add ts-fsrs@4
```
Expected: `package.json` gains `"ts-fsrs"` under dependencies; `bun.lock` updates.

- [ ] **Step 2: Verify the import resolves**

Run:
```bash
bun -e "const m = require('ts-fsrs'); console.log(typeof m.fsrs, typeof m.createEmptyCard, m.Rating.Good)"
```
Expected: `function function 3` (Rating.Good === 3).

- [ ] **Step 3: Commit**

```bash
git add site/package.json site/bun.lock
git commit -m "build(english): add ts-fsrs for the FSRS scheduler"
```

---

### Task 2: Scheduler interface + shared types

**Files:**
- Create: `site/src/english/scheduler/types.ts`

- [ ] **Step 1: Write the types**

```typescript
// site/src/english/scheduler/types.ts
//
// The SRS algorithm lives behind this interface. CardState is JSON-serializable
// (epoch-ms dates, plain numbers) so it persists cleanly and tests are
// deterministic — `now` is always passed in, never read from the clock here.

export type Grade = "again" | "hard" | "good" | "easy";

/** Serializable mirror of an FSRS card. All dates are epoch ms. */
export type CardState = {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  /** ts-fsrs State enum: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: number;
  last_review: number | null;
  /** Present in newer ts-fsrs; passed through if set. */
  learning_steps?: number;
};

export interface Scheduler {
  /** A brand-new card, due immediately at `now`. */
  newCard(now: number): CardState;
  /** Apply a grade at `now`, returning the next card state. */
  review(card: CardState, grade: Grade, now: number): CardState;
  /** Is the card due for review at `now`? */
  isDue(card: CardState, now: number): boolean;
  /** When the card is next due, epoch ms. */
  dueAt(card: CardState): number;
}
```

- [ ] **Step 2: Commit**

```bash
git add site/src/english/scheduler/types.ts
git commit -m "feat(english): Scheduler interface + serializable CardState"
```

---

### Task 3: FSRS scheduler implementation (wraps ts-fsrs)

**Files:**
- Create: `site/src/english/scheduler/fsrs.ts`
- Test: `site/src/english/scheduler/fsrs.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// site/src/english/scheduler/fsrs.test.ts
import { describe, it, expect } from "vitest";
import { fsrsScheduler } from "./fsrs";

const DAY = 86_400_000;
const T0 = 1_700_000_000_000; // fixed epoch ms

describe("fsrsScheduler", () => {
  const s = fsrsScheduler();

  it("creates a new card that is due now", () => {
    const c = s.newCard(T0);
    expect(c.reps).toBe(0);
    expect(s.isDue(c, T0)).toBe(true);
    expect(s.dueAt(c)).toBeLessThanOrEqual(T0);
  });

  it("schedules a 'good' review into the future", () => {
    const c = s.review(s.newCard(T0), "good", T0);
    expect(c.reps).toBe(1);
    expect(s.dueAt(c)).toBeGreaterThan(T0);
    expect(s.isDue(c, T0)).toBe(false);
  });

  it("'easy' pushes the due date further than 'good'", () => {
    const good = s.review(s.newCard(T0), "good", T0);
    const easy = s.review(s.newCard(T0), "easy", T0);
    expect(s.dueAt(easy)).toBeGreaterThanOrEqual(s.dueAt(good));
  });

  it("'again' after a learned card shortens the interval vs 'good'", () => {
    const learned = s.review(s.newCard(T0), "good", T0);
    const lapsed = s.review(learned, "again", s.dueAt(learned));
    const kept = s.review(learned, "good", s.dueAt(learned));
    expect(s.dueAt(lapsed)).toBeLessThan(s.dueAt(kept));
  });

  it("round-trips through JSON without changing scheduling", () => {
    const c = s.review(s.newCard(T0), "good", T0);
    const revived = JSON.parse(JSON.stringify(c));
    expect(s.dueAt(revived)).toBe(s.dueAt(c));
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bunx vitest run src/english/scheduler/fsrs.test.ts`
Expected: FAIL — `Failed to resolve import "./fsrs"`.

- [ ] **Step 3: Write the implementation**

```typescript
// site/src/english/scheduler/fsrs.ts
//
// FSRS implementation of Scheduler, wrapping ts-fsrs. We convert between our
// epoch-ms CardState and ts-fsrs's Date-based Card at the boundary so nothing
// outside this file depends on ts-fsrs internals.

import { createEmptyCard, fsrs, Rating, type Card } from "ts-fsrs";
import type { CardState, Grade, Scheduler } from "./types";

const RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function toCard(s: CardState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review === null ? undefined : new Date(s.last_review),
    ...(s.learning_steps !== undefined ? { learning_steps: s.learning_steps } : {}),
  } as Card;
}

function fromCard(c: Card): CardState {
  const anyCard = c as Card & { learning_steps?: number };
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
    ...(anyCard.learning_steps !== undefined ? { learning_steps: anyCard.learning_steps } : {}),
  };
}

export function fsrsScheduler(): Scheduler {
  const engine = fsrs();
  return {
    newCard(now: number): CardState {
      return fromCard(createEmptyCard(new Date(now)));
    },
    review(card: CardState, grade: Grade, now: number): CardState {
      const result = engine.next(toCard(card), new Date(now), RATING[grade]);
      return fromCard(result.card);
    },
    isDue(card: CardState, now: number): boolean {
      return card.due <= now;
    },
    dueAt(card: CardState): number {
      return card.due;
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bunx vitest run src/english/scheduler/fsrs.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/scheduler/fsrs.ts site/src/english/scheduler/fsrs.test.ts
git commit -m "feat(english): FSRS scheduler wrapping ts-fsrs behind the interface"
```

---

### Task 4: Rebuild english state on the scheduler

Replaces the Leitner box model. Each word now owns a `CardState`; status is derived from the card. A migration drops any old `{ box, lastAt }` records (the slice has no real users yet, so a clean reset is safe and simplest — old records are discarded, not crash).

**Files:**
- Modify (full rewrite): `site/src/english/state.ts`
- Test: `site/src/english/state.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// site/src/english/state.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  englishState, resetEnglish, gradeWord, statusOf, dueWordIds, knownCount,
} from "./state";

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

describe("english state", () => {
  beforeEach(() => resetEnglish());

  it("a never-seen word is 'new' and not counted known", () => {
    expect(statusOf("alpha")).toBe("new");
    expect(knownCount(["alpha", "beta"])).toBe(0);
  });

  it("grading 'good' creates a card, sets learning, and schedules it out", () => {
    gradeWord("alpha", "good", T0);
    expect(statusOf("alpha")).toBe("learning");
    expect(dueWordIds(["alpha"], T0)).toEqual([]); // no longer due right now
  });

  it("grading 'again' keeps the word due soon", () => {
    gradeWord("alpha", "again", T0);
    expect(dueWordIds(["alpha"], T0 + DAY)).toEqual(["alpha"]);
  });

  it("a matured card counts as known", () => {
    // push it up with successive easy reviews across its due dates
    let now = T0;
    for (let i = 0; i < 4; i++) {
      gradeWord("alpha", "easy", now);
      now = englishState.value.words["alpha"].card.due;
    }
    expect(statusOf("alpha")).toBe("known");
    expect(knownCount(["alpha"])).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bunx vitest run src/english/state.test.ts`
Expected: FAIL — exports `resetEnglish`, `gradeWord`, `dueWordIds`, `knownCount` do not exist.

- [ ] **Step 3: Rewrite the state module**

```typescript
// site/src/english/state.ts
//
// English-for-Engineers — per-user vocabulary state, scheduler-backed.
// Own localStorage key, separate from the synced user-state for now (P0).
// One CardState per word; status is derived from the card's maturity.

import { signal, effect } from "@preact/signals";
import { fsrsScheduler } from "./scheduler/fsrs";
import type { CardState, Grade } from "./scheduler/types";

const KEY = "awesome.english.v2"; // v2: scheduler-backed (v1 Leitner is discarded)
const scheduler = fsrsScheduler();

/** A card whose next interval is at least this many days counts as "known". */
const MATURE_DAYS = 21;
const DAY = 86_400_000;

export type WordStatus = "new" | "learning" | "known";

export type WordRecord = {
  card: CardState;
  seen: number;
};

export type EnglishState = {
  words: Record<string, WordRecord>;
  revealed: Record<string, number>;
};

const defaults: EnglishState = { words: {}, revealed: {} };

function load(): EnglishState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    // Only accept v2 records (must carry a `card`); anything else is dropped.
    const words: Record<string, WordRecord> = {};
    for (const [id, rec] of Object.entries(parsed.words ?? {})) {
      if (rec && typeof rec === "object" && "card" in (rec as object)) {
        words[id] = rec as WordRecord;
      }
    }
    return { words, revealed: parsed.revealed ?? {} };
  } catch {
    return defaults;
  }
}

function save(s: EnglishState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export const englishState = signal<EnglishState>(load());

if (typeof window !== "undefined") {
  effect(() => save(englishState.value));
}

function statusFromCard(card: CardState): WordStatus {
  if (card.reps === 0) return "new";
  return card.scheduled_days >= MATURE_DAYS ? "known" : "learning";
}

/** Grade a word; creates the card on first grade. */
export function gradeWord(id: string, grade: Grade, now: number) {
  const prev = englishState.value.words[id];
  const base = prev?.card ?? scheduler.newCard(now);
  const card = scheduler.review(base, grade, now);
  englishState.value = {
    ...englishState.value,
    words: {
      ...englishState.value.words,
      [id]: { card, seen: (prev?.seen ?? 0) + 1 },
    },
  };
}

/** Count a first exposure without scheduling (word shown in reading). */
export function bumpSeen(id: string, now: number) {
  if (englishState.value.words[id]) return;
  englishState.value = {
    ...englishState.value,
    words: {
      ...englishState.value.words,
      [id]: { card: scheduler.newCard(now), seen: 1 },
    },
  };
}

export function statusOf(id: string): WordStatus {
  const rec = englishState.value.words[id];
  return rec ? statusFromCard(rec.card) : "new";
}

/** Of the given ids, those whose card is due at `now` (and already started). */
export function dueWordIds(ids: string[], now: number): string[] {
  return ids.filter((id) => {
    const rec = englishState.value.words[id];
    return rec && rec.card.reps > 0 && scheduler.isDue(rec.card, now);
  });
}

export function knownCount(ids: string[]): number {
  return ids.filter((id) => statusOf(id) === "known").length;
}

export function recordReveal(unitId: string, passageCount: number) {
  const cur = englishState.value.revealed[unitId] ?? 0;
  if (passageCount <= cur) return;
  englishState.value = {
    ...englishState.value,
    revealed: { ...englishState.value.revealed, [unitId]: passageCount },
  };
}

/** Test/Settings helper: wipe English progress. */
export function resetEnglish() {
  englishState.value = { words: {}, revealed: {} };
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bunx vitest run src/english/state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/state.ts site/src/english/state.test.ts
git commit -m "feat(english): scheduler-backed word state (replaces Leitner)"
```

---

### Task 5: Rewire EnReader to the new state API

The slice imported `markKnown`, `markLearning`, `isDue`, `bumpSeen`, `recordReveal`, `englishState` and read `record.status`/`record.box`. Update every call site to the new API: grades instead of known/learning booleans, `dueWordIds` for the review queue, `statusOf` for chips. The Review tab now grades with all four buttons (again/hard/good/easy) after the recall reveal.

**Files:**
- Modify: `site/src/components/english/EnReader.tsx`

- [ ] **Step 1: Replace the state imports**

Find:
```typescript
import {
  englishState,
  statusOf,
  isDue,
  markKnown,
  markLearning,
  bumpSeen,
  recordReveal,
} from "~/english/state";
```
Replace with:
```typescript
import {
  englishState,
  statusOf,
  dueWordIds,
  knownCount,
  gradeWord,
  bumpSeen,
  recordReveal,
} from "~/english/state";
import type { Grade } from "~/english/scheduler/types";

/** Monotonic clock for scheduling; injected so logic stays testable elsewhere. */
const now = () => Date.now();
```

- [ ] **Step 2: Fix the known-counter in the main component**

Find:
```typescript
  const st = englishState.value;
  const knownCount = allWords.filter((w) => st.words[w.id]?.status === "known").length;
```
Replace with:
```typescript
  englishState.value; // subscribe to re-render on change
  const known = knownCount(allWords.map((w) => w.id));
```
Then in the JSX of that component replace `{knownCount}` with `{known}` and update the progress-bar width expression `(knownCount / allWords.length)` to `(known / allWords.length)`.

- [ ] **Step 3: Update vocab chip status + tap in `PassageBlock`**

Find:
```typescript
  function tapWord(id: string) {
    bumpSeen(id);
    setOpen((cur) => (cur === id ? null : id));
  }
```
Replace with:
```typescript
  function tapWord(id: string) {
    bumpSeen(id, now());
    setOpen((cur) => (cur === id ? null : id));
  }
```
Find:
```typescript
              const status = englishState.value.words[w.id]?.status ?? "new";
```
Replace with:
```typescript
              const status = (englishState.value, statusOf(w.id));
```

- [ ] **Step 4: Update `WordCard` buttons to grades**

Find the two buttons calling `markKnown(word.id)` / `markLearning(word.id)` and replace their `onClick` bodies:
```typescript
          onClick={() => { markKnown(word.id); onDone(); }}
```
becomes
```typescript
          onClick={() => { gradeWord(word.id, "good", now()); onDone(); }}
```
and
```typescript
          onClick={() => { markLearning(word.id); onDone(); }}
```
becomes
```typescript
          onClick={() => { gradeWord(word.id, "again", now()); onDone(); }}
```

- [ ] **Step 5: Update `ReviewTab` queue + grading**

Find:
```typescript
  const st = englishState.value;
  const queue = useMemo(
    () =>
      words.filter((w) => {
        const status = st.words[w.id]?.status;
        return status === "learning" && isDue(w.id);
      }),
    [words, st],
  );
  const learning = words.filter((w) => st.words[w.id]?.status === "learning");
  const deck = queue.length ? queue : learning;
```
Replace with:
```typescript
  const st = englishState.value;
  const due = useMemo(() => {
    const ids = new Set(dueWordIds(words.map((w) => w.id), now()));
    return words.filter((w) => ids.has(w.id));
  }, [words, st]);
  const learning = words.filter((w) => statusOf(w.id) === "learning");
  const deck = due.length ? due : learning;
```
Then in `submit()`:
```typescript
  function submit() {
    const ok = norm(val) === norm(card.w);
    setGraded(ok);
    if (ok) markKnown(card.id);
    else markLearning(card.id);
  }
```
Replace with:
```typescript
  function submit() {
    const ok = norm(val) === norm(card.w);
    setGraded(ok);
    gradeWord(card.id, ok ? "good" : "again", now());
  }
```
And in `next()`:
```typescript
  function next(overrideCorrect?: boolean) {
    if (overrideCorrect) markKnown(card.id); // learner self-corrects a typo
    setGraded(null);
    setVal("");
    setI((n) => n + 1);
  }
```
Replace with:
```typescript
  function next(overrideCorrect?: boolean) {
    if (overrideCorrect) gradeWord(card.id, "good", now());
    setGraded(null);
    setVal("");
    setI((n) => n + 1);
  }
```

- [ ] **Step 6: Build to verify the component compiles**

Run: `bunx astro check 2>&1 | tail -20`
Expected: no errors referencing `EnReader.tsx`, `markKnown`, `markLearning`, or `isDue`.

- [ ] **Step 7: Commit**

```bash
git add site/src/components/english/EnReader.tsx
git commit -m "feat(english): drive EnReader review/chips off the FSRS scheduler"
```

---

### Task 6: Streak + XP integration

English study shares the site's one streak and derived XP. On any grade, mark the day active (`recordActiveDay`, already exists). Extend the derived `xpFromState` with an English term sourced from a small counter the English state exposes.

**Files:**
- Create: `site/src/english/xp.ts`
- Test: `site/src/english/xp.test.ts`
- Modify: `site/src/scripts/progression/xp.ts:3` (XP constants) and `:5-17` (signature + body)
- Modify: `site/src/english/state.ts` (call `recordActiveDay` on grade; export `englishKnownTotal`)
- Modify: `site/src/scripts/progression/xp.test.ts` (update existing callers if the signature changes)

- [ ] **Step 1: Expose an English known-total and mark active days**

In `site/src/english/state.ts`, add at the top imports:
```typescript
import { recordActiveDay } from "~/scripts/user-state";
```
At the end of `gradeWord`, after setting `englishState.value`, add:
```typescript
  if (typeof window !== "undefined") recordActiveDay();
```
Add this export at the bottom of the file:
```typescript
/** Total words currently at "known" maturity — feeds derived XP. */
export function englishKnownTotal(): number {
  return Object.values(englishState.value.words).filter(
    (r) => r.card.reps > 0 && r.card.scheduled_days >= 21,
  ).length;
}
```

- [ ] **Step 2: Write the failing English-XP test**

```typescript
// site/src/english/xp.test.ts
import { describe, it, expect } from "vitest";
import { englishXp, ENGLISH_XP_PER_KNOWN } from "./xp";

describe("englishXp", () => {
  it("is zero with no known words", () => {
    expect(englishXp(0)).toBe(0);
  });
  it("scales with known words", () => {
    expect(englishXp(10)).toBe(10 * ENGLISH_XP_PER_KNOWN);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `bunx vitest run src/english/xp.test.ts`
Expected: FAIL — `Failed to resolve import "./xp"`.

- [ ] **Step 4: Implement the English-XP helper**

```typescript
// site/src/english/xp.ts
// XP contributed by English study, kept tiny and additive so it slots into the
// site's derived xpFromState without coupling the progression module to English.

export const ENGLISH_XP_PER_KNOWN = 5;

export function englishXp(knownWords: number): number {
  return Math.max(0, knownWords) * ENGLISH_XP_PER_KNOWN;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `bunx vitest run src/english/xp.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Fold English XP into the site's derived XP**

In `site/src/scripts/progression/xp.ts`, change the function to accept an optional English known-count and add its XP. Replace the body:
```typescript
export function xpFromState(
  state: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">,
  drillsSolved: number,
): number {
```
with:
```typescript
import { englishXp } from "~/english/xp";

export function xpFromState(
  state: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">,
  drillsSolved: number,
  englishKnown = 0,
): number {
```
and add this line just before `return xp;`:
```typescript
  xp += englishXp(englishKnown);
```
(Place the `import` at the top of the file with the other import.)

- [ ] **Step 7: Verify existing progression tests still pass**

Run: `bunx vitest run src/scripts/progression/xp.test.ts`
Expected: PASS — the new parameter defaults to 0, so existing two-arg callers are unaffected.

- [ ] **Step 8: Wire the call site that computes live XP**

Find the call site that invokes `xpFromState(`:
```bash
bunx vitest --version >/dev/null; grep -rn "xpFromState(" src --include=*.tsx --include=*.ts | grep -v ".test.ts"
```
For each non-test call site (e.g. the profile/progression island), pass the English total as the third argument:
```typescript
import { englishKnownTotal } from "~/english/state";
// ...
const xp = xpFromState(userState.value, drillsSolved, englishKnownTotal());
```
If a call site does not import English state, add the import shown above. (If the only callers are tests, this step is a no-op — note it in the commit.)

- [ ] **Step 9: Commit**

```bash
git add site/src/english/xp.ts site/src/english/xp.test.ts site/src/english/state.ts site/src/scripts/progression/xp.ts
git commit -m "feat(english): English study feeds the shared streak + derived XP"
```

---

### Task 7: Full build green

**Files:** none (verification + final commit of any lockfile drift)

- [ ] **Step 1: Run the unit tests**

Run: `bunx vitest run src/english`
Expected: PASS — all scheduler, state, and xp tests.

- [ ] **Step 2: Run the full build**

Run: `bun run build 2>&1 | tail -6`
Expected: `Complete!`, `0 errors` in the lint summary (warnings unchanged from baseline 1271).

- [ ] **Step 3: Confirm no leftover references to the old API**

Run:
```bash
grep -rn "markKnown\|markLearning\|\.box\|awesome.english.v1\|BOX_DAYS" src/english src/components/english || echo "clean"
```
Expected: `clean`.

- [ ] **Step 4: Commit any drift**

```bash
git add -A site
git commit -m "chore(english): P0 engine green — FSRS + state + XP integrated" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage (§4 engine, §5 integration):**
- §4.1 Scheduler (FSRS, isolated) → Tasks 2–3. ✓
- §4.2 Placement → deferred to P1 (documented above; depends on banded vocab). ✓ (intentional gap)
- §4.3 Daily driver → deferred to P5/its own plan; P0 only makes Review scheduler-driven. ✓ (intentional)
- §5 Progression merge (one streak, derived XP) → Task 6. ✓
- §5 State graduation into synced user-state → **deferred**: P0 keeps the own-key store (`awesome.english.v2`); folding into account-sync is its own task in a later phase (the spec allows this; sync of English progress is not required for the engine to be correct). Documented.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output. Task 6 Step 8 is conditional but spells out both branches. ✓

**Type consistency:** `CardState`, `Grade`, `Scheduler` defined in Task 2 and used identically in Tasks 3–5. `gradeWord(id, grade, now)`, `dueWordIds(ids, now)`, `statusOf(id)`, `knownCount(ids)`, `bumpSeen(id, now)`, `recordReveal(unitId, n)` defined in Task 4 and called with matching signatures in Task 5. `englishXp`/`ENGLISH_XP_PER_KNOWN` consistent across Task 6. `englishKnownTotal()` defined in Task 6 Step 1 and used in Step 8. ✓
