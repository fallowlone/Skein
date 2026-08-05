// site/src/scripts/assess/verdict.ts
// Cells → a per-concept verdict. Pure.
import { bandLabel, entropyOrd, expectedLevel, type BandLabel } from "./ordinal";
import { FACETS, LEVELS, cellKey, type Cell, type CellKey, type Facet } from "./types";

/**
 * Simulation harness results (Task 10, `simulate.test.ts`, seed 20260731, 200 learners ×
 * 12 concepts) for the constants currently checked in, so a future edit of SETTLE_ENTROPY
 * (or DISCRIMINATION/HINT_STEP in likelihood.ts, or BAND_PRIOR/FACET_TILT in ordinal.ts) can
 * see what it is trading away.
 *
 * Task 12b correction: the figures below replace an earlier version of this comment measured
 * before Task 12b fixed a mislabelled item kind. 1504 of 6520 harvested items (23% of the
 * corpus, all fill-in-the-blank `diagnose`/`blanks` items graded against a typed `accept` list)
 * were carrying kind "mcq" and its 0.25 four-choice guess floor, though no real multiple-choice
 * content exists anywhere in the schema. That kind is now named "recall" and its GUESS entry is
 * 0.05 (in line with debug/explain), which strengthens recognition-facet evidence roughly 5x.
 * The old numbers this comment used to report (withinOne 0.9104, meanSignedError -0.1486,
 * honestMinusGuesser 0.0421, cap-sweep table below) were measured against the inflated guess
 * floor and are no longer accurate — do not use them as a baseline.
 *
 *   withinOne             0.9367   (gate: >= 0.90)
 *   meanSignedError       -0.1188  (gate: |x| <= 0.25 — estimator runs slightly harsh)
 *   medianItemsToSettle   2        (gate: <= 3, at MAX_ITEMS_PER_CELL — see the discriminating
 *                                   subCapSettleFraction gate in simulate.test.ts, ~0.60)
 *   gapsWithoutEvidence   0        (gate: == 0, at band: "surface" — see ungrounded-gap.ts for
 *                                   why this does not generalise to every band)
 *   honestMinusGuesser    0.0047   (gate: >= 0, at THIS seed — but this statistic is noisy at
 *                                   n=200 and this seed reads low; see simulate.test.ts's
 *                                   `HMG_SEEDS`-averaged gate and the isolation experiment below
 *                                   for the reading that should actually be trusted)
 *
 * honestMinusGuesser fix-round-1 correction (Task 12b review, finding 1): an earlier version of
 * this comment read the committed seed's 0.0421 -> 0.0047 drop as the fix's effect and called it
 * "roughly 5x weaker," implying the fix nearly broke the ethical invariant this statistic
 * guards. That comparison is wrong — it compares one pre-fix draw to one post-fix draw of a
 * statistic whose own sampling noise at n=200 is comparable in size to the numbers being
 * compared. Isolated properly (GUESS.recall patched back to 0.25 with everything else at HEAD,
 * 20 shared seeds, n=200/12-concepts each, measured directly for this fix): old mean 0.0384
 * (sd 0.0074) vs new mean 0.0347 (sd 0.0117) — the fix's real mean effect is a ~10% relative
 * decrease, not the ~89% the single-seed comparison implied. The honest new finding is that the
 * fix roughly doubled this statistic's *variance* at n=200 (sd 0.0074 -> 0.0117): removing the
 * inflated 0.25 guess credit means a guesser profile gains less from luck, which is a real,
 * structural, and correct consequence of the fix — but it also means the two profiles'
 * (honest-beginner vs guesser-beginner) means sit closer together, so the same-size run-to-run
 * noise now represents a larger fraction of the gap between them. A wider 60-seed sweep at the
 * current (fixed) GUESS puts the full distribution at mean 0.0358, sd 0.0098, range
 * [0.0034, 0.0612] — never negative. The committed seed 20260731 reads honestMinusGuesser=0.0047,
 * z~-3.2 in that distribution (~2nd percentile): a genuine low-tail draw, not the representative
 * value. Because a single committed-seed reading of *this specific statistic* could not be
 * trusted either way (it could read positive while the invariant was fine, or read close to
 * zero by bad luck alone while the invariant held comfortably), `simulate.test.ts`'s gate for it
 * was changed to average over 12 independent seeds rather than read the committed seed — see the
 * comment on `HMG_SEEDS` there for the design and its measured sd. The other five gates above are
 * unaffected by this and still read from the single committed-seed `result`.
 *
 * SETTLE_ENTROPY was left at its original value: at this pool size (4 items per kind per
 * concept) even a noise-free run of five straight "correct" answers for a senior learner still
 * leaves entropy at ~0.58 — above the 0.55 threshold — so loosening SETTLE_ENTROPY a little
 * would not change which cells settle by entropy vs. by cap. The real lever for `withinOne`
 * turned out to be DISCRIMINATION (1.2 → 3.85 in likelihood.ts) plus a bias correction in
 * ordinal.ts (BAND_PRIOR.surface, FACET_TILT.production) — see the comments at those constants.
 * The Task 12b guess-floor fix needed no further tuning of any of these: all six gates cleared
 * at the constants already checked in, with more margin than before on withinOne/
 * meanSignedError/medianItemsToSettle/subCapSettleFraction, and the same (never-negative but
 * thinner) direction on honestMinusGuesser.
 *
 * MAX_ITEMS_PER_CELL cap-raise experiment (fix round 1, finding 3): an earlier attempt to
 * measure whether raising the cap improves accuracy was confounded — the harness's per-learner
 * step budget was a hardcoded `conceptsPerLearner * FACETS.length * 3`, so raising the cap
 * under that fixed budget starved *other* cells of their share of it, corrupting
 * gapsWithoutEvidence (0 up to 87) as an artifact of the harness's own bookkeeping rather than
 * telling anything about the engine. simulate.ts now scales the budget by MAX_ITEMS_PER_CELL
 * itself, removing that confound. Re-run unconfounded (proportional budget, same seed/learners,
 * post-Task-12b guess floor):
 *
 *   cap=3   withinOne 0.9367  meanSignedError -0.1188  subCapSettleFraction 0.60  honestMinusGuesser 0.0047
 *   cap=4   withinOne 0.9414  meanSignedError -0.1244  subCapSettleFraction 0.93  honestMinusGuesser 0.0149
 *   cap=5   withinOne 0.9417  meanSignedError -0.1249  subCapSettleFraction 0.99  honestMinusGuesser 0.0162
 *   cap=6   withinOne 0.9443  meanSignedError -0.1254  subCapSettleFraction 1.00  honestMinusGuesser 0.0261
 *   cap=8   withinOne 0.9440  meanSignedError -0.1254  subCapSettleFraction 1.00  honestMinusGuesser 0.0261
 *
 * gapsWithoutEvidence stayed 0 at every cap. Raising the cap by one (3→4) now buys ~0.5 points
 * of withinOne (down from ~1.5 points pre-fix — the honest guess floor already recovered most of
 * that headroom on its own) at the same real cost as before: every real assessment gets up to
 * 33% longer per cell in the worst case, though most of that cost is avoided in practice once
 * cells start settling on entropy before reaching the cap (subCapSettleFraction jumps from 0.60
 * to 0.93 at cap=4). This remains a product tradeoff (session length vs. accuracy), not an
 * engine-correctness question, so it was NOT applied here — it is reported for the assess-engine
 * owner to decide, not landed unilaterally by this task.
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
