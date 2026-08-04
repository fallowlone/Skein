// site/src/scripts/assess/simulate.ts
// Virtual learners with KNOWN ground truth, so the engine can be measured instead of
// trusted. Test-only: never imported by UI code.
import { pCorrect } from "./likelihood";
import { bandLabel, expectedLevel } from "./ordinal";
import { indexPool, nextItem } from "./select";
import { emptyCell, applyResponse } from "./update";
import { isSettled } from "./verdict";
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

/**
 * A (concept, facet) pair carries no direct evidence when either no cell exists for it yet,
 * or a cell exists but only from cross-facet damping (items === 0). In both cases the
 * reported band must not read as a gap — an untested skill is unknown, not disproven. This
 * checks the SAME statistic the report uses to label a band (`bandLabel`), independent of
 * `verdict.ts`'s own "untested" status guard, so a drift in the prior/likelihood math would
 * show up here even if a future consumer forgot to gate on `items === 0` first.
 */
function isUngroundedGap(cell: Cell | undefined, conceptId: string, facet: Facet, band: Band): boolean {
  if (cell && cell.items > 0) return false;
  const posterior = cell ? cell.posterior : emptyCell(conceptId, facet, band).posterior;
  return bandLabel(posterior).level === "gap";
}

export function runSimulation({ learners, conceptsPerLearner, seed }: SimArgs): SimResult {
  const rand = rng(seed);
  const names = Object.keys(PROFILES);
  const bandOf = () => "surface" as Band;

  const errors: number[] = [];
  const itemsToSettle: number[] = [];
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

    for (let step = 0; step < conceptsPerLearner * FACETS.length * 3; step++) {
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
        if (isSettled(cell)) itemsToSettle.push(cell.items);
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
