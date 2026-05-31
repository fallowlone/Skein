// site/src/english/stats.ts
// Pure progress derivation over englishState + vocab decks. NO userState dependency.
import type { Band, EnglishSummary } from "~/english/types";
import { vocabA2 } from "./data/vocab-a2";
import { vocabB1 } from "./data/vocab-b1";
import { vocabB2 } from "./data/vocab-b2";
import { englishState, isKnown, getPlacement } from "./state";

// id → band, built once.
const BAND_OF = new Map<string, Band>();
for (const e of [...vocabA2, ...vocabB1, ...vocabB2]) BAND_OF.set(e.id, e.band);

export function knownByBand(): Record<Band, number> {
  const out: Record<Band, number> = { A2: 0, B1: 0, B2: 0 };
  for (const [id, band] of BAND_OF) if (isKnown(id)) out[band]++;
  return out;
}

export function knownTotal(): number {
  const k = knownByBand();
  return k.A2 + k.B1 + k.B2;
}

export function readUnitsCount(): number {
  return Object.keys(englishState.value.readUnits).length;
}

export function gradedOutputCount(): number {
  return Object.values(englishState.value.outputAttempts).filter((a) => a.scoreBand).length;
}

export function grammarDoneCount(): number {
  return Object.keys(englishState.value.grammarDone).length;
}

export function collocationDoneCount(): number {
  return Object.keys(englishState.value.collocationDone).length;
}

export function englishSummary(now: number): EnglishSummary {
  const kb = knownByBand();
  return {
    knownTotal: kb.A2 + kb.B1 + kb.B2,
    knownByBand: kb,
    band: getPlacement()?.band ?? "none",
    readUnits: readUnitsCount(),
    grammarDone: grammarDoneCount(),
    collocationDone: collocationDoneCount(),
    graded: gradedOutputCount() > 0,
    updatedAt: now,
  };
}
