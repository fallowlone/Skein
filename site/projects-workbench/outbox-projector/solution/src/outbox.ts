// Reference solution: ack-gated relay with head-of-line retry (commit order
// kept) and a version-guarded projector (redelivery is a no-op).

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
    const row = { ...e, id: this.nextId++ };
    this.rows.push(row);
    return row;
  }

  /** Rows not yet acknowledged by the broker. */
  pending(): OutEvent[] {
    return [...this.rows];
  }

  /** Remove a row only after the broker acked it. */
  markPublished(id: number): void {
    this.rows = this.rows.filter((r) => r.id !== id);
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
    for (let pass = 0; pass < maxPasses; pass++) {
      const rows = this.outbox.pending();
      if (rows.length === 0) return;
      for (const row of rows) {
        try {
          this.broker.send(row);
          this.outbox.markPublished(row.id);
        } catch {
          break; // head-of-line: retry the same row next pass, keep commit order
        }
      }
    }
    if (this.outbox.pending().length > 0) throw new Error("relay stuck: outbox did not drain");
  }
}

export class Projector {
  balance = 0;
  lastSeen = 0;

  /** Fold events into the balance; redelivery must be a no-op. */
  apply(events: OutEvent[]): void {
    for (const e of events) {
      if (e.v <= this.lastSeen) continue;
      this.balance += e.type === "Credited" ? e.amount : -e.amount;
      this.lastSeen = e.v;
    }
  }
}
