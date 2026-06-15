// audit:grammar — per-topic generative gate. Asserts >=100 native unique items + non-empty
// answers (and, with --gate, committed offline LLM-judge pass-rate >= floor). Like
// verify-grammar.ts it must NOT import the corpus barrel (import.meta.glob throws under bun),
// so it loads topic modules by readdir + dynamic import and INLINES the generation logic.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic, TopicGenSpec, ContextFraming } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { fillTemplate, fillContext } from "~/english/practice-engine/fill";
import { BatchDedup } from "~/english/practice-engine/dedup";
import type { GeneratedExercise } from "~/english/practice-engine/types";
import { loadVerdicts, verdictPassRate } from "./judge-verdicts";

const TARGET = 100;
const STEM_FLOOR = 50;       // selection topics: distinct native context stems (x2 framings = 100)
const PASS_RATE_FLOOR = 0.9; // committed LLM-judge verdicts

export type GenAuditResult = {
  topicId: string; unique: number; distinctStems: number;
  emptyAnswers: number; isContext: boolean; ok: boolean; problems: string[];
};

/** Inline generation — mirrors generateFromSpec without importing the barrel. */
function gen(topicId: string, spec: TopicGenSpec, count: number, seed: number): GeneratedExercise[] {
  const templates = spec.templates.filter((t) => cefrIndex(t.cefrMax) >= cefrIndex("A1"));
  if (templates.length === 0) return [];
  const dedup = new BatchDedup();
  const out: GeneratedExercise[] = [];
  const MAX = count * 50;
  for (let i = 0; i < MAX && out.length < count; i++) {
    const tpl = templates[i % templates.length];
    if (tpl.usesContext) {
      const framings: ContextFraming[] = tpl.framings ?? ["cloze"];
      const framing = framings[i % framings.length];
      const ex = fillContext(tpl, spec.contexts ?? [], framing, tpl.cefrMin, seed + i);
      if (!dedup.accept(`${ex.type}|${ex.prompt}`)) continue;
      out.push({ ...ex, topicId });
    } else {
      const ex = fillTemplate(tpl, spec.pools, tpl.cefrMin, seed + i);
      if (!dedup.accept(ex.prompt)) continue;
      out.push({ ...ex, topicId });
    }
  }
  return out;
}

export function auditTopicGen(topicId: string, spec: TopicGenSpec): GenAuditResult {
  const isContext = spec.templates.some((t) => t.usesContext);
  const items = gen(topicId, spec, TARGET, 1);
  const unique = new Set(items.map((e) => `${e.type}|${e.prompt}`)).size;
  const distinctStems = isContext ? new Set((spec.contexts ?? []).map((c) => c.stem)).size : Infinity;
  const emptyAnswers = items.filter((e) => !e.answer || !e.answer.trim()).length;
  const problems: string[] = [];
  if (unique < TARGET) problems.push(`only ${unique} unique (<${TARGET})`);
  if (isContext && distinctStems < STEM_FLOOR) problems.push(`only ${distinctStems} distinct stems (<${STEM_FLOOR})`);
  if (emptyAnswers > 0) problems.push(`${emptyAnswers} empty answers`);
  return { topicId, unique, distinctStems, emptyAnswers, isContext, ok: problems.length === 0, problems };
}

async function main(): Promise<void> {
  const grammarDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  const verdictPath = resolve(grammarDir, "grammar-judge-verdicts.json");
  const gate = process.argv.includes("--gate");
  const files = readdirSync(grammarDir).filter((f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."));
  const verdicts = loadVerdicts(verdictPath);
  const results: GenAuditResult[] = [];
  let withGen = 0;
  for (const f of files) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    if (!mod.topic.gen) continue;
    withGen++;
    const r = auditTopicGen(mod.topic.id, mod.topic.gen);
    const v = verdicts[mod.topic.id];
    if (!v) r.problems.push("no committed judge verdict");
    else if (verdictPassRate(v) < PASS_RATE_FLOOR) r.problems.push(`judge pass-rate ${(verdictPassRate(v) * 100).toFixed(0)}% (<${PASS_RATE_FLOOR * 100}%)`);
    r.ok = r.problems.length === 0;
    results.push(r);
  }
  const failing = results.filter((r) => !r.ok);
  console.log(`audit:grammar — ${withGen} gen topics, ${failing.length} failing`);
  for (const r of failing) console.error(`  x ${r.topicId}: ${r.problems.join("; ")}`);
  if (gate && failing.length) process.exit(1);
}

if (import.meta.main) main();
