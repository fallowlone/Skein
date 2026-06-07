import { describe, it, expect } from "vitest";
import { overviewCards } from "./overview";

const base = { streak: { count: 23, best: 61 }, due: 38, marks: { earned: 12, total: 112 } };

describe("overviewCards", () => {
  it("formats all six cards from real values", () => {
    const cs = overviewCards({ ...base, rank: { label: "Engineer III", rating: 470 }, cefr: "B1", goal: "Senior fullstack" });
    expect(cs).toHaveLength(6);
    const by = Object.fromEntries(cs.map((c) => [c.key, c]));
    expect(by.rank.value).toBe("Engineer III · 470");
    expect(by.cefr.value).toBe("B1");
    expect(by.goal.value).toBe("Senior fullstack");
    expect(by.streak.value).toBe("23");
    expect(by.due.value).toBe("38");
    expect(by.marks.value).toBe("12 / 112");
  });
  it("renders neutral (null) values when data is absent on a fresh account", () => {
    const cs = overviewCards({ ...base, streak: { count: 0, best: 0 }, due: 0, marks: { earned: 0, total: 112 } });
    const by = Object.fromEntries(cs.map((c) => [c.key, c]));
    expect(by.rank.value).toBeNull();
    expect(by.cefr.value).toBeNull();
    expect(by.goal.value).toBeNull();
    expect(by.streak.value).toBe("0");
    expect(by.due.value).toBe("0");
  });
  it("hrefs are locale-prefixed", () => {
    const cs = overviewCards({ ...base, rank: { label: "X", rating: 1 } });
    const by = Object.fromEntries(cs.map((c) => [c.key, c]));
    expect(by.rank.href("ru")).toBe("/ru/profile");
    expect(by.due.href("en")).toBe("/en/review");
    expect(by.cefr.href("en")).toBe("/en/english");
  });
});
