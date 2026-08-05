import { describe, expect, test } from "vitest";
import { gradeBlanks, gradeExec, gradeReview } from "./index";

describe("gradeBlanks", () => {
  test("all blanks right is correct", () => {
    expect(gradeBlanks([{ accept: ["map"] }, { accept: ["set"] }], ["map", "set"]).outcome).toBe("correct");
  });
  test("some blanks right is partial, and says which", () => {
    const r = gradeBlanks([{ accept: ["map"] }, { accept: ["set"] }], ["map", "array"]);
    expect(r.outcome).toBe("partial");
    expect(r.failureNote).toContain("2");
  });
  test("none right is wrong", () => {
    expect(gradeBlanks([{ accept: ["map"] }], ["array"]).outcome).toBe("wrong");
  });
  test("answers shorter than blanks does not throw and grades the missing ones wrong", () => {
    const r = gradeBlanks([{ accept: ["map"] }, { accept: ["set"] }], ["map"]);
    expect(r.outcome).toBe("partial");
    expect(r.failureNote).toContain("1");
  });
});

describe("gradeReview", () => {
  test("finding every planted defect is correct", () => {
    const findings = [{ id: "a", planted: true }, { id: "b", planted: true }, { id: "c", planted: false }];
    expect(gradeReview(findings, ["a", "b"]).outcome).toBe("correct");
  });
  test("finding some is partial", () => {
    const findings = [{ id: "a", planted: true }, { id: "b", planted: true }];
    expect(gradeReview(findings, ["a"]).outcome).toBe("partial");
  });
  test("selecting a decoy costs the correct verdict", () => {
    const findings = [{ id: "a", planted: true }, { id: "c", planted: false }];
    const r = gradeReview(findings, ["a", "c"]);
    expect(r.outcome).toBe("partial");
    expect(r.failureNote).toContain("decoy");
  });
  test("missing all planted findings but picking a decoy mentions the decoy", () => {
    const findings = [{ id: "a", planted: true }, { id: "c", planted: false }];
    const r = gradeReview(findings, ["c"]);
    expect(r.outcome).toBe("wrong");
    expect(r.failureNote).toContain("decoy");
  });
  test("zero planted findings and no picks is correct, not vacuous or a divide-by-zero", () => {
    const findings = [{ id: "a", planted: false }, { id: "b", planted: false }];
    const r = gradeReview(findings, []);
    expect(r.outcome).toBe("correct");
  });
});

describe("gradeExec", () => {
  test("a passing check is correct", () => {
    expect(gradeExec({ kind: "stdout-equals", value: "42" }, { stdout: "42" }).outcome).toBe("correct");
  });
  test("a runtime error is wrong and carries the message", () => {
    const r = gradeExec({ kind: "no-error" }, { error: "ReferenceError: x is not defined" });
    expect(r.outcome).toBe("wrong");
    expect(r.failureNote).toContain("ReferenceError");
  });
});
