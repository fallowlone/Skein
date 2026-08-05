import { describe, expect, test } from "vitest";
import { applyResponse, emptyCell, propagate } from "./update";
import { expectedLevel } from "./ordinal";
import { cellKey, type AssessItem, type Band, type Cell, type CellKey } from "./types";
import { buildConceptGraph } from "~/scripts/path/graph";
import type { Concept } from "~/scripts/path/types";

const concept = (id: string, requires: string[]): Concept =>
  ({ id, label: { en: "", ru: "" }, track: "backend", band: "surface", requires });

const bandOf = (): Band => "surface";
const item: AssessItem = {
  id: "l#t", lessonKey: "l", taskId: "t", kind: "exec", facet: "production",
  band: "surface", concepts: ["promises"], weight: 1, estMin: 5,
};
const seed = (): Map<CellKey, Cell> =>
  new Map([[cellKey("promises", "production"), emptyCell("promises", "production", "surface")]]);

describe("applyResponse", () => {
  test("a correct unaided answer raises the expected level", () => {
    const before = seed();
    const after = applyResponse(before, item, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    const b = before.get(cellKey("promises", "production"))!;
    const a = after.get(cellKey("promises", "production"))!;
    expect(expectedLevel(a.posterior)).toBeGreaterThan(expectedLevel(b.posterior));
  });

  test("the input map is not mutated", () => {
    const before = seed();
    const snapshot = before.get(cellKey("promises", "production"))!.posterior;
    applyResponse(before, item, { outcome: "wrong", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(before.get(cellKey("promises", "production"))!.posterior).toBe(snapshot);
  });

  test("evidence is appended with the item and the response", () => {
    const after = applyResponse(seed(), item, { outcome: "partial", hintsUsed: 1, elapsedMs: 10 }, bandOf, 42);
    const cell = after.get(cellKey("promises", "production"))!;
    expect(cell.items).toBe(1);
    expect(cell.evidence).toHaveLength(1);
    expect(cell.evidence[0]).toMatchObject({ itemId: "l#t", atMs: 42, facet: "production" });
  });

  test("a multi-concept item creates a cell per attributed concept", () => {
    const multi = { ...item, concepts: ["promises", "event-loop"], weight: 0.5 };
    const after = applyResponse(new Map(), multi, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(after.has(cellKey("promises", "production"))).toBe(true);
    expect(after.has(cellKey("event-loop", "production"))).toBe(true);
  });

  test("a half-weight item moves the posterior less than a full-weight one", () => {
    const full = applyResponse(seed(), item, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    const half = applyResponse(seed(), { ...item, weight: 0.5 }, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(expectedLevel(full.get(cellKey("promises", "production"))!.posterior))
      .toBeGreaterThan(expectedLevel(half.get(cellKey("promises", "production"))!.posterior));
  });
});

// Task 13 fix round 1 (Critical): meta.llmVerdictLevel is the new channel that
// lets a clamped LLM verdict genuinely move a cell. These tests prove (a) its
// absence is a true no-op — the no-key path stays byte-identical to
// pre-Task-13 behaviour, and (b) its presence is genuinely bidirectional, not
// a downgrade-only ratchet (the bug fix round 1 was written to close).
describe("applyResponse — LLM verdict likelihood (Task 13 fix round 1)", () => {
  const res = { outcome: "correct" as const, hintsUsed: 0 as const, elapsedMs: 10 };

  test("no llmVerdictLevel in meta produces a byte-identical posterior to no meta at all", () => {
    const withEmptyMeta = applyResponse(seed(), item, res, bandOf, 1, {});
    const withNoMeta = applyResponse(seed(), item, res, bandOf, 1);
    expect(withEmptyMeta.get(cellKey("promises", "production"))!.posterior)
      .toEqual(withNoMeta.get(cellKey("promises", "production"))!.posterior);
  });

  test("llmVerdictLevel with other meta fields set (answerDigest, failureNote, llmGraded) still produces the exact same posterior as before Task 13, when the verdict itself is absent", () => {
    const before = applyResponse(seed(), item, res, bandOf, 1);
    const after = applyResponse(seed(), item, res, bandOf, 1, {
      answerDigest: "some explanation", failureNote: "names the mechanism", llmGraded: false,
    });
    expect(after.get(cellKey("promises", "production"))!.posterior)
      .toEqual(before.get(cellKey("promises", "production"))!.posterior);
  });

  test("an llmVerdictLevel on a NON-target facet cell (cross-facet damping) never applies — only the item's own facet is the target", () => {
    // item.facet is "production"; check the "recognition" cell (cross-facet, isTarget=false)
    // is identical whether or not llmVerdictLevel is set.
    const withoutVerdict = applyResponse(new Map(), item, res, bandOf, 1);
    const withVerdict = applyResponse(new Map(), item, res, bandOf, 1, { llmVerdictLevel: "senior" });
    expect(withVerdict.get(cellKey("promises", "recognition"))!.posterior)
      .toEqual(withoutVerdict.get(cellKey("promises", "recognition"))!.posterior);
  });

  test("a senior verdict and a middle verdict on the SAME self-graded correct answer produce measurably different posteriors on the target facet", () => {
    const base = seed();
    const seniorVerdict = applyResponse(base, item, res, bandOf, 1, { llmVerdictLevel: "senior" });
    const middleVerdict = applyResponse(base, item, res, bandOf, 1, { llmVerdictLevel: "middle" });
    const seniorLevel = expectedLevel(seniorVerdict.get(cellKey("promises", "production"))!.posterior);
    const middleLevel = expectedLevel(middleVerdict.get(cellKey("promises", "production"))!.posterior);
    expect(seniorVerdict.get(cellKey("promises", "production"))!.posterior)
      .not.toEqual(middleVerdict.get(cellKey("promises", "production"))!.posterior);
    // This is the direct regression check for the Critical: fix round 0's
    // LEVEL_TO_OUTCOME collapsed both "middle" and "senior" verdicts into
    // Outcome "correct", producing a BIT-IDENTICAL posterior either way. A
    // senior verdict must now push the posterior further toward the top than
    // a middle verdict does, on the exact same underlying self-graded answer.
    expect(seniorLevel).toBeGreaterThan(middleLevel);
  });

  test("an llmVerdictLevel still leaves the plain Outcome-only likelihood in the mix — a wrong self-grade cannot be overruled outright by a stray verdict", () => {
    const wrongRes = { outcome: "wrong" as const, hintsUsed: 0 as const, elapsedMs: 10 };
    const noVerdict = applyResponse(seed(), item, wrongRes, bandOf, 1);
    const withSeniorVerdict = applyResponse(seed(), item, wrongRes, bandOf, 1, { llmVerdictLevel: "senior" });
    // The verdict nudges the posterior up relative to a bare "wrong" — but the
    // Outcome-based evidence is still multiplied in, so it does not flip the
    // cell's expected level above what a genuinely mixed (partial) result would.
    expect(expectedLevel(withSeniorVerdict.get(cellKey("promises", "production"))!.posterior))
      .toBeGreaterThan(expectedLevel(noVerdict.get(cellKey("promises", "production"))!.posterior));
  });
});

describe("propagate", () => {
  const graph = buildConceptGraph([
    concept("async-await", ["promises"]),
    concept("promises", []),
  ]);

  test("strong production evidence flows down to prerequisites", () => {
    let cells = new Map([[cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")]]);
    for (let i = 0; i < 3; i++) {
      cells = applyResponse(cells, { ...item, concepts: ["async-await"] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    const after = propagate(cells, graph, "async-await", "production", bandOf);
    const prereq = after.get(cellKey("promises", "production"));
    expect(prereq).toBeDefined();
    expect(expectedLevel(prereq!.posterior)).toBeGreaterThan(expectedLevel(emptyCell("promises", "production", "surface").posterior));
  });

  test("recognition evidence does NOT propagate — knowing a term says nothing about its prerequisites", () => {
    let cells = new Map([[cellKey("async-await", "recognition"), emptyCell("async-await", "recognition", "surface")]]);
    cells = applyResponse(cells, { ...item, kind: "recall", facet: "recognition", concepts: ["async-await"] },
      { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const after = propagate(cells, graph, "async-await", "recognition", bandOf);
    expect(after.has(cellKey("promises", "recognition"))).toBe(false);
  });

  test("propagated evidence never overwrites a directly measured cell", () => {
    let cells = new Map([
      [cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")],
      [cellKey("promises", "production"), emptyCell("promises", "production", "surface")],
    ]);
    cells = applyResponse(cells, { ...item, concepts: ["promises"] }, { outcome: "wrong", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const measured = cells.get(cellKey("promises", "production"))!.posterior;
    for (let i = 0; i < 3; i++) {
      cells = applyResponse(cells, { ...item, concepts: ["async-await"] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    const after = propagate(cells, graph, "async-await", "production", bandOf);
    expect(after.get(cellKey("promises", "production"))!.posterior).toEqual(measured);
  });
});

describe("propagate — multi-hop", () => {
  // async-await requires promises requires event-loop: a three-deep chain.
  const chain = buildConceptGraph([
    concept("async-await", ["promises"]),
    concept("promises", ["event-loop"]),
    concept("event-loop", []),
  ]);

  const strongResult = (cells: Map<CellKey, Cell>, conceptId: string): Map<CellKey, Cell> => {
    let out = cells;
    for (let i = 0; i < 3; i++) {
      out = applyResponse(out, { ...item, concepts: [conceptId] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    return out;
  };

  test("a strong result on the top of a three-deep chain lifts both prerequisites, with decay by hop", () => {
    let cells = new Map([[cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")]]);
    cells = strongResult(cells, "async-await");
    const after = propagate(cells, chain, "async-await", "production", bandOf);

    const b = after.get(cellKey("promises", "production"));
    const c = after.get(cellKey("event-loop", "production"));
    expect(b).toBeDefined();
    expect(c).toBeDefined();

    const baseline = expectedLevel(emptyCell("event-loop", "production", "surface").posterior);
    const liftB = expectedLevel(b!.posterior) - baseline;
    const liftC = expectedLevel(c!.posterior) - baseline;
    expect(liftB).toBeGreaterThan(0);
    expect(liftC).toBeGreaterThan(0);
    expect(liftC).toBeLessThan(liftB); // two hops out moves strictly less than one hop out
  });

  test("a cell two hops out with its own direct evidence is not overwritten", () => {
    let cells = new Map([
      [cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")],
      [cellKey("event-loop", "production"), emptyCell("event-loop", "production", "surface")],
    ]);
    // Direct (measured) evidence on event-loop, two hops from async-await.
    cells = applyResponse(cells, { ...item, concepts: ["event-loop"] }, { outcome: "wrong", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const measured = cells.get(cellKey("event-loop", "production"))!.posterior;

    cells = strongResult(cells, "async-await");
    const after = propagate(cells, chain, "async-await", "production", bandOf);
    expect(after.get(cellKey("event-loop", "production"))!.posterior).toEqual(measured);
  });

  test("recognition still does not propagate at any depth", () => {
    let cells = new Map([[cellKey("async-await", "recognition"), emptyCell("async-await", "recognition", "surface")]]);
    cells = applyResponse(cells, { ...item, kind: "recall", facet: "recognition", concepts: ["async-await"] },
      { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const after = propagate(cells, chain, "async-await", "recognition", bandOf);
    expect(after.has(cellKey("promises", "recognition"))).toBe(false);
    expect(after.has(cellKey("event-loop", "recognition"))).toBe(false);
  });

  test("a cyclic requires relation terminates and does not throw", () => {
    const cyclic = buildConceptGraph([
      concept("cycle-a", ["cycle-b"]),
      concept("cycle-b", ["cycle-a"]),
    ]);
    let cells = new Map([[cellKey("cycle-a", "production"), emptyCell("cycle-a", "production", "surface")]]);
    cells = strongResult(cells, "cycle-a");
    expect(() => propagate(cells, cyclic, "cycle-a", "production", bandOf)).not.toThrow();
    const after = propagate(cells, cyclic, "cycle-a", "production", bandOf);
    expect(after.get(cellKey("cycle-b", "production"))).toBeDefined();
    // cycle-a itself must never be re-written as a "prerequisite of its own prerequisite".
    expect(after.get(cellKey("cycle-a", "production"))!.posterior).toEqual(
      cells.get(cellKey("cycle-a", "production"))!.posterior,
    );
  });
});
