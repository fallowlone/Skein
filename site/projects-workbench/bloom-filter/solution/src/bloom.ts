export class BloomFilter {
  private readonly arr: Uint8Array;
  private readonly m: number;
  private readonly hashes: Array<(s: string) => number>;

  constructor(bits: number, hashes: Array<(s: string) => number>) {
    this.m = bits;
    this.hashes = hashes;
    this.arr = new Uint8Array(Math.ceil(bits / 8));
  }

  private bitIndex(h: number): number {
    // Mask to unsigned 32-bit then mod — handles negative hash outputs safely.
    return (h >>> 0) % this.m;
  }

  add(s: string): void {
    for (const h of this.hashes) {
      const pos = this.bitIndex(h(s));
      this.arr[pos >> 3] |= 1 << (pos & 7);
    }
  }

  has(s: string): boolean {
    for (const h of this.hashes) {
      const pos = this.bitIndex(h(s));
      if ((this.arr[pos >> 3] & (1 << (pos & 7))) === 0) return false;
    }
    return true;
  }

  fillRatio(): number {
    if (this.m === 0) return 0;
    let set = 0;
    for (const byte of this.arr) {
      // Kernighan bit count
      let b = byte;
      while (b) { b &= b - 1; set++; }
    }
    // Divide by actual bit count, not byte count
    return set / this.m;
  }
}
