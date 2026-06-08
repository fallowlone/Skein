#!/usr/bin/env bun
// Audit: a `sandbox` task with an `expected` stdout check must NOT pass on EMPTY
// learner input. When it does, the reference solution was hidden in `setup` (it
// runs invisibly and prints the answer), so the learner faces an empty editor
// that already reads "passed" — a broken, confusing task. This lists every
// offender (the fix-wave worklist) and, with --gate, exits 1 if any remain.
//
// The fix per task: move the solution OUT of `setup`. `setup` should hold only
// the data/context the learner needs (e.g. `const basket = [...]`) or be empty;
// the learner writes the computation + the `console.log` that the check grades.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDebug } from "../src/scripts/debug-runner.ts";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const PRACTICE = join(siteRoot, "src/content/practice");

async function walk(dir, acc = []) {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walk(p, acc);
    else if (it.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

let total = 0;
const broken = [];
for (const f of await walk(PRACTICE)) {
  let d;
  try { d = JSON.parse(await readFile(f, "utf8")); } catch { continue; }
  for (const t of d.tasks ?? []) {
    if (t.type !== "sandbox" || t.runtime !== "js" || !t.expected) continue;
    if (!String(t.expected.kind || "").startsWith("stdout")) continue;
    total++;
    const r = await runDebug({ setup: t.setup, learnerCode: "", verify: "", check: t.expected });
    if (r.status === "pass") broken.push(`${d.lessonKey}#${t.id}`);
  }
}

console.log(`audit-sandbox-empty: ${broken.length}/${total} js sandbox tasks pass on EMPTY input (broken).`);
for (const b of broken) console.log("  " + b);
if (process.argv.includes("--gate") && broken.length) process.exit(1);
