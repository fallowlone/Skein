# ADR 0001 — D1 primary, Supabase content mirror

Status: accepted.

## Context

The edge API needs small relational state (users, progress, entitlements,
orders, logs) with migrations 0001–0011, and the curriculum (44 tracks,
2264+2264 lessons) needs a queryable copy for runtime lesson routes.
Two candidates: Cloudflare D1 next to the Pages Functions, or Supabase
(Postgres) as the single database.

## Decision

D1 is the primary runtime database. Supabase is a post-deploy content
mirror: published and parity-checked after the content build, before the app
build (`deploy.yml`), never on the render path. Git stays the source of truth
for curriculum.

## Consequences

- Hand-written SQL in `functions/lib/db.ts`, explicit user columns (M1.4),
  no ORM in the request path.
- Writes that must not double-apply carry their own guards (delivery-ID +
  payload-hash dedupe, `LIMIT 1` ownership checks, the 0008 pre-checkout
  lock) instead of relying on transactions (see ADR 0002).
- Operators run one extra publish step per deploy
  (`sync:supabase` + `verify:supabase-parity`); a mirror failure flags the
  workflow without breaking serving.

## Rejected

Supabase-as-primary: would put a networked database on the static render
path and on every edge read, against the "database off the render path"
principle. Revisit only if D1 limits (size, query shape) block a feature.
