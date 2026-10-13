# Logging Service — Design

## Intent and why

Production auth failures were investigated by guessing: the only signals were
scattered `console.error` lines visible via `wrangler tail`, with no history,
no search, and no way to glue one user's failure across the login → GitHub →
callback chain. This design adds one logging service for the Cloudflare Pages
Functions backend so the next "why is login broken" question is answered from
records, not guesses. The user explicitly asked for the full, proper variant
that the whole app can adopt gradually and that refactors cleanly — not
another sprinkle of `console.error`.

## Goals

- One logger import for all of `functions/` with levels, structured JSON
  output, and per-request context (request id, route, language, user id,
    outcome tag such as the existing auth `reason=` values).
- Two sinks from day one: console (keeps `wrangler tail` working) and a
  queryable D1 history table so failures can be searched after the fact.
- Any client-visible failure carries an id the user or operator can paste
  into a D1 query and get the full story (auth failure redirects gain `rid=`).
- Secrets and PII can never land in logs: scrubbing is in the core path,
  not a convention.
- High-traffic routes don't drown the log: sampling policy per level/route.
- Rollout in phases so each step ships and is verifiable on its own.

## Non-goals

- External log SaaS (Datadog, Sentry, etc.). Platform logs + D1 only.
- Client-side error beacon. Server first; client later as a separate design.
- Merging with the anonymous product-metrics pipeline (`metrics.ts` stays).
- Alerting/paging infrastructure. `MONITORING_SETUP.md` stays the manual list.

## Anti-goals

- A logger that can break responses: persistence failures must never fail
  the request.
- Logging PII "temporarily": GitHub tokens, e-mails, raw cookies are
  scrubbed by construction, and tests pin that.
- A second ad-hoc format per route: one line format, enforced by the single
  module.

## Constraints

- `functions/` ships zero dependencies (wrangler bundles the dir; see
  `functions/package.json` comment). Logger is dependency-free TypeScript.
- Cloudflare Pages Functions runtime: use `ctx.waitUntil` for the D1 write,
  never await it in the response path.
- No cron/scheduled infra exists in the repo today, so retention cleanup
  must be opportunistic, not scheduled.
- Existing conventions to reuse: pure testable lib modules with
  `*.test.ts` beside them, D1 migrations in `functions/migrations/NNNN_*.sql`,
  fake D1/KV in `functions/test/` for unit tests, `Env` extended in
  `functions/lib/types.ts`.
- Bilingual UX is unaffected: log messages are English-only, never
  user-facing.

## Design (decided)

**Core module `functions/lib/logger.ts` (pure, no I/O):**

- `LogLevel = debug | info | warn | error`. Default prod level `info`;
  `debug` off unless `env.LOG_LEVEL=debug`.
- One line format: JSON with `ts, level, route, rid, user, tag, msg, ctx`.
- `redact(value)`: deep scrub — drops/replaces GitHub tokens (`ghu_`,
  `github_pat_`), `sk-` keys, e-mail addresses, `Cookie`/`Authorization`
  headers, any `*secret*`/`*token*` keys (case-insensitive). Runs on every
  log call, not opt-in.
- `shouldSample(level, route)`: `error` always kept; `info` kept on
  allowlisted outcome paths (auth, payments, admin), sampled 1% elsewhere;
  `warn` sampled 10%; `debug` never persisted, console only.
- `buildLogger(data)` binds `rid/route/user` once per request from
  middleware data; route handlers only pass `tag/msg/ctx`.

**Request id:** `_middleware.ts` generates `crypto.randomUUID()` into
`data.requestId`, adds `X-Request-Id` response header, and flushes the
per-request entry buffer via `ctx.waitUntil(persist(env, entries))`
wrapped so a D1 outage only drops history, never the response.
`RequestData` in `functions/lib/types.ts` gains `requestId: string`.

**Persistence:** migration `0010_app_logs.sql` creates `app_logs(ts, level,
route, rid, user_id, tag, msg, ctx_json)` with indexes on `(ts)`,
`(rid)`, `(level, ts)`. Retention 30 days via opportunistic purge: each
persist call also runs `DELETE ... WHERE ts < cutoff LIMIT 200` inside the
same `waitUntil`, best-effort and silent on failure.

**Auth glue (phase 2):** failure redirects become
`?auth=failed&reason=<branch>&rid=<requestId>`; success path logs one
`info` line with `tag=auth.callback.ok`. Banner UX unchanged (ignores `rid`).

**Middleware errors (phase 3):** the catch-all in `_middleware.ts` logs
`tag=api.unhandled` with stack through the logger instead of raw
`console.error`, keeping the generic 500 to the client.

**Cross-request glue (review fix):** each request keeps its own `rid`, but the
login→GitHub→callback chain shares one flow id: `login.ts` generates
`flowId` (uuid), stores it inside the signed `oauth_state` payload, and
`callback.ts` logs with `flow=<flowId>` alongside its own `rid`. Failure
redirects carry both: `?auth=failed&reason=<branch>&rid=<rid>&flow=<flowId>`.
Querying D1 by `flow` returns the whole chain. (My call.)

**Flush rule (review fix):** if the per-request buffer is empty after
flush-time sampling, skip the D1 call entirely — no write, no purge.
Sampling is applied at flush time, not at call time. (My call.)

**Sampling scope (review fix):** sampling gates persistence only. Console
output keeps everything at/above the configured level, so `wrangler tail`
stays complete while D1 stays cheap. (My call.)

**Allowlist rule (review fix):** `info` is always persisted when the route
matches `^/api/(auth|admin|payments|telegram|coach)`; all other routes
sampled 1%. Match is on route prefix, not on tag. (My call.)

**Purge throttle (review fix):** the opportunistic 30-day `DELETE` runs on
at most ~1% of persists (random draw at flush time), best-effort and silent
on failure. If D1 rejects `DELETE ... LIMIT`, the builder falls back to a
time-bounded delete without `LIMIT`. (My call.)

**Early returns (review fix):** logger/buffer init is the first thing in
`_middleware.ts`, before session resolution and rate limiting, so 401/302/429
early returns are logged with `rid` like any other outcome. (My call.)

**User binding (review fix):** the bound logger exposes `setUser(userId)`
for handlers that identify the user mid-request (`callback.ts` calls it
after upsert); the success line must carry the real user id, not null.
(My call.)

**Knobs (review fix):** `LOG_LEVEL?: string` added as an optional `Env`
field; no default in `wrangler.toml` (unset = `info`); changed via dashboard
or vars when needed. (My call.)

**Missing DB binding (review fix):** flush detects absent `env.DB` and
skips silently (console `warn` once per isolate, not per request), so local
dev and misconfigured previews keep working with console-only logs.
(My call.)
**Runbook:** short `docs/operator-logging.md` — the three queries that
answer "why did login fail for this user" (by `rid`, by `reason`+time
window, error-rate check), plus retention and level-knob notes.

**Tests:** `logger.test.ts` pins format, redaction cases, and sampling
boundaries. Persist/flush covered with the existing D1 fakes. No new test
framework; run via `bun run test` / `typecheck` in `functions/`.

**Rollout order:** 1) logger + table + middleware rid/flush; 2) auth
coverage; 3) middleware unhandled + rate-limit denials; 4) payments and
Telegram webhooks; everything else opportunistically during refactors.

## Left to the builder

- Exact D1 column types and index list (keep it minimal, match migration
  style of `0009_course_access.sql`).
- Whether the per-request buffer lives on `RequestData` or a WeakMap keyed
  by request; keep it out of the response path either way.
- Exact `rid=` param name if `rid` collides with an existing convention
  (grep first).
- PII edge cases beyond the listed patterns, as long as tests pin each one.
- Wording of `docs/operator-logging.md` (short; three queries max plus knobs).
