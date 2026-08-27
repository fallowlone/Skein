# Circuit Breaker — starter

Implement `CircuitBreaker` in `src/breaker.ts` so the acceptance suite passes.

    bun test

Rules: inject the clock via the `now` arg on every call (no `Date.now()`).
The suite checks closed→open tripping, short-circuit (fn never called while open),
half-open probe at recovery boundary, successful probe → closed, and failed probe
→ open with timer reset. When it is green, read the project rubric and push to
the senior bar (rolling window, metrics, fallback).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Failure counter: track consecutive failures and trip to open** (`failure-counter`)
2. **Open state: short-circuit and never invoke the wrapped function** (`open-short-circuit`)
3. **Half-open probe: allow one call through after the recovery window** (`half-open-probe`)
4. **State-machine completeness: all transitions, edge cases, re-entry** (`transitions`)
5. **Rolling failure window: count failures in a time window, not consecutively** (`rolling-window`)
6. **Metrics and fallback: observe the breaker, handle open gracefully** (`metrics-fallback`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

