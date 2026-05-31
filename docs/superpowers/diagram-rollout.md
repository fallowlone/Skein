# Diagram rollout (B3)

Run after the kit (B1) and pipeline (B2) are accepted. Adds one explanatory diagram
to every lesson that lacks `data-lesson-visual`, EN+RU.

## Batching
- Process by track, ~20–30 lessons per batch.
- Per lesson: author-bot (`/diagram <key>`) → verify-bot. PASS to commit; FIX loop
  (max 2); FLAG → backlog.
- Idempotent + resumable: skip lessons already carrying `data-lesson-visual`.

## Per-batch gate
- `cd site && bun run build` → 0 errors, lint clean.
- Report: `passed / fixed / flagged (with reasons) / skipped`.

## Final acceptance
- Full build (3976+ pages, 0 errors).
- Sample ~2 lessons per track in light + dark; confirm diagrams render and theme.
- Flagged backlog handed off for manual finishing.

## Coverage note
Lessons where no primitive genuinely helps are FLAGGED, not forced — quality over
coverage. Record the flagged count honestly in the final report.
