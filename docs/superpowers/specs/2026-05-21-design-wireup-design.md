# open-atlas — design wire-up to production routes

**Status:** spec, awaiting implementation
**Date:** 2026-05-21
**Branch target:** `design-wireup` (off `main`)

## Why

The open-atlas redesign (cosmic ascent / light editorial reading shell) was
prototyped end-to-end as two standalone preview routes:

- `site/src/pages/topic-preview.astro` — full ascent scroll-scene (dark cosmic)
- `site/src/pages/lesson-preview.astro` — reading shell (light editorial)

The previews are self-contained: they write their own `<html>`, hard-code a
sample topic (networking) and a sample lesson (TCP handshake), and never touch
the content collections. They proved the visual + interaction design, but the
live production routes — `[lang]/index.astro` (home), `[lang]/learn/[track]/`
(track index), and `Lesson.astro` (reading layout) — still use the old design
(`Topic.astro` + `PillarGrid` + `HeroBlock` + `SpiralThreadsIndex`).

This spec wires the new design into those production routes against real data
(19 tracks, 132 units, ~600 lessons across two languages) without breaking the
content collections, the linter, the glossary routes, or the build.

## Non-goals (locked, not relitigated)

These were locked by `docs/open-atlas/HANDOFF.md` and prior decisions; this spec
inherits them without re-opening:

- Direction law: zero at bottom, senior at top; scroll down → camera rises.
- Two zones: dark cosmic for home + topic ascent; light editorial for lesson
  reading + glossary.
- No gamification: no XP, streaks, hearts, mascot. Engagement = explorable
  explanations.
- Teal accent `#1FBFA8` / `#2fd6bd`. 19th-century star-atlas aesthetic.
- `ConnectedLessons` block (already shipped) stays on the lesson shell.
- `glossary/*` routes are **not** modified; they shipped separately on the new
  design.
- No MDX lesson content is modified. Migration is complete; this is a
  presentation-layer task.
- Lesson-page hydration cap = 5 islands.
- All component imports via the `~/` alias; no `..` relative segments.

## Decisions made during this brainstorm

1. **Marker granularity (topic ascent)** — **hybrid (unit markers + nested
   lesson sub-rows).** Each unit is a marker on the meridian; lessons appear as
   sub-rows under the unit. Preserves the preview's compact cosmic rhythm
   (8–12 markers per track) and scales identically from `ai-llm` (8 lessons)
   to `networking` (76 lessons).
2. **Home spatial model** — **static cosmic backdrop, tracks reveal in bands as
   the user scrolls; no scroll-driven camera flight on home.** Parallax camera
   is reserved for the topic page. Home is a star-chart you walk down; the
   topic page is a flight up through it.
3. **Resume CTA (topic header)** — **localStorage last-visited per track.**
   Continuity, not gamification: `localStorage.getItem("atlas.last.{track}")`
   tracks the last lesson the reader opened on that track. First visit shows
   "Start here → lesson 1"; returning visit shows "Resume · {savedLesson}".
4. **Summit "Unlocks above"** — **auto-link to next track by `order + 1`.**
   Uses the existing `tracks.json` order field. The last track (engineering
   practice, order 19) shows only "Back to atlas".
5. **Level bands on topic page** — **dropped.** With unit markers (decision 1),
   the unit *is* the visual band. The altimeter on the left edge carries the
   altitude metaphor; no separate zero/junior/middle/senior band-headers.
6. **Lesson body typography** — **port the preview's CSS into a `.lesson-body`
   scoped style block inside `Lesson.astro`.** Targets `h2`, `p`, `code`,
   `figure`, etc. Does not touch prose component internals
   (`Inset`/`WorkedExample`/`Hook`/`Goal`/`Recap`/`Check`).

## Architecture

### New layout

`site/src/layouts/Atlas.astro` — dark-cosmic chrome.

- Own `<html>` + `<head>` (matches preview pattern).
- Theme-independent body color (cosmic stays cosmic regardless of user theme
  preference; the existing `ThemeBoot` is intentionally omitted).
- No `SourcesFooter`, no `SpacedRevisitBanner`, no `KeyboardShortcuts`,
  no `Toast`, no glossary-tooltip script (those live on `Topic.astro` for the
  light reading zone where they belong).
- Slot for the page body.
- Top nav (logo + atlas / about / contribute) shared across home and topic
  routes.
- `LangSwitch` lives in the nav for parity with the existing `Topic.astro`.

`Topic.astro` is **not** modified. It continues to be the layout for
`Lesson.astro` and the existing glossary routes.

### Atlas primitives — `site/src/components/atlas/`

- `World.astro` — fixed-position 400vh strip with four zones (space / sky /
  grass / underground). Deterministic decorative content: starfield, soft
  clouds, grass blades, mineral veins. Single prop: `parallax: boolean`.
  - `parallax: false` (home) — world renders fixed at `translateY(0)` and
    stays put; bands scroll over it.
  - `parallax: true` (topic page) — `<script is:inline>` couples
    `world-strip.transform` to `scrollY / (scrollHeight - innerHeight)`,
    flying the camera from -300vh (underground) to 0 (orbit). Respects
    `motionEnabled()` from `~/scripts/motion-flag`.
- `Constellation.astro` — SVG generator for a named star group. Inputs: `seed`
  (deterministic RNG), `count`, `inset`. Renders points + lines as decorative
  background art. On the topic page, a track-specific constellation sits in
  the space zone (Nexus for networking, etc.). On the home page, multiple
  small decorative constellations dot the starfield.
- `Meridian.astro` — vertical 2px rope. Single prop: `fill: boolean`.
  - `fill: false` (home) — static rope, no scroll coupling.
  - `fill: true` (topic page) — `rope-fill span` height grows with scroll
    progress, mirroring the altimeter.
- `Altimeter.astro` — fixed-position altitude gauge at left edge. Used by the
  topic page only. Hidden via `@media (max-width: 880px)`. Tick marks for
  Orbit / Sky / Surface / Underground; the teal dot rides scroll progress.
- `TopNav.astro` — dark-zone top header. Replaces `TitleBar` on dark routes.

### Removed components

Deleted **only after T1 verifies** the new home does not import them:

- `site/src/components/nav/PillarGrid.astro`
- `site/src/components/nav/SpiralThreadsIndex.astro`
- `site/src/components/brand/HeroBlock.astro`

Verified: the sole production importer is `site/src/pages/[lang]/index.astro`
(grep result excluded `graphify-out/cache/ast/*.json` build artifacts).

## Tasks

Each task is one PR-style commit. Build must lint 0/0 between commits.

### T1 — cosmic home on `[lang]/index.astro`

**Files added:**

- `site/src/layouts/Atlas.astro`
- `site/src/components/atlas/World.astro`
- `site/src/components/atlas/Constellation.astro`
- `site/src/components/atlas/Meridian.astro`
- `site/src/components/atlas/TopNav.astro`

**Files changed:**

- `site/src/pages/[lang]/index.astro` — rewritten.

**Files deleted:**

- `site/src/components/nav/PillarGrid.astro`
- `site/src/components/nav/SpiralThreadsIndex.astro`
- `site/src/components/brand/HeroBlock.astro`

**Home composition:**

```
<Atlas lang={lang}>
  <World parallax={false} />
  <Constellation seed=0xATLAS slot="space-decor" />
  <Meridian />
  <main class="home">
    <HomeHeader />                          (kicker, title, scroll cue)
    <Band id="advanced">                    (ai-llm, data-engineering, deployment,
                                             performance, engineering-practice)
    <Band id="middle">                      (distributed, observability, security)
    <Band id="surface">                     (networking, browser, frontend, backend,
                                             apis, databases, caching, queues)
    <Band id="foundations">                 (math, base-cs, algorithms)
  </main>
</Atlas>
```

DOM order is senior at the top, zero at the bottom — direction law.

**Data flow:**

1. `getCollection("tracks")` returns all 19 entries.
2. A single static `TRACK_BAND` map in `[lang]/index.astro`
   (`Record<TrackSlug, "foundations" | "surface" | "middle" | "advanced">`)
   assigns each track to one band. This is the source of truth for "which
   altitude does each track live at"; if a new track is added later, the
   linter does not gate it but the file will fail TypeScript narrowing.
3. `getCollection("units")` is reduced once to a per-track lesson count.
4. Each track row links to `/{lang}/learn/{track.slug}/` with
   `track.data.title[lang]` and `track.data.blurb[lang]`.

**Verification:**

- `cd site && bun run build` → lint 0/0, page count unchanged (only the home
  changed; lesson and glossary pages are unaffected).
- Manual: open `http://localhost:4400/en/` and `/ru/` via the `atlas-preview`
  server. Verify direction law (foundations at bottom of DOM, advanced at
  top), 19 tracks visible, click on a foundations track lands at its track
  page.

**Commit:**

```
feat(open-atlas): cosmic home on [lang]/ route
```

### T2 — ascent topic page on `[lang]/learn/[track]/index.astro`

**Files added:**

- `site/src/components/atlas/Altimeter.astro`
- `site/src/components/atlas/UnitMarker.astro`
- `site/src/components/atlas/LessonRow.astro`
- `site/src/components/atlas/ResumeCTA.astro` (or `.tsx` if a client island is
  the cleaner shape; preferred as a server-rendered Astro component with a
  tiny `is:inline` script — see "Hydration" below)
- `site/src/components/atlas/TopicHeader.astro`
- `site/src/components/atlas/Summit.astro`

**Files changed:**

- `site/src/pages/[lang]/learn/[track]/index.astro` — rewritten.

**Composition:**

```
<Atlas lang={lang}>
  <World parallax={true} />
  <Constellation seed={trackSeed(track.slug)} />
  <Altimeter />
  <Meridian fill />
  <main class="climb">
    <TopicHeader track={track} unitCount={N} lessonCount={M} />
    <ResumeCTA track={track.slug} firstLessonHref={...} />
    <div class="rope">
      {[...units].reverse().map(unit => (          {/* senior at top */}
        <UnitMarker
          n={unit.data.order}
          title={unit.data.title[lang]}
          crux={unit.data.crux[lang]}
        >
          {unit.data.lessons.map(slug => (
            <LessonRow href={...} title={...} state="available" />
          ))}
        </UnitMarker>
      ))}
    </div>
    <Summit nextTrack={nextByOrder} lang={lang} />
  </main>
</Atlas>
```

**Data flow:**

1. `getStaticPaths` over `getCollection("tracks")` × 2 langs — keep the
   existing signature.
2. Per build:
   - `track = tracks.find(t => t.data.slug === slug)`
   - `nextByOrder = tracks.find(t => t.data.order === track.data.order + 1)`
     (may be undefined for the last track; `Summit` handles that).
   - `units = units.filter(u => u.data.track === slug).sort(by order)`
   - `lessons = lessons.filter(l => l.data.lang === lang && l.data.track === slug)`,
     indexed by `slug` for title + level lookup.
3. Per unit: marker links to `unit.lessons[0]` lesson href; sub-rows iterate
   `unit.lessons` and lookup titles in the index.
4. Lesson state is `"available"` for every lesson at build time. The optional
   client-side enhancement (below) flips `"done"` on visited lessons via
   localStorage; this is a progressive enhancement and the page is fully
   functional without it.

**ResumeCTA:**

Server-renders the fallback ("Start here · {firstLesson.title}") so SSR
output is meaningful. A tiny `<script is:inline>` reads
`localStorage.getItem("atlas.last.{trackSlug}")`; if present, it swaps the
href and the title text via `data-*` attributes (no Preact island, no
hydration cost). The localStorage write happens on each lesson visit — added
as a `<script is:inline>` in `Lesson.astro` (T3).

**Reduced motion:**

`World` component's `<script is:inline>` checks `motionEnabled()` from
`~/scripts/motion-flag` before installing the scroll listener. Disabled →
the strip rests at `translateY(0)` (orbit visible), altimeter dot stays at
the bottom, lessons remain linkable. The cosmic backdrop is still rendered;
it just does not move.

**Summit unlocks:**

If `nextByOrder` exists: render two CTAs (`Unlocks above ↑ {nextTrack.title}`
and `Back to atlas`). If not: render only `Back to atlas`.

**Verification:**

- `cd site && bun run build` → lint 0/0, page count unchanged.
- Manual: open `/en/learn/networking/` (12 units, 76 lessons — the largest
  track) and `/en/learn/ai-llm/` (8 units, 8 lessons — the smallest). Scroll
  the networking page; verify camera flies, altimeter climbs, unit markers
  render at sensible cadence, lesson sub-rows are linkable.
- Manual: open `/en/learn/engineering-practice/` (last track by order) and
  verify summit shows only "Back to atlas".

**Commit:**

```
feat(open-atlas): ascent scene on [lang]/learn/[track]/ route
```

The commit body documents the marker-granularity decision (hybrid, unit
markers with nested lesson sub-rows) so future readers can grep the rationale.

### T3 — light-zone lesson reading shell on `Lesson.astro`

**Files added:**

- `site/src/components/lesson/Topbar.astro` (slim breadcrumb + "Back to the
  climb")
- `site/src/components/lesson/AltitudeGauge.astro` (4-segment level marker)
- `site/src/components/lesson/RightRail.astro` (sticky progress + auto-TOC)
- `site/src/components/lesson/NextLessonCard.astro` (continue the climb)

**Files changed:**

- `site/src/layouts/Lesson.astro` — extended.

`Lesson.astro` continues to wrap `Topic.astro`. The new chrome is inserted
inside the `Topic.astro` slot; the wrapping outer layout (`<html>`, theme,
glossary tooltip script, etc.) is unchanged.

`Lesson.astro` additionally calls `getCollection("tracks")` to resolve
`trackTitle = tracks.find(t => t.data.slug === trackSlug)?.data.title[lang]`
for the topbar breadcrumb (cheap; Astro caches `getCollection` within a
build). For `NextLessonCard`, it resolves the next lesson within the same
unit via the same lessons collection it already loads for `ConnectedLessons`;
if the current lesson is the last in its unit, it falls back to the first
lesson of the next unit in the same track (by unit `order + 1`), and if
that does not exist either, the card is omitted.

**Layout shape:**

```
<Topic title=... lang=... sources=...>
  <Topbar
    lang={lang}
    trackSlug={trackSlug}
    trackTitle={trackTitle[lang]}
    lessonTitle={title}
  />
  <div class="lesson-shell">
    <article class="lesson-body" data-lesson-type={lessonType}>
      <header class="lesson-head">
        <kicker>...</kicker><h1>{title}</h1><crux>{summary}</crux>
        <AltitudeGauge level={entry.level} />
        <hdr-meta>{estMin} min</hdr-meta>
      </header>
      <slot />                                  {/* MDX content */}
      {lessonType === "topic" && connections && <ConnectedLessons ... />}
      <NextLessonCard nextLesson={...} />
    </article>
    <RightRail />
  </div>
</Topic>
```

**Body typography port:**

A scoped `<style>` block in `Lesson.astro` targets `.lesson-body` descendants
(see decision 6). Selectors and values match `lesson-preview.astro` closely.
The block sits at the bottom of the layout file. No Tailwind utility classes
are removed from prose components; the scoped CSS overrides them by
specificity.

Indicative subset (full set is mechanical):

```css
.lesson-body h2 { font-family: var(--font-display); font-size: 25px;
  font-weight: 600; letter-spacing: -0.01em; margin: 38px 0 14px; }
.lesson-body p  { font-size: 16.5px; line-height: 1.72; color: var(--ink-2);
  margin: 0 0 16px; }
.lesson-body code { font-family: var(--font-mono); font-size: 0.85em;
  background: var(--card-2); padding: 1px 5px; border-radius: 2px; }
.lesson-body section:first-child p:first-child { font-size: 18px;
  color: var(--ink); }
```

**Mobile crowding fix:**

Topbar reflows below 640px: breadcrumb stacks above "Back to the climb"
instead of side-by-side. This closes the HANDOFF "Back to the climb crowding"
note.

**Right rail:**

Server-rendered. Inline script builds the TOC from `document.querySelectorAll
('.lesson-body h2')` after `DOMContentLoaded`; assigns `id` attributes if
missing; tracks scroll position to highlight the active TOC entry and update
the progress bar. No Preact island.

**Last-visited write:**

`<script is:inline define:vars={{ trackSlug, lessonSlug, lessonTitle, lessonHref }}>`
in `Lesson.astro` (Astro's `define:vars` injects the Astro frontmatter values
as `const` declarations inside the inline script):

```js
try {
  localStorage.setItem(
    "atlas.last." + trackSlug,
    JSON.stringify({ slug: lessonSlug, title: lessonTitle, href: lessonHref, at: Date.now() })
  );
} catch (_) { /* private browsing, storage full, etc. — non-fatal */ }
```

Writes on every lesson page load. Consumed by the ResumeCTA on the topic
page (T2). Read site-side is symmetrical: ResumeCTA's `<script is:inline>`
calls `localStorage.getItem("atlas.last." + trackSlug)`, parses JSON, and
patches `data-href` and the displayed title on the CTA. If the read fails or
the entry is missing, the SSR-rendered "Start here" fallback is left in
place.

**Hydration budget:**

Lesson page islands: unchanged. `ConnectedLessons` is server-only. New
components (`Topbar`, `AltitudeGauge`, `RightRail`, `NextLessonCard`) are
all server-rendered Astro components with `<script is:inline>` enhancements.
Hydration cap stays at 5 (and most lessons sit well below).

**Verification:**

- `cd site && bun run build` → lint 0/0, page count unchanged.
- Manual: open a lesson with `level: "junior"` and verify the altitude gauge
  marks Junior. Open a lesson without `level` and verify the gauge omits
  cleanly. Resize to 360px wide and verify the topbar reflows.
- Manual: visit several lessons on the same track, then return to that
  track's page and verify the ResumeCTA shows the last lesson visited.

**Commit:**

```
feat(open-atlas): light-zone lesson reading shell
```

### T4 — retire preview routes

**Files deleted:**

- `site/src/pages/topic-preview.astro`
- `site/src/pages/lesson-preview.astro`

Only after T1–T3 are committed on the branch and visually verified.

**Verification:**

- `cd site && bun run build` → lint 0/0; page count drops by 2.

**Commit:**

```
chore(open-atlas): retire preview routes — content now on production routes
```

## Risks and mitigations

- **Parallax + 76-marker scroll fatigue on networking.** Mitigated by hybrid
  marker granularity (decision 1): meridian shows ~12 unit markers; lesson
  sub-rows ride inside the unit cards, not on the meridian itself.
- **localStorage absent (private browsing, server pre-render).** ResumeCTA
  server-renders the "Start here" fallback; the client script is a strict
  upgrade.
- **Reduced motion users on the topic page.** `World` checks `motionEnabled()`;
  static fallback shows orbit zone with altimeter at the bottom — still a
  legible page, just no flight.
- **Linter rule misses for the new components.** No piece-only lint rules
  apply to the new files. Lesson page hydration cap is unchanged (no new
  islands added).
- **i18n parity on new copy.** New UI labels added to `site/src/i18n/ui.json`
  under both `en` and `ru` for every string used by the new components
  (scroll cue, summit copy, "Back to the climb", "Continue the climb",
  altimeter ticks, band headers). Strings live in `ui.json` only; no inline
  copy in components.
- **Branch hygiene.** No push, no merge to main. The branch is left for
  review.

## Out of scope

- Adding a tracked user-state model (no auth, no database).
- Polish of the existing glossary routes (already shipped).
- Any change to lesson MDX content.
- Re-introducing chapters / pillars / book-era data files (already retired in
  migration commits `2cac861` / `e1f4520`).
- A whole-graph "connections page" (rejected as a hairball in HANDOFF).

## Acceptance

A `design-wireup` branch off `main` with four commits in this order:

1. `feat(open-atlas): cosmic home on [lang]/ route`
2. `feat(open-atlas): ascent scene on [lang]/learn/[track]/ route`
3. `feat(open-atlas): light-zone lesson reading shell`
4. `chore(open-atlas): retire preview routes — content now on production routes`

Each gated by `cd site && bun run build` returning lint 0/0. End-of-session
report includes commit SHAs, final page count, and the unit-marker
granularity decision (hybrid, in the T2 commit body).
