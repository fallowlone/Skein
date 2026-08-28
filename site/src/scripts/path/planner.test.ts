// site/src/scripts/path/planner.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { DEFAULT_CONFIG } from "./config";
import { emptyState, applyDiagnostic, applySelfDeclare } from "./knowledge";
import {
  resolveGoalTargets, targetFrontier, missingConcepts, conceptsToUnits, orderUnits, buildPath,
  goalTrackWeight,
} from "./planner";
import { normalizeRanks } from "./goal-rank";
import type { PathConfig } from "./types";

const g = buildConceptGraph(CONCEPTS);
const byId = new Map(CONCEPTS.map((c) => [c.id, c]));
const goalById = new Map(GOALS.map((x) => [x.id, x]));
const cfg = (over: Partial<PathConfig> = {}): PathConfig => ({ ...DEFAULT_CONFIG, ...over });

describe("planner", () => {
  it("resolveGoalTargets expands a band>=middle rule", () => {
    const t = resolveGoalTargets(GOALS[0], CONCEPTS);
    expect(new Set(t)).toEqual(new Set(["tcp-handshake", "tls", "indexing", "mvcc", "replication", "consensus", "leaf-x"]));
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

describe("resolveGoalTargets — track-band>= rule", () => {
  const frontendDev = GOALS.find((g) => g.id === "frontend-dev")!;

  it("targets only middle+ concepts in CORE tracks (weight >= 1), excluding support tracks", () => {
    const ids = resolveGoalTargets(frontendDev, CONCEPTS);
    // core track networking middle+: leaf-x, tcp-handshake, tls. databases is support (0.7) → excluded.
    expect(ids.sort()).toEqual(["leaf-x", "tcp-handshake", "tls"]);
  });

  it("ignores foundations/surface bands even in a core track", () => {
    const ids = resolveGoalTargets(frontendDev, CONCEPTS);
    expect(ids).not.toContain("ip-addressing"); // foundations
    expect(ids).not.toContain("ports-sockets"); // foundations
  });

  it("returns [] for an unknown band token", () => {
    const bad = { ...frontendDev, target: { rule: "track-band>=nonsense" } };
    expect(resolveGoalTargets(bad, CONCEPTS)).toEqual([]);
  });
});

describe("goalTrackWeight — rank inverts into weight", () => {
  const goals = [
    { id: "g-net", label: { en: "", ru: "" }, target: { rule: "band>=middle" }, trackWeights: { networking: 1 } },
    { id: "g-db",  label: { en: "", ru: "" }, target: { rule: "band>=middle" }, trackWeights: { databases: 1 } },
  ] as any[];
  it("rank-1 goal's track weighs more than rank-2 goal's track", () => {
    const ranks = new Map(normalizeRanks([{ id: "g-db", priority: 1 }, { id: "g-net", priority: 2 }]).map((r) => [r.id, r.rank]));
    expect(goalTrackWeight("databases" as any, goals, ranks)).toBeGreaterThan(goalTrackWeight("networking" as any, goals, ranks));
  });
  it("floors at 0.5 for an untargeted track", () => {
    const ranks = new Map([["g-net", 1]]);
    expect(goalTrackWeight("frontend" as any, [goals[0]], ranks)).toBe(0.5);
  });
});

describe("conceptsToUnits — greedy set cover", () => {
  const u = (unit: string, teaches: string[], estMin: number) =>
    ({ unit, track: unit.split("/")[0], teaches, requires: [], estMin }) as any;
  it("picks one unit per concept when several teach it", () => {
    const units = [u("a/01", ["x", "y"], 60), u("b/01", ["x"], 30)];
    expect(conceptsToUnits(["x", "y"], units).map((q) => q.unit)).toEqual(["a/01"]); // covers both
  });
  it("breaks coverage ties by smaller estMin, then unit id", () => {
    const units = [u("a/01", ["x"], 60), u("b/01", ["x"], 30)];
    expect(conceptsToUnits(["x"], units).map((q) => q.unit)).toEqual(["b/01"]);
  });
  it("leaves concepts taught by no unit uncovered without looping", () => {
    expect(conceptsToUnits(["ghost"], [u("a/01", ["x"], 60)])).toEqual([]);
  });
});

describe("buildPath — partial-unit cost", () => {
  it("scales a step's estMin by the missing share of its teaches", () => {
    // networking/01-ip teaches ip-addressing + ports-sockets (see mini-graph fixture).
    // Self-declare ports-sockets known (declare does NOT propagate to its prereqs, so
    // ip-addressing stays missing) → 1 of 2 concepts missing → half the authored estMin.
    const s = applySelfDeclare(emptyState(), "ports-sockets", true, 0);
    const path = buildPath({
      state: s, goals: [GOALS[0]], config: cfg(), content: { concepts: CONCEPTS, units: UNITS, goalById },
      srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    const ip = path.steps.find((st) => st.unit === "networking/01-ip")!;
    const authored = UNITS.find((x) => x.unit === "networking/01-ip")!;
    expect(ip.unlocks).toEqual(["ip-addressing"]);
    expect(ip.estMin).toBe(Math.max(5, Math.round(authored.estMin * (1 / authored.teaches.length))));
  });
});

describe("resolveGoalTargets — track-band range rule", () => {
  const mk = (rule: string) => ({
    id: "jr", label: { en: "", ru: "" }, target: { rule },
    trackWeights: { networking: 1, databases: 0.7 },
  }) as any;
  it("targets only concepts whose band falls inside [lo, hi] in core tracks", () => {
    const ids = resolveGoalTargets(mk("track-band=foundations..surface"), CONCEPTS);
    // networking is the only core track (weight >= 1); databases (0.7) is support → excluded.
    expect(ids.every((id) => byId.get(id)!.track === "networking")).toBe(true);
    expect(ids).toContain("ip-addressing");          // foundations — inside range
    expect(ids).not.toContain("tcp-handshake");      // middle — above the ceiling
  });
  it("returns [] for an unknown band token in either bound", () => {
    expect(resolveGoalTargets(mk("track-band=surface..wizard"), CONCEPTS)).toEqual([]);
    expect(resolveGoalTargets(mk("track-band=wizard..middle"), CONCEPTS)).toEqual([]);
  });
});

describe("buildPath — triage value", () => {
  it("same band: a unit with missing downstream dependents outvalues a terminal unit", () => {
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]], config: cfg({ pace: { stepsAhead: 50, srsAggressiveness: 0 } }),
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    for (const s of path.steps) expect(s.value).toBeGreaterThan(0);
    // tcp-handshake (middle) has missing dependents (tls, leaf-x, …); leaf-x (middle) has none.
    const hub = path.steps.find((s) => s.unit === "networking/02-tcp")!;
    const leaf = path.steps.find((s) => s.unit === "networking/03-leaf")!;
    expect(hub.value!).toBeGreaterThan(leaf.value!);
  });

  it("uses fresh demand to break ties only among prerequisite-ready units", () => {
    const concepts = [
      { id: "a", label: { en: "A", ru: "A" }, track: "networking", band: "middle", requires: [] },
      { id: "b", label: { en: "B", ru: "B" }, track: "databases", band: "middle", requires: [] },
    ] as any;
    const units = [
      { unit: "networking/a", track: "networking", teaches: ["a"], requires: [], estMin: 10 },
      { unit: "databases/b", track: "databases", teaches: ["b"], requires: [], estMin: 10 },
    ] as any;
    const goal = { id: "market", label: { en: "", ru: "" }, target: { concepts: ["a", "b"] }, trackWeights: {} } as any;
    const now = Date.parse("2026-08-28T00:00:00.000Z");
    const path = buildPath({
      state: emptyState(), goals: [goal], config: cfg({ breadthVsDepth: 1, pace: { stepsAhead: 2, srsAggressiveness: 0 } }),
      content: { concepts, units, goalById: new Map([[goal.id, goal]]) }, srsDue: [], now,
      trackOrder: new Map([["networking", 1], ["databases", 2]]),
      marketDemand: {
        schemaVersion: 1, generatedAt: new Date(now).toISOString(), windowDays: 30, sampleSize: 40,
        sources: [{ id: "one", label: "One", jobs: 20 }, { id: "two", label: "Two", jobs: 20 }],
        tracks: { databases: { score: 1, mentions: 20, confidence: 1 } }, concepts: {},
      },
    });
    expect(path.steps.map((step) => step.unit)).toEqual(["databases/b", "networking/a"]);
  });
});
