# Project Workbench Phase 2 — Rubric + Reference Backfill

> **For agentic workers:** content backfill against the Phase-1 engine (schema/lint/render already ship `rubric`/`reference`/`brief`). No new code. Author bilingual content to the senior bar, gate, commit in waves, review, merge, deploy.

**Goal:** Lift every guided project to the Phase-1 quality bar by adding a `rubric` (≥3 dimensions, junior/mid/senior) + a `reference` walkthrough (3–5 sections), and fill the 6 missing `brief`s — all bilingual (EN+RU), senior-depth.

**Architecture:** Pure JSON edits to `site/src/content/projects/*.json`. The schema (`rubric`/`reference`/`brief` already optional), the lint parity rule (`capstones.ts` `pushBiIntegrity` over rubric+reference), and the detail-page render (`[lang]/projects/[slug].astro` rubric table + reference `<details>`) all exist from Phase 1. No `workbench:true` here — that requires a runnable scaffold (separate batch); adding it without one fails the orphan/coherence lint.

**Tech Stack:** JSON content; gate via `bun run test` + `bun run lint:src` (full `astro build` OOMs locally; CI renders).

## Global Constraints

- **Bilingual or it does not ship.** Every `en` needs a real `ru`. Lint flags `en === ru` on prose ≥ 25 chars and whitespace-only locales (`capstones.ts`). Never copy EN into RU.
- **Senior depth bar.** Rubric `senior` rows and `reference` sections read at middle+/senior level — name the tradeoff, the failure mode, the number — not documentation. Match `rate-limiter.json` exactly in shape and depth.
- **Shape match.** `rubric`: array of `{ dimension:{en,ru}, junior:{en,ru}, mid:{en,ru}, senior:{en,ru} }`, ≥3 rows. `reference`: array of `{en,ru}`, 3–5 entries. `brief`: `{en,ru}`, one rich paragraph (see `job-scheduler.json`).
- **The rubric's ladder must be real:** junior = naive-but-works, mid = the correct mechanism, senior = the hard edge (contention, clock, scale, abuse, observability). Each level a strict superset of insight over the last.
- **Dimensions must be project-specific** — derive from the project's own milestones/deliverable, not generic "Correctness / Tests / Docs".
- **Valid JSON.** Every edited file must `jq empty` clean. Additive keys only; do not touch existing milestones/pitch/etc.
- **Schema:** the 39 existing projects keep validating; changes are additive.

## Targets (32 rubric+reference; 6 brief)

Already complete (Phase 1, skip): command-palette, mini-crud-api, rate-limiter, truth-table-prover, type-safe-sdk, url-shortener-at-scale, virtual-data-grid. (rate-limiter's missing `brief` added in this branch's first commit.)

Need rubric+reference (32): architecture-patterns-platform, at-least-once-queue\*, authorized-recon-ctf-lab, cache-stampede-lab\*, cloud-hardening-lab, collab-cursors, feature-flags-service, go-concurrent-service, grounded-rag-service, homelab-secure-stack, hotpath-profiler-lab, idempotent-etl-pipeline, job-scheduler, managed-service-unit, nest-modular-service, nextjs-app-to-production, numeric-toolkit, oauth-mini\*, offline-pwa-sync, pathfinding-route-engine, personal-portfolio-page, presigned-upload, python-async-service, query-plan-visualizer\*, react-feature-at-scale, reporting-schema-optimizer, signals-mini, system-design-dossier, threat-model-and-harden, three-tier-on-aws, tiny-stack-vm, write-ahead-log\*.

`*` = also needs `brief` (5: at-least-once-queue, cache-stampede-lab, oauth-mini, query-plan-visualizer, write-ahead-log).

## Batches (disjoint files → parallel authoring; controller gates + commits)

- **A — durable backend/data:** at-least-once-queue\*, cache-stampede-lab\*, idempotent-etl-pipeline, write-ahead-log\*, feature-flags-service, presigned-upload
- **B — services/APIs:** go-concurrent-service, python-async-service, nest-modular-service, oauth-mini\*, grounded-rag-service, job-scheduler
- **C — data/perf/algorithms:** reporting-schema-optimizer, query-plan-visualizer\*, hotpath-profiler-lab, numeric-toolkit, pathfinding-route-engine, tiny-stack-vm
- **D — frontend/web:** collab-cursors, offline-pwa-sync, react-feature-at-scale, nextjs-app-to-production, signals-mini, personal-portfolio-page
- **E — security/cloud/infra:** authorized-recon-ctf-lab, cloud-hardening-lab, threat-model-and-harden, homelab-secure-stack, managed-service-unit, three-tier-on-aws
- **F — architecture/design:** architecture-patterns-platform, system-design-dossier

## Gate (after each wave merges into working tree)

1. `cd site && jq empty src/content/projects/*.json` — all valid JSON.
2. `bun run test` — schema + lint unit tests green.
3. `bun run lint:src` — bilingual parity + coherence clean.
4. Commit the wave: `content(projects): rubric + reference for <batch> (EN+RU)`.

After all waves: whole-branch review (opus) → fix Critical/Important → merge `--no-ff` to main → deploy → verify a sample project page renders rubric+reference both locales.
