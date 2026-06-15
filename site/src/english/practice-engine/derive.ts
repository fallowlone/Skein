// Named answer-derivation strategies. Each computes the blanked target from the
// filled slots — the engine's guarantee that answers are re-derivable offline.
import type { DeriveStrategy } from "./types";
import { verbForm, adjForm, nounPlural, negate, questionAux, possessive } from "./morphology";

const THIRD_SG = new Set(["he", "she", "it", "this", "that"]);
const is3sg = (subject: string): boolean => {
  const head = subject.trim().split(/\s+/)[0].toLowerCase();
  if (THIRD_SG.has(head)) return true;
  if (["i", "you", "we", "they", "these", "those"].includes(head)) return false;
  // default: a singular noun phrase is 3sg unless explicitly plural-marked
  return !/s$/.test(subject.trim());
};

export const DERIVE: Record<string, DeriveStrategy> = {
  "verb-agreement-present": ({ slots }) => {
    const v = is3sg(slots.subj) ? verbForm(slots.verb, "s3") : slots.verb;
    return { primary: v, alternates: [] };
  },
  "comparative-form": ({ slots }) => ({ primary: adjForm(slots.adj, "comparative"), alternates: [] }),
  "superlative-form": ({ slots }) => ({ primary: adjForm(slots.adj, "superlative"), alternates: [] }),
  "passive-be-participle": ({ slots, raw }) => {
    const be = (raw.num === "pl" || !is3sg(slots.subj)) ? "are" : "is";
    return { primary: `${be} ${verbForm(slots.verb, "pastParticiple")}`, alternates: [] };
  },
  "past-simple-form": ({ slots }) => ({ primary: verbForm(slots.verb, "past"), alternates: [] }),
  "present-participle-form": ({ slots }) => ({ primary: verbForm(slots.verb, "gerund"), alternates: [] }),
  "noun-plural-form": ({ slots }) => ({ primary: nounPlural(slots.noun), alternates: [] }),
  "negative-present": ({ slots }) => ({ primary: negate(slots.verb, "present", slots.subj), alternates: [] }),
  "negative-past": ({ slots }) => ({ primary: negate(slots.verb, "past", slots.subj), alternates: [] }),
  "question-aux-present": ({ slots }) => ({ primary: questionAux("present", slots.subj), alternates: [] }),
  "question-aux-past": ({ slots }) => ({ primary: questionAux("past", slots.subj), alternates: [] }),
  "possessive-s": ({ slots }) => ({ primary: possessive(slots.noun), alternates: [] }),
  // Sentinel: tagged-context templates carry the answer with the context; fillContext
  // supplies it directly. This keeps getStrategy total so validate.ts never throws.
  "context": () => ({ primary: "", alternates: [] }),
};

export function getStrategy(key: string): DeriveStrategy {
  const s = DERIVE[key];
  if (!s) throw new Error(`unknown deriveKey strategy: ${key}`);
  return s;
}
