// site/src/scripts/assess/verdict.test.ts
import { describe, expect, test } from "vitest";
import { conceptVerdict, isSettled } from "./verdict";
import { detectPatterns } from "./patterns";
import { emptyCell } from "./update";
import { cellKey, type Cell, type CellKey, type Facet, type Posterior } from "./types";

const cellWith = (facet: Facet, posterior: Posterior, items = 2): Cell => ({
  ...emptyCell("c", facet, "surface"), posterior, items,
  evidence: Array.from({ length: items }, (_, i) => ({
    conceptId: "c", facet, itemId: `i${i}`, kind: "exec" as const, band: "surface" as const,
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

  test("names declined after two dont_know answers", () => {
    const cells = mk([["mechanism", [0.6, 0.3, 0.1, 0]]]);
    for (const e of cells.get(cellKey("c", "mechanism"))!.evidence) {
      e.response = { outcome: "dont_know", hintsUsed: 0, elapsedMs: 1 };
    }
    expect(detectPatterns(conceptVerdict(cells, "c"))).toContain("declined");
  });
});
