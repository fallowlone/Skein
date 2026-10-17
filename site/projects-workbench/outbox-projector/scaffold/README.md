# Outbox projector

Wire an outbox to a projector through a flaky broker in `src/outbox.ts`:

1. **Outbox** — append events, list pending, remove only what the broker acked.
2. **Relay** (`test/relay.test.ts`) — drain through transient broker failures
   with per-row error handling: no loss, no duplicates, commit order kept
   (head-of-line: a sick row blocks the pass, it is retried in place).
3. **Projector** (`test/projector.test.ts`) — fold events behind a version
   guard so redelivery and full replay are no-ops.

Run `bun test`. Scaffold fails; your implementation makes it pass.
