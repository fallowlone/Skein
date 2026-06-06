// Regenerate diagnostics-bundle.json + diagnostics-index.json from diagnostics/*.json (no full harvest).
// Mirrors build-path-data.mjs's emit exactly so a run on unchanged sources is a no-op.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Pure: from { id: {concept, items} } banks → { bundle (sorted-key), index (sorted ids) }.
export function buildBundle(banks) {
  const ids = Object.keys(banks).sort();
  const bundle = {};
  for (const id of ids) bundle[id] = banks[id];
  return { bundle, index: ids };
}

if (import.meta.main) {
  const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
  const dir = join(OUT, "diagnostics");
  const banks = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    banks[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(dir, f), "utf8"));
  }
  const { bundle, index } = buildBundle(banks);
  writeFileSync(join(OUT, "diagnostics-bundle.json"), JSON.stringify(bundle, null, 2) + "\n");
  writeFileSync(join(OUT, "diagnostics-index.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(`build-diag-bundle: ${index.length} banks → bundle + index`);
}
