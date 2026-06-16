# Design — Build Optimization + v2 Screen Integration

Date: 2026-06-16
Status: approved (brainstorming) → writing-plans next

## Problem

Two independent-but-sequenced workstreams surfaced while shipping the PageSpeed fixes:

1. **Build is too slow for the deploy job cap.** A full (non-incremental) build now renders 5777 pages single-threaded (~65 min local, slower on the runner). With install + Cloudflare Pages upload it crossed `timeout-minutes: 90` and two deploys (grammar system `e5055c5b`, pagespeed fixes `27c7f602`) were cancelled at the wall → nothing shipped. The cap was raised to 180 as a stopgap (`0b28768f`), but full-build time keeps growing with content and will hit 180 too. Render is single-threaded while the runner has 4 vCPU.

2. **The v2 redesign screens are unmerged AND are static mockups.** Branch `feat/english-screens` (1 unique commit `c74d73aa`, 387 commits behind main) adds 5 screens — `english/hub`, `plan`, `progression`, `cabinet`, `achievements/index` — plus 6 CSS files. Inspection confirms they contain **no islands (`client:`), no data fetching, hardcoded mock data** (e.g. "Engineer III · 1,840", "23 days"). The existing pages they would "replace" are functional: `roadmap.astro` (path-engine `PathView`), `profile.astro` (real XP/rank/streak), `account.astro` (GitHub auth + progress sync + terms). A wholesale file swap would ship fake static dashboards and delete working features. `[lang]/achievements/index.astro` also collides on route with the existing `[lang]/achievements.astro`, and `english-hub.css` add/add-conflicts with main's existing hub re-skin.

## Workstream A — Build optimization (fast deploys, free-tier)

**Goal:** full build ~65 min → ~18–20 min, no paid runners, no artifact-storage usage.

**Approach: multi-process parallel render inside the single `build-deploy` job.**

- Reuse the existing `site/src/scripts/build-shard.ts` `shardPaths()` (FNV-1a partition of the lesson route's `getStaticPaths`, retained from the reverted sharding). Lesson routes (~3372 of 5777 pages) dominate render time.
- In the `build-deploy` job, spawn N `astro build` processes (each with `SHARD_INDEX`/`SHARD_TOTAL`), rendering disjoint slices in parallel on the 4-vCPU runner (today 3 cores idle). Merge the slices into one `dist/`, then lint once and deploy once.
- **Why one job, not a matrix:** the 2026-06-07 matrix sharding was reverted 2026-06-09 because passing ~420 MB dist slices between jobs via `upload-artifact` blew the free-tier artifact-storage quota and wedged all deploys. A single job with in-process parallelism hands nothing between jobs → no artifact quota, no cross-job cache handoff. The single-job, artifact-free architecture established by the revert is preserved.
- Incremental builds (small pushes) are unchanged — they already finish in minutes; parallel render only engages on full builds.

**Risks / mitigations:**
- Peak RAM = N × per-process heap. Start N=3 (not 4) with the existing `--max-old-space-size` flag per process; measure RSS headroom on the 16 GB runner before raising N.
- A dropped/incomplete shard shipping a partial site → keep `site/scripts/check-dist-complete.mjs` as the gate (fails deploy if merged dist ≠ one page per lesson source).
- Non-lesson routes (glossary, app pages) render once outside the shard partition (fixed cost) to avoid duplication; confirm `shardPaths()` only partitions lesson routes.

**Verification:** local `SHARD_TOTAL=3` parallel run = same page count + lint 0/0 as a serial full build; one green CI deploy; record wall-clock vs the ~65-min baseline.

## Workstream B — v2 screen integration (replace, with logic ported in)

**Principle:** the v2 screens are design shells. "Replace" = port the real data/logic from the current functional pages **into** the v2 shells — never a file swap. Done on a feature branch off current `main`; never pushed to `main` until the local full build is green and both locales are visually verified.

**Per-screen logic source:**
| v2 shell | Port logic from | Nature |
|---|---|---|
| `english/hub` | existing `english/index.astro` | mostly visual reskin (lowest risk) |
| `progression` | `profile.astro` / `user-state` (rank, XP, streak) | read-only data |
| `achievements` | existing achievements data | read-only data |
| `plan` | `roadmap.astro` `PathView` island (path-engine) | heaviest |
| `cabinet` | `account.astro` (auth, sync, terms) | most sensitive |

**Cross-cutting steps (every screen):**
- Fix 387-commit staleness: imports, layouts, i18n keys, design tokens.
- Reconcile `english-hub.css` add/add with main's current hub CSS.
- Route strategy = replace: add redirects for old paths (`/roadmap`→`/plan`, `/profile`→`/progression`, `/account`→`/cabinet`), rewrite nav links, and delete the old page **only after** the v2 screen reaches feature parity. Resolve the `achievements/index.astro` vs `achievements.astro` route collision.

**Phasing (user-chosen):**
- **Phase B1 (pilot):** `english/hub` — lowest-risk reskin; validates the staleness-fix + CSS-reconcile + redirect pattern end to end.
- **Phase B2:** `progression` + `achievements` — read-only data dashboards (similar shape).
- **Phase B3:** `plan` (path-engine port) + `cabinet` (auth/sync — most sensitive), one at a time.

**Verification (per phase):** local full build green + lint 0/0; visual check EN + RU of each screen; confirm ported features work (path step actions, real XP, login/sync) — not just that the page renders.

## Sequencing

A before B. Fast deploys make each B phase cheap to ship and verify; today every full build is ~1 hour. A is smaller and removes the blocker.

## Success criteria

- A: a full-build CI deploy completes well under the 180-min cap (target ≤ ~30 min end to end); page count + lint identical to serial build.
- B: each phase ships v2 design with **real** data/behavior (no mock numbers, no lost features), correct redirects, green build, both locales verified.

## Out of scope

- Plan A "on-demand SSR" (deferred per build_timeout memory).
- Reducing page count (glossary/quiz on-demand) — not chosen; revisit only if parallel render is insufficient.
- Paid larger runners — not chosen (free-tier constraint).
- The `actions/cache/restore@v4` Node-20 deprecation is a warning, not a failure; bump opportunistically, out of scope here.
