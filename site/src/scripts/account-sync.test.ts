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

  it("deep-merges history entries: unions tiersOpened, keeps firstAt min / lastAt max, merges faded", () => {
    const local = { history: { p: { firstAt: 5, lastAt: 30, tiersOpened: ["junior"], faded: { e1: true } } }, retrieval: {} } as any;
    const server = { history: { p: { firstAt: 2, lastAt: 20, tiersOpened: ["senior"], faded: { e2: true } } }, retrieval: {} } as any;
    const h = mergeProgress(local, server).history.p;
    expect(h.firstAt).toBe(2);
    expect(h.lastAt).toBe(30);
    expect(new Set(h.tiersOpened)).toEqual(new Set(["junior", "senior"])); // no opened-tier lost
    expect(h.faded).toEqual({ e1: true, e2: true });                       // no faded example lost
  });

  it("derives tier from the merged pretest rank (synced senior isn't shown middle)", () => {
    const local = { tier: "middle", pretest: null, history: {}, retrieval: {} } as any;
    const server = { tier: "middle", pretest: { takenAt: 1, stage1: { score: 9, answers: [] }, stage2: { score: 9, answers: [] }, rating: 950, rank: "architect-3", confidence: "high" }, history: {}, retrieval: {} } as any;
    expect(mergeProgress(local, server).tier).toBe("senior");
  });
});
