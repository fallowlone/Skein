# LRU Cache — starter

Implement `LRUCache<K,V>(capacity)` in `src/cache.ts` so the suite passes.

    bun test

Contract: `get(k)` returns the value or `undefined`; `put(k,v)` inserts or updates;
`has(k)` checks existence; `size` is the live entry count. All must be O(1).
At capacity, `put` with a NEW key evicts the least-recently-used entry.
Both `get` and `put`-on-existing-key refresh recency. When green, check
the project rubric and push to the senior bar (TTL, hit-rate instrumentation).

---

Product milestones — see the project page for the full 6-step product brief:

1. **Naive baseline: Map with O(n) eviction** (`naive-baseline`)
2. **Hashmap + doubly-linked list: O(1) everywhere** (`hashmap-and-dll`)
3. **Recency on read: get() refreshes, put() on existing key refreshes** (`recency-on-read`)
4. **Eviction policy: edge cases, capacity=1, size invariant** (`eviction-policy`)
5. **TTL variant: time-based expiry without background timers** (`ttl-variant`)
6. **Instrument hit rate: hits, misses, evictions, and the real cost of cache pollution** (`instrument-hit-rate`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

