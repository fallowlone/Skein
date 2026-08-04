// site/src/scripts/assess/ungrounded-gap.ts
// Whether a (concept, facet) pair with no direct evidence would read as a gap under the raw
// posterior math. Used by the simulation harness's gapsWithoutEvidence gate (simulate.ts) and
// by the band-coverage tests in simulate.test.ts. Pure.
import { bandLabel } from "./ordinal";
import { emptyCell } from "./update";
import type { Band, Cell, Facet } from "./types";

/**
 * A (concept, facet) pair carries no direct evidence when either no cell exists for it yet,
 * or a cell exists but only from cross-facet damping (items === 0). This checks whether the
 * SAME statistic the report uses to label a MEASURED cell (`bandLabel`) would call such a pair
 * a gap — deliberately bypassing `verdict.ts`'s own `items === 0 → "untested"` guard
 * (`facetVerdict`) to look at the raw posterior math underneath it.
 *
 * What this establishes, precisely, and what it does NOT: at `band: "surface"` — the only band
 * `runSimulation` exercises — the prior/posterior math itself never reads as a gap for an
 * untested cell, so `gapsWithoutEvidence === 0` there is a genuine property of the math, not
 * just of the guard. It is NOT a general proof for every band: `priorFromBand("middle" |
 * "advanced", facet)` already modes to `"gap"` for most facets before any evidence at all
 * (e.g. `advanced/production` → `[0.617, 0.245, 0.102, 0.035]`, labelled "gap+"). At those two
 * bands the untested-never-a-gap invariant holds ONLY because `facetVerdict`'s `items === 0`
 * guard short-circuits before ever calling `bandLabel` on an untested cell — not because the
 * posterior math agrees with it. See the "ungrounded-gap coverage across bands" tests in
 * simulate.test.ts, which exercise this function across all four bands directly against both
 * this raw check and the real reporting path (`conceptVerdict`), and assert that split
 * explicitly rather than papering over it.
 */
export function isUngroundedGap(cell: Cell | undefined, conceptId: string, facet: Facet, band: Band): boolean {
  if (cell && cell.items > 0) return false;
  const posterior = cell ? cell.posterior : emptyCell(conceptId, facet, band).posterior;
  return bandLabel(posterior).level === "gap";
}
