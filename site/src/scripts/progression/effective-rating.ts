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

export interface EvidenceProgress {
  proven: number;  // frontier concepts cleared at >= tau confidence
  needed: number;  // minEvidence required to make the study rating go live
  met: boolean;    // proven >= needed
}

/** How close the study rating is to going live: how many frontier concepts are genuinely
 *  cleared vs the minimum required. Lets the UI turn the opaque suppression into an
 *  "X/N concepts proven" progress signal instead of a frozen rating. */
export function evidenceProgress(
  frontier: Set<string>,
  knowledge: KnowledgeState,
  tau = 0.6,
  minEvidence = 5,
): EvidenceProgress {
  let proven = 0;
  for (const id of frontier) {
    const m = knowledge.get(id);
    if (m && m.confidence >= tau) proven++;
  }
  return { proven, needed: minEvidence, met: proven >= minEvidence };
}

/** Suppress the "now Y" surface until enough frontier concepts are genuinely cleared,
 *  so a sparse early signal can't mislead. Boolean view of evidenceProgress — the gate
 *  logic is unchanged. */
export function hasEnoughEvidence(
  frontier: Set<string>,
  knowledge: KnowledgeState,
  tau = 0.6,
  minEvidence = 5,
): boolean {
  return evidenceProgress(frontier, knowledge, tau, minEvidence).met;
}

export interface RatingForecast {
  reached: boolean;            // effective rating already at/above target
  projectedMs: number | null;  // projected date the rating crosses target (path-completion proxy)
  daysAheadBehind: number;     // >0 behind deadline, <0 ahead, 0 on-time/unknown
}

const FORECAST_DAY = 86_400_000;

/** v1: the rating crosses the goal bar when the goal-frontier path completes, which pace()
 *  already projects as projectedFinishMs. Honest because clearing knowledge raises the path's
 *  remaining minutes and pushes that date out; the high-water badge is unaffected. */
export function projectRatingDate(
  effectiveRating: number,
  targetRating: number,
  projectedFinishMs: number | null,
  targetDateMs: number,
): RatingForecast {
  if (effectiveRating >= targetRating) return { reached: true, projectedMs: null, daysAheadBehind: 0 };
  if (projectedFinishMs === null) return { reached: false, projectedMs: null, daysAheadBehind: 0 };
  const daysAheadBehind = Math.round((projectedFinishMs - targetDateMs) / FORECAST_DAY);
  return { reached: false, projectedMs: projectedFinishMs, daysAheadBehind };
}
