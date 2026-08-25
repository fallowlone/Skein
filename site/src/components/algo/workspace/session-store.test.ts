import { beforeEach, describe, expect, test } from "vitest";
import { loadSession, saveSession, withNewAttempt } from "./session-store";
import type { Attempt, PersistedSession } from "./types";

const SESSION: PersistedSession = {
  code: "function threeSum(nums) { return []; }",
  mode: "timed",
  scheme: "ink",
  attempts: [],
};

describe("session-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("returns null when nothing was saved yet", () => {
    expect(loadSession("3sum")).toBeNull();
  });

  test("round-trips a saved session", () => {
    saveSession("3sum", SESSION);
    expect(loadSession("3sum")).toEqual(SESSION);
  });

  test("keys sessions per problem id — one problem's save does not leak into another's", () => {
    saveSession("3sum", SESSION);
    expect(loadSession("two-sum")).toBeNull();
  });

  test("falls back to defaults on a corrupted record instead of throwing", () => {
    window.localStorage.setItem("awesome.algo-workspace.3sum.v1", "{not json");
    expect(loadSession("3sum")).toBeNull();
  });

  test("ignores an unrecognized mode/scheme value rather than trusting hand-edited storage", () => {
    window.localStorage.setItem(
      "awesome.algo-workspace.3sum.v1",
      JSON.stringify({ code: "x", mode: "bogus", scheme: "bogus", attempts: [] }),
    );
    const loaded = loadSession("3sum");
    expect(loaded?.mode).toBe("timed");
    expect(loaded?.scheme).toBe("ink");
  });
});

describe("withNewAttempt", () => {
  const attempt = (n: string): Attempt => ({
    atLabel: n, mode: "timed", mastery: 100, code: "", lines: 1, chars: 0,
  });

  test("prepends the newest attempt first", () => {
    const list = withNewAttempt([attempt("old")], attempt("new"));
    expect(list.map((a) => a.atLabel)).toEqual(["new", "old"]);
  });

  test("caps history at 8 entries", () => {
    const existing = Array.from({ length: 8 }, (_, i) => attempt(String(i)));
    const list = withNewAttempt(existing, attempt("newest"));
    expect(list).toHaveLength(8);
    expect(list[0].atLabel).toBe("newest");
    expect(list.at(-1)?.atLabel).toBe("6");
  });
});
