# `/calibrate` v2 — Probabilistic adaptive placement

**Date:** 2026-06-14
**Status:** Design approved — ready for implementation plan
**Supersedes the core of:** `2026-06-06-path-engine-p3-calibration-design.md` (P3-A introduced the greedy-probe + adaptive flow; this v2 replaces the estimation core with a Bayesian/IRT model and adds an explicit targeting funnel). The persisted `KnowledgeState` contract and the path engine are unchanged.
**Scope:** Rebuild the `/calibrate` placement test into a probabilistic, adaptive, IRT-informed Bayesian assessment with explicit up-front targeting and an honest "I don't know" response.

---

## 1. Goal

Today `/calibrate` is a thin greedy probe loop: pick the unsettled diagnosable concept with the largest closure (ancestors+descendants), grade MCQ/blanks objectively, write a point `confidence`, and propagate through the DAG. "Not sure" grades as **wrong**, there is no probability model, and the test has no notion of *where the learner is aiming* — so it can ask advanced questions in domains the learner has never touched.

The redesign makes the test:

1. **Maximally deep** — a real probabilistic estimator, not a counter of correct answers.
2. **Probability-theoretic** — per-concept Bayesian posterior over a latent "known/not-known" state, updated through an item-response (3PL-style) likelihood, with priors flowing through the concept DAG.
3. **Honest about ignorance** — every question carries an explicit "I don't know" that is modeled as a *third response category*, distinct from a wrong attempt (no guessing inflation, gentler downstream cascade).
4. **Targeted** — before deep testing, the funnel learns the learner's aim (goal/role) and rough self-placement, excludes out-of-scope and never-touched domains, and gates ambiguous domains with one broad question, so the deep phase only spends questions where they carry information.

Non-goals are listed in §10.

---

## 2. Current system (what we build on)

- **`CalibrationFlow.tsx`** — 3 phases (`intro`/`run`/`done`), 3 modes: default quick (`MAX_PROBES=8`, one concept at a time via `nextCalibrationProbe`), `?mode=placement` (8 `DOMAIN_FAMILIES` × `perFamily=2` keystone probes via `placementBatches`), and `?unit=` (per-unit pre-check via `unitProbeConcepts`).
- **`DiagnosticRunner.tsx`** — renders a concept's item bank; MCQ + blanks; `onConcept(concept, correctFrac)` then `onDone`. Has a "Not sure" button that currently calls `advance(false)` (graded wrong).
- **`SelfPlacement.tsx`** — per-track grid; `declareTrackUpTo(track, band, known)` batch-declares concepts up to a band.
- **`calibration.ts`** — `pickProbe` (greedy closure-gain over the ambiguous band), `placementPlan` (stratified per-family), objective graders `gradeMcq`/`gradeBlanks`/`fracOf`.
- **`knowledge.ts`** — point-confidence `KnowledgeState = Map<conceptId, {confidence, source, lastAt}>`; `applyDiagnostic` propagates: pass (`≥0.6`) lifts ancestors to `frac×0.8`, fail (`<0.4`) lowers descendants, ambiguous band sets focal only. Sources: `pretest | diagnostic | activity | declared`.
- **`mastery-field.ts`** — `DOMAIN_FAMILIES` (8 families over ~40 tracks); `masteryField` survey used by the Planning map.
- **`path-io.ts`** — runtime signals (`knowledge`, `config`, `content`), `applyDiagnosticResult`, `nextCalibrationProbe`, `placementBatches`, `declareTrackUpTo`, `effectiveKnowledge` (decay read-model), `targetFrontier`, goals.
- **Content:** `diagnostics-bundle.json` — 145 concept banks, each `{concept, items:[{id, type:"mcq"|"blanks", prompt{en,ru}, choices?, answer}]}`. `diagnosedConcepts` = set of testable concepts.

**Stable contract we preserve:** persisted `KnowledgeState` stays point-confidence (plus an optional `shaky` marker). The Bayesian posterior lives only inside the test island; on completion it is collapsed to `confidence` and written with source `diagnostic`. So `mastery-field.ts`, the path engine, `/roadmap`, export/import, and all of P0/P1 stay untouched.

---

## 3. The funnel (4 stages)

`/calibrate` (no `?unit=`) becomes a 4-stage orchestrator inside `CalibrationFlow.tsx`. `?unit=` mode is preserved unchanged (early-returns the old single-pass behavior). The old default/`placement` modes are retired.

### Stage A — Aim (declarative, no grading)
- **Goal/role pick** — reuse the existing goals (`activeGoals`, `setGoals`) / the Planning `GoalSection` selector. Selecting a goal sets `config.goals`, which defines the `targetFrontier` (the concepts that matter).
- **Self-placement per domain** — an 8-family grid (reuse/adapt `SelfPlacement.tsx`, but family-level not per-track to keep it fast): each family marked `never | basics | prod`.
- **Output:**
  - **Priors** — feed the Bayesian prior table (§4.2).
  - **Exclusion set** — families marked `never` AND not on the goal frontier are excluded from Stages B/C entirely (priors stay at the cold floor; never asked). Families excluded by the learner via the existing `excludedTracks` are honored too.

### Stage B — Gate (one broad question per ambiguous domain)
- For each **candidate** family — on the goal frontier OR self-placed `≥ basics`, and not excluded — serve **one** broad keystone item (the highest-discrimination, mid-difficulty diagnosable concept in that family).
- The gate response (correct / wrong / don't-know) does a normal Bayesian update on that keystone concept AND decides Stage-C depth for the family:
  - **correct** → family likely known; deep-dive only its *advanced* live concepts (confirm the ceiling).
  - **wrong / don't-know** → family uncertain or low; deep-dive from the band the self-placement implied upward.
- Families self-placed `never` and off-frontier never reach the gate.

### Stage C — Deep (adaptive Bayesian)
- Over the **live concepts** of surviving families: a concept is *live* if its posterior variance is above the settle threshold `τ` and it is not pruned by propagation.
- **Item/concept selection:** pick the live concept with the **maximum expected information gain** (expected posterior-entropy reduction) under the current posterior; within a concept, serve items by descending discrimination. Info-gain replaces the old closure-gain heuristic but closure still feeds it (a concept that prunes more of the DAG yields more total information).
- **Response:** `{correct, wrong, dont_know}` (§4.3). Each answer:
  1. Bayesian-updates the focal concept posterior.
  2. Propagates priors through the DAG (§4.4) — a confident *known* lifts ancestor priors (prereqs implied), a confident *not-known*/`dont_know` lowers descendant priors; this settles many concepts without a direct question.
- **Mode (chosen at Stage-C entry):**
  - **Express** — soft cap `N` items per family (`N≈5`), keystones first; stop a family when capped or settled.
  - **Full** — no cap; continue until every live concept's posterior variance `< τ`. DAG propagation + Stage-A/B exclusions keep this tractable.
- The "don't know" control is always present on every item.

### Stage D — Result (rich probabilistic report + drill-down)
- **Per-domain** `P(known)` summary with a confidence interval (from aggregated posterior variance), rendered with the family hue tokens.
- **Recolored mastery-field map** (reuse `masteryField`) reflecting the just-written knowledge.
- **Top strengths / top gaps** across concepts.
- **Drill-down:** expand a family → per-concept posterior (`P(known)` + state known/shaky/unknown).
- **Persistence:** collapse each touched concept's posterior to point `confidence` (§4.5) and write via the knowledge signal (source `diagnostic`); `shaky` when residual variance is high.
- **CTA → `/roadmap`** (the path now reflects the assessment).

---

## 4. Probability model (`src/scripts/path/bayes.ts`, new — pure, no I/O, no `Date.now()`)

### 4.1 State
Per concept, a latent binary skill `K ∈ {known, ¬known}`. The test holds a posterior `p = P(K=known | responses)` per touched/propagated concept (a scalar in `(0,1)`; Bernoulli posterior, variance `p(1−p)`). Concepts never touched keep their prior.

### 4.2 Priors (from Stage A)
Prior `P(K)` from a `self-placement band × concept band` table. Concept bands are the existing `Band` (`foundations | surface | middle | advanced`). Self-placement levels map as:

| self-place \ concept band | foundations | surface | middle | advanced |
|---|---|---|---|---|
| `never`   | 0.15 | 0.08 | 0.04 | 0.02 |
| `basics`  | 0.75 | 0.45 | 0.20 | 0.08 |
| `prod`    | 0.92 | 0.80 | 0.55 | 0.30 |

(Exact constants live in one table in `bayes.ts`; tuned so `basics`+foundations reads "likely known" and `prod`+advanced stays genuinely uncertain → gets tested.) A cold prior (no self-placement) defaults to the `never` row's modest floor so unscoped concepts start unknown.

### 4.3 Item likelihood (3PL-style, three response categories)
Item params `{b, a, c}` — difficulty `b`, discrimination `a`, guess `c`. The IRT logistic gives the probability a learner at ability `θ` answers correctly; we model a *known* concept as a high effective ability and `¬known` as low, then collapse to per-state response probabilities:

- `P(correct | K)    = 1 − slip(a)`
- `P(correct | ¬K)   = c`                       (guess floor)
- `P(wrong  | K)     = slip(a) · (1 − pDK_K)`
- `P(wrong  | ¬K)    = (1 − c) · (1 − pDK_¬K)`
- `P(dont_know | K)  = slip(a) · pDK_K`         (a knower rarely says "don't know"; `pDK_K` small)
- `P(dont_know | ¬K) = (1 − c) · pDK_¬K`        (`pDK_¬K` notable)

where `slip(a)` shrinks with discrimination (sharper items → fewer slips), and `b` shifts the effective comparison so harder items are weaker evidence of `known` when answered correctly and stronger evidence of `¬known` when missed. Each category's two rows are a likelihood per state; Bayes normalizes (they need not sum to 1 across states).

Key property (requirement **a**): `dont_know` carries **no guessing channel** — it is clean evidence for `¬K` (high `P(dont_know|¬K)`, low `P(dont_know|K)`), so it drives the posterior down **confidently** (low value + low variance), unlike `wrong` which retains slip/guess ambiguity. It is routed as "unknown evidence", not "wrong attempt", so it does not over-penalize and cascades to dependents more gently (§4.4).

### 4.4 Posterior update + DAG propagation
- **Focal update:** `posterior ∝ prior × P(response | state)`, Bernoulli, per the table above.
- **Propagation** (probability-aware analogue of `applyDiagnostic`): after a *confident* focal update,
  - focal `known` (`p ≥ PASS`) → raise each unobserved **ancestor**'s prior toward `p·PROP_UP_FACTOR` (never lower).
  - focal `¬known` via **wrong** (`p ≤ FAIL`) → lower each unobserved **descendant**'s prior toward `p`.
  - focal `¬known` via **dont_know** → same direction but a **weaker** factor (e.g. direct children only, smaller step) — "I don't know this one" is weaker evidence about the whole downstream subtree than actively failing it.
- Constants reuse the spirit of `knowledge.ts` (`PASS_HIGH`, `FAIL_LOW`, `PROP_UP_FACTOR`).

### 4.5 Collapse to persisted confidence
On Stage-D completion, for every concept whose posterior moved from its prior:
- `confidence = p` (posterior mean).
- `shaky` flag when variance `p(1−p)` exceeds a threshold (the report shows "uncertain"; persisted as a normal confidence — `mastery-field` already derives shaky/known from the threshold).
- Write with source `diagnostic`, `lastAt = now`. Reuse `applySelfDeclare`/`applyDiagnostic`-style setters so existing "never override stronger evidence / never lower" guards still hold.

### 4.6 Information gain (selection)
For a candidate concept with posterior `p` and its best available item params, expected entropy after the answer = `Σ_r P(r) · H(posterior | r)`, where `P(r) = Σ_state P(r|state)P(state)`. Expected info gain = `H(p) − E[H]`. Pick the max; tie-break by closure size (so settling it prunes more of the DAG). Pure function, fully testable.

---

## 5. Content & parameters

### 5.1 Schema change
Each diagnostic item gains an **optional** `irt: { b: number; a: number; c: number }` field. The Zod schema for the diagnostics bundle (in `content.config` / the bundle builder) is extended; absence is valid.

### 5.2 Fallback (deterministic)
When `irt` is absent, derive: `b ← concept band` (foundations→low … advanced→high, fixed mapping), `c ← item type` (`mcq → 1/#choices`, `blanks → 0.05`), `a ← 1.0`. So the model works **before** any authoring — authoring only sharpens it.

### 5.3 Authoring all 145 banks (LLM)
Author explicit `{b,a,c}` for every item across all 145 banks via a Workflow (batched per family/track), each batch Zod-validated, merged deterministically into the bundle build. This is a content sub-task (separate plan phase); the model ships working on fallbacks and is upgraded as authored params land.

### 5.4 "Don't know" rewiring
`DiagnosticRunner`'s existing "Not sure"/"Не уверен(а)" button stops emitting `advance(false)` and instead emits a distinct `dont_know` outcome through the new response callback.

---

## 6. Components / files

**New**
- `src/scripts/path/bayes.ts` — priors table, likelihood, posterior update, DAG propagation, info-gain, collapse-to-confidence. Pure.
- `src/scripts/path/bayes.test.ts` — model unit tests.
- `src/components/path/PlacementResult.tsx` — Stage-D rich report + drill-down.
- Authoring script under `site/scripts/` (e.g. `calibrate-irt/`) + a `verify`/merge entry, mirroring existing content-tooling patterns.

**Reworked**
- `src/components/path/CalibrationFlow.tsx` — 4-stage orchestrator (Aim → Gate → Deep → Result); preserves `?unit=`.
- `src/components/path/DiagnosticRunner.tsx` — 3-category response (`correct|wrong|dont_know`), reports the raw response (not a pre-graded frac) to the orchestrator so `bayes.ts` owns the likelihood.
- `src/components/path/SelfPlacement.tsx` — adapted into Stage A (family-level self-placement) OR a new `AimStage.tsx` composing goal pick + family self-placement; keep the per-track grid if still referenced elsewhere.

**Extended**
- `src/scripts/path/calibration.ts` — keep objective graders; selection logic moves to / is shared with `bayes.ts`.
- `src/scripts/path/path-io.ts` — new wiring: expose priors-from-self-placement, posterior-aware apply, info-gain candidate query; keep `unitProbeConcepts`/`applyDiagnosticResult` for `?unit=`.
- diagnostics Zod schema + bundle builder — `irt` field.
- `src/i18n/ui.json` (+ component-local `L`) — new strings (stages, modes, result, "don't know").
- `src/styles/planning-screen.css` / `screen-kit.css` — result-screen styles (reuse existing tokens; no new design language).

---

## 7. Data flow

```
Stage A (goal + self-place)
   └─ config.goals, excludedTracks  →  targetFrontier
   └─ self-place bands              →  priors table  →  bayes priors
Stage B (gate: 1 keystone/candidate family)
   └─ response → bayes posterior + family deep-depth decision
Stage C (adaptive)
   └─ loop: pick max-info-gain live concept
            → DiagnosticRunner item → response
            → bayes: focal posterior + DAG prior propagation
            → settle (variance<τ) / express-cap
Stage D (result)
   └─ collapse posteriors → KnowledgeState (source diagnostic)
   └─ render report + drill-down + masteryField map
   └─ CTA → /roadmap
```

The persisted output is identical in shape to today's calibration output, so every downstream consumer (path engine, mastery map, profile rank, export/import) keeps working with no change.

---

## 8. Testing

**Unit (`bayes.test.ts`)**
- Prior table monotonicity (higher self-place / lower band ⇒ higher prior).
- Likelihood: `correct` raises `p`, `wrong` lowers it, `dont_know` lowers it **more confidently than `wrong`** (lower resulting variance) and **without** the guess floor.
- Posterior update is a proper Bayes step (matches hand-computed values on fixtures).
- DAG propagation: confident known lifts ancestors; wrong lowers descendants; `dont_know` cascade is strictly weaker than `wrong`.
- Info-gain picks the highest-expected-entropy-reduction concept; tie-break by closure.
- Collapse: posterior→confidence + shaky flag at the variance threshold.
- Param fallback derives expected `{b,a,c}` from band/type when `irt` absent.
- Stopping: express cap halts a family; full mode halts only at variance `< τ`.

**Integration**
- A scripted funnel run (fixed responses) reduces aggregate uncertainty and writes a `KnowledgeState` that recolors `masteryField` as expected.
- `?unit=` mode still runs the legacy single-pass path.
- Excluded/never-touched families are never served a probe.

**Build/CI**
- `bun run build` green (no page-count regression beyond the calibrate route), lint `0/0`.
- Diagnostics Zod schema accepts both `irt`-present and `irt`-absent items.

---

## 9. Build order (for the plan)

1. `bayes.ts` + tests (pure model, fallback params) — TDD, no UI.
2. diagnostics schema `irt` field + fallback wiring in `path-io` — model usable on fallbacks.
3. `DiagnosticRunner` 3-category response.
4. `CalibrationFlow` 4-stage orchestrator + Aim/Gate stages (reuse SelfPlacement/goals).
5. `PlacementResult` + persistence + `/roadmap` CTA.
6. Express/Full mode toggle + stopping.
7. i18n + styles + visual check (EN+RU).
8. LLM-author `{b,a,c}` across 145 banks (Workflow) + merge + re-validate.
9. Full build + lint + manual EN/RU pass.

Phases 1–7 ship a working probabilistic test on fallback params; phase 8 upgrades accuracy.

---

## 10. Out of scope (YAGNI)

- Calibrating item params from real learner response data (no data exists; LLM-authored params are expert priors, not empirical calibration).
- Server-side persistence of posteriors (stays client-local like all path state).
- Cross-session item-exposure control / anti-cheating.
- Changing the persisted `KnowledgeState` shape, the path engine, or the mastery map internals.
- Touching `?unit=` pre-check behavior.
