# Skein — current state

Last verified: **2026-09-15 (Europe/Berlin)**.

This is the mutable handoff for future Codex sessions. Update it after material
milestones or when a release blocker changes. Durable architecture belongs in
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## Revision

- Branch: `main`
- HEAD: `29fe541b427017ec9d304a18a5d66f08dd0c6046`
- `origin/main`: same revision at verification time
- Working tree at verification time: clean
- Nearest release tag: `v1.0.0-production-ready` (current HEAD is 6 commits after it)

## Current stage

Skein has a production-ready v1 baseline and the current `main` revision is deployed
through the normal GitHub Actions pipeline. The active stage is **post-release
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

GitHub Actions workflow `Deploy Skein` for the current HEAD succeeded twice on
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

The checklist item saying the billing branch still needs CI/promotion is stale at
this revision: the branch passed workflow runs and the merged `main` HEAD has passed
the full production deploy workflow.

## Next priorities

When there is no more specific user task, prefer work that closes one of these
verified gaps:

1. Finish live billing/provider smoke verification.
2. Enable and validate monitoring/alerting, then rehearse rollback.
3. Increase explicit task-to-concept coverage where it improves recommendation and
   remediation quality.
4. Reduce thin-practice coverage while preserving the curriculum depth bar.
5. Keep EN/RU parity and the lesson publish/parity pipeline green as content grows.

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

