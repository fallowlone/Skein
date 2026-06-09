#!/usr/bin/env bun
// Scoped empty-pass check: given practice JSON file paths as args, print any js `sandbox` task whose
// `setup` makes an EMPTY editor already pass. Same probe as audit-sandbox-empty.mjs (which gates the
// whole tree) — this one is scoped to the files you pass, so a fix-wave agent can verify just its own
// batch without a full-tree sweep. Exit 1 if any task still empty-passes.
import { readFile } from "node:fs/promises";
import { runDebug } from "../src/scripts/debug-runner.ts";

let bad = 0;
for (const f of process.argv.slice(2)) {
  let d;
  try { d = JSON.parse(await readFile(f, "utf8")); } catch (e) { console.log(`ERR ${f}: ${e.message}`); bad++; continue; }
  for (const t of d.tasks ?? []) {
    if (t.type !== "sandbox" || t.runtime !== "js" || !t.expected) continue;
    if (!String(t.expected.kind || "").startsWith("stdout")) continue;
    const r = await runDebug({ setup: t.setup, learnerCode: "", verify: "", check: t.expected });
    if (r.status === "pass") { console.log(`EMPTY-PASS ${d.lessonKey}#${t.id}`); bad++; }
  }
}
console.log(bad ? `FAIL: ${bad} empty-pass remain` : "OK: no empty-pass in given files");
process.exit(bad ? 1 : 0);
