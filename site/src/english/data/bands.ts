// site/src/english/data/bands.ts
//
// Frequency rank → CEFR band. Heuristic cutoffs over the NGSL rank (documented,
// tunable). NAWL (academic) is treated as B2 wholesale. See spec §2.

import type { Band } from "~/english/types";

export type Source = "ngsl" | "nawl";

/** Inclusive upper rank bound per band, for the NGSL list. */
export const NGSL_CUTOFFS: { band: Band; maxRank: number }[] = [
  { band: "A2", maxRank: 800 },
  { band: "B1", maxRank: 2000 },
  { band: "B2", maxRank: Infinity },
];

/** Approximate count of word families per band — used to scale placement estimates. */
export const BAND_SIZE: Record<Band, number> = { A2: 800, B1: 1200, B2: 1760 };

export function bandForRank(rank: number, source: Source): Band {
  if (source === "nawl") return "B2";
  for (const c of NGSL_CUTOFFS) if (rank <= c.maxRank) return c.band;
  return "B2";
}

/** Stable, zero-padded SRS id from the source list + rank. */
export function idFor(source: Source, rank: number): string {
  return `${source}:${String(rank).padStart(4, "0")}`;
}
