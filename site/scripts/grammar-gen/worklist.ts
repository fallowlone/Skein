// Emit the gen-authoring worklist: every topic WITHOUT a committed `gen`, with the
// fields an authoring agent needs (family/levels/crossTopic). No barrel import — readdir +
// dynamic import (import.meta.glob throws under bun). Usage: bun scripts/grammar-gen/worklist.ts
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic } from "~/english/grammar-types";

type Item = { id: string; family: string; levels: string[]; crossTopic: string[]; related: string[] };

async function main(): Promise<void> {
  const grammarDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  const files = readdirSync(grammarDir).filter((f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."));
  const out: Item[] = [];
  for (const f of files) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    const t = mod.topic;
    if (t.gen) continue;
    out.push({ id: t.id, family: t.family, levels: t.levels, crossTopic: t.crossTopic ?? [], related: t.related ?? [] });
  }
  console.log(JSON.stringify(out, null, 0));
}

if (import.meta.main) main();
