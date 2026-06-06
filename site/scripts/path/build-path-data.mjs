// site/scripts/path/build-path-data.mjs
//
// P1 path-engine data assembler (DETERMINISTIC — no network, no LLM, no clock).
// "Scripts-as-data" per spec §7: the LLM touchpoint is the Workflow that writes
// per-concept enrichment into `.path-cache/`; this script is the pure, idempotent
// assembler that reads lesson frontmatter + units.json + practice + that cache and
// emits the committed artifacts under src/content/path/.
//
// Output is fully sorted/stable so reruns diff cleanly.
//
// Usage:
//   bun scripts/path/build-path-data.mjs                 # all 274 units
//   bun scripts/path/build-path-data.mjs --tracks networking,databases,distributed
//
// Sources of truth (read-only):
//   src/content/units.json                       unit order/track/title{en,ru}/lessons
//   src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx   concepts/level/prereqs/prose
//   src/content/practice/<track>/<unit>/<lesson>.json          task.estMin
//   src/components/atlas/track-band.ts (bandOf)   track→band fallback
//   .path-cache/labels.json                       { conceptId: { en, ru } }   (LLM enrichment, optional)
//   .path-cache/diagnostics/<concept>.json        per-concept item banks       (LLM enrichment, optional)

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", ".."); // site/
const LESSONS_EN = join(SITE, "src/content/lessons/en");
const PRACTICE = join(SITE, "src/content/practice");
const UNITS_JSON = join(SITE, "src/content/units.json");
const OUT = join(SITE, "src/content/path");
const CACHE = join(SITE, ".path-cache");

const WPM = 200; // documented, tunable reading speed
const DEPTH_FACTOR = { zero: 0.8, junior: 1.0, middle: 1.15, senior: 1.3, "": 1.0 };
const LEVEL_BAND = { zero: "foundations", junior: "surface", middle: "middle", senior: "advanced" };
const BAND_RANK = { foundations: 0, surface: 1, middle: 2, advanced: 3 };

// Band fallback per track, mirrored from src/components/atlas/track-band.ts (kept in sync manually;
// only used when a concept has no lesson `level`).
const TRACK_BAND = {
  math: "foundations", "base-cs": "foundations", algorithms: "foundations",
  networking: "surface", browser: "surface", frontend: "surface", backend: "surface",
  apis: "surface", databases: "surface", caching: "surface", queues: "surface",
  "sql-postgres": "surface", "js-engine": "surface", typescript: "surface",
  distributed: "middle", observability: "middle", security: "middle", "system-design": "middle",
  "ai-llm": "advanced", "data-engineering": "advanced", deployment: "advanced",
  performance: "advanced", "engineering-practice": "advanced", "system-design-cases": "advanced",
  python: "surface", aws: "advanced", "ci-cd": "advanced", node: "surface", nest: "surface",
};

const ACRONYMS = new Set([
  "tcp", "ip", "udp", "tls", "ssl", "dns", "http", "https", "http2", "http3", "quic", "cdn",
  "sql", "api", "rest", "grpc", "jwt", "css", "html", "dom", "cpu", "gpu", "ram", "io", "os",
  "mvcc", "acid", "base", "wal", "orm", "ssr", "csr", "spa", "pwa", "jsx", "json", "yaml", "xml",
  "url", "uri", "uuid", "crud", "cors", "csrf", "xss", "ci", "cd", "aws", "gcp", "s3", "ec2",
  "k8s", "tcp/ip", "rtt", "mtu", "isn", "ttl", "nat", "vpn", "bgp", "arp", "icmp", "ack", "syn",
  "lru", "lfu", "gc", "vm", "jit", "ast", "abi", "ffi", "rpc", "p2p", "sse", "ws", "ai", "llm",
  "rag", "gpt", "etl", "elt", "olap", "oltp", "ddl", "dml", "pii", "saas", "iam", "vpc", "ebs",
]);

// ---------------------------------------------------------------------------
// frontmatter parsing
// ---------------------------------------------------------------------------
function parseFrontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { scalars: {}, lists: {}, bodyStart: 0 };
  const lines = m[1].split("\n");
  const scalars = {};
  const lists = {};
  let cur = null;
  for (const ln of lines) {
    const li = ln.match(/^\s*-\s+(.*)$/);
    if (li && cur) { lists[cur].push(unquote(li[1].trim())); continue; }
    const kv = ln.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (kv) {
      const k = kv[1]; const v = kv[2].trim();
      if (v === "") { cur = k; lists[k] = []; scalars[k] = ""; }
      else { cur = null; scalars[k] = unquote(v); }
    }
  }
  return { scalars, lists, bodyStart: m[0].length };
}
function unquote(s) { return s.replace(/^['"]|['"]$/g, ""); }

function isLessonSlug(slug) { return /^\d{2}-/.test(slug); } // real lessons are NN-…; quiz-*/project are not

// approximate prose word count: drop frontmatter, imports, JSX tags + {expr}
function wordCount(body) {
  let t = body
    .replace(/^import\s.*$/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")        // fenced code
    .replace(/<[^>]+>/g, " ")               // JSX/HTML tags
    .replace(/\{[^{}]*\}/g, " ")            // simple JSX expressions/attrs
    .replace(/[#>*_`|\-]/g, " ");
  const words = t.split(/\s+/).filter((w) => /[A-Za-zА-Яа-я0-9]/.test(w));
  return words.length;
}

// ---------------------------------------------------------------------------
// harvest
// ---------------------------------------------------------------------------
function walkLessonDirs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkLessonDirs(p));
    else if (e.name === "index.mdx") out.push(p);
  }
  return out;
}

function harvest(trackFilter) {
  const unitsMeta = JSON.parse(readFileSync(UNITS_JSON, "utf8"));
  const metaById = new Map(unitsMeta.map((u) => [u.id, u]));

  // unitId -> { id, track, order, unitSlug, title, lessons:[{slug, level, concepts, words}] }
  const units = new Map();
  // conceptId -> { levels:Set, tracks:Map, units:Set }
  const concepts = new Map();

  for (const file of walkLessonDirs(LESSONS_EN)) {
    const raw = readFileSync(file, "utf8");
    const { scalars, lists, bodyStart } = parseFrontmatter(raw);
    const slug = scalars.slug || "";
    if (!isLessonSlug(slug)) continue;
    const track = scalars.track;
    const unitSlug = scalars.unit;
    if (!track || !unitSlug) continue;
    if (trackFilter && !trackFilter.has(track)) continue;
    const unitId = `${track}/${unitSlug}`;
    const meta = metaById.get(unitId);
    if (!units.has(unitId)) {
      units.set(unitId, {
        id: unitId, track, order: meta?.order ?? 999, unitSlug,
        title: meta?.title ?? { en: humanize(unitSlug.replace(/^\d{2}-/, "")), ru: "" },
        lessons: [],
      });
    }
    const level = scalars.level || "";
    const cs = lists.concepts || [];
    const words = wordCount(raw.slice(bodyStart));
    units.get(unitId).lessons.push({ slug, level, concepts: cs, words });
    for (const c of cs) {
      if (!concepts.has(c)) concepts.set(c, { levels: new Set(), tracks: new Map(), units: new Set() });
      const rec = concepts.get(c);
      if (level) rec.levels.add(level);
      rec.tracks.set(track, (rec.tracks.get(track) || 0) + 1);
      rec.units.add(unitId);
    }
  }

  // units with zero harvested concepts get a synthetic spine concept so they still
  // teach ≥1 concept (validator: every unit reachable; planner: no empty teaches).
  for (const [unitId, u] of units) {
    const taught = new Set(u.lessons.flatMap((l) => l.concepts));
    if (taught.size === 0) {
      const synth = `${u.track}-${u.unitSlug.replace(/^\d{2}-/, "")}`;
      concepts.set(synth, { levels: new Set([maxLevelOf(u)]), tracks: new Map([[u.track, 1]]), units: new Set([unitId]) });
      u.lessons.push({ slug: "00-synthetic", level: maxLevelOf(u), concepts: [synth], words: 0 });
    }
  }
  return { units, concepts, metaById };
}

function maxLevelOf(u) {
  const order = ["zero", "junior", "middle", "senior"];
  let best = "junior";
  for (const l of u.lessons) if (l.level && order.indexOf(l.level) > order.indexOf(best)) best = l.level;
  return best;
}

// ---------------------------------------------------------------------------
// derivations
// ---------------------------------------------------------------------------
function humanize(id) {
  return id.split(/[-/]/).map((tok, i) => {
    if (ACRONYMS.has(tok.toLowerCase())) return tok.toUpperCase();
    return i === 0 ? tok.charAt(0).toUpperCase() + tok.slice(1) : tok;
  }).join(" ");
}

function bandOfConcept(rec) {
  // highest band implied by the lesson levels teaching the concept; fall back to track band.
  let best = -1;
  for (const lvl of rec.levels) {
    const b = LEVEL_BAND[lvl];
    if (b && BAND_RANK[b] > best) best = BAND_RANK[b];
  }
  if (best >= 0) return Object.keys(BAND_RANK).find((k) => BAND_RANK[k] === best);
  const track = primaryTrack(rec);
  return TRACK_BAND[track] || "surface";
}

function primaryTrack(rec) {
  let bestT = null, bestN = -1;
  for (const [t, n] of [...rec.tracks].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (n > bestN) { bestN = n; bestT = t; }
  }
  return bestT;
}

// per-track unit order + anchors → sparse acyclic concept spine.
function buildSpine(units, concepts) {
  const seq = (u) => u.order * 1000;
  const unitList = [...units.values()];
  // firstUnit(concept) = teaching unit with the smallest (trackOrder*1000+unitOrder); tie by id.
  const firstUnit = new Map();
  for (const [cid, rec] of concepts) {
    let best = null;
    for (const uid of rec.units) {
      const u = units.get(uid);
      if (!u) continue;
      const s = seq(u);
      if (!best || s < best.s || (s === best.s && uid < best.uid)) best = { s, uid };
    }
    if (best) firstUnit.set(cid, best.uid);
  }
  // anchor(unit) = first concept (in lesson order) that is first-introduced in this unit.
  const anchor = new Map();
  for (const u of unitList) {
    let pick = null;
    for (const l of u.lessons) {
      for (const c of l.concepts) {
        if (firstUnit.get(c) === u.id) { pick = c; break; }
      }
      if (pick) break;
    }
    if (!pick) {
      // every concept reused from earlier units; anchor on the first taught concept anyway.
      pick = u.lessons.flatMap((l) => l.concepts)[0] ?? null;
    }
    if (pick) anchor.set(u.id, pick);
  }
  // prevUnit(unit) = previous unit in the same track by order (within the filtered set).
  const byTrack = new Map();
  for (const u of unitList) { if (!byTrack.has(u.track)) byTrack.set(u.track, []); byTrack.get(u.track).push(u); }
  const prevAnchor = new Map(); // unitId -> anchor of previous same-track unit
  for (const [, arr] of byTrack) {
    arr.sort((a, b) => a.order - b.order);
    for (let i = 1; i < arr.length; i++) {
      const a = anchor.get(arr[i - 1].id);
      if (a) prevAnchor.set(arr[i].id, a);
    }
  }
  return { firstUnit, anchor, prevAnchor, seqOf: (uid) => seq(units.get(uid)) };
}

// drop edges that would create a cycle (Kahn; emit in stable order). Returns Map<id,string[]> kept edges.
function breakCycles(requiresMap, order) {
  const pos = new Map(order.map((id, i) => [id, i]));
  const kept = new Map();
  let dropped = 0;
  for (const [id, reqs] of requiresMap) {
    const safe = [];
    for (const r of reqs) {
      // keep edge id->r (id requires r) only if r is strictly earlier in the stable order.
      if (pos.has(r) && pos.get(r) < pos.get(id)) safe.push(r);
      else if (r !== id) dropped++;
    }
    kept.set(id, [...new Set(safe)].sort());
  }
  return { kept, dropped };
}

// ---------------------------------------------------------------------------
// estMin
// ---------------------------------------------------------------------------
function practiceMinutes(unit) {
  const dir = join(PRACTICE, unit.track, unit.unitSlug);
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      for (const t of j.tasks || []) total += Number(t.estMin) || 0;
    } catch { /* skip malformed */ }
  }
  return total;
}

function estMinOf(unit) {
  let reading = 0;
  for (const l of unit.lessons) {
    if (l.slug === "00-synthetic") continue;
    reading += Math.ceil(l.words / WPM) * (DEPTH_FACTOR[l.level] ?? 1.0);
  }
  return Math.max(5, Math.round(reading + practiceMinutes(unit)));
}

// ---------------------------------------------------------------------------
// goals
// ---------------------------------------------------------------------------
function pickConcepts(concepts, tracks, n) {
  const want = new Set(tracks);
  const cand = [...concepts.entries()]
    .filter(([, rec]) => want.has(primaryTrack(rec)))
    .map(([id, rec]) => [id, rec.units.size])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);
  if (cand.length >= 3) return cand.slice(0, n);
  // fallback: most-reused concepts overall (keeps the goal resolvable on a thin slice).
  const any = [...concepts.entries()]
    .map(([id, rec]) => [id, rec.units.size])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id);
  return [...new Set([...cand, ...any])].slice(0, n);
}

function buildGoals(concepts) {
  return [
    {
      id: "senior-fullstack",
      label: { en: "Become senior fullstack", ru: "Стать senior fullstack" },
      target: { rule: "band>=middle" },
      trackWeights: {
        distributed: 1.0, databases: 1.0, "system-design": 1.0, backend: 1.0,
        networking: 0.9, security: 0.9, frontend: 0.8, observability: 0.8, performance: 0.8,
      },
    },
    {
      id: "backend-job",
      label: { en: "Land a backend job", ru: "Получить бэкенд-работу" },
      target: { concepts: pickConcepts(concepts, ["backend", "databases", "apis", "caching", "queues", "networking"], 12) },
      trackWeights: { backend: 1.0, databases: 1.0, apis: 0.9, caching: 0.8, queues: 0.8, networking: 0.7 },
    },
    {
      id: "interview-prep",
      label: { en: "Prep for interviews", ru: "Подготовка к собеседованиям" },
      target: { concepts: pickConcepts(concepts, ["algorithms", "system-design", "databases", "distributed"], 12) },
      trackWeights: { algorithms: 1.0, "system-design": 1.0, databases: 0.8, distributed: 0.8, networking: 0.6 },
    },
    {
      id: "ai-engineer",
      label: { en: "Become an AI engineer", ru: "Стать AI-инженером" },
      target: { concepts: pickConcepts(concepts, ["ai-llm", "data-engineering", "python", "databases"], 12) },
      trackWeights: { "ai-llm": 1.0, "data-engineering": 1.0, python: 0.9, databases: 0.7, backend: 0.6 },
    },
  ];
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function loadLabelCache() {
  const f = join(CACHE, "labels.json");
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; }
}
function loadDiagnosedConcepts() {
  // diagnostics are committed artifacts under src/content/path/diagnostics/ (authored by the
  // enrichment subagents); the .path-cache copy is optional. Count the committed source.
  const dir = join(OUT, "diagnostics");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

function main() {
  const args = process.argv.slice(2);
  const ti = args.indexOf("--tracks");
  const trackFilter = ti >= 0 ? new Set(args[ti + 1].split(",")) : null;

  const { units, concepts } = harvest(trackFilter);
  const spine = buildSpine(units, concepts);
  const labelCache = loadLabelCache();

  // assemble concepts (sorted by id), requires = sparse spine edge.
  const rawRequires = new Map();
  for (const cid of concepts.keys()) {
    const fu = spine.firstUnit.get(cid);
    const pa = fu ? spine.prevAnchor.get(fu) : null;
    rawRequires.set(cid, pa && pa !== cid ? [pa] : []);
  }
  // stable order for cycle-break = by first-teaching-unit sequence (then id). Spine edges point
  // from a concept to the previous unit's anchor, i.e. monotone-decreasing in unit order, so this
  // ordering keeps every legitimate edge and only drops a genuine cycle (reuse pathology).
  const seqOfConcept = (id) => {
    const fu = spine.firstUnit.get(id);
    return fu ? spine.seqOf(fu) : Number.MAX_SAFE_INTEGER;
  };
  const stableOrder = [...concepts.keys()].sort((a, b) => seqOfConcept(a) - seqOfConcept(b) || a.localeCompare(b));
  const { kept, dropped } = breakCycles(rawRequires, stableOrder);

  const conceptsOut = [...concepts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([id, rec]) => {
    const cached = labelCache[id];
    const en = (cached && cached.en) || humanize(id);
    const ru = (cached && cached.ru) || humanize(id); // ru fallback = humanized en (flagged for morning review)
    return { id, label: { en, ru }, track: primaryTrack(rec), band: bandOfConcept(rec), requires: kept.get(id) || [] };
  });

  // unit-concepts (sorted by unit id).
  const unitConceptsOut = {};
  for (const u of [...units.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const teaches = [...new Set(u.lessons.flatMap((l) => l.concepts))].sort();
    const pa = spine.prevAnchor.get(u.id);
    const requires = pa && !teaches.includes(pa) ? [pa] : [];
    unitConceptsOut[u.id] = { teaches, requires, estMin: estMinOf(u) };
  }

  const goals = buildGoals(concepts);
  const overrides = { addEdges: [], removeEdges: [], retag: [] };

  // write
  mkdirSync(OUT, { recursive: true });
  mkdirSync(join(OUT, "diagnostics"), { recursive: true });
  writeFileSync(join(OUT, "concepts.json"), JSON.stringify(conceptsOut, null, 2) + "\n");
  writeFileSync(join(OUT, "unit-concepts.json"), JSON.stringify(unitConceptsOut, null, 2) + "\n");
  writeFileSync(join(OUT, "goals.json"), JSON.stringify(goals, null, 2) + "\n");
  writeFileSync(join(OUT, "concept-overrides.json"), JSON.stringify(overrides, null, 2) + "\n");
  // Diagnostics index: the island cannot readdir(), so emit the list of diagnosed
  // concept ids as committed JSON for path-io.ts to import.
  const diagnosedIds = loadDiagnosedConcepts().sort();
  writeFileSync(join(OUT, "diagnostics-index.json"), JSON.stringify(diagnosedIds, null, 2) + "\n");

  // Full diagnostic banks keyed by concept — the calibration island imports this (it can't readdir).
  const diagBundle = {};
  for (const id of diagnosedIds) {
    diagBundle[id] = JSON.parse(readFileSync(join(OUT, "diagnostics", `${id}.json`), "utf8"));
  }
  writeFileSync(join(OUT, "diagnostics-bundle.json"), JSON.stringify(diagBundle, null, 2) + "\n");

  const diagnosed = loadDiagnosedConcepts();
  const labeledRu = conceptsOut.filter((c) => labelCache[c.id]?.ru).length;
  console.log(JSON.stringify({
    tracks: trackFilter ? [...trackFilter] : "ALL",
    units: units.size, concepts: conceptsOut.length,
    edgesKept: [...kept.values()].reduce((n, a) => n + a.length, 0), edgesDropped: dropped,
    ruLabelsFromCache: labeledRu, diagnosedConcepts: diagnosed.length,
    goalTargets: Object.fromEntries(goals.map((g) => [g.id, g.target.concepts?.length ?? "rule"])),
  }, null, 2));
}

main();
