/// <reference types="@cloudflare/workers-types" />

export interface RateLimitOpts {
  kv: KVNamespace;
  ip: string;
  bucket: string;
  limit: number;
  windowSec: number;
}

/**
 * Fixed-window counter. Good enough for abuse protection on mutating endpoints.
 * Key: rl:<bucket>:<ip>. Count increments; TTL = windowSec.
 */
export async function rateLimit(o: RateLimitOpts): Promise<{ ok: boolean; remaining: number }> {
  const key = `rl:${o.bucket}:${o.ip}`;
  const current = Number((await o.kv.get(key)) ?? "0");
  if (current >= o.limit) return { ok: false, remaining: 0 };
  await o.kv.put(key, String(current + 1), { expirationTtl: o.windowSec });
  return { ok: true, remaining: o.limit - current - 1 };
}
