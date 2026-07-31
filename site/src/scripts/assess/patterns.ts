// site/src/scripts/assess/patterns.ts
// Named shapes of knowledge, derived mechanically from the facet vector (spec §9.1).
import { LEVELS, type Facet } from "./types";
import type { ConceptVerdict } from "./verdict";

export type PatternId =
  | "term-without-mechanism"
  | "does-without-explaining"
  | "knows-cannot-apply"
  | "fragile"
  | "declined"
  | "untested";

export const PATTERN_LABELS: Record<PatternId, { en: string; ru: string }> = {
  "term-without-mechanism": { en: "Knows the term, not the mechanism", ru: "Знает термин, не знает механизм" },
  "does-without-explaining": { en: "Does it, cannot explain it", ru: "Делает, но не объясняет" },
  "knows-cannot-apply": { en: "Explains it, cannot write it", ru: "Объясняет, но не пишет" },
  fragile: { en: "Reached only with hints — fragile", ru: "Дошёл только с подсказками — хрупко" },
  declined: { en: "Declined the question", ru: "Отказ от ответа" },
  untested: { en: "Not tested", ru: "Не проверялось" },
};

const idx = (level: string) => LEVELS.indexOf(level as (typeof LEVELS)[number]);
const at = (v: ConceptVerdict, f: Facet) => (v.facets[f].band ? idx(v.facets[f].band!.level) : null);
const MIDDLE = idx("middle");
const JUNIOR = idx("junior");

export function detectPatterns(v: ConceptVerdict): PatternId[] {
  if (v.status === "untested") return ["untested"];
  const out: PatternId[] = [];
  const rec = at(v, "recognition"), mech = at(v, "mechanism"), prod = at(v, "production");

  if (rec !== null && mech !== null && rec >= MIDDLE && mech <= JUNIOR) out.push("term-without-mechanism");
  if (prod !== null && mech !== null && prod >= MIDDLE && mech <= JUNIOR) out.push("does-without-explaining");
  if (mech !== null && prod !== null && mech >= MIDDLE && prod <= JUNIOR) out.push("knows-cannot-apply");
  if (v.fragile) out.push("fragile");
  if (Object.values(v.facets).reduce((n, f) => n + f.declined, 0) >= 2) out.push("declined");
  return out;
}
