// English Grammar Profile (EGP) competency inventory model. See
// docs/superpowers/specs/2026-06-15-english-grammar-system-design.md §7.
// can_do phrasing is ORIGINAL (not verbatim Cambridge EGP) to stay copyright-safe.
import type { Bi } from "~/english/types";
import type { Cefr } from "~/english/grammar-types";

export type EgpCategory =
  | "verbs" | "tenses-aspect" | "modality" | "conditionals" | "passive"
  | "nouns-determiners" | "pronouns" | "adjectives-adverbs" | "prepositions"
  | "clauses" | "questions-negation" | "discourse-cohesion" | "word-order";

export const EGP_CATEGORIES: EgpCategory[] = [
  "verbs", "tenses-aspect", "modality", "conditionals", "passive",
  "nouns-determiners", "pronouns", "adjectives-adverbs", "prepositions",
  "clauses", "questions-negation", "discourse-cohesion", "word-order",
];

export function isEgpCategory(s: string): s is EgpCategory {
  return (EGP_CATEGORIES as string[]).includes(s);
}

const kebab = (s: string): string =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Stable namespaced id, e.g. "egp.a1.tenses-aspect.present-simple-states". */
export function makeEgpId(cefr: Cefr, category: EgpCategory, slug: string): string {
  return `egp.${cefr.toLowerCase()}.${category}.${kebab(slug)}`;
}

export type EgpEntry = {
  id: string;
  cefr: Cefr;
  category: EgpCategory;
  can_do: Bi;
};
