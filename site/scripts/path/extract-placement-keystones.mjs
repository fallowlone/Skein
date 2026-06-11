// Deterministic placement-keystone shortlist: per (domain family × band) cell, the top concepts
// by closure gain (|ancestors| + |descendants| in the concept DAG) — a diagnostic pass/fail on
// such a concept re-colors the largest region via applyDiagnostic propagation.
// Family→track mapping mirrors src/scripts/path/mastery-field.ts DOMAIN_FAMILIES — keep in sync.
// Writes /tmp/placement-keystones.json and prints a summary.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(ROOT, "src/content/path");
const concepts = JSON.parse(readFileSync(join(SRC, "concepts.json"), "utf8"));
const units = JSON.parse(readFileSync(join(SRC, "unit-concepts.json"), "utf8"));
const diagnosed = new Set(
  readdirSync(join(SRC, "diagnostics")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")),
);

const FAMILIES = [
  { key: "foundations", tracks: ["math", "base-cs", "algorithms", "logic"] },
  { key: "frontend", tracks: ["browser", "frontend", "typescript", "js-engine", "react", "nextjs"] },
  { key: "backend", tracks: ["backend", "apis", "node", "nest", "python", "go"] },
  { key: "data", tracks: ["databases", "sql-postgres", "caching", "data-engineering"] },
  { key: "distributed", tracks: ["distributed", "queues", "system-design", "system-design-cases"] },
  { key: "network-sec", tracks: ["networking", "security"] },
  { key: "infra", tracks: ["deployment", "aws", "ci-cd", "docker", "observability", "performance", "engineering-practice"] },
  { key: "ai", tracks: ["ai-llm"] },
];
const BANDS = ["surface", "middle", "advanced"];
const PER_CELL = 5;

const familyOf = new Map();
for (const f of FAMILIES) for (const t of f.tracks) familyOf.set(t, f.key);

// teaching units per concept (authoring sources for the bank).
const teachers = new Map();
for (const [unitId, v] of Object.entries(units)) {
  for (const c of v.teaches) {
    const arr = teachers.get(c) ?? [];
    arr.push(unitId);
    teachers.set(c, arr);
  }
}

// adjacency + closure sizes (iterative DFS, both directions).
const requires = new Map(concepts.map((c) => [c.id, c.requires]));
const requiredBy = new Map();
for (const c of concepts) for (const r of c.requires) {
  const arr = requiredBy.get(r) ?? [];
  arr.push(c.id);
  requiredBy.set(r, arr);
}
const closureSize = (start, adj) => {
  const seen = new Set();
  const stack = [...(adj.get(start) ?? [])];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of adj.get(id) ?? []) stack.push(n);
  }
  return seen.size;
};

const clean = (c) =>
  teachers.has(c.id) && /^[a-z0-9]/i.test(c.id) && c.label?.en && c.label.en === c.label.en.trim() &&
  c.label.en.length > 1 && !diagnosed.has(c.id);

const scored = concepts.filter(clean).map((c) => ({
  id: c.id, label: c.label, track: c.track, band: c.band,
  family: familyOf.get(c.track),
  gain: closureSize(c.id, requires) + closureSize(c.id, requiredBy),
  units: (teachers.get(c.id) ?? []).slice(0, 3),
})).filter((c) => c.family);

const out = [];
for (const f of FAMILIES) for (const band of BANDS) {
  const cell = scored
    .filter((c) => c.family === f.key && c.band === band)
    .sort((a, b) => b.gain - a.gain || a.id.localeCompare(b.id))
    .slice(0, PER_CELL);
  out.push(...cell);
}

writeFileSync("/tmp/placement-keystones.json", JSON.stringify(out, null, 2) + "\n");
const byFam = {};
for (const c of out) byFam[c.family] = (byFam[c.family] ?? 0) + 1;
console.log(JSON.stringify({ total: out.length, byFamily: byFam, minGain: Math.min(...out.map((c) => c.gain)) }, null, 2));
