// Gate for diagnostic banks: shape, bilingual parity, answer sanity. Exit 1 on any violation.
// Run after authoring and before build-diag-bundle.mjs.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path/diagnostics");
const concepts = new Set(
  JSON.parse(readFileSync(join(DIR, "../concepts.json"), "utf8")).map((c) => c.id),
);
const errors = [];
const biText = (x) => x && typeof x.en === "string" && x.en.trim().length > 0 && typeof x.ru === "string" && x.ru.trim().length > 0;

for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
  const err = (msg) => errors.push(`${f}: ${msg}`);
  let bank;
  try { bank = JSON.parse(readFileSync(join(DIR, f), "utf8")); } catch (e) { err(`unparseable: ${e.message}`); continue; }
  if (bank.concept !== f.replace(/\.json$/, "")) err(`concept "${bank.concept}" != filename`);
  if (!concepts.has(bank.concept)) err(`concept "${bank.concept}" not in concepts.json`);
  if (!Array.isArray(bank.items) || bank.items.length < 2 || bank.items.length > 4) err(`items must be 2..4, got ${bank.items?.length}`);
  const ids = new Set();
  for (const it of bank.items ?? []) {
    if (!it.id || ids.has(it.id)) err(`item id missing/duplicate: ${it.id}`);
    ids.add(it.id);
    if (!biText(it.prompt)) err(`${it.id}: prompt must be non-empty bilingual {en,ru}`);
    if (it.type === "mcq") {
      if (!Array.isArray(it.choices) || it.choices.length < 3) err(`${it.id}: mcq needs >=3 choices`);
      else {
        for (const ch of it.choices) if (!biText(ch)) err(`${it.id}: every choice must be bilingual`);
        if (!Number.isInteger(it.answer) || it.answer < 0 || it.answer >= it.choices.length) err(`${it.id}: answer index out of range`);
      }
    } else if (it.type === "blanks") {
      if (!Array.isArray(it.answer) || !it.answer.length || it.answer.some((a) => typeof a !== "string" || !a.trim())) err(`${it.id}: blanks answer must be non-empty string[]`);
      if (!/____/.test(it.prompt?.en ?? "") || !/____/.test(it.prompt?.ru ?? "")) err(`${it.id}: blanks prompt must contain ____ in both locales`);
    } else err(`${it.id}: unknown type "${it.type}"`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`validate-diag-banks: ${readdirSync(DIR).filter((x) => x.endsWith(".json")).length} banks OK`);
