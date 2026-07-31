# `/assess` — deep skill audit engine

**Date:** 2026-07-31
**Status:** Design approved — ready for implementation plan
**Relationship to existing work:** additive. `/calibrate` v2
(`2026-06-14-calibrate-v2-probabilistic-placement-design.md`) stays exactly as it is —
the five-minute breadth-first placement across the concept graph. `/assess` is the
opposite instrument: a deep, multi-modal audit of a chosen slice. Both write into the
same `KnowledgeState`.

---

## 1. Why a second instrument

`/calibrate` answers *"roughly where does this person sit across 5035 concepts"* in five
minutes. It asks MCQ and blanks, and it records one number per concept: `confidence`.

That number cannot express the thing a real diagnostic interview finds. The reference
transcript for this design (`interview-progress.md`, a conversational audit run by Claude
Code on 2026-07-14) produced verdicts like:

- *closures* — "mechanism correct in practice, wording of the concept imprecise, does not
  know the shared-mutable-state risk" → **junior+**
- *Two Sum* — "approach correct unaided, two self-inflicted implementation bugs, did not
  find the second after two hints" → **junior+, concept present, implementation weak**
- *CORS* — "knows the fix is on the backend, does not know the mechanism" → **junior−**
- *SQL* — **skipped entirely, status unknown — not a confirmed gap**

Four distinctions are load-bearing there, and none of them survive a single scalar:

1. **Knowing the term vs knowing the mechanism vs being able to produce code.**
2. **Unaided vs after hints.** Reaching the answer after two leading questions is a
   different state of knowledge, and it is fragile.
3. **An explicit "I don't know" vs a wrong answer.** The first is calibrated honesty; the
   second may be a misconception that actively misleads.
4. **Untested vs confirmed gap.** The transcript is emphatic about this: topics 7–9 were
   never asked and must not be recorded as weaknesses.

`/assess` is built around those four distinctions.

---

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Grading | Hybrid — deterministic core always works; an LLM layer (BYOK) adds free-text explanation grading and follow-up probes |
| Placement in the product | New route `/assess`, separate from `/calibrate`; shared `KnowledgeState` |
| Output | Report **+** path rebuild **+** verbatim re-test items scheduled in `/review` |
| Item source | Harvested from the existing practice corpus, plus a thin authored layer where a concept has no coverage of a needed facet |
| Session shape | Resumable blocks of 10–15 minutes, abandonment leaves the rest honestly untested |

---

## 3. Domain model

### 3.1 Facets

Every measurement targets one of three facets of a concept:

| Facet | The question it answers | Typical evidence |
|---|---|---|
| `recognition` | Does the learner know the term exists and where it sits? | MCQ, `diagnose` with blanks |
| `mechanism` | Can they predict behaviour and say *why*? | `predict`, `debug`, `review`, free-text explanation |
| `production` | Can they write code that works, unaided? | `sandbox`, `fix` with `exec` grading |

Facets are ordered but not nested: production without mechanism is a real and common
state ("copies the pattern, cannot explain it"), and the report names it rather than
averaging it away.

### 3.2 Ordinal level

For each `(concept, facet)` the engine holds a **posterior distribution over four ordered
levels**:

```ts
type Level = "gap" | "junior" | "middle" | "senior";
type Posterior = [number, number, number, number]; // sums to 1, indexed by Level
```

A distribution, not a point estimate, because "we asked twice and both were right" and
"we asked once and it was right" must be distinguishable in the report. The `±` grades in
the reference transcript (junior−, junior+, middle−) come from where the probability mass
sits between two adjacent levels, not from a fifth and sixth level in the enum.

### 3.3 Response

```ts
type Outcome = "correct" | "partial" | "wrong" | "dont_know";
interface Response {
  outcome: Outcome;
  hintsUsed: 0 | 1 | 2;
  elapsedMs: number;   // recorded, not yet used in the likelihood — see §11
}
```

`dont_know` is a first-class response, surfaced as a real button. It must never be
cheaper for the learner to guess than to admit ignorance, or the whole measurement is
polluted.

### 3.4 Evidence

Every response appends an immutable record:

```ts
interface Evidence {
  conceptId: string;
  facet: Facet;
  itemId: string;
  itemKind: ItemKind;          // "mcq" | "predict" | "exec" | "debug" | "review" | "explain"
  difficulty: Band;            // reuses the existing Band from track-band.ts
  response: Response;
  answerDigest: string;        // what the learner actually wrote/chose, truncated
  failureNote?: string;        // deterministic graders emit this; e.g. "off-by-one in loop bound"
  atMs: number;
}
```

The ledger is the source of truth for the report. Verdicts are derived from it, never
stored as prose.

---

## 4. Measurement core

Pure functions in `src/scripts/assess/`, no DOM, no storage — the same discipline as
`scripts/path/`.

### 4.1 Prior

The prior for `(concept, facet)` comes from, in order of precedence:

1. an existing `KnowledgeState` entry for that concept (from `/calibrate`, study
   activity, or a previous audit), mapped onto the ordinal scale;
2. the concept's `band` (`foundations`/`surface`/`middle`/`advanced` in
   `track-band.ts`) — an advanced concept has more prior mass on `gap`;
3. the learner's declared self-placement for the track, when present.

Facets do not start equal: `production` starts one notch below `recognition` for the same
concept, because recognising a term is strictly easier than producing working code.

### 4.2 Likelihood

`P(response | level)` is a 4×4 matrix per item, built from three multipliers:

**(a) Item–facet alignment.** An item measures its own facet strongly and others weakly.
An MCQ that a `senior`-level learner answers correctly is nearly uninformative about
their `production` level. Cross-facet weight is capped at 0.25 so a cheap item can never
certify an expensive skill.

**(b) Difficulty.** Reuses the existing 3PL machinery in `scripts/path/bayes.ts`
(`fallbackIrt`, `likelihood`, `posterior`) rather than a second implementation. The
ordinal extension is a thin wrapper: an item of band *b* discriminates mainly between the
levels adjacent to *b*.

**(c) Hint ladder.** Each hint shifts the observation down by one notch, floored so it
never becomes worse than an outright wrong answer:

| Response | Effect |
|---|---|
| correct, 0 hints | full evidence at the item's level |
| correct, 1 hint | evidence at one level below |
| correct, 2 hints | evidence at two levels below, and the concept is flagged `fragile` |
| partial | evidence at one level below, plus a `failureNote` |
| wrong | negative evidence at the item's level |
| dont_know | negative evidence, attenuated ×0.6 |

The `dont_know` attenuation is the single most important knob for honesty: it must be
strictly gentler than `wrong` (so admitting ignorance is never punished harder than
guessing) and strictly harsher than `partial` (so it is not a way to skip everything and
keep a high score). Both inequalities are unit-tested.

### 4.3 Update and propagation

Bayes update per response. Then propagation through the concept DAG using the existing
`propagatePriors` in `bayes.ts`, with one restriction: **only `mechanism` and
`production` propagate to prerequisites.** Recognising a term says nothing about the
prerequisites underneath it — the reference transcript has exactly this case, where the
learner knew what WebSockets are for and nothing about the HTTP `Upgrade` handshake.

### 4.4 Stopping

A `(concept, facet)` cell is *settled* when the posterior entropy falls below
`SETTLE_ENTROPY`, or after `MAX_ITEMS_PER_CELL` (3). `SETTLE_ENTROPY` is a tunable whose
value is chosen by the simulation harness in §10 — the smallest threshold that still hits
the band-recovery gate at the median-items budget — not picked by hand. Settled cells are removed from
selection. Everything never asked keeps status `untested` — a distinct third state
alongside settled and in-progress, and it is reported as such, never rolled into a level.

---

## 5. Item pool

### 5.1 Harvest

The practice corpus already carries **8096 graded tasks across 1540 lesson files**
(measured 2026-07-31): diagnose 1992, predict 1730, design 1248, incident 952, review
841, sandbox 621, fix 556, debug 156. `item-pool.ts` builds an index at build time.

Each item declares exactly one **primary facet** — the facet its likelihood targets —
and inherits the cross-facet leakage cap from §4.2(a) for the others. A `debug` item is
primarily a mechanism probe (find the wrong idea) whose fix step also carries capped
production evidence; it is not two items.

| Practice type / grading | Primary facet | Item kind | Grading |
|---|---|---|---|
| `diagnose` + `blanks` | recognition | mcq | deterministic |
| `predict` | mechanism | predict | deterministic |
| `debug` | mechanism | debug | deterministic (`check`) |
| `review` | mechanism | review | deterministic (finding selection) |
| `sandbox`, `fix` + `exec` | production | exec | deterministic (QuickJS / pglite) |
| `diagnose`/`fix` + `self`, `design`, `incident` | mechanism | explain | LLM (BYOK) or self-grade fallback |

Concept attribution: a task belongs to a lesson (`lessonKey` = `track/unit/slug`), and
`unit-concepts.json` maps the unit to the concepts it `teaches`. When a unit teaches more
than one concept the task is attributed to all of them with reduced weight (1/n), unless
the task declares an explicit `concepts: string[]`. New authored items must declare it.

### 5.2 Contamination control

**A task the learner has already solved in the lesson measures memory of the lesson, not
knowledge.** `practice-state.ts` records exactly this (`readProgress`, `readAttempts`,
`readSelfGrades` per `lessonKey`). Rules:

- task status `done` → the item is **burned**: excluded from selection;
- status `attempted`/`seen` → usable, evidence weight ×0.5;
- unseen → full weight.

If burning leaves a `(concept, facet)` cell with no items, the cell is reported as
`untested — no uncontaminated item available`, not guessed. This is the honest failure
mode, and it is also the signal for where the authored layer needs to grow.

### 5.3 Authored layer

A new collection `src/content/assess/<concept>.json` for cells with no coverage. Same
shape as the harvested item, plus mandatory `concepts`, `facet`, `band`, and a
`retestPrompt` — the verbatim question that goes into the re-test list. Bilingual, like
everything else. The initial layer covers only the keystone concepts of the tracks a
learner is most likely to audit first; growth is driven by the coverage report the engine
itself emits.

---

## 6. Selection

Given a scope (one track, several tracks, or everything):

1. Resolve candidate concepts: the concepts of the scope, ranked by keystone weight
   (`keystone.ts`) and goal relevance (`planner.ts` already computes goal targets).
2. Drop concepts whose prerequisites are already confidently `gap` — asking about
   Postgres MVCC when the learner does not know what a transaction is measures nothing.
3. For each candidate cell, compute expected information gain (`expectedInfoGain` in
   `bayes.ts`, extended to the ordinal posterior).
4. Pick the item maximising gain per estimated minute, subject to: at most two
   consecutive items of the same kind (fatigue), and facet rotation within a block.

A block ends at 10–15 minutes or 6–10 items, whichever comes first, and always at a cell
boundary so a block's partial verdict is meaningful.

---

## 7. Session lifecycle

```
scope → block ⟳ (item → response → update) → block verdict → [next block | stop]
                                                                    ↓
                                                     report + writes + re-test seeding
```

State lives in `localStorage` under `atlas.assess.v1`, separate from `UserState` and from
`atlas.review.v1`, holding: scope, posterior cells, the evidence ledger, block index, and
the burned-item set. It survives reload and is resumable across days — the reference
transcript's "resume state" file, but structured.

Abandoning mid-block keeps every completed response. Nothing is inferred about what was
not asked.

---

## 8. Grading

**Deterministic graders** (`assess/graders/`) — reuse what exists rather than
reimplementing: `practice-grade.ts` (`applyExecCheck`) for exec items, `run-js.ts`
(QuickJS) for JS execution, the SQL sandbox for SQL, choice comparison for MCQ, finding
selection for review items. Each grader returns `{ outcome, failureNote? }`. The
`failureNote` is what makes the report specific ("map keyed on `target - nums[i]` instead
of `nums[i]`") instead of "wrong".

`partial` is only emitted where it is defined objectively: an exec item whose suite is
partly green (fraction reported), a review item that found some planted findings and
missed others, a blanks item with some blanks right. Graders that cannot express degrees
— single-choice MCQ, predict-the-output — never return `partial`.

**LLM layer** (optional, BYOK) — `practice-grade-llm.ts` already implements the
key-holding, prompt-building and rubric flow for `self`-graded tasks. `/assess` reuses it
for `explain` items, with an assessment-specific rubric that returns a level per facet
plus a one-line justification, not a score. It also powers one clarifying follow-up per
`explain` item, capped, because "reached it after one leading question" is itself a
measurement (recorded as `hintsUsed: 1`).

**Without a key** the engine runs fully on deterministic items and says so on the report:
*"mechanism measured from predict/debug items only; free-text explanation was not
assessed."* No silent degradation.

---

## 9. Output

### 9.1 Verdict

Per concept: the facet vector, the derived band, and a confidence. The band is the
**minimum across measured facets** — a hole in any facet is a hole — with the `±`
qualifier from the posterior's mass distribution. Untested facets do not participate in
the minimum and are shown as untested.

Named patterns, derived mechanically from the facet vector:

| Pattern | Rule |
|---|---|
| *term without mechanism* | recognition ≥ middle, mechanism ≤ junior |
| *does without explaining* | production ≥ middle, mechanism ≤ junior |
| *knows, cannot apply* | mechanism ≥ middle, production ≤ junior |
| *fragile* | any cell reached its level only with hints |
| *declined* | ≥2 `dont_know` in the concept |
| *untested* | no evidence at all |

### 9.2 Report

A per-concept table grouped by topic, the top gaps ranked by *(impact on the active goal
× confidence)*, the hidden strengths (concepts measured higher than the learner's
self-placement), and the verbatim re-test list. Every row links to its evidence.

### 9.3 Writes

- **`KnowledgeState`** — each settled concept collapses to the existing
  `{ confidence, source, lastAt }` contract. This needs one additive change: `Source`
  gains `"assess"` so downstream code can tell an audited concept from a guessed one.
  Untested concepts write nothing.
- **`/review`** — every confirmed gap and every `fragile` concept seeds a card via
  `addCard`, front = the item's `retestPrompt`, scheduled 2–4 weeks out. `CardSource`
  gains `"assess"`.
- **Path** — the rebuild is automatic: the planner already reads `KnowledgeState`, so
  audited-known units drop out of the plan and audited gaps rise to the front.

---

## 10. Proving the engine is accurate

Without this section "maximally precise" is a slogan. The engine is validated by
simulation, in CI.

`assess/simulate.ts` (test-only) generates virtual learners with a **known** ground-truth
level per `(concept, facet)`, including deliberately awkward profiles taken from the
reference transcript: strong production + weak mechanism; strong recognition across the
board with nothing underneath; a learner who answers `dont_know` honestly on everything
they do not know; and a guesser who never says `dont_know`.

Each simulated learner responds to selected items according to their true level (with a
guess rate for MCQ and a slip rate for everything), and the harness measures:

| Metric | Gate |
|---|---|
| Band recovery | ≥90% of settled cells within ±1 ordinal level of truth |
| Bias | mean signed error within ±0.25 levels — the engine must not systematically flatter or under-rate |
| Honest-vs-guesser | the honest learner must not score below the guesser of equal true ability |
| Cost | median items to settle a cell ≤ 3 |
| Untested integrity | zero cells reported as `gap` without evidence |

Plus ordinary unit tests on the invariants: more hints never raises the estimate;
`dont_know` is strictly gentler than `wrong` and strictly harsher than `partial`; a
burned item never enters selection; propagation never touches a concept's facets that
were directly measured.

---

## 11. Non-goals

- **No proctoring.** The engine does not try to detect a learner pasting the question
  into another model. Response time is recorded but does not feed the likelihood — timing
  is too noisy to accuse someone with, and a wrong accusation is worse than a soft score.
- **No replacement of `/calibrate`.** Breadth-first placement stays where it is.
- **No new runtime.** Code execution uses the QuickJS and pglite sandboxes already in the
  repo; no server-side execution.
- **No cross-user comparison or leaderboards.** The measurement is against the concept
  graph, not against other people.
- **No item generation by LLM.** Items are authored or harvested, so two sessions are
  comparable.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Harvested items are miscalibrated (a "recall" task that is really senior-level) | Difficulty comes from the concept's band, not the task's self-declared `difficulty`; the simulation harness surfaces systematic bias |
| Contamination via lesson memory | Burned-item rule (§5.2), and honest `untested` when nothing clean is left |
| LLM grader drift between sessions | Deterministic core carries the band; the LLM layer can move a cell by at most one level |
| Concept attribution noise from multi-concept units | Reduced weight 1/n, explicit `concepts` on authored items, and the coverage report flags units where attribution is doing too much work |
| Session bloat (the audit becomes a chore) | Hard block budget, expected-information-gain selection, and a partial verdict after every block |

---

## 13. File inventory

**New — pure core** (`site/src/scripts/assess/`): `types.ts`, `ordinal.ts` (posterior
algebra over `Level`), `likelihood.ts`, `update.ts`, `select.ts`, `session.ts`,
`item-pool.ts`, `graders/` (thin adapters over existing graders), `verdict.ts`,
`patterns.ts`, `report.ts`, `retest.ts`, `simulate.ts` (test-only), plus a `.test.ts`
beside each.

**New — UI** (`site/src/components/assess/`): `AssessFlow.tsx` (scope → block → verdict),
`ScopePicker.tsx`, `ItemView.tsx` (per item kind), `HintLadder.tsx`, `BlockVerdict.tsx`,
`AssessReport.tsx`. Route `site/src/pages/[lang]/assess.astro`. Styles in a new
`assess-screen.css` following `planning-screen.css`.

**New — content**: `site/src/content/assess/<concept>.json` (authored layer) with a Zod
schema in `content.config.ts` and a schema test.

**Modified**: `scripts/path/types.ts` (`Source` gains `"assess"`), `scripts/path/bayes.ts`
(ordinal wrapper exports; no behaviour change for `/calibrate`), `scripts/review-state.ts`
(`CardSource` gains `"assess"`), `src/i18n/ui.json`, nav.

---

## 14. Open question deliberately deferred

How wide the authored layer should be at launch depends on the coverage report the
harvest produces — which cannot be known before `item-pool.ts` runs against the real
corpus. The implementation plan therefore treats coverage measurement as its first
milestone, and the authoring volume is decided from that number rather than guessed here.
