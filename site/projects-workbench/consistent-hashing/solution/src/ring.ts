export interface HashRingOpts {
  vnodes: number;
  hash: (s: string) => number;
}

interface Entry {
  pos: number;
  nodeId: string;
}

export class HashRing {
  private readonly vnodes: number;
  private readonly hash: (s: string) => number;
  // Sorted ascending by pos
  private ring: Entry[] = [];

  constructor(opts: HashRingOpts) {
    this.vnodes = opts.vnodes;
    this.hash = opts.hash;
  }

  addNode(id: string): void {
    for (let i = 0; i < this.vnodes; i++) {
      const pos = this.hash(`${id}#${i}`);
      // Insert maintaining sorted order
      const idx = this.lowerBound(pos);
      this.ring.splice(idx, 0, { pos, nodeId: id });
    }
  }

  removeNode(id: string): void {
    this.ring = this.ring.filter((e) => e.nodeId !== id);
  }

  getNode(key: string): string {
    if (this.ring.length === 0) throw new Error("HashRing is empty");
    const h = this.hash(key);
    const idx = this.lowerBound(h);
    // Wrap around to first entry when key hash exceeds all positions
    const entry = this.ring[idx % this.ring.length];
    return entry.nodeId;
  }

  // Returns index of first entry with pos >= target
  private lowerBound(target: number): number {
    let lo = 0;
    let hi = this.ring.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.ring[mid].pos < target) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
}
