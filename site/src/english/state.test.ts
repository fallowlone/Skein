// site/src/english/state.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  englishState, resetEnglish, gradeWord, statusOf, dueWordIds, knownCount,
} from "./state";
import {
  setPlacement, getPlacement, isKnown, getNewWordsPerDay, setNewWordsPerDay,
  introducedToday, recordNewIntro, queueNewWords,
} from "./state";

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;

describe("english state", () => {
  beforeEach(() => resetEnglish());

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
    // push it up with successive easy reviews across its due dates
    let now = T0;
    for (let i = 0; i < 4; i++) {
      gradeWord("alpha", "easy", now);
      now = englishState.value.words["alpha"].card.due;
    }
    expect(statusOf("alpha")).toBe("known");
    expect(knownCount(["alpha"])).toBe(1);
  });
});

const T1 = 1_700_000_000_000;
const DAY1 = 86_400_000;

describe("english state — P1 extensions", () => {
  beforeEach(() => resetEnglish());

  it("stores a placement result and its known lemmas", () => {
    expect(getPlacement()).toBeUndefined();
    setPlacement({ estimatedKnown: 1500, band: "B1", takenAt: T1 }, ["ngsl:0001", "ngsl:0002"]);
    expect(getPlacement()?.band).toBe("B1");
    expect(isKnown("ngsl:0001")).toBe(true);
    expect(isKnown("ngsl:9999")).toBe(false);
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
    setPlacement({ estimatedKnown: 0, band: "A2", takenAt: T1 }, ["a"]);
    const q = queueNewWords(["a", "b", "c", "d", "e"], T1);
    expect(q).toEqual(["b", "c", "d"]); // "a" is known; budget caps at 3
    recordNewIntro(T1);
    expect(queueNewWords(["a", "b", "c", "d", "e"], T1)).toEqual(["b", "c"]); // 1 used
  });
});

import { getGradingModel, setGradingModel, recordOutputAttempt, outputAttemptOf } from "./state";
import { markUnitRead, isUnitRead, englishState as estate } from "./state";

const T2 = 1_700_000_000_000;

describe("english state — P2 reading", () => {
  beforeEach(() => resetEnglish());

  it("marks a unit read", () => {
    expect(isUnitRead("u1")).toBe(false);
    markUnitRead("u1", [], T2);
    expect(isUnitRead("u1")).toBe(true);
  });

  it("seeds targetWords into the deck on read (bumpSeen)", () => {
    markUnitRead("u1", ["ngsl:0042", "ngsl:0043"], T2);
    expect(estate.value.words["ngsl:0042"]).toBeDefined();
    expect(estate.value.words["ngsl:0043"]).toBeDefined();
    expect(estate.value.words["ngsl:0042"].card.reps).toBe(0);
  });

  it("does not clobber a word already in progress", () => {
    gradeWord("ngsl:0042", "good", T2); // reps -> 1
    markUnitRead("u1", ["ngsl:0042"], T2);
    expect(estate.value.words["ngsl:0042"].card.reps).toBe(1); // unchanged
  });
});

const T3 = 1_700_000_000_000;

describe("english state — P3 output", () => {
  beforeEach(() => resetEnglish());

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

  it("resetEnglish clears output attempts", () => {
    recordOutputAttempt("t1", "B1", T3);
    resetEnglish();
    expect(outputAttemptOf("t1")).toBeUndefined();
  });
});

import {
  markGrammarDone, isGrammarDone, markCollocationDone, isCollocationDone,
} from "./state";

describe("english state — P4 grammar/collocation completion", () => {
  beforeEach(() => resetEnglish());

  it("marks and reads grammar completion", () => {
    expect(isGrammarDone("grammar:passive")).toBe(false);
    markGrammarDone("grammar:passive");
    expect(isGrammarDone("grammar:passive")).toBe(true);
  });

  it("marks and reads collocation completion", () => {
    expect(isCollocationDone("colloc:exceptions")).toBe(false);
    markCollocationDone("colloc:exceptions");
    expect(isCollocationDone("colloc:exceptions")).toBe(true);
  });

  it("resetEnglish clears P4 completion", () => {
    markGrammarDone("grammar:passive");
    markCollocationDone("colloc:exceptions");
    resetEnglish();
    expect(isGrammarDone("grammar:passive")).toBe(false);
    expect(isCollocationDone("colloc:exceptions")).toBe(false);
  });

  it("survives a save/load round-trip via the signal", () => {
    markGrammarDone("grammar:passive");
    const json = JSON.stringify(englishState.value);
    const parsed = JSON.parse(json);
    expect(parsed.grammarDone["grammar:passive"]).toBe(true);
  });
});

import { addChunk, gradeChunk, dueChunks } from "./state";

describe("chunk cards", () => {
  beforeEach(() => resetEnglish());

  it("addChunk creates a scheduled card; gradeChunk advances it; dueChunks surfaces due ids", () => {
    const id = addChunk("the tricky part is that the cache is cold", "источник: статья", 1_000);
    expect(id).toBeTruthy();
    expect(dueChunks(2_000)).toContain(id);
    gradeChunk(id, "good", 2_000);
    expect(dueChunks(2_000)).not.toContain(id); // scheduled into the future
    expect(englishState.value.chunks[id].text).toMatch(/tricky part/);
  });
  it("addChunk dedupes by normalized text", () => {
    const a = addChunk("It turns out that...", undefined, 1_000);
    const b = addChunk("it turns out that…", undefined, 2_000);
    expect(a).toBe(b);
  });
});
