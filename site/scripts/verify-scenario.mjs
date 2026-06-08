#!/usr/bin/env bun
// Executes every `debug` practice task's STARTER through the real QuickJS runner
// and asserts it does NOT already pass its hidden check — i.e. a real bug exists
// and the verify/check are wired. The lint already checks structure + no-leak;
// this adds the one thing only execution can prove.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDebug } from "../src/scripts/debug-runner.ts";

let siteRoot;
try {
  siteRoot = fileURLToPath(new URL("../", import.meta.url));
} catch {
  siteRoot = process.cwd();
}
const PRACTICE = join(siteRoot, "src/content/practice");

export async function starterMustFail(task) {
  const r = await runDebug({ setup: task.setup, learnerCode: task.starter, verify: task.verify, check: task.check });
  return { ok: r.status !== "pass", status: r.status, id: task.id };
}

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

if (process.argv.includes("--self-test")) {
  const bad = await starterMustFail({ id: "x", starter: "function f(){return 2}", verify: "console.log(f()===2?'PASS':'FAIL')", check: { kind: "stdout-contains", value: "PASS" } });
  if (bad.ok) { console.error("self-test FAILED: a passing starter was accepted"); process.exit(1); }
  console.log("verify-scenario self-test: OK"); process.exit(0);
}

const failures = [];
for (const p of await walk(PRACTICE)) {
  let data;
  try { data = JSON.parse(await readFile(p, "utf8")); } catch { continue; }
  for (const task of data.tasks ?? []) {
    if (task.type !== "debug") continue;
    const r = await starterMustFail(task);
    if (!r.ok) failures.push(`${data.lessonKey}#${task.id} (starter status=${r.status}, expected a fail)`);
  }
}
if (failures.length) {
  console.error(`verify:scenario FAIL — ${failures.length} debug task(s) whose starter does not present a real bug:`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("verify:scenario OK — every debug starter fails its check (a real bug to fix).");
