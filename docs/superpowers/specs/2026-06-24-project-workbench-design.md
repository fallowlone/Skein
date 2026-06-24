# Project Workbench — Design (Phase 1 of the Practical-Projects initiative)

**Date:** 2026-06-24
**Status:** design, awaiting user review before planning
**Initiative:** increase the QUANTITY and QUALITY of practical (guided) projects.

## Context

The site has **39 guided projects** in `site/src/content/projects/*.json`, schema
`ProjectSchema` (`site/src/content.config.ts:244`). Each is bilingual (EN+RU) and
carries: `slug, title, pitch, deliverable, tracks, category, difficulty, estDays,
skills, stack?, resources?, milestones[] (BiText | GuidedMilestone), seniorStretch[],
brief?`. A `GuidedMilestone` is `{ id, title, goal, definitionOfDone[], feedsFrom?,
reviewPrompt? }` (`content.config.ts:235`).

Detail pages **already exist and render** — `site/src/pages/[lang]/projects/[slug].astro`
imports `CapstonePath.tsx`, which shows milestones (goal + definition-of-done checklist
+ `feedsFrom` lesson links + reviewPrompt + per-milestone progress persisted to
localStorage via `capstone-state.ts`). The hub is `[lang]/projects.astro` +
`ProjectsFilter.tsx`. Lint `site/src/lint/rules/capstones.ts` enforces bilingual parity
+ `feedsFrom` key validity. (An earlier exploration claimed the detail route was missing;
verified against code — it exists. No routing work is needed.)

**What is missing for "quality":** a project today tells you *what* to build and *how to
self-check by prose*, but offers no **starter scaffold**, no **runnable acceptance
checks**, no **rubric** (junior/mid/senior), and no **reference** walkthrough.
`reviewPrompt` is stored, not graded. This initiative adds those.

## Decisions (locked with the user)

1. **Surface:** guided projects (`content/projects/*.json`), not per-unit project
   lessons or capstones.
2. **Quality levers:** all four — runnable auto-checks, starter scaffold, rubric +
   reference, deeper milestones — plus eventual clonable GitHub starter repos.
3. **Architecture:** in-repo single source of truth first; GitHub mirror is a later
   phase. Scaffold + reference solution + acceptance tests live in the repo; CI runs the
   tests against the reference solution to prove the project is solvable and the tests are
   valid. A later generator phase publishes each scaffold as a clonable public repo.
4. **Phase 1 batch:** 7 exemplar projects spanning categories, all bun/TS-testable.

## Initiative decomposition (each phase = its own spec → plan)

- **Phase 1 — Project Workbench (THIS spec):** the engine (schema + verifier + render +
  build-zip + lint + i18n) proven end-to-end on **7 exemplar projects**.
- **Phase 2 — depth backfill:** bring the remaining 32 projects to the new bar; add the 6
  missing `brief` fields; deepen thin projects; fix mislabeled difficulty.
- **Phase 3 — quantity:** new guided projects for sparse tracks (AI/LLM, Go, Python, CLI,
  Networking, Math, system-design-cases), each authored with full quality fields. Adds
  non-bun toolchains (Go, Python) to the verifier + CI.
- **Phase 4 — GitHub mirror:** a generator publishes each `projects-workbench/<slug>`
  scaffold as a clonable public starter repo with its own CI. Outward-facing; needs the
  user's GitHub account. Separate spec.

This spec covers **Phase 1 only**.

---

## Phase 1 architecture

### Filesystem layout

Scaffolds live **outside** the content collection glob (`content/projects/**/*.json`),
because a `package.json`/`tsconfig.json` inside a scaffold would otherwise be loaded as a
malformed "project". New top-level directory under `site/`:

```
site/projects-workbench/<slug>/
  manifest.json          # { "stack": "bun-ts", "test": "bun test" }
  scaffold/              # what the learner starts from: stubs + FAILING tests + README
    src/…                #   implementation files with TODO stubs
    test/…               #   the acceptance suite (real assertions)
    README.md            #   build instructions, derived from the project
  solution/              # reference implementation; NEVER shipped to the learner
    src/…                #   the files that replace the scaffold stubs to make tests pass
```

- `<slug>` matches the project JSON slug exactly (`projects-workbench/rate-limiter/`
  ↔ `content/projects/rate-limiter.json`).
- The acceptance suite lives in `scaffold/test/` (the learner gets it). `solution/`
  contains only the implementation files that overwrite the scaffold's stub
  implementations — never the tests.
- **Hermetic constraint (Phase 1):** scaffolds use only the Bun standard library +
  `bun:test`. No third-party deps → no `bun install`, no network in CI. (Phase 3 relaxes
  this per-toolchain.)

### Schema additions (`site/src/content.config.ts`)

Additive and optional — the 39 existing projects keep validating unchanged.

```ts
// A rubric row: one quality dimension graded at three levels.
const RubricLevel = z.object({
  dimension: BiText,   // e.g. "Concurrency safety"
  junior: BiText,
  mid: BiText,
  senior: BiText,
});

// added to ProjectSchema:
rubric: z.array(RubricLevel).min(1).optional(),
reference: z.array(BiText).min(1).optional(),   // walkthrough of the reference solution, one item per section
workbench: z.boolean().optional(),               // true ⇒ projects-workbench/<slug>/ exists with scaffold+solution+tests
```

`reference` is an array of bilingual sections (renders as stacked paragraphs in a
collapsible). `rubric` and `reference` apply to **all** projects (including non-code design
projects like `system-design-dossier`). `workbench` applies only to code projects.

### Verifier — `bun run verify:projects`

New script `site/scripts/run-project-workbench.mjs`, modelled on
`site/scripts/run-code-samples.mjs` (the `verify:samples` runner). For each
`projects-workbench/<slug>/` whose `manifest.stack === "bun-ts"`:

1. Create a temp dir.
2. Copy `scaffold/**` into it.
3. **Run A (must FAIL):** `bun test` in the temp dir → assert **non-zero** exit. Proves the
   acceptance suite actually discriminates (the stubs do not pass it). Mirrors
   `scripts/verify-scenario.test.ts`, which asserts every debug starter fails its check.
4. Copy `solution/**` over the temp dir (overwriting the stub implementations; the tests in
   `test/` are untouched because `solution/` contains no test files).
5. **Run B (must PASS):** `bun test` → assert **zero** exit within a timeout (default
   30 000 ms). Proves the project is solvable and the reference solution satisfies the suite.
6. A `--self-test` flag proves the runner catches both a non-failing scaffold and a
   non-passing solution (mirrors `run-code-samples.mjs --self-test`).

Exit non-zero if any project fails A-must-fail or B-must-pass. This is the core quality
guarantee: **green means the displayed starter is real, its tests bite, and the project is
genuinely completable.**

### Build step — `bun run build:starters`

New script `site/scripts/build-project-starters.mjs`, run **before** `astro build` (added to
the front of the `build` script chain). For each workbench project:

- Zip `projects-workbench/<slug>/scaffold/**` → `site/public/project-starters/<slug>.zip`
  (the learner's download; excludes `solution/`).
- Emit `site/src/content/generated/project-starters.json` — a map
  `slug → { files: string[], test: string }` (the scaffold file tree + the run command) for
  the detail page to render the tree and the "how to run" hint without filesystem access at
  render time.

`public/project-starters/` and `src/content/generated/` are git-ignored build artifacts.

### Rendering — extend `[lang]/projects/[slug].astro`

After the existing `CapstonePath` block, add (each only when the data exists):

- **Starter** — when `p.workbench`: the scaffold file tree (from `project-starters.json`) +
  a "Download starter (.zip)" link to `/project-starters/<slug>.zip` + the run command.
- **Verify yourself** — when `p.workbench`: short instructions ("unzip, implement the
  stubs, run `bun test`, make it green").
- **Rubric** — when `p.rubric`: a table, one row per dimension, columns Junior / Mid /
  Senior (bilingual).
- **Reference walkthrough** — when `p.reference`: a `<details>` collapsible (spoiler) with
  the stacked bilingual sections.

New small presentational island/component `ProjectRubric.tsx` for the rubric table (the
rest is static Astro). All copy bilingual via existing `tt()` + new i18n keys.

### Lint — extend `site/src/lint/rules/capstones.ts`

New rules (build fails on violation, matching the existing capstones rigor):

- `workbench: true` ⇒ `projects-workbench/<slug>/` exists with `manifest.json` (valid:
  `stack` ∈ {`bun-ts`}, non-empty `test`), a non-empty `scaffold/`, a non-empty `solution/`,
  and at least one test file under `scaffold/test/`.
- A `projects-workbench/<slug>/` directory with no corresponding `workbench:true` project,
  or vice versa, is an error (no orphans).
- Each `rubric[].{dimension,junior,mid,senior}` and each `reference[]` item: both locales
  non-empty and, for prose ≥ 25 chars, `en !== ru` (untranslated guard) — same predicate the
  rule already applies to milestone prose.

### i18n (`site/src/i18n/ui.json`)

New EN+RU keys: `project.starter`, `project.download`, `project.howToVerify`,
`project.verifySteps`, `project.rubric`, `project.level.junior`, `project.level.mid`,
`project.level.senior`, `project.reference`.

### The 7 exemplar projects (Phase 1 content)

Each gets `projects-workbench/<slug>/{manifest.json, scaffold/, solution/}`, plus `rubric`
+ `reference` + `workbench:true` added to its existing JSON. Chosen for category spread and
clean bun-testability:

| # | slug | category | what the acceptance suite checks |
|---|------|----------|----------------------------------|
| 1 | `rate-limiter` | backend/algo | token-bucket refill math, burst handling, 429 + Retry-After, monotonic clock injection |
| 2 | `mini-crud-api` | backend/starter | CRUD handlers, 404/400 paths, validation, in-memory store semantics |
| 3 | `url-shortener-at-scale` | backend/systems | base62 codec round-trip, collision handling, 301 vs 302, unknown/expired codes |
| 4 | `command-palette` | frontend | fuzzy-match ranking, keyboard selection state machine (pure logic, no DOM) |
| 5 | `virtual-data-grid` | frontend | windowing math: visible-range computation for scrollTop/rowHeight/overscan |
| 6 | `truth-table-prover` | algorithms/logic | expression parse + evaluate, tautology/contradiction detection, equivalence |
| 7 | `type-safe-sdk` | tooling/types | runtime request/response validation, typed error envelope, retry/backoff policy |

Project #1 (`rate-limiter`) is the **pilot**: the engine (schema, verifier, build step,
render, lint, i18n) is built and proven against it first; #2–#7 then follow the established
template and are independently authorable (parallelizable). All 7 must pass `verify:projects`
(scaffold fails, solution passes) before the phase is done.

**Milestone depth (the fourth lever) in Phase 1:** for these 7, depth is delivered by the
new `rubric` + `reference` + runnable scaffold, which together raise each project to the
senior bar. Existing milestone prose is left as-is unless an exemplar's milestones are too
thin to anchor its rubric (e.g. `mini-crud-api`), in which case the milestones are deepened
as part of authoring that project. Wholesale milestone deepening of the other 32 projects is
Phase 2.

---

## Testing strategy

- **Unit (pure, vitest):** the schema additions compile; `run-project-workbench.mjs
  --self-test` proves the runner catches a non-failing scaffold and a non-passing solution;
  the new `capstones.ts` rules have table tests (workbench present/absent/orphan, rubric
  parity, reference parity) in the existing lint test harness.
- **Integration (the verifier itself):** `bun run verify:projects` over all 7 exemplars —
  each scaffold fails, each solution passes. This is the phase's acceptance gate.
- **Render:** dev-render `/en/projects/rate-limiter` + `/ru/projects/rate-limiter` (full
  build OOMs locally; gate on `bun run test` + `verify:projects` + `lint:src` + a dev curl,
  per the established workflow).
- **CI:** add `verify:projects` to `package.json` scripts and to `.github/workflows/
  deploy.yml` alongside `verify:samples` + unit tests, so a broken scaffold/solution blocks
  the deploy.

## Global constraints

- Bilingual or it does not ship — every new bilingual field requires EN + RU; lint enforces.
- Phase 1 scaffolds are Bun-stdlib + `bun:test` only (hermetic CI; no `bun install`).
- Additive schema only — the 39 existing projects must keep validating with zero edits.
- Component imports use the `~/` alias; no `..` relative segments.
- Lesson/piece hydration caps are unaffected (rubric island is on a project page, not a
  lesson/piece page; the project detail page already hydrates `CapstonePath`).
- Senior depth bar: rubric "senior" rows and `reference` walkthroughs must read at the
  middle+/senior bar (tradeoffs, failure modes), not as documentation.

## Out of scope (Phase 1)

- Non-bun toolchains (Go, Python scaffolds) — Phase 3.
- GitHub starter-repo generation — Phase 4.
- Backfilling the other 32 projects — Phase 2.
- Grading `reviewPrompt` or rubric self-assessment with an LLM — future.
