#!/usr/bin/env bun
// Validates the explicit `concepts` annotation on practice tasks (REPLAN-BRIEF D1).
//
// /assess attributes a task's evidence to the concepts it declares. Before D1 the
// builder inferred them from unit.teaches, which on the real corpus spread one
// answer across a median of 9 and up to 81 concepts — the posterior never moved.
// Explicit annotation only helps if the ids are real and in scope, which is what
// this checks:
//
//   1. every declared id exists in concepts.json
//   2. every declared id is in scope for the task's unit (teaches ∪ prereqs) —
//      a task cannot probe a concept its unit neither teaches nor depends on
//   3. no duplicates within a task
//
// Annotation is a rollout, so an unannotated task is not an error here; it is
// simply invisible to /assess. Reports coverage so the rollout is measurable.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

let siteRoot;
try {
  siteRoot = fileURLToPath(new URL("../", import.meta.url));
} catch {
  siteRoot = process.cwd();
}
const PRACTICE = join(siteRoot, "src/content/practice");
const CONCEPTS = join(siteRoot, "src/content/path/concepts.json");
const UNIT_CONCEPTS = join(siteRoot, "src/content/path/unit-concepts.json");

const unitKeyOf = (lessonKey) => lessonKey.split("/").slice(0, 2).join("/");

/**
 * Pure core: check one task's annotation against the vocabulary and unit scope.
 * @returns {string[]} error messages, empty when valid
 */
export function checkTaskConcepts(task, { conceptIds, unitScope, unitKey }) {
  const declared = task?.concepts;
  if (!Array.isArray(declared) || declared.length === 0) return [];

  const errors = [];
  const seen = new Set();
  for (const id of declared) {
    if (seen.has(id)) {
      errors.push(`${task.id}: duplicate concept "${id}"`);
      continue;
    }
    seen.add(id);
    if (!conceptIds.has(id)) {
      errors.push(`${task.id}: unknown concept "${id}" (not in concepts.json)`);
    } else if (unitScope && !unitScope.has(id)) {
      errors.push(
        `${task.id}: concept "${id}" is out of scope for unit ${unitKey} (not in teaches or prereqs)`,
      );
    }
  }
  return errors;
}

async function walk(dir, acc = []) {
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walk(p, acc);
    else if (it.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

if (process.argv.includes("--self-test")) {
  const ctx = {
    conceptIds: new Set(["a/real", "a/other"]),
    unitScope: new Set(["a/real"]),
    unitKey: "a/01",
  };
  const cases = [
    [{ id: "t", concepts: ["a/nope"] }, "unknown concept"],
    [{ id: "t", concepts: ["a/other"] }, "out of scope"],
    [{ id: "t", concepts: ["a/real", "a/real"] }, "duplicate"],
  ];
  for (const [task, label] of cases) {
    if (checkTaskConcepts(task, ctx).length === 0) {
      console.error(`self-test FAILED: accepted a task with a ${label}`);
      process.exit(1);
    }
  }
  if (checkTaskConcepts({ id: "t", concepts: ["a/real"] }, ctx).length !== 0) {
    console.error("self-test FAILED: rejected a valid annotation");
    process.exit(1);
  }
  if (checkTaskConcepts({ id: "t" }, ctx).length !== 0) {
    console.error("self-test FAILED: an unannotated task must not error");
    process.exit(1);
  }
  console.log("verify-task-concepts self-test: OK");
  process.exit(0);
}

const conceptIds = new Set(
  JSON.parse(await readFile(CONCEPTS, "utf8")).map((c) => c.id),
);
const unitConcepts = JSON.parse(await readFile(UNIT_CONCEPTS, "utf8"));

const files = await walk(PRACTICE);
const errors = [];
let total = 0;
let annotated = 0;
const perTrack = new Map();

for (const file of files) {
  let doc;
  try {
    doc = JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    errors.push(`${file}: unreadable JSON (${err.message})`);
    continue;
  }
  if (!doc?.lessonKey || !Array.isArray(doc.tasks)) continue;

  const unitKey = unitKeyOf(doc.lessonKey);
  const unit = unitConcepts[unitKey];
  const unitScope = unit
    ? new Set([...(unit.teaches ?? []), ...(unit.prereqs ?? [])])
    : null;
  const track = doc.lessonKey.split("/")[0];

  for (const task of doc.tasks) {
    if (!task?.id) continue;
    total++;
    const stat = perTrack.get(track) ?? { total: 0, annotated: 0 };
    stat.total++;
    if (Array.isArray(task.concepts) && task.concepts.length) {
      annotated++;
      stat.annotated++;
    }
    perTrack.set(track, stat);
    for (const msg of checkTaskConcepts(task, { conceptIds, unitScope, unitKey })) {
      errors.push(`${file} → ${msg}`);
    }
  }
}

const pct = total ? ((annotated / total) * 100).toFixed(1) : "0.0";
console.log(`task-concepts: ${annotated}/${total} tasks annotated (${pct}%)`);

if (process.argv.includes("--by-track")) {
  const rows = [...perTrack.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [track, s] of rows) {
    const p = ((s.annotated / s.total) * 100).toFixed(0);
    console.log(`  ${track.padEnd(24)} ${String(s.annotated).padStart(5)}/${String(s.total).padEnd(5)} ${p}%`);
  }
}

if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors.slice(0, 50)) console.error(`  ${e}`);
  if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
  process.exit(1);
}
console.log("task-concepts: no errors");
