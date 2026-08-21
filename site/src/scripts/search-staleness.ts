/**
 * Pure decision logic for the deep (Postgres full-text) search group in
 * GlobalSearch.astro, extracted so both the shipped client script and the
 * test suite exercise the exact same code — not a test-only mirror that can
 * drift from what actually ships.
 */

/**
 * Monotonic request-id guard: a slower earlier `/api/search` response must
 * never overwrite the results of a later query the user is actually looking
 * at. Each in-flight request calls `start()` once to claim a sequence
 * number; when it resolves, `accept(mine)` tells it whether it is still the
 * most recent request (`true`) or has been superseded (`false`) and should
 * be dropped silently.
 */
export function createStalenessGuard() {
  let seq = 0;
  return {
    start: (): number => ++seq,
    accept: (mine: number): boolean => mine === seq,
  };
}

/**
 * Whether a deep (server-side) search should be scheduled for this query.
 *
 * The local match count must NEVER gate this decision: the deep group's
 * entire reason for existing is to surface hits — lesson-body text, or a
 * Russian query in an inflected form no title contains — that the local
 * substring index structurally cannot see. Those are exactly the cases
 * where the local match count is zero, so gating on it (as an earlier
 * version of this code did, via an early `return` before the fetch was
 * ever scheduled) silently disables the feature in precisely the situation
 * it was built for.
 */
export function shouldScheduleDeep(query: string, localMatchCount: number): boolean {
  void localMatchCount; // intentionally ignored — see doc comment above
  return query.trim().length > 0;
}
