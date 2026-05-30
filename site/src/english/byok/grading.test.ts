import { describe, it, expect } from "vitest";
import { parseGrading } from "./grading";

const valid = {
  corrections: [{ before: "I has", after: "I have", why: "subject-verb agreement" }],
  betterVersion: "I have finished the task.",
  scoreBand: "B1",
  noticingHints: ["Watch present-tense agreement."],
};

describe("parseGrading", () => {
  it("parses clean JSON", () => {
    expect(parseGrading(JSON.stringify(valid))).toEqual(valid);
  });
  it("parses JSON inside code fences + prose", () => {
    const wrapped = "Here is your feedback:\n```json\n" + JSON.stringify(valid) + "\n```\nGreat job!";
    expect(parseGrading(wrapped)).toEqual(valid);
  });
  it("returns null on malformed / wrong-shape input", () => {
    expect(parseGrading("not json")).toBeNull();
    expect(parseGrading(JSON.stringify({ betterVersion: "x" }))).toBeNull();
    expect(parseGrading(JSON.stringify({ ...valid, scoreBand: "Z9" }))).toBeNull();
  });
});
