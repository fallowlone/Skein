// Pure validator/deduper for intra-track prerequisite edges (harvested from lesson `prereqs`).
// Inverse of cross-track-merge: KEEP track(concept) === track(requires); drop cross-track, unknown
// id, self-loop, duplicate, and spine-dup (an edge already present in the concept's base requires).
// Returns { addEdges, skipped, warnings }. Never throws so the build stays green.
export function mergeIntraTrackEdges(rawEdges, conceptsOut) {
  const warnings = [];
  if (!Array.isArray(rawEdges)) return { addEdges: [], skipped: 1, warnings: ["intra-track-edges: not an array; ignored"] };
  const trackOf = new Map(conceptsOut.map((c) => [c.id, c.track]));
  const baseReq = new Map(conceptsOut.map((c) => [c.id, new Set(c.requires ?? [])]));
  const addEdges = [];
  const seen = new Set();
  let skipped = 0;
  for (const e of rawEdges) {
    if (!e || typeof e.concept !== "string" || typeof e.requires !== "string") {
      skipped++; warnings.push(`intra-track-edges: malformed element ${JSON.stringify(e)}`); continue;
    }
    const tx = trackOf.get(e.concept), ty = trackOf.get(e.requires);
    if (tx === undefined || ty === undefined) { skipped++; warnings.push(`intra-track-edges: unknown id ${e.concept}→${e.requires}`); continue; }
    if (e.concept === e.requires) { skipped++; warnings.push(`intra-track-edges: self-loop ${e.concept}`); continue; }
    if (tx !== ty) { skipped++; warnings.push(`intra-track-edges: cross-track ${e.concept}→${e.requires} (${tx}/${ty})`); continue; }
    if (baseReq.get(e.concept)?.has(e.requires)) { skipped++; continue; } // spine-dup: already a base edge
    const k = `${e.concept}|${e.requires}`;
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    addEdges.push({ concept: e.concept, requires: e.requires });
  }
  return { addEdges, skipped, warnings };
}
