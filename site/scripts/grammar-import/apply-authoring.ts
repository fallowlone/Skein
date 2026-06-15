// Deterministic merge of LLM-authored patches into grammar topic modules.
// Fills ONLY empty fields; RU prose is never touched. Invalid related/crossTopic
// ids are dropped; an unknown family is left as "unclassified" so the gate fails
// loudly rather than silently miscategorizing.
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { serializeTopic } from "./serialize";
import { FAMILIES } from "~/english/data/grammar/families";
import type { Cefr, GrammarFamily, GrammarTopic } from "~/english/grammar-types";

const FAMILY_IDS = new Set<string>(FAMILIES.map((f) => f.id));

const Bi = z.object({ en: z.string(), ru: z.string() });
const LevelPatch = z.object({
  explain_en: z.string().optional(),
  structure_en: z.string().optional(),
  structure_ru: z.string().optional(),
  example_notes: z.record(z.string(), Bi).optional(),
  pitfalls: z.array(z.object({
    wrong: z.string(), right: z.string(), why_en: z.string(), why_ru: z.string(),
  })).optional(),
});
export const PatchSchema = z.object({
  id: z.string(),
  title_en: z.string().optional(),
  family: z.string().optional(),
  archetype: z.string().optional(),
  archetypeParams: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  egp: z.array(z.string()).optional(),
  related: z.array(z.string()).optional(),
  crossTopic: z.array(z.string()).optional(),
  levels: z.record(z.string(), LevelPatch).optional(),
});
export type Patch = z.infer<typeof PatchSchema>;

const empty = (s?: string): boolean => !s || s.trim().length === 0;

export function applyPatch(topic: GrammarTopic, patch: Patch, validIds: Set<string>): GrammarTopic {
  const t: GrammarTopic = structuredClone(topic);
  if (empty(t.title.en) && patch.title_en) t.title.en = patch.title_en;
  if (t.family === "unclassified" && patch.family && FAMILY_IDS.has(patch.family))
    t.family = patch.family as GrammarFamily;
  if (empty(t.archetype) && patch.archetype) t.archetype = patch.archetype;
  if (!t.archetypeParams && patch.archetypeParams) t.archetypeParams = patch.archetypeParams;
  if (t.egp.length === 0 && patch.egp) t.egp = patch.egp;
  const clean = (ids?: string[]): string[] => (ids ?? []).filter((id) => validIds.has(id) && id !== t.id);
  if (t.related.length === 0 && patch.related) t.related = clean(patch.related);
  if (t.crossTopic.length === 0 && patch.crossTopic) t.crossTopic = clean(patch.crossTopic);
  for (const [lv, lp] of Object.entries(patch.levels ?? {})) {
    const lesson = t.lessons[lv as Cefr];
    if (!lesson) continue;
    if (empty(lesson.explain.en) && lp.explain_en) lesson.explain.en = lp.explain_en;
    if (empty(lesson.structure.en) && lp.structure_en) lesson.structure.en = lp.structure_en;
    if (empty(lesson.structure.ru) && lp.structure_ru) lesson.structure.ru = lp.structure_ru;
    for (const [idx, note] of Object.entries(lp.example_notes ?? {})) {
      const i = Number(idx);
      if (Number.isInteger(i) && lesson.examples[i] && !lesson.examples[i].note)
        lesson.examples[i].note = note;
    }
    if (!lesson.pitfalls && lp.pitfalls)
      lesson.pitfalls = lp.pitfalls.map((p) => ({ wrong: p.wrong, right: p.right, why: { en: p.why_en, ru: p.why_ru } }));
  }
  return t;
}

// --- I/O driver (bun runtime; must NOT import the Vite barrel) ---
export async function main(): Promise<void> {
  const patchesDir = resolve(import.meta.dir, "patches");
  const outDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  if (!existsSync(patchesDir)) { console.error(`no patches dir: ${patchesDir}`); process.exit(1); }
  const topicFiles = readdirSync(outDir).filter(
    (f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."),
  );
  const validIds = new Set(topicFiles.map((f) => f.replace(/\.ts$/, "")));
  const byId = new Map<string, GrammarTopic>();
  for (const f of topicFiles) {
    const mod = (await import(join(outDir, f))) as { topic: GrammarTopic };
    byId.set(mod.topic.id, mod.topic);
  }
  const patchFiles = readdirSync(patchesDir).filter((f) => f.endsWith(".json"));
  let applied = 0, skipped = 0;
  for (const f of patchFiles) {
    const parsed = PatchSchema.safeParse(JSON.parse(readFileSync(join(patchesDir, f), "utf8")));
    if (!parsed.success) { console.error(`bad patch ${f}: ${parsed.error.message}`); skipped++; continue; }
    const topic = byId.get(parsed.data.id);
    if (!topic) { console.error(`unknown topic ${parsed.data.id} (${f})`); skipped++; continue; }
    writeFileSync(join(outDir, `${topic.id}.ts`), serializeTopic(applyPatch(topic, parsed.data, validIds)), "utf8");
    applied++;
  }
  console.log(`applied ${applied}, skipped ${skipped}`);
}

if (import.meta.main) main();
