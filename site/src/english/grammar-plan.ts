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

// ─── Step generation + band gating (Task 3) ──────────────────────────────────
import { isTopicDue } from "./grammar-mastery";
import type { GrammarCoverage } from "./grammar-coverage";
import { CEFR_ORDER } from "./grammar-types";
import type { GrammarGoal } from "./state";

export type GrammarPlan = { steps: GrammarStep[]; today: GrammarStep[]; currentBand: Cefr; targetCefr: Cefr };
export type BuildPlanInput = {
  topics: PlanTopic[]; cardOf: (id: string) => CardState | undefined; coverage: GrammarCoverage;
  placementBand: Cefr; goal: GrammarGoal; dailyBudgetMin: number; now: number;
};

const isReview = (card: CardState | undefined, now: number): boolean =>
  !!card && card.reps > 0 && isTopicDue(card, new Date(now));

/** Topics whose entry CEFR === band and are within target. */
const bandLearnTopics = (topics: PlanTopic[], band: Cefr, targetCefr: Cefr): PlanTopic[] =>
  topics.filter((t) => t.cefr === band && cefrIndex(t.cefr) <= cefrIndex(targetCefr));

/** Walk the band up from placement while every learn-eligible topic at the band is mastered. */
export function currentBand(
  topics: PlanTopic[], cardOf: (id: string) => CardState | undefined,
  placementBand: Cefr, targetCefr: Cefr, now: number,
): Cefr {
  let bi = cefrIndex(placementBand);
  const ti = cefrIndex(targetCefr);
  while (bi < ti) {
    const here = bandLearnTopics(topics, CEFR_ORDER[bi], targetCefr);
    const allMastered = here.length > 0 && here.every((t) => isMastered(cardOf(t.id), now));
    if (!allMastered) break;
    bi++;
  }
  return CEFR_ORDER[bi];
}

const reviewReason: Bi = { en: "Due for review", ru: "Пора повторить" };
const learnReason: Bi = { en: "New for your level", ru: "Новое для твоего уровня" };

export function buildGrammarPlan(input: BuildPlanInput): GrammarPlan {
  const { topics, cardOf, placementBand, goal, now } = input;
  const target = goal.targetCefr;
  const band = currentBand(topics, cardOf, placementBand, target, now);
  const bi = cefrIndex(band);
  const ti = cefrIndex(target);
  const steps: GrammarStep[] = [];

  for (const t of topics) {
    const card = cardOf(t.id);
    if (isReview(card, now)) {
      steps.push({ topicId: t.id, cefr: t.cefr, kind: "review", reason: reviewReason, estMin: MIN_REVIEW, value: 0 });
      continue;
    }
    if (isMastered(card, now)) continue;
    const ci = cefrIndex(t.cefr);
    if (ci > bi || ci > ti) continue; // hard band gate + target ceiling
    steps.push({ topicId: t.id, cefr: t.cefr, kind: "learn", reason: learnReason, estMin: estMin(t, target), value: 0 });
  }
  // value + deterministic ordering + today-cap arrive in Task 4.
  return { steps, today: [], currentBand: band, targetCefr: target };
}
