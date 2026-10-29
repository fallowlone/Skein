# ADR 0002 — D1 batch/statement writes, no transactions yet

Status: accepted.

## Context

D1 offers batch and (now) transaction APIs. The money-adjacent paths —
Telegram Stars orders/subscriptions, GitHub Sponsors grants — must not
double-grant, double-consume, or resurrect revoked entitlements under
webhook retries and concurrent delivery.

## Decision

Stay on single statements / D1 batch until transactions are proven
necessary. Correctness comes from idempotency guards at the SQL level:

- `0008_telegram_precheckout_lock` serializes pre-checkout per order;
- `github-sponsors.ts` dedupes on `X-GitHub-Delivery` ID plus the signed
  payload hash, so a replayed delivery with a rotated header is still one
  event;
- ownership/consumption checks (`course_access_grants ... AND revoked_at
  IS NULL LIMIT 1`) make grant/consumes conditional, not
  check-then-act across round-trips;
- the sqlite race-barrier adapter in `db.sqlite.integration.ts` pins the
  sponsorship read/write interleave.

## Consequences

- Every money-path write must be written as a guarded conditional; a bare
  read-modify-write is a bug here. Reviewers check for the guard, not for
  transaction boundaries.
- If a future flow needs multi-row atomicity that guards cannot express
  (e.g. cross-table settlement), this ADR is the place that gets revised —
  with the failing interleave test first.

## Rejected

Transactions-by-default: a heavier primitive than the problem needs today,
and D1 transaction semantics at the edge were unproven when these paths were
built. The guards above are tested; a transaction rewrite would need to
re-prove each one.
