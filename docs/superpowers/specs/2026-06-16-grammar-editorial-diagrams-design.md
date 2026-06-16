# Design — Grammar Editorial Diagrams (SVG)

Date: 2026-06-16
Status: approved (brainstorming) → writing-plans next

## Problem

Grammar topic pages render their diagram via `GrammarAnimation` (a `lottie-web` island) fed a Lottie JSON built by `src/english/animations/builder.ts` (9 archetype scenes). The current output is flat and generic — a plain near-white card with evenly spaced dots on a straight axis (the `axisScene` "timeline"). The user wants the **editorial-paper** treatment (reference image #8): paper-grid plate, monospace genre label (`PRESENT PERFECT`), a formula strip (`have + V3`), line-art geometry (dashed retrospective arc, hollow "past" node, filled "now" node with a vertical drop-line, a time-axis with an arrowhead and PAST·NOW·FUTURE ticks), a serif hero word, and a caption — applied across **all 9 archetypes**, not just timeline.

## Key finding — full fidelity needs NO new authoring

The new corpus type `GrammarTopic` (122 topics under `src/english/data/grammar/<topic>.ts`) already carries every datum #8 needs:

| #8 element | Existing source |
|---|---|
| Genre label (`PRESENT PERFECT`) | `topic.title[lang]` |
| Formula strip (`have + V3`) | `topic.lessons[level].structure[lang]` (e.g. `"subject + have/has + past participle"`) |
| Serif hero word + caption | `topic.lessons[level].examples[0]` (`.en`/`.ru` + `.note[lang]`) |
| Axis ticks / nodes | `topic.archetypeParams.labels` (and `items`) |

So the rich design generalizes to every topic from data already committed. No corpus authoring pass.

## Decisions (locked in brainstorming)

1. **Render tech: SVG/CSS Preact component, replacing Lottie for grammar diagrams.** Editorial line-art is a natural SVG fit (crisp grid, dashed strokes, arrowheads, real web typography, CSS draw-on animation). Removing `lottie-web` from the grammar path also trims client JS on a route family that currently scores Perf 77 (ties to [[project_performance-pass-2026-06-16]]).
2. **Scope: all 9 archetypes** re-skinned to one editorial visual language.
3. **Fidelity: full #8, generic, from existing data** (table above).
4. **Arc by semantics, not blanket.** A retrospective arc (past→now) is correct only for perfect/aspect families. Timeline topics whose `labels` are a sequence (`before/when/while/after/until`) get a straight editorial axis with ticks + a traveling marker. The renderer chooses arc vs flat from `family` + label count.

## Architecture

**Units & boundaries:**

- `src/english/animations/editorial/scene-types.ts` — pure data model for an editorial scene: a discriminated union of primitives (`axis`, `arc`, `node` {hollow|filled}, `dropLine`, `label`, `tick`, `chip`, `arrow`, `divider`, `pulse`, `hero`, `formula`, `genre`, `caption`) with viewBox coords. No JSX, no DOM. Unit-testable.
- `src/english/animations/editorial/build-scene.ts` — one builder per archetype (`buildTimelineScene`, `buildContrastScene`, … 9 total) returning a `Scene`. Input is a normalized `DiagramInput` (genre, formula, hero, caption, labels/items, family). Pure functions; the heart of the unit tests (geometry + arc-vs-flat decision).
- `src/english/animations/editorial/diagram-input.ts` — adapter: `toDiagramInput(topic, lang)` pulls `title`/`structure`/`examples`/`archetypeParams` from a `GrammarTopic`, picking the entry level (`topic.levels[0]`/`topic.cefr`). Hero = first content token of `examples[0][lang]` (or `archetypeParams.hero` if later added); caption = `examples[0].note[lang]` else a short gloss. Empty-safe (every field optional → sensible fallback, never throws).
- `src/components/english/GrammarDiagram.tsx` — Preact island. Renders a `Scene` to SVG (800×450 viewBox), honoring `reducedMotion` (holds final frame; no draw animation). CSS module for the editorial tokens + keyframes (`stroke-dashoffset` draw, opacity/scale reveal). Replaces `GrammarAnimation` as the figure body.
- `src/english/animations/archetype-map.ts` — keep as the archetype→builder dispatch, but point at the editorial `build-scene` builders instead of the Lottie `builder.ts` scenes. `resolveAnimation` returns a `Scene` factory.
- `GrammarTopic.tsx` — swap `<GrammarAnimation doc=…/>` for `<GrammarDiagram scene=… reducedMotion=… lang=…/>` inside the existing `<figure class="plate">`. Plate chrome (grid frame, caption footer) stays; the editorial paper-grid background moves into the plate frame / SVG so it matches #8.

**Retired:** `builder.ts` Lottie scenes, `lottie-types.ts`, the `GrammarAnimation` Lottie island, and (if no other consumer) the `lottie-web` dependency. Removal of the dep is gated on confirming grammar is its only consumer; otherwise keep the dep but drop it from the grammar bundle.

**Visual language (editorial tokens):** paper background + faint grid (Atlas palette: ink `#1a1916`, paper `#f3eee2`, accent blue, muted line), monospace for genre/labels/footer, serif for the hero word, dashed accent stroke for the retrospective arc, solid thin axis with a triangle arrowhead, hollow node = `fill:none;stroke:accent`, filled node = `fill:accent`. One CSS module so the whole set restyles in one place (mirrors the current single-palette `tokens.ts`).

## Per-archetype editorial layout

- **timeline** — genre + formula strip top; time-axis with arrowhead + PAST·NOW·FUTURE (or `labels`) ticks; perfect families add the dashed past→now arc + hollow-past/filled-now + drop-line + serif hero + caption; sequence families get evenly-ticked axis + traveling marker.
- **contrast-pair** — two framed cells + center divider; left accent / right warn; genre + formula above.
- **transformation** — source chip → arrowhead → result chip on a baseline.
- **scale** — stacked/nested framed levels growing upward.
- **branch** — root node forking to N labelled branches via connectors.
- **swap** — two chips trading positions (CSS slide; reduced-motion = final state).
- **map** — two-column paired rows joined by thin connectors.
- **highlight** — token row with one token emphasized by a pulsing underline.
- **slot-fill** — labelled slots on a frame, one drawn as an empty (hollow) slot to be filled.

All share the plate, genre label, formula strip (when `structure` exists), and footer.

## Animation & reduced motion

CSS-only: axis/arc draw via `stroke-dashoffset` 1→0; nodes/labels fade+scale in with small stagger. `reducedMotion` (already threaded from user-state) renders the final composed frame with no keyframes. No JS animation library on the page.

## Verification

- Unit tests on `build-scene` (geometry bounds within viewBox; arc-vs-flat decision per family/label-count; empty-input fallbacks) and `diagram-input` (field extraction + fallbacks). Vitest, no `astro:content`.
- Build green (`bun run build`, ~5777pp, lint 0/0); per-locale parity unaffected (diagram text is data-driven from the same topic).
- Visual check EN + RU on `/en/english/grammar/present-perfect-simple` (arc case) and a sequence-timeline topic (flat case) + one of each other archetype family.
- Confirm `lottie-web` is gone from the grammar route's client JS (network/treemap), or dep retained only if another consumer exists.

## Out of scope

- New corpus authoring / new schema fields (full fidelity comes from existing data; a dedicated `archetypeParams.hero`/`formula` override is a later nicety, not required).
- Non-grammar Lottie usage (none expected; verify).
- The broader Performance pass ([[project_performance-pass-2026-06-16]]) — this only contributes the lottie-web removal.

## Risks

- **Arc misapplied** to a non-retrospective timeline → mitigated by the family/label-count decision rule, covered by a unit test.
- **lottie-web shared** by another component → verify before removing the dep; fall back to keeping the dep.
- **Hero-word extraction** from a full example sentence may read oddly → fallback to genre/short label; keep hero optional per archetype.
- **Scope creep** (9 archetypes) → plan sequences timeline first (pilot, validates tokens + animation + data adapter), then the other 8 in batches.
