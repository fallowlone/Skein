import { describe, it, expect, beforeEach } from "vitest";
import { resetEnglish, setPlacement, markUnitRead, markGrammarDone, markCollocationDone, recordOutputAttempt } from "./state";
import { knownByBand, knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount, englishSummary } from "./stats";

const T = 1_700_000_000_000;

describe("english stats", () => {
  beforeEach(() => resetEnglish());

  it("knownByBand buckets placement-seeded ids by band and sums to knownTotal", () => {
    // ngsl:0001 is A2, ngsl:0900 is B1 (rank 801-2000), nawl:0001 is B2.
    setPlacement({ estimatedKnown: 3, band: "B1", takenAt: T }, ["ngsl:0001", "ngsl:0900", "nawl:0001"]);
    const kb = knownByBand();
    expect(kb.A2).toBeGreaterThanOrEqual(1);
    expect(kb.B1).toBeGreaterThanOrEqual(1);
    expect(kb.B2).toBeGreaterThanOrEqual(1);
    expect(knownTotal()).toBe(kb.A2 + kb.B1 + kb.B2);
  });

  it("counts read units, graded output, grammar and collocation completion", () => {
    expect(readUnitsCount()).toBe(0);
    markUnitRead("u1", [], T);
    expect(readUnitsCount()).toBe(1);

    expect(gradedOutputCount()).toBe(0);
    recordOutputAttempt("t1", "B1", T);          // graded (scoreBand set)
    recordOutputAttempt("t2", undefined, T);     // self-assessed (no scoreBand)
    expect(gradedOutputCount()).toBe(1);

    markGrammarDone("grammar:passive");
    markCollocationDone("colloc:exceptions");
    expect(grammarDoneCount()).toBe(1);
    expect(collocationDoneCount()).toBe(1);
  });

  it("englishSummary assembles a consistent snapshot", () => {
    setPlacement({ estimatedKnown: 1, band: "A2", takenAt: T }, ["ngsl:0001"]);
    markUnitRead("u1", [], T);
    const s = englishSummary(T);
    expect(s.knownTotal).toBe(s.knownByBand.A2 + s.knownByBand.B1 + s.knownByBand.B2);
    expect(s.band).toBe("A2");
    expect(s.readUnits).toBe(1);
    expect(s.graded).toBe(false);
    expect(s.updatedAt).toBe(T);
  });
});
