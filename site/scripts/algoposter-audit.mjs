// AlgoPoster audit: js-engine lessons must carry no AlgoPoster embeds.
// Usage: node scripts/algoposter-audit.mjs [--all]
//   (default: js-engine only; --all: every track)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = "src/content/lessons";
const scopeAll = process.argv.includes("--all");
const tracks = scopeAll
  ? readdirSync(root)
  : ["js-engine"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".mdx")) out.push(p);
  }
  return out;
}

let failures = 0;
for (const track of tracks) {
  const dir = join(root, track);
  let files = [];
  try {
    files = walk(dir);
  } catch {
    continue;
  }
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (src.includes("AlgoPoster")) {
      console.log(`FAIL ${f}`);
      failures++;
    }
  }
}

if (failures === 0) {
  console.log(`algoposter-audit OK — 0 AlgoPoster embeds in ${scopeAll ? "all tracks" : "js-engine"}`);
} else {
  console.log(`algoposter-audit FAILED — ${failures} lesson(s) still embed AlgoPoster`);
  process.exit(1);
}
