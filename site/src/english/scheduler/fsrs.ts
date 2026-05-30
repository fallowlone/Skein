// site/src/english/scheduler/fsrs.ts
//
// FSRS implementation of Scheduler, wrapping ts-fsrs. We convert between our
// epoch-ms CardState and ts-fsrs's Date-based Card at the boundary so nothing
// outside this file depends on ts-fsrs internals.

import { createEmptyCard, fsrs, Rating, type Card, type Grade as FsrsGrade } from "ts-fsrs";
import type { CardState, Grade, Scheduler } from "./types";

// ts-fsrs's `next` accepts `Grade` (Again/Hard/Good/Easy) — the rateable subset
// of `Rating` that excludes `Manual`. Typing the map to `FsrsGrade` keeps the
// call site assignable without a cast.
const RATING: Record<Grade, FsrsGrade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function toCard(s: CardState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review === null ? undefined : new Date(s.last_review),
    ...(s.learning_steps !== undefined ? { learning_steps: s.learning_steps } : {}),
  } as Card;
}

function fromCard(c: Card): CardState {
  const anyCard = c as Card & { learning_steps?: number };
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.getTime() : null,
    ...(anyCard.learning_steps !== undefined ? { learning_steps: anyCard.learning_steps } : {}),
  };
}

export function fsrsScheduler(): Scheduler {
  const engine = fsrs();
  return {
    newCard(now: number): CardState {
      return fromCard(createEmptyCard(new Date(now)));
    },
    review(card: CardState, grade: Grade, now: number): CardState {
      const result = engine.next(toCard(card), new Date(now), RATING[grade]);
      return fromCard(result.card);
    },
    isDue(card: CardState, now: number): boolean {
      return card.due <= now;
    },
    dueAt(card: CardState): number {
      return card.due;
    },
  };
}
