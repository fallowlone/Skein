# Observability — D1 logstore

Homegrown, dependency-free (no Sentry/OTel — `functions/` must stay
dependency-free or wrangler bundles `node_modules` and the deploy fails).
Per-request structured logs, sampled into D1 `app_logs`, 30-day retention.

## Pipeline

1. `functions/_middleware.ts` binds one buffer per request (`route`, `rid`,
   `user`). Every handler shares it via `data.logger`.
2. Flush happens in `finally` via `ctx.waitUntil(flushLogs(env, buf))`
   (`functions/lib/logstore.ts`). Flush never throws: a D1 outage degrades to
   lost logs, never to a failed request.
3. `shouldPersist` (`functions/lib/logger.ts`) samples before insert:
   `debug` never, `error` always, `info` always on
   `/api/(auth|admin|payments|telegram|coach)/…` else 1%, `warn` 10%.
4. `ctx` is secret-redacted (key names matching secret/token/cookie/
   authorization/password, plus known token shapes) and capped at 4000 bytes
   with a `truncated` marker.

## What gets logged where

| Emitter | Tag | Level | Meaning |
|---|---|---|---|
| `_middleware` | `api.auth_required` | warn | guest hit account-gated JSON (401) |
| `_middleware` | `api.account_redirect` | warn | guest redirected to `/account` (302) |
| `_middleware` | `api.rate_limited` | warn | per-IP API-write bucket exceeded (429) |
| `_middleware` | `api.unhandled` | error | any unhandled throw → generic 500 |
| `api/auth/login` | `auth.started` | info | OAuth state issued, `flow` = login rid |
| `api/auth/callback` | `auth.success` | info | login complete, same `flow` id as `auth.started` |

No other route logs yet: non-auth handlers are observable only through
`api.unhandled` on 500. The always-persist route regex already covers future
`coach`/`payments`/`telegram`/`admin` info logs when they are added.

## Retention

30 days. `flushLogs` runs an opportunistic purge — `DELETE FROM app_logs
WHERE ts < ? LIMIT 200` on ~1% of non-empty flushes — against
`idx_app_logs_ts` (covering index, no full scan). There is no scheduled
cleanup job and no alerting: to watch error rate, query D1 directly:

```sql
SELECT route, tag, COUNT(*) FROM app_logs
WHERE ts > (strftime('%s','now','-1 day') * 1000) AND level = 'error'
GROUP BY route, tag ORDER BY COUNT(*) DESC;
```

## Applying the schema

`0011_app_logs.sql` creates the table + index (0001→0011 apply in order;
every file is `IF NOT EXISTS`-safe to rerun except the ALTER-only 0004):

```bash
bunx wrangler d1 execute DB --remote --file functions/migrations/0011_app_logs.sql
```

Before 0011, `flushLogs` INSERTs failed (no table) and were swallowed by the
never-throw catch — i.e. nothing was retained. After applying, confirm:

```bash
bunx wrangler d1 execute DB --remote --command "SELECT COUNT(*) FROM app_logs"
```
