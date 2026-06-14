import { describe, expect, test, beforeEach } from "vitest";
import { readProgress, setTaskStatus, readAttempts, recordAttempt } from "./practice-state";

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
