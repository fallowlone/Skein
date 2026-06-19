import { describe, it, expect } from "vitest";
import { isMastered, estMin, type PlanTopic } from "./grammar-plan";
import type { CardState } from "./scheduler/types";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;
const card = (over: Partial<CardState>): CardState =>
  ({ due: NOW + 30 * DAY, reps: 5, scheduled_days: 30, ...over } as unknown as CardState);

const topic = (over: Partial<PlanTopic>): PlanTopic =>
  ({ id: "t", title: { en: "", ru: "" }, cefr: "B1", levels: ["B1"], egp: [], related: [], ...over });

describe("isMastered", () => {
  it("false when no card", () => expect(isMastered(undefined, NOW)).toBe(false));
  it("false when never reviewed", () => expect(isMastered(card({ reps: 0 }), NOW)).toBe(false));
  it("false when interval below 21d", () => expect(isMastered(card({ scheduled_days: 10 }), NOW)).toBe(false));
  it("false when mature but currently due", () => expect(isMastered(card({ scheduled_days: 30, due: NOW - DAY }), NOW)).toBe(false));
  it("true when mature and not due", () => expect(isMastered(card({ scheduled_days: 30, due: NOW + DAY }), NOW)).toBe(true));
});

describe("estMin", () => {
  it("counts authored levels up to target × 8 + 5 practice", () =>
    expect(estMin(topic({ levels: ["B1", "B2"] }), "B2")).toBe(2 * 8 + 5));
  it("excludes levels above target", () =>
    expect(estMin(topic({ levels: ["B1", "B2", "C1"] }), "B2")).toBe(2 * 8 + 5));
  it("at least one level always counts", () =>
    expect(estMin(topic({ levels: ["B1"] }), "B2")).toBe(1 * 8 + 5));
});
