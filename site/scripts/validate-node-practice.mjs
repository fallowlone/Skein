// Reconstructs the practice Zod schema from content.config.ts and validates
// every node-track practice JSON file. Run: node scripts/validate-node-practice.mjs
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) });
const Difficulty = z.enum(["recall", "apply", "stretch"]);
const Blank = z.object({ id: z.string(), accept: z.array(z.string()).min(1), hint: Bi.optional() });
const ExecCheck = z.object({
  kind: z.enum(["stdout-equals", "stdout-contains", "rows-equal", "no-error"]),
  value: z.string().optional(),
});
const TaskBase = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  difficulty: Difficulty,
  estMin: z.number().int().positive(),
  title: Bi,
  prompt: Bi,
});
const DiagnoseTask = TaskBase.extend({
  type: z.literal("diagnose"),
  evidence: Bi.optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("blanks"), blanks: z.array(Blank).min(1) }),
    z.object({ mode: z.literal("self"), model: Bi, rubric: z.array(Bi).min(1) }),
  ]),
});
const FixTask = TaskBase.extend({
  type: z.literal("fix"),
  starter: z.string().optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("self"), model: Bi, rubric: z.array(Bi).min(1) }),
    z.object({ mode: z.literal("exec"), runtime: z.enum(["sql", "js"]), setup: z.string().optional(), check: ExecCheck }),
  ]),
});
const SandboxTask = TaskBase.extend({
  type: z.literal("sandbox"),
  runtime: z.enum(["sql", "js", "parametric"]),
  setup: z.string().optional(),
  expected: ExecCheck.optional(),
  parametric: z.object({ component: z.string() }).optional(),
});
const IncidentTask = TaskBase.extend({
  type: z.literal("incident"),
  steps: z.array(z.object({ label: Bi, prompt: Bi, reveal: Bi })).min(3).max(6),
});
const DesignTask = TaskBase.extend({
  type: z.literal("design"),
  constraints: Bi,
  rubric: z.array(Bi).min(2),
  model: Bi,
});
const PredictTask = TaskBase.extend({
  type: z.literal("predict"),
  scenario: Bi,
  reveal: Bi,
});
const PracticeTask = z.discriminatedUnion("type", [
  DiagnoseTask, FixTask, SandboxTask, IncidentTask, DesignTask, PredictTask,
]);
const Practice = z.object({
  lessonKey: z.string(),
  track: z.string(),
  tasks: z.array(PracticeTask).min(1).max(8),
});

const ROOT = new URL("../src/content/practice/node", import.meta.url).pathname;
async function walk(dir) {
  const out = [];
  for (const it of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, it.name);
    if (it.isDirectory()) out.push(...(await walk(p)));
    else if (it.name.endsWith(".json")) out.push(p);
  }
  return out;
}

let bad = 0;
const files = await walk(ROOT);
for (const f of files) {
  let data;
  try { data = JSON.parse(await readFile(f, "utf8")); }
  catch (e) { console.error("JSON PARSE FAIL", f, e.message); bad++; continue; }
  const r = Practice.safeParse(data);
  if (!r.success) {
    bad++;
    console.error("SCHEMA FAIL", f);
    for (const issue of r.error.issues) console.error("  ", issue.path.join("."), "—", issue.message);
  }
}
console.log(`\nvalidated ${files.length} node practice files, ${bad} failed`);
process.exit(bad ? 1 : 0);
