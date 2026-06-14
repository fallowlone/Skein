// site/src/scripts/path/do-now.ts
// Pure assembly of the "do this now" action list from the computed path, per-lesson status,
// per-concept mastery, and due review cards. Order: every due review first, then for the first
// `maxUnits` lead path units the next lesson that still has an unfinished task — picked at the
// adaptive difficulty tier. Deterministic and side-effect free; the impure adapter (path-io)
// supplies the resolvers. See docs/superpowers/plans/2026-06-14-adaptive-path-engine.md §C.
import { recommendTask } from "./difficulty";

export type DoNowKind = "review" | "lesson" | "task";

export interface DoNowItem {
  kind: DoNowKind;
  unit: string;
  lesson?: string;
  taskId?: string;
  difficulty?: string;
  reason: string;
}

// A lead unit is either a raw unit id or a PathStep-shaped object carrying `.unit`.
type LeadUnit = string | { unit: string };

export interface DoNowInput {
  leadUnits: LeadUnit[];
  unitLessons: Map<string, string[]>;          // unitId → ordered lesson keys
  lessonStatus: (lessonKey: string) => Record<string, string>; // taskId → "seen"|"attempted"|"done"
  mastery: (conceptOrUnit: string) => number;  // caller resolves a unit to its first-concept mastery
  threshold: number;                           // "known" cutoff (drives the difficulty tier)
  dueReviewKeys: { cardKey: string; lessonKey: string }[];
  tasksByLesson: (lessonKey: string) => { id: string; difficulty: string }[];
  maxUnits: number;                            // scan only the first N lead units for new work
}

const unitOf = (u: LeadUnit): string => (typeof u === "string" ? u : u.unit);
// lessonKey "<track>/<unit>/<lesson…>" → unit "<track>/<unit>"; "" when malformed.
const unitFromLesson = (lessonKey: string): string => {
  const seg = lessonKey.split("/");
  return seg.length < 3 ? "" : `${seg[0]}/${seg[1]}`;
};
// cardKey "<lessonKey>::practice::<taskId>" → taskId; undefined for non-practice keys.
const taskIdFromCard = (cardKey: string): string | undefined => {
  const i = cardKey.indexOf("::practice::");
  return i === -1 ? undefined : cardKey.slice(i + "::practice::".length);
};

export function buildDoNow(input: DoNowInput): DoNowItem[] {
  const items: DoNowItem[] = [];

  // 1. Due reviews, in the order supplied (review-state already sorts soonest-due first).
  for (const { cardKey, lessonKey } of input.dueReviewKeys) {
    items.push({
      kind: "review",
      unit: unitFromLesson(lessonKey),
      lesson: lessonKey,
      taskId: taskIdFromCard(cardKey),
      reason: "due-review",
    });
  }

  // 2. The next unfinished task in the first `maxUnits` lead units, at the adaptive tier.
  for (const lead of input.leadUnits.slice(0, Math.max(0, input.maxUnits))) {
    const unit = unitOf(lead);
    const lessons = input.unitLessons.get(unit) ?? [];
    const mastery = input.mastery(unit);
    for (const lessonKey of lessons) {
      const tasks = input.tasksByLesson(lessonKey);
      if (!tasks.length) continue;
      const status = input.lessonStatus(lessonKey);
      const next = recommendTask(tasks, mastery, input.threshold, status);
      if (!next) continue; // every task in this lesson is done — try the next lesson
      items.push({
        kind: "task",
        unit,
        lesson: lessonKey,
        taskId: next.id,
        difficulty: next.difficulty,
        reason: "next-task",
      });
      break; // one action per lead unit
    }
  }

  return items;
}
