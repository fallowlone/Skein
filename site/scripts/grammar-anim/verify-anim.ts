// verify:anim — every grammar topic must resolve to an archetype generator that emits
// valid, slot-filled, deterministic Bodymovin. Mirrors audit-grammar.ts / verify-grammar.ts:
// it must NOT import the corpus barrel (import.meta.glob throws under bun), so it loads topic
// modules by readdir + dynamic import and reads mod.topic.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic } from "~/english/grammar-types";
import type { LottieDoc } from "~/english/animations/lottie-types";
import { resolveAnimation } from "~/english/animations/archetype-map";

const GRAMMAR_DIR = resolve(import.meta.dir, "../../src/english/data/grammar");

type Problem = { id: string; archetype: string; issues: string[] };

function structurallyValid(d: LottieDoc): string[] {
  const issues: string[] = [];
  if (d.v !== "5.7.0") issues.push("bad version");
  if (!(d.op > d.ip)) issues.push("op<=ip");
  if (!(d.w > 0 && d.h > 0)) issues.push("zero size");
  if (!Array.isArray(d.layers) || d.layers.length === 0) issues.push("no layers");
  if (d.layers?.some((l) => !(l.op > l.ip))) issues.push("layer op<=ip");
  const emptyText = d.layers?.filter((l) => l.ty === 5 && !l.t?.d.k[0]?.s.t.trim()).length ?? 0;
  if (emptyText > 0) issues.push(`${emptyText} empty text layer(s)`);
  try {
    JSON.parse(JSON.stringify(d));
  } catch {
    issues.push("not JSON-serializable");
  }
  return issues;
}

async function loadTopics(): Promise<GrammarTopic[]> {
  const files = readdirSync(GRAMMAR_DIR).filter(
    (f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."),
  );
  const topics: GrammarTopic[] = [];
  for (const f of files) {
    const mod = (await import(join(GRAMMAR_DIR, f))) as { topic?: GrammarTopic };
    if (mod.topic) topics.push(mod.topic);
  }
  return topics;
}

async function main(): Promise<void> {
  const gate = process.argv.includes("--gate");
  const topics = await loadTopics();
  const problems: Problem[] = [];
  const byArchetype = new Map<string, number>();

  for (const t of topics) {
    const r = resolveAnimation(t);
    if (!r) {
      problems.push({ id: t.id, archetype: t.archetype, issues: ["unmapped archetype"] });
      continue;
    }
    byArchetype.set(r.archetype, (byArchetype.get(r.archetype) ?? 0) + 1);
    const issues = structurallyValid(r.doc());
    if (JSON.stringify(r.doc()) !== JSON.stringify(r.doc())) issues.push("non-deterministic");
    if (issues.length) problems.push({ id: t.id, archetype: r.archetype, issues });
  }

  console.log(`grammar-anim: ${topics.length} topics`);
  for (const [a, n] of [...byArchetype.entries()].sort((x, y) => y[1] - x[1]))
    console.log(`  ${a}: ${n}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem topic(s):`);
    for (const p of problems) console.error(`  ${p.id} [${p.archetype}] — ${p.issues.join("; ")}`);
    if (gate) process.exit(1);
  } else {
    console.log("all topics resolve to a valid, deterministic animation ✓");
  }
}

main();
