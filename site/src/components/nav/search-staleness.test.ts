import { describe, it, expect } from "vitest";
import { createStalenessGuard, shouldScheduleDeep, isDeepResponseCurrent } from "../../scripts/search-staleness";

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

describe("deep-search failed-request delivery (catch-handler regression)", () => {
  // GlobalSearch.astro's catch handler is:
  //   if (!isDeepResponseCurrent(deepGuard.accept(seq), input!.value, query)) return;
  //   onResults([]);
  // A thrown fetch (offline, DNS failure, aborted connection) must still
  // reach `onResults([])` when it is current — an earlier version of this
  // code dropped it unconditionally on any error, which left the
  // zero-local-results "Searching lesson text…" placeholder stuck on
  // screen forever with nothing left to clear it.
  it("is current when the guard accepts it and the input still matches the query", () => {
    expect(isDeepResponseCurrent(true, "рукопожатия", "рукопожатия")).toBe(true);
  });
  it("is NOT current once a later request has superseded it, even if the input still matches", () => {
    // This is the regression case: a failed request must still be dropped
    // (not delivered) once the staleness guard says it's stale — so a
    // fix for the "stuck placeholder" bug must not swing to the opposite
    // failure of injecting stale results into a newer query's UI.
    expect(isDeepResponseCurrent(false, "рукопожатия", "рукопожатия")).toBe(false);
  });
  it("is NOT current once the user has changed the query, even if the guard still accepts it", () => {
    expect(isDeepResponseCurrent(true, "networking", "рукопожатия")).toBe(false);
  });
  it("is case- and whitespace-insensitive on the input side, matching how render() derives its query", () => {
    expect(isDeepResponseCurrent(true, "  Networking  ", "networking")).toBe(true);
  });
});
