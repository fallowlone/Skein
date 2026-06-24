export interface BreakerOpts {
  failureThreshold: number;
  openMs: number;
  halfOpenMax: number;
}

type State = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private readonly threshold: number;
  private readonly openMs: number;
  private readonly halfOpenMax: number;

  private failures: number = 0;
  private openedAt: number = -Infinity;
  private inFlightProbes: number = 0;
  // Internal recorded state (ignores lazy half-open upgrade)
  private _state: 'closed' | 'open' = 'closed';

  constructor(opts: BreakerOpts) {
    this.threshold = opts.failureThreshold;
    this.openMs = opts.openMs;
    this.halfOpenMax = opts.halfOpenMax;
  }

  state(now: number): State {
    if (this._state === 'closed') return 'closed';
    // open — check if recovery window has elapsed
    if (now >= this.openedAt + this.openMs) return 'half-open';
    return 'open';
  }

  call<T>(fn: () => T, now: number): T {
    const s = this.state(now);

    if (s === 'open') {
      throw new CircuitOpenError(this.openedAt + this.openMs - now);
    }

    if (s === 'half-open') {
      if (this.inFlightProbes >= this.halfOpenMax) {
        // Treat as still open — another probe is already in flight
        throw new CircuitOpenError(0);
      }
      this.inFlightProbes++;
      try {
        const result = fn();
        // Probe succeeded → reset to closed
        this.failures = 0;
        this._state = 'closed';
        this.inFlightProbes--;
        return result;
      } catch (err) {
        // Probe failed → re-open, reset timer to now
        this.openedAt = now;
        this._state = 'open';
        this.inFlightProbes--;
        throw err;
      }
    }

    // State is 'closed'
    try {
      const result = fn();
      this.failures = 0;
      return result;
    } catch (err) {
      this.failures++;
      if (this.failures >= this.threshold) {
        this._state = 'open';
        this.openedAt = now;
      }
      throw err;
    }
  }
}

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(`Circuit is open. Retry after ${retryAfterMs} ms.`);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}
