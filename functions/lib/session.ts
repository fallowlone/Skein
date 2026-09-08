/// <reference types="@cloudflare/workers-types" />

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
export interface SessionRecord { userId: number; exp: number; githubAccessToken?: string; }

const TOKEN_PREFIX = "enc1:";
const textEncoder = new TextEncoder();

function base64(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function unbase64(value: string): Uint8Array { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }

async function tokenKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", textEncoder.encode(`skein:github-session-token:${secret}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function protectToken(token: string, secret?: string): Promise<string> {
  if (!secret) return token;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await tokenKey(secret), textEncoder.encode(token));
  return `${TOKEN_PREFIX}${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}

async function revealToken(value: string, secret?: string): Promise<string | undefined> {
  if (!value.startsWith(TOKEN_PREFIX)) return value;
  if (!secret) return undefined;
  try {
    const [iv, encrypted] = value.slice(TOKEN_PREFIX.length).split(".");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unbase64(iv) }, await tokenKey(secret), unbase64(encrypted));
    return new TextDecoder().decode(plain);
  } catch { return undefined; }
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSession(kv: KVNamespace, userId: number, githubAccessToken?: string, secret?: string): Promise<string> {
  const sid = newId();
  const exp = Date.now() + TTL_SECONDS * 1000;
  const storedToken = githubAccessToken ? await protectToken(githubAccessToken, secret) : undefined;
  await kv.put(`session:${sid}`, JSON.stringify({ userId, exp, ...(storedToken ? { githubAccessToken: storedToken } : {}) }), { expirationTtl: TTL_SECONDS });
  // maintain a per-user index for logout-all / delete
  const idxKey = `usess:${userId}`;
  const existing = (await kv.get(idxKey, "json")) as string[] | null;
  const next = Array.from(new Set([...(existing ?? []), sid]));
  await kv.put(idxKey, JSON.stringify(next), { expirationTtl: TTL_SECONDS });
  return sid;
}

export async function resolveSession(kv: KVNamespace, sid: string): Promise<number | null> {
  return (await resolveSessionRecord(kv, sid))?.userId ?? null;
}

export async function resolveSessionRecord(kv: KVNamespace, sid: string, secret?: string): Promise<SessionRecord | null> {
  if (!sid) return null;
  const rec = (await kv.get(`session:${sid}`, "json")) as SessionRecord | null;
  if (!rec) return null;
  if (rec.exp <= Date.now()) { await kv.delete(`session:${sid}`); return null; }
  const githubAccessToken = rec.githubAccessToken ? await revealToken(rec.githubAccessToken, secret) : undefined;
  return { userId: rec.userId, exp: rec.exp, ...(githubAccessToken ? { githubAccessToken } : {}) };
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
