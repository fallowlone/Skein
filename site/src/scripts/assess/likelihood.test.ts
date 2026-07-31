import { describe, expect, test } from "vitest";
import { likelihoodVector, pCorrect } from "./likelihood";
import type { AssessItem, AssessResponse, Band, ItemKind } from "./types";

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

  const BANDS: readonly Band[] = ["foundations", "surface", "middle", "advanced"];
  const HINTS = [0, 1, 2] as const;
  const KINDS: readonly ItemKind[] = ["mcq", "predict", "debug", "review", "exec", "explain"];

  test("dont_know is gentler than wrong and harsher than partial, for every band/hints/kind", () => {
    for (const band of BANDS) {
      for (const hintsUsed of HINTS) {
        for (const kind of KINDS) {
          const it = item({ kind, band, facet: kind === "mcq" ? "recognition" : "production" });
          const facet = it.facet;
          const correct = llr(likelihoodVector(it, res({ hintsUsed, outcome: "correct" }), facet));
          const partial = llr(likelihoodVector(it, res({ hintsUsed, outcome: "partial" }), facet));
          const dk = llr(likelihoodVector(it, res({ hintsUsed, outcome: "dont_know" }), facet));
          const wrong = llr(likelihoodVector(it, res({ hintsUsed, outcome: "wrong" }), facet));
          expect(correct, `${band}/${kind}/${hintsUsed}h correct vs partial`).toBeGreaterThan(partial);
          expect(partial, `${band}/${kind}/${hintsUsed}h partial vs dont_know`).toBeGreaterThan(dk);
          expect(dk, `${band}/${kind}/${hintsUsed}h dont_know vs wrong`).toBeGreaterThan(wrong);
        }
      }
    }
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
