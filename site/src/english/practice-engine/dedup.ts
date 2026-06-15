// Ported from steep/grammar/algorithm/dedup.ts.
// Adapted: `accept(s)` returns true (and records) on first occurrence,
// false for exact or whitespace-normalized duplicates.

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export class BatchDedup {
  private readonly set = new Set<string>();

  accept(surface: string): boolean {
    const key = normalize(surface);
    if (this.set.has(key)) return false;
    this.set.add(key);
    return true;
  }

  size(): number {
    return this.set.size;
  }
}
