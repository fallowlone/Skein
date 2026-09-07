import { describe, expect, test, beforeEach, vi } from "vitest";
import { userState, recordVisit, recordTutorOutcome, setTier, recordRetrieval, dismissRevisit, resetAll } from "./user-state";

describe("user-state", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAll();
  });

  test("defaults are middle/en/auto, no history", () => {
    expect(userState.value.tier).toBe("middle");
    expect(userState.value.lang).toBe("en");
    expect(userState.value.motion).toBe("auto");
    expect(userState.value.history).toEqual({});
  });

  test("setTier updates tier and increments manualTierFlips when manual", () => {
    setTier("senior", true);
    expect(userState.value.tier).toBe("senior");
    expect(userState.value.manualTierFlips).toBe(1);

    setTier("junior", false);
    expect(userState.value.tier).toBe("junior");
    expect(userState.value.manualTierFlips).toBe(1);
  });

  test("recordVisit creates and updates history entry", () => {
    recordVisit("tcp-handshake", "middle");
    expect(userState.value.history["tcp-handshake"]).toBeDefined();
    expect(userState.value.history["tcp-handshake"].tiersOpened).toEqual(["middle"]);

    recordVisit("tcp-handshake", "senior");
    expect(userState.value.history["tcp-handshake"].tiersOpened.sort())
      .toEqual(["middle", "senior"]);
  });

  test("tutor outcomes are bounded history and do not alter mastery", () => {
    recordTutorOutcome({ lessonKey: "js/01-basics/01-intro", mode: "hint", question: "q", concepts: ["scope"] });
    expect(userState.value.tutorHistory?.at(-1)).toMatchObject({ lessonKey: "js/01-basics/01-intro", mode: "hint", concepts: ["scope"] });
    expect((userState.value as any).conceptMastery).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("skein.user-state.v1")!).tutorHistory).toHaveLength(1);
  });

  test("keeps only the latest 50 tutor outcomes", () => {
    for (let i = 0; i < 51; i++) recordTutorOutcome({ lessonKey: "lesson", mode: "hint", question: String(i), concepts: [] });
    expect(userState.value.tutorHistory).toHaveLength(50);
    expect(userState.value.tutorHistory?.[0].question).toBe("1");
  });

  test("recordRetrieval marks attempted and bumps count", () => {
    recordRetrieval("tcp-handshake");
    expect(userState.value.retrieval["tcp-handshake"].attempted).toBe(true);
    expect(userState.value.retrieval["tcp-handshake"].attempts).toBe(1);

    recordRetrieval("tcp-handshake");
    expect(userState.value.retrieval["tcp-handshake"].attempts).toBe(2);
  });

  test("persists to localStorage", () => {
    setTier("senior", true);
    const raw = localStorage.getItem("skein.user-state.v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).tier).toBe("senior");
  });

  test("a storage write failure does not break the in-memory update", () => {
    const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    try {
      expect(() => setTier("senior", true)).not.toThrow();
      expect(userState.value.tier).toBe("senior");
    } finally {
      spy.mockRestore();
    }
  });

  test("dismissRevisit writes timestamp", () => {
    dismissRevisit("tcp-handshake");
    expect(userState.value.dismissedRevisit["tcp-handshake"]).toBeGreaterThan(0);
  });

  test("resetAll wipes state and localStorage", () => {
    setTier("senior", true);
    recordVisit("x", "senior");
    resetAll();
    expect(userState.value.tier).toBe("middle");
    expect(userState.value.history).toEqual({});
    expect(localStorage.getItem("skein.user-state.v1")).toBeNull();
  });
});
