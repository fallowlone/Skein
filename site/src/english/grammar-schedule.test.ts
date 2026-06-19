import { describe, it, expect } from "vitest";
import { forecastGrammarPlan, dailyBudgetMinutes } from "./grammar-schedule";
import type { GrammarPlan, GrammarStep } from "./grammar-plan";
import type { GrammarGoal } from "./state";

const DAY = 86_400_000;
// Mon 2025-01-06 00:00 UTC
const MON = Date.UTC(2025, 0, 6);
const learn = (id: string, est: number, value = 10): GrammarStep =>
  ({ topicId: id, cefr: "B1", kind: "learn", reason: { en: "", ru: "" }, estMin: est, value });
const plan = (steps: GrammarStep[]): GrammarPlan => ({ steps, today: [], currentBand: "B1", targetCefr: "B2" });
const goal = (over: Partial<GrammarGoal> = {}): GrammarGoal =>
  ({ targetCefr: "B2", deadlineMs: MON + 6 * DAY, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0, ...over });

describe("dailyBudgetMinutes", () => {
  it("reads the weekday slot (Monday → 60)", () => expect(dailyBudgetMinutes(goal(), MON)).toBe(60));
  it("0 on a day-off weekday (Saturday)", () => expect(dailyBudgetMinutes(goal(), MON + 5 * DAY)).toBe(0));
});

describe("forecastGrammarPlan", () => {
  it("fits when required ≤ available", () => {
    const f = forecastGrammarPlan(plan([learn("a", 30)]), goal({ deadlineMs: MON + 1 * DAY, perWeekdayHours: [0.583,0,0,0,0,0,0] }), MON);
    expect(f.verdict).toBe("fits"); expect(f.requiredMin).toBe(30);
  });
  it("over when required exceeds available, and suggests drops", () => {
    const f = forecastGrammarPlan(plan([learn("a", 5000), learn("b", 5000, 1)]), goal(), MON);
    expect(f.verdict).toBe("over"); expect(f.dropped.length).toBeGreaterThan(0);
  });
  it("counts down inclusive of the deadline day", () => {
    const f = forecastGrammarPlan(plan([learn("a", 10)]), goal(), MON);
    expect(f.countdownDays).toBe(6);
  });
});
