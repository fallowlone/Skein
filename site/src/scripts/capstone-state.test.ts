import { describe, it, expect, beforeEach, vi } from "vitest";
import { readCapstone, setMilestoneDone, percentDone } from "./capstone-state";

describe("capstone-state", () => {
  beforeEach(() => localStorage.clear());

  it("readCapstone returns {} when nothing is stored", () => {
    expect(readCapstone("rate-limiter")).toEqual({});
  });

  it("setMilestoneDone persists a completed milestone", () => {
    setMilestoneDone("rate-limiter", "m1", true);
    expect(readCapstone("rate-limiter")).toEqual({ m1: true });
  });

  it("toggling false marks the milestone incomplete", () => {
    setMilestoneDone("rl", "m1", true);
    setMilestoneDone("rl", "m1", false);
    expect(readCapstone("rl").m1).toBe(false);
  });

  it("state is scoped per slug", () => {
    setMilestoneDone("a", "m1", true);
    expect(readCapstone("b")).toEqual({});
  });

  it("percentDone: 0 at empty, 50 at 1/2, 100 at 2/2", () => {
    expect(percentDone("rl", 2)).toBe(0);
    setMilestoneDone("rl", "m1", true);
    expect(percentDone("rl", 2)).toBe(50);
    setMilestoneDone("rl", "m2", true);
    expect(percentDone("rl", 2)).toBe(100);
  });

  it("percentDone is 0 when total is 0 (no divide-by-zero)", () => {
    expect(percentDone("rl", 0)).toBe(0);
  });

  it("swallows a storage failure without throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => setMilestoneDone("rl", "m1", true)).not.toThrow();
    spy.mockRestore();
  });
});
