// Deterministic build-time sharding for the high-cardinality lesson route.
//
// The static build renders ~4.85k pages single-threaded; ~3.4k of them are
// lessons (1686 EN + 1686 RU). Splitting the lesson route's getStaticPaths
// across SHARD_TOTAL parallel CI jobs lets the dominant render cost run N-ways
// in parallel (see .github/workflows/deploy.yml). Each shard also holds only
// ~1/N of the lesson render contexts in heap, keeping peak memory well under
// the ceiling that forced `build.concurrency: 1`.
//
// SHARD_TOTAL unset or <= 1 => no sharding: every path is kept, so a plain
// local `astro build` produces the full site exactly as before.

/** 32-bit FNV-1a. Stable across Node/Bun, no deps, deterministic per string. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface ShardConfig {
  index: number;
  total: number;
}

/** Read SHARD_INDEX / SHARD_TOTAL from the environment, clamped to a valid range. */
export function shardConfig(env: NodeJS.ProcessEnv = process.env): ShardConfig {
  const total = Math.max(1, Math.trunc(Number(env.SHARD_TOTAL ?? "1")) || 1);
  const rawIndex = Math.trunc(Number(env.SHARD_INDEX ?? "0")) || 0;
  const index = Math.min(total - 1, Math.max(0, rawIndex));
  return { index, total };
}

/**
 * True iff `key` belongs to this shard. `key` must be unique and stable per
 * page so the partition is disjoint (each page in exactly one shard) and
 * complete (their union is every page).
 */
export function inShard(key: string, cfg: ShardConfig): boolean {
  if (cfg.total <= 1) return true;
  return fnv1a(key) % cfg.total === cfg.index;
}

/** Filter getStaticPaths output down to the current shard. */
export function shardPaths<T>(paths: T[], keyOf: (p: T) => string, cfg: ShardConfig = shardConfig()): T[] {
  if (cfg.total <= 1) return paths;
  return paths.filter((p) => inShard(keyOf(p), cfg));
}
