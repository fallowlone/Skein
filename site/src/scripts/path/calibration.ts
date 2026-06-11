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

// Time-boxed stratified placement: for each domain family, up to `perFamily` diagnosable probes —
// unsettled concepts (never touched, or in the ambiguous band) ranked by closure gain, preferring
// the middle band first (the junior/middle boundary carries the most information), then surface,
// then advanced. The caller re-plans between families so propagation from earlier answers prunes
// later probes; `exclude` carries the session's already-served concepts.
const PLACEMENT_BAND_PREF: Record<string, number> = { middle: 0, surface: 1, advanced: 2, foundations: 3 };

export function placementPlan(
  state: KnowledgeState, g: ConceptGraph, diagnosed: Set<string>,
  familyTracks: { key: string; tracks: string[] }[], perFamily: number, exclude: Set<string>,
): { family: string; concepts: string[] }[] {
  const out: { family: string; concepts: string[] }[] = [];
  for (const fam of familyTracks) {
    const tracks = new Set(fam.tracks);
    const picks = [...diagnosed]
      .filter((id) => {
        if (exclude.has(id)) return false;
        const node = g.nodes.get(id);
        if (!node || !tracks.has(node.track)) return false;
        const conf = masteryOf(state, id);
        return !state.has(id) || (conf > AMBIG_LO && conf < AMBIG_HI);
      })
      .sort((a, b) => {
        const na = g.nodes.get(a)!, nb = g.nodes.get(b)!;
        const pref = (PLACEMENT_BAND_PREF[na.band] ?? 9) - (PLACEMENT_BAND_PREF[nb.band] ?? 9);
        if (pref) return pref;
        const gain = (id: string) => ancestors(g, id).size + descendants(g, id).size;
        return gain(b) - gain(a) || a.localeCompare(b);
      })
      .slice(0, perFamily);
    if (picks.length) out.push({ family: fam.key, concepts: picks });
  }
  return out;
}
