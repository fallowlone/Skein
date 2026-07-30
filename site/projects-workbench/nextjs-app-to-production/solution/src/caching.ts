export type RouteKind = "static" | "isr" | "dynamic";

export type Route = {
  path: string;
  /** Does the route read per-request state (cookies, headers, searchParams)? */
  readsRequest: boolean;
  /** Does it read data that changes without a deploy? */
  readsMutableData: boolean;
  /** Revalidation window in seconds; 0 means never cache. */
  revalidate?: number;
  /** Cache tags this route's data belongs to. */
  tags?: string[];
};

export type Decision = { path: string; kind: RouteKind; reason: string };

/**
 * Decide how a route may be cached.
 *
 * The rule people get wrong: reading cookies/headers/searchParams makes a route
 * per-request, full stop. Caching it serves one visitor's page to another — the same
 * bug class as a shared session, and it is silent because the first visitor sees
 * exactly what they expect.
 *
 * Static is only honest when nothing changes without a deploy. Anything else is ISR
 * with an explicit window: "cache forever and hope" is how a price list goes stale for
 * a week.
 */
export function decide(route: Route): Decision {
  if (route.readsRequest) {
    return { path: route.path, kind: "dynamic", reason: "reads per-request state — caching would serve one visitor's page to another" };
  }
  if (route.revalidate === 0) {
    return { path: route.path, kind: "dynamic", reason: "revalidate=0 opts out of caching explicitly" };
  }
  if (!route.readsMutableData) {
    return { path: route.path, kind: "static", reason: "no per-request state and no data that changes without a deploy" };
  }
  if (route.revalidate === undefined) {
    return {
      path: route.path,
      kind: "dynamic",
      reason: "reads mutable data with no revalidate window — an unbounded cache would go stale silently",
    };
  }
  return { path: route.path, kind: "isr", reason: `mutable data with a ${route.revalidate}s window` };
}

/** A cached route must declare either a window or tags, or nothing can ever refresh it. */
export function cacheConfigIssues(route: Route): string[] {
  const issues: string[] = [];
  const decision = decide(route);
  if (decision.kind !== "isr") return issues;
  if ((route.tags ?? []).length === 0 && !route.revalidate) {
    issues.push(`${route.path}: cached with neither a revalidate window nor tags — nothing can refresh it`);
  }
  if (route.revalidate !== undefined && route.revalidate < 0) {
    issues.push(`${route.path}: negative revalidate`);
  }
  return issues;
}

export type CacheEntry = { value: unknown; storedAt: number; tags: string[]; revalidate?: number };

/**
 * Minimal data cache with time and tag invalidation.
 *
 * `stale-while-revalidate` semantics on purpose: an expired entry is still served
 * while a refresh happens behind it, because the alternative — every visitor after the
 * window blocking on the origin — is a stampede at exactly the moment the origin is
 * slowest.
 */
export class DataCache {
  private entries = new Map<string, CacheEntry>();
  /** Keys currently being refreshed, so a stampede collapses to one request. */
  private refreshing = new Set<string>();

  set(key: string, value: unknown, now: number, opts: { tags?: string[]; revalidate?: number } = {}): void {
    this.entries.set(key, { value, storedAt: now, tags: opts.tags ?? [], revalidate: opts.revalidate });
  }

  get(key: string, now: number): { value: unknown; stale: boolean } | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.revalidate === undefined) return { value: entry.value, stale: false };
    const age = (now - entry.storedAt) / 1000;
    return { value: entry.value, stale: age >= entry.revalidate };
  }

  /** True when this caller should perform the refresh; false when one is in flight. */
  claimRefresh(key: string): boolean {
    if (this.refreshing.has(key)) return false;
    this.refreshing.add(key);
    return true;
  }

  finishRefresh(key: string): void {
    this.refreshing.delete(key);
  }

  /** Invalidate by tag — the escape hatch for "publish now", independent of the window. */
  invalidateTag(tag: string): string[] {
    const dropped: string[] = [];
    for (const [key, entry] of this.entries) {
      if (entry.tags.includes(tag)) {
        this.entries.delete(key);
        dropped.push(key);
      }
    }
    return dropped;
  }

  get size(): number {
    return this.entries.size;
  }
}
