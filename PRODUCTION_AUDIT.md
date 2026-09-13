# Production Readiness Audit

Date: 2026-09-13

Scope: repository review only. No fixes were applied.

## Executive assessment

Skein is an Astro 6 + Preact + Tailwind learning platform with a large bilingual curriculum, Cloudflare Pages Functions APIs, database migrations, account flows, and interactive browser tooling.

The project is beyond prototype stage. Main production risks are operational hardening: security review of authentication and payments, monitoring, deployment confidence, and end-to-end verification.

## Architecture

Stack:

- Frontend: Astro 6, Preact, Tailwind CSS, TypeScript.
- Content: MDX/content collections with EN/RU lessons.
- Backend: Cloudflare Pages Functions.
- Database: Functions migrations with Supabase integration.
- Tooling: Bun, Vitest, Playwright, Wrangler.

Main areas:

- `site/src/pages` - routes.
- `site/src/components` - UI and interactive modules.
- `site/src/content` - curriculum source.
- `functions/api` - API handlers.
- `functions/lib` - backend services.
- `functions/migrations` - schema history.

## Findings

### P0

- Payment flows require final production security verification: webhook validation, replay handling, entitlement consistency, and recovery paths.

### P1

- Authentication/session lifecycle needs a production checklist review.
- Rate limiting exists but expensive endpoints need verification.
- API failures and payment failures need operational monitoring.
- Critical user paths need automated browser coverage.
- Database backup and restore procedures need documentation.

### P2

- Accessibility review is needed across application screens.
- Loading, error, and empty states need consistency review.
- API contracts are distributed between handlers and tests.
- Performance budgets are needed for interactive browser features.

### P3

- Further UI consistency improvements.
- Developer experience improvements.
- Additional analytics.

## Frontend review

Strengths:

- Clear component organization.
- Large content infrastructure.
- Existing tests around many interactive features.
- Strong bilingual content model.

Risks:

- Large interactive surface creates regression risk.
- Browser sandboxes and local ML features require performance monitoring.

## Backend review

Implemented API areas include:

- authentication;
- account management;
- progress;
- lessons;
- search;
- coach grading;
- billing;
- Telegram payments;
- admin metrics.

Required production checks:

1. Verify deployment secrets.
2. Verify webhook signatures and idempotency.
3. Verify session security.
4. Verify error handling and observability.

## TODO / temporary code

Repository searches contain many valid development references: tests with mocks, UI placeholders, and educational examples. They should be manually classified before removal.

Review candidates:

- development-only routes;
- preview/mock content;
- generated artifacts;
- placeholder styling.

## Production roadmap

### Phase 1 - launch readiness

- Complete security review.
- Verify production configuration.
- Add monitoring.
- Perform deployment rehearsal.

### Phase 2 - hardening

- Add browser smoke tests.
- Document API contracts.
- Document recovery procedures.
- Review accessibility and performance.

### Phase 3 - maintainability

- Improve domain boundaries.
- Consolidate operational documentation.
- Continue UI consistency work.

