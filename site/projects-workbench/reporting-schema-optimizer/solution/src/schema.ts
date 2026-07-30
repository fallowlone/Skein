export type Column = { name: string; type: string; nullable?: boolean };
export type Index = { name: string; columns: string[]; unique?: boolean };
export type Table = { name: string; columns: Column[]; indexes: Index[]; rowEstimate: number };

export type Predicate = { column: string; op: "eq" | "range" | "in" };
export type Query = {
  id: string;
  table: string;
  /** WHERE terms, in no particular order. */
  predicates: Predicate[];
  orderBy?: string[];
  select?: string[];
};

export type Advice = { queryId: string; kind: string; detail: string };

/**
 * Can this index serve the query without a heap fetch or a sort?
 *
 * Composite index order is the whole game and the usual mistake: equality columns
 * must come first, and at most ONE range column may follow, because everything after
 * a range predicate is no longer sorted in a way the scan can exploit. An index on
 * `(created_at, tenant_id)` for `WHERE tenant_id = $1 AND created_at > $2` looks
 * right, matches both columns, and still cannot skip to the tenant.
 */
export function indexUsability(index: Index, query: Query): "covers" | "partial" | "unusable" {
  const eq = new Set(query.predicates.filter((p) => p.op === "eq" || p.op === "in").map((p) => p.column));
  const range = new Set(query.predicates.filter((p) => p.op === "range").map((p) => p.column));

  let matched = 0;
  let sawRange = false;
  for (const col of index.columns) {
    if (!sawRange && eq.has(col)) {
      matched++;
      continue;
    }
    if (!sawRange && range.has(col)) {
      matched++;
      sawRange = true; // anything after a range column cannot be used for seeking
      continue;
    }
    break;
  }

  if (matched === 0) return "unusable";
  const allPredicatesUsed = matched === eq.size + range.size;
  if (!allPredicatesUsed) return "partial";

  // An ORDER BY can ride the index only if it continues the same prefix and no range
  // column interrupted it.
  if (query.orderBy && query.orderBy.length > 0) {
    const tail = index.columns.slice(matched);
    const orderMatches = query.orderBy.every((c, i) => tail[i] === c);
    if (!orderMatches || sawRange) return "partial";
  }
  return "covers";
}

/** Best available verdict across a table's indexes. */
export function bestIndex(table: Table, query: Query): { index: Index | null; usability: "covers" | "partial" | "unusable" } {
  let best: { index: Index | null; usability: "covers" | "partial" | "unusable" } = { index: null, usability: "unusable" };
  const rank = { unusable: 0, partial: 1, covers: 2 } as const;
  for (const index of table.indexes) {
    const usability = indexUsability(index, query);
    if (rank[usability] > rank[best.usability]) best = { index, usability };
  }
  return best;
}

const SMALL_TABLE_ROWS = 1000;

/**
 * Advice for a reporting workload.
 *
 * Deliberately conservative: every suggested index costs write throughput and disk,
 * so a recommendation the planner would ignore is worse than none. Small tables are
 * skipped entirely — a sequential scan of 500 rows is the correct plan and adding an
 * index there is cargo cult.
 */
export function adviseQuery(table: Table, query: Query): Advice[] {
  const advice: Advice[] = [];
  const { index, usability } = bestIndex(table, query);

  if (table.rowEstimate <= SMALL_TABLE_ROWS) {
    if (usability !== "covers") {
      advice.push({
        queryId: query.id,
        kind: "no-action",
        detail: `${table.name} has ~${table.rowEstimate} rows — a sequential scan is the right plan; an index here costs writes and buys nothing`,
      });
    }
    return advice;
  }

  if (usability === "unusable") {
    const eq = query.predicates.filter((p) => p.op === "eq" || p.op === "in").map((p) => p.column);
    const range = query.predicates.filter((p) => p.op === "range").map((p) => p.column);
    const suggested = [...eq, ...range.slice(0, 1), ...(query.orderBy ?? []).filter((c) => !eq.includes(c) && !range.includes(c))];
    advice.push({
      queryId: query.id,
      kind: "add-index",
      detail: `no usable index on ${table.name}; add (${suggested.join(", ")}) — equality columns first, then one range column`,
    });
    return advice;
  }

  if (usability === "partial" && index) {
    const eq = query.predicates.filter((p) => p.op === "eq" || p.op === "in").map((p) => p.column);
    const range = query.predicates.filter((p) => p.op === "range").map((p) => p.column);
    advice.push({
      queryId: query.id,
      kind: "reorder-index",
      detail: `${index.name} on (${index.columns.join(", ")}) is only partially usable; equality columns (${eq.join(", ")}) must precede the range column (${range.join(", ") || "none"})`,
    });
  }
  return advice;
}

/** Indexes no query in the workload can use — pure write cost. */
export function unusedIndexes(table: Table, workload: Query[]): Index[] {
  const relevant = workload.filter((q) => q.table === table.name);
  return table.indexes.filter((index) => {
    if (index.unique) return false; // it is a constraint, not just an access path
    return !relevant.some((q) => indexUsability(index, q) !== "unusable");
  });
}

/** Redundant when another index already starts with exactly these columns. */
export function redundantIndexes(table: Table): { redundant: Index; coveredBy: Index }[] {
  const out: { redundant: Index; coveredBy: Index }[] = [];
  for (const a of table.indexes) {
    for (const b of table.indexes) {
      if (a.name === b.name || a.columns.length >= b.columns.length) continue;
      const isPrefix = a.columns.every((c, i) => b.columns[i] === c);
      if (isPrefix && !a.unique) out.push({ redundant: a, coveredBy: b });
    }
  }
  return out;
}
