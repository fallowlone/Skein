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

/** Blend study into placement: placement is a FLOOR, study only adds on top (max).
 *  EMA damps single-session jitter. */
export function blendRating(
  placementRating: number,
  prevStudyEma: number | undefined,
  studyRatingRaw: number,
  alpha = 0.3,
): { ema: number; effective: number } {
  const ema = prevStudyEma === undefined
    ? studyRatingRaw
    : Math.round(alpha * studyRatingRaw + (1 - alpha) * prevStudyEma);
  return { ema, effective: Math.max(placementRating, ema) };
}

/** Visible rank uses the high-water mark — earned rank is never taken away. */
export function highWater(prevPeak: number | undefined, effective: number): number {
  return Math.max(prevPeak ?? 0, effective);
}

/** Goal → rating bar, anchored on the rank ladder's market annotations:
 *  apprentice-1=125 (junior baseline), engineer-1=450 (junior ceiling / entry-middle),
 *  engineer-2=500 (middle interviews), senior-engineer-1=600 (the senior bar). Tunable in P2. */
const GOAL_BAR: Record<string, number> = {
  "senior-fullstack": 600,
  "ai-engineer": 600,
  "interview-prep": 600,
  "job-ready-junior": 450,
};
export function barRatingForGoal(goalId: string): number {
  return GOAL_BAR[goalId] ?? 600;
}

/** Suppress the "now Y" surface until enough frontier concepts are genuinely cleared,
 *  so a sparse early signal can't mislead. */
export function hasEnoughEvidence(
  frontier: Set<string>,
  knowledge: KnowledgeState,
  tau = 0.6,
  minEvidence = 5,
): boolean {
  let n = 0;
  for (const id of frontier) {
    const m = knowledge.get(id);
    if (m && m.confidence >= tau) n++;
  }
  return n >= minEvidence;
}
