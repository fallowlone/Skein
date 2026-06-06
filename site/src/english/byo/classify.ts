// Bucket tokenized lemmas against the vocab bank + the user's known set:
//   known      — lemma maps to a bank entry the user already knows
//   newWords   — lemma maps to a bank entry not yet known (has a real card path: id, gloss, ru)
//   technical  — lemma not in the bank at all (surfaced, but not auto-carded in v1)
import type { Lemma } from "./tokenize";

export type BankIndexEntry = { id: string; lemma: string };
export type ClassifiedWord = { lemma: string; count: number; id?: string };
export type Classification = {
  known: ClassifiedWord[];
  newWords: ClassifiedWord[];
  technical: ClassifiedWord[];
  counts: { known: number; new: number; technical: number };
};

export function classifyLemmas(
  lemmas: Lemma[],
  bank: BankIndexEntry[],
  known: (id: string) => boolean,
): Classification {
  const byLemma = new Map(bank.map((e) => [e.lemma, e.id]));
  const out: Classification = { known: [], newWords: [], technical: [], counts: { known: 0, new: 0, technical: 0 } };
  for (const { lemma, count } of lemmas) {
    const id = byLemma.get(lemma);
    if (id && known(id)) out.known.push({ lemma, count, id });
    else if (id) out.newWords.push({ lemma, count, id });
    else out.technical.push({ lemma, count });
  }
  out.counts = { known: out.known.length, new: out.newWords.length, technical: out.technical.length };
  return out;
}

// Live bank index built from the vocab arrays (used by the island).
export function bankIndex(entries: { id: string; lemma: string }[]): BankIndexEntry[] {
  return entries.map((e) => ({ id: e.id, lemma: e.lemma.toLowerCase() }));
}
