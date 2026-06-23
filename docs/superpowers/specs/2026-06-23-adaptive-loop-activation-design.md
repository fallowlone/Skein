# Adaptive Loop Activation — Design

Date: 2026-06-23
Status: approved (brainstorm), P1 specced in detail
Branch: `feat/adaptive-loop-activation`

## Context

The curriculum platform is a mature, mathematically-principled personalization engine, not a content site. It ships: a Bayesian+IRT placement engine (`/calibrate`, 241 banks), a concept-graph planner (set-cover + priority-topo over ~4800 concepts with mastery decay and DAG propagation), an SM-2 SRS loop whose card health folds back into the same `KnowledgeState` that drives the path, a truthful pace/deadline forecaster, and a 25-rank gamification stack. Everything is pure, unit-tested, bilingual EN+RU, with `localStorage` → server (`/api/progress`) cross-device sync.

The "what to study / when" loop is genuinely closed. The problem is **three places where the adaptive promise is wired but does not fire**, confirmed by direct code reading:

1. **The visible rank is frozen to the placement test.** `rank` is assigned in exactly two places (`src/scripts/user-state.ts:138`, `src/components/pedagogy/Pretest.tsx:38`), both `rank: ratingToRank(rating).id` at pretest time. Nothing else ever moves it. A learner can master whole tracks for months and the headline "am I senior yet" number never changes. All real learning flows into a hidden `KnowledgeState`. Rank achievements (`src/scripts/progression/achievements.ts:31–34`) gate on `s.pretest.rating` only.
2. **The deadline forecast targets minutes, not seniority.** `pace(PaceInputs)` (`src/scripts/path/pace.ts:37`) forecasts finishing the path's required minutes; it never says "at this pace you reach the senior bar by `<date>`." The rank goal and the dated forecast are never joined.
3. **No last mile from mastery estimate → passes a senior interview.** Readiness is concept coverage only. There is no mock system-design rubric, behavioral loop, or interview grading.

A solo learner (the platform's sole user) is investing a fixed, expiring premium-AI budget to become a hireable senior fullstack engineer. The highest-leverage spend is **not more content** (2219 lessons, senior-heavy already) — it is closing these gaps with a thin adaptive layer that reuses the existing, tested substrate.

### Ground-truth corrections (verified against code, supersede earlier assumptions)

- **`TierAccordion` does not exist** anywhere in `src/`. It is listed as a shipped widget in `CLAUDE.md` but was never implemented. `Lesson.astro` branches rendering on `lessonType` (`"concept" | "coding" | "topic"`) and never reads `tier`/`depthTier` at render. → "lessons adapt to level" (P5) is build-from-scratch, higher risk, deferred to last/optional.
- **`ai-engineer` goal is a mixed 12-concept frontier** (6 Postgres-internals + 6 general DB), not "entirely Postgres." Thin, not broken — and not the user's goal → deprioritized.
- **The real soft target is `senior-fullstack`**: `goals.json:8–10` defines it as `{ "rule": "band>=middle" }` — a coarse rule. `goal-resolve.ts` already expands it to a concept frontier, so P1 functions on the current resolution; curating an explicit frontier (P2) sharpens aim but is not a blocker.

## Goals

- Make the **visible seniority signal track real study**, truthfully and without ever feeling punitive.
- **Join the deadline forecast to the seniority goal**: "at this pace you reach the senior bar on `<date>`, N days ahead/behind."
- Reuse existing tested modules (`effectiveKnowledge`, `ratingToRank`, goal frontier resolution, `pace`); add a single pure, unit-tested reconciliation module — no new ability model.
- Ship each phase independently behind `bun run build` + `bun run test` + dev-curl gates.

## Non-goals

- No new content / lessons.
- No multi-tenant concerns — single learner.
- No server/operator setup dependency for P1 (must work fully client-side; server sync carries the new field opportunistically).
- No rebuild of the placement engine, planner, or SRS.

## Program roadmap (5 phases)

Dependency × leverage ordered; each phase is shippable and gated independently. If budget runs out, earlier phases stand alone.

| Phase | Title | Effort | Delivers |
|-------|-------|--------|----------|
| **P1** | Living rank + deadline | medium | Rank and deadline forecast move from real study. "Placed X → now Y; senior by `<date>`." |
| **P2** | Sharpen senior frontier + protect the model | small | Curated `senior-fullstack` concept frontier; streak freeze/grace; full-model JSON export/import. |
| **P3** | Target weak spots | medium | Weak-spots read-model over practice attempts + SRS lapses → `TodayFocus` remediate block, difficulty-matched. |
| **P4** | Interview last-mile | large | `/interview`: system-design rubric + behavioral STAR + explain-to-staff, LLM-graded via BYOK; failures → SRS cards + `applyPracticeStruggle`. |
| **P5** | Lessons adapt to level | high (risk) | Tier-aware lesson rendering built from scratch + pilot. Optional/last. |

This document specs **P1 in full**. P2–P5 get their own spec → plan → implement cycles after P1 ships.

---

## P1 — Living rank + deadline (detailed design)

### The core problem: reconcile two ability models

Two ability representations exist and are currently decoupled:

- **Placement rating** — a scalar on `0–1000` (`src/scripts/progression/rating.ts:10–12`: stage-1 → `0–750`, +stage-2 → `750–1000`). Drives `rank` via `ratingToRank` (`src/scripts/progression/ranks.ts:41`). 25-rank ladder; hiring-bar anchors (`ranks.ts:30–39`): `apprentice-1` ≈ junior, `engineer-2` ≈ middle, **`senior-engineer-1` (min rating 600) ≈ the senior bar**, `principal-1` ≈ staff/principal.
- **`KnowledgeState`** — `Map<conceptId, { confidence: number; source; lastAt }>` (`src/scripts/path/types.ts:24–25`). `effectiveKnowledge()` (`src/scripts/path/path-io.ts:455`) returns it **decayed** (read-model; decay never persisted).

The reconciliation is the crux. Design rule: **placement is a floor, study is additive, the badge is a high-water mark (never punitive), the forecast is live and honest.**

### 1. Derive a study rating from knowledge

New pure function over the goal's resolved concept frontier `F` (set of `conceptId`) and decayed knowledge `K`:

```
coverage(F, K) = Σ_{c ∈ F} clamp01(K[c].confidence) / |F|        // missing concept ⇒ 0
studyRating    = round( lerp(FLOOR_RATING, barRating(goal), coverage(F, K)) )
```

- `barRating(goal)` is the rating at the goal's hiring bar (e.g. `senior-fullstack` → `senior-engineer-1` min = **600**), read from the existing rank ladder annotations. Full coverage of the goal frontier ≈ the bar; a higher goal raises the ceiling. `FLOOR_RATING` = 0.
- Uses the **decayed** `K` so forgetting is reflected in the *raw* study signal (the high-water rule below decides what is shown).
- Pure: `(F, K, goal) → number`. No I/O.

### 2. Blend with placement (no double-count, never punitive)

```
effectiveRating = max(placementRating, EMA(studyRating))
```

- `placementRating` is a **floor**: you tested in at X; study can only add on top.
- `EMA` (exponential moving average, e.g. α ≈ 0.3 over the persisted previous study rating) damps single-session jitter.
- `max()` guarantees study never drags the number below the placement result.

### 3. Visible rank = monotonic high-water

```
peakRating    = max(peakRating_prev, effectiveRating)   // NEW persisted field
displayRating = peakRating
rank          = ratingToRank(displayRating)
```

The shown rank never decreases — earned progress is not taken away. UI surfaces both anchors: **"placed at X → now at Y"** on the rank components (`RankNow`, `RankLadder`).

### 4. Forecast = live decayed (separate consumer, honest)

The deadline forecast uses the **live decayed** `effectiveRating` (NOT `peakRating`) projected via the existing pace model toward `barRating(goal)`:

```
projectRatingDate(history, paceModel, targetRating) → { date, daysAheadBehind, reachable }
```

- Because it is a *forecast*, it may legitimately reflect decay/slowdown — this is the honest signal, distinct from the earned badge.
- Surfaces one line on `/roadmap` / `TodayFocus`:
  > "At this pace you cross 600 (senior-engineer-1) on `<date>` — N days ahead/behind your deadline."

This dual-consumer split **is** the reconciliation: floor (placement) + additive EMA (study) → high-water badge (motivation, never punitive) and live decayed projection (accountability, honest).

### 5. Retarget rank achievements

`achievements.ts:31–34` predicates change from `s.pretest.rating >= N` to read `displayRating` (the live high-water), so rank achievements fire from study, not only the placement test. Keep the same thresholds (450/750/930/990) on the same `0–1000` scale.

### Module & interfaces (isolation)

New pure module — **no I/O, fully unit-testable**:

`src/scripts/progression/effective-rating.ts`
```ts
export function studyRating(frontier: Set<string>, knowledge: KnowledgeState, barRating: number): number
export function blendRating(placementRating: number, prevStudyEma: number, studyRatingRaw: number, alpha: number): { ema: number; effective: number }
export function highWater(prevPeak: number, effective: number): number
export function projectRatingDate(samples: RatingSample[], targetRating: number, pace: PaceLike): RatingForecast
export function barRatingForGoal(goalId: string): number   // reads existing ladder hiring-bar anchors
```

- **Inputs only**: resolved frontier, knowledge map, placement rating, prior EMA/peak, pace inputs. No reads of `localStorage` or globals inside the module.
- **Consumers** (thin glue, wired during planning): `user-state.ts` (own `peakRating` + `studyEma` in the existing `progression` object), the rank UI (`RankNow`, `RankLadder`), the deadline UI (`DeadlineSection` / `TodayFocus`), and `achievements.ts`.
- **Frontier source**: the existing goal resolver (`src/scripts/path/goal-resolve.ts`) that already expands `senior-fullstack` to a concept set. P1 consumes whatever it returns; P2 sharpens it.

### Data model

Extend the existing `progression` block in `awesome.user-state.v1` (no new storage key):

```ts
progression: {
  // ...existing...
  peakRating?: number;   // monotonic high-water of effectiveRating
  studyEma?: number;     // last EMA of studyRating, for next blend
  studyRatingAt?: number // epoch ms of last recompute (for forecast samples)
}
```

- Backward compatible: absent fields ⇒ treat as "no study signal yet" (fall back to placement rating; show only "placed at X").
- Server sync (`account-sync.ts` `pushProgress`/`fetchServerProgress`) carries the fields opportunistically as part of `progression`; no schema migration required, no operator setup.

### Recompute trigger

`effectiveRating` recomputes (cheap, pure) whenever knowledge changes — i.e. on the existing knowledge-update path (lesson activity, practice struggle, SRS review folding into `KnowledgeState`) and on app load. Persist `peakRating`/`studyEma`/`studyRatingAt`. No new event system; hook the existing knowledge-write site.

### Edge cases & guards

- **Min-evidence gate**: if `|{ c ∈ F : K[c].confidence ≥ τ }|` < `MIN_EVIDENCE` (e.g. 5), suppress the "now at Y" surface and keep showing placement only — prevents a noisy early study rating from misleading. (`τ` ≈ 0.6.)
- **Jitter**: EMA on `studyRating` for the blend; forecast samples are EMA-smoothed too.
- **No goal / no placement**: if no goal set, default frontier to `senior-fullstack`; if no placement (`pretest` absent), `placementRating = 0` and the floor is simply study-driven.
- **Decay vs badge**: badge uses high-water (never down); forecast uses live decayed — by design, not a bug.

## Testing strategy

Unit tests (Vitest, pure module — no `astro:content`, mirror the existing path-module test style):

- `studyRating`: monotonic non-decreasing in coverage; coverage 0 → `FLOOR_RATING`; coverage 1 → `barRating`; missing concepts count as 0.
- `blendRating`: `effective ≥ placementRating` always (floor); EMA converges; single outlier session moves `effective` by < bounded delta.
- `highWater`: never returns below `prevPeak`; rises with `effective`.
- `projectRatingDate`: against a known pace fixture, returns the expected crossing date; `reachable=false` when pace ⇒ never crosses; `daysAheadBehind` sign correct vs deadline.
- `barRatingForGoal`: `senior-fullstack` → 600; unknown goal → sane default.
- Integration (logic-level, no render): a scripted sequence of knowledge updates moves `displayRating` and the forecast date. In the study-driven regime (placement below the target bar, so `effectiveRating = EMA(studyRating)`), clearing knowledge does **not** lower `displayRating` (high-water badge) but **does** push the forecast date out (live decayed signal). When placement already ≥ the target bar, the forecast reports already-crossed regardless of study.

Gate: `bun run build` (full lint+render) + `bun run test` + dev-curl of `/roadmap` and a profile/rank page in EN+RU. (Per project memory: logic/content changes must gate on build+test, not lint alone — lint never renders MDX.)

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Two ability models double-count or yo-yo the visible number | `max()` floor + EMA + monotonic high-water badge; forecast (not badge) carries decay |
| Noisy study rating early (sparse coverage) | Min-evidence gate suppresses "now Y" until enough concepts cleared |
| Forecast date jitters and erodes trust | EMA-smoothed samples; show a band/rounded date, not a volatile exact day |
| `barRating`/frontier anchor wrong → mis-aimed number | Reuse existing ladder annotations + goal resolver; P2 curates `senior-fullstack` frontier; cover with tests |
| Server sync rejects new fields | Fields live inside existing `progression` object, carried as-is; absent ⇒ graceful fallback |

## Out of scope (this spec)

- P2–P5 (each own spec).
- Any change to the placement/calibration engine, planner internals, or SRS scheduling math.
- Server-side schema or new endpoints.
