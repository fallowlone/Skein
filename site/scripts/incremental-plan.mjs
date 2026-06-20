#!/usr/bin/env bun
// Pre-build decision. Walks src/, categorizes every input into the GLOBAL hash
// (anything that can affect >1 page, incl. the cross-page "rest" portion of
// lesson frontmatter) vs per-page hashes (lesson MDX body + practice JSON +
// page-local frontmatter fields), compares to the restored
// manifest, and writes build-cache/plan.json + build-cache/next-manifest.json.
// Honors FORCE_FULL_BUILD=1. Prints the mode (and appends it to GITHUB_OUTPUT).
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  splitFrontmatter, frontmatterField, hashParts, pageHash, pageKeyOf, decideBuild, partitionFrontmatter,
} from "../src/scripts/incremental-hash.ts";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(siteRoot, "src");
const LESSONS = join(SRC, "content", "lessons");
const PRACTICE = join(SRC, "content", "practice");
const CACHE = join(siteRoot, "build-cache");

// Root files OUTSIDE src/ that still affect rendered output. They must be in
// the global hash so editing any of them forces a full rebuild (never ship a
// stale page): tailwind tokens drive every page's CSS; package.json/bun.lock
// pin what astro/preact/tailwind/mdx emit; tsconfig is included defensively.
const ROOT_GLOBAL_FILES = [
  "astro.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "package.json",
  "bun.lock",
];

const isUnder = (p, dir) => p === dir || p.startsWith(dir + "/");

async function walk(dir, acc = []) {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// ---- 1. read all of src/ once, categorize ----
const allSrc = await walk(SRC);
const globalFiles = [];   // {rel, content} — shared inputs
const lessonFiles = [];   // absolute paths of lesson MDX/MD
for (const p of allSrc) {
  if (isUnder(p, LESSONS) && /\.mdx?$/.test(p)) { lessonFiles.push(p); continue; }
  if (isUnder(p, PRACTICE) && p.endsWith(".json")) { continue; } // practice → per-page only
  if (isUnder(p, LESSONS)) { continue; } // any non-mdx stray inside lessons/: ignore
  globalFiles.push({ rel: relative(siteRoot, p), content: await readFile(p, "utf8") });
}

// ---- 2. practice map: lessonKey -> raw json ----
const practiceRawByKey = {};
for (const p of await walk(PRACTICE)) {
  if (!p.endsWith(".json")) continue;
  const content = await readFile(p, "utf8");
  try {
    const key = JSON.parse(content).lessonKey;
    if (typeof key === "string") practiceRawByKey[key] = content;
  } catch { /* malformed practice json is the lint's problem, not ours */ }
}

// ---- 3. per-lesson: frontmatter -> global projection, body -> per-page ----
const pages = {};
const fmProjection = []; // "relpath\0frontmatter" parts, sorted for determinism
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
  fmProjection.push(`${relative(siteRoot, p)}\0${rest}`);
  pages[key] = pageHash(body, practiceRawByKey[id] ?? "", local);
}

// ---- 4. GLOBAL_HASH = sorted shared files + config + sorted frontmatter projection ----
const globalParts = [
  ...globalFiles
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
    .map((f) => `${f.rel}\0${f.content}`),
  ...(await Promise.all(
    ROOT_GLOBAL_FILES.map(async (name) => {
      const content = await readFile(join(siteRoot, name), "utf8").catch(() => "");
      return `${name}\0${content}`;
    }),
  )),
  "FRONTMATTER",
  ...fmProjection.sort(),
];
const globalHash = hashParts(globalParts);
const current = { globalHash, pages };

// ---- 5. read restored manifest, decide ----
let prev = null;
try { prev = JSON.parse(await readFile(join(CACHE, "manifest.json"), "utf8")); } catch { /* no cache */ }
const forceFull = process.env.FORCE_FULL_BUILD === "1";
const decision = decideBuild(prev, current, forceFull);

// ---- 6. write plan + next-manifest ----
await mkdir(CACHE, { recursive: true });
const plan = { mode: decision.mode, changedPages: decision.changedPages };
await writeFile(join(CACHE, "plan.json"), JSON.stringify(plan));
await writeFile(
  join(CACHE, "next-manifest.json"),
  JSON.stringify({ globalHash, pages, pageCount: Object.keys(pages).length }),
);

const summary =
  decision.mode === "full"
    ? `full (${forceFull ? "forced" : !prev ? "no cache" : "global hash changed"})`
    : `incremental — ${decision.changedPages.length} changed page(s)`;
console.log(`incremental-plan: ${summary}`);
if (process.env.GITHUB_OUTPUT) {
  await writeFile(process.env.GITHUB_OUTPUT, `mode=${decision.mode}\n`, { flag: "a" });
}
