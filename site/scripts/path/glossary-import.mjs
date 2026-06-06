import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const norm = (s) => s.toLowerCase().replace(/[_-]/g, "-");

// Pure: { conceptId: ru } for every concept whose id matches a glossary key (normalized) that has
// a real ru (ru !== en). Used to seed concept-labels.json deterministically (no LLM).
export function glossaryRuMap(glossary, concepts) {
  const gidx = new Map();
  for (const k of Object.keys(glossary)) {
    const e = glossary[k];
    if (e && typeof e.ru === "string" && e.ru.trim() && e.ru !== e.en) gidx.set(norm(k), e.ru.trim());
  }
  const out = {};
  for (const c of concepts) {
    const ru = gidx.get(norm(c.id));
    if (ru) out[c.id] = ru;
  }
  return out;
}

if (import.meta.main) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const OUT = join(__dirname, "../../src/content/path");
  const glossary = JSON.parse(readFileSync(join(__dirname, "../../src/i18n/glossary.json"), "utf8"));
  const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));
  const file = join(OUT, "concept-labels.json");
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const fromGlossary = glossaryRuMap(glossary, concepts);
  const merged = { ...fromGlossary, ...existing }; // existing curated entries win
  const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`glossary-import: ${Object.keys(fromGlossary).length} from glossary, ${Object.keys(sorted).length} total in concept-labels.json`);
}
