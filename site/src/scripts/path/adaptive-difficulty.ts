// src/scripts/path/adaptive-difficulty.ts
//
// Performance-aware "do this next" for practice. The lesson page already knows the learner's own
// attempt record on THIS lesson's tasks (practice-state.readAttempts, keyed by lessonKey) — the
// cheapest, most direct assessment signal there is, with zero path-graph import (the lesson island
// must stay light). This module turns that record into a difficulty band and picks the matching
// open task, reusing the tested difficulty.ts selectors. With no attempts it falls back to the
// first open task in input order — byte-identical to the prior behaviour for new learners.
import { type Difficulty, pickDifficulty, recommendTask } from "./difficulty";

/** Mirror of practice-state.AttemptRec (kept local so this module stays pure and import-light). */
export interface TaskAttempt {
  attempts: number;
  passes: number;
  lastResult: "pass" | "fail";
  lastAt: number;
}

// A task tier is a ceiling on what success demonstrates: acing recall is useful evidence, but it
// must not instantly classify the learner as stretch-ready. Unknown tiers fall to the middle.
const TIER_CEILING: Record<string, number> = { recall: 0.34, apply: 0.66, stretch: 1 };
const MAX_ATTEMPT_WEIGHT = 5;
const RECENT_RESULT_WEIGHT = 0.25;

export interface LessonMastery {
  mastery: number; // [0,1] tier-weighted pass rate over attempted tasks
  evidence: number; // count of attempted tasks (0 ⇒ no signal)
}

/** Proxy mastery in [0,1] from the learner's pass record on this lesson's tasks. */
export function lessonMastery(
  tasks: ReadonlyArray<{ id: string; difficulty: string }>,
  attempts: Record<string, TaskAttempt>,
): LessonMastery {
  let num = 0;
  let den = 0;
  let evidence = 0;
  for (const t of tasks) {
    const a = attempts[t.id];
    if (!a || !Number.isFinite(a.attempts) || a.attempts <= 0) continue;
    evidence++;
    const total = Math.max(1, Math.round(a.attempts));
    const passes = Math.min(total, Math.max(0, Number.isFinite(a.passes) ? Math.round(a.passes) : 0));
    // Beta(1,1) smoothing prevents one lucky answer from producing 100% mastery. The latest
    // outcome gets a modest recency weight, so repeated new failures can reverse stale success.
    const historical = (passes + 1) / (total + 2);
    const recent = a.lastResult === "pass" ? 1 : 0;
    const success = historical * (1 - RECENT_RESULT_WEIGHT) + recent * RECENT_RESULT_WEIGHT;
    const reliability = Math.min(MAX_ATTEMPT_WEIGHT, total);
    const ceiling = TIER_CEILING[t.difficulty] ?? 0.5;
    num += ceiling * success * reliability;
    den += reliability;
  }
  return { mastery: den > 0 ? Math.min(1, Math.max(0, num / den)) : 0, evidence };
}

export interface NextRec {
  taskId: string | null;
  tier: Difficulty | null; // the mastery-derived band (null on the default/complete paths)
  reason: "performance" | "default" | "complete";
}

/**
 * Recommend the next practice task.
 * - With ≥ `minEvidence` attempted tasks: derive a difficulty band from the learner's observed
 *   pass rate and pick the matching open task (difficulty.ts handles the tier→task match + fallback).
 * - Otherwise: the first open task in input order (caller passes tasks display-ordered easiest-first),
 *   preserving the prior non-adaptive behaviour exactly.
 * `tasks` must be passed in display order so the default fallback is deterministic.
 */
export function recommendNext(
  tasks: ReadonlyArray<{ id: string; difficulty: string }>,
  status: Record<string, string>,
  attempts: Record<string, TaskAttempt>,
  threshold: number,
  minEvidence = 2,
): NextRec {
  const open = tasks.filter((t) => status[t.id] !== "done");
  if (!open.length) return { taskId: null, tier: null, reason: "complete" };

  const { mastery, evidence } = lessonMastery(tasks, attempts);
  if (evidence >= minEvidence) {
    // recommendTask re-filters by the same `status`, so with `open` non-empty (guarded above) it
    // always returns a task; the `?? open[0]` keeps this branch total even if that ever changes.
    const pick = recommendTask([...tasks], mastery, threshold, status);
    return { taskId: pick?.id ?? open[0].id, tier: pickDifficulty(mastery, threshold), reason: "performance" };
  }
  return { taskId: open[0].id, tier: null, reason: "default" };
}
