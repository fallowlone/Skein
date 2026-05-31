import { describe, it, expect } from "vitest";
import { placeNodes, type RawNode } from "./flow-layout";

describe("placeNodes", () => {
  it("auto-places nodes left-to-right when col/row omitted", () => {
    const nodes: RawNode[] = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }];
    const placed = placeNodes(nodes, 3);
    expect(placed.map((n) => n.col)).toEqual([0, 1, 2]);
    expect(placed.every((n) => n.row === 0)).toBe(true);
  });
  it("wraps to the next row past perRow", () => {
    const nodes: RawNode[] = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }];
    const placed = placeNodes(nodes, 2);
    expect(placed.map((n) => [n.col, n.row])).toEqual([[0, 0], [1, 0], [0, 1]]);
  });
  it("respects explicit col/row", () => {
    const placed = placeNodes([{ id: "a", label: "A", col: 2, row: 1 }], 3);
    expect(placed[0]).toMatchObject({ col: 2, row: 1 });
  });
});
