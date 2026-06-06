// Regenerate ONLY src/content/path/concept-overrides.json from the committed concepts.json +
// curated cross-track-edges.json + generated intra-track-edges.json. Avoids a full harvest
// (build-path-data.mjs) so this slice does not touch concepts.json / unit-concepts.json. Exits
// non-zero if the merged edges make the concept graph cyclic (so a bad edge is caught before
// commit; the path lint is the build-time gate).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeCrossTrackEdges } from "./cross-track-merge.mjs";
import { mergeIntraTrackEdges } from "./intra-track-merge.mjs";
import { isAcyclicWithEdges } from "./acyclic-gate.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));

function readEdges(name) {
  const f = join(OUT, name);
  if (!existsSync(f)) return [];
  try { return JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { console.warn(`${name}: parse failed (${e.message}); ignoring`); return []; }
}

const cross = mergeCrossTrackEdges(readEdges("cross-track-edges.json"), concepts);
const intra = mergeIntraTrackEdges(readEdges("intra-track-edges.json"), concepts);
for (const w of [...cross.warnings, ...intra.warnings]) console.warn(w);

// Union cross + intra, dedup by concept|requires (cross wins on a tie).
const seen = new Set();
const addEdges = [];
for (const e of [...cross.addEdges, ...intra.addEdges]) {
  const k = `${e.concept}|${e.requires}`;
  if (seen.has(k)) continue;
  seen.add(k);
  addEdges.push(e);
}

const gate = isAcyclicWithEdges(concepts, addEdges);
if (!gate.ok) {
  console.error(`cross/intra edges introduce a cycle (${gate.unplaced} nodes unplaced); aborting`);
  process.exit(1);
}

writeFileSync(join(OUT, "concept-overrides.json"), JSON.stringify({ addEdges, removeEdges: [], retag: [] }, null, 2) + "\n");
console.log(`concept-overrides.json: ${addEdges.length} merged (cross ${cross.addEdges.length}, intra ${intra.addEdges.length}); cross-skipped ${cross.skipped}, intra-skipped ${intra.skipped}`);
