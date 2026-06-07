import { describe, it, expect } from "vitest";
import { CATEGORY_OF, CATEGORIES, groupAchievements, tally } from "./achievement-view";
import { ACHIEVEMENTS } from "./achievements";

describe("CATEGORY_OF", () => {
  it("maps every achievement id exactly once to a known category", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const id of ids) expect(CATEGORIES).toContain(CATEGORY_OF[id]);
    expect(Object.keys(CATEGORY_OF).sort()).toEqual([...ids].sort());
  });
});

describe("groupAchievements + tally", () => {
  const earned = new Set(["first-steps", "drill-rookie"]);
  const dates = { "first-steps": 1_700_000_000_000 };
  it("groups by category with earned/total counts and dates", () => {
    const groups = groupAchievements(earned, dates, "en");
    const mastery = groups.find((g) => g.category === "mastery")!;
    expect(mastery.marks.some((m) => m.id === "first-steps" && m.earned && m.date === 1_700_000_000_000)).toBe(true);
    const drills = groups.find((g) => g.category === "drills")!;
    expect(drills.earned).toBe(1);
    expect(drills.total).toBeGreaterThan(1);
    expect(drills.marks.find((m) => m.id === "drill-rookie")!.date).toBeNull();
  });
  it("tally counts earned over the full set", () => {
    expect(tally(earned)).toEqual({ earned: 2, total: ACHIEVEMENTS.length });
  });
  it("only returns categories that have marks", () => {
    expect(groupAchievements(new Set(), {}, "en").every((g) => g.total > 0)).toBe(true);
  });
});
