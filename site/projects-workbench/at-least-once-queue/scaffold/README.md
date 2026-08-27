# At-least-once queue — starter

Implement `Queue` in `src/queue.ts` so the acceptance suite passes.

    bun test

Rules: injected clock (no `Date.now()`), Bun stdlib only, no IO or DB.
The suite checks: lease exclusivity, re-delivery after visibility timeout,
ack permanence, two-job fan-out, idempotent `processOnce`, and dead-letter
routing after `maxAttempts`. When it is green, read the project rubric and
push to the senior bar: heartbeat lease renewal, exponential backoff with
jitter, and a chaos test that kills consumers mid-job.

---

Product milestones — see the project page for the full 5-step product brief:

1. **Claim jobs without double-grab** (`claim-skip-locked`)
2. **Re-queue jobs from dead workers** (`visibility-timeout`)
3. **Heartbeat lease extension for long jobs** (`heartbeat-and-lease`)
4. **Make re-delivery a no-op** (`idempotent-consumer`)
5. **Dead-letter, backoff, and chaos** (`dlq-and-chaos`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

