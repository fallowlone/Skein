import { describe, expect, test } from "vitest";
import { checkBlank, applyExecCheck } from "./practice-grade";

describe("checkBlank", () => {
  test("accepts a case-insensitive trimmed match", () => {
    expect(checkBlank(["Nested Loop"], "  nested loop ")).toBe(true);
  });
  test("accepts any of several accepted answers", () => {
    expect(checkBlank(["hash join", "hashjoin"], "HashJoin")).toBe(true);
  });
  test("rejects a non-match", () => {
    expect(checkBlank(["merge join"], "nested loop")).toBe(false);
  });
});

describe("applyExecCheck", () => {
  test("no-error passes when there is no error", () => {
    expect(applyExecCheck({ kind: "no-error" }, { rows: [] })).toBe(true);
  });
  test("no-error fails when there is an error", () => {
    expect(applyExecCheck({ kind: "no-error" }, { error: "syntax" })).toBe(false);
  });
  test("any check fails when an error is present", () => {
    expect(applyExecCheck({ kind: "stdout-contains", value: "x" }, { error: "boom" })).toBe(false);
  });
  test("stdout-equals compares trimmed stdout", () => {
    expect(applyExecCheck({ kind: "stdout-equals", value: "42" }, { stdout: " 42 \n" })).toBe(true);
  });
  test("stdout-contains finds a substring", () => {
    expect(applyExecCheck({ kind: "stdout-contains", value: "Nested" }, { stdout: "Plan: Nested Loop" })).toBe(true);
  });
  test("rows-equal compares normalized JSON", () => {
    expect(applyExecCheck({ kind: "rows-equal", value: '[[1,2]]' }, { rows: [[1, 2]] })).toBe(true);
  });
});
