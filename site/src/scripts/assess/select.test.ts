import { describe, expect, test } from "vitest";
import { expectedGain, indexPool, nextItem } from "./select";
import { emptyCell } from "./update";
import { cellKey, type AssessItem, type Cell, type CellKey, type Facet, type ItemKind } from "./types";

const mkItem = (over: Partial<AssessItem>): AssessItem => ({
  id: over.id ?? "x", lessonKey: "l", taskId: over.id ?? "x", kind: "exec", facet: "production",
  band: "surface", concepts: ["c"], weight: 1, estMin: 5, ...over,
});

const bandOf = () => "surface" as const;
const base = () => new Map<CellKey, Cell>();

describe("expectedGain", () => {
  test("an uncertain cell has more to gain than a settled one", () => {
    const flat = emptyCell("c", "production", "surface");
    const sharp = { ...flat, posterior: [0.01, 0.02, 0.95, 0.02] as const };
    const item = mkItem({});
    expect(expectedGain(flat, item)).toBeGreaterThan(expectedGain(sharp, item));
  });

  test("an aligned item gains more than a cross-facet one", () => {
    const cell = emptyCell("c", "production", "surface");
    expect(expectedGain(cell, mkItem({ kind: "exec", facet: "production" })))
      .toBeGreaterThan(expectedGain(cell, mkItem({ kind: "mcq", facet: "recognition" })));
  });
});

describe("nextItem", () => {
  const pool = [
    mkItem({ id: "a", facet: "production", kind: "exec" }),
    mkItem({ id: "b", facet: "recognition", kind: "mcq" }),
    mkItem({ id: "c2", facet: "mechanism", kind: "predict" }),
  ];

  test("returns null when every candidate cell is settled", () => {
    const cells = new Map<CellKey, Cell>();
    for (const f of ["recognition", "mechanism", "production"] as const) {
      cells.set(cellKey("c", f), { ...emptyCell("c", f, "surface"), items: 3 });
    }
    expect(
      nextItem({ index: indexPool(pool), cells, candidates: ["c"], bandOf, askedIds: new Set(), recentKinds: [] }),
    ).toBeNull();
  });

  test("never repeats an item already asked", () => {
    const asked = new Set(["a", "b"]);
    const picked = nextItem({
      index: indexPool(pool), cells: base(), candidates: ["c"], bandOf, askedIds: asked, recentKinds: [],
    });
    expect(picked?.id).toBe("c2");
  });

  test("refuses a third consecutive item of the same kind", () => {
    const picked = nextItem({
      index: indexPool(pool), cells: base(), candidates: ["c"], bandOf, askedIds: new Set(), recentKinds: ["exec", "exec"],
    });
    expect(picked?.kind).not.toBe("exec");
  });

  test("prefers the item with the best gain per minute", () => {
    const cheap = mkItem({ id: "cheap", estMin: 2, kind: "predict", facet: "mechanism" });
    const dear = mkItem({ id: "dear", estMin: 30, kind: "predict", facet: "mechanism" });
    const picked = nextItem({
      index: indexPool([dear, cheap]), cells: base(), candidates: ["c"], bandOf, askedIds: new Set(), recentKinds: [],
    });
    expect(picked?.id).toBe("cheap");
  });
});

describe("nextItem at scale", () => {
  test("stays fast against a corpus-sized pool instead of scanning it per cell", () => {
    const CONCEPT_COUNT = 1500;
    const ITEM_COUNT = 5000;
    const FACETS_CYCLE: Facet[] = ["recognition", "mechanism", "production"];
    const KINDS_CYCLE: ItemKind[] = ["mcq", "predict", "debug", "review", "exec", "explain"];
    const concepts = Array.from({ length: CONCEPT_COUNT }, (_, i) => `concept-${i}`);

    const pool: AssessItem[] = Array.from({ length: ITEM_COUNT }, (_, i) => {
      const primary = concepts[i % CONCEPT_COUNT];
      const secondary = concepts[(i + 1) % CONCEPT_COUNT];
      return mkItem({
        id: `item-${i}`,
        facet: FACETS_CYCLE[i % FACETS_CYCLE.length],
        kind: KINDS_CYCLE[i % KINDS_CYCLE.length],
        // A slice of items are multi-concept, same as the real corpus.
        concepts: i % 5 === 0 ? [primary, secondary] : [primary],
        estMin: 2 + (i % 10),
      });
    });

    const index = indexPool(pool);
    // Scope the whole concept set, as a full audit would.
    const candidates = concepts;

    const start = performance.now();
    const picked = nextItem({ index, cells: base(), candidates, bandOf, askedIds: new Set(), recentKinds: [] });
    const elapsedMs = performance.now() - start;

    expect(picked).not.toBeNull();
    // Generous budget: the point is catching a return to O(cells * pool) scanning,
    // not pinning an exact number. A per-cell pool scan of this size would take
    // seconds; an indexed lookup should land in low single-digit milliseconds.
    expect(elapsedMs).toBeLessThan(500);
  });
});
