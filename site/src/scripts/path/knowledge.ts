// site/src/scripts/path/knowledge.ts
import type { KnowledgeState, ConceptMastery, Source } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

const DAY = 86_400_000;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const PROP_UP_FACTOR = 0.8; // share of a passed concept's confidence granted to prereqs
export const PASS_HIGH = 0.6;      // >= => "passed", propagate up-closure lift
export const FAIL_LOW = 0.4;       // <  => "failed", propagate down to dependents
const FRESH_DAYS = 30, STALE_DAYS = 120;
// "assess" (site/src/scripts/assess/report.ts's toKnowledgeWrites, applied via
// assess-apply-knowledge.ts) joins STRONG/STUDY_PROTECTED alongside diagnostic/
// declared: a /assess run is a deliberate, multi-item Bayesian measurement, not
// an inferred activity signal, and deserves the same immunity from being
// silently overwritten or relabelled by incidental practice/review/struggle
// evidence that diagnostic/declared already have. Concretely: touching one
// practice task in a lesson must not erase (or restamp the source of) a gap
// /assess just measured for that lesson's concepts — see the note this closes
// in task-11-report.md, and the C1/C2 fix in task-12-report.md.
//
// Assess is intentionally NOT given special-case immunity inside applyDiagnostic
// itself — a fresh diagnostic (e.g. /calibrate) and a fresh assess run are both
// deliberate re-measurements of the SAME concept, and either should be allowed
// to supersede the other; the asymmetric protection here is about incidental
// activity/review/struggle signals never being able to override a deliberate
// measurement, not about which deliberate measurement wins over another.
const STRONG: Source[] = ["diagnostic", "declared", "assess"];
// Study-activity must not overwrite review evidence (review > activity). Kept separate from STRONG
// so applyDiagnostic's propagation and applyPracticeStruggle's erosion guard are unchanged.
//
// NOTE: "assess" is intentionally absent. With D1's explicit-concepts grounding the evidence
// model (REPLAN-BRIEF C1-C3), a genuine assess result is now trustworthy enough to stand on
// its own without this extra protection; the reverse — an incidental review or activity writing
// on top of a deliberate assessment — is what this guard prevents.
const STUDY_PROTECTED: Source[] = ["diagnostic", "declared", "review"];

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

// Reading + graded-practice evidence for a unit's taught concepts. `touchedFrac` = share of the
// unit's lessons with any practice interaction, `doneFrac` = share with ≥1 task completed.
// Target = wLessons*touchedFrac + wPractice*doneFrac: with the default weights (0.35/0.4),
// reading alone stays below masteryThreshold (shaky), reading + passing practice crosses it —
// graded practice is objective enough to retire a unit from the path without a quick-check.
export function applyStudyEvidence(
  state: KnowledgeState, taught: string[], touchedFrac: number, doneFrac: number,
  wLessons: number, wPractice: number, now: number,
): KnowledgeState {
  let next = state;
  const target = clamp01(wLessons * clamp01(touchedFrac) + wPractice * clamp01(doneFrac));
  for (const c of taught) {
    const cur = next.get(c);
    if (cur && STUDY_PROTECTED.includes(cur.source)) continue;     // never override stronger evidence
    if (masteryOf(next, c) >= target) continue;           // never lower
    next = setMastery(next, c, { confidence: target, source: "activity", lastAt: now });
  }
  return next;
}

// Downward mirror of applyStudyEvidence: a unit whose practice the learner repeatedly flunks is
// weaker than reading-evidence alone implied, so lower its taught concepts toward `floor` by
// struggleFrac*weight. Only activity-sourced (or absent-but-present) confidence is eroded — a
// diagnostic or declared concept is stronger evidence and is never touched, and confidence is
// never raised (target only applies when it is below the current value). An absent concept stays
// absent (we never lift 0 → floor). Immutable; returns the same reference when nothing changes.
export function applyPracticeStruggle(
  state: KnowledgeState, taught: string[], struggleFrac: number, floor: number, weight: number, now: number,
): KnowledgeState {
  if (struggleFrac <= 0) return state;
  let next = state;
  const drop = clamp01(struggleFrac) * weight;
  for (const c of taught) {
    const cur = next.get(c);
    if (!cur) continue;                          // absent — never lift 0 toward the floor
    if (STRONG.includes(cur.source)) continue;   // never erode stronger evidence
    if (cur.source !== "activity") continue;     // only activity-sourced confidence is eroded
    const target = Math.max(floor, cur.confidence - drop);
    if (target >= cur.confidence) continue;      // never raise
    next = setMastery(next, c, { confidence: target, source: "activity", lastAt: now });
  }
  return next;
}

// Aggregate review-health evidence for a unit's taught concepts. `healthFrac` in [0,1] is the share
// of the unit's reviewed cards in good standing. Like applyStudyEvidence, lift toward
// healthFrac*weight with source "review" (mid-tier: overrides activity, never diagnostic/declared,
// no DAG propagation). Unlike study, a low healthFrac also ERODES review/activity confidence toward
// `floor` — event-driven forgetting evidence, distinct from decay()'s age-driven read-model.
export function applyReviewEvidence(
  state: KnowledgeState, taught: string[], healthFrac: number, weight: number, floor: number, now: number,
): KnowledgeState {
  let next = state;
  const target = clamp01(clamp01(healthFrac) * weight);
  for (const c of taught) {
    const cur = next.get(c);
    if (cur && STRONG.includes(cur.source)) continue;            // diagnostic/declared are immune
    const m = masteryOf(next, c);
    if (target > m) {
      next = setMastery(next, c, { confidence: target, source: "review", lastAt: now });
    } else if (cur && (cur.source === "review" || cur.source === "activity")) {
      const lowered = Math.max(floor, target);                   // forgetting: erode toward floor
      if (lowered < cur.confidence) {
        next = setMastery(next, c, { confidence: lowered, source: "review", lastAt: now });
      }
    }
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
