# Skein — current state

Last verified: **2026-10-03 (Europe/Berlin)** for the production deploy evidence; the active local work below was verified 2026-09-27.

## Active design work (verified locally 2026-09-27)

- The working tree contains an ongoing, uncommitted editorial redesign of the `js-engine` course. Eleven of 41 EN/RU lesson pairs have been redesigned; the newest is `02-values-and-memory/03-pointer-tagging` with a static 2.5D cage-address figure. The remaining pairs still need authoring and visual QA.
- Site colors now use a white/near-black light palette and a charcoal/near-white dark palette through `site/src/styles/tokens.css`. Domain and semantic colors remain small purposeful accents. `style-guide.md` and `docs/design/js-engine-visual-reference.md` record the direction, including the user-supplied diagram reference and the instruction not to use blue as the base color.
- Local evidence: `bun run build`, `bun run check`, `bun run build:lessons-worker`, and `mdx-check js-engine` passed after the Ignition pair. `dist/lint-report.json` has 0 errors and 58 existing warnings. Browser checks covered representative home, learn, and lesson pages at 1440/390 px in both themes; the approved Ignition figure was checked in EN/RU at widths 320–1440 px with no page or figure overflow or text-element overlap.
- The user approved the first reference-inspired Ignition diagram after reviewing desktop and mobile screenshots in `docs/design/prototypes/`. They clarified that a static 2.5D perspective or exploded view is welcome, and animation is optional. They emphasized checking that UI elements never overlap.
- This work is not committed or pushed. Other uncommitted content and generated assets in the working tree were preserved.
- The active local changes also add server-owned sequential lesson access per track. Guests can read the first lesson without its question controls. Authenticated learners unlock the next lesson after all authored `Quiz` and `DragOrder` components pass server grading; lessons without either component complete on authenticated read. `RetrievalDrawer` is excluded from the unlock rule. A verified one-time payment unlocks one chosen track permanently: 300 Telegram Stars or a 9.99 USD GitHub Sponsors course tier. Telegram refunds revoke the matching grant. GitHub course checkout uses a pending selected-track intent and a signed Sponsors webhook. Guest question routes outside lessons redirect to account sign-in.
- GitHub registration now requires an explicit Terms of Use checkbox before OAuth; the signed OAuth state carries the consent version, and the callback records it after GitHub verification. Editorial lesson diagrams, retrieval, practice, AI support, and the footer were aligned to their intended reading widths after user screenshot review.
- Local verification after this milestone: `functions` 144 Vitest tests and SQLite integrations pass, including wrong/correct lesson answers, stale question IDs, and both payment grants; functions typecheck passes; `site` check has 0 errors, full build emitted 1855 pages, `dist/lint-report.json` has 0 errors and the same 58 warnings; lesson Worker build passes. Browser checks of the course unlock panel at EN 1440 and RU 390 px found no horizontal overflow or overlap. The readiness dashboard and home atlas label fixes were also checked at desktop/mobile widths. The pointer-tagging figure was checked in EN/RU at 1440/390/320 px and at 390 px in dark theme; no browser errors, overflow, or visible label overlap. The lesson corrects the old unsourced 40% heap reduction and universal 4 GB limit claims using V8 primary docs.
- Kinetic-poster pilot (uncommitted, 2026-10-06): poster token layer (`--font-poster` Oswald variable with Cyrillic — Anton verified latin-only — `--poster-accent #ff4d00`, both themes) plus pilot restyle of `[lang]/index`, `[lang]/learn/[track]/index`, `[lang]/calibrate`. Spec: `docs/superpowers/specs/2026-10-06-poster-redesign-design.md`. Verified: `lint:src` 0 errors, `astro check` 0/0/0, i18n tests pass. Screenshots and full build left to review/CI. Update: dock won the nav-lab vote and is now the Atlas chrome (`NavDock.astro`); lab removed.
- **Release gate:** apply `functions/migrations/0009_course_access.sql` to production D1 before deploying the access code. GitHub Sponsors additionally needs a published one-time 9.99 USD `Skein course` tier and `GITHUB_SPONSORS_COURSE_TIER_ID`. No real provider payment or live Worker access flow has been exercised yet. This work remains uncommitted and undeployed per the user's instruction.

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

On 2026-10-03 the pipeline went red on `main` (PR #25 merge run
`37065141821` and scheduled run `37113967752`, both gates failure) and was
restored by PR #26: post-merge `main` run `37118330412` completed `gates`
and `deploy` successfully.

## Recently completed milestones (appended 2026-09-24)

5. **Animated lesson diagrams for the algorithms track** (12 commits
   `b9b323f8`..`0c33639e`, one per unit `content(algorithms): <unit> animated
   diagrams EN+RU`)
   - Every teaching lesson of `algorithms` (69 lessons x EN+RU = 138 files)
     now embeds exactly one `AlgoPoster` animated diagram
     (`site/src/components/algo/AlgoPoster.tsx`, Preact `client:visible`
     island) replacing the static hero visual after `</Idea>`.
   - Per-pattern SVG scenes (`poster-patterns.tsx`, 13 patterns: lane, bars,
     halving, stack, tree, heap, graph, grid, buckets, choice, curves, bits,
     pipeline) share one rAF engine: ~9s autoplay loop, pause/step/replay/
     0.5x controls, sine-eased step glides, CSS cross-fades, reduced-motion
     starts paused, aria-live caption + text-equivalent label.
   - `LessonRenderTree.astro` registry maps `AlgoPoster` to the hydrated
     island (lesson pages render in the `skein-lessons` worker, not `dist/`).
   - Verified: `mdx-check algorithms` 256 ok; all 138 files compile via
     `compileLessonRenderTree` with exactly 1 poster, 3-5 steps, 2 minis;
     `bun run build` + `lint:src` clean (0 errors, 58 pre-existing warnings
     in other tracks); pose sweep over all patterns shows no NaN/undefined
     attributes; no `console.log`; `~/` imports only.

6. **Animated lesson diagrams for the base-cs track** (12 commits, one per
   unit `content(base-cs): <unit> animated diagrams EN+RU`, plus reference
   unit 03-the-processor)
   - Every teaching lesson of `base-cs` (52 lessons x EN+RU = 104 files)
     embeds exactly one `AlgoPoster` hero visual (replacing the `MachineFigure`
     hero or inserted before `WorkedExample`/`Trace`/`Code` for coding lessons
     without one).
   - New `site/scripts/qa-poster.mts` quality gate runs per diagram: compile,
     exactly-1-poster, props audit (3-5 steps, 2 minis, titleHi subset,
     step-sized data arrays), SSR render without NaN/undefined, and a
     transform-aware 41-point pose sweep with coordinate bounds.
   - The gate caught and fixed two real issues: 5-frame stacks overflowing
     the viewBox top (adaptive stack layout + parked hidden frames in
     `poster-patterns.tsx`) and a `titleHi` substring miss in
     `11-greedy/04-classic-greedy` (also disproved a false bars-pattern
     alarm by making bounds transform-aware).
   - Verified: gate green on all 242 teaching files (algorithms 138 +
     base-cs 104); `bun run build` + `lint:src` clean (0 errors, same 58
     pre-existing warnings); per-unit commits.
   - Follow-up (not blocking): ~20 candidate RU glossary terms collected
     from poster copy (регистр, счётчик команд, дно стека, разматывание,
     полусумматор, …) were deliberately NOT added to `glossary.json` —
     needs careful bilingual definitions in a separate pass.

7. **Per-diagram factual audit of all 121 posters** (`57cc89fc`)
   - EN↔RU invariant parity scripted (numbers, indices, structures,
     STATE/log identical; locale prose free to differ): fixed 8 RU files
     where STATE lines had been translated.
   - 8 parallel auditors recomputed every number against lesson bodies;
     fixed real errors in both locales: sliding-window minimum len 2 via
     [4,3] (poster + added trace frames + practice answer 3→2), true
     ship-capacity probe sequence 32→21→15→12→14, dp[3]=2, LIS index i=6,
     hashing `placed` counts, DFS dive-then-back-edge narrative, quicksort
     O(log n) average qualifier, n(n−1)/2, 4-cell shift, bit-addressed
     total 64, 6-instruction HL example, add.c 143 bytes, typeof
     null/object, coercion narrative, label corrections.
   - `qa-poster.mts` green on all touched files, `lint:src` + full build
     clean (0 errors).

8. **Second audit pass — all deferred findings cleared** (`52d9d776`)
   - Fixed: call-stack final-pop state, combinations caption (4 of 6
     shown), collisions highlight → April, top-k settles [6,8,7]
     (verified by execution), Dijkstra split into 5 truthful steps,
     Day-2 contradiction, selection-sort n(n−1)/2, mystery-Q hint,
     tree-height hint numbers, exchange-Quiz wording, stack-trace frame
     line 11→14. Monotonic-stack depths confirmed correct, untouched.
   - QA gate green on all touched files, `lint:src` + full build clean.

9. **Deploy gates back to green on `main`** (PR #26 `fix/deploy-check`,
    merged 2026-10-03)
    - `main` was red after PR #25 merged with 21 `astro-check` errors
      (duplicate keys in 9 schematic figures, TS annotation in an `is:inline`
      script, two invalid `MachineValue` tones, missing `RightRail`/`Topbar`
      editorial props) plus 64 check hints.
    - Fix was built on an isolated worktree at `origin/main` (main working
      tree untouched): cherry-picked the three unmerged fix commits, ported
      the `Topbar` editorial variant, cleared the last hint in `Atlas.astro`.
    - Evidence: `bun run check` 0 errors / 0 warnings / 0 hints; site tests
      1790 pass; functions tests + typecheck pass; `verify:samples`,
      `verify:scenario`, `verify:projects` pass; full build 1855 pages,
      0 lint errors, same 58 pre-existing content warnings. Preview dispatch
      run `37117614361` green, post-merge `main` run `37118330412`
      (`gates` + `deploy`) success.

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
