import { describe, expect, test, beforeEach } from "vitest";
import { readProgress, setTaskStatus } from "./practice-state";

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
