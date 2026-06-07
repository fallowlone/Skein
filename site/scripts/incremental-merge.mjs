#!/usr/bin/env bun
// Incremental post-build: overlay the cached dist UNDER the freshly-built pages,
// run the completeness guard, then promote next-manifest.json -> manifest.json.
// Precondition: build-cache/prev-dist/ holds the previous full dist; dist/ holds
// ONLY the freshly-rendered changed lesson pages (+ their identical assets).
import { execFileSync } from "node:child_process";
import { stat, rename, rm, cp } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const CACHE = join(siteRoot, "build-cache");
const PREV = join(CACHE, "prev-dist");
const DIST = join(siteRoot, "dist");

async function exists(p) { try { await stat(p); return true; } catch { return false; } }

if (!(await exists(PREV))) {
  console.error("incremental-merge: build-cache/prev-dist/ missing — cannot overlay.");
  process.exit(1);
}

// Overlay the cached tree UNDER the freshly-built pages: copy prev-dist into
// dist WITHOUT clobbering. Freshly-built changed pages already in dist win;
// every unchanged page + asset is filled from the cache (identical hashed assets
// collide to the same bytes). `force: false` keeps existing files and—with the
// default `errorOnExist: false`—skips them silently. We use node's fs.cp instead
// of `cp -n` because BSD cp (macOS) returns a non-zero exit when it skips an
// existing file, which would falsely fail the merge.
await cp(PREV, DIST, { recursive: true, force: false });

// Completeness guard: the merged dist MUST contain every lesson page.
execFileSync("bun", ["scripts/check-dist-complete.mjs"], { cwd: siteRoot, stdio: "inherit" });

// Promote the manifest only after the merged dist passed the guard.
await rename(join(CACHE, "next-manifest.json"), join(CACHE, "manifest.json"));
await rm(PREV, { recursive: true, force: true });
console.log("incremental-merge: overlay complete, manifest promoted.");
