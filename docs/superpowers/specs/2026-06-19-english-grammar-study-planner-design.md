# English Grammar Spec B — Adaptive Study Planner (design)

**Date:** 2026-06-19
**Status:** design approved, pending spec review → writing-plans
**Spec A (shipped):** `docs/superpowers/specs/2026-06-15-english-grammar-system-design.md`

## 1. Problem

Spec A shipped the grammar *system*: a typed bilingual corpus (`GrammarTopic` with CEFR
levels, `family`, EGP competency ids, `related`/`crossTopic` association edges, generative
practice `gen` specs), EGP coverage computation (`grammar-coverage.ts`), and per-topic FSRS
mastery cards (`grammar-mastery.ts`). What is missing is the **brain**: nothing decides what
grammar a learner should study or review next, or in what order. `GrammarModule.tsx` today is a
flat list filtered only by placement band — it ignores the topic graph, the coverage gaps, and
the mastery cards' due-ness.

Spec B adds an **adaptive study planner**: given a target CEFR and a deadline, it produces an
ordered, deadline-forecasted study queue (new topics + due reviews), capped to a daily minute
budget, and gated to the learner's current band.

## 2. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Ambition | Full grammar Path Engine (deadline-aware) |
| 2 | Goal model | Target CEFR + deadline |
| 3 | UX surface | New plan view atop `GrammarModule`; flat list → "Browse all" tab |
| 4 | Ordering | CEFR-banded, value-ranked within band; `related` edges = soft tie-break |
| 5 | Plan dynamics | Live recompute every load; persist only goal+deadline; no manual reorder |
| 6 | Daily load | "Today" queue capped by goal's daily minute budget |
| 7 | Band gating | Learn steps hard-gated to entry CEFR ≤ current placement band; bands unlock on mastery |

## 3. Non-goals (YAGNI)

- No manual drag-reorder, no pin/skip (decision 5).
- No multi-skill unified planner across vocab/reading/output (kept scoped to grammar; decision 3).
- No new persisted plan object — the plan is a pure derivation of goal + live mastery state.
- No changes to the FSRS scheduler, the corpus, or the practice runner internals.

## 4. Architecture — 5 units

Isolation-first: each unit has one purpose, a typed interface, and is testable alone.

### Unit 1 — Goal state (`src/english/state.ts`, extend)

Add to `EnglishState`:

```ts
grammarGoal?: {
  targetCefr: Cefr;        // e.g. "B2"
  deadlineMs: number;      // epoch ms, inclusive deadline day
  perWeekdayHours: number[]; // length 7, Mon..Sun; 0 = day off
  tzOffsetMin: number;
};
```

- Getter `getGrammarGoal()`, setter `setGrammarGoal(goal)`, `clearGrammarGoal()`.
- Load-migration: absent ⇒ `undefined` ⇒ planner renders the goal-setter.
- Nothing else is persisted; the ordered plan is recomputed on every load.
- `resetEnglish()` clears the goal.

### Unit 2 — Planner core (`src/english/grammar-plan.ts`, pure, new)

No I/O, no signals, no barrels — mirrors `grammar-coverage.ts`.

```ts
export type GrammarStepKind = "learn" | "review";
export type GrammarStep = {
  topicId: string;
  cefr: Cefr;                 // entry level of the topic
  kind: GrammarStepKind;
  reason: Bi;                 // bilingual "why now"
  estMin: number;
  value: number;              // ranking weight (learn steps)
};
export type GrammarPlan = {
  steps: GrammarStep[];       // full ordered queue (all unlocked bands)
  today: GrammarStep[];       // prefix capped by daily minute budget
  currentBand: Cefr;          // gating band (from placement, may advance)
  targetCefr: Cefr;
};

export function buildGrammarPlan(input: {
  topics: GrammarTopic[];
  mastery: GrammarMastery;
  coverage: GrammarCoverage;
  placementBand: Cefr;
  goal: NonNullable<EnglishState["grammarGoal"]>;
  dailyBudgetMin: number;     // today's remaining minutes from the goal's weekday hours
  now: number;
}): GrammarPlan;
```

**Step generation:**
- **review** steps — every topic whose FSRS card is due (`isTopicDue(card, now)`). Reviews are
  **never band-gated**: a due card surfaces regardless of band. Reason = "due for review".
- **learn** steps — topics with entry CEFR ≤ `currentBand` (gating) and ≤ `targetCefr`, not yet
  mastered (no card, or card immature). Reason = coverage-gap / weakness narrative.

**Mastery predicate:** a topic is **mastered** iff it has a card that is not due and whose
`scheduled_days ≥ 21` (reuse the `MATURE_DAYS` threshold already used for word cards in
`state.ts`). A topic with no card, or an immature/overdue card, is not mastered. This predicate
is defined once in `grammar-plan.ts` and used by both step generation and band-unlock.

**Current band & unlock:** `currentBand` starts at `placementBand`. A band is "complete" when
every learn-eligible topic at that entry CEFR is mastered (per the predicate above). On
completion, the band advances one step up `CEFR_ORDER` toward `targetCefr`. Learn steps above
`currentBand` are **excluded** (hard gate), not merely ordered later.

**Ordering (deterministic):**
1. Reviews first (urgency), then learn steps.
2. Within each, ascending CEFR band.
3. Within a band, descending `value`.
4. Soft tie-break: keep `related` confusables adjacent (stable grouping).
5. Final tie-break: `topicId` ascending (determinism for live recompute).

**Value formula (learn steps):**
`value = coverageGapWeight + weaknessWeight + foundationalWeight`
- `coverageGapWeight` — topic's `egp` ids that appear in `coverage.bands[*].missing` (closing real
  gaps scores high).
- `weaknessWeight` — no card > overdue card > immature card (more weakness = higher).
- `foundationalWeight` — lower entry CEFR within the band scores higher (study basics first).

Exact constants live in this file (§Unit 4).

### Unit 3 — Scheduler / forecast (`src/english/grammar-schedule.ts`, new, thin)

Reuses the **Track-free** pure primitives already exported from `src/scripts/path/schedule.ts`:
`studyDays`, `availableMinutes`, `feasibility`. Does **not** reuse `schedulePlan`/`buildPath`
(coupled to the fullstack `Path`/`Track` types).

```ts
export type GrammarForecast = {
  verdict: "fits" | "under" | "over";
  requiredMin: number;
  availableMin: number;
  countdownDays: number;
  dropped: string[];          // topicIds the engine suggests cutting when "over"
};
export function forecastGrammarPlan(
  plan: GrammarPlan, goal: NonNullable<EnglishState["grammarGoal"]>, now: number,
): GrammarForecast;
```

- `requiredMin` = Σ learn-step `estMin` + review load.
- `availableMin` = `availableMinutes(studyDays(now, deadlineMs, perWeekdayHours, [], tzOffsetMin))`.
- `feasibility(requiredMin, availableMin, droppable)` → verdict; droppable ranked by
  `value / estMin` so the cheapest-per-value topics are cut first.
- Deadline day is inclusive (matches `studyDays`).

### Unit 4 — Cost model (constants in `grammar-plan.ts`)

```ts
const MIN_PER_LESSON = 8;     // per authored lesson in the topic's level range (tune vs real data)
const MIN_PRACTICE   = 5;     // practice/gen pass per learn step
const MIN_REVIEW     = 3;     // a due review step
```
`estMin(topic)` = (authored lessons at entry..min(target, levels.last)) × `MIN_PER_LESSON` +
`MIN_PRACTICE`. Centralized so a single tune touches both planner and forecast.

### Unit 5 — UI (`GrammarModule.tsx` rework + `grammar/GrammarPlan.tsx`, new)

`GrammarModule` gains a **Plan** default view; the existing flat list becomes a **Browse all**
tab; Phrasing tab unchanged.

`GrammarPlan.tsx`:
- **No goal** → goal-setter: target CEFR select, deadline date, per-weekday hours. Saves via
  `setGrammarGoal`.
- **Goal set** → forecast banner (verdict pill `fits`/`under`/`over` + countdown days) → **Today**
  section (queue prefix capped by today's remaining minute budget) → **Full plan** grouped by
  CEFR band, with locked bands shown dimmed (hard gate is visible, not hidden).
- Each step row opens the **existing** `GrammarRun` (reused verbatim); completion grades through
  the existing `gradeGrammarTopic`, which re-derives the plan on next render.
- "Change goal" affordance re-opens the goal-setter.

Hydration: `GrammarModule` is already a single island — no new island, no hydration-cap change.

## 5. Data flow

```
placement.band ─┐
grammarGoal ────┼─→ buildGrammarPlan ─→ GrammarPlan ─→ GrammarPlan.tsx (render)
GrammarMastery ─┤        │                   │
corpus topics ──┤        └─→ forecastGrammarPlan ─→ GrammarForecast (banner)
EGP coverage ───┘
GrammarRun (existing) ─→ gradeGrammarTopic ─→ englishState mutate ─→ live recompute
```

## 6. Testing

Pure, no `astro:content` (mirror existing path test isolation).
- `grammar-plan.test.ts`: review-float, band hard-gate (B2 excluded at B1 placement), band-unlock
  on mastery, value ranking (coverage gap > non-gap), target ceiling, daily-budget cap on `today`,
  empty corpus / no-goal, deterministic order under recompute.
- `grammar-schedule.test.ts`: fits/under/over verdicts, inclusive deadline day, dropped-order by
  value density, zero study days.
- i18n: EN+RU labels added to `src/i18n/ui.json` for goal-setter, verdict pills, step reasons.

## 7. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `estMin` inaccurate on short grammar lessons | Single tunable constant; validate against real lesson counts at build of Unit 4 |
| Accidental coupling to fullstack `Track`/`Path` | Import only `studyDays`/`availableMinutes`/`feasibility`; lint the import list in review |
| Live recompute non-determinism | Mandatory `topicId` final sort key; covered by a recompute-stability test |
| Value ranking needs EGP inventory | Inventory present per `grammar-coverage.ts`; planner degrades gracefully (gap weight 0) if a band has none |
| Band gate hides progress | Locked bands rendered dimmed, not removed, so the path ahead is visible |

## 8. Out of scope / future

- Unified cross-skill study plan (vocab + reading + output + grammar) in the English hub.
- Pace/ETA from `hoursLog` history feeding the forecast (currently forecast uses declared weekday
  hours only).
- Manual reprioritization (pin/skip/reorder).
