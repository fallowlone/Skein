// Pure adaptive grammar planner. No I/O, no signals — mirrors grammar-coverage.ts.
// See docs/superpowers/specs/2026-06-19-english-grammar-study-planner-design.md.
import type { Bi } from "./types";
import type { Cefr } from "./grammar-types";
import { cefrIndex } from "./grammar-types";
import type { CardState } from "./scheduler/types";

// Cost model (tunable; single source for planner + forecaster).
const MIN_PER_LESSON = 8;
const MIN_PRACTICE = 5;
export const MIN_REVIEW = 3;
const MATURE_DAYS = 21; // mirrors the word/grammar mastery threshold in state.ts / ui.ts

export type PlanTopic = { id: string; title: Bi; cefr: Cefr; levels: Cefr[]; egp: string[]; related: string[] };
export type GrammarStepKind = "learn" | "review";
export type GrammarStep = { topicId: string; cefr: Cefr; kind: GrammarStepKind; reason: Bi; estMin: number; value: number };

/** Mastered = a started card whose interval reached MATURE_DAYS and is not currently due. */
export function isMastered(card: CardState | undefined, now: number): boolean {
  return !!card && card.reps > 0 && card.scheduled_days >= MATURE_DAYS && card.due > now;
}

/** Minutes to learn a topic: authored levels up to the target × per-lesson + one practice pass. */
export function estMin(topic: PlanTopic, targetCefr: Cefr): number {
  const ti = cefrIndex(targetCefr);
  const levels = topic.levels.filter((l) => cefrIndex(l) <= ti);
  const count = Math.max(1, levels.length);
  return count * MIN_PER_LESSON + MIN_PRACTICE;
}
