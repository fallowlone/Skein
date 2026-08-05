import { describe, expect, test } from "vitest";
import { applyResponse, emptyCell, propagate } from "./update";
import { expectedLevel } from "./ordinal";
import { cellKey, type AssessItem, type Band, type Cell, type CellKey } from "./types";
import { buildConceptGraph } from "~/scripts/path/graph";
import type { Concept } from "~/scripts/path/types";

const concept = (id: string, requires: string[]): Concept =>
  ({ id, label: { en: "", ru: "" }, track: "backend", band: "surface", requires });

const bandOf = (): Band => "surface";
const item: AssessItem = {
  id: "l#t", lessonKey: "l", taskId: "t", kind: "exec", facet: "production",
  band: "surface", concepts: ["promises"], weight: 1, estMin: 5,
};
const seed = (): Map<CellKey, Cell> =>
  new Map([[cellKey("promises", "production"), emptyCell("promises", "production", "surface")]]);

describe("applyResponse", () => {
  test("a correct unaided answer raises the expected level", () => {
    const before = seed();
    const after = applyResponse(before, item, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    const b = before.get(cellKey("promises", "production"))!;
    const a = after.get(cellKey("promises", "production"))!;
    expect(expectedLevel(a.posterior)).toBeGreaterThan(expectedLevel(b.posterior));
  });

  test("the input map is not mutated", () => {
    const before = seed();
    const snapshot = before.get(cellKey("promises", "production"))!.posterior;
    applyResponse(before, item, { outcome: "wrong", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(before.get(cellKey("promises", "production"))!.posterior).toBe(snapshot);
  });

  test("evidence is appended with the item and the response", () => {
    const after = applyResponse(seed(), item, { outcome: "partial", hintsUsed: 1, elapsedMs: 10 }, bandOf, 42);
    const cell = after.get(cellKey("promises", "production"))!;
    expect(cell.items).toBe(1);
    expect(cell.evidence).toHaveLength(1);
    expect(cell.evidence[0]).toMatchObject({ itemId: "l#t", atMs: 42, facet: "production" });
  });

  test("a multi-concept item creates a cell per attributed concept", () => {
    const multi = { ...item, concepts: ["promises", "event-loop"], weight: 0.5 };
    const after = applyResponse(new Map(), multi, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(after.has(cellKey("promises", "production"))).toBe(true);
    expect(after.has(cellKey("event-loop", "production"))).toBe(true);
  });

  test("a half-weight item moves the posterior less than a full-weight one", () => {
    const full = applyResponse(seed(), item, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    const half = applyResponse(seed(), { ...item, weight: 0.5 }, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(expectedLevel(full.get(cellKey("promises", "production"))!.posterior))
      .toBeGreaterThan(expectedLevel(half.get(cellKey("promises", "production"))!.posterior));
  });
});

describe("propagate", () => {
  const graph = buildConceptGraph([
    concept("async-await", ["promises"]),
    concept("promises", []),
  ]);

  test("strong production evidence flows down to prerequisites", () => {
    let cells = new Map([[cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")]]);
    for (let i = 0; i < 3; i++) {
      cells = applyResponse(cells, { ...item, concepts: ["async-await"] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    const after = propagate(cells, graph, "async-await", "production", bandOf);
    const prereq = after.get(cellKey("promises", "production"));
    expect(prereq).toBeDefined();
    expect(expectedLevel(prereq!.posterior)).toBeGreaterThan(expectedLevel(emptyCell("promises", "production", "surface").posterior));
  });

  test("recognition evidence does NOT propagate — knowing a term says nothing about its prerequisites", () => {
    let cells = new Map([[cellKey("async-await", "recognition"), emptyCell("async-await", "recognition", "surface")]]);
    cells = applyResponse(cells, { ...item, kind: "recall", facet: "recognition", concepts: ["async-await"] },
      { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const after = propagate(cells, graph, "async-await", "recognition", bandOf);
    expect(after.has(cellKey("promises", "recognition"))).toBe(false);
  });

  test("propagated evidence never overwrites a directly measured cell", () => {
    let cells = new Map([
      [cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")],
      [cellKey("promises", "production"), emptyCell("promises", "production", "surface")],
    ]);
    cells = applyResponse(cells, { ...item, concepts: ["promises"] }, { outcome: "wrong", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const measured = cells.get(cellKey("promises", "production"))!.posterior;
    for (let i = 0; i < 3; i++) {
      cells = applyResponse(cells, { ...item, concepts: ["async-await"] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    const after = propagate(cells, graph, "async-await", "production", bandOf);
    expect(after.get(cellKey("promises", "production"))!.posterior).toEqual(measured);
  });
});

describe("propagate — multi-hop", () => {
  // async-await requires promises requires event-loop: a three-deep chain.
  const chain = buildConceptGraph([
    concept("async-await", ["promises"]),
    concept("promises", ["event-loop"]),
    concept("event-loop", []),
  ]);

  const strongResult = (cells: Map<CellKey, Cell>, conceptId: string): Map<CellKey, Cell> => {
    let out = cells;
    for (let i = 0; i < 3; i++) {
      out = applyResponse(out, { ...item, concepts: [conceptId] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    return out;
  };

  test("a strong result on the top of a three-deep chain lifts both prerequisites, with decay by hop", () => {
    let cells = new Map([[cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")]]);
    cells = strongResult(cells, "async-await");
    const after = propagate(cells, chain, "async-await", "production", bandOf);

    const b = after.get(cellKey("promises", "production"));
    const c = after.get(cellKey("event-loop", "production"));
    expect(b).toBeDefined();
    expect(c).toBeDefined();

    const baseline = expectedLevel(emptyCell("event-loop", "production", "surface").posterior);
    const liftB = expectedLevel(b!.posterior) - baseline;
    const liftC = expectedLevel(c!.posterior) - baseline;
    expect(liftB).toBeGreaterThan(0);
    expect(liftC).toBeGreaterThan(0);
    expect(liftC).toBeLessThan(liftB); // two hops out moves strictly less than one hop out
  });

  test("a cell two hops out with its own direct evidence is not overwritten", () => {
    let cells = new Map([
      [cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")],
      [cellKey("event-loop", "production"), emptyCell("event-loop", "production", "surface")],
    ]);
    // Direct (measured) evidence on event-loop, two hops from async-await.
    cells = applyResponse(cells, { ...item, concepts: ["event-loop"] }, { outcome: "wrong", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const measured = cells.get(cellKey("event-loop", "production"))!.posterior;

    cells = strongResult(cells, "async-await");
    const after = propagate(cells, chain, "async-await", "production", bandOf);
    expect(after.get(cellKey("event-loop", "production"))!.posterior).toEqual(measured);
  });

  test("recognition still does not propagate at any depth", () => {
    let cells = new Map([[cellKey("async-await", "recognition"), emptyCell("async-await", "recognition", "surface")]]);
    cells = applyResponse(cells, { ...item, kind: "recall", facet: "recognition", concepts: ["async-await"] },
      { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const after = propagate(cells, chain, "async-await", "recognition", bandOf);
    expect(after.has(cellKey("promises", "recognition"))).toBe(false);
    expect(after.has(cellKey("event-loop", "recognition"))).toBe(false);
  });

  test("a cyclic requires relation terminates and does not throw", () => {
    const cyclic = buildConceptGraph([
      concept("cycle-a", ["cycle-b"]),
      concept("cycle-b", ["cycle-a"]),
    ]);
    let cells = new Map([[cellKey("cycle-a", "production"), emptyCell("cycle-a", "production", "surface")]]);
    cells = strongResult(cells, "cycle-a");
    expect(() => propagate(cells, cyclic, "cycle-a", "production", bandOf)).not.toThrow();
    const after = propagate(cells, cyclic, "cycle-a", "production", bandOf);
    expect(after.get(cellKey("cycle-b", "production"))).toBeDefined();
    // cycle-a itself must never be re-written as a "prerequisite of its own prerequisite".
    expect(after.get(cellKey("cycle-a", "production"))!.posterior).toEqual(
      cells.get(cellKey("cycle-a", "production"))!.posterior,
    );
  });
});
