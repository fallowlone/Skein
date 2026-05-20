# Tier → Single-Level Lessons Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all 16 curriculum pillars from the 3-tier `book/` model to single-level connected `lessons` (open-atlas Model A), retiring the 3-tier model entirely.

**Architecture:** Pillar → Track, Piece → Unit, Tier → N single-level lessons. Reuse the existing `tracks`/`units`/`lessons` content collections. Phase A adds infra non-destructively; Phase B migrates the 51 authored pieces per-pillar; Phase C converts 81 stubs; Phase D removes the dead 3-tier model. The build stays green throughout.

**Tech Stack:** Astro 5, Preact, MDX, Zod content collections, TypeScript, Vitest, bun.

**Spec:** `docs/superpowers/specs/2026-05-19-tier-to-single-level-migration-design.md`

---

## Progress dashboard

- [x] **Phase A** — additive infra — COMPLETE (2026-05-19). Build 1977 pages, lint 0/0, 66 migration tests pass.
  - [x] A1 16 tracks `9437c70` · A2 lessons schema `3889476` · A3 topic skeleton `e6fb26b`
  - [x] A4 connections-index `315b798` · A5 connected-lessons `1e085e2` · A6 checkTopicLesson `b86bc06`
  - [x] A7 connection-integrity `2d7a902` · A8 /infographic `bf07038` · A9 routes already generic · A10 gate passed
- [ ] **Phase B** — content migration (33/51 units done — networking 12/12, browser 8/8, databases 8/8, observability 5/8) ← **RESUME HERE: observability/06-trace-propagation**
- [ ] **Phase C** — stub conversion (81 stub units)
- [ ] **Phase D** — teardown

**Carry-forward facts:**
- Data files: `site/src/content/tracks.json`, `site/src/content/units.json` (NOT under `lessons/`). `Track` enum derived from `TRACKS` in `site/src/types/index.ts`.
- Section sentinel: `data-lesson-section="<kebab>"`; `topic` sections = `hook,crux,explanation,key-takeaway,recap`. Detector `sectionIndexes()` in `lessons.ts`.
- Topic scaffold: `site/scaffolds/topic-lesson.mdx`. Lesson layout: `site/src/layouts/Lesson.astro`. Block component: `site/src/components/lesson/ConnectedLessons.astro`.
- `/infographic <track>/<unit>` authors topic lessons (`.claude/commands/infographic.md`) — the Phase B per-unit pipeline.
- Connection refs: `<track>/<unit>/<slug>`, or `<unit>/<slug>` (same track), or bare (same unit). Validated by the `connection-integrity` rule.
- **Phase D / D1 note:** `checkTopicLesson` reuses `EXERCISE_COMPONENTS` from `exercise-counts.ts` — D1 deletes that file, so first move `EXERCISE_COMPONENTS` to a shared module.
- **Follow-up:** `ConnectedLessons.astro` was built from the spec, not the uncommitted `lesson-preview.astro` prototype — reconcile visuals when previews wire to real data.

Update this dashboard as work lands so any chat can resume.

---

## File structure

**Created:**
- `site/src/scripts/connections-index.ts` — build-time resolver for the 4 connection relations (pure, unit-tested).
- `site/src/scripts/connections-index.test.ts` — its tests.
- `site/src/components/lesson/Explanation.astro` — topic-skeleton section wrapper.
- `site/src/components/lesson/ConnectedLessons.astro` — renders the 4-relation block.
- `site/src/lint/rules/connection-integrity.ts` + `.test.ts` — dangling-reference rule.
- `site/scaffolds/topic-lesson.mdx` — topic lesson scaffold (replaces `3-tier-piece.mdx`).
- `site/src/content/lessons/{en,ru}/<pillar>/<unit>/<lesson>/index.mdx` — the migrated lessons.

**Modified:**
- `site/src/content/config.ts` — `Track` enum +16; `lessons` schema +`level`/`deepensInto`/`spiral`; `lessonType` +`topic`.
- `site/src/content/lessons/tracks.json` — +16 track entries.
- `site/src/content/lessons/units.json` — +132 unit entries (filled across B and C).
- `site/src/lint/rules/lessons.ts` — `checkTopicLesson` branch.
- `site/src/lint/index.ts` — wire `connection-integrity`.
- The lesson layout (used by `site/src/pages/[lang]/learn/[track]/[lesson].astro`) — render `ConnectedLessons`.
- `.claude/commands/infographic.md` — rework to author `topic` lessons.

**Deleted (Phase D):** `book`/`pillars`/`chapters` collections + data, piece routes, `TierAccordion.astro`, `3-tier-piece.mdx`, piece-only lint rules.

---

## Phase A — additive infra

`book/` and all its rules/routes stay intact through Phase A. Gate after every task: `cd site && bun run build` ends with lint errors 0, warnings 0.

### Task A1: Add 16 tracks

**Files:** Modify `site/src/content/config.ts`, `site/src/content/lessons/tracks.json`.

- [ ] **Step 1:** In `config.ts`, find the `Track` `z.enum([...])` (currently `"math","base-cs","algorithms"`). Add the 16 pillar slugs: `networking, browser, frontend, backend, apis, databases, caching, queues, distributed, security, observability, deployment, performance, data-engineering, ai-llm, engineering-practice`.
- [ ] **Step 2:** Check the `tracks` collection `color` field. If it is a `z.enum`, read the 16 `site/src/content/pillars/*.json` `color` values; add any color not already in the enum.
- [ ] **Step 3:** For each `site/src/content/pillars/<NN>-<slug>.json`, append a `tracks.json` entry: `{ slug, order: 3 + pillar.order, title, blurb, color }` (pillar `title`/`blurb` are already `{en,ru}`).
- [ ] **Step 4:** Run `cd site && bun run build`. Expected: build green, lint 0/0, collections parse.
- [ ] **Step 5:** Commit: `git add site/src/content/config.ts site/src/content/lessons/tracks.json && git commit -m "feat(migration): register 16 pillar tracks"`

### Task A2: Extend the lessons schema

**Files:** Modify `site/src/content/config.ts`.

- [ ] **Step 1:** In the `lessons` collection schema add: `level: z.enum(["zero","junior","middle","senior"]).optional()`, `deepensInto: z.array(z.string()).default([])`, `spiral: z.array(z.string()).default([])`.
- [ ] **Step 2:** Extend `lessonType` to `z.enum(["concept","coding","topic"]).optional()`.
- [ ] **Step 3:** Run `cd site && bun run build`. Expected: green, existing foundations lessons still parse (new fields optional).
- [ ] **Step 4:** Commit: `git commit -am "feat(migration): lessons schema gains level/deepensInto/spiral, lessonType topic"`

### Task A3: Topic lesson skeleton + linter sentinels

**Files:** Read `site/src/components/lesson/Hook.astro`, `Recap.astro` for the section-sentinel pattern. Create `site/src/components/lesson/Explanation.astro`. Modify `Crux.astro`, `KeyTakeaway.astro` (in `site/src/components/prose/`). Create `site/scaffolds/topic-lesson.mdx`.

- [ ] **Step 1:** Read `Hook.astro` + `Recap.astro` — identify how a section sentinel is emitted (the math/base-cs linter greps section markers in HTML; find the exact attribute, e.g. `data-lesson-section` or an `id`).
- [ ] **Step 2:** Create `Explanation.astro` — a wrapper emitting the `explanation` section sentinel, same pattern as `Hook.astro`.
- [ ] **Step 3:** Ensure `Crux.astro` and `KeyTakeaway.astro` root elements also emit the section sentinel (`crux`, `key-takeaway`). Add the attribute if absent — do not change their existing `data-budget` behaviour.
- [ ] **Step 4:** Create `site/scaffolds/topic-lesson.mdx` — frontmatter (`lessonType: topic`, `level`, `track`, `unit`, `order`, `prereqs`, `deepensInto`, `spiral`, `sources`) + body skeleton: `Hook → Crux → Explanation (with ≥1 Visual) → exercises + Inset → KeyTakeaway → RetrievalDrawer → Recap`. Imports via the `~/` alias.
- [ ] **Step 5:** Run `cd site && bun run build`. Expected: green.
- [ ] **Step 6:** Commit: `git commit -am "feat(migration): topic lesson skeleton + section sentinels"`

### Task A4: connections-index (TDD)

**Files:** Create `site/src/scripts/connections-index.ts`, `site/src/scripts/connections-index.test.ts`. Model: `site/src/scripts/glossary-index.ts`.

- [ ] **Step 1: Write failing tests.** In `connections-index.test.ts`, test a pure `resolveConnections(lessons)` taking `{slug,track,unit,order,level,prereqs,deepensInto,spiral}[]` and returning per-lesson `{buildsOn,unlocks,deepensInto,appearsAgainIn}`:
  - `buildsOn` = the lesson's `prereqs`.
  - `unlocks` = lessons whose `prereqs` include this slug.
  - `deepensInto` = explicit `deepensInto`; if empty, the next-higher-`level` lessons in the same unit.
  - `appearsAgainIn` = lessons in *other* tracks sharing ≥1 `spiral` tag.
- [ ] **Step 2:** Run `cd site && bunx vitest run src/scripts/connections-index.test.ts`. Expected: FAIL (function not defined).
- [ ] **Step 3:** Implement `resolveConnections` in `connections-index.ts` — pure, no I/O.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit: `git add site/src/scripts/connections-index.ts site/src/scripts/connections-index.test.ts && git commit -m "feat(migration): connections-index relation resolver"`

### Task A5: Render the connected-lessons block

**Files:** Read `site/src/pages/lesson-preview.astro` for the 4-relation markup. Create `site/src/components/lesson/ConnectedLessons.astro`. Modify the lesson layout used by `site/src/pages/[lang]/learn/[track]/[lesson].astro`.

- [ ] **Step 1:** Port the "Connected lessons" markup from `lesson-preview.astro` into `ConnectedLessons.astro`, props = the resolved connection object + resolver for lesson titles/levels.
- [ ] **Step 2:** In the lesson layout, call `resolveConnections` over `getCollection("lessons")` at build time and render `ConnectedLessons` for `lessonType: topic` lessons.
- [ ] **Step 3:** Run `cd site && bun run build`. Expected: green; foundations lessons unaffected.
- [ ] **Step 4:** Commit: `git commit -am "feat(migration): connected-lessons block on topic lessons"`

### Task A6: checkTopicLesson linter branch (TDD)

**Files:** Modify `site/src/lint/rules/lessons.ts`, `site/src/lint/rules/lessons.test.ts`.

- [ ] **Step 1: Write failing tests.** `checkTopicLesson` flags: missing required section (`hook`, `crux`, `explanation`, `key-takeaway`, `recap`); 0 `data-lesson-visual`; <2 exercise widgets; ≠1 RetrievalDrawer; >5 hydration islands. Route lessons with `lessonType: topic` (or a fullstack track) to it.
- [ ] **Step 2:** Run `cd site && bunx vitest run src/lint/rules/lessons.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `checkTopicLesson` and the routing branch in `lessons.ts`.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit: `git commit -am "feat(migration): checkTopicLesson lint branch"`

### Task A7: connection-integrity linter rule (TDD)

**Files:** Create `site/src/lint/rules/connection-integrity.ts`, `.test.ts`. Modify `site/src/lint/index.ts`.

- [ ] **Step 1: Write failing tests.** The rule scans all lessons; every `prereqs` and `deepensInto` slug must resolve to an existing lesson. A dangling slug → error.
- [ ] **Step 2:** Run `cd site && bunx vitest run src/lint/rules/connection-integrity.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the rule (source-level scan, like `checkLessonParity`). Wire it into `lint/index.ts` after the per-file loop.
- [ ] **Step 4:** Run the test, then `bun run build`. Expected: PASS, build green.
- [ ] **Step 5:** Commit: `git add site/src/lint/rules/connection-integrity.ts site/src/lint/rules/connection-integrity.test.ts site/src/lint/index.ts && git commit -m "feat(migration): connection-integrity lint rule"`

### Task A8: Rework /infographic

**Files:** Modify `.claude/commands/infographic.md`.

- [ ] **Step 1:** Rewrite the command: input `/infographic <track>/<unit>`; pipeline = verify unit in `units.json` → research (WebSearch + Context7) → author the unit's N EN `topic` lessons from `site/scaffolds/topic-lesson.mdx` → translate RU → `bun run build` lint gate → commit. Drop the 3-tier scaffold, tier word budgets, per-tier exercise mix. Keep bilingual-or-refuse, domain lock, text budgets, ≤5 island cap, status flow.
- [ ] **Step 2:** Commit: `git commit -am "feat(migration): /infographic authors topic lessons"`

### Task A9: Verify routing

**Files:** Read `site/src/pages/[lang]/learn/[track]/[lesson].astro` and `[lang]/learn/[track]/index.astro`.

- [ ] **Step 1:** Confirm `[lesson].astro` `getStaticPaths` is collection-generic (iterates `getCollection("lessons")`) — it then serves the 16 new tracks with no change. Confirm the track index lists units generically from the `units` collection. Patch any foundations-only hardcoding.
- [ ] **Step 2:** Run `cd site && bun run build`. Expected: green.
- [ ] **Step 3:** Commit if changed: `git commit -am "fix(migration): lesson routes cover fullstack tracks"`

### Task A10: Phase A gate

- [ ] **Step 1:** Run `cd site && bun run build`. Expected: lint errors 0, warnings 0.
- [ ] **Step 2:** Run `cd site && bunx vitest run src/scripts/connections-index.test.ts src/lint/rules/lessons.test.ts src/lint/rules/connection-integrity.test.ts`. Expected: PASS. (The 3 pre-existing failures in user-state / exercise-counts are unrelated — ignore.)
- [ ] **Step 3:** Tick the Phase A dashboard box. Update `docs/open-atlas/HANDOFF.md`: queue item 1 in progress, Phase A done.

---

## Phase B — content migration

Migrate one pillar fully before starting the next. Order: **networking → browser → databases → observability → performance → lone ready pieces.**

### Procedure (per unit)

1. **Cut plan.** Read `site/src/content/book/{en,ru}/<pillar>/<unit>/index.mdx`. Across the 3 tiers, identify the distinct subtopics. Decide the split — junior tier → 1 lesson; middle/senior tiers → 2-4 lessons each, cut at idea boundaries. For each lesson fix: `slug`, `level`, `title`, the source tier + subtopic it draws from. **Append the enumerated lessons as sub-checkboxes under the unit in the checklist below** before authoring.
2. **Unit entry.** Add the unit to `units.json`: `{ slug, track: <pillar>, order, title{en,ru}, crux{en,ru} }` (title/crux ported from the piece title/summary). `lessons: []` for now.
3. **Author EN lessons.** For each planned lesson, write `site/src/content/lessons/en/<pillar>/<unit>/<lesson>/index.mdx` from `site/scaffolds/topic-lesson.mdx`. Reuse the source piece's prose, diagrams, and exercises for that subtopic/level — recut, do not rewrite from scratch. Set `level`, `prereqs`, `deepensInto`, `spiral`.
4. **Translate RU.** Mirror each lesson into `site/src/content/lessons/ru/...`, using `site/src/i18n/glossary.json`.
5. **Fill** the unit's `lessons: []` in `units.json` (lesson slugs, junior→senior order).
6. **Build gate.** `cd site && bun run build` — lint 0/0.
7. **Delete the source piece** — `git rm -r site/src/content/book/{en,ru}/<pillar>/<unit>/`.
8. **Commit** per unit: `content(<pillar>): migrate <unit> to N lessons EN+RU`.

Offload research + authoring + translation to subagents. After each unit, tick its checkbox.

### Checklist — 5 ready pillars (44 units)

**networking**
- [x] 01-physical-link → 6 lessons, commit `2a33e06`
- [x] 02-ip-packet → 6 lessons, commit `6fdb4c6`
  - [x] 01-the-ip-envelope (junior) — what IP does, postal metaphor, hop-by-hop routing, IPv4 vs IPv6 basics
  - [x] 02-reading-the-ip-header (middle) — IPv4/IPv6 header fields, TTL, protocol field, checksum, DSCP/ECN
  - [x] 03-routing-and-forwarding (middle) — routing table vs FIB, CIDR, BGP basics, ECMP, longest-prefix match
  - [x] 04-mtu-and-fragmentation (middle) — MTU, fragmentation, PMTUD black holes, MSS clamping
  - [x] 05-nat-and-addressing (middle) — NAT, CGNAT, private RFC 1918, IPv6/SLAAC, anycast, dual-stack
  - [x] 06-ip-security-and-operations (senior) — IP spoofing/BCP38, BGP hijacks/RPKI, DDoS, operational tools
- [x] 03-tcp-handshake → 6 lessons, commit `c874633`
  - [x] 01-the-three-way-handshake (junior) — what TCP does, phone metaphor, SYN/SYN-ACK/ACK dialogue with seq numbers, scenario end-to-end
  - [x] 02-sequence-numbers-and-state (middle) — exact seq arithmetic, ISN randomisation, state machine (CLOSED→SYN-SENT→ESTABLISHED), 1-RTT cost, FIN/TIME-WAIT basics
  - [x] 03-flow-and-congestion-control (middle) — sliding window, MSS/window-scaling/SACK, slow start + congestion avoidance (Reno/CUBIC), retransmit timer RFC 6298, RACK-TLP
  - [x] 04-tcp-options-and-pathologies (middle) — TCP header anatomy, Nagle+delayed-ACK stall, PSH, ECN, keepalive, CLOSE-WAIT trap
  - [x] 05-syn-cookies-and-tfo (senior) — SYN cookies internals, TCP Fast Open, TIME-WAIT exhaustion, Linux tunables
  - [x] 06-bbr-and-production-ops (senior) — BBR vs CUBIC vs Reno, production observability (ss/tcpdump/nstat), RST semantics, MPTCP, kTLS, QUIC relationship
- [x] 04-dns-resolution → 5 lessons, commit `b41167a`
  - [x] 01-dns-what-it-does (junior) — what DNS does, 3-level hierarchy metaphor, resolution dialogue, TTL intro
  - [x] 02-the-resolver-walk (middle) — iterative vs recursive, glue records, EDNS0, record types, zone transfers, stub vs full
  - [x] 03-ttl-and-caching (middle) — TTL semantics, propagation myth, migration SOP, negative caching, SOA, browser cache
  - [x] 04-dnssec-chain-of-trust (senior) — ZSK/KSK/DS/RRSIG chain, KSK rollover failure mode, NSEC/NSEC3, CA/B Forum 2026
  - [x] 05-encrypted-dns (senior) — DoH/DoT/DoQ, ECS privacy tradeoff, Kaminsky + SAD DNS, anycast resolvers
- [x] 05-tls-handshake → 5 lessons, commit `3353335`
  - [x] 01-what-tls-does (junior) — sealed-envelope metaphor, why TLS exists, end-to-end scenario, padlock guarantee
  - [x] 02-the-1rtt-handshake (middle) — 1-RTT ClientHello/ServerHello, key shares, ECDHE math, certificate chain validation, transcript hash + Finished
  - [x] 03-session-resumption-and-0rtt (middle) — PSK NewSessionTicket, warm resumption, 0-RTT early data, replay risk, 425 Too Early
  - [x] 04-key-schedule-and-extensions (senior) — HKDF key schedule tree, SNI/ALPN/HelloRetryRequest, cipher-suite split, OCSP stapling, CRLite, NewSessionTicket lifecycle
  - [x] 05-0rtt-defenses-and-modern-tls (senior) — production 0-RTT replay defenses, STEK rotation, ECH (RFC 9849), hybrid PQ (X25519MLKEM768), kTLS offload, observability, CVEs
- [ ] 06-http-versions  - [ ] 07-cdn-edge  - [ ] 08-websocket-realtime
- [ ] 09-proxy-load-balancing  - [ ] 10-quic-internals  - [ ] 11-network-security  - [ ] 12-putting-it-together

**browser**
- [ ] 01-event-loop  - [ ] 02-render-pipeline  - [ ] 03-v8-internals  - [ ] 04-workers
- [ ] 05-react-fiber  - [ ] 06-ssr-vs-ssg  - [ ] 07-core-web-vitals  - [ ] 08-putting-it-together

**databases**
- [x] 01-relational-model → 7 lessons, commit `18e901f`
  - [x] 01-what-a-relation-is (junior)
  - [x] 02-constraints-and-keys (middle)
  - [x] 03-normalization (middle)
  - [x] 04-jsonb-and-arrays (middle)
  - [x] 05-heap-and-toast (senior)
  - [x] 06-schema-integrity (senior)
  - [x] 07-relational-vs-alternatives (senior)
- [x] 02-indexes → 7 lessons, commit `e059e4d`
  - [x] 01-index-anatomy (junior)
  - [x] 02-leading-column-rule (middle)
  - [x] 03-partial-expression-covering (middle)
  - [x] 04-index-types (middle)
  - [x] 05-index-only-scans-and-visibility (senior)
  - [x] 06-production-failures-and-audit (senior)
  - [x] 07-index-design-exercise (senior)
- [x] 03-execution-plans → 7 lessons, commit `31f7068`
  - [x] 01-explain-and-plans (junior)
  - [x] 02-scan-types (middle)
  - [x] 03-join-algorithms (middle)
  - [x] 04-statistics-and-analyze (middle)
  - [x] 05-extended-statistics (senior)
  - [x] 06-plan-cache-and-tuning (senior)
  - [x] 07-plan-stability (senior)
- [x] 04-mvcc-isolation → 7 lessons, commit `14bea1e`
  - [x] 01-mvcc-basics (junior)
  - [x] 02-row-versions-and-snapshots (middle)
  - [x] 03-hot-updates-and-isolation-levels (middle)
  - [x] 04-vacuum-and-bloat (middle)
  - [x] 05-clog-xid-wraparound-and-multixact (senior)
  - [x] 06-ssi-and-production-tuning (senior)
  - [x] 07-real-world-failures-and-distributed (senior)
- [x] 05-pooling → 7 lessons, commit `a97c636`
  - [x] 01-why-pools-exist (junior)
  - [x] 02-pgbouncer-modes (middle)
  - [x] 03-pool-sizing-math (middle)
  - [x] 04-pool-exhaustion-and-idle-in-transaction (middle)
  - [x] 05-transaction-mode-migration (middle)
  - [x] 06-postgres-process-model (senior)
  - [x] 07-pooler-landscape-and-failure-modes (senior)
- [x] 06-migrations → 7 lessons, commit `a40c261`
  - [x] 01-what-a-migration-is (junior)
  - [x] 02-add-column-safely (junior)
  - [x] 03-lock-queue-incident (middle)
  - [x] 04-safe-ddl-patterns (middle)
  - [x] 05-expand-contract (middle)
  - [x] 06-advisory-lock-and-tooling (senior)
  - [x] 07-migration-failure-taxonomy (senior)
- [x] 07-sharding → 7 lessons, commit `9b312c6` (reconcile after subagent timeout)
  - [x] 01-why-sharding-exists (junior)
  - [x] 02-shard-key-selection (middle)
  - [x] 03-partitioning-vs-sharding (middle)
  - [x] 04-colocation-and-citus (middle)
  - [x] 05-hot-shard-failure (middle)
  - [x] 06-schema-based-and-alternatives (senior)
  - [x] 07-resharding-and-operations (senior)
- [x] 08-putting-it-together → 5 lessons, commit `96a6e3e`
  - [x] 01-the-seven-acts (junior)
  - [x] 02-schema-indexes-plans (middle)
  - [x] 03-mvcc-pool-migrations (middle)
  - [x] 04-sharding-and-tradeoffs (middle)
  - [x] 05-observability-and-triage (senior)

**observability**
- [x] 01-three-pillars → 7 lessons, commit `bab8544`
  - [x] 01-what-the-three-signals-are (junior)
  - [x] 02-metrics-and-cardinality (middle)
  - [x] 03-logs-and-volume (middle)
  - [x] 04-traces-and-sampling (middle)
  - [x] 05-join-keys-and-exemplars (middle)
  - [x] 06-observability-2-0 (senior)
  - [x] 07-failure-modes-and-practice (senior)
- [x] 02-structured-logging → 7 lessons, commit `0b87822` (reconcile after subagent timeout)
  - [x] 01-why-structured-logs (junior)
  - [x] 02-log-schema (middle)
  - [x] 03-levels-and-routing (middle)
  - [x] 04-sampling-and-cost (middle)
  - [x] 05-pii-redaction (senior)
  - [x] 06-trace-context-in-logs (senior)
  - [x] 07-otel-model-and-audit (senior)
- [x] 03-otel → 7 lessons, commit `390c82c`
  - [x] 01-what-is-otel (junior)
  - [x] 02-signals-and-wire-format (middle)
  - [x] 03-auto-and-manual-instrumentation (middle)
  - [x] 04-collector-pipeline (middle)
  - [x] 05-sampling-strategies (middle)
  - [x] 06-vendor-neutrality-and-advanced (senior)
  - [x] 07-collector-operations (senior)
- [x] 04-red-use → 6 lessons, commit `bd8b2ce` (1j/5m/0s — no senior, accepted)
  - [x] 01-red-and-use-overview (junior)
  - [x] 02-red-instrumentation (middle)
  - [x] 03-use-on-linux (middle)
  - [x] 04-golden-signals-and-dashboards (middle)
  - [x] 05-cardinality-and-cost (middle)
  - [x] 06-histograms-slo-and-advanced (middle)
- [x] 05-slo-budgets → 8 lessons, commit `24ac6a3`
  - [x] 01-sli-slo-budget-basics (junior)
  - [x] 02-sli-selection-and-slo-targets (middle)
  - [x] 03-mwmbr-alerting (middle)
  - [x] 04-budget-policy-latency-composite (middle)
  - [x] 05-slo-platforms-rollout (middle)
  - [x] 06-low-traffic-burn-math (senior)
  - [x] 07-iceberg-sli-composite-math-sla (senior)
  - [x] 08-production-failures-and-design (senior)
- [ ] 06-trace-propagation  - [ ] 07-profiling  - [ ] 08-putting-it-together

**performance**
- [ ] 01-profile-first  - [ ] 02-hot-paths  - [ ] 03-cache-vs-bigo  - [ ] 04-gc
- [ ] 05-n-plus-one  - [ ] 06-batching  - [ ] 07-bundle-budgets  - [ ] 08-putting-it-together

### Checklist — 7 lone ready pieces

- [ ] apis/06-graphql-n-plus-one  - [ ] backend/05-idempotency-retries  - [ ] caching/03-stampede
- [ ] distributed/02-raft-outline  - [ ] frontend/02-data-fetching  - [ ] queues/01-delivery-guarantees
- [ ] security/02-oauth-oidc

---

## Phase C — stub conversion

The 81 stub pieces carry no real content. Convert each to a unit + one lesson stub.

### Procedure (per stub piece)

1. Add the unit to `units.json` (title/crux from the stub piece frontmatter; `lessons: ["01-overview"]`).
2. Create one lesson stub `site/src/content/lessons/{en,ru}/<pillar>/<unit>/01-overview/index.mdx` — frontmatter only, `status: stub`, `lessonType: topic`, `level: junior`.
3. `git rm -r site/src/content/book/{en,ru}/<pillar>/<unit>/`.
4. Build gate `cd site && bun run build` — lint 0/0 (the lessons linter skips `status: stub`).
5. Commit per pillar batch: `content(<pillar>): stub units migrated to lesson model`.

### Checklist — 81 stub units (by pillar)

- [ ] **ai-llm** (8): 01-prompt-caching, 02-tool-calls, 03-rag-architecture, 04-streaming, 05-cost-budgets, 06-agents, 07-evals, 08-putting-it-together
- [ ] **data-engineering** (8): 01-oltp-vs-olap, 02-elt-vs-etl, 03-parquet, 04-materialized-views, 05-event-sourcing, 06-search, 07-vectors, 08-putting-it-together
- [ ] **deployment** (8): 01-image-layers, 02-compose-vs-k8s, 03-k8s-objects, 04-rollout-strategies, 05-iac, 06-lb-levels, 07-secrets-at-deploy, 08-putting-it-together
- [ ] **engineering-practice** (8): 01-tdd-property, 02-contract-testing, 03-code-review, 04-trunk-based, 05-feature-flags, 06-postmortems, 07-on-call, 08-putting-it-together
- [ ] **apis** (7): 01-rest-modeling, 02-status-codes-real, 03-pagination, 04-openapi, 05-grpc-protobuf, 07-rate-limiting, 08-putting-it-together
- [ ] **backend** (7): 01-request-lifecycle, 02-middleware-di, 03-async-blocking, 04-pooling, 06-circuit-breakers, 07-graceful-shutdown, 08-putting-it-together
- [ ] **caching** (7): 01-layers, 02-invalidation, 04-etag, 05-cache-control, 06-swr, 07-dogpile, 08-putting-it-together
- [ ] **distributed** (7): 01-cap-practice, 03-quorum, 04-leader-election, 05-clocks, 06-sagas, 07-retry-amplification, 08-putting-it-together
- [ ] **frontend** (7): 01-state-shape, 03-forms-a11y, 04-tokens, 05-monorepo, 06-code-splitting, 07-build-pipelines, 08-putting-it-together
- [ ] **queues** (7): 02-kafka-partitions, 03-rabbit-exchanges, 04-ordering, 05-outbox, 06-cdc, 07-eventual-ux, 08-putting-it-together
- [ ] **security** (7): 01-owasp-modern, 03-jwt-pitfalls, 04-csrf, 05-password-hashing, 06-secrets, 07-supply-chain, 08-putting-it-together

---

## Phase D — teardown

`book/` is now empty. Remove the dead 3-tier model. Gate: `bun run build` green.

### Task D1: Remove piece-only lint rules

**Files:** Delete `site/src/lint/rules/depth-checkpoints.ts`, `tier-accordion.ts`, `tier-word-budgets.ts`, `exercise-counts.ts` (+ their `.test.ts`). Modify `site/src/lint/index.ts` to unwire them.

- [ ] **Step 1:** Delete the four rule files + tests. Remove their imports/calls from `lint/index.ts`.
- [ ] **Step 2:** Run `cd site && bun run build`. Expected: green.
- [ ] **Step 3:** Commit: `git commit -am "chore(migration): drop piece-only lint rules"`

### Task D2: Remove piece routes and layouts

**Files:** Delete `site/src/pages/[lang]/[pillar]/[piece].astro`, `site/src/pages/[lang]/[pillar]/index.astro`. Delete `site/src/layouts/Topic.astro`, `Chapter.astro` if unused elsewhere (grep first).

- [ ] **Step 1:** Grep for imports of the layouts; delete the routes, and any layout no longer referenced.
- [ ] **Step 2:** Run `cd site && bun run build`. Expected: green.
- [ ] **Step 3:** Commit: `git commit -am "chore(migration): remove 3-tier piece routes"`

### Task D3: Remove the book/pillars/chapters collections

**Files:** Modify `site/src/content/config.ts`. Delete `site/src/content/book/`, `site/src/content/pillars/`, `site/src/content/chapters/`.

- [ ] **Step 1:** Remove the `book`, `pillars`, `chapters` collection definitions from `config.ts`.
- [ ] **Step 2:** `git rm -r site/src/content/book site/src/content/pillars site/src/content/chapters`.
- [ ] **Step 3:** Run `cd site && bun run build`. Expected: green.
- [ ] **Step 4:** Commit: `git commit -am "chore(migration): retire book/pillars/chapters collections"`

### Task D4: Delete TierAccordion and the 3-tier scaffold

**Files:** Delete `site/src/components/pedagogy/TierAccordion.astro`, `site/scaffolds/3-tier-piece.mdx`. Check `site/e2e/tier-persist.spec.ts`.

- [ ] **Step 1:** Grep for `TierAccordion` — confirm no remaining importers. Delete the component + scaffold. Delete or rewrite `tier-persist.spec.ts`.
- [ ] **Step 2:** Run `cd site && bun run build`. Expected: green.
- [ ] **Step 3:** Commit: `git commit -am "chore(migration): delete TierAccordion + 3-tier scaffold"`

### Task D5: Phase D gate

- [ ] **Step 1:** Run `cd site && bun run build`. Expected: 16 tracks of lessons render, lint errors 0 warnings 0, no `book/` pages.
- [ ] **Step 2:** Grep the repo for stale references: `book/`, `TierAccordion`, `pillars`, `chapters`, `depth.mechanism`. Fix any.
- [ ] **Step 3:** Update `docs/open-atlas/HANDOFF.md`: move queue item 1 to "Built so far"; record the new content model.
- [ ] **Step 4:** Commit: `git commit -am "docs(open-atlas): migration complete — 3-tier model retired"`

---

## Phase B cut plans

Recorded per unit before authoring (Phase B procedure step 1).

### browser/02-render-pipeline → 8 lessons

| # | slug | level | source tier / subtopic |
|---|------|-------|------------------------|
| 01 | the-six-stages | junior | junior tier — 6 stages, kitchen metaphor, 16.67 ms frame budget; DragOrder, Quiz×2, MetaphorComplete, NumberDrill |
| 02 | stages-and-threads | middle | middle ¶1-3 — six-stage cost table, renderer process model, main-thread bottleneck |
| 03 | invalidation-and-cost | middle | middle — invalidation rule, dirty-bit propagation, per-stage cost amplifiers (RU also: fonts FOIT/FOUT, images/CLS) |
| 04 | compositor-layers | middle | middle — reaching the compositor, implicit layer-promotion rules, overlap, DevTools Layer Borders |
| 05 | devtools-and-frame-lifecycle | middle | middle — reading the Performance flame strip, contain/content-visibility, frame scheduler order, microtasks vs tasks (RU also: reactive frameworks); DragOrder, TraceScenario |
| 06 | layout-thrash | senior | senior — forced synchronous layout, read-then-write loop, batch reads/writes; DebugLog, FadedExample |
| 07 | beginmainframe-and-gpu | senior | senior — BeginMainFrame two-thread handshake, compositor-driven CSS animation, GPU memory cost; TradeoffMatrix, RFCQuiz, Quiz |
| 08 | observability-and-attack-surface | senior | senior — layer squashing, off-main-thread scroll, display locking, LoAF, INP, reduced-motion, full attack surface (RU also: CI testing, real-hw profiling, Web Workers, Service Worker); DesignPrompt, Quiz |

Note: the RU source twin has extra paragraphs absent from EN (fonts, images, reactive frameworks, CI, Workers, Service Worker). The authoring agent should backfill EN to match or keep RU's extra depth — do not silently drop it.

## Self-review notes

- **Spec coverage:** §3 taxonomy → A1 + B/C unit entries; §4 schema → A2; §5 skeleton → A3; §6 components → A3 + D4; §7 connections → A4/A5/A7; §8 linter → A6/A7/D1; §9 /infographic → A8; §10 routing → A9/D2; §11 phasing → Phase A/B/C/D; §13 non-goals respected (no zero content, no spine reorg, no ascent-scene wiring). All covered.
- **Variable N:** Phase B cut plan enumerates each unit's lessons as sub-checkboxes before authoring — keeps resumability.
- **Build-green:** Phase A additive; B deletes a piece only after its lessons exist + build passes; D teardown of empty `book/`.
- **Open risk:** the lesson layout path is not yet confirmed — A5/A9 locate it by reading the `[lesson].astro` route.
