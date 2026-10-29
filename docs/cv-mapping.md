# CV mapping — what this repo evidences, no more

Rule: every bullet below resolves to a file, a test, or a CI run a reviewer
can open in under a minute. Nothing here grants a title — "mid-level+
fullstack" is the highest claim this evidence supports, and only via the
rows marked ★.

| Claim a resume may make | Evidence (open it) | What it proves |
|---|---|---|
| ★ Ships a bilingual static-first product (Astro 7 + Preact islands, EN/RU parity enforced in CI) | `site/`, `bun run build`, lint `i18n-parity` | fullstack delivery, not a demo |
| ★ Hardened an edge API: uniform 422 validation matrix, authn/authz, pagination | `functions/lib/validate.ts`, `docs/api-routes.md`, `functions/api/admin/summary.ts` | production API discipline |
| ★ Built CI quality gates: unit + typecheck + smoke-e2e blocking, full suite nightly | `.github/workflows/deploy.yml`, `site/e2e/` | CI-as-contract thinking |
| ★ Graceful UI degradation + keyboard/a11y walkthrough, Playwright-verified | `site/src/components/lesson/IslandErrorBoundary.tsx`, `site/e2e/a11y.spec.ts` | accessibility as tested behavior |
| ★ Homegrown D1 observability with documented retention | `functions/lib/logstore.ts`, `docs/operator-observability.md`, migration `0011` | operates what it ships |
| Relational schema evolution (11 migrations, no ORM) | `functions/migrations/`, `docs/adr/0001-d1-vs-supabase.md` | SQL + migration hygiene |
| Idempotent billing webhooks (Stars/Sponsors) without transactions | `functions/api/telegram/webhook.ts`, `docs/adr/0002-batch-vs-transactions.md` | concurrency reasoning |
| Dependency-free edge functions by constraint, documented | `functions/package.json`, `docs/adr/0003-hand-rolled-validation-vs-zod.md` | trade-off judgment |
| Curriculum at scale as typed data (2264+2264 lessons, parity-gated) | `site/src/content/`, `site/src/lint/rules/` | data modeling + invariants |

Deliberately NOT claimed: senior/staff scope, team leadership, people
management, system design at organizational scale. The roadmap's open risks
(R2 serving depth, coverage thresholds, alerting beyond manual queries) stay
risks — a reviewer asking about them gets an honest answer, not a bullet.
