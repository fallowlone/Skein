#!/usr/bin/env bun
// Builds the committed algorithm<->lesson link index (hybrid derived + curated).
//
// Derived links come from shared concepts: an algorithms unit's `teaches`
// (unit-concepts.json) intersected with each lesson's frontmatter `concepts`.
// Curated `always`/`never` entries (algo-links.curated.json) pin or suppress.
// See docs/superpowers/specs/2026-10-06-algo-links-design.md.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "./algo-links-core.mjs";
import { parseFrontmatter } from "./build-lesson-graph.mjs";

let siteRoot;
try {
  siteRoot = fileURLToPath(new URL("../../", import.meta.url));
} catch {
  siteRoot = process.cwd();
}

const CONCEPTS = "src/content/path/concepts.json";
const UNIT_CONCEPTS = "src/content/path/unit-concepts.json";
const CURATED = "src/content/path/algo-links.curated.json";
const LESSONS_EN = "src/content/lessons/en";
export const INDEX_RELPATH = "src/content/path/algo-links.json";
const NOTE = "GENERATED — do not hand-edit, run `bun run build:algo-links`";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === "index.mdx") out.push(p);
  }
  return out.sort();
}

function lessonKeyAndConcepts(text) {
  const { scalars, lists } = parseFrontmatter(text);
  const { track, unit, slug } = scalars;
  if (!track || !unit || !slug) return null;
  return { key: `${track}/${unit}/${slug}`, concepts: lists.concepts ?? [] };
}

export function loadCorpus(rootDir = siteRoot) {
  const read = (rel) => readFileSync(join(rootDir, rel), "utf8");
  const concepts = JSON.parse(read(CONCEPTS));
  const lessonConcepts = {};
  const lessonOrder = [];
  for (const file of walk(join(rootDir, LESSONS_EN))) {
    const parsed = lessonKeyAndConcepts(readFileSync(file, "utf8"));
    if (!parsed) continue;
    lessonConcepts[parsed.key] = parsed.concepts;
    lessonOrder.push(parsed.key);
  }
  return {
    unitConcepts: JSON.parse(read(UNIT_CONCEPTS)),
    lessonConcepts,
    lessonOrder,
    knownConceptIds: concepts.map((c) => c.id),
    curated: JSON.parse(read(CURATED)),
  };
}

if (import.meta.main) {
  const corpus = loadCorpus();
  const { index, coverage, warnings } = buildIndex(corpus);
  writeFileSync(join(siteRoot, INDEX_RELPATH), `${JSON.stringify({ _note: NOTE, ...index }, null, 2)}\n`);
  for (const w of warnings) console.error(`algo-links: warning: ${w}`);
  console.log(
    `algo-links.json: ${coverage.units} algo units, ${coverage.withLinks} with links` +
      (coverage.zeroLink.length ? `; zero-link: ${coverage.zeroLink.join(", ")}` : "") +
      ` → ${INDEX_RELPATH}`,
  );
}
