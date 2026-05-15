# Newspaper-style article layout — design

**Date:** 2026-05-15
**Status:** approved (brainstorm), pending implementation plan
**Scope:** the article reader (`Chapter.astro` + piece content), all 16 pillars

## Problem

Article bodies render as a single narrow column (`max-w-[760px]`, later
`880px`) centred in a wide grid cell. Dry prose dominates; visual elements
(diagrams, tables, number cards, code) stack vertically in the same narrow
measure and never sit *beside* the text they explain. The reader wants a
wider, editorial canvas where text is "diluted" with visual input — text and
visual on the same level.

The article **header** (breadcrumb, depth checkpoints, title block) is liked
as-is and does not change.

## Research basis

Web-typography research (NN/g, Butterick, WCAG, Smashing, Mayer's
multimedia-learning principles) drove two decisions:

1. **No multi-column body text on a scrolling page.** Newspaper columns work
   in print (fixed-height page); on a scrolling page the reader must scroll
   down column 1 then back up to column 2. Unpaired prose stays a **single
   column** at a comfortable measure.
2. **Text + visual side-by-side is endorsed.** Mayer's spatial-contiguity and
   dual-coding principles: a visual placed next to the explanatory text
   improves comprehension. The `<Pair>` component below is built on this.

Supporting numbers applied to the design: line length 55–75 chars; line
height 1.5–1.6; body font 17–18px for long-form; left-aligned only (no
justify); paragraph spacing ~0.75–1.0× line-height.

## Layout model

The article body becomes a **wide canvas** — it fills the full width of the
grid centre cell (~1000px) instead of a centred 880px column. Sidebars
(ChapterSidebar, PieceTOC) are unchanged.

Inside the canvas, content is one of three things:

| Content | Width / placement |
|---|---|
| Unpaired prose (`<p>`, lists) | single column, left-aligned, measure ≈ 36rem (~7/12). Right ~5/12 is whitespace. |
| `<Pair>` row | full canvas width: text 7/12 + visual 5/12 (or flipped) |
| Standalone visual / widget / code / table / heading | full canvas width |

There is one consistent **left text edge**: unpaired prose and the text side
of a `<Pair>` start at the same x. The width is consumed by *visuals*, never
by stretching text lines.

## The `<Pair>` component

New Astro component: `site/src/components/layout/Pair.astro`.

```mdx
<Pair>
  <Fragment slot="text">
    Markdown prose explaining the concept...
  </Fragment>
  <ReactiveDiagram ... />
</Pair>

<Pair flip>
  <Fragment slot="text">...</Fragment>
  <NumbersCard ... />
</Pair>
```

- **`text` slot** — a `Fragment` holding markdown prose (the 7/12 side).
- **default slot** — exactly one visual component (the 5/12 side).
- **`flip`** prop — visual on the left, text on the right. Used to alternate
  rhythm down the page.
- Renders as a flex row, `align-items: flex-start` (top-aligned). `gap`
  matches the grid gutter.
- Below the mobile breakpoint the row stacks vertically: text then visual.

**`wide` is dropped.** A full-width visual is simply a visual component placed
directly in the MDX flow (not inside `<Pair>`) — standalone visuals already
span the full canvas. No extra attribute needed. (Refinement vs. the
brainstorm sketch; flag at spec review if the author wants an explicit
text-then-wide-visual pairing.)

## Files touched

- **`src/layouts/Chapter.astro`** — drop `max-w-[880px] mx-auto` on
  `<article>`; article fills the grid centre cell. Grid `260 / 1fr / 260`
  stays.
- **`src/components/layout/Pair.astro`** — new component.
- **`src/styles/global.css`** — prose rules:
  - `article p:not([class])`, lists: `max-width` ≈ 36rem, left-aligned,
    `line-height` 1.6, paragraph `margin-block` (already added — keep).
  - body/prose font-size raised to ~17.5px (currently inherits 16px).
  - `Pair` flex layout + mobile stacking (component-scoped or utility).
- Standalone visual components keep a sensible internal `max-width` ceiling so
  they are not grotesquely stretched at ~1000px when used outside a `<Pair>`.

## TierAccordion interaction

Most piece content lives inside `[data-tier-panel]` slots. The single-column
measure rule and `<Pair>` both work unchanged inside tier panels — the prose
`max-width` rule already targets descendants, and `<Pair>` is an ordinary
flex block. No TierAccordion change required.

## Text-length limits

Per project direction (reader controls volume via depth tiers, see memory
`no-text-limits`): remove the `max` ceilings from the `tier-word-budgets`
lint rule. Keep the `min` floors (catch empty tiers). Update
`tier-word-budgets.test.ts` accordingly.

Component text caps in `/infographic` (Crux ≤140, KeyTakeaway ≤220,
Misconception ≤320, Card annot ≤240) are **layout-protective**, not content
limits — they are kept. Flag at spec review if the author wants them gone too.

## Scope and rollout

- **This work:** build `<Pair>`, the CSS/layout changes, font bump, lint
  change. The layout change is global and immediate — every existing piece
  instantly renders as single-column prose + full-width standalone visuals.
  That is coherent (it is the new layout minus explicit pairing), not broken.
- **Later (separate task):** retrofit the 4 finished chapters — wrap existing
  text+visual neighbours in `<Pair>` for the side-by-side effect.
- **`/infographic`:** the command's authoring template gains `<Pair>` so new
  pieces are paired from the start. Template/doc update is part of this work.

## Mobile

Below the `lg` breakpoint: canvas is full width, `<Pair>` stacks (text then
visual), prose `max-width` relaxes to 100%. Sidebars already collapse.

## Testing

- `bun run build` — 301 pages, lint clean (with the relaxed budgets).
- `tier-word-budgets.test.ts` updated and green.
- Visual check: a piece with `<Pair>`, `<Pair flip>`, a standalone wide
  visual, and a long unpaired prose run — EN and RU, light and dark, desktop
  and mobile widths.

## Open questions for spec review

1. Drop `wide` as described, or keep an explicit text-then-wide-visual pair?
2. Keep `/infographic` component text caps, or remove those too?
3. Exact body font size — 17.5px proposed; confirm.
