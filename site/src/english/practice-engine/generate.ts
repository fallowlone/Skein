import type { Cefr, ExerciseType, GrammarTopic, TopicGenSpec } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { grammarById } from "~/english/data/grammar/index";
import type { GeneratedExercise } from "./types";
import { fillTemplate, fillContext } from "./fill";
import { BatchDedup } from "./dedup";

export type GenerateOpts = { level?: Cefr; types?: ExerciseType[]; count: number; seed: number };

const inBand = (min: Cefr, max: Cefr, lv: Cefr): boolean =>
  cefrIndex(lv) >= cefrIndex(min) && cefrIndex(lv) <= cefrIndex(max);

export function generateFromSpec(topicId: string, spec: TopicGenSpec, opts: GenerateOpts): GeneratedExercise[] {
  const { count, seed } = opts;
  const level = opts.level;
  let templates = spec.templates;
  if (opts.types?.length) templates = templates.filter((t) => opts.types!.includes(t.type));
  if (level) templates = templates.filter((t) => inBand(t.cefrMin, t.cefrMax, level));
  if (templates.length === 0) return [];

  const dedup = new BatchDedup();
  const out: GeneratedExercise[] = [];
  const MAX_TRIES = count * 50;
  for (let i = 0; i < MAX_TRIES && out.length < count; i++) {
    const tpl = templates[i % templates.length];
    const lv = level ?? tpl.cefrMin;
    if (tpl.usesContext) {
      const framings = tpl.framings ?? ["cloze"];
      const framing = framings[i % framings.length];
      const ex = fillContext(tpl, spec.contexts ?? [], framing, lv, seed + i);
      if (!dedup.accept(`${ex.type}|${ex.prompt}`)) continue;
      out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${framing}:${seed + i}` });
    } else {
      const ex = fillTemplate(tpl, spec.pools, lv, seed + i);
      if (!dedup.accept(ex.prompt)) continue;
      out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${seed + i}` });
    }
  }
  return out;
}

// Dependency direction: cross-topic.ts imports FROM this file (generateSetFromSpec +
// CompositeSupplier). Do NOT import cross-topic.ts here — that would create a cycle.
// The corpus-backed composite entry point (generateTopicSet) lives in cross-topic.ts.
/** Supplier of cross-topic composite items for a focus topic, used to top up volume. */
export type CompositeSupplier = (topicId: string, seed: number) => GeneratedExercise[];

/** Generate up to `count` unique items: native first, then composites if native is short. */
export function generateSetFromSpec(
  topicId: string,
  spec: TopicGenSpec,
  opts: GenerateOpts,
  composites?: CompositeSupplier,
): GeneratedExercise[] {
  const native = generateFromSpec(topicId, spec, opts);
  if (native.length >= opts.count || !composites) return native;
  const seen = new Set(native.map((e) => `${e.type}|${e.prompt}`));
  const out = native.slice();
  for (const ex of composites(topicId, opts.seed)) {
    if (out.length >= opts.count) break;
    const key = `${ex.type}|${ex.prompt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...ex, topicId });
  }
  return out;
}

/** Convenience: pull a topic's committed gen spec from the corpus. */
export function generate(topicId: string, opts: GenerateOpts): GeneratedExercise[] {
  const topic: GrammarTopic | undefined = grammarById.get(topicId);
  if (!topic?.gen) return [];
  return generateFromSpec(topicId, topic.gen, opts);
}
