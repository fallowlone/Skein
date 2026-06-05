// site/src/scripts/path/knowledge.ts
import type { KnowledgeState, ConceptMastery, Source } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

const DAY = 86_400_000;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const ACTIVITY_CAP = 0.5;   // activity alone can't exceed this
export const PROP_UP_FACTOR = 0.8; // share of a passed concept's confidence granted to prereqs
export const PASS_HIGH = 0.6;      // >= => "passed", propagate up-closure lift
export const FAIL_LOW = 0.4;       // <  => "failed", propagate down to dependents
const FRESH_DAYS = 30, STALE_DAYS = 120;
const STRONG: Source[] = ["diagnostic", "declared"];

export const emptyState = (): KnowledgeState => new Map();

export function masteryOf(state: KnowledgeState, concept: string): number {
  return state.get(concept)?.confidence ?? 0;
}
export const isKnown = (state: KnowledgeState, concept: string, threshold: number): boolean =>
  masteryOf(state, concept) >= threshold;

function setMastery(state: KnowledgeState, id: string, m: ConceptMastery): KnowledgeState {
  const next = new Map(state);
  next.set(id, m);
  return next;
}

// Records a diagnostic outcome and propagates through the concept DAG:
//  - correctFrac >= PASS_HIGH: lift every prereq (ancestor) to correctFrac*PROP_UP_FACTOR.
//    Passing a harder concept is strong evidence its prereqs are known, so lifted ancestors
//    carry source "diagnostic" — weaker activity won't override them, but a later direct
//    diagnostic (or decay) still can. This is what lets the planner skip already-mastered prereqs.
//  - correctFrac < FAIL_LOW: lower every dependent (descendant) to correctFrac.
//  - FAIL_LOW <= correctFrac < PASS_HIGH (ambiguous band): set the focal concept only, no propagation.
export function applyDiagnostic(
  state: KnowledgeState, g: ConceptGraph, concept: string, correctFrac: number, now: number,
): KnowledgeState {
  let next = setMastery(state, concept, { confidence: clamp01(correctFrac), source: "diagnostic", lastAt: now });
  if (correctFrac >= PASS_HIGH) {
    const lift = correctFrac * PROP_UP_FACTOR;
    for (const a of ancestors(g, concept)) {
      if (masteryOf(next, a) < lift) next = setMastery(next, a, { confidence: lift, source: "diagnostic", lastAt: now });
    }
  } else if (correctFrac < FAIL_LOW) {
    for (const d of descendants(g, concept)) {
      if (masteryOf(next, d) > correctFrac) next = setMastery(next, d, { confidence: clamp01(correctFrac), source: "diagnostic", lastAt: now });
    }
  }
  return next;
}

export function applyActivity(state: KnowledgeState, taught: string[], weight: number, now: number): KnowledgeState {
  let next = state;
  const target = clamp01(ACTIVITY_CAP * clamp01(weight));
  for (const c of taught) {
    const cur = next.get(c);
    if (cur && STRONG.includes(cur.source)) continue;     // never override stronger evidence
    if (masteryOf(next, c) >= target) continue;           // never lower
    next = setMastery(next, c, { confidence: target, source: "activity", lastAt: now });
  }
  return next;
}

export function applySelfDeclare(state: KnowledgeState, concept: string, known: boolean, now: number): KnowledgeState {
  return setMastery(state, concept, { confidence: known ? 1 : 0, source: "declared", lastAt: now });
}

// Time decay, applied uniformly to ALL sources (including `declared`): confidence lerps from
// its current value toward `floor` as age goes FRESH_DAYS -> STALE_DAYS (inclusive closed
// interval). Never raises; a confidence already <= floor is left untouched.
export function decay(state: KnowledgeState, _g: ConceptGraph, now: number, floor: number): KnowledgeState {
  const next = new Map<string, ConceptMastery>();
  for (const [id, m] of state) {
    const days = (now - m.lastAt) / DAY;
    let factor = 1;
    if (days >= STALE_DAYS) factor = 0;
    else if (days > FRESH_DAYS) factor = 1 - (days - FRESH_DAYS) / (STALE_DAYS - FRESH_DAYS);
    const confidence = floor + (m.confidence - floor) * factor;
    next.set(id, { ...m, confidence: m.confidence <= floor ? m.confidence : confidence });
  }
  return next;
}
