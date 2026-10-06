# Kinetic-poster pilot — design spec

Date: 2026-10-06. Status: approved by user (pilot: home + 2 pages, both themes, learn hubs in scope, free hand on palette).

## Finding that shaped the spec

Anton (prototype font) ships latin/latin-ext/vietnamese only — no Cyrillic.
Verified against `fonts.googleapis.com/css2?family=Anton`. For a bilingual
EN/RU product the poster grotesk must cover Cyrillic. Replacement: **Oswald**
(variable 200–700, subsets include cyrillic + cyrillic-ext, verified same way).
Oswald is condensed like Anton and reads as the same kinetic-poster voice.
Self-hosted via `@fontsource-variable/oswald`, same pattern as the three
existing fontsource imports in `site/src/styles/global.css`.

## Scope (pilot only)

1. Poster token layer in `site/src/styles/tokens.css` (+ `global.css` import).
2. `[lang]/index.astro` — poster hero (Oswald solid + outline), two marquee
   lanes from real track slugs, track index as ruled table, method trio,
   accent CTA slab. Keeps `Atlas` layout, `TopNav`, i18n keys, EN/RU parity.
3. `[lang]/learn/[track]/index.astro` — same language: Oswald track title
   (solid + outline translation), mono meta, units as ruled index table.
4. `[lang]/calibrate.astro` — poster chrome (header + headings) only;
   interactive islands and controls untouched.

Out of scope: lesson route, remaining ~25 templates, `dist/`, Supabase, CI.

## Token contract (additive, both themes)

- `--font-poster: 'Oswald Variable', 'Oswald', 'Arial Narrow', sans-serif`
- `--poster-accent: #ff4d00` (display sizes only; never body text)
- `--poster-outline: var(--ink)` (stroke color for `-webkit-text-stroke` text)
- Dark theme keeps charcoal/paper-ink; light theme keeps white paper (no cream
  page background). Accent identical in both themes for brand continuity.
- Motion: marquee + scroll drift, all gated behind
  `prefers-reduced-motion`; transform-only animations.

## Constraints carried over

- EN/RU parity on every touched string (new copy goes through `ui.json`).
- Hydration budget untouched (no new islands; marquee + drift are CSS + one
  inline `is:inline` script, not a Preact island).
- CSP: no new external origins (fonts self-hosted; prototype HTML keeps its
  Google Fonts link — prototypes are not shipped).
- No `console.log`; no raw hex outside tokens; touch targets ≥44px;
  display type never replaces semantic heading order.
- Prototype `docs/design/prototypes/kinetic-poster-home.html` updated to
  Oswald so the mockup stays truthful.

## Follow-ups (2026-10-06, from screenshot review)

- Track-giant overflow: 11+ char single words overflowed the 760px wrap at
  9vw/150px. Fix: `.poster-page-size` default `clamp(44px, 7vw, 110px)`;
  track pages compute a per-title cap server-side
  (`min(7vw, 700/(maxWordLen×0.56))px`); `overflow-wrap: break-word` backstop.
- Rail skin: `.poster-chrome` body class on Atlas layout + poster skin block in
  `poster-kit.css` (Oswald wordmark, mono uppercase items, invert hover/active,
  sharp radii, square due badge). TopNav component untouched; Topic/Lesson
  chrome unchanged. Calibrate (Topic layout) keeps the classic rail for now.
- NAV LAB retired: user picked Dock, then asked for Marquee live. `NavMarquee.astro`
  is now the Atlas chrome (tool row + pausable 8-section lane, dup links
  aria-hidden/untabbable, mirrored due-badge, static lane on mobile and
  reduced-motion). `NavDock.astro` kept unmounted for an instant revert.
  The rail collapses to zero under `body.poster-chrome` (TopNav stays mounted
  untouched — its search overlay is exempted so ⌘K works; drawer/topbar hidden).
  Topic/Lesson chrome unchanged.
- Wave 2 (learn hubs): `learn/index` poster pagehead + band rows (filter hooks
  kept, search input squared), `learn/[track]/lab` poster head + unit-head
  type, `algorithm-workspace` poster head. `Topic.astro` gained opt-in
  `navDock` (default off — Lesson output identical); `learn/index` and
  `calibrate` pass it, so the whole pilot shares the marquee chrome.
- Wave 3 (account group): `account`/`profile`/`achievements` screen-heads
  replaced with poster-heads (copy unchanged, islands untouched);
  `settings` keeps its island title, gains `navDock` only.
- Wave 4 (projects): `projects` poster head with live project count;
  `projects/[slug]` poster head with per-title giant cap; islands, rubric,
  starter, review card and scripts untouched.
- Wave 5 (learning flow): `interview`, `review`, `roadmap`, `readiness`,
  `interview-qa` poster-heads + `navDock`; islands, skeletons, fallbacks,
  tabs and the skill-map SVG untouched.
- Wave 6 (footer zone): `SiteFooter` rebuilt as outline wordmark + mono nav;
  `KeyboardShortcuts`/`SourcesFooter` summaries get bottom rules + accent
  meta; `Atlas` foot-mark + strong rule. Strips are shared chrome — lessons
  inherit the skin, behavior/strings/content untouched.
- Wave 7 (english hub, 8 pages): `navDock` on all; poster-head only on
  `speaking` (the sole page-owned h1). Island-internal headers, breadcrumbs,
  wasm CSP and mechanics untouched.
- Wave 8 (tail): `assess`, `about`, `terms`, `glossary/index`, `glossary/[term]`
  (with per-label giant cap — keys reach 35 chars), `404` (standalone giant
  404 + outline, bilingual links kept). All unique templates done; lesson
  route untouched.
- Fix (screenshot-driven): `.poster-giant` (0,1,0) lost to `.atlas-body h1`
  (0,1,1) — headings fell back to Fraunces, and the stroke on the serif
  skeleton produced the "broken" glyphs. Fix: doubled-class selectors for
  poster heading rules (giant, sec-head h2, method h3); track/lab outline slug
  reduced to `pg-sub` (0.42em). `RetrievalDrawer` chrome squared
  (logic/SRS untouched; grey reveal button is the empty-draft disabled state).
  Verified headless (Playwright, dev :4321): track RU 1440/390 + home EN —
  Oswald applied, 0px horizontal overflow; shots in /tmp (track-ru-*.png,
  home-en-1440.png) with throwaway script /tmp/shot.mjs.
- Wave 9 (track page modern): hero meta replaced by stat band (Oswald
  numerals); sticky unit heads (top 96px, verified on scrolled shot, no
  marquee overlap); accent unit numbers; single-rule unit separators; all
  cards squared. Lesson-state overlay, checkout script and unlock logic
  untouched (shots: /tmp/track2-mid.png).

## Verification

- `bun run lint:src`, `bun run check` from `site/` (0 errors).
- No lesson content changes → no `lint-report.json` gate; full `bun run build`
  left to CI (1855 pages, memory-heavy locally).
- Screenshots EN/RU × light/dark × 1440/390: no managed browser tool in this
  session — listed as unverified, to be checked in review.
