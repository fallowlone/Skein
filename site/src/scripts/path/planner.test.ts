// site/src/scripts/path/planner.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { DEFAULT_CONFIG } from "./config";
import { emptyState, applyDiagnostic } from "./knowledge";
import {
  resolveGoalTargets, targetFrontier, missingConcepts, conceptsToUnits, orderUnits, buildPath,
} from "./planner";
import type { PathConfig, Goal } from "./types";

const g = buildConceptGraph(CONCEPTS);
const byId = new Map(CONCEPTS.map((c) => [c.id, c]));
const goalById = new Map(GOALS.map((x) => [x.id, x]));
const cfg = (over: Partial<PathConfig> = {}): PathConfig => ({ ...DEFAULT_CONFIG, ...over });

describe("planner", () => {
  it("resolveGoalTargets expands a band>=middle rule", () => {
    const t = resolveGoalTargets(GOALS[0], CONCEPTS);
    expect(new Set(t)).toEqual(new Set(["tcp-handshake", "tls", "indexing", "mvcc", "replication", "consensus"]));
  });

  it("resolveGoalTargets uses explicit concept lists", () => {
    expect(new Set(resolveGoalTargets(GOALS[1], CONCEPTS))).toEqual(new Set(["indexing", "mvcc", "tcp-handshake"]));
  });

  it("targetFrontier drops excluded tracks", () => {
    const f = targetFrontier([GOALS[0]], cfg({ excludedTracks: ["distributed"] }), CONCEPTS);
    expect(f.some((id) => byId.get(id)!.track === "distributed")).toBe(false);
  });

  it("missingConcepts is the topo-ordered closure of not-yet-known targets", () => {
    const frontier = ["mvcc"];
    const m = missingConcepts(frontier, emptyState(), g, 0.6);
    expect(m).toEqual(["relational-model", "indexing", "mvcc"]); // prereqs first
  });

  it("missingConcepts omits already-known concepts and their satisfied prereqs", () => {
    const s = applyDiagnostic(emptyState(), g, "indexing", 1, 0); // lifts relational-model too
    const m = missingConcepts(["mvcc"], s, g, 0.6);
    expect(m).toEqual(["mvcc"]);
  });

  it("orderUnits puts prereq-ready units first; depth mode groups by track order", () => {
    const units = conceptsToUnits(["tcp-handshake", "mvcc", "indexing", "relational-model", "ip-addressing", "ports-sockets"], UNITS);
    const ordered = orderUnits(units, {
      config: cfg({ breadthVsDepth: 0 }), state: emptyState(), graph: g, units: UNITS,
      goals: [GOALS[0]], concepts: CONCEPTS, trackOrder: TRACK_ORDER,
    });
    const names = ordered.map((u) => u.unit);
    expect(names.indexOf("networking/01-ip")).toBeLessThan(names.indexOf("networking/02-tcp"));
    expect(names.indexOf("databases/01-rel")).toBeLessThan(names.indexOf("databases/02-index"));
    // depth: networking (track order 1) block precedes databases (2)
    expect(names.indexOf("networking/02-tcp")).toBeLessThan(names.indexOf("databases/01-rel"));
  });

  it("resolveGoalTargets returns [] for an unknown band rule", () => {
    const bad = { id: "x", label: { en: "x", ru: "x" }, target: { rule: "band>=wizard" }, trackWeights: {} };
    expect(resolveGoalTargets(bad, CONCEPTS)).toEqual([]);
  });

  it("buildPath throws if the concept graph has a cycle", () => {
    const cyclic = [
      { id: "a", label: { en: "a", ru: "a" }, track: "networking", band: "middle", requires: ["b"] },
      { id: "b", label: { en: "b", ru: "b" }, track: "networking", band: "middle", requires: ["a"] },
    ] as any;
    const goal = { id: "g", label: { en: "g", ru: "g" }, target: { concepts: ["a"] }, trackWeights: {} } as any;
    expect(() => buildPath({
      state: emptyState(), goals: [goal], config: DEFAULT_CONFIG,
      content: { concepts: cyclic, units: [], goalById: new Map() }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    })).toThrow();
  });

  it("buildPath returns at most pace.stepsAhead learn steps, each unlocking a target concept", () => {
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]], config: cfg({ pace: { stepsAhead: 3, srsAggressiveness: 0 } }),
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    expect(path.steps.length).toBe(3);
    expect(path.steps[0].unit).toBe("networking/01-ip"); // foundations frontier first
    expect(path.steps.every((s) => s.kind === "learn")).toBe(true);
  });
});
