# Practice expansion roadmap: cross-topic + junior depth

Status: proposed for review. No content changes yet. Step 3 starts only after explicit "ok".

Evidence base: commit `746e411fd`, measured 2026-10-17. All counts are computed from the repo, not estimated.

Commands used:

- `jq -r '.[].slug' site/src/content/tracks.json`
- `jq -r '.[].track' site/src/content/units.json | sort | uniq -c`
- `find site/src/content/lessons/en -name index.mdx | wc -l` (= 2264; RU also 2264)
- `find site/src/content/practice -type f | wc -l` (= 1541 files)
- per-track task counts via `jq -s '[.[].tasks|length]|add'` over `site/src/content/practice/<track>/*/*.json` (total 8242 tasks)
- `jq -r '.tracks | join(",")' site/src/content/projects/*.json` (54 projects)
- `cd site && bun run audit:depth` -> `bar=3.5 spine-failing=6/215 foundations=34 -> docs/audit/`
- `cd site && bun run audit:practice-coverage` -> teaching ready EN 1523, with practice 1523, THIN 0
- `cd site && bun run verify:task-concepts` -> 8225/8242 annotated (99.8%), no errors
- `grep -rh '^level:' site/src/content/lessons/en --include=index.mdx | sort | uniq -c`
- parity spot-check via `wc -w` on 5 EN/RU lesson pairs (both files exist, RU 85-92% of EN words)

## Step 0. Operational definitions (locked for all counts below)

- Cross-topic project: `site/src/content/projects/<slug>.json` with `tracks.length >= 2`. Corroboration (not the gate): `milestones[].feedsFrom[]` lessonKeys spanning >= 2 tracks. Example: `lru-cache` tracks `backend+caching`, feedsFrom spans `algorithms/caching/observability/performance`.
- Cross-topic practice set (target definition for new work): one practice JSON whose tasks declare `concepts` covering >= 2 units (teaches of the home unit + prereqs from another unit/track), with the binding stated explicitly in the task prompt/reveal (which two topics, why the link matters). Schema stays single `track`+`lessonKey`; no schema change is needed or allowed in this roadmap.
- Non-example (not cross-topic): a practice file whose tasks only use home-unit teaches concepts; a project with `tracks.length == 1`; a project tagged with 2 tracks but all `feedsFrom` from one track.
- Junior gap: (a) spine unit below depth bar 3.5 whose lessons carry `level: junior`/`zero`, or (b) track with 0 `level: junior` lessons where the audience needs an entry path, or (c) foundations unit (math/algorithms/base-cs, no `level` field by design) with depth score far below bar AND weak junior-accessible practice ladder.

## Step 1. Audit findings

### 1.1 Totals

- Lessons: 2264 EN + 2264 RU `index.mdx` (parity of file count holds).
- Practice: 1541 JSON files, 8242 tasks total.
- Task types: diagnose 2015, predict 1752, design 1261, incident 1035, review 842, sandbox 622, fix 559, debug 156.
- Projects: 54 definitions + 54 workbenches. By `tracks.length`: 52 cross-topic (23x2, 17x3, 7x4, 3x5, 1x8, 1x11), 2 single-track (`architecture-patterns-platform`, `managed-service-unit: linux`).
- Practice structurally cross-topic today: 0/1541 files multi-track (schema enforces one `track`+`lessonKey`). Cross-topic signal exists only via `concepts` (prereqs from other units); no aggregate counter exists yet — new cross-topic practice must declare its two-topic binding explicitly per the Step 0 definition.
- Practice coverage: 1523 teaching ready EN lessons, all with practice, THIN (<4 tasks or missing recall/apply/stretch tier) = 0. Quantity is not the gap; depth and cross-linking are.
- Task concepts: 8225/8242 annotated, `verify:task-concepts` no errors.

### 1.2 Depth (bun run audit:depth, bar 3.5)

Spine FAIL (6/215, gated): `typescript/01-foundations` 3.03, `typescript/04-type-system-deep` 3.10, `aws/01-core-model` 3.27, `sql-postgres/03-aggregation` 3.30, `backend/02-middleware-di` 3.36, `typescript/03-generics` 3.41.

Foundations (not gated, beginner tracks by design): 30/34 below 3.5. Lowest: `math/07-logic` 1.96, `math/01-numbers` 2.00, `math/10-probability` 2.03, `math/03-fractions` 2.09, `math/04-powers` 2.13; `base-cs` 2.25-3.05 across 10 units; `algorithms/07-trees` 2.81 up to `algorithms/05-hashing` 3.44, with 4 algorithms units passing (recursion 3.57, graphs 3.72, greedy 3.94, DP 4.11). These scores measure against the senior bar, so low numbers are partly by design — the junior question for foundations is entry clarity + practice ladder, not senior depth.

### 1.3 Junior levels (frontmatter `level:`)

EN totals: senior 1210, middle 671, junior 180, zero 42. Tracks with junior=0 AND zero=0 (no entry path in frontmatter terms): `algorithms`, `base-cs`, `math` (foundations carry no `level` field at all — verified on `math/01-numbers/01-counting` and `algorithms/01-thinking-complexity/01-what-is-an-algorithm`), plus `architecture-patterns`, `code-patterns`, `docker`, `go`, `nextjs`, `react`, `react-patterns`, `system-design`, `system-design-cases`, `security-cloud`, `security-defensive`, `security-offensive`. Tracks with thinnest junior presence: `aws` 1, `ci-cd` 1, `nest` 1, `node` 1, `python` 1, `security-foundations` 1, `sql-postgres` 2, `js-engine` 3.

### 1.4 Parity/budget spot-check (5 lesson pairs)

Both EN+RU files exist for all 5 sampled pairs; RU word count 85-92% of EN (networking handshake 1442/1247, ts inference 2401/2192, math counting 860/788, algo what-is 1496/1306, backend middleware 1978/1830). Sampled practice JSON has EN+RU titles on all tasks. Full-budget truth remains `bun run build` + `dist/lint-report.json` (rules in `site/src/lint/rules/`: `text-budgets`, `i18n-parity`, `hydration-budget`, `practice`, `lessons`, etc.) — not re-run in this audit; it gates every phase below.

### 1.5 Verdict table (per track)

Legend: tasks = counted practice tasks; X-topic practice = 0 multi-track files by schema (binding via concepts only); junior = `level: junior` lesson count; verdict = what this roadmap proposes.

| Track | Practice files / tasks | X-topic now | Junior (zero) | Verdict |
|---|---|---|---|---|
| typescript | 41 / 252 | 0 multi-track | 8 (0) | Расширить уроки: 3 FAIL-юнита (01/03/04) — блокер фазы 1 |
| aws | 31 / 166 | 0 multi-track | 1 (0) | Расширить уроки: 01-core-model FAIL — фаза 1 |
| sql-postgres | 46 / 327 | 0 multi-track | 2 (0) | Расширить уроки: 03-aggregation FAIL — фаза 1 |
| backend | 48 / 257 | 0 multi-track | 8 (1) | Расширить уроки: 02-middleware-di FAIL — фаза 1 |
| math | 33 / 146 | 0 multi-track | no level field | Добавить кросс-практику + junior-лестницу (10 юнитов ниже бара; sen-бар неприменим) — фаза 2 |
| base-cs | 52 / 243 | 0 multi-track | no level field | То же: пропуски входа (abstraction/control-flow/computer/memory) — фаза 2 |
| algorithms | 69 / 325 | 0 multi-track | no level field | Точечно: trees/thinking-complexity/arrays ниже бара; DP/graphs/greedy/recursion PASS — фаза 2, малый объём |
| networking | 76 / 390 | 0 multi-track | 13 (1) | Хватает по глубине; кандидат под кросс-проект — фаза 3/4 |
| observability | 54 / 284 | 0 multi-track | 8 (1) | Хватает; кросс-связки (RED/USE, tracing) — фаза 3 |
| databases | 54 / 300 | 0 multi-track | 9 (1) | Хватает; кросс с sql-postgres/queues — фаза 3 |
| caching | 13 / 68 | 0 multi-track | 8 (1) | Мало заданий (13 файлов), но глубина PASS; добавить кросс-практику — фаза 3 |
| queues | 13 / 66 | 0 multi-track | 8 (1) | Мало заданий; кросс с backend/distributed — фаза 3 |
| apis | 13 / 65 | 0 multi-track | 8 (1) | Мало заданий; кросс с backend/security — фаза 3 |
| distributed | 13 / 67 | 0 multi-track | 8 (1) | Мало заданий; кросс с backend/queues — фаза 3 |
| frontend | 13 / 65 | 0 multi-track | 8 (1) | Мало заданий; кросс с react/browser — фаза 3 |
| data-engineering | 8 / 40 | 0 multi-track | 8 (1) | Меньше всего заданий наряду с ai-llm; расширить — фаза 3 |
| ai-llm | 8 / 40 | 0 multi-track | 8 (1) | Меньше всего заданий; расширить после фаз 1-2 — фаза 3 |
| deployment | 15 / 75 | 0 multi-track | 6 (1) | Мало заданий; кросс с docker/ci-cd — фаза 3/4 |
| security (+foundations/defensive/offensive/cloud) | 13+23+18+22+18 files | 0 multi-track | 8+1+0+0+0 | Разрознено по 5 трекам; кросс-проект уже есть (ctf-lab, hardening), практику связать — фаза 3 |
| node/nest/js-engine | 53+38+41 files | 0 multi-track | 1+1+3 | Глубина PASS; junior-тонко (node/nest по 1); кросс-проект — фаза 4 |
| go/python/cli/git/linux | 45+45+36+45+46 files | 0 multi-track | 0+1+10+7+11 | Хватает; go без junior — кандидат позднее, не фаза 1 |
| react/react-patterns/code-patterns/architecture-patterns | 51+46+50+36 files | 0 multi-track | 0 во всех | Нет junior-уровней вообще — осознанный кандидат, но НЕ фаза 1 (нужно решение об entry path) |
| system-design/cases | 34+22 files | 0 multi-track | 0 | Senior по дизайну; не junior-скоуп |
| performance/browser | 52+50 files | 0 multi-track | 9+8 | Глубина PASS; естественные кросс-хабы — фаза 3 |
| Projects (global) | 54 | 52 multi-track | n/a | Хватает по связности; 2 single-track + junior-вход — фаза 4 |

## Step 2. Roadmap phases

### Фаза 1. Junior-блокеры глубины (первый приоритет)

- Units: `typescript/01-foundations`, `typescript/03-generics`, `typescript/04-type-system-deep`, `sql-postgres/03-aggregation`, `backend/02-middleware-di`, `aws/01-core-model`.
- Work: углубить/teach-усилить провальные teaching-уроки (механизм, tradeoffs, failure modes, числа — по curriculum.md), плюс по 1 кросс-заданию на юнит внутри существующей схемы (binding ≥2 юнита через concepts+prereqs, грейдинг с pass/fail примером). Нового: ~6-12 practice-тасков, 0 проектов.
- Done when: `audit:depth --gate --units <эти 6>` PASS at bar 3.5 (после перегрейда), `bun run build` lint errors 0, EN/RU паритет попарно, `verify:task-concepts` no errors. Per-unit batches: один юнит = один батч (EN+RU сразу).

### Фаза 2. Foundations junior-лестница (math / base-cs / algorithms)

- Units (по глубине + входной роли): `math/01-numbers`, `math/03-fractions`, `math/07-logic`, `base-cs/01-what-a-computer-is`, `base-cs/02-memory`, `base-cs/07-control-flow`, `base-cs/10-abstraction`, `algorithms/01-thinking-complexity`, `algorithms/02-arrays-strings`, `algorithms/07-trees`.
- Work: НЕ дотягивать до senior-бара (он неприменим к /teach); цель — ясность входа + полная лестница recall/apply/stretch + 1-2 кросс-задания на юнит (math↔algorithms, base-cs↔algorithms: счёт↔сложность, память↔хеши/списки, control-flow↔инварианты). Нового: ~10-20 тасков, 0 проектов.
- Done when: юниты выведены из хвоста foundations-распределения (цель ≥3.0 на перегрейде ИЛИ зафиксированное решение "senior-бар неприменим, принято ревью"), THIN 0 сохраняется, build lint 0/0, EN/RU паритет.

### Фаза 3. Кросс-топик практика (второй приоритет после блокеров)

- Tracks (мало заданий + естественные связки): `caching`, `queues`, `apis`, `distributed`, `frontend`, `data-engineering` (8 файлов), `ai-llm` (8 файлов), `deployment`, плюс связки `databases↔sql-postgres`, `observability↔performance`, `security-*` между собой.
- Work: новые practice-наборы строго по Step 0 (каждый: какие ≥2 темы, тип задания, грейдинг-критерий с pass/fail). Структурное ограничение (выяснено в Фазе 3): новые файлы под тем же `lessonKey` невозможны — `lint-src` держит один practice-файл на урок (`practiceByKey`), а правило 3–8 требует ровно этот файл. Поэтому ориентир: +1–3 задания в СУЩЕСТВУЮЩИЕ файлы (5→6–8) на каждый трек первой очереди, типы добирать дефицитные (debug 156 и fix 559 — самые редкие глобально). Факт Фазы 3: 8 треков + 3 связки, +19 заданий (6 debug, 13 fix), все файлы 5→6.
- Done when: каждый новый набор имеет явную ≥2-темную привязку, `verify:task-concepts` чист, THIN 0, build lint 0/0, EN/RU паритет.

### Фаза 4. Кросс-проекты junior-входа (последними)

- Work: 2-4 новых проекта junior/intermediate с `tracks.length >= 2` + `feedsFrom` из ≥2 треков + workbench (scaffold падает, solution проходит). Первые кандидаты: single-track пробелы (`architecture-patterns-platform`, `managed-service-unit: linux`) и junior-мосты (typescript↔node, sql-postgres↔backend, aws↔deployment).
- Done when: `projects-schema` тесты зелёные, `bun run verify:projects` зелёный (scaffold fail / solution pass для каждого нового), build lint 0/0, EN/RU паритет.

### Non-scope (явно НЕ делаем в этой волне)

- Не переписывать middle/senior-уроки вне 6 FAIL-юнитов фазы 1.
- Не менять схемы practice/projects (`practice-schema`, `projects-schema`, `content.config`) без отдельной задачи.
- Не вводить `level: junior` во foundations и не переопределять senior-бар для /teach без отдельного решения.
- Не чинить unrelated-контент по пути (кандидаты — ниже).

### Кандидаты вне скоупа (замечено, не трогать)

- `react/react-patterns/code-patterns/architecture-patterns`: 0 junior-уроков при 179 practice-файлах — нужно продуктовое решение про entry path, не контентный батч.
- `go`: 0 junior при 45 practice-файлах — то же.
- `system-design(-cases)`: senior по дизайну; кросс-связность уже высокая.
- Грязное дерево ветки `roadmap/m1-backend-hardening` (deploy.yml, README, functions/api/*) — не относится к curriculum-волне, не трогать.

## Gates для каждого батча шага 3 (когда будет "ок")

1. Один юнит = один батч, EN+RU сразу.
2. `bun run build` → lint errors 0 (источник truth: `site/dist/lint-report.json`).
3. `bun run verify:task-concepts` чист; при касании workbench — `bun run verify:projects` (scaffold fail / solution pass); при касании схем — соответствующие `vitest run` файлы.
4. Отчёт батча: добавленные пути, команды + результаты, остаток.
