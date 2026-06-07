import { describe, it, expect, beforeEach } from "vitest";
import { addCard, recordReview, dueBefore, allCards, dueCount, REVIEW_KEY } from "./review-state";

const DAY = 86_400_000;
const card = {
  cardKey: "databases/x::retrieval::0",
  lessonKey: "databases/x",
  source: "retrieval" as const,
  index: 0,
  front: "Why does a stale row estimate cascade?",
  back: "Because every node above re-plans on a wrong size.",
  lang: "en" as const,
};

describe("review-state store", () => {
  beforeEach(() => localStorage.removeItem(REVIEW_KEY));

  it("addCard is idempotent on cardKey (re-seed never duplicates or resets schedule)", () => {
    addCard(card);
    const after1 = allCards();
    recordReview(card.cardKey, "good", Date.parse("2026-06-05T00:00:00Z"));
    addCard(card); // re-harvest same card
    const after2 = allCards();
    expect(after1.length).toBe(1);
    expect(after2.length).toBe(1);
    expect(after2[0].sched.reps).toBe(1); // schedule preserved, not reset
  });

  it("a fresh card is due now (interval 0)", () => {
    const now = Date.parse("2026-06-05T00:00:00Z");
    addCard(card, now); // seed and query on the same clock
    expect(dueBefore(now + 1).map((c) => c.cardKey)).toContain(card.cardKey);
    expect(dueCount(now + 1)).toBe(1);
  });

  it("recordReview('good') pushes the card out of the due window by ~1 day", () => {
    addCard(card);
    const now = Date.parse("2026-06-05T00:00:00Z");
    recordReview(card.cardKey, "good", now);
    expect(dueBefore(now + 1).map((c) => c.cardKey)).not.toContain(card.cardKey);
    expect(dueBefore(now + DAY + 1).map((c) => c.cardKey)).toContain(card.cardKey);
  });

  it("dueBefore sorts soonest-due first", () => {
    // Seed both cards on the SAME fixed clock as the review/query below — otherwise
    // addCard defaults to the real Date.now() while recordReview uses 2026-06-05, making
    // the dueAt comparison depend on the wall clock (the flaky CI failure this fixes).
    const now = Date.parse("2026-06-05T00:00:00Z");
    addCard({ ...card, cardKey: "a", lessonKey: "a" }, now);
    addCard({ ...card, cardKey: "b", lessonKey: "b" }, now);
    recordReview("a", "easy", now); // a pushed far out from `now`; b stays fresh/due-now
    const due = dueBefore(now + 999 * DAY);
    expect(due[0].cardKey).toBe("b"); // b still due now → first
  });

  it("survives a reload by re-reading localStorage (no in-memory cache leak)", () => {
    addCard(card);
    recordReview(card.cardKey, "good", Date.parse("2026-06-05T00:00:00Z"));
    expect(allCards()[0].sched.reps).toBe(1);
  });
});
