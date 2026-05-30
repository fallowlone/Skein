// site/src/english/scheduler/types.ts
//
// The SRS algorithm lives behind this interface. CardState is JSON-serializable
// (epoch-ms dates, plain numbers) so it persists cleanly and tests are
// deterministic — `now` is always passed in, never read from the clock here.

export type Grade = "again" | "hard" | "good" | "easy";

/** Serializable mirror of an FSRS card. All dates are epoch ms. */
export type CardState = {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  /** ts-fsrs State enum: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: number;
  last_review: number | null;
  /** Present in newer ts-fsrs; passed through if set. */
  learning_steps?: number;
};

export interface Scheduler {
  /** A brand-new card, due immediately at `now`. */
  newCard(now: number): CardState;
  /** Apply a grade at `now`, returning the next card state. */
  review(card: CardState, grade: Grade, now: number): CardState;
  /** Is the card due for review at `now`? */
  isDue(card: CardState, now: number): boolean;
  /** When the card is next due, epoch ms. */
  dueAt(card: CardState): number;
}
