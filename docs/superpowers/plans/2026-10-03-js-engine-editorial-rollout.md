# js-engine Editorial Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the js-engine editorial redesign by converting the 28 remaining AlgoPoster-embedded lessons to the editorial schematic system, giving figure-less lessons real schematics, then extending the shell to other tracks.

**Architecture:** The editorial shell (Lesson.astro, lesson-kit.css, atlas-kit.css, SkeinFigure kit, ui.json) is already shipped to all 41 lessons by commit `9b51673d`. What remains is per-lesson composition work: each lesson's MDX must carry the Hook → Crux → Explanation → KeyTakeaway rhythm with 1–3 properly-tiered figures, and every AlgoPoster embed (cream `#f6ecd2` + 3px black border + hard shadow — the banned "AI-generated infographic" look) must be replaced by a real schematic figure or a quiet Tier-C recap strip.

**Tech Stack:** Astro 5 MDX, Preact islands (hydration cap: 5/lesson), `is:inline` progressive enhancement for interactivity (zero hydration), Playwright for visual QA.

**Spec:** `docs/superpowers/specs/2026-10-02-js-engine-editorial-redesign-design.md` (mission + reference-batch decisions)
**Prior plan:** `docs/superpowers/plans/2026-10-02-js-engine-editorial-redesign.md` (reference batch — DONE, commit `9b51673d`)

## Global Constraints

- Bilingual or refuse: every lesson edit ships EN+RU in the same task; RU translation uses `site/src/i18n/glossary.json` terms (add new terms alphabetically).
- Text budgets: Crux ≤140 chars, KeyTakeaway ≤220 chars, Misconception ≤320 chars, Card annotation ≤240 chars.
- Hydration cap = 5 islands per lesson page. Interactive figures must use `<script is:inline>` (progressive enhancement), never a client island.
- All lesson-page figures render inside `<SkeinFigure>` with `data-span` tier: `reading` (680px) / `learning` (840px) / `canvas` (1120px).
- Canvas-tier figures (`min-width: 930px` base) MUST release `min-width: 0` at `≤1100px` (2-col fallback) and stack 1-col at `≤640px` — the responsive tiering pattern from EventLoopPredict/ICStateStepper.
- `MachineValue` (`sk-mv`) is `white-space: nowrap` globally; inside prose lists (`lk-seq`) override with `white-space: normal !important`.
- No `git add -A` (1300+ unrelated dirty files in the tree). Stage only files each task touches. Commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Lesson preview route returns `[]` from `getStaticPaths()` in production — visual QA requires a live `astro dev` server (ports 4321/4322 both serve it).
- Domain lock: js-engine lessons stay fullstack-engineering depth (middle+/senior bar — war-story register, not docs register).

## Review Focus

- **AlgoPoster visual DNA survives replacement** — a replaced poster must not leave cream background, 3px black borders, or hard drop shadows anywhere; visual QA greps rendered HTML for `#f6ecd2`, `3px solid`, `box-shadow: 4px 4px`.
- **RU overflow** — Cyrillic glyphs run ~10% wider than EN; every batch is screenshotted in both locales at 390px and body.scrollWidth must equal viewport width.
- **Hydration cap breach** — adding an interactive figure to a lesson that already has 4 islands must fail the build linter; check `dist/lint-report.json` per batch.
- **Figure-less lessons get figures, not just captions** — 2 lessons (`02-values-and-memory/05-string-internals`, plus any discovered) currently have zero schematic imports; a composition edit without a real figure is a rejection.
- **Cross-track shell breakage** — Lesson.astro is shared by all 44 tracks; any shell change must be verified against a non-js-engine lesson (e.g. `networking/03-tcp-handshake`) before commit.

---

## Task 1: AlgoPoster replacement — `00-start-here` + `02-values-and-memory/05-string-internals` (2 lessons, EN+RU)

**Files:**
- Modify: `site/src/content/lessons/en/js-engine/00-start-here/01-what-an-engine-is/index.mdx`
- Modify: `site/src/content/lessons/en/js-engine/00-start-here/02-the-engine-landscape/index.mdx`
- Modify: `site/src/content/lessons/en/js-engine/02-values-and-memory/05-string-internals/index.mdx`
- Mirror: `site/src/content/lessons/ru/js-engine/{same paths}`
- Possibly create: `site/src/components/schematic/EngineMapFig.astro`, `site/src/components/schematic/StringLayoutFig.astro`

**Interfaces:**
- Consumes: `SkeinFigure`, `TechnicalLabel`, `MachineValue`, `FigureCaption` from `~/components/schematic/*` (commit `9b51673d`); `lk-seq` list rhythm from lesson-kit.css.
- Produces: per-lesson figure components (props: `lang: "en" | "ru"`; bilingual `copy` const inside the component, EN+RU keys).

- [ ] **Step 1: Inventory** — Read the 3 EN+RU lessons. For each AlgoPoster embed, classify: STRUCTURE (poster carries a real mechanism diagram → build a real figure) or RECAP (poster carries a summary table → replace with a quiet Tier-C recap strip: `lk-seq` list + `NumbersCard` where numbers exist).
- [ ] **Step 2: Write the failing check** — extend `site/scripts/ru-deep-check.mjs` (or a new `scripts/algoposter-audit.mjs`) with a grep: any `index.mdx` under `site/src/content/lessons/{en,ru}/js-engine/` still containing `AlgoPoster` is a failure. Run it — it must list these 3 lessons.
- [ ] **Step 3: Build figures** — for STRUCTURE posters, create `EngineMapFig.astro` (00-start-here/01: engine tiers as labeled pipeline) and `StringLayoutFig.astro` (string-internals: string table, cons strings, flattened representation) following the canonical canvas-figure pattern (EventLoopTurnFig): `min-width: 930px` base, `@media (max-width: 1100px)` release + 2-col, `@media (max-width: 640px)` stack. All states server-rendered; interaction (if any) via `is:inline` script.
- [ ] **Step 4: Replace in EN** — remove AlgoPoster imports+embeds, insert figures at the editorial position (mechanism figure sits at the explanation's causal peak, recap strip at lesson end before KeyTakeaway). Keep Hook → Crux → Explanation → KeyTakeaway rhythm; verify text budgets.
- [ ] **Step 5: Translate to RU** — mirror using glossary.json; add new terms alphabetically.
- [ ] **Step 6: Verify** — `cd site && bun run build` (lint-report: 0 errors, 0 js-engine warnings, hydration ≤5), `bunx vitest run` green, audit script now lists 0 remaining js-engine AlgoPosters.
- [ ] **Step 7: Visual QA** — live `astro dev` on 4322, `SKEIN_LOCALE=en node scripts/shoot-batch.mjs rollout1 1440 390`, same for RU. Assert all screenshots exactly viewport-width and no `#f6ecd2` in rendered HTML.
- [ ] **Step 8: Commit** — stage only touched files; `git commit -m "content(js-engine): 00-start-here + string-internals editorial figures EN+RU"`.

## Task 2: AlgoPoster replacement — `03-hidden-classes` remaining (2 lessons: property-access, mono-poly-mega)

**Files:**
- Modify: `site/src/content/lessons/{en,ru}/js-engine/03-hidden-classes/03-property-access/index.mdx`
- Modify: `site/src/content/lessons/{en,ru}/js-engine/03-hidden-classes/05-mono-poly-mega/index.mdx`
- Possibly create: `site/src/components/schematic/PropertyAccessFig.astro`

**Interfaces:**
- Consumes: `InlineCacheFig`, `ICStateStepper` (already shipped for 04-inline-caches — reuse, do not duplicate); `ShapeTransitionFig`.
- Produces: `PropertyAccessFig.astro` if the property-access poster carries a mechanism not covered by existing figures.

- [ ] **Step 1: Inventory** — read both lessons EN+RU; classify each poster (STRUCTURE vs RECAP). 03-property-access likely shares ground with InlineCacheFig/ICStateStepper — prefer reuse (DRY).
- [ ] **Step 2: Failing check** — audit script lists these 2 lessons.
- [ ] **Step 3: Build/compose** — create `PropertyAccessFig` only if the mechanism is uncovered; otherwise place existing figures. 05-mono-poly-mega is a natural RECAP: `lk-seq` tri-state strip + link to ICStateStepper (which already walks the same states interactively).
- [ ] **Step 4: EN replace + budgets.**
- [ ] **Step 5: RU translate.**
- [ ] **Step 6: Verify** — build + vitest + audit.
- [ ] **Step 7: Visual QA** — `SKEIN_LOCALE=en|ru node scripts/shoot-batch.mjs rollout2 1440 390`.
- [ ] **Step 8: Commit** — `content(js-engine): 03-hidden-classes remaining lessons editorial EN+RU`.

## Task 3: AlgoPoster replacement — `04-the-jit` remaining (5 lessons: tiers-and-warmup, type-feedback, turbofan, speculative-optimization, osr)

**Files:**
- Modify: `site/src/content/lessons/{en,ru}/js-engine/04-the-jit/{01,02,03,04,06}-*/index.mdx`
- Possibly create: `site/src/components/schematic/TierWarmupFig.astro`, `TypeFeedbackFig.astro`, `TurbofanPipelineFig.astro`, `OsrFrameFig.astro` (OsrFrameFig already exists — check)

**Interfaces:**
- Consumes: `DeoptFrameFig` (05-deoptimization, shipped); `OsrFrameFig` (already in schematic/ — verify its props/lang contract before use).
- Produces: JIT-tier figure components with the same bilingual `copy` const pattern.

- [ ] **Step 1: Inventory** — read all 5 lessons EN+RU; classify posters. 01-tiers-and-warmup: tier ladder (interpreter → Sparkplug → Maglev → TurboFan) = STRUCTURE, build `TierWarmupFig`. 02-type-feedback: feedback vector evolution = likely overlaps ICStateStepper territory but at JIT level — STRUCTURE, `TypeFeedbackFig`. 03-turbofan: pipeline (sea-of-nodes) = STRUCTURE, `TurbofanPipelineFig`. 04-speculative-optimization: guard insertion = STRUCTURE or composition of DeoptFrameFig. 06-osr: OsrFrameFig exists — reuse.
- [ ] **Step 2: Failing check** — audit lists these 5.
- [ ] **Step 3: Build figures** per classification, canonical canvas pattern.
- [ ] **Step 4–5: EN + RU.**
- [ ] **Step 6: Verify.**
- [ ] **Step 7: Visual QA** — `shoot-batch.mjs rollout3 1440 390` both locales; hydration cap check (these lessons may already carry 3–4 islands — the new figures must be zero-hydration).
- [ ] **Step 8: Commit** — `content(js-engine): 04-the-jit remaining lessons editorial EN+RU`.

## Task 4: AlgoPoster replacement — `05-closures-scope` (4 lessons)

**Files:**
- Modify: `site/src/content/lessons/{en,ru}/js-engine/05-closures-scope/{01,02,03,04}-*/index.mdx`
- Possibly create: `site/src/components/schematic/ScopeChainFig.astro`, `ClosureMemoryFig.astro`, `ContextAllocationFig.astro`

**Interfaces:**
- Consumes: `SkeinFigure` kit; `MachineValue` for slot/depth notation (`(depth, slot)` pairs).
- Produces: closure/scope figure components.

- [ ] **Step 1: Inventory + classify** — 01-scope-chains: ScopeInfo compile-time → Context runtime materialization = STRUCTURE (`ScopeChainFig`). 02-closure-memory: heap layout of captured Contexts = STRUCTURE (`ClosureMemoryFig`). 03-context-allocation: which variables get context-allocated = STRUCTURE or RECAP. 04-call-site-polymorphism: overlaps IC territory — reuse or RECAP.
- [ ] **Step 2: Failing check.**
- [ ] **Step 3: Build figures.**
- [ ] **Step 4–5: EN + RU.**
- [ ] **Step 6: Verify.**
- [ ] **Step 7: Visual QA** — `shoot-batch.mjs rollout4 1440 390` both locales.
- [ ] **Step 8: Commit** — `content(js-engine): 05-closures-scope editorial EN+RU`.

## Task 5: AlgoPoster replacement — `06-garbage-collection` (6 lessons)

**Files:**
- Modify: `site/src/content/lessons/{en,ru}/js-engine/06-garbage-collection/{01..06}-*/index.mdx`
- Create: `site/src/components/schematic/GenerationalHeapFig.astro`, `MarkSweepFig.astro`, `WriteBarrierFig.astro`, `HeapTimelineFig.astro` (as classified)

**Interfaces:**
- Consumes: `JsEngineHeapSpacesFig` (already in schematic/ — verify props; may cover 01-why-gc or 02-generational-orinoco directly, reuse over rebuild).
- Produces: GC figure components.

- [ ] **Step 1: Inventory + classify** — 6 lessons: why-gc, generational-orinoco (likely covered by JsEngineHeapSpacesFig — reuse), mark-sweep-compact (STRUCTURE, `MarkSweepFig`), write-barriers (STRUCTURE, `WriteBarrierFig`), memory-leaks (RECAP — leak patterns as `lk-seq` + NumbersCard for retained-size numbers), measuring-heap (RECAP — `--trace-gc` output as MachineValue rows + NumbersCard).
- [ ] **Step 2: Failing check.**
- [ ] **Step 3: Build figures** (reuse first — DRY).
- [ ] **Step 4–5: EN + RU.**
- [ ] **Step 6: Verify.**
- [ ] **Step 7: Visual QA** — `shoot-batch.mjs rollout5 1440 390` both locales.
- [ ] **Step 8: Commit** — `content(js-engine): 06-garbage-collection editorial EN+RU`.

## Task 6: AlgoPoster replacement — `07-async-deep` (3 remaining) + `08-measuring-optimizing` (4) + `09-putting-it-together` (1)

**Files:**
- Modify: `site/src/content/lessons/{en,ru}/js-engine/07-async-deep/{02,03,04}-*/index.mdx`
- Modify: `site/src/content/lessons/{en,ru}/js-engine/08-measuring-optimizing/{01..04}-*/index.mdx`
- Modify: `site/src/content/lessons/{en,ru}/js-engine/09-putting-it-together/01-capstone-optimize-a-hotpath/index.mdx`
- Create: `site/src/components/schematic/MicrotaskQueueFig.astro`, `PromiseStateFig.astro`, `TraceOptFig.astro` (as classified)

**Interfaces:**
- Consumes: `EventLoopTurnFig`, `EventLoopPredict` (shipped for 07-async-deep/01 — reuse); `DeoptFrameFig` (08/01 trace-opt likely composes with it).
- Produces: async/measuring figure components.

- [ ] **Step 1: Inventory + classify** — 07/02-microtasks-vs-macrotasks: queue ordering = STRUCTURE (`MicrotaskQueueFig`, canvas-tier with the two-lane pattern). 07/03-promise-internals: promise state machine = STRUCTURE (`PromiseStateFig`). 07/04-async-await-desugaring: generator/resume mapping = STRUCTURE or composition. 08/01: trace-opt/deopt log reading = RECAP (MachineValue log rows + DeoptFrameFig link). 08/02: monomorphism discipline = RECAP (lk-seq rules). 08/03: benchmarking pitfalls = RECAP (lk-seq anti-patterns). 08/04: real-world wins = RECAP (NumbersCard before/after timings). 09/01: capstone — compose existing figures as a guided investigation, no new figure needed unless inventory says otherwise.
- [ ] **Step 2: Failing check — this must be the LAST failing run; after this task the audit reports 0 js-engine AlgoPosters.**
- [ ] **Step 3: Build figures.**
- [ ] **Step 4–5: EN + RU.**
- [ ] **Step 6: Verify.**
- [ ] **Step 7: Visual QA** — `shoot-batch.mjs rollout6 1440 390` both locales; full-batch re-shoot of all 41 lessons as the final gate.
- [ ] **Step 8: Commit** — `content(js-engine): async-deep + measuring + capstone editorial EN+RU — js-engine AlgoPoster-free`.

## Task 7: Full js-engine visual QA gate + AlgoPoster retirement check

**Files:**
- Modify: `site/scripts/shoot-batch.mjs` (extend LESSONS array to all 41 lessons, or drive from units.json)
- Create: `site/scripts/algoposter-audit.mjs` (consolidated: js-engine zero-AlgoPoster + rendered-HTML DNA check)

**Interfaces:**
- Consumes: units.json lesson list; live dev server.
- Produces: CI-able audit script.

- [ ] **Step 1: Extend shoot-batch** — derive the lesson list from `site/src/content/units.json` (track=js-engine) instead of a hardcoded 5.
- [ ] **Step 2: Full sweep** — 41 lessons × EN+RU × {1440, 390}. Every screenshot exactly viewport-width; any failure names the lesson + offending element.
- [ ] **Step 3: Rendered-HTML DNA check** — curl/grep the dev-server HTML for `#f6ecd2`, `3px solid`, `box-shadow: 4px` across all 41 lessons — zero matches.
- [ ] **Step 4: Hydration audit** — every lesson page ≤5 islands (lint-report).
- [ ] **Step 5: Commit** — `chore(site): full js-engine visual QA sweep + AlgoPoster audit`.

## Task 8: Extend the editorial shell to other tracks (networking first)

**Files:**
- Modify: `site/src/content/lessons/{en,ru}/networking/03-tcp-handshake/*/index.mdx` (13 lessons — the flagship, fully authored)
- Possibly modify: `site/src/components/schematic/*.astro` (track-agnostic shell reuse)
- Create: networking figure components as classified

**Interfaces:**
- Consumes: the entire shipped editorial kit (SkeinFigure, TechnicalLabel, MachineValue, FigureCaption, lesson-kit, Lesson.astro shell) — all track-agnostic.
- Produces: networking-track figures + editorial composition.

- [ ] **Step 1: Shell regression check** — before touching networking, open 2–3 non-js-engine lessons in dev (networking, databases) and screenshot at 1440/390: the shell shipped in `9b51673d` must already render correctly (no AlgoPoster dependency, no layout break). Fix any shell issue first.
- [ ] **Step 2: Pick the networking pilot** — `03-tcp-handshake` (13 units, fully authored EN+RU). Inventory AlgoPoster/figure usage across it.
- [ ] **Step 3: Composition pass** — apply the same Hook → Crux → Explanation → KeyTakeaway rhythm; replace any AlgoPoster with track-appropriate schematics (packet flow = canvas-tier figure with the lane pattern).
- [ ] **Step 4: EN + RU, budgets, glossary.**
- [ ] **Step 5: Verify** — build (all tracks' lint rules), vitest, shoot-batch pointed at networking (`SKEIN_BASE` + lesson list override).
- [ ] **Step 6: Commit** — `content(networking): 03-tcp-handshake editorial composition EN+RU`.
- [ ] **Step 7: Remaining tracks** — repeat per track (databases, security, performance, …), one unit-batch per commit. Track order by flagship value: networking → databases → security → performance → observability → rest.

## Task 9: AlgoPoster retirement (final)

**Files:**
- Delete or deprecate: `site/src/components/algo/AlgoPoster.tsx`, `site/src/components/algo/poster-patterns.tsx`
- Modify: `site/src/components/lesson/LessonRenderTree.astro` (remove AlgoPoster branch if it renders by lessonType)

**Interfaces:**
- Consumes: Task 6 + Task 8 completion (zero AlgoPoster embeds anywhere).
- Produces: removed component.

- [ ] **Step 1: Global grep** — `rg -l 'AlgoPoster' site/src` — must be only the component files themselves + LessonRenderTree.
- [ ] **Step 2: Remove embeds** in LessonRenderTree; delete AlgoPoster.tsx + poster-patterns.tsx.
- [ ] **Step 3: Verify** — build + full vitest (some algo-track tests may reference poster-patterns — update or remove them with the component).
- [ ] **Step 4: Commit** — `refactor(site): retire AlgoPoster — replaced by editorial schematic kit`.

---

## Execution notes

- **Batch cadence:** Tasks 1–6 are the 28-lesson AlgoPoster replacement, ordered by unit so commits stay coherent. Each task is independently shippable (build green at every boundary).
- **Reuse-before-build rule (DRY):** the schematic/ directory already ships OsrFrameFig, JsEngineHeapSpacesFig, EventLoopTurnFig, DeoptFrameFig, InlineCacheFig, ICStateStepper, EventLoopPredict, ShapeTransitionFig, MapAnatomyFig, MetaphorMappingFig, TaggedValueFig, NumericStorageFig, LazyParseFig, IgnitionBytecodeFig, InterpreterDispatchFig, AstStructureFig, ShapeMigrationFig, EventLoopTurnFig, HandshakeLatencyFig, InteractiveHandshakeFig, StatefulEndpointFig, TwoVsThreeFig, CageAddressFig. Check props/lang contract before creating any new figure.
- **QA loop per task (non-negotiable):** `bun run build` → check `dist/lint-report.json` → `bunx vitest run` → dev server + shoot-batch (EN then RU at 1440/390) → deep-overflow probe (body.scrollWidth === viewport width at 390).
- **No-JS and reduced-motion:** every interactive figure must render its full explanation server-side (all states in DOM, index 0 visible); `is:inline` script only replays causality. Verify with JS disabled in one browser pass per batch.
