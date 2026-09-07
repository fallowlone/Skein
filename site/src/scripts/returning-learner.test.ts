import { describe, expect, test } from "vitest";
import { isReturningLearner } from "./returning-learner";

describe("isReturningLearner", () => {
  const now = Date.UTC(2026, 8, 7);
  const history = {
    "web/http/overview": { firstAt: now - 40 * 86_400_000, lastAt: now - 31 * 86_400_000, tiersOpened: ["middle"] },
    "web/http/active": { firstAt: now - 40 * 86_400_000, lastAt: now - 29 * 86_400_000, tiersOpened: ["middle"] },
  };

  test("uses the canonical history key and detects 30+ days of inactivity", () => {
    expect(isReturningLearner(history, "web/http/overview", now)).toBe(true);
    expect(isReturningLearner(history, "web/http/active", now)).toBe(false);
  });

  test("does not match missing or malformed history entries", () => {
    expect(isReturningLearner(history, "web/http/missing", now)).toBe(false);
    expect(isReturningLearner({ "web/http/bad": { lastAt: "old" } }, "web/http/bad", now)).toBe(false);
  });
});
