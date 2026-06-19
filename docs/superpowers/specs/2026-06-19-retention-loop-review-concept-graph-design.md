# Retention Loop: Review ↔ Concept Graph + Rating Persistence — Design (2026-06-19)

**Phase 3 of the post-audit high-importance roadmap** (`docs/superpowers/plans/2026-06-19-audit-high-importance-roadmap.md`).

## Goal

Close three seams so recall testing actually feeds the knowledge model and the daily revisit prompt fires on a real schedule, not a 7-day guess.

## Grounding — what already exists (corrects the roadmap's framing)

The roadmap said "FSRS ↔ concept graph". The code says otherwise. There are **three separate retention machines**:

1. **`src/scripts/path/knowledge.ts`** — concept-graph mastery (confidence 0–1, source tiers `diagnostic`/`declared`/`activity`, DAG up/down propagation). `decay()` is a **non-persisted read-model**. Drives the planner.
2. **`src/scripts/progression/srs.ts` + `src/scripts/review-state.ts`** — **SM-2** card store (`atlas.review.v1`, separate localStorage key from the synced `UserState`). Drives `/review`. **This is the fullstack spaced-rep engine — not FSRS.**
3. **`src/english/scheduler/fsrs.ts`** — real FSRS (`ts-fsrs`), **English-layer only** (grammar/vocab).

Two roadmap claims were stale:

- **"Decay never re-enters the planner" is false.** `path-io.ts:422,436` call `buildPath({ state: effectiveKnowledge() })`, and `effectiveKnowledge()` (path-io.ts:406) applies `decay()` live. A stale concept already re-enters the path via `isKnown`/`missingConcepts`. **No planner change is needed for re-entry.**
- **Retrieval questions already become review cards.** `RetrievalDrawer.tsx:59` seeds SM-2 cards on mount (`cardsFromRetrieval(...).forEach(addCard)`, deterministic key `${slug}::retrieval::${index}`).

So the four roadmap seams (A/B/C/D) collapse to **three units of work A + B + C**, with D's only real residual (event-driven erosion on a lapse, stronger than read-model age-decay) **folded into B**.

## Scope

**In:** A (rating persistence), B (review outcomes → concept mastery), C (banner from real due dates).

**Out (YAGNI):** SM-2→FSRS unification for the fullstack layer (English keeps FSRS, fullstack keeps SM-2); changing decay's read-model design; FadedExample/generation-before-reveal (Phase 4).

---

## Unit A — Rating persistence (RetrievalDrawer → SM-2 card)

**Today:** reveal calls `recordRetrieval(slug)`; the 1–5 confidence buttons write a local `confidence` state that is **discarded**. The card sits at `freshSched()` until the learner visits `/review`.

**Change:**
- Replace the 1–5 numeric row with the **4 SM-2 grade buttons** (`again`/`hard`/`good`/`easy`) — the exact `Grade` vocabulary `recordReview` consumes. No lossy 1–5→grade mapping.
- On grade click → `recordReview(\`${slug}::retrieval::${i}\`, grade)`, using the **positional loop index `i`** (matches the seed key `cardsFromRetrieval` writes), **not** the React key `q.id ?? \`${slug}-${i}\``.
- JSX-bodied questions have no seeded card → `recordReview` no-ops safely (`review-state.ts:63` already guards `if (!c) return`). Grade buttons may still render; grading a non-card question is a harmless no-op.
- Keep `recordRetrieval(slug)` on reveal (feeds the existing `userState.retrieval` used elsewhere) and the selected-state visual for the chosen grade.

**Files:** `src/components/pedagogy/RetrievalDrawer.tsx` (+ co-located test).

**Verify:** clicking a grade after reveal calls `recordReview` with the positional card key and grade; the card's `sched.reps`/`dueAt` advance.

---

## Unit B — Review outcomes → concept mastery (the core)

### B1 — `knowledge.ts`: new evidence source + function

- Extend `Source` (in `src/scripts/path/types.ts`) with **`"review"`**, ranked **between `activity` and `diagnostic`**.
- New pure fn **`applyReviewEvidence(state, taught, healthFrac, weight, floor, now)`** (`floor` = `decayFloor`, used by the erosion branch), mirroring `applyStudyEvidence`'s aggregate shape:
  - **Lift:** for each taught concept, target = `clamp01(healthFrac * weight)`; raise toward target with source `"review"`. Sets **only the unit's taught concepts** — **no DAG up-propagation** (aggregate health isn't proof of prereqs).
  - **Never overrides** `diagnostic`/`declared` (extend the existing strong-source guard).
  - **Lapse erosion (D's residual):** when `healthFrac` is low, **lower** `review`- and `activity`-sourced confidence toward `decayFloor` (passed in as the floor). `diagnostic`/`declared` are never eroded. This is event-driven forgetting evidence, distinct from `decay()`'s age-driven read-model; the floor guards both.
- Update **`applyStudyEvidence`** so study-activity can no longer overwrite `review`: add `"review"` to its no-override set (currently `STRONG = ["diagnostic","declared"]`; introduce a separate `STRONGER_THAN_ACTIVITY = ["diagnostic","declared","review"]` for the study guard so the existing `STRONG` semantics for diagnostic propagation are untouched).
- **`applyPracticeStruggle`** stays unchanged (still erodes only `activity`).
- **`decay()`** stays unchanged — it already iterates all sources, so `review`-sourced confidence decays uniformly with the rest.

### B2 — `path-io.ts`: derive review evidence from the card store

- New **`refreshReviewEvidence(state, now)`** mirroring the existing `refreshStudyEvidence`/`refreshPracticeStruggle`:
  - Read `review-state` cards (cross-store read of `atlas.review.v1`).
  - Group cards by **unitId**, derived from each card's `lessonKey` via `lessonKey.split("/")` (same derivation already used at path-io.ts:260–261).
  - Compute per-unit **`healthFrac`** over **reviewed cards only** (`lastReviewedAt != null` — unreviewed cards carry no signal):
    - a card is **healthy** when `sched.reps >= 2 && dueAt > now && sched.lapses === 0`,
    - **lapsed** when `sched.lapses > 0 || dueAt <= now`,
    - `healthFrac = healthy / reviewed`.
  - For each unit with `teachesByUnit.get(unitId)`, call `applyReviewEvidence(next, taught, healthFrac, REVIEW_EVIDENCE_WEIGHT, config.value.weights.decayFloor, now)`.
- Add a small selector in `review-state.ts` if needed (`allCards()` already exists; a `cardsByLesson()` helper keeps path-io clean).
- Wire `refreshReviewEvidence` into the knowledge-derivation pipeline at the same point `refreshStudyEvidence`/`refreshPracticeStruggle` run.

### B3 — Re-entry is free

Lowered confidence < `masteryThreshold` → `effectiveKnowledge()` → `buildPath` already re-includes the concept (`missingConcepts`). **No planner change.**

**Files:** `src/scripts/path/types.ts`, `src/scripts/path/knowledge.ts`, `src/scripts/path/path-io.ts`, `src/scripts/review-state.ts` (selector, optional) — each with co-located tests.

**Verify:**
- `applyReviewEvidence` unit tests: lift to `review` tier; never overrides `diagnostic`/`declared`; touches only taught concepts (no DAG prop); low `healthFrac` lowers `review`/`activity` but not `diagnostic`/`declared`.
- `applyStudyEvidence` no longer overrides a `review`-sourced concept.
- path-io: cards spanning two units → correct per-unit `healthFrac` → correct mastery deltas.
- Integration: a unit whose cards have all lapsed drops below threshold and re-appears in `buildPath(effectiveKnowledge())`.

---

## Unit C — SpacedRevisitBanner from real due dates

**Today:** `SpacedRevisitBanner.tsx` finds a "due" lesson via a hardcoded 7-day heuristic on `userState.retrieval[slug].lastAt` + a 1-day "since visit" gate.

**Change:** drive from `dueBefore(now)` (`review-state.ts`):
- Get the most-overdue due card (`dueBefore` already returns cards sorted by `dueAt` ascending).
- Map its `lessonKey` → slug, surface that lesson; link to its retrieval section (keep the existing `?revisit=<slug>#retrieval` deep link and the readable label added in `f1158d37`).
- No due cards → `null` (no nag) — cleaner than the current "1 day since visit" prompt.
- Keep the `dismissedRevisit` dismiss logic.

**Files:** `src/components/pedagogy/SpacedRevisitBanner.tsx` (+ test).

**Verify:** a due card present → banner shows that lesson; none due → renders nothing; dismiss still suppresses for the dismiss window.

---

## Migration / back-compat

All changes additive:
- `"review"` source is new; old persisted `KnowledgeState` payloads have none → no migration.
- Review cards already exist (seeded since the SRS engine shipped, 2026-06-05) → existing reviewers get **retroactive** concept evidence on next derivation. No data loss.
- Removing the discarded `confidence` local state in RetrievalDrawer is clean (no persistence touched).

## Constraints

- One branch (`feat/phase3-retention-loop`); `cd site && bun run build` + `bun run test` gate before merge.
- Merge to **local main only, no auto-push** (user pushes manually).
- Cross-store read (`atlas.review.v1` ← from path-io) must stay tolerant: private-mode / quota / malformed JSON returns empty (mirror `review-state.ts` read() try/catch). Review evidence is best-effort — its absence must never break path derivation.
- Co-Authored-By attribution disabled globally.

## Testing summary (TDD per task)

| Unit | Test focus |
|------|-----------|
| A | rate click → `recordReview(positionalKey, grade)`; card schedule advances |
| B1 | `applyReviewEvidence` lift/guard/erosion; `applyStudyEvidence` review no-override |
| B2 | per-unit `healthFrac` grouping; pipeline wiring; lapsed-unit re-entry in `buildPath` |
| C | due-card → banner lesson; none → null; dismiss window |
