# Retry-budget client

Implement `fetch()` in `src/retry.ts` so the client retries with discipline:

1. **Status filter** (`test/status-filter.test.ts`) — retry only 429/502/503/504.
   Anything else (400s, unknown) fails fast, even if success is scripted next.
2. **Backoff + budget** (`test/backoff-budget.test.ts`) — capped exponential
   backoff, honor a Retry-After hint above the computed delay, and park after
   `maxAttempts` instead of looping.
3. **Observe** (`test/observe.test.ts`) — report attempts/retries/slept time.

Run `bun test`. Scaffold fails; your implementation makes it pass.
