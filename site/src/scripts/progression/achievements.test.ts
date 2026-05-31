import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements";

const ctx0 = { drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false, hourOfDay: 12, seniorAnswers: 0, pillarsVisited: 0, englishKnown: 0, englishBand: "none", englishReadUnits: 0, englishGraded: false, englishGrammarDone: 0, englishCollocationDone: 0 } as any;
const empty = { pretest: null, history: {}, retrieval: {}, progression: { achievements: {} } } as any;

describe("achievements", () => {
  it("defines ≥33 achievements, each with id + bilingual label + predicate", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(33);
    for (const a of ACHIEVEMENTS) { expect(a.id).toBeTruthy(); expect(a.label.en && a.label.ru).toBeTruthy(); expect(typeof a.predicate).toBe("function"); }
  });
  it("none satisfied on an empty state", () => {
    expect(evaluateAchievements(empty, ctx0)).toEqual([]);
  });
  it("deep-diver fires when stage2 exists; drill-sergeant at 25 solves", () => {
    const s = { pretest: { stage2: {} }, history: {}, retrieval: {}, progression: { achievements: {} } } as any;
    expect(evaluateAchievements(s, ctx0)).toContain("deep-diver");
    expect(evaluateAchievements(empty, { ...ctx0, drillsSolved: 25 })).toContain("drill-sergeant");
  });
  it("English achievements fire on the right ctx thresholds", () => {
    expect(evaluateAchievements(empty, { ...ctx0, englishKnown: 500 })).toContain("en-words-500");
    expect(evaluateAchievements(empty, { ...ctx0, englishKnown: 2000 })).toContain("en-words-2000");
    expect(evaluateAchievements(empty, { ...ctx0, englishBand: "B2" })).toEqual(expect.arrayContaining(["en-band-b1", "en-band-b2"]));
    expect(evaluateAchievements(empty, { ...ctx0, englishGraded: true })).toContain("en-first-graded");
    expect(evaluateAchievements(empty, { ...ctx0, englishReadUnits: 10 })).toContain("en-reader-10");
    expect(evaluateAchievements(empty, ctx0)).not.toContain("en-words-500");
  });
});
