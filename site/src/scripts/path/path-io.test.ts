import { describe, it, expect } from "vitest";
import {
  unitsFromMap, applyViewOrder, masteryByTrack, serializeKnowledge, deserializeKnowledge,
  togglePin, moveInOrder,
  content, computePath, config,
  nextCalibrationProbe, unitProbeConcepts,
  overrides, loosenUnit, clearOverrides, importState,
  searchConcepts, reorderList,
  tierOf,
} from "./path-io";
import { DEFAULT_CONFIG } from "./config";
import { emptyState, applySelfDeclare } from "./knowledge";
import type { PathStep, Concept, Track } from "./types";
import conceptsJson from "~/content/path/concepts.json";
import unitConceptsJson from "~/content/path/unit-concepts.json";

const step = (unit: string, track = "networking" as Track): PathStep =>
  ({ unit, track, unlocks: [], reason: "", kind: "learn", estMin: 10 });

describe("path-io pure helpers", () => {
  it("unitsFromMap turns the unit-concepts map into UnitConcepts[] with unit+track", () => {
    const out = unitsFromMap({ "networking/02-tcp": { teaches: ["a"], requires: ["b"], estMin: 40 } });
    expect(out).toEqual([{ unit: "networking/02-tcp", track: "networking", teaches: ["a"], requires: ["b"], estMin: 40 }]);
  });

  it("applyViewOrder floats ordered units to the top in order, keeps the rest stable", () => {
    const steps = [step("n/01"), step("n/02"), step("n/03")];
    const out = applyViewOrder(steps, ["n/03", "n/01"]);
    expect(out.map((s) => s.unit)).toEqual(["n/03", "n/01", "n/02"]);
  });

  it("applyViewOrder is a no-op with an empty order", () => {
    const steps = [step("n/01"), step("n/02")];
    expect(applyViewOrder(steps, []).map((s) => s.unit)).toEqual(["n/01", "n/02"]);
  });

  it("togglePin adds then removes a unit", () => {
    expect(togglePin([], "u1")).toEqual(["u1"]);
    expect(togglePin(["u1"], "u1")).toEqual([]);
  });

  it("moveInOrder swaps a unit with its neighbour (auto-adds if absent)", () => {
    expect(moveInOrder(["a", "b", "c"], "c", "up")).toEqual(["a", "c", "b"]);
    expect(moveInOrder(["a", "b"], "a", "down")).toEqual(["b", "a"]);
    expect(moveInOrder([], "x", "up")).toEqual(["x"]);
  });

  it("masteryByTrack rolls confidence up per track", () => {
    const concepts: Concept[] = [
      { id: "a", label: { en: "A", ru: "А" }, track: "networking", band: "middle", requires: [] },
      { id: "b", label: { en: "B", ru: "Б" }, track: "networking", band: "middle", requires: [] },
      { id: "c", label: { en: "C", ru: "В" }, track: "databases", band: "surface", requires: [] },
    ];
    const state = applySelfDeclare(emptyState(), "a", true, 0);
    const rows = masteryByTrack(state, concepts, 0.6);
    const net = rows.find((r) => r.track === "networking")!;
    expect(net).toMatchObject({ total: 2, known: 1 });
    expect(net.avg).toBeCloseTo(0.5, 5);
    expect(rows.map((r) => r.track)).toEqual(["databases", "networking"]);
  });

  it("knowledge serialization round-trips through a Map", () => {
    const s = applySelfDeclare(emptyState(), "a", true, 123);
    const arr = serializeKnowledge(s);
    expect(arr).toEqual([["a", { confidence: 1, source: "declared", lastAt: 123 }]]);
    expect(deserializeKnowledge(arr).get("a")).toEqual({ confidence: 1, source: "declared", lastAt: 123 });
  });
});

describe("path-io calibration surface", () => {
  it("exposes the diagnostics bundle for the 35 diagnosed concepts", () => {
    expect(Object.keys(content.diagnostics).length).toBe(35);
    expect(content.diagnostics["idempotency"].items.length).toBeGreaterThanOrEqual(2);
  });
  it("nextCalibrationProbe returns a diagnosed concept (cold-start)", () => {
    const p = nextCalibrationProbe();
    expect(p === null || content.diagnosedConcepts.has(p)).toBe(true);
  });
  it("unitProbeConcepts filters a unit's teaches to diagnosed concepts", () => {
    const withProbe = content.units.find((u) => u.teaches.some((c) => content.diagnosedConcepts.has(c)));
    expect(withProbe).toBeDefined();
    const probes = unitProbeConcepts(withProbe!.unit);
    expect(probes.every((c) => content.diagnosedConcepts.has(c))).toBe(true);
    expect(probes.length).toBeGreaterThan(0);
  });
});

describe("path-io cold-start", () => {
  it("the bundle loads the full graph", () => {
    expect(content.concepts.length).toBeGreaterThan(4000);
    expect(content.units.length).toBe(337); // 327 + 10 docker (waves 10-11)
    expect(content.goals.map((g) => g.id)).toContain("senior-fullstack");
  });

  it("computePath returns dependency-ordered learn steps for the default goal", () => {
    config.value = { ...config.value, pace: { stepsAhead: 8, srsAggressiveness: 0 } };
    const { path } = computePath();
    expect(path.steps.length).toBeGreaterThan(0);
    expect(path.steps.length).toBeLessThanOrEqual(8);
    expect(path.steps.every((s: PathStep) => s.kind === "learn")).toBe(true);
    expect(path.steps[0].estMin).toBeGreaterThan(0);
  });
});

describe("path-io overrides + state-io", () => {
  it("loosenUnit records removeEdges and computePath stays valid", () => {
    clearOverrides();
    const target = computePath().path.steps[0]?.unit;
    if (target) loosenUnit(target);
    expect(computePath().droppedLocal).toBe(false);
    clearOverrides();
  });
  it("importState round-trips an exported-shape bundle", () => {
    const r = importState(JSON.stringify({ version: 1, exportedAt: 0, pathOverrides: { addEdges: [], removeEdges: [{ concept: "x", requires: "y" }] } }));
    expect(r.ok).toBe(true);
    expect(overrides.value.removeEdges).toEqual([{ concept: "x", requires: "y" }]);
    clearOverrides();
  });
  it("importState rejects a bad bundle without mutating", () => {
    clearOverrides();
    const r = importState("{ not json");
    expect(r.ok).toBe(false);
    expect(overrides.value.removeEdges).toEqual([]);
  });
});

describe("path-io cross-track override wiring", () => {
  // Find a real cross-track pair: a consumer concept taught by some unit, and a prereq concept
  // from a different track also taught by some unit. (4798 concepts / 29 tracks → always exists.)
  function crossTrackPair(): { consumer: string; prereq: string } {
    const taught = new Set<string>();
    const units = unitConceptsJson as Record<string, { teaches: string[] }>;
    for (const k of Object.keys(units)) for (const t of units[k].teaches) taught.add(t);
    const cs = (conceptsJson as { id: string; track: string }[]).filter((c) => taught.has(c.id));
    const consumer = cs[0];
    const prereq = cs.find((c) => c.track !== consumer.track)!;
    return { consumer: consumer.id, prereq: prereq.id };
  }

  it("a cross-track local override edge keeps computePath valid (no throw, not dropped)", () => {
    const { consumer, prereq } = crossTrackPair();
    overrides.value = { addEdges: [{ concept: consumer, requires: prereq }], removeEdges: [], retag: [] };
    const res = computePath();
    expect(Array.isArray(res.path.steps)).toBe(true);
    expect(res.droppedLocal).toBe(false);
    clearOverrides();
  });
});

describe("searchConcepts", () => {
  const taught = new Set(["tcp-handshake", "indexing", "--junk"]);
  const concepts = [
    { id: "tcp-handshake", label: { en: "TCP handshake", ru: "TCP-рукопожатие" }, track: "networking", band: "middle", requires: [] },
    { id: "indexing", label: { en: "Indexing", ru: "Индексы" }, track: "databases", band: "middle", requires: [] },
    { id: "--junk", label: { en: " junk", ru: " junk" }, track: "x", band: "advanced", requires: [] },
    { id: "untaught", label: { en: "Untaught", ru: "—" }, track: "x", band: "middle", requires: [] },
  ] as any;

  it("matches on label and respects the taught + clean-label filter", () => {
    const r = searchConcepts(concepts, taught, "tcp", "en", 20);
    expect(r.map((c) => c.id)).toEqual(["tcp-handshake"]);
  });
  it("matches on id too", () => {
    expect(searchConcepts(concepts, taught, "indexing", "en").map((c) => c.id)).toEqual(["indexing"]);
  });
  it("excludes junk-id / leading-space-label and untaught concepts", () => {
    expect(searchConcepts(concepts, taught, "junk", "en")).toEqual([]);
    expect(searchConcepts(concepts, taught, "untaught", "en")).toEqual([]); // not taught
  });
  it("empty query returns []", () => {
    expect(searchConcepts(concepts, taught, "  ", "en")).toEqual([]);
  });
  it("caps the result count", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      ({ id: `c${i}`, label: { en: `match ${i}`, ru: `m ${i}` }, track: "x", band: "middle", requires: [] }));
    const t = new Set(many.map((c) => c.id));
    expect(searchConcepts(many as any, t, "match", "en", 20)).toHaveLength(20);
  });
});

describe("reorderList", () => {
  it("moves a unit before the drop target (down)", () => {
    expect(reorderList(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });
  it("moves a unit before the drop target (up)", () => {
    expect(reorderList(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });
  it("no-op when from === to", () => {
    expect(reorderList(["a", "b", "c"], "b", "b")).toEqual(["a", "b", "c"]);
  });
  it("returns the input unchanged when an id is missing", () => {
    expect(reorderList(["a", "b"], "z", "a")).toEqual(["a", "b"]);
    expect(reorderList(["a", "b"], "a", "z")).toEqual(["a", "b"]);
  });
});

describe("tierOf", () => {
  it("returns the string tier", () => {
    expect(tierOf({ ...DEFAULT_CONFIG, depthTier: "junior" })).toBe("junior");
  });
  it("falls back to middle for a per-track map", () => {
    expect(tierOf({ ...DEFAULT_CONFIG, depthTier: { frontend: "senior" } })).toBe("middle");
  });
});
