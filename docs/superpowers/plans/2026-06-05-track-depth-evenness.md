# P1 — Track Depth Evenness (deepen thin pilot tracks)

**Goal.** Bring every *substantive* thin unit (currently `<3` lessons) up to a consistent
senior-depth arc — target ~5–7 lessons per unit, matching the deepened exemplars
(node/03, networking, observability) — fully bilingual EN+RU, each new lesson carrying a
required practice set (3–5 tasks) and at least one structural diagram, with the site build
green and EN/RU parity intact. The thin tracks are exactly the applied/operational domains
(Nest, AWS, CI/CD, Node) a senior is expected to own, so closing this gap removes the "wall"
a Nest/AWS learner hits that a networking learner never sees.

**Architecture.** Pure content campaign over the existing `/learn` lesson pipeline. No new
routes, components, schemas, or runtime code. Each unit of work = (a) N new lesson MDX files
in `en/` and `ru/`, (b) N new practice JSON files, (c) a `units.json` `lessons[]` patch + a
status flip, (d) a build+verify gate. Authored at scale via the established
parallel-worktree + coordinator-merge pattern (one Claude Code instance per track in its own
worktree; coordinator-only merges into `main`), mirroring `project_parallel-expansion-2026-06`
and the `node-encyclopedia` worktree merge.

**Tech Stack.** Astro 5, Preact (islands), MDX, Vitest, Bun, Cloudflare Pages. Lessons are
`.mdx` under the `lessons` content collection; practice is JSON under the `practice`
collection; both are build-time linted in the same `bun run build` pass.

**Spec.** `docs/superpowers/specs/2026-06-05-senior-readiness-gaps-register.md` (this is plan **P1**).

**Conventions.**
- All paths are written from the **repo root** (`/Users/artemmac/dev/awesome-everything`).
  The Astro project lives in `site/`; run all `bun` commands from `site/`.
- **No git commit unless asked.** Batch commits **per phase** and request approval before
  committing. Keep steps bite-sized: one unit authored → one verify → move on.
- Authoring uses the existing `/infographic` (fullstack lesson author) command and the
  `/practice` command; never hand-roll a divergent lesson skeleton. Mirror the exemplar
  `site/src/content/lessons/en/node/03-errors-and-diagnostics/01-error-handling/index.mdx`.
- **Never delete or weaken existing widgets/lessons** while patching `units.json`
  (a recurring subagent failure mode — see `feedback_piece-authoring-subagents`).
- Reviewer/verifier subagents are **read-only on git** — never `checkout`/`reset`
  (see `feedback_review-subagents-readonly-git`).

---

## REQUIRED SUB-SKILL

**REQUIRED SUB-SKILL:** Before executing this plan, the executing agent MUST invoke
`superpowers:executing-plans` (review checkpoints between phases) and, for any phase fanned
out across worktrees, `superpowers:using-git-worktrees` +
`superpowers:dispatching-parallel-agents`. Lesson authoring within a phase uses the
`/infographic` command; practice authoring uses `/practice`. Diagrams use the `/diagram`
command or the diagram kit directly.

---

## Scoping decision (read first — it changes the worklist)

A raw "lessons[] < 3" query returns **52 thin units / 28 stubs across 29 tracks**. But two
unit *kinds* are short **by design** and must NOT be force-grown to 5–7:

- **`00-start-here`** — 25 units, 1–2 lessons each. These are orientation/"how to use this
  track" intros. Deepening them to a senior arc is wrong. **Excluded** from the depth target.
  (At most, fold an orphan single lesson into a 2-lesson intro if it reads incomplete — a
  judgment call per track, not a quota.)
- **`NN-putting-it-together`** — 23 capstone units; lesson counts range 1→11. The thin ones
  (`[1]`/`[2]`) are integrative recaps, **not** new-topic arcs. These are the subject of plan
  **P7** (guided capstone path), so **leave them to P7** — do not deepen here. Flipping their
  `status` stub→ready is also out of scope for P1.

**P1's real target = substantive thin units in the pilot tracks**, i.e. the ones that teach a
named domain topic but only got 2 lessons. Verified worklist (re-derive in Phase 0, do not
trust this snapshot blindly):

| Track | Substantive thin units (target ~5–7 lessons each) | Excluded (intro/capstone) |
|---|---|---|
| **node** | `01-modules-and-runtime` [2], `02-async-and-streams` [2], `06-testing` [2], `07-security` [2], `08-packaging-and-deploy` [2], `13-modules-deep` [2] | `00-start-here` [1], `09-putting-it-together` [1] |
| **nest** | `01-building-blocks` [2], `02-validation-and-pipes` [2], `05-auth` [2], `06-testing` [2], `07-errors-and-observability` [2], `08-microservices-and-graphql` [2] | `00-start-here` [1], `09-putting-it-together` [1] |
| **aws** | `02-compute-and-deploy` [2], `05-observability` [2], `06-iac` [2], `07-cost-and-security` [2] | `00-start-here` [1], `08-putting-it-together` [1] |
| **ci-cd** | `04-release-automation` [2], `05-supply-chain` [2], `06-scaling-ci` [2] | `00-start-here` [1], `07-putting-it-together` [1] |
| **python** | `02-scripting-and-io` [2] (+ track is only 3 units / 6 lessons — needs new units, see Phase 5) | `00-start-here` [1] |
| **sql-postgres / js-engine / typescript / system-design** | `00-start-here` [2] only | n/a — these tracks are otherwise deep |

**Net P1 substantive worklist: ~20 units** (node 6, nest 6, aws 4, ci-cd 3, python 1 + new
units). Each grows from 2 → ~6 lessons, i.e. **~4 new lessons/unit ⇒ ~80 new lessons EN+RU
(~160 MDX files) + ~80 practice JSON files**. That is the campaign.

---

## Phase 0 — Authoritative worklist + per-unit outlines (no authoring yet)

Produce the single source of truth the per-track phases consume.

- [ ] **0.1 — Write the worklist script.** Create `scripts/thin-units.mjs` (repo root
  `scripts/`, alongside other one-off node scripts) that reads `site/src/content/units.json`,
  groups by `track`, and emits every unit with `lessons.length < 3`, tagging each as
  `intro` (`slug === "00-start-here"`), `capstone` (`/putting-it-together/.test(slug)`), or
  `substantive` (everything else). Output a markdown table + a JSON sidecar.

  ```js
  // scripts/thin-units.mjs
  import { readFileSync } from "node:fs";
  const raw = JSON.parse(readFileSync("site/src/content/units.json", "utf8"));
  const units = Array.isArray(raw) ? raw : raw.units;
  const kind = (u) =>
    u.slug === "00-start-here" ? "intro"
    : /putting-it-together/.test(u.slug) ? "capstone"
    : "substantive";
  const thin = units
    .filter((u) => (u.lessons?.length ?? 0) < 3)
    .map((u) => ({ id: u.id, track: u.track, slug: u.slug,
                   n: u.lessons.length, status: u.status, kind: kind(u) }));
  console.log(JSON.stringify(thin, null, 2));
  ```

  Run: `node scripts/thin-units.mjs > docs/superpowers/plans/_p1-thin-worklist.json`
  **Expected:** ~52 entries; ~20 with `kind:"substantive"` concentrated in node/nest/aws/ci-cd/python.

- [ ] **0.2 — Draft per-unit lesson outlines.** For each `substantive` unit, write a short
  outline block (target 4 *new* lessons each, giving ~6 total): lesson `slug`, `title`,
  one-line `crux`. Capture these in this plan under each phase below (skeletons seeded in
  Phases 1–5 — fill any gaps from the deepened-track exemplars and `curriculum.md` depth bar).
  Outlines must hit the senior depth bar: each lesson = mechanism + tradeoff + failure mode +
  numbers, not documentation paraphrase.

- [ ] **0.3 — Confirm anchors exist** (Read-only):
  - Exemplar lesson: `site/src/content/lessons/en/node/03-errors-and-diagnostics/01-error-handling/index.mdx`
  - Diagram kit (real component names): `site/src/components/diagram/{FlowDiagram,StackDiagram,SequenceDiagram,DiagramFrame,PacketDot}.astro`
    (NOTE: kit exports `FlowDiagram`/`StackDiagram`/`SequenceDiagram` — there is no
    `Flow`/`Stack`/`Sequence`/`StructureFigure` bare name; use the `.astro` names.)
  - Practice shape: `site/src/content/practice/node/03-errors-and-diagnostics/01-error-handling.json`
    → `{ lessonKey, track, tasks:[{ id, type, difficulty, estMin, title{en,ru}, prompt{en,ru}, scenario{en,ru}, … }] }`, 3–5 tasks.
  - Playbooks: `docs/practice-campaign.md`, `docs/3-deep-track-prompts.md`.

- [ ] **0.4 — Establish the worktree fleet** (defer actual creation to each phase). One
  worktree per track to be deepened, named `expand-<track>` (e.g. `expand-nest`,
  `expand-aws`), each branched off `main`. Coordinator merges sequentially into `main`,
  resolving `units.json` by **union-dedup-by-`id`** (the resolve rule proven in
  `project_parallel-expansion`/`node-encyclopedia`). Lessons/practice live in
  non-overlapping paths so they never conflict; only `units.json` and `tracks.json` can.

**Phase 0 deliverable:** `_p1-thin-worklist.json` + filled outlines below. **Commit gate:**
request approval, commit `docs(p1): thin-unit worklist + per-unit outlines`.

---

## Per-unit task template (used by every unit in Phases 1–5)

For a unit `T/UU-unit` growing from its current 2 lessons to ~6, for each **new** lesson
`NN-lesson-slug`:

1. **Author EN MDX** → `site/src/content/lessons/en/<track>/<unit>/<NN-lesson-slug>/index.mdx`
   via `/infographic <track>/<unit>/<NN-lesson-slug>`. Structure (mirror the exemplar):
   `Hook → Crux → Explanation(## sections + fenced code + <Inset> + <TradeoffMatrix> + <Quiz>) → <FlowDiagram> (or Stack/Sequence) → KeyTakeaway → RetrievalDrawer(client:load) → Recap`.
   Frontmatter must set `track`, `unit`, `slug`, `order`, `status: ready`, `lang: en`,
   `level`, `concepts`, `sources`, and `summary` (**≤280 chars — content-sync fails fast over
   280**). Budgets: `Crux ≤140`, `KeyTakeaway ≤220`, **hydration ≤5 islands** (RetrievalDrawer
   is the one `client:load`; Quiz/TradeoffMatrix/DragOrder are `.astro`, zero-JS).
2. **Translate RU** → `site/src/content/lessons/ru/<track>/<unit>/<NN-lesson-slug>/index.mdx`,
   using `site/src/i18n/glossary.json` (add new terms alphabetically). EN/RU must be
   structurally mirrored (same sections, same widget ids, `lang:"ru"`).
3. **Author practice** → `site/src/content/practice/<track>/<unit>/<NN-lesson-slug>.json`
   via `/practice`. 3–5 bilingual tasks; `lessonKey` = `"<track>/<unit>/<NN-lesson-slug>"`;
   each task `title/prompt/scenario` has `{en,ru}` (the lab-mirror lint requires RU present,
   min length ~25). Reuse senior task types: `predict`, `diagnose`, `design`, `fix`, `incident`.
4. **At least one structural diagram** per lesson (the `<FlowDiagram>`/`<StackDiagram>`/
   `<SequenceDiagram>` already in the body satisfies the "≥1 visual" lesson rule).
5. **Patch `units.json`** — append the new lesson slugs to the unit's `lessons[]` (keep order)
   and flip `status` `stub`/`draft` → `ready`:
   ```jsonc
   {
     "id": "nest/02-validation-and-pipes",
     "slug": "02-validation-and-pipes",
     "track": "nest", "order": 2,
     "title": { "en": "Validation & pipes", "ru": "Валидация и pipes" },
     "crux": { "en": "...", "ru": "..." },
     "lessons": [
       "01-dto-validation",
       "02-guards-interceptors",
       "03-custom-pipes-and-transforms",   // ← new
       "04-class-validator-deep",          // ← new
       "05-validation-failure-modes",      // ← new
       "06-validation-at-scale"            // ← new
     ],
     "status": "ready"                       // ← was "stub"
   }
   ```

**Per-unit verify (after each unit):** `bun run build` in `site/` (astro + lint, ~10 min —
**launch detached** per the build-contention gotcha; never run two concurrent builds in the
same worktree), then `bun run verify:samples`. Expected: build green at **4700+ pages
(growing as lessons land), lint 0 errors / 0 warnings**; runnable code samples pass.

---

## Phase 1 — node (6 substantive units, worst offender)

Worktree `expand-node`. Each unit 2 → ~6 lessons. Per-unit task = the template above.

- [ ] **1.1 `node/01-modules-and-runtime`** — add e.g. `03-event-loop-phases`
  (timers/poll/check/microtask ordering), `04-require-vs-import-interop`
  (CJS↔ESM cycles, `module.exports` vs live bindings), `05-process-and-env`
  (argv, env, signals, exit codes), `06-worker-threads-vs-cluster` (when each, shared memory).
- [ ] **1.2 `node/02-async-and-streams`** — `03-backpressure` (highWaterMark, `drain`),
  `04-pipeline-and-errors` (`stream.pipeline`, cleanup), `05-async-iterators`
  (`for await`, async generators over streams), `06-streams-failure-modes` (leaks, stalls).
- [ ] **1.3 `node/06-testing`** — `03-node-test-runner` (`node:test`, `--test`),
  `04-mocking-and-fakes` (timers, fs, network), `05-integration-and-fixtures`,
  `06-flaky-and-coverage` (c8, isolation).
- [ ] **1.4 `node/07-security`** — `03-input-and-injection`, `04-secrets-and-crypto`
  (`node:crypto`, KDFs), `05-dependency-and-supply-chain` (audit, lockfile pinning),
  `06-runtime-hardening` (permissions model, `--frozen-intrinsics`).
- [ ] **1.5 `node/08-packaging-and-deploy`** — `03-exports-and-conditions`
  (package `exports` map, dual-package hazard), `04-bundling-vs-native`,
  `05-docker-and-runtime-flags`, `06-graceful-shutdown` (drain, SIGTERM, healthcheck).
- [ ] **1.6 `node/13-modules-deep`** — `03-loader-hooks` (`module.register`, resolve/load),
  `04-monorepo-resolution` (workspaces, symlinks), `05-conditional-exports-deep`,
  `06-esm-cjs-migration-failure-modes`.
- [ ] **1.7 Verify node** — detached `bun run build` + `bun run verify:samples`; lint 0/0.
- [ ] **1.8 Commit gate** — request approval; commit `content(node): deepen 6 thin units EN+RU`.

---

## Phase 2 — nest (6 substantive units)

Worktree `expand-nest`. Lean on the `nestjs-patterns` skill for accuracy.

- [ ] **2.1 `nest/01-building-blocks`** — `03-providers-and-di-scopes`
  (request/transient/default, circular deps), `04-modules-and-dynamic-modules`
  (`forRoot`/`forFeature`), `05-lifecycle-hooks` (`onModuleInit`, shutdown hooks),
  `06-execution-context` (request lifecycle order).
- [ ] **2.2 `nest/02-validation-and-pipes`** — `03-custom-pipes-and-transforms`,
  `04-class-validator-deep` (groups, conditional, custom decorators),
  `05-validation-failure-modes` (whitelist/forbidNonWhitelisted, type-coercion traps),
  `06-validation-at-scale` (shared DTOs, partials, serialization).
- [ ] **2.3 `nest/05-auth`** — `03-jwt-and-sessions` (strategy, refresh),
  `04-guards-and-rbac` (`CanActivate`, claims), `05-passport-strategies`,
  `06-auth-failure-modes` (token leakage, guard ordering, public routes).
- [ ] **2.4 `nest/06-testing`** — `03-testing-module` (`Test.createTestingModule`, overrides),
  `04-mocking-providers`, `05-e2e-with-supertest`, `06-testing-guards-and-pipes`.
- [ ] **2.5 `nest/07-errors-and-observability`** — `03-exception-filters`
  (`HttpException`, custom filters), `04-interceptors-and-logging`,
  `05-tracing-and-metrics` (OTel integration), `06-error-failure-modes`.
- [ ] **2.6 `nest/08-microservices-and-graphql`** — `03-transport-layers`
  (TCP/Redis/NATS/Kafka), `04-graphql-resolvers` (code-first, dataloader),
  `05-hybrid-apps` (HTTP + microservice), `06-distributed-failure-modes` (timeouts, retries).
- [ ] **2.7 Verify nest** — detached build + verify:samples; lint 0/0.
- [ ] **2.8 Commit gate** — approval; `content(nest): deepen 6 thin units EN+RU`.

---

## Phase 3 — aws (4 substantive units)

Worktree `expand-aws`. Keep vendor-neutral mechanism + numbers; avoid console-click tutorials.

- [ ] **3.1 `aws/02-compute-and-deploy`** — `03-lambda-cold-starts`
  (init phase, provisioned concurrency, numbers), `04-ecs-vs-lambda-tradeoffs`,
  `05-deploy-strategies` (blue/green, canary, rollback), `06-compute-failure-modes`
  (throttling, concurrency limits, timeouts).
- [ ] **3.2 `aws/05-observability`** — `03-cloudwatch-metrics-and-alarms`,
  `04-structured-logs-and-insights`, `05-xray-tracing`,
  `06-observability-failure-modes` (cardinality cost, sampling, log loss).
- [ ] **3.3 `aws/06-iac`** — `03-cloudformation-vs-cdk-vs-terraform`,
  `04-state-and-drift`, `05-modules-and-reuse`, `06-iac-failure-modes`
  (state lock, partial apply, destroy hazards).
- [ ] **3.4 `aws/07-cost-and-security`** — `03-iam-least-privilege`
  (policies, assume-role, boundaries), `04-cost-drivers-and-budgets`,
  `05-data-protection` (KMS, encryption at rest/in transit), `06-security-failure-modes`
  (public buckets, over-broad roles, credential leakage).
- [ ] **3.5 Verify aws** — detached build + verify:samples; lint 0/0.
- [ ] **3.6 Commit gate** — approval; `content(aws): deepen 4 thin units EN+RU`.

---

## Phase 4 — ci-cd (3 substantive units)

Worktree `expand-ci-cd`.

- [ ] **4.1 `ci-cd/04-release-automation`** — `03-semantic-versioning-and-changelogs`,
  `04-release-pipelines` (tag→build→publish), `05-rollback-and-hotfix`,
  `06-release-failure-modes` (partial publish, immutability, registry races).
- [ ] **4.2 `ci-cd/05-supply-chain`** — `03-sbom-and-provenance` (SLSA, attestations),
  `04-dependency-pinning-and-scanning`, `05-signing-and-verification` (sigstore/cosign),
  `06-supply-chain-failure-modes` (typosquatting, compromised actions, secret exfil).
- [ ] **4.3 `ci-cd/06-scaling-ci`** — `03-caching-and-artifacts`,
  `04-parallelism-and-matrix`, `05-self-hosted-runners`,
  `06-ci-cost-and-flakiness` (queue time, flaky-test budgets, runner cost).
- [ ] **4.4 Verify ci-cd** — detached build + verify:samples; lint 0/0.
- [ ] **4.5 Commit gate** — approval; `content(ci-cd): deepen 3 thin units EN+RU`.

---

## Phase 5 — python (track-level gap: 3 units / 6 lessons)

Worktree `expand-python`. python is not just thin units — the **whole track** is a 3-unit
surface pilot. Two sub-goals:

- [ ] **5.1 Deepen `python/02-scripting-and-io`** (2 → ~6): `03-pathlib-and-filesystem`,
  `04-subprocess-and-shell` (safety, pipes), `05-argparse-and-cli`,
  `06-io-failure-modes` (encoding, buffering, partial reads).
- [ ] **5.2 Add net-new units to reach senior coverage parity** (≥ ~8 units like a real track).
  Each new unit needs a `units.json` entry (new `id`/`order`) **and** a `tracks.json` check
  (ensure the track's unit list / band is consistent — adding a unit must patch `tracks.json`
  too, per the new-track gotcha). Candidate units: `03-typing-and-dataclasses`,
  `04-async-and-concurrency` (asyncio, GIL, threads vs processes),
  `05-packaging-and-envs` (venv, pyproject, wheels), `06-testing` (pytest, fixtures),
  `07-performance` (profiling, C-extensions, numpy hot paths),
  `08-putting-it-together`. Each substantive unit = ~5–6 lessons via the per-unit template.
  (This is the largest single phase; consider splitting across 2 worktree instances.)
- [ ] **5.3 Verify python** — detached build + verify:samples; lint 0/0; confirm
  `tracks.json` + `units.json` agree (no orphan unit ids, no dangling lesson slugs).
- [ ] **5.4 Commit gate** — approval; `content(python): deepen track to senior depth EN+RU`.

---

## Phase 6 — Coordinator merge + global verification

- [ ] **6.1 Sequential merge.** Merge `expand-node → expand-nest → expand-aws → expand-ci-cd →
  expand-python` into `main` one at a time. For each, resolve `units.json` (and `tracks.json`
  for python) by **union-dedup-by-`id`**; lessons/practice paths never collide. After each
  merge, re-run the build before the next merge (don't stack unverified merges).
- [ ] **6.2 Full build gate.** From `site/`, launch detached `bun run build`. **Expected:**
  green, **~4870 pages** (4694 baseline + ~80 new lessons × 2 langs + index pages), and
  `dist/lint-report.json` shows **0 errors / 0 warnings**.
- [ ] **6.3 Sample execution.** `bun run verify:samples` — all runnable code samples pass.
- [ ] **6.4 Parity audit.** Re-run `node scripts/thin-units.mjs`; confirm **0 `substantive`
  thin units remain** in node/nest/aws/ci-cd/python (intro/capstone may remain by design).
  Spot-check 3 random new lessons in browser at `/learn/<track>/<lesson>` (EN + RU render,
  RetrievalDrawer hydrates, diagram visible, practice loads).
- [ ] **6.5 EN/RU parity check.** Every new `en/.../index.mdx` has a sibling
  `ru/.../index.mdx` with the same slug and matching widget ids (the i18n-parity lint rule
  enforces this at build; this step is the manual backstop).
- [ ] **6.6 Final commit gate** — approval; coordinator commit on `main`
  `content: P1 track-depth evenness — deepen node/nest/aws/ci-cd/python thin units EN+RU`.
  Do **not** push unless asked.

---

## Effort estimate

- ~20 substantive units × ~4 new lessons = **~80 lessons** → **~160 MDX files + ~80 practice
  JSON** + ~25 `units.json`/`tracks.json` patches.
- At the deepened-track rate (a lesson EN+RU+practice ≈ 1 focused authoring pass), with
  5 parallel worktree instances: **~1.5–2.5 weeks** of campaign time. python (Phase 5) is the
  long pole; the rest is parallelizable to roughly the slowest track.
- This is an **ongoing/parallel** campaign per the register sequencing (P1 runs alongside
  P2–P7), not a blocking serial dependency.

## Dependencies

- **None hard.** Reuses the existing `/infographic` + `/practice` + `/diagram` pipeline,
  the diagram kit, the practice + lessons content collections, and the parallel-worktree
  merge workflow — all already shipped. `curriculum.md` (depth bar) + `docs/practice-campaign.md`
  + `docs/3-deep-track-prompts.md` are the authoring references.

## Risks

- **Build contention.** Concurrent `bun run build` runs in the same worktree (or scheduled
  proceed-work colliding with a live session) corrupt output / waste 10-min cycles. Mitigate:
  one build per worktree, **launch detached**, check `ps` + file mtimes before authoring
  (per `feedback_scheduled-run-concurrency`).
- **i18n parity drift.** Authoring EN and skipping/skimping RU breaks the parity lint and
  fails the build. Mitigate: author EN+RU as one unit of work; never mark a lesson `ready`
  EN-only. Add new glossary terms alphabetically.
- **280-char summary cap.** `content-sync` fails fast if any frontmatter `summary` exceeds
  280 chars — a silent author trap. Mitigate: count chars before flipping `status: ready`.
- **Subagents deleting widgets / detached HEAD.** Implementer subagents must assert they are
  on the expected branch before committing and must never remove existing lessons/widgets when
  patching `units.json`; reviewer subagents stay read-only on git.
- **Scope creep into intro/capstone units.** Do not deepen `00-start-here` or
  `putting-it-together` (the latter is P7). Re-check `kind` before authoring.
- **Depth bar miss.** New lessons that read like docs paraphrase fail the senior bar. Each
  lesson must carry mechanism + a real tradeoff + a named failure mode + concrete numbers.

## Success criteria

1. `node scripts/thin-units.mjs` reports **0 `substantive` thin units** (<3 lessons) across
   node, nest, aws, ci-cd, python.
2. Every targeted unit is **status `ready`** with ~5–7 lessons.
3. **Build green** from `site/` (`bun run build`), ~4870 pages, `dist/lint-report.json`
   **0 errors / 0 warnings**; `bun run verify:samples` passes.
4. **EN/RU parity:** every new lesson exists in both `en/` and `ru/` with matching structure;
   every new lesson has a 3–5 task bilingual practice file and ≥1 structural diagram.
5. No existing lessons, widgets, or practice files were deleted or weakened.
