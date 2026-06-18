import { describe, it, expect } from "vitest";
import { content } from "./path-io"; // concepts catalog
import { resolveGoalTargets, targetFrontier } from "./goal-resolve";

describe("goal-resolve", () => {
  it("track-band=surface..middle returns core-track concepts within [surface,middle]", () => {
    const goal = {
      id: "job-ready-junior",
      label: { en: "", ru: "" },
      target: { rule: "track-band=surface..middle" },
      trackWeights: { networking: 1 },
    } as any;
    const ids = resolveGoalTargets(goal, content.concepts);
    const byId = new Map(content.concepts.map((c) => [c.id, c]));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const b = byId.get(id)!.band;
      expect(["surface", "middle"]).toContain(b);
    }
  });

  it("explicit target.concepts pass through unchanged", () => {
    // Use real concept ids from the catalog; 0-rtt and 1-rtt are both in networking/middle
    const goal = {
      id: "x",
      label: { en: "", ru: "" },
      target: { concepts: ["0-rtt", "1-rtt"] },
      trackWeights: {},
    } as any;
    expect(resolveGoalTargets(goal, content.concepts).sort()).toEqual(["0-rtt", "1-rtt"]);
  });

  it("targetFrontier unions goals + customTargets minus excludedTracks", () => {
    const cfg = { customTargets: ["big_o"], excludedTracks: [] } as any;
    const fr = targetFrontier([], cfg, content.concepts);
    // targetFrontier returns string[] (same as planner.ts); use includes not has
    expect(fr.includes("big_o")).toBe(true);
  });
});
