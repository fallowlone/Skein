import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";
import { masteryOf } from "./knowledge";

const AMBIG_LO = 0.3, AMBIG_HI = 0.7;

// Like nextProbe, but restricted to the `diagnosed` set (only concepts we can objectively test).
// Picks the unknown/ambiguous diagnosable concept whose answer prunes the most graph. Null = calibrated.
export function pickProbe(
  state: KnowledgeState, g: ConceptGraph, frontier: string[], diagnosed: Set<string>, _threshold: number,
): string | null {
  const candidates = new Set<string>();
  for (const f of frontier) { candidates.add(f); for (const a of ancestors(g, f)) candidates.add(a); }
  let best: string | null = null, bestGain = -1;
  for (const id of [...candidates].sort()) {
    if (!diagnosed.has(id)) continue;
    const conf = masteryOf(state, id);
    const ambiguous = !state.has(id) || (conf > AMBIG_LO && conf < AMBIG_HI);
    if (!ambiguous) continue;
    const gain = ancestors(g, id).size + descendants(g, id).size;
    if (gain > bestGain) { bestGain = gain; best = id; }
  }
  return best;
}

// ── objective grading (client-side, no runtime LLM) ──
export interface DiagItem { id: string; type: "mcq" | "blanks"; answer: number | string[]; }
export const gradeMcq = (item: DiagItem, selected: number): boolean => item.answer === selected;
export const gradeBlanks = (item: DiagItem, value: string): boolean =>
  Array.isArray(item.answer) && item.answer.some((a) => String(a).trim().toLowerCase() === value.trim().toLowerCase());
export const fracOf = (results: boolean[]): number => (results.length ? results.filter(Boolean).length / results.length : 0);
