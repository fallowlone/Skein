# Algorithm↔lesson links (hybrid) — design spec

Date: 2026-10-06. Status: design approved by user (hybrid: derived base +
curated overlay, bidirectional surfaces). Next: implementation plan.

## Goal

Visible two-way links between the algorithms track and all lessons:
in-lesson "topic algorithms" block and algo-side "where it is used" block,
built from one committed index. No new islands; EN/RU parity via shared keys.

## 1. Data model

Generated committed index `site/src/content/path/algo-links.json`:

- `derived`: `{ <algoUnitKey>: [<lessonKey...>] }` where
  `algoUnitKey = "algorithms/<unit>"`, `lessonKey = "<track>/<unit>/<lesson>"`.
  A lesson links when its frontmatter `concepts:` (EN lesson files, the same
  source the lesson-graph builder parses) intersects the algo unit's
  `teaches` (from `unit-concepts.json`) in at least `MIN_SHARED` concepts.
  (Earlier draft used the lesson unit's `teaches ∪ requires`; the frontmatter
  signal was chosen because `unit-concepts.json` keys have no lesson
  granularity.)
  The inverse (lesson → algo units) is computed by inversion at build time.
  Both directions are stored in the committed file with `{shared, canonical}`
  payloads so UI blocks never load the 2.7MB `lesson-index.json`.
- Corpus note (2026-10-06, measured): concept vocabularies are track-siloed —
  only 4 cross-track lesson pairs reach `MIN_SHARED = 2` (58 share exactly
  one, mostly generic ids). Derived links are therefore in-track; cross-track
  links are editorial `always` pins (curated file), not derived. Same-track
  rows show the shared-count meta instead of repeating the track label.
- `curated`: hand-written source `site/src/content/path/algo-links.curated.json`,
  entries `{ algo, lesson, kind, note }` with `kind: always | never`.
  `always` pins the lesson on top flagged canonical; `never` suppresses a
  noisy derived link. Both ends must exist (lint error otherwise).

Tunable constants (documented in the builder, defaults): minimum shared
concepts = 2; cap per algo unit = 12 lessons; cap per lesson = 6 algo units.
Ranked by shared-concept count; ties broken by cross-track first (scarce
links carry the spec goal), then lesson order.

## 2. Build

New script `site/scripts/path/build-algo-links.mjs`, wired into the
`build:content` chain before lint. Steps: load `concepts.json`,
`unit-concepts.json`, curated file → compute intersections → apply
caps/threshold → apply curated overrides → write `algo-links.json` +
coverage report to stdout (units with zero derived links listed).
Deterministic key order; the committed diff is reviewable as content.

## 3. UI

- Lesson pages (`LessonRenderTree`, rendered only when links exist for the
  lesson): "topic algorithms" block in poster row language, linking to algo
  units. Server-rendered from the index.
- Algorithm unit pages/lab: "where it is used" block listing lessons with
  their domain track label. Server-rendered from the same index.
- Zero new Preact islands; hydration budget untouched. EN/RU via shared
  lesson keys (titles resolve through existing collections).

## 4. Lint

- Curated entry referencing a nonexistent algo unit or lesson → error.
- Algo unit with zero derived links → warning (signal to extend teaches).
- No changes to task-concept rules.

## 5. Verification

- Builder runs in the `build:content` chain (CI-covered).
- Corpus test: the committed `algo-links.json` must deep-equal a fresh
  `buildIndex` run (forces regen on content change), and the committed
  `algo-link-titles.json` must equal freshly loaded titles (a retitled lesson
  can't go stale silently). Rebuild must reproduce both files.
- Screenshots EN/RU of one lesson block + one algo block (1440/390).
- `lint:src` 0 errors; full unit suite green.

## Out of scope

Interactive visualizers, drills, assessment changes, concept-vocabulary
edits, island-internal headers. Curated-file editorial process (who writes
`always` entries) is a content workflow, not code.
