// site/src/german/state.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  germanState, resetGerman, gradeWord, statusOf, dueWordIds, knownCount,
} from "./state";
import {
  setPlacement, getPlacement, isKnown, getNewWordsPerDay, setNewWordsPerDay,
  introducedToday, recordNewIntro, queueNewWords,
} from "./state";

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

describe("german state", () => {
  beforeEach(() => resetGerman());

  it("a never-seen word is 'new' and not counted known", () => {
    expect(statusOf("alpha")).toBe("new");
    expect(knownCount(["alpha", "beta"])).toBe(0);
  });

  it("grading 'good' creates a card, sets learning, and schedules it out", () => {
    gradeWord("alpha", "good", T0);
    expect(statusOf("alpha")).toBe("learning");
    expect(dueWordIds(["alpha"], T0)).toEqual([]); // no longer due right now
  });

  it("grading 'again' keeps the word due soon", () => {
    gradeWord("alpha", "again", T0);
    expect(dueWordIds(["alpha"], T0 + DAY)).toEqual(["alpha"]);
  });

  it("a matured card counts as known", () => {
    let now = T0;
    for (let i = 0; i < 4; i++) {
      gradeWord("alpha", "easy", now);
      now = germanState.value.words["alpha"].card.due;
    }
    expect(statusOf("alpha")).toBe("known");
    expect(knownCount(["alpha"])).toBe(1);
  });
});

const T1 = 1_700_000_000_000;
const DAY1 = 86_400_000;

describe("german state — placement & queueing", () => {
  beforeEach(() => resetGerman());

  it("stores a placement result and its known lemmas", () => {
    expect(getPlacement()).toBeUndefined();
    setPlacement({ estimatedKnown: 900, band: "A2", takenAt: T1 }, ["de:0001", "de:0002"]);
    expect(getPlacement()?.band).toBe("A2");
    expect(isKnown("de:0001")).toBe(true);
    expect(isKnown("de:9999")).toBe(false);
  });

  it("defaults new-words/day to 20 and lets it be changed", () => {
    expect(getNewWordsPerDay()).toBe(20);
    setNewWordsPerDay(5);
    expect(getNewWordsPerDay()).toBe(5);
  });

  it("counts new words introduced per calendar day and resets next day", () => {
    expect(introducedToday(T1)).toBe(0);
    recordNewIntro(T1);
    recordNewIntro(T1);
    expect(introducedToday(T1)).toBe(2);
    expect(introducedToday(T1 + DAY1)).toBe(0);
  });

  it("queues unseen, unknown band words up to the remaining daily budget", () => {
    setNewWordsPerDay(3);
    setPlacement({ estimatedKnown: 0, band: "A1", takenAt: T1 }, ["a"]);
    const q = queueNewWords(["a", "b", "c", "d", "e"], T1);
    expect(q).toEqual(["b", "c", "d"]); // "a" is known; budget caps at 3
    recordNewIntro(T1);
    expect(queueNewWords(["a", "b", "c", "d", "e"], T1)).toEqual(["b", "c"]); // 1 used
  });
});

import { getGradingModel, setGradingModel, recordOutputAttempt, outputAttemptOf } from "./state";
import { markUnitRead, isUnitRead, germanState as gstate } from "./state";

const T2 = 1_700_000_000_000;

describe("german state — reading", () => {
  beforeEach(() => resetGerman());

  it("marks a unit read", () => {
    expect(isUnitRead("u1")).toBe(false);
    markUnitRead("u1", [], T2);
    expect(isUnitRead("u1")).toBe(true);
  });

  it("seeds targetWords into the deck on read (bumpSeen)", () => {
    markUnitRead("u1", ["de:0042", "de:0043"], T2);
    expect(gstate.value.words["de:0042"]).toBeDefined();
    expect(gstate.value.words["de:0043"]).toBeDefined();
    expect(gstate.value.words["de:0042"].card.reps).toBe(0);
  });

  it("does not clobber a word already in progress", () => {
    gradeWord("de:0042", "good", T2); // reps -> 1
    markUnitRead("u1", ["de:0042"], T2);
    expect(gstate.value.words["de:0042"].card.reps).toBe(1); // unchanged
  });
});

const T3 = 1_700_000_000_000;

describe("german state — output", () => {
  beforeEach(() => resetGerman());

  it("defaults grading model to haiku and lets it change", () => {
    expect(getGradingModel()).toBe("claude-haiku-4-5");
    setGradingModel("claude-sonnet-4-6");
    expect(getGradingModel()).toBe("claude-sonnet-4-6");
  });

  it("records and reads an output attempt", () => {
    expect(outputAttemptOf("t1")).toBeUndefined();
    recordOutputAttempt("t1", "B1", T3);
    expect(outputAttemptOf("t1")?.scoreBand).toBe("B1");
  });

  it("resetGerman clears output attempts", () => {
    recordOutputAttempt("t1", "B1", T3);
    resetGerman();
    expect(outputAttemptOf("t1")).toBeUndefined();
  });
});

import {
  markGrammarDone, isGrammarDone, markCollocationDone, isCollocationDone,
} from "./state";

describe("german state — grammar/collocation completion", () => {
  beforeEach(() => resetGerman());

  it("marks and reads grammar completion", () => {
    expect(isGrammarDone("grammar:nominativ")).toBe(false);
    markGrammarDone("grammar:nominativ");
    expect(isGrammarDone("grammar:nominativ")).toBe(true);
  });

  it("marks and reads collocation completion", () => {
    expect(isCollocationDone("colloc:fehler")).toBe(false);
    markCollocationDone("colloc:fehler");
    expect(isCollocationDone("colloc:fehler")).toBe(true);
  });

  it("resetGerman clears completion", () => {
    markGrammarDone("grammar:nominativ");
    markCollocationDone("colloc:fehler");
    resetGerman();
    expect(isGrammarDone("grammar:nominativ")).toBe(false);
    expect(isCollocationDone("colloc:fehler")).toBe(false);
  });

  it("survives a save/load round-trip via the signal", () => {
    markGrammarDone("grammar:nominativ");
    const json = JSON.stringify(germanState.value);
    const parsed = JSON.parse(json);
    expect(parsed.grammarDone["grammar:nominativ"]).toBe(true);
  });
});

// KEY isolation: the German layer uses awesome.german.v1 and a separate signal,
// so it must never read or write the English layer's persisted state.
import { englishState, resetEnglish, gradeWord as gradeEnglishWord, statusOf as englishStatusOf } from "~/english/state";

describe("german state — isolation from english", () => {
  beforeEach(() => {
    resetGerman();
    resetEnglish();
  });

  it("grading a German word does not touch English state", () => {
    gradeWord("de:0001", "good", T0);
    expect(germanState.value.words["de:0001"]).toBeDefined();
    expect(englishState.value.words["de:0001"]).toBeUndefined();
    expect(englishStatusOf("de:0001")).toBe("new");
  });

  it("grading an English word does not touch German state", () => {
    gradeEnglishWord("ngsl:0001", "good", T0);
    expect(englishState.value.words["ngsl:0001"]).toBeDefined();
    expect(germanState.value.words["ngsl:0001"]).toBeUndefined();
    expect(statusOf("ngsl:0001")).toBe("new");
  });

  it("uses the awesome.german.v1 storage key", () => {
    resetGerman();
    gradeWord("de:0001", "good", T0);
    expect(localStorage.getItem("awesome.german.v1")).not.toBeNull();
  });
});
