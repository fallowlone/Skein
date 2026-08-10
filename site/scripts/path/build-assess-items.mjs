#!/usr/bin/env bun
// site/scripts/path/build-assess-items.mjs
// Harvest the practice corpus into an item index for /assess. Mirrors build-lesson-tasks.mjs:
// a pure exported builder plus a thin CLI, so the mapping is unit-testable without the filesystem.
//   src/content/path/assess-items.json    { [itemId]: AssessItem }
//   src/content/path/assess-coverage.json { [conceptId]: { recognition, mechanism, production } }
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PRACTICE_DIR = "src/content/practice";
const UNIT_CONCEPTS = "src/content/path/unit-concepts.json";
const CONCEPTS = "src/content/path/concepts.json";
const OUT_ITEMS = "src/content/path/assess-items.json";
const OUT_COVERAGE = "src/content/path/assess-coverage.json";

const FACETS = ["recognition", "mechanism", "production"];

/** Primary facet per practice task type (spec §5.1). One item, one facet. */
export function facetOf(task) {
  switch (task.type) {
    case "diagnose":
      return task.grading?.mode === "blanks" ? "recognition" : "mechanism";
    case "predict":
    case "debug":
    case "review":
    case "design":
    case "incident":
      return "mechanism";
    case "sandbox":
      return "production";
    case "fix":
      return task.grading?.mode === "exec" ? "production" : "mechanism";
    default:
      return null; // unknown type: skipped, never guessed
  }
}

export function kindOf(task) {
  switch (task.type) {
    case "diagnose":
      return task.grading?.mode === "blanks" ? "recall" : "explain";
    case "predict": return "predict";
    case "debug": return "debug";
    case "review": return "review";
    case "sandbox": return "exec";
    case "fix": return task.grading?.mode === "exec" ? "exec" : "explain";
    case "design":
    case "incident": return "explain";
    default: return null;
  }
}

const unitOf = (lessonKey) => lessonKey.split("/").slice(0, 2).join("/");

export function buildAssessIndex(files, unitConcepts, bandOf, read = (p) => readFileSync(p, "utf8")) {
  const items = {};
  const coverage = {};
  const bump = (conceptId, facet) => {
    coverage[conceptId] ??= { recognition: 0, mechanism: 0, production: 0 };
    coverage[conceptId][facet] += 1;
  };

  for (const f of files) {
    let j;
    try { j = JSON.parse(read(f)); } catch { continue; }
    if (!j || typeof j.lessonKey !== "string" || !Array.isArray(j.tasks)) continue;

    const unit = unitConcepts[unitOf(j.lessonKey)];
    if (!unit || !Array.isArray(unit.teaches) || unit.teaches.length === 0) continue;

    for (const t of j.tasks) {
      if (!t || typeof t.id !== "string") continue;
      const facet = facetOf(t);
      const kind = kindOf(t);
      if (!facet || !kind) continue;

      // D1: an item is assess-eligible only if its task declares an explicit
      // `concepts` field. The old fallback to `unit.teaches` spread one answer
      // across a median of 25 concepts, leaving the posterior unmoved
      // (REPLAN-BRIEF C1). Skip entirely rather than infer.
      if (!Array.isArray(t.concepts) || t.concepts.length === 0) continue;
      const concepts = t.concepts;
      // Weight is no longer an exponent; the likelihood path consumes unity.
      // D1: Explicit, per-concept attribution mandatory.
      const weight = 1.0;
      const id = `${j.lessonKey}#${t.id}`;
      items[id] = {
        lessonKey: j.lessonKey,
        taskId: t.id,
        kind,
        facet,
        band: bandOf(concepts[0]), // Placeholder - H2 tracked
        concepts,
        weight,
        estMin: typeof t.estMin === "number" ? t.estMin : 5,
      };
      for (const c of concepts) bump(c, facet);
    }
  }

  // Deterministic, run-to-run stable key order (identical output every regeneration), NOT
  // human-alphabetical: JS object property enumeration always lists all-digit keys first, in
  // ascending numeric order, ahead of every other key regardless of .sort() — e.g. concept id
  // "40001" (Postgres serialization-failure code) enumerates at position 0, not its alphabetical
  // slot. Keep this an object (consumers expect a lookup map); the churn to force true
  // lexicographic order via an array/Map is not worth it.
  const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return { items: sortKeys(items), coverage: sortKeys(coverage) };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

if (import.meta.main) {
  const unitConcepts = JSON.parse(readFileSync(UNIT_CONCEPTS, "utf8"));
  const concepts = JSON.parse(readFileSync(CONCEPTS, "utf8"));
  const bandById = new Map(concepts.map((c) => [c.id, c.band]));
  const bandOf = (id) => bandById.get(id) ?? "surface";

  const { items, coverage } = buildAssessIndex(walk(PRACTICE_DIR).sort(), unitConcepts, bandOf);
  writeFileSync(OUT_ITEMS, JSON.stringify(items) + "\n");
  writeFileSync(OUT_COVERAGE, JSON.stringify(coverage) + "\n");

  const cells = Object.values(coverage);
  const empty = FACETS.map((f) => [f, cells.filter((c) => c[f] === 0).length]);
  console.log(`build:assess-items — ${Object.keys(items).length} items over ${cells.length} concepts`);
  for (const [f, n] of empty) console.log(`  ${f}: ${n} concepts with no item`);
}
