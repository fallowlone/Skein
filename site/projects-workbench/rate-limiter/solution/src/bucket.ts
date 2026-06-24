export class TokenBucket {
  private cap: number;
  private rate: number;
  private toks: number;
  private last: number;
  constructor(capacity: number, refillPerSec: number, now: number) {
    this.cap = capacity;
    this.rate = refillPerSec;
    this.toks = capacity;
    this.last = now;
  }
  private refill(now: number): void {
    if (now <= this.last) return;
    this.toks = Math.min(this.cap, this.toks + (now - this.last) * this.rate);
    this.last = now;
  }
  tryRemove(now: number, n = 1): boolean {
    this.refill(now);
    if (this.toks >= n) { this.toks -= n; return true; }
    return false;
  }
  get tokens(): number { return this.toks; }
}
