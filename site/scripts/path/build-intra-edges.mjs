// Focused regenerator: harvest lesson `prereqs` → intra-track concept edges WITHOUT a full
// build-path-data harvest (so it never rewrites concepts.json / unit-concepts.json). Mirrors the
// "lightweight regenerator" precedent of build-overrides.mjs. Writes ONLY intra-track-edges.json;
// run build-overrides.mjs afterwards to merge it into concept-overrides.json.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveIntraTrackEdges } from "./intra-track-derive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..");
const LESSONS_EN = join(SITE, "src/content/lessons/en");
const UNITS_JSON = join(SITE, "src/content/units.json");
const OUT = join(SITE, "src/content/path");

// Minimal frontmatter parser (scalars + block lists) — only what we need: slug/track/unit + the
// `concepts` and `prereqs` lists. Self-contained because build-path-data.mjs calls main() on import.
function parseFrontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { scalars: {}, lists: {} };
  const scalars = {}, lists = {};
  let cur = null;
  for (const ln of m[1].split("\n")) {
    const li = ln.match(/^\s*-\s+(.*)$/);
    if (li && cur) { lists[cur].push(li[1].trim().replace(/^['"]|['"]$/g, "")); continue; }
    const kv = ln.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (kv) {
      const k = kv[1], v = kv[2].trim();
      if (v === "") { cur = k; lists[k] = []; }
      else { cur = null; scalars[k] = v.replace(/^['"]|['"]$/g, ""); }
    }
  }
  return { scalars, lists };
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name === "index.mdx") out.push(p);
  }
  return out;
}

const meta = new Map(JSON.parse(readFileSync(UNITS_JSON, "utf8")).map((u) => [u.id, u]));
const units = new Map(); // unitId -> { id, track, order, unitSlug, lessons }
for (const file of walk(LESSONS_EN)) {
  const { scalars, lists } = parseFrontmatter(readFileSync(file, "utf8"));
  const slug = scalars.slug || "";
  if (!/^\d{2}-/.test(slug)) continue; // real lessons only (NN-…), matching build-path-data isLessonSlug
  const track = scalars.track, unitSlug = scalars.unit;
  if (!track || !unitSlug) continue;
  const id = `${track}/${unitSlug}`;
  if (!units.has(id)) units.set(id, { id, track, order: meta.get(id)?.order ?? 999, unitSlug, lessons: [] });
  units.get(id).lessons.push({ slug, concepts: lists.concepts || [], prereqs: lists.prereqs || [] });
}

const { edges, warnings } = deriveIntraTrackEdges([...units.values()]);
for (const w of warnings) console.warn(w);

// Filter by CONCEPT primaryTrack (the graph's track definition in concepts.json). The derivation
// keys on lesson track, but a concept shared across tracks has a single primaryTrack; edges whose
// endpoints differ in primaryTrack are genuinely cross-track (curated cross-track domain), not here.
const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));
const trackOf = new Map(concepts.map((c) => [c.id, c.track]));
const intra = edges.filter((e) => {
  const tc = trackOf.get(e.concept), tr = trackOf.get(e.requires);
  return tc !== undefined && tr !== undefined && tc === tr;
});

writeFileSync(join(OUT, "intra-track-edges.json"), JSON.stringify(intra, null, 2) + "\n");
console.log(`intra-track-edges.json: ${intra.length} edges (${edges.length - intra.length} concept-cross-track dropped) from ${units.size} units (${warnings.length} skipped prereqs)`);
