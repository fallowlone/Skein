import type { PracticeTaskData } from "~/content.config";

export type Outcome = "pass" | "partial" | "fail";
export interface SessionItem { lessonKey: string; task: PracticeTaskData; }
export interface PracticeEntryLite { id: string; tasks: PracticeTaskData[]; }

// Graded task types the LLM grader (gradePractice) + GradeWithAi support.
const GRADED_TYPES = new Set(["design", "incident", "diagnose"]);

/** Curate the interview session: graded tasks from the interview-framework lessons,
 *  stable-ordered, capped. Pure — entries come from the practice content collection at build. */
export function buildSession(
  entries: PracticeEntryLite[],
  opts: { includePrefixes?: string[]; max?: number } = {},
): SessionItem[] {
  const prefixes = opts.includePrefixes ?? ["system-design/09-interview-framework/"];
  const max = opts.max ?? 8;
  const out: SessionItem[] = [];
  for (const e of entries) {
    if (!prefixes.some((p) => e.id.startsWith(p))) continue;
    for (const task of e.tasks) {
      if (!GRADED_TYPES.has(task.type)) continue;
      out.push({ lessonKey: e.id, task });
    }
  }
  out.sort((a, b) => (a.lessonKey + "::" + a.task.id).localeCompare(b.lessonKey + "::" + b.task.id));
  return out.slice(0, Math.max(0, max));
}

const WEIGHT: Record<Outcome, number> = { pass: 1, partial: 0.5, fail: 0 };

/** Interview readiness 0–100 from per-task self/graded outcomes. */
export function readinessScore(outcomes: Outcome[]): number {
  if (!outcomes.length) return 0;
  return (outcomes.reduce((s, o) => s + WEIGHT[o], 0) / outcomes.length) * 100;
}
