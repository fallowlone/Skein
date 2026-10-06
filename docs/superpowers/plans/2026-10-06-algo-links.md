# Algo↔lesson links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the hybrid derived+curated algorithm↔lesson link index, its build step, lint rule, and both server-rendered UI blocks.

**Architecture:** A pure-core builder (`mjs`, no I/O inside core) computes shared-concept intersections and merges curated overrides into a committed `algo-links.json`; `build:content` runs it before lint; a lint rule validates curated refs; two thin Astro components read the static JSON at render time (zero hydration cost).

**Tech Stack:** Bun, Astro components, vitest, existing `concepts.json` / `unit-concepts.json` / poster row styles.

**Spec:** `docs/superpowers/specs/2026-10-06-algo-links-design.md`

## Global Constraints

- Lesson route output for lessons without links is byte-identical to today (blocks render only when links exist).
- New UI copy goes through `site/src/i18n/ui.json` EN+RU (shared keys only where possible; block headings need 2 new keys per locale).
- No new Preact islands; no `console.log` in production code.
- Deterministic builder output: sorted keys, committed diff reviewable as content.
- Tunables live as named constants: `MIN_SHARED = 2`, `CAP_PER_ALGO = 12`, `CAP_PER_LESSON = 6`.

## Review Focus

- Curated entry with misspelled `kind` (not `always`/`never`) must fail validation loudly, not silently drop — pinned in Task 1 tests.
- Curated entry pointing at a deleted lesson must error at lint, not build — pinned in Task 3 tests.
- Lesson missing a title in one locale must fall back to the other locale, never render blank — pinned in Task 4 tests.
- Algo unit titles with 15+ char words must not overflow the block rows — pinned in Task 5 tests (existing `overflow-wrap` covers, test asserts the class).
- Stale committed index (content changed, builder not rerun) must be caught — pinned in Task 2 corpus test.

---

## File structure

- `site/scripts/path/build-algo-links.mjs` — I/O shell (loads JSON, writes index + stdout coverage report).
- `site/scripts/path/algo-links-core.mjs` — pure core (`computeDerived`, `applyCurated`, `buildIndex`), no I/O.
- `site/scripts/path/build-algo-links.test.mjs` — core unit tests + fixtures.
- `site/src/content/path/algo-links.curated.json` — curated seed (empty array + `_schema` comment field).
- `site/src/content/path/algo-links.json` — generated committed index (do not hand-edit; header comment says so).
- `site/src/lint/rules/algo-links.ts` — `checkAlgoLinks` mirroring `checkTermKeys`; registered in `site/src/lint/index.ts:23` area.
- `site/src/lint/rules/algo-links.test.ts` — lint rule tests.
- `site/src/components/path/AlgoLinks.astro` — one component, `kind: "lesson" | "algoUnit"`.
- `site/src/components/path/algo-links.ts` — pure helpers `linksForLesson`, `linksForUnit` (locale fallback, caps); the component is a thin view over them.
- `site/src/layouts/Lesson.astro` — mount point (lesson side; derive `lessonKey` from existing params).
- `site/src/pages/[lang]/learn/[track]/index.astro:193` — mount point (algo side, only when `track === "algorithms"`, under each unit head).
- `site/package.json` — `build:algo-links` script wired into `build:content` before `lint:src`.

---

### Task 1: Builder core + curated schema

**Files:**
- Create: `site/scripts/path/algo-links-core.mjs`
- Create: `site/scripts/path/build-algo-links.test.mjs`
- Create: `site/src/content/path/algo-links.curated.json`

**Interfaces:**
- Consumes: `concepts.json` shape `{id, track}`, `unit-concepts.json` shape `{teaches[], requires[]}` (both already in repo).
- Produces: `computeDerived(unitConcepts) -> Record<algoUnit, lessonKey[]>`; `applyCurated(derived, curated) -> { index, warnings }`; `buildIndex(inputs) -> { index, coverage }` used by Task 2.

- [ ] **Step 1: Write the failing test** — `site/scripts/path/build-algo-links.test.mjs`: fixture with 2 algo units, 3 lesson units sharing 0/1/3 concepts; assert unit with 1 shared concept is excluded (`MIN_SHARED = 2`), `always` entry pins on top, `never` entry suppresses, misspelled `kind` throws `/kind/`, ranking is by shared count then lesson order.
- [ ] **Step 2: Run it to verify it fails** — Run: `cd site && bunx vitest run scripts/path/build-algo-links.test.mjs`. Expected: FAIL with "not defined".
- [ ] **Step 3: Implement `computeDerived` / `applyCurated` / `buildIndex` in `site/scripts/path/algo-links-core.mjs`** — plain functions, sorted output, no I/O. Curated schema: array of `{ algo: string, lesson: string, kind: "always" | "never", note?: string }`; anything else throws naming the entry index.
- [ ] **Step 4: Run test to verify it passes** — Same command. Expected: PASS.
- [ ] **Step 5: Create the curated seed** — `site/src/content/path/algo-links.curated.json` as `[]` (empty array; schema lives in core + spec, no `_schema` field needed).
- [ ] **Step 6: Commit** — `git add site/scripts/path/algo-links-core.mjs site/scripts/path/build-algo-links.test.mjs site/src/content/path/algo-links.curated.json && git commit -m "feat(links): algo-links builder core with curated overrides"`

### Task 2: Build wiring + generated index + corpus test

**Files:**
- Create: `site/scripts/path/build-algo-links.mjs`
- Modify: `site/package.json` (`build:content` chain)
- Create: `site/src/content/path/algo-links.json` (generated)
- Test: extend `site/scripts/path/build-algo-links.test.mjs` (corpus case)

**Interfaces:**
- Consumes: Task 1 `buildIndex`; input paths `src/content/path/concepts.json`, `src/content/path/unit-concepts.json`, `src/content/path/algo-links.curated.json`.
- Produces: committed `algo-links.json` + stdout coverage report (zero-link algo units listed); `build:algo-links` script consumed by `build:content`.

- [ ] **Step 1: Write the failing corpus test** — in the same test file: load the real `concepts.json` + `unit-concepts.json`, run `buildIndex`, assert every `derived` lesson key matches `/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/`, caps respected (`<= 12` per unit), output deeply equals the committed `algo-links.json` (forces regen on content change).
- [ ] **Step 2: Run it to verify it fails** — `cd site && bunx vitest run scripts/path/build-algo-links.test.mjs`. Expected: FAIL (no index file yet).
- [ ] **Step 3: Implement `site/scripts/path/build-algo-links.mjs`** — `#!/usr/bin/env bun` shell mirroring `verify-task-concepts.mjs` header pattern: resolve `SITE_ROOT`, read inputs, call `buildIndex`, write pretty-printed JSON with a `// GENERATED — do not hand-edit, run build:algo-links` header comment (as a `_generated` field? No — JSON has no comments; use a leading `_note` key), print coverage report.
- [ ] **Step 4: Wire the chain** — `site/package.json`: add `"build:algo-links": "bun scripts/path/build-algo-links.mjs"` and insert `bun run build:algo-links` into `build:content` before `bun run lint:src`.
- [ ] **Step 5: Generate and verify** — Run: `cd site && bun run build:algo-links`, then rerun the test file. Expected: PASS. Eyeball the coverage report; zero-link algo units go into the commit message body, not code.
- [ ] **Step 6: Commit** — `git add site/scripts/path/build-algo-links.mjs site/package.json site/src/content/path/algo-links.json` with message `feat(links): wire algo-links build step and initial index`.

### Task 3: Lint rule for curated refs

**Files:**
- Create: `site/src/lint/rules/algo-links.ts`
- Modify: `site/src/lint/index.ts` (register next to `checkTermKeys`)
- Test: `site/src/lint/rules/algo-links.test.ts`

**Interfaces:**
- Consumes: curated file + key-existence check against `unit-concepts.json` keys (algo units) and lesson index (see how `connection-integrity.ts` resolves lesson keys; mirror it).
- Produces: `checkAlgoLinks(siteSrc) -> { errors[], warnings[] }`; zero-link algo unit → warning.

- [ ] **Step 1: Write the failing test** — fixtures: curated entry with unknown lesson → expect error matching `/unknown lesson/`; unknown algo unit → `/unknown algo unit/`; misspelled kind → `/kind/`.
- [ ] **Step 2: Run it to verify it fails** — `cd site && bunx vitest run src/lint/rules/algo-links.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `checkAlgoLinks`** in `site/src/lint/rules/algo-links.ts`, register in `site/src/lint/index.ts` mirroring line 23.
- [ ] **Step 4: Run tests + full lint** — the test file, then `cd site && bun run lint:src`. Expected: 0 errors (warnings only if pre-existing ones remain).
- [ ] **Step 5: Commit** — `feat(links): lint curated algo-link refs`.

### Task 4: Lesson-side block

**Files:**
- Create: `site/src/components/path/AlgoLinks.astro`
- Modify: `site/src/layouts/Lesson.astro` (mount after content, only when links exist)
- Modify: `site/src/i18n/ui.json` (EN+RU: `algoLinks.lessonHead`, `algoLinks.canonical`)
- Test: `site/src/components/path/AlgoLinks.test.ts` (pure helper `linksForLesson` + locale-fallback)

**Interfaces:**
- Consumes: static import of `algo-links.json`; `lessonKey` derived from Lesson.astro's existing track/unit/lesson params (check its Props type first; do not add new data fetching).
- Produces: poster-row list; renders nothing when the lesson has no links.

- [ ] **Step 1: Write the failing test** — `linksForLesson(index, key)` returns pinned `always` first; unknown key returns `[]`; lesson missing RU title falls back to EN (fixture with one-sided title).
- [ ] **Step 2: Run it to verify it fails** — `cd site && bunx vitest run src/components/path/AlgoLinks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `linksForLesson` / `linksForUnit` in `site/src/components/path/algo-links.ts` + `AlgoLinks.astro`** (`kind: "lesson" | "algoUnit"`; poster rows; canonical entries flagged with `algoLinks.canonical` label). Mount in `Lesson.astro` guarded by non-empty links.
- [ ] **Step 4: Run tests + check** — test file, then `cd site && bun run check`. Expected: 0 errors.
- [ ] **Step 5: Commit** — `feat(links): lesson-side topic-algorithms block`.

### Task 5: Algo-side block on the algorithms track

**Files:**
- Modify: `site/src/pages/[lang]/learn/[track]/index.astro` (under unit head, `track === "algorithms"` only)
- Test: extend `AlgoLinks.test.ts` (`linksForUnit`, overflow-wrap class present on row titles)

**Interfaces:**
- Consumes: Task 4 `AlgoLinks.astro` with `kind="algoUnit"`; unit key from the existing `units.map` loop variable.
- Produces: per-unit "where used" list with domain track labels; nothing renders for non-algorithms tracks or link-less units.

- [ ] **Step 1: Write the failing test** — `linksForUnit` caps at 12, `never`-suppressed lesson absent, row markup carries the overflow-safe class.
- [ ] **Step 2: Run it to verify it fails** — same test file. Expected: FAIL (helper missing).
- [ ] **Step 3: Mount `AlgoLinks` (kind `algoUnit`, using Task 4 `linksForUnit`)** under the unit head inside the existing `units.map` at `learn/[track]/index.astro:193`, guarded by `track === "algorithms"` and non-empty links.
- [ ] **Step 4: Run tests + check** — test file, then `bun run check`. Expected: 0 errors.
- [ ] **Step 5: Commit** — `feat(links): where-used block on algorithms track units`.

### Task 6: Final verification

- [ ] **Step 1: Run the gates** — `cd site && bun run lint:src` (0 errors), `bunx vitest run` (full suite green).
- [ ] **Step 2: Eyeball two pages** — dev server + headless screenshots EN/RU of one lesson block and one algo-unit block (1440/390), 0px horizontal overflow, no serif fallback on headings.
- [ ] **Step 3: Report** — spec + plan paths, gates observed, screenshots location, what remains unverified.
