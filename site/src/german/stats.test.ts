import { describe, it, expect, beforeEach } from "vitest";
import { resetGerman, setPlacement, markUnitRead, markGrammarDone, markCollocationDone, recordOutputAttempt } from "./state";
import { knownByBand, knownTotal, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount, germanSummary } from "./stats";

const T = 1_700_000_000_000;

describe("german stats", () => {
  beforeEach(() => resetGerman());

  it("knownByBand buckets placement-seeded deck ids by band and sums to knownTotal", () => {
    // de:0001 and de:0002 are real A1 deck ids; an off-deck id is ignored.
    setPlacement({ estimatedKnown: 2, band: "A1", takenAt: T }, ["de:0001", "de:0002", "de:9999"]);
    const kb = knownByBand();
    expect(kb.A1).toBeGreaterThanOrEqual(2);
    expect(knownTotal()).toBe(kb.A1 + kb.A2 + kb.B1);
  });

  it("counts read units, graded output, grammar and collocation completion", () => {
    expect(readUnitsCount()).toBe(0);
    markUnitRead("u1", [], T);
    expect(readUnitsCount()).toBe(1);

    expect(gradedOutputCount()).toBe(0);
    recordOutputAttempt("t1", "B1", T);          // graded (scoreBand set)
    recordOutputAttempt("t2", undefined, T);     // self-assessed (no scoreBand)
    expect(gradedOutputCount()).toBe(1);

    markGrammarDone("grammar:nominativ");
    markCollocationDone("colloc:fehler");
    expect(grammarDoneCount()).toBe(1);
    expect(collocationDoneCount()).toBe(1);
  });

  it("germanSummary assembles a consistent snapshot", () => {
    setPlacement({ estimatedKnown: 1, band: "A1", takenAt: T }, ["de:0001"]);
    markUnitRead("u1", [], T);
    const s = germanSummary(T);
    expect(s.knownTotal).toBe(s.knownByBand.A1 + s.knownByBand.A2 + s.knownByBand.B1);
    expect(s.band).toBe("A1");
    expect(s.readUnits).toBe(1);
    expect(s.graded).toBe(false);
    expect(s.updatedAt).toBe(T);
  });
});
