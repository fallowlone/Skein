import { describe, it, expect } from "vitest";
import {
  unitsFromMap, applyViewOrder, masteryByTrack, serializeKnowledge, deserializeKnowledge,
  togglePin, moveInOrder,
  content, computePath, config,
} from "./path-io";
import { emptyState, applySelfDeclare } from "./knowledge";
import type { PathStep, Concept, Track } from "./types";

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

describe("path-io cold-start", () => {
  it("the bundle loads the full graph", () => {
    expect(content.concepts.length).toBeGreaterThan(4000);
    expect(content.units.length).toBe(274);
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
