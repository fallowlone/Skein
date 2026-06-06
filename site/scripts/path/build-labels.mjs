// Regenerate concepts.json ru labels from the committed concept-labels.json source (no full harvest).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLabels } from "./labels-merge.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));
const file = join(OUT, "concept-labels.json");
const labelMap = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};

const { concepts: out, applied, skipped, warnings } = mergeLabels(concepts, labelMap);
for (const w of warnings) console.warn(w);
writeFileSync(join(OUT, "concepts.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`build-labels: ${applied} ru labels applied, ${skipped} skipped`);
