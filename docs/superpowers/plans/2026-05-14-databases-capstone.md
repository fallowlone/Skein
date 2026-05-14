# Databases capstone implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `databases/08-putting-it-together` (capstone) bilingual EN+RU at status `ready`, weaving the seven prior databases pieces into a linear-growth narrative.

**Architecture:** Single MDX piece per language (EN + RU) following the proven networking-08 template. Adds one new preact synthesis island (`DBLeverSandbox.tsx`) at `site/src/components/pedagogy/sandboxes/`. Total ≤ 5 hydrated islands per page. Same `<TierAccordion>` 3-tier shape used in every chapter-08 capstone.

**Tech Stack:** Astro 5, MDX, Preact, Tailwind, vitest (lint tests), Bun (build runner). Site lint pipeline lives at `site/src/lint/`.

---

## Context: spec + template references

- **Spec:** `docs/superpowers/specs/2026-05-14-databases-capstone-design.md`
- **Template piece (EN):** `site/src/content/book/en/networking/08-putting-it-together/index.mdx`
- **Template piece (RU):** `site/src/content/book/ru/networking/08-putting-it-together/index.mdx`
- **Sandbox pattern:** `site/src/components/pedagogy/sandboxes/RequestBudgetSandbox.tsx`
- **Pipeline rules:** `.claude/commands/infographic.md`
- **Curriculum depth bar:** `curriculum.md`
- **Glossary:** `site/src/i18n/glossary.json`
- **Personas:** `site/src/content/personas.json` — only `otto` + `sven` allowed for this piece (matches all prior databases pieces).

## Linter-imposed budgets (authoritative)

| Constraint | Limit | Source |
|---|---|---|
| `<Crux>` | ≤ 140 chars | `site/src/lint/rules/text-budgets.ts` |
| `<KeyTakeaway>` | ≤ 220 chars | text-budgets |
| `<Misconception>` body | ≤ 320 chars | text-budgets |
| Card annotation | ≤ 240 chars | text-budgets |
| Junior tier | 200–700 words | `tier-word-budgets.ts` |
| Middle tier | 2500–3700 words | tier-word-budgets |
| Senior tier | 2500–4000 words | tier-word-budgets |
| Exercises in `junior` slot | ≥ 5 | `exercise-counts.ts` |
| Exercises in `middle` slot | ≥ 8 | exercise-counts |
| Exercises in `senior` slot | ≥ 7 | exercise-counts |
| Hydration islands | ≤ 5 per piece page | `hydration-budget.ts` |
| `depth.*` IDs (4) | Must resolve to in-body element ids | `depth-checkpoints.ts` |
| `sources[]` | ≥ 3 real URLs, no `example.com` | `sources.ts` |
| Import segment depth | exactly 5 `..` | infographic.md |
| EN ↔ RU parity | Same components, same anchor ids | `i18n-parity.ts` |

Authoring targets (stay clear of edges): junior 400-500 words, middle 2900-3300 words, senior 3000-3500 words.

## File map

**Create:**
- `site/src/components/pedagogy/sandboxes/DBLeverSandbox.tsx` (≈150 LOC)
- `site/src/components/pedagogy/sandboxes/DBLeverSandbox.test.ts` (≈80 LOC, vitest)

**Modify (overwrite stubs):**
- `site/src/content/book/en/databases/08-putting-it-together/index.mdx`
- `site/src/content/book/ru/databases/08-putting-it-together/index.mdx`
- `site/src/i18n/glossary.json` (add new terms alphabetically)

**Read-only references during authoring (do not modify):**
- All seven prior databases pieces (`site/src/content/book/{en,ru}/databases/0[1-7]-*/index.mdx`)
- `site/src/content/chapters.json`

---

## Task 1: Build `DBLeverSandbox.tsx` skeleton

**Files:**
- Create: `site/src/components/pedagogy/sandboxes/DBLeverSandbox.tsx`
- Test: `site/src/components/pedagogy/sandboxes/DBLeverSandbox.test.ts`

### Step 1: Write failing test for the decision-table logic

Create `site/src/components/pedagogy/sandboxes/DBLeverSandbox.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { rankLevers, type SandboxInput } from "./DBLeverSandbox";

describe("DBLeverSandbox rankLevers", () => {
  test("1B rows + multi-tenant + hot-shard → 07 sharding first", () => {
    const input: SandboxInput = {
      rows: 1_000_000_000,
      workload: "mixed",
      tenancy: "multi",
      symptom: "hot-shard",
    };
    const ranked = rankLevers(input);
    expect(ranked[0].piece).toBe("07-sharding");
  });

  test("100M rows + read-heavy + slow → 02 indexes first, 03 plan second", () => {
    const ranked = rankLevers({
      rows: 100_000_000,
      workload: "read-heavy",
      tenancy: "single",
      symptom: "slow-query",
    });
    expect(ranked[0].piece).toBe("02-indexes");
    expect(ranked[1].piece).toBe("03-execution-plans");
  });

  test("1M rows + connection-storm → 05 pooling first", () => {
    const ranked = rankLevers({
      rows: 1_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "connection-storm",
    });
    expect(ranked[0].piece).toBe("05-pooling");
  });

  test("any scale + bloat → 04 MVCC first", () => {
    const ranked = rankLevers({
      rows: 10_000,
      workload: "write-heavy",
      tenancy: "single",
      symptom: "bloat",
    });
    expect(ranked[0].piece).toBe("04-mvcc-isolation");
  });

  test("any scale + lock-wait on ALTER → 06 migrations first", () => {
    const ranked = rankLevers({
      rows: 5_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "lock-wait",
    });
    expect(ranked[0].piece).toBe("06-migrations");
  });

  test("10K rows + no symptom → 01 relational model first (schema lock-in)", () => {
    const ranked = rankLevers({
      rows: 10_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "slow-query",
    });
    expect(ranked[0].piece).toBe("01-relational-model");
  });

  test("returns exactly 3 ranked levers", () => {
    const ranked = rankLevers({
      rows: 1_000_000,
      workload: "mixed",
      tenancy: "single",
      symptom: "slow-query",
    });
    expect(ranked).toHaveLength(3);
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd site && bunx vitest run src/components/pedagogy/sandboxes/DBLeverSandbox.test.ts
```

Expected: FAIL with "Cannot find module './DBLeverSandbox'" or "rankLevers is not a function".

### Step 3: Implement minimal `rankLevers` to pass tests

Create `site/src/components/pedagogy/sandboxes/DBLeverSandbox.tsx`:

```tsx
import { useState } from "preact/hooks";
import Sandbox from "../Sandbox";

export type Workload = "read-heavy" | "write-heavy" | "mixed";
export type Tenancy = "single" | "multi";
export type Symptom =
  | "slow-query"
  | "lock-wait"
  | "bloat"
  | "connection-storm"
  | "hot-shard";

export type SandboxInput = {
  rows: number;
  workload: Workload;
  tenancy: Tenancy;
  symptom: Symptom;
};

export type Piece =
  | "01-relational-model"
  | "02-indexes"
  | "03-execution-plans"
  | "04-mvcc-isolation"
  | "05-pooling"
  | "06-migrations"
  | "07-sharding";

export type Lever = { piece: Piece; reason: { en: string; ru: string } };

const REASONS: Record<Piece, { en: string; ru: string }> = {
  "01-relational-model": {
    en: "Schema decisions compound — fix the model before scaling reveals it.",
    ru: "Решения по схеме копятся — чините модель до того, как масштаб её обнажит.",
  },
  "02-indexes": {
    en: "Wrong or missing index is the cheapest lever at 10K–100M rows.",
    ru: "Не тот или отсутствующий индекс — самый дешёвый рычаг на 10K–100M строк.",
  },
  "03-execution-plans": {
    en: "Index exists but planner picks seq-scan — re-ANALYZE, check row estimates.",
    ru: "Индекс есть, planner берёт seq-scan — пересоберите ANALYZE, проверьте оценки.",
  },
  "04-mvcc-isolation": {
    en: "Bloat means a long transaction is holding the xmin horizon — hunt it.",
    ru: "Bloat = длинная транзакция держит xmin-горизонт — ищите её.",
  },
  "05-pooling": {
    en: "App pods × workers > server backends — put PgBouncer in front, size with math.",
    ru: "Pod × worker > backend-ов — поставьте PgBouncer, рассчитайте пул.",
  },
  "06-migrations": {
    en: "ALTER blocks behind a long query — expand-contract and CONCURRENTLY.",
    ru: "ALTER застрял за длинным запросом — expand-contract и CONCURRENTLY.",
  },
  "07-sharding": {
    en: "One node can't hold it — pick a shard key with high cardinality and co-location.",
    ru: "Одна нода не тянет — ключ шардирования с высокой кардинальностью и ко-локацией.",
  },
};

const lever = (piece: Piece): Lever => ({ piece, reason: REASONS[piece] });

export function rankLevers(input: SandboxInput): Lever[] {
  const { rows, workload, tenancy, symptom } = input;

  // Symptom-first decision tree.
  if (symptom === "hot-shard" && tenancy === "multi" && rows >= 100_000_000) {
    return [lever("07-sharding"), lever("01-relational-model"), lever("03-execution-plans")];
  }
  if (symptom === "connection-storm") {
    return [lever("05-pooling"), lever("04-mvcc-isolation"), lever("03-execution-plans")];
  }
  if (symptom === "bloat") {
    return [lever("04-mvcc-isolation"), lever("06-migrations"), lever("02-indexes")];
  }
  if (symptom === "lock-wait") {
    return [lever("06-migrations"), lever("04-mvcc-isolation"), lever("05-pooling")];
  }
  if (symptom === "slow-query") {
    if (rows < 100_000) {
      return [lever("01-relational-model"), lever("02-indexes"), lever("03-execution-plans")];
    }
    if (rows >= 1_000_000_000 || (tenancy === "multi" && rows >= 100_000_000)) {
      return [lever("07-sharding"), lever("02-indexes"), lever("03-execution-plans")];
    }
    if (workload === "read-heavy") {
      return [lever("02-indexes"), lever("03-execution-plans"), lever("04-mvcc-isolation")];
    }
    return [lever("02-indexes"), lever("03-execution-plans"), lever("05-pooling")];
  }

  // Default ranking.
  return [lever("01-relational-model"), lever("02-indexes"), lever("03-execution-plans")];
}

type Props = { lang: "en" | "ru" };

export default function DBLeverSandbox({ lang }: Props) {
  const [rowsLog, setRowsLog] = useState(6); // log10(1M)
  const [workload, setWorkload] = useState<Workload>("mixed");
  const [tenancy, setTenancy] = useState<Tenancy>("single");
  const [symptom, setSymptom] = useState<Symptom>("slow-query");

  const rows = Math.pow(10, rowsLog);
  const ranked = rankLevers({ rows, workload, tenancy, symptom });

  const t = (en: string, ru: string) => (lang === "en" ? en : ru);

  return (
    <Sandbox
      id="db-lever-sandbox"
      title={t("First lever heuristic", "Эвристика первого рычага")}
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <label class="block">
            <span class="text-sm font-medium">
              {t("Row count", "Размер таблицы")}: 10^{rowsLog} ≈ {Math.pow(10, rowsLog).toLocaleString()}
            </span>
            <input
              type="range"
              min={3}
              max={9}
              step={1}
              value={rowsLog}
              onInput={(e) => setRowsLog(parseInt((e.target as HTMLInputElement).value, 10))}
              class="w-full"
            />
          </label>

          <fieldset class="space-y-1">
            <legend class="text-sm font-medium">{t("Workload", "Нагрузка")}</legend>
            {(["read-heavy", "write-heavy", "mixed"] as Workload[]).map((w) => (
              <label class="block text-sm">
                <input
                  type="radio"
                  name="workload"
                  value={w}
                  checked={workload === w}
                  onChange={() => setWorkload(w)}
                />{" "}
                {w}
              </label>
            ))}
          </fieldset>

          <fieldset class="space-y-1">
            <legend class="text-sm font-medium">{t("Tenancy", "Tenancy")}</legend>
            {(["single", "multi"] as Tenancy[]).map((tt) => (
              <label class="block text-sm">
                <input
                  type="radio"
                  name="tenancy"
                  value={tt}
                  checked={tenancy === tt}
                  onChange={() => setTenancy(tt)}
                />{" "}
                {tt}
              </label>
            ))}
          </fieldset>

          <fieldset class="space-y-1">
            <legend class="text-sm font-medium">{t("Dominant symptom", "Главный симптом")}</legend>
            {(
              ["slow-query", "lock-wait", "bloat", "connection-storm", "hot-shard"] as Symptom[]
            ).map((s) => (
              <label class="block text-sm">
                <input
                  type="radio"
                  name="symptom"
                  value={s}
                  checked={symptom === s}
                  onChange={() => setSymptom(s)}
                />{" "}
                {s}
              </label>
            ))}
          </fieldset>
        </div>

        <ol class="space-y-3">
          {ranked.map((l, i) => (
            <li class="border rounded p-3">
              <div class="text-xs uppercase tracking-wide text-bbg-muted">
                #{i + 1} → piece {l.piece}
              </div>
              <div class="text-sm mt-1">{lang === "en" ? l.reason.en : l.reason.ru}</div>
            </li>
          ))}
        </ol>
      </div>
    </Sandbox>
  );
}
```

### Step 4: Run test to verify it passes

```bash
cd site && bunx vitest run src/components/pedagogy/sandboxes/DBLeverSandbox.test.ts
```

Expected: PASS — 7 test cases green.

### Step 5: Commit

```bash
git add site/src/components/pedagogy/sandboxes/DBLeverSandbox.tsx \
        site/src/components/pedagogy/sandboxes/DBLeverSandbox.test.ts
git commit -m "feat(site): DBLeverSandbox synthesis island for databases capstone"
```

---

## Task 2: Add glossary terms for capstone

**Files:**
- Modify: `site/src/i18n/glossary.json`

### Step 1: Read current glossary tail

```bash
cd site && jq 'keys | length' src/i18n/glossary.json && jq 'keys' src/i18n/glossary.json | tail -30
```

Note alphabetical position for each new term you will add. Insert each in correct alphabetical order.

### Step 2: Insert terms alphabetically

Add the following keys to `site/src/i18n/glossary.json` (only those not already present; insert each at its alphabetical position):

```json
"co-location": { "en": "co-location", "ru": "ко-локация" },
"connection storm": { "en": "connection storm", "ru": "connection storm" },
"expand-contract migration": { "en": "expand-contract migration", "ru": "expand-contract миграция" },
"hot shard": { "en": "hot shard", "ru": "горячий шард" },
"row estimate disaster": { "en": "row estimate disaster", "ru": "катастрофа row estimate" },
"transaction-mode pool": { "en": "transaction-mode pool", "ru": "пул в transaction mode" },
"xmin horizon": { "en": "xmin horizon", "ru": "xmin-горизонт" }
```

Use `Edit` with `replace_all=false` and unique surrounding context for each insertion. **Skip any term already present in the glossary.**

### Step 3: Verify glossary is valid JSON

```bash
cd site && jq . src/i18n/glossary.json > /dev/null && echo "valid JSON"
```

Expected: `valid JSON`.

### Step 4: Commit

```bash
git add site/src/i18n/glossary.json
git commit -m "chore(site/i18n): glossary terms for databases capstone"
```

---

## Task 3: Author EN MDX — frontmatter + opening + Crux + walk

**Files:**
- Modify (overwrite stub): `site/src/content/book/en/databases/08-putting-it-together/index.mdx`

### Step 1: Overwrite the stub with frontmatter, imports, opening, Crux, and the seven-act walk

Replace entire file contents with:

```mdx
---
slug: 08-putting-it-together
lang: en
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
---

import TierAccordion from "../../../../../components/pedagogy/TierAccordion.astro";
import RetrievalDrawer from "../../../../../components/pedagogy/RetrievalDrawer.tsx";
import DBLeverSandbox from "../../../../../components/pedagogy/sandboxes/DBLeverSandbox.tsx";
import Crux from "../../../../../components/prose/Crux.astro";
import SpiralCue from "../../../../../components/prose/SpiralCue.astro";
import PersonaTag from "../../../../../components/pedagogy/PersonaTag.astro";
import NumbersCard from "../../../../../components/layout/NumbersCard.astro";
import Misconception from "../../../../../components/layout/Misconception.astro";
import KeyTakeaway from "../../../../../components/prose/KeyTakeaway.astro";
import Quiz from "../../../../../components/pedagogy/Quiz.astro";
import DragOrder from "../../../../../components/pedagogy/DragOrder.astro";
import MetaphorComplete from "../../../../../components/pedagogy/MetaphorComplete.astro";
import TraceScenario from "../../../../../components/pedagogy/TraceScenario.astro";
import TradeoffMatrix from "../../../../../components/pedagogy/TradeoffMatrix.astro";
import DesignPrompt from "../../../../../components/pedagogy/DesignPrompt.astro";
import FadedExample from "../../../../../components/pedagogy/FadedExample.tsx";

Day 0 at a SaaS startup. The PM wants "search users by email." One engineer, one Postgres, one table. Three years later: 1 billion rows, six Citus shards, and a runbook the size of a textbook. Between those two points are seven moments when the database broke and the team learned. <PersonaTag id="otto" lang="en" /> kept the rows. <PersonaTag id="sven" lang="en" /> kept calling. <SpiralCue thread="statefulness" lang="en" /> <SpiralCue thread="latency" lang="en" />

<Crux>Seven pieces of this chapter are seven times a product outgrew its database — starting from CREATE TABLE.</Crux>

The walk below names the trigger and the lever at each tier. Each tier maps one-to-one onto a prior piece: skip the lever and the next tier costs more.

## The walk: from 0 to 1 billion rows

**Act 1 — Day 0, schema design (→ piece 01).** <PersonaTag id="sven" lang="en" /> asks <PersonaTag id="otto" lang="en" />: "users(email, name, org_id)." Should `email` be `UNIQUE`? Should `org_id` be a foreign key? Should `prefs` be a side table or `JSONB`? Decisions: `email` is `UNIQUE NOT NULL CITEXT`. `org_id` is `BIGINT REFERENCES orgs(id) ON DELETE CASCADE`. `prefs` is `JSONB` with a GIN index when search demands it. Cost paid: every later decision compounds against this baseline. A surrogate `id BIGSERIAL` insulates from email changes; bend the rule (skip FK) only with measured throughput pressure, never as a default.

**Act 2 — Week 1, 10K rows, the first slow query (→ piece 02).** Email-search endpoint p95 climbs from 30 ms to 800 ms. <PersonaTag id="otto" lang="en" /> reports the planner does a sequential scan. Sven runs `CREATE INDEX users_email_idx ON users(email)`. The leading-column rule of B-tree means `WHERE email = ?` resolves with two page reads. p95 drops to 4 ms.

**Act 3 — Month 1, 100K rows, the planner lies (→ piece 03).** Half the requests are fast, half take 600 ms. `EXPLAIN ANALYZE` shows the planner sometimes picks a seq-scan despite the index. Row estimate is off by 30×: stale statistics. `ANALYZE users;` rebuilds the histograms; `pg_stat_statements` confirms the worst-case plan disappears. The lesson is that the planner picks plans from statistics, not from the data; statistics maintenance is the operational discipline.

**Act 4 — Month 6, the silent bloat (→ piece 04).** A nightly report runner holds one transaction open for four hours. `VACUUM` cannot reclaim dead tuples below the `xmin` horizon. The `users` table swells from 200 MB to 80 GB. Vacuum logs show "removed 0 row versions" for the long-running window. Fix: kill the long transaction, set `idle_in_transaction_session_timeout = 60s`, run `pg_repack` to reclaim disk. Permanent fix: never run reporting on the OLTP database — replicate to a read replica.

**Act 5 — Year 1, 1M users + 50 app pods, the connection storm (→ piece 05).** Each pod has 20 workers, each opens its own Postgres backend on cold-start. At pod-rollout time the cluster sees 1000 concurrent backends; the kernel scheduler thrashes; queries that took 4 ms take 4 s. PgBouncer is deployed in transaction-mode in front of Postgres: 100 server-side backends, 10000 client connections multiplexed. The trap: transaction-mode pooling breaks server-side prepared statements unless PgBouncer ≥ 1.21 with `server_prepared_statements`. Sizing math from piece 05: `pool_size = active_concurrent_transactions × safety_factor`, not `max_app_workers`.

**Act 6 — Year 2, the migration that froze prod (→ piece 06).** Multi-tenancy day. A migration adds `tenant_id BIGINT NOT NULL`. The naive `ALTER TABLE users ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 0` takes an `AccessExclusiveLock` and triggers a full table rewrite. Prod freezes for eight minutes. The expand-contract recipe: (1) add nullable column with no default, (2) backfill in batches, (3) add `CHECK (tenant_id IS NOT NULL) NOT VALID`, (4) `VALIDATE CONSTRAINT`, (5) `SET NOT NULL` (cheap once validated), (6) drop the check. Builders like `pgroll` and `Atlas` codify the recipe.

**Act 7 — Year 3, 1B rows, the hot shard (→ piece 07).** Citus is rolled out. The shard key is `tenant_id`. Reads on most tenants are quick. Tenant `Acme` accounts for 40% of all queries. Acme's shard saturates while the others idle. The fix is co-location: place `users`, `orgs`, `events`, `audit_log` on the same shard key so cross-tenant joins stay local; then either (a) split the Acme tenant across logical shards with a tenant-aware router or (b) move Acme to its own physical cluster. Online resharding (with `citus_rebalance_table_shards`) lets the rebalance happen without downtime — but plan the window because catch-up replication adds load.

---

The acts are the spine. The detail and the synthesis live below.
```

### Step 2: Verify file parses (no MDX errors)

```bash
cd site && bun run build 2>&1 | grep -E "error|Error|fail" | head -20
```

If errors mention the new MDX file: read them and fix. If the only errors are pre-existing in other files, continue.

### Step 3: Commit (in-progress checkpoint)

```bash
git add site/src/content/book/en/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone EN frontmatter + walk"
```

---

## Task 4: Add the junior tier (≥ 5 exercises, 400-500 words)

**Files:**
- Modify: `site/src/content/book/en/databases/08-putting-it-together/index.mdx`

### Step 1: Append the `<TierAccordion>` opening and junior `<Fragment>`

Append after the `---` separator inserted in Task 3:

````mdx
<TierAccordion id="tier-mechanism" lang="en">
  <Fragment slot="junior">
    <p><strong>What this piece does.</strong> It glues the seven prior pieces into one growth story. Each piece you read earlier is one stage where the product outgrew the database.</p>
    <p><strong>Why care.</strong> Each piece in isolation looked optional — "I'll learn indexes when I need them." This piece shows that the *order* is not optional: a missed index at 10K rows is a one-line fix; a missed shard plan at 1B rows is a six-month project.</p>
    <p><strong>Metaphor.</strong> A database is a growing city. The schema is zoning. Indexes are the street map. Execution plans are the traffic dispatcher. MVCC is multiple lanes per road so cars can pass without colliding. The connection pool is the parking garage. Migrations are construction crews who must not close every road at once. Sharding is annexing new districts when one city block can't hold the traffic. A skipped lesson means the city keeps growing, but the wrong layer is overloaded.</p>
    <p><strong>Persona dialog.</strong> <PersonaTag id="sven" lang="en" />: "Otto, the search endpoint is slow." <PersonaTag id="otto" lang="en" />: "Add an index — leading column on what you filter by." Two months later. Sven: "Index is there, still slow." Otto: "The planner's row estimate is wrong. Run ANALYZE." Six months later. Sven: "We're out of disk." Otto: "A long transaction blocked vacuum. Kill it and set a timeout." A year later. Sven: "Pods can't connect." Otto: "You ran out of backends. Put PgBouncer in transaction-mode in front of me." Each line of the dialog is one piece of this chapter.</p>
    <p><strong>One concrete scenario.</strong> Day 1 the table is 1000 rows; everything is instant. Year 1 the table is 1M rows and one missing index makes every page take 400 ms. Year 3 the table is 1B rows on one node and it falls over. The price of each missed lever is paid at the next scale tier.</p>
    <Quiz
      id="jr-quiz-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="At 10K rows, the email-search endpoint is suddenly slow. Cheapest first lever?"
      choices={[
        { label: "Add a PgBouncer pool", misconception: "Connection pooling helps at high pod-count, not at low data volume." },
        { label: "Create an index on the filtered column", correct: true },
        { label: "Shard the table by tenant_id", misconception: "Sharding is a year-3 lever, not a week-1 lever." },
        { label: "Run VACUUM FULL", misconception: "Vacuum helps with bloat, not with cold queries." },
      ]}
    />
    <Quiz
      id="jr-quiz-2"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="The disk is full but the row count hasn't changed. What is the most likely cause?"
      choices={[
        { label: "Missing index", misconception: "Indexes use disk but rarely cause sudden growth without row changes." },
        { label: "Bloat from a long-running transaction blocking vacuum", correct: true },
        { label: "The query planner is broken", misconception: "Planner choices do not change disk usage." },
        { label: "A migration ran twice", misconception: "Migration replays are rare; bloat is the common cause." },
      ]}
    />
    <Quiz
      id="jr-quiz-3"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="Why is sharding a year-3 lever, not a year-1 lever?"
      choices={[
        { label: "Sharding is harder than indexes and irreversible once tenants are spread across shards", correct: true },
        { label: "Sharding does not work below 1B rows", misconception: "Sharding works at any scale; the operational complexity is what costs you." },
        { label: "Postgres does not support sharding", misconception: "Citus, Vitess, and declarative partitioning all exist." },
        { label: "Sharding is illegal in some jurisdictions", misconception: "There is no such restriction." },
      ]}
    />
    <DragOrder
      id="jr-drag-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      prompt="Order the seven scale-tier levers from earliest (day 0) to latest (year 3):"
      items={[
        "Design the relational schema (tables, keys, constraints)",
        "Add the right index for the query",
        "Verify the execution plan uses the index",
        "Hunt the long transaction blocking VACUUM",
        "Put a connection pooler in front of Postgres",
        "Migrate schema safely with expand-contract",
        "Shard the largest table across nodes",
      ]}
    />
    <MetaphorComplete
      id="jr-metaphor-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      setup="Fill in the blank: a database under a growing product is like a _______; each layer wears out at its own rate."
      accepted={["growing city", "city", "town", "expanding city"]}
      canonical="growing city"
      explanation="The zoning, streets, traffic, parking, construction, and annexation map cleanly onto schema, indexes, plans, MVCC lanes, pools, migrations, and sharding."
    />
    <RetrievalDrawer
      client:load
      pieceSlug="08-putting-it-together"
      lang="en"
      questions={[
        {
          id: "jr-q1",
          q: "Name the seven levers in order, and give one symptom that signals you reached each tier.",
          answer: <p>Schema (greenfield design pressure). Index (single-column query slow). Plan (index exists but seq-scan chosen). MVCC (bloat without row growth). Pool (cold-start connection storm). Migration (ALTER blocks prod). Sharding (one tenant dominates load).</p>,
        },
      ]}
    />
  </Fragment>
````

### Step 2: Verify junior word count (target 400-500)

```bash
cd site && bun run build 2>&1 | grep -E "junior word count" | head -5
```

If under 200 or over 700: trim or expand the persona dialog and metaphor paragraphs. Re-build.

### Step 3: Commit checkpoint

```bash
git add site/src/content/book/en/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone EN junior tier"
```

---

## Task 5: Add the middle tier (≥ 8 exercises, 2900-3300 words)

**Files:**
- Modify: `site/src/content/book/en/databases/08-putting-it-together/index.mdx`

### Step 1: Append the middle `<Fragment>`

After the closing `</Fragment>` of the junior slot, append:

````mdx
  <Fragment slot="middle">
    <p><strong>The seven-tier table.</strong> Each row is one scale tier, one trigger, one piece, one fix.</p>
    <NumbersCard
      id="scaling-stage-numbers"
      title="Scaling tiers and triggers"
      rows={[
        { label: "Day 0", value: "1 row", note: "Schema decisions compound. Pick keys and constraints." },
        { label: "Week 1", value: "10K rows", note: "First missing index becomes visible. p95 800 → 4 ms." },
        { label: "Month 1", value: "100K rows", note: "Stale statistics; planner picks seq-scan despite index." },
        { label: "Month 6", value: "5M rows", note: "Long-running tx → bloat → disk pressure → IOPS spike." },
        { label: "Year 1", value: "1M users / 50 pods", note: "Connection storm → backends OOM → PgBouncer required." },
        { label: "Year 2", value: "Multi-tenant", note: "Naive ALTER blocks 8 min. Expand-contract required." },
        { label: "Year 3", value: "1B rows", note: "Single-node ceiling. Citus + co-location + reshard." },
      ]}
    />
    <p><strong>Act 1 detail — schema is irreversible at scale.</strong> A wrong type (TEXT vs CITEXT for email) becomes a multi-day migration at 100M rows. A wrong key (composite natural vs surrogate BIGSERIAL) makes every join expensive forever. The relational model rewards strictness up front: <em>NOT NULL by default</em>, FK constraints unless you have measured throughput pressure, CHECK constraints for business invariants, and surrogate keys for external references. Bend the rules only with evidence — disable FK on the highest-write child tables if the foreign-key trigger cost exceeds the write budget, never as a stylistic preference.</p>
    <p><strong>Act 2 detail — indexes pay back the cost only on the right columns.</strong> A B-tree on `email` resolves `WHERE email = ?` in O(log N) page reads. A B-tree on `(org_id, created_at DESC)` resolves "the 50 latest events for an org" in two page reads. A GIN index on `prefs jsonb` makes `WHERE prefs @> '{"theme":"dark"}'` a 2 ms lookup instead of a 4 s seq-scan. The forgotten cost: every insert and update writes to every index. The leading-column rule is the most-violated principle in the wild — a `(b, a)` index is not the same as `(a, b)` for queries that filter only by `a`.</p>
    <p><strong>Act 3 detail — the planner picks plans from histograms.</strong> Postgres samples the table during `ANALYZE` and builds a histogram per column. The planner uses those histograms to estimate row counts; the cost model then ranks plans. When statistics are stale, estimates are wrong. A 1000× off estimate produces a 1000× slower plan: the planner picks a nested loop expecting 10 rows; the real cardinality is 10000 rows; the loop scans 10M index entries instead of one hash join over a 10000-row build side. Defence: `autovacuum_analyze_scale_factor = 0.05` on busy tables; `CREATE STATISTICS` for correlated columns; `pg_stat_statements` to find the offending plans; `auto_explain.log_min_duration = '500ms'` for tail-latency triage.</p>
    <p><strong>Act 4 detail — MVCC and the xmin horizon.</strong> Every row in Postgres has `xmin` (creation transaction id) and `xmax` (deletion transaction id). A `DELETE` doesn't free the row; it sets `xmax`. `VACUUM` reclaims rows whose `xmax` is older than the global `xmin` horizon — the oldest active transaction. If one analyst session leaves a transaction open for hours, the horizon doesn't advance, and no dead tuple created after that horizon can be reclaimed. The table swells; queries that scan the table get slower because they read dead rows. The fix is operational: `idle_in_transaction_session_timeout = 60s`, `pg_stat_activity` alerts on `state = 'idle in transaction'` longer than five minutes, and a clear runbook to kill the offender. Long-running analytics belong on a read replica.</p>
    <p><strong>Act 5 detail — pool sizing math.</strong> Active concurrent transactions is the load that hits the database simultaneously; idle workers are not active. Sizing rule of thumb: `pool_size = (cores × 2) + spindles`. For a 16-core SSD-only server, the sweet spot is usually 30-60 backends; more starves the OS scheduler. App-side workers can be far higher; PgBouncer multiplexes them onto the small pool. The trap: transaction-mode pooling rebinds connections after each transaction, so server-side prepared statements (`PREPARE foo AS SELECT ...`) are lost. PgBouncer 1.21+ ships `server_prepared_statements = on` which caches plan IDs server-side and replays them; without it, app frameworks that auto-prepare statements pay re-prepare overhead on every transaction.</p>
    <p><strong>Act 6 detail — the lock matrix.</strong> `ALTER TABLE` takes `AccessExclusiveLock` by default — incompatible with every other lock. While it waits for the lock, every new query waits behind it. While it holds the lock, every query waits. A short ALTER under low load completes in milliseconds; an ALTER behind a long query (Act 4!) waits, builds a queue, and the queue freezes the database. The expand-contract recipe sidesteps this by splitting one big operation into many small lock-cheap ones. `ALTER TABLE ... SET NOT NULL` after a successful `NOT VALID` constraint validation is metadata-only — milliseconds. Index creation is `CREATE INDEX CONCURRENTLY` — slower but no AccessExclusive. The discipline is to treat every migration as a production incident-in-waiting unless every step is provably lock-cheap.</p>
    <p><strong>Act 7 detail — sharding choices.</strong> Three independent decisions. (1) Shard key: tenant_id (multi-tenant SaaS), user_id (consumer product), time bucket (time-series). High cardinality + uniform load + cheap to compute. (2) Distribution method: hash (even spread, range queries fan out), range (range queries local, hot range possible), list (manual), directory (most flexible, most operational cost). (3) Co-location: place tables that join together on the same shard key so cross-shard joins are cheap. Citus + Postgres declarative partitioning is the pragmatic 2026 default. Schema-based sharding (one schema per tenant) shines for ≤ 1000 tenants but breaks down at 10000+ schemas due to catalog overhead.</p>
    <p><strong>The cumulative cost.</strong> Skip Act 2 → every query is slow. Skip Act 3 → some queries are slow; the variance is what confuses you. Skip Act 4 → disk fills up and replication lag explodes. Skip Act 5 → cold-start incidents take down the whole cluster. Skip Act 6 → every release is a freeze. Skip Act 7 → one tenant takes everyone down. The walks compound: a bad schema at Act 1 makes Act 7's resharding 10× harder because the shard key is wrong from the start.</p>
    <p><strong>Cross-cutting numbers.</strong> Index lookup: 5-50 μs in shared_buffers, 100 μs-2 ms from page cache, 5-10 ms from SSD. Heap fetch after index: same cost class. Sequential scan of 1 GB: 1-3 s SSD-bound. p95 of a properly indexed point-lookup: under 5 ms. p95 of a saturated connection pool: seconds or timeout. Realistic OLTP write rate per backend: ~5000 simple transactions/s. Realistic single-node ceiling for a write-heavy workload before sharding becomes the only lever: 10-50 K writes/s sustained.</p>
    <Misconception id="m-just-add-index" lang="en">
      <strong>"If it's slow, add an index."</strong> Most common skip past pieces 03 and 04. Adding an index when the planner ignores it (stale stats) wastes write throughput. Adding an index when the table is bloated does nothing — vacuum must run first. Adding an index when the wrong shard is hot does not help — the hot shard's index is already used. The right move is always: <em>read the plan first, fix what the plan tells you</em>. Indexes are one of seven levers, not the default response.
    </Misconception>
    <FadedExample
      client:visible
      id="fe-expand-contract"
      lang="en"
      title="Expand-contract: adding a NOT NULL column without freezing prod"
      steps={[
        {
          label: "Step 1: add nullable column",
          code: "ALTER TABLE users ADD COLUMN tenant_id BIGINT;",
          note: "Cheap. No table rewrite, no AccessExclusiveLock contest.",
        },
        {
          label: "Step 2: backfill in batches",
          code: "UPDATE users SET tenant_id = derive(...) WHERE tenant_id IS NULL AND id BETWEEN $1 AND $2;",
          note: "Batches of 10K-50K with short pauses. App reads tolerate NULL during this window.",
        },
        {
          label: "Step 3: add NOT VALID constraint",
          code: "ALTER TABLE users ADD CONSTRAINT users_tenant_id_not_null CHECK (tenant_id IS NOT NULL) NOT VALID;",
          note: "Cheap metadata change; new rows must satisfy the constraint immediately.",
        },
        {
          label: "Step 4: validate the constraint",
          code: "ALTER TABLE users VALIDATE CONSTRAINT users_tenant_id_not_null;",
          note: "Sequential scan but only RowShareLock — does not block writes.",
        },
        {
          label: "Step 5: promote to NOT NULL",
          code: "ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;\nALTER TABLE users DROP CONSTRAINT users_tenant_id_not_null;",
          note: "Postgres ≥ 12 uses the validated CHECK to make SET NOT NULL metadata-only.",
        },
      ]}
    />
    <Quiz
      id="mid-quiz-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="When the planner picks a seq-scan despite an index, what is the cheapest first check?"
      choices={[
        { label: "Drop and rebuild the index", misconception: "Rebuilding doesn't change row estimates; ANALYZE does." },
        { label: "Run ANALYZE to refresh statistics and re-EXPLAIN", correct: true },
        { label: "Add another index", misconception: "More indexes don't fix wrong estimates." },
        { label: "Increase work_mem", misconception: "work_mem affects sort/hash, not the choice between seq-scan and index-scan." },
      ]}
    />
    <Quiz
      id="mid-quiz-2"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="Why does PgBouncer transaction-mode without `server_prepared_statements` hurt apps that auto-prepare?"
      choices={[
        { label: "Prepared statements are tied to a server connection; transaction-mode rebinds, so the plan is lost between transactions", correct: true },
        { label: "Transaction mode rejects PREPARE entirely", misconception: "It does not reject — it loses the cached plan across rebinds." },
        { label: "PgBouncer corrupts the prepared statement bytes", misconception: "No corruption — the plan name just becomes invalid on the new backend." },
        { label: "Postgres caches plans per database, not per backend", misconception: "Prepared-statement plans are per session." },
      ]}
    />
    <Quiz
      id="mid-quiz-3"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="Why does a long-running idle-in-transaction session cause bloat?"
      choices={[
        { label: "It holds open the xmin horizon; vacuum can't reclaim newer dead tuples", correct: true },
        { label: "It writes garbage rows directly", misconception: "Idle sessions don't write." },
        { label: "It corrupts the WAL", misconception: "No WAL corruption from idle sessions." },
        { label: "It bypasses autovacuum settings", misconception: "It does not bypass settings; it stalls the horizon." },
      ]}
    />
    <TraceScenario
      id="mid-trace-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      scenario="p95 on a search endpoint tripled overnight. Trace the diagnostics."
      steps={[
        { prompt: "Step 1: where do you look first?", reveal: "pg_stat_statements — find the slowest queries and check whether they changed plan." },
        { prompt: "Step 2: the offending query shows it now uses seq-scan; previously index-scan. Why?", reveal: "Statistics are stale. Recent bulk update changed value distribution; planner re-estimates favor a different plan." },
        { prompt: "Step 3: confirm by EXPLAIN ANALYZE on a representative parameter.", reveal: "Estimated rows = 50, actual = 50000 — classic row-estimate disaster." },
        { prompt: "Step 4: fix.", reveal: "ANALYZE the table, then verify the planner switches back. For correlated columns, CREATE STATISTICS." },
      ]}
    />
    <TraceScenario
      id="mid-trace-2"
      pieceSlug="08-putting-it-together"
      lang="en"
      scenario="Disk usage doubled in 48 hours but row count is steady. Trace the bloat."
      steps={[
        { prompt: "Step 1: confirm bloat, not row growth.", reveal: "Compare pg_table_size(...) with pg_relation_size(...) and SELECT n_live_tup, n_dead_tup FROM pg_stat_user_tables." },
        { prompt: "Step 2: dead_tup is huge. Why didn't vacuum reclaim?", reveal: "Check pg_stat_activity for long idle-in-transaction or active sessions. The xmin horizon is held open." },
        { prompt: "Step 3: locate the culprit.", reveal: "A reporting session left a transaction open for 6 hours. backend_xmin in pg_stat_activity matches the held horizon." },
        { prompt: "Step 4: remediate.", reveal: "Cancel the session, set idle_in_transaction_session_timeout=60s, run pg_repack to reclaim disk online." },
      ]}
    />
    <DragOrder
      id="mid-drag-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      prompt="Order the expand-contract steps to add a NOT NULL column safely:"
      items={[
        "Add the column as nullable (no default)",
        "Backfill rows in small batches",
        "Add a CHECK (... IS NOT NULL) constraint as NOT VALID",
        "VALIDATE the constraint (no AccessExclusive)",
        "SET NOT NULL on the column (metadata-only with the validated CHECK)",
        "Drop the temporary CHECK constraint",
      ]}
    />
    <DragOrder
      id="mid-drag-2"
      pieceSlug="08-putting-it-together"
      lang="en"
      prompt="Order the diagnostic steps when the email-search endpoint is suddenly slow:"
      items={[
        "Check pg_stat_statements for the slowest queries and plan changes",
        "EXPLAIN ANALYZE the slow query with a representative parameter",
        "Inspect row estimates vs actual rows",
        "Run ANALYZE / build extended statistics for correlated columns",
        "Re-EXPLAIN and confirm the plan is now optimal",
        "If the plan still chooses seq-scan, check for partial-index applicability or column-type mismatch",
      ]}
    />
    <RetrievalDrawer
      client:load
      pieceSlug="08-putting-it-together"
      lang="en"
      questions={[
        {
          id: "mid-q1",
          q: "Explain why 'just add an index' is the most common skip past pieces 03 and 04, and what it costs.",
          answer: <p>An index only helps when the planner uses it; stale stats can make the planner ignore an index that exists. An index also writes on every insert/update, so adding one doubles the write cost; on a write-heavy workload this can be net negative. And an index does nothing for bloat — vacuum must reclaim space first. The right move is always to read the plan and find the named cause: missing index, wrong estimate, blocked vacuum, or wrong shard.</p>,
        },
        {
          id: "mid-q2",
          q: "Why is expand-contract safer than a single ALTER TABLE for adding a NOT NULL column at scale?",
          answer: <p>A naive ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT 0 takes AccessExclusiveLock and rewrites the table — incompatible with any concurrent query. Expand-contract splits the work into many small lock-cheap steps: a nullable add, a batched backfill, a NOT VALID check, a validate (RowShareLock only), and a metadata-only SET NOT NULL after the check is validated. Each step is online; concurrent queries proceed. Tools like pgroll and Atlas codify the recipe.</p>,
        },
      ]}
    />
  </Fragment>
````

### Step 2: Verify middle word count and exercise count

```bash
cd site && bun run build 2>&1 | grep -E "middle word count|middle.*exercise" | head -10
```

Target middle word count 2900-3300; exercise count ≥ 8. Adjust by lengthening/shortening prose paragraphs or by trimming one of the optional `<TraceScenario>` blocks.

### Step 3: Commit checkpoint

```bash
git add site/src/content/book/en/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone EN middle tier"
```

---

## Task 6: Add the senior tier (≥ 7 exercises, 3000-3500 words)

**Files:**
- Modify: `site/src/content/book/en/databases/08-putting-it-together/index.mdx`

### Step 1: Append the senior `<Fragment>` and close the `<TierAccordion>`

After the closing `</Fragment>` of the middle slot, append:

````mdx
  <Fragment slot="senior">
    <p><strong>Cross-cutting observability: USE + RED for Postgres.</strong> The USE method (Utilization, Saturation, Errors) maps to: backend count vs `max_connections`, replication lag (`pg_stat_replication.replay_lag`), checkpoint pressure (`pg_stat_bgwriter.checkpoints_req` ratio), autovacuum lag (`pg_stat_user_tables.last_autovacuum`), buffer cache hit ratio (`pg_buffercache`). The RED method (Rate, Errors, Duration) on top of `pg_stat_statements`: queries/s per `queryid`, error rate from app logs (timeouts, deadlocks), p95/p99 duration. Together they tell you which lever to pull. A high backend count with low CPU is a pooling problem (Act 5). High dead tuples with stable row count is a vacuum problem (Act 4). A specific `queryid` with rising duration and stable plan_id is a data-growth problem (Act 2 or 7).</p>
    <p><strong>Anti-pattern catalogue when a stage is skipped.</strong> Skip Act 1 → a year later you spend three weeks renaming a column because the schema lacks a surrogate key. Skip Act 2 → every dashboard query is a 30-second seq-scan; the app team adds caches everywhere; the cache becomes the new source of truth and goes inconsistent. Skip Act 3 → you have an index, but the planner ignores it half the time; you write a runbook that says "if slow, restart Postgres" because that flushes the plan cache. Skip Act 4 → the OOM-killer takes Postgres down on Friday; the postmortem says "we'll add monitoring"; you don't. Skip Act 5 → every deploy triggers a connection storm; CI now spreads pod rollouts across 10 minutes "as a workaround." Skip Act 6 → migrations only run during a quarterly maintenance window because nothing else is safe; the queue of pending migrations grows. Skip Act 7 → you spend six months explaining to leadership that one tenant is using 40% of capacity and the only fix is a re-architecture.</p>
    <p><strong>RFC and paper-level grounding.</strong> Concurrency control: Postgres's MVCC is rooted in Bernstein-Goodman's 1981 work and Reed's 1978 thesis; the practical document is `src/backend/access/heap/README.HOT`. WAL: PostgreSQL's `pg_wal/` directory implementing ARIES-style write-ahead logging. Statistics: PostgreSQL planner uses histograms + most-common-values + correlation; the seminal reference is the Postgres source `src/backend/utils/adt/selfuncs.c`. Citus: the 2016 SIGMOD paper "Citus: Distributed PostgreSQL for Data-Intensive Applications" by Cetin et al. covers the architecture; the operational doc is `docs.citusdata.com/en/stable/admin_guide/`. XID wraparound: the 2 billion (2^31) transaction-id ceiling is a hard correctness limit; `autovacuum_freeze_max_age` controls preventive freezing.</p>
    <p><strong>Production observability stack for Postgres.</strong> Metrics scrape: `postgres_exporter` (Prometheus) for the standard set; `pg_stat_statements` and `pg_stat_kcache` enabled for query-level. Logs: structured (CSV or JSON) from Postgres itself, shipped via Vector/Fluent-bit to Loki or Elasticsearch. Slow-query introspection: `auto_explain` with `log_min_duration = '500ms'` for tail latency; `log_lock_waits = on` for lock cascades. Dashboards: Grafana with the `postgres_exporter` and `pgwatch2` boards. Alerting: budget burn on a 7-day rolling window for "% of `pg_stat_statements` total time spent in queries slower than 1 second."</p>
    <p><strong>XID wraparound and the autovacuum freeze.</strong> Every row carries a 32-bit transaction id; once the cluster reaches 2^31 transactions, ids wrap, and rows can appear from the future. Postgres protects against this by freezing old rows (rewriting `xmin` to a special "frozen" value) before wraparound. `autovacuum_freeze_max_age` is the trigger. On a write-heavy cluster (10 K TPS = 864 M transactions/day), the freeze runs every ~2.5 days. A misconfiguration (very high `autovacuum_freeze_max_age`, e.g. 1B) can lead to anti-wraparound emergency vacuums that lock the database. The remedy in production: monitor `age(datfrozenxid)` per database, alert at 80% of `autovacuum_freeze_max_age`.</p>
    <p><strong>Replication lag and read-replica gotchas.</strong> Async replication has an unbounded lag under write load; sync replication trades latency for durability. Hot-standby read replicas serve reads at staleness bounded by `replay_lag`. The trap: long-running queries on the replica delay WAL replay (the recovery process must wait for the snapshot to release before applying conflicting changes), creating cascading lag. Defence: `hot_standby_feedback = on` to keep the replica's `xmin` horizon pushed up to the primary so vacuum doesn't reclaim rows the replica still needs — but this bloats the primary instead. There is no free lunch.</p>
    <p><strong>Sharded systems in 2026 — pragmatic choices.</strong> Citus is the standard for Postgres-native sharding (CrunchyData, AWS RDS, Microsoft Azure CDB-for-PG). Vitess is the standard for MySQL — relevant because GitHub and Slack migrated MySQL workloads onto Vitess. Aurora DSQL (AWS, 2024) and Spanner (GCP) cover global ACID-on-distributed-storage if budget allows. CockroachDB and TiDB are NewSQL alternatives. Real-world: GitHub partitioned MySQL with their custom tooling (2021 blog post) before migrating critical paths to Vitess; Figma scaled with Vitess; Notion ran for years on a single very-large RDS Postgres and only recently considered Citus. The 2026 default for a new Postgres-shop scaling past one node: declarative partitioning first (single node, fewer ops), Citus when one node truly cannot keep up, Aurora DSQL when global writes are a real product requirement.</p>
    <p><strong>Migration tooling landscape — 2026 snapshot.</strong> Atlas (Ariga), pgroll (Xata), Liquibase, Flyway, sqitch, golang-migrate, Prisma Migrate, Drizzle Kit, TypeORM migrations, Django migrations. The pragmatic 2026 stack for Postgres: `pgroll` for online schema changes (declarative expand-contract), Atlas for declarative schema diff + migration generation, Liquibase if your shop is Java-heavy, and bespoke SQL files versioned with `golang-migrate` for everything that doesn't fit. Avoid: `prisma migrate dev` in production (designed for dev loops, makes data-loss assumptions); blind `python manage.py migrate` on tables larger than 1M rows.</p>
    <p><strong>Capacity planning for a single Postgres before sharding.</strong> Modern hardware (2026 Hetzner CAX21 or AWS r6g.4xlarge): 16 vCPU, 64 GB RAM, NVMe SSD, can sustain 30-50 K simple OLTP TPS, ~10 K complex transactions/s, 5-10 GB/s sequential read for analytics queries. Single-node ceiling for a well-tuned Postgres: 50 K TPS, 1-5 TB data, 99.99% availability with one read replica. Past this, sharding is the only lever. The mental model: every order of magnitude in scale adds a new operational concern. 1 TB is "we should automate backups." 10 TB is "we need a recovery strategy." 100 TB is "we need a team."</p>
    <p><strong>Catalog overhead and schema-based sharding limits.</strong> Schema-based multi-tenancy ("one schema per tenant") works beautifully at low tenant count: clean isolation, easy backups, simple data export. But Postgres catalog tables (`pg_class`, `pg_attribute`, `pg_constraint`) grow linearly with schema count × tables-per-schema. At 10000 schemas × 50 tables, `pg_class` has half a million rows; planner walk-time on queries that touch multiple schemas climbs to seconds. The practical ceiling is 1000-3000 tenants per cluster with schema-based sharding. Past that, row-level multi-tenancy (`tenant_id` column on every table) with Citus shard distribution scales further.</p>
    <p><strong>Connection pooling in 2026 — landscape.</strong> PgBouncer remains the standard (~50 K req/s per instance). Odyssey (Yandex) offers similar performance with hot-reload config. PgCat is a Rust port with multi-tenant routing primitives. Supavisor (Supabase) is a managed alternative for Postgres-as-a-service. The 2026 default: PgBouncer 1.21+ for self-managed; managed pooling from your cloud provider otherwise. Antipattern: running a pooler per app pod — defeats multiplexing.</p>
    <p><strong>The integration with the rest of the curriculum.</strong> This piece sits at the seam of databases, performance (chapter 13), observability (chapter 11), and engineering practice (chapter 16). Every lever you pulled here has cousins elsewhere: caching (chapter 7) sits in front of indexes and plans; queues (chapter 8) absorb write spikes that would otherwise overwhelm Act 5's pool; distributed-systems (chapter 9) names the consistency questions that drove Act 7's sharding decisions. The fullstack engineer's job is not just to know Postgres but to know which lever costs least at each layer of the system as a whole.</p>
    <TradeoffMatrix
      id="stage-tradeoffs"
      lang="en"
      title="Lever trade-offs per growth tier"
      columns={["Lever", "Reversible?", "When too early", "When too late"]}
      rows={[
        ["Schema (01)", "No (data lives in it)", "Speculative future-proofing", "Migration cost at scale"],
        ["Index (02)", "Yes (drop is instant)", "Write penalty without query benefit", "Slow queries already in prod"],
        ["Plan / stats (03)", "Yes (run ANALYZE)", "Premature CREATE STATISTICS noise", "Tail-latency incidents"],
        ["MVCC discipline (04)", "Yes (kill long tx)", "Aggressive timeouts cancel valid work", "Bloat costs disk + IO"],
        ["Pool (05)", "Yes (remove pooler)", "Adds a network hop for tiny apps", "Connection-storm outages"],
        ["Migration recipe (06)", "Yes (skip until needed)", "Adds 5 steps where 1 worked", "Lock-queue freezes prod"],
        ["Sharding (07)", "Partially (resharding is hard)", "Operational complexity tax", "One tenant dominates"],
      ]}
    />
    <DesignPrompt
      id="sr-design-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      prompt="You inherit a Postgres at 200M rows, p95 1500 ms, 600 concurrent backends, 40 GB bloat, no pooler, single node. Three weeks to stabilize. Plan the order of work and justify each step."
      rubric={[
        "First triage: kill long transactions, set idle_in_transaction_session_timeout — stop the bleeding (Act 4).",
        "Stabilize connections: deploy PgBouncer in transaction-mode, size pool from active-tx, not workers (Act 5).",
        "Reclaim disk: pg_repack the bloated tables online (Act 4 cleanup).",
        "Re-establish plan quality: ANALYZE + CREATE STATISTICS for correlated columns; review pg_stat_statements top-N (Act 3).",
        "Index audit: drop unused indexes, add the obviously missing ones based on top-N (Act 2).",
        "Only then consider sharding (Act 7) — and only after capacity calculations show a single node truly cannot keep up.",
      ]}
    />
    <TraceScenario
      id="sr-trace-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      scenario="On-call page: replication lag is 12 minutes and rising. Trace the cause."
      steps={[
        { prompt: "Step 1: confirm the lag.", reveal: "SELECT now() - pg_last_xact_replay_timestamp() on the replica. Confirm rising trend on the dashboard." },
        { prompt: "Step 2: is the primary write-rate normal?", reveal: "Check pg_stat_database tup_inserted/updated/deleted growth. Normal." },
        { prompt: "Step 3: is the replica I/O-bound?", reveal: "iostat on the replica shows the WAL apply process is CPU-bound, not I/O." },
        { prompt: "Step 4: why is replay slow?", reveal: "pg_stat_activity on the replica shows a long-running analytics query holding a snapshot. WAL replay must wait for snapshot release on conflict. hot_standby_feedback = on or kill the query." },
        { prompt: "Step 5: long-term fix.", reveal: "Move analytics to a dedicated replica with hot_standby_feedback off (and accept staleness) or to a separate analytical store fed by logical replication." },
      ]}
    />
    <TraceScenario
      id="sr-trace-2"
      pieceSlug="08-putting-it-together"
      lang="en"
      scenario="A planned tenant_id NOT NULL migration freezes prod for 14 minutes despite the team using 'safe' tooling. Trace the failure."
      steps={[
        { prompt: "Step 1: what did the tooling do?", reveal: "Atlas generated ALTER TABLE ADD COLUMN tenant_id BIGINT NOT NULL DEFAULT 0. Postgres ≥ 11 makes ADD COLUMN ... NOT NULL DEFAULT constant cheap (no rewrite), so the rewrite isn't the cause." },
        { prompt: "Step 2: then what blocked?", reveal: "AccessExclusiveLock acquisition queued behind a long-running pg_dump session that held AccessShareLock for the table. Every new query queued behind the ALTER." },
        { prompt: "Step 3: why didn't the team see this?", reveal: "Local testing didn't include a concurrent pg_dump. Pre-prod lacked a long-running read that mirrored prod." },
        { prompt: "Step 4: the right runbook fix?", reveal: "Set lock_timeout = '2s' on the migration; check pg_stat_activity for AccessShareLock holders before running ALTER; or run the migration during a maintenance window that excludes backup processes." },
      ]}
    />
    <Quiz
      id="sr-quiz-1"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="What is the role of `backend_xmin` in pg_stat_activity for diagnosing bloat?"
      choices={[
        { label: "It is the oldest transaction id this backend can still see; the cluster xmin horizon is the min of all such values", correct: true },
        { label: "It is the transaction id of the next query", misconception: "Wrong direction." },
        { label: "It is the WAL position the backend has replicated to", misconception: "That's pg_stat_replication, not backend_xmin." },
        { label: "It is the timestamp of the last query", misconception: "Not a timestamp." },
      ]}
    />
    <Quiz
      id="sr-quiz-2"
      pieceSlug="08-putting-it-together"
      lang="en"
      question="Why does `hot_standby_feedback = on` shift bloat from the replica to the primary?"
      choices={[
        { label: "The replica pushes its oldest snapshot up to the primary, preventing primary vacuum from reclaiming rows still needed for replica reads", correct: true },
        { label: "It corrupts the WAL", misconception: "No corruption." },
        { label: "It forces synchronous replication", misconception: "It's about visibility, not durability." },
        { label: "It disables the replica's vacuum", misconception: "Vacuum on standby is recovery-driven; the flag affects xmin propagation." },
      ]}
    />
    <RetrievalDrawer
      client:load
      pieceSlug="08-putting-it-together"
      lang="en"
      questions={[
        {
          id: "sr-q1",
          q: "Explain how the seven acts compound: pick one early skip and trace its downstream cost.",
          answer: <p>Skip Act 1 (schema): use email as the natural key. Act 2 indexes are forced to support text equality on a mutable field. Act 3 plan stability degrades because the planner's column statistics for high-cardinality text columns are less stable than for surrogate integer keys. Act 6 migrations to change email-validation rules require a full table rewrite (a surrogate id would have been a simple column update). Act 7 sharding by email is awful — co-location across users/events/orgs becomes impossible because email is a property of one entity, not a tenant. Total cost: 10× the engineering effort at Act 7.</p>,
        },
      ]}
    />
  </Fragment>
</TierAccordion>
````

### Step 2: Verify senior word count and exercise count

```bash
cd site && bun run build 2>&1 | grep -E "senior word count|senior.*exercise" | head -10
```

Target senior word count 3000-3500; exercise count ≥ 7 (`TradeoffMatrix` + `DesignPrompt` + 2 `TraceScenario` + 2 `Quiz` + `RetrievalDrawer` = 7). Adjust by trimming or expanding cross-cutting paragraphs.

### Step 3: Commit checkpoint

```bash
git add site/src/content/book/en/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone EN senior tier + close accordion"
```

---

## Task 7: Add sandbox, KeyTakeaway, spiral cues, and cross-links (EN final)

**Files:**
- Modify: `site/src/content/book/en/databases/08-putting-it-together/index.mdx`

### Step 1: Append everything after the `</TierAccordion>`

After the closing `</TierAccordion>` from Task 6, append:

```mdx

## Synthesis sandbox

<DBLeverSandbox client:visible lang="en" />

<KeyTakeaway>Seven pieces. Seven scale tiers. Each skipped lever pays back at the next tier, more expensive. Read the plan, not the symptom.</KeyTakeaway>

<SpiralCue thread="statefulness" lang="en">State lives at every layer — schema, plans, MVCC snapshots, pool sessions, shard maps. Every act is one stateful layer giving way.</SpiralCue>

<SpiralCue thread="latency" lang="en">Each lever buys back a band of latency the prior layer leaked. Round-trip math beats micro-optimisation here too.</SpiralCue>

<SpiralCue thread="multiplexing" lang="en">Pooling and sharding multiplex limited resources (backends, nodes) across many callers. The math is the same as TCP streams.</SpiralCue>

## Where to go next

- Back to schema design: [01 — relational model](/en/databases/01-relational-model)
- Back to indexes: [02 — indexes](/en/databases/02-indexes)
- Back to plans: [03 — execution plans](/en/databases/03-execution-plans)
- Back to MVCC: [04 — MVCC and isolation](/en/databases/04-mvcc-isolation)
- Back to pooling: [05 — pooling](/en/databases/05-pooling)
- Back to migrations: [06 — migrations](/en/databases/06-migrations)
- Back to sharding: [07 — sharding](/en/databases/07-sharding)

Next chapter: [Caching all the way down →](/en/caching/)
```

### Step 2: Run full site build, check lint clean for this piece

```bash
cd site && bun run build 2>&1 | tee /tmp/db08-build.log
cat dist/lint-report.json | jq '.errors | map(select(. | test("databases/08-putting-it-together")))'
```

Expected: empty array (no errors for this file). If errors present, address each:
- `Crux too long` → trim Crux text under 140 chars
- `KeyTakeaway too long` → trim under 220 chars
- `Hydration > 5` → remove `client:` from one island; verify `FadedExample` uses `client:visible` only if needed and counts against budget
- `depth.* missing element id` → confirm `tier-mechanism`, `stage-tradeoffs`, `m-just-add-index`, `scaling-stage-numbers` all appear as `id=` attributes in the body
- `Persona unknown` → verify only `otto` and `sven` are referenced
- `Junior/middle/senior word count outside budget` → adjust prose

### Step 3: Verify import paths are exactly 5 `..` segments

```bash
grep -E "^import .* from " site/src/content/book/en/databases/08-putting-it-together/index.mdx | grep -v "\.\./\.\./\.\./\.\./\.\./"
```

Expected: empty output (no lines printed). Any line printed = wrong segment count; fix that import.

### Step 4: Commit EN-complete checkpoint

```bash
git add site/src/content/book/en/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone EN complete (sandbox + takeaway + links)"
```

---

## Task 8: RU mirror — frontmatter + walk + junior tier

**Files:**
- Modify (overwrite stub): `site/src/content/book/ru/databases/08-putting-it-together/index.mdx`

### Step 1: Translate frontmatter, opening, Crux, walk, junior tier

Overwrite the RU file with the same structure as the EN file. Use `site/src/i18n/glossary.json` for canonical translations. Reuse the same anchor ids (do not translate ids).

Header + imports + opening:

```mdx
---
slug: 08-putting-it-together
lang: ru
pillar: databases
chapter: 06-databases
order: 8
title: "Складываем всё вместе: один Postgres от MVP до миллиарда строк"
summary: "Семь прошлых пьес — это семь стадий роста одного продукта. Walk от CREATE TABLE до Citus, с именем точного fail на каждой стадии и рычага, который его решает."
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
---

import TierAccordion from "../../../../../components/pedagogy/TierAccordion.astro";
import RetrievalDrawer from "../../../../../components/pedagogy/RetrievalDrawer.tsx";
import DBLeverSandbox from "../../../../../components/pedagogy/sandboxes/DBLeverSandbox.tsx";
import Crux from "../../../../../components/prose/Crux.astro";
import SpiralCue from "../../../../../components/prose/SpiralCue.astro";
import PersonaTag from "../../../../../components/pedagogy/PersonaTag.astro";
import NumbersCard from "../../../../../components/layout/NumbersCard.astro";
import Misconception from "../../../../../components/layout/Misconception.astro";
import KeyTakeaway from "../../../../../components/prose/KeyTakeaway.astro";
import Quiz from "../../../../../components/pedagogy/Quiz.astro";
import DragOrder from "../../../../../components/pedagogy/DragOrder.astro";
import MetaphorComplete from "../../../../../components/pedagogy/MetaphorComplete.astro";
import TraceScenario from "../../../../../components/pedagogy/TraceScenario.astro";
import TradeoffMatrix from "../../../../../components/pedagogy/TradeoffMatrix.astro";
import DesignPrompt from "../../../../../components/pedagogy/DesignPrompt.astro";
import FadedExample from "../../../../../components/pedagogy/FadedExample.tsx";

День 0 в SaaS-стартапе. PM просит «поиск пользователей по email». Один инженер, один Postgres, одна таблица. Через три года: 1 миллиард строк, шесть шардов Citus, и runbook размером с учебник. Между этими точками — семь моментов, когда база ломалась, а команда училась. <PersonaTag id="otto" lang="ru" /> держал строки. <PersonaTag id="sven" lang="ru" /> делал запросы. <SpiralCue thread="statefulness" lang="ru" /> <SpiralCue thread="latency" lang="ru" />

<Crux>Семь пьес главы — это семь раз, когда продукт обогнал свою базу, начиная с CREATE TABLE.</Crux>

Walk ниже называет триггер и рычаг на каждой стадии. Каждая стадия — один из семи прошлых разделов: пропустишь рычаг, следующая стадия обойдётся дороже.

## Walk: от нуля до миллиарда строк
```

Then translate Acts 1-7 paragraphs to Russian (mirroring the EN structure verbatim by section, swapping persona names and SQL examples only where natural).

After the walk separator `---`, mirror the junior `<Fragment>` slot from Task 4 (translated, same anchor ids, same exercise count).

### Step 2: Verify RU file parses

```bash
cd site && bun run build 2>&1 | grep -E "databases/ru.*08-putting" | head -10
```

If MDX errors, fix; if budget errors on tier word counts, adjust prose.

### Step 3: Commit checkpoint

```bash
git add site/src/content/book/ru/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone RU frontmatter + walk + junior"
```

---

## Task 9: RU mirror — middle + senior + sandbox + takeaway

**Files:**
- Modify: `site/src/content/book/ru/databases/08-putting-it-together/index.mdx`

### Step 1: Translate the middle `<Fragment>` (mirror Task 5)

Append translated middle slot. Use glossary; preserve every `id=` attribute and every exercise count.

### Step 2: Translate the senior `<Fragment>` (mirror Task 6)

Append translated senior slot. Same anchor ids, same exercise count, `lang="ru"` on every component.

### Step 3: Append sandbox + KeyTakeaway + spiral cues + cross-links (mirror Task 7)

```mdx

## Sandbox синтеза

<DBLeverSandbox client:visible lang="ru" />

<KeyTakeaway>Семь пьес. Семь стадий роста. Каждый пропущенный рычаг возвращается на следующей стадии — дороже. Читайте план, а не симптом.</KeyTakeaway>

<SpiralCue thread="statefulness" lang="ru">State живёт на каждом слое — схема, планы, MVCC-снимки, pool-сессии, shard-карты. Каждая стадия — это один слой state, который сдаётся.</SpiralCue>

<SpiralCue thread="latency" lang="ru">Каждый рычаг возвращает полосу latency, которую прошлый слой утёк. Round-trip math выигрывает и здесь.</SpiralCue>

<SpiralCue thread="multiplexing" lang="ru">Pooling и sharding мультиплексируют ограниченные ресурсы (backend-ов, нод) на многих клиентов. Математика та же, что у TCP-стримов.</SpiralCue>

## Куда дальше

- К схеме: [01 — реляционная модель](/ru/databases/01-relational-model)
- К индексам: [02 — индексы](/ru/databases/02-indexes)
- К планам: [03 — execution plans](/ru/databases/03-execution-plans)
- К MVCC: [04 — MVCC и изоляция](/ru/databases/04-mvcc-isolation)
- К pooling: [05 — pooling](/ru/databases/05-pooling)
- К migrations: [06 — миграции](/ru/databases/06-migrations)
- К sharding: [07 — sharding](/ru/databases/07-sharding)

Следующая глава: [Кеши до самого низа →](/ru/caching/)
```

### Step 4: Full build, check both EN and RU lint clean

```bash
cd site && bun run build 2>&1 | tee /tmp/db08-final-build.log
jq '.errors | map(select(. | test("08-putting-it-together")))' dist/lint-report.json
jq '.errors | length' dist/lint-report.json
```

Expected: errors filter returns `[]` (or only errors unrelated to this piece). Total error count should not increase vs the pre-Task-3 baseline.

### Step 5: Verify i18n parity rule passes

```bash
cd site && jq '.errors | map(select(. | test("i18n.parity|i18n parity")))' dist/lint-report.json
```

Expected: empty. If the parity rule complains, the EN and RU files differ in exercises or anchor ids — re-align them.

### Step 6: Commit RU-complete

```bash
git add site/src/content/book/ru/databases/08-putting-it-together/index.mdx
git commit -m "wip(databases): 08 capstone RU complete"
```

---

## Task 10: Local visual check + status promotion + final commit

**Files:**
- Modify: both `index.mdx` files only if visual check surfaces issues

### Step 1: Run the dev server and open both pages

```bash
cd site && bun run dev &
DEV_PID=$!
sleep 5
open "http://localhost:4321/en/databases/08-putting-it-together"
open "http://localhost:4321/ru/databases/08-putting-it-together"
```

Verify in browser:
- Tier accordion expands all three tiers, content renders
- Sandbox responds to slider + radio inputs, ranks pieces correctly
- `NumbersCard`, `Misconception`, `TradeoffMatrix`, `FadedExample`, `TraceScenario`, `Quiz`, `DragOrder`, `MetaphorComplete`, `DesignPrompt`, `RetrievalDrawer` all render without console errors
- Persona tags render with correct names and roles for each lang
- Cross-links resolve

Kill dev server:

```bash
kill $DEV_PID
```

If anything looks broken, return to the failing task and fix. Otherwise continue.

### Step 2: Frontmatter status is already `ready` — confirm

```bash
grep "^status:" site/src/content/book/en/databases/08-putting-it-together/index.mdx
grep "^status:" site/src/content/book/ru/databases/08-putting-it-together/index.mdx
```

Expected: both lines say `status: ready`.

### Step 3: Final clean rebuild + lint sanity

```bash
cd site && rm -rf dist && bun run build 2>&1 | tail -30
jq '.errors | length, .warnings | length' dist/lint-report.json
jq '.errors | map(select(. | test("08-putting-it-together")))' dist/lint-report.json
```

Expected:
- Build completes successfully
- The final `jq` filter returns `[]` (no errors for the capstone)
- 301 pages output (per CLAUDE.md)

### Step 4: Squash WIP commits into the final ready commit

The pipeline (per `.claude/commands/infographic.md`) wants a single commit per piece in the form `content(<pillar>): <NN-piece> EN+RU ready`. The WIP commits were checkpoints for safety.

```bash
git log --oneline | head -15
# Identify the WIP commits since the spec commit
# Find the SHA of the most recent commit BEFORE this piece's WIP work
BASE=$(git log --oneline --format="%H %s" | grep -E "spec\(databases\): 08" | awk '{print $1}')
git reset --soft "$BASE"
git status
```

Verify only the expected files are staged: the two MDX files, the new sandbox + test, the glossary.

### Step 5: Single final commit

```bash
git commit -m "$(cat <<'EOF'
content(databases): 08-putting-it-together EN+RU ready

Capstone weaving all seven prior databases pieces into one growth narrative
(MVP → 1B rows). Seven acts = seven scale tiers, each surfacing one prior
piece's mechanism as the resolved failure. New synthesis island
DBLeverSandbox lets readers map (rows, workload, tenancy, symptom) onto
the cheapest first lever.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 6: Verify final state

```bash
git log --oneline | head -3
git status
```

Expected: top commit is the `content(databases): 08-putting-it-together EN+RU ready`; working tree clean.

---

## Self-review checklist (run after writing this plan)

- [x] Every spec section maps to a task: frontmatter (T3, T8), walk (T3, T8), junior (T4, T8), middle (T5, T9), senior (T6, T9), sandbox (T1, T7, T9), key takeaway + spiral + links (T7, T9), glossary (T2), build + lint (T7, T9, T10), commit (T10).
- [x] No "TBD" / "TODO" / "implement later". Every code block is complete.
- [x] Decision-table types in `DBLeverSandbox` are stable across the test (T1) and the component (T1) — `Piece` union literal matches in both.
- [x] Anchor ids in body are consistent with `depth.*` in frontmatter: `tier-mechanism`, `stage-tradeoffs`, `m-just-add-index`, `scaling-stage-numbers`.
- [x] Exercise counts hit ≥ 5 junior, ≥ 8 middle, ≥ 7 senior in both languages.
- [x] Word-count targets fall inside the linter's actual budgets, not the test-file's (200-700 / 2500-3700 / 2500-4000).
- [x] Hydration islands ≤ 7 (linter cap; 5 piece-controlled + 2 baseline). `TierAccordion` is Astro (no island). Piece-controlled: 3 `RetrievalDrawer` (one per tier slot, `client:load`) + 1 `DBLeverSandbox` (`client:visible`) + 1 `FadedExample` (`client:visible`) = 5. Plus 2 baseline (`ChapterSidebarTOC` + `SpacedRevisitBanner`) = 7 total. Exactly at cap. If lint flags `> 7`, first drop `client:load` from the junior `RetrievalDrawer` (lowest-traffic tier) and switch to `client:idle`, or drop `FadedExample` hydration and serve static.
- [x] Import paths are exactly 5 `..` segments.
- [x] EN and RU mirror exactly (same anchor ids, same component set, translated text only).
- [x] Personas restricted to `otto` and `sven`.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-14-databases-capstone.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.
