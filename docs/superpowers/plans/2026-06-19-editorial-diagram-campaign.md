# Editorial Diagram Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for the infra tasks (Phase 0), then a Workflow fan-out for the content campaign (Phase 1+). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give every lesson that lacks one a structural diagram in the editorial "paper + grid + dashed-arc" aesthetic (the present-perfect timeline reference), island-free, across the 519 uncovered EN lessons (+ RU mirror) in 16 tracks.

**Architecture:** Extract the existing `GrammarDiagram` editorial primitive engine into a framework-agnostic SVG renderer. Wrap it in a static `EditorialDiagram.astro` (inside `DiagramFrame`, so it emits `data-lesson-visual` and costs 0 hydration islands). Ship a catalog of reusable **scene archetype builders** (timeline, before→after, mapping, layered-flow, tradeoff-axis, request-arc) so 1000+ diagram blocks stay visually consistent and authorable at scale. Then run a per-track Workflow campaign: each agent reads a lesson's core mechanism, picks an archetype, writes the EN block + RU mirror.

**Tech Stack:** Astro 5, Preact (engine source), TypeScript, existing `DiagramFrame.astro`, `grammar-diagram.css`. Authoring at scale via the Workflow tool.

## Global Constraints

- Editorial aesthetic only: paper background, 26px grid, dashed accent arcs (`5 4` dash-array, rounded caps), serif (Fraunces italic) hero text, JetBrains Mono labels. Match `src/components/english/GrammarDiagram.tsx` + `grammar-diagram.css` exactly — no new palette.
- **Island-free**: lesson diagrams render with NO `client:*` directive. Editorial draw animations are pure CSS keyframes (auto-play once on load); reduced-motion shows the final frame. Confirmed: lint counts only `<astro-island>`.
- Every diagram sits in `DiagramFrame` → carries `data-lesson-visual`, a `caption`, a `label` (aria), and a `hue` token (`var(--d-<domain>, var(--accent))`).
- Import via `~/` alias only — no relative `..` segments.
- Bilingual or it does not ship: every EN diagram block has a RU mirror with translated `label`/`caption`/chip/hero text. Coordinates and structure are identical across locales.
- Diagram slot: between `</Explanation>` and `<KeyTakeaway>` (or immediately before `<PracticeSet>` when no `KeyTakeaway`), matching current convention.
- No new hydration. No edits to lesson frontmatter (no speculative `level:`/`estMin` changes).
- Build gate per phase: `bun run build` green, `dist/lint-report.json` clean (0/0). Test runner is `bun run test` (vitest) — never `bun test`.

---

## Phase 0 — Editorial diagram infrastructure (subagent-driven, TDD)

### Task 1: Extract the editorial SVG engine into a shared renderer

**Files:**
- Create: `src/components/diagram/editorial-scene.ts`
- Modify: `src/components/english/GrammarDiagram.tsx` (re-import the extracted renderer; keep its island behavior unchanged)
- Test: `src/components/diagram/editorial-scene.test.ts`

**Interfaces:**
- Produces: `type Prim` (the full union currently inside `GrammarDiagram.tsx`: `genre | formula | axis | arc | node | dropLine | tick | label | hero | caption | chip | arrow | divider | pulse`), `type Scene = { prims: Array<Prim & { order?: number }> }`, and `renderSceneSvg(scene: Scene, opts: { label: string; reducedMotion?: boolean }): string` returning the inner `<svg>…</svg>` markup string (viewBox `0 0 800 450`, grid + paper background included).
- Consumes (by GrammarDiagram.tsx): the same `Scene`/`Prim` types, now imported instead of locally declared.

- [ ] **Step 1: Write the failing test** — `renderSceneSvg` emits an `<svg viewBox="0 0 800 450"`, a `stroke-dasharray="5 4"` for an `arc` prim, and a `<text` containing hero text for a `hero` prim; reduced-motion variant omits the draw-animation class.
- [ ] **Step 2: Run test, verify it fails** (`bun run test editorial-scene` → module not found).
- [ ] **Step 3: Move the prim → SVG render logic out of `GrammarDiagram.tsx` into `editorial-scene.ts`** as a pure string/JSX-agnostic builder. Keep byte-for-byte the same SVG shapes (grid pattern, paper rect, arc control-lift math, chip auto-fit). Export `Prim`, `Scene`, `renderSceneSvg`.
- [ ] **Step 4: Re-wire `GrammarDiagram.tsx`** to import `Prim`/`Scene` and render via the shared logic (or `dangerouslySetInnerHTML={{__html: renderSceneSvg(...)}}` wrapped in its existing `.gdiagram` container so animations + hub behavior are unchanged).
- [ ] **Step 5: Run tests** (`bun run test editorial-scene` + any grammar-diagram test) → PASS.
- [ ] **Step 6: Commit** — `refactor(diagram): extract editorial SVG engine to editorial-scene.ts`.

### Task 2: `EditorialDiagram.astro` static wrapper

**Files:**
- Create: `src/components/diagram/EditorialDiagram.astro`
- Test: `src/lint/rules/editorial-diagram.test.ts` (renders to HTML, asserts contract)

**Interfaces:**
- Consumes: `renderSceneSvg`, `Scene` from `editorial-scene.ts`; `DiagramFrame.astro`.
- Produces (the lesson-facing API): `interface Props { scene: Scene; label: string; caption?: string; hue?: string; }` — renders `<DiagramFrame label caption hue>` wrapping the static SVG string from `renderSceneSvg(scene, { label, reducedMotion: true })` inside a `<div class="gdiagram reduced">` so `grammar-diagram.css` styles apply with the final-frame (no-JS) appearance.

- [ ] **Step 1: Write the failing test** — render `EditorialDiagram` with a one-arc scene; assert output contains `data-lesson-visual`, NO `<astro-island`, the `viewBox="0 0 800 450"`, and the caption text.
- [ ] **Step 2: Run test, verify it fails.**
- [ ] **Step 3: Implement `EditorialDiagram.astro`** per the Props above. Ensure `grammar-diagram.css` is imported/scoped so `.gdiagram` tokens resolve in lesson context.
- [ ] **Step 4: Run test** → PASS.
- [ ] **Step 5: Commit** — `feat(diagram): static island-free EditorialDiagram wrapper`.

### Task 3: Scene archetype builders

**Files:**
- Create: `src/components/diagram/editorial-archetypes.ts`
- Test: `src/components/diagram/editorial-archetypes.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Prim` from `editorial-scene.ts`.
- Produces six builders, each returning a laid-out `Scene` (coordinates pre-computed on the 800×450 canvas, `order` set for stagger):
  - `timeline({ axisLabel, leftTick, rightTick, arcLabel, hero, caption })` — axis + dashed arc from left hollow node to right solid node + drop-line at NOW + ticks. (The reference image.)
  - `beforeAfter({ leftTitle, leftItems, rightTitle, rightItems, arrowLabel })` — two chip stacks + connecting arrow + divider.
  - `mapping({ leftCol, rightCol, pairs })` — two labeled columns joined by dashed arcs (key→value, request→handler).
  - `layeredFlow({ steps })` — horizontal chip sequence with arrows (pipeline / request path), editorial styling.
  - `tradeoffAxis({ axisLabel, lowLabel, highLabel, markers })` — single axis with positioned nodes + labels (a spectrum/tradeoff).
  - `requestArc({ from, to, hops })` — actor endpoints joined by a lifted dashed arc with hop ticks (protocol exchange, editorial alternative to SequenceDiagram).
- Each builder clamps content to the canvas and truncates over-long labels (no overflow).

- [ ] **Step 1: Write failing tests** — one per builder: assert the returned `Scene.prims` contains the expected prim kinds and that all `x` ∈ [0,800], `y` ∈ [0,450].
- [ ] **Step 2: Run tests, verify they fail.**
- [ ] **Step 3: Implement the six builders** with fixed layout math.
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** — `feat(diagram): editorial scene archetype builders`.

### Task 4: Reference gallery page (visual QA + author crib)

**Files:**
- Create: `src/pages/_dev/editorial-diagrams.astro` (dev-only route, not linked in nav)

- [ ] **Step 1:** Render all six archetypes with sample data via `EditorialDiagram`, EN labels.
- [ ] **Step 2:** `bun run build`; open the route; verify each matches the reference aesthetic (paper, grid, dashed arc, serif hero) at 1440 + 375 widths.
- [ ] **Step 3: Commit** — `chore(diagram): editorial archetype gallery for QA`.

**Phase 0 exit gate:** build green, lint 0/0, gallery visually matches the reference image, `EditorialDiagram` proven island-free by test.

---

## Phase 1+ — Content campaign (Workflow fan-out, per-track batches)

Driven by the Workflow tool (same pattern as the scenario/sandbox campaigns). Each lesson is one pipeline item.

**Per-lesson pipeline (one agent per stage):**
1. **Design:** read `src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx`; identify the single core mechanism the lesson teaches; pick the best-fit archetype; produce the `scene` builder call + `label` + `caption` (EN). Output structured.
2. **Author EN:** insert the import (`import EditorialDiagram from "~/components/diagram/EditorialDiagram.astro";` + the chosen archetype import) and the `<EditorialDiagram scene={…} label=… caption=… hue=… />` block in the diagram slot. Do not touch frontmatter.
3. **Mirror RU:** translate `label`/`caption`/chip/hero/tick text into `src/content/lessons/ru/<track>/<unit>/<lesson>/index.mdx`, identical coordinates/structure, glossary-consistent.
4. **Verify:** parity check (EN block ⇔ RU block present), no leaked harness tags, valid MDX.

**Controller responsibilities (memory-confirmed gotchas):**
- After each batch, verify EN/RU parity and finish any orphaned half before building (subagents truncate).
- Scan authored files for leaked tags (`</output>`, `</invoke>`, bare `{id}` JSX) before build.
- Pre-flight changed files (MDX parse + parity) before the ~25-min full build.

**Track phasing (priority by uncovered count + audience value):**

| Phase | Tracks | Uncovered EN lessons |
|---|---|---|
| 1 | math (57), data-engineering (32), ai-llm (32) | 121 |
| 2 | apis (32), security (32), distributed (32) | 96 |
| 3 | frontend (32), queues (32), caching (32) | 96 |
| 4 | networking (49), observability (33), performance (33) | 115 |
| 5 | browser (33), backend (33), databases (25) | 91 |

Each phase: Workflow over its tracks → controller parity sweep → `bun run build` green + lint 0/0 → commit `content(diagram): editorial diagrams <tracks> EN+RU` → ff-merge local main. (node already 100%, excluded.)

---

## Validation

```bash
cd /Users/artemmac/dev/awesome-everything/site
bun run test                # vitest: editorial-scene, archetypes, EditorialDiagram contract
bun run build               # full build + linter
cat dist/lint-report.json   # expect 0 errors / 0 warnings
```

Per content batch, before the full build:
```bash
# parity: every EN editorial block has a RU mirror
# leaked-tag scan on changed mdx
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Static Preact-engine render drifts from hub animation | Low | Engine extracted to one shared module; both consumers use it; gallery + test pin the output |
| `grammar-diagram.css` tokens don't resolve in lesson context | Med | `EditorialDiagram` imports the css directly; gallery proves it before campaign |
| Archetypes too rigid → diagrams feel templated | Med | 6 archetypes + free `chip`/`label`/`arc` escape hatch via raw `scene`; design stage picks per-lesson, not one-size |
| Subagent truncation / leaked tags at scale | High (known) | Controller parity sweep + tag scan + pre-flight before every build (memory playbook) |
| 1038 blocks inflate build time | Low | All static SVG, no new islands; incremental-build cache covers body-only edits |
| Visual drift across 16 tracks | Med | Single archetype catalog + per-phase visual spot-check at 375/1440 |

## Acceptance

- [ ] Phase 0 infra shipped: `editorial-scene.ts`, `EditorialDiagram.astro`, archetype builders, gallery; tests green.
- [ ] `EditorialDiagram` proven island-free (test asserts no `<astro-island>`).
- [ ] Each content phase: build green, lint 0/0, EN+RU parity, committed + merged to local main.
- [ ] Target tracks reach near-100% structural-diagram coverage in editorial style.
- [ ] No frontmatter mutated; no new hydration islands; `~/` imports only.
