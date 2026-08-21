import { describe, it, expect } from "vitest";

/** Mirrors the deepSeq guard in GlobalSearch.astro. */
function makeGuard() {
  let seq = 0;
  return {
    start: () => ++seq,
    accept: (mine: number) => mine === seq,
  };
}

describe("deep-search staleness guard", () => {
  it("ignores an earlier response that lands after a later one", () => {
    const g = makeGuard();
    const first = g.start();
    const second = g.start();
    expect(g.accept(second)).toBe(true);
    expect(g.accept(first)).toBe(false);
  });
  it("accepts the only in-flight response", () => {
    const g = makeGuard();
    expect(g.accept(g.start())).toBe(true);
  });
});
