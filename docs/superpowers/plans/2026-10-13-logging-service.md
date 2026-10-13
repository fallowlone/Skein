# Logging Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one structured logging service to `functions/` (console + D1 history, request/flow ids, secret scrubbing) and cover the auth chain with it first.

**Architecture:** Pure core module (`logger.ts`, no I/O) with unit tests; a thin D1 sink (`logstore.ts`) flushed from `_middleware.ts` via `ctx.waitUntil`; auth handlers bind the per-request logger and carry a cross-request flow id inside the signed `oauth_state` payload.

**Tech Stack:** TypeScript, Cloudflare Pages Functions, D1, vitest (run from `functions/` via `bun run test`), `tsc --noEmit` via `bun run typecheck`.

**Spec:** `docs/superpowers/specs/2026-10-13-logging-service-design.md`

## Global Constraints

- `functions/` ships zero dependencies — logger is dependency-free TypeScript.
- Persistence via `ctx.waitUntil` only; a D1 outage must never fail the response.
- Log messages are English-only, never user-facing (bilingual UX untouched).
- Tests live beside code as `*.test.ts`; D1/KV fakes in `functions/test/fakes.ts`.
- Run `bun run test` (vitest) and `bun run typecheck` from `functions/` after each task.

## Review Focus

- Oversized `ctx` object blows D1 text limits → `logger.ts` truncates serialized ctx to `MAX_CTX_BYTES = 4000` (test in Task 1).
- `ctx.waitUntil` missing in unit-test contexts → middleware guards with optional call (test in Task 3).
- `env.DB` absent in local dev/preview → flush skips silently (test in Task 2).
- Old `oauth_state` cookies (4 segments) still in flight at deploy → callback accepts 4- or 5-segment payloads, flow optional (test in Task 4).
- Purge `DELETE` on every request doubles D1 writes → purge throttled to ~1% of flushes (test in Task 2).

---

### Task 1: Logger core

**Files:**
- Create: `functions/lib/logger.ts`
- Create: `functions/lib/logger.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 2–4, exact names):
  - `export type LogLevel = "debug" | "info" | "warn" | "error"`
  - `export interface LogBase { route: string; rid: string; user?: number | null }`
  - `export interface LogEntry { ts: number; level: LogLevel; route: string; rid: string; flow?: string; user: number | null; tag: string; msg: string; ctx: Record<string, unknown> }`
  - `export const MAX_CTX_BYTES = 4000`
  - `export function redact(value: unknown): unknown`
  - `export function levelEnabled(level: LogLevel, envLevel: string | undefined): boolean` (unset env = `info`; unknown strings = `info`)
  - `export function shouldPersist(level: LogLevel, route: string): boolean` (`error` always true; `info` true when route matches `^/api/(auth|admin|payments|telegram|coach)` else 1% random; `warn` 10% random; `debug` false)
  - `export interface BoundLogger { log(level: LogLevel, tag: string, msg: string, ctx?: Record<string, unknown>): void; setUser(id: number | null): void }`
  - `export function bindLogger(buf: LogEntry[], base: LogBase): BoundLogger` (pushes redacted, ctx-truncated entries with `Date.now()` ts; `flow` passed per-call via `ctx.flow` and hoisted to the entry field)

- [ ] **Step 1: Write the failing test** — `functions/lib/logger.test.ts`: format of a bound entry (all fields), `redact` cases (`ghu_xxx` token, `github_pat_xxx`, `sk-` key, e-mail string, `{ headers: { cookie: "a=b" } }`, `{ SESSION_SECRET: "s" }`), `levelEnabled` defaults, `shouldPersist` boundaries (`error` always, `debug` never, auth route `info` always), and ctx truncation over `MAX_CTX_BYTES`.
- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bunx vitest run lib/logger.test.ts`
Expected: FAIL with "Failed to resolve import" / file missing.

- [ ] **Step 3: Implement `functions/lib/logger.ts`** with exactly the interfaces above; redact is deep (arrays/objects, case-insensitive `secret|token|cookie|authorization|password` keys); truncation cuts the JSON string of ctx and appends `{ "truncated": true }` marker key.
- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && bunx vitest run lib/logger.test.ts && bun run typecheck`
Expected: all PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add functions/lib/logger.ts functions/lib/logger.test.ts
git commit -m "feat(logging): add structured logger core with redaction and sampling"
```

### Task 2: D1 sink and retention

**Files:**
- Create: `functions/migrations/0010_app_logs.sql`
- Create: `functions/lib/logstore.ts`
- Create: `functions/lib/logstore.test.ts`
- Modify: `functions/lib/types.ts` (add `LOG_LEVEL?: string` to `Env`)
- Modify: `functions/test/fakes.ts` (extend `FakeD1`/`FakeStmt` for the new SQL)

**Interfaces:**
- Consumes: `LogEntry`, `shouldPersist`, `levelEnabled` from Task 1.
- Produces (used by Task 3):
  - `export async function flushLogs(env: { DB?: D1Database; LOG_LEVEL?: string }, buf: LogEntry[]): Promise<void>` — no-throw contract: returns normally on missing binding, D1 error, or empty-after-sampling buffer. Applies `levelEnabled` + `shouldPersist` at flush time; inserts survivors; on ~1% of non-empty flushes also runs the 30-day purge (`DELETE ... LIMIT 200`, time-bounded fallback if the fake/real D1 rejects `LIMIT`).

- [ ] **Step 1: Write the failing test** — `functions/lib/logstore.test.ts`: entries land in FakeD1 `app_logs` with all columns; `error` persists on sampled-out routes; `debug` never persists; empty buffer → zero D1 calls; missing `DB` → resolves, no throw; D1 throwing → resolves, no throw.
- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bunx vitest run lib/logstore.test.ts`
Expected: FAIL (missing module/table).

- [ ] **Step 3: Write migration `0010_app_logs.sql`** — `app_logs(ts INTEGER, level TEXT, route TEXT, rid TEXT, flow TEXT, user_id INTEGER, tag TEXT, msg TEXT, ctx_json TEXT)` plus indexes on `(ts)`, `(rid)`, `(level, ts)`; match the `IF NOT EXISTS` style of `0009_course_access.sql`.
- [ ] **Step 4: Extend `functions/test/fakes.ts`** so `FakeD1` handles the `INSERT INTO app_logs` and purge `DELETE` shapes (store rows in memory for assertions).
- [ ] **Step 5: Implement `flushLogs` in `functions/lib/logstore.ts`** per the interface; add `LOG_LEVEL?: string` to `Env`.
- [ ] **Step 6: Run tests and typecheck**

Run: `cd functions && bun run test && bun run typecheck`
Expected: all PASS (full suite, incl. existing tests).

- [ ] **Step 7: Commit**

```bash
git add functions/migrations/0010_app_logs.sql functions/lib/logstore.ts functions/lib/logstore.test.ts functions/lib/types.ts functions/test/fakes.ts
git commit -m "feat(logging): add D1 sink with throttled 30-day retention"
```

### Task 3: Middleware request id and flush

**Files:**
- Modify: `functions/_middleware.ts`
- Modify: `functions/_middleware.test.ts`
- Modify: `functions/lib/types.ts` (`RequestData` gains `requestId: string`)

**Interfaces:**
- Consumes: `bindLogger` from Task 1 (buffer is a plain `LogEntry[]` allocated per request), `flushLogs` from Task 2.
- Produces (used by Task 4): every downstream handler sees `data.requestId: string`, `data.log: LogEntry[]`, `data.logger: BoundLogger` with route + rid bound and user from session resolution (null until then).

- [ ] **Step 1: Write the failing test** — extend `functions/_middleware.test.ts`: response carries `X-Request-Id` matching `data.requestId`; early returns (401 JSON, 302 account redirect, 429) still happen and the buffer holds one entry each; `waitUntil` absent → no throw; downstream `next()` sees logger bound to the same rid.
- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && bunx vitest run _middleware.test.ts`
Expected: FAIL on missing `X-Request-Id` / `data.logger`.

- [ ] **Step 3: Implement in `functions/_middleware.ts`** — logger/buffer init is the first statement (before session + rate limit); log early returns with tags `api.auth_required`, `api.account_redirect`, `api.rate_limited` at `warn`; wrap `await next()` so the catch-all logs `api.unhandled` with stack at `error` (replacing raw `console.error`, same generic 500 to client); flush in a `finally` via `ctx.waitUntil?.(flushLogs(env, data.log))`.
- [ ] **Step 4: Run tests and typecheck**

Run: `cd functions && bun run test && bun run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/_middleware.ts functions/_middleware.test.ts functions/lib/types.ts
git commit -m "feat(logging): bind per-request logger in middleware and flush on waitUntil"
```

### Task 4: Auth chain coverage with flow id

**Files:**
- Modify: `functions/api/auth/login.ts`
- Modify: `functions/api/auth/callback.ts`
- Modify: `functions/api/auth/login.test.ts`
- Modify: `functions/api/auth/callback.test.ts`

**Interfaces:**
- Consumes: `data.logger`, `data.requestId` from Task 3.
- Produces: login success redirects carry no new params (state cookie payload gains 5th segment `flowId`); callback failure redirects become `?auth=<reason>&reason=<branch>&rid=<rid>&flow=<flowId>`; callback success logs `auth.callback.ok` at `info` after `setUser`.

- [ ] **Step 1: Write the failing tests** — `login.test.ts`: state cookie payload has 5 pipe segments with a uuid last; `callback.test.ts`: failure Location includes `rid=` + `flow=` from the 5-segment cookie; 4-segment legacy cookie still verifies (no `flow=`, no crash); success path calls `setUser` (assert via logged entry user id — expose buffer through the test ctx `data.log`).
- [ ] **Step 2: Run tests to verify they fail**

Run: `cd functions && bunx vitest run api/auth/`
Expected: FAIL on missing segments/params.

- [ ] **Step 3: Implement `login.ts`** — generate `flowId = crypto.randomUUID()`, sign `${state}|${lang}|${returnTo}|${TERMS_VERSION}|${flowId}`, log `auth.login.start` at `info`.
- [ ] **Step 4: Implement `callback.ts`** — split verified payload into 5 (flow optional, legacy-safe); log each branch with its existing tag (`bad_request|state|terms|exchange|session`) at `error`, `cancelled` at `info`; extend `failRedirect` with `rid` + `flow` params; on success `logger.setUser(user.id)` then log `auth.callback.ok`; replace remaining `console.error` calls with logger (keep messages).
- [ ] **Step 5: Run tests and typecheck**

Run: `cd functions && bun run test && bun run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/api/auth/login.ts functions/api/auth/callback.ts functions/api/auth/login.test.ts functions/api/auth/callback.test.ts
git commit -m "feat(logging): cover auth chain with flow id and branch logs"
```

### Task 5: Payments and webhook coverage (rollout phase 4)

**Files:**
- Modify: payment/webhook handlers (builder greps `console.error` under `functions/api/` outside auth and converts each)
- Modify: their `*.test.ts` files (assert buffer entries, not console output)

**Interfaces:**
- Consumes: `data.logger` from Task 3. No new interfaces.

- [ ] **Step 1: Convert remaining `console.error` in `functions/api/`** — one `logger.log` per site with a `tag` naming route + outcome (e.g. `payments.webhook.error`); entry/exit `info` lines on payment creation and webhook processing only, not on every poll/read path.
- [ ] **Step 2: Update affected tests** — assert on `data.log` entries; no test asserts on console output.
- [ ] **Step 3: Run full suite and typecheck**

Run: `cd functions && bun run test && bun run typecheck`
Expected: all PASS, and `grep -rn "console\." functions --include="*.ts" | grep -v test | grep -v node_modules` returns only sanctioned sites (flush-failure fallback in `logstore.ts`).

- [ ] **Step 4: Commit**

```bash
git add functions/api
git commit -m "feat(logging): cover payments and webhooks, drop raw console.error"
```

### Task 6: Operator runbook

**Files:**
- Create: `docs/operator-logging.md`

**Interfaces:**
- Consumes: final table/column names and query patterns from Tasks 1–4.
- Produces: the three-query runbook. No code.

- [ ] **Step 1: Write `docs/operator-logging.md`** — max three queries (by `rid`/`flow`, by `reason`+time window, error-rate check), the `LOG_LEVEL` knob, 30-day retention note. English, short.
- [ ] **Step 2: Verify the queries against the schema** — re-read `0010_app_logs.sql` and confirm every column referenced exists.

Run: `cd functions && grep -c "app_logs" migrations/0010_app_logs.sql`
Expected: non-zero; columns match.

- [ ] **Step 3: Commit**

```bash
git add docs/operator-logging.md
git commit -m "docs(logging): add operator runbook with the three auth queries"
```
