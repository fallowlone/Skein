import { describe, it, expect, beforeEach } from "vitest";
import { resetEnglish, setPlacement, markUnitRead } from "./state";
import { userState } from "~/scripts/user-state";
import { summaryChanged, startEnglishSync } from "./sync";
import { englishSummary } from "./stats";

const T = 1_700_000_000_000;

describe("english sync", () => {
  beforeEach(() => {
    resetEnglish();
    userState.value = { ...userState.value, progression: { ...userState.value.progression, englishSummary: undefined } };
  });

  it("summaryChanged is false for an equal snapshot (ignoring updatedAt)", () => {
    const a = englishSummary(T);
    const b = englishSummary(T + 999);   // only updatedAt differs
    expect(summaryChanged(a, b)).toBe(false);
    expect(summaryChanged(undefined, b)).toBe(true);
  });

  it("startEnglishSync mirrors the summary into progression and updates on change", () => {
    const stop = startEnglishSync(() => T);
    // initial run writes a summary
    expect(userState.value.progression.englishSummary).toBeDefined();
    const before = userState.value.progression.englishSummary!;
    expect(before.readUnits).toBe(0);
    // a mutation that changes the summary triggers a rewrite
    markUnitRead("u1", [], T);
    expect(userState.value.progression.englishSummary!.readUnits).toBe(1);
    stop();
  });
});
