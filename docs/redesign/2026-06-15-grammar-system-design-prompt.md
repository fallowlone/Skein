# Design Brief — English Grammar System UI (claude.ai/design)

> **Use this prompt with claude.ai/design (or Claude Code in design mode).** It asks you to
> design four new front-end surfaces for the grammar section of an existing bilingual
> learning site. The engine, corpus, and animations already exist — you are designing the
> **UI that presents them**. Match the site's established visual language exactly; do not
> invent a new design system.

---

## 1. Role & goal

You are designing the **Grammar** section of "Open Atlas" — a self-hosted, bilingual
(English / Russian) engineering-and-language learning site built with **Astro 5 + Preact
islands + Tailwind**. The grammar feature lets a learner browse 122 grammar topics
(A0–C2), study a topic (RU teaching prose + EN, an animated diagram, examples, pitfalls),
and practice with an infinite generative exercise engine.

Deliver high-fidelity, build-ready designs for **four surfaces** (§4). They must look like
they already belong to this product — same type, color, rhythm, and motion as the existing
home/Atlas and English hub. Anti-template: no generic card grid, no stock hero, no
unmodified library defaults.

---

## 2. The product's visual language (match this — it is not negotiable)

The site is **editorial / cartographic** — it reads like a well-set reference atlas printed
on warm book stock, not a SaaS dashboard. Study these real files before designing:

- `site/style-guide.md` — visual rules + component vocabulary.
- `site/src/styles/global.css` — the token source of truth (`:root`).
- `site/src/styles/atlas-kit.css` — the home/Atlas card + map language.
- `site/src/styles/english-hub.css` — the English section's existing surfaces (the grammar
  screens must feel like siblings of these).
- `site/src/styles/screen-kit.css`, `lesson-kit.css` — shared screen scaffolding.

**Type**
- Display / headings: **Fraunces** (`--font-display`) — high-contrast serif, editorial.
- Body / UI: **Inter Tight** (`--font-body`).
- Code / tokens / monospace tags: **JetBrains Mono** (`--font-mono`).
- Hierarchy comes from **scale contrast** (large serif headings against small sans meta),
  not from weight alone.

**Color (light "paper" theme is primary — do NOT default to dark)**
- Surfaces: `--paper` `#f3eee2`, `--paper-2` `#ebe5d5`, `--card` `#fbf7eb`, `--card-2` `#efe9da`.
- Ink: `--ink` `#1a1916`, `--ink-2`, `--muted`, `--muted-2`; rules `--rule`, `--hairline`.
- Brand accent: `--accent` ink-blue `oklch(48% 0.13 250)`, `--accent-bright` for primary CTAs.
- Semantic: `--ok` (green), `--warn` (amber), `--danger` (red).
- Domain/pillar hues (desaturated oklch): `--p-lilac/-mint/-peach/-sky/-rose` + `*-bg` 16% tints.
  Use these to color-code grammar **families** (see §3) consistently with the rest of the atlas.
- If the codebase has a dark variant (`[data-theme="dark"]` / `prefers-color-scheme`), design
  the dark state too; otherwise light-only.

**Shape & rhythm**
- Radii `--radius`, `--radius-lg`; spacing off `--space-unit`. Hairline rules and generous
  margins over heavy borders/shadows. Layering through paper tints + thin rules, not big drop shadows.
- Motion: subtle, compositor-friendly (`transform`/`opacity`), `--ease`/`--duration`. Respect
  `prefers-reduced-motion`.

**Required qualities** (hit ≥4): scale-contrast hierarchy, intentional spacing rhythm, depth
via overlap/paper tints, editorial typography pairing, semantic (not decorative) color, designed
hover/focus/active states, grid-breaking editorial/bento composition where it earns it.

---

## 3. Domain data you are presenting

A **GrammarTopic** (122 of them) has:
- `id` (kebab, e.g. `present-perfect`), `title` `{en, ru}`.
- `cefr` (entry level) and `levels: Cefr[]` — the bands A0, A1, A2, B1, B2, C1, C2 that have
  authored lessons. **A0–A1 always open; C1–C2 are gated behind a B2 placement** (locked state).
- `family` — one of a small set of grammar families (tenses, modals, articles, nouns,
  pronouns, prepositions, conditionals, clauses, word-order, …). Color families with the
  pillar hues.
- `egp: string[]` — English Grammar Profile competency ids (drives Coverage).
- `archetype` + `archetypeParams.labels` — selects the topic's animation (see §5).
- `lessons` per level: `explain {en, ru}` (RU is gold teaching prose), `structure`, `examples`
  (`{en, ru}`), `tip`, optional `pitfalls` (`{wrong, right, why}`).
- `related: string[]`, `crossTopic: string[]` — sibling/confusable topics and composition partners.

**Per-topic progress** comes from an FSRS "mastery card" (states: new / learning / review /
mature, plus a due date). Show progress as a small, calm indicator (a ring, a dotted maturity
track, or a 0–100 strength) — consistent with how the rest of the site shows mastery
(`CoverageMeter`, progression screen). Do not over-gamify.

**Practice items** are generated on the fly (`generate(topicId)` / cross-topic `composite`).
Each item is one of: `fill_in_blank` (cloze, with a blank `___`), `multiple_choice` (2–4
options), or a short transform. Every item carries an `answer`, optional `alts`, and a
bilingual `rationale`. There can be ≥100 unique items per topic — practice is effectively
endless.

---

## 4. Surfaces to design (four)

### 4.1 Grammar Atlas — `GrammarAtlas.tsx`, route `/[lang]/english/grammar`
The browse/entry screen; **replaces a flat list**. Requirements:
- Group 122 topics by **family × CEFR**. Lead with an editorial header (Fraunces) + a one-line
  framing. Below, a cartographic layout of families — each family a labelled region/column
  tinted with its hue, holding its topics as compact entries.
- Each topic entry: title (en or ru per locale), CEFR badge(s), family hue, and the mastery
  indicator. Locked (C1/C2 pre-B2) entries get a distinct **locked** treatment (dimmed +
  lock affordance + "placement required" on hover).
- **Filter by placement band** (A0…C2) and by family; a search field. Filters update the
  visible regions. Show an **empty state** when a filter matches nothing.
- This is the showcase screen — make it feel like opening an atlas spread. Bento/editorial
  composition encouraged; avoid a uniform grid of identical cards.

### 4.2 Topic page — `GrammarTopic.tsx`, route `/[lang]/english/grammar/[topic]`
The study screen for one topic, per CEFR level. Requirements:
- Header: topic title (Fraunces), family chip, the CEFR level(s) as selectable segments (the
  learner picks a level; A0–A1 open, higher gated by placement).
- **The topic animation** sits near the top as the visual anchor — an 800×450 (16∶9) Lottie
  rendered by the `GrammarAnimation` island (§5). Give it a framed, figure-like placement
  (caption optional), like a plate in a textbook.
- **RU teaching prose** is the primary explanation (it is gold, verbatim); EN explanation
  alongside/secondary. Then `structure` (the rule named), `examples` (EN with RU gloss),
  and a **pitfalls** block (wrong → right → why) styled as a cautionary callout.
- A **"confusables / related"** block linking `related` topics (and a contrast pairing).
- A primary CTA into **Practice** for this topic.

### 4.3 Practice runner — `GrammarPractice.tsx`
The exercise loop. Requirements:
- One item at a time: prompt (with a visible blank for cloze, or 2–4 option chips for MC),
  an answer input/selection, submit, then **correct / incorrect** feedback revealing the
  answer + bilingual rationale. Then "next".
- States to design: **loading/generating**, **correct** (calm green affirmation), **incorrect**
  (show right answer + rationale, never punitive), **streak/progress** within the session,
  **session complete**.
- A **cross-topic toggle** ("mix related topics") that visibly widens the pool.
- A **"more / BYOK"** affordance that is **hidden entirely when no API key is set**, and when
  present, generates extra LLM-proposed items (label it as optional/experimental).
- FSRS grades each answer behind the scenes — surface a subtle "this topic is getting
  stronger" cue, not a loud score.

### 4.4 Coverage view — `GrammarCoverage.tsx`
A reference/overview screen. Requirements:
- Reuse the existing **`CoverageMeter`** gauge pattern. Show, per CEFR band, how much of the
  English Grammar Profile is **covered** (vs waived/out-of-scope). A calm, data-as-design
  treatment — bars/gauges that read as part of the system, not an afterthought.
- Let the learner drill from a band into the topics that cover it (link to Atlas/Topic).

---

## 5. The animation island (already built — design AROUND it)

`GrammarAnimation` is a Preact island that renders a topic's diagram via **lottie-web** (SVG),
dynamically imported, mounted `client:visible`. It is **800×450 (16∶9)**, `role="img"` with an
`aria-label`. Under `prefers-reduced-motion` it holds a **static poster frame** (no playback) —
your reduced-motion mocks must show a sensible still. There are **9 visual archetypes** (timeline,
slot-fill, contrast-pair, transformation, scale, branch, swap, map, highlight) — clean, flat,
token-colored scenes with short labels. Design the **frame/caption/placement** around it on the
Topic page (and optionally a small looping preview on Atlas/Topic cards); do not redesign the
animation internals.

---

## 6. States, locales, a11y, constraints (apply to every surface)

**Interaction states** (design each): default, hover, focus-visible, active, **loading/skeleton**,
**empty** (no results / no progress yet), **locked** (gated level), **correct / incorrect**
(practice), **reduced-motion**, **BYOK hidden vs present**.

**Bilingual** — EN and RU. Every string has both; **deliver each key screen in both locales**
(RU text runs ~15–30% longer — prove the layout survives it). New UI labels live in
`site/src/i18n/ui.json`; technical terms in `glossary.json`.

**Accessibility** — WCAG 2.2 AA: keyboard-navigable (Atlas filters, practice options, level
segments), visible focus, color-contrast on the paper palette, `role="img"`+label on the
animation, never color-only state (pair with icon/text), respect reduced-motion.

**Technical constraints** — Astro 5 + Preact islands. **≤5 hydrated islands per page**;
islands are `client:visible` (design graceful pre-hydration). Responsive at **320 / 375 / 768 /
1024 / 1440**; no horizontal overflow; touch targets ≥44px. Match `english-hub.css` / `atlas-kit.css`
component shapes — reuse existing patterns (cards, chips, meters, callouts) before inventing.

---

## 7. Deliverables

For each of the four surfaces:
1. High-fidelity mockup(s) in the **light paper theme** (and dark, if the codebase has one),
   at desktop (1440) and mobile (375).
2. Both **locales** for the Topic page and Practice runner (the long-RU stress test).
3. All **interaction states** from §6 that apply.
4. A short **component breakdown** mapping regions to the four Preact components
   (`GrammarAtlas` / `GrammarTopic` / `GrammarPractice` / `GrammarCoverage`) + which existing
   tokens/classes from `global.css` / `english-hub.css` / `atlas-kit.css` each piece reuses.
5. Redlines for new spacing/sizing only where existing tokens don't cover it (prefer reusing tokens).

**Out of scope:** the adaptive study planner (separate later spec), authoring tooling, and the
animation internals. Keep everything inside the established editorial-cartographic system.
