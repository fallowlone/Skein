// site/src/scripts/assess/verdict.test.ts
import { describe, expect, test } from "vitest";
import { conceptVerdict, isSettled } from "./verdict";
import { detectPatterns } from "./patterns";
import { emptyCell } from "./update";
import { cellKey, type Cell, type CellKey, type Facet, type Posterior } from "./types";

const cellWith = (facet: Facet, posterior: Posterior, items = 2): Cell => ({
  ...emptyCell("c", facet, "surface"), posterior, items,
  evidence: Array.from({ length: items }, (_, i) => ({
    conceptId: "c", facet, itemId: `i${i}`, lessonKey: "", kind: "exec" as const, band: "surface" as const,
    response: { outcome: "correct" as const, hintsUsed: 0 as const, elapsedMs: 1 },
    answerDigest: "", atMs: i,
  })),
});

const mk = (entries: [Facet, Posterior][]): Map<CellKey, Cell> =>
  new Map(entries.map(([f, p]) => [cellKey("c", f), cellWith(f, p)]));

describe("conceptVerdict", () => {
  test("an unmeasured concept is untested, not a gap", () => {
    const v = conceptVerdict(new Map(), "c");
    expect(v.status).toBe("untested");
    expect(v.band).toBeNull();
  });

  test("the band is the minimum across MEASURED facets", () => {
    const v = conceptVerdict(mk([
      ["recognition", [0, 0, 0.1, 0.9]],
      ["production", [0.8, 0.2, 0, 0]],
    ]), "c");
    expect(v.band?.level).toBe("gap");
  });

  test("an unmeasured facet does not drag the band down", () => {
    const v = conceptVerdict(mk([["mechanism", [0, 0, 0.2, 0.8]]]), "c");
    expect(v.band?.level).toBe("senior");
    expect(v.facets.production.status).toBe("untested");
  });

  test("a cell reached only with hints is flagged fragile", () => {
    const cells = mk([["mechanism", [0, 0.2, 0.7, 0.1]]]);
    const cell = cells.get(cellKey("c", "mechanism"))!;
    cell.evidence[0].response = { outcome: "correct", hintsUsed: 2, elapsedMs: 1 };
    expect(conceptVerdict(cells, "c").fragile).toBe(true);
  });

  test("a cell reached without hints is NOT flagged fragile", () => {
    const cells = mk([["mechanism", [0, 0.2, 0.7, 0.1]]]);
    const cell = cells.get(cellKey("c", "mechanism"))!;
    cell.evidence[0].response = { outcome: "correct", hintsUsed: 0, elapsedMs: 1 };
    expect(conceptVerdict(cells, "c").fragile).toBe(false);
  });

  test("band selection agrees with the reported label, not the posterior mean", () => {
    // recognition: mode senior (mass 0.51), but expectedLevel ~1.53 (mean pulled down by
    // the 0.49 mass sitting on gap). mechanism: mode middle (mass 0.99), expectedLevel
    // ~2.01. Mean-ordering picks recognition as "worst" and reports its label (senior) —
    // wrong, because a measured facet (mechanism) sits at the weaker level middle. The
    // band must be the minimum of the REPORTED labels, i.e. middle.
    const v = conceptVerdict(mk([
      ["recognition", [0.49, 0, 0, 0.51]],
      ["mechanism", [0, 0, 0.99, 0.01]],
    ]), "c");
    expect(v.band?.level).toBe("middle");
  });
});

describe("isSettled", () => {
  test("a sharp posterior is settled", () => {
    expect(isSettled(cellWith("mechanism", [0.01, 0.02, 0.95, 0.02], 1))).toBe(true);
  });
  test("a flat posterior with items left is not settled", () => {
    expect(isSettled(cellWith("mechanism", [0.25, 0.25, 0.25, 0.25], 1))).toBe(false);
  });
  test("a cell that used its item budget is settled regardless", () => {
    expect(isSettled(cellWith("mechanism", [0.25, 0.25, 0.25, 0.25], 3))).toBe(true);
  });
});

describe("detectPatterns", () => {
  test("names term-without-mechanism", () => {
    const v = conceptVerdict(mk([
      ["recognition", [0, 0, 0.8, 0.2]],
      ["mechanism", [0.7, 0.3, 0, 0]],
    ]), "c");
    expect(detectPatterns(v)).toContain("term-without-mechanism");
  });

  test("names does-without-explaining", () => {
    const v = conceptVerdict(mk([
      ["production", [0, 0, 0.8, 0.2]],
      ["mechanism", [0.7, 0.3, 0, 0]],
    ]), "c");
    expect(detectPatterns(v)).toContain("does-without-explaining");
  });

  test("names knows-cannot-apply, and only that pattern, when mechanism outstrips production", () => {
    const v = conceptVerdict(mk([
      ["mechanism", [0, 0, 0.8, 0.2]],
      ["production", [0.7, 0.3, 0, 0]],
    ]), "c");
    const patterns = detectPatterns(v);
    expect(patterns).toContain("knows-cannot-apply");
    expect(patterns).not.toContain("term-without-mechanism");
    expect(patterns).not.toContain("does-without-explaining");
  });

  test("one dont_know answer does not fire declined", () => {
    // cellWith's default items=2 gives two evidence entries; only the first is set to
    // dont_know, so exactly one dont_know exists — below the "declined" threshold of two.
    const cells = mk([["mechanism", [0.6, 0.3, 0.1, 0]]]);
    const cell = cells.get(cellKey("c", "mechanism"))!;
    cell.evidence[0].response = { outcome: "dont_know", hintsUsed: 0, elapsedMs: 1 };
    expect(detectPatterns(conceptVerdict(cells, "c"))).not.toContain("declined");
  });

  test("names declined after two dont_know answers", () => {
    const cells = mk([["mechanism", [0.6, 0.3, 0.1, 0]]]);
    for (const e of cells.get(cellKey("c", "mechanism"))!.evidence) {
      e.response = { outcome: "dont_know", hintsUsed: 0, elapsedMs: 1 };
    }
    expect(detectPatterns(conceptVerdict(cells, "c"))).toContain("declined");
  });
});
