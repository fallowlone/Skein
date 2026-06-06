// Create SRS cards for the in-bank "new" lemmas a BYO source surfaced. Each id is graded once with
// the "again" grade (the same one ReviewSession's "Again" button passes) so it enters the deck
// scheduled for near-term review. The core takes an injected grader so it's testable without the
// real signal; the live wrapper binds `gradeWord`.
import { gradeWord } from "../state";
import type { Grade } from "../scheduler/types";

const AGAIN: Grade = "again";

export function addByoCards(ids: string[], grade: (id: string) => void): number {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    grade(id);
  }
  return seen.size;
}

// Live wrapper.
export function commitByoCards(ids: string[], now: number): number {
  return addByoCards(ids, (id) => gradeWord(id, AGAIN, now));
}
