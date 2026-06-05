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
