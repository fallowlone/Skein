// site/src/english/state.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  englishState, resetEnglish, gradeWord, statusOf, dueWordIds, knownCount,
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
