import type { KnowledgeState } from "./types";

export interface WeakSpot {
  unitId: string;
  score: number;
  struggleFrac: number;
  lapseFrac: number;        // 1 - reviewHealthFrac
  weakConceptCount: number; // goal-frontier concepts this unit teaches that are still below mastery
}

export interface WeakSpotInputs {
  frontier: Set<string>;
  knowledge: KnowledgeState;                 // effective (decayed) knowledge
  masteryThreshold: number;                  // a concept is "known" at/above this confidence
  teachesByUnit: Map<string, string[]>;      // unitId -> concept ids it teaches
  struggleByUnit: Map<string, { struggleFrac: number; doneFrac: number }>;
  healthByUnit: Map<string, number>;         // unitId -> review healthFrac (1 = all healthy)
}

/** Rank units that teach a below-mastery goal-frontier concept AND carry failure evidence
 *  (practice struggle or SRS lapses). Units with no failure signal are left to the normal path. */
export function rankWeakSpots(inp: WeakSpotInputs, opts: { topK?: number } = {}): WeakSpot[] {
  const topK = opts.topK ?? 3;
  const out: WeakSpot[] = [];
  // Consider every unit that has any failure signal.
  const candidateUnits = new Set<string>([...inp.struggleByUnit.keys(), ...inp.healthByUnit.keys()]);
  for (const unitId of candidateUnits) {
    const taught = inp.teachesByUnit.get(unitId) ?? [];
    const weakConcepts = taught.filter(
      (c) => inp.frontier.has(c) && (inp.knowledge.get(c)?.confidence ?? 0) < inp.masteryThreshold,
    );
    if (weakConcepts.length === 0) continue; // off-frontier or already mastered → not a frontier weakness
    const struggleFrac = inp.struggleByUnit.get(unitId)?.struggleFrac ?? 0;
    const lapseFrac = 1 - (inp.healthByUnit.get(unitId) ?? 1);
    if (struggleFrac <= 0 && lapseFrac <= 0) continue; // below mastery but no failure evidence → leave to path
    const score = (struggleFrac + lapseFrac) * weakConcepts.length;
    out.push({ unitId, score, struggleFrac, lapseFrac, weakConceptCount: weakConcepts.length });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, Math.max(0, topK));
}
