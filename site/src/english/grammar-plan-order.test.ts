// src/english/grammar-plan-order.test.ts
import { describe, it, expect } from "vitest";
import { buildGrammarPlan, stepValue, type PlanTopic } from "./grammar-plan";
import type { GrammarCoverage } from "./grammar-coverage";
import type { GrammarGoal } from "./state";
import type { CardState } from "./scheduler/types";

const NOW = 1_800_000_000_000, DAY = 86_400_000;
const goal: GrammarGoal = { targetCefr: "B2", deadlineMs: NOW + 60 * DAY, perWeekdayHours: [1,1,1,1,1,0,0], tzOffsetMin: 0 };
const T = (id: string, cefr: PlanTopic["cefr"], over: Partial<PlanTopic> = {}): PlanTopic =>
  ({ id, title: { en: id, ru: id }, cefr, levels: [cefr], egp: [], related: [], ...over });
const cov = (missing: string[]): GrammarCoverage =>
  ({ bands: [{ cefr: "A2", total: 9, covered: 0, waived: 0, missing, pct: 0 }], overallPct: 0, missingTotal: missing.length });

describe("stepValue", () => {
  it("scores coverage-gap topics above non-gap peers", () => {
    const miss = new Set(["egp.1"]);
    const hi = stepValue(T("a", "A2", { egp: ["egp.1"] }), undefined, miss, "B2", NOW);
    const lo = stepValue(T("b", "A2", { egp: ["egp.9"] }), undefined, miss, "B2", NOW);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("ordering + today cap", () => {
  const build = (topics: PlanTopic[], cardOf: (id: string) => CardState | undefined, missing: string[], dailyBudgetMin: number) =>
    buildGrammarPlan({ topics, cardOf, coverage: cov(missing), placementBand: "A2", goal, dailyBudgetMin, now: NOW });

  it("reviews come before learn steps", () => {
    const due: CardState = { due: NOW - DAY, reps: 3, scheduled_days: 8 } as unknown as CardState;
    const plan = build([T("learn", "A2"), T("rev", "A2")], (id) => (id === "rev" ? due : undefined), [], 999);
    expect(plan.steps[0].kind).toBe("review");
  });
  it("higher-value topic sorts first within a band", () => {
    const plan = build([T("low", "A2", { egp: ["x"] }), T("high", "A2", { egp: ["egp.1"] })], () => undefined, ["egp.1"], 999);
    const learns = plan.steps.filter((s) => s.kind === "learn").map((s) => s.topicId);
    expect(learns[0]).toBe("high");
  });
  it("is deterministic across recompute (stable id tiebreak)", () => {
    const mk = () => build([T("b", "A2"), T("a", "A2")], () => undefined, [], 999).steps.map((s) => s.topicId);
    expect(mk()).toEqual(mk());
  });
  it("today is the prefix that fits the daily budget", () => {
    // two A2 learn topics, estMin = 1*8+5 = 13 each; budget 20 fits exactly one.
    const plan = build([T("a", "A2"), T("b", "A2")], () => undefined, [], 20);
    expect(plan.today.length).toBe(1);
    expect(plan.steps.length).toBe(2);
  });
});
