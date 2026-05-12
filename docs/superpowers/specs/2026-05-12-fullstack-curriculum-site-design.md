# Fullstack Curriculum Site — Design Spec

**Date:** 2026-05-12
**Status:** Draft → awaiting user approval
**Supersedes (in scope):** `2026-05-12-astro-pivot-design.md` for the curriculum site dimension; the Astro pivot's component vocabulary is *inherited*, not replaced.
**Pedagogy source:** `compass_artifact_wf-8aeb4856-eed4-4587-9788-de184882c6bd_text_markdown.md`
**Depth bar source:** `curriculum.md` (16 pillars, three-tier scoping)

---

## 1. Goal

Ship a bilingual, free, static educational site that delivers **middle+ / senior fullstack** theoretical knowledge across all 16 pillars from `curriculum.md`. The site treats every pillar as a chapter under one Tier-3 Topic ("Senior Fullstack Curriculum"). Pedagogy follows the synthesis in the compass artifact: expertise-reversal-aware tier disclosure, faded worked examples, retrieval practice, spiral re-entry, system-paced animations, reactive diagrams, persona mnemonics, sandbox closures.

V1 is a skeleton-first ship: the navigation, pedagogy machinery, and pretest are complete from launch; Chapter 01 (Networking) is fully authored; chapters 02–16 exist as browsable "coming soon" shells whose content fills in chapter-by-chapter via the `/infographic` command.

## 2. Non-goals

- No backend, accounts, sync, email, or push notifications. localStorage-only persistence.
- No DAG canvas nav in V1 (pillar grid replaces it; can be added later behind a toggle).
- No video/animation export; only in-page GSAP + SVG motion.
- No AI tutor / chat; only static content with structured interactivity.
- No native mobile app; PWA `manifest.json` only.

## 3. Locked product decisions

| # | Decision |
|---|---|
| Scope | Tier-3 Topic, 16 chapters (one per pillar). MAP + 16 chapter stubs. Chapter 01 fully rendered. |
| Depth tiers | 3-tier: Junior / Middle / Senior — per-section accordions. |
| Tier routing | 3-Q site-wide pretest (Kalyuga rapid diagnostic) → sets default tier in localStorage. Per-article toggles override. |
| Visual style | ByteByteGo bright (Inter sans + pastel pill panels + teal accent) — extends existing Astro tokens. |
| Navigation | Home = 16-card pillar grid with progress rings; chapter = sticky sidebar tree + reader. |
| Authoring | Skeleton-first scaffold (256 stub MDX). `/infographic` command authors chapters on demand. |
| Pedagogy stack | Full compass set: pretest, tier accordions, faded WOE, retrieval drawer, reactive diagrams, system-paced animations, persona mnemonics, spiral threads, prereq checkmarks, chapter sandbox, spaced-revisit banner. |
| Language | Bilingual EN + RU per piece via Astro built-in i18n. Controlled translation via `glossary.json`. |
| Persistence | localStorage-only. Tier preset, history, retrieval attempts, motion preference, manual tier flips. |
| Widget framework | Astro 5 static + Preact islands for stateful pedagogy widgets + vanilla TS for stateless (existing diagram primitives). |
| Deployment | Cloudflare Pages (Hetzner CAX21 as alt; same static output). |

## 4. Runtime stack

- **Astro 5** — static output (`output: "static"`).
- **Preact 10** via `@astrojs/preact` — stateful islands.
- **@preact/signals** — single global `userState` signal + per-widget signals.
- **Tailwind CSS 3** — design tokens already configured (`site/tailwind.config.ts`).
- **GSAP 3** — ScrollTrigger, MotionPathPlugin (already wired).
- **MDX** via `@astrojs/mdx` — piece authoring.
- **Astro i18n** — EN/RU locale routing with fallback.
- **Bun** — package manager + runner.
- **Cloudflare Pages** — host (Hetzner alt).
- **Vitest** — unit tests.
- **Playwright** — smoke tests.

## 5. Repo layout

```
docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md   (this file)
docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md          (next phase, writing-plans)

site/
  astro.config.mjs                          # add preact() + i18n
  package.json                              # add @astrojs/preact, preact, @preact/signals, vitest, playwright
  tailwind.config.ts                        # unchanged
  src/
    content/
      config.ts                             # collections: pillars, chapters, pieces
      pillars/01-networking.json … 16-engineering-practice.json
      chapters/01-networking.json … 16-engineering-practice.json
      pieces/<lang>/<pillar>/<NN-piece>/index.mdx
    pages/
      index.astro                           # 301 → /en/
      [lang]/index.astro                    # PillarGrid
      [lang]/[pillar]/index.astro           # ChapterOverview + Sidebar
      [lang]/[pillar]/[piece].astro         # Article reader (Topic layout)
      [lang]/about.astro
      [lang]/settings.astro                 # tier, motion, lang, reset
    layouts/
      Topic.astro                           # outer chrome
      Chapter.astro                         # sidebar + main slot
      Book.astro                            # existing — refactored
    components/
      brand/        TitleBar.astro, LangSwitch.astro, SourcesFooter.astro
      layout/       Stage.astro, Card.astro, Misconception.astro, NumbersCard.astro,
                    Pill.astro, StepBadge.astro, PrereqBadge.astro, TierBadge.astro
      diagram/      Connector.astro, Node.astro, Pulse.astro, Reveal.astro,
                    PacketDot.astro, CountUp.astro, TypingText.astro (all existing)
      prose/        Callout.astro, KeyTakeaway.astro, Sidenote.astro, Term.astro,
                    Crux.astro, SpiralCue.astro
      pedagogy/     Pretest.tsx, TierAccordion.tsx, FadedExample.tsx,
                    RetrievalDrawer.tsx, ReactiveDiagram.tsx, Sequencer.tsx,
                    Sandbox.tsx, ProgressMeter.tsx, SpacedRevisitBanner.tsx,
                    SettingsDrawer.tsx, PersonaTag.astro
      nav/          PillarGrid.astro, ChapterSidebar.astro, ChapterSidebarTOC.tsx
    scripts/
      gsap-setup.ts          (existing)
      motion-flag.ts         (existing)
      user-state.ts          (new — single source of truth for localStorage)
      tier-router.ts         (new — pretest scoring)
    i18n/
      ui.json                # UI labels per locale
      glossary.json          # technical terms locked
    styles/global.css
    lint/
      index.ts               # Astro integration (text budgets, depth checkpoints, parity, hydration)
      rules/                 # one file per rule
scripts/
  scaffold-curriculum.ts     # one-shot generator for pillars/chapters/stub pieces
  svg-to-png.sh              (existing)
```

## 6. Content model

### 6.1 Collections (`site/src/content/config.ts`)

Three collections: `pillars` (data), `chapters` (data), `pieces` (content/MDX). Schemas use Zod, enforcing pillar enum (16 known slugs), tier enum, spiral enum.

`pieces` frontmatter (mandatory):

```yaml
slug: tcp-handshake
lang: en
pillar: networking
chapter: 01-networking
order: 3
title: TCP handshake
summary: ...
readingMin: 12
status: stub | draft | ready
prereqs: [ip-packet, ports-and-sockets]
spiral: [statefulness, latency]
personas: [bea, sven]
depth:
  mechanism: section-three-way
  tradeoff: card-rtt
  failure_mode: mc-syn-flood
  numbers: card-budget
sources:
  - https://datatracker.ietf.org/doc/html/rfc9293
  - https://hpbn.co/building-blocks-of-tcp/
```

### 6.2 Directory layout (content)

```
content/
  pillars/<NN>-<slug>.json         16 files
  chapters/<NN>-<slug>.json        16 files
  pieces/
    en/<pillar>/<NN>-<piece>/index.mdx
    ru/<pillar>/<NN>-<piece>/index.mdx
```

EN + RU share `slug`. Each chapter caps at 12 pieces (per `curriculum.md`). Typical chapter = 8 pieces + 1 final `putting-it-together`.

### 6.3 Stubs vs ready

- `status: "stub"` — coming-soon shell, exempt from full lint, no `getStaticPaths` exclusion (still rendered as a real URL with crux + outline).
- `status: "draft"` — full content but flagged for review; linter runs; not yet in chapter index navigation strip.
- `status: "ready"` — fully published, linter strict, appears in nav, counts toward progress.

## 7. Pedagogy machine

### 7.1 Article skeleton

Order in body (MDX):

1. `<Crux />` — single ≤140-char question.
2. Hook paragraph (prose).
3. `<PersonaTag />` cast (intro chapter pieces only).
4. **Mechanism** — wrapped in `<TierAccordion>` blocks, one per major sub-mechanism.
5. `<FadedExample />` — one or two per piece, for the key procedural concept.
6. `<ReactiveDiagram />` — one per piece, for the dominant tradeoff or quantity.
7. `<Sequencer />` + SVG actors — one per piece, for time-sequenced mechanism.
8. `<RetrievalDrawer />` — 2–3 open-recall Qs at end.
9. `<SpiralCue thread="..." />` — embedded reference back to the spiral concept.
10. Cross-link block — prereq checkmarks + "next" prompt.

Chapter-final piece (`NN-putting-it-together`) replaces step 6 with `<Sandbox />`.

### 7.2 Pretest

`Pretest.tsx` mounts on first visit to `/[lang]/`. Three MC questions sampled from `pretest.json`. Each answer carries a tier weight (junior/middle/senior). Total score → tier. Persists in `userState.pretest`. Skippable (skip → `tier=middle`). Re-takeable from settings.

### 7.3 Tier accordion

`<TierAccordion>` pills: `intuition · core · deep`. Default-open tier = `userState.tier`. Click any pill → opens that tier locally and increments `manualTierFlips`. After 3 flips, settings page surfaces "make this your default tier" nudge.

Authoring discipline (linter-enforced):

- `middle` slot is mandatory.
- `junior` is short intuition (≤180 words) + analogy + maybe one persona dialog.
- `senior` is dense reference (numbers, RFC pointers, edge cases, compact diagrams) — no re-explaining of middle material.

### 7.4 Faded worked examples

`<FadedExample>` carries a three-step scenario:

- **Solved** — fully worked, all reasoning visible.
- **Semi** — one or two *conceptually-significant* blanks (not trailing-line blanks per Shin 2023). Submit checks each; per-wrong-answer feedback from `misconceptions` map.
- **Blank** — same problem stripped to prompt only; "Reveal solution" expands.

Implemented as a Preact stepper. Records completion to `userState.history[slug].faded[exampleId]`.

### 7.5 Retrieval drawer

`<RetrievalDrawer>` at piece end. 2–3 open-recall textareas. Per Q, "Reveal answer" expands. Smith & Karpicke (2021): open recall > MCQ. Attempts logged to `userState.retrieval[slug]`.

### 7.6 Reactive diagrams

`<ReactiveDiagram>` props: `inputs`, `compute`, `render`. RAF-batched. Concrete instances (one per piece in V1 Networking):

- **BDP** (bandwidth-delay product) — sliders for RTT, bandwidth, MSS → BDP, slow-start time, packets in flight.
- **TCP throughput vs loss** (Mathis equation) — MSS, RTT, loss% → throughput.
- **Latency budget** — hops as stacked bars; drag any to see total impact on LCP.
- **HTTP/2 multiplexing** — concurrent streams slider → HOL-blocking residual.
- **TLS resumption** — cold/warm/0-RTT toggle → handshake time saved.
- **DNS cache hit rate** — TTL slider → cache-hit % over simulated 1h.

### 7.7 System-paced animations

`<Sequencer>` orchestrates timeline of `steps[]`. Each step duration in ms; play/pause/step-fw/step-bk. Sibling SVG actors (`<Connector>`, `<PacketDot>`, persona avatars) animate per step.

V1 Networking animations:

- TCP 3-way handshake (SYN → SYN-ACK → ACK).
- TLS 1.3 handshake (ClientHello+keyshare → ServerHello+cert+Finished → Finished+app data).
- DNS recursive resolution (stub → recursive → root → TLD → auth).
- HTTPS request end-to-end (composite: DNS + TCP + TLS + HTTP).

### 7.8 Persona mnemonics

7 actors in `personas.json`:

| id | name | role | color |
|---|---|---|---|
| bea | Bea | Browser | lilac |
| rex | Rex | OS resolver | mint |
| rita | Rita | Router | peach |
| sven | Sven | Server | sky |
| cara | Cara | Certificate authority | rose |
| otto | Otto | Origin database | mint |
| patty | Patty | Proxy / CDN edge | peach |

`<PersonaTag id="bea" />` inlines avatar + name. Used inside `Sequencer` steps and `FadedExample` prose.

### 7.9 Spiral threads

Four cross-cutting concepts that recur across chapters:

1. **Encapsulation** — networking, APIs, security.
2. **Multiplexing** — TCP/HTTP-2/3, queues, connection pools, JS event loop.
3. **Statefulness** — sessions, caches, distributed consistency, frontend state.
4. **Latency** — networking, perf, caching, DB.

Each piece declares `spiral: [...]`. `<SpiralCue thread="multiplexing">` renders a small chip that anchors to a spiral-thread index page (`/[lang]/threads/multiplexing/`).

### 7.10 Sandbox

Chapter-final piece. One Preact widget per chapter. Networking sandbox: `RequestBudgetSandbox` — pick L4 (TCP/UDP/QUIC), auth (none/JWT/mTLS), edge proxy (none/CDN/full mesh), DNS strategy (uncached/warm) → outputs latency budget breakdown, failure modes, cost class.

### 7.11 Spaced revisit

`SpacedRevisitBanner` sticky strip atop `Topic` layout. Reads `userState.history` + `retrieval`. Picks piece whose `lastAt` is >1d / >7d / >30d AND `retrieval.attempted` is false or >7d old. Dismissable per slug until next threshold.

## 8. Persistence

Single source: `site/src/scripts/user-state.ts`. Exports a `signal<UserState>` plus typed mutators. localStorage key `awesome.user-state.v1`. Migration path: when `v1` → `v2` shape, retain prior key as backup and run a one-time mapper.

```ts
type UserState = {
  tier: "junior" | "middle" | "senior";
  lang: "en" | "ru";
  motion: "on" | "off" | "auto";
  pretest: { takenAt: number; score: number; answers: number[] } | null;
  history: Record<PieceSlug, { firstAt: number; lastAt: number; tiersOpened: Tier[];
    faded?: Record<string, true>; }>;
  retrieval: Record<PieceSlug, { attempted: boolean; lastAt: number; attempts: number }>;
  dismissedRevisit: Record<PieceSlug, number>;  // timestamp dismissed
  manualTierFlips: number;
};
```

SSR-safety: every reader checks `typeof window`. Widgets that need state at first paint use `client:only="preact"`.

## 9. i18n

- Astro built-in i18n in `astro.config.mjs`:
  ```js
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: true },
    fallback: { ru: "en" },
  }
  ```
- URL: `/{lang}/{pillar}/{piece}/`.
- `LangSwitch.astro` resolves twin piece via `slug` lookup, falls back to EN if RU missing (Astro fallback) with a small `(en fallback)` badge.
- `i18n/ui.json` keyed by locale for UI strings.
- `i18n/glossary.json` locks RU terms. Schema:
  ```json
  { "tcp_segment": { "en": "TCP segment", "ru": "TCP-сегмент" }, ... }
  ```
- Linter rule 6 enforces glossary use in RU pieces.
- Code blocks, command lines, error strings, RFC numbers: identical EN/RU.

## 10. Build pipeline

- `bun install` — installs `@astrojs/preact`, `preact`, `@preact/signals`, `vitest`, `@playwright/test`.
- `bun run check` — `astro check` (TS + Astro).
- `bun run build` — full build; linter integration runs on `astro:build:done`.
- `bun run dev` — Astro dev server.
- `bun run preview` — local static preview of `dist/`.
- `bun run test` — Vitest unit tests (`user-state`, `tier-router`, `compute` functions for reactive diagrams).
- `bun run e2e` — Playwright smokes (Chromium only V1).

### 10.1 Linter rules

1. Text budgets (Crux ≤140, KeyTakeaway ≤220, Misconception ≤320, Card annot ≤240).
2. Depth checkpoint id resolution.
3. TierAccordion `middle` slot mandatory.
4. Hydration island count ≤5 per page.
5. Spiral declarations cross-checked against body (`<SpiralCue>` or word match).
6. i18n parity + glossary enforcement.
7. Sources: ≥1, URL-shaped.
8. Reduced-motion CSS path exists for every `[data-animated]`.
9. Persona id resolution.

Failures abort build. Warnings logged to `dist/lint-report.json`.

### 10.2 Tests

- Unit (Vitest): `user-state` load/save/migrate; signal effects; `tier-router` scoring; reactive-diagram `compute` numerical correctness against fixed inputs.
- E2E (Playwright): home loads, pretest completes, tier flip persists across reload, language switch resolves twin, retrieval drawer reveals answer, sandbox runs.
- No visual regression V1.

## 11. Deployment

Primary: **Cloudflare Pages**. `wrangler.toml` in repo. Push-to-build via `bun install && bun run build`.

Alt: **Hetzner CAX21** + nginx serving `site/dist/`. Identical artefact; flipping is a deploy-target swap.

PWA: `manifest.json` + offline-cache the shell + last 3 visited pieces via service worker (deferred to P3).

## 12. Phased rollout

| Phase | Goal | Output |
|---|---|---|
| P0 | Foundation + skeleton | Astro+Preact wired. `pillars/*.json`, `chapters/*.json`, ~256 stub MDX. Coming-soon shells render. Pretest + tier accordion + nav + persistence shipped. |
| P1 | Pedagogy widgets | `FadedExample`, `ReactiveDiagram`, `Sequencer`, `RetrievalDrawer`, `Sandbox`, `SpacedRevisitBanner`, persona system, spiral threads. Linter v1. Vitest + Playwright smokes. |
| P2 | Chapter 01 Networking — full | 8–10 pieces × EN+RU = ~16–20 MDX `status: ready`. Personas, sandbox, sources. Lint + visual checks. |
| P3 | `/infographic` rewrite + docs | Command rewritten for new pipeline. `CLAUDE.md`, `style-guide.md`, `curriculum.md` updated to reference site/. |
| P4+ | Chapters 02–16 | One pillar per cycle. `/loop 99min` cadence keeper. |

## 13. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Bilingual authoring doubles cost | `glossary.json` + linter parity → controlled translation |
| Linter false positives | `// lint-ignore: <reason>` escape per element |
| Hydration explosion | Hard cap 5 islands/page; review at PR-time |
| Pedagogy over-engineering | P0 ships without full widgets; site browsable even if P1 slips |
| Stale stubs feel like vapourware | Coming-soon shells include crux + outline + ETA badge |
| Translation drift | Glossary-locked terms; tests checking parity |
| Distill-style sliders fragile on mobile | `@media (pointer: coarse)` swaps slider for `+/-` steppers |
| Compass research extrapolation (faded WOE for protocols vs programming) | Add `?lint=verbose` mode logging WOE engagement; locally A/B-test after P2 |

## 14. Acceptance criteria

- `bun run build` succeeds from a clean `bun install` on macOS arm64.
- `bun run check` passes.
- Visiting `/` redirects to `/en/` and shows pillar grid with 16 cards.
- Pretest renders on first visit and writes `userState.pretest`.
- Switching tier via accordion persists across reload.
- Chapter 01 piece `tcp-handshake` exists in EN + RU, both render full content, linter passes.
- LangSwitch on `/en/networking/tcp-handshake/` resolves to `/ru/networking/tcp-handshake/`.
- RetrievalDrawer answer reveal logs `attempted: true`.
- SpacedRevisitBanner appears on `/en/` after history has any piece with `lastAt > 86400000` and `retrieval.attempted = false`.
- Reduced-motion query disables `Pulse`, `PacketDot`, `Sequencer` timeline transitions.
- `dist/lint-report.json` exists with zero `errors`.

## 15. Open questions (deferred to plan)

1. Pretest question authoring — initial 30-question bank scope (3 per pillar × 16 = 48 if we want full coverage; or 9 questions on 3 dominant pillars).
2. Persona avatar art — SVG by hand or auto-generate via `@iconify` + minimal restyle.
3. Cloudflare Pages vs Hetzner final choice — defer to launch readiness.
4. PWA service worker scope — bundled in P3 or deferred.
5. Chapter-02 ordering — `databases` next (because Networking → Backend feels weak without DB) or `browser-runtime` next (because front of the stack).

These don't block the implementation plan — pick at plan-writing time or P3.

---

## 16. Spec self-review

### Placeholder scan

No `TBD`, no `TODO`, no `implement later`. Section 15's "open questions" are explicitly scoped as plan-time decisions, not unfilled spec.

### Internal consistency

- `pieces.depth` schema (§6.1) lists `mechanism`, `tradeoff`, `failure_mode`, `numbers` — matches linter rule 2 (§10.1) and existing pilot file `book/networking/how-internet-works.mdx`.
- `Tier` enum in §6.1, §7.3, §8 — identical: `junior | middle | senior`.
- Persona ids in §7.8 — same set referenced by linter rule 9 (§10.1).
- Spiral thread enum identical in §6.1 (frontmatter), §7.9 (description), linter rule 5 (§10.1).
- Hydration cap 5 mentioned once in §4 architecture (Section 4 of brainstorm), enforced by linter rule 4 (§10.1).
- Phased rollout (§12) names match the brainstorm phases.

### Scope check

Single implementation plan covers this. Plan will likely break P0/P1/P2 into ~30–40 tasks. P3 (command rewrite) is small. P4+ is *not* a plan — it's an ongoing authoring loop driven by `/infographic` + `/loop 99min`, outside the implementation plan.

### Ambiguity check

- "Coming-soon shells" — clarified §6.3: `status: "stub"` renders a real URL with crux + outline only, lint exempt.
- "Pretest re-takeable" — clarified §7.2: from settings page; weight semantics in `pretest.json`.
- "Senior addendums must not re-explain middle" — clarified §7.3, enforced editorially (not lint-able in V1).
- "RU controlled translation" — clarified §9: glossary-driven; linter rule 6 fails on unknown technical terms.
- "Spaced revisit thresholds" — clarified §7.11: 1d/7d/30d, dismissable per slug.

No ambiguity blocking implementation.

---

## 17. Next step

`superpowers:writing-plans` to produce `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` covering Phases P0 → P3 (P4+ deferred to autonomous loop).
