import { describe, it, expect } from "vitest";
import { content } from "./path-io"; // concepts catalog
import { resolveGoalTargets, targetFrontier } from "./goal-resolve";
import type { Concept, Goal } from "./types";

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

const C = (id: string, track: string, band: string): Concept =>
  ({ id, label: { en: id, ru: id }, track: track as any, band: band as any, requires: [] });

const seniorGoal: Goal = {
  id: "senior-fullstack",
  label: { en: "", ru: "" },
  target: { rule: "track-band>=middle" },
  trackWeights: { distributed: 1, databases: 1, "system-design": 1, backend: 1, security: 1, observability: 1, performance: 1, networking: 0.9, frontend: 0.8 },
};

describe("senior-fullstack frontier is scoped to its senior-defining tracks", () => {
  const concepts: Concept[] = [
    C("paxos", "distributed", "middle"),
    C("mvcc", "databases", "advanced"),
    C("cap", "system-design", "middle"),
    C("idx-foundations", "databases", "foundations"), // below middle → excluded
    C("flexbox", "frontend", "middle"),                // support track (0.8) → excluded
    C("hooks", "react", "advanced"),                   // off-frontier track → excluded
    C("tracing", "observability", "middle"),           // promoted to core → included
  ];
  it("includes only middle+ concepts in core (weight>=1) tracks", () => {
    const ids = new Set(resolveGoalTargets(seniorGoal, concepts));
    expect(ids).toEqual(new Set(["paxos", "mvcc", "cap", "tracing"]));
  });
  it("excludes below-middle bands and support/off-frontier tracks", () => {
    const ids = new Set(resolveGoalTargets(seniorGoal, concepts));
    expect(ids.has("idx-foundations")).toBe(false);
    expect(ids.has("flexbox")).toBe(false);
    expect(ids.has("hooks")).toBe(false);
  });
});
