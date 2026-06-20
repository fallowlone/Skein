// One-off audit: is each practice task explained enough for a junior?
// Heuristic — per task sum the EN explanatory prose (prompt + type-specific
// context + answer key). Flag the thin tail per type. Not a grader; a triage.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/content/practice";
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    statSync(p).isDirectory() ? walk(p) : p.endsWith(".json") && files.push(p);
  }
})(ROOT);

const en = (v) => (v && typeof v === "object" ? v.en ?? "" : typeof v === "string" ? v : "");
const len = (v) => en(v).trim().length;

// Per-type: which fields carry the "what" context and the "how/answer" key.
function measure(t) {
  let context = len(t.prompt); // every task has a prompt
  let answer = 0;
  const addCtx = (v) => (context += len(v));
  const addAns = (v) => (answer += len(v));

  switch (t.type) {
    case "diagnose":
      addCtx(t.evidence);
      // blanks: hint = the question shown to the learner, accept = the answer key
      if (t.grading?.mode === "blanks") for (const b of t.grading.blanks ?? []) { addCtx(b.hint); answer += (b.accept ?? []).join(" ").length; }
      if (t.grading?.mode === "self") { addAns(t.grading.model); for (const r of t.grading.rubric ?? []) addAns(r); }
      break;
    case "fix":
      if (t.starter) context += t.starter.length;
      if (t.grading?.mode === "self") { addAns(t.grading.model); for (const r of t.grading.rubric ?? []) addAns(r); }
      if (t.grading?.mode === "exec") answer += (t.grading.check ? JSON.stringify(t.grading.check).length : 0);
      break;
    case "sandbox":
      if (t.setup) context += t.setup.length;
      if (t.initialCode) context += t.initialCode.length;
      if (t.expected) answer += JSON.stringify(t.expected).length;
      break;
    case "incident":
      for (const s of t.steps ?? []) { addCtx(s.label); addCtx(s.prompt); addAns(s.reveal); }
      break;
    case "design":
      addCtx(t.constraints); addAns(t.model); for (const r of t.rubric ?? []) addAns(r);
      break;
    case "predict":
      addCtx(t.scenario); addAns(t.reveal);
      break;
    case "review":
      if (t.diff?.code) context += t.diff.code.length;
      for (const f of t.findings ?? []) { addAns(f.label); addAns(f.explanation); }
      break;
    case "debug":
      if (t.starter) context += t.starter.length;
      addCtx(t.evidence); addAns(t.verify); addAns(t.reveal);
      for (const h of t.hints ?? []) addAns(h);
      break;
  }
  return { context, answer, total: context + answer };
}

const byType = {};
const rows = [];
let taskCount = 0;
for (const f of files) {
  let json;
  try { json = JSON.parse(readFileSync(f, "utf8")); } catch { continue; }
  for (const t of json.tasks ?? []) {
    taskCount++;
    const m = measure(t);
    (byType[t.type] ??= []).push(m.total);
    rows.push({ file: f.replace(ROOT + "/", ""), key: json.lessonKey, id: t.id, type: t.type, diff: t.difficulty, ...m, hasAnswer: m.answer > 0 });
  }
}

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor((s.length - 1) * p)]; };
const mean = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

console.log(`FILES ${files.length}  TASKS ${taskCount}\n`);
console.log("TYPE        n     mean   p10    p50    p90   no-answer-key");
for (const ty of Object.keys(byType).sort()) {
  const a = byType[ty];
  const noAns = rows.filter((r) => r.type === ty && !r.hasAnswer).length;
  console.log(`${ty.padEnd(11)} ${String(a.length).padStart(4)}  ${String(mean(a)).padStart(5)}  ${String(pct(a,.1)).padStart(5)}  ${String(pct(a,.5)).padStart(5)}  ${String(pct(a,.9)).padStart(5)}   ${noAns}`);
}

// Absolute thin floor: a junior likely cannot self-serve under ~260 EN chars of
// total explanation, or with zero answer key. Per-type p10 also reported above.
const THIN = 260;
const thin = rows.filter((r) => r.total < THIN || !r.hasAnswer).sort((a, b) => a.total - b.total);
console.log(`\nTHIN (<${THIN} chars total OR no answer key): ${thin.length} / ${taskCount} (${(100*thin.length/taskCount).toFixed(1)}%)`);
console.log("\n30 thinnest:");
for (const r of thin.slice(0, 30)) console.log(`  ${String(r.total).padStart(4)}c ${r.hasAnswer ? "  " : "✗A"} ${r.type.padEnd(9)} ${r.key}  ::${r.id}`);

// Thin by track — where is the tail concentrated?
const byTrack = {};
for (const r of thin) byTrack[r.key.split("/")[0]] = (byTrack[r.key.split("/")[0]] ?? 0) + 1;
console.log("\nTHIN by track:");
for (const [tr, n] of Object.entries(byTrack).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${tr}`);
