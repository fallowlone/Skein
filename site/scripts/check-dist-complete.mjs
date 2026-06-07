#!/usr/bin/env bun
// Completeness guard for the sharded build (see .github/workflows/deploy.yml).
//
// The lesson route's getStaticPaths is split across CI shards. If a shard fails
// to upload, or a shard's slice is dropped during the artifact merge, the
// deployed site would be silently missing pages. This guard fails the deploy
// loudly instead: it asserts the merged dist contains exactly one rendered
// lesson page per lesson source file.
//
// Count-based (not key-set) on purpose: it does not assume a lesson's folder
// name equals its frontmatter slug, and duplicate pages across shards overwrite
// to the same path (so they cannot inflate the count). A missing shard drops the
// count below expected and trips the guard.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const lessonsSrc = join(siteRoot, "src/content/lessons");
const dist = join(siteRoot, "dist");

async function walk(dir, match, acc = []) {
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walk(p, match, acc);
    else if (match(p)) acc.push(p);
  }
  return acc;
}

// One source file per lesson entry == one page the route emits.
const sources = await walk(lessonsSrc, (p) => /[\\/]index\.mdx?$/.test(p));
const expected = sources.length;

// Rendered lesson pages: dist/<lang>/learn/<track>/<unit>/<lesson>/index.html
const lessonHtml = await walk(dist, (p) =>
  /[\\/](en|ru)[\\/]learn[\\/][^\\/]+[\\/][^\\/]+[\\/][^\\/]+[\\/]index\.html$/.test(p),
);
const actual = lessonHtml.length;

if (expected === 0) {
  console.error("check-dist-complete: found 0 lesson sources — wrong working directory?");
  process.exit(1);
}
if (actual !== expected) {
  console.error(
    `check-dist-complete: FAIL — expected ${expected} lesson pages, dist has ${actual} ` +
      `(diff ${actual - expected}). A shard is likely missing or unmerged.`,
  );
  process.exit(1);
}
console.log(`check-dist-complete: OK — ${actual}/${expected} lesson pages rendered.`);
