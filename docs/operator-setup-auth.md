# Operator setup — GitHub auth backend

One-time setup to make `/api/*` live. The static site works without this: the
account menu just shows "Sign in with GitHub" and login is inert until the steps
below are done (graceful degradation — `/api/me` returns 401 and the rest of the
site is unaffected).

## Repository layout (how auth fits)

```
awesome-everything/
  site/                 static Astro site (built to site/dist/ — public content)
  functions/            Cloudflare Pages Functions — the /api/* backend
    _middleware.ts      session resolve + per-IP rate limit + security headers
    api/…               auth + account + progress handlers
    lib/…               cookies, session, db, github, ratelimit, response
    migrations/0001_init.sql
  wrangler.toml         Pages config: D1 + KV bindings, public vars
  package.json          repo-root dev/test tooling (vitest, wrangler, workers-types)
```

The deployed `functions/` directory MUST stay clean — no `node_modules` inside it,
or wrangler/Pages tries to bundle it and fails. All dev/test dependencies live in
the **repo-root** `package.json`. Run `bun install` at the repo root once.

- Run function tests: `cd functions && bun run test` (binaries resolve from root).
- Typecheck functions: `cd functions && bun run typecheck`.

## 1. GitHub OAuth App (production)
- GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
- Homepage URL: `https://<your-domain>`
- Authorization callback URL: `https://<your-domain>/api/auth/callback`
- Copy the **Client ID** and generate a **Client secret**.
- Only `read:user` scope is requested by the app (no email, no repo access).

## 2. Cloudflare resources
```bash
bunx wrangler d1 create awesome-everything       # copy database_id → wrangler.toml
bunx wrangler kv namespace create SESSIONS       # copy id → wrangler.toml
```
Edit `wrangler.toml`, replacing `REPLACE_WITH_D1_ID`, `REPLACE_WITH_KV_ID`, and
`REPLACE_WITH_CLIENT_ID`. Apply the schema to the remote D1:
```bash
bunx wrangler d1 execute DB --remote --file functions/migrations/0001_init.sql
```

## 3. Secrets (Pages project)
Set the two secrets (never commit them):
```bash
bunx wrangler pages secret put GITHUB_CLIENT_SECRET
bunx wrangler pages secret put SESSION_SECRET     # any long random string, e.g. `openssl rand -base64 48`
```
`GITHUB_CLIENT_ID` and `TERMS_VERSION` are non-secret and live in `wrangler.toml`
`[vars]` (or the Pages dashboard → Settings → Environment variables).

### Production cookie name (recommended)
Set `COOKIE_NAME=__Host-session` as a production var. The `__Host-` prefix hardens
the session cookie (requires Secure + Path=/ + no Domain — all satisfied by the
code). In local http dev leave it unset; it defaults to `session`.

## 4. Deploy
Connect the repo to Cloudflare Pages:
- Build command: `cd site && bun install && bun run build`
- Build output directory: `site/dist`
- Functions in `functions/` deploy automatically alongside the static assets.

## 5. Abuse protection (dashboard)
The app already rate-limits mutating `/api/*` per IP in `_middleware.ts` and gates
account creation behind a real GitHub account. Add edge protection on top:
- Security → Bots → enable **Bot Fight Mode**.
- Security → WAF → Rate limiting rules → add a rule on `/api/*`
  (e.g. 100 requests/min per IP → Block).

These protect availability without gating readable content (content stays public
and indexable — SEO intact).

## Local development
```bash
# from repo root, once:
bun install

# build the static site, init local D1, run the dev server:
cd site && bun run build && cd ..
bunx wrangler d1 execute DB --local --file functions/migrations/0001_init.sql
bunx wrangler pages dev site/dist --d1 DB --kv SESSIONS --compatibility-date 2024-11-01
```

`wrangler pages dev` does NOT read process env into the Functions `env`. Local
secrets/vars come from a **`.dev.vars`** file at the repo root (gitignored):
```
GITHUB_CLIENT_ID=<local oauth app client id>
GITHUB_CLIENT_SECRET=<local oauth app client secret>
SESSION_SECRET=<any long random string>
TERMS_VERSION=2026-05-29
```
For a full local OAuth round-trip, register a SECOND GitHub OAuth App whose
callback is `http://localhost:8788/api/auth/callback` and put its id/secret in
`.dev.vars`. Without real GitHub creds you can still verify the unauthenticated
paths:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/api/me      # → 401
curl -sI http://localhost:8788/api/me | grep -i x-content-type-options     # → nosniff
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8788/api/auth/login?lang=en"  # → 302
```

## Rotating TERMS_VERSION
Bump `TERMS_VERSION` (e.g. to a new date). On next sign-in every user is asked to
re-accept; nickname edits and progress sync stay gated until they do.

## Data & deletion (what is stored)
- `users`: `github_id`, `login`, chosen `nickname`, `avatar_url`, terms version +
  acceptance time, `created_at`. **No email.**
- `progress`: one JSON row per user (their learning state), `ON DELETE CASCADE`.
- Account deletion (`DELETE /api/account`) removes the user row, their progress
  (cascade + explicit), and all their KV sessions, and clears the session cookie.
