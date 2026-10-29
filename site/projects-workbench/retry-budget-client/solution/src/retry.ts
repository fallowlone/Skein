// Reference solution: retry only what retry can fix, with capped backoff,
// Retry-After honored, and a hard attempt budget.

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

const DEFAULT_RETRYABLE = [429, 502, 503, 504];

export class RetryClient {
  sleeps: number[] = [];
  private attempts = 0;
  private retries = 0;
  private retryable: number[];

  constructor(
    private upstream: FlakyUpstream,
    private opts: RetryOptions,
  ) {
    this.retryable = opts.retryable ?? DEFAULT_RETRYABLE;
  }

  /** Run one logical fetch at time `now`. Returns "ok" or throws the fatal error. */
  fetch(now: number): string {
    let delay = this.opts.baseMs;
    for (let attempt = 1; ; attempt++) {
      this.attempts++;
      try {
        return this.upstream.call(now);
      } catch (e) {
        const err = e as UpstreamError;
        if (!this.retryable.includes(err.status)) throw err;
        if (attempt >= this.opts.maxAttempts) throw err;
        this.retries++;
        const wait = Math.max(delay, err.retryAfterMs ?? 0);
        this.sleep(wait);
        delay = Math.min(this.opts.capMs, delay * 2);
      }
    }
  }

  protected sleep(ms: number): void {
    this.sleeps.push(ms);
  }

  stats(): RetryStats {
    return {
      attempts: this.attempts,
      retries: this.retries,
      sleptMs: this.sleeps.reduce((s, m) => s + m, 0),
    };
  }
}
