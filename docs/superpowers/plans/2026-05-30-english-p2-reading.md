# English → B2 — P2 Graded Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a corpus of ~40 graded bilingual reading texts (A2+B1 × general+engineering), a Reading feed to browse/track them, and reading→vocab reinforcement that seeds `targetWords` into the shared FSRS deck — additive over P0/P1, build staying green.

**Architecture:** `ReadingUnit` gains `stream` + `targetWords`. Texts live as committed data modules under `english/data/reading/`, split by band×stream cell, aggregated by an `index.ts`. A `ReadingFeed` island lists texts at the learner's placement band with a stream toggle and read/unread state, opening each text in the **reused** `EnReader`. Finishing a text's comprehension Check marks it read and `bumpSeen`s its target words into the FSRS deck.

**Tech Stack:** TypeScript, Preact + @preact/signals, Vitest, Astro 5. Builds on P1 vocab (`vocabA2`/`vocabB1`) + P0 FSRS state.

**Spec:** `docs/superpowers/specs/2026-05-30-english-to-b2-p2-reading-design.md` (addendum).

**Conventions:** All commands run from `site/`. Tests co-located `*.test.ts`. Single test: `bunx vitest run <path>`. `~` maps to `site/src`. Baseline build: **0 errors, ≤1271 warnings**.

**Branch:** `english-p2-reading` (already checked out).

---

## File map

- `site/src/english/types.ts` — **modify**: add `stream` + `targetWords` to `ReadingUnit`.
- `site/src/english/data/reading/a2-general.ts` — **create**: `ReadingUnit[]` (~10).
- `site/src/english/data/reading/a2-engineering.ts` — **create**: migrated seed + ~9 more.
- `site/src/english/data/reading/b1-general.ts` — **create**: `ReadingUnit[]` (~10).
- `site/src/english/data/reading/b1-engineering.ts` — **create**: `ReadingUnit[]` (~10).
- `site/src/english/data/reading/index.ts` — **create**: aggregate + helpers.
- `site/src/english/data/reading/reading.test.ts` — **create**: validity gate.
- `site/src/english/data/reading/counts.test.ts` — **create**: per-cell count gate (fails until content lands).
- `site/src/english/units.ts` — **modify**: thin re-export of the aggregate.
- `site/src/english/state.ts` — **modify**: `readUnits`, `markUnitRead`, `isUnitRead`.
- `site/src/english/state.test.ts` — **modify**: read-tracking tests.
- `site/src/components/english/EnReader.tsx` — **modify**: optional `onComplete` prop.
- `site/src/components/english/ReadingFeed.tsx` — **create**: feed island.
- `site/src/components/english/Today.tsx` — **modify**: reading slot.
- `site/src/pages/[lang]/english/index.astro` — **modify**: hub uses the feed.

---

### Task 1: Extend `ReadingUnit` + reading-data scaffolding + migrate seed

**Files:**
- Modify: `site/src/english/types.ts`
- Create: `site/src/english/data/reading/a2-general.ts`, `a2-engineering.ts`, `b1-general.ts`, `b1-engineering.ts`, `index.ts`, `reading.test.ts`
- Modify: `site/src/english/units.ts`

- [ ] **Step 1: Extend the type**

In `site/src/english/types.ts`, replace the `ReadingUnit` type with:
```typescript
export type ReadingUnit = {
  id: string;
  level: "A2" | "B1" | "B2";
  /** Broad-English vs engineering artifacts (PR/RFC/incident/docs). */
  stream: "general" | "engineering";
  title: Bi;
  blurb: Bi;
  /** What real-world text this mimics, shown as a tag. */
  source: Bi;
  passages: Passage[];
  phrases: Phrase[];
  /** Comprehension checks for the reading. */
  questions: Question[];
  /** VocabEntry ids (P1 deck) this text teaches; seeded into SRS when read. */
  targetWords?: string[];
};
```

- [ ] **Step 2: Migrate the seed unit out of `units.ts`**

The current seed unit lives in `site/src/english/units.ts` as the single entry of `readingUnits`. Move that entire unit object into a new file `site/src/english/data/reading/a2-engineering.ts`, adding `stream: "engineering"` and a `targetWords` array of band-A2 vocab ids it teaches. File shape:
```typescript
// site/src/english/data/reading/a2-engineering.ts
// A2 engineering-stream reading texts. Bilingual; inline-glossed; targetWords
// reference real vocabA2 ids (ngsl:0001–ngsl:0800).
import type { ReadingUnit } from "~/english/types";

export const a2Engineering: ReadingUnit[] = [
  {
    id: "code-review-101",
    level: "A2",
    stream: "engineering",
    // …the full migrated seed object (title/blurb/source/passages/phrases/questions)…
    targetWords: ["ngsl:0730"], // "review" — extend with other A2 ids the text uses
  },
  // more A2 engineering texts added in Task 2
];
```
Pick `targetWords` from words the seed actually teaches that exist in `vocabA2` (e.g. `review` is `ngsl:0730`; verify ids against `site/src/english/data/vocab-a2.ts` — use only ids present there).

- [ ] **Step 3: Create the three other (initially empty) cell modules**

```typescript
// site/src/english/data/reading/a2-general.ts
import type { ReadingUnit } from "~/english/types";
export const a2General: ReadingUnit[] = [];
```
```typescript
// site/src/english/data/reading/b1-general.ts
import type { ReadingUnit } from "~/english/types";
export const b1General: ReadingUnit[] = [];
```
```typescript
// site/src/english/data/reading/b1-engineering.ts
import type { ReadingUnit } from "~/english/types";
export const b1Engineering: ReadingUnit[] = [];
```

- [ ] **Step 4: Create the aggregate index + helpers**

```typescript
// site/src/english/data/reading/index.ts
import type { Band } from "~/english/types";
import type { ReadingUnit } from "~/english/types";
import { a2General } from "./a2-general";
import { a2Engineering } from "./a2-engineering";
import { b1General } from "./b1-general";
import { b1Engineering } from "./b1-engineering";

export const readingUnits: ReadingUnit[] = [
  ...a2Engineering, ...a2General, ...b1General, ...b1Engineering,
];

export function unitById(id: string): ReadingUnit | undefined {
  return readingUnits.find((u) => u.id === id);
}

export function unitsByBandStream(band: Band, stream: "general" | "engineering"): ReadingUnit[] {
  return readingUnits.filter((u) => u.level === band && u.stream === stream);
}
```

- [ ] **Step 5: Repoint `units.ts` to the aggregate**

Replace the ENTIRE contents of `site/src/english/units.ts` with:
```typescript
// site/src/english/units.ts
// Back-compat re-export. Reading texts now live in ./data/reading/* by band×stream.
export { readingUnits, unitById } from "./data/reading";
```

- [ ] **Step 6: Write the validity gate test**

```typescript
// site/src/english/data/reading/reading.test.ts
import { describe, it, expect } from "vitest";
import { readingUnits } from "./index";
import { vocabA2 } from "../vocab-a2";
import { vocabB1 } from "../vocab-b1";

const vocabIds = new Set([...vocabA2, ...vocabB1].map((e) => e.id));
const LEVELS = ["A2", "B1", "B2"];
const STREAMS = ["general", "engineering"];
const bi = (b: unknown) =>
  !!b && typeof b === "object" && typeof (b as any).en === "string" && (b as any).en.length > 0
  && typeof (b as any).ru === "string" && (b as any).ru.length > 0;

describe("reading corpus validity", () => {
  it("has unique ids", () => {
    const ids = readingUnits.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every unit is well-formed and bilingual", () => {
    for (const u of readingUnits) {
      expect(LEVELS).toContain(u.level);
      expect(STREAMS).toContain(u.stream);
      expect(bi(u.title) && bi(u.blurb) && bi(u.source)).toBe(true);
      expect(u.passages.length).toBeGreaterThanOrEqual(2);
      for (const p of u.passages) {
        expect(p.en.length).toBeGreaterThan(0);
        expect(p.ru.length).toBeGreaterThan(0);
      }
      expect(u.questions.length).toBeGreaterThanOrEqual(3);
      for (const q of u.questions) {
        expect(bi(q.q)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.every(bi)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });

  it("targetWords are bounded and resolve to real vocab ids", () => {
    for (const u of readingUnits) {
      const tw = u.targetWords ?? [];
      expect(tw.length).toBeLessThanOrEqual(12);
      for (const id of tw) expect(vocabIds.has(id)).toBe(true);
    }
  });
});
```

- [ ] **Step 7: Run the test + a consumer check**

Run: `bunx vitest run src/english/data/reading/reading.test.ts`
Expected: PASS (3 tests) with just the migrated seed present.

Run: `bunx astro check 2>&1 | grep -E "units|reading/index|english/index" || echo "no consumer errors"`
Expected: `no consumer errors` (the hub still imports `readingUnits` from `~/english/units`, now re-exported).

- [ ] **Step 8: Commit**

```bash
git add site/src/english/types.ts site/src/english/data/reading/ site/src/english/units.ts
git commit -m "feat(english): ReadingUnit stream+targetWords; reading-data scaffolding + seed migration"
```

---

### Task 2: Author A2 reading content (general + engineering)

**Files:**
- Modify: `site/src/english/data/reading/a2-general.ts` (fill ~10)
- Modify: `site/src/english/data/reading/a2-engineering.ts` (seed + ~9 → ~10)
- Create: `site/src/english/data/reading/counts.test.ts`

Content is authored via a subagent fan-out (one subagent per few texts), then validated by the existing `reading.test.ts` plus the new count gate. lemma/gloss content is the model's own; no web content is trusted (prompt-injection). Each text: 3–6 bilingual passages (en + ru + inline glossed `words`), 1–4 `phrases`, 3–4 comprehension MCQs, `targetWords` of real A2 ids (`ngsl:0001`–`ngsl:0800`, present in `vocab-a2.ts`).

- [ ] **Step 1: Write the count gate (fails until content lands)**

```typescript
// site/src/english/data/reading/counts.test.ts
import { describe, it, expect } from "vitest";
import { unitsByBandStream } from "./index";

describe("reading corpus coverage", () => {
  it("A2 general has ~10 texts", () => {
    expect(unitsByBandStream("A2", "general").length).toBeGreaterThanOrEqual(10);
  });
  it("A2 engineering has ~10 texts", () => {
    expect(unitsByBandStream("A2", "engineering").length).toBeGreaterThanOrEqual(10);
  });
  it("B1 general has ~10 texts", () => {
    expect(unitsByBandStream("B1", "general").length).toBeGreaterThanOrEqual(10);
  });
  it("B1 engineering has ~10 texts", () => {
    expect(unitsByBandStream("B1", "engineering").length).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run it to confirm A2 fails**

Run: `bunx vitest run src/english/data/reading/counts.test.ts`
Expected: FAIL on the A2 general + A2 engineering cases (and B1, addressed in Task 3).

- [ ] **Step 3: Author the A2 texts**

Fill `a2General` (10 units) and extend `a2Engineering` to 10 units total. Each `ReadingUnit` exactly matches the type from Task 1. Authoring spec per unit:
- `id`: kebab-case, unique across the whole corpus (e.g. `a2g-weekend-plans`, `a2e-standup-update`).
- `level: "A2"`, `stream` per file.
- `title`/`blurb`/`source`: `Bi` (en + ru). `source` names the mimicked artifact (general: emails, chats, short articles, instructions; engineering: standup notes, short PR comments, simple docs, error messages).
- `passages`: 3–6, each `{ en, ru, words?: VocabWord[] }`. Keep English mostly within common A2 vocabulary; gloss the few hard words inline (`{ id, w, ru, gloss, pos?, ipa?, example? }`).
- `phrases`: 1–4 `{ id, en, ru, note? }`.
- `questions`: 3–4 `{ id, q: Bi, options: Bi[], answer, explain?: Bi }` — retrieval, few options.
- `targetWords`: up to 12 ids drawn from `ngsl:0001`–`ngsl:0800` for words the text actually uses (verify each id is in `vocab-a2.ts`).
Recommended mechanism: a Workflow/subagent fan-out, each subagent authoring 2–3 complete units for one cell, written into the cell file; validate every batch against `reading.test.ts` before merging. Spot-check 3 texts for natural English + accurate RU before committing.

- [ ] **Step 4: Validate A2**

Run: `bunx vitest run src/english/data/reading/reading.test.ts`
Expected: PASS (all units still well-formed).
Run: `bunx vitest run src/english/data/reading/counts.test.ts`
Expected: A2 general + A2 engineering now PASS (B1 still fails — expected until Task 3).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/data/reading/a2-general.ts site/src/english/data/reading/a2-engineering.ts site/src/english/data/reading/counts.test.ts
git commit -m "content(english): A2 graded reading texts (general + engineering)"
```

---

### Task 3: Author B1 reading content (general + engineering)

**Files:**
- Modify: `site/src/english/data/reading/b1-general.ts`, `b1-engineering.ts`

- [ ] **Step 1: Author the B1 texts**

Fill `b1General` (10) and `b1Engineering` (10), same authoring spec as Task 2 Step 3 but `level: "B1"`, richer sentences, and `targetWords` drawn from `ngsl:0801`–`ngsl:2000` (present in `vocab-b1.ts`). Engineering B1: PR review threads, RFC/design-doc excerpts, incident postmortems, API docs. General B1: opinion pieces, how-tos, short narratives. Use the same fan-out + per-batch validation; spot-check 3.

- [ ] **Step 2: Validate the full corpus**

Run: `bunx vitest run src/english/data/reading/reading.test.ts`
Expected: PASS.
Run: `bunx vitest run src/english/data/reading/counts.test.ts`
Expected: PASS (all 4 cells ≥10).

- [ ] **Step 3: Commit**

```bash
git add site/src/english/data/reading/b1-general.ts site/src/english/data/reading/b1-engineering.ts
git commit -m "content(english): B1 graded reading texts (general + engineering)"
```

---

### Task 4: State read-tracking + targetWord reinforcement

**Files:**
- Modify: `site/src/english/state.ts`
- Modify: `site/src/english/state.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `site/src/english/state.test.ts`:
```typescript
import { markUnitRead, isUnitRead, englishState as estate } from "./state";

const T2 = 1_700_000_000_000;

describe("english state — P2 reading", () => {
  beforeEach(() => resetEnglish());

  it("marks a unit read", () => {
    expect(isUnitRead("u1")).toBe(false);
    markUnitRead("u1", [], T2);
    expect(isUnitRead("u1")).toBe(true);
  });

  it("seeds targetWords into the deck on read (bumpSeen)", () => {
    markUnitRead("u1", ["ngsl:0042", "ngsl:0043"], T2);
    expect(estate.value.words["ngsl:0042"]).toBeDefined();
    expect(estate.value.words["ngsl:0043"]).toBeDefined();
    // bumpSeen creates a new card (reps 0), not a graded review
    expect(estate.value.words["ngsl:0042"].card.reps).toBe(0);
  });

  it("does not clobber a word already in progress", () => {
    gradeWord("ngsl:0042", "good", T2); // reps -> 1
    markUnitRead("u1", ["ngsl:0042"], T2);
    expect(estate.value.words["ngsl:0042"].card.reps).toBe(1); // unchanged
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `bunx vitest run src/english/state.test.ts`
Expected: FAIL — `markUnitRead`/`isUnitRead` do not exist.

- [ ] **Step 3: Edit `state.ts`**

(a) Add `readUnits` to the `EnglishState` type (extend the existing P1 shape):
```typescript
export type EnglishState = {
  words: Record<string, WordRecord>;
  revealed: Record<string, number>;
  placement?: PlacementResult;
  known: Record<string, true>;
  settings: { newWordsPerDay: number };
  daily?: { date: string; newIntroduced: number };
  readUnits: Record<string, true>;
};
```

(b) Add `readUnits: {}` to the `defaults` constant:
```typescript
const defaults: EnglishState = {
  words: {}, revealed: {}, known: {}, settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY },
  readUnits: {},
};
```

(c) In `load()`, add `readUnits` to the success return (alongside the P1 fields):
```typescript
      readUnits: parsed.readUnits ?? {},
```

(d) In `resetEnglish()`, add `readUnits: {}` to the reset object:
```typescript
export function resetEnglish() {
  englishState.value = {
    words: {}, revealed: {}, known: {},
    settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY }, readUnits: {},
  };
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
```

(e) Append the API at the bottom of the file:
```typescript
export function isUnitRead(id: string): boolean {
  return englishState.value.readUnits[id] === true;
}

/** Mark a reading unit complete; seed its target words into the SRS deck. */
export function markUnitRead(id: string, targetWords: string[], now: number) {
  for (const w of targetWords) bumpSeen(w, now); // no-ops if already seen
  englishState.value = {
    ...englishState.value,
    readUnits: { ...englishState.value.readUnits, [id]: true },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bunx vitest run src/english/state.test.ts`
Expected: PASS — P0 (4) + P1 (4) + P2 (3) = 11.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/state.ts site/src/english/state.test.ts
git commit -m "feat(english): read-tracking + targetWord reinforcement into the deck"
```

---

### Task 5: EnReader `onComplete` hook

**Files:**
- Modify: `site/src/components/english/EnReader.tsx`

EnReader's `CheckTab` already computes `allDone` (all comprehension questions answered). Fire an optional `onComplete` callback the first time the learner completes the Check, so the feed can mark the unit read.

- [ ] **Step 1: Thread the prop through**

In `site/src/components/english/EnReader.tsx`, change the top-level `Props` and signature:
```typescript
type Props = { unit: ReadingUnit; lang: Locale; onComplete?: () => void };
```
```typescript
export default function EnReader({ unit, lang, onComplete }: Props) {
```
Find where `CheckTab` is rendered (in the main component's tab switch) and pass the callback:
```typescript
        <CheckTab unit={unit} lang={lang} l={l} onComplete={onComplete} />
```

- [ ] **Step 2: Fire it once in `CheckTab`**

Update `CheckTab`'s signature to accept the prop and fire it when all questions are first answered. Find the `CheckTab` function declaration and add `onComplete` to its destructured params:
```typescript
function CheckTab({
  unit,
  lang,
  l,
  onComplete,
}: {
  unit: ReadingUnit;
  lang: Locale;
  l: (typeof L)["en"];
  onComplete?: () => void;
}) {
```
Add a `useEffect` import if missing (EnReader currently imports `{ useMemo, useState }` from `preact/hooks` — change to include `useEffect`):
```typescript
import { useMemo, useState, useEffect } from "preact/hooks";
```
Inside `CheckTab`, after `allDone` is computed, add:
```typescript
  useEffect(() => {
    if (allDone) onComplete?.();
  }, [allDone]);
```
(`allDone` flips to true once; the effect fires `onComplete` then. Re-renders with `allDone` still true do not re-run the effect because its dependency value is unchanged.)

- [ ] **Step 3: Type-check**

Run: `bunx astro check 2>&1 | grep -E "EnReader" || echo "no EnReader errors"`
Expected: `no EnReader errors`.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/english/EnReader.tsx
git commit -m "feat(english): EnReader fires onComplete when the Check is finished"
```

---

### Task 6: ReadingFeed island

**Files:**
- Create: `site/src/components/english/ReadingFeed.tsx`

Lists texts at the learner's band with a stream toggle and read/unread state; opens a selected text in `EnReader`, wiring `onComplete` → `markUnitRead`.

- [ ] **Step 1: Write the component**

```tsx
// site/src/components/english/ReadingFeed.tsx
import { useMemo, useState } from "preact/hooks";
import { readingUnits } from "~/english/data/reading";
import type { ReadingUnit, Band } from "~/english/types";
import { englishState, getPlacement, isUnitRead, markUnitRead } from "~/english/state";
import { type Locale } from "~/i18n";
import EnReader from "./EnReader";

type Props = { lang: Locale };
type Stream = "general" | "engineering";
const now = () => Date.now();

/** Bands at or below the learner's placement band (so easier texts stay available). */
function bandsUpTo(band: Band): Band[] {
  const order: Band[] = ["A2", "B1", "B2"];
  return order.slice(0, order.indexOf(band) + 1);
}

export default function ReadingFeed({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const [stream, setStream] = useState<Stream>("engineering");
  const [openId, setOpenId] = useState<string | null>(null);

  const allowed = bandsUpTo(band);
  const list = useMemo<ReadingUnit[]>(
    () => readingUnits.filter((u) => allowed.includes(u.level) && u.stream === stream),
    [stream, band],
  );

  const L = {
    title: lang === "en" ? "Reading" : "Чтение",
    general: lang === "en" ? "General" : "Общий",
    engineering: lang === "en" ? "Engineering" : "Инженерный",
    back: lang === "en" ? "← All texts" : "← Все тексты",
    read: lang === "en" ? "read" : "прочитано",
    empty: lang === "en" ? "No texts at your level yet." : "Пока нет текстов твоего уровня.",
  };

  const open = openId ? readingUnits.find((u) => u.id === openId) : null;
  if (open) {
    return (
      <div class="max-w-[760px] mx-auto">
        <button type="button" class="btn link text-[12px] text-muted mb-4" onClick={() => setOpenId(null)}>{L.back}</button>
        <h2 class="font-display text-[24px] font-bold text-ink m-0 mb-1">{open.title[lang]}</h2>
        <p class="text-[14px] text-muted m-0 mb-5">{open.blurb[lang]}</p>
        <EnReader unit={open} lang={lang} onComplete={() => markUnitRead(open.id, open.targetWords ?? [], now())} />
      </div>
    );
  }

  return (
    <div class="max-w-[620px] mx-auto">
      <div class="flex gap-1 mb-6">
        {(["engineering", "general"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStream(s)}
            class={`font-mono text-[11px] uppercase tracking-[0.04em] px-3 py-1.5 border rounded-[2px] cursor-pointer transition-colors ${
              stream === s ? "bg-ink text-paper border-ink" : "bg-transparent text-muted border-rule hover:text-ink"
            }`}
          >
            {s === "general" ? L.general : L.engineering}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p class="text-[14px] text-muted">{L.empty}</p>
      ) : (
        <ul class="flex flex-col gap-2 m-0 p-0 list-none">
          {list.map((u) => {
            const done = isUnitRead(u.id);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(u.id)}
                  class="w-full text-left bg-card border border-rule rounded-[2px] px-4 py-3 cursor-pointer hover:border-rule-strong transition-colors flex items-center gap-3"
                >
                  <span class="flex-1">
                    <span class="block text-[14px] text-ink font-semibold">{u.title[lang]}</span>
                    <span class="block text-[12px] text-muted">{u.source[lang]} · {u.level}</span>
                  </span>
                  {done ? <span class="text-[11px] font-mono uppercase text-muted border border-rule rounded-[2px] px-2 py-0.5">{L.read}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `bunx astro check 2>&1 | grep -E "ReadingFeed" || echo "no ReadingFeed errors"`
Expected: `no ReadingFeed errors`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/english/ReadingFeed.tsx
git commit -m "feat(english): ReadingFeed island (band+stream list → EnReader)"
```

---

### Task 7: Today reading slot + hub restructure

**Files:**
- Modify: `site/src/components/english/Today.tsx`
- Modify: `site/src/pages/[lang]/english/index.astro`

- [ ] **Step 1: Add a reading slot to Today**

In `site/src/components/english/Today.tsx`, import the corpus + read-state and surface one unread text at the learner's band. Add imports:
```typescript
import { readingUnits } from "~/english/data/reading";
import { isUnitRead } from "~/english/state";
```
After the existing `due` memo, add a pick of the next unread text (prefer engineering, fall back to general, within bands up to placement):
```typescript
  const nextText = useMemo(() => {
    const order = ["A2", "B1", "B2"];
    const maxIdx = order.indexOf(placement?.band ?? "A2");
    const eligible = readingUnits.filter((u) => order.indexOf(u.level) <= maxIdx && !isUnitRead(u.id));
    return eligible.find((u) => u.stream === "engineering") ?? eligible[0] ?? null;
  }, [englishState.value, placement]);
```
Extend the `L` map with reading labels:
```typescript
    reading: lang === "en" ? "Today's reading" : "Чтение на сегодня",
    readCta: lang === "en" ? "Open in Reading below ↓" : "Открой в разделе «Чтение» ниже ↓",
    readDone: lang === "en" ? "Reading done for today. ✅" : "Чтение на сегодня сделано. ✅",
```
Add a reading block to the returned JSX, after the New-words block:
```tsx
      <div>
        <div class="meta mb-2">{L.reading}</div>
        {nextText ? (
          <div class="text-[14px] text-ink">
            <span class="font-semibold">{nextText.title[lang]}</span>
            <span class="text-muted"> — {L.readCta}</span>
          </div>
        ) : (
          <div class="text-[13px] text-ink">{L.readDone}</div>
        )}
      </div>
```

- [ ] **Step 2: Put the feed on the hub**

Replace the Reading `<section>` of `site/src/pages/[lang]/english/index.astro` (currently rendering `EnReader` with the hardcoded seed unit) with the feed, and drop the now-unused `EnReader`/`readingUnits`/`unit` imports from the frontmatter. New frontmatter + Reading section:
```astro
---
import Topic from "../../../layouts/Topic.astro";
import Today from "../../../components/english/Today.tsx";
import ReadingFeed from "../../../components/english/ReadingFeed.tsx";
import { type Locale, isLocale, t } from "../../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const L = lang === "en"
  ? { today: "Today", reading: "Reading" }
  : { today: "Сегодня", reading: "Чтение" };
---
<Topic title={t("nav.english", lang)} lang={lang}>
  <div class="max-w-[760px] mx-auto mb-10">
    <div class="meta mb-2">{t("nav.english", lang)}</div>
    <h1 class="font-display text-[32px] font-bold tracking-[-0.015em] m-0 text-ink mb-1">English for Engineers</h1>
  </div>

  <section class="mb-14">
    <div class="meta mb-4 max-w-[620px] mx-auto">{L.today}</div>
    <Today client:visible lang={lang} />
  </section>

  <section class="border-t border-rule pt-10">
    <div class="meta mb-4 max-w-[620px] mx-auto">{L.reading}</div>
    <ReadingFeed client:visible lang={lang} />
  </section>
</Topic>
```

- [ ] **Step 3: Type-check**

Run: `bunx astro check 2>&1 | grep -E "Today\.tsx|english/index" || echo "no Today/hub errors"`
Expected: `no Today/hub errors`.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/english/Today.tsx "site/src/pages/[lang]/english/index.astro"
git commit -m "feat(english): Today reading slot + hub uses the Reading feed"
```

---

### Task 8: Full build green

**Files:** none (verification + final commit of any drift).

- [ ] **Step 1: Run the english test suite**

Run: `bunx vitest run src/english`
Expected: PASS — reading validity + counts, state (P0+P1+P2), placement, vocab, scheduler, xp.

- [ ] **Step 2: Full build**

Run: `bun run build 2>&1 | tail -6`
Expected: `Complete!`, **0 errors**; warnings ≤ baseline 1271.

- [ ] **Step 3: Confirm 0 errors**

Run: `node -e "const r=require('./dist/lint-report.json'); console.log('errors:', (r.errors??r.errorCount), 'warnings:', (r.warnings??r.warningCount))"`
Expected: `errors: 0`.

- [ ] **Step 4: i18n parity (only if new `t()` keys were added)**

The hub + islands use inline `L` label maps, so no new `t()` keys are required. If any `t("english.*")` key was introduced, add it to BOTH `en` and `ru` in `site/src/i18n/ui.json` (parity is lint-enforced). Otherwise a no-op.

- [ ] **Step 5: Commit any drift**

```bash
git add -A site
git commit -m "chore(english): P2 graded reading green — build + tests verified" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage (addendum §1–§10):**
- §2 Type extension (stream, targetWords) → Task 1. ✓
- §3 Data layout (cells + index + seed migration + units re-export) → Task 1. ✓
- §4 Reading feed → Task 6. ✓
- §5 Read tracking + targetWord reinforcement → Task 4 (state) + Task 5 (EnReader hook) + Task 6 (wiring). ✓
- §6 Today + hub → Task 7. ✓
- §7 i+1 proxy (bounded targetWords resolve + band match) → Task 1 validity test. ✓
- §8 Content generation (staged A2→B1) → Tasks 2–3. ✓
- §10 Testing (validity, counts, state, build) → Tasks 1,2,3,4,8. ✓

**Placeholder scan:** Content tasks (2–3) cannot embed 40 texts; they specify the exact type, authoring spec, source-artifact guidance, id/targetWord rules, and committed gate tests (`reading.test.ts` + `counts.test.ts`) that fail until real content lands — a deliberate gate, not a placeholder. All code tasks show complete code. ✓

**Type consistency:** `ReadingUnit` (with `stream`, `targetWords`) defined Task 1, consumed in Tasks 2,3,5,6,7. `unitsByBandStream`/`unitById`/`readingUnits` defined Task 1, consumed in Tasks 6,7. `markUnitRead(id, targetWords, now)`/`isUnitRead(id)` defined Task 4, consumed in Tasks 6 (feed wiring) + 7 (Today). `EnReader` `onComplete?` added Task 5, used Task 6. ✓

**Known intentional gaps (per spec):** no content-collection promotion; no B2 reading; account-sync graduation deferred; i+1 is a proxy not true token-coverage.
