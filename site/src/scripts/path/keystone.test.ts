import { describe, it, expect } from "vitest";
import { buildConceptGraph } from "./graph";
import { conceptReach, rankKeystones, keystoneWorklist } from "./keystone";

// Base graph used by reach + worklist tests: a → b → c → e, a → d
const concepts = [
  { id: "a", label:{en:"",ru:""}, track:"t", band:"surface", requires: [] },
  { id: "b", label:{en:"",ru:""}, track:"t", band:"surface", requires: ["a"] },
  { id: "c", label:{en:"",ru:""}, track:"t", band:"middle",  requires: ["b"] },
  { id: "d", label:{en:"",ru:""}, track:"t", band:"middle",  requires: ["a"] },
  { id: "e", label:{en:"",ru:""}, track:"t", band:"senior",  requires: ["c"] },
] as any;

describe("keystone", () => {
  const g = buildConceptGraph(concepts);

  it("reach counts ancestors + descendants", () => {
    // b: ancestors={a}, descendants={c,e} → reach=3
    expect(conceptReach(g, "b")).toBe(3);
  });

  it("greedy ranks the widest-marginal-coverage candidate first", () => {
    // Graph for this test: a, b(←a), x, c(←b,x), d(←a), e(←c)
    // c closure: {a,b,x,c,e} — x is a unique ancestor not in b's closure
    // b closure: {a,b,c,e}
    // d closure: {a,d}
    // frontier = {a,b,c,d,e,x}
    // c gain=5, b gain=4, d gain=2 → c wins on gain alone, no tie.
    const localConcepts = [
      { id: "a", label:{en:"",ru:""}, track:"t", band:"surface", requires: [] },
      { id: "b", label:{en:"",ru:""}, track:"t", band:"surface", requires: ["a"] },
      { id: "x", label:{en:"",ru:""}, track:"t", band:"surface", requires: [] },
      { id: "c", label:{en:"",ru:""}, track:"t", band:"middle",  requires: ["b","x"] },
      { id: "d", label:{en:"",ru:""}, track:"t", band:"middle",  requires: ["a"] },
      { id: "e", label:{en:"",ru:""}, track:"t", band:"senior",  requires: ["c"] },
    ] as any;
    const lg = buildConceptGraph(localConcepts);
    const frontier = new Set(["a","b","c","d","e","x"]);
    const order = rankKeystones(lg, frontier, ["c","d","b"]);
    expect(order[0]).toBe("c");
  });

  it("worklist excludes already-diagnosable and caps at k", () => {
    const wl = keystoneWorklist(g, new Set(["a","b","c","d","e"]), new Set(["c"]), 2);
    expect(wl.map(r => r.id)).not.toContain("c");
    expect(wl.length).toBeLessThanOrEqual(2);
    expect(wl[0].marginal).toBeGreaterThan(0);
  });

  it("tie-break chooses lexicographically smaller id when gain and reach are equal", () => {
    // Two isolated nodes: equal gain=1, equal reach=0. "alpha" < "beta" wins.
    // Candidates passed in reversed order to prove result is NOT input-order-dependent.
    const tieConcepts = [
      { id: "alpha", label:{en:"",ru:""}, track:"t", band:"surface", requires: [] },
      { id: "beta",  label:{en:"",ru:""}, track:"t", band:"surface", requires: [] },
    ] as any;
    const tg = buildConceptGraph(tieConcepts);
    const order = rankKeystones(tg, new Set(["alpha","beta"]), ["beta","alpha"]);
    expect(order[0]).toBe("alpha");
  });
});
