// Named answer-derivation strategies. Each computes the blanked target from the
// filled slots — the engine's guarantee that answers are re-derivable offline.
import type { DeriveStrategy } from "./types";
import { verbForm, adjForm } from "./morphology";

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
};

export function getStrategy(key: string): DeriveStrategy {
  const s = DERIVE[key];
  if (!s) throw new Error(`unknown deriveKey strategy: ${key}`);
  return s;
}
