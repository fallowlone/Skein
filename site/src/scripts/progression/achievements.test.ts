import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements";

const ctx0 = { drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false, hourOfDay: 12, seniorAnswers: 0, pillarsVisited: 0 };
const empty = { pretest: null, history: {}, retrieval: {}, progression: { achievements: {} } } as any;

describe("achievements", () => {
  it("defines ≥12 achievements, each with id + bilingual label + predicate", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(24);
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
});
