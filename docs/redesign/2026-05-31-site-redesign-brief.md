# Open Atlas — Full-Site Redesign Brief (current-state flow)

> Paste this into claude.ai/design. It describes the **entire existing product** — every
> screen, its purpose, content, states, the current visual language, and the constraints any
> new design must respect. Generate a fresh, cohesive design system + per-screen designs.
> Questions back are welcome — the engineer who wrote this will answer them.

---

## 0. What this product is

**Open Atlas** — a bilingual (English + Russian) self-learning platform for software
engineers. Two intertwined goals for the primary user: reach **middle→senior fullstack
engineer**, and lift **English A2→B2**. It is part curriculum, part spaced-repetition trainer,
part gamified progress tracker. Tone: serious, editorial, "war-story not documentation" depth —
not a cutesy bootcamp. Think *a technical book that became an app*.

Audience: working/aspiring engineers who want depth. Calm, focused, text-first, but with rich
interactive learning widgets and a light game layer (ranks, XP, streak, achievements).

**Everything is bilingual.** Every label, heading, body string exists in EN and RU. Designs
must accommodate Russian text (often 15–30% longer) without breaking.

---

## 1. Hard constraints (the new design MUST fit these)

- **Stack:** Astro 5 (static-generated) + **Preact islands** for interactivity + **Tailwind**.
  Output should be component-oriented, semantic HTML + Tailwind utility classes, no heavy
  framework lock-in. We will port your output into Astro components / Preact islands, so keep
  interactive pieces as well-bounded components with clear props.
- **Bilingual:** design for EN and RU simultaneously; show both where it helps. No fixed-width
  text containers that break on longer Russian.
- **Theming:** the product already supports **light + dark** via a `data-theme` attribute and a
  toggle. The new design must define **both themes** as a token set.
- **Static + fast:** no SPA shell, minimal client JS, content-first. Per-page interactive
  "islands" are hydrated individually. Accessibility (contrast, focus states, keyboard nav,
  reduced-motion) is required.
- **Routing is locale-prefixed:** every page lives under `/{en|ru}/...`.
- **Responsive:** mobile-first. The site is read on phones — every screen must reflow cleanly.
- **Output stack-agnostic** (so the port to Astro/Preact is cheap): semantic HTML + Tailwind
  utilities; **do NOT** assume Next.js, react-router, or any app framework; no client-side
  routing; themes via a `data-theme` attribute (or class) toggling **CSS-variable tokens**;
  interactive pieces as small self-contained components with explicit props/states. Plain
  React is fine as a *sketch*, but keep it portable (no framework-specific APIs/hooks beyond
  state) — we re-author it as Astro components + Preact islands.

---

## 2. The core problem to solve (why we're redesigning)

> Note: an older "16-pillar fullstack book" model is referenced in some repo docs but is **not
> the live product** — ignore any fixed pillar count. The shipping site is the open, growing
> **tracks/learn** model described below.

The site currently runs **two disconnected visual languages**:

1. **"Open Atlas" cosmic shell** — the home page and top nav. Hardcoded dark cosmos:
   background `#0a0c16`, **teal `#2fd6bd`** + **gold `#d8b06a`** accents, a parallax starfield
   canvas, italic serif display. Feels like a space atlas.
2. **"Editorial paper" content system** — every content/learning page (lessons, English,
   glossary, profile). A token-based **warmed-paper light theme** (`#f3eee2` paper, near-black
   ink, JetBrains-Mono meta labels, thin rules, 2px radii) and an ink-cool dark theme. Feels
   like a precise technical book.

They don't share tokens, accent colors, or mood. Crossing from home into a lesson feels like
two different products. **Primary goal: one cohesive design system that unifies the cosmic
"atlas/journey" identity with the editorial "technical book" content surfaces** — keep the
sense of a *map/journey through knowledge*, but make the content surfaces feel part of the same
world, in both light and dark.

What to **preserve**: editorial seriousness, depth-first density, the bilingual structure, the
progression/journey *as IA*, the game layer (restyled), the per-domain color coding. What to
**fix**: the visual schism, dated card styling, weak hierarchy on dense pages, the home→content
jolt.

---

## 2.5 Design Direction — DECIDED (do not regenerate the cosmic theme)

We are deliberately **targeting an advanced / senior engineering audience**. That dictates a
clear direction — follow it; do not revert to the current space theme.

**DROP entirely (these read as junior/bootcamp and erode trust with senior users):**
- The literal **cosmic skin**: starfield/parallax background, the dark-cosmos `#0a0c16` +
  teal/gold palette, any "outer space" mood.
- The literal **mountain / "ascent" / "climb to the summit"** imagery and language.
- Loud gamification: confetti energy, badges-in-your-face, arcade flourishes.

**KEEP, but as quiet structure (not decoration):**
- **Progression / altitude** (foundations → advanced) as *information architecture* — a clear
  path through a large body of knowledge, expressed through layout, ordering, and restrained
  indicators, not a literal mountain.
- The **game layer** — recast as a **calm competence rating** (think a chess/Elo rating or a
  professional certification ladder), small and matter-of-fact. Senior users like a rating;
  they dislike confetti.

**IDENTITY — go cartographic + editorial:**
- The product name is "atlas" — lean into **map/atlas as a serious, grown-up metaphor**: a map
  of a knowledge domain. Express it with **topographic/contour lines, a refined route/spine,
  cartographic grid, precise labels** — never stars or spaceflight.
- The existing **editorial "paper/ink" token system is the correct foundation** for the whole
  product (light + dark). The cosmic shell is the outlier to be removed; unify *everything* onto
  the editorial-cartographic system so home and content feel like one world.

**The bar:** distinctive but earned through **typography, structure, spacing, and restraint** —
the calm, dense, high-signal feel of great technical docs / Linear / Stripe docs / a
well-set technical book. Characterful, not decorated. Not bland either — opinionated minimalism.

---

## 3. Current design tokens (starting point — improve, don't blindly keep)

**Type:**
- Display/headings: **Fraunces** (serif, optical-size, 400–800).
- Body / UI: **Inter Tight**.
- Mono / meta-labels / code: **JetBrains Mono** (used for small uppercase tracking-wide kicker
  labels — a signature of the current look).

**Light ("paper"):** paper `#f3eee2`, paper-2 `#ebe5d5`, card `#fbf7eb`, ink `#1a1916`,
muted `#6f6a5e`, hairline rules at ~8–14% ink. Radii **2px / 4px**. 0.5px rules. Editorial,
warm, calm.

**Dark ("ink-cool"):** paper `#14151a`, card `#1a1c22`, ink `#ece8dc`, muted `#8e887a`,
rules at ~10–16% light.

**Domain color coding (extensible scale, not a closed set)** — subject areas are tagged by hue.
Current hues: lilac (networking/security), mint (databases/distributed), peach
(frontend/deployment), sky (backend/observability), rose (AI-LLM/eng-practice). **New tracks
(cryptography, how-a-computer-works, system design, …) will need new tags** — design the color
system so additional domain hues slot in cleanly and stay distinguishable + accessible. Plus a
set of 7 "persona" colors used in networking diagrams (browser/DNS/router/origin/CA/db/CDN).

**Cosmic shell (being REMOVED per §2.5):** bg `#0a0c16`, teal `#2fd6bd`, gold `#d8b06a`. Do not
carry this dark-cosmos palette forward. At most, a single restrained accent may be drawn from it.

Semantic: ok green, warn amber, danger red, accent ink-blue `oklch(48% 0.13 250)`.

> Deliverable wanted: a **single unified token system** (light + dark) built on the editorial
> paper/ink base, applied consistently from home through content. The cosmic palette is dropped,
> not blended.

---

## 4. Information architecture / navigation

**Global top nav (every page):** logo "open atlas · {tagline}" | **Atlas** (home) |
**English for Engineers** | **Glossary** | **Account** | language switch (EN/RU) | theme toggle.

**Primary surfaces:**
- **Atlas home** `/{lang}/` — the map/landing. The spine of the product.
- **Learn** `/{lang}/learn/...` — the curriculum (tracks → units → lessons).
- **English** `/{lang}/english/` — the English-learning layer (its own mini-app).
- **Glossary** `/{lang}/glossary/` — 680 bilingual technical terms.
- **Projects** `/{lang}/projects` — hands-on project briefs.
- **Profile** `/{lang}/profile` — gamified progress (rank/XP/streak/achievements).
- **Account** `/{lang}/account` — optional GitHub login + cross-device sync.
- **Settings** `/{lang}/settings`, **Terms** `/{lang}/terms`.

**Content model (for layout reasoning):**
- **Track** → **Unit** → **Lesson**. Tracks are grouped into 4 **bands**: `advanced`,
  `middle`, `surface`, `foundations` (difficulty/altitude). Each track has a domain `color`.
- **The track catalog is open-ended and grows over time** — do NOT design for a fixed number.
  Today it's a set of tracks; planned future additions include **cryptography**, **how a
  computer works**, **system design**, and more. The design (home bands, learn index, track
  cards, nav, color-coding) must scale gracefully from a handful to dozens of tracks and to
  **new domains/colors not in the current palette**. Treat domain colors as an extensible
  scale, not a closed set of 5.
- A **Lesson** is linear: Hook → Goal → Explanation → Visual → Worked Example → Practice →
  Check → Recap, with optional collapsible "Inset" asides. Lessons carry metadata: est. minutes,
  level (zero/junior/middle/senior), prerequisites, "spiral"/"deepens-into" links, sources.
- Extra content types: **practice** task sets, **drill** sets (LeetCode-style), **projects**.

---

## 5. Screen-by-screen flow (design each of these)

### 5.1 Atlas Home — `/{lang}/`
The identity screen. **Currently** (being replaced per §2.5): a full-bleed dark **World** canvas
(parallax starfield) behind a centered editorial masthead (kicker label, big serif title with an
italic second line, one-sentence "crux", a scroll cue), then a vertical **"rope"/meridian** spine
down the left with **bands** stacked top→bottom. Each band = a labeled section (advanced / middle
/ surface / foundations) with a colored band-label and a short note, containing a grid of
**track cards** (domain-color slug tag, "N units · M lessons" meta, serif title, one-line blurb).
- **Redesign per §2.5:** remove the starfield/cosmic background. Keep the band stacking + the
  spine as a **cartographic route/contour** treatment (topographic lines, a precise vertical
  path), on the editorial light/dark base. Strong masthead typography carries the identity.
- Must scale to **many tracks across growing domains** (§4) — the band/card grid can't assume a
  small fixed count; design for density, scanning, and future tracks.
- States: a "resume" CTA when the user has progress; quiet hover affordance on cards. Light + dark.

### 5.2 Learn index — `/{lang}/learn/`
Overview of all tracks (the curriculum catalog). Grid/list of tracks with progress, grouped or
filterable by band/domain.

### 5.3 Track overview — `/{lang}/learn/[track]/`
One track's path: header (track title, crux, color, progress), then its **units** each
expanding to a list of **lessons** (title, est-min, level badge, done/locked state). A vertical
progress "altitude" indicator. This is a table-of-contents-as-journey.

### 5.4 Lesson reader — `/{lang}/learn/[track]/[unit]/[lesson]`
The core reading surface. A focused single-column article with a **left/right rail**:
- Topbar: breadcrumb (track › unit), progress, est-min, prev/next.
- Body: linear lesson blocks — **Hook** (provocation), **Goal**, **Explanation** prose,
  **Visual/diagram**, **Worked Example**, **Practice** (interactive tasks), **Check**
  (comprehension), **Recap**. Plus collapsible **Inset** asides for tangents.
- Right rail: "on this page", connected lessons, prerequisites, next-lesson card.
- Rich embedded widgets (see §6): code runners, SQL/JS sandboxes, trace scenarios, tradeoff
  matrices, drag-to-order, quizzes, diagrams.
- Reading-comfort is paramount: measure ~60–72ch, generous line-height, clear block rhythm,
  strong but quiet headings. Light + dark.

### 5.5 English hub — `/{lang}/english/`
A mini-app for English learning. Top→bottom sections, each an interactive island:
1. **Dashboard** — "Your English": per-CEFR-band vocabulary progress bars (A2/B1/B2 with
   known/total), activity stats (texts read, grammar done, phrases done, graded writings),
   day-streak, "due today", English-XP, earned badges row.
2. **Today** — the daily driver: due-reviews count, "new words" flashcard (reveal RU + gloss +
   example, grade I-knew-it / learning), today's reading + grammar + writing nudges, a
   welcome-back banner after a gap.
3. **Reading** — a feed of graded bilingual texts (A2–B2, general + engineering streams) with a
   level/stream toggle; opens a reader with tap-to-reveal translation, vocab cards, and
   comprehension questions.
4. **Grammar & Phrasing** — two tabs: grammar-in-context micro-lessons with fill-in-the-gap
   (cloze) practice; and collocation/phrase gap-fill drills.
5. **Output** — writing tasks; graded by the user's own AI key (BYOK) or self-assessed against
   a model answer; a key-entry panel with a security disclosure.
- Distinct but **same design system** as the rest. Flashcards, progress bars, quiz/cloze inputs,
  segmented toggles. Light + dark, bilingual.

### 5.6 Glossary — `/{lang}/glossary/` + `/{lang}/glossary/[term]`
680 bilingual technical terms. Index: searchable/filterable list (by letter/domain). Term page:
the term, definitions EN+RU, related terms, where it appears.

### 5.7 Projects — `/{lang}/projects`
Hands-on build briefs (e.g. write-ahead log, rate limiter, OAuth-mini, cache-stampede lab,
query-plan visualizer, at-least-once queue). Filterable cards → a project brief (goal,
constraints, rubric, steps).

### 5.8 Profile — `/{lang}/profile`
The game layer. A 25-rank ladder with a **rank badge**, **XP bar** (level + progress),
**streak chip**, an **achievement grid** (earned/locked badges with icons), titles, and a
"rank-up reveal" animation. If no placement yet → an adaptive placement test (2-stage quiz).
Make it feel rewarding but tasteful — not arcade.

### 5.9 Account — `/{lang}/account`
Optional GitHub login → cross-device progress sync. Logged-out: value prop + "sign in with
GitHub" + terms acceptance. Logged-in: profile chip (avatar/nickname), sync status, sign-out.

### 5.10 Settings / Terms
Settings: theme, motion (on/off/auto), reading prefs, reset progress, language. Terms: legal
prose. Both quiet utility pages.

---

## 6. Component / widget inventory (design these as a kit)

Group them into a reusable component library in the new system:

**Brand/chrome:** TopNav, language switch, theme toggle, site footer, sources footer, toast.

**Atlas/journey:** World background field, Meridian/rope spine, band sections, track cards,
altitude/progress gauge, unit markers, resume CTA, summit marker.

**Reading/prose:** Crux callout, Key-Takeaway, Callout, Term (glossary hover), Sidenote, Spiral-
cue link, Misconception block, Numbers/stat card, Pill/badge, Step badge.

**Lesson scaffold:** Hook, Goal, Explanation, Worked-Example, Step, Trace, Idea, Check, Recap,
Inset (collapsible aside), Right-rail (on-this-page + connected + prereqs), next-lesson card,
altitude gauge.

**Interactive learning widgets (the rich stuff):** code runner / annotated code, JS sandbox,
SQL sandbox, trace scenario / step animation, debug-log walkthrough, tradeoff matrix,
drag-to-order, metaphor-complete, quiz, RFC quiz, number drill, faded example (progressive
hint), retrieval drawer (active recall), reactive diagram, sequencer, design prompt, project
brief, persona tag/legend, prereq badge, spaced-revisit banner, progress meter.

**Diagram primitives:** node, connector, packet dot, pulse, reveal, count-up, typing-text;
domain icons (cloud, database, server, monitor, key, lock, globe, doc, resolver).

**English layer:** dashboard (band bars + stat grid + badge row), flashcard, reading feed +
reader, cloze/gap-fill input, collocation drill, output/writing grader, key-entry panel,
placement test, segmented toggles.

**Game layer:** rank badge, XP bar, streak chip, achievement grid, rank-up reveal, persona/level
legend.

**Utility/nav:** global search (command-k style), keyboard-shortcuts sheet, projects filter,
account menu/panel, settings drawer.

> Many of these are small and composable — design **patterns** (card, callout, badge, progress
> bar, segmented control, flashcard, quiz block, code block, data table, stat tile) rather than
> 60 bespoke things. A tight primitive kit that composes into all screens is the goal.

---

## 7. Interaction & motion

- Calm, purposeful motion. Respect `prefers-reduced-motion`.
- Signature moments: a subtle cartographic/contour reveal on the home spine (NOT a starfield),
  a quiet rank-up acknowledgment (not confetti), count-ups, reveal/typing in diagrams, gentle
  card hover. Cohesive and restrained.
- Keyboard: global search (cmd/ctrl-K), shortcuts sheet, full keyboard nav of lessons.

---

## 8. Accessibility & quality bar

- WCAG-AA contrast in both themes (the warm paper + low-chroma palette must still pass).
- Visible focus rings, semantic headings, skip-to-content, reduced-motion fallbacks.
- Russian-text resilience (no clipping/overflow), long-word breaking for technical terms.
- Reading surfaces optimized for long-form focus (measure, rhythm, quiet chrome).

---

## 8.5 Responsive & layout behavior

- **Mobile-first**; design phone, tablet, desktop for every screen. Define how each reflows.
- **Top nav** collapses to a compact menu on small screens (logo + menu/hamburger + lang/theme);
  keep language + theme reachable in one tap.
- **Home bands / track grid**: multi-column on desktop → single readable column on mobile; the
  vertical route/spine stays legible or gracefully simplifies.
- **Lesson reader**: the right rail (on-this-page / connected / prereqs) moves to a collapsible
  drawer or below-content on mobile; body stays a comfortable single column at all sizes.
- **English hub / dashboard**: the stat grid reflows (3-col → 2 → 1); progress bars stay full-
  width and readable; flashcards/quiz inputs are thumb-friendly.
- Touch targets ≥44px; no hover-only affordances; tables scroll or restructure on narrow widths.

## 8.6 Empty / first-run / edge states (design these, not just the happy path)

- **New user, zero progress**: home with no "resume", profile before placement (→ invite the
  placement test), English hub before placement (→ placement first), empty reading/achievement
  lists. Make first-run inviting and obvious, not blank.
- **No AI key (BYOK)**: the English Output feature degrades to self-assessment; clearly mark
  what needs a key + a one-tap "add key" path. **Keep the existing security disclosure copy at
  key entry — do not remove or weaken it (it's a deliberate security/legal statement).**
- **Loading / offline / sync**: skeleton/quiet loading for hydrated islands; the site works
  offline (local progress); account-sync shows a small, honest status (synced / signed-out /
  syncing). No spinners-of-doom.
- **Long / overflow**: 680-row glossary, long Russian strings, deep code blocks — all must have
  a defined behavior (search/filter, wrap, scroll).

## 8.7 Code & data typography (a technical learning site lives on this)

- **Code blocks** are first-class: a proper **syntax-highlight theme for BOTH light and dark**,
  monospace (JetBrains Mono), comfortable line-height, copy-to-clipboard affordance, optional
  line numbers, soft horizontal scroll (no wrapping that breaks code). Inline `code` styled
  distinctly but quietly.
- **Interactive code/SQL/JS sandboxes & runners**: editor + run + output panel; clear run/error
  states; readable result tables.
- **Data-dense surfaces** (glossary index, tradeoff matrix, drill lists, stat grids): strong
  scanning — sticky headers, zebra/rule rhythm, filter/search, alignment of numbers (tabular
  figures). Design tables and lists that stay legible at 100s of rows.
- **Diagrams** (nodes/connectors/packets/personas): a consistent line weight, labeled, themed
  for light + dark.

## 8.8 Brand / wordmark

- The product is **"open atlas"**. Give it a real **wordmark/logotype treatment** (not just
  text in a nav) — cartographic-editorial, works in light + dark and at favicon size. Define an
  **icon style** (line weight, corner treatment) consistent with the wordmark for the existing
  domain/diagram icon set.
- **Microcopy tone** (EN + RU): precise, calm, peer-to-peer senior voice — never cutesy or
  hype. Labels terse; explanations earned.

## 9. What we want back from claude.ai/design

1. A **unified token system** (color light+dark, type scale, spacing, radii, elevation, motion)
   on the editorial-cartographic direction of §2.5 — one world from home through content, with
   the cosmic theme removed.
2. A **component kit** (the primitives in §6, in both themes, both languages).
3. **Per-screen designs** for §5 (home, learn index, track overview, lesson reader, English hub,
   glossary, projects, profile, account, settings) — each with **responsive** (§8.5) and
   **empty/first-run/edge** (§8.6) states, not just the desktop happy path.
4. A **code & data-typography** treatment (§8.7) — syntax theme light+dark, tables, sandboxes —
   and a **wordmark + icon style** (§8.8).
5. Output as clean, **stack-agnostic** component-structured **HTML + Tailwind** (§1) — no Next/
   router assumptions, themes via CSS-variable tokens — so we port to Astro/Preact cheaply. Keep
   interactive widgets as self-contained components with obvious props/states.

**Priority order:** (1) token system + home — they set the identity; (2) lesson reader + English
hub — the most-used surfaces; (3) the rest.

**Non-negotiables:** bilingual EN+RU; light + dark; static/fast/accessible; **follow §2.5 — no
cosmic/starfield/mountain-ascent theme; cartographic-editorial identity; quiet rating not arcade
gamification**; preserve progression-as-IA, editorial depth, the (extensible) domain color-coding,
and the game layer recast as a calm rating. Catalog is open-ended — design must scale to many
tracks and new domains.
