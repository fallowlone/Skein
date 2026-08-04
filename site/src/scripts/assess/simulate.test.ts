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

  test("an honest learner is never scored below a guesser of the same true ability", () => {
    expect(result.honestMinusGuesser).toBeGreaterThanOrEqual(0);
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
