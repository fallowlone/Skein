// Frequency-coverage of the shipped vocab bank, after Nation. Pure core takes a minimal entry
// shape + a known-predicate so it's trivially testable; a thin live wrapper feeds it the real
// vocab arrays and `isKnown`. "engineering" register = general + engineering(NAWL) subset;
// "everyday" = general only.
import type { Band } from "./types";
import type { Register } from "./register";
import { vocabA2 } from "./data/vocab-a2";
import { vocabB1 } from "./data/vocab-b1";
import { vocabB2 } from "./data/vocab-b2";
import { isKnown } from "./state";

export type CoverageEntry = { id: string; band: Band; domain?: "general" | "engineering" };
export type BandCoverage = { band: Band; known: number; total: number; pct: number };
export type Coverage = { bands: BandCoverage[]; overallPct: number; corpusTotal: number };

const BANDS: Band[] = ["A2", "B1", "B2"];
const pct = (k: number, t: number) => (t === 0 ? 0 : Math.round((k / t) * 100));

// engineering register keeps every entry; everyday drops the engineering/NAWL technical subset.
const inRegister = (e: CoverageEntry, r: Register) =>
  r === "engineering" ? true : e.domain !== "engineering" && !e.id.startsWith("nawl:");

export function computeCoverage(
  entries: CoverageEntry[],
  known: (id: string) => boolean,
  register: Register,
): Coverage {
  const corpus = entries.filter((e) => inRegister(e, register));
  const bands: BandCoverage[] = BANDS.map((band) => {
    const inBand = corpus.filter((e) => e.band === band);
    const k = inBand.filter((e) => known(e.id)).length;
    return { band, known: k, total: inBand.length, pct: pct(k, inBand.length) };
  });
  const totalKnown = bands.reduce((n, b) => n + b.known, 0);
  const corpusTotal = corpus.length;
  return { bands, overallPct: pct(totalKnown, corpusTotal), corpusTotal };
}

// Live wrapper used by the island.
export function liveCoverage(register: Register): Coverage {
  const entries: CoverageEntry[] = [...vocabA2, ...vocabB1, ...vocabB2].map((e) => ({
    id: e.id, band: e.band, domain: e.domain,
  }));
  return computeCoverage(entries, isKnown, register);
}
