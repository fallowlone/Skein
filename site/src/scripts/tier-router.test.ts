import { describe, expect, test } from "vitest";
import { scoreToTier, scorePretest } from "./tier-router";
import { pretestQuestions } from "./pretest-questions";

describe("tier-router", () => {
  test("scoreToTier mapping: 0-3 junior, 4-6 middle, 7-9 senior", () => {
    expect(scoreToTier(0)).toBe("junior");
    expect(scoreToTier(3)).toBe("junior");
    expect(scoreToTier(4)).toBe("middle");
    expect(scoreToTier(6)).toBe("middle");
    expect(scoreToTier(7)).toBe("senior");
    expect(scoreToTier(9)).toBe("senior");
  });

  test("scorePretest sums weights of selected answers", () => {
    expect(pretestQuestions.length).toBe(4);
    const allCorrect = pretestQuestions.map(q =>
      q.choices.findIndex(c => c.weight === Math.max(...q.choices.map(x => x.weight)))
    );
    expect(scorePretest(allCorrect)).toBeGreaterThanOrEqual(7);

    const allZero = pretestQuestions.map(q =>
      q.choices.findIndex(c => c.weight === Math.min(...q.choices.map(x => x.weight)))
    );
    expect(scorePretest(allZero)).toBeLessThanOrEqual(3);
  });
});
