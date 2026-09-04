import { describe, expect, test } from "vitest";
import { likelihoodVector, llmVerdictLikelihood, pCorrect } from "./likelihood";
import { LEVELS, type AssessItem, type AssessResponse, type Band, type ItemKind } from "./types";

const item = (over: Partial<AssessItem> = {}): AssessItem => ({
  id: "l#t", lessonKey: "l", taskId: "t", kind: "exec", facet: "production",
  band: "surface", concepts: ["c"], weight: 1, estMin: 5, ...over,
});
const res = (over: Partial<AssessResponse> = {}): AssessResponse =>
  ({ outcome: "correct", hintsUsed: 0, elapsedMs: 1000, ...over });

// Likelihood ratio between "senior" and "gap": how much this response argues for ability.
const llr = (v: readonly number[]) => v[3] / Math.max(v[0], 1e-9);

describe("likelihood", () => {
  test("a higher level is likelier to answer correctly", () => {
    expect(pCorrect("senior", "surface", 0)).toBeGreaterThan(pCorrect("junior", "surface", 0));
    expect(pCorrect("junior", "surface", 0)).toBeGreaterThan(pCorrect("gap", "surface", 0));
  });

  test("a harder item is answered correctly less often at the same level", () => {
    expect(pCorrect("middle", "advanced", 0)).toBeLessThan(pCorrect("middle", "foundations", 0));
  });

  test("each hint weakens the evidence a correct answer carries", () => {
    const none = llr(likelihoodVector(item(), res({ hintsUsed: 0 }), "production", "surface"));
    const one = llr(likelihoodVector(item(), res({ hintsUsed: 1 }), "production", "surface"));
    const two = llr(likelihoodVector(item(), res({ hintsUsed: 2 }), "production", "surface"));
    expect(one).toBeLessThan(none);
    expect(two).toBeLessThan(one);
  });

  test("hints never make a correct answer worse than a wrong one", () => {
    const hinted = llr(likelihoodVector(item(), res({ hintsUsed: 2 }), "production", "surface"));
    const wrong = llr(likelihoodVector(item(), res({ outcome: "wrong" }), "production", "surface"));
    expect(hinted).toBeGreaterThan(wrong);
  });

  const BANDS: readonly Band[] = ["foundations", "surface", "middle", "advanced"];
  const HINTS = [0, 1, 2] as const;
  const KINDS: readonly ItemKind[] = ["recall", "predict", "debug", "review", "exec", "explain"];

  test("dont_know is gentler than wrong and harsher than partial, for every band/hints/kind", () => {
    for (const band of BANDS) {
      for (const hintsUsed of HINTS) {
        for (const kind of KINDS) {
          const it = item({ kind, band, facet: kind === "recall" ? "recognition" : "production" });
          const facet = it.facet;
          const correct = llr(likelihoodVector(it, res({ hintsUsed, outcome: "correct" }), facet, it.band));
          const partial = llr(likelihoodVector(it, res({ hintsUsed, outcome: "partial" }), facet, it.band));
          const dk = llr(likelihoodVector(it, res({ hintsUsed, outcome: "dont_know" }), facet, it.band));
          const wrong = llr(likelihoodVector(it, res({ hintsUsed, outcome: "wrong" }), facet, it.band));
          expect(correct, `${band}/${kind}/${hintsUsed}h correct vs partial`).toBeGreaterThan(partial);
          expect(partial, `${band}/${kind}/${hintsUsed}h partial vs dont_know`).toBeGreaterThan(dk);
          expect(dk, `${band}/${kind}/${hintsUsed}h dont_know vs wrong`).toBeGreaterThan(wrong);
        }
      }
    }
  });

  test("evidence for a non-primary facet is damped and never certifies it", () => {
    const own = llr(likelihoodVector(item({ kind: "recall", facet: "recognition" }), res(), "recognition", "surface"));
    const other = llr(likelihoodVector(item({ kind: "recall", facet: "recognition" }), res(), "production", "surface"));
    expect(other).toBeLessThan(own);
    expect(other).toBeLessThan(1.6); // a recall item can never argue strongly for production skill
  });

  test("uses the explicit concept band, not the item's display band", () => {
    const it = item({ band: "advanced" });
    const easyBand = likelihoodVector(it, res(), "production", "foundations");
    const hardBand = likelihoodVector(it, res(), "production", "advanced");
    expect(easyBand).not.toEqual(hardBand);
  });

  test("every vector is a normalised distribution", () => {
    for (const outcome of ["correct", "partial", "wrong", "dont_know"] as const) {
      const v = likelihoodVector(item(), res({ outcome }), "production", "surface");
      expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });
});

// Task 13 fix round 1 (Critical): the LLM verdict's own likelihood — the
// factor that lets a clamped Level genuinely move a cell, in both directions.
describe("llmVerdictLikelihood", () => {
  test("is a normalised distribution peaked at the verdict, for every level", () => {
    for (const verdict of LEVELS) {
      const v = llmVerdictLikelihood(verdict);
      expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      const peakIndex = v.indexOf(Math.max(...v));
      expect(LEVELS[peakIndex]).toBe(verdict);
    }
  });

  test("mass falls off monotonically with ordinal distance from the verdict", () => {
    const v = llmVerdictLikelihood("middle");
    const i = LEVELS.indexOf("middle");
    // middle (i=2): gap(0) is 2 steps away, junior(1) is 1 step, senior(3) is 1 step.
    expect(v[i]).toBeGreaterThan(v[i - 1]);
    expect(v[i]).toBeGreaterThan(v[i + 1]);
    expect(v[i - 1]).toBeCloseTo(v[i + 1]); // symmetric falloff
    expect(v[0]).toBeLessThan(v[i - 1]); // gap is 2 steps from middle, junior is 1
  });

  test("a senior verdict and a middle verdict are genuinely different distributions", () => {
    // This is the direct regression test for fix round 1's Critical finding:
    // LEVEL_TO_OUTCOME used to collapse both into Outcome "correct", making
    // them produce a bit-identical posterior update. They must not anymore.
    const senior = llmVerdictLikelihood("senior");
    const middle = llmVerdictLikelihood("middle");
    expect(senior).not.toEqual(middle);
    expect(senior[3]).toBeGreaterThan(middle[3]); // senior verdict argues harder for the top level
    expect(middle[2]).toBeGreaterThan(senior[2]); // middle verdict argues harder for itself
  });
});
