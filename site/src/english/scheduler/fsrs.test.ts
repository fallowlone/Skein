// site/src/english/scheduler/fsrs.test.ts
import { describe, it, expect } from "vitest";
import { fsrsScheduler } from "./fsrs";

const DAY = 86_400_000;
const T0 = 1_700_000_000_000; // fixed epoch ms

describe("fsrsScheduler", () => {
  const s = fsrsScheduler();

  it("creates a new card that is due now", () => {
    const c = s.newCard(T0);
    expect(c.reps).toBe(0);
    expect(s.isDue(c, T0)).toBe(true);
    expect(s.dueAt(c)).toBeLessThanOrEqual(T0);
  });

  it("schedules a 'good' review into the future", () => {
    const c = s.review(s.newCard(T0), "good", T0);
    expect(c.reps).toBe(1);
    expect(s.dueAt(c)).toBeGreaterThan(T0);
    expect(s.isDue(c, T0)).toBe(false);
  });

  it("'easy' pushes the due date further than 'good'", () => {
    const good = s.review(s.newCard(T0), "good", T0);
    const easy = s.review(s.newCard(T0), "easy", T0);
    expect(s.dueAt(easy)).toBeGreaterThanOrEqual(s.dueAt(good));
  });

  it("'again' after a learned card shortens the interval vs 'good'", () => {
    const learned = s.review(s.newCard(T0), "good", T0);
    const lapsed = s.review(learned, "again", s.dueAt(learned));
    const kept = s.review(learned, "good", s.dueAt(learned));
    expect(s.dueAt(lapsed)).toBeLessThan(s.dueAt(kept));
  });

  it("round-trips through JSON without changing scheduling", () => {
    const c = s.review(s.newCard(T0), "good", T0);
    const revived = JSON.parse(JSON.stringify(c));
    expect(s.dueAt(revived)).toBe(s.dueAt(c));
  });
});
