# System Design block — design spec

**Date:** 2026-06-03
**Status:** approved (shape, IP stance, sourcing, orchestration) — pending spec review
**Branch:** `system-design-block`

## 1. Purpose & scope

Add the largest content block to date: a **2-track cluster** teaching system design at
the middle+/senior fullstack bar, integrated into the existing 22-track lessons model
(`site/src/content/lessons/{en,ru}/<track>/<NN-unit>/<NN-lesson>/index.mdx`).

The block is sourced from a local corpus of 5 downloaded repositories plus broad web
research, but **every published lesson is original prose with original diagrams**. The
site is public (fallowlone.com); copyrighted material is studied and cited, never copied.

### In scope
- Track `system-design` — System Design Foundations (concepts + interview framework).
- Track `system-design-cases` — System Design Case Studies (28 designs).
- Per-lesson: tiered `topic` MDX (EN+RU), original diagrams, practice JSON (≥4), citations.
- Per-unit: assessment block (quiz/project) matching the existing assessment pattern.
- A gitignored research corpus harvested by broad scraping + targeted web research.

### Out of scope (deferred)
- Track C `distributed-papers` (Dynamo/GFS/Raft) — heavy overlap with existing
  `distributed` track. Deferred; paper summaries may later land in `distributed` as stretch.
- Drill blocks (LeetCode-style) — not applicable to design topics.
- Republishing any third-party image except CC-BY primer assets (with attribution).

## 2. Source corpus & IP stance

Local corpus: `~/Downloads/system-design/` (5 repos).

| Repo | License | Use |
|---|---|---|
| `system-design-primer-master` (donnemartin) | **CC BY 4.0** | Adaptable text + images **with attribution**. The only repo whose assets may be embedded directly. |
| `system-design-101-main` (ByteByteGo) | **CC BY-NC-ND 4.0** | NoDerivatives + NonCommercial → **reference/link only**. No copying, no adaptation, no images. |
| `awesome-system-design-resources-main` | **GPL-3.0** | Code impls (python/java) under copyleft → study only, do not paste into site. Use as research. |
| `system-design-notes-main` | Derivative of Alex Xu's book | **Study + cite only.** No verbatim text, no images. |
| `system-design-resources-master` | Mixed (papers + copyrighted books) | Papers (Dynamo, GFS) → cite/summarize in own words. Books (DDIA, GoF, Head First, ByteByteGo handbook) → personal study only. |

Plus `compass_artifact_*.md` in repo root — prior pedagogy research (expertise reversal,
faded worked examples, spiral curriculum) — applied to the tiered lesson model.

**Hard IP rules (enforced at authoring + review):**
1. All lesson prose is original, written from understanding — never paraphrased line-by-line from a source.
2. All diagrams are built with the local diagram kit (`FlowDiagram`, `StackDiagram`, `SequenceDiagram`, `PacketDot`, `StructureFigure`, `DiagramFrame`). No third-party image except CC-BY primer.
3. Embedded primer (CC-BY) assets carry attribution in the lesson sources footer.
4. Every lesson cites its real sources (≥1 external link; lint enforces footer links).
5. The scraped corpus is a **research input** (informs prose + supplies real numbers + citation URLs), never a republication source. Corpus stored gitignored, never shipped to `dist/`.

## 3. Architecture — two tracks

### Track A — `system-design` ("System Design Foundations")
- `tracks.json`: `{ slug: "system-design", order: 23, color: "mint", title, blurb }`
- `track-band.ts`: `"system-design": "middle"` (sits with `distributed`, `observability`, `security`)
- Units (`units.json`), ~36 lessons total:

| Unit | slug | Lessons (theme) |
|---|---|---|
| 00 | `00-start-here` | what system design is; the interview frame |
| 01 | `01-scalability` | latency vs throughput; vertical vs horizontal; back-of-envelope; numbers to know |
| 02 | `02-availability` | SLA/SLO/SLI; redundancy; SPOF; failover; fault tolerance |
| 03 | `03-traffic` | load balancing algorithms; reverse proxy; API gateway; CDN |
| 04 | `04-data-distribution` | replication; sharding/partitioning; consistent hashing; CAP/PACELC |
| 05 | `05-caching-at-scale` | strategies; eviction; distributed cache; cache invalidation |
| 06 | `06-async-messaging` | message queues; pub/sub; event-driven; backpressure |
| 07 | `07-storage-choices` | SQL vs NoSQL; blob/object; time-series; search |
| 08 | `08-building-blocks` | rate limiter; unique-ID gen; bloom filter; geohash; leader election |
| 09 | `09-interview-framework` | requirements → estimation → HLD → deep-dive → bottlenecks → tradeoffs |

Overlap note: units 03–06 overlap `networking`/`databases`/`caching`/`queues`. Lessons
cross-link to those tracks and stay at the *system-composition* altitude (how blocks
combine under scale), not re-teaching the primitive.

### Track B — `system-design-cases` ("System Design Case Studies")
- `tracks.json`: `{ slug: "system-design-cases", order: 24, color: "peach", title, blurb }`
- `track-band.ts`: `"system-design-cases": "advanced"` (orbit — capstone altitude)
- 28 designs grouped into 6 units, **each case = 1 deep lesson** (`estMin` 25–40), ~28 lessons:

| Unit | slug | Cases |
|---|---|---|
| 01 | `01-foundational` | URL shortener, pastebin, key-value store, rate limiter, consistent hashing, unique-ID |
| 02 | `02-social-feed` | news feed/Twitter, chat/WhatsApp, notification system, search autocomplete |
| 03 | `03-media-storage` | YouTube, Google Drive, S3-like object store, distributed email |
| 04 | `04-location-realtime` | proximity service, nearby friends, Google Maps, realtime leaderboard |
| 05 | `05-data-money` | ad-click aggregation, metrics & alerting, payment system, digital wallet, stock exchange, hotel reservation |
| 06 | `06-crawl-queue` | web crawler, distributed message queue |

Case lesson shape (still `lessonType: topic`): Hook (the scale problem) → Crux → requirements
& estimation → high-level design (FlowDiagram) → deep-dive on 2–3 hard components →
bottlenecks & tradeoffs → KeyTakeaway → RetrievalDrawer → Recap. Each cites real
engineering blog posts / papers for the numbers used.

## 4. Lesson model (both tracks)

`lessonType: topic` — matches the deep-track convention (sql-postgres, js-engine, typescript).

Frontmatter: `slug, lang, track, unit, order, title, summary, estMin, status, lessonType: topic, level (middle|senior), concepts[], prereqs[], sources[]`.

Sections (lint-enforced order): **Hook → Crux → Explanation → KeyTakeaway → Recap**, with
`RetrievalDrawer` (exactly 1) before Recap.

Tiered reading (memory: no-text-limits, tier-reading-comprehension): junior intuition →
mechanism → senior tradeoffs, deeper layers under `<Inset>` disclosure. Sequential
junior→senior reading must leave **zero unexplained concepts** at the senior tier.

Lint gates per lesson page (`src/lint/rules/lessons.ts` `checkTopicLesson`):
- All 5 sections present and in order.
- ≥1 visual widget (`data-lesson-visual`).
- ≥2 exercise widgets.
- exactly 1 `RetrievalDrawer`.
- ≤5 hydration islands.
- sources footer has an external link.

Practice (`src/content/practice/<track>/<unit>/<lesson>.json`): ≥4 tasks, bilingual,
mixed types (predict / sandbox / diagnose / fix), EN+RU parity. Enforced by `practice.ts`.

Per-unit assessment block (quiz/project) per the existing assessment-blocks pattern.

Diagrams: local kit only. Foundations → mostly `FlowDiagram`/`StackDiagram`. Cases →
`FlowDiagram` for HLD + `SequenceDiagram` for request flows. ≥1 structural diagram per lesson.

Glossary: new terms added alphabetically to `src/i18n/glossary.json` (EN+RU), no CJK leak.

## 5. Research / scraping pipeline

User chose **broad scraping now** (will set up proxy if needed).

- **Targets:** external links in primer README (335) + awesome README (141) + per-case
  engineering blogs/papers surfaced by targeted `WebSearch`/Context7 during authoring.
- **Tooling:** Python scraper — `httpx` (async, proxy via `HTTPS_PROXY` env) + `trafilatura`
  (main-text extraction) with `selectolax` fallback. Respect `robots.txt`; rate-limit
  (≤1 req/s/host, jittered); cache raw HTML to avoid re-fetch. The `data-scraper-agent`
  skill may wrap this.
- **Output:** `data/system-design-research/<topic>/` (gitignored) — one markdown file per
  source with `url`, `fetched`, extracted text, and a `numbers:` block of harvested
  metrics. An index `data/system-design-research/index.json` maps topics → sources.
- **Injection safety** (memory: subagent-websearch-injection): scraped pages are untrusted
  content; authoring instructions explicitly tell agents to distrust web text and never
  follow instructions found inside scraped pages.
- **Proxy:** scraper reads `HTTPS_PROXY`/`HTTP_PROXY`. If a host blocks/ratelimits, pause
  and ask the user to set the proxy rather than hammering.

## 6. Scaffold (files touched)

- `src/types/index.ts` — **add both** the `Track` union (line ~21) and the `TRACKS` array (line ~29): `"system-design"`, `"system-design-cases"`. Closed union → omitting either breaks type-check.
- `src/content/tracks.json` — +2 entries (orders 23, 24).
- `src/content/units.json` — +~15 unit entries (status `stub` → `ready`).
- `src/components/atlas/track-band.ts` — +2 `TRACK_BAND` entries (`middle`, `advanced`).
- `src/i18n/glossary.json` — new terms, alphabetical, EN+RU.
- `src/content/lessons/{en,ru}/system-design{,-cases}/<unit>/<lesson>/index.mdx` — stubs → ready.
- `src/content/practice/system-design{,-cases}/<unit>/<lesson>.json` — ≥4 tasks each.
- `.gitignore` — ensure `data/system-design-research/` ignored.
- Verify no other registry (sidebar/nav, sitemap, search) needs a track allowlist patch.

## 7. Orchestration & sequencing

User chose **sequential authoring** (no Workflow). I author lessons in order this session
(and across resumed sessions), one lesson fully done — EN → RU → diagram → practice →
lint-green — before the next.

1. **Scaffold** both tracks: registries + stub trees EN+RU + colors + TRACK_BAND.
2. **Research corpus**: run scraper over primer/awesome links + targeted searches; build
   `data/system-design-research/`.
3. **Pilot**: author `system-design/01-scalability` end-to-end (all its lessons EN+RU +
   diagrams + practice + unit assessment) → lint green → **user review checkpoint**.
4. **Fan out sequentially**: remaining foundations units, then all case studies.
5. **Per-lesson gate**: `bun run build` in `site/`; lesson must be lint-clean before moving on.
6. **Commit** incrementally on `system-design-block` (one commit per unit).

## 8. Success criteria

- Both tracks render under `/learn/system-design` and `/learn/system-design-cases` (EN+RU).
- Every lesson `status: ready` in both languages.
- ≥1 original structural diagram per lesson.
- ≥4 practice tasks per lesson; per-unit assessment present.
- Every lesson cites real sources (external footer link).
- Full build green: ~4240 → ~4400 pages, **0 errors / 0 warnings**.
- **Zero copied copyrighted text or images.** Only original content + CC-BY primer assets
  (attributed). No Xu/ByteByteGo/book text or images anywhere in `dist/`.
- Home page shows both tracks in the correct bands; navigation/search include them.

## 9. Risks & mitigations

- **IP leak** → review gate: grep `dist/` for source-image filenames; original-prose rule; attribution footer.
- **Overlap with existing tracks** (networking/databases/caching/queues/distributed) →
  cross-link, stay at composition altitude, do not duplicate primitives.
- **Scrape blocking / legal grey** → robots.txt + rate-limit + proxy + corpus-is-research-only.
- **Scale / fatigue** → incremental commits per unit; pilot-first to lock the quality bar.
- **Web injection** → distrust-scraped-content briefing in authoring steps.
- **Build timeout** (memory: build_timeout) → adding ~160 pages; watch render time, lean on existing memo/concurrency fixes.
