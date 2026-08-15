> **Site mirror**: this file is the source of truth for the depth bar and the pillar must-cover map. The track/unit listing itself lives in `site/src/content/tracks.json` + `site/src/content/units.json` — update those when adding or renaming a pillar/unit, this file when the depth bar or must-cover coverage changes. The full bilingual site lives at `site/`. To author a unit's lessons, run `/infographic <track>/<unit>` (see `.claude/commands/infographic.md`); absolute-beginner foundations content (math, algorithms, Base CS) is authored separately via `/teach <track>/<NN-unit>/<NN-lesson>`.

# Fullstack Curriculum — Middle+ / Senior Bar

Reference for *depth calibration*. Every piece in this repo must hit this bar: a reader who works through the series should have enough conceptual grounding to operate as a middle+ → senior fullstack engineer.

Use this file when planning a series:
- Pick the relevant pillar(s) below.
- Make sure each pillar's "must-cover" bullets appear *somewhere* in the series, even briefly.
- If a sub-topic only restates a junior-level idea, push deeper or merge.

## Depth bar (applies to every infographic)

A middle+ / senior reader expects:

- **The mechanism**, not just the API. Show packets, syscalls, queries, frames — what actually moves.
- **Tradeoffs**: every choice has a cost. Latency vs throughput, consistency vs availability, DX vs runtime perf.
- **Failure modes**: what breaks first, what the symptom looks like, how to detect it.
- **Numbers**: concrete latencies, sizes, throughputs, costs — never vague "fast" / "scales".
- **One step deeper than the obvious abstraction.** If TCP is the topic, talk about congestion control, not "reliable delivery".

If a draft reads like documentation, it's too shallow. If it reads like a war-story postmortem, it's right.

## Pillars

### 1. Networking & Protocols

Must-cover: TCP/IP stack, TLS 1.3 handshake, HTTP/1.1 → /2 → /3 differences, DNS resolution + caching, CDN edge logic, WebSocket lifecycle, gRPC vs REST, CORS, cookies vs tokens, MITM threat model.

### 2. Browser & Frontend Runtime

Must-cover: event loop + microtasks + macrotasks, rendering pipeline (parse → style → layout → paint → composite), JS engine internals (V8 hidden classes, inline caches), Web Workers vs Service Workers, hydration cost, React reconciler / fiber, virtual DOM tradeoffs, SSR vs SSG vs ISR vs streaming, Core Web Vitals (LCP, INP, CLS) and what causes each.

### 3. Frontend Architecture

Must-cover: state shape (local / lifted / global / server / URL), data-fetching patterns (RSC, React Query, SWR, GraphQL clients), forms + validation, accessibility tree, design tokens, monorepo + package boundaries, code-splitting & route-level chunking, micro-frontends (when and when not), build pipelines (Vite, Turbopack, esbuild, swc).

### 4. Backend Architecture

Must-cover: request lifecycle, middleware chain, dependency injection (NestJS-style), async/event-loop blocking, connection pooling, idempotency keys, retries + backoff + jitter, circuit breakers, queue patterns (work, fan-out, dead-letter), background jobs, CRON vs cron-with-leader-election, graceful shutdown, 12-factor configuration.

### 5. APIs

Must-cover: REST resource modeling, status codes (real-world usage, not the textbook), pagination (offset vs cursor), filtering & sorting, OpenAPI contracts, gRPC + protobuf, GraphQL (N+1, persisted queries, federation), webhooks (signing, replay, dedup), versioning strategies, rate-limiting algorithms (token bucket, leaky bucket, sliding window).

### 6. Databases

Must-cover: relational model + normalization tradeoffs, indexes (B-tree, hash, GIN, BRIN), execution plans, transactions + isolation levels (RC vs RR vs SI), MVCC, locks (row, table, advisory), connection pooling (pgbouncer), schema migrations & zero-downtime patterns, ORMs vs raw SQL, sharding & partitioning, read replicas vs replicas-with-lag, when to choose Postgres vs MySQL vs SQLite vs MongoDB vs Redis vs ClickHouse.

### 7. Caching

Must-cover: cache levels (CPU → memory → redis → CDN), cache invalidation strategies (TTL, write-through, write-behind, event-driven), stampede protection, consistency anomalies, ETag + If-None-Match, Cache-Control directives, stale-while-revalidate, dogpile / thundering herd.

### 8. Queues, Streams, Eventing

Must-cover: at-least-once vs exactly-once vs at-most-once, Kafka partitions + consumer groups, RabbitMQ exchanges + bindings, ordering guarantees, idempotent consumers, outbox pattern, CDC, event-driven vs request/response, eventual consistency UX patterns.

### 9. Distributed Systems

Must-cover: CAP in practice, consensus (Raft outline), quorum reads/writes, leader election, vector clocks vs Lamport timestamps, sagas, two-phase commit (and why we usually don't), service mesh (Envoy, Istio sidecar), service discovery, retries amplifying outages.

### 10. Security

Must-cover: OWASP Top 10 in modern terms, OAuth 2.1 + OIDC flows (auth code + PKCE), JWT pitfalls, session vs token tradeoffs, CSRF in API era, password hashing (argon2, bcrypt) + parameters, secrets management, supply-chain attacks (typosquatting, postinstall scripts), CSP, SRI, prototype pollution, SSRF.

### 11. Observability

Must-cover: logs vs metrics vs traces (three pillars), structured logging, OpenTelemetry, RED + USE methods, SLI/SLO/SLA, error budgets, distributed tracing context propagation, sampling, profiling (CPU flamegraphs, allocation, off-CPU), real user monitoring vs synthetic.

### 12. Deployment & Infra

Must-cover: containers (image layers, BuildKit cache mounts), Docker Compose vs Kubernetes (when each), Kubernetes objects (Deployment, Service, Ingress, PV/PVC, HPA), blue-green vs canary vs rolling, IaC (Terraform state, drift), DNS + load balancer levels (L4 vs L7), TLS termination, GitHub Actions vs Argo vs Buildkite, secrets at deploy time.

### 13. Performance

Must-cover: profiling-first mindset, hot path identification, Big-O vs actual cache behavior, allocation pressure & GC pauses, N+1 detection, request coalescing, batching, prefetching, bundle size budgets, image optimization (AVIF, srcset, LCP image), HTTP cache hierarchies.

### 14. Data Engineering for Fullstack

Must-cover: OLTP vs OLAP, ELT vs ETL, columnar formats (Parquet), basic Spark / Dataflow model, materialized views, event sourcing vs CRUD, search (Elastic, Meilisearch, Postgres FTS), vector DBs (pgvector, Pinecone) for semantic search.

### 15. AI / LLM Integration

Must-cover: prompt design + caching, function/tool calling, RAG architecture (chunking, embeddings, retrieval, re-ranking), streaming responses, cost & latency budgets per request, agent loops, evals, hallucination + grounding strategies.

### 16. Engineering Practice

Must-cover: TDD vs example-based vs property-based testing, contract testing, code review heuristics, trunk-based vs gitflow, feature flags, A/B & shadow traffic, postmortem culture, on-call ergonomics, incident severities, runbooks.

## Authoring model

Every request maps to one **unit** inside one **track**. There is no
chapter/piece/topic tier above the unit — `site/src/content/tracks.json`
lists the tracks, `site/src/content/units.json` lists each track's units,
and each unit's `lessons` array lists its lesson slugs in junior→senior
order.

- **Track** — one pillar or specialization (e.g. `networking`, `sql-postgres`,
  `security-offensive`). Matches a `curriculum.md` pillar 1:1 for the 16
  core pillars below; see "Beyond the 16 core pillars" for the rest.
- **Unit** — the addressable authoring target. Run `/infographic
  <track>/<unit>` (see `.claude/commands/infographic.md`) to author one.
  Covers one coherent sub-topic of the track (e.g. `03-tcp-handshake`
  inside `networking`).
- **Lesson** — the smallest content file. A unit typically splits into
  3–7 lessons banded by level: one `junior` intro, 1–2 `middle` mechanism
  lessons, 1–2 `senior` internals/edge-case lessons. Lives at
  `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`.
  Every lesson is bilingual (EN+RU) or the command refuses.

Foundations content (math, algorithms, Base CS) is a separate track
group authored via `/teach <track>/<NN-unit>/<NN-lesson>`
(`.claude/commands/teach.md`), not `/infographic` — see "Beyond the 16
core pillars" below.

### Forbidden splitting mistakes

- Don't cram a unit that actually needs 3+ distinct mechanisms into one
  lesson — split by level band, not by cramming.
- Don't split a single mechanism across lessons just to pad the count —
  if one lesson can carry it, ship one lesson.
- Don't skip a level band a unit's topic genuinely needs (e.g. shipping
  only `junior`+`middle` when the topic has real senior-level failure
  modes) — the depth bar above applies per lesson, not just to the unit
  as a whole.

## Forbidden simplifications

- "It just works" — explain *why* it works.
- "It's the same as X but better" — explain the gap, not the analogy.
- Stock metaphors without the underlying mechanism (no "highway / cars" without packets).
- Diagrams that show *what* without *when* or *cost*.
