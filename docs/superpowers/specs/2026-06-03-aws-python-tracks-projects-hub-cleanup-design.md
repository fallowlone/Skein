# Design — AWS & Python tracks, enriched Projects hub, repo cleanup

Date: 2026-06-03
Status: approved (brainstorm complete, awaiting spec review → writing-plans)

## Purpose

Self-learning expansion of the curriculum site (this project is for the author's
own learning, **not** a recruiter portfolio). Four independent workstreams,
delivered in one coordinated program:

1. **WS1 — AWS track** (new, tiered, hands-on, cert-tagged) — pilot first.
2. **WS2 — Python track** (new, tiered, AI/scripting angle) — pilot first.
3. **WS3 — Cleanup** of junk scripts / stray files in the repo root.
4. **WS4 — Enrich the existing Projects hub** with detail pages, FE/BE/infra
   categories, and new frontend + backend project briefs (Approach A — one hub,
   no second page).

### Reframe (drives scope)

The motivating document (`compass_artifact_*.md`, EU JS/TS hiring outlook) named
AWS, Docker/K8s, CI/CD, PostgreSQL depth, an AI/RAG project, and system design as
the highest-leverage skills. The site already covers Docker/K8s (`deployment/`),
AI/RAG (`ai-llm/`), Postgres depth (`sql-postgres/`), and system design
(`system-design/`, `system-design-cases/`). The two real content gaps are
**AWS-specific hands-on** and **Python**. Hence WS1 + WS2. Portfolio-polish items
(recruiter README, CI test step, Dockerfile) are **out of scope** — the project is
the author's learning tool, not a CV artifact.

## Sequencing

`WS3 cleanup → WS4 projects hub → WS1 AWS pilot → WS2 Python pilot`.

Rationale: cleanup unblocks a clean tree cheaply; the hub is self-contained
feature work; the two courses are heavy bilingual content and go last. Each
workstream ends green (`cd site && bun run build`, 0 lint warnings) before the
next starts.

---

## Shared mechanics — how a new track wires in

Adding a track requires patching **five** locations (verified in the codebase).
Missing any one breaks typecheck or lint:

1. `site/src/types/index.ts` — add slug to the `Track` union **and** the `TRACKS`
   array.
2. `site/src/components/atlas/track-band.ts` — add slug to `TRACK_BAND`
   (`Record<Track, Band>` is exhaustive; a missing key fails typecheck).
3. `site/src/content/tracks.json` — `{ slug, order, color, title{en,ru}, blurb{en,ru} }`.
   `color` must be an **unused** palette key (verify against existing entries at
   implementation time).
4. `site/src/content/units.json` — one entry per unit:
   `{ id: "<track>/<NN-unit>", slug, track, order, title{en,ru}, crux{en,ru}, lessons: [...] }`.
5. `site/src/content/lessons/{en,ru}/<track>/<NN-unit>/<NN-lesson>/index.mdx` —
   the bilingual lesson MDX itself.

**Per `ready` lesson the build-lint also requires** (campaign is build-enforced):
- EN **and** RU MDX (i18n parity).
- A practice JSON under `site/src/content/practice/<track>/<unit>/<lesson>.json`
  (bilingual tasks).
- At least one structural diagram in the lesson (kit:
  `DiagramFrame/Flow/Stack/Sequence/StructureFigure/PacketDot`).
- Sources block.

Both new courses use the **tiered fullstack skeleton** (junior/senior tiers,
middle+ depth — the `/infographic` style, not the linear `/teach` style), per the
approved format decision.

Authoring runs through the existing `/infographic <track>/<unit>/<lesson>` pipeline
where practical; lessons may be authored by subagents in the 3-phase split
(research → author EN → translate RU), briefed to distrust web content
(prompt-injection guard) and to never delete pedagogy widgets.

---

## WS3 — Cleanup (do first)

### Targets to remove (after a reference-grep proves nothing imports each)

- 54 loose root `*.py`: `debug_*.py`, `fix_frontmatter_*.py`, `test_*.py`,
  `debug.py`, `debug_after.py`, etc. — one-off frontmatter fixers / scratch
  debug scripts, all committed to the repo root.
- `site/src/content/units.json.bak` — stale backup.
- `test_sources_before_after.mdx` — scratch artifact.
- `awesome-everything.<uuid>.log` — 575 KB stray log (already gitignored;
  remove the working-tree file).
- untracked `site/_flow.mjs` — verify it is scratch, then remove.

### Keep (do NOT touch)

- `scripts/` — real scraper / data-pipeline tooling.
- `functions/` — Cloudflare auth/account/api code (has its own tests).
- Anything under `site/src` and `site/scripts` that the build imports.

### Method

1. For each candidate, `grep` the repo (excluding the file itself) for imports /
   references. If referenced → keep and report; if not → delete.
2. Add a `.gitignore` rule (or a short note) discouraging root-level one-off
   scripts in future.
3. Gate: `git status` shows only intended deletions; `cd site && bun run build`
   green.

This is the author's own admitted junk and explicitly requested for removal —
low risk — but the look-before-delete grep is mandatory.

---

## WS4 — Enrich the Projects hub (Approach A — one hub)

### Why not a separate page

A hub already exists: `site/src/pages/[lang]/projects.astro` renders
`site/src/components/projects/ProjectsFilter.tsx` over the `projects` content
collection. `ProjectBrief.astro` is a **different** thing (an in-lesson widget).
A second parallel hub would duplicate schema + route + i18n + progress tracking.
Approach A enriches the existing hub instead. (A separate `challenges` genre was
considered and declined.)

### Schema changes (`site/src/content.config.ts` + `projects-schema.test.ts`)

Existing project schema (keep): `slug, title{en,ru}, pitch{en,ru},
deliverable{en,ru}, tracks[≥1 ∈ TRACKS], difficulty(starter|intermediate|advanced),
estDays(int>0), skills[≥1], milestones[≥2 bi], seniorStretch[≥1 bi]`.

Add:
- `category: "frontend" | "backend" | "fullstack" | "infra"` (required).
- `stack?: string[]` — suggested tech (display-only hint).
- `resources?: { label: string; url: string }[]` — optional reading links.
- optional **longform body** for the detail page (either an MDX/`render()`-able
  field or a `brief: Bilingual` longform string — pick one at implementation and
  keep the schema test in sync).

Backfill `category` on the 6 existing projects
(`at-least-once-queue`, `cache-stampede-lab`, `oauth-mini`,
`query-plan-visualizer`, `rate-limiter`, `write-ahead-log` → all `backend`/`infra`).

### UI

- `ProjectsFilter.tsx`: add category tabs (Frontend / Backend / Fullstack / Infra)
  alongside the existing track + difficulty selects; extend `filterProjects` and
  its unit test for the new axis.
- New detail route `site/src/pages/[lang]/projects/[slug].astro` —
  `getStaticPaths` over the `projects` collection × {en,ru}; renders full brief:
  pitch, deliverable, category/stack/difficulty/estDays, skills, milestones,
  seniorStretch, resources, longform body. Reuse existing card/section styling.
- Hub cards link to the detail page.

### New project briefs (learning-first, non-banal — for the author, not recruiters)

Author bilingual (EN+RU) briefs. Initial set (final list confirmed at
implementation; ~6–10 total split FE/BE):

- **Frontend:** collaborative cursor presence (CRDT) · virtualized 100k-row data
  grid · offline-first PWA with conflict resolution · a tiny reactive-signals
  framework · command-palette / fuzzy-finder · image-crop + Web Worker pipeline.
- **Backend:** feature-flag service · S3-style presigned-upload service · job
  scheduler with cron + backoff · full-text search over your own docs ·
  multi-tenant rate + quota gateway.

### Gate

`projects-schema.test.ts` + `ProjectsFilter` filter test extended and green;
`cd site && bun run build` green; hub + a detail page render in both locales.

---

## WS1 — AWS track (pilot)

- **Slug** `aws`. **Band** `advanced` (with `deployment`, `performance`,
  `data-engineering`). New unused palette color.
- **Angle:** hands-on practical (deploy real things), each lesson tagged to a
  CLF-C02 and/or SAA-C03 exam objective in frontmatter or a visible tag.
- **Pilot = 2 units, tiered, EN+RU, with practice + diagram per lesson:**
  - `01-core-model` — regions/AZ, the shared-responsibility model, IAM
    (users/roles/policies, least privilege), billing & cost basics.
  - `02-compute-and-deploy` — EC2 vs ECS/Fargate vs Lambda vs App Runner; deploy
    a container end-to-end; when to pick which.
- **Expansion (later, out of pilot):** storage (S3 / EBS / RDS), networking
  (VPC / SG / subnets), observability (CloudWatch / X-Ray), IaC (CloudFormation /
  CDK / Terraform), cost optimization, security (KMS / secrets).

## WS2 — Python track (pilot)

- **Slug** `python`. **Band** `surface` (with the language tracks `sql-postgres`,
  `js-engine`, `typescript`). New unused palette color.
- **Angle:** Python for a developer who already codes JS/TS — fundamentals →
  scripting/automation → AI integration. Tiered; junior tier starts gentle, senior
  tier covers idioms.
- **Pilot = 2 units, tiered, EN+RU, with practice + diagram per lesson:**
  - `01-language-core` — syntax, data structures, comprehensions, functions,
    type hints; contrasted with JS/TS where useful.
  - `02-scripting-and-io` — files, CLI args, `requests`/HTTP, `venv` + packaging,
    a small useful script.
- **Expansion (later):** async (`asyncio`), data (`numpy`/`pandas`), AI
  integration (LLM SDK usage, JSON/embeddings glue, small RAG helper),
  tooling/tests (`pytest`, `ruff`).

---

## Cross-cutting acceptance

- Per workstream, final gate: `cd site && bun run build` → **0 lint warnings**,
  page count grows as expected, EN+RU parity holds.
- New track colors are distinct and unused (checked against `tracks.json`).
- No pedagogy widgets deleted by any authoring subagent.
- `git status` clean of unintended changes at each commit boundary.

## Out of scope (YAGNI)

- Recruiter-facing README, CI test step, Dockerfile (portfolio asks — dropped:
  project is a self-learning tool).
- Completing either course beyond the pilot (expansion is follow-up work).
- A second/separate challenges hub (declined in favor of Approach A).
- German-language and job-application items from the source document.

## Risks / notes

- Both courses are large at full size; pilot-first bounds the bilingual +
  practice + diagram burden and validates the pipeline before scaling.
- Scheduled/proceed-work runs can collide with an interactive session on the same
  worktree — check `ps` + file mtimes before authoring (known gotcha).
- Adding a track without patching all 5 locations fails typecheck/lint — treat the
  5-place patch as one atomic step per track.
