# Step C — depth bar + re-grade gate — design spec

- **Date:** 2026-06-07
- **Status:** approved (design)
- **Predecessor:** Step A (depth-audit tool + first full audit). Findings:
  `docs/audit/2026-06-07-depth-audit-findings.md`.
- **Branch:** `feat/senior-plus-campaign`

## 1. Problem

The first full audit's committed artifact (`docs/audit/depth-scores.json`) reports
`bar=2.61, f1=0.667, failing=50/276` — all distorted:

- **Auxiliary entries** (`00-start-here/01-overview`, `quiz-*`, `project`, `drill`) score
  low **by design** (an overview is brief; a quiz/drill is an exercise, not exposition).
  Averaged into unit means they drag every unit down 1–1.5 points and create false "weak"
  signals.
- **Foundations** tracks (math/base-cs/algorithms) are beginner `/learn` tracks, not the
  senior fullstack spine, but are graded against the senior bar.
- **Label calibration is now meaningless:** measured on teaching lessons only, the spine is
  uniformly deep (per-track teaching-mean 3.61–4.86) — there is no "thin" cluster to
  separate, so the F1-maximising bar is noise (the heuristic "thin" labels were also
  inverted → f1 0.667).

The campaign's big backfill is moot (content is already senior-grade), but a **correct**
audit artifact and a **reusable re-grade gate** still have lasting value: the gate verifies
any *future* content (the capstone, edits, new lessons) meets the senior bar.

## 2. Goal & success criteria

Make the audit measure depth honestly and serve as a re-grade gate.

**Done:**
- Unit depth scored on **teaching lessons only**; auxiliary entries classified and excluded
  from the score (but counted in the report).
- **Foundations** tracks reported separately, not gated against the senior bar.
- Pass/fail by an **absolute bar** on a unit's teaching-mean (no label calibration, no
  per-lesson floor).
- A **re-grade gate** (`audit.ts --gate --units <keys>`) that exits non-zero if any named
  unit's teaching-mean is below the bar — reusable for future content.
- `docs/audit/depth-scores.json` + `depth-report.md` regenerated with the correct semantics
  and committed.
- All tests green.

## 3. Design

### 3.1 Bar: absolute, not calibrated (decision)
Replace label calibration with a fixed threshold `DEPTH_BAR` (env, default **3.5** on the
0–5 weighted scale). Rationale: the content is uniformly deep, so there is no good/thin
bimodality to calibrate; and a re-grade gate on future content wants absolute "must score ≥
X" semantics anyway. `calibrate.ts` + `calibration-set.json` become **legacy** — retained
(still unit-tested) but no longer on the default path. Considered + rejected: relabelling
(no thin cluster → weak F1) and a percentile bar (drifts with content).

### 3.2 Classify teaching vs auxiliary — `classify.ts` (new)
`classifyLesson(lessonKey): "teaching" | "auxiliary"`. Auxiliary iff the slug (last path
segment) matches `project`, `drill`, `quiz-*`, OR the lessonKey is a `00-start-here/*`
overview. Pure, unit-tested against real lessonKeys from the worklist.

### 3.3 Aggregate over teaching lessons — `aggregate.ts` (modify)
`aggregateUnit` computes `dimMean`/`overall` over **teaching** lessons only; records
`teachingCount` + `auxiliaryCount`. **Remove the per-lesson FLOOR** and `passes(bar)`'s floor
clause (junior-tier teaching lessons legitimately score 2–3; a floor would fail deep units on
their own junior intro). `passes(bar) = teachingOverall >= bar`. A unit with **zero** teaching
lessons (e.g., a hypothetical all-auxiliary unit) is marked `scored:false` and excluded from
pass/fail (reported as "no teaching content").

### 3.4 Spine scope — foundations split
`FOUNDATIONS = {math, base-cs, algorithms}` (a named constant in `classify.ts`). The report
and JSON separate **spine** units (gated against the bar) from **foundations** units
(reported with scores, not gated). Pass/fail counts are over spine units only.

### 3.5 Report + scores — `report.ts` (modify)
`depth-scores.json`: `{ bar, scale:"absolute", summary:{spineTotal, spinePassing, spineFailing,
foundationsCount}, spine:[…], foundations:[…] }` — each unit carries `overall`, `passes`,
`teachingCount`, `auxiliaryCount`, `dimMean`, `worstTeachingLesson`. `depth-report.md`: spine
table (worst-first, FAIL flagged) + a separate foundations table, with a header line stating
the absolute bar.

### 3.6 audit CLI — `audit.ts` (modify)
- Default `runAudit(grades)` → aggregate (teaching-only) → split spine/foundations → report
  against `DEPTH_BAR`. No calibration step.
- **Re-grade gate:** `bun scripts/depth-audit/audit.ts --gate --units a/b,c/d` → loads
  `grades.json`, filters to the named units, asserts every spine unit's `teachingOverall >=
  bar`; prints each unit's result; **exits 1** if any fails (0 if all pass / only foundations).
  The grading of those units (LLM, via the Workflow/cowork) is upstream and writes
  `grades.json` first — the gate is the deterministic assert.

### 3.7 Regenerate + commit
Run the default audit over the existing `grades.json` → regenerate
`docs/audit/depth-scores.json` + `depth-report.md` → commit. Expectation per the verdict:
spine failing ≈ 0 (uniform depth); foundations listed separately.

## 4. Files
- Create: `site/scripts/depth-audit/classify.ts` (+ test)
- Modify: `site/scripts/depth-audit/aggregate.ts` (+ test) — teaching-only, drop floor, scored flag
- Modify: `site/scripts/depth-audit/report.ts` (+ test) — spine/foundations split, absolute bar
- Modify: `site/scripts/depth-audit/audit.ts` (+ test) — drop calibration default, add `--gate`
- Modify: `site/scripts/depth-audit/README.md` — absolute bar + re-grade gate usage
- Legacy (unchanged, off default path): `calibrate.ts`, `calibration-set.json`
- Regenerate (commit): `docs/audit/depth-scores.json`, `docs/audit/depth-report.md`

## 5. Out of scope
The big backfill (Steps D–G), the capstone (Step F — separate spec when chosen), and any
content authoring. This is tooling-correctness only.

## 6. Open questions (non-blocking)
- Exact `DEPTH_BAR` default — 3.5 proposed; the regenerated report shows how many spine units
  (if any) fall below, and the value is one env var to tune.
