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

// Interval fuzz: spread same-day cohorts so reviews don't pile into "cliffs" (a huge batch all due
// at once, then nothing). Only fuzz intervals long enough that a day of jitter is immaterial.
const FUZZ_MIN_INTERVAL = 4; // days
const FUZZ_FRAC = 0.05; // ±5% of the interval

export interface ScheduleOpts {
  // Days the card actually survived since the last review (now − lastReviewedAt). When a card is
  // reviewed LATE and still recalled, it demonstrably outlasted its schedule, so the next interval
  // grows from how long it really survived (Anki-style), capped to avoid runaway. Omit for on-time
  // semantics — the default reproduces the prior strictly-scheduled behaviour byte-for-byte.
  elapsedDays?: number;
}

export function freshSched(): Sched {
  return { interval: 0, ease: 2.5, reps: 0, lapses: 0 };
}

export function schedule(prev: Sched, grade: Grade, opts: ScheduleOpts = {}): Sched {
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
    // A late SUCCESSFUL recall is evidence the card outlasted its schedule, so credit HALF of the
    // overdue excess (Anki dampens the overdue bonus — a late recall is partly luck), with the base
    // capped at 2× the planned interval. The ease multiplier still applies after, so the final
    // interval can reach up to prev.interval·2·ease. "hard" struggled, so it earns no late bonus.
    // Omitting elapsedDays ⇒ survived = prev.interval ⇒ base = prev.interval ⇒ byte-identical to the
    // prior strictly-scheduled behaviour.
    const survived = Math.max(prev.interval, opts.elapsedDays ?? prev.interval);
    const base = grade === "hard"
      ? prev.interval
      : Math.min(prev.interval + (survived - prev.interval) * 0.5, prev.interval * 2);
    const mult = grade === "hard" ? Math.max(1.2, ease - 0.5) : ease;
    interval = Math.round(base * mult);
  }
  if (grade === "easy") interval = Math.round(interval * 1.3);

  return { interval, ease, reps, lapses: prev.lapses };
}

// Deterministic 32-bit string hash (FNV-1a) → [0,1). Same seed ⇒ same value, so a card's fuzz is
// stable across reschedules and tests stay reproducible.
function seedUnit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

// Next due time. With a `seed` (e.g. the cardKey), long intervals get a small deterministic ±FUZZ_FRAC
// jitter to break up review cliffs. Without a seed it is the strict now + interval·DAY (unchanged).
export function dueAtFrom(now: number, s: Sched, seed?: string): number {
  let due = now + s.interval * DAY;
  if (seed && s.interval >= FUZZ_MIN_INTERVAL) {
    const spreadDays = Math.max(1, Math.round(s.interval * FUZZ_FRAC));
    // integer days, explicitly clamped to [-spread, +spread] so the bound holds for any future
    // FUZZ_FRAC / FUZZ_MIN_INTERVAL without relying on Math.round staying in range.
    const offset = Math.max(-spreadDays, Math.min(spreadDays, Math.round((seedUnit(seed) * 2 - 1) * spreadDays)));
    due += offset * DAY;
  }
  return due;
}
