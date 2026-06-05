// site/src/scripts/progression/srs.ts
// Pure SM-2 spaced-repetition scheduler. Deterministic, no I/O. A per-card ease
// factor adapts interval growth to how hard each recall actually was, across the
// 1500 heterogeneous senior-depth review cards. See
// docs/superpowers/plans/2026-06-05-spaced-repetition-engine.md.

export type Grade = "again" | "hard" | "good" | "easy";

export interface Sched {
  interval: number; // whole days until next review
  ease: number; // SM-2 ease factor, floored at 1.3
  reps: number; // consecutive non-lapse recalls
  lapses: number; // total times graded "again"
}

const DAY = 86_400_000;
const MIN_EASE = 1.3;

// SM-2 quality scale (0..5) mapped from our 4-button grades.
const QUALITY: Record<Grade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

export function freshSched(): Sched {
  return { interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

export function schedule(prev: Sched, grade: Grade): Sched {
  const q = QUALITY[grade];

  if (grade === "again") {
    // lapse: relearn from scratch, penalize ease, keep the floor
    const ease = Math.max(MIN_EASE, prev.ease - 0.2);
    return { interval: 0, ease, reps: 0, lapses: prev.lapses + 1 };
  }

  // SM-2 ease update for q in 3..5
  const ease = Math.max(MIN_EASE, prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const reps = prev.reps + 1;

  let interval: number;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = grade === "hard" ? 4 : 6;
  else {
    const mult = grade === "hard" ? Math.max(1.2, ease - 0.5) : ease;
    interval = Math.round(prev.interval * mult);
  }
  if (grade === "easy") interval = Math.round(interval * 1.3);

  return { interval, ease, reps, lapses: prev.lapses };
}

export function dueAtFrom(now: number, s: Sched): number {
  return now + s.interval * DAY;
}
