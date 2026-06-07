# English Hub Re-skin — Design (redesign sub-project 1)

**Date:** 2026-06-07
**Status:** design approved, ready for plan
**Branch:** `feat/english-hub-reskin` (off `main`)
**Design source:** `docs/redesign/v2/` — the Claude-Design v2 handoff bundle. Primary artifact:
`docs/redesign/v2/project/English Hub.html` + `hub.css` (+ `tokens.css`/`components.css`, already
live as `global.css`/`atlas-kit.css`). Intent transcripts: `docs/redesign/v2/chats/chat2.md`.

## 0. Context

The site already shipped the editorial-cartographic design system (paper/ink tokens, Fraunces /
Inter Tight / JetBrains Mono, wordmark, atlas-kit). The v2 bundle adds **five hi-fi screen
redesigns** (English Hub, Planning, Achievements, Progression, Personal Cabinet). We implement them
**one sub-project per screen**. This spec is **screen 1: the English Hub**.

The English layer is already fully built and on the design system (vocab+SRS, reading, grammar,
collocations, output/BYOK, speaking, placement, achievements, streak — see the feature inventory in
§3.4). So this is a **re-skin + IA restructure**, not greenfield — plus four genuinely new regions
the mockup introduces (coverage meter, NEXT orchestrator, BYO-content pipe, curated listening).

## 1. Goal & scope

Rebuild `/[lang]/english/` to match the mockup: a **thin orchestrator landing** that sequences one
personalized path across what we **own**, **delegate** to the learner's AI, and **curate**. Deep
drill modules move to sub-routes. Preserve all existing functionality and wire every region to
**real data** (the mockup's placeholder JS is NOT ported).

**In scope (all approved):**
- New orchestrator-landing IA with the 8 mockup sections.
- Re-skin existing modules (vocab, reading, speaking, writing, achievements, streak, CEFR) into the
  new visual language; move deep drills to sub-routes.
- Build **four new regions for real**: Coverage meter (real-simplified), NEXT orchestrator, Curated
  listening (static curated content), BYO-content pipe (tokenize → classify → SRS cards + AI
  exercises).

**Out of scope:** the other four screens (their own sub-projects); any token/font migration (the
English layer is already on the design system); BYO URL-fetch (see §3.7 — paste-first; URL deferred).

## 2. Decisions (locked)

- **A — sub-routes.** Landing is a light orchestrator; deep modules live at
  `/english/{review,reading,grammar,writing}` (+ existing `/english/speaking`). CTAs navigate.
- **Build all four new regions** this pass (coverage, NEXT, curated, BYO).
- **BYO URL-fetch:** v1 **paste-only**; the URL field is a hint, real URL fetch deferred to a
  Cloudflare Pages Function follow-up (static site → client-side cross-origin fetch is CORS-blocked).
- **Coverage "corpus":** no per-domain frequency corpora exist → approximate with the NGSL/NAWL
  vocab bank already shipped, split by CEFR band and an engineering/everyday register; label the
  method honestly (the mockup already cites "frequency coverage, after Nation").
- **Curated listening:** ship a small curated starter set (~6–8 vetted external links) as committed
  content; author it on review.
- **Grammar** is not a top "owned" card in the mockup → reachable via the NEXT path, the nav, and the
  `/english/grammar` sub-route.
- **Security disclosure** (BYOK key entry, `KeyEntry.tsx` EN+RU) carries to `/english/writing`
  **verbatim** — never weakened.

## 3. Architecture

### 3.1 Information architecture / routing

`/[lang]/english/` (index) is rewritten into the orchestrator landing, mounting a **single light
`HubLanding` island** (one `client:visible` hydration boundary) that composes the section
components and subscribes to user state once. The existing heavy islands move to dedicated
sub-routes:

| Route | Mounts (existing island, re-skinned) |
|-------|--------------------------------------|
| `/[lang]/english/` | **new** orchestrator landing (this spec) |
| `/[lang]/english/review` | `ReviewSession` (FSRS due) + `VocabModule` (new words) |
| `/[lang]/english/reading` | `ReadingFeed` + `EnReader` |
| `/[lang]/english/grammar` | `GrammarModule` (grammar + phrasing tabs) |
| `/[lang]/english/writing` | `OutputModule` + `KeyEntry` (disclosure verbatim) |
| `/[lang]/english/speaking` | `SpeakingModule` (already exists — unchanged) |

`Today.tsx`'s sequencing logic is superseded by the new `NextPath` orchestrator on the landing;
its drill nesting (ReviewSession + VocabModule) becomes the `/review` route. `EnglishDashboard`'s
stats fold into the hub-bar (CEFR + streak) and the owned-module summary cards. Each sub-route is a
thin `.astro` page using the site's standard chrome (TopNav + footer, same layout the current hub
uses) with a back-link to the hub and the section's existing island.

### 3.2 Styling

Port `docs/redesign/v2/project/hub.css` into a site stylesheet **`src/styles/english-hub.css`**
(imported by the hub landing + reused class vocabulary). Every token it references
(`--accent`, `--d-ai`, `--muted`, `--card`, `--hairline*`, `--s-*`, `--r-*`, `--font-*`,
`--ok`, `--warn`, `--contour-opacity`) **already exists** in the live `global.css` — no token work.
Add the three mode anchors at the top (`--own: var(--accent); --delegate: var(--d-ai);
--curate: var(--muted);`). Keep the responsive breakpoints (920 / 760 / 460) from `hub.css`.

Sub-route drill modules keep their current styles (already on the system); only their page wrapper
gets the new section-head treatment.

### 3.3 New files

- **Landing island (one `client:visible` boundary):**
  - `src/components/english/hub/HubLanding.tsx` — composes the dynamic landing; subscribes to
    `englishState` / `register` once and passes data into the focused section components below. A
    single hydration boundary keeps the landing light (the heavy drills live on sub-routes).
- **Section components (plain Preact, rendered inside `HubLanding` — NOT separate islands):**
  - `HubBar.tsx` — register toggle + CEFR chip + streak.
  - `CoverageMeter.tsx` — gauge + frequency bands (§3.5).
  - `NextPath.tsx` — Own/Delegate/Curate ordered actions (§3.6).
  - `ByoPipe.tsx` — paste → extract → build → reuse (§3.7).
  - `OwnedModules.tsx` — Vocab + Reading summary cards (live due count + reading-coverage ring).
  - `Launchpads.tsx` — Speaking + Writing launchpad cards (persona + structured task + BYOK chip).
  - `CuratedLibrary.tsx` — listening list + how-to (from `data/listening.ts`).
  - `HonestStrip.tsx` — "what we don't build" copy (static).
  (All under `src/components/english/hub/`.)
- **Logic / data:**
  - `src/english/coverage.ts` — pure coverage computation (§3.5).
  - `src/english/byo/` — `tokenize.ts`, `classify.ts`, `cards.ts`, `exercises.ts` (§3.7).
  - `src/english/data/listening.ts` — curated external listening links (content).
  - `src/english/register.ts` — `register` signal (`"engineering" | "everyday"`) + persistence.
- **Sub-route pages:** `src/pages/[lang]/english/{review,reading,grammar,writing}.astro`.

### 3.4 Section-by-section

The landing renders the eight mockup sections in order. Existing-feature status from the inventory:

1. **Hub-bar** — kicker + `<h1>English Hub</h1>` + sub; **register toggle** (Engineering ⇄ Everyday,
   new control bound to `register` signal); **CEFR chip** (current band + progress to next, from
   `getPlacement().band`); **streak chip** (from `userState.progression.streak`). *Re-skin + new
   toggle.*
2. **01 · Coverage meter** *(NEW, real-simplified)* — `CoverageMeter` component. §3.5.
3. **02 · NEXT orchestrator** *(NEW, real)* — `NextPath` component. §3.6.
4. **03 · BYO-content pipe** *(NEW, heavy)* — `ByoPipe` component. §3.7.
5. **04 · Built here (Owned)** — two summary cards: **Vocabulary** (due count, 7-day review-schedule
   sparkline, retention stat → `/review`) and **Reading** (known-% ring + new-terms count →
   `/reading`). Data from `englishState` (`dueWordIds()`, card stats) + a reading-coverage read.
   *Re-skin of existing.*
6. **05 · Routed to your AI (Delegated)** — two launchpad cards: **Speaking** (persona "The Skeptical
   Reviewer" + structured task + BYOK-connected chip → `/speaking`) and **Writing** (persona "The
   Precise Editor" + task + BYOK chip → `/writing`). BYOK status from `byok/store`. Persona/task copy
   from the mockup. *Re-skin of existing.*
7. **06 · Curated, not built** *(NEW, static)* — `CuratedLibrary` from `data/listening.ts`: leveled
   external items (video/podcast · minutes · B1/B2 · intensive/extensive note) + the intensive vs
   extensive how-to. External links open in a new tab.
8. **08 · What we don't build** *(NEW, static)* — three "we don't X → we route you to Y" items.

### 3.5 Coverage computation (`src/english/coverage.ts`)

Pure, deterministic, no I/O. Inputs: the user's known-word set (derived from `englishState` cards +
placement seed) and the vocab bank (`vocab-a2/b1/b2.ts`, NGSL-ranked + NAWL academic), filtered by
the active `register`.

- `knownCount(band)` / `totalCount(band)` per CEFR band (A2/B1/B2) → band rows (mockup's `bandList`),
  each colored by tier: `≥90%` ok, `75–90%` accent, `<75%` warn (the mockup legend).
- `coveragePercent()` = overall known / total across the active register's bank → the gauge value
  (arc dash-offset + readout number). Threshold ticks at 75% (functional) and 90% (fluent) are
  static, matching the gauge geometry in `hub.css`.
- Register: `"engineering"` weights the engineering/NAWL-academic subset; `"everyday"` the general
  NGSL subset. The corpus name + word-family count in the bands header reflect the active register.
- Honest framing: this measures coverage **of our vocab bank**, not an arbitrary corpus — the
  citation copy stays "frequency coverage, after Nation".

**Render note (Preact):** draw band fills as in-flow block `<div>`s with inline `width:N%` (NOT a
block nested in an inline element — that parser bug cost the mockup hours per `chat2.md`; we control
the DOM so we avoid it). Gauge value = an SVG arc `stroke-dashoffset` from the percent. Respect
`prefers-reduced-motion` (no transition).

### 3.6 NEXT orchestrator (`src/components/english/hub/NextPath.tsx`)

Assembles an ordered list of 3–5 actions from **real signals**, each tagged Own/Delegate/Curate with
the mockup's visual language (solid-accent / dashed-rose / dotted-graphite left border):

- **Own — due cards:** if `dueWordIds().length > 0` → "Clear today's N due cards", est-min from
  count, route → `/review`, cite Roediger & Karpicke.
- **Own — reading:** pick the recommended reading unit at the comprehensible-input sweet spot
  (known-% near 90 for that unit's words) → "Read '<unit>'", route → `/reading`, cite Krashen.
- **Delegate — speaking:** a structured speaking task → "Explain <topic> aloud", route → `/speaking`
  (your AI / BYOK), cite Swain.
- **Curate — listening:** the top curated item for the band → "Watch '<title>'", external ↗.
- Optional **Own — grammar/writing** nudge if due.

Ordering: due-retrieval first (decay risk), then input (reading), then output (speaking/writing),
then immersion (curate) — a fixed priority over the available signals. Completed/empty signals drop
out. Pure selection (`useMemo` over the state signals); no new persistence.

### 3.7 BYO-content pipe (`src/english/byo/` + `ByoPipe.tsx`)

The heavy new feature. Paste-first (URL deferred, §2).

- **Input:** a textarea (paste) + a Text/URL segmented control + "Make lesson". URL selected →
  inline note "paste the text for now" (no fetch in v1). Example chips prefill the textarea.
- **`tokenize.ts`** — split pasted text into word tokens; lowercase; strip punctuation; basic
  lemma normalization (plural/-ing/-ed suffix folding) sufficient to hit the vocab bank's lemmas.
- **`classify.ts`** — for each unique lemma classify against the bank + the user's known set:
  **known** (in known set), **new** (in bank, not known), **technical** (not in NGSL bank / in NAWL
  or unknown-non-bank). Returns counts + the new/technical lemma lists → the extract bar (mockup's
  `eb known/new/tech`).
- **`cards.ts`** — create real SRS cards for the "new" lemmas into `englishState` (reuse the existing
  card-creation path so FSRS scheduling + sync apply). Idempotent (skip lemmas already carded).
- **`exercises.ts`** — generate cloze / comprehension / retell exercises from the source via the
  existing `byok/anthropic.ts`. **Requires a BYOK key**; with no key, cards are still created and the
  exercise area shows an "add your AI key" affordance (graceful degrade — never blocks the core
  vocab extraction). The security disclosure path is unchanged.
- **Reuse-five-ways** chips route each reuse to its mode: comprehension/vocab (Own, built here),
  dictation/retell/imitation (Delegate → AI coach).

### 3.8 i18n / themes / a11y / security

- **Bilingual:** inline `L = lang === "en" ? {...} : {...}` objects per component (the established
  English-layer pattern); every new string EN+RU. Verify Russian doesn't clip in the new dense
  layouts (gauge readout, band rows, action cards, pipeline chips).
- **Themes:** light + dark via the existing `data-theme`; all new CSS uses tokens, so both themes
  come free. Verify both.
- **A11y:** focus-visible rings (token), `aria-label`/`aria-pressed` on toggles and the gauge,
  semantic headings, `prefers-reduced-motion` on gauge/contour/hover, ≥44px touch targets, the skip
  link. External links `rel="noopener"`.
- **Security:** the BYOK disclosure copy moves to `/english/writing` unchanged (EN+RU). The BYO-pipe
  AI-exercise call reuses the audited `byok/anthropic.ts` path — no new key handling, no new egress.

## 4. Validation & tests

- **Unit tests** (pure modules): `coverage.ts` (band/overall percent, register split, edge: zero
  known → 0%, all known → 100%); `byo/tokenize.ts` + `classify.ts` (known/new/technical split on a
  sample text; punctuation/case/suffix folding; empty input → empty result).
- **Build gate:** `cd site && bun run build` — full build green, `dist/lint-report.json` 0/0,
  expected page count grows by the 4 new sub-routes × 2 langs (= +8 pages).
- **Hydration budget:** the landing mounts a **single** `HubLanding` island (one hydration); the
  heavy drill islands live on their own sub-routes.
- **Visual check:** open `/en/english` and `/ru/english` in light + dark; verify the 8 sections,
  Russian reflow, mobile (≤760, ≤460) reflow per `hub.css` breakpoints, and each CTA navigates to
  its sub-route. Confirm the BYOK disclosure text on `/english/writing` is byte-identical to today.
- **BYO smoke:** paste a sample paragraph → extract bar shows a plausible known/new/tech split →
  "new" lemmas create SRS cards (visible as due) → with a key, exercises generate; without a key, the
  graceful "add key" state shows and cards still create.

## 5. File touch list

| File | Change |
|------|--------|
| `src/pages/[lang]/english/index.astro` | rewrite → orchestrator landing (8 sections) |
| `src/pages/[lang]/english/review.astro` | **new** — ReviewSession + VocabModule |
| `src/pages/[lang]/english/reading.astro` | **new** — ReadingFeed + EnReader |
| `src/pages/[lang]/english/grammar.astro` | **new** — GrammarModule |
| `src/pages/[lang]/english/writing.astro` | **new** — OutputModule + KeyEntry |
| `src/styles/english-hub.css` | **new** — ported from `hub.css` (tokens already exist) |
| `src/components/english/hub/HubLanding.tsx` | **new** — the single landing island (composes sections) |
| `src/components/english/hub/{HubBar,CoverageMeter,NextPath,ByoPipe,OwnedModules,Launchpads,CuratedLibrary,HonestStrip}.tsx` | **new** section components (plain Preact, no own hydration) |
| `src/english/coverage.ts` (+ `.test.ts`) | **new** pure coverage logic |
| `src/english/byo/{tokenize,classify,cards,exercises}.ts` (+ tests) | **new** BYO pipe logic |
| `src/english/register.ts` | **new** register signal |
| `src/english/data/listening.ts` | **new** curated listening content |
| `src/components/english/{Today,EnglishDashboard}.tsx` | reduced/retired — logic absorbed by landing + sub-routes (keep what `/review` still needs) |

Existing deep-module components (`ReviewSession`, `VocabModule`, `ReadingFeed`, `EnReader`,
`GrammarModule`, `OutputModule`, `KeyEntry`, `SpeakingModule`) are **reused unchanged** on the
sub-routes (visual tweaks only if needed for the section-head wrapper).

## 6. Risks & decisions

- **BYO URL fetch** — CORS on a static site blocks arbitrary client-side fetch → **paste-only v1**;
  URL via a CF Pages Function is a follow-up.
- **Coverage is bank-coverage, not arbitrary-corpus coverage** — accepted approximation; framed
  honestly. A true per-text coverage already exists per reading unit (EnReader) and can later feed a
  richer meter.
- **`Today.tsx` retirement** — its sequencing is replaced by `NextPath`; ensure the `/review` route
  preserves the new-words + due-review flow it used to host. Migrate, don't drop, that behavior.
- **Hydration / page weight** — landing kept light by moving heavy islands to sub-routes (the reason
  IA-A was chosen).
- **Curated content freshness** — external links rot; keep the set small and dated, easy to update.
- **Scope size** — large; the plan decomposes into independent tasks (landing shell + CSS port; the
  4 sub-routes; HubBar; Coverage island + lib; NextPath; Curated + Honest; BYO lib; BYO island),
  with the BYO pipe last and most isolated so it can slip without blocking the rest.
