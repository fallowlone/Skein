// The set of items /assess may ask, after contamination control (spec §5.2). Pure:
// the caller supplies the learner's practice progress, this file never reads storage.
import type { TaskStatus } from "~/scripts/practice-state";
import type { AssessItem, Facet } from "./types";

export type AssessIndex = Record<string, Omit<AssessItem, "id">>;

/** A task the learner merely opened is weaker evidence, but still evidence. */
export const BURN_WEIGHT: Record<TaskStatus, number | null> = {
  done: null,      // burned: excluded entirely
  attempted: 0.5,
  seen: 0.5,
};

export function buildPool(
  index: AssessIndex,
  progressOf: (lessonKey: string) => Record<string, TaskStatus>,
): AssessItem[] {
  const out: AssessItem[] = [];
  for (const [id, raw] of Object.entries(index)) {
    const status = progressOf(raw.lessonKey)[raw.taskId];
    const discount = status ? BURN_WEIGHT[status] : 1;
    if (discount === null) continue;
    out.push({ ...raw, id, weight: raw.weight * discount });
  }
  return out;
}

export function itemsFor(pool: readonly AssessItem[], conceptId: string, facet: Facet): AssessItem[] {
  return pool.filter((i) => i.facet === facet && i.concepts.includes(conceptId));
}
