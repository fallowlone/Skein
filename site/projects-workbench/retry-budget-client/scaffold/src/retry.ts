// TODO(you): implement a retrying client over a scripted flaky upstream.
// The client retries ONLY retryable statuses (429/502/503/504) with capped
// exponential backoff, honors a server Retry-After hint when present, fails
// fast on anything else (400s, unknown), and gives up after maxAttempts,
// parking the failure instead of looping forever. Logical clock only:
// sleep() records time, it does not wait. No Date.now(), no IO.

export interface RetryOptions {
  baseMs: number;
  capMs: number;
  maxAttempts: number;
  retryable?: number[];
}

export interface UpstreamError {
  status: number;
  retryAfterMs?: number;
}

/** Scripted upstream: shifts one status per call, records every attempt. */
export class FlakyUpstream {
  calls: { status: number; at: number }[] = [];
  private script: number[];

  constructor(script: number[]) {
    this.script = [...script];
  }

  call(now: number): string {
    const status = this.script.length > 0 ? this.script.shift()! : 200;
    this.calls.push({ status, at: now });
    if (status !== 200) throw { status } as UpstreamError;
    return "ok";
  }
}

/** Scripted upstream that can also attach a Retry-After hint to failures. */
export class HintedUpstream extends FlakyUpstream {
  constructor(
    script: number[],
    private hints: Record<number, number> = {},
  ) {
    super(script);
  }

  override call(now: number): string {
    try {
      return super.call(now);
    } catch (e) {
      const err = e as UpstreamError;
      if (this.hints[err.status] !== undefined) err.retryAfterMs = this.hints[err.status];
      throw err;
    }
  }
}

export interface RetryStats {
  attempts: number;
  retries: number;
  sleptMs: number;
}

export class RetryClient {
  sleeps: number[] = [];
  private attempts = 0;
  private retries = 0;

  constructor(
    private upstream: FlakyUpstream,
    private opts: RetryOptions,
  ) {
    // TODO: store upstream + opts; default retryable to [429, 502, 503, 504].
    void upstream;
    void opts;
  }

  /** Run one logical fetch at time `now`. Returns "ok" or throws the fatal error. */
  fetch(now: number): string {
    // TODO: attempt counter + delay loop:
    //   - call upstream(now); return on success
    //   - on error: if status is not retryable, throw immediately (fail fast)
    //   - if attempts are exhausted (maxAttempts), throw (park, don't loop)
    //   - otherwise sleep(max(delay, retryAfterMs ?? 0)), double delay under cap
    void now;
    return "ok";
  }

  protected sleep(ms: number): void {
    this.sleeps.push(ms);
  }

  stats(): RetryStats {
    // TODO: return { attempts, retries, sleptMs }.
    return { attempts: 0, retries: 0, sleptMs: 0 };
  }
}
