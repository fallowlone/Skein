import { describe, it, expect } from "vitest";
import { lessonMastery, recommendNext, type TaskAttempt } from "./adaptive-difficulty";

const tasks = [
  { id: "r1", difficulty: "recall" },
  { id: "a1", difficulty: "apply" },
  { id: "s1", difficulty: "stretch" },
];
const T = 0.6;
const att = (attempts: number, passes: number): TaskAttempt => ({
  attempts,
  passes,
  lastResult: passes > 0 ? "pass" : "fail",
  lastAt: 1,
});

describe("lessonMastery", () => {
  it("reports zero evidence when there are no attempts", () => {
    const m = lessonMastery(tasks, {});
    expect(m.evidence).toBe(0);
    expect(m.mastery).toBe(0);
  });

  it("counts only attempted tasks as evidence", () => {
    const m = lessonMastery(tasks, { r1: att(1, 1) });
    expect(m.evidence).toBe(1);
    expect(m.mastery).toBeGreaterThan(0);
  });

  it("treats task difficulty as a mastery ceiling", () => {
    const recallOnly = lessonMastery(tasks, { r1: att(3, 3) }).mastery;
    const applyOnly = lessonMastery(tasks, { a1: att(3, 3) }).mastery;
    const stretchOnly = lessonMastery(tasks, { s1: att(3, 3) }).mastery;
    expect(recallOnly).toBeLessThan(applyOnly);
    expect(applyOnly).toBeLessThan(stretchOnly);
  });

  it("uses all attempts and the latest result instead of permanent ever-passed mastery", () => {
    const stable = lessonMastery(tasks, { a1: { ...att(5, 5), lastResult: "pass" } }).mastery;
    const regressed = lessonMastery(tasks, { a1: { ...att(10, 1), lastResult: "fail" } }).mastery;
    expect(regressed).toBeLessThan(stable);
    expect(regressed).toBeLessThan(T * 0.5);
  });

  it("a failing learner yields low mastery", () => {
    const m = lessonMastery(tasks, { r1: att(3, 0), a1: att(2, 0) });
    expect(m.mastery).toBeGreaterThan(0); // smoothed: never claims impossible certainty
    expect(m.mastery).toBeLessThan(T * 0.5);
    expect(m.evidence).toBe(2);
  });
});

describe("recommendNext", () => {
  it("falls back to the first open task in input order when there is no evidence", () => {
    const rec = recommendNext(tasks, {}, {}, T);
    expect(rec.taskId).toBe("r1");
    expect(rec.reason).toBe("default");
    expect(rec.tier).toBeNull();
  });

  it("respects done status in the default fallback", () => {
    const rec = recommendNext(tasks, { r1: "done" }, {}, T);
    expect(rec.taskId).toBe("a1");
    expect(rec.reason).toBe("default");
  });

  it("reports complete when every task is done", () => {
    const rec = recommendNext(tasks, { r1: "done", a1: "done", s1: "done" }, {}, T);
    expect(rec.taskId).toBeNull();
    expect(rec.reason).toBe("complete");
  });

  it("does not jump from one lucky recall answer directly to stretch", () => {
    const rec = recommendNext(tasks, {}, { r1: att(1, 1) }, T);
    expect(rec.reason).toBe("default"); // default evidence gate is deliberately two distinct tasks
    expect(rec.taskId).toBe("r1");
  });

  it("moves to apply after consistent evidence across multiple tasks", () => {
    const rec = recommendNext(tasks, {}, { r1: att(4, 4), a1: att(4, 3) }, T);
    expect(rec.reason).toBe("performance");
    expect(rec.tier).toBe("apply");
    expect(rec.taskId).toBe("a1");
  });

  it("keeps a struggling learner on the easiest open tier", () => {
    // failing apply ⇒ mastery 0 ⇒ recall tier
    const rec = recommendNext(tasks, {}, { a1: att(3, 0), s1: att(2, 0) }, T);
    expect(rec.reason).toBe("performance");
    expect(rec.tier).toBe("recall");
    expect(rec.taskId).toBe("r1");
  });

  it("when the matched tier task is done, recommendTask falls to the next open tier", () => {
    // strong multi-task mastery wants stretch, but stretch is done ⇒ next open by tier order
    const rec = recommendNext(tasks, { s1: "done" }, { a1: att(5, 5), s1: att(5, 5) }, T);
    expect(rec.reason).toBe("performance");
    expect(rec.taskId).not.toBe("s1");
    expect(["r1", "a1"]).toContain(rec.taskId);
  });

  it("honours a higher minEvidence gate (stays default until enough signal)", () => {
    const rec = recommendNext(tasks, {}, { r1: att(1, 1) }, T, 2);
    expect(rec.reason).toBe("default");
    expect(rec.taskId).toBe("r1");
  });
});
