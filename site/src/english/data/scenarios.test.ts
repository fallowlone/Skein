import { describe, it, expect } from "vitest";
import { scenarios } from "./scenarios";

describe("scenarios", () => {
  it("has at least 10 well-formed scenarios with unique ids", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(scenarios.map((s) => s.id));
    expect(ids.size).toBe(scenarios.length);
    for (const s of scenarios) {
      expect(["A2", "B1", "B2"]).toContain(s.level);
      expect(s.role.length).toBeGreaterThan(3);
      expect(s.goal.length).toBeGreaterThan(3);
      expect(s.opening.length).toBeGreaterThan(3);
      expect(s.titleRu.length).toBeGreaterThan(1);
    }
  });
});
