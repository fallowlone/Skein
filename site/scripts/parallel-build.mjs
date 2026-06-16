// Spawns SHARD_TOTAL `astro build` processes in parallel, each rendering its
// shard into a private outDir, then merges the slices into site/dist.
// Usage (from site/): SHARD_TOTAL=3 bun scripts/parallel-build.mjs
import { spawn } from "node:child_process";
import { rm, cp, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const SITE_ROOT = resolve(import.meta.dirname, "..");

const N = Math.max(1, Math.trunc(Number(process.env.SHARD_TOTAL ?? "3")) || 3);
const HEAP = process.env.SHARD_HEAP ?? "8192"; // per-process; N*HEAP must fit runner RAM

function runShard(index) {
  const outDir = `dist-shard-${index}`;
  return new Promise((res, rej) => {
    const child = spawn("bunx", ["astro", "build", "--outDir", outDir], {
      cwd: SITE_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        SHARD_INDEX: String(index),
        SHARD_TOTAL: String(N),
        NODE_OPTIONS: `--max-old-space-size=${HEAP}`,
      },
    });
    child.on("exit", (code) =>
      code === 0 ? res(resolve(SITE_ROOT, outDir)) : rej(new Error(`shard ${index} exited ${code}`)),
    );
    child.on("error", rej);
  });
}

const t0 = Date.now();
await rm(resolve(SITE_ROOT, "dist"), { recursive: true, force: true });
await mkdir(resolve(SITE_ROOT, "dist"), { recursive: true });
const outDirs = await Promise.all(
  Array.from({ length: N }, (_, i) => runShard(i)),
);
// Merge: union slices into dist (pages are disjoint; shared static assets are
// byte-identical across shards so last-writer-wins is safe).
// NOTE (sitemap caveat): @astrojs/sitemap emits a per-shard partial
// sitemap-index.xml; the merge keeps the last shard's partial one. This is
// resolved during CI parity verification (regenerate a full sitemap post-merge
// or exclude sitemap from sharded output) — see the build-optimization plan,
// Task 2 Step 2. Do not treat the merged sitemap as complete yet.
for (const dir of outDirs) {
  const entries = await readdir(dir);
  for (const name of entries) {
    await cp(`${dir}/${name}`, resolve(SITE_ROOT, "dist", name), { recursive: true, force: true });
  }
  await rm(dir, { recursive: true, force: true });
}
console.log(`[parallel-build] ${N} shards merged in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
