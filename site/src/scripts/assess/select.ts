// Which question to ask next. Pure: no storage, no clock.
import { likelihoodVector } from "./likelihood";
import { entropyOrd, normalize } from "./ordinal";
import { emptyCell } from "./update";
import { isSettled } from "./verdict";
import { FACETS, cellKey, type AssessItem, type Band, type Cell, type CellKey, type ItemKind, type Outcome } from "./types";

const OUTCOMES: Outcome[] = ["correct", "partial", "wrong", "dont_know"];

/**
 * Expected reduction in entropy from asking this item about this cell:
 *   H(prior) − Σ_outcome P(outcome) · H(posterior | outcome)
 */
export function expectedGain(cell: Cell, item: AssessItem, band: Band): number {
  const prior = cell.posterior;
  const before = entropyOrd(prior);
  let after = 0;
  for (const outcome of OUTCOMES) {
    const lik = likelihoodVector(item, { outcome, hintsUsed: 0, elapsedMs: 0 }, cell.facet, band);
    const joint = prior.map((p, i) => p * lik[i]);
    const pOutcome = joint.reduce((a, b) => a + b, 0);
    if (pOutcome <= 0) continue;
    after += pOutcome * entropyOrd(normalize(joint));
  }
  return Math.max(0, before - after);
}

/**
 * Every candidate item for one (concept, facet) cell, keyed the same way as `cells`.
 * Built once per pool so `nextItem` never re-filters the whole pool inside its per-cell
 * loop — on the full corpus (~6.5k items × ~14.7k cells) a re-scan is tens of millions of
 * element inspections per question, on the main thread, between every answer.
 */
export type PoolIndex = ReadonlyMap<CellKey, readonly AssessItem[]>;

export function indexPool(pool: readonly AssessItem[]): PoolIndex {
  const index = new Map<CellKey, AssessItem[]>();
  for (const item of pool) {
    for (const conceptId of item.concepts) {
      const key = cellKey(conceptId, item.facet);
      const bucket = index.get(key);
      if (bucket) bucket.push(item);
      else index.set(key, [item]);
    }
  }
  return index;
}

export interface SelectArgs {
  /** Built once via `indexPool(pool)`; each cell looks up only its own candidates. */
  index: PoolIndex;
  cells: ReadonlyMap<CellKey, Cell>;
  /** Concepts in scope, already ranked by the caller (keystone × goal relevance). */
  candidates: readonly string[];
  bandOf: (conceptId: string) => Band;
  askedIds: ReadonlySet<string>;
  /** Kinds of the last two items, newest last — used for the fatigue rule. */
  recentKinds: readonly ItemKind[];
}

/** Two of a kind in a row is a rhythm; three is a grind. */
function kindBlocked(recentKinds: readonly ItemKind[], kind: ItemKind): boolean {
  const last2 = recentKinds.slice(-2);
  return last2.length === 2 && last2.every((k) => k === kind);
}

export function nextItem({ index, cells, candidates, bandOf, askedIds, recentKinds }: SelectArgs): AssessItem | null {
  let best: { item: AssessItem; score: number } | null = null;

  for (const conceptId of candidates) {
    for (const facet of FACETS) {
      const key = cellKey(conceptId, facet);
      const cell = cells.get(key) ?? emptyCell(conceptId, facet, bandOf(conceptId));
      if (isSettled(cell)) continue;

      const bucket = index.get(key);
      if (!bucket) continue;

      for (const item of bucket) {
        if (askedIds.has(item.id)) continue;
        if (kindBlocked(recentKinds, item.kind)) continue;

        const score = (expectedGain(cell, item, bandOf(conceptId)) * item.weight) / Math.max(1, item.estMin);
        if (!best || score > best.score) best = { item, score };
      }
    }
  }
  return best?.item ?? null;
}
