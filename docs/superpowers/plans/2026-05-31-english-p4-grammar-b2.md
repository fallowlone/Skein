# English P4 — Grammar/Collocations + Vocab→B2 + B2 Reading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the English layer's content to B2 — full ~1759-word B2 vocab deck, B2 reading band, and two new content types (grammar-in-context + collocations) behind one "Grammar & Phrasing" island.

**Architecture:** Additive content modules + light state. New vocab/reading/grammar/collocation data modules under `src/english/data/`. Grammar & collocation practice is completion-tracked (NOT scheduled into the FSRS deck — the deck stays pure words). One new Preact island `GrammarModule.tsx` mounted as a 4th `client:visible` section on the existing 2-segment hub route. Every data set lands behind a failing count+validity gate (TDD-gate) before it is filled; vocab is validated against `ngsl.csv`/`nawl.csv` truth at assembly.

**Tech Stack:** Astro 5, Preact + `@preact/signals`, Tailwind, Vitest, TypeScript, ts-fsrs (untouched here). All commands run from `site/`.

---

## File Structure

**Create:**
- `src/english/data/vocab-b2.ts` — B2 vocab deck (~1759 `VocabEntry`, NGSL 2001-2800 + all NAWL).
- `src/english/data/vocab-b2.test.ts` — count + shape + disjoint + CSV-truth gate.
- `src/english/data/reading/b2-general.ts` — ~10 B2 general `ReadingUnit`.
- `src/english/data/reading/b2-engineering.ts` — ~10 B2 engineering `ReadingUnit`.
- `src/english/data/grammar.ts` — `grammarPoints: GrammarPoint[]` (~18-24).
- `src/english/data/grammar.test.ts` — grammar gate.
- `src/english/data/collocations.ts` — `collocationSets: CollocationSet[]` (~8-12 sets).
- `src/english/data/collocations.test.ts` — collocation gate.
- `src/components/english/GrammarModule.tsx` — "Grammar & Phrasing" island.

**Modify:**
- `src/english/types.ts` — `+ ClozeItem, GrammarPoint, Collocation, CollocationSet`.
- `src/english/state.ts` — `+ grammarDone, collocationDone` sub-slice + helpers.
- `src/english/state.test.ts` — round-trip + reset + active-day tests.
- `src/components/english/VocabModule.tsx` — `BANK.B2 = vocabB2`, drop placeholder.
- `src/english/data/reading/index.ts` — aggregate B2 modules.
- `src/english/data/reading/counts.test.ts` — `+ B2 ≥10` per stream.
- `src/components/english/Today.tsx` — grammar slot.
- `src/pages/[lang]/english/index.astro` — `+ Grammar & Phrasing` section.
- `src/i18n/ui.json` — grammar/phrasing labels.

---

## Task 1: New content types

**Files:**
- Modify: `src/english/types.ts`

- [ ] **Step 1: Add the four types**

Append to `src/english/types.ts`:

```ts
/** One fill-in-the-gap practice item for a grammar point. */
export type ClozeItem = {
  id: string;
  before: string;       // sentence fragment before the gap
  after?: string;       // fragment after the gap (gap rendered between)
  answer: string;       // primary accepted fill
  alts?: string[];      // other accepted fills (compared case-insensitively, trimmed)
  hint: Bi;             // bilingual nudge
  explain?: Bi;         // why this form, shown after answering
};

/** A grammar-in-context micro-lesson: explanation + examples + cloze practice. */
export type GrammarPoint = {
  id: string;                 // "grammar:passive-engineering"
  band: "B1" | "B2";
  domain?: "general" | "engineering";
  title: Bi;
  structure: Bi;              // the rule named, e.g. "be + past participle"
  explain: Bi;                // short in-context explanation, bilingual scaffolding
  examples: { en: string; ru: string; note?: Bi }[];  // 2-3 in-context
  cloze: ClozeItem[];         // >=2 per point
  register?: Bi;              // when/why (engineering hedging, formality)
};

/** A single collocation / chunk, practiced as a gap-fill. */
export type Collocation = {
  id: string;
  chunk: string;        // full collocation, "raise an exception"
  ru: string;
  gap: string;          // drill prompt with a ___ gap, "raise an ___"
  answer: string;       // accepted fill, "exception"
  alts?: string[];
  example: string;      // natural sentence using the chunk
  note?: Bi;
};

/** A themed group of collocations (engineering or general/academic). */
export type CollocationSet = {
  id: string;
  title: Bi;
  domain: "general" | "engineering";
  items: Collocation[];
};
```

- [ ] **Step 2: Verify it typechecks**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: no errors (types compile; `Bi` already defined in this file).

- [ ] **Step 3: Commit**

```bash
git add src/english/types.ts
git commit -m "feat(english): P4 content types — GrammarPoint, ClozeItem, CollocationSet"
```

---

## Task 2: State — grammarDone / collocationDone

**Files:**
- Modify: `src/english/state.ts`
- Test: `src/english/state.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/english/state.test.ts` (inside the file, after existing imports add the new names; if the file uses a single `import { ... } from "./state"`, extend it):

```ts
import {
  englishState, resetEnglish,
  markGrammarDone, isGrammarDone,
  markCollocationDone, isCollocationDone,
} from "./state";

describe("P4 grammar/collocation completion", () => {
  beforeEach(() => resetEnglish());

  it("marks and reads grammar completion", () => {
    expect(isGrammarDone("grammar:passive")).toBe(false);
    markGrammarDone("grammar:passive");
    expect(isGrammarDone("grammar:passive")).toBe(true);
  });

  it("marks and reads collocation completion", () => {
    expect(isCollocationDone("colloc:exceptions")).toBe(false);
    markCollocationDone("colloc:exceptions");
    expect(isCollocationDone("colloc:exceptions")).toBe(true);
  });

  it("resetEnglish clears P4 completion", () => {
    markGrammarDone("grammar:passive");
    markCollocationDone("colloc:exceptions");
    resetEnglish();
    expect(isGrammarDone("grammar:passive")).toBe(false);
    expect(isCollocationDone("colloc:exceptions")).toBe(false);
  });

  it("survives a save/load round-trip via the signal", () => {
    markGrammarDone("grammar:passive");
    const json = JSON.stringify(englishState.value);
    const parsed = JSON.parse(json);
    expect(parsed.grammarDone["grammar:passive"]).toBe(true);
  });
});
```

(Ensure `beforeEach` is imported from `vitest` at the top of the file if not already.)

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/english/state.test.ts`
Expected: FAIL — `markGrammarDone is not a function` (not yet exported).

- [ ] **Step 3: Implement state changes**

In `src/english/state.ts`:

a. Extend the `EnglishState` type — add two fields after `outputAttempts`:

```ts
  outputAttempts: Record<string, { at: number; scoreBand?: string }>;
  grammarDone: Record<string, true>;
  collocationDone: Record<string, true>;
```

b. Extend `defaults`:

```ts
const defaults: EnglishState = {
  words: {}, revealed: {}, known: {},
  settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
  readUnits: {}, outputAttempts: {},
  grammarDone: {}, collocationDone: {},
};
```

c. In `load()`, add to the returned object (after `outputAttempts`):

```ts
      outputAttempts: parsed.outputAttempts ?? {},
      grammarDone: parsed.grammarDone ?? {},
      collocationDone: parsed.collocationDone ?? {},
```

d. In `resetEnglish()`, mirror the defaults:

```ts
  englishState.value = {
    words: {}, revealed: {}, known: {},
    settings: { newWordsPerDay: DEFAULT_NEW_PER_DAY, gradingModel: "claude-haiku-4-5" },
    readUnits: {}, outputAttempts: {},
    grammarDone: {}, collocationDone: {},
  };
```

e. Append the helpers at the end of the file:

```ts
export function isGrammarDone(id: string): boolean {
  return englishState.value.grammarDone[id] === true;
}

export function markGrammarDone(id: string) {
  if (englishState.value.grammarDone[id]) return;
  englishState.value = {
    ...englishState.value,
    grammarDone: { ...englishState.value.grammarDone, [id]: true },
  };
  if (typeof window !== "undefined") recordActiveDay();
}

export function isCollocationDone(id: string): boolean {
  return englishState.value.collocationDone[id] === true;
}

export function markCollocationDone(id: string) {
  if (englishState.value.collocationDone[id]) return;
  englishState.value = {
    ...englishState.value,
    collocationDone: { ...englishState.value.collocationDone, [id]: true },
  };
  if (typeof window !== "undefined") recordActiveDay();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/english/state.test.ts`
Expected: PASS (all describe blocks, including pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/english/state.ts src/english/state.test.ts
git commit -m "feat(english): track grammar/collocation completion (off the FSRS deck)"
```

---

## Task 3: Vocab B2 — failing gate + empty module

**Files:**
- Create: `src/english/data/vocab-b2.ts`
- Create: `src/english/data/vocab-b2.test.ts`

- [ ] **Step 1: Create the empty module**

`src/english/data/vocab-b2.ts`:

```ts
// site/src/english/data/vocab-b2.ts
// GENERATED + reviewed. Source: ngsl.csv rows 2001-2800 + nawl.csv (all).
// lemma/rank copied verbatim from source CSVs — never model-invented.
import type { VocabEntry } from "~/english/types";

export const vocabB2: VocabEntry[] = [];
```

- [ ] **Step 2: Write the failing gate**

`src/english/data/vocab-b2.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { vocabB2 } from "./vocab-b2";
import { vocabA2 } from "./vocab-a2";
import { vocabB1 } from "./vocab-b1";

const POS = ["noun", "verb", "adj", "adv", "phrase", "abbr", "other"];

function csvLemmaByRank(name: string): Map<number, string> {
  const path = fileURLToPath(new URL(`./${name}`, import.meta.url));
  const text = readFileSync(path, "utf8").trim();
  const m = new Map<number, string>();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [rank, lemma] = line.split(",");
    m.set(Number(rank), lemma);
  }
  return m;
}

describe("vocab-b2 dataset", () => {
  it("has the full B2 band enriched", () => {
    expect(vocabB2.length).toBeGreaterThanOrEqual(1700);
  });

  it("every entry is well-formed and in band B2", () => {
    for (const e of vocabB2) {
      expect(e.band).toBe("B2");
      expect(e.id).toMatch(/^(ngsl|nawl):\d{4}$/);
      expect(e.lemma.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(e.rank)).toBe(true);
      expect(POS).toContain(e.pos);
      expect(e.ru.trim().length).toBeGreaterThan(0);
      expect(e.gloss.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(e.examples) && e.examples.length >= 1).toBe(true);
    }
  });

  it("ids are unique and disjoint from A2 + B1", () => {
    const ids = vocabB2.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lower = new Set([...vocabA2, ...vocabB1].map((e) => e.id));
    expect(vocabB2.every((e) => !lower.has(e.id))).toBe(true);
  });

  it("lemma + rank match the source CSV truth", () => {
    const ngsl = csvLemmaByRank("ngsl.csv");
    const nawl = csvLemmaByRank("nawl.csv");
    for (const e of vocabB2) {
      const [src, rankStr] = e.id.split(":");
      expect(e.rank).toBe(Number(rankStr));
      const expected = src === "ngsl" ? ngsl.get(e.rank) : nawl.get(e.rank);
      expect(e.lemma).toBe(expected);
      if (src === "ngsl") expect(e.rank).toBeGreaterThanOrEqual(2001);
    }
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bunx vitest run src/english/data/vocab-b2.test.ts`
Expected: FAIL — "has the full B2 band enriched" (length 0 < 1700).

- [ ] **Step 4: Commit the red gate**

```bash
git add src/english/data/vocab-b2.ts src/english/data/vocab-b2.test.ts
git commit -m "test(english): failing B2 vocab gate (count + CSV-truth)"
```

---

## Task 4: Vocab B2 — enrich to full band (content, subagent waves)

**Files:**
- Modify: `src/english/data/vocab-b2.ts`

This is the large token spend. Content is generated, not hand-written in this plan.

- [ ] **Step 1: Extract the source rows**

Build the work-list from CSV truth (run from `site/`):

```bash
# NGSL rows 2001-2800 → "rank,lemma,pos"
awk -F, 'NR>1 && $1>=2001 && $1<=2800' src/english/data/ngsl.csv > /tmp/b2-ngsl.csv
# NAWL all rows
awk -F, 'NR>1' src/english/data/nawl.csv > /tmp/b2-nawl.csv
wc -l /tmp/b2-ngsl.csv /tmp/b2-nawl.csv   # expect ~800 + ~959
```

- [ ] **Step 2: Generate enrichment in batches (2-concurrent subagents)**

Split the ~1759 rows into ~12 batches of ~150. Dispatch **at most 2 subagents concurrently**
(5-concurrent heavy agents hit API socket/ConnectionRefused — see `project_english-layer`).

Each subagent prompt (own-knowledge, no web):
> You are enriching an English vocabulary deck for Russian-speaking engineers. For each
> `rank,lemma,pos` row below, output one JSON object exactly matching this shape:
> `{"id","lemma","rank","band":"B2","pos","ru","gloss","ipa","examples","collocations","domain"}`.
> - `id` = `ngsl:<rank zero-padded to 4>` for NGSL rows, `nawl:<rank zero-padded to 4>` for NAWL.
> - `lemma` and `rank` **copied verbatim** from the row — do not alter, pluralize, or invent.
> - `pos` mapped to one of noun|verb|adj|adv|phrase|abbr|other (use `other` if unclear).
> - `ru`: concise A2-friendly Russian meaning. `gloss`: plain one-line English definition.
> - `ipa`: IPA without slashes. `examples`: 1-2 natural sentences. `collocations`: 0-4 common
>   partners. `domain`: "engineering" only if genuinely technical, else "general".
> Output ONLY a JSON array, no prose. Rows: <batch>

- [ ] **Step 3: Assemble + validate against CSV truth**

Main thread collects all batch arrays, concatenates into the `vocabB2` literal in
`src/english/data/vocab-b2.ts` (one object per line, matching `vocab-b1.ts` formatting).
Before writing, assert in-process: each `(source, rank) → lemma` equals the CSV row, every id
unique and disjoint from A2+B1, count ≥1700. Fix any mismatch by regenerating that batch.

- [ ] **Step 4: Run the gate to verify it passes**

Run: `bunx vitest run src/english/data/vocab-b2.test.ts`
Expected: PASS (all four `it` blocks).

- [ ] **Step 5: Commit**

```bash
git add src/english/data/vocab-b2.ts
git commit -m "content(english): B2 vocab deck — NGSL 2001-2800 + all NAWL (~1759)"
```

---

## Task 5: Wire B2 vocab into VocabModule

**Files:**
- Modify: `src/components/english/VocabModule.tsx`

- [ ] **Step 1: Import and fill the bank**

In `VocabModule.tsx`, add the import after the `vocabB1` import:

```ts
import { vocabB2 } from "~/english/data/vocab-b2";
```

Change the `BANK` constant:

```ts
const BANK: Record<Band, VocabEntry[]> = { A2: vocabA2, B1: vocabB1, B2: vocabB2 };
```

- [ ] **Step 2: Remove the B2 placeholder branch**

Delete the `b2` label from `L` and delete this block:

```ts
  if (band === "B2" && bank.length === 0) {
    return <p class="text-[14px] text-muted max-w-[600px] mx-auto">{L.b2}</p>;
  }
```

(The generic "no new words queued" empty-state remains and now covers a spent B2 budget.)

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: 0 errors. Page count unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/english/VocabModule.tsx
git commit -m "feat(english): serve B2 vocab from VocabModule"
```

---

## Task 6: B2 reading — failing gates + empty modules + wiring

**Files:**
- Create: `src/english/data/reading/b2-general.ts`
- Create: `src/english/data/reading/b2-engineering.ts`
- Modify: `src/english/data/reading/index.ts`
- Modify: `src/english/data/reading/counts.test.ts`

- [ ] **Step 1: Create empty modules**

`src/english/data/reading/b2-general.ts`:

```ts
import type { ReadingUnit } from "~/english/types";
export const b2General: ReadingUnit[] = [];
```

`src/english/data/reading/b2-engineering.ts`:

```ts
import type { ReadingUnit } from "~/english/types";
export const b2Engineering: ReadingUnit[] = [];
```

- [ ] **Step 2: Wire them into the aggregator**

Replace the body of `src/english/data/reading/index.ts` aggregation:

```ts
import { a2General } from "./a2-general";
import { a2Engineering } from "./a2-engineering";
import { b1General } from "./b1-general";
import { b1Engineering } from "./b1-engineering";
import { b2General } from "./b2-general";
import { b2Engineering } from "./b2-engineering";

export const readingUnits: ReadingUnit[] = [
  ...a2Engineering, ...a2General, ...b1General, ...b1Engineering,
  ...b2General, ...b2Engineering,
];
```

- [ ] **Step 3: Add the failing count gate**

Append to `src/english/data/reading/counts.test.ts` (inside the existing `describe`):

```ts
  it("B2 general has ~10 texts", () => {
    expect(unitsByBandStream("B2", "general").length).toBeGreaterThanOrEqual(10);
  });
  it("B2 engineering has ~10 texts", () => {
    expect(unitsByBandStream("B2", "engineering").length).toBeGreaterThanOrEqual(10);
  });
```

- [ ] **Step 4: Run to verify it fails**

Run: `bunx vitest run src/english/data/reading/counts.test.ts`
Expected: FAIL — B2 general/engineering 0 < 10.

- [ ] **Step 5: Commit the red gate**

```bash
git add src/english/data/reading/b2-general.ts src/english/data/reading/b2-engineering.ts \
        src/english/data/reading/index.ts src/english/data/reading/counts.test.ts
git commit -m "test(english): failing B2 reading count gate + wiring"
```

---

## Task 7: B2 reading — author content (subagent waves)

**Files:**
- Modify: `src/english/data/reading/b2-general.ts`, `src/english/data/reading/b2-engineering.ts`

- [ ] **Step 1: Build the allowed targetWords pool**

`targetWords[]` must resolve to real ids (enforced by `reading.test.ts`, which now must also
include B2 — see Step 4). Provide subagents the id+lemma list of B2 vocab (and note A2/B1 are
also valid) so they reference only real ids.

```bash
node -e 'const{vocabB2}=require("./src/english/data/vocab-b2.ts");' 2>/dev/null || true
# Practical: read vocab-b2.ts and pass a sample of {id,lemma} pairs to the subagent prompt.
```

- [ ] **Step 2: Author ~10 units per stream (2-concurrent subagents)**

Each `ReadingUnit` must satisfy `reading.test.ts`: unique `id`; `level:"B2"`; bilingual
`title`/`blurb`/`source`; `passages.length >= 2` (each en+ru non-empty); `questions.length >= 3`
(each bilingual `q`, ≥2 bilingual `options`, valid `answer` index); `targetWords.length <= 12`,
every id real.

- **b2-general**: B2 broad-English prose (opinion/explanation/popular-science/narrative).
- **b2-engineering**: RFC sections, incident postmortems, design-doc tradeoffs, code-review
  threads, architecture rationale — senior register; deliberately use passive + hedging/modality
  (reinforces grammar). i+1: keep ≥95% of tokens inside A2+B1+B2.

Subagents authoring from any web source must distrust page content (prompt-injection,
`feedback_subagent-websearch-injection`); B2 reading is own-knowledge, so no web is needed.

- [ ] **Step 3: Run counts gate**

Run: `bunx vitest run src/english/data/reading/counts.test.ts`
Expected: PASS (all six band/stream checks).

- [ ] **Step 4: Extend targetWords resolution to B2 and run reading validity**

In `src/english/data/reading/reading.test.ts`, include B2 in the id pool:

```ts
import { vocabB2 } from "../vocab-b2";
const vocabIds = new Set([...vocabA2, ...vocabB1, ...vocabB2].map((e) => e.id));
```

Run: `bunx vitest run src/english/data/reading/reading.test.ts`
Expected: PASS (validity + targetWords resolve).

- [ ] **Step 5: Commit**

```bash
git add src/english/data/reading/b2-general.ts src/english/data/reading/b2-engineering.ts \
        src/english/data/reading/reading.test.ts
git commit -m "content(english): B2 reading — general + engineering streams"
```

---

## Task 8: Grammar — failing gate + content

**Files:**
- Create: `src/english/data/grammar.ts`
- Create: `src/english/data/grammar.test.ts`

- [ ] **Step 1: Create the empty module**

`src/english/data/grammar.ts`:

```ts
// site/src/english/data/grammar.ts
// Grammar-in-context micro-lessons (B1/B2) with bilingual scaffolding + cloze.
import type { GrammarPoint } from "~/english/types";

export const grammarPoints: GrammarPoint[] = [];
```

- [ ] **Step 2: Write the failing gate**

`src/english/data/grammar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { grammarPoints } from "./grammar";

const bi = (b: unknown) =>
  !!b && typeof b === "object" && typeof (b as any).en === "string" && (b as any).en.length > 0
  && typeof (b as any).ru === "string" && (b as any).ru.length > 0;

describe("grammar dataset", () => {
  it("has at least 18 points", () => {
    expect(grammarPoints.length).toBeGreaterThanOrEqual(18);
  });

  it("ids are unique", () => {
    const ids = grammarPoints.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every point is well-formed and bilingual", () => {
    for (const p of grammarPoints) {
      expect(["B1", "B2"]).toContain(p.band);
      expect(bi(p.title) && bi(p.structure) && bi(p.explain)).toBe(true);
      expect(p.examples.length).toBeGreaterThanOrEqual(2);
      for (const ex of p.examples) {
        expect(ex.en.length).toBeGreaterThan(0);
        expect(ex.ru.length).toBeGreaterThan(0);
      }
      expect(p.cloze.length).toBeGreaterThanOrEqual(2);
      for (const c of p.cloze) {
        expect(c.before.length).toBeGreaterThan(0);
        expect(c.answer.trim().length).toBeGreaterThan(0);
        expect(bi(c.hint)).toBe(true);
      }
    }
  });

  it("covers both B1 and B2", () => {
    expect(grammarPoints.some((p) => p.band === "B1")).toBe(true);
    expect(grammarPoints.some((p) => p.band === "B2")).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bunx vitest run src/english/data/grammar.test.ts`
Expected: FAIL — "has at least 18 points" (0 < 18).

- [ ] **Step 4: Commit the red gate**

```bash
git add src/english/data/grammar.ts src/english/data/grammar.test.ts
git commit -m "test(english): failing grammar gate"
```

- [ ] **Step 5: Author ~18-24 points (2-concurrent subagents, own-knowledge)**

Coverage (parent §3.4): present perfect vs past simple; conditionals 0/1/2/3 + mixed; defining
vs non-defining relative clauses; passive voice (+ engineering "the build was triggered by…");
modality & hedging (might/may/should/would/tend to/appear to — senior review register); reported
speech; gerund vs infinitive; articles for abstractions/uncountables; comparatives &
intensifiers; discourse/linking markers (however/whereas/given that). Mix B1 and B2; tag
`domain:"engineering"` where the examples are code/PR/incident-flavored. Each point: bilingual
`title`/`structure`/`explain`, 2-3 `examples`, ≥2 `cloze` (with `answer`, bilingual `hint`,
optional `explain`), optional `register`. ids `grammar:<kebab-slug>`.

- [ ] **Step 6: Run the gate to verify it passes**

Run: `bunx vitest run src/english/data/grammar.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/english/data/grammar.ts
git commit -m "content(english): grammar-in-context micro-lessons (B1/B2)"
```

---

## Task 9: Collocations — failing gate + content

**Files:**
- Create: `src/english/data/collocations.ts`
- Create: `src/english/data/collocations.test.ts`

- [ ] **Step 1: Create the empty module**

`src/english/data/collocations.ts`:

```ts
// site/src/english/data/collocations.ts
// Reusable engineering + general/academic collocation sets, practiced as gap-fills.
import type { CollocationSet } from "~/english/types";

export const collocationSets: CollocationSet[] = [];
```

- [ ] **Step 2: Write the failing gate**

`src/english/data/collocations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { collocationSets } from "./collocations";

describe("collocation sets", () => {
  it("has at least 8 sets", () => {
    expect(collocationSets.length).toBeGreaterThanOrEqual(8);
  });

  it("has at least 80 items total", () => {
    const total = collocationSets.reduce((n, s) => n + s.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(80);
  });

  it("set ids and item ids are unique", () => {
    const setIds = collocationSets.map((s) => s.id);
    expect(new Set(setIds).size).toBe(setIds.length);
    const itemIds = collocationSets.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
  });

  it("every set and item is well-formed", () => {
    for (const s of collocationSets) {
      expect(["general", "engineering"]).toContain(s.domain);
      expect(typeof s.title.en === "string" && s.title.en.length > 0).toBe(true);
      expect(typeof s.title.ru === "string" && s.title.ru.length > 0).toBe(true);
      for (const it of s.items) {
        expect(it.chunk.length).toBeGreaterThan(0);
        expect(it.ru.trim().length).toBeGreaterThan(0);
        expect(it.gap).toContain("___");
        expect(it.answer.trim().length).toBeGreaterThan(0);
        expect(it.example.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bunx vitest run src/english/data/collocations.test.ts`
Expected: FAIL — "has at least 8 sets" (0 < 8).

- [ ] **Step 4: Commit the red gate**

```bash
git add src/english/data/collocations.ts src/english/data/collocations.test.ts
git commit -m "test(english): failing collocation gate"
```

- [ ] **Step 5: Author ~8-12 sets / ~100 items (2-concurrent subagents, own-knowledge)**

Sets: exception verbs (raise/throw/catch/handle an exception); git ops
(merge/revert/cherry-pick/rebase a commit; open/close/triage an issue; roll back/ship/deploy a
release); debugging (reproduce/track down/introduce/regress a bug); review register; general/
academic NAWL register (conduct research, draw a conclusion, address an issue, significant
impact, play a role, take into account); hedging & connectors (it appears that, tends to, given
that, with respect to, that said). Each item: `chunk`, `ru`, `gap` (containing `___`), `answer`,
optional `alts`, `example`, optional bilingual `note`. ids `colloc:<set-slug>` /
`colloc:<set-slug>:<n>`.

- [ ] **Step 6: Run the gate to verify it passes**

Run: `bunx vitest run src/english/data/collocations.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/english/data/collocations.ts
git commit -m "content(english): engineering + general collocation sets"
```

---

## Task 10: GrammarModule island

**Files:**
- Create: `src/components/english/GrammarModule.tsx`

- [ ] **Step 1: Write the component**

`src/components/english/GrammarModule.tsx`:

```tsx
// site/src/components/english/GrammarModule.tsx
import { useMemo, useState } from "preact/hooks";
import { grammarPoints } from "~/english/data/grammar";
import { collocationSets } from "~/english/data/collocations";
import type { GrammarPoint, CollocationSet } from "~/english/types";
import {
  englishState, getPlacement,
  markGrammarDone, isGrammarDone,
  markCollocationDone, isCollocationDone,
} from "~/english/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };
type Tab = "grammar" | "phrasing";

const ORDER = ["A2", "B1", "B2"];
const norm = (s: string) => s.trim().toLowerCase();

export default function GrammarModule({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const maxIdx = ORDER.indexOf(band);
  const [tab, setTab] = useState<Tab>("grammar");

  const points = useMemo(
    () => grammarPoints.filter((p) => ORDER.indexOf(p.band) <= maxIdx),
    [maxIdx],
  );

  const L = {
    grammar: lang === "en" ? "Grammar" : "Грамматика",
    phrasing: lang === "en" ? "Phrasing" : "Фразы",
    locked: lang === "en"
      ? "Grammar for your level unlocks as you place up."
      : "Грамматика для твоего уровня откроется после теста уровня.",
  };

  return (
    <div class="max-w-[620px] mx-auto">
      <div class="flex gap-1 mb-6 justify-center">
        <button type="button" class={`btn ${tab === "grammar" ? "" : "ghost"}`} onClick={() => setTab("grammar")}>{L.grammar}</button>
        <button type="button" class={`btn ${tab === "phrasing" ? "" : "ghost"}`} onClick={() => setTab("phrasing")}>{L.phrasing}</button>
      </div>
      {tab === "grammar"
        ? (points.length ? <GrammarList lang={lang} points={points} /> : <p class="text-[14px] text-muted">{L.locked}</p>)
        : <PhrasingList lang={lang} sets={collocationSets} />}
    </div>
  );
}

function GrammarList({ lang, points }: { lang: Locale; points: GrammarPoint[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = points.find((p) => p.id === openId) ?? null;
  if (open) return <GrammarRun lang={lang} point={open} onClose={() => setOpenId(null)} />;
  return (
    <div class="flex flex-col gap-2">
      {points.map((p) => (
        <button key={p.id} type="button" class="text-left bg-card border border-rule rounded-[2px] p-4 hover:border-rule-strong"
          onClick={() => setOpenId(p.id)}>
          <div class="flex items-baseline gap-2">
            <span class="text-[15px] font-semibold text-ink">{p.title[lang]}</span>
            <span class="text-[11px] font-mono uppercase text-muted">{p.band}</span>
            {isGrammarDone(p.id) ? <span class="text-[12px] text-muted ml-auto">✓</span> : null}
          </div>
          <div class="text-[13px] text-muted mt-1">{p.structure[lang]}</div>
        </button>
      ))}
    </div>
  );
}

function GrammarRun({ lang, point, onClose }: { lang: Locale; point: GrammarPoint; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const c = point.cloze[i];
  const done = i >= point.cloze.length;

  const L = {
    back: lang === "en" ? "← Back" : "← Назад",
    check: lang === "en" ? "Check" : "Проверить",
    next: lang === "en" ? "Next" : "Дальше",
    correct: lang === "en" ? "Correct" : "Верно",
    answer: lang === "en" ? "Answer" : "Ответ",
    finish: lang === "en" ? "Done ✓" : "Готово ✓",
    fin: lang === "en" ? "Practice complete." : "Практика пройдена.",
  };

  function check() { setChecked(true); }
  function next() {
    setChecked(false); setVal("");
    const n = i + 1;
    setI(n);
    if (n >= point.cloze.length) markGrammarDone(point.id);
  }

  const ok = c ? [c.answer, ...(c.alts ?? [])].some((a) => norm(a) === norm(val)) : false;

  return (
    <div class="flex flex-col gap-4">
      <button type="button" class="btn ghost self-start" onClick={onClose}>{L.back}</button>
      <div>
        <div class="text-[15px] font-semibold text-ink">{point.title[lang]}</div>
        <div class="text-[13px] text-muted mt-1">{point.explain[lang]}</div>
        {point.register ? <div class="text-[12px] text-muted mt-1 italic">{point.register[lang]}</div> : null}
      </div>
      <div class="flex flex-col gap-1">
        {point.examples.map((ex, k) => (
          <div key={k} class="text-[13px]">
            <span class="text-ink">{ex.en}</span> <span class="text-muted">— {ex.ru}</span>
          </div>
        ))}
      </div>
      {done ? (
        <div class="text-[14px] text-ink">{L.fin}</div>
      ) : (
        <div class="bg-card border border-rule-strong rounded-[2px] p-5 flex flex-col gap-3">
          <div class="text-[14px] text-ink">
            {c.before} <span class="font-mono">[ ___ ]</span> {c.after ?? ""}
          </div>
          <div class="text-[12px] text-muted">{c.hint[lang]}</div>
          <input class="border border-rule rounded-[2px] px-3 py-2 text-[14px] bg-bg text-ink"
            value={val} onInput={(e) => setVal((e.target as HTMLInputElement).value)}
            disabled={checked} placeholder="…" />
          {!checked ? (
            <button type="button" class="btn self-start" onClick={check} disabled={!val.trim()}>{L.check}</button>
          ) : (
            <div class="flex flex-col gap-2">
              <div class={`text-[13px] ${ok ? "text-ink" : "text-muted"}`}>
                {ok ? `✓ ${L.correct}` : `${L.answer}: ${c.answer}`}
              </div>
              {c.explain ? <div class="text-[12px] text-muted">{c.explain[lang]}</div> : null}
              <button type="button" class="btn self-start" onClick={next}>
                {i + 1 >= point.cloze.length ? L.finish : L.next}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhrasingList({ lang, sets }: { lang: Locale; sets: CollocationSet[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = sets.find((s) => s.id === openId) ?? null;
  if (open) return <PhrasingRun lang={lang} set={open} onClose={() => setOpenId(null)} />;
  return (
    <div class="flex flex-col gap-2">
      {sets.map((s) => (
        <button key={s.id} type="button" class="text-left bg-card border border-rule rounded-[2px] p-4 hover:border-rule-strong"
          onClick={() => setOpenId(s.id)}>
          <div class="flex items-baseline gap-2">
            <span class="text-[15px] font-semibold text-ink">{s.title[lang]}</span>
            <span class="text-[11px] font-mono uppercase text-muted">{s.domain}</span>
            {isCollocationDone(s.id) ? <span class="text-[12px] text-muted ml-auto">✓</span> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function PhrasingRun({ lang, set, onClose }: { lang: Locale; set: CollocationSet; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const it = set.items[i];
  const done = i >= set.items.length;

  const L = {
    back: lang === "en" ? "← Back" : "← Назад",
    check: lang === "en" ? "Check" : "Проверить",
    next: lang === "en" ? "Next" : "Дальше",
    answer: lang === "en" ? "Answer" : "Ответ",
    finish: lang === "en" ? "Done ✓" : "Готово ✓",
    fin: lang === "en" ? "Set complete." : "Набор пройден.",
  };

  function next() {
    setChecked(false); setVal("");
    const n = i + 1;
    setI(n);
    if (n >= set.items.length) markCollocationDone(set.id);
  }
  const ok = it ? [it.answer, ...(it.alts ?? [])].some((a) => norm(a) === norm(val)) : false;

  return (
    <div class="flex flex-col gap-4">
      <button type="button" class="btn ghost self-start" onClick={onClose}>{L.back}</button>
      <div class="text-[15px] font-semibold text-ink">{set.title[lang]}</div>
      {done ? (
        <div class="text-[14px] text-ink">{L.fin}</div>
      ) : (
        <div class="bg-card border border-rule-strong rounded-[2px] p-5 flex flex-col gap-3">
          <div class="text-[14px] text-ink font-mono">{it.gap}</div>
          <div class="text-[12px] text-muted">{it.ru}</div>
          <input class="border border-rule rounded-[2px] px-3 py-2 text-[14px] bg-bg text-ink"
            value={val} onInput={(e) => setVal((e.target as HTMLInputElement).value)}
            disabled={checked} placeholder="…" />
          {!checked ? (
            <button type="button" class="btn self-start" onClick={() => setChecked(true)} disabled={!val.trim()}>{L.check}</button>
          ) : (
            <div class="flex flex-col gap-2">
              <div class={`text-[13px] ${ok ? "text-ink" : "text-muted"}`}>
                {ok ? `✓ ${it.chunk}` : `${L.answer}: ${it.chunk}`}
              </div>
              <div class="text-[13px] text-ink italic">“{it.example}”</div>
              {it.note ? <div class="text-[12px] text-muted">{it.note[lang]}</div> : null}
              <button type="button" class="btn self-start" onClick={next}>
                {i + 1 >= set.items.length ? L.finish : L.next}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: 0 errors. (Component compiles; classes match the existing `btn`/`bg-card`/`text-ink` vocabulary.)

- [ ] **Step 3: Commit**

```bash
git add src/components/english/GrammarModule.tsx
git commit -m "feat(english): Grammar & Phrasing island (cloze + collocation drills)"
```

---

## Task 11: Mount on the hub

**Files:**
- Modify: `src/pages/[lang]/english/index.astro`

- [ ] **Step 1: Import the island**

Add after the `OutputModule` import:

```astro
import GrammarModule from "../../../components/english/GrammarModule.tsx";
```

- [ ] **Step 2: Extend labels**

Replace the `L` definition:

```astro
const L = lang === "en"
  ? { today: "Today", reading: "Reading", grammar: "Grammar & Phrasing", output: "Output" }
  : { today: "Сегодня", reading: "Чтение", grammar: "Грамматика и фразы", output: "Письмо" };
```

- [ ] **Step 3: Add the section between Reading and Output**

Insert before the Output `<section>`:

```astro
  <section class="border-t border-rule pt-10 mt-14">
    <div class="meta mb-4 max-w-[620px] mx-auto">{L.grammar}</div>
    <GrammarModule client:visible lang={lang} />
  </section>
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: 0 errors. 4 islands on the hub route (Today, Reading, Grammar, Output) — hub is a
2-segment route, outside the lesson hydration cap.

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/english/index.astro
git commit -m "feat(english): mount Grammar & Phrasing on the hub"
```

---

## Task 12: Today grammar slot

**Files:**
- Modify: `src/components/english/Today.tsx`

- [ ] **Step 1: Import grammar data + state helper**

Add the grammar data import (new line):

```tsx
import { grammarPoints } from "~/english/data/grammar";
```

Extend the **existing** state import line to add `isGrammarDone` (do not add a second state import):

```tsx
import { englishState, dueWordIds, getPlacement, isUnitRead, outputAttemptOf, isGrammarDone } from "~/english/state";
```

- [ ] **Step 2: Compute the next undone grammar point**

After the `outputTask` useMemo:

```tsx
  const grammarPoint = useMemo(() => {
    const order = ["A2", "B1", "B2"];
    const maxIdx = order.indexOf(placement?.band ?? "A2");
    return grammarPoints.find((p) => order.indexOf(p.band) <= maxIdx && !isGrammarDone(p.id)) ?? null;
  }, [englishState.value, placement]);
```

- [ ] **Step 3: Add labels + render**

Add to `L`:

```tsx
    grammar: lang === "en" ? "Today's grammar" : "Грамматика на сегодня",
    grammarCta: lang === "en" ? "Open in Grammar & Phrasing below ↓" : "Открой в разделе «Грамматика и фразы» ниже ↓",
    grammarDone: lang === "en" ? "Grammar done for now. ✅" : "Грамматика пока пройдена. ✅",
```

Insert a block before the `outputTask` block:

```tsx
      <div>
        <div class="meta mb-2">{L.grammar}</div>
        {grammarPoint ? (
          <div class="text-[14px] text-ink">
            <span class="font-semibold">{grammarPoint.title[lang]}</span>
            <span class="text-muted"> — {L.grammarCta}</span>
          </div>
        ) : (
          <div class="text-[13px] text-ink">{L.grammarDone}</div>
        )}
      </div>
```

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/english/Today.tsx
git commit -m "feat(english): surface today's grammar in the daily driver"
```

---

## Task 13: i18n labels (if referenced from ui.json)

**Files:**
- Modify: `src/i18n/ui.json`

The hub and Today use inline `lang === "en" ? … : …` labels (matching the existing slice
pattern), so no `ui.json` key is strictly required. Only add a key if a shared label is needed
elsewhere.

- [ ] **Step 1: Confirm no new shared key is needed**

Inline labels cover the new UI (Tasks 10-12). Skip `ui.json` edits unless the i18n-parity lint
flags a missing key.

- [ ] **Step 2: Run the i18n parity lint via build**

Run: `bun run build`
Expected: 0 errors; i18n parity rule passes (no new asymmetric keys introduced).

---

## Task 14: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full English test suite**

Run: `bunx vitest run src/english`
Expected: PASS — all gates (vocab-b2, reading counts + validity, grammar, collocations, state).

- [ ] **Step 2: Full build + warning baseline**

Run: `bun run build`
Expected: 0 errors; warnings ≤ 1271 (no regression from baseline). Page count = prior + 0 (hub
route already existed; no new routes).

- [ ] **Step 3: Manual visual check**

Open `/en/english/` and `/ru/english/`: Vocab serves B2 words after a B2 placement; the
Grammar & Phrasing section renders both tabs; a cloze run and a collocation drill complete and
show the ✓ done-state; Today shows the grammar slot.

- [ ] **Step 4: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore(english): P4 verification fixups"
```

---

## Notes for the executor

- **2-concurrent subagent cap** for all content fan-out (vocab, reading, grammar, collocations).
  5 concurrent heavy agents repeatedly hit API socket/ConnectionRefused.
- **CSV truth is law** for vocab: `lemma`/`rank` copied verbatim; the gate's CSV-truth check
  fails the build if a subagent invented or altered a lemma. Regenerate the offending batch.
- **No web needed** for grammar/collocations/reading — own-knowledge. If any subagent does read
  web content, brief it to distrust the page (prompt-injection).
- **Commit per landed set** so a failed batch never blocks the green sets already in.
- All commands run from `site/`.
