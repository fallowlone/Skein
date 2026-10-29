import { describe, expect, it } from "vitest";
import { arcPoint, placeAlongArcs } from "./geometry";

describe("placeAlongArcs", () => {
  it("keeps every label at least minGap from the others and from obstacles", () => {
    const arcs = [0, 1, 2, 3].map((k) => ({ x1: 80, x2: 240, lift: 40 + (k % 2) * 7 }));
    const nodes = [{ x: 80, y: 60 }, { x: 240, y: 60 }];
    const pts = placeAlongArcs(arcs, 60, 22, nodes);
    const all = [...nodes, ...pts];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y)).toBeGreaterThanOrEqual(22);
  });
  it("puts a lone label at the apex of its arc", () => {
    const [p] = placeAlongArcs([{ x1: 80, x2: 240, lift: 54 }], 60, 22);
    expect(p).toEqual(arcPoint(80, 240, 60, 54, 0.5));
  });
});
