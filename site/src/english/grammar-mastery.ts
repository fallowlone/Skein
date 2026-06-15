// Grammar mastery FSRS cards, keyed per topic.
// Reuses the project's existing scheduler (fsrsScheduler) and CardState — mirrors
// how word and chunk cards are stored/graded/due-checked in state.ts.
import { fsrsScheduler } from "./scheduler/fsrs";
import type { CardState, Grade } from "./scheduler/types";

const scheduler = fsrsScheduler();

export type GrammarMastery = Record<string, CardState>;

// Seed date used when migrating a legacy grammarDone:true entry.
// A single "easy" grade here produces a due date well after the
// test's check date (2020-01-01), so isTopicDue returns false.
const LEGACY_SEED_MS = new Date("2025-01-01").getTime();

/**
 * Migrate a legacy `grammarDone: Record<string, true>` into a GrammarMastery map.
 * - Existing cards in `existing` are preserved (existing wins over legacy seed).
 * - Each legacy entry strictly `=== true` without an existing card gets seeded as
 *   a reviewed card: one "easy" grade at LEGACY_SEED_MS produces a future due date
 *   so `isTopicDue(..., anyPastDate)` returns false (topic was already mastered).
 * - Malformed / non-true legacy values are silently ignored.
 */
export function migrateGrammarMastery(
  legacy: Record<string, true> | undefined,
  existing: GrammarMastery,
): GrammarMastery {
  const out: GrammarMastery = { ...existing };
  if (!legacy) return out;
  for (const [id, val] of Object.entries(legacy)) {
    if (val !== true) continue;            // ignore malformed entries
    if (out[id]) continue;                 // existing card wins
    // Seed a reviewed card: newCard → review("easy") → produces future due date
    const fresh = scheduler.newCard(LEGACY_SEED_MS);
    const matured = scheduler.review(fresh, "easy", LEGACY_SEED_MS);
    out[id] = matured;
  }
  return out;
}

/**
 * Apply a grade to the given topic's card (create-if-absent), returning a new
 * GrammarMastery map (immutable).
 */
export function gradeGrammar(
  m: GrammarMastery,
  topicId: string,
  rating: Grade,
  now: Date,
): GrammarMastery {
  const nowMs = now.getTime();
  const existing = m[topicId];
  const base = existing ?? scheduler.newCard(nowMs);
  const next = scheduler.review(base, rating, nowMs);
  return { ...m, [topicId]: next };
}

/**
 * Is the topic's card due for review at `now`?
 * Mirrors `scheduler.isDue(card, now)` which checks `card.due <= now`.
 */
export function isTopicDue(card: CardState | undefined, now: Date): boolean {
  if (!card) return true; // no card = never reviewed = due
  return scheduler.isDue(card, now.getTime());
}
