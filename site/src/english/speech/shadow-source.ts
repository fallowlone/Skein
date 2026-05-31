import type { VocabEntry, Band } from "~/english/types";

const ORDER: Band[] = ["A2", "B1", "B2"];

/** Flatten example sentences from vocab entries at or below the learner's band. */
export function pickShadowSentences(entries: VocabEntry[], band: Band, limit: number): string[] {
  const maxIdx = ORDER.indexOf(band);
  const out: string[] = [];
  for (const e of entries) {
    if (ORDER.indexOf(e.band) > maxIdx) continue;
    for (const ex of e.examples) {
      if (ex && ex.trim()) out.push(ex.trim());
      if (out.length >= limit) return out;
    }
  }
  return out;
}
