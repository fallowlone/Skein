import { describe, expect, it } from "vitest";
import { answerMatches, requiredExercises } from "./lesson-access";
import { requiresAccount } from "../_middleware";

describe("lesson exercise authority", () => {
  it("requires every Quiz and DragOrder and grades only against the published tree", () => {
    const exercises = requiredExercises([
      { type: "element", name: "Hook", children: [
        { type: "element", name: "Quiz", props: { id: "q", choices: [{ label: "wrong" }, { label: "right", correct: true }] } },
      ] },
      { type: "element", name: "DragOrder", props: { id: "d", items: ["first", "second", "third"] } },
    ]);
    expect(exercises.map((item) => item.id)).toEqual(["q", "d"]);
    expect(answerMatches(exercises[0], 1)).toBe(true);
    expect(answerMatches(exercises[0], 0)).toBe(false);
    expect(answerMatches(exercises[1], [0, 1, 2])).toBe(true);
    expect(answerMatches(exercises[1], [1, 0, 2])).toBe(false);
    expect(() => requiredExercises([
      { type: "element", name: "Quiz", props: { id: "q", choices: [{ correct: true }, { correct: true }] } },
    ])).toThrow();
  });
});

describe("guest question routes", () => {
  it("requires an account for question pages but leaves curriculum listings public", () => {
    for (const route of ["/en/assess/", "/ru/interview-qa/", "/en/review/", "/ru/english/grammar/", "/en/learn/algorithms/lab/", "/en/projects/capstone/"]) {
      expect(requiresAccount(route)).toBe(true);
    }
    for (const route of ["/en/", "/ru/learn/", "/en/learn/algorithms/", "/en/projects/", "/ru/english/"]) {
      expect(requiresAccount(route)).toBe(false);
    }
  });
});
