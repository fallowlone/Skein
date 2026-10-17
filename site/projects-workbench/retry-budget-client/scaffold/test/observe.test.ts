import { test, expect } from "bun:test";
import { FlakyUpstream, RetryClient } from "../src/retry";

// The client reports what it did: attempts, retries, and total slept time —
// the numbers a dashboard and a retry budget are built from.
test("stats report attempts, retries, and slept time", () => {
  const up = new FlakyUpstream([502, 502, 400, 200]);
  const c = new RetryClient(up, { baseMs: 100, capMs: 1000, maxAttempts: 5 });

  try {
    c.fetch(0);
  } catch {
    // expected: fail fast on the 400
  }

  expect(c.stats()).toEqual({ attempts: 3, retries: 2, sleptMs: 300 });
});
