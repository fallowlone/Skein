import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors } from "./graph";
import type { StruggleFractions } from "./practice-signal";

export interface WeakSpot {
  unitId: string;
  score: number;
  struggleFrac: number;
  lapseFrac: number;        // 1 - reviewHealthFrac
  weakConceptCount: number; // remediation-scope concepts this unit teaches that are still below mastery
  conceptId?: string;       // exact concept when explicit task evidence identifies one
  conceptStruggleFrac: number;
}

export interface WeakSpotInputs {
  frontier: Set<string>;
  knowledge: KnowledgeState;                 // effective (decayed) knowledge
  masteryThreshold: number;                  // a concept is "known" at/above this confidence
  teachesByUnit: Map<string, string[]>;      // unitId -> concept ids it teaches
  struggleByUnit: Map<string, StruggleFractions>;
  struggleByConcept: Map<string, StruggleFractions>;
  healthByUnit: Map<string, number>;         // unitId -> review healthFrac (1 = all healthy)
}

/** Goal targets plus every prerequisite they depend on. Remediation uses this closure while
 * readiness/rating can keep using the narrower goal frontier. */
export function remediationScope(frontier: Iterable<string>, graph: ConceptGraph): Set<string> {
  const out = new Set(frontier);
  for (const id of [...out]) for (const prereq of ancestors(graph, id)) out.add(prereq);
  return out;
}

/** Rank units that teach a below-mastery remediation-scope concept AND carry failure evidence
 *  (practice struggle or SRS lapses). Units with no failure signal are left to the normal path. */
export function rankWeakSpots(inp: WeakSpotInputs, opts: { topK?: number } = {}): WeakSpot[] {
  const topK = opts.topK ?? 3;
  const out: WeakSpot[] = [];
  // Consider every unit that has any failure signal.
  const candidateUnits = new Set<string>([...inp.struggleByUnit.keys(), ...inp.healthByUnit.keys()]);
  for (const [unitId, taught] of inp.teachesByUnit) {
    if (taught.some((c) => (inp.struggleByConcept.get(c)?.struggleFrac ?? 0) > 0)) candidateUnits.add(unitId);
  }
  for (const unitId of candidateUnits) {
    const taught = inp.teachesByUnit.get(unitId) ?? [];
    const weakConcepts = taught.filter(
      (c) => inp.frontier.has(c) && (inp.knowledge.get(c)?.confidence ?? 0) < inp.masteryThreshold,
    );
    if (weakConcepts.length === 0) continue; // off-frontier or already mastered → not a frontier weakness
    const struggleFrac = inp.struggleByUnit.get(unitId)?.struggleFrac ?? 0;
    const precise = weakConcepts
      .map((conceptId) => ({ conceptId, struggleFrac: inp.struggleByConcept.get(conceptId)?.struggleFrac ?? 0 }))
      .filter((x) => x.struggleFrac > 0)
      .sort((a, b) => b.struggleFrac - a.struggleFrac || a.conceptId.localeCompare(b.conceptId));
    const conceptStruggleFrac = precise[0]?.struggleFrac ?? 0;
    const lapseFrac = 1 - (inp.healthByUnit.get(unitId) ?? 1);
    if (struggleFrac <= 0 && conceptStruggleFrac <= 0 && lapseFrac <= 0) continue; // below mastery but no failure evidence → leave to path
    const score = (struggleFrac + lapseFrac) * weakConcepts.length + conceptStruggleFrac;
    out.push({
      unitId,
      score,
      struggleFrac,
      lapseFrac,
      weakConceptCount: weakConcepts.length,
      conceptId: precise[0]?.conceptId,
      conceptStruggleFrac,
    });
  }
  out.sort((a, b) => b.score - a.score);
  const seenConcepts = new Set<string>();
  return out.filter((spot) => {
    if (!spot.conceptId) return true;
    if (seenConcepts.has(spot.conceptId)) return false;
    seenConcepts.add(spot.conceptId);
    return true;
  }).slice(0, Math.max(0, topK));
}
