import { test, expect } from "bun:test";
import { FlakyUpstream, HintedUpstream, RetryClient } from "../src/retry";

// Persistent 502s: backoff doubles under the cap, then the client parks
// after maxAttempts instead of looping forever.
test("caps backoff and parks after maxAttempts", () => {
  const up = new FlakyUpstream([502, 502, 502, 502, 502, 502]);
  const c = new RetryClient(up, { baseMs: 100, capMs: 250, maxAttempts: 4 });

  let outcome: string;
  try {
    outcome = c.fetch(0);
  } catch (e: any) {
    outcome = "THREW:" + e.status;
  }

  expect(outcome).toBe("THREW:502");
  expect(up.calls.length).toBe(4);
  expect(c.sleeps).toEqual([100, 200, 250]);
});

// A 429 carrying Retry-After: the client sleeps the server's hint when it
// exceeds the computed backoff, then succeeds on the next attempt.
test("honors Retry-After hint above computed backoff", () => {
  const up = new HintedUpstream([429, 200], { 429: 500 });
  const c = new RetryClient(up, { baseMs: 100, capMs: 1000, maxAttempts: 3 });

  expect(c.fetch(0)).toBe("ok");
  expect(up.calls.length).toBe(2);
  expect(c.sleeps).toEqual([500]);
});
