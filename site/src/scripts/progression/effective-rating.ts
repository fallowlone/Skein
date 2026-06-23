import type { KnowledgeState } from "~/scripts/path/types";

/** Coverage of the goal frontier mapped onto the 0–1000 rating scale.
 *  coverage = mean clamped confidence over the frontier; missing concepts ⇒ 0.
 *  Full coverage ≈ the goal's bar rating; a higher-bar goal raises the ceiling. */
export function studyRating(
  frontier: Set<string>,
  knowledge: KnowledgeState,
  barRating: number,
  floorRating = 0,
): number {
  if (frontier.size === 0) return floorRating;
  let sum = 0;
  for (const id of frontier) {
    const m = knowledge.get(id);
    sum += m ? Math.max(0, Math.min(1, m.confidence)) : 0;
  }
  const coverage = sum / frontier.size;
  return Math.round(floorRating + (barRating - floorRating) * coverage);
}
