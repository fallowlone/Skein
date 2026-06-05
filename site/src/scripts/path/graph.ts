// site/src/scripts/path/graph.ts
import type { Concept, UnitConcepts } from "./types";

export interface ConceptGraph {
  nodes: Map<string, Concept>;
  requires: Map<string, string[]>;   // id -> direct prereq ids
  requiredBy: Map<string, string[]>; // id -> direct dependents
}

export interface Overrides {
  addEdges?: { concept: string; requires: string }[];
  removeEdges?: { concept: string; requires: string }[];
  retag?: { unit: string; teaches?: string[]; requires?: string[] }[];
}

export function buildConceptGraph(concepts: Concept[], overrides?: Overrides): ConceptGraph {
  const nodes = new Map<string, Concept>();
  const requires = new Map<string, string[]>();
  for (const c of concepts) {
    nodes.set(c.id, c);
    requires.set(c.id, [...c.requires]);
  }
  for (const e of overrides?.addEdges ?? []) {
    const arr = requires.get(e.concept) ?? [];
    if (!arr.includes(e.requires)) arr.push(e.requires);
    requires.set(e.concept, arr);
  }
  for (const e of overrides?.removeEdges ?? []) {
    requires.set(e.concept, (requires.get(e.concept) ?? []).filter((r) => r !== e.requires));
  }
  const requiredBy = new Map<string, string[]>();
  for (const [id, reqs] of requires) {
    for (const r of reqs) {
      const arr = requiredBy.get(r) ?? [];
      arr.push(id);
      requiredBy.set(r, arr);
    }
  }
  return { nodes, requires, requiredBy };
}

// Kahn's algorithm; ids processed in sorted order for deterministic output.
export function topoSort(g: ConceptGraph): string[] {
  const indeg = new Map<string, number>();
  for (const id of g.nodes.keys()) indeg.set(id, (g.requires.get(id) ?? []).length);
  const ready = [...indeg].filter(([, d]) => d === 0).map(([id]) => id).sort();
  const out: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    out.push(id);
    for (const dep of (g.requiredBy.get(id) ?? []).slice().sort()) {
      const d = (indeg.get(dep) ?? 0) - 1;
      indeg.set(dep, d);
      if (d === 0) { ready.push(dep); ready.sort(); }
    }
  }
  return out;
}

export function validateAcyclic(g: ConceptGraph): { ok: boolean; cycle?: string[] } {
  const order = topoSort(g);
  if (order.length === g.nodes.size) return { ok: true };
  const placed = new Set(order);
  return { ok: false, cycle: [...g.nodes.keys()].filter((id) => !placed.has(id)) };
}

function closure(start: string, adj: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(adj.get(start) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of adj.get(id) ?? []) stack.push(n);
  }
  return seen;
}

export const ancestors = (g: ConceptGraph, id: string): Set<string> => closure(id, g.requires);
export const descendants = (g: ConceptGraph, id: string): Set<string> => closure(id, g.requiredBy);

// Unit A is a prereq of unit U iff A teaches a concept U directly requires.
export function induceUnitGraph(units: UnitConcepts[], _g: ConceptGraph): Map<string, string[]> {
  const teacherOf = new Map<string, string[]>(); // concept -> units teaching it
  for (const u of units) for (const c of u.teaches) {
    const arr = teacherOf.get(c) ?? [];
    arr.push(u.unit);
    teacherOf.set(c, arr);
  }
  const out = new Map<string, string[]>();
  for (const u of units) {
    const prereqUnits = new Set<string>();
    for (const c of u.requires) for (const t of teacherOf.get(c) ?? []) if (t !== u.unit) prereqUnits.add(t);
    out.set(u.unit, [...prereqUnits].sort());
  }
  return out;
}
