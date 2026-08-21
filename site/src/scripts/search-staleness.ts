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
  // The endpoint itself refuses anything shorter than 2 characters
  // (functions/api/search.ts MIN_Q), so a 1-character query is a guaranteed
  // 400 — gate here too, or the first keystroke of every search fires a
  // doomed round trip.
  return query.trim().length >= 2;
}

/**
 * Whether a settled deep-search request — success or thrown network error —
 * is still the one whose result belongs on screen: it must be the most
 * recent in-flight request (per the staleness guard's `accept()` verdict)
 * AND the user must still be looking at the query it was issued for.
 *
 * A thrown fetch (offline, DNS failure, aborted connection) is gated by
 * this exact same check before deciding to deliver an empty result set —
 * it must NOT be dropped unconditionally just because it failed. Doing so
 * left the zero-local-results "Searching lesson text…" placeholder stuck
 * on screen forever, with nothing left to clear it: a broken UI, not a
 * degraded one.
 */
export function isDeepResponseCurrent(
  seqAccepted: boolean,
  currentInputValue: string,
  requestedQuery: string,
): boolean {
  return seqAccepted && currentInputValue.trim().toLowerCase() === requestedQuery;
}
