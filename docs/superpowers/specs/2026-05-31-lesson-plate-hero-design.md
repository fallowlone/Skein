# Lesson Plate Hero (A2) — Design

**Date:** 2026-05-31
**Status:** Approved (brainstorm), pending implementation plan
**Branch:** `lesson-plate-hero` (off `main`)
**Scope:** Visual polish — a designed header "plate" at the top of every lesson.

## Goal

Give every lesson a pleasant, on-brand designed header. Today lesson pages open
with a plain text header (`kicker → h1 → crux → level gauge → minutes`); only the
`algo/` track has any figures. This adds a **designed title-plate** (option "A2"
from the brainstorm) rendered for **all 1279 lessons** with zero per-lesson MDX
edits, by upgrading the shared lesson layout.

This is **Phase A** of the lesson-visuals effort. **Phase B** (concept-explaining
diagrams, per-lesson) is a separate spec/plan written afterward — out of scope here.

## Design direction (locked, picked from rendered candidates)

Editorial-cartographic, matching the Atlas redesign: paper/ink, single quiet
ink-blue accent, Fraunces display + Inter Tight body + JetBrains Mono labels,
domain-hue accent per track, topographic "contour" motif (the kit already has
`.contour-field`), a route-node dot. **A2 = a designed title-plate** (a bordered
card that IS the lesson header), chosen over A3 (a generative map-tile). The
contour background is static/uniform (not seeded) — consistency over novelty.

## Placement & data flow

- One route, `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`, renders every
  lesson through `src/layouts/Lesson.astro`. Adding the plate to that layout covers
  all 1279 lessons automatically — **no MDX edits**.
- `LessonPlate.astro` **replaces** the existing `<header class="lesson-head">` block
  (Lesson.astro lines ~117–130: `.lesson-kicker`, `.lesson-title`, `.lesson-crux`,
  `.hdr-meta`). The `<AltitudeGauge>` (level scale) is **kept**, rendered directly
  after the plate — pedagogy untouched.
- All data comes from frontmatter already passed into `Lesson.astro`:
  `title`, `summary` (→ crux line), `trackSlug`, `unitSlug`, `order`, `level?`,
  `estMin`, `lang`, plus `trackTitle` (already resolved in Lesson.astro).
- The unit's order number (for the coordinate) is resolved build-time from the
  `units` collection by `(track, unitSlug)`; Lesson.astro already imports
  `getCollection`.

## Components

### `src/scripts/track-meta.ts` (pure, tested)

- `TRACK_ABBR: Record<Track, string>` — 3-letter codes for the coordinate:
  `networking→NET, databases→DB, security→SEC, frontend→FE, backend→BE,
  apis→API, caching→CACHE, distributed→DIST, observability→OBS,
  performance→PERF, ai-llm→AI, data-engineering→DATA, deployment→DEP,
  queues→QUE, browser→WEB, math→MTH, algorithms→ALG, base-cs→CS,
  engineering-practice→ENG`. (`Track` is the enum in `content.config.ts`.)
- `DOMAIN_HUE: Record<TrackColor, string>` — reuse the existing mapping used by
  the home/learn cards: `lilac→var(--d-network)`, `mint→var(--d-data)`,
  `peach→var(--d-frontend)`, `sky→var(--d-backend)`, `rose→var(--d-ai)`.
- `coord(abbr: string, unitOrder: number, lessonOrder: number): string` →
  `"NET · 03 · 02"` (two-digit zero-pad; falls back to the lesson order when
  `unitOrder` is missing).

### `src/components/lesson/LessonPlate.astro`

Props: `{ title, summary, trackTitle, abbr, hue, unitOrder, order, level?, estMin, lang }`.

Markup (the A2 plate):
```astro
<article class="lesson-plate" style={`--d: ${hue};`}>
  <div class="lp-contour" aria-hidden="true"></div>
  <svg class="lp-rings" viewBox="0 0 300 300" aria-hidden="true">…concentric circles…</svg>
  <span class="lp-node" aria-hidden="true"></span>
  <div class="lp-body">
    <div class="lp-top">
      <span class="lesson-kicker">{trackTitle}</span>
      <span class="lp-coord">{coord(abbr, unitOrder, order)}</span>
    </div>
    <h1 class="lesson-title">{title}</h1>
    <p class="lesson-crux">{summary}</p>
    <div class="lp-meta">
      <span class="domain-tag"><span class="sq"></span>{trackTitle}</span>
      {level && <span class="lp-chip">{t(`lesson.altitude.${level}`, lang)}</span>}
      <span class="lp-chip">◷ {estMin} min</span>
    </div>
  </div>
</article>
```

- The `<h1 class="lesson-title">` stays the single page `h1` (SEO/a11y unchanged).
- Decorative SVG/contour/node are `aria-hidden`.
- No hydration island (static Astro). No raster images, no external files.

### Styles — `src/styles/lesson-kit.css`

New `.lesson-plate` family. All colors via tokens (theme-aware, no raw palette):
- card bg `var(--card)`, `0.5px solid var(--hairline-2)`, **`border-left: 2.5px solid var(--d)`**, `border-radius: var(--r-md)`, `overflow: hidden`, generous padding.
- `.lp-contour` — the two-gradient grid (like `.contour-field`) masked to fade from a top-right radial; low opacity.
- `.lp-rings` — concentric circles, `color: var(--d)`, ~0.2 opacity, positioned top-right, clipped by `overflow:hidden`.
- `.lp-node` — domain-hue dot with a soft ring glow, top-right.
- `.lp-coord` — mono, `var(--faint)`; `.lesson-kicker` reused as-is.
- `.lesson-title` — Fraunces, `clamp(30px,4.5vw,40px)`, `max-width: 18ch`, tight line-height.
- `.lesson-crux` — Fraunces, `var(--muted)`, `max-width: 46ch`.
- `.lp-chip` — mono, hairline border, `var(--muted)`.
- Mobile (≤640px): reduce padding, drop the rings or shrink, title `clamp` floor.

## Lesson.astro wiring

- Import `LessonPlate` + the helper; import `getCollection("units")` (already imports getCollection) to find `unitOrder`.
- Pass `order` through from the route (`[lesson].astro` already has `entry.data.order` — add it to the `<Lesson … order={entry.data.order} />` props and to the `Props` type).
- Replace the `<header class="lesson-head">…</header>` block with:
  ```astro
  <LessonPlate
    title={title} summary={summary} trackTitle={trackTitle}
    abbr={TRACK_ABBR[trackSlug]} hue={DOMAIN_HUE[trackColor]}
    unitOrder={unitOrder} order={order} level={level} estMin={estMin} lang={lang}
  />
  <AltitudeGauge lang={lang} level={level} />
  ```
- `trackColor` comes from `trackEntry.data.color` (already resolved for the
  breadcrumb). `unitOrder` from the units lookup.

## Edge cases

- Long title (≤120 chars) — clamps + wraps; plate `overflow:hidden` keeps the
  contour/rings contained.
- `level` absent → no level chip.
- `lessonType` (concept/coding/topic) — identical plate; type does not change it.
- RU — `title`/`summary` are already per-language (separate files); the coordinate
  is language-neutral.
- `unitOrder` lookup miss → `coord` falls back to the lesson order; never throws.
- Foundations (math/algorithms/base-cs) and pillar lessons — same plate everywhere.

## Testing

- **Unit (vitest):** `track-meta.test.ts` — `coord()` formatting + zero-pad +
  fallback; `TRACK_ABBR` has an entry for every value of the `Track` enum;
  `DOMAIN_HUE` covers all 5 colors.
- **Build gate:** `bun run build` — page count unchanged (3976), 0 lint errors,
  warnings unchanged.
- **Visual:** screenshot ~4 lessons (networking, databases, algorithms, a coding
  lesson) in light + dark + mobile 390px. Confirm the plate replaced the old
  header (no duplicate kicker/title), `AltitudeGauge` still renders below, no
  horizontal overflow, domain hue differs per track.

## Rollout

Phase A ships in a single PR — the layout change applies to all lessons at once;
no content batches. After it lands, write the **Phase B** spec/plan (per-lesson
concept diagrams), which is a much larger, batched content effort.

## Out of scope (Phase B and beyond)

- Concept-explaining inline diagrams per lesson (separate spec/plan).
- Generative/seeded per-lesson tile (A3) — rejected for A.
- AI-generated raster imagery.
- Changes to the lesson body, pedagogy widgets, or the `algo/` figures.
