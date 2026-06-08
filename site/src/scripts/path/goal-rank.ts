// Pure: goal priority semantics. The stored `priority` number means importance where the
// SMALLEST number is the most important goal; magnitude is irrelevant — only order counts.
// normalizeRanks collapses whatever numbers the user enters into consecutive ranks (1..N),
// and goalWeightFactor inverts rank into a planner weight so rank 1 carries the most weight.
export interface RankedGoal { id: string; rank: number; }

export function normalizeRanks(goals: { id: string; priority: number }[]): RankedGoal[] {
  return [...goals]
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .map((g, i) => ({ id: g.id, rank: i + 1 }));
}

// rank 1 → N (most weight); rank N → 1; out-of-range / N<=0 → floor of 1.
export function goalWeightFactor(rank: number, n: number): number {
  return Math.max(1, n - rank + 1);
}
