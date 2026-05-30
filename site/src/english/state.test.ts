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
