import { describe, it, expect } from "vitest";
import { createRng, pickIndex, shuffleInPlace } from "./rng";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42), b = createRng(42);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });
  it("differs across seeds", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe("pickIndex", () => {
  it("stays in range and is seed-stable", () => {
    const r1 = createRng(7), r2 = createRng(7);
    const i1 = pickIndex(5, r1), i2 = pickIndex(5, r2);
    expect(i1).toBe(i2);
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i1).toBeLessThan(5);
  });
});

describe("shuffleInPlace", () => {
  it("permutes deterministically for a seed and keeps members", () => {
    const arr1 = [1, 2, 3, 4, 5], arr2 = [1, 2, 3, 4, 5];
    shuffleInPlace(arr1, createRng(9));
    shuffleInPlace(arr2, createRng(9));
    expect(arr1).toEqual(arr2);
    expect([...arr1].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
