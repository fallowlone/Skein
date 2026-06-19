// Pure smoke test — no component render harness needed.
// Verifies that the planner + forecast modules produce valid output
// for the same props shape GrammarPlanner.tsx passes in.
import { describe, it, expect, beforeEach } from "vitest";
import { buildGrammarPlan, type PlanTopic } from "~/english/grammar-plan";
import { forecastGrammarPlan, dailyBudgetMinutes } from "~/english/grammar-schedule";
import { resetEnglish, setPlacement, setGrammarGoal, grammarCardOf, type GrammarGoal } from "~/english/state";
import type { GrammarCoverage } from "~/english/grammar-coverage";

const topics: PlanTopic[] = [
  { id: "present-simple", title: { en: "Present simple", ru: "Present simple" }, cefr: "A2", levels: ["A2"], egp: [], related: [] },
  { id: "past-simple", title: { en: "Past simple", ru: "Past simple" }, cefr: "A2", levels: ["A2"], egp: [], related: [] },
];

const coverage: GrammarCoverage = { bands: [], overallPct: 80, missingTotal: 2 };

const goal: GrammarGoal = {
  targetCefr: "B2",
  deadlineMs: Date.now() + 90 * 86_400_000,
  perWeekdayHours: [1, 1, 1, 1, 1, 0, 0],
  tzOffsetMin: 0,
};

describe("GrammarPlanner smoke (pure planner + forecast)", () => {
  beforeEach(() => {
    resetEnglish();
    setPlacement({ estimatedKnown: 0, band: "A2", takenAt: 0 }, []);
    setGrammarGoal(goal);
  });

  it("buildGrammarPlan produces today.length > 0 when budget is ample", () => {
    const now = Date.now();
    const dailyBudgetMin = dailyBudgetMinutes(goal, now);
    const plan = buildGrammarPlan({
      topics,
      cardOf: grammarCardOf,
      coverage,
      placementBand: "A2",
      goal,
      dailyBudgetMin: Math.max(60, dailyBudgetMin), // ensure budget isn't 0 (weekend)
      now,
    });
    expect(plan.today.length).toBeGreaterThan(0);
  });

  it("forecastGrammarPlan verdict is one of fits/under/over", () => {
    const now = Date.now();
    const dailyBudgetMin = dailyBudgetMinutes(goal, now);
    const plan = buildGrammarPlan({
      topics,
      cardOf: grammarCardOf,
      coverage,
      placementBand: "A2",
      goal,
      dailyBudgetMin: Math.max(60, dailyBudgetMin),
      now,
    });
    const forecast = forecastGrammarPlan(plan, goal, now);
    expect(["fits", "under", "over"]).toContain(forecast.verdict);
  });
});
