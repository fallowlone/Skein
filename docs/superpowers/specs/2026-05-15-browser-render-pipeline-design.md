# Design: browser/02-render-pipeline (EN + RU)

**Date:** 2026-05-15
**Pillar:** browser
**Piece order:** 2
**Status target:** stub → ready
**Angle:** Full-pipeline tour with bottleneck table

## Purpose

Convert `site/src/content/book/{en,ru}/browser/02-render-pipeline/index.mdx` from `status: stub` to `status: ready`. The piece teaches the six-stage browser render pipeline (HTML parse → CSSOM → style → layout → paint → composite), where time is spent at each stage, what invalidates each stage, and how to read a DevTools Performance flame strip to find the bottleneck. Depth bar: middle+/senior fullstack.

## Scope

In scope:

- Six pipeline stages with ownership (main thread vs compositor thread)
- Cost shape per stage (what makes it expensive, how to measure)
- Invalidation rules (what CSS property triggers what stage — CSS Triggers reference)
- Compositor layers, GPU offload, will-change tradeoffs
- Frame budget math (16.67ms breakdown) and how DevTools reports each stage
- Layout thrash (forced sync layout) as primary failure mode
- Two interactive practice scenarios (bottleneck triage + trace reading)

Out of scope (deliberately, to prevent piece bloat):

- Mobile compositor differences (Chromium variants)
- WebRender / Firefox-specific internals
- WebGPU paint path
- React Fiber details — lives in piece 05
- LCP / CLS / INP metrics — lives in piece 07
- V8 internals — lives in piece 03

## Architecture

Two MDX files, one per locale:

- `site/src/content/book/en/browser/02-render-pipeline/index.mdx`
- `site/src/content/book/ru/browser/02-render-pipeline/index.mdx`

Both follow the template established by `site/src/content/book/en/networking/03-tcp-handshake/index.mdx`:

```
frontmatter
imports (Crux, TierAccordion, FadedExample, RetrievalDrawer, NumbersCard,
         Misconception, KeyTakeaway, SpiralCue, PersonaTag, Quiz, DragOrder,
         TraceScenario, DebugLog, TradeoffMatrix, RFCQuiz, DesignPrompt)
opening narrative (2-3 paragraphs)
<Crux> (preserved from stub: "From bytes off the wire to pixels on screen — where does the time go?")
<TierAccordion id="pipe-stages">
  <Fragment slot="junior"> metaphor + quiz × 2 + DragOrder </Fragment>
  <Fragment slot="middle"> six stages + cost table + Quiz × 2 + TraceScenario </Fragment>
  <Fragment slot="senior"> compositor + thrash + DebugLog + TradeoffMatrix + RFCQuiz + DesignPrompt </Fragment>
</TierAccordion>
<Misconception id="mc-layout-thrash">
<NumbersCard id="card-frame-numbers">
<KeyTakeaway>
<SpiralCue thread="statefulness">
<RetrievalDrawer client:load>
Next/Prereqs cross-links
```

### Frontmatter shape

```yaml
slug: 02-render-pipeline
lang: en | ru
pillar: browser
chapter: 02-browser
order: 2
title: "Render pipeline: parse → CSSOM → layout → paint → composite"
summary: "Six pipeline stages, who owns each thread, what triggers each invalidation, and how to read a DevTools flame strip to find the bottleneck."
readingMin: 22
status: ready
prereqs: ["01-event-loop"]
spiral: ["statefulness", "encapsulation"]
personas: ["bea", "sven"]
depth:
  mechanism: pipe-stages
  tradeoff: card-composite-cost
  failure_mode: mc-layout-thrash
  numbers: card-frame-numbers
sources:
  - https://web.dev/articles/critical-rendering-path
  - https://developer.chrome.com/docs/devtools/performance/reference
  - https://developer.chrome.com/blog/inside-browser-part3
  - https://drafts.csswg.org/css-will-change/
  - https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work
  - https://csstriggers.com/
  - https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/
  - https://web.dev/articles/rendering-performance
```

### Content per tier

**Junior tier**

- Metaphor: cooking show analogy — pipeline of cook stations, the slow station decides plating time
- Six stages named in plain English (read the file → understand styles → measure boxes → fill in pixels → glue layers)
- Two quizzes: order of stages, which thread does the work
- DragOrder interactive: arrange six stage cards in correct order
- Read-aloud frame with personas (Bea + Sven) walking through one frame

**Middle tier**

- Six stages with formal names + cost shape table:

  | Stage         | Owner       | Cost driver                              | Measurement (DevTools) |
  | ------------- | ----------- | ---------------------------------------- | ---------------------- |
  | Parse HTML    | Main        | Document size, blocking scripts          | Parse HTML             |
  | Build CSSOM   | Main        | Stylesheet count + selector complexity   | Recalculate Style      |
  | Style calc    | Main        | DOM size × selector cost                 | Recalculate Style      |
  | Layout        | Main        | DOM depth × box dependencies             | Layout                 |
  | Paint         | Main        | Painted area × paint complexity          | Paint                  |
  | Composite     | Compositor  | Layer count × layer size (GPU)           | Composite Layers       |

- Two quizzes: CSS property → stage triggered (uses csstriggers data); thread ownership
- TraceScenario: given a DevTools flame strip screenshot description, pick the bottleneck stage

**Senior tier**

- Forced synchronous layout (layout thrash): JS reads `offsetWidth` after a write — browser must flush layout mid-frame
- Compositor layer creation rules (will-change, transform, opacity, position: fixed)
- will-change abuse: GPU memory budget, layer explosion, eviction
- Frame budget math: 16.67ms - browser overhead ≈ 10ms script + paint budget
- DebugLog: real "Forced reflow while executing JavaScript took XXms" warning trace, with the JS that caused it
- TradeoffMatrix `card-composite-cost`: animate a card pop — `top/left` vs `transform: translate` vs `transform + will-change` vs JS rAF + position. Correct: `transform` alone; `will-change` only when proven needed
- RFCQuiz: CSSOM spec / Will-Change spec milestone identification
- DesignPrompt: 60fps virtualised list scrolling 100k rows on mid-range hardware

### Interactive components (existing in repo, no new components needed)

- `TierAccordion` (Astro, no hydration)
- `Quiz`, `DragOrder`, `TraceScenario`, `DebugLog`, `TradeoffMatrix`, `RFCQuiz`, `DesignPrompt` (Astro, no hydration)
- `RetrievalDrawer` (Preact, `client:load`) — 2 senior recall questions
- `NumbersCard`, `Misconception`, `KeyTakeaway`, `Crux`, `SpiralCue`, `PersonaTag` (Astro)

Hydrated islands per page: **1** (`RetrievalDrawer`). Well under the cap of 5.

### Glossary updates

Likely new terms to add to `site/src/i18n/glossary.json` alphabetically (EN + RU parity):

- composite / композитинг
- compositor thread / поток композитора
- forced synchronous layout / форсированная синхронная компоновка
- layer / слой
- layout / компоновка
- layout thrash / каскадная перекомпоновка
- paint / отрисовка
- raster / растеризация
- reflow / переразметка
- repaint / перерисовка
- style recalc / пересчёт стилей
- will-change

Will check current glossary before adding to avoid duplicates.

## Data flow

User opens `/en/browser/02-render-pipeline/` (or `/ru/...`):

1. Astro reads MDX file from content collection
2. `Topic.astro` layout wraps with head, lang switch, sources footer
3. `Chapter.astro` adds sidebar TOC
4. MDX body renders inline (TierAccordion, NumbersCard, etc. are Astro components)
5. `RetrievalDrawer` hydrates on page load (one Preact island)
6. Lint runs at build time; report at `site/dist/lint-report.json`

No new runtime code, no new components, no new client scripts.

## Error handling

- Build fail (linter): inspect `site/dist/lint-report.json`, fix offending file, re-run
- MDX parse error: read error, find unbalanced JSX or stray Markdown inside JSX child
- Hydration cap exceeded: drop `client:*` to fewer islands; default is `client:load` on `RetrievalDrawer` only
- Word-count blow-up: trim sentence-by-sentence; preserve mechanism/tradeoff/failure/numbers signals

## Testing / Verification

Verifiable success criteria (must all hold before commit):

1. `cd site && bun run build` exits 0
2. `cat site/dist/lint-report.json` returns `{"errors":[],"warnings":[]}`
3. `site/src/content/book/en/browser/02-render-pipeline/index.mdx` frontmatter `status: ready`
4. `site/src/content/book/ru/browser/02-render-pipeline/index.mdx` frontmatter `status: ready`
5. Crux ≤ 140 chars (preserved from stub: 78 chars, fine)
6. KeyTakeaway ≤ 220 chars
7. Misconception ≤ 320 chars
8. Each `depth.*` ID matches an element `id` in the MDX body
9. Sources list contains ≥ 3 primary specs / vendor docs
10. New glossary terms appear alphabetically in `site/src/i18n/glossary.json` with EN + RU parity
11. Local browser smoke: `bun dev`, open both `/en/browser/02-render-pipeline/` and `/ru/browser/02-render-pipeline/`, confirm TierAccordion opens, RetrievalDrawer expands, no console errors
12. Visual: dark + light mode look correct, sidebar TOC shows piece active

## Commit plan

Single commit on `main`:

```
content(browser): 02-render-pipeline EN+RU ready
```

Body lists: stages covered, interactives added, glossary terms added.

## Risks

- **Risk:** Stage table grows beyond word budget. **Mitigation:** Keep table to 6 rows, ≤8 words per cell; move detail to senior tier prose.
- **Risk:** Compositor section drifts into Chromium internals. **Mitigation:** Stick to web-platform-visible behaviour (will-change, transform, layer creation triggers); cite Chromium blog but do not teach Blink internals.
- **Risk:** Overlap with piece 07 (Core Web Vitals). **Mitigation:** This piece teaches the mechanism (what each stage costs); piece 07 teaches the user-facing metric (LCP/CLS/INP). Cross-link, do not duplicate.
- **Risk:** Hydration cap regression if a new interactive is added with `client:load`. **Mitigation:** All interactives except `RetrievalDrawer` are Astro components; if any becomes Preact, switch to `client:visible`.

## Open questions

None. Pipeline well-defined by `/infographic` command. Sources cover all six stages. Interactives reuse existing components only.
