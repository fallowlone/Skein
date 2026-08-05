import { describe, expect, test } from "vitest";
import { applyResponse, emptyCell, propagate } from "./update";
import { expectedLevel } from "./ordinal";
import { anchorLevel, gradeExplainVerdict } from "./llm-grade";
import { cellKey, type AssessItem, type Band, type Cell, type CellKey, type Level } from "./types";
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

// Task 13 fix round 1 (Critical), field renamed to a per-concept map in fix
// round 2: meta.llmVerdictLevels is the channel that lets a clamped LLM
// verdict genuinely move a cell. `item` here is single-concept
// (concepts: ["promises"]), so `{ promises: "senior" }` degenerates to
// exactly fix round 1's single-anchor behaviour — this suite is the
// single-concept regression check fix round 2 must not break. See the
// "multi-concept" suite below for the fix round 2 Critical itself.
describe("applyResponse — LLM verdict likelihood (Task 13 fix round 1)", () => {
  const res = { outcome: "correct" as const, hintsUsed: 0 as const, elapsedMs: 10 };

  test("no llmVerdictLevels in meta produces a byte-identical posterior to no meta at all", () => {
    const withEmptyMeta = applyResponse(seed(), item, res, bandOf, 1, {});
    const withNoMeta = applyResponse(seed(), item, res, bandOf, 1);
    expect(withEmptyMeta.get(cellKey("promises", "production"))!.posterior)
      .toEqual(withNoMeta.get(cellKey("promises", "production"))!.posterior);
  });

  test("llmVerdictLevels with other meta fields set (answerDigest, failureNote, llmGraded) still produces the exact same posterior as before Task 13, when the verdict map itself is absent", () => {
    const before = applyResponse(seed(), item, res, bandOf, 1);
    const after = applyResponse(seed(), item, res, bandOf, 1, {
      answerDigest: "some explanation", failureNote: "names the mechanism", llmGraded: false,
    });
    expect(after.get(cellKey("promises", "production"))!.posterior)
      .toEqual(before.get(cellKey("promises", "production"))!.posterior);
  });

  test("an llmVerdictLevels entry on a NON-target facet cell (cross-facet damping) never applies — only the item's own facet is the target", () => {
    // item.facet is "production"; check the "recognition" cell (cross-facet, isTarget=false)
    // is identical whether or not llmVerdictLevels is set.
    const withoutVerdict = applyResponse(new Map(), item, res, bandOf, 1);
    const withVerdict = applyResponse(new Map(), item, res, bandOf, 1, { llmVerdictLevels: { promises: "senior" } });
    expect(withVerdict.get(cellKey("promises", "recognition"))!.posterior)
      .toEqual(withoutVerdict.get(cellKey("promises", "recognition"))!.posterior);
  });

  test("a senior verdict and a middle verdict on the SAME self-graded correct answer produce measurably different posteriors on the target facet", () => {
    const base = seed();
    const seniorVerdict = applyResponse(base, item, res, bandOf, 1, { llmVerdictLevels: { promises: "senior" } });
    const middleVerdict = applyResponse(base, item, res, bandOf, 1, { llmVerdictLevels: { promises: "middle" } });
    const noVerdict = applyResponse(base, item, res, bandOf, 1);
    const baselineLevel = expectedLevel(noVerdict.get(cellKey("promises", "production"))!.posterior);
    const seniorLevel = expectedLevel(seniorVerdict.get(cellKey("promises", "production"))!.posterior);
    const middleLevel = expectedLevel(middleVerdict.get(cellKey("promises", "production"))!.posterior);
    expect(seniorVerdict.get(cellKey("promises", "production"))!.posterior)
      .not.toEqual(middleVerdict.get(cellKey("promises", "production"))!.posterior);
    // This is the direct regression check for the Critical: fix round 0's
    // LEVEL_TO_OUTCOME collapsed both "middle" and "senior" verdicts into
    // Outcome "correct", producing a BIT-IDENTICAL posterior either way. A
    // senior verdict must now push the posterior further toward the top than
    // a middle verdict does, on the exact same underlying self-graded answer.
    // Pinned to this fixture's own actual computed values (verified via a
    // throwaway probe against this exact `item`/`res`/`seed`, run once and
    // discarded) — close to but not identical to the re-reviewer's
    // independently-reported figures for fix round 1 (baseline ~2.263 ->
    // senior ~2.674, middle ~2.157), which likely used a slightly different
    // fixture (exact weight/hints/kind unspecified); what matters here is
    // that THIS fixture's own numbers cannot silently drift.
    expect(baselineLevel).toBeCloseTo(2.288, 2);
    expect(seniorLevel).toBeCloseTo(2.669, 2);
    expect(middleLevel).toBeCloseTo(2.160, 2);
    expect(seniorLevel).toBeGreaterThan(middleLevel);
  });

  test("an llmVerdictLevels entry still leaves the plain Outcome-only likelihood in the mix — a wrong self-grade is nudged, not flipped, by a stray verdict", () => {
    const wrongRes = { outcome: "wrong" as const, hintsUsed: 0 as const, elapsedMs: 10 };
    const noVerdict = applyResponse(seed(), item, wrongRes, bandOf, 1);
    const withSeniorVerdict = applyResponse(seed(), item, wrongRes, bandOf, 1, { llmVerdictLevels: { promises: "senior" } });
    const partialRes = { outcome: "partial" as const, hintsUsed: 0 as const, elapsedMs: 10 };
    const partialNoVerdict = applyResponse(seed(), item, partialRes, bandOf, 1);
    const noVerdictLevel = expectedLevel(noVerdict.get(cellKey("promises", "production"))!.posterior);
    const withVerdictLevel = expectedLevel(withSeniorVerdict.get(cellKey("promises", "production"))!.posterior);
    const partialLevel = expectedLevel(partialNoVerdict.get(cellKey("promises", "production"))!.posterior);
    // Lower bound: the verdict nudges the posterior up relative to a bare "wrong".
    expect(withVerdictLevel).toBeGreaterThan(noVerdictLevel);
    // Upper bound (previously asserted only in the comment, not in an actual
    // expectation — fix round 2's test-quality finding): the Outcome-based
    // evidence is still multiplied in, so a "wrong" self-grade plus a
    // "senior" verdict does not overtake what a genuinely mixed "partial"
    // self-grade (no verdict at all) would produce on its own.
    expect(withVerdictLevel).toBeLessThan(partialLevel);
  });
});

// Task 13 fix round 2 (Critical): fix round 1's anchor/clamp was computed
// against `item.concepts[0]` ALONE while `applyResponse` broadcasts the same
// verdict likelihood to every concept an item touches — 99.7% of `explain`
// items span 2+ concepts in the live corpus, so the ±1 bound was proven for
// one cell and enforced for none of the rest. This suite reproduces the
// finding directly: two concepts on the SAME item, at genuinely different
// measured levels, and proves each cell is bounded against its OWN anchor —
// including the adversarial shape named in the finding (a "senior" claim on
// a concept the learner has demonstrably not got).
describe("applyResponse + llm-grade — per-concept clamp (Task 13 fix round 2, Critical)", () => {
  const multiItem: AssessItem = {
    id: "multi#e1", lessonKey: "multi-lesson", taskId: "e1", kind: "explain", facet: "mechanism",
    band: "surface", concepts: ["strong-concept", "weak-concept"], weight: 0.5, estMin: 5,
  };
  const res = { outcome: "correct" as const, hintsUsed: 0 as const, elapsedMs: 10 };

  // strong-concept's posterior modes at "middle" (0.60); weak-concept's at
  // "gap" (0.85) — genuinely different measured levels on the same item.
  const seedMulti = (): Map<CellKey, Cell> => new Map([
    [cellKey("strong-concept", "mechanism"), { ...emptyCell("strong-concept", "mechanism", "surface"), posterior: [0.05, 0.15, 0.60, 0.20], items: 3 }],
    [cellKey("weak-concept", "mechanism"), { ...emptyCell("weak-concept", "mechanism", "surface"), posterior: [0.85, 0.10, 0.04, 0.01], items: 3 }],
  ]);

  test("the adversarial case: a 'senior' verdict is let through for the concept anchored at 'middle', but clamped to 'junior' for the concept anchored at 'gap' — the exact scenario the finding named", () => {
    const cellsBefore = seedMulti();
    const strongAnchor = anchorLevel("strong-concept", "mechanism", "surface", cellsBefore);
    const weakAnchor = anchorLevel("weak-concept", "mechanism", "surface", cellsBefore);
    expect(strongAnchor).toBe("middle");
    expect(weakAnchor).toBe("gap");

    // One raw model response for the whole item (ItemView.tsx's
    // gradeExplainAnswer calls the model once, then clamps once per concept)
    // — an adversarial claim of "senior" for BOTH concepts, wrong for weak-concept.
    const raw = JSON.stringify({ level: "senior", why: "explains the mechanism, the tradeoff, and when it breaks" });
    const strongVerdict = gradeExplainVerdict(raw, strongAnchor)!;
    const weakVerdict = gradeExplainVerdict(raw, weakAnchor)!;

    expect(strongVerdict.level).toBe("senior"); // "middle" anchor: "senior" is one step away, allowed through
    expect(weakVerdict.level).toBe("junior");   // "gap" anchor: "senior" is three steps away, clamped to "junior"

    const verdictLevels: Record<string, Level> = {
      "strong-concept": strongVerdict.level,
      "weak-concept": weakVerdict.level,
    };
    const after = applyResponse(cellsBefore, multiItem, res, bandOf, 1, { llmVerdictLevels: verdictLevels });

    const strongBefore = expectedLevel(cellsBefore.get(cellKey("strong-concept", "mechanism"))!.posterior);
    const weakBefore = expectedLevel(cellsBefore.get(cellKey("weak-concept", "mechanism"))!.posterior);
    const strongAfter = expectedLevel(after.get(cellKey("strong-concept", "mechanism"))!.posterior);
    const weakAfter = expectedLevel(after.get(cellKey("weak-concept", "mechanism"))!.posterior);
    expect(strongAfter).toBeGreaterThan(strongBefore);
    expect(weakAfter).toBeGreaterThan(weakBefore);

    // Direct regression proof against fix round 1's actual bug: if BOTH
    // concepts had received the unclamped-for-weak "senior" factor (the
    // pre-fix broadcast), weak-concept would move further than it does when
    // correctly bounded to "junior". The correctly-bounded result must move
    // measurably LESS than that broadcast would have produced.
    const buggyBroadcast = applyResponse(cellsBefore, multiItem, res, bandOf, 1, {
      llmVerdictLevels: { "strong-concept": "senior", "weak-concept": "senior" },
    });
    const weakAfterBuggyBroadcast = expectedLevel(buggyBroadcast.get(cellKey("weak-concept", "mechanism"))!.posterior);
    expect(weakAfter).toBeLessThan(weakAfterBuggyBroadcast);
  });

  test("the same claimed level clamps differently per concept because the anchors differ, not because the claim differs", () => {
    const cellsBefore = seedMulti();
    const raw = JSON.stringify({ level: "middle", why: "x" });
    const strongVerdict = gradeExplainVerdict(raw, anchorLevel("strong-concept", "mechanism", "surface", cellsBefore))!;
    const weakVerdict = gradeExplainVerdict(raw, anchorLevel("weak-concept", "mechanism", "surface", cellsBefore))!;
    expect(strongVerdict.level).toBe("middle"); // "middle" anchor: "middle" passes through unchanged
    expect(weakVerdict.level).toBe("junior");   // "gap" anchor: "middle" (2 steps away) clamps to "junior"
  });

  test("every per-concept clamp stays within one index of THAT concept's own anchor, never the other concept's", () => {
    const cellsBefore = seedMulti();
    const strongAnchor = anchorLevel("strong-concept", "mechanism", "surface", cellsBefore);
    const weakAnchor = anchorLevel("weak-concept", "mechanism", "surface", cellsBefore);
    const LEVEL_ORDER: Level[] = ["gap", "junior", "middle", "senior"];
    for (const claimed of LEVEL_ORDER) {
      const raw = JSON.stringify({ level: claimed, why: "x" });
      const strongClamped = gradeExplainVerdict(raw, strongAnchor)!.level;
      const weakClamped = gradeExplainVerdict(raw, weakAnchor)!.level;
      expect(Math.abs(LEVEL_ORDER.indexOf(strongClamped) - LEVEL_ORDER.indexOf(strongAnchor))).toBeLessThanOrEqual(1);
      expect(Math.abs(LEVEL_ORDER.indexOf(weakClamped) - LEVEL_ORDER.indexOf(weakAnchor))).toBeLessThanOrEqual(1);
    }
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
