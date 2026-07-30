export type JobState = "pending" | "claimed" | "done" | "failed";

export type Job = {
  id: string;
  runAt: number;
  state: JobState;
  attempts: number;
  /** Set while claimed; the claim expires at this instant (visibility timeout). */
  leaseUntil?: number;
  /** Deduplication key for the effect, not the delivery. */
  dedupKey?: string;
  lastError?: string;
};

export type ClaimOptions = { now: number; leaseMs: number; limit?: number };

/**
 * Durable job queue with at-least-once delivery.
 *
 * The two properties that make this survive a worker dying mid-job:
 *
 * 1. A claim is a LEASE, not a handoff. `claim` flips a due job to `claimed` with
 *    `leaseUntil = now + leaseMs`. If the worker dies, nothing hands the job back —
 *    the lease simply expires and the job becomes claimable again. A boolean
 *    `in_progress` flag cannot express this: nobody is left alive to clear it.
 *
 * 2. Claiming is single-winner. Two workers polling the same due row must not both
 *    get it, which is what `SELECT ... FOR UPDATE SKIP LOCKED` buys you in Postgres
 *    and what the state transition enforces here.
 */
export class JobQueue {
  private jobs = new Map<string, Job>();
  /** Effects already applied, by dedup key — this is what makes retries harmless. */
  private appliedEffects = new Set<string>();

  enqueue(job: Omit<Job, "state" | "attempts"> & Partial<Pick<Job, "state" | "attempts">>): Job {
    const full: Job = { state: "pending", attempts: 0, ...job };
    this.jobs.set(full.id, full);
    return full;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Jobs that are due and unclaimed, or whose lease has expired. */
  claimable({ now }: { now: number }): Job[] {
    return [...this.jobs.values()]
      .filter((j) => {
        if (j.state === "done" || j.state === "failed") return false;
        if (j.runAt > now) return false;
        if (j.state === "claimed") return (j.leaseUntil ?? 0) <= now;
        return true;
      })
      .sort((a, b) => a.runAt - b.runAt || a.id.localeCompare(b.id));
  }

  claim({ now, leaseMs, limit = 1 }: ClaimOptions): Job[] {
    const taken = this.claimable({ now }).slice(0, limit);
    for (const job of taken) {
      job.state = "claimed";
      job.leaseUntil = now + leaseMs;
      job.attempts += 1;
    }
    return taken;
  }

  /** Extend the lease of a job still being worked on. */
  heartbeat(id: string, now: number, leaseMs: number): boolean {
    const job = this.jobs.get(id);
    if (!job || job.state !== "claimed") return false;
    job.leaseUntil = now + leaseMs;
    return true;
  }

  complete(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.state = "done";
    job.leaseUntil = undefined;
  }

  /**
   * Record a failure. Below `maxAttempts` the job goes back to `pending` with a
   * backed-off `runAt`; at the limit it is dead-lettered as `failed` rather than
   * retried forever — a poison pill must leave the queue, not occupy a worker.
   */
  fail(id: string, opts: { now: number; error: string; maxAttempts: number; backoffMs: number }): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    job.lastError = opts.error;
    job.leaseUntil = undefined;
    if (job.attempts >= opts.maxAttempts) {
      job.state = "failed";
      return job;
    }
    job.state = "pending";
    job.runAt = opts.now + opts.backoffMs;
    return job;
  }

  /**
   * Apply an effect at most once, keyed by `dedupKey`.
   *
   * At-least-once delivery is cheap; exactly-once delivery is not. The way out is
   * to make a duplicate delivery harmless: the handler checks the dedup store
   * first, so the second attempt is a no-op instead of a second charge.
   */
  applyEffectOnce(dedupKey: string, effect: () => void): boolean {
    if (this.appliedEffects.has(dedupKey)) return false;
    this.appliedEffects.add(dedupKey);
    effect();
    return true;
  }

  get size(): number {
    return this.jobs.size;
  }
}

/**
 * Exponential backoff with full jitter.
 *
 * Fixed intervals synchronise thousands of failures into a thundering herd that
 * re-fails together. Doubling spreads them out, the cap keeps the tail bounded,
 * and jitter breaks the remaining lockstep. `rand` is injected so the property is
 * testable rather than hopefully-random.
 */
export function backoffMs(
  attempt: number,
  opts: { baseMs: number; capMs: number; rand?: () => number } = { baseMs: 1000, capMs: 60_000 },
): number {
  const { baseMs, capMs, rand } = opts;
  const exponential = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
  if (!rand) return exponential;
  return Math.floor(exponential * rand());
}
