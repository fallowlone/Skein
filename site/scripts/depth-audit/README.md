# Depth-audit tool

LLM-grades every EN lesson on a 6-dimension senior-depth rubric, scores each unit,
calibrates a pass bar against a hand-labeled set, and writes
`docs/audit/depth-scores.json` + `docs/audit/depth-report.md` (gap-sorted, worst-first).

Step A of the Senior+ Campaign. Spec:
`docs/superpowers/specs/2026-06-07-senior-plus-campaign-design.md`.

## Layout
- Deterministic pipeline (TDD'd, pure): `types` · `rubric` · `lessons` · `grade-store`
  · `aggregate` · `calibrate` · `report` · `audit`.
- LLM step (isolated): `grade.workflow.js` — run via the **Workflow tool**, one grading
  agent per unit (≈276 units, under the 1000-agent cap). The Workflow runtime has no
  filesystem; agents Read lesson/practice files themselves and return schema-validated
  scores; the caller persists the returned array to `grades.json`.
- Generated (gitignored): `worklist.json`, `grades.json`.

## Full audit
1. `cd site && bun scripts/depth-audit/worklist.ts`  → `worklist.json` (~276 units, 1686 lessons)
2. `bun scripts/depth-audit/grade-args.ts > /tmp/grade-args.json`  (builds Workflow args from the typed rubric)
3. Run the **Workflow tool**: `scriptPath` = `site/scripts/depth-audit/grade.workflow.js`,
   `args` = the parsed contents of `/tmp/grade-args.json`. Save the returned array to
   `site/scripts/depth-audit/grades.json`.
4. `cd site && bun run audit:depth`  → `docs/audit/depth-scores.json` + `depth-report.md`

## Re-grade gate (after authoring a unit)
Filter `worklist.json` to the changed unitKeys, run steps 2–4 on that slice, and assert
the unit's `passes === true` in `depth-scores.json`. A unit is "done" only when it clears
the calibrated bar. Calibration is deterministic — relabeling `calibration-set.json` and
re-running `audit:depth` re-tunes the bar without re-grading.

## Model
Grading agents default to `sonnet`; pass `model: "opus"` in the args for the highest-stakes
re-grades. Token cost scales with lesson count (~1686 lessons across ~276 units).

## Note on "stub" vs depth
Every authored lesson is `status: ready` — there are no stub *lessons*. The "~47% stub
units" in the weaknesses audit are units **declared in `units.json` with no authored
lessons**, which this tool (lesson-enumeration based) does not see. This tool measures the
**depth** of what exists; a separate coverage check is needed for declared-but-empty units
(tracked for Step B / Core-Path selection).
