export type Entity = { id: string; [field: string]: unknown };
export type Normalized<T extends Entity> = { byId: Record<string, T>; ids: string[] };

/**
 * Normalise a server list into an entity table.
 *
 * A nested response duplicated across screens is the root of most "why is this stale"
 * bugs: the same order lives in three arrays and only one gets updated. One copy per
 * id, referenced by id everywhere else, removes the class of bug rather than the
 * instance. `ids` preserves server order — the store must not decide sort order.
 */
export function normalize<T extends Entity>(items: T[]): Normalized<T> {
  const byId: Record<string, T> = {};
  const ids: string[] = [];
  for (const item of items) {
    if (!(item.id in byId)) ids.push(item.id);
    byId[item.id] = item; // a later duplicate wins, matching last-write semantics
  }
  return { byId, ids };
}

export const selectAll = <T extends Entity>(state: Normalized<T>): T[] =>
  state.ids.map((id) => state.byId[id]).filter(Boolean);

/**
 * Memoise a derived selector on reference identity.
 *
 * Recomputing a filtered array on every render creates a NEW array each time, so a
 * memoised child re-renders even when nothing it cares about changed. That is the
 * whole "React is slow" complaint in one line. `equals` compares inputs, not outputs,
 * so a caller cannot accidentally memoise on a value that always differs.
 */
export function memoizeSelector<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  equals: (a: Args, b: Args) => boolean = defaultEquals,
): ((...args: Args) => R) & { calls: number } {
  let lastArgs: Args | null = null;
  let lastResult: R;
  const wrapped = (...args: Args): R => {
    if (lastArgs && equals(lastArgs, args)) return lastResult;
    lastArgs = args;
    lastResult = fn(...args);
    wrapped.calls++;
    return lastResult;
  };
  wrapped.calls = 0;
  return wrapped;
}

function defaultEquals(a: unknown[], b: unknown[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export type Optimistic<T extends Entity> = {
  state: Normalized<T>;
  /** Snapshots keyed by mutation id, so a rollback restores exactly what was there. */
  pending: Record<string, { id: string; previous: T | undefined }>;
};

/**
 * Optimistic update with a real rollback.
 *
 * Two mistakes this prevents:
 *  - rolling back by re-applying the inverse edit, which is wrong as soon as a second
 *    mutation landed in between. A snapshot is the only correct undo.
 *  - keeping the pending entry after settling, which leaks memory and lets a late
 *    failure roll back a value the user has since changed.
 */
export function applyOptimistic<T extends Entity>(
  store: Optimistic<T>,
  mutationId: string,
  entity: T,
): Optimistic<T> {
  const previous = store.state.byId[entity.id];
  return {
    state: {
      byId: { ...store.state.byId, [entity.id]: entity },
      ids: previous ? store.state.ids : [...store.state.ids, entity.id],
    },
    pending: { ...store.pending, [mutationId]: { id: entity.id, previous } },
  };
}

export function commitOptimistic<T extends Entity>(store: Optimistic<T>, mutationId: string): Optimistic<T> {
  const { [mutationId]: _settled, ...rest } = store.pending;
  return { state: store.state, pending: rest };
}

export function rollbackOptimistic<T extends Entity>(store: Optimistic<T>, mutationId: string): Optimistic<T> {
  const record = store.pending[mutationId];
  if (!record) return store; // already settled: a late failure must not corrupt state
  const { [mutationId]: _rolled, ...rest } = store.pending;
  const byId = { ...store.state.byId };
  let ids = store.state.ids;
  if (record.previous === undefined) {
    delete byId[record.id];
    ids = ids.filter((id) => id !== record.id);
  } else {
    byId[record.id] = record.previous;
  }
  return { state: { byId, ids }, pending: rest };
}
