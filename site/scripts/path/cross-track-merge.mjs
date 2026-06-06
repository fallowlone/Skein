// Pure validator/deduper for curated cross-track prerequisite edges.
// Returns { addEdges, skipped, warnings }. Never throws: unknown id / self-loop / intra-track /
// duplicate / malformed → counted in `skipped` (with a warning), so the build stays green.
export function mergeCrossTrackEdges(rawEdges, conceptsOut) {
  const warnings = [];
  if (!Array.isArray(rawEdges)) return { addEdges: [], skipped: 0, warnings: ["cross-track-edges: not an array; ignored"] };
  const trackOf = new Map(conceptsOut.map((c) => [c.id, c.track]));
  const addEdges = [];
  const seen = new Set();
  let skipped = 0;
  for (const e of rawEdges) {
    if (!e || typeof e.concept !== "string" || typeof e.requires !== "string") {
      skipped++; warnings.push(`cross-track-edges: malformed element ${JSON.stringify(e)}`); continue;
    }
    const tx = trackOf.get(e.concept), ty = trackOf.get(e.requires);
    if (tx === undefined || ty === undefined) { skipped++; warnings.push(`cross-track-edges: unknown id ${e.concept}→${e.requires}`); continue; }
    if (e.concept === e.requires) { skipped++; warnings.push(`cross-track-edges: self-loop ${e.concept}`); continue; }
    if (tx === ty) { skipped++; warnings.push(`cross-track-edges: intra-track ${e.concept}→${e.requires} (${tx})`); continue; }
    const k = `${e.concept}|${e.requires}`;
    if (seen.has(k)) { skipped++; continue; }
    seen.add(k);
    addEdges.push({ concept: e.concept, requires: e.requires });
  }
  return { addEdges, skipped, warnings };
}
