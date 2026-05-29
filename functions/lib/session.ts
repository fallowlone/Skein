/// <reference types="@cloudflare/workers-types" />

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSession(kv: KVNamespace, userId: number): Promise<string> {
  const sid = newId();
  const exp = Date.now() + TTL_SECONDS * 1000;
  await kv.put(`session:${sid}`, JSON.stringify({ userId, exp }), { expirationTtl: TTL_SECONDS });
  // maintain a per-user index for logout-all / delete
  const idxKey = `usess:${userId}`;
  const existing = (await kv.get(idxKey, "json")) as string[] | null;
  const next = Array.from(new Set([...(existing ?? []), sid]));
  await kv.put(idxKey, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
  return sid;
}

export async function resolveSession(kv: KVNamespace, sid: string): Promise<number | null> {
  if (!sid) return null;
  const rec = (await kv.get(`session:${sid}`, "json")) as { userId: number; exp: number } | null;
  if (!rec) return null;
  if (rec.exp <= Date.now()) { await kv.delete(`session:${sid}`); return null; }
  return rec.userId;
}

export async function destroySession(kv: KVNamespace, sid: string): Promise<void> {
  await kv.delete(`session:${sid}`);
}

export async function destroyAllSessions(kv: KVNamespace, userId: number): Promise<void> {
  const idxKey = `usess:${userId}`;
  const sids = ((await kv.get(idxKey, "json")) as string[] | null) ?? [];
  await Promise.all(sids.map(sid => kv.delete(`session:${sid}`)));
  await kv.delete(idxKey);
}
