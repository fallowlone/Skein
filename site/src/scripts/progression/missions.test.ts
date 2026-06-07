import { describe, it, expect } from "vitest";
import { deriveMissions } from "./missions";
import type { DomainRating } from "./domain-ratings";

const dom = (key: string, score: number, known: number, total: number): DomainRating => ({ key, label: { en: key, ru: key }, hue: "--d-data", score, known, total });

describe("deriveMissions", () => {
  it("makes a weakest-domain gap mission and a streak mission", () => {
    const ms = deriveMissions({ domains: [dom("data", 20, 2, 10), dom("backend", 80, 8, 10)], streakCount: 5 });
    expect(ms[0].id).toBe("gap-data");
    expect(ms[0].done).toBe(2); expect(ms[0].total).toBe(10);
    expect(ms.find((m) => m.id === "streak-7")).toBeTruthy(); // next milestone above 5
  });
  it("drops the gap mission when every domain is complete", () => {
    const ms = deriveMissions({ domains: [dom("data", 100, 10, 10)], streakCount: 0 });
    expect(ms.some((m) => m.id.startsWith("gap-"))).toBe(false);
    expect(ms.find((m) => m.id === "streak-7")).toBeTruthy();
  });
  it("caps at 3 and never pads with empty-source missions", () => {
    const ms = deriveMissions({ domains: [], streakCount: 100 });
    expect(ms.length).toBeLessThanOrEqual(3);
    expect(ms.every((m) => m.total > 0)).toBe(true);
    expect(ms.find((m) => m.id === "streak-200")).toBeTruthy(); // next above 100
  });
  it("emits no streak mission past the last milestone", () => {
    const ms = deriveMissions({ domains: [], streakCount: 999 });
    expect(ms.some((m) => m.id.startsWith("streak-"))).toBe(false);
  });
});
