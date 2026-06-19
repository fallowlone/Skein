import { describe, it, expect, beforeEach } from "vitest";
import { englishState, getGrammarGoal, setGrammarGoal, clearGrammarGoal, resetEnglish, type GrammarGoal } from "./state";

const goal: GrammarGoal = { targetCefr: "B2", deadlineMs: 1_900_000_000_000, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0 };

describe("grammar goal state", () => {
  beforeEach(() => resetEnglish());
  it("is undefined by default", () => { expect(getGrammarGoal()).toBeUndefined(); });
  it("round-trips through set/get", () => { setGrammarGoal(goal); expect(getGrammarGoal()).toEqual(goal); });
  it("clears", () => { setGrammarGoal(goal); clearGrammarGoal(); expect(getGrammarGoal()).toBeUndefined(); });
  it("resetEnglish wipes the goal", () => { setGrammarGoal(goal); resetEnglish(); expect(getGrammarGoal()).toBeUndefined(); });
  it("does not mutate prior state object", () => {
    const before = englishState.value; setGrammarGoal(goal);
    expect(englishState.value).not.toBe(before); expect(before.grammarGoal).toBeUndefined();
  });
});
