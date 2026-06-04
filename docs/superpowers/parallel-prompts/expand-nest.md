# Expand the `nest` track to full depth (zero → senior+)

Branch: `expand-nest`. First read `PROTOCOL.md` in this folder and follow it exactly.
Track `nest` already has units 00-start-here, 01-building-blocks, 02-validation-and-pipes (orders 0-2). Add the units below (orders 3+), author every lesson EN+RU to `ready`. Lessons may declare `prereqs` into node/typescript.

## Units to add

### 03-config-and-modules  (crux: configuration and composing modules at scale)
- `01-config-module` (middle) — `@nestjs/config`, env validation (Joi/zod), namespaced config, per-environment.
- `02-dynamic-modules` (senior) — `forRoot`/`forRootAsync`, `forFeature`, the dynamic-module pattern for reusable libs.
- `03-lifecycle-and-bootstrapping` (middle) — lifecycle hooks (OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown), graceful shutdown.

### 04-persistence  (crux: talk to a database the Nest way)
- `01-typeorm-or-prisma` (middle) — integrating an ORM, repository injection, entities/models (TradeoffMatrix TypeORM vs Prisma).
- `02-repositories-and-transactions` (senior) — repository pattern, transactions, the unit-of-work, migrations.
- `03-data-modeling-and-pitfalls` (senior) — relations, N+1, lazy vs eager, request-scope + DB interactions.

### 05-auth  (crux: authenticate and authorize requests)
- `01-passport-and-jwt` (middle) — Passport strategies, JWT issue/verify, the auth guard.
- `02-rbac-and-guards` (senior) — roles/permissions, custom guards + Reflector metadata, policy-based access.

### 06-testing  (crux: test Nest without the whole app)
- `01-unit-testing-providers` (middle) — `Test.createTestingModule`, mocking providers, overrideProvider.
- `02-e2e-testing` (middle) — supertest against the Nest app, test DB, auth in tests.

### 07-errors-and-observability  (crux: production-grade error + telemetry)
- `01-exception-filters-and-logging` (middle) — global filters, structured logging, request-id, the Logger.
- `02-health-and-interceptors` (senior) — health checks (@nestjs/terminus), timeout/cache/transform interceptors, metrics.

### 08-microservices-and-graphql  (crux: beyond a single REST app)
- `01-microservices-transport` (senior) — the microservice transports (TCP/Redis/NATS/Kafka), message vs event patterns.
- `02-graphql-module` (senior) — code-first GraphQL, resolvers, dataloader for N+1.

### 09-putting-it-together
- `01-capstone-typed-api` (senior) — design a fully-typed, authed, tested Nest service end to end.

Author at middle/senior depth. Build green on `expand-nest`, commit, do NOT merge.
