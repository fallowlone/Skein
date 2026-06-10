import { describe, it, expect } from "vitest";
import { mergePractice, mergeDrill, mergeReview, mergeCapstones, mergeExtras } from "./sync-extras";
import type { Card } from "./review-state";

describe("mergePractice", () => {
  it("keeps the furthest status per task and unions lessons", () => {
    const local = { "go/u/l1": { t1: "done" as const, t2: "seen" as const } };
    const server = { "go/u/l1": { t1: "attempted" as const, t2: "done" as const }, "go/u/l2": { t1: "done" as const } };
    expect(mergePractice(local, server)).toEqual({
      "go/u/l1": { t1: "done", t2: "done" },
      "go/u/l2": { t1: "done" },
    });
  });
  it("does not mutate inputs", () => {
    const local = { a: { t: "seen" as const } };
    mergePractice(local, { a: { t: "done" as const } });
    expect(local.a.t).toBe("seen");
  });
});

describe("mergeDrill", () => {
  it("later attempt wins; tie keeps the first argument", () => {
    const a = { p1: { status: "attempted" as const, at: 100 }, p2: { status: "solved" as const, at: 50 } };
    const b = { p1: { status: "solved" as const, at: 200 }, p2: { status: "attempted" as const, at: 50 } };
    const m = mergeDrill(a, b);
    expect(m.p1).toEqual({ status: "solved", at: 200 });
    expect(m.p2).toEqual({ status: "solved", at: 50 }); // tie → a
  });
});

describe("mergeReview", () => {
  const card = (over: Partial<Card>): Card => ({
    cardKey: "k", lessonKey: "l", source: "practice", index: 0, front: "f", back: "b", lang: "en",
    sched: { reps: 0, intervalDays: 0, ease: 2.5 } as Card["sched"],
    dueAt: 0, addedAt: 1, lastReviewedAt: null, ...over,
  });
  it("the more recently reviewed copy owns the schedule", () => {
    const a = { k: card({ lastReviewedAt: 100, dueAt: 5 }) };
    const b = { k: card({ lastReviewedAt: 200, dueAt: 9 }) };
    expect(mergeReview(a, b).k.dueAt).toBe(9);
  });
  it("a reviewed copy beats a never-reviewed one; both-null keeps local", () => {
    const reviewed = card({ lastReviewedAt: 10, dueAt: 7 });
    expect(mergeReview({ k: card({ lastReviewedAt: null }) }, { k: reviewed }).k.dueAt).toBe(7);
    expect(mergeReview({ k: card({ dueAt: 1 }) }, { k: card({ dueAt: 2 }) }).k.dueAt).toBe(1);
  });
  it("unions distinct cards", () => {
    expect(Object.keys(mergeReview({ a: card({}) }, { b: card({}) }))).toHaveLength(2);
  });
});

describe("mergeCapstones", () => {
  it("done anywhere is done everywhere; false never undoes true", () => {
    const a = { proj: { m1: true, m2: false } };
    const b = { proj: { m2: true, m3: false }, other: { x: true } };
    expect(mergeCapstones(a, b)).toEqual({
      proj: { m1: true, m2: true, m3: false },
      other: { x: true },
    });
  });
});

describe("mergeExtras", () => {
  it("tolerates a missing/partial server sidecar", () => {
    const local = { practice: { a: { t: "done" as const } }, drill: {}, review: {}, capstones: {} };
    expect(mergeExtras(local, undefined)).toEqual(local);
    expect(mergeExtras(local, { drill: { d: { status: "solved", at: 1 } } }).drill.d.status).toBe("solved");
  });
});
