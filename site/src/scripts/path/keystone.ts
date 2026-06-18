import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

function closureSet(g: ConceptGraph, id: string): Set<string> {
  const s = new Set<string>([id]);
  for (const a of ancestors(g, id)) s.add(a);
  for (const d of descendants(g, id)) s.add(d);
  return s;
}

export function conceptReach(g: ConceptGraph, id: string): number {
  return ancestors(g, id).size + descendants(g, id).size;
}

export function rankKeystones(
  g: ConceptGraph,
  frontier: Set<string>,
  candidates: string[],
): string[] {
  const covered = new Set<string>();
  const pool = [...candidates];
  const out: string[] = [];
  while (pool.length) {
    let bestIdx = 0, bestGain = -1, bestReach = -1;
    for (let i = 0; i < pool.length; i++) {
      const id = pool[i];
      const cl = closureSet(g, id);
      let gain = 0;
      for (const x of cl) if (frontier.has(x) && !covered.has(x)) gain++;
      const reach = cl.size;
      if (
        gain > bestGain ||
        (gain === bestGain && reach > bestReach) ||
        (gain === bestGain && reach === bestReach && id < pool[bestIdx])
      ) {
        bestIdx = i; bestGain = gain; bestReach = reach;
      }
    }
    const best = pool[bestIdx];
    out.push(best);
    for (const x of closureSet(g, best)) if (frontier.has(x)) covered.add(x);
    pool.splice(bestIdx, 1);
  }
  return out;
}

export function keystoneWorklist(
  g: ConceptGraph,
  frontier: Set<string>,
  diagnosable: Set<string>,
  k: number,
): { id: string; marginal: number }[] {
  const cand = new Set<string>();
  for (const f of frontier) for (const x of closureSet(g, f)) if (!diagnosable.has(x)) cand.add(x);
  const ordered = rankKeystones(g, frontier, [...cand]);
  const covered = new Set<string>();
  const rows: { id: string; marginal: number }[] = [];
  for (const id of ordered) {
    let m = 0;
    for (const x of closureSet(g, id)) if (frontier.has(x) && !covered.has(x)) m++;
    if (m <= 0) continue;
    for (const x of closureSet(g, id)) if (frontier.has(x)) covered.add(x);
    rows.push({ id, marginal: m });
    if (rows.length >= k) break;
  }
  return rows;
}
