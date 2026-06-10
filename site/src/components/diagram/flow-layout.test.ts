import { describe, it, expect } from "vitest";
import { placeNodes, fitColumnWidth, subBudget, wrapSub, type RawNode } from "./flow-layout";

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

describe("fitColumnWidth", () => {
  it("keeps the 130 base for short text", () => {
    expect(fitColumnWidth([{ id: "a", label: "Node", sub: "tiny" }])).toBe(130);
  });
  it("widens for a long label", () => {
    const w = fitColumnWidth([{ id: "a", label: "request middleware chain" }]);
    expect(w).toBeGreaterThan(130);
    expect(w).toBeLessThanOrEqual(170);
  });
  it("sizes for the longer half when a sub must wrap", () => {
    const sub = "auth · rate-limit · route (redundant pool)"; // 42 chars, can't fit one line
    const w = fitColumnWidth([{ id: "a", label: "LB", sub }]);
    // best split = "auth · rate-limit ·" / "route (redundant pool)" → 22 chars
    expect(w).toBe(Math.ceil(22 * 6.2 + 14));
    // and the wrap at that width must NOT ellipsise — sizing and wrapping agree
    expect(wrapSub(sub, subBudget(w))).toEqual(["auth · rate-limit ·", "route (redundant pool)"]);
  });
  it("never exceeds max", () => {
    const w = fitColumnWidth([{ id: "a", label: "x".repeat(60), sub: "y".repeat(80) }]);
    expect(w).toBe(170);
  });
});

describe("wrapSub", () => {
  it("returns one line when it fits", () => {
    expect(wrapSub("fits fine", 20)).toEqual(["fits fine"]);
  });
  it("wraps at a space boundary", () => {
    const [l1, l2] = wrapSub("allows 443, stateful, remembers flow", 22);
    expect(l1.length).toBeLessThanOrEqual(22);
    expect(l2.length).toBeLessThanOrEqual(22);
    expect((l1 + " " + l2).replace(/\s+/g, " ")).toBe("allows 443, stateful, remembers flow");
  });
  it("falls back to separator chars when there is no space", () => {
    const [l1, l2] = wrapSub("scale·latency·consistency·SLO", 18);
    expect(l1.endsWith("·")).toBe(true);
    expect(l1.length).toBeLessThanOrEqual(18);
    expect(l2.length).toBeLessThanOrEqual(18);
  });
  it("hard-splits an unbreakable token", () => {
    const [l1, l2] = wrapSub("a".repeat(30), 12);
    expect(l1.length).toBe(12);
    expect(l2.length).toBeLessThanOrEqual(12);
  });
  it("ellipsises a second line that still overflows", () => {
    const lines = wrapSub("word ".repeat(20).trim(), 15);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    expect(lines[1].length).toBeLessThanOrEqual(15);
  });
});

describe("subBudget", () => {
  it("grows with column width", () => {
    expect(subBudget(170)).toBeGreaterThan(subBudget(130));
    expect(subBudget(130)).toBe(18);
  });
});
