// site/src/english/placement/placement.ts
//
// Vocab-size placement. A yes/no recognition checklist sampled across frequency
// bands, with pseudoword controls. The false-alarm rate on pseudowords corrects
// over-claiming (standard yes/no correction h* = (h - f) / (1 - f)). Output:
// estimated known word-family count + the starting band. Pure; RNG injected.

import type { Band } from "~/english/types";
import { BAND_SIZE } from "~/english/data/bands";
import { SAMPLE_WORDS } from "./sample-words";
import { PSEUDOWORDS } from "./pseudowords";

export type PlacementItem = {
  lemma: string;
  rank: number;
  band: Band;
  isPseudo: boolean;
};

export type PlacementScore = {
  estimatedKnown: number;
  band: Band;            // starting band for new words
  knownLemmas: string[]; // real lemmas the learner marked "yes"
};

const BANDS: Band[] = ["A2", "B1", "B2"];
const MASTERY = 0.8; // corrected hit-rate to count a band "mastered"

/** Deterministic Fisher–Yates using an injected [0,1) RNG. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildPlacement(rng: () => number): PlacementItem[] {
  const real: PlacementItem[] = SAMPLE_WORDS.map((w) => ({ ...w, isPseudo: false }));
  const fake: PlacementItem[] = PSEUDOWORDS.map((lemma) => ({
    lemma, rank: 0, band: "B2" as Band, isPseudo: true,
  }));
  return shuffle([...real, ...fake], rng);
}

/** Corrected hit-rate for a subset of items, given the false-alarm rate. */
function corrected(hit: number, total: number, f: number): number {
  if (total === 0) return 0;
  const h = hit / total;
  return f >= 1 ? 0 : Math.max(0, (h - f) / (1 - f));
}

export function scorePlacement(items: PlacementItem[], yes: Set<number>): PlacementScore {
  const pseudo = items.filter((i) => i.isPseudo);
  const pseudoYes = items.reduce((n, it, idx) => n + (it.isPseudo && yes.has(idx) ? 1 : 0), 0);
  const f = pseudo.length ? pseudoYes / pseudo.length : 0;

  // Per-band corrected recognition.
  const perBand: Record<Band, number> = { A2: 0, B1: 0, B2: 0 };
  const knownLemmas: string[] = [];
  for (const b of BANDS) {
    const band = items
      .map((it, idx) => ({ it, idx }))
      .filter(({ it }) => !it.isPseudo && it.band === b);
    const hit = band.reduce((n, { idx }) => n + (yes.has(idx) ? 1 : 0), 0);
    perBand[b] = corrected(hit, band.length, f);
    for (const { it, idx } of band) if (yes.has(idx)) knownLemmas.push(it.lemma);
  }

  const estimatedKnown = Math.round(
    BANDS.reduce((sum, b) => sum + perBand[b] * BAND_SIZE[b], 0),
  );

  // Starting band = the lowest band not yet mastered.
  let band: Band = "A2";
  if (perBand.A2 >= MASTERY) band = "B1";
  if (perBand.A2 >= MASTERY && perBand.B1 >= MASTERY) band = "B2";

  return { estimatedKnown, band, knownLemmas };
}
