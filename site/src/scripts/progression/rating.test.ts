import { describe, it, expect } from "vitest";
import { scoreStage, maxScore, qualifiesForStage2, computeRating, confidenceOf } from "./rating";

const bank = [
  { id: "a", prompt: { en: "", ru: "" }, choices: [{ label: { en: "", ru: "" }, weight: 0 }, { label: { en: "", ru: "" }, weight: 3 }] },
  { id: "b", prompt: { en: "", ru: "" }, choices: [{ label: { en: "", ru: "" }, weight: 0 }, { label: { en: "", ru: "" }, weight: 3 }] },
] as any;

describe("rating", () => {
  it("scores chosen weights and maxScore is sum of per-question maxima", () => {
    expect(maxScore(bank)).toBe(6);
    expect(scoreStage([1, 1], bank)).toBe(6);
    expect(scoreStage([0, 1], bank)).toBe(3);
  });
  it("gate fires at s1 >= 0.75, not below", () => {
    expect(qualifiesForStage2(0.74)).toBe(false);
    expect(qualifiesForStage2(0.75)).toBe(true);
  });
  it("rating caps at 750 without stage 2, unlocks 750–1000 with it", () => {
    expect(computeRating(1)).toBe(750);
    expect(computeRating(0.5)).toBe(375);
    expect(computeRating(1, 0)).toBe(750);
    expect(computeRating(1, 1)).toBe(1000);
    expect(computeRating(1, 0.5)).toBe(875);
  });
  it("confidence is high when chosen weights are consistent, medium when spread", () => {
    expect(confidenceOf([[3, 3, 3]])).toBe("high");
    expect(confidenceOf([[0, 3, 0, 3]])).toBe("medium");
  });
});
