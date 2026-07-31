import { describe, expect, test } from "vitest";
import { applyResponse, emptyCell, propagate } from "./update";
import { expectedLevel } from "./ordinal";
import { cellKey, type AssessItem, type Band, type Cell, type CellKey } from "./types";

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
  const graph = {
    nodes: new Map([
      ["async-await", { id: "async-await", label: { en: "", ru: "" }, track: "backend", band: "surface", requires: ["promises"] }],
      ["promises", { id: "promises", label: { en: "", ru: "" }, track: "backend", band: "surface", requires: [] }],
    ]),
  } as unknown as Parameters<typeof propagate>[1];

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
    cells = applyResponse(cells, { ...item, kind: "mcq", facet: "recognition", concepts: ["async-await"] },
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
