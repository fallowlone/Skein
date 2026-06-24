export interface CacheEntry<V> {
  value: V;
  expiry: number;
  delta: number; // time taken to compute the value (ms) — used by XFetch
}

export class Cache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private inflight = new Map<string, Promise<V>>();

  set(key: string, value: V, ttl: number, now: number, delta: number): void {
    this.store.set(key, { value, expiry: now + ttl, delta });
  }

  /**
   * get(key, now, loader, ttl, delta, beta, rand)
   *
   * - ttl:   time-to-live in ms for entries stored by this call (default 1000).
   * - delta: caller-declared compute cost in ms; stored in the entry and used by XFetch.
   *          Pass the real cost when known; omit (default 0) for tests that don't
   *          exercise early-refresh.
   * - beta:  XFetch aggressiveness multiplier (default 1).
   * - rand:  injected random value in (0, 1] — NEVER use Math.random() in tests.
   *          Default 1 disables probabilistic early-refresh (Math.log(1) == 0).
   *
   * Behaviour:
   *  1. Fresh hit → return immediately.
   *  2. Fresh hit but XFetch threshold crossed → return current value AND trigger
   *     a single background refresh (coalesced via inflight map).
   *  3. Expired, inflight refresh exists → return stale value immediately.
   *  4. Expired, no inflight → start refresh loader, return its promise (cold/expired miss).
   *  5. Cold (no entry), inflight → join existing promise (single-flight).
   *  6. Cold (no entry), no inflight → start loader, register inflight, return promise.
   */
  get(
    key: string,
    now: number,
    loader: () => Promise<V>,
    ttl = 1000,
    delta = 0,
    beta = 1,
    rand = 1,
  ): Promise<V> {
    const entry = this.store.get(key);

    if (entry && now < entry.expiry) {
      // Fresh hit — check probabilistic early-refresh (XFetch)
      if (shouldEarlyRefresh(now, entry.expiry, entry.delta, beta, rand)) {
        // Trigger background refresh only if one isn't already in flight
        if (!this.inflight.has(key)) {
          const promise = loader().then((value) => {
            this.store.set(key, { value, expiry: now + ttl, delta });
            this.inflight.delete(key);
            return value;
          });
          this.inflight.set(key, promise);
        }
      }
      return Promise.resolve(entry.value);
    }

    // Expired but a refresh is already in-flight — return stale immediately
    if (entry && this.inflight.has(key)) {
      return Promise.resolve(entry.value);
    }

    // No entry and a request is in-flight — join the existing promise (single-flight)
    if (!entry && this.inflight.has(key)) {
      return this.inflight.get(key)!;
    }

    // Start a new loader (cold miss or expired with no in-flight yet)
    const promise = loader().then((value) => {
      this.store.set(key, { value, expiry: now + ttl, delta });
      this.inflight.delete(key);
      return value;
    });

    this.inflight.set(key, promise);
    return promise;
  }

  getStale(key: string, _now: number): V | undefined {
    return this.store.get(key)?.value;
  }
}

export function shouldEarlyRefresh(
  now: number,
  expiry: number,
  delta: number,
  beta: number,
  rand: number,
): boolean {
  // XFetch: refresh when (now - delta * beta * ln(rand)) >= expiry
  // rand in (0, 1] → ln(rand) <= 0 → subtracting a negative adds time.
  return now - delta * beta * Math.log(rand) >= expiry;
}
