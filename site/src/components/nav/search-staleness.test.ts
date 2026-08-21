import { describe, it, expect } from "vitest";
import { createStalenessGuard, shouldScheduleDeep } from "../../scripts/search-staleness";

describe("deep-search staleness guard", () => {
  it("ignores an earlier response that lands after a later one", () => {
    const g = createStalenessGuard();
    const first = g.start();
    const second = g.start();
    expect(g.accept(second)).toBe(true);
    expect(g.accept(first)).toBe(false);
  });
  it("accepts the only in-flight response", () => {
    const g = createStalenessGuard();
    expect(g.accept(g.start())).toBe(true);
  });
});

describe("deep-search scheduling gate", () => {
  it("still schedules a deep search when the local index matched nothing — the regression case", () => {
    // This is exactly the case the Critical review finding caught: a phrase
    // that lives only in a lesson body, or an inflected non-English query,
    // scores 0 against the local substring index. The deep group exists
    // precisely to cover this case, so it must not be gated on local count.
    expect(shouldScheduleDeep("рукопожатия", 0)).toBe(true);
  });
  it("still schedules a deep search when local results already exist", () => {
    expect(shouldScheduleDeep("networking", 5)).toBe(true);
  });
  it("does not schedule for an empty query", () => {
    expect(shouldScheduleDeep("", 0)).toBe(false);
    expect(shouldScheduleDeep("   ", 3)).toBe(false);
  });
});
