// site/src/scripts/path/diagnostic-select.ts
import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";
import { masteryOf } from "./knowledge";

const AMBIG_LO = 0.3, AMBIG_HI = 0.7;

// A concept is worth probing if its confidence is unknown/ambiguous. Among the
// frontier ∪ their ancestors, pick the one whose answer prunes the most graph
// (|ancestors|+|descendants|). Deterministic tie-break by id.
export function nextProbe(
  state: KnowledgeState, g: ConceptGraph, frontier: string[], _threshold: number,
): string | null {
  const candidates = new Set<string>();
  for (const f of frontier) {
    candidates.add(f);
    for (const a of ancestors(g, f)) candidates.add(a);
  }
  let best: string | null = null;
  let bestGain = -1;
  for (const id of [...candidates].sort()) {
    const conf = masteryOf(state, id);
    const ambiguous = !state.has(id) || (conf > AMBIG_LO && conf < AMBIG_HI);
    if (!ambiguous) continue;
    const gain = ancestors(g, id).size + descendants(g, id).size;
    if (gain > bestGain) { bestGain = gain; best = id; }
  }
  return best;
}
