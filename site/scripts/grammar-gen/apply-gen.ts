// Write a `gen` TopicGenSpec into a topic module, re-emitting via serializeTopic.
// Usage: bun scripts/grammar-gen/apply-gen.ts  (reads gen-specs/*.json, merges by id)
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { serializeTopic } from "../grammar-import/serialize";
import type { GrammarTopic, TopicGenSpec } from "~/english/grammar-types";

export function withGen(topic: GrammarTopic, gen: TopicGenSpec): GrammarTopic {
  return { ...structuredClone(topic), gen };
}

export async function main(): Promise<void> {
  const here = import.meta.dir;
  const specDir = resolve(here, "gen-specs");
  const grammarDir = resolve(here, "../../src/english/data/grammar");
  if (!existsSync(specDir)) { console.error(`no gen-specs dir: ${specDir}`); process.exit(1); }
  let applied = 0;
  for (const f of readdirSync(specDir).filter((f) => f.endsWith(".json"))) {
    const spec = JSON.parse(readFileSync(join(specDir, f), "utf8")) as { id: string; gen: TopicGenSpec };
    const mod = (await import(join(grammarDir, `${spec.id}.ts`))) as { topic: GrammarTopic };
    writeFileSync(join(grammarDir, `${spec.id}.ts`), serializeTopic(withGen(mod.topic, spec.gen)), "utf8");
    applied++;
  }
  console.log(`gen applied ${applied}`);
}

if (import.meta.main) main();
