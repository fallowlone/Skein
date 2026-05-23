---
description: Author a practice task set (3–5 tasks, EN+RU) for one ready lesson. Additive — never edits the lesson MDX.
argument-hint: <track>/<unit>/<lesson> (e.g. databases/03-execution-plans/04-statistics-and-analyze)
allowed-tools: Bash, Read, Write, Edit, mcp__plugin_context7_context7__resolve-library-id, mcp__plugin_context7_context7__query-docs
---

# /practice <track>/<unit>/<lesson>

Author a single bilingual practice file for one lesson. EN+RU in one JSON, or refuse.

**Input:** `$ARGUMENTS` (e.g. `databases/03-execution-plans/04-statistics-and-analyze`).

## Pipeline

1. **Locate the lesson.** Confirm `site/src/content/lessons/en/$ARGUMENTS/index.mdx` AND the `ru` twin exist and are `status: ready`. If not, refuse with a 2-line message and stop.
2. **Mine the lesson.** Read both langs; extract `concepts`, `level`, the failure modes, and concrete numbers. The tasks must hit the SAME mechanisms the lesson teaches — not generic trivia.
3. **Design 3–5 tasks** as a `recall → apply → stretch` ladder. At least one must be generative (`fix`/`design`) or hands-on (`sandbox`/`incident`) — not pure recognition. Allowed types: `predict`, `diagnose`, `fix`, `sandbox`, `incident`, `design` (schema in `site/src/content.config.ts`).
4. **Author both languages** in one file at `site/src/content/practice/$ARGUMENTS.json`. Set `lessonKey: "$ARGUMENTS"` and `track` to the track segment. Use `site/src/i18n/glossary.json` for locked RU terms; add new terms alphabetically. Prose fields are pre-escaped HTML strings.
5. **Validate.** From `site/`: `bun run build`, then read `dist/lint-report.json` — `errors` must be empty, and the `practice-count` warning for this lesson must be gone. Confirm `practice-parity` (no `en===ru` prose, no whitespace-only) and `practice-lessonkey` pass.
6. **Stop.** Do not commit unless asked.

## Rules

- Bilingual or refuse.
- 3–5 tasks; unique `id` per task (`^[a-z0-9-]+$`). >5 tasks trips the `practice-count` warning (schema hard cap is 8).
- `incident` tasks: 3–6 staged steps (triage → root cause → fix → prevent).
- `sandbox`/`fix`-exec runtimes: `sql` (PGlite) or `js` (QuickJS); `parametric` must name a component registered in `site/src/components/pedagogy/PracticeSection.tsx` (`PARAMETRIC` map).
- Never edit the lesson MDX. Practice is additive — one file, no core changes.
