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
  // Element-shape guard: tampered localStorage / a malformed-but-version-valid import could carry
  // junk elements (null, strings). Skip anything that isn't a {concept, requires} string pair so a
  // bad override never crashes the path. This is the single lenient trust boundary.
  const isEdge = (e: unknown): e is Edge =>
    !!e && typeof (e as Edge).concept === "string" && typeof (e as Edge).requires === "string";
  const addByConcept = new Map<string, Set<string>>();
  for (const e of ov.addEdges ?? []) {
    if (!isEdge(e) || !ids.has(e.concept) || !ids.has(e.requires) || e.concept === e.requires) continue;
    if (!addByConcept.has(e.concept)) addByConcept.set(e.concept, new Set());
    addByConcept.get(e.concept)!.add(e.requires);
  }
  const removeByConcept = new Map<string, Set<string>>();
  for (const e of ov.removeEdges ?? []) {
    if (!isEdge(e)) continue;
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
  // Fast path: no override edges at all → no graph rebuild (the common case; building +
  // validating the full concept graph is ~40ms, and computePath runs on every island render).
  const empty = (o?: Overrides) => !(o?.addEdges?.length) && !(o?.removeEdges?.length);
  if (empty(committed) && empty(local)) return { concepts, droppedLocal: false };
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
