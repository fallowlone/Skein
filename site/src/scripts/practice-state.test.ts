import { describe, expect, test, beforeEach } from "vitest";
import {
  readProgress,
  setTaskStatus,
  readAttempts,
  recordAttempt,
  readResponses,
  writeResponse,
  readSelfGrades,
  setSelfGrade,
  isCommitted,
  MIN_COMMIT_CHARS,
  selfGradeToPass,
} from "./practice-state";

beforeEach(() => localStorage.clear());

describe("practice-state", () => {
  test("readProgress returns {} when nothing stored", () => {
    expect(readProgress("a/b/c")).toEqual({});
  });
  test("setTaskStatus persists a task status", () => {
    setTaskStatus("a/b/c", "predict-1", "done");
    expect(readProgress("a/b/c")).toEqual({ "predict-1": "done" });
  });
  test("setTaskStatus merges across tasks", () => {
    setTaskStatus("a/b/c", "t1", "seen");
    setTaskStatus("a/b/c", "t2", "attempted");
    expect(readProgress("a/b/c")).toEqual({ t1: "seen", t2: "attempted" });
  });
  test("progress is scoped per lessonKey", () => {
    setTaskStatus("a/b/c", "t1", "done");
    expect(readProgress("x/y/z")).toEqual({});
  });
});

describe("practice-state attempts store", () => {
  test("readAttempts returns {} when nothing stored", () => {
    expect(readAttempts("a/b/c")).toEqual({});
  });
  test("recordAttempt(passed) increments attempts and passes, sets lastResult/lastAt", () => {
    recordAttempt("a/b/c", "t1", true, 1000);
    expect(readAttempts("a/b/c")).toEqual({ t1: { attempts: 1, passes: 1, lastResult: "pass", lastAt: 1000 } });
  });
  test("recordAttempt(failed) increments attempts only, lastResult fail", () => {
    recordAttempt("a/b/c", "t1", false, 2000);
    expect(readAttempts("a/b/c")).toEqual({ t1: { attempts: 1, passes: 0, lastResult: "fail", lastAt: 2000 } });
  });
  test("repeated attempts accumulate; passes counts only successes; lastResult/lastAt track the latest", () => {
    recordAttempt("a/b/c", "t1", false, 1000);
    recordAttempt("a/b/c", "t1", true, 2000);
    recordAttempt("a/b/c", "t1", false, 3000);
    expect(readAttempts("a/b/c")).toEqual({ t1: { attempts: 3, passes: 1, lastResult: "fail", lastAt: 3000 } });
  });
  test("attempts are scoped per lessonKey and merge across tasks", () => {
    recordAttempt("a/b/c", "t1", true, 1000);
    recordAttempt("a/b/c", "t2", false, 1500);
    expect(readAttempts("a/b/c")).toEqual({
      t1: { attempts: 1, passes: 1, lastResult: "pass", lastAt: 1000 },
      t2: { attempts: 1, passes: 0, lastResult: "fail", lastAt: 1500 },
    });
    expect(readAttempts("x/y/z")).toEqual({});
  });
  test("the attempts store is independent of the status store", () => {
    setTaskStatus("a/b/c", "t1", "done");
    recordAttempt("a/b/c", "t1", false, 1000);
    expect(readProgress("a/b/c")).toEqual({ t1: "done" });
    expect(readAttempts("a/b/c").t1.lastResult).toBe("fail");
  });
});

// ── committed responses: the learner's own answer, written BEFORE the model answer ──
describe("practice-state responses store", () => {
  test("readResponses returns {} when nothing stored", () => {
    expect(readResponses("a/b/c")).toEqual({});
  });
  test("writeResponse persists a draft and merges across tasks", () => {
    writeResponse("a/b/c", "t1", "bandwidth is not the bottleneck");
    writeResponse("a/b/c", "t2", "latency floor is distance over c");
    expect(readResponses("a/b/c")).toEqual({
      t1: "bandwidth is not the bottleneck",
      t2: "latency floor is distance over c",
    });
  });
  test("writeResponse overwrites the same task", () => {
    writeResponse("a/b/c", "t1", "first");
    writeResponse("a/b/c", "t1", "second");
    expect(readResponses("a/b/c").t1).toBe("second");
  });
  test("responses are scoped per lessonKey", () => {
    writeResponse("a/b/c", "t1", "x");
    expect(readResponses("x/y/z")).toEqual({});
  });
});

describe("isCommitted", () => {
  test("rejects empty and whitespace-only answers", () => {
    expect(isCommitted("")).toBe(false);
    expect(isCommitted("   \n\t ")).toBe(false);
  });
  test("rejects an answer shorter than the commit floor", () => {
    expect(isCommitted("no")).toBe(false);
    expect(isCommitted("x".repeat(MIN_COMMIT_CHARS - 1))).toBe(false);
  });
  test("accepts an answer at or above the floor, ignoring surrounding whitespace", () => {
    expect(isCommitted("x".repeat(MIN_COMMIT_CHARS))).toBe(true);
    expect(isCommitted(`  ${"x".repeat(MIN_COMMIT_CHARS)}  `)).toBe(true);
  });
});

describe("practice-state self-grade store", () => {
  test("readSelfGrades returns {} when nothing stored", () => {
    expect(readSelfGrades("a/b/c")).toEqual({});
  });
  test("setSelfGrade persists a grade and merges across tasks", () => {
    setSelfGrade("a/b/c", "t1", "hit");
    setSelfGrade("a/b/c", "t2", "miss");
    expect(readSelfGrades("a/b/c")).toEqual({ t1: "hit", t2: "miss" });
  });
  test("setSelfGrade overwrites on re-grade", () => {
    setSelfGrade("a/b/c", "t1", "miss");
    setSelfGrade("a/b/c", "t1", "partial");
    expect(readSelfGrades("a/b/c").t1).toBe("partial");
  });
  test("grades are scoped per lessonKey", () => {
    setSelfGrade("a/b/c", "t1", "hit");
    expect(readSelfGrades("x/y/z")).toEqual({});
  });
});

describe("selfGradeToPass", () => {
  // Only a full hit counts as a pass for the adaptive engine and the SRS loop:
  // "partial" and "revealed without answering" must resurface the material.
  test("hit passes", () => expect(selfGradeToPass("hit")).toBe(true));
  test("partial does not pass", () => expect(selfGradeToPass("partial")).toBe(false));
  test("miss does not pass", () => expect(selfGradeToPass("miss")).toBe(false));
  test("skipped does not pass", () => expect(selfGradeToPass("skipped")).toBe(false));
});
