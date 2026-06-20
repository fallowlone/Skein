const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return b64url(sig);
}

/** Returns "value.signature". The value must not contain a dot. */
export async function signValue(value: string, secret: string): Promise<string> {
  return `${value}.${await hmac(value, secret)}`;
}

/** Constant-time-ish verify. Returns the value or null. */
export async function verifyValue(signed: string, secret: string): Promise<string | null> {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const value = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const expected = await hmac(value, secret);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? value : null;
}

/**
 * Whether cookies set on this request must carry `Secure`. True for any HTTPS
 * request, and also whenever `CF_PAGES` is set — Cloudflare Pages always defines
 * it, so production stays Secure even if a fronting proxy makes the worker see
 * `http:`. Only a local `wrangler pages dev` over plain HTTP (no CF_PAGES) is
 * allowed to set non-Secure cookies, so dev login still works.
 */
export function isSecureRequest(url: URL, env: { CF_PAGES?: string }): boolean {
  return url.protocol === "https:" || env.CF_PAGES === "1";
}

export interface CookieOpts {
  httpOnly?: boolean;
  secure?: boolean;
  maxAge?: number;       // seconds
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
}

export function serializeCookie(name: string, value: string, opts: CookieOpts = {}): string {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

/**
 * Non-HttpOnly companion to the session cookie. It carries no auth power — just
 * a readable "1" so the client can skip the /api/me round trip entirely when no
 * session could exist (anonymous visitors, i.e. the common public-page case and
 * every Lighthouse run). The HttpOnly session cookie remains the only thing the
 * server trusts. Set on login, cleared on logout / account deletion.
 */
export const AUTH_HINT_COOKIE = "awesome.auth";

export function authHintCookie(present: boolean, secure: boolean): string {
  return serializeCookie(AUTH_HINT_COOKIE, present ? "1" : "", {
    httpOnly: false,
    secure,
    sameSite: "Lax",
    maxAge: present ? 60 * 60 * 24 * 30 : 0,
  });
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(";")) {
    const i = pair.indexOf("=");
    if (i < 0) continue;
    out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
}
