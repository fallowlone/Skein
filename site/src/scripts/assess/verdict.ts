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
 *   withinOne            0.9104   (gate: >= 0.90)
 *   meanSignedError      -0.1486  (gate: |x| <= 0.25 — estimator runs slightly harsh)
 *   medianItemsToSettle  3        (gate: <= 3, at MAX_ITEMS_PER_CELL — see note below)
 *   gapsWithoutEvidence  0        (gate: == 0)
 *   honestMinusGuesser   0.0421   (gate: >= 0)
 *
 * SETTLE_ENTROPY/MAX_ITEMS_PER_CELL were left at their original values: at this pool size
 * (4 items per kind per concept) even a noise-free run of five straight "correct" answers for
 * a senior learner still leaves entropy at ~0.58 — above the 0.55 threshold, so raising
 * MAX_ITEMS_PER_CELL a little would not have let those cells settle by entropy either. Within
 * the fixed per-learner step budget the harness uses, raising the cap just starves *other*
 * cells of their share of that budget instead (confirmed empirically: cap=4..6 pushed
 * gapsWithoutEvidence from 0 up to 87). The real lever for `withinOne` turned out to be
 * DISCRIMINATION (1.2 → 3.85 in likelihood.ts) plus a bias correction in ordinal.ts
 * (BAND_PRIOR.surface, FACET_TILT.production) — see the comments at those constants.
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
