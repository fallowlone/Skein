import { describe, it, expect } from "vitest";
import { pretestQuestions, advancedQuestions } from "../pretest-questions";

describe("question banks", () => {
  it("stage 1 has questions; stage 2 has ≥5 advanced, all 4 choices weighted 0–3 with a top-weight present", () => {
    expect(pretestQuestions.length).toBeGreaterThanOrEqual(4);
    expect(advancedQuestions.length).toBeGreaterThanOrEqual(5);
    for (const q of advancedQuestions) {
      expect(q.choices.length).toBe(4);
      expect(Math.max(...q.choices.map((c) => c.weight))).toBe(3);
      expect(q.prompt.en.length).toBeGreaterThan(10);
      expect(q.prompt.ru.length).toBeGreaterThan(10);
    }
  });
});
