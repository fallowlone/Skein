# План: доращивание тонких треков до zero→senior+ курсов

**Дата:** 2026-06-10 (ревизия в тот же день: планка поднята с middle до senior+) ·
**Статус:** утверждён к исполнению, волны запускаются по одной за сессию.
**Треки:** logic, react, nextjs, go, python (все <10 уроков — заготовки, не учебные пути).

## Планка

Калибровка по полным трекам репо: sql-postgres 47 уроков, node 40+ (с Mastery Lab),
nest 38. «~27 уроков на трек» — это middle-покрытие, НЕ senior+. И уроки — только
половина senior+: вторая половина — слой применения (scenario-практика
incident/debug/review на каждом юните, capstone-проект на трек, drill), без которого
читатель — начитанный middle. План закрывает обе половины.

## Текущее состояние → цель

| Трек | Сейчас | Цель (уроки) | Capstone | Прим. |
|------|--------|--------------|----------|-------|
| react | 2 юнита / 6 | 14 юнитов / ~50 | да | полный zero→senior+ |
| go | 2 / 6 | 13 / ~45 | да | полный zero→senior+ |
| python | 3 / 9 | 12 / ~42 | да | полный zero→senior+ |
| nextjs | 2 / 6 | 10 / ~35 | да | уже: опирается на react-трек (prereqs) |
| logic | 2 / 6 | 6 / ~21 | нет | мост к алгоритмам, senior+ не его мерка |

Итого: **+38 юнитов, ~165 уроков EN+RU (~330 MDX) + ~165 practice JSON + 4 capstone
+ scenario-слой (incident/debug/review) на каждый юнит.**

## Состав юнитов

**logic** (foundations, zero-уровень, мост к algorithms):
- 03-sets-and-relations — множества, отношения, эквивалентность; типы и коллекции как множества.
- 04-proof-techniques — прямое, от противного, контрапозиция, контрпример; «докажи, что код корректен».
- 05-recursion-and-recurrences — рекурсивные определения, разворачивание рекуррент; связь с индукцией из 02.
- 06-combinatorial-reasoning — счёт, принцип Дирихле, инварианты в задачах; финальный практикум.

**react** (surface, zero→senior+):
- 03-data-fetching — запросы в эффектах vs Suspense vs библиотеки (TanStack Query), кеш-инвалидация, гонки.
- 04-forms-and-mutations — управляемые/неуправляемые, useActionState, optimistic UI.
- 05-performance — Profiler, transitions, виртуализация, code-splitting; когда мемоизация вредна (спираль из 02).
- 06-state-architecture — подъём/колокация состояния, внешние сторы (zustand/use-sync-external-store), серверное vs клиентское состояние.
- 07-testing — RTL, user-event, msw; тестирование хуков и асинхронности.
- 08-concurrent-react — Suspense-границы, useDeferredValue, streaming SSR; React Compiler честно.
- 09-error-handling — error boundaries, восстановление, частичная деградация UI, retry-паттерны.
- 10-accessibility — семантика, фокус-менеджмент, ARIA в композитных виджетах, тестирование a11y.
- 11-react-server-components — RSC вне Next.js: модель, сериализация, границы (фундамент для nextjs-трека).
- 12-design-systems — композиция компонентов, polymorphic/asChild, headless-паттерны, токены.
- 13-animations-and-interaction — FLIP, View Transitions, жесты; перф-бюджеты анимаций.
- 14-production-react — миграции версий, профилирование в проде, RUM, инцидент-разборы React-регрессий.

**nextjs** (surface, zero→senior+; mathPrereqs-аналог: prereqs на react-концепты):
- 03-route-handlers-and-middleware — API-маршруты, middleware на edge, ограничения runtime.
- 04-auth-patterns — сессии vs JWT в App Router, server-only секреты, CSRF-скоуп экшенов (спираль из 02).
- 05-assets-and-images — next/image, шрифты, бандл-анализ, INP/LCP бюджеты.
- 06-deployment-and-edge — self-host vs Vercel, edge vs node runtime, ISR на проде, CDN-слои.
- 07-observability-and-errors — error.tsx иерархия, instrumentation hook, логирование RSC.
- 08-architecture-at-scale — monorepo, route groups как модули, миграция pages→app.
- 09-data-layer — ORM или прямой SQL в RSC, connection pooling на serverless, кеш-теги по доменам.
- 10-production-nextjs — инцидент-разборы (cache poisoning, ISR-штормы, cold starts), cost-инжиниринг.

**go** (surface, zero→senior+):
- 03-http-services — net/http 1.22+, мидлвары, таймауты (полный набор), graceful shutdown.
- 04-testing-and-tooling — table tests, fuzzing, benchmarks, go vet/staticcheck, модули.
- 05-generics-and-design — дженерики честно (когда нет), композиция, ошибки дизайна пакетов.
- 06-runtime-and-performance — GC (мифы и ручки), escape analysis, pprof end-to-end.
- 07-production-patterns — context-дисциплина, конфигурация, структурное логирование slog, ретраи.
- 08-data-access — database/sql, пулы, транзакции, sqlc/обёртки; интеграция с sql-postgres треком.
- 09-grpc-and-apis — gRPC/protobuf, версионирование контрактов, gateway-паттерны.
- 10-advanced-concurrency — errgroup, пайплайны под отмену, семафоры, backpressure; разборы реальных дедлоков.
- 11-security-and-supply-chain — crypto-stdlib правильно, govulncheck, минимальные образы.
- 12-deployment-and-ops — статическая линковка, контейнеры, healthchecks, конфиг 12-factor.
- 13-systems-projects — CLI-инструменты, демоны, интеграция с ОС; финальные senior-разборы.

**python** (surface, zero→senior+; есть 00/01/02):
- 03-data-model — dunder-протоколы, дескрипторы, slots; «всё объект» по-настоящему.
- 04-typing-and-tooling — type hints как система, mypy/pyright, ruff, uv.
- 05-concurrency — GIL честно, threading vs multiprocessing vs asyncio, free-threaded 3.13.
- 06-web-services — FastAPI/ASGI, pydantic, жизненный цикл запроса.
- 07-testing — pytest идиомы, fixtures, property-based (hypothesis).
- 08-performance — профилирование (cProfile/py-spy), память, C-расширения честно, когда Python не тот инструмент.
- 09-data-work — pandas/polars прагматично, файловые форматы, пайплайны (мост к data-engineering).
- 10-packaging-and-distribution — модули/пакеты глубоко, entry points, публикация, lock-файлы.
- 11-async-deep — event loop изнутри, structured concurrency (TaskGroup), отмена, таймауты.
- 12-production-python — логирование, конфиги, контейнеризация, инцидент-разборы (утечки, зависшие воркеры).

## Технология авторинга (по вчерашнему отработанному циклу)

1. **Регистрация партии** (контроллер, не сабагенты): units.json + concepts.json (id с префиксом трека — голые имена коллидируют) + unit-concepts.json (+requires на юниты 01/02) + **bump `path-io.test.ts` unit count** (282 → новое число). mastery-field уже покрывает все 5 треков.
2. **Авторинг**: 1 сабагент = 1 юнит (3-4 урока EN+RU + practice). Бриф — вчерашний, с двумя добавками в HARD RULES: **Crux ≤140 символов в обоих языках** (линт страницы) и **в bilingual-полях practice en≠ru** (код-сценарию добавлять RU-комментарий). Эталон: `lessons/en/aws/05-observability/03-slos-and-alerting/index.mdx`.
3. **Гейты партии**: contamination-скан → структурный python-валидатор (frontmatter/practice) → полный build (lint 0/0) → коммит → push.
4. **Спираль**: новые юниты ссылаются на концепты юнитов 01-02 через `requires` — порядок в roadmap выстраивается сам.

## Senior-слой (вторая половина senior+, не опциональная)

- **Scenario-практика**: на каждый юнит — минимум по 1 задаче типов incident, debug,
  review (поверх базовых predict/diagnose/design). Инструмент контроля уже есть:
  `bun run audit:scenario --gate`.
- **Capstone** на react, go, python, nextjs — по образцу url-shortener-at-scale
  (guided project с milestone-чеклистом): например, react → design-system-from-scratch,
  go → rate-limited-api-gateway, python → data-pipeline-with-sla, nextjs → e-commerce-with-isr.
- **Drill-блоки** там, где есть тренируемая механика (go-concurrency, react-rendering).
- **Финальный гейт качества**: LLM-grade depth-audit (`--gate`) по новым трекам —
  инструмент из senior-кампании.

## Волны (по одной за сессию, чтобы билд-гейт оставался управляемым)

- **Волна 1:** react 03-06 + nextjs 03-05 (7 юнитов, ~25 уроков) — самые востребованные треки.
- **Волна 2:** go 03-06 + python 03-05 (7 юнитов, ~25 уроков).
- **Волна 3:** react 07-10 + nextjs 06-08 (7 юнитов, ~25 уроков).
- **Волна 4:** go 07-10 + python 06-08 (7 юнитов, ~24 урока).
- **Волна 5:** react 11-14 + nextjs 09-10 + logic 03-04 (8 юнитов, ~27 уроков).
- **Волна 6:** go 11-13 + python 09-12 + logic 05-06 (9 юнитов, ~30 уроков).
- **Волна 7 (senior-слой):** scenario-задачи на все новые юниты (audit:scenario --gate 0)
  + 4 capstone + drill-блоки.
- **Волна 8 (гейты навсегда):** все 5 треков в `PRACTICE_REQUIRED_TRACKS`; depth-audit
  --gate по новым трекам; обновить blurb'ы tracks.json под полные курсы.

После волны 8: react ~50, go ~45, python ~42, nextjs ~35, logic ~21 уроков —
каждый с практикой, scenario-слоем и (кроме logic) capstone. Это и есть zero→senior+.

## Ревизия 2 (2026-06-10, вечер): волны 9–13

Основание: depth-аудит (docs/audit/depth-report.md) — 6 юнитов ниже бара 3.5,
typescript слабейший spine-трек (mean 3.61); ci-cd тонкий (26 уроков); запрос
владельца: курсы Docker и GitHub Actions; Projects hub = 14 брифов-идей, guided
путь только у одного (url-shortener-at-scale).

**Волна 9 — ремонт существующего (без новых треков):**
- Ре-авторинг 3 typescript-юнитов ниже бара: `01-foundations` (3.03),
  `04-type-system-deep` (3.10), `03-generics` (3.41) — это сердце «deep-dive»
  трека, провал именно в conditional types и дженериках.
- Ре-авторинг 3 вводных юнитов хороших треков: `aws/01-core-model` (3.27),
  `sql-postgres/03-aggregation` (3.30), `backend/02-middleware-di` (3.36) —
  читатель встречает слабейший материал первым.
- 2 niche-юнита, отмеченных аудитом: `base-cs/concurrency-theory` (потоки/процессы,
  memory ordering, lock-free — единая теория под go/node/distributed) и
  `engineering-practice/debugger-mastery` (breakpoints/watchpoints, core dumps,
  отладка в проде).
- Гейт: depth-audit --gate по всем 8 юнитам ≥3.5.

**Волны 10–11 — новый трек `docker` (advanced band, ~10 юнитов / ~35 уроков):**
deployment-трек покрывает docker применительно к деплою; этот трек — контейнеры
как система. 01-images-and-layers (контент-адресация, OCI), 02-runtime-internals
(namespaces, cgroups, seccomp), 03-networking, 04-storage-and-volumes,
05-buildkit-and-cache (multi-stage, cache mounts), 06-compose-and-local-dev,
07-security (rootless, scanning, secrets), 08-registries-and-distribution,
09-debugging-containers, 10-production-patterns (+ capstone: own-mini-paas).
Регистрация трека — стандартные 7 мест + bump path-io.test.

**Волна 12 — курс GitHub Actions внутри ci-cd (+5 юнитов / ~17 уроков, ci-cd → ~43):**
отдельный трек не нужен — ci-cd уже стоит на GHA; добиваем его до полного курса:
09-workflows-deep (events, contexts, expressions), 10-actions-authoring
(composite/JS/docker actions), 11-security-and-oidc (GITHUB_TOKEN scopes, OIDC
в облака, injection-атаки — спираль с нашим же deploy.yml), 12-runners-and-scale
(self-hosted, ARC, кеш-стратегии), 13-release-engineering (versioning, changelog,
deployment environments/gates). Capstone: пайплайн этого самого репозитория как
разбираемый кейс.

**Волна 13 — практика для Projects hub:**
14 брифов — идеи без сопровождения; guided путь только у url-shortener.
Преобразовать 6 топ-брифов в guided capstone paths по его образцу: milestone-чеклист,
acceptance-критерии на milestone, hint-лестницы, «что проверит ревьюер» на финале.
По одному из каждой категории + связка с треками (react/go/python capstones из
волны 7 переиспользуют этот же формат). Остальные брифы получают хотя бы
acceptance-критерии.

После волны 13: 0 юнитов ниже depth-бара, docker и GHA — полные курсы,
7 guided-проектов. Только тогда кампания закрыта.

## Риски

- **Билд-тайм:** +~190 страниц на волну — в пределах текущих 12-13 мин; инкрементальный кеш в CI смягчает.
- **Качество RU:** сабагентам явно требовать native-качество, не кальку (вчерашняя партия прошла).
- **Дрейф концептов:** только префиксованные id; перед регистрацией — проверка коллизий по concepts.json (вчера «truth-table» уже был занят).
