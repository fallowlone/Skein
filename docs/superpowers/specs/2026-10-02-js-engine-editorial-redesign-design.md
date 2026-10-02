# js-engine editorial redesign — design spec

**Date:** 2026-10-02
**Status:** approved (design), awaiting implementation plan
**Scope:** `js-engine` track (10 units, 41 lessons, EN+RU) + shared lesson shell
**Mission:** an illustrated, interactive technical publication for software engineers — Medium page composition, Making Software schematic craft, Skein progression UX. Not an LMS, not a dashboard, not a card collection, not an AI-infographic site.

## Repository findings (inspected 2026-10-02)

- 41 lessons / 10 units, EN+RU complete (42 dirty lesson files in tree).
- `src/components/schematic/` already contains real mechanism explanations in the target visual language: `InlineCacheFig` (Tier-A canvas, semantic tones, hairline strokes, mono `MachineValue`s, EN/RU copy tables, responsive collapse), plus `AstStructureFig`, `ShapeTransitionFig`, `ShapeMigrationFig`, `MapAnatomyFig`, `TaggedValueFig`, `NumericStorageFig`, `DeoptFrameFig`, `OsrFrameFig`, `EventLoopTurnFig`, `IgnitionBytecodeFig`, `InterpreterDispatchFig`, `LazyParseFig`, `JsEngineHeapSpacesFig`, `CageAddressFig`, `TwoVsThreeFig`, `StatefulEndpointFig`, `MetaphorMappingFig`, `HandshakeLatencyFig`, `InteractiveHandshakeFig`.
- `SkeinFigure` provides the width system: `data-span` reading (680) / learning (840) / canvas (1120), `data-lesson-visual`, figure head with `FIG. N` + category + scope label.
- `Lesson.astro` (uncommitted work in tree) has `editorialLessonKeys` — a 13-key allowlist gating an editorial header vs. the legacy LMS chrome (`LessonPlate` + `AltitudeGauge` + `PrereqLinks` + `ConceptMastery` + `MasteryLoop` + `ReturningLearner` + pre-unit check).
- 28/41 lessons embed `AlgoPoster` (304 + 1076 LOC): cream `#f6ecd2` background, 3px black borders, hard drop shadows, mono-everywhere, badges/minis — the exact "AI-generated infographic" look the mission bans.
- `scripts/shoot-batch.mjs` already targets the 5-lesson reference batch at 1440/1280/390.
- Existing tests: `src/components/diagram/editorial-diagram.test.tsx`, `flow-layout.test.ts`; lint gates in `bun run build`.

**Conclusion:** the design-system skeleton exists and much of it meets the bar. The redesign is: finish the shell, fix the poster problem, fill the two missing interactive Tier-A figures, prove it visually.

## Design decisions (approved)

### 1. Editorial shell for all 41 lessons

- Drop the `editorialLessonKeys` allowlist. `isEditorialLesson` becomes true for every lesson (the flag stays as a hook for non-editorial tracks like `foundations`, which keep their own skeletons).
- Editorial header is the only intro: kicker (`JAVASCRIPT ENGINE · UNIT 03 · LESSON 04 · 15 MIN`) → serif H1 → deck → one quiet meta line (Skein Curriculum · level · min read · prerequisite link).
- LMS chrome relocates: `AltitudeGauge`, `ConceptMastery`, `MasteryLoop`, `ReturningLearner` move out of the pre-article position; prereqs collapse into the meta line; concepts/level/prereqs collect into a compact expandable **Lesson Context** `<details>` at lesson end (reuses `lk-inset` pattern). Pre-unit check nudge moves with it.
- RightRail stays — quiet TOC, low-contrast inactive items, no card chrome.
- Target: zero learning-system elements before the first `<Hook>` paragraph.

### 2. Typography & width system

- Reading 680px / learning 840px / canvas 1120px via existing `SkeinFigure` spans; canvas rare (Tier A only).
- Serif display (`--font-display`) for H1/H2/editorial statements; sans body 17px/1.72 (bump from 16.5px); mono only for machine values, bytecode, offsets, state names.
- No new fonts. No card soup: spacing/hairline/typography before borders.

### 3. Per-lesson visual audit (5 reference lessons)

| Lesson | Visual problem | Decision |
|---|---|---|
| `01-how-js-runs/01-source-to-ast` | STRUCTURE | KEEP `AstStructureFig`; REMOVE AlgoPoster (redundant with the real AST schematic) |
| `03-hidden-classes/01-shapes-and-maps` | TRANSFORMATION | KEEP `MapAnatomyFig` + `ShapeTransitionFig`; REPLACE AlgoPoster with a quiet Tier-C recap strip at lesson end (recall value, not mechanism) |
| `03-hidden-classes/04-inline-caches` | STATE | KEEP `InlineCacheFig` (Tier A, canvas); REPLACE AlgoPoster with new **interactive IC-state stepper** (monomorphic → polymorphic → megamorphic; step-through shows how observation history changes the feedback slot) |
| `04-the-jit/05-deoptimization` | CAUSALITY | KEEP `DeoptFrameFig`; REPLACE AlgoPoster with the existing schematic + a compact guard-fail→deopt→reconstruct sequence at learning width |
| `07-async-deep/01-event-loop-recap` | EXECUTION + INTERACTION | KEEP `EventLoopTurnFig`; REPLACE AlgoPoster with new **predict-then-run event-loop stepper** (PREDICT what runs next → step → observe microtask ordering) |

AlgoPoster components are removed from MDX embeds in these 5 lessons; the `AlgoPoster.tsx` component itself stays in the tree (other tracks still reference it — removal from js-engine only, per mission scope).

### 4. Two new interactive Tier-A figures

- **ICStateStepper** (`src/components/schematic/ICStateStepper.astro`): server-rendered SVG/HTML states + small progressive-enhancement script (semantic buttons: Step / Reset; `<details>`-fallback static state). Shows one access site, three observed receiver maps, the feedback slot evolving. Causality: observation → slot update → state label change. No new island beyond the existing hydration cap (5/lesson); counts as one island max.
- **EventLoopPredict** (`src/components/schematic/EventLoopPredict.astro`): call stack / microtask queue / task queue lanes; PREDICT → RUN reveals execution order step by step; microtask drain before next task is the teaching point. Same progressive-enhancement pattern.
- Both: keyboard navigable, visible focus, `prefers-reduced-motion` respected, non-color state cues (labels + shape, not color alone), readable no-JS state (initial frame is the full explanation, interaction replays it).

### 5. EN/RU

Copy tables per component (existing `InlineCacheFig` pattern). RU is a first-class translation, not a patch: longer Russian titles checked at 1440/390, no font-size shrinking to fix wrapping.

### 6. Verification

Per lesson: `bun run build` (lint-report clean) → `astro preview` → `node scripts/shoot-batch.mjs <tag> 1440 1280 390` → inspect PNGs → refine. End of batch: EN/RU parity lint, `git diff --check`, full build, unit tests. Visual review is the gate — passing tests ≠ finished.

### 7. Repository safety

1300 dirty files in tree (unrelated in-flight work). No `git add -A`; no reset. Stage only files this work touches. No commit until explicitly requested.

## Out of scope (later batches)

The other 36 js-engine lessons (poster audits + schematic upgrades), AlgoPoster outside js-engine, `functions/`, networking track.

## Success bar (per lesson)

1. Diagrams removed → still a premium editorial article.
2. Content reachable immediately; title editorial, not in a dashboard card.
3. The difficult concept is easier because of the specific visual.
4. Diagram feels handcrafted; semantic color restrained; machine info visually distinct.
5. Interaction explains causality.
6. RU equally intentional; mobile preserves comprehension; accessibility survives.
