# Path Engine — Intra-Track Semantic Prerequisites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harvest lesson `prereqs` frontmatter into a curated-quality set of deterministic intra-track concept→concept prerequisite edges that enrich the concept DAG (content-pull + mastery), without touching unit ordering or P0.

**Architecture:** A pure `deriveIntraTrackEdges(units)` turns each lesson's declared sibling-lesson `prereqs` into `newConcept(L) → anchor(prereqLesson)` edges (cycle-safe, intra-track by construction). A focused regenerator `build-intra-edges.mjs` runs the derivation off lesson frontmatter and writes the committed `intra-track-edges.json` without a full harvest (mirroring `build-overrides.mjs`). Both `build-overrides.mjs` and the full `build-path-data.mjs` merge that file alongside `cross-track-edges.json` into the generated `concept-overrides.json`, through one shared Kahn acyclic gate. The runtime is unchanged: `safeApply` applies the new addEdges to `concept.requires`, and `deriveUnitRequires`'s existing `track(X)!==track(Y)` filter keeps intra edges out of unit ordering.

**Tech Stack:** JavaScript (Node/Bun ESM scripts), TypeScript (lint rule), Vitest, Astro 5, `bun`. P0 core and the runtime (`overrides.ts`, `path-io.ts`) are untouched.

**Spec:** `docs/superpowers/specs/2026-06-06-path-engine-intra-track-prerequisites-design.md`

**Conventions / gotchas (from project memory `[[project_path-engine]]`):**
- P0 files NOT modified: `graph.ts`, `types.ts`, `knowledge.ts`, `planner.ts`, `schedule.ts`, `config.ts`, `diagnostic-select.ts`. Runtime `overrides.ts` / `path-io.ts` NOT modified (this slice is build-side + lint only).
- `bun run check` has ~19 pre-existing errors (content.config.ts z-namespace etc.) — NOT ours; full `astro build` does not fail on them.
- Full `astro build` ~600s — run once at the end (Task 7), in background. **Do not switch branches while a background build runs.** During tasks use `bunx vitest run src/scripts/path/ scripts/path/ src/lint/rules/path.test.ts`.
- Vitest scans `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.{mjs,ts}` (see `vitest.config.ts`). `~` alias → `src/`.
- `build-path-data.mjs` calls `main()` unconditionally at top level → it cannot be imported for helper reuse; the focused regenerator is self-contained.
- Generated bundles are 2-space JSON. `intra-track-edges.json` and `concept-overrides.json` are generated (2-space) — never hand-edit; regenerate via the scripts.
- Recurring gotcha: orchestration/authoring subagents truncate their final report BEFORE the commit step (edits in the working tree, HEAD unmoved). After each subagent, verify `git status` / `git log` and finish the commit yourself.
- All work on branch `feat/path-engine-intra-track-edges` (already created off `main`, spec already committed there).

---

## File structure

| File | Responsibility | Task |
|------|----------------|------|
| `site/scripts/path/intra-track-derive.mjs` | **new** pure `deriveIntraTrackEdges(units)` → `{edges, warnings}` | 1 |
| `site/scripts/path/intra-track-derive.test.mjs` | **new** tests for the derivation | 1 |
| `site/scripts/path/intra-track-merge.mjs` | **new** pure `mergeIntraTrackEdges(rawEdges, conceptsOut)` (inverse filter + spine-dup drop) | 2 |
| `site/scripts/path/intra-track-merge.test.mjs` | **new** tests for the merge | 2 |
| `site/scripts/path/acyclic-gate.mjs` | **new** shared Kahn `isAcyclicWithEdges(concepts, addEdges)` | 3 |
| `site/scripts/path/build-overrides.mjs` | merge intra-track-edges.json too; route Kahn through the shared gate | 3 |
| `site/scripts/path/build-intra-edges.mjs` | **new** focused regenerator: lesson `prereqs` → `intra-track-edges.json` (no full harvest) | 4 |
| `site/scripts/path/build-path-data.mjs` | capture `prereqs`; derive + write intra edges; merge intra+cross (future idempotency) | 4 |
| `site/src/lint/rules/path.ts` | validate `intra-track-edges.json` source shape | 5 |
| `site/src/lint/rules/path.test.ts` | test for the new lint check | 5 |
| `site/src/content/path/intra-track-edges.json` | **new** generated-committed edge list | 6 |
| `site/src/content/path/concept-overrides.json` | regenerated — `addEdges` now carries cross + intra | 6 |

---

## Task 1: `deriveIntraTrackEdges` — `prereqs` → concept edges (pure)

**Files:**
- Create: `site/scripts/path/intra-track-derive.mjs`
- Test: `site/scripts/path/intra-track-derive.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `site/scripts/path/intra-track-derive.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { deriveIntraTrackEdges } from "./intra-track-derive.mjs";

// One databases unit, three lessons. 01 introduces b-tree+page; 02 introduces index-scan (reuses
// b-tree) and prereqs 01; 03 introduces hash-join (reuses index-scan) and prereqs 02 + a missing slug.
const UNITS = [{
  id: "databases/01-x", track: "databases", order: 1, unitSlug: "01-x",
  lessons: [
    { slug: "01-basics", concepts: ["b-tree", "page"], prereqs: [] },
    { slug: "02-index", concepts: ["index-scan", "b-tree"], prereqs: ["01-basics"] },
    { slug: "03-join", concepts: ["hash-join", "index-scan"], prereqs: ["02-index", "99-missing"] },
  ],
}];

describe("deriveIntraTrackEdges", () => {
  it("links each lesson's new concepts to the prereq lesson's anchor; skips reused concepts", () => {
    const { edges } = deriveIntraTrackEdges(UNITS);
    const pairs = edges.map((e) => `${e.concept}->${e.requires}`).sort();
    // 02-index new=[index-scan] → anchor(01-basics)=b-tree ; 03-join new=[hash-join] → anchor(02-index)=index-scan
    expect(pairs).toEqual(["hash-join->index-scan", "index-scan->b-tree"]);
    // a reused concept (b-tree in 02) never becomes a NEW edge source
    expect(edges.find((e) => e.concept === "b-tree")).toBeUndefined();
  });

  it("tags edges with the lesson track and warns on an unresolved sibling prereq", () => {
    const { edges, warnings } = deriveIntraTrackEdges(UNITS);
    expect(edges.every((e) => e.track === "databases")).toBe(true);
    expect(warnings.some((w) => w.includes("99-missing"))).toBe(true);
  });

  it("drops a forward (cycle-forming) prereq — anchor must be strictly earlier", () => {
    const FWD = [{
      id: "t/01", track: "t", order: 1, unitSlug: "01",
      lessons: [
        { slug: "01-a", concepts: ["a"], prereqs: ["02-b"] }, // forward: 01 declares 02 as prereq
        { slug: "02-b", concepts: ["b"], prereqs: [] },
      ],
    }];
    expect(deriveIntraTrackEdges(FWD).edges).toEqual([]);
  });

  it("falls back to the first listed concept when a prereq lesson introduces nothing new", () => {
    const FB = [{
      id: "t/01", track: "t", order: 1, unitSlug: "01",
      lessons: [
        { slug: "01-a", concepts: ["x"], prereqs: [] },
        { slug: "02-b", concepts: ["x"], prereqs: [] },        // reuses x, introduces nothing new
        { slug: "03-c", concepts: ["y"], prereqs: ["02-b"] },  // anchor(02-b) falls back to x
      ],
    }];
    expect(deriveIntraTrackEdges(FB).edges.map((e) => `${e.concept}->${e.requires}`)).toEqual(["y->x"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd site && bunx vitest run scripts/path/intra-track-derive.test.mjs`
Expected: FAIL — cannot resolve `./intra-track-derive.mjs`.

- [ ] **Step 3: Implement the derivation**

Create `site/scripts/path/intra-track-derive.mjs`:

```js
// Derive intra-track concept→concept prerequisite edges from lesson `prereqs` (sibling lesson
// slugs within a unit). Pure & deterministic — no I/O, no clock. Each lesson L's NEWLY-introduced
// concepts require the ANCHOR concept of each resolved prereq lesson P (anchor = first concept
// first-introduced in P; fallback P.concepts[0]). An edge c→a is emitted only when a's first
// lesson is strictly earlier than L in the stable lesson sequence (cycle-safe). Intra-track is
// guaranteed because prereqs resolve to siblings in the same unit (hence same track).
//
// Input `unitList`: iterable of { id, track, order, unitSlug, lessons: [{ slug, concepts, prereqs }] }.
// Returns { edges: [{concept, requires, via, track}] sorted, warnings: string[] }.
export function deriveIntraTrackEdges(unitList) {
  const units = [...unitList];
  const warnings = [];

  // Flatten to lessons with a stable per-unit index (lessons sorted by slug within a unit).
  const lessons = [];
  for (const u of units) {
    const sorted = [...u.lessons].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    sorted.forEach((l, idx) => lessons.push({
      unitId: u.id,
      track: u.track,
      slug: l.slug,
      idx,
      order: u.order ?? 999,
      concepts: l.concepts ?? [],
      prereqs: l.prereqs ?? [],
    }));
  }

  const seqOf = (l) => l.order * 1000 + l.idx;
  // strict ordering: seq, then unit id, then slug (deterministic across cross-track seq collisions).
  const earlier = (a, b) => {
    const sa = seqOf(a), sb = seqOf(b);
    if (sa !== sb) return sa - sb;
    if (a.unitId !== b.unitId) return a.unitId < b.unitId ? -1 : 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  };

  // firstLesson(concept) = earliest lesson (by `earlier`) teaching it.
  const firstLesson = new Map();
  for (const l of lessons) for (const c of l.concepts) {
    const cur = firstLesson.get(c);
    if (!cur || earlier(l, cur) < 0) firstLesson.set(c, l);
  }
  const isNewIn = (c, l) => firstLesson.get(c) === l;

  // anchor(lesson) = first concept first-introduced in it; fallback to first listed concept.
  const anchorOf = (l) => {
    for (const c of l.concepts) if (isNewIn(c, l)) return c;
    return l.concepts[0] ?? null;
  };

  // sibling lookup by slug within a unit.
  const byUnit = new Map();
  for (const l of lessons) {
    if (!byUnit.has(l.unitId)) byUnit.set(l.unitId, new Map());
    byUnit.get(l.unitId).set(l.slug, l);
  }

  const edges = [];
  const seen = new Set();
  for (const L of lessons) {
    if (!L.prereqs.length) continue;
    const newCs = L.concepts.filter((c) => isNewIn(c, L));
    if (!newCs.length) continue;
    for (const pslug of L.prereqs) {
      const P = byUnit.get(L.unitId)?.get(pslug);
      if (!P) { warnings.push(`intra-track-derive: ${L.unitId}/${L.slug} prereq "${pslug}" not a sibling lesson; skipped`); continue; }
      const a = anchorOf(P);
      if (!a) continue;
      const aFirst = firstLesson.get(a);
      if (!aFirst || earlier(aFirst, L) >= 0) continue; // anchor not strictly earlier → would risk a cycle
      for (const c of newCs) {
        if (c === a) continue;
        const k = `${c}|${a}`;
        if (seen.has(k)) continue;
        seen.add(k);
        edges.push({ concept: c, requires: a, via: `${L.slug}<-${P.slug}`, track: L.track });
      }
    }
  }

  edges.sort((x, y) => (x.concept < y.concept ? -1 : x.concept > y.concept ? 1 : x.requires < y.requires ? -1 : x.requires > y.requires ? 1 : 0));
  return { edges, warnings };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd site && bunx vitest run scripts/path/intra-track-derive.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/path/intra-track-derive.mjs site/scripts/path/intra-track-derive.test.mjs
git commit -m "feat(path): deriveIntraTrackEdges harvests lesson prereqs into concept edges

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `mergeIntraTrackEdges` — inverse-filter validator (pure)

**Files:**
- Create: `site/scripts/path/intra-track-merge.mjs`
- Test: `site/scripts/path/intra-track-merge.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `site/scripts/path/intra-track-merge.test.mjs`:

```js
import { describe, it, expect } from "vitest";
import { mergeIntraTrackEdges } from "./intra-track-merge.mjs";

// a,c,d in track x; b in track y. c already carries a base spine edge c->a.
const CONCEPTS = [
  { id: "a", track: "x", requires: [] },
  { id: "b", track: "y", requires: [] },
  { id: "c", track: "x", requires: ["a"] },
  { id: "d", track: "x", requires: [] },
];

describe("mergeIntraTrackEdges", () => {
  it("keeps a valid intra-track edge", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "d" }], CONCEPTS);
    expect(r.addEdges).toEqual([{ concept: "a", requires: "d" }]);
    expect(r.skipped).toBe(0);
  });
  it("drops cross-track edges", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "b" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(1);
  });
  it("skips unknown ids and self-loops", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "ghost" }, { concept: "a", requires: "a" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(2);
  });
  it("drops a spine-dup (edge already in the concept's base requires)", () => {
    const r = mergeIntraTrackEdges([{ concept: "c", requires: "a" }], CONCEPTS);
    expect(r.addEdges).toEqual([]);
    expect(r.skipped).toBe(1);
  });
  it("dedupes repeated edges", () => {
    const r = mergeIntraTrackEdges([{ concept: "a", requires: "d" }, { concept: "a", requires: "d" }], CONCEPTS);
    expect(r.addEdges).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });
  it("tolerates non-array / junk elements", () => {
    expect(mergeIntraTrackEdges(null, CONCEPTS).addEdges).toEqual([]);
    expect(mergeIntraTrackEdges([null, "x", { concept: 5 }], CONCEPTS).addEdges).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd site && bunx vitest run scripts/path/intra-track-merge.test.mjs`
Expected: FAIL — cannot resolve `./intra-track-merge.mjs`.

- [ ] **Step 3: Implement the merge**

Create `site/scripts/path/intra-track-merge.mjs`:

```js
// Pure validator/deduper for intra-track prerequisite edges (harvested from lesson `prereqs`).
// Inverse of cross-track-merge: KEEP track(concept) === track(requires); drop cross-track, unknown
// id, self-loop, duplicate, and spine-dup (an edge already present in the concept's base requires).
// Returns { addEdges, skipped, warnings }. Never throws so the build stays green.
export function mergeIntraTrackEdges(rawEdges, conceptsOut) {
  const warnings = [];
  if (!Array.isArray(rawEdges)) return { addEdges: [], skipped: 1, warnings: ["intra-track-edges: not an array; ignored"] };
  const trackOf = new Map(conceptsOut.map((c) => [c.id, c.track]));
  const baseReq = new Map(conceptsOut.map((c) => [c.id, new Set(c.requires ?? [])]));
  const addEdges = [];
  const seen = new Set();
  let skipped = 0;
  for (const e of rawEdges) {
    if (!e || typeof e.concept !== "string" || typeof e.requires !== "string") {
      skipped++; warnings.push(`intra-track-edges: malformed element ${JSON.stringify(e)}`); continue;
    }
    const tx = trackOf.get(e.concept), ty = trackOf.get(e.requires);
    if (tx === undefined || ty === undefined) { skipped++; warnings.push(`intra-track-edges: unknown id ${e.concept}→${e.requires}`); continue; }
    if (e.concept === e.requires) { skipped++; warnings.push(`intra-track-edges: self-loop ${e.concept}`); continue; }
    if (tx !== ty) { skipped++; warnings.push(`intra-track-edges: cross-track ${e.concept}→${e.requires} (${tx}/${ty})`); continue; }
    if (baseReq.get(e.concept)?.has(e.requires)) { skipped++; continue; } // spine-dup: already a base edge
    const k = `${e.concept}|${e.requires}`;
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    addEdges.push({ concept: e.concept, requires: e.requires });
  }
  return { addEdges, skipped, warnings };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd site && bunx vitest run scripts/path/intra-track-merge.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/path/intra-track-merge.mjs site/scripts/path/intra-track-merge.test.mjs
git commit -m "feat(path): mergeIntraTrackEdges (keep intra, drop cross/self/dup/spine-dup)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Shared acyclic gate + wire `build-overrides.mjs`

**Files:**
- Create: `site/scripts/path/acyclic-gate.mjs`
- Modify: `site/scripts/path/build-overrides.mjs` (full rewrite — small file)

- [ ] **Step 1: Create the shared Kahn gate**

Create `site/scripts/path/acyclic-gate.mjs`:

```js
// Shared Kahn acyclicity check over base concept.requires + a set of override addEdges.
// Returns { ok, unplaced } where unplaced is the count of nodes left in a cycle (0 ⇒ acyclic).
// Used by build-overrides.mjs and build-path-data.mjs to gate the merged override set before
// writing concept-overrides.json. Kept behaviourally equivalent to the TS lint rule's cycleNodes
// (src/lint/rules/path.ts).
export function isAcyclicWithEdges(concepts, addEdges) {
  const req = new Map(concepts.map((c) => [c.id, [...(c.requires ?? [])]]));
  for (const e of addEdges) { const a = req.get(e.concept); if (a && !a.includes(e.requires)) a.push(e.requires); }
  const ids = new Set(req.keys());
  const indeg = new Map([...ids].map((id) => [id, 0]));
  const deps = new Map();
  for (const id of ids) for (const r of req.get(id)) {
    if (!ids.has(r)) continue;
    indeg.set(id, indeg.get(id) + 1);
    if (!deps.has(r)) deps.set(r, []);
    deps.get(r).push(id);
  }
  const q = [...ids].filter((id) => indeg.get(id) === 0);
  let placed = 0;
  while (q.length) {
    const id = q.shift(); placed++;
    for (const d of deps.get(id) ?? []) { indeg.set(d, indeg.get(d) - 1); if (indeg.get(d) === 0) q.push(d); }
  }
  return { ok: placed === ids.size, unplaced: ids.size - placed };
}
```

- [ ] **Step 2: Rewrite `build-overrides.mjs` to merge intra + route through the shared gate**

Replace the entire contents of `site/scripts/path/build-overrides.mjs` with:

```js
// Regenerate ONLY src/content/path/concept-overrides.json from the committed concepts.json +
// curated cross-track-edges.json + generated intra-track-edges.json. Avoids a full harvest
// (build-path-data.mjs) so this slice does not touch concepts.json / unit-concepts.json. Exits
// non-zero if the merged edges make the concept graph cyclic (so a bad edge is caught before
// commit; the path lint is the build-time gate).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeCrossTrackEdges } from "./cross-track-merge.mjs";
import { mergeIntraTrackEdges } from "./intra-track-merge.mjs";
import { isAcyclicWithEdges } from "./acyclic-gate.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));

function readEdges(name) {
  const f = join(OUT, name);
  if (!existsSync(f)) return [];
  try { return JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { console.warn(`${name}: parse failed (${e.message}); ignoring`); return []; }
}

const cross = mergeCrossTrackEdges(readEdges("cross-track-edges.json"), concepts);
const intra = mergeIntraTrackEdges(readEdges("intra-track-edges.json"), concepts);
for (const w of [...cross.warnings, ...intra.warnings]) console.warn(w);

// Union cross + intra, dedup by concept|requires (cross wins on a tie).
const seen = new Set();
const addEdges = [];
for (const e of [...cross.addEdges, ...intra.addEdges]) {
  const k = `${e.concept}|${e.requires}`;
  if (seen.has(k)) continue;
  seen.add(k);
  addEdges.push(e);
}

const gate = isAcyclicWithEdges(concepts, addEdges);
if (!gate.ok) {
  console.error(`cross/intra edges introduce a cycle (${gate.unplaced} nodes unplaced); aborting`);
  process.exit(1);
}

writeFileSync(join(OUT, "concept-overrides.json"), JSON.stringify({ addEdges, removeEdges: [], retag: [] }, null, 2) + "\n");
console.log(`concept-overrides.json: ${addEdges.length} merged (cross ${cross.addEdges.length}, intra ${intra.addEdges.length}); cross-skipped ${cross.skipped}, intra-skipped ${intra.skipped}`);
```

- [ ] **Step 3: Verify the regenerator is stable with the current data (intra file absent yet)**

`intra-track-edges.json` does not exist yet, so `readEdges` returns `[]` and the output must match the current committed `concept-overrides.json` (268 cross edges).

Run: `cd site && bun scripts/path/build-overrides.mjs && git diff --stat src/content/path/concept-overrides.json`
Expected: log `concept-overrides.json: 268 merged (cross 268, intra 0); …`; **no diff** to `concept-overrides.json`.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/path/acyclic-gate.mjs site/scripts/path/build-overrides.mjs
git commit -m "feat(path): shared acyclic gate + build-overrides merges intra-track edges

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Focused regenerator + wire the full harvester

**Files:**
- Create: `site/scripts/path/build-intra-edges.mjs`
- Modify: `site/scripts/path/build-path-data.mjs` (imports; lesson `prereqs` capture; merge block)

- [ ] **Step 1: Create the focused regenerator**

Create `site/scripts/path/build-intra-edges.mjs`:

```js
// Focused regenerator: harvest lesson `prereqs` → intra-track concept edges WITHOUT a full
// build-path-data harvest (so it never rewrites concepts.json / unit-concepts.json). Mirrors the
// "lightweight regenerator" precedent of build-overrides.mjs. Writes ONLY intra-track-edges.json;
// run build-overrides.mjs afterwards to merge it into concept-overrides.json.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveIntraTrackEdges } from "./intra-track-derive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..", "..");
const LESSONS_EN = join(SITE, "src/content/lessons/en");
const UNITS_JSON = join(SITE, "src/content/units.json");
const OUT = join(SITE, "src/content/path");

// Minimal frontmatter parser (scalars + block lists) — only what we need: slug/track/unit + the
// `concepts` and `prereqs` lists. Self-contained because build-path-data.mjs calls main() on import.
function parseFrontmatter(txt) {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { scalars: {}, lists: {} };
  const scalars = {}, lists = {};
  let cur = null;
  for (const ln of m[1].split("\n")) {
    const li = ln.match(/^\s*-\s+(.*)$/);
    if (li && cur) { lists[cur].push(li[1].trim().replace(/^['"]|['"]$/g, "")); continue; }
    const kv = ln.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (kv) {
      const k = kv[1], v = kv[2].trim();
      if (v === "") { cur = k; lists[k] = []; }
      else { cur = null; scalars[k] = v.replace(/^['"]|['"]$/g, ""); }
    }
  }
  return { scalars, lists };
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name === "index.mdx") out.push(p);
  }
  return out;
}

const meta = new Map(JSON.parse(readFileSync(UNITS_JSON, "utf8")).map((u) => [u.id, u]));
const units = new Map(); // unitId -> { id, track, order, unitSlug, lessons }
for (const file of walk(LESSONS_EN)) {
  const { scalars, lists } = parseFrontmatter(readFileSync(file, "utf8"));
  const slug = scalars.slug || "";
  if (!/^\d{2}-/.test(slug)) continue; // real lessons only (NN-…), matching build-path-data isLessonSlug
  const track = scalars.track, unitSlug = scalars.unit;
  if (!track || !unitSlug) continue;
  const id = `${track}/${unitSlug}`;
  if (!units.has(id)) units.set(id, { id, track, order: meta.get(id)?.order ?? 999, unitSlug, lessons: [] });
  units.get(id).lessons.push({ slug, concepts: lists.concepts || [], prereqs: lists.prereqs || [] });
}

const { edges, warnings } = deriveIntraTrackEdges([...units.values()]);
for (const w of warnings) console.warn(w);
writeFileSync(join(OUT, "intra-track-edges.json"), JSON.stringify(edges, null, 2) + "\n");
console.log(`intra-track-edges.json: ${edges.length} edges from ${units.size} units (${warnings.length} skipped prereqs)`);
```

- [ ] **Step 2: Run it to generate the artifact**

Run: `cd site && bun scripts/path/build-intra-edges.mjs`
Expected: writes `src/content/path/intra-track-edges.json`; logs `intra-track-edges.json: <N> edges from <M> units (…)` with N in the low thousands (est. 2000–3500) and M ≈ 274. (Data is committed in Task 6 — leave it in the working tree for now.)

- [ ] **Step 3: Wire `build-path-data.mjs` for future full-harvest idempotency**

Edit A — imports. Find (line ~26):

```js
import { mergeCrossTrackEdges } from "./cross-track-merge.mjs";
```

Replace with:

```js
import { mergeCrossTrackEdges } from "./cross-track-merge.mjs";
import { mergeIntraTrackEdges } from "./intra-track-merge.mjs";
import { deriveIntraTrackEdges } from "./intra-track-derive.mjs";
import { isAcyclicWithEdges } from "./acyclic-gate.mjs";
```

Edit B — capture `prereqs` in each lesson record. Find (line ~145):

```js
    units.get(unitId).lessons.push({ slug, level, concepts: cs, words });
```

Replace with:

```js
    units.get(unitId).lessons.push({ slug, level, concepts: cs, words, prereqs: lists.prereqs || [] });
```

Edit C — replace the cross-track merge block. Find this block (lines ~414-424):

```js
  const goals = buildGoals(concepts);
  let rawCrossTrack = [];
  const ctFile = join(OUT, "cross-track-edges.json");
  if (existsSync(ctFile)) {
    try { rawCrossTrack = JSON.parse(readFileSync(ctFile, "utf8")); }
    catch (e) { console.warn(`cross-track-edges.json: parse failed (${e.message}); ignoring`); }
  }
  const ctMerge = mergeCrossTrackEdges(rawCrossTrack, conceptsOut);
  for (const w of ctMerge.warnings) console.warn(w);
  const overrides = { addEdges: ctMerge.addEdges, removeEdges: [], retag: [] };
  console.log(`cross-track-edges: ${ctMerge.addEdges.length} merged, ${ctMerge.skipped} skipped`);
```

Replace with:

```js
  const goals = buildGoals(concepts);

  // Intra-track edges: derived deterministically from lesson `prereqs` (captured above). Written to
  // its own committed artifact so the lightweight regenerators (build-intra-edges.mjs /
  // build-overrides.mjs) stay in sync without a full harvest. Content-pull only — the runtime's
  // deriveUnitRequires filters intra-track edges out of unit ordering.
  const { edges: intraEdges, warnings: intraWarnings } = deriveIntraTrackEdges([...units.values()]);
  for (const w of intraWarnings) console.warn(w);
  writeFileSync(join(OUT, "intra-track-edges.json"), JSON.stringify(intraEdges, null, 2) + "\n");

  // Merge cross-track (curated) + intra-track (derived) edges into the generated concept-overrides.
  let rawCrossTrack = [];
  const ctFile = join(OUT, "cross-track-edges.json");
  if (existsSync(ctFile)) {
    try { rawCrossTrack = JSON.parse(readFileSync(ctFile, "utf8")); }
    catch (e) { console.warn(`cross-track-edges.json: parse failed (${e.message}); ignoring`); }
  }
  const ctMerge = mergeCrossTrackEdges(rawCrossTrack, conceptsOut);
  const itMerge = mergeIntraTrackEdges(intraEdges, conceptsOut);
  for (const w of [...ctMerge.warnings, ...itMerge.warnings]) console.warn(w);
  const seenOv = new Set();
  const mergedAddEdges = [];
  for (const e of [...ctMerge.addEdges, ...itMerge.addEdges]) {
    const k = `${e.concept}|${e.requires}`;
    if (seenOv.has(k)) continue;
    seenOv.add(k);
    mergedAddEdges.push(e);
  }
  const gate = isAcyclicWithEdges(conceptsOut, mergedAddEdges);
  if (!gate.ok) { console.error(`cross/intra edges introduce a cycle (${gate.unplaced} nodes unplaced); aborting`); process.exit(1); }
  const overrides = { addEdges: mergedAddEdges, removeEdges: [], retag: [] };
  console.log(`overrides: ${mergedAddEdges.length} addEdges (cross ${ctMerge.addEdges.length}, intra ${itMerge.addEdges.length})`);
```

(`existsSync`, `readFileSync`, `writeFileSync`, `join`, `OUT`, `conceptsOut`, `units` are all already in scope in `main()`.)

- [ ] **Step 4: Sanity-check the wiring compiles (no full harvest run)**

Running the full `build-path-data.mjs` is heavy and would rewrite `concepts.json`; we do NOT run it in this slice. Instead, confirm the module parses:

Run: `cd site && node --check scripts/path/build-path-data.mjs && echo "build-path-data parses"`
Expected: `build-path-data parses`.

- [ ] **Step 5: Commit the scripts (data committed separately in Task 6)**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/path/build-intra-edges.mjs site/scripts/path/build-path-data.mjs
git commit -m "feat(path): build-intra-edges regenerator + build-path-data wires intra edges

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Lint validation of the intra-track source

**Files:**
- Modify: `site/src/lint/rules/path.ts` (`PathData` interface; `validatePathData`; `checkPath`)
- Test: `site/src/lint/rules/path.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `site/src/lint/rules/path.test.ts` (self-contained `base` fixture so it does not depend on other blocks):

```ts
describe("intra-track-edges source validation", () => {
  const base = {
    concepts: [
      { id: "a", label: { en: "A", ru: "А" }, track: "x", band: "middle", requires: [] },
      { id: "b", label: { en: "B", ru: "Б" }, track: "y", band: "surface", requires: [] },
      { id: "c", label: { en: "C", ru: "В" }, track: "x", band: "surface", requires: [] },
    ],
    unitConcepts: { "x/01": { teaches: ["a", "c"], requires: [], estMin: 10 }, "y/01": { teaches: ["b"], requires: [], estMin: 10 } },
    goals: [{ id: "g", label: { en: "G", ru: "Г" }, target: { concepts: ["a"] } }],
    overrides: { addEdges: [], removeEdges: [], retag: [] },
    diagnostics: [],
  };

  it("accepts a valid intra-track edge", () => {
    const errs = validatePathData({ ...base, intraTrackEdges: [{ concept: "a", requires: "c" }] });
    expect(errs.filter((e) => e.includes("intra-track-edges"))).toEqual([]);
  });
  it("flags an unknown id", () => {
    const errs = validatePathData({ ...base, intraTrackEdges: [{ concept: "a", requires: "ghost" }] });
    expect(errs.some((e) => e.includes("intra-track-edges") && e.includes("ghost"))).toBe(true);
  });
  it("flags a cross-track edge in the intra source", () => {
    const errs = validatePathData({ ...base, intraTrackEdges: [{ concept: "a", requires: "b" }] });
    expect(errs.some((e) => e.includes("intra-track-edges") && e.includes("cross-track"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd site && bunx vitest run src/lint/rules/path.test.ts`
Expected: FAIL — `intraTrackEdges` is not on `PathData` (type error) / no such validation errors produced.

- [ ] **Step 3: Extend the lint rule**

In `site/src/lint/rules/path.ts`:

Edit A — add to the `PathData` interface, right after the `crossTrackEdges?` line (line ~49):

```ts
  intraTrackEdges?: { concept: string; requires: string }[]; // optional generated source (intra-track-edges.json)
```

Edit B — inside `validatePathData`, immediately after the existing cross-track-edges validation loop (after the line `if (tx && ty && tx === ty) push(`cross-track-edges: "${e.concept}→${e.requires}" is intra-track (${tx})`);` and its closing `}`, line ~163), insert:

```ts
  // intra-track-edges.json source sanity (if present): ids exist + genuinely intra-track + not self.
  for (const e of data.intraTrackEdges ?? []) {
    if (!e || typeof e.concept !== "string" || typeof e.requires !== "string") { push(`intra-track-edges malformed element`); continue; }
    if (!ids.has(e.concept)) push(`intra-track-edges: unknown concept "${e.concept}"`);
    if (!ids.has(e.requires)) push(`intra-track-edges: unknown prereq "${e.requires}"`);
    if (e.concept === e.requires) push(`intra-track-edges: self-loop "${e.concept}"`);
    const itx = trackById.get(e.concept), ity = trackById.get(e.requires);
    if (itx && ity && itx !== ity) push(`intra-track-edges: "${e.concept}→${e.requires}" is cross-track (${itx}/${ity})`);
  }
```

(`trackById` is the `const` declared just above the cross-track block — in scope here. `ids`, `push` are function-body locals.)

Edit C — in `checkPath`, after the `crossTrackEdges` read line (line ~206), add:

```ts
  const intraTrackEdges = (await readJson<{ concept: string; requires: string }[]>(join(dir, "intra-track-edges.json"))) ?? [];
```

Edit D — update the final `return` of `checkPath` (line ~222):

```ts
  return validatePathData({ concepts, unitConcepts, goals, overrides, diagnostics, crossTrackEdges, intraTrackEdges });
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd site && bunx vitest run src/lint/rules/path.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check our file**

Run: `cd site && bun run check 2>&1 | grep -E "rules/path\.ts" || echo "no new path.ts errors"`
Expected: `no new path.ts errors`.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/lint/rules/path.ts site/src/lint/rules/path.test.ts
git commit -m "feat(path): lint validates intra-track-edges.json source (ids exist + intra-track)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Generate + commit the data

**Files:**
- Modify (data): `site/src/content/path/intra-track-edges.json` (generated in Task 4 Step 2)
- Regenerate: `site/src/content/path/concept-overrides.json`

This task produces the committed data artifacts. No new code.

- [ ] **Step 1: (Re)generate the intra edges**

Run: `cd site && bun scripts/path/build-intra-edges.mjs`
Expected: `intra-track-edges.json: <N> edges from ~274 units (…)`, N in the low thousands.

- [ ] **Step 2: Regenerate `concept-overrides.json` (merge cross + intra, acyclic gate)**

Run: `cd site && bun scripts/path/build-overrides.mjs`
Expected: `concept-overrides.json: <268+M> merged (cross 268, intra M); …`, exit 0. If it reports a cycle (exit 1) the derivation's per-edge cycle guard missed a combined cross+intra cycle — inspect the logged unplaced count, and if needed temporarily remove the smallest offending intra edges; this should not happen given the derivation's strict-earlier rule.

- [ ] **Step 3: Confirm the merged overrides are sane**

Run:
```bash
cd site && node -e '
const c = require("./src/content/path/concept-overrides.json");
const i = require("./src/content/path/intra-track-edges.json");
const ids = new Set(require("./src/content/path/concepts.json").map(x=>x.id));
console.log("overrides.addEdges:", c.addEdges.length, "| intra source edges:", i.length);
console.log("all intra ids resolve:", i.every(e=>ids.has(e.concept)&&ids.has(e.requires)));
'
```
Expected: `addEdges` ≈ 268 + intra-after-merge (intra source may be slightly larger than the merged count due to spine-dups/cross-track drops); `all intra ids resolve: true`.

- [ ] **Step 4: Verify the path lint passes on the new data (no full build)**

Run:
```bash
cd site && bun -e 'import("./src/lint/rules/path.ts").then(async m => { const e = await m.checkPath("./src"); console.log(e.length ? e.join("\n") : "path lint clean"); })'
```
Expected: `path lint clean`.

- [ ] **Step 5: Commit the data**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content/path/intra-track-edges.json site/src/content/path/concept-overrides.json
git commit -m "content(path): intra-track prerequisite edges (deterministic prereqs harvest)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Final integration gate

**Files:** none (verification only).

- [ ] **Step 1: Full path + scripts test suite**

Run: `cd site && bunx vitest run src/scripts/path/ scripts/path/ src/lint/rules/path.test.ts`
Expected: all PASS — the prior suite plus the new derive (4), merge (6), and lint-intra (3) tests. No regressions in `overrides.test.ts` / `path-io.test.ts` (the runtime is unchanged, but they exercise the larger committed override set indirectly via imports).

- [ ] **Step 2: Full build (background, once)**

Run (background): `cd site && bun run build`
Expected: ~4849 pages, `dist/lint-report.json` → 0 errors / 0 warnings. The path lint rule (now also reading `intra-track-edges.json`) must pass; the generated `concept-overrides.json` must be acyclic with all ids valid. **Do not switch branches while this runs.**

- [ ] **Step 3: Confirm the concept DAG actually grew (smoke)**

Run:
```bash
cd site && node -e '
const c = require("./src/content/path/concept-overrides.json");
console.log("committed addEdges:", c.addEdges.length, "(was 268 cross-track-only before this slice)");
'
```
Expected: a count materially above 268, confirming intra edges are live in the runtime-loaded overrides.

- [ ] **Step 4: Opus review of the whole diff**

Per the project workflow, run a final opus review over the entire branch diff (`git diff main...HEAD`) before requesting merge. Focus: derivation correctness (anchor/firstLesson/cycle-safety), no P0 or runtime file touched, both builders produce identical `intra-track-edges.json`, lint + acyclic gates consistent. Address findings; re-run Step 1 (+ Step 2 if code changed).

- [ ] **Step 5: Stop — await owner merge command**

Do NOT FF-merge or push. Report: branch ready, build/lint/test evidence, intra edge count + final `addEdges` total. Merge + push happens only on the owner's explicit command.

---

## Self-review notes

- **Spec coverage:** §4.1 derivation → Task 1 (`deriveIntraTrackEdges`). §4.2 data/storage → Task 2 (`mergeIntraTrackEdges`), Task 4 (`build-intra-edges.mjs` focused regenerator + `build-path-data.mjs` wiring), Task 6 (data). §4.3 shared acyclic gate → Task 3 (`acyclic-gate.mjs` + `build-overrides.mjs`). §4.4 runtime-none → no task touches `overrides.ts`/`path-io.ts`/P0 (verified in Task 7 Step 4). §5 validation → Tasks 1/2/5 tests + Task 6/7 gates. §6 file touch list ↔ the File structure table (adds `build-intra-edges.mjs`, reconciled into the spec).
- **Type/name consistency:** `deriveIntraTrackEdges(unitList) → {edges, warnings}` used identically in Task 1 (def/tests), Task 4 (`build-intra-edges.mjs` + `build-path-data.mjs`). `mergeIntraTrackEdges(rawEdges, conceptsOut) → {addEdges, skipped, warnings}` used identically in Task 2 (def/test), Task 3 (`build-overrides.mjs`), Task 4 (`build-path-data.mjs`). `isAcyclicWithEdges(concepts, addEdges) → {ok, unplaced}` used identically in Task 3 (def + `build-overrides.mjs`) and Task 4 (`build-path-data.mjs`). Edge object shape `{concept, requires, via, track}` (derive) → merge strips to `{concept, requires}`. `intraTrackEdges` field name consistent across `PathData`, `validatePathData`, `checkPath` (Task 5).
- **No placeholders:** every code/edit step shows full content; commands have expected output.
- **P0 + runtime untouched:** no task edits `graph.ts`/`planner.ts`/`types.ts`/`overrides.ts`/`path-io.ts`. Content-pull-only ordering is achieved for free by the runtime's existing cross-track-only `deriveUnitRequires` filter — confirmed in the spec §3/§4.4 and asserted in the Task 7 review.
- **Cycle safety, two layers:** per-edge strict-earlier rule in the derivation (Task 1) + combined cross+intra Kahn gate in both builders (Tasks 3/4) + the build-time path lint acyclic check (already present). Three independent guards.
