// Shared Kahn acyclicity check over base concept.requires + a set of override addEdges.
// Returns { ok, unplaced } where unplaced is the count of nodes left in a cycle (0 ⇒ acyclic).
// Used by build-overrides.mjs and build-path-data.mjs to gate the merged override set before
// writing concept-overrides.json. Kept behaviourally equivalent to the TS lint rule's cycleNodes
// (src/lint/rules/path.ts).
export function isAcyclicWithEdges(concepts, addEdges) {
  const req = new Map(concepts.map((c) => [c.id, [...(c.requires ?? [])]]));
  for (const e of addEdges) { const a = req.get(e.concept); if (a && !a.includes(e.requires)) a.push(e.requires); }
  const ids = new Set(req.keys());
  const indeg = new Map([...ids].map((id) => [id, 0]));
  const deps = new Map();
  for (const id of ids) for (const r of req.get(id)) {
    if (!ids.has(r)) continue;
    indeg.set(id, indeg.get(id) + 1);
    if (!deps.has(r)) deps.set(r, []);
    deps.get(r).push(id);
  }
  const q = [...ids].filter((id) => indeg.get(id) === 0);
  let placed = 0;
  while (q.length) {
    const id = q.shift(); placed++;
    for (const d of deps.get(id) ?? []) { indeg.set(d, indeg.get(d) - 1); if (indeg.get(d) === 0) q.push(d); }
  }
  return { ok: placed === ids.size, unplaced: ids.size - placed };
}
