// TODO(you): implement a single-flight coalescing cache with probabilistic early expiration.
//
// Rules:
//   - No Date.now() or Math.random() — receive `now` and `rand` as arguments.
//   - No network, no file-system, no external packages.
//
// Contract:
//
//   Cache<V>
//     set(key, value, ttl, now, delta)  — store entry; delta = time to compute value (ms).
//     get(key, now, loader)             — single-flight: concurrent gets share ONE loader call.
//     getStale(key, now)                — return stale entry value without triggering loader.
//
//   shouldEarlyRefresh(now, expiry, delta, beta, rand)
//     → boolean
//     XFetch formula: true when (now - delta * beta * Math.log(rand)) >= expiry.
//     rand must be in (0, 1].

export interface CacheEntry<V> {
  value: V;
  expiry: number;
  delta: number;
}

export class Cache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private inflight = new Map<string, Promise<V>>();

  set(_key: string, _value: V, _ttl: number, _now: number, _delta: number): void {
    // TODO: store { value, expiry: now + ttl, delta }
    void _key; void _value; void _ttl; void _now; void _delta;
  }

  get(_key: string, _now: number, _loader: () => Promise<V>): Promise<V> {
    // TODO: return stale value when available; otherwise coalesce concurrent loaders
    //       into a single in-flight Promise (single-flight).
    void _key; void _now; void _loader;
    return Promise.reject(new Error("not implemented"));
  }

  getStale(key: string, _now: number): V | undefined {
    // TODO: return cached value even if expired, or undefined when absent.
    void key; void _now;
    return undefined;
  }
}

export function shouldEarlyRefresh(
  _now: number,
  _expiry: number,
  _delta: number,
  _beta: number,
  _rand: number,
): boolean {
  // TODO: XFetch formula — (now - delta * beta * Math.log(rand)) >= expiry
  void _now; void _expiry; void _delta; void _beta; void _rand;
  return false;
}
