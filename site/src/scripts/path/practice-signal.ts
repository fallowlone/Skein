// site/src/scripts/path/practice-signal.ts
// Pure aggregation of the local practice-attempts store into per-unit done/struggle shares.
// Mirrors the touched/done set-building of path-io's unitPracticeFractions, but reads the
// graded outcomes store (practice-state's AttemptRec) instead of the seen|attempted|done status:
// a lesson "struggled" when any of its tasks was attempted but never passed, or last failed.
// The struggle share feeds applyPracticeStruggle (knowledge.ts) to lower over-confident units.
// See docs/superpowers/plans/2026-06-14-adaptive-path-engine.md §A.
import type { AttemptRec } from "~/scripts/practice-state";

export type { AttemptRec };

export interface StruggleFractions {
  doneFrac: number;
  struggleFrac: number;
}

// A task is "struggling" when the learner attempted it but never passed, or its latest run failed.
const taskStruggled = (r: AttemptRec): boolean => (r.attempts > 0 && r.passes === 0) || r.lastResult === "fail";
const taskDone = (r: AttemptRec): boolean => r.passes > 0;

export function unitStruggleFractions(
  attempts: Map<string, Record<string, AttemptRec>>,
  lessonCounts: Map<string, number>,
  opts: { includeConceptLinked?: boolean } = {},
): Map<string, StruggleFractions> {
  const done = new Map<string, Set<string>>();
  const struggled = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, unit: string, lesson: string) => {
    const s = m.get(unit) ?? new Set<string>();
    s.add(lesson);
    m.set(unit, s);
  };
  const touched = new Map<string, Set<string>>();
  for (const [lessonKey, tasks] of attempts) {
    const seg = lessonKey.split("/");
    if (seg.length < 3) continue; // lab keys and other non-lesson entries
    const unitId = `${seg[0]}/${seg[1]}`;
    const lesson = seg.slice(2).join("/");
    const recs = Object.values(tasks ?? {}).filter((r) => opts.includeConceptLinked !== false || !r.concepts?.length);
    if (!recs.length) continue;
    add(touched, unitId, lesson);
    if (recs.some(taskDone)) add(done, unitId, lesson);
    if (recs.some(taskStruggled)) add(struggled, unitId, lesson);
  }
  const out = new Map<string, StruggleFractions>();
  for (const [unitId] of touched) {
    const count = lessonCounts.get(unitId) ?? 0;
    if (!count) continue;
    out.set(unitId, {
      doneFrac: Math.min(1, (done.get(unitId)?.size ?? 0) / count),
      struggleFrac: Math.min(1, (struggled.get(unitId)?.size ?? 0) / count),
    });
  }
  return out;
}

/** Exact struggle signal for tasks that explicitly name the concepts they exercise.
 * Unannotated tasks are omitted so callers can keep the legacy unit-level fallback
 * without smearing an annotated failure across every concept in the lesson's unit. */
export function conceptStruggleFractions(
  attempts: Map<string, Record<string, AttemptRec>>,
): Map<string, StruggleFractions> {
  const touched = new Map<string, Set<string>>();
  const done = new Map<string, Set<string>>();
  const struggled = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, concept: string, task: string) => {
    const s = m.get(concept) ?? new Set<string>();
    s.add(task);
    m.set(concept, s);
  };

  for (const [lessonKey, tasks] of attempts) {
    for (const [taskId, rec] of Object.entries(tasks ?? {})) {
      if (!rec || rec.attempts <= 0 || !rec.concepts?.length) continue;
      const key = `${lessonKey}::${taskId}`;
      for (const concept of new Set(rec.concepts)) {
        add(touched, concept, key);
        if (taskDone(rec)) add(done, concept, key);
        if (taskStruggled(rec)) add(struggled, concept, key);
      }
    }
  }

  const out = new Map<string, StruggleFractions>();
  for (const [concept, tasks] of touched) {
    const total = tasks.size;
    if (!total) continue;
    out.set(concept, {
      doneFrac: (done.get(concept)?.size ?? 0) / total,
      struggleFrac: (struggled.get(concept)?.size ?? 0) / total,
    });
  }
  return out;
}
