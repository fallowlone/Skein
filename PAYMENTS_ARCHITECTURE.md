# Telegram Stars Payment Architecture

## Current billing state

The project already had Telegram Stars invoice creation, a payment table, and entitlement storage. Payments are stored with provider identifiers and entitlements are connected to existing authorization checks.

## Payment flow

```
User
 -> Create invoice
 -> Telegram Stars checkout
 -> Telegram successful_payment event
 -> Validate provider payload, currency, and amount
 -> Store completed payment
 -> Grant entitlement
 -> Authorization checks feature access
```

## Data model

`payments` stores provider transactions:

- user
- provider and Telegram charge id
- product
- amount and currency
- payment status
- timestamps

`entitlements` remains the access source used by authorization.

## Security

- Telegram webhook secret header is required.
- Backend validates payment amount and currency.
- Telegram charge id uniqueness prevents duplicate processing.
- Frontend invoice state is not trusted.

## Entitlements

Successful payments grant product entitlements. The authorization layer resolves these entitlements before premium features are enabled.

## Remaining work

- Add dedicated integration tests against Telegram webhook fixtures.
- Add customer facing payment history UI.
- Add refund reconciliation when refund workflows are enabled.
