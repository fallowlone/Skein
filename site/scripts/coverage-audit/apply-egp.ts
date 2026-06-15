// Replace the Phase-1 "EGP:best-effort" placeholder with validated inventory ids.
// Pure merge (applyEgp) + bun I/O driver (main) that avoids the Vite barrels.
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { serializeTopic } from "../grammar-import/serialize";
import type { GrammarTopic } from "~/english/grammar-types";

const isReal = (id: string): boolean => /^egp\.[a-c][12]\./.test(id);

export function applyEgp(topic: GrammarTopic, egpIds: string[], validEgp: Set<string>): GrammarTopic {
  const placeholder = topic.egp.length === 0 || !topic.egp.some(isReal);
  if (!placeholder) return topic;
  const clean = egpIds.filter((id) => validEgp.has(id));
  if (clean.length === 0) return topic; // leave placeholder so the gate flags it
  return { ...structuredClone(topic), egp: clean };
}

const PatchSchema = z.object({ id: z.string(), egp: z.array(z.string()) });

export async function main(): Promise<void> {
  const here = import.meta.dir;
  const patchesDir = resolve(here, "egp-patches");
  const grammarDir = resolve(here, "../../src/english/data/grammar");
  const egpDir = resolve(here, "../../src/english/data/egp");
  if (!existsSync(patchesDir)) { console.error(`no egp-patches dir: ${patchesDir}`); process.exit(1); }

  // Build the valid-id set from the band modules (NOT the Vite barrel).
  const bandFiles = readdirSync(egpDir).filter(
    (f) => /\.ts$/.test(f) && !/(index|types)\.ts$/.test(f) && !f.includes(".test."),
  );
  const validEgp = new Set<string>();
  for (const f of bandFiles) {
    const mod = (await import(join(egpDir, f))) as { entries?: { id: string }[] };
    for (const e of mod.entries ?? []) validEgp.add(e.id);
  }

  const topicFiles = readdirSync(grammarDir).filter(
    (f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."),
  );
  const byId = new Map<string, GrammarTopic>();
  for (const f of topicFiles) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    byId.set(mod.topic.id, mod.topic);
  }

  let applied = 0, skipped = 0;
  for (const f of readdirSync(patchesDir).filter((f) => f.endsWith(".json"))) {
    const parsed = PatchSchema.safeParse(JSON.parse(readFileSync(join(patchesDir, f), "utf8")));
    if (!parsed.success) { console.error(`bad egp patch ${f}`); skipped++; continue; }
    const topic = byId.get(parsed.data.id);
    if (!topic) { console.error(`unknown topic ${parsed.data.id}`); skipped++; continue; }
    const merged = applyEgp(topic, parsed.data.egp, validEgp);
    if (merged === topic) { skipped++; continue; }
    writeFileSync(join(grammarDir, `${topic.id}.ts`), serializeTopic(merged), "utf8");
    applied++;
  }
  console.log(`egp applied ${applied}, skipped ${skipped}`);
}

if (import.meta.main) main();
