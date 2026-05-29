# GitHub Auth, User Accounts & Terms of Use — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional GitHub OAuth login, a personal cabinet (view/edit nickname, delete account), server-synced learning progress, and a Terms of Use page — without changing the static Astro build or gating public content.

**Architecture:** The Astro site stays `output: "static"`. A sibling `functions/` directory is deployed as Cloudflare Pages Functions on the same origin, exposing `/api/*`. State lives in D1 (users, progress) and KV (sessions, rate-limit, session index). The frontend adds two pages (`/account`, `/terms`) and two Preact islands (`AccountMenu`, `AccountPanel`); `user-state.ts` gains a sync layer. Anonymous users keep working from localStorage with zero network calls.

**Tech Stack:** Cloudflare Pages Functions (Workers runtime), D1 (SQLite), KV, Astro 5 + Preact (existing), vitest (existing), wrangler (new devDep), `@cloudflare/workers-types` (new devDep). Spec: `docs/superpowers/specs/2026-05-29-github-auth-accounts-design.md`.

---

## File structure (locked decomposition)

```
awesome-everything/
  functions/                         NEW workspace (own package.json/tsconfig/vitest)
    package.json
    tsconfig.json
    vitest.config.ts
    test/fakes.ts                    in-memory D1 + KV fakes for tests
    lib/
      cookies.ts        + cookies.test.ts        signed-cookie + Set-Cookie helpers
      response.ts       + response.test.ts        json()/error() + security headers
      session.ts        + session.test.ts         KV session create/verify/destroy + user index
      ratelimit.ts      + ratelimit.test.ts       KV per-IP token bucket
      db.ts             + db.test.ts              D1 helpers (users, progress) + validation
      github.ts         + github.test.ts          OAuth token exchange + /user mapping
      types.ts                                    Env, User, shared types
    _middleware.ts                                session resolve + ratelimit + headers
    api/
      auth/login.ts
      auth/callback.ts
      auth/logout.ts
      me.ts
      account/terms.ts
      account/nickname.ts
      account.ts
      progress.ts
    migrations/0001_init.sql
  wrangler.toml                      NEW Pages config (D1 + KV bindings)
  site/                              MODIFIED only additively:
    src/i18n/ui.json                 + account/auth/terms keys (en+ru)
    src/components/account/AccountMenu.tsx     NEW island
    src/components/account/AccountPanel.tsx    NEW island
    src/components/brand/TitleBar.astro        + AccountMenu in aside slot
    src/components/brand/SiteFooter.astro      NEW (terms link); used by Topic.astro
    src/layouts/Topic.astro                    + SiteFooter
    src/pages/[lang]/account.astro             NEW page
    src/pages/[lang]/terms.astro               NEW page
    src/scripts/user-state.ts                  + sync layer
    src/scripts/account-sync.ts  + .test.ts    NEW: merge + client API wrapper
  docs/operator-setup-auth.md        NEW operator runbook
```

**Conventions to follow (verified in repo):**
- i18n: `import { t, type Locale, isLocale } from "~/i18n"` (or relative in site). Pages use `getStaticPaths` returning `{params:{lang:"en"}}` and `{lang:"ru"}`.
- Islands are `.tsx` Preact components, hydrated with `client:idle` / `client:only="preact"`.
- Existing button style: `class="btn ghost"`.
- Functions use the Cloudflare `onRequest*` handler signature with `PagesFunction<Env>`.

---

## Task 0: Scaffold the `functions/` workspace + wrangler

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/vitest.config.ts`, `functions/lib/types.ts`, `wrangler.toml`, `functions/migrations/0001_init.sql`

- [ ] **Step 1: Create `functions/package.json`**

```json
{
  "name": "awesome-everything-functions",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "dev": "wrangler pages dev ../site/dist --d1 DB --kv SESSIONS --compatibility-date 2024-11-01"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241106.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "wrangler": "^3.84.0"
  }
}
```

- [ ] **Step 2: Create `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: Create `functions/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 4: Create `functions/lib/types.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  TERMS_VERSION: string;
  COOKIE_NAME?: string; // defaults to "session" in dev, "__Host-session" in prod
}

export interface UserRow {
  id: number;
  github_id: number;
  login: string;
  nickname: string;
  avatar_url: string | null;
  terms_version: string | null;
  terms_accepted_at: number | null;
  created_at: number;
}

/** Data attached by _middleware to the request via context.data */
export interface RequestData {
  userId: number | null;
}
```

- [ ] **Step 5: Create `functions/migrations/0001_init.sql`**

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id         INTEGER NOT NULL UNIQUE,
  login             TEXT    NOT NULL,
  nickname          TEXT    NOT NULL,
  avatar_url        TEXT,
  terms_version     TEXT,
  terms_accepted_at INTEGER,
  created_at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 6: Create `wrangler.toml`**

```toml
name = "awesome-everything"
pages_build_output_dir = "site/dist"
compatibility_date = "2024-11-01"

# Bindings — replace the ids after creating the resources (see docs/operator-setup-auth.md).
[[d1_databases]]
binding = "DB"
database_name = "awesome-everything"
database_id = "REPLACE_WITH_D1_ID"

[[kv_namespaces]]
binding = "SESSIONS"
id = "REPLACE_WITH_KV_ID"

# Public, non-secret vars. Secrets (GITHUB_CLIENT_SECRET, SESSION_SECRET) are set
# via the Pages dashboard / `wrangler pages secret put`, never committed.
[vars]
GITHUB_CLIENT_ID = "REPLACE_WITH_CLIENT_ID"
TERMS_VERSION = "2026-05-29"
```

- [ ] **Step 7: Install deps**

Run: `cd functions && bun install`
Expected: lockfile created, no errors.

- [ ] **Step 8: Commit**

```bash
git add functions/package.json functions/tsconfig.json functions/vitest.config.ts functions/lib/types.ts functions/migrations/0001_init.sql wrangler.toml functions/bun.lockb
git commit -m "chore(auth): scaffold functions workspace + wrangler config"
```

---

## Task 1: `lib/cookies.ts` — signed cookie helpers

**Files:**
- Create: `functions/lib/cookies.ts`, `functions/lib/cookies.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/cookies.test.ts
import { describe, it, expect } from "vitest";
import { signValue, verifyValue, serializeCookie, parseCookies } from "./cookies";

const SECRET = "test-secret-please-ignore";

describe("cookies", () => {
  it("sign/verify round-trips", async () => {
    const signed = await signValue("hello", SECRET);
    expect(await verifyValue(signed, SECRET)).toBe("hello");
  });

  it("rejects a tampered value", async () => {
    const signed = await signValue("hello", SECRET);
    const tampered = signed.replace(/^hello/, "hacked");
    expect(await verifyValue(tampered, SECRET)).toBeNull();
  });

  it("rejects a wrong secret", async () => {
    const signed = await signValue("hello", SECRET);
    expect(await verifyValue(signed, "other-secret")).toBeNull();
  });

  it("serializes attributes and parses a header", () => {
    const c = serializeCookie("session", "abc", { httpOnly: true, maxAge: 60, secure: true });
    expect(c).toContain("session=abc");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Max-Age=60");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(parseCookies("a=1; session=abc; b=2").session).toBe("abc");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bun run test lib/cookies.test.ts`
Expected: FAIL — module `./cookies` not found.

- [ ] **Step 3: Write `functions/lib/cookies.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bun run test lib/cookies.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/cookies.ts functions/lib/cookies.test.ts
git commit -m "feat(auth): signed-cookie helpers"
```

---

## Task 2: `lib/response.ts` — json/error + security headers

**Files:**
- Create: `functions/lib/response.ts`, `functions/lib/response.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/response.test.ts
import { describe, it, expect } from "vitest";
import { json, error, withSecurityHeaders } from "./response";

describe("response", () => {
  it("json sets content-type and status", async () => {
    const r = json({ ok: true }, 201);
    expect(r.status).toBe(201);
    expect(r.headers.get("content-type")).toContain("application/json");
    expect(await r.json()).toEqual({ ok: true });
  });

  it("error returns a json error body", async () => {
    const r = error(429, "rate_limited");
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "rate_limited" });
  });

  it("withSecurityHeaders adds headers without dropping existing ones", () => {
    const base = new Response("x", { headers: { "x-test": "1" } });
    const r = withSecurityHeaders(base);
    expect(r.headers.get("x-test")).toBe("1");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("X-Frame-Options")).toBe("DENY");
    expect(r.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bun run test lib/response.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/lib/response.ts`**

```ts
export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function error(status: number, code: string, headers: HeadersInit = {}): Response {
  return json({ error: code }, status, headers);
}

export function withSecurityHeaders(res: Response): Response {
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bun run test lib/response.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/response.ts functions/lib/response.test.ts
git commit -m "feat(auth): json/error responses + security headers"
```

---

## Task 3: `test/fakes.ts` — in-memory D1 + KV

**Files:**
- Create: `functions/test/fakes.ts`

This is shared test infrastructure (no test of its own; exercised by later tests).

- [ ] **Step 1: Write `functions/test/fakes.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />

/** Minimal in-memory KV implementing the subset we use. */
export class FakeKV {
  private store = new Map<string, { value: string; exp: number | null }>();

  async get(key: string, type?: "text" | "json"): Promise<any> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.exp !== null && e.exp <= Date.now()) { this.store.delete(key); return null; }
    return type === "json" ? JSON.parse(e.value) : e.value;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const exp = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null;
    this.store.set(key, { value, exp });
  }
  async delete(key: string): Promise<void> { this.store.delete(key); }
  /** test helper: force-expire by rewinding */
  _expire(key: string) { const e = this.store.get(key); if (e) e.exp = 1; }
}

/**
 * Tiny D1 fake supporting only the exact statements db.ts issues.
 * Matches on a normalized prefix of the SQL string.
 */
interface FakeUser {
  id: number; github_id: number; login: string; nickname: string;
  avatar_url: string | null; terms_version: string | null;
  terms_accepted_at: number | null; created_at: number;
}
export class FakeD1 {
  users: FakeUser[] = [];
  progress = new Map<number, { data: string; updated_at: number }>();
  private seq = 1;

  prepare(sql: string): FakeStmt { return new FakeStmt(this, sql.trim().replace(/\s+/g, " ")); }
  // D1 batch not used; single statements only.
}

class FakeStmt {
  private args: unknown[] = [];
  constructor(private db: FakeD1, private sql: string) {}
  bind(...args: unknown[]): FakeStmt { this.args = args; return this; }

  async first<T = any>(): Promise<T | null> {
    if (this.sql.startsWith("SELECT * FROM users WHERE github_id")) {
      return (this.db.users.find(u => u.github_id === this.args[0]) ?? null) as T | null;
    }
    if (this.sql.startsWith("SELECT * FROM users WHERE id")) {
      return (this.db.users.find(u => u.id === this.args[0]) ?? null) as T | null;
    }
    if (this.sql.startsWith("SELECT data FROM progress WHERE user_id")) {
      const p = this.db.progress.get(this.args[0] as number);
      return (p ? { data: p.data } : null) as T | null;
    }
    return null;
  }

  async run(): Promise<{ success: true; meta: { last_row_id: number } }> {
    if (this.sql.startsWith("INSERT INTO users")) {
      const [github_id, login, nickname, avatar_url, created_at] = this.args as any[];
      const row: FakeUser = {
        id: this.seqNext(), github_id, login, nickname, avatar_url,
        terms_version: null, terms_accepted_at: null, created_at,
      };
      this.db.users.push(row);
      return { success: true, meta: { last_row_id: row.id } };
    }
    if (this.sql.startsWith("UPDATE users SET login")) {
      const [login, avatar_url, github_id] = this.args as any[];
      const u = this.db.users.find(x => x.github_id === github_id);
      if (u) { u.login = login; u.avatar_url = avatar_url; }
    }
    if (this.sql.startsWith("UPDATE users SET nickname")) {
      const [nickname, id] = this.args as any[];
      const u = this.db.users.find(x => x.id === id);
      if (u) u.nickname = nickname;
    }
    if (this.sql.startsWith("UPDATE users SET terms_version")) {
      const [terms_version, terms_accepted_at, id] = this.args as any[];
      const u = this.db.users.find(x => x.id === id);
      if (u) { u.terms_version = terms_version; u.terms_accepted_at = terms_accepted_at; }
    }
    if (this.sql.startsWith("INSERT INTO progress")) {
      const [user_id, data, updated_at] = this.args as any[];
      this.db.progress.set(user_id, { data, updated_at });
    }
    if (this.sql.startsWith("DELETE FROM progress WHERE user_id")) {
      this.db.progress.delete(this.args[0] as number);
    }
    if (this.sql.startsWith("DELETE FROM users WHERE id")) {
      const id = this.args[0] as number;
      this.db.users = this.db.users.filter(u => u.id !== id);
      this.db.progress.delete(id);
    }
    if (this.sql.startsWith("PRAGMA")) { /* no-op */ }
    return { success: true, meta: { last_row_id: 0 } };
  }
  private seqNext(): number { return (this as any).db["seq"]++; }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/test/fakes.ts
git commit -m "test(auth): in-memory D1 + KV fakes"
```

---

## Task 4: `lib/session.ts` — KV sessions + user index

**Files:**
- Create: `functions/lib/session.ts`, `functions/lib/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/session.test.ts
import { describe, it, expect } from "vitest";
import { createSession, resolveSession, destroySession, destroyAllSessions } from "./session";
import { FakeKV } from "../test/fakes";

describe("session", () => {
  it("creates then resolves a session to the userId", async () => {
    const kv = new FakeKV() as any;
    const sid = await createSession(kv, 42);
    expect(typeof sid).toBe("string");
    expect(await resolveSession(kv, sid)).toBe(42);
  });

  it("returns null for an unknown session", async () => {
    const kv = new FakeKV() as any;
    expect(await resolveSession(kv, "nope")).toBeNull();
  });

  it("returns null after expiry", async () => {
    const kv = new FakeKV();
    const sid = await createSession(kv as any, 7);
    kv._expire(`session:${sid}`);
    expect(await resolveSession(kv as any, sid)).toBeNull();
  });

  it("destroySession removes it", async () => {
    const kv = new FakeKV() as any;
    const sid = await createSession(kv, 1);
    await destroySession(kv, sid);
    expect(await resolveSession(kv, sid)).toBeNull();
  });

  it("destroyAllSessions kills every session for a user", async () => {
    const kv = new FakeKV() as any;
    const a = await createSession(kv, 5);
    const b = await createSession(kv, 5);
    await destroyAllSessions(kv, 5);
    expect(await resolveSession(kv, a)).toBeNull();
    expect(await resolveSession(kv, b)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bun run test lib/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/lib/session.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bun run test lib/session.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/session.ts functions/lib/session.test.ts
git commit -m "feat(auth): KV sessions with per-user index"
```

---

## Task 5: `lib/ratelimit.ts` — KV per-IP token bucket

**Files:**
- Create: `functions/lib/ratelimit.ts`, `functions/lib/ratelimit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/ratelimit.test.ts
import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";
import { FakeKV } from "../test/fakes";

describe("ratelimit", () => {
  it("allows up to the limit then denies", async () => {
    const kv = new FakeKV() as any;
    const opts = { kv, ip: "1.2.3.4", bucket: "w", limit: 3, windowSec: 60 };
    expect((await rateLimit(opts)).ok).toBe(true);
    expect((await rateLimit(opts)).ok).toBe(true);
    expect((await rateLimit(opts)).ok).toBe(true);
    expect((await rateLimit(opts)).ok).toBe(false);
  });

  it("separates buckets and ips", async () => {
    const kv = new FakeKV() as any;
    expect((await rateLimit({ kv, ip: "a", bucket: "x", limit: 1, windowSec: 60 })).ok).toBe(true);
    expect((await rateLimit({ kv, ip: "a", bucket: "x", limit: 1, windowSec: 60 })).ok).toBe(false);
    expect((await rateLimit({ kv, ip: "b", bucket: "x", limit: 1, windowSec: 60 })).ok).toBe(true);
    expect((await rateLimit({ kv, ip: "a", bucket: "y", limit: 1, windowSec: 60 })).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bun run test lib/ratelimit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/lib/ratelimit.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bun run test lib/ratelimit.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/ratelimit.ts functions/lib/ratelimit.test.ts
git commit -m "feat(auth): KV per-IP rate limiter"
```

---

## Task 6: `lib/db.ts` — users/progress D1 helpers + validation

**Files:**
- Create: `functions/lib/db.ts`, `functions/lib/db.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/db.test.ts
import { describe, it, expect } from "vitest";
import {
  upsertUserFromGithub, getUserById, setNickname, acceptTerms,
  deleteUser, getProgress, putProgress, validateNickname,
} from "./db";
import { FakeD1 } from "../test/fakes";

const gh = { id: 999, login: "octocat", avatar_url: "https://x/y.png" };

describe("db", () => {
  it("first sign-in inserts with nickname=login; return preserves chosen nickname", async () => {
    const db = new FakeD1() as any;
    const u1 = await upsertUserFromGithub(db, gh);
    expect(u1.nickname).toBe("octocat");
    await setNickname(db, u1.id, "Cat Master");
    const u2 = await upsertUserFromGithub(db, { ...gh, login: "octocat-renamed", avatar_url: "https://x/z.png" });
    expect(u2.id).toBe(u1.id);
    expect(u2.nickname).toBe("Cat Master");     // preserved
    expect(u2.login).toBe("octocat-renamed");   // refreshed
    expect(u2.avatar_url).toBe("https://x/z.png");
  });

  it("acceptTerms records version + timestamp", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await acceptTerms(db, u.id, "2026-05-29", 1000);
    const fresh = await getUserById(db, u.id);
    expect(fresh!.terms_version).toBe("2026-05-29");
    expect(fresh!.terms_accepted_at).toBe(1000);
  });

  it("progress round-trips and deleteUser cascades", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await putProgress(db, u.id, '{"tier":"senior"}', 5);
    expect(await getProgress(db, u.id)).toBe('{"tier":"senior"}');
    await deleteUser(db, u.id);
    expect(await getUserById(db, u.id)).toBeNull();
    expect(await getProgress(db, u.id)).toBeNull();
  });

  it("validateNickname accepts/rejects", () => {
    expect(validateNickname("ab").ok).toBe(true);
    expect(validateNickname("Cat Master_1.2-3").ok).toBe(true);
    expect(validateNickname("a").ok).toBe(false);          // too short
    expect(validateNickname("x".repeat(33)).ok).toBe(false); // too long
    expect(validateNickname("bad<script>").ok).toBe(false);  // bad chars
    expect(validateNickname("  ab  ").value).toBe("ab");     // trimmed
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bun run test lib/db.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/lib/db.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { UserRow } from "./types";

export interface GithubUser { id: number; login: string; avatar_url: string | null; }

export async function getUserById(db: D1Database, id: number): Promise<UserRow | null> {
  return await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

async function getUserByGithubId(db: D1Database, githubId: number): Promise<UserRow | null> {
  return await db.prepare("SELECT * FROM users WHERE github_id = ?").bind(githubId).first<UserRow>();
}

/** Insert on first sign-in (nickname defaults to login); else refresh login+avatar, keep nickname. */
export async function upsertUserFromGithub(db: D1Database, gh: GithubUser): Promise<UserRow> {
  const existing = await getUserByGithubId(db, gh.id);
  if (!existing) {
    const now = Date.now();
    const res = await db
      .prepare("INSERT INTO users (github_id, login, nickname, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(gh.id, gh.login, gh.login, gh.avatar_url, now)
      .run();
    const id = res.meta.last_row_id;
    return (await getUserById(db, id))!;
  }
  await db
    .prepare("UPDATE users SET login = ?, avatar_url = ? WHERE github_id = ?")
    .bind(gh.login, gh.avatar_url, gh.id)
    .run();
  return (await getUserByGithubId(db, gh.id))!;
}

export async function setNickname(db: D1Database, id: number, nickname: string): Promise<void> {
  await db.prepare("UPDATE users SET nickname = ? WHERE id = ?").bind(nickname, id).run();
}

export async function acceptTerms(db: D1Database, id: number, version: string, at: number): Promise<void> {
  await db.prepare("UPDATE users SET terms_version = ?, terms_accepted_at = ? WHERE id = ?")
    .bind(version, at, id).run();
}

export async function deleteUser(db: D1Database, id: number): Promise<void> {
  // explicit progress delete in addition to ON DELETE CASCADE (defensive)
  await db.prepare("DELETE FROM progress WHERE user_id = ?").bind(id).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}

export async function getProgress(db: D1Database, userId: number): Promise<string | null> {
  const row = await db.prepare("SELECT data FROM progress WHERE user_id = ?").bind(userId).first<{ data: string }>();
  return row?.data ?? null;
}

export async function putProgress(db: D1Database, userId: number, data: string, updatedAt: number): Promise<void> {
  await db.prepare(
    "INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) " +
    "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).bind(userId, data, updatedAt).run();
}

const NICK_RE = /^[\p{L}\p{N} _.\-]{2,32}$/u;
export function validateNickname(raw: string): { ok: boolean; value: string } {
  const value = (raw ?? "").trim();
  return { ok: NICK_RE.test(value), value };
}
```

> Note: the FakeD1 `putProgress` matches on `INSERT INTO progress` prefix and overwrites the map entry, so the `ON CONFLICT` upsert behaves correctly in tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bun run test lib/db.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/db.ts functions/lib/db.test.ts
git commit -m "feat(auth): D1 user/progress helpers + nickname validation"
```

---

## Task 7: `lib/github.ts` — OAuth exchange + user mapping

**Files:**
- Create: `functions/lib/github.ts`, `functions/lib/github.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/github.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { exchangeCodeForUser, mapGithubUser } from "./github";

afterEach(() => vi.restoreAllMocks());

describe("github", () => {
  it("maps a /user payload to {id, login, avatar_url}", () => {
    const mapped = mapGithubUser({ id: 5, login: "octo", avatar_url: "a", email: "drop@me" } as any);
    expect(mapped).toEqual({ id: 5, login: "octo", avatar_url: "a" });
  });

  it("exchangeCodeForUser posts the code then fetches the user", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok" }), { headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 9, login: "u", avatar_url: "av" }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const user = await exchangeCodeForUser("the-code", { clientId: "cid", clientSecret: "sec" });
    expect(user).toEqual({ id: 9, login: "u", avatar_url: "av" });
    // first call is the token endpoint with the code in the body
    expect(fetchMock.mock.calls[0][0]).toContain("github.com/login/oauth/access_token");
    expect(JSON.stringify(fetchMock.mock.calls[0][1].body)).toContain("the-code");
    // second call carries the bearer token
    expect((fetchMock.mock.calls[1][1].headers as any).Authorization).toBe("Bearer tok");
  });

  it("throws when github returns no access_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad_verification_code" }), { headers: { "content-type": "application/json" } }),
    ));
    await expect(exchangeCodeForUser("x", { clientId: "c", clientSecret: "s" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bun run test lib/github.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `functions/lib/github.ts`**

```ts
import type { GithubUser } from "./db";

interface GithubUserPayload { id: number; login: string; avatar_url: string | null; }

export function mapGithubUser(p: GithubUserPayload): GithubUser {
  return { id: p.id, login: p.login, avatar_url: p.avatar_url ?? null };
}

export async function exchangeCodeForUser(
  code: string,
  creds: { clientId: string; clientSecret: string },
): Promise<GithubUser> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: creds.clientId, client_secret: creds.clientSecret, code }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) throw new Error("github_token_exchange_failed");

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "awesome-everything",
    },
  });
  if (!userRes.ok) throw new Error("github_user_fetch_failed");
  const payload = (await userRes.json()) as GithubUserPayload;
  return mapGithubUser(payload);
}

/** Build the GitHub authorize URL. */
export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", "read:user");
  u.searchParams.set("state", state);
  return u.toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bun run test lib/github.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/github.ts functions/lib/github.test.ts
git commit -m "feat(auth): GitHub OAuth exchange + user mapping"
```

---

## Task 8: `_middleware.ts` — session resolve + rate-limit + headers

**Files:**
- Create: `functions/_middleware.ts`

Middleware runs before every function. It resolves the session cookie into
`data.userId`, applies a coarse rate limit to mutating `/api` methods, and wraps
the downstream response in security headers. No test of its own (logic lives in
tested libs); verified end-to-end via `wrangler pages dev` in Task 16.

- [ ] **Step 1: Write `functions/_middleware.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "./lib/types";
import { resolveSession } from "./lib/session";
import { parseCookies, verifyValue } from "./lib/cookies";
import { rateLimit } from "./lib/ratelimit";
import { withSecurityHeaders, error } from "./lib/response";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequest: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const { request, env, next, data } = ctx;
  const url = new URL(request.url);

  // Resolve session (signed cookie -> sid -> userId)
  data.userId = null;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const signed = cookies[cookieName(env)];
  if (signed) {
    const sid = await verifyValue(signed, env.SESSION_SECRET);
    if (sid) data.userId = await resolveSession(env.SESSIONS, sid);
  }

  // Rate-limit mutating API calls per IP
  if (url.pathname.startsWith("/api/") && request.method !== "GET") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const rl = await rateLimit({ kv: env.SESSIONS, ip, bucket: "api-write", limit: 60, windowSec: 60 });
    if (!rl.ok) return withSecurityHeaders(error(429, "rate_limited"));
  }

  return withSecurityHeaders(await next());
};
```

- [ ] **Step 2: Typecheck**

Run: `cd functions && bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/_middleware.ts
git commit -m "feat(auth): edge middleware — session, rate-limit, headers"
```

---

## Task 9: `api/auth/login.ts` — redirect to GitHub

**Files:**
- Create: `functions/api/auth/login.ts`

- [ ] **Step 1: Write `functions/api/auth/login.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { authorizeUrl } from "../../lib/github";
import { signValue, serializeCookie } from "../../lib/cookies";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "ru" ? "ru" : "en";

  // random state, stored signed in a short-lived cookie for CSRF protection
  const state = crypto.randomUUID();
  const stateCookie = await signValue(`${state}|${lang}`, env.SESSION_SECRET);
  const redirectUri = `${url.origin}/api/auth/callback`;

  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie("oauth_state", stateCookie, {
    httpOnly: true, secure: url.protocol === "https:", maxAge: 600, sameSite: "Lax",
  }));
  headers.set("Location", authorizeUrl(env.GITHUB_CLIENT_ID, redirectUri, state));
  return new Response(null, { status: 302, headers });
};
```

- [ ] **Step 2: Typecheck**

Run: `cd functions && bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/api/auth/login.ts
git commit -m "feat(auth): /api/auth/login redirect to GitHub"
```

---

## Task 10: `api/auth/callback.ts` — exchange, upsert, session

**Files:**
- Create: `functions/api/auth/callback.ts`

- [ ] **Step 1: Write `functions/api/auth/callback.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { exchangeCodeForUser } from "../../lib/github";
import { upsertUserFromGithub } from "../../lib/db";
import { createSession } from "../../lib/session";
import { parseCookies, verifyValue, signValue, serializeCookie } from "../../lib/cookies";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedState = cookies["oauth_state"];
  const verified = signedState ? await verifyValue(signedState, env.SESSION_SECRET) : null;
  if (!code || !state || !verified) return new Response("Bad request", { status: 400 });
  const [expectedState, lang] = verified.split("|");
  if (state !== expectedState) return new Response("State mismatch", { status: 400 });

  let user;
  try {
    const gh = await exchangeCodeForUser(code, {
      clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET,
    });
    user = await upsertUserFromGithub(env.DB, gh);
  } catch {
    return new Response("Auth failed", { status: 502 });
  }

  const sid = await createSession(env.SESSIONS, user.id);
  const signedSid = await signValue(sid, env.SESSION_SECRET);

  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie(cookieName(env), signedSid, {
    httpOnly: true, secure: url.protocol === "https:", maxAge: 60 * 60 * 24 * 30, sameSite: "Lax",
  }));
  // clear the state cookie
  headers.append("Set-Cookie", serializeCookie("oauth_state", "", { httpOnly: true, maxAge: 0 }));
  headers.set("Location", `/${lang === "ru" ? "ru" : "en"}/account`);
  return new Response(null, { status: 302, headers });
};
```

- [ ] **Step 2: Typecheck**

Run: `cd functions && bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/api/auth/callback.ts
git commit -m "feat(auth): /api/auth/callback exchange + session"
```

---

## Task 11: `api/auth/logout.ts`

**Files:**
- Create: `functions/api/auth/logout.ts`

- [ ] **Step 1: Write `functions/api/auth/logout.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { parseCookies, verifyValue, serializeCookie } from "../../lib/cookies";
import { destroySession } from "../../lib/session";
import { json } from "../../lib/response";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const signed = cookies[cookieName(env)];
  if (signed) {
    const sid = await verifyValue(signed, env.SESSION_SECRET);
    if (sid) await destroySession(env.SESSIONS, sid);
  }
  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie(cookieName(env), "", { httpOnly: true, maxAge: 0 }));
  return json({ ok: true }, 200, headers);
};
```

- [ ] **Step 2: Typecheck**

Run: `cd functions && bun run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add functions/api/auth/logout.ts
git commit -m "feat(auth): /api/auth/logout"
```

---

## Task 12: `api/me.ts` — current user

**Files:**
- Create: `functions/api/me.ts`

- [ ] **Step 1: Write `functions/api/me.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getUserById } from "../lib/db";
import { json, error } from "../lib/response";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const u = await getUserById(ctx.env.DB, userId);
  if (!u) return error(401, "unauthenticated");
  const termsCurrent = u.terms_accepted_at != null && u.terms_version === ctx.env.TERMS_VERSION;
  return json({
    login: u.login,
    nickname: u.nickname,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
    termsAccepted: termsCurrent,
    termsVersion: ctx.env.TERMS_VERSION,
  });
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd functions && bun run typecheck
git add functions/api/me.ts
git commit -m "feat(auth): /api/me current user"
```

---

## Task 13: `api/account/terms.ts` — accept terms

**Files:**
- Create: `functions/api/account/terms.ts`

- [ ] **Step 1: Write `functions/api/account/terms.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { acceptTerms } from "../../lib/db";
import { json, error } from "../../lib/response";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  await acceptTerms(ctx.env.DB, userId, ctx.env.TERMS_VERSION, Date.now());
  return json({ ok: true, termsVersion: ctx.env.TERMS_VERSION });
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd functions && bun run typecheck
git add functions/api/account/terms.ts
git commit -m "feat(auth): /api/account/terms acceptance"
```

---

## Task 14: `api/account/nickname.ts` — change nickname

**Files:**
- Create: `functions/api/account/nickname.ts`

- [ ] **Step 1: Write `functions/api/account/nickname.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { setNickname, validateNickname, getUserById } from "../../lib/db";
import { json, error } from "../../lib/response";

export const onRequestPatch: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const u = await getUserById(ctx.env.DB, userId);
  if (!u || u.terms_accepted_at == null || u.terms_version !== ctx.env.TERMS_VERSION) {
    return error(403, "terms_required");
  }
  let body: { nickname?: string };
  try { body = await ctx.request.json(); } catch { return error(400, "bad_json"); }
  const v = validateNickname(body.nickname ?? "");
  if (!v.ok) return error(422, "invalid_nickname");
  await setNickname(ctx.env.DB, userId, v.value);
  return json({ ok: true, nickname: v.value });
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd functions && bun run typecheck
git add functions/api/account/nickname.ts
git commit -m "feat(auth): /api/account/nickname update (terms-gated)"
```

---

## Task 15: `api/account.ts` — delete account (cascade)

**Files:**
- Create: `functions/api/account.ts`

- [ ] **Step 1: Write `functions/api/account.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { deleteUser } from "../lib/db";
import { destroyAllSessions } from "../lib/session";
import { serializeCookie } from "../lib/cookies";
import { json, error } from "../lib/response";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequestDelete: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  await deleteUser(ctx.env.DB, userId);               // removes user + progress (cascade)
  await destroyAllSessions(ctx.env.SESSIONS, userId); // kills every session
  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie(cookieName(ctx.env), "", { httpOnly: true, maxAge: 0 }));
  return json({ ok: true }, 200, headers);
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd functions && bun run typecheck
git add functions/api/account.ts
git commit -m "feat(auth): /api/account DELETE (cascade + session purge)"
```

---

## Task 16: `api/progress.ts` — GET/PUT sync

**Files:**
- Create: `functions/api/progress.ts`

- [ ] **Step 1: Write `functions/api/progress.ts`**

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getProgress, putProgress, getUserById } from "../lib/db";
import { json, error } from "../lib/response";

const MAX_BYTES = 256 * 1024; // 256 KB ceiling on a progress blob

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const data = await getProgress(ctx.env.DB, userId);
  return json({ data: data ? JSON.parse(data) : null });
};

export const onRequestPut: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const u = await getUserById(ctx.env.DB, userId);
  if (!u || u.terms_accepted_at == null || u.terms_version !== ctx.env.TERMS_VERSION) {
    return error(403, "terms_required");
  }
  const text = await ctx.request.text();
  if (text.length > MAX_BYTES) return error(413, "too_large");
  try { JSON.parse(text); } catch { return error(400, "bad_json"); }
  await putProgress(ctx.env.DB, userId, text, Date.now());
  return json({ ok: true });
};
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd functions && bun run typecheck
git add functions/api/progress.ts
git commit -m "feat(auth): /api/progress GET/PUT sync (terms-gated, size-capped)"
```

---

## Task 17: Local end-to-end smoke via wrangler

**Files:** none (verification task)

- [ ] **Step 1: Build the static site**

Run: `cd site && bun run build`
Expected: 3912 pages, lint 0 errors.

- [ ] **Step 2: Create local D1 + apply migration**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
bunx wrangler d1 execute DB --local --file functions/migrations/0001_init.sql
```
Expected: "Executed 2 commands" (or similar success).

- [ ] **Step 3: Start the dev server**

Run (in a background terminal):
```bash
cd /Users/artemmac/dev/awesome-everything
bunx wrangler pages dev site/dist --d1 DB --kv SESSIONS --compatibility-date 2024-11-01
```

- [ ] **Step 4: Hit `/api/me` unauthenticated**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/api/me`
Expected: `401`.

- [ ] **Step 5: Confirm security headers present**

Run: `curl -sI http://localhost:8788/api/me | grep -i x-content-type-options`
Expected: `X-Content-Type-Options: nosniff`.

> Full OAuth round-trip needs real GitHub credentials (operator setup, Task 21).
> Stop here for unauthenticated verification. No commit (verification only).

---

## Task 18: Frontend i18n keys (en + ru)

**Files:**
- Modify: `site/src/i18n/ui.json`

- [ ] **Step 1: Add keys to both `en` and `ru` objects in `site/src/i18n/ui.json`**

Add these key/value pairs inside the existing `"en"` object:

```json
"account.title": "Account",
"account.signIn": "Sign in with GitHub",
"account.signOut": "Sign out",
"account.menu": "Account",
"account.nickname": "Nickname",
"account.nicknameSave": "Save",
"account.nicknameHint": "2–32 characters: letters, numbers, space, _ . -",
"account.nicknameSaved": "Nickname updated",
"account.nicknameInvalid": "Invalid nickname",
"account.githubLogin": "GitHub username",
"account.created": "Member since",
"account.delete": "Delete account",
"account.deleteWarn": "This permanently deletes your account and all synced progress. This cannot be undone.",
"account.deleteConfirm": "Type your nickname to confirm",
"account.deleteCta": "Delete permanently",
"account.deleted": "Account deleted",
"account.termsGate": "Please accept the Terms of Use to enable your account.",
"account.termsAccept": "I accept the Terms of Use",
"account.termsLink": "Read the Terms of Use",
"account.syncOn": "Progress syncs to your account",
"account.loading": "Loading…",
"terms.title": "Terms of Use",
"terms.footer": "Terms of Use",
"auth.failed": "Sign-in failed. Please try again."
```

Add the Russian equivalents inside the existing `"ru"` object:

```json
"account.title": "Кабинет",
"account.signIn": "Войти через GitHub",
"account.signOut": "Выйти",
"account.menu": "Кабинет",
"account.nickname": "Никнейм",
"account.nicknameSave": "Сохранить",
"account.nicknameHint": "2–32 символа: буквы, цифры, пробел, _ . -",
"account.nicknameSaved": "Никнейм обновлён",
"account.nicknameInvalid": "Недопустимый никнейм",
"account.githubLogin": "Имя пользователя GitHub",
"account.created": "С нами с",
"account.delete": "Удалить аккаунт",
"account.deleteWarn": "Это безвозвратно удалит аккаунт и весь синхронизированный прогресс. Действие необратимо.",
"account.deleteConfirm": "Введите свой никнейм для подтверждения",
"account.deleteCta": "Удалить навсегда",
"account.deleted": "Аккаунт удалён",
"account.termsGate": "Примите Условия использования, чтобы активировать аккаунт.",
"account.termsAccept": "Я принимаю Условия использования",
"account.termsLink": "Читать Условия использования",
"account.syncOn": "Прогресс синхронизируется с аккаунтом",
"account.loading": "Загрузка…",
"terms.title": "Условия использования",
"terms.footer": "Условия использования",
"auth.failed": "Не удалось войти. Попробуйте ещё раз."
```

- [ ] **Step 2: Verify JSON parses**

Run: `cd site && bunx tsc --noEmit 2>/dev/null; node -e "JSON.parse(require('fs').readFileSync('src/i18n/ui.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add site/src/i18n/ui.json
git commit -m "i18n(auth): account/terms/auth UI strings en+ru"
```

---

## Task 19: `account-sync.ts` — client API + merge (with tests)

**Files:**
- Create: `site/src/scripts/account-sync.ts`, `site/src/scripts/account-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/account-sync.test.ts
import { describe, it, expect } from "vitest";
import { mergeProgress } from "./account-sync";

describe("mergeProgress", () => {
  it("takes the per-lesson entry with the larger lastAt", () => {
    const local = { history: { a: { firstAt: 1, lastAt: 10, tiersOpened: [] } } } as any;
    const server = { history: { a: { firstAt: 1, lastAt: 20, tiersOpened: [] }, b: { firstAt: 2, lastAt: 5, tiersOpened: [] } } } as any;
    const merged = mergeProgress(local, server);
    expect(merged.history.a.lastAt).toBe(20); // server newer
    expect(merged.history.b.lastAt).toBe(5);  // server-only kept
  });

  it("keeps local-only lessons", () => {
    const local = { history: { x: { firstAt: 1, lastAt: 9, tiersOpened: [] } } } as any;
    const server = { history: {} } as any;
    expect(mergeProgress(local, server).history.x.lastAt).toBe(9);
  });

  it("merges retrieval by lastAt and unions scalar prefs from local", () => {
    const local = { tier: "senior", retrieval: { q: { attempted: true, lastAt: 30, attempts: 2 } }, history: {} } as any;
    const server = { tier: "middle", retrieval: { q: { attempted: true, lastAt: 10, attempts: 1 } }, history: {} } as any;
    const m = mergeProgress(local, server);
    expect(m.retrieval.q.lastAt).toBe(30);
    expect(m.tier).toBe("senior"); // local scalar wins
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/scripts/account-sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `site/src/scripts/account-sync.ts`**

```ts
import type { UserState } from "./user-state";

type Stamped = { lastAt: number };
function mergeStampedMap<T extends Stamped>(
  a: Record<string, T> = {}, b: Record<string, T> = {},
): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    if (!cur || v.lastAt > cur.lastAt) out[k] = v;
  }
  return out;
}

/** Merge two UserStates: timestamped maps by max(lastAt); scalar prefs prefer `local`. */
export function mergeProgress(local: UserState, server: UserState): UserState {
  return {
    ...server,
    ...local, // local scalar prefs (tier, lang, motion, manualTierFlips, pretest) win
    history: mergeStampedMap(server.history, local.history),
    retrieval: mergeStampedMap(server.retrieval, local.retrieval),
    dismissedRevisit: { ...server.dismissedRevisit, ...local.dismissedRevisit },
  };
}

// --- client API wrappers (network) ---

export async function fetchMe(): Promise<{
  login: string; nickname: string; avatarUrl: string | null;
  createdAt: number; termsAccepted: boolean; termsVersion: string;
} | null> {
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function fetchServerProgress(): Promise<UserState | null> {
  try {
    const r = await fetch("/api/progress", { credentials: "same-origin" });
    if (!r.ok) return null;
    const j = await r.json();
    return (j.data as UserState) ?? null;
  } catch { return null; }
}

export async function pushProgress(state: UserState): Promise<boolean> {
  try {
    const r = await fetch("/api/progress", {
      method: "PUT", credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    return r.ok;
  } catch { return false; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/scripts/account-sync.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/account-sync.ts site/src/scripts/account-sync.test.ts
git commit -m "feat(auth): client progress sync + merge"
```

---

## Task 20: Wire sync into `user-state.ts`

**Files:**
- Modify: `site/src/scripts/user-state.ts`

Add an opt-in sync activation that anonymous users never trigger.

- [ ] **Step 1: Append the sync layer to `site/src/scripts/user-state.ts`**

Append at the end of the file (after the existing `export const userState` and any `save`/`effect` wiring):

```ts
import { mergeProgress, fetchMe, fetchServerProgress, pushProgress } from "./account-sync";

let syncActive = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Call once on a page with the account UI. If a session exists and terms are
 * accepted, pull server progress, merge into local, push back, and start
 * debounced push-on-change. Safe to call when logged out (no-ops).
 */
export async function activateSyncIfSignedIn(): Promise<void> {
  if (syncActive || typeof window === "undefined") return;
  const me = await fetchMe();
  if (!me || !me.termsAccepted) return;
  syncActive = true;

  const server = await fetchServerProgress();
  if (server) {
    userState.value = mergeProgress(userState.value, server);
    save(userState.value);
  }
  await pushProgress(userState.value);

  // debounced push on subsequent local changes
  effect(() => {
    const snapshot = userState.value;
    if (!syncActive) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { void pushProgress(snapshot); }, 3000);
  });
}

export function isSyncActive(): boolean { return syncActive; }
```

> If `save` is not already exported/visible in module scope, it is defined in
> this file (see top of `user-state.ts`) and is in scope for the appended code.
> `effect` is already imported at the top of the file.

- [ ] **Step 2: Typecheck**

Run: `cd site && bun run check`
Expected: no new type errors in `user-state.ts` / `account-sync.ts`.

- [ ] **Step 3: Commit**

```bash
git add site/src/scripts/user-state.ts
git commit -m "feat(auth): activate progress sync on signed-in pages"
```

---

## Task 21: `AccountMenu.tsx` island + TitleBar wiring

**Files:**
- Create: `site/src/components/account/AccountMenu.tsx`
- Modify: `site/src/layouts/Topic.astro`

- [ ] **Step 1: Write `site/src/components/account/AccountMenu.tsx`**

```tsx
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";

type Me = { login: string; nickname: string; avatarUrl: string | null };

export default function AccountMenu({ lang }: { lang: Locale }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined=loading
  const [open, setOpen] = useState(false);

  useEffect(() => { void fetchMe().then((m) => setMe(m)); }, []);

  if (me === undefined) return null; // no layout shift while loading

  if (!me) {
    return (
      <a class="btn ghost shrink-0" href={`/api/auth/login?lang=${lang}`} style="padding:6px 10px;font-size:11px;">
        {t("account.signIn", lang)}
      </a>
    );
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    location.href = `/${lang}/`;
  }

  return (
    <div class="relative shrink-0">
      <button class="btn ghost flex items-center gap-1.5" style="padding:4px 8px;" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        {me.avatarUrl
          ? <img src={me.avatarUrl} alt="" width={20} height={20} class="rounded-full" />
          : <span class="w-5 h-5 rounded-full bg-rule inline-block" />}
        <span class="hidden sm:inline text-[12px] font-semibold">{me.nickname}</span>
      </button>
      {open && (
        <div class="absolute right-0 mt-1 min-w-[160px] bg-paper border border-rule rounded-md shadow-lg py-1 z-50" role="menu">
          <a class="block px-3 py-2 text-[13px] hover:bg-rule/30" href={`/${lang}/account`} role="menuitem">{t("account.menu", lang)}</a>
          <button class="block w-full text-left px-3 py-2 text-[13px] hover:bg-rule/30" onClick={signOut} role="menuitem">{t("account.signOut", lang)}</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the layout — modify `site/src/layouts/Topic.astro`**

Add to the frontmatter imports:

```ts
import AccountMenu from "~/components/account/AccountMenu.tsx";
```

In the `<TitleBar …>` element, add the island into the `aside` slot alongside `LangSwitch`. Change:

```astro
    <TitleBar headline={title} lang={lang}>
      <LangSwitch slot="aside" />
    </TitleBar>
```

to:

```astro
    <TitleBar headline={title} lang={lang}>
      <Fragment slot="aside">
        <LangSwitch />
        <AccountMenu client:idle lang={lang} />
      </Fragment>
    </TitleBar>
```

- [ ] **Step 3: Build to verify hydration cap + render**

Run: `cd site && bun run build`
Expected: 3912 pages, lint 0 errors. (AccountMenu is one island added globally; piece pages already cap at 5 — verify the lint report shows no hydration-cap violations; if any page now exceeds 5, the lint report will flag it. Networking/lesson pages typically sit below the cap, so adding one global island is expected to pass. If a specific page fails, that page was already at the cap — note it and we revisit, but do not lower other islands.)

- [ ] **Step 4: Commit**

```bash
git add site/src/components/account/AccountMenu.tsx site/src/layouts/Topic.astro
git commit -m "feat(auth): AccountMenu island in title bar"
```

---

## Task 22: `/[lang]/account` page + `AccountPanel.tsx`

**Files:**
- Create: `site/src/components/account/AccountPanel.tsx`, `site/src/pages/[lang]/account.astro`

- [ ] **Step 1: Write `site/src/components/account/AccountPanel.tsx`**

```tsx
import { useEffect, useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { fetchMe } from "~/scripts/account-sync";
import { activateSyncIfSignedIn } from "~/scripts/user-state";

type Me = {
  login: string; nickname: string; avatarUrl: string | null;
  createdAt: number; termsAccepted: boolean; termsVersion: string;
};

export default function AccountPanel({ lang }: { lang: Locale }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [nick, setNick] = useState("");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    void fetchMe().then((m) => {
      setMe(m);
      if (m) { setNick(m.nickname); if (m.termsAccepted) void activateSyncIfSignedIn(); }
    });
  }, []);

  if (me === undefined) return <p class="meta">{t("account.loading", lang)}</p>;

  if (!me) {
    return (
      <a class="btn" href={`/api/auth/login?lang=${lang}`}>{t("account.signIn", lang)}</a>
    );
  }

  async function acceptTerms() {
    const r = await fetch("/api/account/terms", { method: "POST", credentials: "same-origin" });
    if (r.ok) { const m = await fetchMe(); setMe(m); if (m?.termsAccepted) void activateSyncIfSignedIn(); }
  }

  async function saveNick() {
    setMsg("");
    const r = await fetch("/api/account/nickname", {
      method: "PATCH", credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname: nick }),
    });
    setMsg(r.ok ? t("account.nicknameSaved", lang) : t("account.nicknameInvalid", lang));
  }

  async function del() {
    if (confirm !== me!.nickname) return;
    const r = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" });
    if (r.ok) { try { localStorage.clear(); } catch {} location.href = `/${lang}/`; }
  }

  return (
    <div class="flex flex-col gap-8 max-w-[560px]">
      <div class="flex items-center gap-3">
        {me.avatarUrl && <img src={me.avatarUrl} alt="" width={48} height={48} class="rounded-full" />}
        <div>
          <div class="font-semibold">{me.nickname}</div>
          <div class="meta">{t("account.githubLogin", lang)}: {me.login}</div>
          <div class="meta">{t("account.created", lang)}: {new Date(me.createdAt).toLocaleDateString(lang)}</div>
        </div>
      </div>

      {!me.termsAccepted ? (
        <div class="border border-rule rounded-md p-4 flex flex-col gap-3">
          <p>{t("account.termsGate", lang)}</p>
          <a class="underline text-[13px]" href={`/${lang}/terms`} target="_blank">{t("account.termsLink", lang)}</a>
          <button class="btn" onClick={acceptTerms}>{t("account.termsAccept", lang)}</button>
        </div>
      ) : (
        <>
          <div class="flex flex-col gap-2">
            <label class="font-semibold text-[13px]">{t("account.nickname", lang)}</label>
            <div class="flex gap-2">
              <input class="border border-rule rounded px-2 py-1 flex-1" value={nick}
                onInput={(e) => setNick((e.target as HTMLInputElement).value)} maxLength={32} />
              <button class="btn" onClick={saveNick}>{t("account.nicknameSave", lang)}</button>
            </div>
            <p class="meta">{t("account.nicknameHint", lang)}</p>
            {msg && <p class="meta">{msg}</p>}
            <p class="meta">{t("account.syncOn", lang)}</p>
          </div>

          <div class="border border-[color:var(--danger,#c0392b)] rounded-md p-4 flex flex-col gap-3">
            <div class="font-semibold">{t("account.delete", lang)}</div>
            <p class="meta">{t("account.deleteWarn", lang)}</p>
            <input class="border border-rule rounded px-2 py-1" placeholder={t("account.deleteConfirm", lang)}
              value={confirm} onInput={(e) => setConfirm((e.target as HTMLInputElement).value)} />
            <button class="btn" disabled={confirm !== me.nickname}
              style="background:var(--danger,#c0392b);color:#fff;" onClick={del}>
              {t("account.deleteCta", lang)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `site/src/pages/[lang]/account.astro`**

```astro
---
import Topic from "../../layouts/Topic.astro";
import AccountPanel from "../../components/account/AccountPanel.tsx";
import { type Locale, isLocale, t } from "../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
---
<Topic title={t("account.title", lang)} lang={lang}>
  <h1 class="text-3xl font-extrabold mb-6">{t("account.title", lang)}</h1>
  <AccountPanel client:only="preact" lang={lang} />
</Topic>
```

- [ ] **Step 3: Build**

Run: `cd site && bun run build`
Expected: 3912 + 2 = 3914 pages (account en/ru added), lint 0 errors.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/account/AccountPanel.tsx site/src/pages/\[lang\]/account.astro
git commit -m "feat(auth): account cabinet page (nickname, delete, terms gate)"
```

---

## Task 23: `/[lang]/terms` page (EN + RU) + footer link

**Files:**
- Create: `site/src/pages/[lang]/terms.astro`, `site/src/components/brand/SiteFooter.astro`
- Modify: `site/src/layouts/Topic.astro`

- [ ] **Step 1: Write `site/src/pages/[lang]/terms.astro`**

```astro
---
import Topic from "../../layouts/Topic.astro";
import { type Locale, isLocale, t } from "../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");

const en = {
  intro: "These Terms govern your use of awesome-everything, a free educational curriculum site. By signing in you accept them.",
  s1: "1. The service", s1b: "The content is provided free of charge, as-is, for personal learning. It may change or become unavailable at any time. No warranty of accuracy or availability is given.",
  s2: "2. Accounts", s2b: "Sign-in uses GitHub OAuth. We store only your GitHub id, username, chosen nickname, avatar URL, and the time you accepted these Terms. We do not collect your email or scan your repositories (scope: read:user).",
  s3: "3. Your data & deletion", s3b: "Your learning progress is yours. It syncs to your account so it follows you across devices. You can delete your account at any time from the Account page; deletion permanently removes your account and all synced progress.",
  s4: "4. Acceptable use", s4b: "Do not abuse the service: no automated scraping at scale, no attempts to disrupt availability, no circumventing rate limits, no using the service to harm others.",
  s5: "5. Changes", s5b: "These Terms may be updated. Material changes bump the Terms version and you will be asked to accept again. Continued use after acceptance means you agree.",
  contact: "Questions: open an issue on the project's GitHub repository.",
};
const ru = {
  intro: "Эти Условия регулируют использование awesome-everything — бесплатного образовательного сайта-куррикулума. Выполняя вход, вы их принимаете.",
  s1: "1. Сервис", s1b: "Контент предоставляется бесплатно, «как есть», для личного обучения. Он может меняться или становиться недоступным в любой момент. Гарантии точности или доступности не предоставляются.",
  s2: "2. Аккаунты", s2b: "Вход через GitHub OAuth. Мы храним только ваш GitHub id, имя пользователя, выбранный никнейм, URL аватара и время принятия этих Условий. Мы не собираем email и не читаем ваши репозитории (scope: read:user).",
  s3: "3. Ваши данные и удаление", s3b: "Ваш учебный прогресс принадлежит вам. Он синхронизируется с аккаунтом, чтобы быть доступным на всех устройствах. Вы можете удалить аккаунт в любой момент на странице Кабинета; удаление безвозвратно стирает аккаунт и весь синхронизированный прогресс.",
  s4: "4. Допустимое использование", s4b: "Не злоупотребляйте сервисом: никакого массового автоматического скрейпинга, попыток нарушить доступность, обхода лимитов запросов или использования сервиса во вред другим.",
  s5: "5. Изменения", s5b: "Эти Условия могут обновляться. Существенные изменения повышают версию Условий, и вас попросят принять их заново. Продолжение использования после принятия означает согласие.",
  contact: "Вопросы: создайте issue в GitHub-репозитории проекта.",
};
const c = lang === "ru" ? ru : en;
---
<Topic title={t("terms.title", lang)} lang={lang}>
  <article class="prose max-w-[760px] mx-auto">
    <h1 class="text-3xl font-extrabold mb-6">{t("terms.title", lang)}</h1>
    <p>{c.intro}</p>
    <h2 class="font-bold mt-6">{c.s1}</h2><p>{c.s1b}</p>
    <h2 class="font-bold mt-6">{c.s2}</h2><p>{c.s2b}</p>
    <h2 class="font-bold mt-6">{c.s3}</h2><p>{c.s3b}</p>
    <h2 class="font-bold mt-6">{c.s4}</h2><p>{c.s4b}</p>
    <h2 class="font-bold mt-6">{c.s5}</h2><p>{c.s5b}</p>
    <p class="meta mt-8">{c.contact}</p>
  </article>
</Topic>
```

- [ ] **Step 2: Write `site/src/components/brand/SiteFooter.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<footer class="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 border-t border-rule mt-12">
  <nav class="flex items-center gap-4 text-[12px] text-muted">
    <a class="hover:underline" href={`/${lang}/terms`}>{t("terms.footer", lang)}</a>
    <a class="hover:underline" href={`/${lang}/about`}>{t("nav.about", lang)}</a>
  </nav>
</footer>
```

- [ ] **Step 3: Add the footer to `site/src/layouts/Topic.astro`**

Add the import to the frontmatter:

```ts
import SiteFooter from "~/components/brand/SiteFooter.astro";
```

Add `<SiteFooter lang={lang} />` just before the closing `</body>` (after `<KeyboardShortcuts … />` / existing footer content):

```astro
    <SiteFooter lang={lang} />
  </body>
```

- [ ] **Step 4: Build**

Run: `cd site && bun run build`
Expected: 3914 + 2 = 3916 pages (terms en/ru), lint 0 errors.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/\[lang\]/terms.astro site/src/components/brand/SiteFooter.astro site/src/layouts/Topic.astro
git commit -m "feat(auth): Terms of Use page en+ru + footer link"
```

---

## Task 24: Operator setup runbook

**Files:**
- Create: `docs/operator-setup-auth.md`

- [ ] **Step 1: Write `docs/operator-setup-auth.md`**

````markdown
# Operator setup — GitHub auth backend

One-time setup to make `/api/*` live. The static site works without this; the
account menu just shows "Sign in with GitHub" and login is inert until done.

## 1. GitHub OAuth App
- GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
- Homepage URL: `https://<your-domain>`
- Authorization callback URL: `https://<your-domain>/api/auth/callback`
- Copy the **Client ID** and generate a **Client secret**.

## 2. Cloudflare resources
```bash
bunx wrangler d1 create awesome-everything       # copy database_id → wrangler.toml
bunx wrangler kv namespace create SESSIONS       # copy id → wrangler.toml
```
Apply the schema (remote):
```bash
bunx wrangler d1 execute DB --remote --file functions/migrations/0001_init.sql
```

## 3. Secrets (Pages project)
```bash
bunx wrangler pages secret put GITHUB_CLIENT_SECRET
bunx wrangler pages secret put SESSION_SECRET     # any long random string
```
Set `GITHUB_CLIENT_ID` and `TERMS_VERSION` as plain vars (wrangler.toml `[vars]`
or the Pages dashboard → Settings → Environment variables).

## 4. Deploy
Connect the repo to Cloudflare Pages with build output `site/dist` and the
`site` build command (`bun run build`). Functions in `functions/` deploy
automatically alongside.

## 5. Abuse protection (dashboard)
- Security → Bots → enable **Bot Fight Mode**.
- Security → WAF → Rate limiting rules → add a rule on `/api/*`
  (e.g. 100 requests/min per IP → Block).

## Local development
```bash
cd site && bun run build
bunx wrangler d1 execute DB --local --file functions/migrations/0001_init.sql
bunx wrangler pages dev site/dist --d1 DB --kv SESSIONS --compatibility-date 2024-11-01
```
Local OAuth needs a second GitHub OAuth App whose callback is
`http://localhost:8788/api/auth/callback`, with its client id/secret exported in
the shell before `wrangler pages dev`.

## Rotating TERMS_VERSION
Bump `TERMS_VERSION` (e.g. to a new date). On next sign-in every user is asked
to re-accept; account features stay gated until they do.
````

- [ ] **Step 2: Commit**

```bash
git add docs/operator-setup-auth.md
git commit -m "docs(auth): operator setup runbook"
```

---

## Task 25: Final verification

**Files:** none

- [ ] **Step 1: Run all function tests**

Run: `cd functions && bun run test`
Expected: PASS — cookies (4), response (3), session (5), ratelimit (2), db (4), github (3) = 21 tests.

- [ ] **Step 2: Run all site tests**

Run: `cd site && bun run test`
Expected: existing suite + account-sync (3) all pass.

- [ ] **Step 3: Typecheck functions**

Run: `cd functions && bun run typecheck`
Expected: no errors.

- [ ] **Step 4: Full static build**

Run: `cd site && bun run build`
Expected: 3916 pages, lint 0 errors.

- [ ] **Step 5: Update memory**

Add a `project_github-auth.md` memory: feature shipped on its branch, where the
spec/plan/runbook live, that content stays public and login is optional, and
that operator setup (GitHub OAuth app + D1/KV + secrets) is still required before
auth is live. Add a one-line pointer to `MEMORY.md`.

- [ ] **Step 6: Final commit (if memory or stray changes)**

```bash
git add -A && git commit -m "chore(auth): finalize GitHub auth feature"
```

---

## Self-review notes (coverage map)

- Spec §"Architecture" → Tasks 0, 8 (middleware), 9–16 (handlers).
- Spec §"Data model" (D1 + KV) → Task 0 (migration), 4 (session), 6 (db helpers).
- Spec §"Auth flow" → Tasks 9 (login/state), 10 (callback/CSRF/upsert/session), 11 (logout).
- Spec §"Cabinet & Terms" → Tasks 18 (i18n), 21 (menu), 22 (panel: nickname/delete/terms gate), 23 (terms page + footer).
- Spec §"Progress sync" → Tasks 16 (endpoint), 19 (merge + client), 20 (activation).
- Spec §"Anti-bot" → Task 5 (ratelimit), 8 (middleware applies it + headers), 24 (Bot Fight Mode/WAF docs).
- Spec §"Secrets & config" → Task 0 (wrangler vars), 24 (runbook).
- Spec §"Testing" → per-lib tests in Tasks 1–7, account-sync in 19, build green in 17/22/23/25.
- Spec §"graceful degrade" → Task 21 (AccountMenu shows sign-in when `/api/me` fails), 19 (fetch wrappers return null on error).
- Nickname signature `validateNickname` consistent between Task 6 (def) and Tasks 14/22 (use). Session fns (`createSession`/`resolveSession`/`destroySession`/`destroyAllSessions`) consistent between Task 4 (def) and Tasks 10/11/15 + middleware. Cookie name resolution helper duplicated intentionally in handlers (no shared mutable state).
```
