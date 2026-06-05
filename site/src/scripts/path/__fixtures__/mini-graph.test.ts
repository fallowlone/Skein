// site/src/scripts/path/__fixtures__/mini-graph.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS } from "./mini-graph";

describe("mini-graph fixture", () => {
  it("every concept's requires resolve to known ids", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const c of CONCEPTS) for (const r of c.requires) expect(ids.has(r)).toBe(true);
  });
  it("every concept is taught by at least one unit", () => {
    const taught = new Set(UNITS.flatMap((u) => u.teaches));
    for (const c of CONCEPTS) expect(taught.has(c.id)).toBe(true);
  });
  it("explicit goal targets reference real concepts", () => {
    const ids = new Set(CONCEPTS.map((c) => c.id));
    for (const g of GOALS) for (const t of g.target.concepts ?? []) expect(ids.has(t)).toBe(true);
  });
});
