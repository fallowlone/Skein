#!/usr/bin/env bun
// Local convenience: chain plan -> astro build (gated) -> merge, the same steps
// CI runs as separate jobs. First run (no manifest) does a full build + writes
// the manifest; later runs go incremental when only bodies/practice changed.
import { execFileSync } from "node:child_process";
import { readFile, stat, rename, cp, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const CACHE = join(siteRoot, "build-cache");
const PREV = join(CACHE, "prev-dist");
const DIST = join(siteRoot, "dist");
const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: siteRoot, stdio: "inherit", env: { ...process.env, ...env } });
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };

// 1. plan
run("bun", ["scripts/incremental-plan.mjs"]);
const plan = JSON.parse(await readFile(join(CACHE, "plan.json"), "utf8"));

// Incremental needs a prior dist to overlay. If it is missing (e.g. dist was
// cleaned), fall back to full so we never ship an incomplete site.
let mode = plan.mode;
if (mode === "incremental" && !(await exists(DIST))) {
  console.log("incremental-build: no prior dist/ — falling back to full.");
  mode = "full";
}

if (mode === "full") {
  // Full: plain build (no plan env, no shard) + the chained lint, then manifest.
  run("bun", ["run", "build"], { INCREMENTAL_PLAN: "", SHARD_TOTAL: "1" });
  await rename(join(CACHE, "next-manifest.json"), join(CACHE, "manifest.json"));
  console.log("incremental-build: full build done, manifest written.");
} else {
  // Incremental: snapshot the cached dist, render only changed pages, overlay.
  await rm(PREV, { recursive: true, force: true });
  await cp(DIST, PREV, { recursive: true });
  run("bunx", ["astro", "build"], {
    INCREMENTAL_PLAN: JSON.stringify(plan),
    SHARD_TOTAL: "1",
  });
  run("bun", ["scripts/incremental-merge.mjs"]);
  run("bun", ["scripts/lint-dist.mjs"]); // same lint the full `build` chains
  console.log(`incremental-build: incremental done — ${plan.changedPages.length} page(s).`);
}
