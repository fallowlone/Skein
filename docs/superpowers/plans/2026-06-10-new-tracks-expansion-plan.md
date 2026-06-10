# План: доращивание тонких треков до полных курсов

**Дата:** 2026-06-10 · **Статус:** утверждён к исполнению, волны запускаются по одной за сессию.
**Треки:** logic, react, nextjs, go, python (все <10 уроков — заготовки, не учебные пути).

## Текущее состояние → цель

| Трек | Сейчас | Цель | Добавить |
|------|--------|------|----------|
| logic | 2 юнита / 6 уроков | 6 юнитов / ~21 | +4 юнита / ~15 уроков |
| react | 2 / 6 | 8 / ~27 | +6 / ~21 |
| nextjs | 2 / 6 | 8 / ~26 | +6 / ~20 |
| go | 2 / 6 | 8 / ~27 | +6 / ~21 |
| python | 3 / 9 | 8 / ~27 | +5 / ~18 |

Итого: **+27 юнитов, ~95 уроков EN+RU (~190 MDX) + ~95 practice JSON.** Ориентир глубины — треки nest (10/38) и aws (9/31).

## Состав юнитов

**logic** (foundations, zero-уровень, мост к algorithms):
- 03-sets-and-relations — множества, отношения, эквивалентность; типы и коллекции как множества.
- 04-proof-techniques — прямое, от противного, контрапозиция, контрпример; «докажи, что код корректен».
- 05-recursion-and-recurrences — рекурсивные определения, разворачивание рекуррент; связь с индукцией из 02.
- 06-combinatorial-reasoning — счёт, принцип Дирихле, инварианты в задачах; финальный практикум.

**react** (surface, middle/senior):
- 03-data-fetching — запросы в эффектах vs Suspense vs библиотеки (TanStack Query), кеш-инвалидация, гонки.
- 04-forms-and-mutations — управляемые/неуправляемые, useActionState, optimistic UI.
- 05-performance — Profiler, transitions, виртуализация, code-splitting; когда мемоизация вредна (спираль из 02).
- 06-state-architecture — подъём/колокация состояния, внешние сторы (zustand/use-sync-external-store), серверное vs клиентское состояние.
- 07-testing — RTL, user-event, msw; тестирование хуков и асинхронности.
- 08-concurrent-react — Suspense-границы, useDeferredValue, streaming SSR; React Compiler честно.

**nextjs** (surface, middle/senior):
- 03-route-handlers-and-middleware — API-маршруты, middleware на edge, ограничения runtime.
- 04-auth-patterns — сессии vs JWT в App Router, server-only секреты, CSRF-скоуп экшенов (спираль из 02).
- 05-assets-and-images — next/image, шрифты, бандл-анализ, INP/LCP бюджеты.
- 06-deployment-and-edge — self-host vs Vercel, edge vs node runtime, ISR на проде, CDN-слои.
- 07-observability-and-errors — error.tsx иерархия, instrumentation hook, логирование RSC.
- 08-architecture-at-scale — monorepo, route groups как модули, миграция pages→app.

**go** (surface, middle/senior):
- 03-http-services — net/http 1.22+, мидлвары, таймауты (полный набор), graceful shutdown.
- 04-testing-and-tooling — table tests, fuzzing, benchmarks, go vet/staticcheck, модули.
- 05-generics-and-design — дженерики честно (когда нет), композиция, ошибки дизайна пакетов.
- 06-runtime-and-performance — GC (мифы и ручки), escape analysis, pprof end-to-end.
- 07-production-patterns — context-дисциплина, конфигурация, структурное логирование slog, ретраи.
- 08-data-access — database/sql, пулы, транзакции, sqlc/обёртки; интеграция с sql-postgres треком.

**python** (surface, middle/senior; есть 00/01/02):
- 03-data-model — dunder-протоколы, дескрипторы, slots; «всё объект» по-настоящему.
- 04-typing-and-tooling — type hints как система, mypy/pyright, ruff, uv.
- 05-concurrency — GIL честно, threading vs multiprocessing vs asyncio, free-threaded 3.13.
- 06-web-services — FastAPI/ASGI, pydantic, жизненный цикл запроса.
- 07-testing — pytest идиомы, fixtures, property-based (hypothesis).

## Технология авторинга (по вчерашнему отработанному циклу)

1. **Регистрация партии** (контроллер, не сабагенты): units.json + concepts.json (id с префиксом трека — голые имена коллидируют) + unit-concepts.json (+requires на юниты 01/02) + **bump `path-io.test.ts` unit count** (282 → новое число). mastery-field уже покрывает все 5 треков.
2. **Авторинг**: 1 сабагент = 1 юнит (3-4 урока EN+RU + practice). Бриф — вчерашний, с двумя добавками в HARD RULES: **Crux ≤140 символов в обоих языках** (линт страницы) и **в bilingual-полях practice en≠ru** (код-сценарию добавлять RU-комментарий). Эталон: `lessons/en/aws/05-observability/03-slos-and-alerting/index.mdx`.
3. **Гейты партии**: contamination-скан → структурный python-валидатор (frontmatter/practice) → полный build (lint 0/0) → коммит → push.
4. **Спираль**: новые юниты ссылаются на концепты юнитов 01-02 через `requires` — порядок в roadmap выстраивается сам.

## Волны (по одной за сессию, чтобы билд-гейт оставался управляемым)

- **Волна 1:** react 03-05 + nextjs 03-05 (6 юнитов, ~21 урок) — самые востребованные треки.
- **Волна 2:** go 03-05 + python 03-05 (6 юнитов, ~20 уроков).
- **Волна 3:** react 06-08 + nextjs 06-08 (6 юнитов, ~20 уроков).
- **Волна 4:** go 06-08 + logic 03-06 (7 юнитов, ~24 урока).
- **Волна 5 (добивка):** python 06-07 + ревизия: добавить все 5 треков в `PRACTICE_REQUIRED_TRACKS`, когда покрытие полное; обновить blurb'ы в tracks.json при необходимости.

После волны 5 ни один трек не остаётся <20 уроков, и practice-гейт включается навсегда.

## Риски

- **Билд-тайм:** +~190 страниц на волну — в пределах текущих 12-13 мин; инкрементальный кеш в CI смягчает.
- **Качество RU:** сабагентам явно требовать native-качество, не кальку (вчерашняя партия прошла).
- **Дрейф концептов:** только префиксованные id; перед регистрацией — проверка коллизий по concepts.json (вчера «truth-table» уже был занят).
