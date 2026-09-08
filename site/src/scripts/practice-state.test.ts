import { describe, expect, test, beforeEach } from "vitest";
import {
  readProgress,
  setTaskStatus,
  readAttempts,
  recordAttempt,
  readResponses,
  writeResponse,
  readSelfGrades,
  readSelfGradeRecords,
  setSelfGrade,
  isCommitted,
  MIN_COMMIT_CHARS,
  selfGradeToPass,
  deleteResponse,
  type PracticeEvidence,
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
  test("opening an already completed task cannot downgrade it", () => {
    setTaskStatus("a/b/c", "t1", "done");
    setTaskStatus("a/b/c", "t1", "seen");
    expect(readProgress("a/b/c").t1).toBe("done");
  });
  test("an explicit grade correction can downgrade completion", () => {
    setTaskStatus("a/b/c", "t1", "done");
    setTaskStatus("a/b/c", "t1", "attempted", true);
    expect(readProgress("a/b/c").t1).toBe("attempted");
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
  test("reads legacy attempts without inventing evidence metadata", () => {
    localStorage.setItem("atlas.practice-attempts.a/b/c", JSON.stringify({
      t1: { attempts: 1, passes: 1, lastResult: "pass", lastAt: 1000 },
    }));
    expect(readAttempts("a/b/c").t1).toEqual({ attempts: 1, passes: 1, lastResult: "pass", lastAt: 1000 });
  });
  test("records compact evidence metadata without copying the response", () => {
    const evidence: PracticeEvidence = {
      version: 2,
      concepts: ["event-loop", "microtasks"],
      competency: "debug",
      mode: "closed-book",
      hints: 0,
      evaluator: "exec",
      independent: true,
    };
    writeResponse("a/b/c", "t1", "private learner response");
    recordAttempt("a/b/c", "t1", true, 1234, evidence);

    const attempt = readAttempts("a/b/c").t1;
    expect(attempt).toMatchObject({ ...evidence, attempts: 1, passes: 1, lastAt: 1234 });
    expect(JSON.stringify(attempt)).not.toContain("private learner response");
  });
  test("self and AI grades, AI mode, and hints can never claim independent verification", () => {
    const base = { mode: "closed-book", hints: 0, independent: true } as const;
    recordAttempt("a/b/c", "self", true, 1, { ...base, evaluator: "self" });
    recordAttempt("a/b/c", "ai-grade", true, 2, { ...base, evaluator: "ai" });
    recordAttempt("a/b/c", "ai-mode", true, 3, { ...base, mode: "ai", evaluator: "exec" });
    recordAttempt("a/b/c", "hinted", true, 4, { ...base, hints: 1, evaluator: "exec" });

    const attempts = readAttempts("a/b/c");
    expect(attempts.self.independent).toBe(false);
    expect(attempts["ai-grade"].independent).toBe(false);
    expect(attempts["ai-mode"].independent).toBe(false);
    expect(attempts.hinted.independent).toBe(false);
  });
  test("correcting the latest grade updates counts instead of farming attempts", () => {
    const evidence = { mode: "closed-book", hints: 0, evaluator: "self", independent: false } as const;
    recordAttempt("a/b/c", "t1", true, 1000, evidence);
    recordAttempt("a/b/c", "t1", false, 2000, evidence, true);
    recordAttempt("a/b/c", "t1", false, 3000, evidence, true);

    expect(readAttempts("a/b/c").t1).toMatchObject({
      attempts: 1,
      passes: 0,
      lastResult: "fail",
      lastAt: 3000,
    });
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
  test("deleteResponse removes only the selected response", () => {
    writeResponse("a/b/c", "t1::expected", "expected value");
    writeResponse("a/b/c", "t1::actual", "actual value");
    deleteResponse("a/b/c", "t1::expected");
    expect(readResponses("a/b/c")).toEqual({ "t1::actual": "actual value" });
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
  test("timestamps new grades and gives legacy grades a recency fallback", () => {
    localStorage.setItem("atlas.practice-selfgrade.a/b/c", JSON.stringify({ legacy: "miss" }));

    setSelfGrade("a/b/c", "current", "partial", 1234);

    expect(readSelfGradeRecords("a/b/c")).toEqual({
      legacy: { grade: "miss", lastAt: 0 },
      current: { grade: "partial", lastAt: 1234 },
    });
    expect(readSelfGrades("a/b/c")).toEqual({ legacy: "miss", current: "partial" });
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
