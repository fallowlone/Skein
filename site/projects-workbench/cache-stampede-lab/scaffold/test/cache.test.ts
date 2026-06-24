import { test, expect } from "bun:test";
import { Cache, shouldEarlyRefresh } from "../src/cache";

// ---------------------------------------------------------------------------
// (a) Single-flight: 50 concurrent gets on a cold key → loader called once
// ---------------------------------------------------------------------------
test("single-flight: concurrent cold gets coalesce into ONE loader call", async () => {
  const cache = new Cache<string>();
  let callCount = 0;

  const loader = (): Promise<string> => {
    callCount++;
    // Simulate async work (resolved on next microtask)
    return Promise.resolve("value");
  };

  // Fire 50 gets BEFORE any resolves — collect promises first, then await.
  const promises = Array.from({ length: 50 }, () => cache.get("key", 0, loader));
  const results = await Promise.all(promises);

  expect(callCount).toBe(1);
  expect(results.every((r) => r === "value")).toBe(true);
});

// ---------------------------------------------------------------------------
// (b) After expiry, next get triggers exactly one fresh loader call
// ---------------------------------------------------------------------------
test("single-flight: expired entry triggers exactly one fresh loader per wave", async () => {
  const cache = new Cache<string>();
  let callCount = 0;
  const TTL = 1000; // ms

  const loader = (): Promise<string> => {
    callCount++;
    return Promise.resolve(`v${callCount}`);
  };

  // First wave — cold
  await cache.get("key", 0, loader);
  expect(callCount).toBe(1);

  // Second wave — after expiry (now = TTL + 1 puts us past expiry)
  const now2 = TTL + 1;
  const promises2 = Array.from({ length: 10 }, () =>
    cache.get("key", now2, loader)
  );
  await Promise.all(promises2);

  // callCount must have gone up by exactly 1 (not 10)
  expect(callCount).toBe(2);
});

// ---------------------------------------------------------------------------
// (c) shouldEarlyRefresh: larger delta triggers refresh earlier
// ---------------------------------------------------------------------------
test("shouldEarlyRefresh: larger delta returns true further before expiry", () => {
  const expiry = 10_000;
  const beta = 1;
  const rand = 0.1; // fixed deterministic rand

  // With a larger delta the worker ran for longer → we refresh earlier.
  // Pick a `now` where small delta returns false but large delta returns true.
  //
  // XFetch: now - delta * beta * Math.log(rand) >= expiry
  // Math.log(0.1) ≈ -2.302
  // small delta=100 → gap = 100 * 1 * 2.302 ≈ 230 → need now >= 9770 for true
  // large delta=500 → gap = 500 * 1 * 2.302 ≈ 1151 → need now >= 8849 for true
  //
  // At now=9000: small delta (100) → 9000 + 230 = 9230 < 10000 → false
  //              large delta (500) → 9000 + 1151 = 10151 >= 10000 → true

  const now = 9_000;
  const smallDelta = 100;
  const largeDelta = 500;

  expect(shouldEarlyRefresh(now, expiry, smallDelta, beta, rand)).toBe(false);
  expect(shouldEarlyRefresh(now, expiry, largeDelta, beta, rand)).toBe(true);
});

// ---------------------------------------------------------------------------
// (d) Stale-while-revalidate: expired entry during in-flight refresh
//     → concurrent callers get stale value immediately (no blocking)
// ---------------------------------------------------------------------------
test("stale-while-revalidate: callers get stale value while refresh is in-flight", async () => {
  const cache = new Cache<string>();
  const TTL = 1000;

  let resolveLoader!: (v: string) => void;
  let callCount = 0;

  // Seed the cache with a non-blocking loader
  await cache.get("key", 0, () => {
    callCount++;
    return Promise.resolve("stale-value");
  });

  expect(callCount).toBe(1);

  // Now make the refresh loader controllable (does not resolve immediately)
  const slowLoader = (): Promise<string> => {
    callCount++;
    return new Promise<string>((resolve) => {
      resolveLoader = resolve;
    });
  };

  // Trigger refresh at expiry + 1 (first caller starts the slow loader)
  const expiredNow = TTL + 1;
  const firstRefresh = cache.get("key", expiredNow, slowLoader);
  expect(callCount).toBe(2); // slow loader started

  // Additional callers while the slow loader is in-flight must get stale immediately
  const stale1 = await cache.get("key", expiredNow, slowLoader);
  const stale2 = await cache.get("key", expiredNow, slowLoader);
  expect(stale1).toBe("stale-value");
  expect(stale2).toBe("stale-value");
  // No extra loader calls — stale was returned synchronously, loader not invoked again
  expect(callCount).toBe(2);

  // Resolve the slow loader and verify fresh value propagates
  resolveLoader("fresh-value");
  const fresh = await firstRefresh;
  expect(fresh).toBe("fresh-value");
});
