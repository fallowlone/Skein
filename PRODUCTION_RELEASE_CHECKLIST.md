# Production Release Checklist

## Code

- [x] Build passes.
- [x] Type checks pass.
- [x] Database migrations reviewed before release.
- [x] No known debug code added.

## Security

- [x] Authentication flow reviewed.
- [x] Authorization boundaries reviewed.
- [x] Payment flow reviewed.
- [x] Production secret/config names verified in the Cloudflare Pages deployment environment without exposing values.

## Billing

- [x] GitHub Sponsors signed webhook and reconciliation tests pass.
- [x] Telegram webhook requires its secret token and validates server-owned product/amount/currency.
- [x] Telegram `coach_monthly` uses a real 30-day recurring Stars subscription and paid-through entitlement.
- [x] Coach invoice creation fails closed when managed AI is unavailable; `author_support` remains independent.
- [x] Telegram `author_support` is a 1 XTR one-time payment with no entitlement.
- [x] Duplicate/replayed Telegram payments and old-refund/new-renewal cases have regression coverage.
- [x] Customer payment history is scoped to the authenticated Skein user.
- [x] Production D1 contains `payments`, `telegram_orders`, and `telegram_entitlements` after migrations 0005–0008, including the pre-checkout lock column/index.
- [ ] Telegram `getWebhookInfo` confirms the production webhook URL with no active provider error and no stale `allowed_updates` restriction that omits `subscription` updates.
- [ ] A real 1-Star `author_support` payment has been completed and observed in production.
- [ ] A real recurring Coach billing payment has been completed and observed in production.

## User flows

- [x] Guest access reviewed.
- [x] Registered user flow reviewed.
- [x] Premium entitlement flow reviewed.

## Deployment

- [x] Billing production secret/config names verified; provider-side webhook registration still requires the checks above.
- [ ] Rollback procedure tested.
- [ ] Monitoring enabled.
- [x] Billing task branch passed GitHub Actions and was promoted through the repository's normal `main` production deploy path; production code revision `29fe541b` also passed the full deploy workflow on 2026-09-15.

## Post launch

First 24 hours:

- watch errors and payments;
- verify user registrations;
- check deployment stability.

First 7 days:

- review product metrics;
- review support issues;
- prioritize fixes.
