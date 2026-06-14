// site/src/scripts/path/difficulty.test.ts
import { describe, it, expect } from "vitest";
import { DIFFICULTY_TIERS, pickDifficulty, recommendTask } from "./difficulty";

describe("pickDifficulty", () => {
  const T = 0.6; // threshold; half-threshold = 0.3
  it("returns recall below half the threshold", () => {
    expect(pickDifficulty(0, T)).toBe("recall");
    expect(pickDifficulty(0.29, T)).toBe("recall");
  });
  it("returns apply between half-threshold (inclusive) and the threshold", () => {
    expect(pickDifficulty(0.3, T)).toBe("apply");
    expect(pickDifficulty(0.59, T)).toBe("apply");
  });
  it("returns stretch at or above the threshold", () => {
    expect(pickDifficulty(0.6, T)).toBe("stretch");
    expect(pickDifficulty(1, T)).toBe("stretch");
  });
  it("exposes the canonical tier order", () => {
    expect(DIFFICULTY_TIERS).toEqual(["recall", "apply", "stretch"]);
  });
});

describe("recommendTask", () => {
  const tasks = [
    { id: "r1", difficulty: "recall" },
    { id: "a1", difficulty: "apply" },
    { id: "s1", difficulty: "stretch" },
  ];

  it("picks the task matching the mastery-derived tier", () => {
    expect(recommendTask(tasks, 0.4, 0.6, {})?.id).toBe("a1");   // apply tier
    expect(recommendTask(tasks, 0.1, 0.6, {})?.id).toBe("r1");   // recall tier
    expect(recommendTask(tasks, 0.9, 0.6, {})?.id).toBe("s1");   // stretch tier
  });

  it("skips tasks already done", () => {
    expect(recommendTask(tasks, 0.4, 0.6, { a1: "done" })?.id).toBe("r1"); // apply done → easiest not-done
  });

  it("falls back to the easiest not-done task when the target tier is unavailable", () => {
    const noApply = [{ id: "s1", difficulty: "stretch" }, { id: "r1", difficulty: "recall" }];
    expect(recommendTask(noApply, 0.4, 0.6, {})?.id).toBe("r1"); // wants apply → none → easiest = recall
  });

  it("returns null when every task is done", () => {
    expect(recommendTask(tasks, 0.4, 0.6, { r1: "done", a1: "done", s1: "done" })).toBeNull();
  });

  it("returns null for an empty task list", () => {
    expect(recommendTask([], 0.4, 0.6, {})).toBeNull();
  });
});
