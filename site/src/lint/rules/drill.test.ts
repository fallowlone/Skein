import { describe, it, expect } from "vitest";
import { lintDrillData } from "./drill";

const ok = {
  track: "algorithms", unit: "02-arrays-strings", patterns: ["two-pointers"],
  intro: { en: "x".repeat(30), ru: "y".repeat(30) },
  problems: [
    { id: "a", leetcodeId: 1, slug: "a", title: "A", difficulty: "easy", pattern: "two-pointers", targetMinutes: 10, hints: [{ en: "h1", ru: "п1" }, { en: "h2", ru: "п2" }], companies: [] },
    { id: "b", leetcodeId: 2, slug: "b", title: "B", difficulty: "medium", pattern: "two-pointers", targetMinutes: 12, hints: [{ en: "h1", ru: "п1" }, { en: "h2", ru: "п2" }], companies: [] },
    { id: "c", leetcodeId: 3, slug: "c", title: "C", difficulty: "hard", pattern: "two-pointers", targetMinutes: 20, hints: [{ en: "h1", ru: "п1" }, { en: "h2", ru: "п2" }], companies: [] },
  ],
};

describe("lintDrillData", () => {
  it("passes a well-formed entry", () => {
    expect(lintDrillData("f.json", ok).errors).toEqual([]);
  });
  it("errors when a problem's pattern is not in the unit's patterns", () => {
    const bad = { ...ok, problems: [{ ...ok.problems[0], pattern: "graphs" }, ok.problems[1], ok.problems[2]] };
    expect(lintDrillData("f.json", bad).errors.join()).toMatch(/pattern .*not in/i);
  });
  it("errors on an untranslated hint (en === ru, long)", () => {
    const bad = JSON.parse(JSON.stringify(ok));
    bad.problems[0].hints[0] = { en: "same long sentence here", ru: "same long sentence here" };
    expect(lintDrillData("f.json", bad).errors.join()).toMatch(/untranslated/i);
  });
  it("warns when difficulty is not non-decreasing within a pattern", () => {
    const bad = JSON.parse(JSON.stringify(ok));
    bad.problems[0].difficulty = "hard"; bad.problems[2].difficulty = "easy";
    expect(lintDrillData("f.json", bad).warnings.join()).toMatch(/ramp/i);
  });
  it("exports a function", () => { expect(typeof lintDrillData).toBe("function"); });
});
