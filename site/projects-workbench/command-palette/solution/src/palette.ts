export type PaletteState = { items: string[]; selected: number };
export type Action = { type: "down" } | { type: "up" } | { type: "enter" };

/** Score how well `query` matches `item` as a subsequence (higher = better). */
function score(item: string, query: string): number {
  const lo = item.toLowerCase();
  const q = query.toLowerCase();
  // Prefix match: highest rank
  if (lo.startsWith(q)) return 2;
  // Contiguous substring match: second rank
  if (lo.includes(q)) return 1;
  // Scattered subsequence: rank by how early the first character appears (closer to start = better)
  let qi = 0;
  let firstPos = -1;
  for (let i = 0; i < lo.length && qi < q.length; i++) {
    if (lo[i] === q[qi]) {
      if (qi === 0) firstPos = i;
      qi++;
    }
  }
  // If we consumed all query chars it is a valid subsequence
  if (qi === q.length) {
    // Score between 0 and 1 based on inverse of first-char position
    return 0.5 - firstPos / (lo.length * 2);
  }
  return -1; // not a subsequence
}

/** Returns true when `query` is a subsequence of `item` (case-insensitive). */
function isSubsequence(item: string, query: string): boolean {
  const lo = item.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lo.length && qi < q.length; i++) {
    if (lo[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Returns only the items whose characters contain `query` as a subsequence
 * (case-insensitive), sorted best-first.
 * A prefix / contiguous match ranks above a scattered subsequence.
 * Empty query returns a copy of items in their original order.
 */
export function fuzzyRank(items: string[], query: string): string[] {
  if (query === "") return items.slice();
  return items
    .filter((item) => isSubsequence(item, query))
    .sort((a, b) => score(b, query) - score(a, query));
}

/**
 * Pure reducer for palette keyboard navigation.
 * down:  selected = items.length ? (selected + 1) % items.length : 0
 * up:    selected = items.length ? (selected - 1 + items.length) % items.length : 0
 * enter: no-op (commit is handled outside)
 */
export function reduce(state: PaletteState, action: Action): PaletteState {
  const { items, selected } = state;
  switch (action.type) {
    case "down":
      return { items, selected: items.length ? (selected + 1) % items.length : 0 };
    case "up":
      return { items, selected: items.length ? (selected - 1 + items.length) % items.length : 0 };
    case "enter":
      return state;
  }
}
