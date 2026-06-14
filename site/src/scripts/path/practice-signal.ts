// site/src/scripts/path/practice-signal.ts
// Pure aggregation of the local practice-attempts store into per-unit done/struggle shares.
// Mirrors the touched/done set-building of path-io's unitPracticeFractions, but reads the
// graded outcomes store (practice-state's AttemptRec) instead of the seen|attempted|done status:
// a lesson "struggled" when any of its tasks was attempted but never passed, or last failed.
// The struggle share feeds applyPracticeStruggle (knowledge.ts) to lower over-confident units.
// See docs/superpowers/plans/2026-06-14-adaptive-path-engine.md §A.
import type { AttemptRec } from "~/scripts/practice-state";

export type { AttemptRec };

// A task is "struggling" when the learner attempted it but never passed, or its latest run failed.
const taskStruggled = (r: AttemptRec): boolean => (r.attempts > 0 && r.passes === 0) || r.lastResult === "fail";
const taskDone = (r: AttemptRec): boolean => r.passes > 0;

export function unitStruggleFractions(
  attempts: Map<string, Record<string, AttemptRec>>,
  lessonCounts: Map<string, number>,
): Map<string, { doneFrac: number; struggleFrac: number }> {
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
    const recs = Object.values(tasks ?? {});
    if (!recs.length) continue;
    add(touched, unitId, lesson);
    if (recs.some(taskDone)) add(done, unitId, lesson);
    if (recs.some(taskStruggled)) add(struggled, unitId, lesson);
  }
  const out = new Map<string, { doneFrac: number; struggleFrac: number }>();
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
