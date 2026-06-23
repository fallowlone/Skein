# Architecture Patterns Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a new bilingual (EN+RU) topic track `architecture-patterns` — 12 units / 36 lessons + practice + one capstone project — that teaches how to structure an application and let that structure evolve (coupling/cohesion → dependency direction → layering → hexagonal/clean → DDD → CQRS → event sourcing → event-driven → decomposition → evolution).

**Architecture:** A new tracks-model topic track registered through six coupled seams, then authored unit-by-unit. Task 0 is a vertical slice (all TS seams + unit 00) to validate wiring; Tasks 1–11 add one unit each via the standard Per-Unit Protocol; Task 12 adds the capstone project and runs the single final gate. Each lesson is a linear MDX file in the **topic** skeleton (Hook→Crux→Explanation→KeyTakeaway→Quiz→RetrievalDrawer→Recap) with ≥1 `FlowDiagram`, mirrored EN+RU, plus one practice JSON.

**Tech Stack:** Astro 5, Preact, Tailwind, MDX, Zod content collections, bun. Source of truth: `docs/superpowers/specs/2026-06-22-architecture-patterns-track-design.md`.

## Global Constraints

Every task implicitly includes all of these (copied from the spec; do not re-derive):

- **Depth bar:** middle+/senior fullstack engineer. If a draft reads like a pattern-reference catalog ("Hexagonal architecture is a pattern where…"), it is too shallow. Lead with forces, failure modes, and tradeoffs — war stories, not definitions.
- **Distinctness (hard):** structure, not scale or ops. Do NOT re-teach `system-design` (load/availability), `backend` (request internals), or `engineering-practice` (team process). Where a topic overlaps (event-driven, CQRS, eventual consistency), frame it **structurally** (how modules are shaped and depend on each other) and cross-link the sibling track in prose.
- **Recurring example:** a B2B order/billing platform reappears across units (same domain, restructured each time). Reuse it where natural; do not force it into every lesson.
- **Bilingual or refuse:** every lesson exists under BOTH `src/content/lessons/en/architecture-patterns/...` and `.../ru/architecture-patterns/...`. Quiz `id` identical across langs. Practice `pieceSlug`/`lessonKey` identical across langs.
- **Frontmatter keys (exact set for topic lessons):** `slug`, `lang`, `track: "architecture-patterns"`, `unit: "<NN-slug>"`, `order` (= lesson number), `title`, `summary` (≤280 chars EN and RU; do not over-trim), `estMin`, `status: ready`, `lessonType: topic`, `level` (`middle` for tier-1 units 00–05, `senior` for tier-2 units 06–11), `concepts` (4–6 kebab slugs), `prereqs: []`, `sources` (≥3 real authoritative URLs). **No `mathPrereqs`** (that is a foundations-track key — topic lessons omit it; see template `system-design/01-scalability/01-latency-vs-throughput`).
- **Body skeleton (topic):** `<Hook>` (a concrete failure/decision story) → `<Crux>` (≤140 chars, one sentence) → `<Explanation>` (multiple `##` sections + 1–2 `<Inset kind="why"|"note">` asides) → `<KeyTakeaway>` → `<Quiz>` (inside the explanation flow, ≥3 questions) → `<RetrievalDrawer>` → `<Recap>`. Imports use the `~/` alias, never `../`.
- **Diagrams:** ≥1 `FlowDiagram` per lesson (`label`, `caption`, `nodes:[{id,label,sub}]`, `edges:[{from,to,label}]`) — use it for dependency arrows, layer stacks, hexagon ports, context maps, saga flows. NEVER `StructureFigure` with `nodes`/`edges` (it takes `cells[]` only and crashes the build).
- **Practice:** one JSON per lesson at `src/content/practice/architecture-patterns/<NN-unit>/<NN-lesson>.json`; `lessonKey="architecture-patterns/<NN-unit>/<NN-lesson>"`, `track="architecture-patterns"`, `tasks[]` 3–5 (≤8). Lean **`review`** (critique a given architecture; every finding `planted: true`) and **`design`** (propose a structure; `rubric` length ≥2), plus **`predict`** (`scenario`+`reveal`) and **`diagnose`** (`grading.blanks`|`grading.self`). `fix` allowed where a code snippet fits (`starter`+`grading.self`+`rubric`). Each task: `id, type, difficulty` (`recall`|`apply`|`stretch`), `estMin`, `title{en,ru}`, `prompt{en,ru}`, type-specific fields. NO `sandbox` (architecture has no runnable shell/code). Bilingual `{en,ru}` on every text field.
- **Practice type-shape traps:** `diagnose` uses `grading.blanks` or `grading.self`, NEVER `scenario`/`reveal` (that is `predict`). Every `review` finding has `planted: true`. `design` needs `rubric` length ≥2. `predict` needs `scenario` + `reveal`. `fix` needs `starter` + `grading.self` (+ `rubric`).
- **MDX hazards:** no backslash-escaped quote inside a double-quoted JSX attribute — use a single-quote delimiter (`caption='…"x"…'`) or a `{...}` JS-expression string. No unclosed `<Inset>`/`<Explanation>`. No harness leakage (`system-reminder`, `antml:`, `<function`). No doubled slug directories.
- **Verify gate (from `site/`):** the full build is slow and any `units.json` change invalidates the global incremental cache, so run the heavy gate ONCE after the last unit (Task 12). Per-unit gate = `astro sync` + `bun run test` + the P6 hazard scan. Final gate:
  ```
  bun scripts/lint-src.mjs \
    && NODE_OPTIONS=--max-old-space-size=12288 bunx astro build \
    && bun scripts/lint-dist.mjs \
    && bun run test
  ```
  `bun run build` (or the explicit form above) is mandatory — `lint:src` never renders/MDX-compiles, so it misses wrong component-prop APIs and MDX-body breaks. `bun run test` catches the test-only 6th seam.
- **Commit convention:** `content(architecture-patterns): <NN-unit> EN+RU ready`. No co-author footer (attribution disabled globally). Work on branch `feat/architecture-patterns-track`; push per unit.
- **Fact-Forcing Gate:** a PreToolUse hook requires presenting 4 facts (file callers / no-duplicate / data-shape / verbatim instruction) before EVERY `Write`/`Edit`/`Bash`. Implementer subagents MUST present them, then retry.

## File Structure

- **Seam files (edited once, Task 0):** `src/types/index.ts`, `src/content/tracks.json`, `src/components/atlas/track-band.ts`, `src/scripts/track-meta.ts`, `src/scripts/path/mastery-field.ts`.
- **Per-unit, every task:** append to `src/content/units.json`; create `src/content/lessons/{en,ru}/architecture-patterns/<NN-unit>/<NN-lesson>/index.mdx` (× lessons × 2); create `src/content/practice/architecture-patterns/<NN-unit>/<NN-lesson>.json` (× lessons).
- **Capstone (Task 12):** create `src/content/projects/architecture-patterns-platform.json`.
- **Ledger:** `.superpowers/sdd/progress.md`.

**Templates to copy (read these, do not invent structure):**
- Lesson: `src/content/lessons/en/system-design/01-scalability/01-latency-vs-throughput/index.mdx` (+ the `ru/` mirror).
- Practice: `src/content/practice/system-design/08-building-blocks/03-bloom-filters.json`.
- Capstone: `src/content/projects/homelab-secure-stack.json`.

---

## Per-Unit Protocol (the standard step sequence for Tasks 1–11; Task 0 wraps it with the seam edits)

Each unit task runs these steps. The task body supplies only the unit-specific payload: the `units.json` entry (verbatim) and the lesson table.

- [ ] **P1 — Read context.** Read spec `docs/superpowers/specs/2026-06-22-architecture-patterns-track-design.md` (Goal, Distinctness, the unit's syllabus block). Read the template lesson `…/system-design/01-scalability/01-latency-vs-throughput/index.mdx` (+ ru) and template practice `…/system-design/08-building-blocks/03-bloom-filters.json`.
- [ ] **P2 — Author EN lessons.** For each lesson in the table: write `src/content/lessons/en/architecture-patterns/<unit>/<lesson>/index.mdx` to the depth bar — Hook (a concrete structural decision/failure), Crux, `##` sections teaching the forces and the pattern as their answer, ≥1 `<FlowDiagram>`, 1–2 `<Inset>` asides, a `<KeyTakeaway>`, a `<Quiz>` (≥3 Q), `<RetrievalDrawer>`, `<Recap>`. Exact frontmatter per Global Constraints; `order` = lesson number; `level` per the unit tier.
- [ ] **P3 — Author RU lessons.** Mirror each EN lesson to `.../ru/architecture-patterns/<unit>/<lesson>/index.mdx`: translate prose, keep code/diagram identifiers identical, keep Quiz `id` identical, `lang: ru`, RU `summary` ≤280. Keep technical identifiers (DIP, CQRS, aggregate, saga) in original form; translate surrounding prose.
- [ ] **P4 — Author practice.** One JSON per lesson, 3–5 tasks, `review`/`design`-leaning mix per Global Constraints. Bilingual `{en,ru}` on every text field.
- [ ] **P5 — Register the unit.** Append this unit's entry to `src/content/units.json` (verbatim from the task payload).
- [ ] **P6 — Hazard scan (controller).** Run `bun scripts/mdx-check.mjs architecture-patterns <NN-unit>` from `site/` — a real `@mdx-js/mdx` compile of every new EN+RU lesson body (catches unclosed tags / JSX-attribute breaks that `astro sync`+lint:src miss but the full build would fail on). Expected: `N ok, 0 parse failures`. Then grep all new files for `system-reminder`, `antml:`, `<function`; grep MDX for a backslash-quote inside `"..."` attributes; verify every `diagnose` uses `grading`, every `review` finding has `planted: true`, every `design` has `rubric` length ≥2, EN/RU lesson + practice counts match, Quiz ids match across langs, ≥1 `FlowDiagram` per lesson, no `StructureFigure`.
- [ ] **P7 — Per-unit gate (controller).** From `site/`: `astro sync` then `bun run test`. Both must pass. (Defer the full `astro build` to Task 12 — it is slow and re-invalidated by every `units.json` change.)
- [ ] **P8 — Commit + push (controller).** `git add` the unit's files + `units.json`; `git commit -m "content(architecture-patterns): <NN-unit> EN+RU ready"`; `git push`. Update `.superpowers/sdd/progress.md`.

---

## Task 0: Scaffold + Unit 00 (vertical slice)

**Files:**
- Modify: `src/types/index.ts` — add `"architecture-patterns"` to the `Track` union AND the `TRACKS` array.
- Modify: `src/content/tracks.json` — append the track entry.
- Modify: `src/components/atlas/track-band.ts` — `TRACK_BAND` add `"architecture-patterns": "advanced"`.
- Modify: `src/scripts/track-meta.ts` — `TRACK_ABBR` add `"architecture-patterns": "ARCH"`.
- Modify: `src/scripts/path/mastery-field.ts` — add `"architecture-patterns"` to the `backend` family `tracks` array.
- Modify: `src/content/units.json` — append the unit-00 entry below.
- Create: 2 lessons × 2 langs + 2 practice JSON for `00-start-here`.
- Create: `.superpowers/sdd/progress.md`.

**Interfaces — Produces:** the registered `architecture-patterns` track that Tasks 1–11 extend.

- [ ] **Step 1 — `src/types/index.ts`.** In the `Track` union add `| "architecture-patterns"` after `"linux"`; in the `TRACKS` array add `"architecture-patterns",` after `"linux",`.
- [ ] **Step 2 — `src/content/tracks.json`.** Append:

```json
{
  "slug": "architecture-patterns",
  "order": 41,
  "color": "lilac",
  "title": { "en": "Architecture Patterns", "ru": "Архитектурные паттерны" },
  "blurb": {
    "en": "How to structure an application so it survives change — coupling and cohesion, dependency direction, hexagonal and clean architecture, DDD, CQRS, event sourcing, and decomposing a monolith without building a distributed one.",
    "ru": "Как структурировать приложение, чтобы оно переживало изменения — связность и зацепление, направление зависимостей, гексагональная и чистая архитектура, DDD, CQRS, event sourcing и декомпозиция монолита без превращения в распределённый монолит."
  }
}
```

- [ ] **Step 3 — `track-band.ts`.** In `TRACK_BAND`, add `"architecture-patterns": "advanced",` (next to the other `advanced` entries, e.g. after `"engineering-practice": "advanced",`).
- [ ] **Step 4 — `track-meta.ts`.** In `TRACK_ABBR`, add `"architecture-patterns": "ARCH",`.
- [ ] **Step 5 — `mastery-field.ts`.** In `DOMAIN_FAMILIES`, append `"architecture-patterns"` to the `backend` family `tracks` array: `["backend", "apis", "node", "nest", "python", "go", "architecture-patterns"] as Track[]`.
- [ ] **Step 6 — `units.json` unit-00 entry.** Append:

```json
{
  "id": "architecture-patterns/00-start-here",
  "slug": "00-start-here",
  "track": "architecture-patterns",
  "order": 0,
  "title": { "en": "Start here", "ru": "Начни отсюда" },
  "crux": { "en": "What architecture actually is, and the frame — fitness for forces — you carry into every structural decision.", "ru": "Что такое архитектура на самом деле и рамка — пригодность под силы — с которой подходишь к любому структурному решению." },
  "lessons": ["01-what-architecture-actually-is", "02-fitness-and-tradeoffs"]
}
```

- [ ] **Step 7 — Author unit 00** via Per-Unit Protocol P1–P4 for the lessons below.

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-what-architecture-actually-is | middle | Architecture = the decisions that are expensive to change; design vs architecture; why "best practice" is a category error. |
  | 2 | 02-fitness-and-tradeoffs | middle | There is no best architecture, only fit-for-forces; the -ilities; introduce the running B2B order/billing example and the tradeoff frame the track reuses. |

- [ ] **Step 8 — Per-unit gate.** From `site/`: `astro sync` && `bun run test`. Expected: PASS (this proves all 6 seams, including the test-only mastery-field family seam).
- [ ] **Step 9 — Hazard scan** (P6) over the new files.
- [ ] **Step 10 — Commit + push.** `git commit -m "content(architecture-patterns): 00-start-here EN+RU ready + scaffold"`; `git push -u origin feat/architecture-patterns-track`. Create `.superpowers/sdd/progress.md` with the 13-task checklist.

---

## Task 1: Unit 01 — coupling-and-cohesion

Run the Per-Unit Protocol with this payload.

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/01-coupling-and-cohesion",
  "slug": "01-coupling-and-cohesion",
  "track": "architecture-patterns",
  "order": 1,
  "title": { "en": "Coupling and cohesion", "ru": "Связанность и зацепление" },
  "crux": { "en": "The two forces every structural decision trades between: how parts depend on each other, and how focused each part is.", "ru": "Две силы, между которыми торгуется любое структурное решение: как части зависят друг от друга и насколько сфокусирована каждая часть." },
  "lessons": ["01-coupling-forms", "02-cohesion", "03-connascence"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-coupling-forms | middle | Afferent/efferent; the classic ladder content→common→control→stamp→data coupling; why looser is not always better. |
  | 2 | 02-cohesion | middle | Functional vs coincidental cohesion; the LCOM intuition; cohesion as the counterweight that stops "decouple everything" from shredding a module. |
  | 3 | 03-connascence | middle | Connascence as the unifying metric: static vs dynamic; strength/locality/degree; how to rank refactors by which connascence to weaken. |

---

## Task 2: Unit 02 — dependency-direction

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/02-dependency-direction",
  "slug": "02-dependency-direction",
  "track": "architecture-patterns",
  "order": 2,
  "title": { "en": "Dependency direction", "ru": "Направление зависимостей" },
  "crux": { "en": "Who is allowed to know about whom — the dependency rule, and how to invert it when it points the wrong way.", "ru": "Кому позволено знать о ком — правило зависимостей и как его инвертировать, когда оно направлено не туда." },
  "lessons": ["01-the-dependency-rule", "02-dependency-inversion", "03-acyclic-and-stable-abstractions"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-the-dependency-rule | middle | Source-code dependencies should point toward stability/abstraction; concrete depends on abstract, not the reverse; flow-of-control vs flow-of-source-dependency. |
  | 2 | 02-dependency-inversion | middle | DIP in practice; who OWNS the interface (the consumer, not the provider); inversion as the mechanism behind every later pattern. |
  | 3 | 03-acyclic-and-stable-abstractions | middle | ADP (no cycles), SDP (depend toward stability), SAP (stable = abstract); the "main sequence" and the zones of pain/uselessness. |

---

## Task 3: Unit 03 — layered-architecture

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/03-layered-architecture",
  "slug": "03-layered-architecture",
  "track": "architecture-patterns",
  "order": 3,
  "title": { "en": "Layered architecture", "ru": "Слоистая архитектура" },
  "crux": { "en": "The n-tier default everyone starts with, why it is reasonable, and exactly where it leaks.", "ru": "N-уровневый дефолт, с которого начинают все, почему он разумен и где именно протекает." },
  "lessons": ["01-n-tier", "02-anemic-vs-rich-domain", "03-where-layering-leaks"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-n-tier | middle | Presentation/application/domain/infrastructure; strict vs relaxed layering; what layering buys (replaceability) and its cost (the sinkhole anti-pattern). |
  | 2 | 02-anemic-vs-rich-domain | middle | The anemic-domain anti-pattern; behavior belongs with data; when "anemic" is fine (CRUD) and when it rots (complex invariants). |
  | 3 | 03-where-layering-leaks | middle | The transaction-script trap, layer-skipping, the fat service; how leaks motivate the dependency-inverted architectures in units 04–05. |

---

## Task 4: Unit 04 — hexagonal

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/04-hexagonal",
  "slug": "04-hexagonal",
  "track": "architecture-patterns",
  "order": 4,
  "title": { "en": "Hexagonal architecture", "ru": "Гексагональная архитектура" },
  "crux": { "en": "Ports and adapters: invert the boundary so the domain owns the contract and the outside world plugs in.", "ru": "Порты и адаптеры: инвертируй границу, чтобы домен владел контрактом, а внешний мир подключался к нему." },
  "lessons": ["01-ports-and-adapters", "02-driving-and-driven", "03-testing-at-the-boundary"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-ports-and-adapters | middle | The core idea; a port is a domain-owned interface, an adapter is its implementation; the symmetry that makes UI and DB both "just adapters". |
  | 2 | 02-driving-and-driven | middle | Primary (driving) vs secondary (driven) sides; the application as a hexagon; mapping HTTP/CLI/tests to the same primary port. |
  | 3 | 03-testing-at-the-boundary | middle | Why hexagonal makes the domain trivially testable (drive through the primary port, fake the secondary); the test pyramid this enables. |

---

## Task 5: Unit 05 — clean-and-onion

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/05-clean-and-onion",
  "slug": "05-clean-and-onion",
  "track": "architecture-patterns",
  "order": 5,
  "title": { "en": "Clean and onion architecture", "ru": "Чистая и луковичная архитектура" },
  "crux": { "en": "The concentric dependency rule, use-case interactors, and the entity core — and the boilerplate tax it charges.", "ru": "Концентрическое правило зависимостей, интеракторы сценариев и ядро сущностей — и налог на шаблонный код, который оно берёт." },
  "lessons": ["01-the-concentric-rule", "02-use-cases-and-interactors", "03-entity-core-and-the-cost"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-the-concentric-rule | middle | Clean/Onion as concentric circles; dependencies point toward the center; how it generalizes hexagonal. |
  | 2 | 02-use-cases-and-interactors | middle | The application layer as orchestration; request/response models; the interactor as the unit of "what the app does". |
  | 3 | 03-entity-core-and-the-cost | middle | The entity core; the boilerplate/indirection tax; honest guidance on when clean architecture is overkill (small app, CRUD, short-lived). |

---

## Task 6: Unit 06 — domain-driven-design

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/06-domain-driven-design",
  "slug": "06-domain-driven-design",
  "track": "architecture-patterns",
  "order": 6,
  "title": { "en": "Domain-driven design", "ru": "Domain-driven design" },
  "crux": { "en": "Model the business so the model is the architecture: bounded contexts, ubiquitous language, aggregates, and the strategic map.", "ru": "Моделируй бизнес так, чтобы модель и была архитектурой: ограниченные контексты, единый язык, агрегаты и стратегическая карта." },
  "lessons": ["01-bounded-contexts", "02-ubiquitous-language", "03-aggregates-and-invariants", "04-context-mapping"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-bounded-contexts | senior | The central pattern: the same word ("order", "customer") means a different model in each context; the bounded context as the unit of decomposition. |
  | 2 | 02-ubiquitous-language | senior | Language as a design tool; the model IS the language; how naming drift signals a context boundary. |
  | 3 | 03-aggregates-and-invariants | senior | Aggregates as consistency boundaries; the aggregate root; one transaction = one aggregate; sizing aggregates by invariant, not by data. |
  | 4 | 04-context-mapping | senior | The strategic map: shared kernel, customer/supplier, conformist, anticorruption layer; integrating contexts without coupling their models. |

---

## Task 7: Unit 07 — cqrs

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/07-cqrs",
  "slug": "07-cqrs",
  "track": "architecture-patterns",
  "order": 7,
  "title": { "en": "CQRS", "ru": "CQRS" },
  "crux": { "en": "Split the write model from the read model — what it buys, what it costs, and when the split is overkill.", "ru": "Раздели модель записи и модель чтения — что это даёт, чего стоит и когда такое разделение избыточно." },
  "lessons": ["01-command-query-split", "02-read-models-and-projections", "03-when-cqrs-is-overkill"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-command-query-split | senior | Why one model serves reads and writes badly; CQS → CQRS; separate models, not separate databases (yet). |
  | 2 | 02-read-models-and-projections | senior | Denormalized read models; projecting from the write side; the synchronization/staleness problem and how to bound it. |
  | 3 | 03-when-cqrs-is-overkill | senior | The complexity it buys (eventual consistency, two models); partial/local CQRS; honest "don't" guidance. |

---

## Task 8: Unit 08 — event-sourcing

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/08-event-sourcing",
  "slug": "08-event-sourcing",
  "track": "architecture-patterns",
  "order": 8,
  "title": { "en": "Event sourcing", "ru": "Event sourcing" },
  "crux": { "en": "The event log as the source of truth — state as a fold over events — and the traps that come with it.", "ru": "Журнал событий как источник истины — состояние как свёртка событий — и ловушки, которые с этим приходят." },
  "lessons": ["01-events-as-truth", "02-projections-and-replay", "03-the-traps"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-events-as-truth | senior | State as a left-fold over an append-only event log; vs current-state storage; the audit/temporal superpower. |
  | 2 | 02-projections-and-replay | senior | Rebuilding read models by replay; temporal queries; event versioning/upcasting; snapshots for performance. |
  | 3 | 03-the-traps | senior | Eventual consistency, schema evolution, GDPR/right-to-be-forgotten vs an immutable log, the "set-in-stone bad event" problem. |

---

## Task 9: Unit 09 — event-driven

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/09-event-driven",
  "slug": "09-event-driven",
  "track": "architecture-patterns",
  "order": 9,
  "title": { "en": "Event-driven architecture", "ru": "Событийно-ориентированная архитектура" },
  "crux": { "en": "Structuring a system around things that happened: choreography vs orchestration, sagas, and eventual consistency as a design choice.", "ru": "Структурирование системы вокруг произошедших событий: хореография против оркестрации, саги и согласованность в конечном счёте как осознанный выбор." },
  "lessons": ["01-choreography-vs-orchestration", "02-sagas", "03-eventual-consistency-as-structure"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-choreography-vs-orchestration | senior | Decentralized events vs a central coordinator; the coupling/visibility tradeoff; when each wins. |
  | 2 | 02-sagas | senior | Distributed transactions without 2PC; compensating actions; the saga as a first-class structural unit; orchestrated vs choreographed sagas. |
  | 3 | 03-eventual-consistency-as-structure | senior | Designing FOR eventual consistency: idempotency, the dual-write/outbox pattern, read-your-writes. Cross-link `distributed` for the delivery-semantics depth. |

---

## Task 10: Unit 10 — decomposition

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/10-decomposition",
  "slug": "10-decomposition",
  "track": "architecture-patterns",
  "order": 10,
  "title": { "en": "Decomposition", "ru": "Декомпозиция" },
  "crux": { "en": "One app or many, and how to get from one to the other without accidentally building a distributed monolith.", "ru": "Одно приложение или много и как перейти от одного к другому, случайно не построив распределённый монолит." },
  "lessons": ["01-modular-monolith", "02-monolith-to-services", "03-the-distributed-monolith"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-modular-monolith | senior | Package-by-feature vs package-by-layer; enforced module boundaries inside one deployable; the "modular monolith first" default. |
  | 2 | 02-monolith-to-services | senior | Decomposition heuristics (bounded contexts as seams); the strangler-fig pattern; data ownership and the database-per-service rule. |
  | 3 | 03-the-distributed-monolith | senior | The anti-pattern: chatty synchronous calls, shared DB, lockstep deploys; the dual-write problem; how to tell you built one. |

---

## Task 11: Unit 11 — evolution-and-decisions

- [ ] **units.json entry:**

```json
{
  "id": "architecture-patterns/11-evolution-and-decisions",
  "slug": "11-evolution-and-decisions",
  "track": "architecture-patterns",
  "order": 11,
  "title": { "en": "Evolution and decisions", "ru": "Эволюция и решения" },
  "crux": { "en": "Architecture is a verb — ADRs, fitness functions, and reasoned tradeoff analysis that change it on purpose.", "ru": "Архитектура — это глагол: ADR, фитнес-функции и обоснованный анализ трейдоффов, которые меняют её осознанно." },
  "lessons": ["01-architecture-decision-records", "02-fitness-functions-and-evolutionary-architecture", "03-tradeoff-analysis"]
}
```

- [ ] **Lesson table:**

  | order | slug | level | thrust |
  |-------|------|-------|--------|
  | 1 | 01-architecture-decision-records | senior | ADRs: capturing the WHY, status lifecycle, the decision log as a first-class artifact; lightweight by design. |
  | 2 | 02-fitness-functions-and-evolutionary-architecture | senior | Automating "is it still fit" (dependency tests, latency budgets, ArchUnit-style guards); incremental change; the wrong-way detector. |
  | 3 | 03-tradeoff-analysis | senior | ATAM-lite: sensitivity points, tradeoff points, reasoning about competing -ilities under a real constraint; the closing synthesis of the track. |

---

## Task 12: Capstone project + final gate

**Files:**
- Create: `src/content/projects/architecture-patterns-platform.json`.
- Verify: full build + lint + tests (the single heavy gate for the whole track).

- [ ] **Step 1 — Read the template.** Read `src/content/projects/homelab-secure-stack.json` in full to copy the schema (slug, title, pitch, deliverable, tracks, category, difficulty, estDays, skills, stack, and the GuidedMilestones with `feedsFrom`).
- [ ] **Step 2 — Author the capstone.** Create `architecture-patterns-platform.json`: design the running B2B order/billing platform end-to-end. `tracks: ["architecture-patterns"]`, `category` = the closest existing project category (confirm by reading 2–3 other project files; do NOT invent a new one), `difficulty: "advanced"`, bilingual title/pitch/deliverable. Milestones, each a `GuidedMilestone` whose `feedsFrom` references real lessonKeys from this track:
  1. Identify bounded contexts + ubiquitous language → `feedsFrom: architecture-patterns/06-domain-driven-design/01-bounded-contexts`, `…/02-ubiquitous-language`.
  2. Choose the structural style per context (layered vs hexagonal vs clean) → `…/03-layered-architecture/*`, `…/04-hexagonal/*`, `…/05-clean-and-onion/*`.
  3. Decide the read/write + event strategy (CQRS/event sourcing/event-driven where justified) → `…/07-cqrs/*`, `…/08-event-sourcing/*`, `…/09-event-driven/*`.
  4. Pick a decomposition (modular monolith vs services) and avoid the distributed monolith → `…/10-decomposition/*`.
  5. Justify with ADRs + a fitness function → `…/11-evolution-and-decisions/01-architecture-decision-records`, `…/02-fitness-functions-and-evolutionary-architecture`.
  Verify each `feedsFrom` key exists (`ls` the lesson dir) — a dangling key is the known collab-cursors mislink failure mode.
- [ ] **Step 3 — Hazard scan.** Grep the capstone JSON for harness leakage; validate JSON parses (`node -e "require('./src/content/projects/architecture-patterns-platform.json')"`).
- [ ] **Step 4 — Final verify gate.** From `site/`:
  ```
  bun scripts/lint-src.mjs \
    && NODE_OPTIONS=--max-old-space-size=12288 bunx astro build \
    && bun scripts/lint-dist.mjs \
    && bun run test
  ```
  Expected: build completes (page count up by ~36 lessons × 2 langs = 72 + project page), `lint-dist` 0/0, all tests pass. If the build OOMs, the explicit `NODE_OPTIONS` above is the bypass for the hardcoded 10 GB in the `build` script.
- [ ] **Step 5 — Commit + push.** `git add` the capstone; `git commit -m "content(architecture-patterns): capstone project + final gate green"`; `git push`. Mark the track complete in `.superpowers/sdd/progress.md`.

---

## Self-Review (run before execution)

- **Spec coverage:** all 12 spec units → Tasks 0–11; practice plan → P4 in every task + Global Constraints; capstone → Task 12; 6 wiring seams → Task 0 Steps 1–6; verify gate → P7 (per-unit) + Task 12 Step 4 (final). No spec section is unmapped.
- **Type/name consistency:** track slug `architecture-patterns`, abbr `ARCH`, color `lilac`, order `41`, band `advanced`, family `backend` — identical across the spec, Task 0 seam steps, and all `units.json` entries. Lesson slugs in each task's `lessons[]` array match the slugs in that task's lesson table.
- **Placeholder scan:** lesson PROSE is authored by implementers (a content track cannot ship full lesson text in a plan), but every task gives exact file paths, the verbatim `units.json` entry, the lesson slug/level/thrust table, and the template files to copy — no "TBD", no "similar to Task N", no undefined component/field references.
