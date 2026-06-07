// scripts/depth-audit/rubric.test.ts
import { describe, it, expect } from "vitest";
import { DIMENSIONS } from "./types";
import { WEIGHTS, weightedOverall, GRADE_TOOL_SCHEMA, buildUnitPrompt } from "./rubric";

describe("weightedOverall", () => {
  it("returns 0 for all-zero and 5 for all-five", () => {
    const zero = Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as any;
    const five = Object.fromEntries(DIMENSIONS.map((d) => [d, 5])) as any;
    expect(weightedOverall(zero)).toBe(0);
    expect(weightedOverall(five)).toBe(5);
  });
  it("weights seniorDepth more than realNumbers", () => {
    const base = Object.fromEntries(DIMENSIONS.map((d) => [d, 2])) as any;
    const senior = { ...base, seniorDepth: 4 };
    const numbers = { ...base, realNumbers: 4 };
    expect(weightedOverall(senior)).toBeGreaterThan(weightedOverall(numbers));
  });
});

describe("buildUnitPrompt", () => {
  it("lists every lesson key and its file + practice path", () => {
    const p = buildUnitPrompt({
      unitKey: "databases/03-execution-plans", track: "databases", unit: "03-execution-plans",
      lessons: [
        { lessonKey: "databases/03-execution-plans/01-x", track: "databases", unitKey: "databases/03-execution-plans", slug: "01-x", status: "ready", level: "senior", path: "/abs/01-x/index.mdx", practicePath: "/abs/01-x.json" },
      ],
    } as any);
    expect(p).toContain("databases/03-execution-plans/01-x");
    expect(p).toContain("/abs/01-x/index.mdx");
    expect(p).toContain("/abs/01-x.json");
    for (const d of DIMENSIONS) expect(p).toContain(d);
  });
});

describe("GRADE_TOOL_SCHEMA", () => {
  it("requires a grade per dimension", () => {
    const props = GRADE_TOOL_SCHEMA.properties.grades.items.properties.scores.properties;
    for (const d of DIMENSIONS) expect(props[d]).toBeTruthy();
  });
});
