export type Cursor = { x: number; y: number; at: number };
export type Peer = { id: string; name: string; color: string; cursor: Cursor };

/**
 * Room presence.
 *
 * Presence is derived state, not a log: the room holds one current cursor per peer,
 * so a client that reconnects gets the truth in one snapshot instead of replaying
 * history. Two rules keep it honest:
 *
 *  - A stale update never overwrites a newer one. UDP-like reordering does not exist
 *    on a WebSocket, but two tabs, a proxy buffer and a reconnect do — an out-of-order
 *    frame arriving late must not teleport a cursor backwards.
 *  - Peers expire. A dropped socket that never fires `close` (mobile suspend, dead
 *    NAT entry) otherwise leaves a ghost cursor on everyone's screen forever.
 */
export class Room {
  private peers = new Map<string, Peer>();

  join(peer: Peer): void {
    this.peers.set(peer.id, peer);
  }

  leave(id: string): void {
    this.peers.delete(id);
  }

  /** Last-writer-wins on `at`; equal timestamps keep the stored value. */
  move(id: string, cursor: Cursor): boolean {
    const peer = this.peers.get(id);
    if (!peer) return false;
    if (cursor.at <= peer.cursor.at) return false;
    peer.cursor = cursor;
    return true;
  }

  /** Everyone except the sender — the fan-out set for one broadcast. */
  others(id: string): Peer[] {
    return [...this.peers.values()].filter((p) => p.id !== id);
  }

  /** Full state for a joining or reconnecting client. */
  snapshot(): Peer[] {
    return [...this.peers.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Drop peers whose last update is older than `ttlMs`; returns the removed ids. */
  expire(now: number, ttlMs: number): string[] {
    const gone: string[] = [];
    for (const [id, peer] of this.peers) {
      if (now - peer.cursor.at > ttlMs) {
        this.peers.delete(id);
        gone.push(id);
      }
    }
    return gone;
  }

  get size(): number {
    return this.peers.size;
  }
}

/**
 * Coalescing throttle for pointer events.
 *
 * Pointer events fire up to 120 Hz; the network neither can nor should carry that.
 * Dropping the extras is wrong — the last position is the one that matters, and
 * discarding it leaves the cursor short of where the pointer actually stopped. So
 * intermediate moves are *coalesced*: at most one send per interval, and the final
 * position always gets sent.
 */
export class CoalescingThrottle {
  private pending: Cursor | null = null;
  private lastSentAt = -Infinity;

  constructor(private readonly intervalMs: number) {}

  /** Returns the cursor to send now, or null when it should be held. */
  offer(cursor: Cursor, now: number): Cursor | null {
    if (now - this.lastSentAt >= this.intervalMs) {
      this.lastSentAt = now;
      this.pending = null;
      return cursor;
    }
    this.pending = cursor; // keep only the newest — older intermediates are noise
    return null;
  }

  /** Flush the held position once the interval has elapsed (or on pointer-up). */
  flush(now: number): Cursor | null {
    if (!this.pending) return null;
    const out = this.pending;
    this.pending = null;
    this.lastSentAt = now;
    return out;
  }

  get held(): Cursor | null {
    return this.pending;
  }
}

/**
 * Reconnect delay: exponential backoff with full jitter.
 *
 * Without jitter, a thousand clients knocked off by one deploy all come back at the
 * same instant and knock the server off again. `rand` is injected so the property is
 * tested rather than assumed.
 */
export function reconnectDelayMs(
  attempt: number,
  opts: { baseMs: number; capMs: number; rand?: () => number },
): number {
  const exponential = Math.min(opts.capMs, opts.baseMs * 2 ** Math.max(0, attempt - 1));
  return opts.rand ? Math.floor(exponential * opts.rand()) : exponential;
}
