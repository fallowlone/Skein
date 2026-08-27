# Cache Stampede Lab — starter

Implement `Cache` and `shouldEarlyRefresh` in `src/cache.ts` so the suite passes.

    bun test

Rules: inject `now` and `rand` — never call `Date.now()` or `Math.random()` in the
unit. Concurrent `get()` calls for the same cold key must share ONE loader invocation
(single-flight). Callers arriving while a refresh is in-flight receive the stale value
immediately. `shouldEarlyRefresh` implements the XFetch probabilistic formula.
When the suite is green, push to the senior bar: metrics, adaptive beta, cache eviction.

---

Product milestones — see the project page for the full 5-step product brief:

1. **Trigger the stampede and measure fan-out** (`read-through-and-stampede`)
2. **Collapse concurrent misses to one origin call** (`single-flight`)
3. **Spread recomputation with XFetch early expiry** (`xfetch-early-expiry`)
4. **Jitter, staleness, and the tradeoff curve** (`ttl-jitter-and-staleness-curve`)
5. **Load-test, observe, and work an incident** (`loadtest-observe-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

