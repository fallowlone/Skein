// Merge authored IRT params into diagnostic source banks.
//
// Reads one or more JSON files of shape { "<itemId>": { b, a, c }, ... } (from the
// IRT-authoring workflow) and writes `irt` onto matching items in
// src/content/path/diagnostics/<concept>.json. Idempotent; validates ranges before any write.
//
// Usage: node scripts/path/author-irt.mjs <params1.json> [<params2.json> ...]
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path/diagnostics");

const valid = (v) =>
  v && typeof v.b === "number" && typeof v.a === "number" && typeof v.c === "number" &&
  v.a > 0 && v.c >= 0 && v.c < 1 && Math.abs(v.b) <= 4;

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("usage: node author-irt.mjs <params.json> [<params.json> ...]");
  process.exit(1);
}

// Merge all param maps; last writer wins on duplicate item ids.
const params = {};
for (const p of paths) {
  const m = JSON.parse(readFileSync(p, "utf8"));
  for (const [id, v] of Object.entries(m)) params[id] = v;
}
for (const [id, v] of Object.entries(params)) {
  if (!valid(v)) { console.error("bad params for", id, JSON.stringify(v)); process.exit(2); }
}

let touched = 0, banks = 0;
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
  const fp = join(DIR, f);
  const bank = JSON.parse(readFileSync(fp, "utf8"));
  let changed = false;
  for (const item of bank.items ?? []) {
    if (params[item.id]) {
      const { b, a, c } = params[item.id];
      item.irt = { b, a, c };
      changed = true;
      touched++;
    }
  }
  if (changed) { writeFileSync(fp, JSON.stringify(bank, null, 2) + "\n"); banks++; }
}
console.log(`author-irt: applied params to ${touched} items across ${banks} banks (from ${Object.keys(params).length} authored)`);
