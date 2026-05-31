# Lesson Diagrams (B) — Design

**Date:** 2026-05-31
**Status:** Approved (brainstorm), pending implementation plan
**Branch:** `lesson-diagrams` (off `main`)
**Scope:** Phase B of the lesson-visuals effort — concept-explaining diagrams in lessons.

## Goal

Give lessons **explanatory diagrams** (not just the decorative plate from Phase A):
on-brand, dark-aware vector figures that teach the concept — a flow, a layer
stack, a protocol sequence, a data structure. Today only the `algo/` track has
figures, and those are off-brand (raw ByteByteGo palette, light-only). This builds
a reusable diagram **kit**, an **AI authoring pipeline** with a mandatory
**verification bot per lesson**, and a **batched rollout** across all 1279 lessons
(EN+RU).

This is the most ambitious option from the brainstorm: kit + AI pipeline + full
rollout. Phase A (the lesson plate) already shipped.

## Design direction (locked)

Editorial-cartographic, matching the Atlas redesign and the Phase-A plate:
paper/ink, domain hues, JetBrains Mono labels, hairline borders, quiet. Every
diagram is **vector (inline SVG/CSS)** — no raster images: crisp at any zoom, tiny,
theme-reactive (light/dark via tokens), screen-reader accessible. Each figure
carries `data-lesson-visual` (the existing marker the lint/visual rules key on).

## Decomposition (three phases)

| Phase | What | Plan-able as |
|-------|------|--------------|
| **B1** | Diagram primitive kit + re-skin the 4 `algo/` figures to tokens | TDD code, one plan |
| **B2** | AI authoring pipeline: author-bot → verify-bot, per lesson | Agent prompts + orchestration |
| **B3** | Batched rollout to all 1279 lessons EN+RU | Operational batch procedure + gates |

The implementation plan covers **B1 + B2 + a pilot batch**. B3 (full rollout) is an
operational, resumable batch process run after B1+B2 are accepted — the plan
defines its procedure, gates, and reporting, not 1279 individual steps.

## B1 — Diagram primitive kit

New components under `src/components/diagram/` (distinct from the legacy
`src/components/algo/`). All static (no hydration), tokenized (light+dark),
`aria-label`/`role="img"`, wrapped for the visual marker.

- **`DiagramFrame.astro`** — shared wrapper: `<figure data-lesson-visual>` + optional
  caption + on-brand chrome (card bg, hairline border, domain-hue accent optional).
  Every other primitive renders inside it.
- **`FlowDiagram.astro`** — declarative nodes + edges (boxes + arrows). Props:
  `nodes: {id, label, col?, row?}[]`, `edges: {from, to, label?}[]`, simple grid
  auto-placement when `col/row` omitted. Covers process flows, architectures,
  state machines (networking, distributed, APIs, queues).
- **`StackDiagram.astro`** — vertical layered boxes. Props: `layers: {label, note?}[]`,
  `dir?: "down"|"up"`. Covers request paths, OSI/TCP layers, frontend→backend→db.
- **`SequenceDiagram.astro`** — participant lifelines + time-ordered messages. Props:
  `actors: string[]`, `messages: {from, to, label, dir?}[]`. Covers handshakes,
  protocols, API call/response (networking, apis, security).
- **Re-skinned (kept for algo/base-cs):** `StructureFigure`, `MachineFigure`,
  `ComplexityChart`, `AlgoTrace` — swap raw palette (`bg-white`, `bg-panel-*`,
  `text-bbg-*`, hardcoded hex) for tokens (`var(--card)`, `var(--ink)`,
  domain/semantic hues, `var(--ok)/--accent/--danger`) so they render correctly in
  dark. Same props/behaviour; visual-only change. (Re-skin in place under
  `algo/`; do not move.)

Tokens consumed: `--card --card-2 --ink --ink-2 --muted --faint --hairline
--hairline-2 --hairline-strong --accent --accent-ghost --ok --warn --danger
--font-mono --font-body --r-sm --r-md` plus domain hues `--d-*`. Never raw
ByteByteGo palette.

## B2 — AI authoring pipeline (per lesson)

Two subagent roles per lesson, author → adversarial verify:

### Author-bot
- Reads the lesson MDX (our own trusted content — not web; still briefed to base
  the diagram only on the lesson text, invent nothing).
- Picks the best-fit primitive for the concept (flow / stack / sequence / structure
  / big-O). One diagram per lesson.
- Emits kit markup and inserts it into the lesson's **Visual slot** (the
  `Hook → Goal → Explanation → Visual → …` position; near the Explanation), in both
  the EN and RU files — one diagram, localized labels/caption, i18n parity.
- **Idempotent:** if the lesson already contains `data-lesson-visual`, skip.
- If no primitive genuinely helps the concept, it does NOT force a weak diagram —
  it flags the lesson with a reason (quality over coverage).

### Verify-bot (separate subagent — reads the code, does not trust the author)
- **Technical accuracy:** does the diagram correctly represent the lesson's claims?
  (right order, arrows, labels; e.g. a TCP handshake must be SYN→ / ←SYN-ACK /
  ACK→). Reject factual errors.
- **On-brand:** only kit primitives + tokens, zero raw palette, dark-aware.
- **Build/lint:** the page builds, `data-lesson-visual` present, hydration cap not
  exceeded, EN/RU parity holds.
- Verdict **pass** / **fix** → loop back to author (max 2 iterations) → else
  **flag** for human (recorded in the batch report, never silently passed).

A lesson is "done" only on **pass**. Per-batch report: passed / fixed / flagged
with reasons.

## B3 — Rollout

- 1279 EN lessons (+ RU mirrors), batched ~20–30 (by track), like the
  track-deepening effort.
- Each lesson runs the author → verify loop; each batch closes on a **build + lint
  gate** + report.
- Resumable + idempotent (skip already-visualized lessons). Flagged lessons go to a
  backlog for manual finishing.
- Final acceptance: full build (3976+ pages, 0 errors), spot visual checks across
  tracks in light + dark.

## Testing

- **B1 kit:** unit tests for any pure logic (`FlowDiagram` grid placement,
  `ComplexityChart` curve math); a screenshot of every primitive in light + dark;
  build green; re-skinned algo figures render correctly in dark on existing
  algo lessons.
- **B2 pipeline:** dry-run on a pilot batch (~5 lessons across different tracks);
  a **negative test** — feed the verify-bot a deliberately wrong diagram and
  confirm it rejects it.
- **B3:** per-batch build/lint gate + a final full build + sampled visual review.

## Constraints

- Vector only; no raster. Tokens only; no raw ByteByteGo palette. No new hydration
  islands beyond the existing cap (diagrams are static; `AlgoTrace` keeps its one
  existing island).
- The author-bot edits lesson MDX content — EN and RU must stay in parity (same
  diagram, localized text). Idempotent and resumable.
- Diagrams sit in the existing Visual slot; do not disturb the Phase-A plate, the
  pedagogy widgets, or lesson prose.

## Out of scope

- Phase A plate (already shipped).
- Raster/AI-image generation.
- Interactive/animated diagrams beyond the existing `AlgoTrace` stepper.
- Per-lesson bespoke hand-illustration outside the kit's primitives.
