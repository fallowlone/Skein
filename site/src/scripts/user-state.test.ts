import { describe, expect, test, beforeEach } from "vitest";
import { userState, recordVisit, setTier, recordRetrieval, dismissRevisit, resetAll } from "./user-state";

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

  test("recordRetrieval marks attempted and bumps count", () => {
    recordRetrieval("tcp-handshake");
    expect(userState.value.retrieval["tcp-handshake"].attempted).toBe(true);
    expect(userState.value.retrieval["tcp-handshake"].attempts).toBe(1);

    recordRetrieval("tcp-handshake");
    expect(userState.value.retrieval["tcp-handshake"].attempts).toBe(2);
  });

  test("persists to localStorage", () => {
    setTier("senior", true);
    const raw = localStorage.getItem("awesome.user-state.v1");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).tier).toBe("senior");
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
    expect(localStorage.getItem("awesome.user-state.v1")).toBeNull();
  });
});
