# GitHub auth, user accounts & Terms of Use — design

**Date:** 2026-05-29
**Status:** approved (brainstorming) → ready for implementation plan
**Branch target:** new feature branch off `main` (do not mix with `quiz-project-completion`)

## Goal

Add optional GitHub-based authentication to the curriculum site so that:

1. Users can sign in with GitHub (anti-bot/anti-spam barrier — a real GitHub
   account is required, no anonymous account creation).
2. Signed-in users get a **personal cabinet**: view GitHub login + avatar,
   change a display nickname, delete their account.
3. Learning progress (today only in `localStorage`) **syncs to the server** when
   signed in, so it follows the user across devices.
4. A **Terms of Use** page exists, is linked in the footer, and must be accepted
   on first sign-in.

**Non-goals (v1):** comments/notes, social features, email collection, password
auth, nickname uniqueness enforcement, admin panel, analytics.

## Guiding constraints

- **Content stays public and indexable.** The site keeps `output: "static"`; the
  16-pillar content and `/learn` lessons remain readable without login. This
  preserves SEO and the project's "open public learning for all" mission
  (memory: `project_site-vision`). Login is **optional** — anonymous users keep
  working exactly as today (localStorage only).
- **Minimal blast radius.** No change to the Astro build, the curriculum linter,
  or the 3912-page static output. Auth/API live in a sibling `functions/`
  directory deployed as Cloudflare Pages Functions on the same domain (no CORS,
  no separate server).
- **Minimal personal data.** Store only `github_id`, `login`, `nickname`,
  `avatar_url`, and Terms acceptance metadata. No email. Account deletion is a
  single cascade that removes the user, their progress, and all their sessions.

## Architecture

```
awesome-everything/
  site/                         unchanged — static Astro build (public content)
  functions/                    NEW — Cloudflare Pages Functions (serverless /api/*)
    _middleware.ts              session resolution + rate-limit + security headers
    api/
      auth/login.ts             GET → redirect to GitHub authorize (+ state cookie)
      auth/callback.ts          GET → code→token exchange, upsert user, create session
      auth/logout.ts            POST → delete session + clear cookie
      me.ts                     GET → current user { login, nickname, avatarUrl, termsAcceptedAt }
      account/nickname.ts       PATCH → update nickname
      account/terms.ts          POST → record Terms acceptance (version + timestamp)
      account.ts                DELETE → delete account (cascade)
      progress.ts               GET / PUT → learning-progress sync
    lib/
      session.ts                create/verify/destroy opaque KV sessions
      db.ts                     D1 query helpers (users, progress)
      github.ts                 OAuth exchange + /user fetch + mapping
      ratelimit.ts              KV per-IP token bucket for write endpoints
      cookies.ts                signed-cookie + Set-Cookie helpers
      response.ts               json()/error() helpers + security headers
  wrangler.toml                 NEW — Pages project config: D1 + KV bindings, vars
  functions/migrations/0001_init.sql   D1 schema
```

The Astro site is built as today (`bun run build` in `site/`). Cloudflare Pages
serves `site/dist/` as static assets and runs `functions/` as edge functions on
the same origin. Local dev: `wrangler pages dev site/dist --d1 DB --kv SESSIONS`.

## Data model

### D1 (SQLite)

```sql
-- functions/migrations/0001_init.sql
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id       INTEGER NOT NULL UNIQUE,
  login           TEXT    NOT NULL,            -- GitHub username (may change upstream)
  nickname        TEXT    NOT NULL,            -- editable display name; defaults to login
  avatar_url      TEXT,
  terms_version   TEXT,                        -- version string accepted, e.g. "2026-05-29"
  terms_accepted_at INTEGER,                   -- epoch ms; NULL until accepted
  created_at      INTEGER NOT NULL
);

CREATE TABLE progress (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT    NOT NULL,                 -- JSON blob: synced UserState subset
  updated_at INTEGER NOT NULL
);
```

`ON DELETE CASCADE` requires `PRAGMA foreign_keys = ON` per D1 connection (set in
`db.ts`). Account deletion also explicitly deletes the user's KV sessions
(tracked via a `user_sessions:<userId>` KV index set).

### KV (`SESSIONS` namespace)

- `session:<sessionId>` → `{ userId, exp }`, written with TTL = 30 days.
- `usess:<userId>` → JSON array of active sessionIds (for logout-all on delete).
- `rl:<ip>:<bucket>` → rate-limit counter, short TTL.

Session id = 32 random bytes, base64url. Opaque (not a JWT) so revocation is
immediate: deleting the KV key kills the session.

## Auth flow (GitHub OAuth Authorization Code)

1. **`GET /api/auth/login?lang=en`** — generate random `state`, store it in a
   short-lived httpOnly cookie, 302-redirect to
   `https://github.com/login/oauth/authorize?client_id=…&state=…&scope=read:user&redirect_uri=…`.
   `scope=read:user` only (no email, no repo access).
2. **`GET /api/auth/callback?code=…&state=…`** — verify `state` matches the
   cookie (CSRF protection); reject otherwise. Exchange `code` for an access
   token server-side using `GITHUB_CLIENT_SECRET` (POST to
   `https://github.com/login/oauth/access_token`). Fetch
   `https://api.github.com/user`. Upsert into `users` keyed by `github_id`
   (insert with `nickname = login` on first sign-in; on return, refresh `login`
   and `avatar_url` but keep the user's chosen `nickname`). Create a KV session,
   set the session cookie, redirect to `/<lang>/account`.
3. **`POST /api/auth/logout`** — delete the KV session, remove it from the
   `usess:` index, clear the cookie.

Cookies: `__Host-session` (or `session` in dev), `HttpOnly; Secure; SameSite=Lax;
Path=/`. `SameSite=Lax` allows the OAuth redirect to carry the cookie back.

## Cabinet & Terms (frontend — stays static)

- **`AccountMenu.tsx`** island in `TitleBar` (`client:idle`): calls `GET /api/me`;
  renders "Sign in with GitHub" (→ `/api/auth/login`) when anonymous, or
  avatar + nickname with a dropdown (Account → `/<lang>/account`, Logout) when
  signed in. Anonymous render is the default; no layout shift for logged-out SEO.
- **`/[lang]/account`** page (`getStaticPaths` en/ru) with an `AccountPanel.tsx`
  island:
  - shows GitHub `login`, `avatar_url`, `nickname`, account-created date, Terms
    status;
  - **change nickname**: PATCH `/api/account/nickname`; validation 2–32 chars,
    `[\p{L}\p{N} _.-]` only, trimmed; not required to be unique (display-only);
  - **delete account**: requires typing the nickname (or the word `DELETE`) to
    confirm, then DELETE `/api/account`; on success clears local state and
    redirects home.
- **`/[lang]/terms`** page: Terms of Use content authored EN + RU (plain Astro
  prose, no hydration). Covers: what the service is, that it's provided as-is,
  acceptable-use (no automated abuse/scraping at scale), the minimal data stored,
  how to delete one's account, and that progress data is user-owned and deletable.
  Linked from `SourcesFooter`/footer on every page.
- **Terms gate on first login**: if `me.termsAcceptedAt` is null, `AccountPanel`
  (and `AccountMenu` post-login) shows a blocking consent step linking to
  `/terms`; accepting calls `POST /api/account/terms` with the current
  `TERMS_VERSION`. Account features (nickname edit, progress sync) stay disabled
  until accepted. Sign-in itself is allowed (the account row exists) but is in a
  "pending terms" state.

## Progress sync

- `user-state.ts` gains an optional sync layer. On load it still reads
  localStorage (offline cache / anonymous source of truth).
- On detecting a session (`GET /api/me` succeeds **and** terms accepted), it
  `GET /api/progress`, **merges** server + local by taking the per-lesson
  `max(lastAt)` (the existing `history`/`retrieval` maps already carry
  timestamps), writes the merged state locally, and `PUT`s it back.
- Subsequent local changes trigger a **debounced** `PUT /api/progress`
  (e.g. 3 s after the last change). Last-write-wins at the document level is
  acceptable for single-user multi-device; the merge-on-login handles the common
  "different device" case.
- Synced subset: `tier`, `lang`, `motion`, `pretest`, `history`, `retrieval`,
  `dismissedRevisit`, `manualTierFlips`. (Same shape as today's `UserState`.)
- Anonymous users: no network calls; behaviour identical to today.

## Anti-bot / anti-spam (edge-first, no content gate)

- **GitHub OAuth** is the primary barrier: account creation requires a real
  GitHub account; there is no anonymous signup endpoint.
- **`ratelimit.ts`** — KV per-IP token bucket applied in `_middleware.ts` to
  mutating endpoints (`PUT /api/progress`, `PATCH /api/account/nickname`,
  auth endpoints). Returns 429 on exceed.
- **Security headers** in `_middleware.ts`: `Content-Security-Policy`
  (compatible with the static site's inline theme boot — audit before tightening),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`.
- **Documented (dashboard, not code):** enable Cloudflare Bot Fight Mode and a
  WAF rate-limiting rule on `/api/*`. These protect availability without gating
  readable content.

## Secrets & configuration (operator-provided)

Set via Cloudflare Pages project (Production + Preview) — never committed:

- `GITHUB_CLIENT_ID` (public-ish; can also be a build var)
- `GITHUB_CLIENT_SECRET` (secret)
- `SESSION_SECRET` (secret; used to sign the `state` cookie and any signed cookies)
- `TERMS_VERSION` (e.g. `2026-05-29`; bumping it re-triggers the consent gate)

Bindings in `wrangler.toml`: D1 database `DB`, KV namespace `SESSIONS`.

**Operator setup (documented in the plan, cannot be done by the agent):**
1. Create a GitHub OAuth App; set Authorization callback URL to
   `https://<domain>/api/auth/callback`.
2. Create a D1 database and a KV namespace in Cloudflare; put their ids in
   `wrangler.toml`.
3. Run the D1 migration (`wrangler d1 execute DB --file functions/migrations/0001_init.sql`).
4. Add the four secrets to the Pages project.
5. Enable Bot Fight Mode + the `/api/*` rate rule.

## Testing

- **vitest** unit tests for `lib/`:
  - `session.ts`: create → verify → destroy; expired session rejected.
  - `github.ts`: maps a GitHub `/user` payload to a user row; first-login sets
    `nickname = login`; return-login preserves chosen nickname.
  - `ratelimit.ts`: allows N, rejects N+1 within window, resets after TTL.
  - cookie signing/verification round-trip; tampered cookie rejected.
  - terms-gate predicate: features disabled when `termsAcceptedAt` null or
    `terms_version` < current `TERMS_VERSION`.
  - nickname validation: accepts valid, rejects too-short/too-long/bad-chars.
  - D1 + KV mocked with lightweight in-memory fakes.
- **Astro build** stays green: `functions/` is outside the Astro build, so
  `bun run build` in `site/` still produces 3912 pages, lint 0 errors.
- Optional: a Playwright smoke test of the static `/terms` and `/account`
  (anonymous) pages rendering.

## Component / unit boundaries

Each `functions/lib/*` module has one purpose and a clear interface:

- `session.ts` — owns KV session lifecycle. In: KV + userId. Out: sessionId /
  resolved userId. Depends on: KV, crypto.
- `db.ts` — owns all D1 SQL. In: D1 + typed args. Out: typed rows. Depends on: D1.
- `github.ts` — owns the OAuth/network side. In: code + secrets. Out: GitHub user.
  Depends on: fetch.
- `ratelimit.ts` — owns throttling. In: KV + ip + bucket. Out: allow/deny.
- `cookies.ts` / `response.ts` — pure helpers, no external deps beyond Web APIs.

Each `api/*` handler is thin: parse → authorize (middleware-provided userId) →
call one or two lib functions → `json()`. Handlers stay small enough to hold in
context and test via the lib units.

## Rollout / branch

Implement on a fresh branch off `main` (not `quiz-project-completion`, which is
content-only and pending its own merge). Ship behind the optional-login UX so a
deploy without configured secrets degrades gracefully: if `GET /api/me` returns
not-configured/unauthorized, `AccountMenu` simply shows "Sign in with GitHub" and
the rest of the static site is unaffected.
