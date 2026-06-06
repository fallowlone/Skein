import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS } from "./__fixtures__/mini-graph";
import { mergeOverrides, applyOverridesToConcepts, safeApply, loosenUnitEdges, applyOverridesFull } from "./overrides";
import { buildConceptGraph, validateAcyclic, ancestors, induceUnitGraph } from "./graph";
import type { UnitConcepts } from "./types";

const byId = (cs = CONCEPTS) => new Map(cs.map((c) => [c.id, c]));

describe("overrides", () => {
  it("applyOverridesToConcepts removes an edge", () => {
    const out = applyOverridesToConcepts(CONCEPTS, { removeEdges: [{ concept: "tcp-handshake", requires: "ip-addressing" }] });
    expect(byId(out).get("tcp-handshake")!.requires).not.toContain("ip-addressing");
    expect(byId(out).get("tcp-handshake")!.requires).toContain("ports-sockets");
  });

  it("applyOverridesToConcepts adds an edge", () => {
    const out = applyOverridesToConcepts(CONCEPTS, { addEdges: [{ concept: "indexing", requires: "ip-addressing" }] });
    expect(byId(out).get("indexing")!.requires).toContain("ip-addressing");
  });

  it("skips unknown ids instead of throwing", () => {
    expect(() => applyOverridesToConcepts(CONCEPTS, { addEdges: [{ concept: "ghost", requires: "nope" }] })).not.toThrow();
    const out = applyOverridesToConcepts(CONCEPTS, { addEdges: [{ concept: "indexing", requires: "ghost" }] });
    expect(byId(out).get("indexing")!.requires).not.toContain("ghost");
  });

  it("mergeOverrides concatenates + dedupes", () => {
    const m = mergeOverrides(
      { removeEdges: [{ concept: "a", requires: "b" }] },
      { removeEdges: [{ concept: "a", requires: "b" }, { concept: "c", requires: "d" }] },
    );
    expect(m.removeEdges).toEqual([{ concept: "a", requires: "b" }, { concept: "c", requires: "d" }]);
  });

  it("safeApply falls back to committed-only when local introduces a cycle", () => {
    const local = { addEdges: [{ concept: "mvcc", requires: "consensus" }] };
    const res = safeApply(CONCEPTS, {}, local);
    expect(res.droppedLocal).toBe(true);
    expect(validateAcyclic(buildConceptGraph(res.concepts)).ok).toBe(true);
    expect(new Map(res.concepts.map((c) => [c.id, c])).get("mvcc")!.requires).not.toContain("consensus");
  });

  it("safeApply keeps local when acyclic", () => {
    const local = { removeEdges: [{ concept: "tls", requires: "tcp-handshake" }] };
    const res = safeApply(CONCEPTS, {}, local);
    expect(res.droppedLocal).toBe(false);
    expect(ancestors(buildConceptGraph(res.concepts), "tls").has("tcp-handshake")).toBe(false);
  });

  it("loosenUnitEdges returns removeEdges for a unit's taught concepts' prereqs", () => {
    const edges = loosenUnitEdges("networking/02-tcp", UNITS, CONCEPTS);
    expect(edges).toEqual(expect.arrayContaining([
      { concept: "tcp-handshake", requires: "ip-addressing" },
      { concept: "tcp-handshake", requires: "ports-sockets" },
    ]));
  });

  it("tolerates junk elements (null / non-edge) without throwing", () => {
    const bad = { removeEdges: [null, { concept: "tcp-handshake", requires: "ip-addressing" }, "x", { concept: 5 }] } as any;
    expect(() => applyOverridesToConcepts(CONCEPTS, bad)).not.toThrow();
    const out = applyOverridesToConcepts(CONCEPTS, bad);
    expect(byId(out).get("tcp-handshake")!.requires).not.toContain("ip-addressing"); // the one valid edge still applies
  });
});

describe("applyOverridesFull", () => {
  const uById = (us: UnitConcepts[]) => new Map(us.map((u) => [u.unit, u]));

  it("a cross-track addEdge adds the prereq to the consumer unit's requires", () => {
    // indexing (databases) requires tcp-handshake (networking); indexing is taught by databases/02-index
    const res = applyOverridesFull(CONCEPTS, UNITS, { addEdges: [{ concept: "indexing", requires: "tcp-handshake" }] }, {});
    expect(uById(res.units).get("databases/02-index")!.requires).toContain("tcp-handshake");
    expect(res.droppedLocal).toBe(false);
  });

  it("an intra-track addEdge does NOT add a unit-requires supplement", () => {
    // tls (networking) requires ip-addressing (networking) — same track → no ordering supplement
    const res = applyOverridesFull(CONCEPTS, UNITS, { addEdges: [{ concept: "tls", requires: "ip-addressing" }] }, {});
    expect(uById(res.units).get("networking/03-tls")!.requires).not.toContain("ip-addressing");
  });

  it("a removeEdge cancels the cross-track supplement for that pair", () => {
    const res = applyOverridesFull(
      CONCEPTS, UNITS,
      { addEdges: [{ concept: "indexing", requires: "tcp-handshake" }] },
      { removeEdges: [{ concept: "indexing", requires: "tcp-handshake" }] },
    );
    expect(uById(res.units).get("databases/02-index")!.requires).not.toContain("tcp-handshake");
  });

  it("when local introduces a cycle, supplements mirror committed-only", () => {
    const res = applyOverridesFull(
      CONCEPTS, UNITS,
      { addEdges: [{ concept: "indexing", requires: "tcp-handshake" }] }, // committed cross-track (valid)
      { addEdges: [{ concept: "mvcc", requires: "consensus" }] },          // local → concept cycle, dropped
    );
    expect(res.droppedLocal).toBe(true);
    expect(uById(res.units).get("databases/02-index")!.requires).toContain("tcp-handshake"); // committed kept
    expect(uById(res.units).get("databases/03-mvcc")!.requires).not.toContain("consensus");  // dropped → no supplement
  });

  it("induceUnitGraph then orders the prereq unit before the consumer", () => {
    const res = applyOverridesFull(CONCEPTS, UNITS, { addEdges: [{ concept: "indexing", requires: "tcp-handshake" }] }, {});
    const g = induceUnitGraph(res.units, buildConceptGraph(res.concepts));
    expect(g.get("databases/02-index")).toContain("networking/02-tcp");
  });

  it("ignores unknown-id edges (no throw, no supplement)", () => {
    const res = applyOverridesFull(CONCEPTS, UNITS, { addEdges: [{ concept: "ghost", requires: "tcp-handshake" }] }, {});
    expect(res.units).toBe(UNITS); // fast path returns the same array reference
  });

  it("only the qualifying taught concept triggers the supplement on a multi-teaches unit", () => {
    // networking/01-ip teaches ["ip-addressing", "ports-sockets"]; add a cross-track prereq for
    // ip-addressing only (→ relational-model, databases). ports-sockets gets nothing.
    const res = applyOverridesFull(CONCEPTS, UNITS, { addEdges: [{ concept: "ip-addressing", requires: "relational-model" }] }, {});
    const u = uById(res.units).get("networking/01-ip")!;
    expect(u.requires).toContain("relational-model");
    expect(u.requires.filter((r) => r !== "relational-model")).toEqual([]); // only the one new edge added
  });
});
