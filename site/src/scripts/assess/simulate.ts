// site/src/scripts/assess/simulate.ts
// Virtual learners with KNOWN ground truth, so the engine can be measured instead of
// trusted. Test-only: never imported by UI code.
import { pCorrect } from "./likelihood";
import { expectedLevel } from "./ordinal";
import { indexPool, nextItem } from "./select";
import { applyResponse } from "./update";
import { isUngroundedGap } from "./ungrounded-gap";
import { MAX_ITEMS_PER_CELL, isSettled } from "./verdict";
import { LEVELS, cellKey, type AssessItem, type Band, type Cell, type CellKey, type Facet, type Level, type Outcome } from "./types";

export interface Profile {
  /** True level index (0..3) per facet. */
  truth: Record<Facet, number>;
  /** Says "don't know" instead of guessing when unsure. */
  honest: boolean;
}

export const PROFILES: Record<string, Profile> = {
  "uniform-junior":            { truth: { recognition: 1, mechanism: 1, production: 1 }, honest: true },
  "uniform-senior":            { truth: { recognition: 3, mechanism: 3, production: 3 }, honest: true },
  "production-not-mechanism":  { truth: { recognition: 2, mechanism: 1, production: 3 }, honest: true },
  "terms-only":                { truth: { recognition: 3, mechanism: 1, production: 0 }, honest: true },
  "honest-beginner":           { truth: { recognition: 1, mechanism: 0, production: 0 }, honest: true },
  "guesser-beginner":          { truth: { recognition: 1, mechanism: 0, production: 0 }, honest: false },
};

/** Deterministic PRNG so a failing gate is reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const SLIP = 0.08; // even a knower fumbles sometimes

export function makeLearner(profile: Profile, rand: () => number) {
  return (item: AssessItem): Outcome => {
    const level = LEVELS[profile.truth[item.facet]] as Level;
    const p = pCorrect(level, item.band, 0, item.kind) * (1 - SLIP);
    if (rand() < p) return "correct";
    // Below their level, an honest learner declines; a guesser always answers.
    if (profile.honest && rand() < 0.6) return "dont_know";
    return "wrong";
  };
}

export interface SimArgs {
  learners: number;
  conceptsPerLearner: number;
  seed: number;
}

export interface FacetStat { mean: number; n: number }

export interface SimResult {
  withinOne: number;
  meanSignedError: number;
  medianItemsToSettle: number;
  /**
   * Share of settled cells that settled on entropy strictly before hitting
   * MAX_ITEMS_PER_CELL. `medianItemsToSettle <= 3` alone cannot fail while the cap is 3
   * (isSettled forces every cell to stop by its third item regardless of how informative the
   * evidence was) — this is the discriminating half of that gate: a flat or broken likelihood
   * would drive this toward 0 while the median stayed a comfortable 3.
   */
  subCapSettleFraction: number;
  gapsWithoutEvidence: number;
  honestMinusGuesser: number;
  byProfile: Record<string, Record<Facet, FacetStat>>;
}

const FACETS: Facet[] = ["recognition", "mechanism", "production"];
const KINDS: { kind: AssessItem["kind"]; facet: Facet }[] = [
  { kind: "mcq", facet: "recognition" },
  { kind: "predict", facet: "mechanism" },
  { kind: "debug", facet: "mechanism" },
  { kind: "exec", facet: "production" },
];

function poolFor(conceptIds: string[], band: Band): AssessItem[] {
  const out: AssessItem[] = [];
  for (const c of conceptIds) {
    for (const { kind, facet } of KINDS) {
      for (let n = 0; n < 4; n++) {
        out.push({
          id: `${c}#${kind}${n}`, lessonKey: c, taskId: `${kind}${n}`, kind, facet,
          band, concepts: [c], weight: 1, estMin: 4,
        });
      }
    }
  }
  return out;
}

export function runSimulation({ learners, conceptsPerLearner, seed }: SimArgs): SimResult {
  const rand = rng(seed);
  const names = Object.keys(PROFILES);
  const bandOf = () => "surface" as Band;

  const errors: number[] = [];
  const itemsToSettle: number[] = [];
  let subCapSettles = 0;
  let gapsWithoutEvidence = 0;
  const byProfile: Record<string, Record<Facet, { sum: number; n: number }>> = {};
  const profileErrorSums: Record<string, number> = {};
  const profileLearnerCounts: Record<string, number> = {};

  for (let i = 0; i < learners; i++) {
    const name = names[i % names.length];
    const profile = PROFILES[name];
    const answer = makeLearner(profile, rand);
    const conceptIds = Array.from({ length: conceptsPerLearner }, (_, k) => `c${k}`);
    const pool = poolFor(conceptIds, "surface");
    const index = indexPool(pool);

    let cells = new Map<CellKey, Cell>();
    const asked = new Set<string>();
    let recentKinds: AssessItem["kind"][] = [];

    // Budget is proportional to MAX_ITEMS_PER_CELL, not a hardcoded "3", so that a future
    // change to the cap doesn't silently starve every cell's fair share of questions — a
    // fixed budget under a raised cap is exactly the confound Task 10 fix round 1 (finding 3)
    // flagged in the tuning experiment: some cells hog the larger cap while others go
    // unasked, which corrupts gapsWithoutEvidence as a side effect of the harness's own
    // bookkeeping rather than telling you anything about the engine.
    for (let step = 0; step < conceptsPerLearner * FACETS.length * MAX_ITEMS_PER_CELL; step++) {
      const item = nextItem({ index, cells, candidates: conceptIds, bandOf, askedIds: asked, recentKinds });
      if (!item) break;
      asked.add(item.id);
      recentKinds = [...recentKinds, item.kind].slice(-2);
      cells = applyResponse(cells, item, { outcome: answer(item), hintsUsed: 0, elapsedMs: 0 }, bandOf, step);
    }

    byProfile[name] ??= { recognition: { sum: 0, n: 0 }, mechanism: { sum: 0, n: 0 }, production: { sum: 0, n: 0 } };
    profileLearnerCounts[name] = (profileLearnerCounts[name] ?? 0) + 1;
    let learnerErrorSum = 0, learnerCells = 0;

    for (const c of conceptIds) {
      for (const f of FACETS) {
        const cell = cells.get(cellKey(c, f));

        if (isUngroundedGap(cell, c, f, "surface")) gapsWithoutEvidence++;

        if (!cell || cell.items === 0) continue;
        const est = expectedLevel(cell.posterior);
        const truth = profile.truth[f];
        errors.push(est - truth);
        learnerErrorSum += est - truth;
        learnerCells++;
        byProfile[name][f].sum += est;
        byProfile[name][f].n += 1;
        if (isSettled(cell)) {
          itemsToSettle.push(cell.items);
          if (cell.items < MAX_ITEMS_PER_CELL) subCapSettles++;
        }
      }
    }
    if (learnerCells > 0) {
      profileErrorSums[name] = (profileErrorSums[name] ?? 0) + learnerErrorSum / learnerCells;
    }
  }

  const sorted = [...itemsToSettle].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  const profileMeans: Record<string, number> = {};
  for (const name of names) {
    const count = profileLearnerCounts[name] ?? 0;
    profileMeans[name] = count > 0 ? (profileErrorSums[name] ?? 0) / count : 0;
  }

  return {
    withinOne: errors.filter((e) => Math.abs(e) <= 1).length / Math.max(1, errors.length),
    meanSignedError: errors.reduce((a, b) => a + b, 0) / Math.max(1, errors.length),
    medianItemsToSettle: median,
    subCapSettleFraction: itemsToSettle.length ? subCapSettles / itemsToSettle.length : 0,
    gapsWithoutEvidence,
    honestMinusGuesser: (profileMeans["honest-beginner"] ?? 0) - (profileMeans["guesser-beginner"] ?? 0),
    byProfile: Object.fromEntries(
      Object.entries(byProfile).map(([k, v]) => [
        k,
        Object.fromEntries(FACETS.map((f) => [f, { mean: v[f].n ? v[f].sum / v[f].n : 0, n: v[f].n }])) as Record<Facet, FacetStat>,
      ]),
    ),
  };
}
