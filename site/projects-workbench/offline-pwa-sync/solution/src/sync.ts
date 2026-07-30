export type Mutation = {
  /** Client-generated id — the idempotency key for the whole sync protocol. */
  id: string;
  noteId: string;
  body: string;
  /** Client clock at the moment of the edit. */
  updatedAt: number;
};

export type ServerNote = { noteId: string; body: string; serverUpdatedAt: number };

export type FlushOutcome = { applied: string[]; skipped: string[]; conflicts: string[] };

/**
 * Local-first write queue.
 *
 * Edits are appended while offline and flushed on reconnect. Two properties keep a
 * flaky connection from corrupting data:
 *
 * 1. Every mutation carries a client-generated id. A flush that half-succeeds and is
 *    retried must not apply anything twice, and only the client knows a stable id at
 *    the moment of the edit — a server-assigned one does not exist yet.
 * 2. A mutation leaves the queue only when the server has ACKED it. Dropping it at
 *    send time loses the edit whenever the response never arrives.
 */
export class WriteQueue {
  private items: Mutation[] = [];
  private acked = new Set<string>();

  enqueue(m: Mutation): void {
    // Collapse repeated edits of the same note: only the newest body matters, and a
    // queue that grows with every keystroke will not survive a long offline stretch.
    const existing = this.items.findIndex((i) => i.noteId === m.noteId);
    if (existing >= 0 && this.items[existing].updatedAt <= m.updatedAt) {
      this.items[existing] = m;
      return;
    }
    if (existing >= 0) return; // an older edit arriving late never overwrites a newer one
    this.items.push(m);
  }

  pending(): Mutation[] {
    return this.items.filter((i) => !this.acked.has(i.id));
  }

  /** Called only after the server confirms; before that the edit stays queued. */
  ack(id: string): void {
    this.acked.add(id);
    this.items = this.items.filter((i) => i.id !== id);
  }

  get size(): number {
    return this.items.length;
  }
}

/**
 * Last-writer-wins conflict resolution.
 *
 * Ties go to the server: two clients whose clocks agree to the millisecond would
 * otherwise flip-flop forever, each convinced it wrote last. Picking a fixed side
 * makes the outcome converge, which matters more than which side wins.
 */
export function resolveLww(local: Mutation, server: ServerNote | null): "local" | "server" {
  if (!server) return "local";
  return local.updatedAt > server.serverUpdatedAt ? "local" : "server";
}

/**
 * Apply a flush against server state.
 *
 * `alreadyApplied` is the server's idempotency ledger of mutation ids. A retried
 * flush replays ids it has already seen; those are skipped rather than reapplied,
 * so a lost ACK costs a round trip instead of a duplicate write.
 */
export function flush(
  mutations: Mutation[],
  server: Map<string, ServerNote>,
  alreadyApplied: Set<string>,
): FlushOutcome {
  const outcome: FlushOutcome = { applied: [], skipped: [], conflicts: [] };

  // Oldest first: applying a queue out of order can leave an older body on top.
  for (const m of [...mutations].sort((a, b) => a.updatedAt - b.updatedAt)) {
    if (alreadyApplied.has(m.id)) {
      outcome.skipped.push(m.id);
      continue;
    }
    const current = server.get(m.noteId) ?? null;
    if (resolveLww(m, current) === "server") {
      alreadyApplied.add(m.id); // decided, so a retry does not re-litigate it
      outcome.conflicts.push(m.id);
      continue;
    }
    server.set(m.noteId, { noteId: m.noteId, body: m.body, serverUpdatedAt: m.updatedAt });
    alreadyApplied.add(m.id);
    outcome.applied.push(m.id);
  }
  return outcome;
}
