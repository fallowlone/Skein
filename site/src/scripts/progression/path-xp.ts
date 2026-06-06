import type { KnowledgeState, UnitConcepts } from "~/scripts/path/types";
import { isKnown } from "~/scripts/path/knowledge";

export const PATH_STEP_BONUS = 20;

// A path step (unit) is "complete" when every concept it teaches is known at the threshold.
// Units that teach nothing never count. Pure — no I/O.
export function completedStepCount(knowledge: KnowledgeState, units: UnitConcepts[], threshold: number): number {
  let n = 0;
  for (const u of units) {
    if (!u.teaches.length) continue;
    if (u.teaches.every((c) => isKnown(knowledge, c, threshold))) n++;
  }
  return n;
}

export function pathStepBonusXp(knowledge: KnowledgeState, units: UnitConcepts[], threshold: number): number {
  return completedStepCount(knowledge, units, threshold) * PATH_STEP_BONUS;
}
