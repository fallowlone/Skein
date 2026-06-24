export interface Job {
  id: string;
  key?: string;
  payload?: unknown;
  attempts: number;
}

export interface QueueOptions {
  visibilityMs: number;
  maxAttempts: number;
}

interface InternalJob extends Job {
  leaseUntil: number | null; // null = unleased
}

export class Queue {
  private opts: QueueOptions;
  private pending: InternalJob[] = [];
  private dl: Job[] = [];
  private seen = new Set<string>();
  private nextId = 1;

  constructor(opts: QueueOptions) {
    this.opts = opts;
  }

  enqueue(job: { id?: string; key?: string; payload?: unknown }): Job {
    const j: InternalJob = {
      id: job.id ?? String(this.nextId++),
      key: job.key,
      payload: job.payload,
      attempts: 0,
      leaseUntil: null,
    };
    this.pending.push(j);
    return { id: j.id, key: j.key, payload: j.payload, attempts: j.attempts };
  }

  claim(now: number): Job | null {
    for (const j of this.pending) {
      if (j.leaseUntil === null || now > j.leaseUntil) {
        j.leaseUntil = now + this.opts.visibilityMs;
        return { id: j.id, key: j.key, payload: j.payload, attempts: j.attempts };
      }
    }
    return null;
  }

  ack(id: string): void {
    const idx = this.pending.findIndex((j) => j.id === id);
    if (idx !== -1) this.pending.splice(idx, 1);
  }

  nack(id: string): void {
    const j = this.pending.find((j) => j.id === id);
    if (!j) return;
    j.attempts += 1;
    if (j.attempts > this.opts.maxAttempts) {
      this.dl.push({ id: j.id, key: j.key, payload: j.payload, attempts: j.attempts });
      this.pending.splice(this.pending.indexOf(j), 1);
    } else {
      j.leaseUntil = null; // release — re-claimable immediately
    }
  }

  processOnce(key: string, effect: () => void): void {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    effect();
  }

  get deadLetter(): Job[] {
    return this.dl;
  }
}
