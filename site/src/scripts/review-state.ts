// site/src/scripts/review-state.ts
// localStorage-backed card store for the spaced-repetition queue. Owns its own
// key (atlas.review.v1), isolated from the synced UserState blob. Mirrors the
// try/catch I/O of practice-state.ts and consumes the pure srs.ts scheduler.
// See docs/superpowers/plans/2026-06-05-spaced-repetition-engine.md.
import { freshSched, schedule, dueAtFrom, type Grade, type Sched } from "./progression/srs";

export const REVIEW_KEY = "atlas.review.v1";

export type CardSource = "retrieval" | "practice";

export interface CardSeed {
  cardKey: string;
  lessonKey: string;
  source: CardSource;
  index: number;
  front: string;
  back: string;
  lang: "en" | "ru";
}

export interface Card extends CardSeed {
  sched: Sched;
  dueAt: number; // epoch ms
  addedAt: number;
  lastReviewedAt: number | null;
}

type Store = Record<string, Card>;

function read(): Store {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}
function write(s: Store): void {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

/** Idempotent on cardKey: an existing card keeps its schedule; only content fields refresh. */
export function addCard(seed: CardSeed, now = Date.now()): void {
  const s = read();
  const existing = s[seed.cardKey];
  if (existing) {
    s[seed.cardKey] = { ...existing, front: seed.front, back: seed.back, lang: seed.lang };
  } else {
    const sched = freshSched();
    s[seed.cardKey] = { ...seed, sched, dueAt: dueAtFrom(now, sched), addedAt: now, lastReviewedAt: null };
  }
  write(s);
}

export function recordReview(cardKey: string, grade: Grade, now = Date.now()): void {
  const s = read();
  const c = s[cardKey];
  if (!c) return;
  const sched = schedule(c.sched, grade);
  s[cardKey] = { ...c, sched, dueAt: dueAtFrom(now, sched), lastReviewedAt: now };
  write(s);
}

export function allCards(): Card[] {
  return Object.values(read());
}

export function dueBefore(now = Date.now()): Card[] {
  return allCards()
    .filter((c) => c.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function dueCount(now = Date.now()): number {
  return dueBefore(now).length;
}
