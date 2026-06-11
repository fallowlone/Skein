// src/scripts/path/goals-content.test.ts
import { describe, it, expect } from "vitest";
import goals from "../../content/path/goals.json";
import concepts from "../../content/path/concepts.json";
import { resolveGoalTargets } from "./planner";
import type { Goal, Concept } from "./types";

const byId = new Map((goals as Goal[]).map((g) => [g.id, g]));
const conceptById = new Map((concepts as Concept[]).map((c) => [c.id, c]));

describe("role goal presets", () => {
  it.each(["frontend-dev", "fullstack-dev", "devops-engineer"])("%s exists with EN+RU labels and track-band rule", (id) => {
    const g = byId.get(id)!;
    expect(g).toBeTruthy();
    expect(g.label.en.length).toBeGreaterThan(0);
    expect(g.label.ru.length).toBeGreaterThan(0);
    expect(g.target.rule).toBe("track-band>=middle");
    expect(Object.values(g.trackWeights).some((w) => w === 1)).toBe(true); // has >=1 core track
  });

  it.each(["frontend-dev", "fullstack-dev", "devops-engineer"])("%s resolves to a non-empty target frontier", (id) => {
    const ids = resolveGoalTargets(byId.get(id)!, concepts as Concept[]);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("job-ready-junior resolves to a non-empty frontier with no advanced concepts", () => {
    const goal = (goals as Goal[]).find((g) => g.id === "job-ready-junior")!;
    const ids = resolveGoalTargets(goal, concepts as Concept[]);
    expect(ids.length).toBeGreaterThan(100);
    expect(ids.every((id) => conceptById.get(id)!.band !== "advanced")).toBe(true);
  });
});
