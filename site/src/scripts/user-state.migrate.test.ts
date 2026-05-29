import { describe, it, expect } from "vitest";
import { migratePretest, defaultProgression } from "./user-state";

describe("user-state migration", () => {
  it("upgrades a legacy flat pretest to a stage-1-only result", () => {
    const legacy = { takenAt: 100, score: 6, answers: [3, 3] } as any;
    const r = migratePretest(legacy, 6)!;
    expect(r.stage1.score).toBe(6);
    expect(r.rating).toBe(750);
    expect(r.stage2).toBeUndefined();
    expect(typeof r.rank).toBe("string");
    expect(r.confidence).toBeDefined();
  });
  it("passes through an already-migrated result unchanged", () => {
    const modern = { takenAt: 1, stage1: { score: 3, answers: [1] }, rating: 375, rank: "practitioner-2", confidence: "high" } as any;
    expect(migratePretest(modern, 6)).toBe(modern);
  });
  it("defaultProgression is zeroed", () => {
    const p = defaultProgression();
    expect(p.xp).toBe(0); expect(p.level).toBe(1);
    expect(p.achievements).toEqual({}); expect(p.streak.count).toBe(0);
  });
});
