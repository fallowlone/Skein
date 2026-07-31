// Posterior algebra over the four ordered levels. Pure; no I/O.
import { LEVELS, type Band, type Facet, type Level, type Posterior } from "./types";

const N = LEVELS.length;

export const uniform = (): Posterior => [0.25, 0.25, 0.25, 0.25];

export function normalize(v: readonly number[]): Posterior {
  const safe = v.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const sum = safe.reduce((a, b) => a + b, 0);
  if (sum <= 0) return uniform();
  return [safe[0] / sum, safe[1] / sum, safe[2] / sum, safe[3] / sum];
}

/** Shannon entropy normalised to [0,1] so thresholds read the same whatever N is. */
export function entropyOrd(p: Posterior): number {
  let h = 0;
  for (const x of p) if (x > 0) h -= x * Math.log2(x);
  return h / Math.log2(N);
}

/** Mass-weighted index over LEVELS: 0 = certainly gap, 3 = certainly senior. */
export function expectedLevel(p: Posterior): number {
  return p.reduce((acc, x, i) => acc + x * i, 0);
}

export interface BandLabel {
  level: Level;
  /** "-" / "" / "+" — where the mass leans relative to the modal level. */
  qualifier: "-" | "" | "+";
  /** Mass on the modal level: how sure we are of the label itself. */
  confidence: number;
}

export function bandLabel(p: Posterior): BandLabel {
  let mode = 0;
  for (let i = 1; i < N; i++) if (p[i] > p[mode]) mode = i;
  const below = mode > 0 ? p[mode - 1] : 0;
  const above = mode < N - 1 ? p[mode + 1] : 0;
  const LEAN = 0.15; // a lean smaller than this is noise, not a qualifier
  const qualifier = above - below > LEAN ? "+" : below - above > LEAN ? "-" : "";
  return { level: LEVELS[mode], qualifier, confidence: p[mode] };
}

// Prior mass by concept band. Harder bands start with more mass on `gap`.
const BAND_PRIOR: Record<Band, Posterior> = {
  foundations: [0.20, 0.35, 0.30, 0.15],
  surface:     [0.30, 0.35, 0.25, 0.10],
  middle:      [0.45, 0.30, 0.18, 0.07],
  advanced:    [0.60, 0.25, 0.11, 0.04],
};

// Recognising a term is strictly easier than producing working code, so the facets do
// not start equal. Weights multiply the prior and are renormalised.
const FACET_TILT: Record<Facet, Posterior> = {
  recognition: [0.8, 1.1, 1.1, 1.0],
  mechanism:   [1.0, 1.0, 1.0, 1.0],
  production:  [1.3, 1.0, 0.8, 0.7],
};

export function priorFromBand(band: Band, facet: Facet): Posterior {
  const base = BAND_PRIOR[band];
  const tilt = FACET_TILT[facet];
  return normalize([base[0] * tilt[0], base[1] * tilt[1], base[2] * tilt[2], base[3] * tilt[3]]);
}
