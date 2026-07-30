export type Row = {
  /** Natural key: what makes this row the same business fact across runs. */
  id: string;
  /** Change timestamp (or monotonic sequence) used for the watermark. */
  updatedAt: number;
  [column: string]: unknown;
};

export type LoadResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

/**
 * Idempotent target table.
 *
 * A full re-run must produce the same table, not double the rows — so the load is
 * a merge on the natural key, not an append. Two rules make it safe:
 *
 * 1. Deduplicate WITHIN the batch first. A source can hand you the same key twice
 *    in one batch (late-arriving corrections are the usual cause); appending both
 *    and letting "last write win" depends on iteration order, which is not a
 *    contract you can rely on.
 * 2. Only overwrite when the incoming row is NEWER. Re-running an old batch after
 *    a newer one has landed must not resurrect stale values — that is the failure
 *    mode where a backfill silently reverts yesterday's corrections.
 */
export class TargetTable {
  private rows = new Map<string, Row>();

  merge(batch: Row[]): LoadResult {
    const result: LoadResult = { inserted: 0, updated: 0, skipped: 0 };

    // Collapse in-batch duplicates, keeping the newest per key.
    const byKey = new Map<string, Row>();
    for (const row of batch) {
      const seen = byKey.get(row.id);
      if (!seen || row.updatedAt > seen.updatedAt) byKey.set(row.id, row);
    }

    for (const row of byKey.values()) {
      const existing = this.rows.get(row.id);
      if (!existing) {
        this.rows.set(row.id, row);
        result.inserted++;
      } else if (row.updatedAt > existing.updatedAt) {
        this.rows.set(row.id, row);
        result.updated++;
      } else {
        result.skipped++;
      }
    }
    return result;
  }

  get count(): number {
    return this.rows.size;
  }

  get(id: string): Row | undefined {
    return this.rows.get(id);
  }

  snapshot(): Row[] {
    return [...this.rows.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

/**
 * Incremental selection with an inclusive lower bound.
 *
 * `>=` rather than `>` on purpose: with second-granularity timestamps, several
 * rows can share the watermark value, and a strict `>` drops every row that
 * happened to land in the same tick as the last one you saw. Re-reading a few
 * rows is free precisely because the load is idempotent — losing them is not.
 */
export function selectSince(source: Row[], watermark: number): Row[] {
  return source.filter((r) => r.updatedAt >= watermark);
}

/** The watermark only ever moves forward, so a late small batch cannot rewind it. */
export function advanceWatermark(current: number, batch: Row[]): number {
  return batch.reduce((max, r) => Math.max(max, r.updatedAt), current);
}

export type Check = { name: string; passed: boolean; detail: string };

/**
 * Quality gate. Runs BETWEEN staging and the target: a pipeline that loads
 * anything is worse than no pipeline, because it launders bad data into tables
 * other people trust.
 */
export function runChecks(batch: Row[], opts: { requiredColumns?: string[]; maxNullRatio?: number } = {}): Check[] {
  const checks: Check[] = [];
  const required = opts.requiredColumns ?? [];
  const maxNullRatio = opts.maxNullRatio ?? 0;

  const missingKey = batch.filter((r) => r.id === undefined || r.id === null || r.id === "").length;
  checks.push({
    name: "natural-key-present",
    passed: missingKey === 0,
    detail: `${missingKey} row(s) without a natural key`,
  });

  const dupes = batch.length - new Set(batch.map((r) => r.id)).size;
  checks.push({
    name: "no-duplicate-keys-in-batch",
    passed: dupes === 0,
    detail: `${dupes} duplicate key(s) in batch`,
  });

  for (const col of required) {
    const nulls = batch.filter((r) => r[col] === null || r[col] === undefined).length;
    const ratio = batch.length === 0 ? 0 : nulls / batch.length;
    checks.push({
      name: `null-ratio:${col}`,
      passed: ratio <= maxNullRatio,
      detail: `${(ratio * 100).toFixed(1)}% null, limit ${(maxNullRatio * 100).toFixed(1)}%`,
    });
  }

  const nonMonotonic = batch.filter((r) => typeof r.updatedAt !== "number" || Number.isNaN(r.updatedAt)).length;
  checks.push({
    name: "watermark-column-usable",
    passed: nonMonotonic === 0,
    detail: `${nonMonotonic} row(s) with an unusable updatedAt`,
  });

  return checks;
}

export const allPassed = (checks: Check[]): boolean => checks.every((c) => c.passed);

/**
 * One pipeline run: select since the watermark, gate, merge, advance.
 * A failed gate aborts the load and leaves the watermark untouched, so the next
 * run retries the same window instead of skipping past bad data.
 */
export function runOnce(
  source: Row[],
  target: TargetTable,
  watermark: number,
  opts: Parameters<typeof runChecks>[1] = {},
): { loaded: LoadResult | null; watermark: number; checks: Check[] } {
  const batch = selectSince(source, watermark);
  const checks = runChecks(batch, opts);
  if (!allPassed(checks)) return { loaded: null, watermark, checks };
  const loaded = target.merge(batch);
  return { loaded, watermark: advanceWatermark(watermark, batch), checks };
}
