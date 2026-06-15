// verify:grammar — deriveKey internal consistency for every gen-equipped topic.
// Imports only from leaf practice-engine modules (no import.meta.glob dependency)
// so this runs cleanly under both Vitest (Vite) and bun CLI.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic, TopicGenSpec, ContextFraming } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { fillTemplate, fillContext } from "~/english/practice-engine/fill";
import { BatchDedup } from "~/english/practice-engine/dedup";
import type { GeneratedExercise } from "~/english/practice-engine/types";

/** Inline generateFromSpec — avoids grammar/index.ts (import.meta.glob). Routes both
 *  token-pool templates and tagged-context (usesContext) templates. */
function runGenSpec(topicId: string, gen: TopicGenSpec, count: number, seed: number): GeneratedExercise[] {
  const templates = gen.templates.filter((t) =>
    cefrIndex(t.cefrMin) <= cefrIndex("C2") && cefrIndex(t.cefrMax) >= cefrIndex("A1"),
  );
  if (templates.length === 0) return [];
  const dedup = new BatchDedup();
  const out: GeneratedExercise[] = [];
  const MAX_TRIES = count * 50;
  for (let i = 0; i < MAX_TRIES && out.length < count; i++) {
    const tpl = templates[i % templates.length];
    if (tpl.usesContext) {
      const framings: ContextFraming[] = tpl.framings ?? ["cloze"];
      const framing = framings[i % framings.length];
      const ex = fillContext(tpl, gen.contexts ?? [], framing, tpl.cefrMin, seed + i);
      if (!dedup.accept(`${ex.type}|${ex.prompt}`)) continue;
      out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${framing}:${seed + i}` });
    } else {
      const ex = fillTemplate(tpl, gen.pools, tpl.cefrMin, seed + i);
      if (!dedup.accept(ex.prompt)) continue;
      out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${seed + i}` });
    }
  }
  return out;
}

export function verifyGenSpec(topicId: string, gen: TopicGenSpec): { problems: string[] } {
  const problems: string[] = [];
  try {
    const sample = runGenSpec(topicId, gen, 20, 1);
    if (sample.length === 0) problems.push(`${topicId}: produced 0 items`);
    for (const ex of sample) {
      if (!ex.answer || !ex.answer.trim()) problems.push(`${topicId}/${ex.id}: empty derived answer`);
    }
  } catch (e) {
    problems.push(`${topicId}: ${(e as Error).message}`);
  }
  return { problems };
}

async function main(): Promise<void> {
  const grammarDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  const files = readdirSync(grammarDir).filter((f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."));
  const allProblems: string[] = [];
  let checked = 0;
  for (const f of files) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    if (!mod.topic.gen) continue;
    checked++;
    allProblems.push(...verifyGenSpec(mod.topic.id, mod.topic.gen).problems);
  }
  console.log(`verify:grammar — checked ${checked} gen-equipped topics`);
  if (allProblems.length) {
    for (const p of allProblems) console.error(`  x ${p}`);
    process.exit(1);
  }
  console.log("verify:grammar: OK");
}

if (import.meta.main) main();
