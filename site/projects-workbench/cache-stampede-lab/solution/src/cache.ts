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

  get(key: string, now: number, loader: () => Promise<V>): Promise<V> {
    const entry = this.store.get(key);

    // Fresh hit — return immediately
    if (entry && now < entry.expiry) {
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
    const start = now;
    const promise = loader().then((value) => {
      const elapsed = now - start; // deterministic; loader has no real wall time
      this.store.set(key, { value, expiry: now + 1000, delta: elapsed });
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
