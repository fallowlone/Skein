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

  it("merges englishSummary: max per count, OR graded, latest band by updatedAt", () => {
    const sumA = { knownTotal: 100, knownByBand: { A2: 80, B1: 20, B2: 0 }, band: "B1", readUnits: 5, grammarDone: 2, collocationDone: 1, graded: false, updatedAt: 200 };
    const sumB = { knownTotal: 60, knownByBand: { A2: 50, B1: 10, B2: 0 }, band: "A2", readUnits: 9, grammarDone: 1, collocationDone: 3, graded: true, updatedAt: 100 };
    const local = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [], englishSummary: sumA }, history: {}, retrieval: {} } as any;
    const server = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [], englishSummary: sumB }, history: {}, retrieval: {} } as any;
    const es = mergeProgress(local, server).progression.englishSummary!;
    expect(es.knownTotal).toBe(100);
    expect(es.knownByBand).toEqual({ A2: 80, B1: 20, B2: 0 });
    expect(es.readUnits).toBe(9);          // max
    expect(es.collocationDone).toBe(3);    // max
    expect(es.graded).toBe(true);          // OR
    expect(es.band).toBe("B1");            // newer updatedAt (200) wins
    expect(es.updatedAt).toBe(200);
  });

  it("keeps the present englishSummary when only one side has it", () => {
    const sum = { knownTotal: 10, knownByBand: { A2: 10, B1: 0, B2: 0 }, band: "A2", readUnits: 0, grammarDone: 0, collocationDone: 0, graded: false, updatedAt: 5 };
    const local = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] }, history: {}, retrieval: {} } as any;
    const server = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [], englishSummary: sum }, history: {}, retrieval: {} } as any;
    expect(mergeProgress(local, server).progression.englishSummary).toEqual(sum);
  });

  it("preserves rating + interview + streak-freeze progression across a sync merge (no silent reset)", () => {
    // Regression: mergeProgression once rebuilt an explicit object that dropped these optional fields,
    // so a single sync wiped P1 living-rank, P2 freezes, P4 readiness, and the interview rotation counter.
    const local = {
      progression: {
        xp: 50, level: 3, achievements: {}, titles: [],
        streak: { lastActiveDay: "2026-06-24", count: 4, best: 6, freezes: 2 },
        peakRating: 720, studyEma: 690, studyRatingAt: 2000,
        interviewReadiness: 80, interviewCompletedAt: 1500, interviewRounds: 3,
      },
      history: {}, retrieval: {},
    } as any;
    const server = {
      progression: {
        xp: 40, level: 2, achievements: {}, titles: [],
        streak: { lastActiveDay: "2026-06-20", count: 1, best: 6, freezes: 1 },
        peakRating: 680, studyEma: 650, studyRatingAt: 1000,
        interviewReadiness: 60, interviewCompletedAt: 1200, interviewRounds: 5,
      },
      history: {}, retrieval: {},
    } as any;
    const p = mergeProgress(local, server).progression;
    expect(p.peakRating).toBe(720);            // high-water
    expect(p.studyEma).toBe(690);              // from the more recent recompute (studyRatingAt 2000)
    expect(p.studyRatingAt).toBe(2000);
    expect(p.interviewReadiness).toBe(80);     // high-water
    expect(p.interviewCompletedAt).toBe(1500); // latest
    expect(p.interviewRounds).toBe(5);         // more advanced counter wins
    expect(p.streak.freezes).toBe(2);          // max
  });

  it("leaves optional rating/interview fields undefined when neither side set them", () => {
    const bare = { progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] }, history: {}, retrieval: {} } as any;
    const p = mergeProgress(bare, bare).progression;
    expect(p.peakRating).toBeUndefined();        // must stay absent, not become 0 (would corrupt rank display)
    expect(p.interviewReadiness).toBeUndefined();
    expect(p.interviewRounds).toBeUndefined();
  });
});
