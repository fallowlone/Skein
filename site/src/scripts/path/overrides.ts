import type { Concept, UnitConcepts } from "./types";
import type { Overrides } from "./graph";
import { buildConceptGraph, validateAcyclic } from "./graph";

export type Edge = { concept: string; requires: string };
const keyOf = (e: Edge) => `${e.concept}|${e.requires}`;

function dedupe(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) { const k = keyOf(e); if (!seen.has(k)) { seen.add(k); out.push(e); } }
  return out;
}

export function mergeOverrides(committed?: Overrides, local?: Overrides): Overrides {
  return {
    addEdges: dedupe([...(committed?.addEdges ?? []), ...(local?.addEdges ?? [])]),
    removeEdges: dedupe([...(committed?.removeEdges ?? []), ...(local?.removeEdges ?? [])]),
    retag: [],
  };
}

// Pre-apply edge add/remove to concept.requires. Lenient: unknown ids are skipped (NOT thrown),
// so a stale exported override never crashes a newer graph (buildConceptGraph's addEdges is strict).
export function applyOverridesToConcepts(concepts: Concept[], ov: Overrides): Concept[] {
  const ids = new Set(concepts.map((c) => c.id));
  const addByConcept = new Map<string, Set<string>>();
  for (const e of ov.addEdges ?? []) {
    if (!ids.has(e.concept) || !ids.has(e.requires) || e.concept === e.requires) continue;
    if (!addByConcept.has(e.concept)) addByConcept.set(e.concept, new Set());
    addByConcept.get(e.concept)!.add(e.requires);
  }
  const removeByConcept = new Map<string, Set<string>>();
  for (const e of ov.removeEdges ?? []) {
    if (!removeByConcept.has(e.concept)) removeByConcept.set(e.concept, new Set());
    removeByConcept.get(e.concept)!.add(e.requires);
  }
  return concepts.map((c) => {
    const rem = removeByConcept.get(c.id);
    const add = addByConcept.get(c.id);
    if (!rem && !add) return c;
    let requires = rem ? c.requires.filter((r) => !rem.has(r)) : [...c.requires];
    if (add) requires = [...new Set([...requires, ...[...add].filter((r) => !(rem?.has(r)))])];
    return { ...c, requires };
  });
}

// Apply committed+local; if the result is cyclic, retry committed-only and flag the drop.
export function safeApply(
  concepts: Concept[],
  committed: Overrides,
  local: Overrides,
): { concepts: Concept[]; droppedLocal: boolean } {
  const withLocal = applyOverridesToConcepts(concepts, mergeOverrides(committed, local));
  if (validateAcyclic(buildConceptGraph(withLocal)).ok) return { concepts: withLocal, droppedLocal: false };
  const committedOnly = applyOverridesToConcepts(concepts, mergeOverrides(committed, undefined));
  return { concepts: committedOnly, droppedLocal: true };
}

// The removeEdges set that frees a unit's taught concepts from their prereqs (so the unit floats earlier).
export function loosenUnitEdges(unit: string, units: UnitConcepts[], concepts: Concept[]): Edge[] {
  const u = units.find((x) => x.unit === unit);
  if (!u) return [];
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const out: Edge[] = [];
  for (const taught of u.teaches) {
    const c = byId.get(taught);
    if (!c) continue;
    for (const r of c.requires) out.push({ concept: taught, requires: r });
  }
  return dedupe(out);
}
