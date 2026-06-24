#!/usr/bin/env bun
// Build a compact per-lesson practice-task index for the planning engine's "do now" assembler
// (do-now.ts / computeDoNow). Walks every practice content file and emits
//   src/content/path/lesson-tasks.json : { [lessonKey]: [{ id, difficulty }] }
// keyed + ordered deterministically so the file is stable across runs. Only id + difficulty are
// kept (everything recommendTask needs); the full task bodies stay in the lesson bundle. The
// output is imported LAZILY (dynamic import) by TodayFocus so it never enters the main island
// bundle. Regenerate with:  bun scripts/path/build-lesson-tasks.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PRACTICE_DIR = "src/content/practice";
const OUT = "src/content/path/lesson-tasks.json";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

export function buildIndex(files, read = (p) => readFileSync(p, "utf8")) {
  const index = {};
  for (const f of files) {
    let j;
    try {
      j = JSON.parse(read(f));
    } catch {
      continue;
    }
    if (!j || typeof j.lessonKey !== "string" || !Array.isArray(j.tasks)) continue;
    const tasks = j.tasks
      .filter((t) => t && typeof t.id === "string" && typeof t.difficulty === "string")
      .map((t) => ({ id: t.id, difficulty: t.difficulty }));
    if (tasks.length) index[j.lessonKey] = tasks;
  }
  // stable key order so the committed file diffs cleanly
  const sorted = {};
  for (const k of Object.keys(index).sort()) sorted[k] = index[k];
  return sorted;
}

// Run only when invoked directly (not when imported by the test).
if (import.meta.main) {
  const files = walk(PRACTICE_DIR).sort();
  const index = buildIndex(files);
  writeFileSync(OUT, JSON.stringify(index) + "\n");
  const lessons = Object.keys(index).length;
  const tasks = Object.values(index).reduce((n, a) => n + a.length, 0);
  console.log(`lesson-tasks.json: ${lessons} lessons, ${tasks} tasks → ${OUT}`);
}
