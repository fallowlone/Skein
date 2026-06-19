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

const W_GAP = 10, W_NOCARD = 30, W_WEAKCARD = 15, W_FOUND = 2;

export function stepValue(topic: PlanTopic, card: CardState | undefined, missing: Set<string>, targetCefr: Cefr, now: number): number {
  const gap = topic.egp.reduce((n, id) => n + (missing.has(id) ? 1 : 0), 0) * W_GAP;
  const weakness = card ? (isMastered(card, now) ? 0 : W_WEAKCARD) : W_NOCARD;
  const foundational = Math.max(0, cefrIndex(targetCefr) - cefrIndex(topic.cefr)) * W_FOUND;
  return gap + weakness + foundational;
}

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
    const allMastered = here.every((t) => isMastered(cardOf(t.id), now));
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
  const missing = new Set<string>(input.coverage.bands.flatMap((b) => b.missing));
  // assign value to learn steps (reviews stay 0 — they sort first by kind anyway)
  for (const s of steps) {
    if (s.kind !== "learn") continue;
    const t = topics.find((x) => x.id === s.topicId)!;
    s.value = stepValue(t, cardOf(s.topicId), missing, target, now);
  }
  const relatedOf = new Map(topics.map((t) => [t.id, t.related] as const));
  const present = new Set(steps.map((s) => s.topicId));
  // cluster key: smallest id among {self} ∪ related present in this step set — keeps confusables adjacent.
  const clusterKey = (id: string): string => {
    const rel = (relatedOf.get(id) ?? []).filter((r) => present.has(r));
    return [id, ...rel].sort()[0];
  };
  const kindRank = (k: GrammarStepKind) => (k === "review" ? 0 : 1);
  steps.sort((a, b) =>
    kindRank(a.kind) - kindRank(b.kind) ||
    cefrIndex(a.cefr) - cefrIndex(b.cefr) ||
    b.value - a.value ||
    clusterKey(a.topicId).localeCompare(clusterKey(b.topicId)) ||
    a.topicId.localeCompare(b.topicId),
  );
  const today: GrammarStep[] = [];
  let used = 0;
  for (const s of steps) {
    if (used + s.estMin > input.dailyBudgetMin) continue;
    today.push(s); used += s.estMin;
  }
  return { steps, today, currentBand: band, targetCefr: target };
}
