import { describe, it, expect } from "vitest";
import { buildGrammarPlan, currentBand, type PlanTopic } from "./grammar-plan";
import type { GrammarCoverage } from "./grammar-coverage";
import type { GrammarGoal } from "./state";
import type { CardState } from "./scheduler/types";

const NOW = 1_800_000_000_000, DAY = 86_400_000;
const goal: GrammarGoal = { targetCefr: "B2", deadlineMs: NOW + 60 * DAY, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0 };
const emptyCov: GrammarCoverage = { bands: [], overallPct: 100, missingTotal: 0 };
const mature: CardState = { due: NOW + 30 * DAY, reps: 5, scheduled_days: 30 } as unknown as CardState;
const due: CardState = { due: NOW - DAY, reps: 4, scheduled_days: 9 } as unknown as CardState;
const T = (id: string, cefr: PlanTopic["cefr"], over: Partial<PlanTopic> = {}): PlanTopic =>
  ({ id, title: { en: id, ru: id }, cefr, levels: [cefr], egp: [], related: [], ...over });

const build = (topics: PlanTopic[], cardOf: (id: string) => CardState | undefined, placementBand: PlanTopic["cefr"]) =>
  buildGrammarPlan({ topics, cardOf, coverage: emptyCov, placementBand, goal, dailyBudgetMin: 999, now: NOW });

describe("band gate + step generation", () => {
  it("excludes learn steps above the current band (hard gate)", () => {
    const plan = build([T("a", "A2"), T("b", "B2")], () => undefined, "A2");
    const ids = plan.steps.map((s) => s.topicId);
    expect(ids).toContain("a"); expect(ids).not.toContain("b");
  });
  it("advances the band when all current-band topics are mastered", () => {
    const cardOf = (id: string) => (id === "a" ? mature : undefined);
    const plan = build([T("a", "A2"), T("b", "B1")], cardOf, "A2");
    expect(plan.currentBand).toBe("B1");
    expect(plan.steps.map((s) => s.topicId)).toContain("b");
  });
  it("surfaces a due started card as a review step regardless of band", () => {
    const cardOf = (id: string) => (id === "hi" ? due : undefined);
    const plan = build([T("hi", "B2")], cardOf, "A2");
    const step = plan.steps.find((s) => s.topicId === "hi");
    expect(step?.kind).toBe("review");
  });
  it("never lists a mastered topic as a learn step", () => {
    const plan = build([T("a", "A2")], () => mature, "A2");
    expect(plan.steps.find((s) => s.topicId === "a")).toBeUndefined();
  });
  it("respects the target ceiling", () => {
    const plan = build([T("a", "A2"), T("hi", "C1")], () => undefined, "B2");
    expect(plan.steps.map((s) => s.topicId)).not.toContain("hi");
  });
});

describe("currentBand", () => {
  it("stays at placement when current-band topics are unmastered", () => {
    expect(currentBand([T("a", "A2")], () => undefined, "A2", "B2", NOW)).toBe("A2");
  });
});
