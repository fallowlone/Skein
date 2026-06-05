// site/src/scripts/path/graph.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS } from "./__fixtures__/mini-graph";
import { buildConceptGraph, validateAcyclic, topoSort, ancestors, descendants, induceUnitGraph } from "./graph";

describe("graph", () => {
  const g = buildConceptGraph(CONCEPTS);

  it("validateAcyclic passes for the fixture", () => {
    expect(validateAcyclic(g).ok).toBe(true);
  });

  it("detects a cycle", () => {
    const cyclic = buildConceptGraph([
      { id: "a", label: { en: "a", ru: "a" }, track: "networking", band: "middle", requires: ["b"] },
      { id: "b", label: { en: "b", ru: "b" }, track: "networking", band: "middle", requires: ["a"] },
    ]);
    expect(validateAcyclic(cyclic).ok).toBe(false);
  });

  it("topoSort places prereqs before dependents", () => {
    const order = topoSort(g);
    const idx = (id: string) => order.indexOf(id);
    expect(idx("ip-addressing")).toBeLessThan(idx("tcp-handshake"));
    expect(idx("tcp-handshake")).toBeLessThan(idx("replication"));
    expect(idx("indexing")).toBeLessThan(idx("mvcc"));
    expect(idx("mvcc")).toBeLessThan(idx("replication")); // cross-track
  });

  it("ancestors returns transitive prereqs", () => {
    expect(ancestors(g, "replication")).toEqual(
      new Set(["mvcc", "tcp-handshake", "indexing", "relational-model", "ip-addressing", "ports-sockets"]),
    );
  });

  it("descendants returns transitive dependents", () => {
    expect(descendants(g, "tcp-handshake")).toEqual(new Set(["tls", "replication", "consensus"]));
  });

  it("applies addEdges / removeEdges overrides", () => {
    const g2 = buildConceptGraph(CONCEPTS, { removeEdges: [{ concept: "tls", requires: "tcp-handshake" }] });
    expect(ancestors(g2, "tls").has("tcp-handshake")).toBe(false);
    const g3 = buildConceptGraph(CONCEPTS, { addEdges: [{ concept: "indexing", requires: "ip-addressing" }] });
    expect(ancestors(g3, "indexing").has("ip-addressing")).toBe(true);
  });

  it("throws on an override referencing an unknown concept id", () => {
    expect(() => buildConceptGraph(CONCEPTS, { addEdges: [{ concept: "nope", requires: "tcp-handshake" }] })).toThrow();
    expect(() => buildConceptGraph(CONCEPTS, { addEdges: [{ concept: "tls", requires: "nope" }] })).toThrow();
  });

  it("induceUnitGraph links units that teach a required concept", () => {
    const ug = induceUnitGraph(UNITS, g);
    expect(ug.get("networking/02-tcp")).toEqual(["networking/01-ip"]);
    expect(new Set(ug.get("distributed/01-repl"))).toEqual(new Set(["databases/03-mvcc", "networking/02-tcp"]));
  });
});
