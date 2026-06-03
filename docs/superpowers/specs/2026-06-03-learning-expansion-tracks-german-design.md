# Design — Learning expansion: CI/CD, Node, Nest tracks · Docker/K8s deepening · Practice UX · German layer

Date: 2026-06-03
Status: approved (design approved in brainstorm; proceeding to writing-plans)
Branch: `learning-expansion-tracks-german`

## Purpose

Self-learning expansion of the curriculum site (author's own learning tool, not a recruiter portfolio). Six workstreams, sequenced, executed pilot-first. Closes remaining gaps from the EU JS/TS hiring doc (CI/CD, Node/Nest depth) and adds a German-learning layer (the doc's B1 goal) on top of the already-shipped English engine.

## Sequence

`WS-A practice UX → WS-B ci-cd → WS-C node + nest → WS-D deployment docker/k8s deepening → WS-E German layer`.

Practice UX first (small, lifts every track). German last (deliberate token sink). Each workstream ends green (`cd site && bun run build`, 0 lint warnings) and is independently committable.

## Shared mechanics (new tracks)

Adding a track patches **5 places** (verified): `site/src/types/index.ts` (`Track` union + `TRACKS`), `site/src/components/atlas/track-band.ts` (`TRACK_BAND`, exhaustive), `site/src/scripts/track-meta.ts` (`TRACK_ABBR`, exhaustive), `site/src/content/tracks.json`, `site/src/content/units.json`. Scaffold stubs via a copy of `site/scripts/scaffold-tracks.mjs`. `color` ∈ fixed enum `lilac|mint|peach|sky|rose` (reused). Max current `order` = 26 → new: ci-cd 27, node 28, nest 29.

**Per `ready` lesson:** EN+RU MDX (tiered `lessonType: topic`), a practice JSON, ≥1 structural diagram, ≥1 `data-lesson-visual`, sources ≥1. Author via parallel file-write subagents (proven aws/python pattern), then one build gate per track. **Front-load the known failure classes:** `<Crux>` ≤135 chars (EN+RU, linter strips backticks); practice `design`/`incident` tasks use TOP-LEVEL `constraints`/`rubric`(≥2)/`model` / `steps`(3-6) — never a `grading` wrapper; single-quote frontmatter `summary`/`title`; escape literal `{`/`}` → `&#123;`/`&#125;` inside `data-lesson-visual` HTML tables. Exemplar to mirror: `site/src/content/lessons/{en,ru}/deployment/01-image-layers/01-overview/index.mdx` + its practice JSON.

**Subagent git safety:** reviewers are read-only (no checkout/reset); implementers assert `git symbolic-ref -q HEAD` is the program branch before committing; authors write files only (no git/build) so parallel runs never race the index.

---

## WS-A — Practice onboarding UX

**Problem:** the practice page gives no sense of where to start.

**Files:** `site/src/components/pedagogy/PracticeSection.tsx` (+ `PracticeSection.test.tsx`).

**Changes (one component, applies to every practice page):**
1. A **"Start here"** intro block at the top: one or two lines explaining how practice works and what the three difficulty tiers mean (recall = recall a fact, apply = use it on a case, stretch = senior-level design/fix).
2. Tasks **ordered and visually grouped by difficulty** recall → apply → stretch (currently they render in author order). Each task header shows type, difficulty, and est-min, plus a one-line "how to approach a `<type>` task" hint (predict/diagnose/fix/design/incident/sandbox each get a fixed bilingual blurb).
3. A **progress indicator** — `N of M done` — persisted in the existing `user-state` localStorage (same `KEY = "awesome.user-state.v1"` pattern ProjectBrief uses), marking a task done when opened/completed.

Keep all existing grading/rendering behavior. Bilingual UI strings (EN/RU) inline like the component already does. Build-safe; no content files change. Verify the existing PracticeSection tests still pass + add tests for ordering and the difficulty grouping helper.

---

## WS-B — `ci-cd` track (pilot)

Slug `ci-cd`, band `advanced`, order 27. Pilot units (tiered EN+RU, practice + diagram each):
- `00-start-here` — `01-what-cicd-is` (what CI and CD are, why, the pipeline mental model).
- `01-pipelines` — `01-github-actions-basics` (workflows/jobs/steps/triggers), `02-caching-and-matrix` (dependency caching, matrix builds, artifacts), `03-secrets-and-environments` (secrets, environments, OIDC to cloud).
- `02-testing-in-ci` — `01-test-pyramid-and-gates` (unit/integration/e2e balance, required checks), `02-vitest-jest-playwright` (writing fast unit + e2e tests that run in CI), `03-contract-and-flaky` (contract testing, flaky-test strategy).

Expansion later: CD/deploy strategies, monorepo CI, release automation, supply-chain (sigstore/SBOM).

## WS-C — `node` and `nest` tracks (pilot each; zero→senior+ arc)

**`node`** — slug `node`, band `surface`, order 28:
- `00-start-here` — `01-what-node-is` (runtime, V8 + libuv, event loop recap, where Node fits).
- `01-modules-and-runtime` — `01-cjs-vs-esm`, `02-packages-and-npm` (package.json, semver, lockfiles, scripts).
- `02-async-and-streams` — `01-async-patterns` (callbacks → promises → async/await, error handling), `02-streams-and-backpressure` (streams, pipes, backpressure).

**`nest`** — slug `nest`, band `surface`, order 29 (assumes node + typescript):
- `00-start-here` — `01-why-nest` (what Nest is, the DI mental model, when to reach for it).
- `01-building-blocks` — `01-modules-controllers-providers`, `02-dependency-injection` (providers, scopes, custom providers).
- `02-validation-and-pipes` — `01-dto-validation` (class-validator, pipes), `02-guards-interceptors` (guards, interceptors, exception filters).

Expansion later — node: error handling/diagnostics, perf/profiling, security, testing, packaging; nest: config/modules, persistence (TypeORM/Prisma), auth, testing, microservices, GraphQL.

## WS-D — Deployment Docker/K8s deepening (expand `deployment`, no new track)

Add to the existing `deployment` track (new lessons within existing units and/or new units in `units.json`), pilot = the highest-value additions, tiered EN+RU + practice + diagram each:
- Docker: container networking (bridge/host/networks, ports), volumes & persistence, image security & scanning (CVEs, non-root, minimal base).
- K8s: services → ingress (routing, TLS), config & secrets (ConfigMap/Secret, env vs mount), probes & resources (liveness/readiness, requests/limits), a Helm intro (charts/values).

Each new lesson registered in `units.json` (extend the relevant unit's `lessons[]` or add a unit) and authored to `ready`. No `docker`/`k8s` tracks created (deferred — overlap avoided).

## WS-E — German learning layer (remaining budget)

Reuse the shipped English engine (`site/src/english/`: placement, scheduler/FSRS, BYOK, speech) **by import** — do not fork or rewrite English. Add a parallel German surface:
- `site/src/german/` — data: vocabulary **A1 → B1** (the doc's B1 target), reading passages, output/writing prompts, and German-specific grammar (cases, gender/articles, word order, separable verbs). Mirror the English data shapes.
- Engine reuse: import the existing scheduler/placement/BYOK/speech modules; parameterize by target language where a module is English-specific, otherwise wrap.
- Routes: `site/src/pages/[lang]/german/index.astro` (+ sub-pages) mirroring `[lang]/english/`. UI bilingual (EN/RU interface, German target).
- Scope: vocab + reading + output + grammar to B1; spaced repetition via the existing scheduler. **Initially self-only** — BYOK for any LLM calls, no new server infra, no auth changes.
- **This workstream gets its own detailed sub-design** (read `site/src/english/` deeply first) before its implementation plan — the program plan will treat WS-E as "design then build," not a single mechanical pass.

---

## Cross-cutting acceptance

- Per workstream: `cd site && bun run build` → 0 lint warnings; EN+RU parity; page count grows as expected.
- `bun run test` (vitest) — new/changed component tests pass (note: a pre-existing `practice.test.ts` failure for `databases` is unrelated and predates this work).
- New track colors from the 5-enum; all `TRACKS` slugs present in both exhaustive records.
- No pedagogy widgets deleted by authoring subagents.

## Out of scope (YAGNI)

- Full completion of any track beyond the pilot (expansion is follow-up).
- New standalone `docker`/`k8s` tracks (chose deployment expansion).
- Rewriting/parameterizing the English layer into a generic bilingual engine (chose German-reuses-engine, not English-refactor).
- German server infra / multi-user / auth (self-only, BYOK).
- Repo-as-portfolio items (README/CI test step/Dockerfile) and out-of-repo job-hunt actions (cert, applications) from the source doc.

## Risks / notes

- Enormous total scope; pilots bound each track to ~6 lessons ×2 langs first, validated by a per-track build gate before any expansion.
- German (WS-E) is the largest unknown; its detailed sub-design precedes its build.
- Adding a track without all 5 patches fails typecheck/lint — treat the 5-place patch as one atomic step.
- Scheduled/proceed-work runs can collide on the worktree — check before authoring.
