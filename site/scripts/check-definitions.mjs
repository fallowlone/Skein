// Verify glossary terms have non-empty defEn + defRu.
// Usage: node scripts/check-definitions.mjs key1,key2,...
//        node scripts/check-definitions.mjs --all
import { readFileSync } from "node:fs";

const glossaryPath = new URL("../src/i18n/glossary.json", import.meta.url);
const glossary = JSON.parse(readFileSync(glossaryPath, "utf8"));
const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/check-definitions.mjs <key,key,...|--all>");
  process.exit(1);
}

const keys = arg === "--all" ? Object.keys(glossary) : arg.split(",").map((k) => k.trim()).filter(Boolean);
const missing = [];
for (const k of keys) {
  const e = glossary[k];
  if (!e) { missing.push(`${k} (absent)`); continue; }
  const okEn = typeof e.defEn === "string" && e.defEn.trim() !== "";
  const okRu = typeof e.defRu === "string" && e.defRu.trim() !== "";
  if (!okEn || !okRu) missing.push(`${k} (${!okEn ? "no defEn" : ""}${!okEn && !okRu ? ", " : ""}${!okRu ? "no defRu" : ""})`);
}
if (arg === "--all") {
  const done = keys.length - missing.length;
  console.log(`glossary: ${done}/${keys.length} terms have EN+RU definitions`);
}
if (missing.length) {
  console.error(`MISSING (${missing.length}):\n  ` + missing.join("\n  "));
  process.exit(1);
}
console.log(`OK — ${keys.length} term(s) have EN+RU definitions`);
