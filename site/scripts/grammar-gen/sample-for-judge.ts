// Sample N generated items per gen-equipped topic, for the offline LLM-judge pass (Task 10).
// No barrel import — readdir + dynamic import + inline generation (mirrors audit-grammar.ts).
// Output: JSON array of { topicId, items: [{prompt, answer, type, options?}] }.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic, TopicGenSpec, ContextFraming } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { fillTemplate, fillContext } from "~/english/practice-engine/fill";
import { BatchDedup } from "~/english/practice-engine/dedup";
import type { GeneratedExercise } from "~/english/practice-engine/types";

const N = 12;

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

async function main(): Promise<void> {
  const grammarDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  const files = readdirSync(grammarDir).filter((f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."));
  const out: { topicId: string; items: { prompt: string; answer: string; type: string; options?: string[] }[] }[] = [];
  for (const f of files) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    if (!mod.topic.gen) continue;
    const items = gen(mod.topic.id, mod.topic.gen, N, 1).map((e) => ({
      prompt: e.prompt, answer: e.answer, type: e.type, ...(e.options ? { options: e.options } : {}),
    }));
    out.push({ topicId: mod.topic.id, items });
  }
  console.log(JSON.stringify(out));
}

if (import.meta.main) main();
