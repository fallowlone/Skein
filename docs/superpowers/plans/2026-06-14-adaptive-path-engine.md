# Adaptive path engine + practice expansion

Date: 2026-06-14
Branch: `feat/adaptive-path-engine`
Owner: autonomous session

## Goal

Make the learning-path engine maximally personalised — recommend **what** to learn,
**in what order**, and **which tasks** to do next — and expand practical-task coverage
on thin/weak lessons.

Four engine capabilities (all in scope) + targeted content authoring.

## Current state (verified by reading the code)

- `buildPath` (planner.ts) recommends **units only**. No lesson/task drill-down.
- `refreshStudyEvidence` (path-io.ts) folds practice progress into knowledge but is
  **monotone (never lowers)** — a *failed* task does nothing. Pass/fail is sent only to
  anonymous metrics (`metrics.ts` sendBeacon), never persisted locally.
- SM-2 SRS exists (`progression/srs.ts`, store `atlas.review.v1`, `review-state.ts`).
  Practice tasks are already harvested into review cards (`cardsFromPractice`), but
  `computePath` passes `srsDue: []` — **due reviews never reach the path or planning**.
- Practice difficulty tiers = `recall → apply → stretch` (PracticeSection.tsx). Shown
  all-at-once; no adaptive selection.
- Local task status = `seen | attempted | done` in `atlas.practice.<lessonKey>`.

## Design

### A. Feedback loop (fail → resurface)
1. **Persist outcomes locally.** New store in `practice-state.ts`:
   `atlas.practice-attempts.<lessonKey>` → `{ [taskId]: { attempts, passes, lastResult, lastAt } }`.
   Recorded at the same call sites as `recordPracticeResult` (PracticeSection).
2. **Downward knowledge signal.** New pure `applyPracticeStruggle` in `knowledge.ts`:
   lowers **activity-sourced** concept confidence for a unit's taught concepts when its
   struggle fraction is high — bounded by `decayFloor`, never overriding
   `diagnostic`/`declared`. Mirror-image of `applyStudyEvidence`. A resurfaced concept
   drops below `masteryThreshold` -> re-enters `missingConcepts` -> back in the path.
3. **Aggregate.** New pure `practice-signal.ts`: attempt store + unit->lessons ->
   per-unit `{ doneFrac, struggleFrac }`. Wired in path-io as `refreshPracticeSignal()`.

### B. Adaptive difficulty
New pure `difficulty.ts`: `pickDifficulty(mastery, threshold) -> recall|apply|stretch`
(low->recall, mid->apply, at/above->stretch) + `recommendTask(tasks, mastery, status)`
picking the next unfinished task at the right tier. Centralises `DIFFICULTY_ORDER`
(re-exported by PracticeSection to avoid drift).

### C. "Do this now"
New pure `do-now.ts`: from the computed Path (units) + unit->lessons + per-lesson status
+ knowledge + due review cards, produce an ordered action list:
`{ kind: "review"|"lesson"|"task", unit, lesson?, taskId?, difficulty?, reason }`.
Order: due reviews first, then the next unfinished lesson of the lead path units, then
the adaptive next task. Surfaced in the existing `TodayFocus.tsx` (no new island).

### D. Spaced repetition of practice
- Feed due cards into planning via a `dueReviews()` read-model (fixes `srsDue: []`).
- On **fail**, advance the task's SRS card to due-soon (grade `again` -> interval 0) so a
  flunked task returns quickly; surfaced through the do-now "review" rows.

### E. Content — targeted authoring
- New `scripts/practice-coverage/` audit: count tasks + tiers per ready lesson; emit a
  worklist of **thin** (`< 4` tasks) / tier-gap lessons; `--gate` exits non-zero while
  any remain.
- Author missing tasks (EN+RU) for the worklist via Workflow subagents, batched by track,
  modelled on the scenario campaign. Verify + EN<->RU parity + contamination scan.

## Tasks (TDD; runner = `bun run test`, NOT `bun test`)

- T1 practice-state: local attempts store + recorder. test
- T2 knowledge: `applyPracticeStruggle` (downward, bounded, activity-only). test
- T3 practice-signal: per-unit done/struggle fractions. test
- T4 difficulty: `pickDifficulty` + `recommendTask`. test
- T5 do-now: ordered recommendation assembly. test
- T6 path-io wiring: `refreshPracticeSignal`, `dueReviews`, fail->SRS-soon, do-now read-model
- T7 UI: TodayFocus renders do-now (reviews · lesson · task@tier), EN+RU
- T8 content audit script + worklist + gate
- T9 Workflow authoring for thin/weak lessons (EN+RU), verify, parity
- T10 verify: `bun run test` green · `bun run build` green (lint 0) · audit gate 0 · visual EN+RU
- T11 merge -> main + push when 1-10 green

## Guardrails

- Pure P0 core stays pure; path-io is the only impure adapter (Date.now/localStorage).
- Immutable KnowledgeState. Don't break `buildPath`/types contracts.
- If `resolveGoalTargets`/path rules change -> mirror in `src/lint/rules/path.ts` (won't here).
- Bilingual EN+RU content; scan for harness-tag contamination before build.
- No console.log; typecheck + lint clean before finish.
