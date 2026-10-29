import { describe, expect, it } from "vitest";
import { hitRate, simulateCache } from "./ttl-sim";

describe("hitRate", () => {
  it("matches λT/(1+λT) at 10 queries per hour", () => {
    expect(Math.round(hitRate(10, 60) * 100)).toBe(14);
    expect(Math.round(hitRate(10, 300) * 100)).toBe(45);
    expect(Math.round(hitRate(10, 3600) * 100)).toBe(91);
    expect(hitRate(10, 86400)).toBeGreaterThan(0.99);
  });
});

describe("simulateCache", () => {
  it("converges to the closed-form hit rate over a long window", () => {
    const sim = simulateCache(100, 300, 3600 * 2000, Infinity);
    const hits = sim.queries.filter((q) => q.kind !== "miss").length;
    expect(hits / sim.queries.length).toBeCloseTo(hitRate(100, 300), 2);
  });

  it("serves stale answers only after the change and only from entries fetched before it", () => {
    const sim = simulateCache(1000, 3600, 7200, 4500);
    expect(sim.stale).toBeGreaterThan(0);
    expect(sim.queries.filter((q) => q.kind === "stale").every((q) => q.t >= 4500 && q.t < 7200)).toBe(true);
    const short = simulateCache(1000, 60, 7200, 4500);
    expect(short.queries.filter((q) => q.kind === "stale").every((q) => q.t < 4560)).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    expect(simulateCache(10, 300, 7200, 3600)).toEqual(simulateCache(10, 300, 7200, 3600));
  });
});
