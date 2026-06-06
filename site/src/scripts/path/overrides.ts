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

// Module-level shape guard (mirrors the local one inside applyOverridesToConcepts; kept separate
// so the working P3-B function is untouched).
const isEdgeShape = (e: unknown): e is Edge =>
  !!e && typeof (e as Edge).concept === "string" && typeof (e as Edge).requires === "string";

// The add-edges actually applied to the concept graph, mirroring safeApply's drop logic:
// committed+local merged minus removeEdges; committed-only when local was dropped for a cycle.
function effectiveAddEdges(committed: Overrides | undefined, local: Overrides | undefined, droppedLocal: boolean): Edge[] {
  const merged = droppedLocal ? mergeOverrides(committed, undefined) : mergeOverrides(committed, local);
  const removed = new Set((merged.removeEdges ?? []).filter(isEdgeShape).map(keyOf));
  return (merged.addEdges ?? []).filter(isEdgeShape).filter((e) => !removed.has(keyOf(e)));
}

// For each effective addEdge X→Y with track(X) !== track(Y), add Y to the requires of every unit
// teaching X (skip if the unit already teaches/requires Y). This is what makes a cross-track concept
// prereq reorder units, since induceUnitGraph reads unit.requires (not concept.requires).
function deriveUnitRequires(units: UnitConcepts[], concepts: Concept[], adds: Edge[]): UnitConcepts[] {
  if (!adds.length) return units;
  const trackOf = new Map(concepts.map((c) => [c.id, c.track]));
  const reqByConcept = new Map<string, Set<string>>();
  for (const e of adds) {
    const tx = trackOf.get(e.concept), ty = trackOf.get(e.requires);
    if (tx === undefined || ty === undefined || tx === ty) continue; // unknown id or intra-track
    if (!reqByConcept.has(e.concept)) reqByConcept.set(e.concept, new Set());
    reqByConcept.get(e.concept)!.add(e.requires);
  }
  if (!reqByConcept.size) return units;
  return units.map((u) => {
    const extra = new Set<string>();
    for (const t of u.teaches) for (const y of reqByConcept.get(t) ?? []) {
      if (!u.teaches.includes(y) && !u.requires.includes(y)) extra.add(y);
    }
    return extra.size ? { ...u, requires: [...u.requires, ...extra] } : u;
  });
}

// Apply overrides to BOTH layers: effective concepts (content-pull + mastery, via safeApply) AND
// augmented unit.requires (hard cross-track ordering). Single source of truth for what was applied.
export function applyOverridesFull(
  concepts: Concept[], units: UnitConcepts[], committed: Overrides, local: Overrides,
): { concepts: Concept[]; units: UnitConcepts[]; droppedLocal: boolean } {
  const { concepts: eff, droppedLocal } = safeApply(concepts, committed, local);
  const adds = effectiveAddEdges(committed, local, droppedLocal);
  return { concepts: eff, units: deriveUnitRequires(units, concepts, adds), droppedLocal };
}
