# Browser pillar — chapter 02 completion design

**Date:** 2026-05-15
**Author:** Artem (via /brainstorming)
**Status:** approved
**Scope:** Author the 6 remaining stub pieces in the Browser pillar (chapter 02) so the chapter ships at 8/8 ready, EN+RU.

---

## Goal

Close the Browser pillar at senior fullstack depth while remaining accessible to all three reader tiers (junior / middle / senior).

The reader who finishes the chapter must be able to:

1. Trace a page render end-to-end from URL bar to interactive, naming the thread that owns each step.
2. Pick the right concurrency primitive (web worker, service worker, worklet, SAB, fiber lane) for a given workload.
3. Choose between SSR / SSG / ISR / streaming / RSC and explain the hydration cost tradeoff.
4. Read a Chrome DevTools performance trace and locate the layer that owns each LCP / INP / CLS regression.
5. Debug 5 canonical browser failure modes from a real flame chart.

## Non-goals

- Off-domain topics (mobile, electron, embedded webviews).
- Frontend architecture (state shape, data fetching, design tokens) — that lives in pillar 03.
- Networking primitives (DNS, TLS, HTTP/3) — that lives in pillar 01; only referenced from capstone.
- Build pipelines (Vite, Turbopack, esbuild) — pillar 03.

## Current state

Chapter 02 (Browser) has 8 piece slots:

| # | Slug | Status |
|---|---|---|
| 01 | event-loop | stub |
| 02 | render-pipeline | **ready** |
| 03 | v8-internals | **ready** |
| 04 | workers | stub |
| 05 | react-fiber | stub |
| 06 | ssr-vs-ssg | stub |
| 07 | core-web-vitals | stub |
| 08 | putting-it-together | stub |

Six pieces to author. Reader budget per piece: 18–28 reading minutes, except 06 may stretch to 30.

## Piece scopes

### 01 event-loop

**Crux invariant:** loop = pull task → run → render frame → repeat. Whoever blocks, slows everyone.

**Body coverage:**
- Call stack, task queue (macrotask), microtask queue, rendering steps (HTML spec § event loop).
- Microtask starvation — `Promise.then` × 1000 vs `setTimeout(0)` interleave.
- `queueMicrotask` vs `Promise.resolve().then` vs `MessageChannel` — when each is the right tool.
- Node loop vs browser loop — phases, `process.nextTick`, why animations are browser-only.
- requestAnimationFrame timing in the loop.

**Failure mode:** `await fetch` inside a render-blocking handler → INP regression visible in field.

**Numbers:** 50ms task cap (good INP), 16.67ms frame budget at 60Hz, microtask flush is unbounded.

**Components:** Pretest, Sequencer (loop iteration), TierAccordion (Internals: HTML spec link to event loop processing model; Edge cases: SAB cross-thread blocking; Receipts: long task API entries), RetrievalDrawer.

**Prereqs:** none. This is the chapter root.

---

### 04 workers (large piece, all 4 worker primitives)

**Crux invariant:** thread or proxy — workers offload compute, service workers intercept network.

**Body coverage:**
- **Web Workers** — dedicated vs shared, `postMessage` + structured clone vs transferable `ArrayBuffer`, no DOM access, no synchronous I/O.
- **Service Workers** — fetch handler, cache strategies (cache-first, network-first, stale-while-revalidate), lifecycle (install → activate → skipWaiting → claim), scope rules.
- **Worklets** — paint, audio, animation; smaller surface, run on dedicated threads off main; CSS Houdini paint worklet example.
- **SharedArrayBuffer + Atomics** — cross-origin isolation requirement (COOP `same-origin` + COEP `require-corp`); without it `SAB` is `undefined` in modern browsers.
- **OffscreenCanvas** — render to canvas from worker thread.

**Failure modes:**
- SW registration breaks navigation when a stale `activate` doesn't `clients.claim()`.
- `SharedArrayBuffer` returns `undefined` when COOP/COEP not set — WASM threading silently breaks.
- `postMessage` of a large object copies the whole structured clone — measurable on >1MB payloads.

**Numbers:** `postMessage` ~50µs base + ~2× clone latency vs transfer (`{ transfer: [buf] }` is O(1)); SW first-paint cost ~5ms on cold install.

**Components:** Pretest, FadedExample (web worker `postMessage` snippet), TierAccordion (Internals: structured clone algorithm; Edge cases: SW + bfcache; Receipts: COEP enforcement timeline), ReactiveDiagram (4 primitives compared on axis: thread / DOM access / network access / shared memory), RetrievalDrawer.

**Prereqs:** `["01-event-loop"]`.

---

### 05 react-fiber

**Crux invariant:** fiber = pause + resume. React splits work across frames so input doesn't lag.

**Body coverage:**
- Fiber node = unit of work (type, props, child, sibling, return, alternate).
- Reconciliation: render phase (interruptible) vs commit phase (atomic).
- Double buffering — `current` + `workInProgress` trees swap on commit.
- Priority lanes — sync, default, transition, idle. `useTransition` marks low priority.
- Time-slicing via `MessageChannel` (5ms work slice, then yield).
- vDOM diff: keyed children invariant, why `key={index}` breaks reorders.
- `useDeferredValue` vs `useTransition` — when each is right.

**Failure modes:**
- `key={index}` on a list that reorders → state attaches to wrong row.
- Inline objects/functions as props → child memo invalidation cascade → wasted reconciliation.
- Heavy synchronous render in commit phase blocks paint.

**Numbers:** 5ms work slice before scheduler yields; `useTransition` lets non-urgent updates wait up to 5s before forcing.

**Components:** Pretest, Sequencer (render → commit → paint), FadedExample (key reorder bug), TierAccordion (Internals: fiber data structure; Edge cases: concurrent render + suspense boundary; Receipts: React 18 lane priority constants), RetrievalDrawer.

**Prereqs:** `["01-event-loop", "03-v8-internals"]`.

---

### 06 SSR / SSG / ISR / streaming + hydration (largest piece, ~25–30 min)

**Crux invariant:** SSR/SSG/ISR = when to render. Hydration = price you pay to make static HTML alive.

**Body coverage:**
- **SSR** (per-request render) — Node renders, sends HTML, client hydrates whole tree.
- **SSG** (build-time) — HTML generated at build, served from CDN, hydrate on load.
- **ISR** (incremental static regeneration) — SSG + revalidate-on-demand or after TTL; Vercel Next.js model.
- **Streaming SSR** — `renderToPipeableStream`, Suspense boundaries flush HTML chunks as they're ready, TTFB drops.
- **RSC** (React Server Components) — server components serialize to wire format, client receives islands; bundle size shrinks.
- **Hydration cost** — full hydration replays the entire server tree on client; selective hydration (React 18) hydrates around user interaction; progressive (Astro islands, Qwik resumability) ships zero JS by default.

**Failure modes:**
- Hydration mismatch — server HTML ≠ client tree → React rebuilds, content flickers, CLS spike.
- Waterfall TTFB+TTI — slow API in server render blocks first byte; streaming fixes this.
- Over-hydration — every component is interactive, INP regresses on low-end mobile.

**Numbers:** hydration JS cost ≈ 2× initial render JS (re-attach + re-execute); streaming chunk first byte typically <100ms vs 400ms+ for blocking SSR.

**Components:** Pretest, ReactiveDiagram (timeline overlay: SSR vs SSG vs streaming TTFB / TTI / FCP), FadedExample (hydration mismatch reproduction), TierAccordion × 2 (Internals: RSC wire format; Edge cases: Suspense boundary placement strategy), RetrievalDrawer.

**Prereqs:** `["02-render-pipeline", "05-react-fiber"]`.

**Risk:** if word count drives reading time past 30min during draft, split candidate is "RSC + islands" into a follow-up piece — decide at end of draft, not now.

---

### 07 Core Web Vitals

**Crux invariant:** three KPIs — visible (LCP), responsive (INP), stable (CLS).

**Body coverage:**
- **LCP** — what counts as the largest contentful paint (image, text block, video poster). Preload tactics, `<link rel="preload">`, `fetchpriority="high"`, image `loading="eager"` on hero. CDN + caching impact.
- **INP** — replaced FID in 2024. p98 of input → next paint across the session. Long task definition (≥50ms). Mitigations: yielding, `scheduler.yield()`, breaking up handlers.
- **CLS** — cumulative layout shift score. `width`/`height` on images, `min-height` containers, `font-display: optional` or `size-adjust` to neutralize swap.
- Lab vs field — Lighthouse / PSI vs CrUX (Chrome User Experience Report). Why p75 mobile is the only number that matters.
- Reading a DevTools performance trace — flame chart, long task markers, layout shift overlay.

**Failure modes:**
- Late-loaded hero image without preload → LCP 4.2s.
- Sync analytics blob in `onClick` → INP regression to 380ms.
- Web font swap without `size-adjust` → CLS 0.18.

**Numbers (75th percentile field):** LCP ≤ 2.5s good, INP ≤ 200ms good, CLS ≤ 0.1 good.

**Components:** Pretest, ReactiveDiagram (3 metrics on a timeline), FadedExample (DevTools trace reading walkthrough), TierAccordion (Internals: PerformanceObserver API; Edge cases: SPA route change CLS; Receipts: CrUX BigQuery schema), RetrievalDrawer.

**Prereqs:** `["01-event-loop", "02-render-pipeline", "06-ssr-vs-ssg"]`.

---

### 08 putting-it-together (capstone)

**Crux invariant:** from URL to click — 7 boundaries where production usually dies.

**Body coverage:** end-to-end trace of one e-commerce product page render. Each layer maps to a prior piece.

| Layer | What happens | Bridges to |
|---|---|---|
| Network | DNS → TLS → HTTP/3 byte | (chapter 01 networking) |
| HTML parse | preload scanner → DOM | piece 02 |
| CSS | parse → CSSOM (blocks render) | piece 02 |
| JS parse + compile | V8 ignition bytecode | piece 03 |
| First paint | layout → paint → composite | piece 02 |
| Hydration | RSC payload → client islands attach | piece 06 |
| Worker | service worker intercepts second nav | piece 04 |
| Reconciler | `useTransition` wraps state update | piece 05 |
| Measurement | LCP marker → INP measurement → CLS score | piece 07 |
| Failure point | 5 case studies | synthesis |

**Five canonical failures (one per domain):**

1. Late-loaded hero image → LCP 4.2s.
2. Hydration mismatch → console error + content swap + CLS spike.
3. Megamorphic render path → INP 380ms.
4. Service worker cache stale → user sees previous version for 24h.
5. Sync analytics in `onClick` → INP regression.

**Components:** Sequencer (10 trace steps), ReactiveDiagram (3-lane timeline: main thread / network / GPU), TierAccordion × 3 (hydration deep-dive, V8 deep-dive, paint deep-dive), FadedExample (annotated DevTools trace screenshot), RetrievalDrawer (5 questions across all prior piece).

**Prereqs:** all of `["01-event-loop","02-render-pipeline","03-v8-internals","04-workers","05-react-fiber","06-ssr-vs-ssg","07-core-web-vitals"]`.

---

## Prereq graph + reading order

```
01 event-loop  ──┬──► 04 workers        (off-main-thread = parallel loops)
                 ├──► 05 react-fiber    (lanes scheduled via MessageChannel)
                 └──► 07 cwv            (INP = long task on loop)

02 render-pipeline ──┬──► 06 ssr+hydration   (server emits HTML, client consumes)
                     └──► 07 cwv             (LCP/CLS = pipeline outputs)

03 v8 ──► 05 react-fiber               (megamorphic IC kills reconciler hot path)

05 react-fiber ──► 06 ssr+hydration    (hydration = fiber work on the client)

06 ssr+hydration ──► 07 cwv            (TTFB/LCP/INP tradeoff)

01..07 ──► 08 capstone
```

Reading order = file order 01 → 08.

## Spiral cues (concept reuse across pieces)

| Concept | Pieces |
|---|---|
| task queue | 01 (intro), 04 (worker loop), 05 (lanes), 07 (long task) |
| 16.67ms frame budget | 02, 05, 07 |
| hidden class / inline cache | 03, 05 (fiber hot path), 08 |
| main thread blocking | 01, 04, 05, 07, 08 |
| structured clone | 04, referenced in 06 (RSC payload) |

## Three-tier accessibility strategy

Same pattern as `02-render-pipeline` (already shipped):

- **Layer 1 — Crux (≤140 chars)** — junior reads only this, gets the what + why.
- **Layer 2 — Body** — middle path. Linear narrative: mechanism → tradeoff → failure mode → numbers. ~150–200 words per section, 1 diagram/card per section.
- **Layer 3 — TierAccordion** — senior dives. Three collapse types: Internals (spec / source links), Edge cases (production failure modes), Receipts (real numbers, bug links, changelog refs).

**Tier router** (existing `scripts/tier-router.ts`): `?tier=1|2|3` query + cookie. Default tier 2. Tier 1 hides TierAccordion + Sandbox. Tier 3 expands all TierAccordion by default.

## Pedagogy components per piece (hydration cap = 5 islands)

Mandatory in every piece:

1. `Pretest` (top, 3 questions, retrieval prime).
2. `TierAccordion` (≥1, senior-depth offload).
3. `RetrievalDrawer` (bottom, 3–5 spaced revisit questions).

Conditional:

4. `FadedExample` — wherever a code snippet is illustrative (04, 05, 06, 07, 08).
5. `Sequencer` or `ReactiveDiagram` — wherever a sequence/timeline is the right model (01, 02, 06, 08).

## Workflow

**Sequential** authoring, one piece per `/infographic` invocation, in order **01 → 04 → 05 → 06 → 07 → 08**.

After each piece:

1. `bun run build` in `site/` — must finish lint-clean, expected page count holds.
2. Open EN + RU in a browser — visual rendering + interactivity check.
3. `git commit -m "content(browser): <NN-piece> EN+RU ready"`.
4. Update `~/.claude/projects/.../memory/curriculum_progress.md` if the pillar counter advances.

**Glossary policy:** each piece appends new terms alphabetically to `site/src/i18n/glossary.json`. Sequential authoring = no merge conflicts.

**Spiral cues:** each piece's `spiral` frontmatter field references concepts introduced earlier — populated as prior pieces ship.

## Risks

- **06 over-budget.** SSR + SSG + ISR + streaming + RSC + hydration is a lot. If draft reading time exceeds 30 minutes, split candidate is "RSC + islands" into a 9th piece (would push chapter to 9/9). Decision deferred to post-draft review of 06.
- **04 over-budget.** Workers piece spans 4 primitives. Same fallback: split if it goes past 30 min.
- **Component drift.** All ready pieces use the same component vocabulary. Authors of new pieces must check `style-guide.md` and reuse existing components — no new prose components without explicit need.

## Acceptance criteria

- 8/8 pieces in chapter 02 have `status: ready` in both `book/en/browser/` and `book/ru/browser/`.
- `bun run build` in `site/` exits 0, lint report clean, page count = 301 + 12 (6 new EN + 6 new RU).
- Each new piece has a populated `prereqs`, `spiral`, `personas`, `depth`, and `sources` frontmatter (no `tbd-*` placeholders).
- Each new piece's RU translation passes glossary lock (no off-glossary translations of locked terms).
- Each new piece renders with ≤5 hydrated islands.
- `curriculum_progress.md` memory advances Browser pillar from 2/8 to 8/8.

## References

- `curriculum.md` — depth bar + pillar 02 must-cover list.
- `style-guide.md` — component vocabulary.
- `site/src/content/book/en/browser/02-render-pipeline/index.mdx` — template piece for chapter 02.
- `site/src/content/book/en/browser/03-v8-internals/index.mdx` — second template (multi-tier internals).
- `.claude/commands/infographic.md` — per-piece pipeline command.
- `docs/superpowers/specs/2026-05-15-browser-render-pipeline-design.md` — prior design that defined `02-render-pipeline`.

## Next step

Hand off to `superpowers:writing-plans` for an executable implementation plan.
