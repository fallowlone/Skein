import { describe, it, expect } from "vitest";
import { priorFor, fallbackIrt, likelihood, posterior, variance, entropy, expectedInfoGain, collapse, SETTLE_VAR, propagatePriors, resolveIrt, type Irt } from "./bayes";
import { buildConceptGraph } from "./graph";
import type { Concept } from "./types";

const sharp: Irt = { b: 0, a: 1.4, c: 0.1 }; // discriminating, low guess

describe("priorFor", () => {
  it("is monotone: higher self-placement and lower band give higher prior", () => {
    expect(priorFor("prod", "foundations")).toBeGreaterThan(priorFor("basics", "foundations"));
    expect(priorFor("basics", "foundations")).toBeGreaterThan(priorFor("never", "foundations"));
    expect(priorFor("prod", "foundations")).toBeGreaterThan(priorFor("prod", "advanced"));
  });
  it("keeps prod+advanced genuinely uncertain (gets tested)", () => {
    const p = priorFor("prod", "advanced");
    expect(p).toBeGreaterThan(0.15);
    expect(p).toBeLessThan(0.5);
  });
});

describe("fallbackIrt", () => {
  it("derives guess from mcq choice count and difficulty from band", () => {
    expect(fallbackIrt("surface", "mcq", 4).c).toBeCloseTo(0.25, 5);
    expect(fallbackIrt("surface", "blanks", 0).c).toBeCloseTo(0.05, 5);
    expect(fallbackIrt("advanced", "mcq", 4).b).toBeGreaterThan(fallbackIrt("foundations", "mcq", 4).b);
  });
});

describe("likelihood + posterior", () => {
  it("correct raises p, wrong lowers p", () => {
    expect(posterior(0.5, "correct", sharp)).toBeGreaterThan(0.5);
    expect(posterior(0.5, "wrong", sharp)).toBeLessThan(0.5);
  });
  it("dont_know lowers p MORE confidently than wrong (lower resulting mean and variance)", () => {
    const pWrong = posterior(0.5, "wrong", sharp);
    const pDk = posterior(0.5, "dont_know", sharp);
    expect(pDk).toBeLessThan(pWrong);
    expect(variance(pDk)).toBeLessThan(variance(pWrong));
  });
  it("dont_know|unknown carries no guess floor c, but does scale with (1-c)", () => {
    const lowGuess = likelihood("dont_know", { b: 0, a: 1, c: 0.05 });
    const highGuess = likelihood("dont_know", { b: 0, a: 1, c: 0.5 });
    expect(lowGuess.unknown).toBeGreaterThan(highGuess.unknown);
  });
});

describe("entropy + info gain", () => {
  it("entropy peaks at p=0.5 (=1 bit) and is ~0 at the extremes", () => {
    expect(entropy(0.5)).toBeCloseTo(1, 5);
    expect(entropy(0.5)).toBeGreaterThan(entropy(0.1));
    expect(entropy(0.5)).toBeGreaterThan(entropy(0.95));
  });
  it("a maximally uncertain concept yields more expected info gain than a settled one", () => {
    const irt = { b: 0, a: 1.3, c: 0.1 };
    expect(expectedInfoGain(0.5, irt)).toBeGreaterThan(expectedInfoGain(0.95, irt));
  });
});

describe("collapse", () => {
  it("maps posterior mean to confidence and flags shaky near 0.5", () => {
    expect(collapse(0.9).confidence).toBeCloseTo(0.9, 5);
    expect(collapse(0.9).shaky).toBe(false);
    expect(collapse(0.5).shaky).toBe(true);
    expect(variance(0.5)).toBeGreaterThan(SETTLE_VAR);
  });
});

// b requires a ; c requires b   (a ancestor of b/c ; c descendant of a/b)
const G = (() => {
  const mk = (id: string, requires: string[]): Concept =>
    ({ id, label: { en: id, ru: id }, track: "networking" as any, band: "surface", requires });
  return buildConceptGraph([mk("a", []), mk("b", ["a"]), mk("c", ["b"])]);
})();

describe("propagatePriors", () => {
  it("a confident known lifts ancestor priors, never lowers", () => {
    const priors = new Map([["a", 0.2], ["b", 0.9], ["c", 0.5]]);
    const next = propagatePriors(priors, G, "c", 0.95, "correct");
    expect(next.get("a")!).toBeGreaterThan(0.2);
    expect(next.get("b")!).toBeGreaterThanOrEqual(0.9);
  });
  it("a wrong (not-known) lowers descendant priors", () => {
    const priors = new Map([["a", 0.9], ["b", 0.8], ["c", 0.8]]);
    const next = propagatePriors(priors, G, "a", 0.05, "wrong");
    expect(next.get("c")!).toBeLessThan(0.8);
  });
  it("dont_know cascade is strictly weaker than an equivalent wrong", () => {
    const base = new Map([["a", 0.9], ["b", 0.8], ["c", 0.8]]);
    const viaWrong = propagatePriors(base, G, "a", 0.05, "wrong").get("c")!;
    const viaDk = propagatePriors(base, G, "a", 0.05, "dont_know").get("c")!;
    expect(viaDk).toBeGreaterThan(viaWrong);
  });
});

describe("resolveIrt", () => {
  it("uses authored irt when present", () => {
    expect(resolveIrt({ b: 0.4, a: 1.7, c: 0.2 }, "advanced", "mcq", 4)).toEqual({ b: 0.4, a: 1.7, c: 0.2 });
  });
  it("falls back to band/type when irt absent", () => {
    const irt = resolveIrt(undefined, "foundations", "mcq", 5);
    expect(irt.c).toBeCloseTo(0.2, 5);
    expect(irt.a).toBe(1.0);
  });
});
