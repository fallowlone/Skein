import { describe, it, expect } from "vitest";
import type { Card } from "~/scripts/review-state";
import { unitReviewHealth } from "./path-io";

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;

function card(lessonKey: string, over: Partial<Card["sched"]> & { dueAt?: number; lastReviewedAt?: number | null }): Card {
  const { dueAt, lastReviewedAt, ...sched } = over;
  return {
    cardKey: `${lessonKey}::retrieval::0`,
    lessonKey,
    source: "retrieval",
    index: 0,
    front: "f",
    back: "b",
    lang: "en",
    sched: { interval: 6, ease: 2.5, reps: 3, lapses: 0, ...sched },
    dueAt: dueAt ?? NOW + 6 * DAY,
    addedAt: NOW,
    lastReviewedAt: lastReviewedAt === undefined ? NOW : lastReviewedAt,
  };
}

describe("unitReviewHealth", () => {
  it("excludes never-reviewed cards and computes healthy/reviewed per unit", () => {
    const cards: Card[] = [
      card("networking/03-tcp/lesson-a", {}),                        // healthy
      card("networking/03-tcp/lesson-b", { dueAt: NOW - DAY }),      // overdue → lapsed
      card("databases/04-mvcc/lesson-c", { lastReviewedAt: null }), // never reviewed → excluded
    ];
    const h = unitReviewHealth(cards, NOW);
    expect(h.get("networking/03-tcp")).toBeCloseTo(0.5, 5); // 1 healthy of 2 reviewed
    expect(h.has("databases/04-mvcc")).toBe(false);          // no reviewed cards → omitted
  });

  it("a card with a lapse is not healthy", () => {
    const h = unitReviewHealth([card("x/y/z", { lapses: 1 })], NOW);
    expect(h.get("x/y")).toBe(0);
  });
});
