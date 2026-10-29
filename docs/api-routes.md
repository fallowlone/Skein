# API route table — `functions/api/`

Resolved from source (M4). File `functions/api/<p>.ts` serves
`METHOD /api/<p>`; `lessons/[[path]].ts` serves lesson payloads by path.
Every route also inherits the middleware contract (`functions/_middleware.ts`):
account-gated page JSON → 401, mutating `/api/*` over the per-IP budget →
429, any unhandled throw → generic 500, every response carries
`X-Request-Id`. Input-shape failures are 422 `{error: code}` (M1 matrix);
`invalid()` in the table below means exactly that.

| Method + path | Auth | Purpose | Errors |
|---|---|---|---|
| `GET /api/me` | optional (guest → `authenticated:false`) | session identity + terms state | — |
| `DELETE /api/account` | session | delete user + progress, kill all sessions | 401 |
| `PATCH /api/account/nickname` | session + current terms | set display nickname | 401, 403 `terms_required`, 422 |
| `POST /api/account/terms` | session | accept current `TERMS_VERSION` | 401 |
| `GET /api/admin/summary` | admin token + IP budget (30/min) | paginated usage aggregates | 401, 422 (page params), 429, 503 `admin_disabled` |
| `GET /api/auth/login` | — | redirect to account page (OAuth entry) | — (302) |
| `POST /api/auth/login` | same-origin form | issue OAuth state, set state cookie | 403 `csrf`, form re-redirects on bad input |
| `GET /api/auth/callback` | — (establishes session) | GitHub OAuth callback, create session | state mismatch → re-redirect |
| `POST /api/auth/logout` | same-origin | destroy session | 403 `csrf` |
| `POST /api/billing/github-sponsors` | signed GitHub webhook | sponsorship → coach/course grants | 400 `wrong_event` + money-path framing, 401 `bad_signature`, 409 conflicts, 413, 422 payload-shape |
| `GET /api/billing/payments` | session | billing state for the account page | 401, 503 `billing_unavailable` |
| `POST /api/coach/practice-grade` | session + terms + Coach entitlement + managed AI | server-graded practice critique | 401, 403 (`terms_required`, `coach_reauth_required`, `coach_required`), 413, 422, 503 (verification/AI down) |
| `GET /api/courses/access?track=` | session | is this track unlocked for me | 401, 422 `invalid_track` |
| `POST /api/courses/github-intent` | session + same-origin + terms | record GitHub one-time-tier course selection | 401, 403 (`csrf`, `terms_required`), 409 (already unlocked/pending), 422, 503 |
| `GET /api/entitlements` | optional (guest → coach:false) | entitlement + billing-config surface | — |
| `POST /api/entitlements` | optional + same-origin | same, force-refreshing Coach access | 403 `csrf` |
| `POST /api/events` | anonymous | usage events (lesson_view/time, practice_result) | 413 `too_large`, 422 |
| `POST /api/feedback` | anonymous | "what was unclear" per lesson | 413 `too_large`, 422 |
| `GET /api/lessons/*path` | optional (records completion only when signed in) | lesson payload (open to guests) | 422 `bad_lesson_path`, 404/502 from loader |
| `POST /api/lessons/attempt` | session + same-origin + terms | grade a lesson exercise attempt | 401, 403 (`csrf`, `terms_required`), 422, 502 `invalid_lesson_exercises` |
| `GET /api/progress` | session | fetch synced progress blob | 401 |
| `PUT /api/progress` | session + current terms | store progress blob (256 KB cap) | 401, 403 `terms_required`, 413 `too_large`, 422 `bad_json` |
| `GET /api/search?...` | anonymous + IP budget | edge-backed curriculum search | 422 (query params), 429 |
| `POST /api/telegram/invoice` | session + same-origin | create Stars invoice for a product | 401, 403 `csrf`, 409 `course_already_unlocked`, 422, 502/503 billing down |
| `POST /api/telegram/subscription` | session + same-origin | cancel/resume Stars subscription | 401, 403 `csrf`, 404 `subscription_not_found`, 422, 500 corrupt state, 502 |
| `POST /api/telegram/webhook` | Telegram `secret_token` | payment/pre-checkout updates → grants | 400 money-path framing, 409 conflicts, 502/503 persistence/billing |

Money-path note: Telegram/GitHub webhook framing failures stay 400 (not 422)
on purpose — sender retry contracts, no sandbox to verify a change against
(M1 ruling, ledgered). Everything else that is a client input-shape problem
is 422.
