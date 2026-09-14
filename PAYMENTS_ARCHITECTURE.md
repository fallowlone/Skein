# Production Billing Architecture

Skein has two Coach billing providers and one Telegram Stars support product. Paid state is always resolved on the server; invoice creation, redirects, and frontend state never grant access by themselves.

## GitHub Sponsors

GitHub Sponsors remains the primary Coach billing provider.

```text
GitHub-authenticated Skein user
  -> GitHub Sponsors checkout
  -> signed sponsorship webhook and/or OAuth reconciliation
  -> github_sponsorships
  -> server-owned coach entitlement
  -> managed Coach endpoint
```

The webhook validates `X-Hub-Signature-256`, the configured sponsorable account, recurring sponsorship semantics, and immutable qualifying tier node IDs. Delivery IDs and signed payload hashes are deduplicated. OAuth reconciliation binds the sponsorship to the authenticated personal GitHub identity and covers private sponsorships and missed webhooks. Provider outages do not create access, and revoked OAuth credentials require reauthentication.

Cancellation, pending cancellation, and tier changes update only the entitlement owned by the matching GitHub sponsorship source. Stale lifecycle events cannot replace a newer effective sponsorship state.

## Telegram Stars

Telegram Stars uses a server-created order for every checkout.

```text
authenticated Skein user
  -> POST /api/telegram/invoice with a product id
  -> server-owned PRODUCTS lookup
  -> telegram_orders row with opaque ord_* id
  -> Telegram createInvoiceLink
  -> pre_checkout_query validation and payer binding
  -> successful_payment webhook
  -> atomic D1 payment/order transition
  -> entitlement transition only for products that define one
```

The client cannot provide price, currency, entitlement, subscription period, Skein user id, or arbitrary invoice metadata. Telegram receives only an opaque order id in `invoice_payload`. For Stars invoices (`XTR`), `provider_token` is omitted.

The webhook requires `X-Telegram-Bot-Api-Secret-Token`, validates the order, product, amount, currency, Telegram payer, charge id, and billing kind, and rejects mismatched or replayed state. `telegram_payment_charge_id` is unique in `payments`. D1 transitions use batches so the payment and the related order/entitlement state are committed together.

Forwarded invoice links do not transfer a Skein entitlement. The Skein account that created the order remains the product owner; the first approved Telegram payer is bound to the order during pre-checkout. A different payer may therefore pay for that account, but cannot redirect access to another Skein user.

### `coach_monthly`

- 500 XTR.
- Recurring Telegram Stars subscription.
- `subscription_period = 2592000` seconds (30 days).
- Invoice creation fails closed when managed AI is unavailable, so Skein cannot charge for Coach while the paid server-side feature is unavailable.
- Grants the `coach` entitlement only through the provider-confirmed `subscription_expiration_date`.
- Renewals extend paid-through access only after a trusted `successful_payment`.
- Cancel/resume uses `editUserStarSubscription` with the first subscription payment identifier, as required by Telegram; cancellation stops renewal and preserves the already-paid period.
- Telegram `BotSubscriptionUpdated` events (`active`, `canceled`, `failed`) update renewal state only. They never grant or revoke paid-through access by themselves.
- Expired paid-through state is persisted and fails closed.
- Refund reconciliation recomputes the remaining paid-through period for the same order, so refunding an older payment cannot revoke a newer renewal.

### `author_support`

- 1 XTR.
- One-time payment labelled **Support the author / Помощь автору**.
- Remains available independently of managed AI availability because it is a support payment, not a Coach purchase.
- Has no entitlement and never unlocks Coach.
- Does not send `subscription_period` and rejects recurring/subscription metadata in `successful_payment`.
- A one-time order can be completed only once.
- Refunds change only the payment/order state; they never modify Coach entitlements.

The product is intentionally suitable for a low-cost real-payment smoke test, but a synthetic webhook is never treated as proof that Telegram processed a real Star payment.

## Data model

Migrations are append-only and applied in this order:

1. `0005_telegram_payments.sql` — `telegram_accounts` and base `payments`.
2. `0006_telegram_payment_hardening.sql` — durable processing timestamp and payment-history index.
3. `0007_telegram_orders_subscriptions.sql` — `telegram_orders`, subscription/payment fields, and `telegram_entitlements`.
4. `0008_telegram_precheckout_lock.sql` — binds each order to its first Telegram pre-checkout query and prevents invoice-link reuse races.

`payments` is the durable transaction ledger. `telegram_orders` binds a Skein user and server-defined product to an opaque invoice payload. `telegram_entitlements` stores Telegram-owned time-bounded access separately from the generic GitHub Sponsors entitlement table.

Customer payment history is available through authenticated `GET /api/billing/payments`. The query is scoped by the middleware-owned Skein user id and exposes provider, product, amount/currency, status, date, and subscription expiration only; provider charge ids and Telegram payer ids are not returned.

## Refund and recovery behavior

Telegram `refunded_payment` updates are idempotent. Subscription refunds affect only the matching Telegram order and recompute its remaining paid-through period. One-time support refunds never touch entitlements. GitHub revocation similarly requires source ownership before an entitlement can be disabled.

If a Telegram durable transition fails, the webhook returns a retryable server error. A later delivery can safely retry because provider charge ids are deduplicated and transitions are guarded by current order state. Invoice creation failures mark the order failed and never create access.

## Production trust boundary

Managed Anthropic Coach requests call the server-side access resolver. A frontend flag, successful redirect, invoice URL, local storage value, or payment button state cannot authorize paid access. GitHub Sponsors and active Telegram paid-through state are the only billing sources that can produce Coach access.

Operational setup, migrations, webhook registration, and smoke checks live in `docs/operator-setup-deploy.md`.
