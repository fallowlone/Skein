# Skein — current state

Last verified: **2026-09-17 (Europe/Berlin)**.

This is the mutable handoff for future Codex sessions. Update it after material
milestones or when a release blocker changes. Durable architecture belongs in
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## Revision

- Branch: `main`
- Code baseline inspected: `29fe541b427017ec9d304a18a5d66f08dd0c6046`
- `origin/main` matched that baseline when the project-state evidence below was collected.
- Working tree was clean before these context documents were added.
- At that code baseline, `v1.0.0-production-ready` was 6 commits behind.

The documentation commit that updates this file can advance `HEAD` without changing
the product state described below. Always resolve the live `HEAD`, branch, and working
tree at the start of a new task instead of treating the baseline SHA as the current
checkout forever.

## Current stage

Skein has a production-ready v1 baseline and the inspected production code revision
was deployed through the normal GitHub Actions pipeline. The active stage is **post-release
operational verification plus continued learning/product quality work**.

The application is not waiting on a code build/deploy gate at this revision. The
remaining release work is mainly provider/operations verification: live Telegram
payment checks, rollback rehearsal, and monitoring enablement.

## Recently completed milestones

Since `v1.0.0-production-ready`:

1. **Lesson runtime migration** (`f5f741f0`)
   - lesson pages moved from the main static MDX route to the `skein-lessons` Astro
     SSR Cloudflare Worker;
   - lesson render trees are compiled and published to Supabase;
   - `/api/lessons/...` serves versioned lesson payloads through the
     `get_lesson_payload` RPC;
   - CI publishes curriculum, verifies parity, builds the Pages app, builds the
     lesson Worker, and deploys both.
2. **Shared UI form primitives** (`05546d38`)
   - common form/control primitives were added and integrated across product UI.
3. **Production billing** (`a2422a71`, `5dae8071`, merged by `2ca730ff`)
   - Telegram Stars billing and entitlement flows were completed;
   - managed Coach invoice creation now fails closed when its backend is unavailable;
   - billing regression/integration coverage passed before merge.
4. **Lesson DB migration recorded as integrated** (`29fe541b`)
   - `main` now represents the merged production lesson-runtime state.

## Current production evidence

GitHub Actions workflow `Deploy Skein` for the inspected production code baseline succeeded twice on
2026-09-15:

- Push run `34933840178`: success.
- Scheduled run `34951517162`: success.

The latest scheduled run completed both jobs successfully:

- `gates`: unit tests, Astro/TypeScript check, Pages Functions tests, runnable code
  samples, debug-task verification, and project-workbench verification;
- `deploy`: curriculum build, Supabase publish, parity verification, Pages app build,
  lesson Worker build, Cloudflare Pages deploy, and lesson Worker deploy.

At verification time `https://fallowlone.com/en/` returned HTTP 200.

## Current corpus snapshot

Measured directly from the repository at the revision above:

| Item | Count |
| --- | ---: |
| Tracks | 44 |
| Units | 440 |
| English lessons | 2,264 |
| Russian lessons | 2,264 |
| Practice JSON files | 1,540 |
| Project JSON files | 54 |

The README can lag these counts; measure from source when an exact number matters.

## Known learning-system limits / backlog

The latest learning-system audit established a useful baseline that still matters:

- concept graph: 5,035 unique concept IDs and no graph-cycle failure in the audited
  revision;
- explicit task-to-concept annotations were only 25 / 8,097 tasks (about 0.3%), so
  fine-grained concept-level personalization is still coverage-limited;
- practice existed for all 1,523 teaching-ready EN lessons in that audit, but 141
  lessons were still thin by the audit's task/tier threshold;
- local full monolithic builds previously hit memory pressure; production CI is the
  authoritative full-build/deploy path and is green at the current revision.

Do not turn these historical measurements into immutable constants. Re-run the
relevant audit before using them as acceptance criteria for new work.

## Open production/operations checks

These remain unchecked in `PRODUCTION_RELEASE_CHECKLIST.md` and were not proven by
the repository/CI inspection used to update this file:

- verify Telegram `getWebhookInfo` in production, including subscription updates;
- complete and observe a real 1-Star `author_support` payment;
- complete and observe a real recurring Coach payment;
- test the rollback procedure;
- enable/verify production monitoring.

The checklist item saying the billing branch still needs CI/promotion is stale for
this product state: the branch passed workflow runs and the merged production code
baseline passed the full production deploy workflow.

## Next priorities

When there is no more specific user task, prefer work that closes one of these
verified gaps:

1. Finish live billing/provider smoke verification.
2. Enable and validate monitoring/alerting, then rehearse rollback.
3. Increase explicit task-to-concept coverage where it improves recommendation and
   remediation quality.
4. Reduce thin-practice coverage while preserving the curriculum depth bar.
5. Keep EN/RU parity and the lesson publish/parity pipeline green as content grows.

## Premium infographics workstream (2026-09-17)

Branch `feat/deployment-premium-infographics` added local authoring tooling for a
private "Deployment & Infra" premium infographic set; nothing is published and no
premium delivery exists yet.

- `scripts/premium-infographics/generate_deployment.py` deterministically renders
  11 deployment units × EN/RU full SVGs plus synthetic blurred preview SVGs into
  gitignored `.premium-infographics/deployment/`. Unit slugs are validated against
  `site/src/content/units.json` by `test_generate_deployment.py` (stdlib
  `unittest`, all 6 checks pass). See `scripts/premium-infographics/README.md`.
- `docs/infographics/skein-infographic-rules.md` holds shared infographic rules;
  `docs/infographics/algorithms/01-thinking-complexity/` holds AI image-generation
  prompt outlines for the first algorithms unit (prompts only, no artwork yet).
- Verified so far: structural tests, XML validity, copy preservation, preview
  non-leakage, byte-identical regeneration, and qlmanage PNG rendering. Visual
  image review could not run in that session (image input unavailable), so
  rendered quality still needs a human/visual pass before any publication.
- Not implemented (deliberately): WebP conversion, R2 upload, entitlement
  gating, and any site/delivery integration for premium assets.

### Experimental semantic engine v2 (2026-09-17)

- Implemented under `scripts/premium-infographics/v2/`: strict bilingual JSON,
  four bounded diagram families, exact local Inter Tight font measurement, offline
  SVG/PNG rendering and atomic content-addressed private generations.
- All 11 units × EN/RU now generate 44 SVGs plus 44 PNGs. Rollout includes rolling,
  blue-green, canary and Recreate, with an explicit downtime state. Traffic bars
  are illustrative traffic shares, not replica schedules.
- Local verification: 29 v2 structural/file tests, 6 unchanged v1 tests and one
  real-browser regression test pass. Two complete generations were byte-identical;
  all 88 file hashes and 44 PNG dimensions were checked. Local toolchain:
  Playwright 1.60.0, Chromium 148.0.7778.96, Node v26.8.2 on macOS arm64.
- Dedicated `premium-infographics.yml` performs structural checks and browser
  export/determinism without deployment or artifact uploads. Remote result must
  be checked for the corresponding feature-branch commit.
- **Visual acceptance is blocked:** judge PNG input was rejected because the
  selected model does not support images; no image received a visual pass.
  V1 remains unchanged/default; v2 manifests stay experimental with acceptance
  pending. No production readiness claim or compatibility-entry-point switch.
- Remaining acceptance work: full/reduced-size visual and editorial review,
  especially connector meaning, layer invalidation and build/runtime boundaries.
  Geometry checks cover text boxes, not arbitrary path crossings. No premium
  delivery integration or generated images have been committed/published.

## Updating this file

Update this document when any of these change materially:

- production revision/release milestone;
- lesson/content delivery architecture;
- auth/billing/entitlement boundary;
- curriculum scale or source-of-truth model;
- CI/deploy authority or a persistent build constraint;
- a listed blocker is closed or a new release blocker is introduced.

Record evidence, commit/run identifiers when useful, and the verification date. Do
not copy transient debug logs into this file.
