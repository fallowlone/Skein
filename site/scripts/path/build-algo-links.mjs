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
const LESSONS_RU = "src/content/lessons/ru";
const UNITS = "src/content/units.json";
const TRACKS = "src/content/tracks.json";
export const INDEX_RELPATH = "src/content/path/algo-links.json";
export const TITLES_RELPATH = "src/content/path/algo-link-titles.json";
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

function lessonTitles(rootDir, dir) {
  const out = {};
  let base;
  try {
    base = join(rootDir, dir);
    readdirSync(base);
  } catch {
    return out;
  }
  for (const file of walk(base)) {
    const { scalars } = parseFrontmatter(readFileSync(file, "utf8"));
    const { track, unit, slug, title } = scalars;
    if (!track || !unit || !slug || !title) continue;
    out[`${track}/${unit}/${slug}`] = title;
  }
  return out;
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
  const enTitles = lessonTitles(rootDir, LESSONS_EN);
  const ruTitles = lessonTitles(rootDir, LESSONS_RU);
  const titles = { lessons: {}, units: {}, tracks: {} };
  for (const key of Object.keys(lessonConcepts)) {
    titles.lessons[key] = {
      ...(enTitles[key] ? { en: enTitles[key] } : {}),
      ...(ruTitles[key] ? { ru: ruTitles[key] } : {}),
    };
  }
  const unitConcepts = JSON.parse(read(UNIT_CONCEPTS));
  for (const u of JSON.parse(read(UNITS))) {
    if (typeof u.id === "string" && u.id.startsWith("algorithms/")) {
      titles.units[u.id] = { slug: u.slug, ...(u.title ?? {}) };
    }
  }
  for (const tr of JSON.parse(read(TRACKS))) {
    if (tr.slug && tr.title) titles.tracks[tr.slug] = tr.title;
  }
  return {
    unitConcepts,
    lessonConcepts,
    lessonOrder,
    knownConceptIds: concepts.map((c) => c.id),
    curated: JSON.parse(read(CURATED)),
    titles,
  };
}

if (import.meta.main) {
  const corpus = loadCorpus();
  const { index, coverage, warnings } = buildIndex(corpus);
  writeFileSync(join(siteRoot, INDEX_RELPATH), `${JSON.stringify({ _note: NOTE, ...index }, null, 2)}\n`);
  // Titles file stays small: only linked lessons plus the algo units.
  const linkedLessons = {};
  for (const key of Object.keys(index.lessons)) linkedLessons[key] = corpus.titles.lessons[key] ?? {};
  writeFileSync(
    join(siteRoot, TITLES_RELPATH),
    `${JSON.stringify({ _note: NOTE, lessons: linkedLessons, units: corpus.titles.units, tracks: corpus.titles.tracks }, null, 2)}\n`,
  );
  for (const w of warnings) console.error(`algo-links: warning: ${w}`);
  console.log(
    `algo-links.json: ${coverage.units} algo units, ${coverage.withLinks} with links` +
      (coverage.zeroLink.length ? `; zero-link: ${coverage.zeroLink.join(", ")}` : "") +
      ` → ${INDEX_RELPATH}`,
  );
}
