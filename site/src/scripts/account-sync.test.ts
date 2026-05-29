// site/src/scripts/account-sync.test.ts
import { describe, it, expect } from "vitest";
import { mergeProgress } from "./account-sync";

describe("mergeProgress", () => {
  it("takes the per-lesson entry with the larger lastAt", () => {
    const local = { history: { a: { firstAt: 1, lastAt: 10, tiersOpened: [] } } } as any;
    const server = { history: { a: { firstAt: 1, lastAt: 20, tiersOpened: [] }, b: { firstAt: 2, lastAt: 5, tiersOpened: [] } } } as any;
    const merged = mergeProgress(local, server);
    expect(merged.history.a.lastAt).toBe(20); // server newer
    expect(merged.history.b.lastAt).toBe(5);  // server-only kept
  });

  it("keeps local-only lessons", () => {
    const local = { history: { x: { firstAt: 1, lastAt: 9, tiersOpened: [] } } } as any;
    const server = { history: {} } as any;
    expect(mergeProgress(local, server).history.x.lastAt).toBe(9);
  });

  it("merges retrieval by lastAt and unions scalar prefs from local", () => {
    const local = { tier: "senior", retrieval: { q: { attempted: true, lastAt: 30, attempts: 2 } }, history: {} } as any;
    const server = { tier: "middle", retrieval: { q: { attempted: true, lastAt: 10, attempts: 1 } }, history: {} } as any;
    const m = mergeProgress(local, server);
    expect(m.retrieval.q.lastAt).toBe(30);
    expect(m.tier).toBe("senior"); // local scalar wins
  });

  it("never erases a server pretest with a fresh device's null local pretest", () => {
    const local = { pretest: null, manualTierFlips: 0, history: {}, retrieval: {} } as any;
    const server = { pretest: { takenAt: 5, score: 8, answers: [1, 2] }, manualTierFlips: 3, history: {}, retrieval: {} } as any;
    const m = mergeProgress(local, server);
    expect(m.pretest).toEqual({ takenAt: 5, score: 8, answers: [1, 2] }); // server pretest preserved
    expect(m.manualTierFlips).toBe(3); // max wins
  });

  it("keeps a local pretest when the server has none", () => {
    const local = { pretest: { takenAt: 9, score: 4, answers: [0] }, manualTierFlips: 2, history: {}, retrieval: {} } as any;
    const server = { pretest: null, manualTierFlips: 0, history: {}, retrieval: {} } as any;
    expect(mergeProgress(local, server).pretest?.takenAt).toBe(9);
  });
});
