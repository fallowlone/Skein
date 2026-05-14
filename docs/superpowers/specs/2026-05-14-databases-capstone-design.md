# Databases capstone — design spec (2026-05-14)

**Piece:** `databases/06-databases/08-putting-it-together`
**Status now:** stub
**Status target:** ready (EN + RU)
**Reference piece (template):** `networking/01-networking/08-putting-it-together`

## Intent

Final piece of the databases pillar. Weaves the seven prior pieces (01 relational model, 02 indexes, 03 execution plans, 04 MVCC, 05 pooling, 06 migrations, 07 sharding) into a single end-to-end narrative. Reader leaves with one mental model: *each piece is a stage of growing pain when one product outgrows one Postgres.*

Chapter crux: **"Why your query is slow and why your migration is dangerous."** The capstone resolves both questions by walking the cumulative answer.

## Pedagogical shape

Approach **A — Linear growth narrative**. Seven acts = seven scale tiers of a fictional SaaS. Each act is one production incident that hits one prior piece's mechanism. Reader sees *when* each lever pays off, *which* skipped lever caused the incident, and the *cumulative cost* of mistakes.

War-story register (per `curriculum.md` depth bar): metrics named, queries shown, postmortem-shaped, never doc-shaped.

## Frontmatter

```yaml
slug: 08-putting-it-together
lang: en  # mirror for ru
pillar: databases
chapter: 06-databases
order: 8
title: "Putting it together: one Postgres from MVP to 1 billion rows"
summary: "Seven prior pieces are seven scale tiers of one growing product. Walk from CREATE TABLE through Citus, naming the exact failure at each tier and the lever that resolves it."
readingMin: 22
status: ready
prereqs: ["01-relational-model","02-indexes","03-execution-plans","04-mvcc-isolation","05-pooling","06-migrations","07-sharding"]
spiral: ["statefulness","latency","multiplexing","encapsulation"]
personas: ["otto","sven"]
depth:
  mechanism: tier-mechanism
  tradeoff: stage-tradeoffs
  failure_mode: m-just-add-index
  numbers: scaling-stage-numbers
sources:
  - https://www.postgresql.org/docs/current/
  - https://wiki.postgresql.org/wiki/Don't_Do_This
  - https://github.blog/2021-08-31-partitioning-githubs-relational-databases-scale/
  - https://docs.citusdata.com/en/stable/
  - https://www.cybertec-postgresql.com/en/postgresql-vacuum-and-bloat/
  - https://www.pgmustard.com/blog/postgres-row-estimates-misleading
```

RU mirror uses identical structure with `lang: ru` and translated title/summary; glossary already locked.

## Body structure

1. **Opening narrative (3-5 sentences).** "Day 0 at a SaaS startup. PM wants email-search across users. One engineer, one Postgres, one table. Three years later: 1B rows, 6 Citus shards. Between those points — seven times something broke."

2. **`<Crux>` (≤140 chars).** *"Seven pieces of this chapter are seven times a product outgrew its database — starting from CREATE TABLE."*

3. **Walk: seven acts.** Prose, ~800-1000 words total. Each act = persona dialog snippet (Otto = DB, Sven = origin app) + one or two operational details. Acts:
   - **Act 1, Day 0** — schema design (piece 01). Question: should `email` be UNIQUE? FK to `orgs`? JSONB for `prefs`? Decision the engineer made and why. Forward-reference: "This decision compounds in Act 6."
   - **Act 2, Week 1, 10K rows** — query slow → add `CREATE INDEX users_email_idx`. Connect to piece 02 leading-column rule. P95 from 800 ms → 4 ms.
   - **Act 3, Month 1, 100K rows** — search occasionally goes seq-scan even with index. EXPLAIN ANALYZE shows wrong row estimate. ANALYZE + extended statistics fix it. Connect to piece 03.
   - **Act 4, Month 6** — nightly report holds a transaction for 4 hours; VACUUM can't reclaim; users table swells from 200 MB to 80 GB. Connect to piece 04 (MVCC / bloat / `xmin` horizon). Fix: kill long-tx, set `idle_in_transaction_session_timeout`.
   - **Act 5, Year 1, 1M users, 50 app-pods** — connection storm. PgBouncer transaction-mode breaks prepared statements. Connect to piece 05 (pool sizing math + 1.21+ named prepared statements).
   - **Act 6, Year 2** — product wants `tenant_id NOT NULL`. Naive `ALTER TABLE ... SET NOT NULL` blocks prod for 8 minutes (full table rewrite). Expand-contract recipe. Connect to piece 06.
   - **Act 7, Year 3, 1B rows** — Acme tenant = 40% load. Hot-shard. Co-location + Citus reshard. Connect to piece 07.

4. **`<TierAccordion id="tier-mechanism">`** — three tiers:
   - **junior** (300-700 words): one metaphor (database as growing city; schema = zoning, indexes = street map, plans = traffic dispatcher, MVCC = lanes, pool = parking, migrations = construction, sharding = annexing suburbs). One concrete scenario summarized. Exercises: 2 `Quiz`, 1 `DragOrder`, 1 `MetaphorComplete`, 1 `RetrievalDrawer`.
   - **middle** (2500-3700 words): full seven-act walk with details, `NumbersCard id="scaling-stage-numbers"` listing thresholds (row count where each lever stops being optional), one `FadedExample` showing online schema change recipe (static, not hydrated), `Misconception id="m-just-add-index"` ("if slow → add index" is the most common skip past pieces 03+04), 2 `Quiz`, 2 `TraceScenario`, 2 `DragOrder`, 1 `RetrievalDrawer`.
   - **senior** (2500-4000 words): cross-cutting synthesis. USE/RED for Postgres (autovacuum lag, replication lag, plan-cache hit, `pg_stat_statements` top-N, `pg_buffercache` hit ratio). Anti-patterns when skipping a stage. RFC/paper level: Citus paper highlights, XID wraparound risk near 2B, observability stack (`pg_stat_statements` + `auto_explain` + `pgaudit` + `pgBadger`). Real-world: GitHub MySQL→Vitess context (mentioned as contrast), GitHub partitioning blog (2021), Notion RDS scaling, Figma Vitess (referenced). Exercises: 1 `TradeoffMatrix id="stage-tradeoffs"`, 2 `TraceScenario`, 1 `DesignPrompt`, 2 `Quiz`, 1 `RetrievalDrawer`.

5. **`<Sandbox>` — new component `DBLeverSandbox.tsx`** (synthesis interactive). Inputs:
   - row count slider (1K → 1B, log scale)
   - workload (read-heavy / write-heavy / mixed)
   - tenant model (single / multi-tenant)
   - dominant symptom (slow query / lock-wait / bloat / connection-storm / hot-shard)

   Output: ranked top-3 levers with one-line "why", each linking to its piece. Pure deterministic decision-table, no fetch, no async. Implementation ~150 lines preact + tailwind, mirroring `RequestBudgetSandbox.tsx`. Decision table (excerpt):
   ```
   1B + multi-tenant + hot-shard      → 07 sharding (co-location)
   ≥100M + slow + read-heavy          → 02 indexes + 03 plan check
   ≥1M + connection-storm             → 05 pooling (transaction mode)
   * + bloat                          → 04 MVCC (long-tx hunt)
   * + lock-wait during ALTER         → 06 migrations (expand-contract)
   ≤10K                               → 01 relational model (schema lock-in cost)
   ```

6. **`<KeyTakeaway>` (≤220 chars).** *"Семь пьес — это семь раз когда продукт ломал базу. Каждое исправление — одна пьеса. Каждая пропущенная пьеса — следующая авария, дороже предыдущей."* (EN mirror under 220).

7. **`<SpiralCue>` × 2-3** linking back to threads: statefulness, latency, multiplexing.

8. **Cross-links footer** — explicit links back to pieces 01-07 in chapter order.

## Hydration budget (≤5)

| Island | # | Note |
|---|---|---|
| `TierAccordion` | 1 | Required |
| `RetrievalDrawer` | 1 | Required by glossary |
| `DBLeverSandbox` | 1 | New synthesis component |
| `SpacedRevisitBanner` | 1 | Baseline sticky |
| `ChapterSidebarTOC` | 1 | Baseline sticky |
| **Total** | **5** | At cap |

`FadedExample` stays static (no `client:`) inside the middle slot. `Misconception`, `NumbersCard`, `TradeoffMatrix`, `TraceScenario`, `Quiz`, `DragOrder`, `MetaphorComplete`, `DesignPrompt` — all Astro components, no hydration.

## New code artifacts

1. `site/src/components/pedagogy/sandboxes/DBLeverSandbox.tsx` — new preact island. ~150 lines. Pattern mirrors `RequestBudgetSandbox.tsx`. Bilingual via `lang` prop.

2. Glossary additions (alphabetical insertion in `site/src/i18n/glossary.json`) for any new EN→RU technical terms introduced. Candidates: "co-location", "connection storm", "expand-contract migration", "hot shard", "lock queue", "row estimate disaster", "transaction-mode pool". Insert only those actually used.

3. Two MDX files:
   - `site/src/content/book/en/databases/08-putting-it-together/index.mdx`
   - `site/src/content/book/ru/databases/08-putting-it-together/index.mdx`

   Both overwrite existing stub.

## Authoring order

1. Author EN MDX in full (frontmatter → walk → tiers → sandbox slot → KeyTakeaway → spiral cues → cross-links).
2. Build `DBLeverSandbox.tsx` component.
3. Compile site, fix any lint errors.
4. Mirror to RU. Translate via glossary; insert new terms alphabetically as encountered.
5. Build again. Verify `dist/lint-report.json` clean.
6. Local visual check both EN and RU.
7. Single commit: `content(databases): 08-putting-it-together EN+RU ready`.

## Linter pass criteria

- Crux ≤ 140 chars
- KeyTakeaway ≤ 220 chars
- Misconception ≤ 320 chars
- Card annotations ≤ 240 chars
- Hydration islands ≤ 5
- Import paths exactly 5 `..` segments
- All four `depth.*` IDs present and resolve to in-body elements
- `prereqs` array contains pieces 01-07
- `personas` array uses only IDs that exist in `personas.json`
- EN ↔ RU parity (same component set, same anchor IDs)
- Sources array length ≥ 4 with real URLs (no `example.com` placeholder)

## Non-goals

- No new persona introduced (`otto` + `sven` reused).
- No changes to chapter index, no changes to prior pieces.
- No new generic pedagogy widget — only the one synthesis sandbox.
- No legacy `infographics/` or `assets/exports/` touched.

## Risks + mitigations

- **Word-count overrun.** Middle tier target 2500-3700w; the seven-act walk plus details can blow past 4000. Mitigation: keep main-body walk to ~900w and push detail into middle/senior tiers; cut Acts 1, 6, 7 first if pressure mounts.
- **Sandbox decision table simplistic.** Decision tree is deterministic; users may expect ML. Mitigation: label sandbox as "first-lever heuristic" in its title; senior tier discusses where the heuristic fails.
- **i18n parity drift.** Easy to add a `<Quiz>` in EN and forget the RU mirror. Mitigation: copy-paste structure, only swap strings; verify exercise count parity in the linter pass.

## References

- Template piece: `site/src/content/book/en/networking/08-putting-it-together/index.mdx`
- Sandbox template: `site/src/components/pedagogy/sandboxes/RequestBudgetSandbox.tsx`
- Pillar depth bar: `curriculum.md`
- Pipeline rules: `.claude/commands/infographic.md`
