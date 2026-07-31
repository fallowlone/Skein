import { describe, expect, test } from "vitest";
import { likelihoodVector, pCorrect } from "./likelihood";
import type { AssessItem, AssessResponse } from "./types";

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
    const none = llr(likelihoodVector(item(), res({ hintsUsed: 0 }), "production"));
    const one = llr(likelihoodVector(item(), res({ hintsUsed: 1 }), "production"));
    const two = llr(likelihoodVector(item(), res({ hintsUsed: 2 }), "production"));
    expect(one).toBeLessThan(none);
    expect(two).toBeLessThan(one);
  });

  test("hints never make a correct answer worse than a wrong one", () => {
    const hinted = llr(likelihoodVector(item(), res({ hintsUsed: 2 }), "production"));
    const wrong = llr(likelihoodVector(item(), res({ outcome: "wrong" }), "production"));
    expect(hinted).toBeGreaterThan(wrong);
  });

  test("dont_know is gentler than wrong and harsher than partial", () => {
    const dk = llr(likelihoodVector(item(), res({ outcome: "dont_know" }), "production"));
    const wrong = llr(likelihoodVector(item(), res({ outcome: "wrong" }), "production"));
    const partial = llr(likelihoodVector(item(), res({ outcome: "partial" }), "production"));
    expect(dk).toBeGreaterThan(wrong);
    expect(dk).toBeLessThan(partial);
  });

  test("evidence for a non-primary facet is damped and never certifies it", () => {
    const own = llr(likelihoodVector(item({ kind: "mcq", facet: "recognition" }), res(), "recognition"));
    const other = llr(likelihoodVector(item({ kind: "mcq", facet: "recognition" }), res(), "production"));
    expect(other).toBeLessThan(own);
    expect(other).toBeLessThan(1.6); // an MCQ can never argue strongly for production skill
  });

  test("every vector is a normalised distribution", () => {
    for (const outcome of ["correct", "partial", "wrong", "dont_know"] as const) {
      const v = likelihoodVector(item(), res({ outcome }), "production");
      expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });
});
