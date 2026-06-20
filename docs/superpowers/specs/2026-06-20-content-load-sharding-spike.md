# Spike: content-load sharding — findings & go/no-go

> Item 4 of `docs/superpowers/plans/2026-06-20-build-optimization.md`. Research
> only. Question: can Astro's content layer load only a *slice* of the corpus per
> process, removing the ~6 GB per-process baseline and unlocking in-process
> parallelism (`build.concurrency > 1`)?

**Verdict: NO-GO.** Pursue nothing further here. Item 3's cross-runner shard
matrix already delivers the parallelism this spike sought, at lower risk.
Revisit only under a hybrid-SSR migration (explicitly out of scope for the parent
plan).

## What was investigated

- **Memory rationale (read, not re-profiled).** `astro.config.mjs` pins
  `build: { concurrency: 1 }` with an in-file note: concurrency > 1 "holds
  multiple render contexts in heap at once" and OOMs the 16 GB runner; "Real fix
  for build scale: on-demand SSR." So the documented binding constraint is
  **render-context** memory, not the content store alone — content-load sharding
  attacks the wrong half.
- **Loader scopability.** All collections use static `glob({ pattern, base })`
  (`src/content.config.ts`). A `CONTENT_SHARD` env could make the lessons
  pattern load only matching files — technically possible.
- **Cross-page corpus dependence (the decisive blocker).** The lessons store is
  consumed not only by the per-lesson render but by **site-wide aggregations that
  need every lesson**: the search index (`search-index.json.ts`), per-track and
  `/learn` totals/minutes (`[track]/index.astro`, `learn/index.astro`), the nav /
  sidebar unit list, the prerequisite graph, and the roadmap. These are already
  documented as cross-page surfaces in `incremental-hash.ts`'s rejected-candidate
  notes (`estMin`, `summary`). A loader that drops lessons per shard would emit a
  search index missing pages, wrong totals, and broken nav — a **correctness**
  regression, not merely a rendering one.

## Empirical profiling: deferred (with justification)

Plan Step 1 (a `--heapsnapshot-near-heap-limit` full build, ~65 min) was **not
run**. The conclusion does not depend on the exact content-store-vs-render-context
memory split: even if the content store dominated, scoped loading is blocked by
the cross-page correctness dependence above. Profiling would only matter to a
*future* GO reconsideration; run it then, not now.

## Why Item 3 already wins

The cross-runner shard matrix (shipped: `build-shard.ts` + the `shard-render`
matrix in `deploy.yml` + `merge-shards.mjs`) gives each runner its **own** 16 GB,
loads the **full** content store (so all cross-page data is correct), and renders
only its `shardPaths` slice. Parallelism is achieved without touching the content
layer and without the correctness risk. N runners × 16 GB sidesteps the ceiling
that `build.concurrency > 1` could never clear on one runner.

## Recommendation

- **NO-GO** on content-load sharding as an in-process parallelism lever.
- The only architecture that removes the render-context baseline is **on-demand
  SSR** (the config's own stated "real fix") — a separate, larger effort that the
  parent plan lists as out of scope.
- If full-build wall-clock is still unsatisfactory after Item 3, increase the
  shard-matrix width (more runners) before reopening this spike.
