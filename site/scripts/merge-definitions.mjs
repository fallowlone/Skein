// Order-preserving merge of a {key:{defEn,defRu}} patch into glossary.json.
// Usage: node scripts/merge-definitions.mjs <patch.json>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Apply a patch to a glossary object. Pure — returns a new object,
 *  preserves key order and any existing fields (e.g. seeAlso). */
export function applyPatch(glossary, patch) {
  const out = {};
  for (const [key, entry] of Object.entries(glossary)) {
    out[key] = { ...entry };
  }
  for (const [key, def] of Object.entries(patch)) {
    if (!(key in out)) {
      throw new Error(`patch key "${key}" is not in the glossary`);
    }
    if (typeof def.defEn !== "string" || def.defEn.trim() === "") {
      throw new Error(`patch key "${key}": defEn must be a non-empty string`);
    }
    if (typeof def.defRu !== "string" || def.defRu.trim() === "") {
      throw new Error(`patch key "${key}": defRu must be a non-empty string`);
    }
    out[key] = { ...out[key], defEn: def.defEn, defRu: def.defRu };
  }
  return out;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const patchPath = process.argv[2];
  if (!patchPath) {
    console.error("usage: node scripts/merge-definitions.mjs <patch.json>");
    process.exit(1);
  }
  const glossaryPath = new URL("../src/i18n/glossary.json", import.meta.url);
  const glossary = JSON.parse(readFileSync(glossaryPath, "utf8"));
  const patch = JSON.parse(readFileSync(patchPath, "utf8"));
  const merged = applyPatch(glossary, patch);
  writeFileSync(glossaryPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`merged ${Object.keys(patch).length} definitions into glossary.json`);
}
