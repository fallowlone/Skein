// site/src/german/stats.ts
// Pure progress derivation over germanState + German vocab decks. NO userState
// dependency. Mirrors site/src/english/stats.ts, with a German A1/A2/B1 band scale.
import type { GerBand } from "~/german/types";
import { germanDeck, germanState, isKnown, getPlacement } from "./state";

/** A serializable snapshot of German progress (mirror of EnglishSummary). */
export type GermanSummary = {
  knownTotal: number;
  knownByBand: Record<GerBand, number>;
  band: "none" | GerBand;
  readUnits: number;
  grammarDone: number;
  collocationDone: number;
  graded: boolean;
  updatedAt: number;     // epoch ms; merge tiebreaker for `band`
};

// id → band, built once over the aggregated German deck.
const BAND_OF = new Map<string, GerBand>();
for (const e of germanDeck) BAND_OF.set(e.id, e.band);

export function knownByBand(): Record<GerBand, number> {
  const out: Record<GerBand, number> = { A1: 0, A2: 0, B1: 0 };
  for (const [id, band] of BAND_OF) if (isKnown(id)) out[band]++;
  return out;
}

export function knownTotal(): number {
  const k = knownByBand();
  return k.A1 + k.A2 + k.B1;
}

export function readUnitsCount(): number {
  return Object.keys(germanState.value.readUnits).length;
}

export function gradedOutputCount(): number {
  return Object.values(germanState.value.outputAttempts).filter((a) => a.scoreBand).length;
}

export function grammarDoneCount(): number {
  return Object.keys(germanState.value.grammarDone).length;
}

export function collocationDoneCount(): number {
  return Object.keys(germanState.value.collocationDone).length;
}

export function germanSummary(now: number): GermanSummary {
  const kb = knownByBand();
  return {
    knownTotal: kb.A1 + kb.A2 + kb.B1,
    knownByBand: kb,
    band: getPlacement()?.band ?? "none",
    readUnits: readUnitsCount(),
    grammarDone: grammarDoneCount(),
    collocationDone: collocationDoneCount(),
    graded: gradedOutputCount() > 0,
    updatedAt: now,
  };
}
