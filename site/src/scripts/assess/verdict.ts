// site/src/scripts/assess/verdict.ts
// Cells → a per-concept verdict. Pure.
import { bandLabel, entropyOrd, expectedLevel, type BandLabel } from "./ordinal";
import { FACETS, cellKey, type Cell, type CellKey, type Facet } from "./types";

/**
 * Entropy below which a cell stops being asked about. Tuned by the simulation harness
 * (Task 10) — the loosest threshold that still clears the band-recovery gate.
 */
export const SETTLE_ENTROPY = 0.55;
export const MAX_ITEMS_PER_CELL = 3;

export function isSettled(cell: Cell): boolean {
  return cell.items >= MAX_ITEMS_PER_CELL || entropyOrd(cell.posterior) <= SETTLE_ENTROPY;
}

export interface FacetVerdict {
  status: "measured" | "untested";
  band: BandLabel | null;
  items: number;
  fragile: boolean;
  declined: number;
}

export interface ConceptVerdict {
  conceptId: string;
  status: "measured" | "untested";
  /** Minimum across measured facets. Null when nothing was measured. */
  band: BandLabel | null;
  facets: Record<Facet, FacetVerdict>;
  fragile: boolean;
  evidenceCount: number;
}

function facetVerdict(cell: Cell | undefined): FacetVerdict {
  if (!cell || cell.items === 0) {
    return { status: "untested", band: null, items: 0, fragile: false, declined: 0 };
  }
  const fragile = cell.evidence.some((e) => e.response.outcome === "correct" && e.response.hintsUsed >= 2);
  const declined = cell.evidence.filter((e) => e.response.outcome === "dont_know").length;
  return { status: "measured", band: bandLabel(cell.posterior), items: cell.items, fragile, declined };
}

export function conceptVerdict(cells: ReadonlyMap<CellKey, Cell>, conceptId: string): ConceptVerdict {
  const facets = Object.fromEntries(
    FACETS.map((f) => [f, facetVerdict(cells.get(cellKey(conceptId, f)))]),
  ) as Record<Facet, FacetVerdict>;

  const measured = FACETS.filter((f) => facets[f].status === "measured");
  if (measured.length === 0) {
    return { conceptId, status: "untested", band: null, facets, fragile: false, evidenceCount: 0 };
  }

  // A hole in any facet is a hole: the concept's band is the weakest measured facet.
  let worst: Facet = measured[0];
  for (const f of measured) {
    const cur = cells.get(cellKey(conceptId, f))!;
    const best = cells.get(cellKey(conceptId, worst))!;
    if (expectedLevel(cur.posterior) < expectedLevel(best.posterior)) worst = f;
  }
  return {
    conceptId,
    status: "measured",
    band: facets[worst].band,
    facets,
    fragile: measured.some((f) => facets[f].fragile),
    evidenceCount: measured.reduce((n, f) => n + facets[f].items, 0),
  };
}
