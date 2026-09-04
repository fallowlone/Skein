// verify:anim — every grammar topic must resolve to an archetype generator that emits
// a valid, slot-filled, deterministic editorial Scene. Mirrors audit-grammar.ts /
// verify-grammar.ts: it must NOT import the corpus barrel (import.meta.glob throws
// under bun), so it loads topic modules by readdir + dynamic import and reads mod.topic.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GrammarTopic } from "~/english/grammar-types";
import type { Pt, Prim, Scene } from "~/english/animations/editorial/scene-types";
import { resolveAnimation } from "~/english/animations/archetype-map";

const GRAMMAR_DIR = fileURLToPath(new URL("../../src/english/data/grammar", import.meta.url));

type Problem = { id: string; archetype: string; issues: string[] };

const finite = (n: number): boolean => Number.isFinite(n);
const validPoint = (p: Pt): boolean => finite(p.x) && finite(p.y);
const nonEmpty = (s: string | undefined): boolean => typeof s === "string" && s.trim().length > 0;

function primIssues(p: Prim & { order?: number }, index: number): string[] {
  const at = `prim ${index} (${p.k})`;
  const issues: string[] = [];
  if (p.order !== undefined && (!Number.isInteger(p.order) || p.order < 0)) issues.push(`${at}: bad order`);

  switch (p.k) {
    case "axis":
      if (!finite(p.x0) || !finite(p.x1) || !finite(p.y) || p.x1 <= p.x0) issues.push(`${at}: bad geometry`);
      break;
    case "arc":
    case "arrow":
      if (!validPoint(p.from) || !validPoint(p.to)) issues.push(`${at}: bad endpoints`);
      if (p.k === "arc" && !finite(p.lift)) issues.push(`${at}: bad lift`);
      break;
    case "node":
    case "pulse":
      if (!finite(p.x) || !finite(p.y)) issues.push(`${at}: bad position`);
      if (p.k === "pulse" && !(p.w > 0)) issues.push(`${at}: bad width`);
      if (p.k === "node" && p.d !== undefined && !(p.d > 0)) issues.push(`${at}: bad diameter`);
      break;
    case "dropLine":
    case "divider":
      if (!finite(p.x) || !finite(p.y0) || !finite(p.y1) || p.y1 <= p.y0) issues.push(`${at}: bad geometry`);
      break;
    case "tick":
      if (!finite(p.x) || !finite(p.y)) issues.push(`${at}: bad position`);
      if (p.label !== undefined && !nonEmpty(p.label)) issues.push(`${at}: empty tick label`);
      break;
    case "genre":
    case "formula":
    case "label":
    case "hero":
    case "caption":
    case "chip":
      if (!finite(p.x) || !finite(p.y)) issues.push(`${at}: bad position`);
      if (!nonEmpty(p.text)) issues.push(`${at}: empty text`);
      if (p.k === "chip" && p.w !== undefined && !(p.w > 0)) issues.push(`${at}: bad width`);
      break;
  }
  return issues;
}

function structurallyValid(scene: Scene): string[] {
  if (!Array.isArray(scene.prims) || scene.prims.length === 0) return ["no primitives"];
  return scene.prims.flatMap(primIssues);
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
    for (const lang of ["en", "ru"] as const) {
      const r = resolveAnimation(t, lang);
      if (!r) {
        problems.push({ id: `${t.id}:${lang}`, archetype: t.archetype, issues: ["unmapped archetype"] });
        continue;
      }
      byArchetype.set(r.archetype, (byArchetype.get(r.archetype) ?? 0) + 1);
      const first = r.scene();
      const issues = structurallyValid(first);
      if (JSON.stringify(first) !== JSON.stringify(r.scene())) issues.push("non-deterministic");
      if (issues.length) problems.push({ id: `${t.id}:${lang}`, archetype: r.archetype, issues });
    }
  }

  console.log(`grammar-anim: ${topics.length} topics × en/ru`);
  for (const [a, n] of [...byArchetype.entries()].sort((x, y) => y[1] - x[1]))
    console.log(`  ${a}: ${n}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem topic rendering(s):`);
    for (const p of problems) console.error(`  ${p.id} [${p.archetype}] — ${p.issues.join("; ")}`);
    if (gate) process.exitCode = 1;
  } else {
    console.log("all topics resolve to a valid, deterministic animation ✓");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
