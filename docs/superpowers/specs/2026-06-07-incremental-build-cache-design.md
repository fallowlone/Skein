# Incremental build cache — design spec

- **Date:** 2026-06-07
- **Status:** approved (design)
- **Branch:** `feat/incremental-build-cache` (off `main`)
- **Builds on:** the Phase 0 render-sharding (`site/src/scripts/build-shard.ts`,
  `.github/workflows/deploy.yml`) — same getStaticPaths-filter mechanism.

## 1. Problem

Every build re-renders all ~4859 pages single-threaded (~10 min local, the dominant CI cost
even with sharding). The waste is structural: **editing one lesson re-renders the whole
site.** The common change — lesson prose or practice JSON (exactly the senior-scenario
practice campaign coming next) — pays the full-build cost for a few changed pages.

Astro 6 has **no native incremental SSG** (the content layer caches loading, not rendering),
so this is a custom layer.

## 2. Goal & success criteria

Builds re-render **only what changed** when changes are isolated to individual lesson bodies
or practice, and fall back to a full build whenever anything shared could affect other pages.
Correctness is non-negotiable: **a build must never ship a stale page.**

**Done:**
- A change touching only lesson bodies / practice JSON renders only those lesson pages and
  reuses the rest from cache (local + CI) → seconds, not minutes.
- Any change to a shared input (component/layout/script/css/config, `tracks.json`/`units.json`,
  or any lesson's nav-frontmatter) triggers a **full rebuild**.
- A forced/periodic full rebuild path exists (self-heal against cache drift).
- The existing completeness guard still runs on the merged dist; lint still runs; no stale
  page can ship.

## 3. Safety principle — the GLOBAL_HASH gate

A lesson page's render depends on its own MDX + practice **and** shared inputs: the layout +
all components, `tracks.json`/`units.json`, and the cross-lesson connection graph (built from
**every** lesson's nav-frontmatter — title/order/track/unit/slug/prereqs/deepensInto/spiral —
because `ConnectedLessons` and next-lesson resolution render other lessons' titles).

So define:
- **GLOBAL_HASH** = hash of everything that can affect more than one page: all
  `src/**` except lesson MDX + practice JSON (i.e. components, layouts, scripts, css, i18n),
  `astro.config.mjs`, `tracks.json`, `units.json`, and the **nav-frontmatter of every lesson**.
- **perLesson[key]** = hash of that lesson's MDX **body** + its practice JSON + its
  **non-nav** frontmatter (summary/sources/estMin/etc. — fields rendered only on its own page).

Decision:
- No cached dist/manifest, or **GLOBAL_HASH changed**, or forced/periodic → **FULL build**.
- Else → **INCREMENTAL**: render only lessons whose `perLesson` hash changed.

When GLOBAL_HASH is unchanged, the only possible changes are isolated lesson bodies/practice,
which affect only their own page — so reusing every other page from cache is provably correct.
(Adding a lesson or editing a title changes nav-frontmatter → GLOBAL_HASH → full rebuild.)

## 4. Components

### 4.1 `site/src/scripts/build-incremental.ts` (new, TDD)
- `globalHash(inputs)` + `lessonHash(entry)` — pure hashing over the categorized inputs.
- `decideBuild(prevManifest, current)` → `{ mode: "full" | "incremental", changedLessons: string[] }`.
- `selectLessons(paths)` / `selectOther(paths)` — getStaticPaths gates read the mode +
  changed-set from an env var (a temp file path, like the shard env): in `incremental` mode
  `selectLessons` keeps only changed keys and `selectOther` returns `[]`; in `full` mode both
  return everything. Mirrors `build-shard.ts`.

### 4.2 Pre-build decision script `site/scripts/incremental-plan.mjs`
Reads the restored `build-cache/manifest.json` (if any), walks `src/` to compute current
GLOBAL_HASH + perLesson hashes, writes `build-cache/plan.json` (`mode` + `changedLessons`) and
exports the env the getStaticPaths gates read. Honors `FORCE_FULL_BUILD=1`.

### 4.3 Route gates
- `[lang]/learn/[track]/[unit]/[lesson].astro` → wrap getStaticPaths in `selectLessons()`
  (it already calls `shardPaths`; compose them).
- Every other dynamic route → wrap getStaticPaths return in `selectOther()` (≈23 routes;
  mechanical). A missed route renders extra pages — wasteful, never incorrect.

### 4.4 Overlay + manifest
`site/scripts/incremental-merge.mjs`: in incremental mode, restore the cached `dist/`, copy the
freshly-rendered changed-lesson HTML over it, run the existing `check-dist-complete` guard,
then write the new `build-cache/manifest.json`.

### 4.5 CI (`.github/workflows/deploy.yml`)
- `actions/cache` (or artifact) for `dist/` + `build-cache/manifest.json`, keyed to restore the
  latest.
- Job order: restore cache → `incremental-plan.mjs` → `astro build` (full or incremental-gated)
  → `incremental-merge.mjs` → completeness guard → lint → deploy → save cache.
- Keep the sharded full-build path for `mode=full`. A `workflow_dispatch` input + a periodic
  schedule force `FORCE_FULL_BUILD=1` (self-heal).

### 4.6 Manifest `build-cache/manifest.json` (gitignored; CI-cached)
`{ globalHash: string, lessons: Record<lessonKey, string>, builtAt, pageCount }`.

## 5. Risks & mitigations
- **Cache drift / a stale page slips through** → the GLOBAL_HASH gate makes incremental safe by
  construction; plus forced + periodic full rebuilds re-baseline; plus the completeness guard.
- **A new render dependency added later but not folded into GLOBAL_HASH** → document the rule;
  default new shared inputs into GLOBAL_HASH (hash *all* of `src/**` except the two lesson dirs,
  so new components are covered automatically).
- **Route gate missed** → renders extra pages (wasteful, correct), caught by the page count.
- **Assets:** GLOBAL_HASH unchanged ⇒ component bundle + `_astro` hashes unchanged ⇒ changed
  lessons reference assets already in the cached dist. No new chunks in incremental mode.

## 6. Out of scope
On-demand SSR; changing the render itself; the senior-scenario practice campaign (separate,
and the prime beneficiary of this).

## 7. Open questions (non-blocking)
- CI cache mechanism (`actions/cache` rolling key vs artifact download of the last green dist) —
  resolved in the plan against GH Actions limits.
- Periodic-full cadence (e.g. nightly) — a workflow schedule value.
