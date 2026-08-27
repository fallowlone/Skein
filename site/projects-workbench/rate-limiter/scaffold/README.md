# Rate Limiter — starter

Implement `TokenBucket` in `src/bucket.ts` so the acceptance suite passes.

    bun test

Rules: refill at `refillPerSec`, cap at `capacity`, start full, inject the clock
(no `Date.now()`). The suite checks burst, steady-state refill, the cap, and
fractional accrual. When it is green, read the project page's rubric and push to
the senior bar (distributed counter, atomic refill, abuse handling).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **In-memory token bucket** (`in-memory-bucket`)
2. **Move the counter into Redis** (`distributed-counter`)
3. **Make it atomic with a Lua script** (`atomic-lua`)
4. **Sliding window vs fixed window vs bucket** (`window-tradeoffs`)
5. **429, Retry-After, headers, and abuse handling** (`protocol-and-abuse`)
6. **Load-test, observe, and work an incident** (`loadtest-observe-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

