import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS } from "./__fixtures__/mini-graph";
import { mergeOverrides, applyOverridesToConcepts, safeApply, loosenUnitEdges } from "./overrides";
import { buildConceptGraph, validateAcyclic, ancestors } from "./graph";

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
});
