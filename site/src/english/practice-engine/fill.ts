import type { Cefr, Pool, Template } from "~/english/grammar-types";
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
