/** The subset of EXPLAIN (ANALYZE, FORMAT JSON) node fields this tool reasons about. */
export type RawNode = {
  "Node Type": string;
  Plans?: RawNode[];
  "Startup Cost"?: number;
  "Total Cost"?: number;
  "Plan Rows"?: number;
  "Actual Rows"?: number;
  "Actual Total Time"?: number;
  "Actual Startup Time"?: number;
  Loops?: number;
  "Relation Name"?: string;
};

export type PlanNode = {
  nodeType: string;
  relation?: string;
  /** Rows the planner expected, per loop as reported. */
  planRows: number;
  /** Rows actually produced in TOTAL — Actual Rows × Loops. */
  actualRows: number;
  /** Wall time for this node and its children, in TOTAL across loops. */
  totalMs: number;
  /** Wall time attributable to this node alone (total minus children). */
  selfMs: number;
  loops: number;
  children: PlanNode[];
};

/**
 * Parse EXPLAIN JSON into a node tree.
 *
 * The one trap that matters: under a nested loop, `Actual Rows` and
 * `Actual Total Time` are reported PER LOOP, while `Plan Rows` is the planner's
 * per-loop estimate too — but every human-facing number (row counts, timings,
 * estimate error) has to be the total. Forgetting `× Loops` makes an inner node
 * executed 5,000 times look like it returned one row in 0.01 ms, which is exactly
 * the node you were trying to find.
 */
export function parsePlan(raw: RawNode): PlanNode {
  const loops = raw.Loops ?? 1;
  const children = (raw.Plans ?? []).map(parsePlan);
  const totalMs = (raw["Actual Total Time"] ?? 0) * loops;
  const childMs = children.reduce((acc, c) => acc + c.totalMs, 0);
  return {
    nodeType: raw["Node Type"],
    relation: raw["Relation Name"],
    planRows: (raw["Plan Rows"] ?? 0) * loops,
    actualRows: (raw["Actual Rows"] ?? 0) * loops,
    totalMs,
    // Clamped at 0: rounding in the reported per-loop times can make the sum of
    // children exceed the parent by a hair, and a negative self-time is nonsense.
    selfMs: Math.max(0, totalMs - childMs),
    loops,
    children,
  };
}

/** Accepts the array EXPLAIN actually returns, or a bare plan object. */
export function parseExplain(json: unknown): PlanNode {
  const root = Array.isArray(json) ? (json[0] as { Plan: RawNode }) : (json as { Plan: RawNode });
  if (!root || typeof root !== "object" || !("Plan" in root)) {
    throw new Error("not an EXPLAIN FORMAT JSON payload: no Plan key");
  }
  return parsePlan(root.Plan);
}

export function flatten(node: PlanNode): PlanNode[] {
  return [node, ...node.children.flatMap(flatten)];
}

/**
 * Estimate error as a ratio ≥ 1, in whichever direction it is wrong.
 *
 * Symmetric on purpose: a 100× underestimate and a 100× overestimate are both
 * "the planner was 100× off" and both cause bad plan choices. Rows are floored at
 * 1 so a zero-row side does not produce Infinity for an ordinary empty scan.
 */
export function estimateError(node: PlanNode): number {
  const planned = Math.max(1, node.planRows);
  const actual = Math.max(1, node.actualRows);
  return Math.max(planned / actual, actual / planned);
}

/** The node whose estimate is furthest off — where a plan usually goes wrong. */
export function worstEstimate(root: PlanNode): PlanNode {
  return flatten(root).reduce((worst, n) => (estimateError(n) > estimateError(worst) ? n : worst));
}

/** The node that actually burned the most time on its own. */
export function worstSelfTime(root: PlanNode): PlanNode {
  return flatten(root).reduce((worst, n) => (n.selfMs > worst.selfMs ? n : worst));
}
