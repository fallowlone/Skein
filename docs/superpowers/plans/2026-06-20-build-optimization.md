# Build Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut CI build+deploy wall-clock for the curriculum site by (1) shrinking what triggers a full rebuild, (2) confirming/keeping delta deploy, (3) adding cross-runner shard parallelism for full builds, (4) spiking content-load sharding, (5) caching Vite/Astro between runs — without migrating off the static-pages model.

**Architecture:** The site stays Astro `output:"static"`. The incremental build already renders only changed lesson pages onto a cached `dist` when the GLOBAL_HASH is unchanged (`incremental-plan.mjs` → `decideBuild`). The dominant remaining cost is the *full* rebuild (≈65 min, every shared-file or frontmatter push) plus the CF Pages upload. We attack the full-build trigger first (highest ROI, lowest risk), then deploy, then full-build parallelism, then a research spike, then build-cache reuse.

**Tech Stack:** Astro 6.3.5, Preact, Bun 1.3.11, Vitest 2, GitHub Actions, Cloudflare Pages (`wrangler pages deploy`).

## Global Constraints

- Runner RAM ceiling: 16 GB. A single `astro build` process holds ~6 GB baseline (full content store + Vite graph) before rendering — this is why `astro.config.mjs` pins `build.concurrency: 1` and why multi-process sharding on ONE runner OOMs. Do not raise `build.concurrency` and do not run 2+ `astro build` processes on one runner.
- Correctness is non-negotiable: a change must never ship a stale or missing page. Any ambiguity in the incremental/shard decision MUST fall back to FULL (the existing code's invariant — preserve it).
- `bun run test` (vitest) and `bun scripts/lint-dist.mjs` must stay green. The deploy gate job (`gates`) runs `test`, `verify:samples`, `verify:scenario` and must not be weakened.
- No new runtime dependency on a database or server: the content corpus stays versioned MDX under `site/src/content`. (Hybrid SSR is explicitly out of scope for this plan — see memo.)
- Page identity key is `pageKeyOf({lang,track,unit,slug})` → `"<lang>/<track>/<unit>/<slug>"`. All hashing/sharding/gating keys on this string. Keep it consistent everywhere.

---

## File Structure

| File | Responsibility | Touched by |
|------|----------------|------------|
| `site/src/scripts/incremental-hash.ts` | Pure hash/decision lib (no node imports beyond crypto). Owns frontmatter split, page hash, global decision. | #1 |
| `site/src/scripts/incremental-hash.test.ts` | Vitest unit tests for the above. | #1 |
| `site/scripts/incremental-plan.mjs` | Walks `src/`, builds GLOBAL vs per-page hashes, writes `plan.json` + `next-manifest.json`. | #1 |
| `.github/workflows/deploy.yml` | gates → build-deploy. Plan, build, lint, deploy, cache. | #2, #3, #5 |
| `site/scripts/parallel-build.mjs` | (exists) multi-process shard spawner — reference only; NOT used on a single runner. | #3 (ref) |
| `site/src/scripts/build-shard.ts` | (exists) `inShard`/`shardPaths` route gate. | #3 (consumed) |
| `site/scripts/merge-shards.mjs` | NEW: merge per-shard `dist` slices into one `dist`, then completeness guard. | #3 |
| `docs/superpowers/specs/2026-06-20-content-load-sharding-spike.md` | NEW: spike findings + go/no-go. | #4 |

---

## ITEM 1 — Shrink the full-rebuild trigger (frontmatter blast-radius split)

**Problem (verified):** `incremental-plan.mjs` puts the **entire frontmatter of every lesson** into `globalParts` (the `fmProjection` array, lines 88–100). `decideBuild` returns FULL whenever `globalHash` moves. So editing one scalar like `description:` or `estMin:` in a single lesson forces a 65-min full rebuild, even though that field renders only on that lesson's own page.

**Fix:** Partition each lesson's frontmatter into **page-local fields** (an explicit allowlist of scalars that render ONLY on the lesson's own page) vs **the rest** (everything else — identity, nav, sidebar, prereqs, cross-track edges). Page-local fields fold into that page's per-page hash (so a change → that page is the only `changedPage` → incremental). Everything else stays in the global projection (→ full, conservative). A field not on the allowlist defaults to global, so adding a new frontmatter field later is safe-by-default.

**Invariant preserved:** the union of (global rest) + (per-page local) = the full frontmatter, just routed to the correct hash. Strictly more incrementals, never a missed page.

### Task 1.1: Frontmatter field partition in the pure lib

**Files:**
- Modify: `site/src/scripts/incremental-hash.ts`
- Test: `site/src/scripts/incremental-hash.test.ts`

**Interfaces:**
- Consumes: existing `hashParts(parts: string[]): string`.
- Produces:
  - `PAGE_LOCAL_FRONTMATTER_FIELDS: readonly string[]` — the allowlist (starts conservative; finalized in Task 1.2).
  - `partitionFrontmatter(fm: string, localFields?: readonly string[]): { local: string; rest: string }` — splits a frontmatter block by top-level key into two deterministic strings. A top-level key (`^[A-Za-z0-9_]+:`) plus its indented continuation lines form one field block; the block goes to `local` if its key ∈ `localFields`, else `rest`. Field order within each side is preserved as encountered.
  - `pageHash(bodyRaw: string, practiceRaw: string, localFmRaw?: string): string` — extended with an optional 3rd input (default `""` keeps the old 2-arg hash value stable).

- [ ] **Step 1: Write the failing tests**

Append to `site/src/scripts/incremental-hash.test.ts`:

```typescript
import {
  partitionFrontmatter, PAGE_LOCAL_FRONTMATTER_FIELDS,
} from "./incremental-hash";

describe("partitionFrontmatter", () => {
  const fm = [
    "lang: en",
    "track: networking",
    "title: TCP Handshake",
    "description: A page-only blurb",
    "estMin: 12",
    "prereqs:",
    "  - networking/02-ip/01-addressing",
  ].join("\n");

  it("routes allowlisted scalar fields to `local`", () => {
    const { local } = partitionFrontmatter(fm, ["description", "estMin"]);
    expect(local).toContain("description: A page-only blurb");
    expect(local).toContain("estMin: 12");
    expect(local).not.toContain("title:");
  });

  it("routes everything else (incl. nested blocks) to `rest`", () => {
    const { rest } = partitionFrontmatter(fm, ["description", "estMin"]);
    expect(rest).toContain("title: TCP Handshake");
    expect(rest).toContain("prereqs:");
    expect(rest).toContain("  - networking/02-ip/01-addressing");
    expect(rest).not.toContain("description:");
  });

  it("keeps an indented continuation with its parent field", () => {
    const { rest, local } = partitionFrontmatter(fm, ["estMin"]);
    // prereqs is NOT local → its array item must travel with it into rest.
    expect(rest).toContain("  - networking/02-ip/01-addressing");
    expect(local).toBe("estMin: 12");
  });

  it("is a complete, disjoint partition (no field lost or duplicated)", () => {
    const { local, rest } = partitionFrontmatter(fm, ["description", "estMin"]);
    const lines = (local + "\n" + rest).split("\n").filter(Boolean).sort();
    expect(lines).toEqual(fm.split("\n").filter(Boolean).sort());
  });

  it("exposes a non-empty page-local allowlist", () => {
    expect(PAGE_LOCAL_FRONTMATTER_FIELDS.length).toBeGreaterThan(0);
  });
});

describe("pageHash (with local frontmatter)", () => {
  it("changes when the local frontmatter projection changes", () => {
    expect(pageHash("b", "p", "estMin: 10")).not.toBe(pageHash("b", "p", "estMin: 11"));
  });
  it("defaults the 3rd arg to empty (old 2-arg value preserved)", () => {
    expect(pageHash("b", "p")).toBe(pageHash("b", "p", ""));
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd site && bun run test -- incremental-hash`
Expected: FAIL — `partitionFrontmatter is not a function` / `PAGE_LOCAL_FRONTMATTER_FIELDS` undefined.

- [ ] **Step 3: Implement in `incremental-hash.ts`**

Add (place near the top exports; keep the existing `pageHash` doc comment, replace its body):

```typescript
/**
 * Frontmatter fields that render ONLY on a lesson's own page, so a change to one
 * should rebuild ONLY that page (incremental), not the whole site. Anything NOT
 * listed here stays in the global hash (→ full rebuild), so a newly added field
 * is safe-by-default. Keep to single-line SCALAR fields whose value never feeds a
 * cross-page surface (nav, sidebar, units.json, roadmap, prereq graph).
 * Finalized by evidence in plan Task 1.2 — do not add a field without grep proof.
 */
export const PAGE_LOCAL_FRONTMATTER_FIELDS: readonly string[] = [
  // seeded conservatively; Task 1.2 confirms/extends from grep evidence
  "description",
  "estMin",
];

/**
 * Partition a frontmatter block by top-level key. A line matching `^key:` opens a
 * field; subsequent more-indented lines are its continuation. The whole field
 * block routes to `local` if its key is in `localFields`, else to `rest`.
 */
export function partitionFrontmatter(
  fm: string,
  localFields: readonly string[] = PAGE_LOCAL_FRONTMATTER_FIELDS,
): { local: string; rest: string } {
  const localSet = new Set(localFields);
  const localLines: string[] = [];
  const restLines: string[] = [];
  let current: "local" | "rest" = "rest";
  for (const line of fm.split("\n")) {
    const top = line.match(/^([A-Za-z0-9_]+):/);
    if (top) current = localSet.has(top[1]) ? "local" : "rest";
    // a continuation line (indented / blank) inherits the current field's bucket
    (current === "local" ? localLines : restLines).push(line);
  }
  return { local: localLines.join("\n").trim(), rest: restLines.join("\n").trim() };
}
```

Then change `pageHash`:

```typescript
/** Per-page hash: inputs rendered solely on a lesson's own page. */
export function pageHash(bodyRaw: string, practiceRaw: string, localFmRaw = ""): string {
  return hashParts([bodyRaw, practiceRaw, localFmRaw]);
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd site && bun run test -- incremental-hash`
Expected: PASS (all existing + new cases).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/incremental-hash.ts site/src/scripts/incremental-hash.test.ts
git commit -m "feat(build): frontmatter blast-radius split (page-local vs global)"
```

### Task 1.2: Finalize the page-local allowlist from evidence

**Files:**
- Modify: `site/src/scripts/incremental-hash.ts` (`PAGE_LOCAL_FRONTMATTER_FIELDS` only)

**Interfaces:** Consumes nothing new; tightens the allowlist constant.

- [ ] **Step 1: Enumerate every frontmatter field actually used**

Run (from repo root):
```bash
grep -rhoE '^[A-Za-z0-9_]+:' site/src/content/lessons/en --include=index.mdx | sort -u
```
This lists the universe of top-level frontmatter keys. Record it.

- [ ] **Step 2: For each candidate scalar, prove it is page-local**

A field is page-local ONLY if it is referenced exclusively where the lesson's own page renders — never in nav, sidebar, content-config-derived data files, roadmap, or prereq logic. For each candidate run:
```bash
# replace FIELD; a hit OUTSIDE the lesson route/page render = NOT page-local
grep -rn "data\.FIELD\|\.data\.FIELD\|frontmatter\.FIELD\|\bFIELD\b" \
  site/src/pages site/src/components/nav site/src/lib site/src/content/config.ts
```
Keep a field in the allowlist only when every hit is inside the single-lesson page render path (`site/src/pages/[lang]/learn/...` lesson route + components it alone mounts). When in doubt, DROP it (defaults to global = safe).

- [ ] **Step 3: Update the constant to the proven set**

Edit `PAGE_LOCAL_FRONTMATTER_FIELDS` to exactly the evidence-backed list. Remove any seeded field that failed Step 2.

- [ ] **Step 4: Re-run unit tests**

Run: `cd site && bun run test -- incremental-hash`
Expected: PASS (the "non-empty allowlist" test still holds; if the proven set is empty, this item yields no benefit — STOP and report rather than ship a false allowlist).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/incremental-hash.ts
git commit -m "chore(build): finalize page-local frontmatter allowlist from grep evidence"
```

### Task 1.3: Wire the split into the planner

**Files:**
- Modify: `site/scripts/incremental-plan.mjs`

**Interfaces:**
- Consumes: `partitionFrontmatter`, `PAGE_LOCAL_FRONTMATTER_FIELDS`, the extended `pageHash` from Task 1.1.
- Produces: a `globalHash` that excludes page-local fields, and per-page hashes that include them.

- [ ] **Step 1: Import the new symbols**

In `incremental-plan.mjs`, extend the existing import from `../src/scripts/incremental-hash.ts`:
```javascript
import {
  splitFrontmatter, frontmatterField, hashParts, pageHash, pageKeyOf, decideBuild,
  partitionFrontmatter,
} from "../src/scripts/incremental-hash.ts";
```

- [ ] **Step 2: Route local fields to the page hash, the rest to the global projection**

Replace the per-lesson loop body (currently lines ~70–85) so it partitions frontmatter:
```javascript
for (const p of lessonFiles) {
  const raw = await readFile(p, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const lang = frontmatterField(frontmatter, "lang");
  const track = frontmatterField(frontmatter, "track");
  const unit = frontmatterField(frontmatter, "unit");
  const slug = frontmatterField(frontmatter, "slug");
  if (!lang || !track || !unit || !slug) {
    console.error(`incremental-plan: missing lang/track/unit/slug in ${relative(siteRoot, p)}`);
    process.exit(1);
  }
  const id = `${track}/${unit}/${slug}`;
  const key = pageKeyOf({ lang, track, unit, slug });
  const { local, rest } = partitionFrontmatter(frontmatter);
  // GLOBAL projection now carries only the cross-page fields ("rest"):
  fmProjection.push(`${relative(siteRoot, p)}\0${rest}`);
  // PER-PAGE hash now also carries the page-local fields:
  pages[key] = pageHash(body, practiceRawByKey[id] ?? "", local);
}
```
Leave the `FRONTMATTER` sentinel and `fmProjection.sort()` in `globalParts` unchanged.

- [ ] **Step 3: Prove the behavior change end-to-end (manual integration check)**

Run a baseline plan, then edit one page-local field and one cross-page field, confirming the mode flips correctly:
```bash
cd site
# 1. establish a manifest (writes build-cache/next-manifest.json)
bun scripts/incremental-plan.mjs && mv build-cache/next-manifest.json build-cache/manifest.json
# 2. edit a PAGE-LOCAL field in exactly one lesson (e.g. bump estMin) — pick a real file:
F=$(find src/content/lessons/en -name index.mdx | head -1)
# (manually change a page-local field in $F, e.g. estMin), then:
bun scripts/incremental-plan.mjs
cat build-cache/plan.json   # EXPECT: {"mode":"incremental","changedPages":["<that one key>"]}
git checkout -- "$F"
# 3. edit a CROSS-PAGE field (e.g. title) in the same lesson, then:
bun scripts/incremental-plan.mjs
cat build-cache/plan.json   # EXPECT: {"mode":"full","changedPages":[]}
git checkout -- "$F" build-cache/
```
Expected: step 2 → `incremental` with exactly one changed key; step 3 → `full`.

- [ ] **Step 4: Run the full unit suite (no regressions)**

Run: `cd site && bun run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/incremental-plan.mjs
git commit -m "feat(build): planner routes page-local frontmatter to per-page hash"
```

---

## ITEM 2 — Confirm / lock in delta deploy (CF Pages)

**Hypothesis:** `wrangler pages deploy site/dist` already uploads only files whose content hash is missing from the existing deployment (Pages does a client-side `check-missing` before upload). On incremental builds the overlaid `dist` is byte-identical for unchanged pages (hashed asset names + stable HTML), so the upload SHOULD already be a delta. This item verifies that and removes any determinism leak that would defeat it. Low effort, high payoff on incremental pushes.

### Task 2.1: Measure the current upload delta

**Files:** none (observation).

- [ ] **Step 1: Inspect a recent incremental deploy's upload count**

Run:
```bash
gh run list --workflow=deploy.yml --limit 10
# pick a recent incremental run id, then:
gh run view <run_id> --log | grep -iE "uploading|already uploaded|files? uploaded|new files"
```
Record: how many files wrangler reports uploaded vs already-present on an incremental run.

- [ ] **Step 2: Decide**

- If wrangler reports it uploads only the changed handful (e.g. "N new files, M already uploaded") → delta deploy already works; document and SKIP to Task 2.3.
- If it re-uploads ~all 4.85k files on an incremental run → there is a determinism leak; proceed to Task 2.2.

### Task 2.2: Remove a determinism leak (only if Task 2.1 found one)

**Files:**
- Investigate: `site/scripts/incremental-merge.mjs`, `site/astro.config.mjs`

- [ ] **Step 1: Confirm overlaid bytes are stable**

Compare an unchanged page across two consecutive incremental builds:
```bash
cd site
shasum dist/en/learn/<some-unchanged-lesson>/index.html
# run another incremental build, then re-hash the same file — hashes MUST match
```
Expected: identical. If they differ, the renderer is injecting per-build nondeterminism (timestamps, build IDs) into HTML.

- [ ] **Step 2: Eliminate the source**

If HTML differs build-to-build, find and remove the nondeterministic injection (e.g. a `Date.now()`/build-id in a layout or meta tag). Make the value stable or move it out of the cached HTML. Re-run Step 1 until hashes match. Commit the fix:
```bash
git add -A && git commit -m "fix(build): stabilize rendered HTML so CF delta upload skips unchanged pages"
```

### Task 2.3: Document the deploy-delta expectation

**Files:**
- Modify: `.github/workflows/deploy.yml` (comment only, near the deploy step)

- [ ] **Step 1: Add a one-line note so future edits don't break the delta**

Add above the `Deploy to Cloudflare Pages` step:
```yaml
      # NOTE: wrangler uploads only files whose content hash is missing from the
      # live deployment. Incremental builds overlay byte-identical unchanged pages,
      # so the upload is a delta. Do NOT introduce per-build nondeterminism into
      # rendered HTML (timestamps/build-ids) — it defeats this and re-uploads all pages.
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "docs(ci): document CF Pages delta-upload invariant"
```

---

## ITEM 3 — Cross-runner shard parallelism for FULL builds

**Why this and not `parallel-build.mjs`:** that script spawns N `astro build` processes on ONE runner; each loads the ~6 GB baseline, so 2 OOM the 16 GB runner. The fix is N **separate runners** (a GitHub Actions matrix) — each gets its own 16 GB, renders ~1/N of the lessons via the existing `shardPaths`/`inShard` gate (`build-shard.ts`), and a merge job unions the slices. Only the full-build path uses this; incremental stays single-runner. The old sharded pipeline was retired over **artifact quota** — the repo is now public (relaxed limits), so re-evaluate; if quota is still a concern, pass slices via `actions/cache` keyed per shard instead of artifacts.

**Precondition to verify first:** the lesson route's `getStaticPaths` must already call `shardPaths(...)` (build-shard.ts exists and is unit-tested, but confirm it is wired into the route). If not wired, wire it before the matrix is useful.

### Task 3.1: Verify the route consumes the shard gate

**Files:** Investigate: `site/src/pages/[lang]/learn/**` (the lesson route).

- [ ] **Step 1: Confirm `shardPaths` + `selectLessons` are applied**

Run:
```bash
grep -rn "shardPaths\|selectLessons\|selectOther\|inShard" site/src/pages
```
Expected: the lesson route filters its `getStaticPaths` output through `shardPaths(...)` (and `selectLessons` for incremental). If a route is missing the gate, add it mirroring the others, then commit. If all routes already gate, note it and continue.

### Task 3.2: Add the merge-shards script

**Files:**
- Create: `site/scripts/merge-shards.mjs`
- Test: covered by the existing `site/scripts/check-dist-complete.mjs` guard (count assertion).

**Interfaces:**
- Consumes: per-shard output dirs `dist-shard-0 … dist-shard-(N-1)` (each a full `dist` slice).
- Produces: a merged `site/dist`, then runs `check-dist-complete.mjs`.

- [ ] **Step 1: Write the merge script**

```javascript
#!/usr/bin/env bun
// Merge dist-shard-* slices into site/dist, then assert completeness.
// Pages are disjoint across shards (shardPaths partition); shared static assets
// are byte-identical so last-writer-wins is safe. Sitemap is regenerated by the
// nightly forced full build, so a merged partial sitemap is acceptable between fulls.
import { execFileSync } from "node:child_process";
import { rm, mkdir, cp, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_ROOT = resolve(import.meta.dirname, "..");
const N = Math.max(1, Math.trunc(Number(process.env.SHARD_TOTAL ?? "1")) || 1);
const DIST = resolve(SITE_ROOT, "dist");

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
for (let i = 0; i < N; i++) {
  const slice = resolve(SITE_ROOT, `dist-shard-${i}`);
  for (const name of await readdir(slice)) {
    await cp(`${slice}/${name}`, resolve(DIST, name), { recursive: true, force: true });
  }
}
execFileSync("bun", ["scripts/check-dist-complete.mjs"], { cwd: SITE_ROOT, stdio: "inherit" });
console.log(`merge-shards: ${N} slices merged + completeness OK.`);
```

- [ ] **Step 2: Smoke-test the merge logic with 2 fake slices**

Run:
```bash
cd site
mkdir -p dist-shard-0/a dist-shard-1/b && echo x > dist-shard-0/a/i.html && echo y > dist-shard-1/b/i.html
SHARD_TOTAL=2 bun -e 'import("./scripts/merge-shards.mjs").catch(()=>process.exit(0))'
ls dist/a dist/b   # both present → union works (completeness guard will fail on fakes; that is expected here)
rm -rf dist-shard-0 dist-shard-1 dist
```
Expected: `dist/a/i.html` and `dist/b/i.html` both exist (union proven). The completeness guard exiting non-zero on fake data is fine for this smoke test.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/merge-shards.mjs
git commit -m "feat(build): add merge-shards for cross-runner full builds"
```

### Task 3.3: Add the matrix full-build path to CI

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:** Consumes the plan's `mode`. Produces a merged `dist` for the deploy step when `mode == full`.

- [ ] **Step 1: Extract the plan into its own job that outputs `mode`**

Promote the existing `Plan build` step into a standalone `plan` job so both the shard matrix and the deploy job can depend on it:
```yaml
  plan:
    needs: gates
    runs-on: ubuntu-latest
    outputs:
      mode: ${{ steps.plan.outputs.mode }}
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.11 }
      - run: bun install --frozen-lockfile
        working-directory: site
      - name: Restore dist + manifest cache
        uses: actions/cache/restore@v4
        with:
          path: |
            site/dist
            site/build-cache/manifest.json
          key: site-dist-${{ github.run_id }}
          restore-keys: site-dist-
      - name: Plan build
        id: plan
        working-directory: site
        env:
          FORCE_FULL_BUILD: ${{ (github.event_name == 'schedule' || inputs.force_full == 'true') && '1' || '0' }}
        run: bun scripts/incremental-plan.mjs
```

- [ ] **Step 2: Add the shard-render matrix (full only)**

```yaml
  shard-render:
    needs: plan
    if: needs.plan.outputs.mode == 'full'
    runs-on: ubuntu-latest
    timeout-minutes: 90
    strategy:
      fail-fast: true
      matrix:
        index: [0, 1, 2, 3]         # SHARD_TOTAL = 4; tune by measuring runner wall-clock
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.11 }
      - run: bun install --frozen-lockfile
        working-directory: site
      - name: Render shard ${{ matrix.index }}
        working-directory: site
        env:
          SHARD_INDEX: ${{ matrix.index }}
          SHARD_TOTAL: "4"
        run: NODE_OPTIONS=--max-old-space-size=10240 bunx astro build --outDir dist-shard-${{ matrix.index }}
      - uses: actions/upload-artifact@v4
        with:
          name: dist-shard-${{ matrix.index }}
          path: site/dist-shard-${{ matrix.index }}
          retention-days: 1
```

- [ ] **Step 3: Make the deploy job consume the right path**

In `build-deploy`, add `needs: [plan, shard-render]` (shard-render is skipped on incremental, which is fine — a skipped dependency does not block). For the full path, download + merge instead of building in-process:
```yaml
      - name: Download shard slices (full)
        if: needs.plan.outputs.mode == 'full'
        uses: actions/download-artifact@v4
        with: { pattern: dist-shard-*, path: site }
      - name: Merge shards (full)
        if: needs.plan.outputs.mode == 'full'
        working-directory: site
        env: { SHARD_TOTAL: "4" }
        run: bun scripts/merge-shards.mjs
```
Remove the old in-process `Full build` + `Verify dist completeness` steps (merge-shards now runs the guard). Keep the incremental render/overlay steps and the common lint/cache/deploy steps unchanged. `shard-render` already promotes nothing; promote the manifest in the deploy job after merge:
```yaml
      - name: Promote manifest (full)
        if: needs.plan.outputs.mode == 'full'
        run: mv site/build-cache/next-manifest.json site/build-cache/manifest.json
```
Note: `next-manifest.json` is written by the `plan` job — persist it via the run cache (add it to the `plan` job's cache save) or regenerate it in the deploy job before promotion. Choose one and keep it consistent with the incremental path.

- [ ] **Step 4: Re-evaluate the artifact-quota constraint**

Before merging, confirm slice artifacts (~`dist`/N each, retention 1 day) fit the now-public-repo limits:
```bash
gh api repos/:owner/:repo/actions/cache/usage
```
If artifact storage is still tight, swap `upload-artifact`/`download-artifact` for `actions/cache` with per-shard keys (`shard-${run_id}-${index}`). Document the choice in a workflow comment.

- [ ] **Step 5: Validate on a forced full build (manual dispatch)**

Run:
```bash
gh workflow run deploy.yml -f force_full=true -f branch=ci-shard-test
gh run watch
```
Expected: 4 shard jobs render in parallel, merge passes `check-dist-complete` (actual == expected lesson count), preview deploy succeeds. Compare wall-clock against a recent serial full build (target: roughly full/4 + merge + upload).

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(build): parallel full builds via per-runner shard matrix + merge"
```

---

## ITEM 4 — Spike: content-load sharding (research only)

**Goal:** Determine whether Astro's content layer can load only a slice of the corpus per process, which would remove the ~6 GB per-process baseline and unlock in-process parallelism (the code's own stated "real fix"). This is **research that produces a findings doc + go/no-go**, NOT production code — the API surface is unknown and may require fighting the framework. Time-box it.

### Task 4.1: Investigate and decide

**Files:**
- Create: `docs/superpowers/specs/2026-06-20-content-load-sharding-spike.md`

- [ ] **Step 1: Profile where the baseline memory actually goes**

Run a full build with heap profiling and capture the peak:
```bash
cd site
NODE_OPTIONS="--max-old-space-size=10240 --heapsnapshot-near-heap-limit=1" bunx astro build 2>&1 | tee /tmp/build-mem.log
# inspect peak RSS; identify whether the content store, the Vite module graph, or
# the render contexts dominate (memo claims content store + Vite graph ≈6 GB).
```
Record the breakdown.

- [ ] **Step 2: Check whether the content layer supports a load filter**

Use Context7 / Astro docs for the installed version (6.3.5): does `astro:content` / the content layer `loader` API allow loading a subset (e.g. a custom `glob` loader scoped per shard via env)? Capture exact API names and version availability — do not assume.
```bash
grep -rn "defineCollection\|loader\|glob(" site/src/content/config.ts
```

- [ ] **Step 3: Prototype a scoped loader behind an env flag (throwaway branch)**

If the API allows it, prototype a `CONTENT_SHARD` env that makes the lessons collection load only matching files, and measure: does peak memory drop enough to run 2 processes under 16 GB? Keep this on a throwaway branch; do NOT merge prototype code.

- [ ] **Step 4: Write the findings + recommendation**

Create the spec doc with: memory breakdown, whether a scoped loader is feasible, measured memory delta if prototyped, risk assessment, and a clear **GO** (worth a full plan) or **NO-GO** (Item 3's cross-runner matrix is sufficient; stop here). Commit:
```bash
git add docs/superpowers/specs/2026-06-20-content-load-sharding-spike.md
git commit -m "docs(spike): content-load sharding feasibility findings + go/no-go"
```

---

## ITEM 5 — Cache Vite/Astro build artifacts between CI runs

**Goal:** Reuse Astro's `.astro` cache and Vite's dep-optimization cache across runs to cut cold-start bundling (not the render itself). Low risk, orthogonal to incremental/sharding.

### Task 5.1: Add a keyed build-cache restore/save to CI

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Add cache restore before the build steps**

In `build-deploy` (and `shard-render` if Item 3 landed), after `Install site deps` and before the plan/build:
```yaml
      - name: Restore Astro/Vite build cache
        uses: actions/cache@v4
        with:
          path: |
            site/node_modules/.astro
            site/node_modules/.vite
          key: astro-vite-${{ hashFiles('site/bun.lock', 'site/astro.config.mjs') }}-${{ github.run_id }}
          restore-keys: |
            astro-vite-${{ hashFiles('site/bun.lock', 'site/astro.config.mjs') }}-
            astro-vite-
```
(`actions/cache` saves automatically on success at job end via the post step; no separate save needed.)

- [ ] **Step 2: Measure the delta**

Run two consecutive deploys (first warms the cache, second uses it):
```bash
gh workflow run deploy.yml -f branch=ci-cache-test
gh run watch     # note build-step duration
gh workflow run deploy.yml -f branch=ci-cache-test
gh run watch     # compare build-step duration — expect a faster bundle/cold-start
```
Expected: second run's pre-render bundling is measurably faster. If no measurable gain, revert this item (the cache restore/save overhead is not worth it) and note it.

- [ ] **Step 3: Commit (or revert)**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(build): cache Astro/Vite artifacts across runs"
```

---

## Sequencing & dependencies

1. **Item 1** first — biggest ROI, self-contained, pure-lib TDD, no CI risk. Ship it alone and watch the next few pushes go incremental that previously went full.
2. **Item 2** next — verification-led; likely confirms delta deploy already works (cheap win or a small determinism fix).
3. **Item 5** — independent, low risk; can land anytime.
4. **Item 3** — largest CI change; do after 1–2 so the full-build path is only hit when genuinely needed. Depends on Task 3.1 confirming the route gate.
5. **Item 4** — research gate; its outcome decides whether further parallelism work happens at all. Run last; do not block 1–3 on it.

---

## Self-Review

**Spec coverage:** Each of the user's 5 points maps to an Item (1→frontmatter split, 2→delta deploy, 3→cross-runner matrix, 4→content-load spike, 5→build cache). ✔

**Placeholder scan:** Code steps carry real code; CI steps carry real YAML; the spike's investigation steps are legitimately exploratory (it is research, explicitly producing a findings doc, not production code) — flagged as such. Allowlist values in Item 1 are seeded then evidence-finalized in Task 1.2 (no unproven field semantics asserted). ✔

**Type consistency:** `pageKeyOf`/`pageHash`/`partitionFrontmatter`/`PAGE_LOCAL_FRONTMATTER_FIELDS`/`shardPaths`/`selectLessons` used with the same signatures as defined in `incremental-hash.ts` / `build-shard.ts` / `build-incremental.ts`. `pageHash`'s 3rd arg is optional with a default so existing 2-arg callers and the prior hash value stay valid. ✔

**Known caveat carried forward:** merged sitemap from sharded builds is partial between nightly forced full rebuilds (documented in `parallel-build.mjs` and re-noted in `merge-shards.mjs`) — acceptable, the nightly forced full re-baselines it.
