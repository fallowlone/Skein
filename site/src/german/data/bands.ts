// site/src/german/data/bands.ts
//
// Frequency rank → CEFR band for the German layer. Heuristic cutoffs (documented,
// tunable). Mirrors site/src/english/data/bands.ts but with the A1/A2/B1 scale.

import type { GerBand } from "~/german/types";

/** Inclusive upper rank bound per band. */
export const GER_CUTOFFS: { band: GerBand; maxRank: number }[] = [
  { band: "A1", maxRank: 600 },
  { band: "A2", maxRank: 1600 },
  { band: "B1", maxRank: Infinity },
];

/** Approximate count of word families per band — used to scale placement estimates. */
export const BAND_SIZE: Record<GerBand, number> = { A1: 600, A2: 1000, B1: 1500 };

export function bandForRank(rank: number): GerBand {
  for (const c of GER_CUTOFFS) if (rank <= c.maxRank) return c.band;
  return "B1";
}

/** Stable, zero-padded SRS id from the rank. */
export function idFor(rank: number): string {
  return `de:${String(rank).padStart(4, "0")}`;
}
