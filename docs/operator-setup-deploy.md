# Operator Setup — Production Deploy (GitHub Actions → Cloudflare Pages)

Production deploys are built in GitHub Actions and uploaded to Cloudflare Pages with
`wrangler pages deploy` (direct upload). This replaces Cloudflare's own git-integration
builds, which OOM'd on the ~4240-page render. See
`docs/superpowers/specs/2026-06-03-build-off-cf-direct-upload-design.md`.

The pipeline lives in `.github/workflows/deploy.yml`. Three one-time operator actions are
required before it can deploy.

## 1. Create a Cloudflare API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token → Create Custom Token**:

- **Permissions:** `Account` → `Cloudflare Pages` → **Edit**, and `Account` → `Account Settings` → **Read**.
- **Account Resources:** Include → your account.
- No D1/KV/R2 scopes are needed (migrations are not run from this workflow).

Copy the token value (shown once).

Find your account ID: dashboard → **Workers & Pages** → right sidebar **Account ID** (or
`wrangler whoami`).

## 2. Add GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

- `CLOUDFLARE_API_TOKEN` = the token from step 1.
- `CLOUDFLARE_ACCOUNT_ID` = your account ID.

## 3. Disconnect Cloudflare's Git integration

Cloudflare dashboard → **Workers & Pages → skein → Settings →
Builds & deployments → Disconnect** (the Git connection).

This stops Cloudflare from building on push; GitHub Actions becomes the sole deploy path.
Do this **after** the dry-run in the cutover below succeeds.

Project-level secrets already set for auth (`GITHUB_CLIENT_SECRET`, `SESSION_SECRET`) and
all `wrangler.toml` bindings (D1 `DB`, KV `SESSIONS`, R2 `MODELS`, `[vars]`) are unaffected —
direct uploads preserve them.

## Cutover sequence (zero-downtime)

1. Land `.github/workflows/deploy.yml` and add the two secrets (steps 1–2 above).
2. **Dry-run to a preview branch.** Repo → **Actions → Deploy to Cloudflare Pages → Run
   workflow**, set the `branch` input to `preview`. On the resulting `*.pages.dev` preview
   URL, verify: pages render, an `/api/*` route responds, and the GitHub login flow works
   end-to-end. This proves `functions/` was bundled and bindings/secrets are intact.
3. **Disconnect Git** (step 3 above).
4. Deploy production: push to `main` (or run the workflow with `branch` = `main`).

Cloudflare keeps serving the last good production deployment throughout, so there is no
downtime between disconnect and the first GitHub-Actions production deploy.

## Rollback

Cloudflare retains deployment history: **Workers & Pages → awesome-everything →
Deployments → … → Rollback**.

## Skein Coach: GitHub Sponsors + Telegram Stars + managed AI

Coach keeps all authored learning, adaptive path/SRS/readiness, and BYOK AI free. A recurring
GitHub Sponsors entitlement only unlocks server-paid Anthropic practice critique. The UI exposes
no payment CTA until the billing webhook, qualifying tier IDs, and Sponsors URL are configured;
new signups are also paused when managed Anthropic is unavailable.

### 1. Apply the entitlement schema

Run the Coach migrations against the same D1 bound as `DB`:

```bash
bunx wrangler d1 execute DB --remote --file functions/migrations/0003_coach_entitlements.sql
bunx wrangler d1 execute DB --remote --file functions/migrations/0004_coach_verification.sql
```

For local Pages Functions development, apply both files with `--local` after the existing
auth/metrics migrations. `0004` adds `entitlements.verified_at`; it records the last successful
live Sponsors verification and is separate from webhook `updated_at`.

### 2. Configure GitHub Sponsors

Create a recurring Sponsors tier that should grant Coach, then configure the Sponsors webhook to
POST sponsorship events to:

```text
https://<your-domain>/api/billing/github-sponsors
```

Set the webhook **Content type** to `application/json`. The endpoint verifies and parses the signed
raw JSON body; the form-encoded webhook option is intentionally not accepted.

Use a random webhook secret and set the same value in the Pages project. The backend verifies
`X-Hub-Signature-256` over the raw request body and deduplicates both `X-GitHub-Delivery` IDs and
the signed payload hash so changing only the delivery header cannot replay a captured event.

Required billing configuration:

```text
GITHUB_SPONSORS_URL=https://github.com/sponsors/fallowlone
GITHUB_SPONSORS_COACH_TIER_IDS=ST_kwDOBmwyvM4ACf5e
GITHUB_SPONSORS_WEBHOOK_SECRET=<secret>
```

`GITHUB_SPONSORS_COACH_TIER_IDS` uses immutable GitHub tier `node_id` values; tier names and
prices are intentionally not used for authorization. Only identifiable personal GitHub sponsors
can be matched automatically. Private viewer sponsorships are supported by OAuth reconciliation;
`sponsorEntity` being unavailable in a private response is not treated as a different account.
The webhook tier payload shape follows the upstream Octokit schema for `SponsorshipTier`, including
`changes.tier.from.node_id` and `changes.tier.from.is_one_time` ([schema](https://raw.githubusercontent.com/octokit/webhooks/main/payload-types/schema.d.ts)).
Sponsorships created before first Skein login are reconciled on the next login or manual recheck.

OAuth sessions retain the provider token only inside the encrypted KV session for at most the
existing 30-day session lifetime. Verification freshness is bounded to five minutes. A missed
webhook can therefore leave access stale for at most five minutes after the next request that
reaches the entitlement or paid endpoint; provider outages fail closed and surface an unavailable
verification state. A revoked or missing token requires reauthentication.

Store the webhook secret as a Pages secret:

```bash
bunx wrangler pages secret put GITHUB_SPONSORS_WEBHOOK_SECRET
```

`GITHUB_SPONSORS_URL` and `GITHUB_SPONSORS_COACH_TIER_IDS` are non-secret configuration and may be
set as Pages environment variables (or committed under `[vars]` once the production values are
stable).

To inspect the recipient's published and unpublished tiers before changing the whitelist, use the
GitHub CLI with an account that can administer the Sponsors listing:

```bash
gh api graphql \
  -f login=fallowlone \
  -f query='query($login: String!) { user(login: $login) { sponsorsListing { tiers(first: 100, includeUnpublished: true) { nodes { id name monthlyPriceInCents isOneTime } } } } }'
```

The returned `id` is the value used in `GITHUB_SPONSORS_COACH_TIER_IDS`; do not authorize by tier
name or price. If an existing OAuth session was created before `read:user` was granted, start a new
login at `/api/auth/login?lang=en&returnTo=coach` (or `lang=ru`) and approve the refreshed scope,
then use Settings → Coach → Recheck. The app already requests `read:user`; this reauthentication is
needed when the old provider token has no such grant. A missing or revoked token must follow the
same reauthentication path.

### 3. Configure managed Anthropic

Set the server-side provider key as a Pages secret:

```bash
bunx wrangler pages secret put ANTHROPIC_API_KEY
```

Optional non-secret configuration:

```text
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
COACH_AI_MONTHLY_REQUESTS=30
```

The request quota is enforced atomically in D1 before Anthropic is called. The default is 30
managed practice reviews per UTC month (server clamps configuration to 1–1000). Explicit provider
rejections release the reservation. Network errors/timeouts and successful responses with unusable
output keep it because Anthropic may already have accepted/billed the request; this preserves the
hard monthly cost ceiling.

### 4. Configure Telegram Stars

Telegram Stars uses the same authenticated Skein account model as the rest of billing. The site
creates invoices only through `POST /api/telegram/invoice`; there is no static public payment URL.
The invoice payload is an opaque server-created `telegram_orders.id`, and price/currency/product
semantics come only from `functions/lib/products.ts`.

Apply the Telegram migrations in order after the auth and Coach migrations:

```bash
bunx wrangler d1 execute DB --remote --file functions/migrations/0005_telegram_payments.sql
bunx wrangler d1 execute DB --remote --file functions/migrations/0006_telegram_payment_hardening.sql
bunx wrangler d1 execute DB --remote --file functions/migrations/0007_telegram_orders_subscriptions.sql
bunx wrangler d1 execute DB --remote --file functions/migrations/0008_telegram_precheckout_lock.sql
```

Do not rerun an `ALTER TABLE` migration blindly. Before applying a production migration, inspect
the remote schema and confirm which version is missing:

```bash
bunx wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('payments','telegram_orders','telegram_entitlements') ORDER BY name"
bunx wrangler d1 execute DB --remote --command "PRAGMA table_info(payments)"
```

Required Pages secrets:

```text
TELEGRAM_BOT_TOKEN=<secret>
TELEGRAM_WEBHOOK_SECRET=<secret>
```

Set them with `wrangler pages secret put`. Never commit either value. Register the Telegram webhook
at the production endpoint and pass the same secret as Telegram's `secret_token`:

```bash
printf '{"url":"https://fallowlone.com/api/telegram/webhook","secret_token":"%s","allowed_updates":[]}' "$TELEGRAM_WEBHOOK_SECRET" \
  | curl --fail-with-body --silent --show-error \
      -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
      -H 'content-type: application/json' \
      --data-binary @-
```

Read registration state without printing either secret:

```bash
curl --fail-with-body --silent --show-error \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Check that the URL is exactly `https://fallowlone.com/api/telegram/webhook`, pending updates are
not accumulating, `last_error_message` is absent, and the webhook is not restricted to an old
`allowed_updates` list that omits the Bot API `subscription` update. Passing an empty
`allowed_updates` list above resets Telegram to its default broad update set, which includes
`message`, `pre_checkout_query`, and `subscription`. The webhook endpoint rejects a missing or
wrong `X-Telegram-Bot-Api-Secret-Token`.

`0008` is required by the deployed billing code: it locks each order to the first Telegram
`pre_checkout_query.id`. Redelivery of that same query remains idempotent, while a different
pre-checkout query for the already-approved invoice link is rejected before another charge can be
authorized.

Current Stars products:

- `coach_monthly`: 500 XTR recurring every 30 days. Telegram requires a 2,592,000-second
  subscription period. Skein trusts the provider-confirmed subscription expiration date and keeps
  Coach active only through that paid-through timestamp. Cancel/resume uses
  `editUserStarSubscription` with the first subscription payment id; cancelling renewal does not
  revoke the paid period early. `BotSubscriptionUpdated` provider updates keep renewal state in sync
  but never grant or revoke the paid-through entitlement by themselves.
- `author_support`: 1 XTR one-time **Support the author / Помощь автору** payment. It grants no
  entitlement and never unlocks Coach. This is the preferred low-cost real-payment smoke-test path.

For Stars (`XTR`) invoices the Bot API request omits `provider_token`. `successful_payment` stores
the Telegram charge id for deduplication and future refund reconciliation. A `refunded_payment`
update marks the matching payment refunded. For Coach, only the matching order's paid-through
state is recalculated; an older refund cannot revoke a newer renewal. For `author_support`, refund
processing never touches entitlements.

Forwarding an invoice does not transfer ownership of Skein access. The Skein user that created the
order owns the product; the Telegram account that reaches pre-checkout is bound as payer. A payer
may therefore fund another Skein user's order, but cannot choose which Skein account receives Coach.

Customer history is exposed by authenticated `GET /api/billing/payments` and is always filtered by
the middleware-owned Skein user id. Provider charge ids and Telegram payer ids are not exposed.

### 5. Production smoke check

After deploy, verify these states before publishing the Sponsors tier broadly:

1. Signed-out and Free users can still open lessons, practice, Algorithm Workspace, path/SRS, and
   BYOK AI without Coach.
2. `/api/entitlements` reports `billing.configured=true` only when the Sponsors URL, webhook
   secret, and qualifying tier IDs are all present.
3. With `ANTHROPIC_API_KEY` absent, the UI shows Coach signup as paused and does not link to a
   checkout.
4. A public recurring sponsorship from the same GitHub user grants `coach`; cancellation revokes
   it, while `pending_cancellation` remains active until GitHub sends `cancelled`.
5. An entitled user can run one managed practice critique and sees the monthly remaining count
   decrease.
6. `POST /api/telegram/invoice` without an authenticated session returns `401`, and the Telegram
   webhook without the secret header returns `401`.
7. An authenticated Settings → **Support the author / Помощь автору** checkout creates a 1 XTR
   one-time invoice. Paying it with a real Telegram account creates a completed `author_support`
   history row and does not grant Coach.
8. An authenticated `coach_monthly` invoice contains a 30-day subscription period; the first real
   payment grants Coach only through Telegram's confirmed expiration date. Cancelling renewal keeps
   access through that date.

The real Stars checks in steps 7–8 spend real Stars. Do all non-financial endpoint, schema, webhook
registration, and test checks automatically, but perform the actual payment only with explicit
operator approval. A synthetic signed webhook is useful for tests but is not a real end-to-end
payment smoke test.

### 6. Billing monitoring and recovery

- Check `payments`, `telegram_orders`, `telegram_entitlements`, `github_sponsorships`, and
  `billing_deliveries` when reconciling a billing incident. Do not modify rows to manufacture paid
  state.
- A Telegram webhook `503` indicates a retryable durable-state failure. Fix the D1/provider issue
  and allow Telegram to redeliver; charge-id and order guards make retries idempotent.
- If `getWebhookInfo` shows pending updates or a last error, fix the production URL/secret/config
  before enabling the Stars CTA broadly.
- If GitHub OAuth reconciliation reports reauthentication required, have the user sign in again;
  do not preserve access from stale frontend state.
- Cloudflare deployment rollback restores code, but D1 migrations are forward history. Take schema
  state into account before rollback and do not edit already-applied migration files.

## Notes

- Backend verification is run by CI with `cd functions && bun run test`; this runs the Vitest suite and the real SQLite billing race regression (`bun lib/db.sqlite.integration.ts`). Run `bun run typecheck` from `functions/` alongside it for the Functions typecheck.
- The deploy command runs from the **repo root** so wrangler bundles the root `functions/`
  directory (Cloudflare requires Wrangler, not dashboard drag-and-drop, to compile Functions).
- Per-PR preview deploys (a perk of the old Git integration) are not reproduced here; add a
  `pull_request`-triggered workflow deploying to `--branch=<pr-ref>` later if wanted.
