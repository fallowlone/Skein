import { describe, it, expect } from "vitest";
import { inShard, shardConfig, shardPaths, type ShardConfig } from "./build-shard";

// A representative set of lesson keys (lang/track/unit/lesson).
const keys = Array.from({ length: 3372 }, (_, i) => {
  const lang = i % 2 === 0 ? "en" : "ru";
  return `${lang}/track${i % 29}/unit${i % 9}/lesson${i}`;
});

describe("build-shard partition", () => {
  it("total<=1 keeps every path (plain build is a no-op)", () => {
    const cfg: ShardConfig = { index: 0, total: 1 };
    expect(shardPaths(keys, (k) => k, cfg)).toHaveLength(keys.length);
  });

  for (const total of [2, 4, 6, 8]) {
    it(`is disjoint and complete across ${total} shards`, () => {
      const seen = new Map<string, number[]>();
      for (let index = 0; index < total; index++) {
        const cfg: ShardConfig = { index, total };
        for (const k of keys) {
          if (inShard(k, cfg)) {
            seen.set(k, [...(seen.get(k) ?? []), index]);
          }
        }
      }
      // every key landed in exactly one shard
      expect(seen.size).toBe(keys.length);
      for (const shards of seen.values()) expect(shards).toHaveLength(1);
    });

    it(`spreads load roughly evenly across ${total} shards`, () => {
      const counts = Array.from({ length: total }, (_, index) =>
        keys.filter((k) => inShard(k, { index, total })).length,
      );
      const expected = keys.length / total;
      // no shard more than 25% off the mean — guards against a degenerate hash
      for (const c of counts) expect(Math.abs(c - expected)).toBeLessThan(expected * 0.25);
    });
  }
});

describe("shardPaths partition", () => {
  it("is disjoint and complete across N shards", () => {
    const keys = Array.from({ length: 5000 }, (_, i) => `key-${i}`);
    const N = 3;
    const seen = new Set<string>();
    for (let index = 0; index < N; index++) {
      const slice = shardPaths(keys, (k) => k, { index, total: N });
      for (const k of slice) {
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    }
    expect(seen.size).toBe(keys.length);
  });
});

describe("shardConfig env parsing", () => {
  it("defaults to a single full shard", () => {
    expect(shardConfig({})).toEqual({ index: 0, total: 1 });
  });
  it("clamps index into [0, total-1]", () => {
    expect(shardConfig({ SHARD_TOTAL: "6", SHARD_INDEX: "9" })).toEqual({ index: 5, total: 6 });
    expect(shardConfig({ SHARD_TOTAL: "6", SHARD_INDEX: "-3" })).toEqual({ index: 0, total: 6 });
  });
  it("treats junk as the safe full-build default", () => {
    expect(shardConfig({ SHARD_TOTAL: "abc" })).toEqual({ index: 0, total: 1 });
  });
});
