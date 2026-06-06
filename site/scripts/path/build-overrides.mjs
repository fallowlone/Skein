// Regenerate ONLY src/content/path/concept-overrides.json from the committed concepts.json
// + curated cross-track-edges.json. Avoids a full harvest (build-path-data.mjs) so this slice
// does not touch concepts.json / unit-concepts.json. Exits non-zero if the merged edges make the
// concept graph cyclic (so a bad edge is caught before commit; the path lint is the build-time gate).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeCrossTrackEdges } from "./cross-track-merge.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));
const ctFile = join(OUT, "cross-track-edges.json");
let raw = [];
if (existsSync(ctFile)) {
  try { raw = JSON.parse(readFileSync(ctFile, "utf8")); }
  catch (e) { console.warn(`cross-track-edges.json: parse failed (${e.message}); ignoring`); }
}

const { addEdges, skipped, warnings } = mergeCrossTrackEdges(raw, concepts);
for (const w of warnings) console.warn(w);

// Acyclic gate (Kahn over base requires + merged addEdges). Inlined rather than shared with the
// TS lint rule (src/lint/rules/path.ts) because this is a standalone Node/Bun script — no clean
// import path without transpiling. Keep the two implementations behaviourally equivalent.
const req = new Map(concepts.map((c) => [c.id, [...(c.requires ?? [])]]));
for (const e of addEdges) { const a = req.get(e.concept); if (a && !a.includes(e.requires)) a.push(e.requires); }
const ids = new Set(req.keys());
const indeg = new Map([...ids].map((id) => [id, 0]));
const deps = new Map();
for (const id of ids) for (const r of req.get(id)) {
  if (!ids.has(r)) continue;
  indeg.set(id, indeg.get(id) + 1);
  if (!deps.has(r)) deps.set(r, []);
  deps.get(r).push(id);
}
const q = [...ids].filter((id) => indeg.get(id) === 0);
let placed = 0;
while (q.length) {
  const id = q.shift(); placed++;
  for (const d of deps.get(id) ?? []) { indeg.set(d, indeg.get(d) - 1); if (indeg.get(d) === 0) q.push(d); }
}
if (placed !== ids.size) {
  console.error(`cross-track edges introduce a cycle (${ids.size - placed} nodes unplaced); aborting`);
  process.exit(1);
}

writeFileSync(join(OUT, "concept-overrides.json"), JSON.stringify({ addEdges, removeEdges: [], retag: [] }, null, 2) + "\n");
console.log(`concept-overrides.json: ${addEdges.length} edges merged, ${skipped} skipped`);
