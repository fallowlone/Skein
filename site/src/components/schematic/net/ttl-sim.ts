/** Resolver-cache model behind DnsTtlSimFig. Pure and deterministic so it can be unit-tested. */

export type QueryKind = "miss" | "hit" | "stale";
export interface CacheSim {
  queries: { t: number; kind: QueryKind }[];
  bands: { from: number; to: number }[];
  stale: number;
}

/** Steady-state hit rate for Poisson arrivals: each miss is followed by λT expected hits. */
export function hitRate(perHour: number, ttlSeconds: number): number {
  const x = (perHour / 3600) * ttlSeconds;
  return x / (1 + x);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulate a cold cache over `windowS` seconds. A query after expiry is a miss and refills the
 * entry for `ttlSeconds`; a hit on an entry fetched before `changeS` but served after it is stale.
 */
export function simulateCache(perHour: number, ttlSeconds: number, windowS: number, changeS: number, seed = 7): CacheSim {
  const rand = mulberry32(seed);
  const lambda = perHour / 3600;
  const queries: CacheSim["queries"] = [];
  const bands: CacheSim["bands"] = [];
  let expiry = -Infinity;
  let fetchedAt = -Infinity;
  let stale = 0;
  for (let t = -Math.log(1 - rand()) / lambda; t < windowS; t += -Math.log(1 - rand()) / lambda) {
    if (t >= expiry) {
      expiry = t + ttlSeconds;
      fetchedAt = t;
      bands.push({ from: t, to: expiry });
      queries.push({ t, kind: "miss" });
    } else if (fetchedAt < changeS && t >= changeS) {
      stale += 1;
      queries.push({ t, kind: "stale" });
    } else {
      queries.push({ t, kind: "hit" });
    }
  }
  return { queries, bands, stale };
}
