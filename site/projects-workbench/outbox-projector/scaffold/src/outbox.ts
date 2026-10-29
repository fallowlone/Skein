// TODO(you): implement a transactional outbox + relay + idempotent projector.
// The outbox appends events; the relay publishes them through a flaky broker
// (per-row error handling: remove only acked rows, retry the rest); the
// projector folds events into a balance, skipping anything at or below its
// high-water mark so redelivery is a no-op. Logical, in-memory, no IO.

export interface OutEvent {
  id: number;
  v: number;
  type: "Credited" | "Debited";
  amount: number;
}

export class Outbox {
  private rows: OutEvent[] = [];
  private nextId = 1;

  /** Append one event; returns the stored row with its assigned id. */
  append(e: Omit<OutEvent, "id">): OutEvent {
    // TODO: assign id, store, return the row.
    void e;
    return { id: 0, v: 0, type: "Credited", amount: 0 };
  }

  /** Rows not yet acknowledged by the broker. */
  pending(): OutEvent[] {
    // TODO: return unpublished rows.
    return [];
  }

  /** Remove a row only after the broker acked it. */
  markPublished(id: number): void {
    // TODO: drop the row with this id.
    void id;
  }
}

/** Scripted broker: fails `failures[id]` times per event id, then acks. */
export class Broker {
  published: OutEvent[] = [];
  private failsLeft = new Map<number, number>();

  constructor(failures: Record<number, number> = {}) {
    for (const [id, n] of Object.entries(failures)) this.failsLeft.set(Number(id), n);
  }

  send(e: OutEvent): void {
    const left = this.failsLeft.get(e.id) ?? 0;
    if (left > 0) {
      this.failsLeft.set(e.id, left - 1);
      throw new Error("broker down");
    }
    this.published.push(e);
  }
}

export class Relay {
  constructor(
    private outbox: Outbox,
    private broker: Broker,
  ) {}

  /** Publish until the outbox drains. Never loses, never duplicates. */
  drain(maxPasses = 100): void {
    // TODO: per-row try/catch; markPublished only on ack; retry the rest
    // in place (same row, not rotated — outbox order is commit order);
    // throw if maxPasses is exceeded (a permanently sick row must surface).
    void maxPasses;
  }
}

export class Projector {
  balance = 0;
  lastSeen = 0;

  /** Fold events into the balance; redelivery must be a no-op. */
  apply(events: OutEvent[]): void {
    // TODO: skip events at or below lastSeen; fold the rest; track lastSeen.
    for (const e of events) {
      this.balance += e.type === "Credited" ? e.amount : -e.amount;
      this.lastSeen = e.v;
    }
  }
}
