import { describe, it, expect } from "vitest";
import { outputTasks } from "./tasks";

const BANDS = ["A2", "B1", "B2"];
const TYPES = ["pr-comment", "standup", "design-rationale", "bug-report", "incident-summary", "commit-message", "rfc-summary", "review-reply"];
const bi = (b: any) => b && typeof b.en === "string" && b.en.length > 0 && typeof b.ru === "string" && b.ru.length > 0;

describe("output tasks", () => {
  it("has ~20 tasks with unique ids", () => {
    expect(outputTasks.length).toBeGreaterThanOrEqual(18);
    const ids = outputTasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every task is well-formed and bilingual", () => {
    for (const t of outputTasks) {
      expect(BANDS).toContain(t.band);
      expect(TYPES).toContain(t.type);
      expect(bi(t.prompt)).toBe(true);
      expect(t.rubric.length).toBeGreaterThanOrEqual(2);
      expect(t.rubric.every((r) => typeof r === "string" && r.length > 0)).toBe(true);
      if (t.modelAnswer) expect(bi(t.modelAnswer)).toBe(true);
    }
  });
});
