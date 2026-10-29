import { test, expect } from "bun:test";
import { FlakyUpstream, RetryClient } from "../src/retry";

const OPTS = { baseMs: 100, capMs: 1000, maxAttempts: 5 };

// Upstream replays [502, 502, 400, 200]: the client must fail fast on the 400
// and never consume the 200 behind it.
test("retries retryable statuses, fails fast on 400", () => {
  const up = new FlakyUpstream([502, 502, 400, 200]);
  const c = new RetryClient(up, OPTS);

  let outcome: string;
  try {
    outcome = c.fetch(0);
  } catch (e: any) {
    outcome = "THREW:" + e.status;
  }

  expect(outcome).toBe("THREW:400");
  expect(up.calls.length).toBe(3);
  expect(c.sleeps).toEqual([100, 200]);
});
