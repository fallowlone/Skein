# Depth-audit tool

LLM-grades every EN lesson on a 6-dimension senior-depth rubric, scores each unit over its
teaching lessons, and writes `docs/audit/depth-scores.json` + `docs/audit/depth-report.md`
(spine/foundations split, worst-first) — gating spine units against an absolute bar.

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

## Bar (absolute)
Pass/fail uses an absolute bar on each unit's **teaching-lesson** weighted mean (auxiliary
entries — start-here overviews, quiz-*, project, drill — are excluded from the score).
Default `DEPTH_BAR=3.5`; override via env. Foundations tracks (math/base-cs/algorithms) are
reported separately and not gated. `calibrate.ts` + `calibration-set.json` are legacy (off
the default path).

## Re-grade gate (after authoring/editing a unit)
1. Re-grade only the changed units (the grading Workflow / cowork) and write their entries
   into `scripts/depth-audit/grades.json`.
2. `cd site && bun scripts/depth-audit/audit.ts --gate --units track/unit-a,track/unit-b`
   → exits 0 if every named spine unit's teaching mean ≥ bar, 1 otherwise (foundations are
   ignored). Use this as a content-quality gate for the capstone or any new lessons.

## Model
Grading agents default to `sonnet`; pass `model: "opus"` in the args for the highest-stakes
re-grades. Token cost scales with lesson count (~1686 lessons across ~276 units).

## Verdict
The first full audit found the content is already comprehensive and senior-grade — the big
backfill premise (47% stubs / weak spine / 57% practice) did not survive measurement; those
were Explore-agent estimates + an auxiliary-entry artifact. See
`docs/audit/2026-06-07-depth-audit-findings.md`. This tool now serves mainly as a re-grade
gate for *future* content (capstone, edits).
