// site/src/scripts/assess/verdict.ts
// Cells → a per-concept verdict. Pure.
import { bandLabel, entropyOrd, expectedLevel, type BandLabel } from "./ordinal";
import { FACETS, LEVELS, cellKey, type Cell, type CellKey, type Facet } from "./types";

/**
 * Simulation harness results (Task 10, `simulate.test.ts`, seed 20260731, 200 learners ×
 * 12 concepts) for the constants currently checked in, so a future edit of SETTLE_ENTROPY
 * (or DISCRIMINATION/HINT_STEP in likelihood.ts, or BAND_PRIOR/FACET_TILT in ordinal.ts) can
 * see what it is trading away:
 *
 *   withinOne             0.9104   (gate: >= 0.90)
 *   meanSignedError       -0.1486  (gate: |x| <= 0.25 — estimator runs slightly harsh)
 *   medianItemsToSettle   3        (gate: <= 3, at MAX_ITEMS_PER_CELL — see the discriminating
 *                                   subCapSettleFraction gate in simulate.test.ts, ~0.48)
 *   gapsWithoutEvidence   0        (gate: == 0, at band: "surface" — see ungrounded-gap.ts for
 *                                   why this does not generalise to every band)
 *   honestMinusGuesser    0.0421   (gate: >= 0)
 *
 * SETTLE_ENTROPY was left at its original value: at this pool size (4 items per kind per
 * concept) even a noise-free run of five straight "correct" answers for a senior learner still
 * leaves entropy at ~0.58 — above the 0.55 threshold — so loosening SETTLE_ENTROPY a little
 * would not change which cells settle by entropy vs. by cap. The real lever for `withinOne`
 * turned out to be DISCRIMINATION (1.2 → 3.85 in likelihood.ts) plus a bias correction in
 * ordinal.ts (BAND_PRIOR.surface, FACET_TILT.production) — see the comments at those constants.
 *
 * MAX_ITEMS_PER_CELL cap-raise experiment (fix round 1, finding 3): an earlier attempt to
 * measure whether raising the cap improves accuracy was confounded — the harness's per-learner
 * step budget was a hardcoded `conceptsPerLearner * FACETS.length * 3`, so raising the cap
 * under that fixed budget starved *other* cells of their share of it, corrupting
 * gapsWithoutEvidence (0 up to 87) as an artifact of the harness's own bookkeeping rather than
 * telling anything about the engine. simulate.ts now scales the budget by MAX_ITEMS_PER_CELL
 * itself, removing that confound. Re-run unconfounded (proportional budget, same seed/learners):
 *
 *   cap=3   withinOne 0.9104  meanSignedError -0.1486  subCapSettleFraction 0.48  honestMinusGuesser 0.042
 *   cap=4   withinOne 0.9256  meanSignedError -0.1582  subCapSettleFraction 0.71  honestMinusGuesser 0.028
 *   cap=5   withinOne 0.9179  meanSignedError -0.1585  subCapSettleFraction 0.98  honestMinusGuesser 0.051
 *   cap=6   withinOne 0.9200  meanSignedError -0.1560  subCapSettleFraction 1.00  honestMinusGuesser 0.045
 *   cap=8   withinOne 0.9214  meanSignedError -0.1532  subCapSettleFraction 1.00  honestMinusGuesser 0.034
 *
 * gapsWithoutEvidence stayed 0 at every cap once the budget confound was removed. So raising
 * the cap by one (3→4) genuinely buys ~1.5 points of withinOne at real cost — every real
 * assessment gets up to 33% longer per cell in the worst case, though most of that cost is
 * avoided in practice once cells start settling on entropy before reaching the cap
 * (subCapSettleFraction jumps from 0.48 to 0.71 at cap=4). This is a product tradeoff (session
 * length vs. accuracy), not an engine-correctness question, so it was NOT applied here — it is
 * reported for the assess-engine owner to decide, not landed unilaterally by this task.
 *
 * Known limitation, disclosed rather than hidden: raising the cap does NOT fully fix a single
 * early slip. Directly exercising `applyResponse` on one cell (senior learner, `wrong` then
 * `correct` streak, `band: "surface"`, current DISCRIMINATION=3.85): `[wrong, correct,
 * correct]` (cap=3) settles at "middle-" (expectedLevel 1.76); extending to `[wrong, correct,
 * correct, correct, correct]` (cap=5) only creeps to "middle" (expectedLevel 2.02) — a full
 * band short of "senior-" (expectedLevel ~2.53-2.56), which a no-slip `[correct, correct,
 * correct]` streak reaches at cap=3 already. An ~8% slip (SLIP in simulate.ts, meant to model
 * "even a knower fumbles sometimes") is common enough to hit some of a learner's ~36 cells, and
 * this is the dominant driver of the persistent negative meanSignedError above. It is a
 * structural property of Bayesian updating with few items — the guess floor keeps "correct"
 * partially likely even at lower levels, so a handful of correct answers cannot fully undo one
 * confidently-wrong one — not something either cap or the constants tuned here removes.
 */
export const SETTLE_ENTROPY = 0.55;
export const MAX_ITEMS_PER_CELL = 3;

export function isSettled(cell: Cell): boolean {
  return cell.items >= MAX_ITEMS_PER_CELL || entropyOrd(cell.posterior) <= SETTLE_ENTROPY;
}

export interface FacetVerdict {
  status: "measured" | "untested";
  band: BandLabel | null;
  items: number;
  fragile: boolean;
  declined: number;
}

export interface ConceptVerdict {
  conceptId: string;
  status: "measured" | "untested";
  /** Minimum across measured facets. Null when nothing was measured. */
  band: BandLabel | null;
  facets: Record<Facet, FacetVerdict>;
  fragile: boolean;
  evidenceCount: number;
}

function facetVerdict(cell: Cell | undefined): FacetVerdict {
  if (!cell || cell.items === 0) {
    return { status: "untested", band: null, items: 0, fragile: false, declined: 0 };
  }
  // A single hint is already priced into the posterior itself: pCorrect() (likelihood.ts)
  // discounts item difficulty per hint, so being right with one hint already pulls the level
  // down directly. `fragile` marks the stronger, separate claim — the learner had to be
  // walked all the way to the answer — so it fires only at the ladder's top. hintsUsed is
  // typed 0 | 1 | 2, so `=== 2` reads as intent, not an open-ended "2 or more" threshold.
  const fragile = cell.evidence.some((e) => e.response.outcome === "correct" && e.response.hintsUsed === 2);
  const declined = cell.evidence.filter((e) => e.response.outcome === "dont_know").length;
  return { status: "measured", band: bandLabel(cell.posterior), items: cell.items, fragile, declined };
}

export function conceptVerdict(cells: ReadonlyMap<CellKey, Cell>, conceptId: string): ConceptVerdict {
  const facets = Object.fromEntries(
    FACETS.map((f) => [f, facetVerdict(cells.get(cellKey(conceptId, f)))]),
  ) as Record<Facet, FacetVerdict>;

  const measured = FACETS.filter((f) => facets[f].status === "measured");
  if (measured.length === 0) {
    return { conceptId, status: "untested", band: null, facets, fragile: false, evidenceCount: 0 };
  }

  // A hole in any facet is a hole: the concept's band is the weakest measured facet. Order
  // by the SAME ordinal the reported label uses — LEVELS.indexOf(band.level), the mode — not
  // by expectedLevel (the posterior's mean). Those two statistics can disagree (a bimodal
  // posterior can have a higher mean than a sharply-peaked one sitting a level below it), and
  // selecting by one while reporting the other lets the concept's band contradict a measured
  // facet that is genuinely weaker. Ties at the same level are broken by lower expectedLevel,
  // purely to stay deterministic and to prefer the genuinely weaker of two same-level facets.
  let worst: Facet = measured[0];
  for (const f of measured) {
    const facetLevel = LEVELS.indexOf(facets[f].band!.level);
    const worstLevel = LEVELS.indexOf(facets[worst].band!.level);
    if (facetLevel < worstLevel) {
      worst = f;
    } else if (facetLevel === worstLevel) {
      const cur = cells.get(cellKey(conceptId, f))!;
      const best = cells.get(cellKey(conceptId, worst))!;
      if (expectedLevel(cur.posterior) < expectedLevel(best.posterior)) worst = f;
    }
  }
  return {
    conceptId,
    status: "measured",
    band: facets[worst].band,
    facets,
    fragile: measured.some((f) => facets[f].fragile),
    evidenceCount: measured.reduce((n, f) => n + facets[f].items, 0),
  };
}
