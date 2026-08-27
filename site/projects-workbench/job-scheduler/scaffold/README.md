# Job scheduler — starter

Implement `src/queue.ts` and `src/cron.ts` until the acceptance suite passes:

    bun test

The suite encodes the failures that make schedulers infamous:

- **A claim is a lease.** Kill a worker mid-job and the job must come back on its
  own. An `in_progress` boolean cannot do this — nobody is left alive to clear it.
- **Single winner.** Two workers polling the same due row at the same instant: one
  gets it (`SELECT … FOR UPDATE SKIP LOCKED` in the real thing).
- **Backoff doubles, caps, and jitters.** Fixed intervals synchronise thousands of
  failures into a herd that re-fails together.
- **Poison pills leave.** At the attempt limit a job is dead-lettered, not retried
  forever.
- **Duplicate delivery is harmless.** Exactly-once *delivery* is unaffordable;
  exactly-once *effect* via a dedup key is not.
- **Recurring schedules do not double-fire.** Two materialiser nodes computing the
  same window derive the same bucketed key, so a unique constraint collapses them —
  and sub-tick clock skew cannot smuggle in a second row.
- **DST is a decision.** On the night 02:30 does not exist, the policy is written
  down, not accidental.

Green suite = the core is correct. Then take it to Postgres on the project page:
the due-time index, `SKIP LOCKED` claims, a heartbeat that extends real leases,
priority and fairness under load, and the poison-pill incident.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Frame the queue: data model, due-time index, durable enqueue** (`frame-and-durable-enqueue`)
2. **At-least-once: claim, visibility timeout, heartbeat** (`at-least-once-visibility`)
3. **Retries: exponential backoff, jitter, dead-letter queue** (`retries-backoff-dlq`)
4. **Cron and delayed jobs: schedule, clock skew, double-fire** (`cron-delayed-clock`)
5. **Exactly-once effect: dedup store, transactional handlers** (`idempotency-exactly-once-effect`)
6. **Scale and survive: priority, fairness, observe, poison-pill incident** (`scale-observe-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

