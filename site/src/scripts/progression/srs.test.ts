import { describe, it, expect } from "vitest";
import { type Sched, freshSched, schedule, dueAtFrom } from "./srs";

const fresh: Sched = freshSched();

describe("srs / SM-2 scheduler", () => {
  it("a fresh card starts at interval 0, ease 2.5, reps 0", () => {
    expect(fresh).toEqual({ interval: 0, ease: 2.5, reps: 0, lapses: 0 });
  });

  it("first 'good' sets interval to 1 day, second to 6 days", () => {
    const r1 = schedule(fresh, "good");
    expect(r1.interval).toBe(1);
    expect(r1.reps).toBe(1);
    const r2 = schedule(r1, "good");
    expect(r2.interval).toBe(6);
    expect(r2.reps).toBe(2);
  });

  it("subsequent 'good' multiplies interval by ease and rounds", () => {
    const s = schedule(schedule(fresh, "good"), "good"); // interval 6, ease 2.5
    const r3 = schedule(s, "good");
    expect(r3.interval).toBe(15); // round(6 * 2.5)
  });

  it("'again' resets interval to 0 and reps to 0 and counts a lapse, ease drops but floors at 1.3", () => {
    const mature = { interval: 30, ease: 2.5, reps: 5, lapses: 0 };
    const r = schedule(mature, "again");
    expect(r.interval).toBe(0);
    expect(r.reps).toBe(0);
    expect(r.lapses).toBe(1);
    expect(r.ease).toBeCloseTo(2.5 - 0.2); // SM-2 q=2 penalty
    const floored = schedule({ interval: 30, ease: 1.35, reps: 5, lapses: 0 }, "again");
    expect(floored.ease).toBe(1.3);
  });

  it("'hard' grows interval slowly and lowers ease; 'easy' grows faster and raises ease", () => {
    const s = schedule(schedule(fresh, "good"), "good"); // interval 6, ease 2.5, reps 2
    const hard = schedule(s, "hard");
    const easy = schedule(s, "easy");
    expect(hard.interval).toBeLessThan(easy.interval);
    expect(hard.ease).toBeLessThan(s.ease);
    expect(easy.ease).toBeGreaterThan(s.ease);
  });

  it("dueAt(now) = now + interval days", () => {
    const now = Date.parse("2026-06-05T00:00:00Z");
    const r = schedule(fresh, "good"); // interval 1
    expect(dueAtFrom(now, r)).toBe(now + 1 * 86_400_000);
  });
});

describe("srs / interval fuzz (review-cliff spreading)", () => {
  const mature = schedule(schedule(schedule(fresh, "good"), "good"), "good"); // interval 15, reps 3
  const now = Date.parse("2026-06-05T00:00:00Z");
  const DAY = 86_400_000;

  it("without a seed, dueAt stays the strict scheduled time (backward-compatible)", () => {
    expect(dueAtFrom(now, mature)).toBe(now + mature.interval * DAY);
  });

  it("with a seed, fuzz stays within ±5% of the interval (min 1 day)", () => {
    const spread = Math.max(1, Math.round(mature.interval * 0.05));
    for (const key of ["a", "b", "c", "card::x::1", "zzz"]) {
      const offsetDays = Math.round((dueAtFrom(now, mature, key) - now) / DAY) - mature.interval;
      expect(Math.abs(offsetDays)).toBeLessThanOrEqual(spread);
    }
  });

  it("fuzz is deterministic for a given seed", () => {
    expect(dueAtFrom(now, mature, "card-A")).toBe(dueAtFrom(now, mature, "card-A"));
  });

  it("different seeds do not all land on the same day", () => {
    // a long interval gives a ±5-day spread (11 possible offsets); many seeds across it must not
    // all collapse to one day. Deterministic: fixed seeds + a pure hash.
    const long = { interval: 100, ease: 2.5, reps: 6, lapses: 0 };
    const ds = Array.from({ length: 20 }, (_, i) => dueAtFrom(now, long, `card-${i}`));
    expect(new Set(ds).size).toBeGreaterThan(1);
  });

  it("short intervals (< 4 days) are never fuzzed", () => {
    const short = schedule(fresh, "good"); // interval 1
    expect(dueAtFrom(now, short, "any-seed")).toBe(now + 1 * DAY);
  });
});

describe("srs / late-success interval bonus (overdue handling)", () => {
  const s = schedule(schedule(fresh, "good"), "good"); // interval 6, ease 2.5, reps 2

  it("on-time success (elapsed = interval) equals the no-opts result", () => {
    expect(schedule(s, "good", { elapsedDays: s.interval }).interval).toBe(schedule(s, "good").interval);
  });

  it("a late successful recall grows the next interval (half the overdue excess), capped at 2× the plan", () => {
    const onTime = schedule(s, "good", { elapsedDays: 6 }).interval;     // base 6 → 15
    const mid = schedule(s, "good", { elapsedDays: 10 }).interval;       // base 6 + (10-6)/2 = 8 → 20
    const late = schedule(s, "good", { elapsedDays: 40 }).interval;      // base capped at 12 → 30
    expect(mid).toBeGreaterThan(onTime);
    expect(late).toBeGreaterThan(mid);
    expect(late).toBeLessThanOrEqual(Math.round(s.interval * 2 * s.ease)); // hard cap
  });

  it("'hard' earns no late bonus even when very overdue", () => {
    expect(schedule(s, "hard", { elapsedDays: 40 }).interval).toBe(schedule(s, "hard", { elapsedDays: 6 }).interval);
  });

  it("the early fixed intervals (reps 1 and 2) ignore elapsedDays", () => {
    expect(schedule(fresh, "good", { elapsedDays: 99 }).interval).toBe(1);
    expect(schedule(schedule(fresh, "good"), "good", { elapsedDays: 99 }).interval).toBe(6);
  });
});
