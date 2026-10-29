# Skein Roadmap to Mid-Level+ (EU/Germany)

## Goal

Превратить Skein из senior-scale scope в hireable доказательство mid-level+: Astro 7 + Preact islands, edge backend D1/KV/R2 + Supabase, GitHub OAuth сессии, QuickJS sandbox, vitest + Playwright, CI deploy.yml. Закрыть hardening, quality gates и упаковку без переписывания.

## Success Criteria

- `astro check` + site/functions тесты зеленые.
- `admin/summary` пагинирован, `SELECT *` убран, authz жив или удален.
- Lesson island не гасит страницу: ErrorBoundary + fallback, skip-link, Playwright a11y spec зеленый.
- CI gate определен: coverage thresholds + e2e gate/nightly, наблюдаемость с retention/alerts задокументирована.
- Внешний ревьюер за 10 минут доходит до demo + API docs + ADRs без помощи.

## Approach

Эволюция, не rewrite. Порядок M1-M4 по зависимостям: сначала API дисциплина, потом UI качество, потом gates/observability, в конце упаковка. Каждый майлстоун маленький slice с тестом. Решения объяснять через trade-off, AI код не blind-accept.

Rejects: переписать на новый фреймворк, добавить Prisma в runtime ради резюме, вводить Kafka/Redis без нужды. D1 batch остается пока транзакции не доказаны нужными, Supabase остается parity-источником.

## Steps

### M1. Backend hardening (first, no deps)

- Goal: API production-credible.
- Problem: ручная валидация `validateSearchParams` / `parseLessonPath` / `readBodyBounded` / `parseEventsBody`, мертвый `authorization.ts roleFor/canUse`, `admin/summary` 3x full-table GROUP BY + in-memory LIMIT 100, `getUserById SELECT *`.
- Tasks:
  1. zod/valibot на границах API, 422 матрица.
  2. wire-or-delete `roleFor/canUse`.
  3. Пагинация `admin/summary` + caps.
  4. Явные поля вместо `SELECT *`.
- Concepts: input validation, least-privilege, pagination.

### M2. Frontend quality + a11y (dep M1 patterns)

- Goal: island crash не blank page.
- Problem: нет ErrorBoundary, нет skip-link, dialog focus-trap не проверен.
- Tasks:
  1. ErrorBoundary + fallback на lesson islands.
  2. skip-link + landmarks.
  3. Проверка radix dialog focus-trap/keyboard.
- Concepts: graceful degradation, WCAG AA.

### M3. Quality gates + observability (dep M1-M2)

- Goal: CI доказывает качество, prod наблюдаем.
- Problem: coverage thresholds и частота e2e не подтверждены, только homegrown D1 logstore, скрипт-спрол `fix-mdx-*` около 60 аудитов.
- Tasks:
  1. Зафиксировать coverage thresholds, e2e в gate или nightly.
  2. Sentry/OTel или док retention/alerts/dashboard для D1.
  3. Консолидировать one-off скрипты, обновить stale docs HANDOFF/CONTINUE-PROMPT.
- Concepts: CI-as-contract, SLO.

### M4. Employability packaging (dep M1-M3)

- Goal: рекрутер проверяет за 10 минут.
- Problem: глубина закопана, нет OpenAPI, нет ADRs, Prisma только контент.
- Tasks:
  1. README demo path + refresh arch diagram.
  2. OpenAPI или route table.
  3. 2-3 ADR: D1 vs Supabase, batch vs transactions, hand-rolled vs zod.
  4. CV mapping без инфляции титулов.
- Concepts: docs as interface.

## Validation Plan

- M1: `bunx astro check`, functions vitest, ручная матрица 401/403/422. Evidence: зеленый лог + тест пагинации.
- M2: Playwright a11y spec + keyboard walkthrough. Evidence: spec pass + скриншот fallback.
- M3: failing-canary прогон блокирует gate, dashboard/alert скрин. Evidence: красный билд + алерт.
- M4: timed walkthrough внешним человеком 10 мин. Evidence: заметка ревьюера.

Highest-risk validation: M3 gate/observability, так как retention/alerts сейчас unknown.

## Risks / Open Questions

- R2 models serving и entitlements read path не проверены вглубь.
- Coverage % и частота e2e в CI не подтверждены, нужен доступ к CI логам.
- D1 retention/dashboards/alerting не найдены в репо.
- Нет CV/target roles/constraints, builder-depth нельзя подавать как employer title.
- Non-goal: новые фичи атласа, смена стека, ORM ради галочки.
