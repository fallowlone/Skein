import type { Cefr, ContextFraming, Pool, TaggedContext, Template } from "~/english/grammar-types";
import type { GeneratedExercise } from "./types";
import { createRng, pickIndex } from "./rng";
import { getStrategy } from "./derive";
import { verbForm, nounPlural, adjForm } from "./morphology";

// A slot's optional `feature` requests a morphology transform on the chosen token.
function applyFeature(token: string, feature?: string): string {
  switch (feature) {
    case "s3": return verbForm(token, "s3");
    case "past": return verbForm(token, "past");
    case "pastParticiple": return verbForm(token, "pastParticiple");
    case "gerund": return verbForm(token, "gerund");
    case "plural": return nounPlural(token);
    case "comparative": return adjForm(token, "comparative");
    case "superlative": return adjForm(token, "superlative");
    case "passive": return verbForm(token, "pastParticiple");
    default: return token;
  }
}

function poolFor(pools: Pool[], id: string): Pool {
  const p = pools.find((x) => x.id === id);
  if (!p) throw new Error(`pool not found: ${id}`);
  return p;
}

export function fillTemplate(tpl: Template, pools: Pool[], level: Cefr, seed: number): GeneratedExercise {
  const rng = createRng(seed);
  const slots: Record<string, string> = {};
  const raw: Record<string, string> = {};
  for (const [name, def] of Object.entries(tpl.slots)) {
    const pool = poolFor(pools, def.pool);
    const token = pool.items[pickIndex(pool.items.length, rng)];
    raw[name] = token;
    slots[name] = applyFeature(token, def.feature);
  }
  let prompt = tpl.pattern;
  for (const [name, val] of Object.entries(slots)) {
    prompt = prompt.replace(new RegExp(`\\{${name}\\}`, "g"), val);
  }
  const { primary, alternates } = getStrategy(tpl.deriveKey)({ slots, raw, level });
  const interp = (s: string): string => {
    let out = s;
    for (const [name, val] of Object.entries(slots)) out = out.replace(new RegExp(`\\{${name}\\}`, "g"), val);
    return out.replace(/\{answer\}/g, primary);
  };
  return {
    id: `${tpl.id}:${seed}`,
    topicId: "",            // generate() stamps this
    cefr: level,
    type: tpl.type,
    prompt,
    answer: primary,
    alts: alternates,
    rationale: { en: interp(tpl.rationale.en), ru: interp(tpl.rationale.ru) },
  };
}

/** Deterministic seeded shuffle (Fisher–Yates over a copy). */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = pickIndex(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Render one exercise from a tagged-context template. The answer travels with the
 *  context (authored), so this is fully offline and reproducible. */
export function fillContext(
  tpl: Template,
  contexts: TaggedContext[],
  framing: ContextFraming,
  level: Cefr,
  seed: number,
): GeneratedExercise {
  if (contexts.length === 0) throw new Error(`fillContext: no contexts for template ${tpl.id}`);
  const rng = createRng(seed);
  const ctx = contexts[pickIndex(contexts.length, rng)];
  const answer = ctx.answer;
  const interp = (s: string): string => s.replace(/\{answer\}/g, answer);
  const base = {
    id: `${tpl.id}:${framing}:${seed}`,
    topicId: "",
    cefr: ctx.cefr ?? level,
    prompt: ctx.stem,
    answer,
    alts: ctx.alts ?? [],
    rationale: { en: interp(tpl.rationale.en), ru: interp(tpl.rationale.ru) },
  };
  if (framing === "mc") {
    const options = shuffle([answer, ...(ctx.distractors ?? [])], rng);
    return { ...base, type: "multiple_choice", options };
  }
  return { ...base, type: "fill_in_blank" };
}
