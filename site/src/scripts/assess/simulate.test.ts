// site/src/scripts/assess/simulate.test.ts
import { describe, expect, test } from "vitest";
import { PROFILES, runSimulation } from "./simulate";
import { isUngroundedGap } from "./ungrounded-gap";
import { conceptVerdict } from "./verdict";
import { emptyCell } from "./update";
import { cellKey, type Band, type CellKey, type Cell, type Facet } from "./types";

describe("accuracy gates (spec §10)", () => {
  const result = runSimulation({ learners: 200, conceptsPerLearner: 12, seed: 20260731 });

  test("≥90% of settled cells land within ±1 level of the truth", () => {
    expect(result.withinOne).toBeGreaterThanOrEqual(0.9);
  });

  test("the estimator is not systematically flattering or harsh", () => {
    expect(Math.abs(result.meanSignedError)).toBeLessThanOrEqual(0.25);
  });

  // Deliberate deviation from Task 10's plan text (Task 12b fix round 1, finding 2): the plan
  // specified evaluating this gate on the single committed-seed `result` above, like the other
  // five. That is not enough for THIS statistic specifically. honestMinusGuesser is a mean over
  // only ~33 learners per profile (200 learners / 6 profiles) — small enough that its own sd at
  // n=200 is comparable to the values Task 12b's guess-floor fix moved it between, so a
  // single-seed reading cannot tell "the fix changed this gate's value" apart from "this seed
  // drew unluckily." Measured directly (Task 12b fix round 1): an isolation experiment — the
  // pre-fix GUESS.recall=0.25 vs the current 0.05, everything else at HEAD, 20 shared seeds,
  // n=200 each — gives old mean 0.0384 (sd 0.0074) vs new mean 0.0347 (sd 0.0117); a wider
  // 60-seed sweep at the current GUESS puts the full distribution at mean 0.0358, sd 0.0098,
  // range [0.0034, 0.0612]. The committed seed 20260731 alone reads honestMinusGuesser=0.0047,
  // roughly z=-3.2 in that distribution (~2nd percentile) — a genuine low-tail draw, not the
  // representative value, and not the same thing as "the fix nearly broke the invariant."
  // Averaging over HMG_SEEDS (12 independent seeds, same n=200/12-concepts as every other gate)
  // measures mean 0.0333, individual-draw sd 0.0138, so the sd of the *mean* itself (sd/sqrt(12))
  // is ~0.0040 — small enough that the measured mean clears the >=0 floor by ~8x its own standard
  // error, which a single draw cannot claim (the committed seed alone read 0.0047, inside 1
  // sd-of-a-single-draw of the floor). 12 seeds was chosen as the smallest count that keeps this
  // margin solidly in the "reliable, not lucky" range while keeping this file's runtime sane —
  // this one test's own added cost is the dominant cost of the whole file (~4s/seed under
  // vitest); doubling to 20+ seeds narrows the margin further but was not worth ~40s more per
  // run for a gate that is already ~8 standard errors clear of failing. The other five gates
  // keep the single committed-seed `result` above unchanged — this is a targeted fix to the one
  // gate the measurement showed was under-sampled, not a rewrite of the harness.
  const HMG_SEEDS = Array.from({ length: 12 }, (_, i) => 2000 + i * 13);
  test("an honest learner is never scored below a guesser of the same true ability (averaged over 12 seeds — sd of the mean ~0.0040, see the comment above for the single-seed instability this replaces)", () => {
    const draws = HMG_SEEDS.map(
      (seed) => runSimulation({ learners: 200, conceptsPerLearner: 12, seed }).honestMinusGuesser,
    );
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    expect(mean).toBeGreaterThanOrEqual(0);
  });

  test("settling a cell costs at most 3 items at the median", () => {
    expect(result.medianItemsToSettle).toBeLessThanOrEqual(3);
  });

  // `medianItemsToSettle <= 3` alone cannot fail while MAX_ITEMS_PER_CELL is 3: isSettled
  // forces every cell to stop by its third item regardless of how informative the evidence
  // was, so the median is bounded to {1,2,3} by construction and the assertion above holds
  // for any DISCRIMINATION/BAND_PRIOR/FACET_TILT/SETTLE_ENTROPY value. This test is the
  // discriminating half: it checks that a real share of settled cells stop on entropy
  // BEFORE hitting the cap — measured ~0.48 at the shipped constants (12-seed sweep:
  // 0.4755-0.4851), floor set well below that with honest headroom. A flat or broken
  // likelihood (e.g. DISCRIMINATION driven toward 0, or a likelihood that stopped
  // discriminating between levels) would drive this toward 0 while medianItemsToSettle
  // stayed a comfortable, unchanged 3 — exactly the failure the median-alone gate is blind to.
  test("a real share of settled cells stop on entropy before the item cap, not just at it", () => {
    expect(result.subCapSettleFraction).toBeGreaterThanOrEqual(0.4);
  });

  test("no cell is ever reported as a gap without evidence", () => {
    expect(result.gapsWithoutEvidence).toBe(0);
  });

  test("the awkward profiles are recovered as distinct shapes, not averaged away", () => {
    // "strong production, weak mechanism" must NOT come out as uniformly middle.
    const p = result.byProfile["production-not-mechanism"];
    expect(p.production.mean).toBeGreaterThan(p.mechanism.mean + 0.8);
  });

  test("every profile in PROFILES is exercised", () => {
    expect(Object.keys(result.byProfile).sort()).toEqual(Object.keys(PROFILES).sort());
  });
});

// Fix round 1, finding 2: `runSimulation`'s `gapsWithoutEvidence === 0` only exercises
// `band: "surface"` — the one band the harness hard-codes via `bandOf`. These tests deliberately
// leave `runSimulation`'s main path untouched and instead exercise `isUngroundedGap` and the
// real reporting path (`conceptVerdict`) across all four bands directly, to answer the question
// the surface-only gate cannot: does the untested-never-a-gap invariant hold everywhere, and if
// so, why?
describe("ungrounded-gap coverage across bands (fix round 1, finding 2)", () => {
  const BANDS: readonly Band[] = ["foundations", "surface", "middle", "advanced"];
  const FACETS: readonly Facet[] = ["recognition", "mechanism", "production"];

  test("the raw prior already reads as a gap for several middle/advanced facets — isUngroundedGap only clears surface (and foundations) on the math alone", () => {
    const flagged: string[] = [];
    for (const band of BANDS) {
      for (const facet of FACETS) {
        if (isUngroundedGap(undefined, "c", facet, band)) flagged.push(`${band}/${facet}`);
      }
    }
    // Documents the reviewer's finding precisely: nothing flags at "surface" — the band
    // runSimulation actually exercises, so gapsWithoutEvidence === 0 there is a genuine
    // property of the posterior math. "middle" and "advanced" DO flag (their prior mass
    // already modes to "gap" before any evidence), so the math alone does not clear them.
    const bySurface = flagged.filter((f) => f.startsWith("surface/"));
    const byHardBand = flagged.filter((f) => f.startsWith("middle/") || f.startsWith("advanced/"));
    expect(bySurface).toEqual([]);
    expect(byHardBand.length).toBeGreaterThan(0);
  });

  test("even so, the real report never calls an untested facet a gap at any band — that invariant is held by facetVerdict's items===0 guard, not by the posterior math", () => {
    // Two ways a pair can carry "no direct evidence" (per simulate.ts's isUngroundedGap
    // contract): no cell at all, or a cell that exists with items===0 (e.g. from cross-facet
    // damping). Both are exercised, at every band, against the actual reporting function.
    for (const band of BANDS) {
      const untouched = conceptVerdict(new Map(), "c");
      expect(untouched.status).toBe("untested");
      expect(untouched.band).toBeNull();

      const damped = new Map<CellKey, Cell>(FACETS.map((f) => [cellKey("c", f), emptyCell("c", f, band)]));
      const v = conceptVerdict(damped, "c");
      expect(v.status).toBe("untested");
      expect(v.band).toBeNull();
      for (const facet of FACETS) {
        expect(v.facets[facet].status).toBe("untested");
        expect(v.facets[facet].band).toBeNull();
      }
    }
  });
});
