export type Sample = { name: string; selfMs: number };

/**
 * Percentile from a sample set, nearest-rank.
 *
 * The mean is the wrong statistic for latency and always has been: one 900 ms
 * outlier moves it far less than it moves the experience. Percentiles are also why
 * `sort` must be on a copy — mutating the caller's array turns a measurement into a
 * side effect and silently reorders whatever they measure next.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) throw new Error("no samples");
  if (p < 0 || p > 100) throw new Error("percentile must be within 0..100");
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

export type Budget = { metric: string; maxMs?: number; maxBytes?: number };
export type Measurement = { metric: string; valueMs?: number; valueBytes?: number };
export type BudgetResult = { metric: string; ok: boolean; detail: string };

/**
 * Check measurements against budgets.
 *
 * A missing measurement fails: a budget with nothing behind it is worse than no
 * budget, because the dashboard stays green while the metric is simply absent.
 */
export function checkBudgets(budgets: Budget[], measurements: Measurement[]): BudgetResult[] {
  const byMetric = new Map(measurements.map((m) => [m.metric, m]));
  return budgets.map((b) => {
    const m = byMetric.get(b.metric);
    if (!m) return { metric: b.metric, ok: false, detail: "no measurement — the budget is unenforced" };
    if (b.maxMs !== undefined) {
      if (m.valueMs === undefined) return { metric: b.metric, ok: false, detail: "budget is in ms but the measurement has no valueMs" };
      return {
        metric: b.metric,
        ok: m.valueMs <= b.maxMs,
        detail: `${m.valueMs}ms vs budget ${b.maxMs}ms`,
      };
    }
    if (b.maxBytes !== undefined) {
      if (m.valueBytes === undefined) return { metric: b.metric, ok: false, detail: "budget is in bytes but the measurement has no valueBytes" };
      return {
        metric: b.metric,
        ok: m.valueBytes <= b.maxBytes,
        detail: `${m.valueBytes}B vs budget ${b.maxBytes}B`,
      };
    }
    return { metric: b.metric, ok: false, detail: "budget declares no limit" };
  });
}

export const allWithinBudget = (results: BudgetResult[]): boolean => results.every((r) => r.ok);

export type Regression = { metric: string; baseline: number; current: number; ratio: number };

/**
 * Compare two runs and report real regressions only.
 *
 * Two rules keep this from crying wolf, which is the only way a perf gate survives
 * contact with CI:
 *  - a relative threshold, because +5 ms on a 10 ms metric and on a 2 s metric are
 *    not the same event;
 *  - an absolute floor, because sub-millisecond metrics fluctuate by large ratios on
 *    a noisy shared runner and every one of those alerts is false.
 */
export function findRegressions(
  baseline: Measurement[],
  current: Measurement[],
  opts: { ratio: number; minDeltaMs: number },
): Regression[] {
  const base = new Map(baseline.map((m) => [m.metric, m]));
  const out: Regression[] = [];
  for (const m of current) {
    const b = base.get(m.metric);
    if (!b) continue; // a new metric has nothing to regress against
    const before = b.valueMs ?? b.valueBytes;
    const after = m.valueMs ?? m.valueBytes;
    if (before === undefined || after === undefined || before <= 0) continue;
    const delta = after - before;
    if (delta < opts.minDeltaMs) continue;
    const ratio = after / before;
    if (ratio >= opts.ratio) out.push({ metric: m.metric, baseline: before, current: after, ratio });
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

/**
 * Where the time actually went.
 *
 * Self time, not total: a caller that spends 900 ms waiting on a child is not the
 * problem, and a profile ranked by total time points at `main` every single run.
 */
export function hotPath(samples: Sample[], topN = 3): Sample[] {
  const totals = new Map<string, number>();
  for (const s of samples) totals.set(s.name, (totals.get(s.name) ?? 0) + s.selfMs);
  return [...totals.entries()]
    .map(([name, selfMs]) => ({ name, selfMs }))
    .sort((a, b) => b.selfMs - a.selfMs || a.name.localeCompare(b.name))
    .slice(0, topN);
}
