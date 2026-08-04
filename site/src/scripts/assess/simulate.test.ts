// site/src/scripts/assess/simulate.test.ts
import { describe, expect, test } from "vitest";
import { PROFILES, runSimulation } from "./simulate";

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
