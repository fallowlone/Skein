// site/src/scripts/review-state.ts
// localStorage-backed card store for the spaced-repetition queue. Owns its own
// key (atlas.review.v1), isolated from the synced UserState blob. Mirrors the
// try/catch I/O of practice-state.ts and consumes the pure srs.ts scheduler.
// See docs/superpowers/plans/2026-06-05-spaced-repetition-engine.md.
import { freshSched, schedule, dueAtFrom, type Grade, type Sched } from "./progression/srs";

export const REVIEW_KEY = "atlas.review.v1";

export type CardSource = "retrieval" | "practice" | "assess";

export interface CardSeed {
  cardKey: string;
  legacyCardKey?: string;
  lessonKey: string;
  source: CardSource;
  index: number;
  // Optional direct knowledge links. Older cards and non-path cards remain valid;
  // path review can progressively become concept-specific when content provides them.
  conceptIds?: string[];
  front: string;
  back: string;
  lang: "en" | "ru";
  answerMode?: "inline" | "original-task";
  taskId?: string;
}

export interface ReviewEvidence {
  eventId: string;
  basis: "self-report" | "exec";
  attempt: "answered" | "skipped";
  support: "independent" | "none" | "assisted";
  timing: "same-pass" | "immediate" | "delayed";
  attemptedAt: number | null;
  revealedAt: number;
  reviewedAt: number;
  delayMs: number;
}

export interface Card extends CardSeed {
  sched: Sched;
  dueAt: number; // epoch ms
  addedAt: number;
  lastReviewedAt: number | null;
  lastGrade?: Grade;
  lastEvidence?: ReviewEvidence;
}

type Store = Record<string, Card>;

// A card is usable only if it carries the string `lessonKey` every consumer splits
// and the numeric `dueAt` the queue sorts on. Legacy entries seeded before lessonKey
// existed (or otherwise corrupt) are dropped here, at the one boundary — so no
// downstream `.split`/sort site has to defend against a malformed card.
function isCard(c: unknown): c is Card {
  return (
    !!c &&
    typeof c === "object" &&
    typeof (c as Card).lessonKey === "string" &&
    (c as Card).lessonKey.length > 0 &&
    typeof (c as Card).dueAt === "number"
  );
}

function read(): Store {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Store = {};
    for (const [key, card] of Object.entries(parsed)) {
      if (isCard(card)) out[key] = card;
    }
    return out;
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

/** Idempotent on cardKey: an existing card keeps its schedule; content fields and the derived lessonKey refresh. */
export function addCard(seed: CardSeed, now = Date.now()): void {
  const at = Number.isFinite(now) && now > 100_000_000_000 ? now : Date.now();
  const s = read();
  const legacy = seed.legacyCardKey && seed.legacyCardKey !== seed.cardKey ? s[seed.legacyCardKey] : undefined;
  const existing = s[seed.cardKey] ?? legacy;
  if (existing) {
    s[seed.cardKey] = {
      ...existing,
      ...seed,
      cardKey: seed.cardKey,
      front: seed.front,
      back: seed.back,
      lang: seed.lang,
      lessonKey: seed.lessonKey,
      ...(seed.conceptIds ? { conceptIds: seed.conceptIds } : {}),
    };
    if (legacy && seed.legacyCardKey) delete s[seed.legacyCardKey];
  } else {
    const sched = freshSched();
    s[seed.cardKey] = { ...seed, sched, dueAt: dueAtFrom(at, sched), addedAt: at, lastReviewedAt: null };
  }
  write(s);
}

export function recordReview(cardKey: string, grade: Grade, when: number | ReviewEvidence = Date.now()): boolean {
  const s = read();
  const c = s[cardKey];
  if (!c) return false;
  const evidence = typeof when === "object" ? when : undefined;
  if (evidence && c.lastEvidence?.eventId === evidence.eventId) return false;
  const now = evidence?.reviewedAt ?? when as number;
  // Days the card actually survived since its last review — drives the late-success interval bonus.
  const elapsedDays = c.lastReviewedAt ? Math.max(0, (now - c.lastReviewedAt) / 86_400_000) : undefined;
  const sched = schedule(c.sched, grade, { elapsedDays });
  // Seed the due-time fuzz with the cardKey so same-day cohorts spread out deterministically.
  s[cardKey] = { ...c, sched, dueAt: dueAtFrom(now, sched, cardKey), lastReviewedAt: now, lastGrade: grade, ...(evidence ? { lastEvidence: evidence } : {}) };
  write(s);
  return true;
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
