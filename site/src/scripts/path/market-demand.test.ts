import { describe, expect, it } from "vitest";
import { buildMarketDemandSnapshot, type SkillDefinition } from "./market-demand-build";
import { isMarketSnapshotFresh, marketFactorForUnit } from "./market-demand";

const generatedAt = "2026-08-28T00:00:00.000Z";
const skills: SkillDefinition[] = [
  { id: "react", aliases: ["react.js", "react"], tracks: ["react"], concepts: ["react-reconciliation"] },
  { id: "sql", aliases: ["sql"], tracks: ["sql-postgres", "databases"], concepts: ["sql"] },
];

const jobs = [
  { source: "a", id: "1", title: "React Engineer", description: "React.js and SQL", publishedAt: "2026-08-27" },
  { source: "b", id: "2", title: "Frontend", description: "React", publishedAt: "2026-08-26" },
  { source: "a", id: "old", title: "React", description: "React", publishedAt: "2026-06-01" },
  { source: "a", id: "1", title: "duplicate", description: "SQL", publishedAt: "2026-08-27" },
];

const unit = {
  unit: "react/01-runtime",
  track: "react",
  teaches: ["react-reconciliation"],
  requires: [],
  estMin: 30,
} as any;

describe("market demand aggregation", () => {
  it("deduplicates jobs, filters the time window, and counts each skill once per job", () => {
    const snapshot = buildMarketDemandSnapshot(jobs, skills, generatedAt, 30);
    expect(snapshot.sampleSize).toBe(2);
    expect(snapshot.concepts["react-reconciliation"].mentions).toBe(2);
    expect(snapshot.concepts.sql.mentions).toBe(1);
    expect(snapshot.sources).toEqual([
      { id: "a", label: "a", jobs: 1 },
      { id: "b", label: "b", jobs: 1 },
    ]);
  });

  it("does not match short aliases inside larger words", () => {
    const snapshot = buildMarketDemandSnapshot(
      [{ source: "a", id: "x", title: "NoSQL role", description: "nosql database", publishedAt: "2026-08-27" }],
      skills,
      generatedAt,
    );
    expect(snapshot.concepts.sql).toBeUndefined();
  });
});

describe("market demand planner factor", () => {
  const snapshot = buildMarketDemandSnapshot(jobs, skills, generatedAt, 30);

  it("applies a bounded boost to fresh, corroborated demand", () => {
    const factor = marketFactorForUnit(unit, snapshot, Date.parse("2026-09-01"));
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThanOrEqual(1.25);
  });

  it("ignores expired or invalid snapshots", () => {
    expect(isMarketSnapshotFresh(snapshot, Date.parse("2026-11-01"))).toBe(false);
    expect(marketFactorForUnit(unit, snapshot, Date.parse("2026-11-01"))).toBe(1);
    expect(marketFactorForUnit(unit, { ...snapshot, sampleSize: 0 }, Date.parse(generatedAt))).toBe(1);
  });
});
