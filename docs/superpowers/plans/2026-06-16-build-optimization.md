# Build Optimization (Parallel Render) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the full (non-incremental) CI build from ~65 min to ~18–25 min by rendering the site across N parallel `astro build` processes inside the single `build-deploy` job — free-tier, no cross-job artifacts.

**Architecture:** Reuse the existing FNV-1a `shardPaths()` partition (`site/src/scripts/build-shard.ts`). Apply it to ALL high-cardinality routes (lessons already done; add glossary + grammar-topic) so every page lands in exactly one shard — otherwise each shard re-renders every non-sharded route and the ×N duplication erases the win. A driver script spawns N `astro build` processes, each with `SHARD_INDEX`/`SHARD_TOTAL` and its own `--outDir`, then merges the slices into `site/dist`. The completeness guard (`check-dist-complete.mjs`) catches a dropped shard. Incremental builds are untouched.

**Tech Stack:** Astro 5, Bun, GitHub Actions (`ubuntu-latest`, 4 vCPU / 16 GB), Node `child_process`.

---

### Task 1: Shard the high-cardinality non-lesson routes

Currently only the lesson route calls `shardPaths()`. Glossary (~1362 pages) and grammar topics (~244 pages) are NOT sharded, so each of N shards renders all of them → ×N duplicate render. Apply the same partition the lesson route uses.

**Files:**
- Reference (template, already correct): `site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`
- Modify: `site/src/pages/[lang]/glossary/[term].astro` (getStaticPaths)
- Modify: `site/src/pages/[lang]/english/grammar/[topic].astro` (getStaticPaths)
- Test: `site/src/scripts/build-shard.test.ts`

- [ ] **Step 1: Read the lesson route's existing shardPaths usage as the template**

Run: `grep -n "shardPaths\|shardConfig\|getStaticPaths" site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`
Note the exact call shape: `shardPaths(paths, (p) => <stable-unique-key>)` where the key is unique per page (e.g. the full `lang/track/unit/slug` route string). Mirror this shape exactly in the next steps.

- [ ] **Step 2: Confirm which routes dominate and lack sharding**

Run: `grep -rL "shardPaths" site/src/pages --include="*.astro" | xargs grep -l "getStaticPaths"`
Expected: the glossary `[term].astro` and grammar `[topic].astro` appear (high-cardinality, unsharded). Smaller routes (≤ ~20 pages each) can be left unsharded — they render in every shard but the fixed cost is negligible.

- [ ] **Step 3: Add a partition-completeness unit test**

In `site/src/scripts/build-shard.test.ts`, add:

```ts
import { describe, it, expect } from "vitest";
import { shardPaths } from "./build-shard";

describe("shardPaths partition", () => {
  it("is disjoint and complete across N shards", () => {
    const keys = Array.from({ length: 5000 }, (_, i) => `key-${i}`);
    const N = 3;
    const seen = new Set<string>();
    for (let index = 0; index < N; index++) {
      const slice = shardPaths(keys, (k) => k, { index, total: N });
      for (const k of slice) {
        expect(seen.has(k)).toBe(false); // disjoint: no key in two shards
        seen.add(k);
      }
    }
    expect(seen.size).toBe(keys.length); // complete: union == all
  });
});
```

- [ ] **Step 4: Run the test (PASS — locks the disjoint+complete contract the route edits rely on)**

Run: `cd site && bun run test -- build-shard`
Expected: PASS. (`shardPaths`/`inShard` already exist; this test pins the contract before wiring routes.)

- [ ] **Step 5: Wire shardPaths into the glossary route**

In `site/src/pages/[lang]/glossary/[term].astro`, import `shardPaths` from `~/scripts/build-shard` (match the lesson route's import) and wrap the array returned by `getStaticPaths` so the final return is `shardPaths(paths, (p) => \`${p.params.lang}/${p.params.term}\`)`. Read the route's actual param names first; the key must be unique per emitted page.

- [ ] **Step 6: Wire shardPaths into the grammar-topic route**

Same transform in `site/src/pages/[lang]/english/grammar/[topic].astro`: key = `\`${p.params.lang}/${p.params.topic}\`` (use the route's real param names).

- [ ] **Step 7: Verify a sharded build is a strict subset**

Run: `cd site && SHARD_TOTAL=3 SHARD_INDEX=0 bunx astro build --outDir dist-s0 >/dev/null 2>&1; find dist-s0 -name '*.html' | wc -l`
Expected: substantially fewer than the full count (roughly total/3 for sharded routes + all small routes). Repeat INDEX=1,2 and confirm the three HTML sets are disjoint for glossary/grammar/lesson paths. Clean up: `rm -rf dist-s0`.

- [ ] **Step 8: Commit**

```bash
git add site/src/pages/[lang]/glossary/[term].astro \
        "site/src/pages/[lang]/english/grammar/[topic].astro" \
        site/src/scripts/build-shard.test.ts
git commit -m "perf(build): shard glossary + grammar-topic routes for parallel render"
```

---

### Task 2: Parallel-build driver

**Files:**
- Create: `site/scripts/parallel-build.mjs`

- [ ] **Step 1: Write the driver**

```js
// Spawns SHARD_TOTAL `astro build` processes in parallel, each rendering its
// shard into a private outDir, then merges the slices into site/dist.
// Usage (from site/): SHARD_TOTAL=3 bun scripts/parallel-build.mjs
import { spawn } from "node:child_process";
import { rm, cp, mkdir, readdir } from "node:fs/promises";

const N = Math.max(1, Math.trunc(Number(process.env.SHARD_TOTAL ?? "3")) || 3);
const HEAP = process.env.SHARD_HEAP ?? "8192"; // per-process; N*HEAP must fit runner RAM

function runShard(index) {
  const outDir = `dist-shard-${index}`;
  return new Promise((resolve, reject) => {
    const child = spawn("bunx", ["astro", "build", "--outDir", outDir], {
      stdio: "inherit",
      env: {
        ...process.env,
        SHARD_INDEX: String(index),
        SHARD_TOTAL: String(N),
        NODE_OPTIONS: `--max-old-space-size=${HEAP}`,
      },
    });
    child.on("exit", (code) =>
      code === 0 ? resolve(outDir) : reject(new Error(`shard ${index} exited ${code}`)),
    );
    child.on("error", reject);
  });
}

const t0 = Date.now();
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const outDirs = await Promise.all(
  Array.from({ length: N }, (_, i) => runShard(i)),
);
// Merge: union slices into dist (pages are disjoint; shared static assets are
// byte-identical across shards so last-writer-wins is safe).
for (const dir of outDirs) {
  const entries = await readdir(dir);
  for (const name of entries) {
    await cp(`${dir}/${name}`, `dist/${name}`, { recursive: true, force: true });
  }
  await rm(dir, { recursive: true, force: true });
}
console.log(`[parallel-build] ${N} shards merged in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
```

- [ ] **Step 2: Sitemap caveat — verify, then handle**

Each shard's `@astrojs/sitemap` emits a `sitemap-index.xml` covering only its slice; the merge keeps the last shard's partial sitemap. After Task 4 Step 1, inspect `dist/sitemap-*.xml`. If incomplete, fix with one of: (a) exclude sitemap files from the per-shard merge and regenerate a full sitemap in a small post-merge step from the dist HTML file list, or (b) move sitemap generation out of the sharded build. Implement whichever the inspection shows is needed — do not leave a partial sitemap.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/parallel-build.mjs
git commit -m "perf(build): parallel multi-process render driver"
```

---

### Task 3: Wire the workflow to use the driver on full builds

**Files:**
- Modify: `.github/workflows/deploy.yml` (the `Full build` step, ~line 95-100)

- [ ] **Step 1: Replace the serial full-build command**

Change the `Full build` step from:

```yaml
      - name: Full build
        if: steps.plan.outputs.mode == 'full'
        working-directory: site
        env:
          SHARD_TOTAL: "1"
        run: NODE_OPTIONS=--max-old-space-size=10240 bunx astro build
```

to:

```yaml
      - name: Full build (parallel)
        if: steps.plan.outputs.mode == 'full'
        working-directory: site
        env:
          SHARD_TOTAL: "3"
          SHARD_HEAP: "4608"   # 3 x 4608 MB ~= 13.5 GB, fits the 16 GB runner
        run: bun scripts/parallel-build.mjs
```

Leave `Verify dist completeness` and `Promote manifest (full)` unchanged — they already gate the merged `dist`. Leave the incremental path and its `SHARD_TOTAL: "1"` untouched.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: full build renders 3-way parallel via parallel-build driver"
```

---

### Task 4: Local verification (parity + memory)

- [ ] **Step 1: Baseline page set from a serial build**

Run: `cd site && bunx astro build >/tmp/serial.log 2>&1; find dist -name '*.html' | sort > /tmp/serial-pages.txt; wc -l < /tmp/serial-pages.txt`
Record the count (expected ~5777). Then inspect `dist/sitemap-*.xml` to know the correct full sitemap shape (for Task 2 Step 2).

- [ ] **Step 2: Parallel build and compare page sets**

Run: `cd site && SHARD_TOTAL=3 bun scripts/parallel-build.mjs >/tmp/parallel.log 2>&1; find dist -name '*.html' | sort > /tmp/parallel-pages.txt; diff /tmp/serial-pages.txt /tmp/parallel-pages.txt && echo "IDENTICAL"`
Expected: `IDENTICAL`. Note wall-clock from the `[parallel-build] … merged in Ns` line vs the serial baseline.

- [ ] **Step 3: Completeness guard + lint on the merged dist**

Run: `cd site && bun scripts/check-dist-complete.mjs && bun scripts/lint-dist.mjs`
Expected: both exit 0 (one page per lesson source; lint 0/0).

- [ ] **Step 4: Peak-memory sanity check**

Re-run Step 2 under `/usr/bin/time -l` (macOS) or `/usr/bin/time -v` (Linux); read peak RSS. Expected under ~14 GB. If higher, drop `SHARD_HEAP` or `SHARD_TOTAL` to 2 in Task 3 and note it.

---

### Task 5: CI verification

- [ ] **Step 1: Push and watch the full-build deploy**

```bash
git push origin main
gh run watch "$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')"
```
(A shared-src change in this plan forces `mode == full`, so the parallel path runs.)

- [ ] **Step 2: Confirm green + record wall-clock**

Run: `gh run view <run-id>` — `build-deploy` succeeds, well under the 180-min cap. Record the duration vs the ~90-min timeouts. Target ≤ ~30 min end to end.

- [ ] **Step 3: Verify the live site is complete**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://awesome-everything.pages.dev/en/` and spot-check a glossary page, a grammar topic, and a lesson — all 200, content present (guards against a silently dropped shard).

---

## Notes for the implementer

- Do NOT shard small routes (≤ ~20 pages): partition overhead and per-shard fixed render aren't worth it; they render in every shard harmlessly.
- The whole win depends on the dominant routes (lessons, glossary, grammar) each rendering in exactly one shard. If `diff` in Task 4 Step 2 is not `IDENTICAL`, a route's shard key is non-unique or a route wasn't sharded — fix before pushing.
- Incremental builds and the nightly forced-full rebuild keep working: the driver only replaces the `mode == full` command; incremental still runs serial (already fast).
