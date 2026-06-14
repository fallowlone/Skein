// Pure placement-run controller: decides which concept to probe next and when the run ends.
// No I/O, no Date.now(), no React, no content singleton — every dependency is injected, so the
// whole termination logic is unit-testable in isolation (see placement-runner.test.ts).
//
// The full-coverage run ends when nextConcept() returns null, which is GUARANTEED to happen:
// a concept leaves the candidate pool once it is EITHER settled (variance < SETTLE_VAR) OR its
// question bank is exhausted (every item asked once). Since `candidates` is finite and the
// per-concept cursor only ever advances, the pool drains. A hard global cap (maxItems) is a
// belt-and-suspenders backstop against any future selection bug.
import { variance, expectedInfoGain, SETTLE_VAR, type Irt } from "./bayes";

// Global safety cap: the run terminates after this many items regardless of settling.
export const MAX_PLACEMENT_ITEMS = 40;

export interface RunnerDeps {
  /** Concept ids in scope for this run (already filtered to touched families). */
  candidates: string[];
  /** Number of diagnostic items available for a concept. */
  bankSize: (concept: string) => number;
  /** Domain family a concept belongs to (for the express per-family cap). */
  familyOf: (concept: string) => string;
  /** Concept-level IRT params, used to rank expected info-gain. */
  irtOf: (concept: string) => Irt;
  /** Express mode caps items per family; full mode runs to settle-or-exhaust. */
  express: boolean;
  expressPerFamily: number;
  maxItems: number;
}

export interface RunnerState {
  /** Current posterior P(known) per concept. */
  priors: Map<string, number>;
  /** Items asked per concept so far == index of the next unasked item (monotonic). */
  cursor: Map<string, number>;
  /** Items asked per family (drives the express cap). */
  famAsked: Map<string, number>;
  /** Total items asked across the whole run. */
  totalAsked: number;
}

export function initState(_deps: RunnerDeps, priors: Map<string, number>): RunnerState {
  return { priors: new Map(priors), cursor: new Map(), famAsked: new Map(), totalAsked: 0 };
}

const settled = (p: number): boolean => variance(p) < SETTLE_VAR;
const exhausted = (deps: RunnerDeps, st: RunnerState, id: string): boolean =>
  (st.cursor.get(id) ?? 0) >= deps.bankSize(id);
const familyCapped = (deps: RunnerDeps, st: RunnerState, id: string): boolean =>
  deps.express && (st.famAsked.get(deps.familyOf(id)) ?? 0) >= deps.expressPerFamily;

// Pick the unsettled, non-exhausted (and, in express, under-cap) concept whose next answer is
// expected to shed the most entropy. Returns null when the run is finished.
export function nextConcept(deps: RunnerDeps, st: RunnerState): string | null {
  if (st.totalAsked >= deps.maxItems) return null;
  let best: string | null = null;
  let bestGain = -1;
  for (const id of deps.candidates) {
    const p = st.priors.get(id) ?? 0.5;
    if (settled(p)) continue;
    if (exhausted(deps, st, id)) continue;
    if (familyCapped(deps, st, id)) continue;
    const gain = expectedInfoGain(p, deps.irtOf(id));
    if (gain > bestGain) {
      bestGain = gain;
      best = id;
    }
  }
  return best;
}

// Record that one item of `concept` was asked. `priorsAfter` is the caller's already-updated
// posterior map (focal Bayes step + any graph propagation). Returns a NEW state (immutable).
export function applyAsked(
  deps: RunnerDeps, st: RunnerState, concept: string, priorsAfter: Map<string, number>,
): RunnerState {
  const fam = deps.familyOf(concept);
  const cursor = new Map(st.cursor);
  cursor.set(concept, (cursor.get(concept) ?? 0) + 1);
  const famAsked = new Map(st.famAsked);
  famAsked.set(fam, (famAsked.get(fam) ?? 0) + 1);
  return { priors: new Map(priorsAfter), cursor, famAsked, totalAsked: st.totalAsked + 1 };
}
