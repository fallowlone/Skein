# architecture-patterns track — design spec

Date: 2026-06-22
Status: approved (brainstorm) → pending implementation plan
Cluster: **patterns cluster**, track 1 of 3 (architecture-patterns → code-patterns → react-patterns)

## Context

The patterns cluster is phase 4 of the new-courses program (CLI → Linux → Homelab → patterns).
Cluster composition (decided 2026-06-22):

- **architecture-patterns** — new track (THIS spec, built first).
- **code-patterns** — new track; absorbs clean-code / SOLID / refactoring / smells alongside GoF and idiomatic patterns. Own brainstorm→spec→plan→impl cycle, later.
- **react-patterns** — **extends the existing `react` track** with pattern-focused units (compound components, render props, provider/HOC, headless, polymorphic). NOT a new track. Own cycle, later.

Each track is its own spec → plan → implementation cycle, exactly like CLI and Linux.

## Goal

Teach a middle+/senior fullstack engineer how to **structure an application and let that
structure evolve** — boundaries, dependency direction, layering, domain modeling, and the
patterns that answer those forces. The track must read like an architect's war stories
(tradeoffs, failure modes, "we tried X and it became a distributed monolith"), never like a
pattern-reference catalog.

### Distinctness (non-overlap is a hard requirement)

The track sits on an axis no existing track owns:

| Track | Owns |
|-------|------|
| `system-design` | scaling, availability, data distribution, caching **under load** |
| `backend` | request-lifecycle internals (middleware, DI, pooling, circuit breakers) |
| `engineering-practice` | how **teams** work (TDD, review, trunk-based, flags, postmortems) |
| **`architecture-patterns`** | how you **structure** an app: boundaries, dependency direction, layering, domain modeling, decomposition, evolution |

Where a topic risks overlap (e.g. event-driven, CQRS), the framing is **structural** (how the
code/modules are shaped and depend on each other), not **operational** (how they scale or are
deployed). Cross-link to the sibling track instead of re-teaching its angle.

## Non-goals

- Not a GoF/design-pattern catalog (that is `code-patterns`).
- Not language-specific. Examples are pseudocode / TypeScript-ish, illustrative not runnable
  (no `run`-tagged samples in this track).
- Not deployment/infra (that is `deployment`/`docker`/`aws`).

## Approach — forces-first (chosen)

Considered three shapes:

- **A. Pattern catalog** (one unit per named pattern). Encyclopedic, dippable, but reads like
  reference docs — fails the depth bar. Rejected.
- **B. Forces-first (CHOSEN).** Open with the underlying forces (coupling, cohesion, dependency
  direction); patterns then appear as *answers* to those forces; close with evolution. Patterns
  are motivated, not memorized. Still dippable per unit.
- **C. Build-one-system narrative** (single example evolved across the whole track). Maximally
  cohesive but rigid — can't dip into one unit, fights spaced practice. Rejected as the spine,
  but **kept as a recurring thread**: a running example system (a B2B order/billing platform)
  reappears across units to show the same domain restructured, without locking unit order.

## Track metadata

| Field | Value |
|-------|-------|
| slug | `architecture-patterns` |
| order | `41` (next free; current max 40) |
| color | `lilac` |
| band (`TRACK_BAND`) | `advanced` |
| family (`DOMAIN_FAMILIES`) | `backend` (application structure) |
| abbr (`TRACK_ABBR`) | `ARCH` |
| prereqs | narrative-only (builds on `backend` + `system-design`); per-lesson `prereqs: []` |
| title.en | "Architecture Patterns" |
| title.ru | "Архитектурные паттерны" |

blurb.en (draft): "How to structure an application so it survives change — coupling and cohesion, dependency direction, hexagonal and clean architecture, DDD, CQRS, event sourcing, and decomposing a monolith without building a distributed one."

blurb.ru (draft): "Как структурировать приложение, чтобы оно переживало изменения — связность и зацепление, направление зависимостей, гексагональная и чистая архитектура, DDD, CQRS, event sourcing и декомпозиция монолита без превращения в распределённый монолит."

## Syllabus — 12 units, 36 lessons (two-tier)

Lesson tally: tier 1 = 17 (2+3+3+3+3+3), tier 2 = 19 (4+3+3+3+3+3) → 36 EN, ×2 langs = 72, + practice.

Each unit gets a `crux` (one-line) and 2–4 lessons. Lesson `level` field: tier-1 units = `middle`,
tier-2 units = `senior` (mixed where noted).

### Tier 1 — Structural foundations (core)

- **00 start-here** — *what architecture is, and the frame you carry into every structural decision.*
  - 01 what-architecture-actually-is (architecture = the decisions that are expensive to change; vs design)
  - 02 fitness-and-tradeoffs (architectural fitness functions; there is no "best" architecture, only fit-for-forces)
- **01 coupling-and-cohesion** — *the two forces every structural decision trades between.*
  - 01 coupling-forms (afferent/efferent, content/common/control/stamp/data coupling)
  - 02 cohesion (functional vs coincidental; the LCOM intuition)
  - 03 connascence (static vs dynamic; strength/locality/degree; the unifying metric)
- **02 dependency-direction** — *who is allowed to know about whom.*
  - 01 the-dependency-rule (source-code dependencies point inward/toward stability)
  - 02 dependency-inversion (DIP; depend on abstractions; ownership of the interface)
  - 03 acyclic-and-stable-abstractions (ADP, SDP, SAP; the "main sequence")
- **03 layered-architecture** — *the default everyone starts with, and where it leaks.*
  - 01 n-tier (presentation/application/domain/infrastructure; strict vs relaxed layering)
  - 02 anemic-vs-rich-domain (anemic-domain anti-pattern; behavior with data)
  - 03 where-layering-leaks (the transaction-script trap; layer-skipping; the fat service)
- **04 hexagonal** — *ports & adapters: invert the boundary so the domain owns the contract.*
  - 01 ports-and-adapters (the core idea; primary/secondary ports)
  - 02 driving-and-driven (left/right side; the application as a hexagon)
  - 03 testing-at-the-boundary (adapters mocked at ports; why hexagonal makes tests trivial)
- **05 clean-and-onion** — *concentric dependency rule, use cases, and the entity core.*
  - 01 the-concentric-rule (Clean/Onion; dependencies point toward the center)
  - 02 use-cases-and-interactors (application layer as orchestration; request/response models)
  - 03 entity-core-and-the-cost (when clean architecture is overkill; the boilerplate tax)

### Tier 2 — Domain & distributed structure (senior)

- **06 domain-driven-design** — *modeling the business so the model is the architecture.*
  - 01 bounded-contexts (the central pattern; same word, different model per context)
  - 02 ubiquitous-language (language as a design tool; the model is the language)
  - 03 aggregates-and-invariants (consistency boundaries; aggregate roots; transactional scope)
  - 04 context-mapping (shared kernel, customer/supplier, ACL, conformist; the strategic map)
- **07 cqrs** — *splitting the write model from the read model.*
  - 01 command-query-split (why one model serves reads and writes badly)
  - 02 read-models-and-projections (denormalized reads; the sync problem)
  - 03 when-cqrs-is-overkill (the complexity it buys and the cost; partial CQRS)
- **08 event-sourcing** — *the event log as the source of truth.*
  - 01 events-as-truth (state as a fold over events; vs current-state storage)
  - 02 projections-and-replay (rebuilding read models; temporal queries; versioning events)
  - 03 the-traps (eventual consistency, snapshotting, schema evolution, GDPR/deletion)
- **09 event-driven** — *structuring a system around things that happened.*
  - 01 choreography-vs-orchestration (decentralized events vs central coordinator; the tradeoff)
  - 02 sagas (distributed transactions without 2PC; compensation; the saga as a structural unit)
  - 03 eventual-consistency-as-structure (designing for it; idempotency; the read-your-writes problem) — cross-link `distributed`
- **10 decomposition** — *one app or many, and how to get from one to the other.*
  - 01 modular-monolith (package-by-feature vs package-by-layer; enforced module boundaries)
  - 02 monolith-to-services (decomposition heuristics; seams; the strangler-fig pattern)
  - 03 the-distributed-monolith (the anti-pattern; chatty services; the dual-write problem)
- **11 evolution-and-decisions** — *architecture is a verb; how it changes on purpose.*
  - 01 architecture-decision-records (ADRs; capturing the why; the decision log as an artifact)
  - 02 fitness-functions-and-evolutionary-architecture (automating "is it still fit"; the wrong-way detector)
  - 03 tradeoff-analysis (ATAM-lite; sensitivity/tradeoff points; reasoning about -ilities under constraint)

## Lesson template

Identical to the current tracks model (see `system-design/01-scalability/01-latency-vs-throughput`):

Frontmatter: `slug, lang, track, unit, order, title, summary, estMin, status, lessonType: topic,
level, concepts[], prereqs: [], sources[]`.

Body order: `<Hook>` → `<Crux>` → `<Explanation>` (with `##` sections and `<Inset kind="why|note">`
asides) → `<KeyTakeaway>` → `<Quiz>` → `<RetrievalDrawer>` → `<Recap>`.

Diagrams: `FlowDiagram` (node/edge graphs — dependency arrows, layer stacks, context maps),
`StructureFigure` (`cells[]` only — NOT node/edge). Every ready lesson carries ≥1 structural
diagram (site-wide invariant). Hydration cap = 5 islands/page.

Sources: ≥3 authoritative per lesson (Evans DDD, Fowler, Vernon, Richardson microservices.io,
Cockburn hexagonal, Martin Clean Architecture, Ford evolutionary-architecture, AWS builders' library).

## Practice

Every lesson gets a practice set (additive JSON, never edits the MDX), matching the site-wide
campaign. Architecture is design-heavy, so the task mix leans **`review`** (critique a given
architecture) and **`design`** (propose a structure for a scenario), plus **`predict`** /
**`diagnose`**. No runnable shell/code, so no executable practice. No Lab, no Drill.

## Capstone

One `projects/` entry: **`architecture-patterns/design-a-platform`** (or similar) — design the
running-example B2B order/billing platform end-to-end: identify bounded contexts → choose a
decomposition → justify with ADRs → define a fitness function. Difficulty `advanced`. Structured
as `GuidedMilestone`s whose `feedsFrom` reference the track's lessonKeys (same pattern as
`homelab-secure-stack`). Authored after the lessons land.

## Wiring — the 6 coupled seams (a new track needs all 6)

1. `src/types/index.ts` — add `"architecture-patterns"` to the `Track` union **and** the `TRACKS` array.
2. `src/content/tracks.json` — new entry `{slug, order: 41, color: "lilac", title, blurb}`.
3. `src/content/units.json` — 12 unit entries (union-dedup-by-id on merge).
4. `src/components/atlas/track-band.ts` — `TRACK_BAND["architecture-patterns"] = "advanced"`.
5. `src/scripts/track-meta.ts` — `TRACK_ABBR["architecture-patterns"] = "ARCH"`.
6. `src/scripts/path/mastery-field.ts` — add the slug to the `backend` family in `DOMAIN_FAMILIES`
   (test-only seam; TS does not force it — the mastery-field exhaustiveness test does).

Seams 1/4/5 are TS-enforced (exhaustive Records). Seam 6 is enforced only by `bun run test`.
Never register the track in tracks.json with zero units.

## Verify gate

Per-unit during authoring: `astro sync` + `bun run test` + a tag-balance / MDX-compile hazard
grep (sync+test parse frontmatter+schema but NOT MDX bodies).

Final gate after the last unit (full build is ~80 min; any `units.json` change invalidates the
global incremental cache → run it ONCE at the end):

```
bun scripts/lint-src.mjs \
  && NODE_OPTIONS=--max-old-space-size=12288 bunx astro build \
  && bun scripts/lint-dist.mjs \
  && bun run test
```

`bun run build` is mandatory (lint:src never renders/MDX-compiles → misses wrong component-prop
APIs that crash prerender, e.g. `StructureFigure` takes `cells[]` not `nodes/edges`; and MDX-body
parse breaks). `bun run test` catches seam 6.

## Known gotchas (carried from CLI/Linux)

- **MDX backslash-quote in a double-quoted JSX attribute** crashes the build (JSX has no such
  escape). Use single-quote delimiters or `{...}` JS-expression strings. Only `bun run build`
  catches it.
- **Unclosed tags** (`<Step>`, `<Inset>`) slip past sync+test — only `astro build` fails. Run a
  per-file open/close tag-balance grep before the big build.
- **Build OOM** past ~5900 pages at default 10 GB heap on 16 GB Mac — the `build` npm script
  hardcodes `--max-old-space-size=10240`; bypass with the explicit invocation above (12288).
- **Authoring subagents** leak harness tags / bare JSX-expr / doubled slug dirs and can delete
  widgets — scan output before building.

## Out of scope (future cluster tracks)

- `code-patterns` (GoF + SOLID + clean-code + refactoring) — separate spec.
- `react-patterns` (extends the `react` track) — separate spec.
