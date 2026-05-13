> **Site mirror**: this file is the source of truth for chapter outlines and the depth bar. `site/src/content/chapters.json` mirrors the chapter listing; update both together. The full bilingual site lives at `site/`. To author a piece, run `/infographic <pillar>/<NN-chapter>/<NN-piece>` (see `.claude/commands/infographic.md`).

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

## Three-tier scoping

Every request maps to one of three tiers. The tier decides what files and how many infographics get produced.

### Tier 1 — Piece (1 infographic)

- Lives inside one pillar's sub-area.
- Has a single primary mechanism to explain.
- Examples: "HTTP/2 multiplexing", "JWT pitfalls", "Postgres BRIN indexes", "React fiber reconciler", "Token bucket rate limiting".
- Pipeline writes: `infographics/<slug>/spec.md`, `data.json`, `infographic.svg`. No MAP/INDEX.

### Tier 2 — Chapter (series, 3–12 pieces)

- Covers one whole pillar or a multi-mechanism feature.
- Examples: "How HTTPS works" (~4–6), "How the internet works" (~8–10), "PostgreSQL internals" (~8–10), "OAuth 2.1 in depth" (~5).
- Pipeline writes: `infographics/<chapter-slug>/INDEX.md` + numbered piece dirs.
- Final piece is always **"putting it together"** — system-diagram tying pieces back.
- Cap **12 pieces per chapter** to protect context + quality.

### Tier 3 — Topic (mega, hierarchical)

- Spans 2+ pillars or a whole role like "senior fullstack".
- Examples: "Become senior fullstack", "End-to-end web request", "Modern data platform", "Production-grade Next.js".
- Pipeline writes:
  - `infographics/<topic-slug>/MAP.md` — master plan listing chapters (no piece-level detail).
  - Auto-runs chapter 01 fully (so the user gets immediate value).
  - Emits a list of continuation commands `/infographic <topic-slug>/<NN-chapter-slug>` for the remaining chapters.
- A mega-topic ends with a master synthesis chapter — `NN-putting-it-together/` whose pieces tie the entire topic together (still subject to the per-chapter 12-piece cap).

### Classification heuristic (used by /infographic)

1. Map the topic onto `curriculum.md` pillars.
2. If touches **1 sub-area** of 1 pillar with one mechanism → **piece**.
3. If touches **1 pillar** as a whole, OR a feature with 3+ mechanisms → **chapter**.
4. If touches **2+ pillars** with depth across each, OR is role-shaped ("become X", "production-grade X") → **topic**.

If the input is `<topic-slug>/<NN-chapter-slug>` (path-shaped), treat as **chapter** and skip classification.

If the input is `<topic-slug>/<NN-chapter-slug>/<NN-piece-slug>`, treat as **piece** and skip classification.

### MAP.md format (topic tier)

```markdown
# <Topic Title>

**Tier**: topic
**Audience**: middle+/senior fullstack engineer
**Pillars covered**: <pillar names>

## Chapters

| # | Slug | Title | Pillar | Why it's here |
|---|------|-------|--------|---------------|
| 01 | <chapter-slug> | ... | <pillar> | ... |
| 02 | ... | | | |
| ... | | | | |
| NN | putting-it-together | ... | synthesis | Ties the whole topic. |

## How to continue

The first chapter has been rendered. To render the rest, run each on its own:

\`\`\`
/infographic <topic-slug>/02-<chapter-slug>
/infographic <topic-slug>/03-<chapter-slug>
...
\`\`\`
```

### Forbidden upsizing / downsizing

- Don't promote a narrow piece into a chapter to look impressive. If one diagram can carry it, ship one diagram.
- Don't compress a real mega-topic into a single chapter — flat 12 pieces lose structure. Use the hierarchy.
- Each tier must end with its own synthesis: piece doesn't need one, chapter ends with "putting it together", topic ends with a synthesis chapter.

## Forbidden simplifications

- "It just works" — explain *why* it works.
- "It's the same as X but better" — explain the gap, not the analogy.
- Stock metaphors without the underlying mechanism (no "highway / cars" without packets).
- Diagrams that show *what* without *when* or *cost*.
