# English → B2 — P4: Grammar/Collocations + Vocab→B2 + B2 Reading (Design Addendum)

**Date:** 2026-05-31
**Status:** Approved design, pre-implementation
**Owner:** Artem
**Parent spec:** `docs/superpowers/specs/2026-05-30-english-to-b2-design.md` (§3.4, §3.5, §8 P4)
**Branch:** `english-p4-grammar-b2` (off `main`)
**Related:** `project_english-layer` (memory); shipped slice `site/src/english/*`; P0–P3 merged to main.

## 0. Frame

P4 is the **final content phase** of the English layer before P5 polish. It completes the
vocabulary deck to the full published lists, adds the B2 reading band, and introduces two
new content types — **grammar-in-context** and **collocations/phrasing** — behind a single
new island. After P4 the learner has a complete A2→B2 surface: ~3.7k words, B2 reading,
explicit grammar with cloze practice, and engineering/general phrasing drills.

**Locked design decisions (brainstorming 2026-05-31):**
- **Grammar engine = completion-tracked + redoable.** Grammar/collocation practice is NOT
  scheduled into the FSRS deck. The deck stays *pure words*. Structures are ~18-24 points;
  spacing that few items adds engine/state/test surface for negligible payoff. Cloze and
  drills are re-practiceable on demand; completion fires the streak/XP day-marker.
- **Collocations fold into the Grammar module.** One combined "Grammar & Phrasing" island +
  one hub section. Collocations and grammar do the same cognitive job (how words combine,
  register/hedging) and the same drill mechanic (cloze ≈ gap-fill). No separate 5th island.
- **B2 vocab = full ~1759 now.** NGSL 2001-2800 (800) + all NAWL (959). This *is* P4's
  defining job ("extend deck to ~5-6k"). A subset leaves B2 broken (half-empty `BANK.B2`,
  partial band-up, soft gate) and forces P5 to redo it.

**Non-goals (P4):** audio/listening, native pronunciation, new AI features beyond the P3
grading already shipped, rich diagrams (parent §12). No new server component. No mid-frequency
words beyond the published NGSL/NAWL lists (no model-invented lemmas).

## 1. Existing surface this builds on (verified 2026-05-31)

- **Types** (`src/english/types.ts`): `VocabEntry` already carries `band:"A2"|"B1"|"B2"`,
  `collocations?`, `domain?`. `ReadingUnit` already allows `level:"B2"`. `Bi`, `Phrase`,
  `Question`, `OutputTask` exist. No grammar/collocation types yet.
- **Bands** (`data/bands.ts`): NGSL cutoffs A2 ≤800, B1 ≤2000, **B2 = NGSL 2001+ (rest)**;
  NAWL → B2 wholesale. `BAND_SIZE.B2 = 1760`. `idFor(source, rank)` → zero-padded
  `ngsl:NNNN`/`nawl:NNNN`. **No change needed.**
- **Vocab decks**: `vocab-a2.ts` (800, NGSL 1-800), `vocab-b1.ts` (1200, NGSL 801-2000).
  `B2` band is empty. CSV truth: `ngsl.csv` (2800 rows), `nawl.csv` (959 rows).
- **VocabModule** (`components/english/VocabModule.tsx`): `BANK = { A2, B1, B2: [] }` with a
  "B2 lands in a later phase" placeholder. Reads `getPlacement().band` to pick the bank.
- **Reading** (`data/reading/`): `a2-general`, `a2-engineering`, `b1-general`,
  `b1-engineering` — ~10 units each. `index.ts` aggregates + `unitsByBandStream`.
  `counts.test.ts` gates ≥10/band/stream. `Today`/`ReadingFeed` band-gate by placement order.
- **State** (`state.ts`): localStorage key `awesome.english.v2`; `EnglishState` has
  `words`, `revealed`, `placement`, `known`, `settings`, `daily`, `readUnits`,
  `outputAttempts`. Load/save guarded + additive. `recordActiveDay()` feeds streak/XP.
- **Hub** (`pages/[lang]/english/index.astro`): 2-segment route, mounts `Today`,
  `ReadingFeed`, `OutputModule` as `client:visible` islands.

## 2. Content data model (P4 additions)

### 2.1 Vocab B2 — `data/vocab-b2.ts`
Same `VocabEntry` shape. ~**1759 entries**: NGSL ranks 2001-2800 (800) + all NAWL (959).

- `id` = `idFor(source, rank)` → `ngsl:2001…ngsl:2800`, `nawl:0001…nawl:0959`. Disjoint from
  A2/B1 by source+rank.
- `lemma`, `rank` **copied verbatim from `ngsl.csv` / `nawl.csv`** — never model-invented.
- `band: "B2"` for all. `pos` mapped to the enum (`other` fallback).
- Enriched (own-knowledge): `ru` (A2-friendly), `gloss` (plain English), `ipa`, `examples`
  (1-2 natural sentences), `collocations` (common partners), `domain` ("engineering" where
  the word is genuinely technical, else "general"; NAWL skews academic-general).

### 2.2 B2 Reading — `data/reading/b2-general.ts`, `data/reading/b2-engineering.ts`
Same `ReadingUnit` shape, `level:"B2"`, ~**10 units each (≥10 gate)**.

- i+1 held: ≥95% of tokens inside the learner's known band (A2+B1+B2). New/glossed tokens
  ≤5%, surfaced via `targetWords[]`.
- `targetWords[]` **must resolve to real vocab ids** across A2+B1+B2 (validated by test).
- **General stream**: broad-English B2 prose (opinion, explanation, narrative, popular-science).
- **Engineering stream**: senior-register artifacts — RFC sections, incident postmortems,
  design-doc tradeoff discussion, code-review threads, architecture rationale. Deliberately
  carries the hedging/modality/passive structures taught in §2.3 (reading reinforces grammar).
- Each unit: `title`, `blurb`, `source` (tag), `passages[]` (en/ru, optional per-passage
  `words`), `phrases[]`, `questions[]` (bilingual MCQ + `explain`).

### 2.3 Grammar-in-context — `data/grammar.ts` + new types
New types in `types.ts`:

```ts
export type ClozeItem = {
  id: string;
  before: string;       // sentence fragment before the gap
  after?: string;       // fragment after the gap (gap rendered between)
  answer: string;       // primary accepted fill
  alts?: string[];      // other accepted fills (case-insensitive, trimmed)
  hint: Bi;             // bilingual nudge
  explain?: Bi;         // why this form, shown after answering
};

export type GrammarPoint = {
  id: string;                 // "grammar:passive-engineering"
  band: "B1" | "B2";
  domain?: "general" | "engineering";
  title: Bi;
  structure: Bi;              // the rule named, e.g. "be + past participle"
  explain: Bi;                // short in-context explanation, bilingual scaffolding
  examples: { en: string; ru: string; note?: Bi }[];  // 2-3 in-context
  cloze: ClozeItem[];         // ≥2 per point
  register?: Bi;              // when/why (engineering hedging, formality)
};
```

~**18-24 points**, mixed B1/B2, general + engineering. Coverage target (parent §3.4):
present perfect vs past simple; conditionals (0/1/2/3 + mixed); defining vs non-defining
relative clauses; passive voice (+ engineering "the build was triggered by…"); **modality &
hedging** (might/may/should/would/tend to/appear to — senior review register); reported
speech; gerund vs infinitive; articles for abstractions/uncountables; comparatives &
intensifiers; discourse/linking markers (however/whereas/given that/whereas).

### 2.4 Collocations / phrasing — `data/collocations.ts` + new types
```ts
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

export type CollocationSet = {
  id: string;
  title: Bi;
  domain: "general" | "engineering";
  items: Collocation[];
};
```

~**8-12 sets, ~100 items total**:
- **Engineering**: exception verbs (raise/throw/catch/handle an exception), git
  (merge/revert/cherry-pick/rebase a commit; open/close/triage an issue; roll back/ship/deploy
  a release), debugging (reproduce/track down/introduce/regress a bug), review register.
- **General/academic** (NAWL register): conduct research, draw a conclusion, address an issue,
  significant impact, play a role, raise concerns, take into account.
- **Hedging & connectors**: it appears that…, tends to…, broadly speaking, that said, given
  that, with respect to.

## 3. Engine + state changes (light)

`state.ts` — additive, guarded, no break to synced fields:

- `EnglishState += { grammarDone: Record<string, true>; collocationDone: Record<string, true> }`.
  Keyed by `GrammarPoint.id` / `CollocationSet.id` (set-level completion; items redoable).
- Helpers: `markGrammarDone(id)`, `isGrammarDone(id)`, `markCollocationDone(id)`,
  `isCollocationDone(id)`. Each completion calls `recordActiveDay()` (streak/XP).
- `load()` defaults both to `{}`; `resetEnglish()` clears them. **Not** added to the FSRS
  deck — cloze/drills carry no `CardState`.

No scheduler change. No placement change (placement already estimates B2).

## 4. UI surface

### 4.1 `components/english/GrammarModule.tsx` (new island — "Grammar & Phrasing")
- Two segments (existing segmented-control pattern): **Grammar** | **Phrasing**.
- **Grammar**: list `GrammarPoint` cards (band-filtered to ≤ placement band). Open one →
  `structure` + `explain` + `examples` + `register`, then a **cloze run** (type answer →
  check vs `answer`/`alts`, case-insensitive trim → show `explain` → advance). Finishing the
  run → `markGrammarDone`. Redoable.
- **Phrasing**: list `CollocationSet` cards (domain badge). Open → **gap drill** (show `gap`,
  type partner, check vs `answer`/`alts`, show `example`/`note` → advance). Finishing →
  `markCollocationDone`. Redoable.
- Styling mirrors `VocabModule`/`OutputModule` (card, `btn`/`btn ghost`, mono meta). Bilingual
  labels from `lang` prop.

### 4.2 Hub `pages/[lang]/english/index.astro`
- Add a 4th section **"Grammar & Phrasing"** between Reading and Output, mounting
  `<GrammarModule client:visible lang={lang} />`. **4 content islands** total (Today, Reading,
  Grammar, Output) on a 2-segment hub route — outside the lesson hydration cap (5).

### 4.3 `Today.tsx`
- Add a **grammar slot** (after reading, before/with output): next `GrammarPoint` not done
  and ≤ placement band → "Today's grammar: <title> — open below ↓". Mirrors the existing
  reading/output nudges. If all done for band → quiet done-state.

### 4.4 `VocabModule.tsx`
- `BANK.B2 = vocabB2`; remove the B2 placeholder branch. (Keep the "no new words queued"
  empty-state for when the daily budget is spent.)

### 4.5 `i18n/ui.json`
- Add EN+RU labels: section title "Grammar & Phrasing" / «Грамматика и фразы», segment labels,
  cloze/drill controls (check / next / correct / show hint), Today grammar nudge.

## 5. Testing & gates (TDD — gate-first)

Each data set lands behind a **failing validity + count gate** before it is filled:

- `vocab-b2.test.ts` (mirrors `vocab-b1.test.ts`): `length >= 1700`; every `band==="B2"`,
  id `/^(ngsl|nawl):\d{4}$/`, non-empty `lemma`/`ru`/`gloss`, `examples.length >= 1`, valid
  `pos`; ids unique and disjoint from A2+B1. **CSV-truth check**: every `(source, rank) →
  lemma` matches the corresponding `ngsl.csv`/`nawl.csv` row (assemble step parses CSVs and
  asserts equality before commit).
- `reading/counts.test.ts` += B2 general ≥10, B2 engineering ≥10. Extend reading
  targetWords-resolution test so every `targetWords[]` id exists in A2∪B1∪B2 vocab.
- `grammar.test.ts`: count ≥18; each well-formed; `band ∈ {B1,B2}`; `cloze.length ≥ 2`;
  every cloze `answer` non-empty; ids unique; bilingual fields present.
- `collocations.test.ts`: sets ≥8, items ≥80 total; each `gap` contains `___`; `answer`
  non-empty; ids unique; valid `domain`.
- `state` tests: `grammarDone`/`collocationDone` round-trip through save/load; `resetEnglish`
  clears them; completion marks an active day.

Build: `bunx vitest run src/english` green; `bun run build` → **0 errors**, warnings **≤1271**
(no regression from baseline).

## 6. Build order + ops

1. Branch `english-p4-grammar-b2` (done).
2. **Types + state + gates first** (red): add types, `state` fields/helpers + tests, empty
   data modules + gate tests (failing on count). Commit the failing-gate scaffold per set.
3. **Vocab B2 enrichment** — the big spend. ~1759 entries in ~12 batches. **2-concurrent**
   subagent waves (never 5 — concurrent heavy agents hit API socket/ConnectionRefused).
   Subagents emit JSON batches; the main thread assembles into `vocab-b2.ts`, validates vs CSV
   truth + shape gate, then commits. lemma/rank verbatim — no invention.
4. **B2 reading** — `b2-general`, `b2-engineering` (~10 each), 2-concurrent. targetWords
   chosen from real vocab ids; resolution test must pass.
5. **Grammar + collocations** — own-knowledge authoring (no web → no prompt-injection surface),
   2-concurrent. Fill to gate counts.
6. **Wire UI**: `GrammarModule`, hub section, `Today` slot, `VocabModule.BANK.B2`, i18n.
7. Full `bunx vitest run src/english` + `bun run build` green. Commit per landed set.

All commands run from `site/`.

## 7. Isolation boundaries (unchanged from parent §9)

- `english/data/*` — content modules / CSVs, no logic. New: `vocab-b2.ts`,
  `reading/b2-general.ts`, `reading/b2-engineering.ts`, `grammar.ts`, `collocations.ts`.
- `english/types.ts` — `+ClozeItem, GrammarPoint, Collocation, CollocationSet`.
- `english/state.ts` — `+grammarDone, collocationDone` sub-slice; FSRS deck untouched.
- `components/english/GrammarModule.tsx` — new island; depends on state + types + data only.
- `pages/[lang]/english/index.astro` — `+1` section/island.

Each unit answers: what it does, how to use it, what it depends on. Files stay focused.

## 8. Open questions (resolve during planning)

- Grammar point count: 18 floor; settle final list (18-24) in the plan's grammar task.
- `domain` tagging for NGSL 2001-2800: heuristic (engineering only when genuinely technical);
  most B2 NGSL is general — acceptable.
- Today grammar cadence: always-available next-undone vs every-Nth-day. Default:
  always-available (lighter than output's every-3rd-day gating), tune in P5.
- Collocation completion granularity: set-level (chosen) vs item-level — set-level for P4.
