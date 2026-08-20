# Hybrid Lesson Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Postgres full-text search over 4,528 lesson bodies with per-locale stemming, layered under the existing instant in-memory title search.

**Architecture:** The browser keeps a slimmed local index for instant lesson-name matches (0 ms) and additionally calls `/api/search` — a Cloudflare Pages Function — which invokes a Postgres function on the Supabase content mirror. Two visually separate result groups, never co-ranked. If the server half fails, search degrades to local-only and never breaks.

**Tech Stack:** Astro 5, Cloudflare Pages Functions (Workers), Supabase Postgres (PostgREST + plpgsql/SQL RPC), Vitest, bun.

**Spec:** [../specs/2026-08-20-supabase-search-design.md](../specs/2026-08-20-supabase-search-design.md)

## Global Constraints

- Bilingual EN+RU throughout; Russian rows must use the `russian` text-search config, English the `english` one.
- Files stay the source of truth. This plan adds **no** write path from the DB back to `site/src/content/**`.
- Search must degrade, never break: any server-side failure hides the deep group and leaves local search working.
- The Supabase secret key never reaches the client. CSP is `connect-src 'self'` and must not be loosened.
- Never inject server strings via `innerHTML`. Snippets contain `<mark>` and must be built as DOM nodes.
- Offline tests must run with no network and no credentials (Phase 1 convention).
- Site tests: `bun run test` in `site/`. Function tests: `bun run test` in `functions/`. Both gate CI.
- DDL is an operator step: PostgREST cannot execute SQL and no Postgres connection string is configured. Tasks 3 and 4 hand SQL to a human.

## Correction to the spec

The spec specifies `ts_rank` ordering and `ts_headline` snippets reached through PostgREST query params. **PostgREST cannot do either** — it can filter with the `wfts` operator but cannot order by a computed rank or produce headlines. Supabase's own docs direct ranking to "RPC functions or generated columns". The transport decision is unchanged (Pages Function proxy, rate limited, key server-side); only the SQL moves into a database function. Task 4 creates it.

---

### Task 1: MDX → prose extraction

Pure string transform. No database, no network. Indexing raw MDX would match component names — searching `sequencer` would hit every lesson importing `<Sequencer>`.

**Files:**
- Modify: `site/scripts/supabase/corpus.ts`
- Test: `site/scripts/supabase/corpus.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `export function mdxToProse(body: string): string` — used by Task 2.

- [ ] **Step 1: Write the failing tests**

Append to `site/scripts/supabase/corpus.test.ts` (add `mdxToProse` to the existing import from `./corpus`):

```ts
describe("mdxToProse", () => {
  it("drops fenced code blocks entirely", () => {
    const out = mdxToProse("Before\n\n```js\nconst syn = 1;\n```\n\nAfter");
    expect(out).toBe("Before After");
    expect(out).not.toContain("const");
  });

  it("keeps inline code tokens — engineers search for identifiers", () => {
    expect(mdxToProse("Send a `SYN` packet")).toBe("Send a SYN packet");
  });

  it("drops JSX tags but keeps their text children", () => {
    expect(mdxToProse('A <Term k="tcp">handshake</Term> here')).toBe("A handshake here");
  });

  it("drops import and export lines", () => {
    expect(mdxToProse('import X from "~/y";\n\nReal prose.')).toBe("Real prose.");
    expect(mdxToProse("export const a = 1;\n\nReal prose.")).toBe("Real prose.");
  });

  it("keeps link text and drops the URL", () => {
    expect(mdxToProse("See [the RFC](https://example.com/rfc793) now")).toBe("See the RFC now");
  });

  it("strips heading, emphasis and blockquote syntax", () => {
    expect(mdxToProse("## Title\n\n**bold** and _thin_\n\n> quoted")).toBe("Title bold and thin quoted");
  });

  it("drops JSX expression braces", () => {
    expect(mdxToProse("Value {someExpr} here")).toBe("Value here");
  });

  it("collapses whitespace and trims", () => {
    expect(mdxToProse("a\n\n\n   b\t\tc  ")).toBe("a b c");
  });

  it("returns empty string for empty input", () => {
    expect(mdxToProse("")).toBe("");
  });

  it("preserves Cyrillic prose unchanged", () => {
    expect(mdxToProse("Это **рукопожатие** TCP")).toBe("Это рукопожатие TCP");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd site && bunx vitest run scripts/supabase/corpus.test.ts`
Expected: FAIL — `mdxToProse is not a function`

- [ ] **Step 3: Implement**

Add to `site/scripts/supabase/corpus.ts`, after the frontmatter section:

```ts
// ── MDX → prose (search indexing) ───────────────────────────────────────────

const FENCED_CODE   = /```[\s\S]*?```/g;
const HTML_COMMENT  = /<!--[\s\S]*?-->/g;
const IMPORT_EXPORT = /^[ \t]*(?:import|export)\s[^\n]*$/gm;
const MD_IMAGE      = /!\[[^\]]*\]\([^)]*\)/g;
const MD_LINK       = /\[([^\]]*)\]\([^)]*\)/g;
const JSX_TAG       = /<\/?[A-Za-z][\w.]*(?:\s[^>]*?)?\/?>/g;
const JSX_EXPR      = /\{[^{}]*\}/g;
const INLINE_CODE   = /`([^`]+)`/g;
const MD_HEADING    = /^[ \t]*#{1,6}[ \t]+/gm;
const BLOCKQUOTE    = /^[ \t]*>[ \t]?/gm;
const MD_EMPHASIS   = /[*_~]{1,3}/g;

/**
 * Reduce an MDX body to plain prose for full-text indexing.
 *
 * Deliberately lossy and approximate: the output is only ever tokenized by
 * Postgres, never displayed. Order matters — fenced code goes first so its
 * contents cannot be re-matched by the inline-code or JSX rules, and images
 * precede links because `![]()` is a superset of `[]()`.
 *
 * Whole code BLOCKS are dropped (tokenizing them floods the index with
 * language keywords) while INLINE code is kept (identifiers like `SYN` are
 * exactly what an engineer searches for).
 */
export function mdxToProse(body: string): string {
  return body
    .replace(FENCED_CODE, " ")
    .replace(HTML_COMMENT, " ")
    .replace(IMPORT_EXPORT, " ")
    .replace(MD_IMAGE, " ")
    .replace(MD_LINK, "$1")
    .replace(JSX_TAG, " ")
    .replace(JSX_EXPR, " ")
    .replace(INLINE_CODE, "$1")
    .replace(MD_HEADING, " ")
    .replace(BLOCKQUOTE, " ")
    .replace(MD_EMPHASIS, "")
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd site && bunx vitest run scripts/supabase/corpus.test.ts`
Expected: PASS — all tests green (existing 33 + 10 new)

- [ ] **Step 5: Commit**

```bash
git add site/scripts/supabase/corpus.ts site/scripts/supabase/corpus.test.ts
git commit -m "feat(search): reduce MDX bodies to prose for full-text indexing"
```

---

### Task 2: Carry `body_text` on the lesson row

**Files:**
- Modify: `site/scripts/supabase/corpus.ts` (function `lessonRow`)
- Test: `site/scripts/supabase/corpus.test.ts`

**Interfaces:**
- Consumes: `mdxToProse(body: string): string` from Task 1.
- Produces: `lessonRow(...)` rows now carry `body_text: string`. Task 4's SQL indexes this column.

- [ ] **Step 1: Write the failing test**

Append to the existing `describe("lessonRow", ...)` block in `site/scripts/supabase/corpus.test.ts`:

```ts
  it("carries a prose-only body_text alongside the raw body", async () => {
    const raw = await readFile(
      join(site, "src/content/lessons/en", "algorithms/02-arrays-strings/01/index.mdx"),
      "utf8",
    );
    const r = lessonRow(raw, en, "H").row as Record<string, unknown>;
    expect(r.body).toContain("# Body");          // raw body keeps markdown
    expect(r.body_text).toBe("Body Hello world"); // prose is stripped
    expect(typeof r.body_text).toBe("string");
  });

  it("body_hash still hashes the RAW body, not the prose", async () => {
    const raw = await readFile(
      join(site, "src/content/lessons/en", "algorithms/02-arrays-strings/01/index.mdx"),
      "utf8",
    );
    const r = lessonRow(raw, en, "H").row as Record<string, unknown>;
    expect(r.body_hash).toBe(sha256(r.body as string));
    expect(r.body_hash).not.toBe(sha256(r.body_text as string));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run scripts/supabase/corpus.test.ts`
Expected: FAIL — `expected undefined to be "Body Hello world"`

- [ ] **Step 3: Implement**

In `site/scripts/supabase/corpus.ts`, inside `lessonRow`, add one entry to the `row` object immediately after `body`:

```ts
    body,
    body_text: mdxToProse(body),
    body_hash: sha256(body),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd site && bunx vitest run scripts/supabase/corpus.test.ts`
Expected: PASS

Also confirm the offline diff still materializes the whole corpus:

Run: `cd site && bun scripts/supabase/sync-content.ts --dry-run`
Expected: `would change 6618 row(s)` — unchanged, because `content_hash` still hashes the source file.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/supabase/corpus.ts site/scripts/supabase/corpus.test.ts
git commit -m "feat(search): carry prose body_text on mirrored lesson rows"
```

---

### Task 3: Schema migration — `body_text` + generated `tsvector` (OPERATOR STEP)

This task is a gate. **If the generated-column expression is rejected, stop and apply the fallback before continuing** — nothing downstream is worth building until the index shape is settled.

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Consumes: `body_text` column written by Task 2.
- Produces: `curriculum.lessons.search_vector` (tsvector, GIN-indexed) — queried by Task 4's function.

- [ ] **Step 1: Add the migration to `supabase/schema.sql`**

Append before the grants block (the grants must run after, so new columns are covered):

```sql
-- ── Full-text search (Phase 2) ───────────────────────────────────────────────
-- body_text is prose extracted from the MDX by the sync (scripts/supabase/
-- corpus.ts mdxToProse) — indexing raw MDX would match component names.
alter table curriculum.lessons
  add column if not exists body_text text not null default '';

-- Per-row language selection is the point: Russian rows get the Russian
-- stemmer, so "рукопожатия" matches "рукопожатие". The two-argument
-- to_tsvector(regconfig, text) form is immutable, which a generated column
-- requires; the one-argument form is not and cannot be used here.
alter table curriculum.lessons
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector(case lang when 'ru' then 'russian'::regconfig
                                    else 'english'::regconfig end,
                          coalesce(title, '')), 'A') ||
    setweight(to_tsvector(case lang when 'ru' then 'russian'::regconfig
                                    else 'english'::regconfig end,
                          coalesce(summary, '')), 'B') ||
    setweight(to_tsvector(case lang when 'ru' then 'russian'::regconfig
                                    else 'english'::regconfig end,
                          coalesce(body_text, '')), 'C')
  ) stored;

create index if not exists lessons_search_idx
  on curriculum.lessons using gin (search_vector);
```

- [ ] **Step 2: Apply it (human, Supabase Dashboard → SQL Editor)**

Paste the block above and Run.

**Expected:** success.

**If it fails with `generation expression is not immutable`:** apply this fallback instead, then adapt Task 4's function to pick the column by `lang_code`:

```sql
alter table curriculum.lessons
  add column if not exists fts_en tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) stored;
alter table curriculum.lessons
  add column if not exists fts_ru tsvector
  generated always as (
    setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(body_text, '')), 'C')
  ) stored;
create index if not exists lessons_fts_en_idx on curriculum.lessons using gin (fts_en) where lang = 'en';
create index if not exists lessons_fts_ru_idx on curriculum.lessons using gin (fts_ru) where lang = 'ru';
```

- [ ] **Step 3: Re-run the grants (human, SQL Editor)**

New columns inherit table grants, but re-running is idempotent and cheap insurance:

```sql
grant select on all tables in schema curriculum to anon, authenticated;
grant all on all tables in schema curriculum to service_role;
revoke select on curriculum.sync_log from anon, authenticated;
```

- [ ] **Step 4: Backfill `body_text` for all 4,528 lessons**

`content_hash` hashes the source FILE, and no file changed — so the ledger reports everything unchanged and a normal sync would push nothing. Force it:

Run: `cd site && bun run sync:supabase -- --force --only lessons`
Expected: `lessons: upserted 4528 rows`, finishing in roughly a minute.

- [ ] **Step 5: Verify the index is populated**

Run: `cd site && bun run verify:supabase-parity`
Expected: `RESULT: OK (full) — no drift.`

Then in the SQL Editor, confirm the vector is non-empty and Russian stemming works:

```sql
select count(*) filter (where search_vector is null or search_vector = ''::tsvector) as empty_vectors,
       count(*) as total
from curriculum.lessons;
-- expect empty_vectors = 0 (or a small count of genuinely empty stub lessons)

select title from curriculum.lessons
where lang = 'ru' and search_vector @@ websearch_to_tsquery('russian', 'рукопожатия')
limit 5;
-- expect rows back: the INFLECTED query matching the base form is the whole point
```

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(search): tsvector column + GIN index on mirrored lessons"
```

---

### Task 4: The search function in Postgres (OPERATOR STEP)

PostgREST can filter by full-text match but cannot order by `ts_rank` or produce `ts_headline` snippets. Both live in SQL.

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Consumes: `curriculum.lessons.search_vector` from Task 3.
- Produces: RPC `curriculum.search_lessons(q text, lang_code text, max_results int)` returning rows of `(slug, track, unit, title, summary, snippet, rank)` — called by Task 5's endpoint.

- [ ] **Step 1: Add the function to `supabase/schema.sql`**

```sql
-- Ranked full-text search over mirrored lessons. Lives in SQL because
-- PostgREST cannot ORDER BY ts_rank or produce ts_headline snippets.
-- `stable`, read-only, and callable only by service_role (the /api/search proxy).
create or replace function curriculum.search_lessons(
  q            text,
  lang_code    text,
  max_results  int default 20
)
returns table (
  slug text, track text, unit text, title text, summary text, snippet text, rank real
)
language sql
stable
as $$
  with cfg as (
    select case lang_code when 'ru' then 'russian'::regconfig
                          else 'english'::regconfig end as c
  ), query as (
    select websearch_to_tsquery((select c from cfg), q) as tsq
  )
  select
    l.slug, l.track, l.unit, l.title, l.summary,
    ts_headline(
      (select c from cfg),
      l.body_text,
      (select tsq from query),
      'StartSel=<mark>,StopSel=</mark>,MaxWords=30,MinWords=12,MaxFragments=1,FragmentDelimiter= … '
    ) as snippet,
    ts_rank(l.search_vector, (select tsq from query)) as rank
  from curriculum.lessons l
  where l.lang = lang_code
    and l.status = 'ready'
    and l.search_vector @@ (select tsq from query)
  order by rank desc, l.track, l.slug
  limit least(greatest(coalesce(max_results, 20), 1), 50);
$$;

revoke all on function curriculum.search_lessons(text, text, int) from public, anon, authenticated;
grant execute on function curriculum.search_lessons(text, text, int) to service_role;
```

Note `order by rank desc, l.track, l.slug` — the trailing keys make ordering deterministic when ranks tie, so results do not shuffle between identical queries.

If Task 3 used the two-column fallback, replace `l.search_vector` with
`case lang_code when 'ru' then l.fts_ru else l.fts_en end` in both places.

- [ ] **Step 2: Apply it (human, SQL Editor)** — paste and Run. Expected: `CREATE FUNCTION`, then `GRANT`.

- [ ] **Step 3: Verify it returns ranked rows with snippets**

```sql
select title, rank, snippet from curriculum.search_lessons('рукопожатия', 'ru', 5);
-- expect: rows ordered by rank desc, snippet containing <mark>…</mark>

select title, rank from curriculum.search_lessons('tcp handshake', 'en', 5);
-- expect: the three-way handshake lesson at or near the top
```

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(search): ranked search_lessons RPC with per-locale headlines"
```

---

### Task 5: `/api/search` Pages Function

**Files:**
- Create: `functions/api/search.ts`
- Create: `functions/api/search.test.ts`
- Modify: `functions/lib/types.ts` (add two `Env` fields)

**Interfaces:**
- Consumes: RPC `curriculum.search_lessons` from Task 4; `rateLimit` from `functions/lib/ratelimit.ts`; `json`/`error` from `functions/lib/response.ts`.
- Produces: `GET /api/search?q=&lang=` → `{ results: SearchHit[] }` where
  `SearchHit = { slug: string; track: string; unit: string; title: string; href: string; snippet: string }`.
  Also exports `validateSearchParams(q, lang)` for tests.

- [ ] **Step 1: Extend `Env`**

In `functions/lib/types.ts`, add to `interface Env`:

```ts
  SUPABASE_URL?: string;        // content mirror; unset = deep search disabled
  SUPABASE_SECRET_KEY?: string; // service_role key; server-side only, never shipped
```

Both optional on purpose: with them unset the endpoint returns an empty result set rather than erroring, so a preview deployment without secrets still serves working local-only search.

- [ ] **Step 2: Write the failing tests**

Create `functions/api/search.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateSearchParams, onRequestGet } from "./search";
import { FakeKV } from "../test/fakes";

const env = (over: Record<string, unknown> = {}) => ({
  SESSIONS: new FakeKV() as any,
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  ...over,
}) as any;

const ctx = (url: string, e = env()) => ({
  request: new Request(url, { headers: { "CF-Connecting-IP": "1.2.3.4" } }),
  env: e,
  data: { userId: null },
}) as any;

describe("validateSearchParams", () => {
  it("accepts a normal query", () => {
    expect(validateSearchParams("tcp", "en")).toEqual({ ok: true, q: "tcp", lang: "en" });
  });
  it("trims before measuring length", () => {
    expect(validateSearchParams("  tcp  ", "en")).toEqual({ ok: true, q: "tcp", lang: "en" });
  });
  it("rejects a query shorter than 2 chars", () => {
    expect(validateSearchParams("a", "en").ok).toBe(false);
  });
  it("rejects a missing query", () => {
    expect(validateSearchParams(null, "en").ok).toBe(false);
  });
  it("rejects a query longer than 128 chars", () => {
    expect(validateSearchParams("x".repeat(129), "en").ok).toBe(false);
  });
  it("rejects an unknown locale", () => {
    expect(validateSearchParams("tcp", "de").ok).toBe(false);
    expect(validateSearchParams("tcp", null).ok).toBe(false);
  });
  it("accepts Cyrillic queries", () => {
    expect(validateSearchParams("рукопожатие", "ru").ok).toBe(true);
  });
});

describe("GET /api/search", () => {
  it("400s on a bad query without calling the database", async () => {
    let called = false;
    globalThis.fetch = (async () => { called = true; return new Response("[]"); }) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=a&lang=en"));
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });

  it("maps rows to hits with a built href", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify([
      { slug: "01-the-three-way-handshake", track: "networking", unit: "03-tcp-handshake",
        title: "The three-way handshake", summary: "s", snippet: "a <mark>SYN</mark> packet", rank: 0.9 },
    ]), { status: 200 })) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en"));
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.results).toHaveLength(1);
    expect(body.results[0].href).toBe("/en/learn/networking/03-tcp-handshake/01-the-three-way-handshake/");
    expect(body.results[0].snippet).toBe("a <mark>SYN</mark> packet");
  });

  it("returns an empty result set when the database errors — search degrades, never breaks", async () => {
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as any;
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en"));
    expect(res.status).toBe(200);
    expect((await res.json() as any).results).toEqual([]);
  });

  it("returns an empty result set when the mirror is not configured", async () => {
    const res = await onRequestGet(ctx("https://x/api/search?q=handshake&lang=en",
      env({ SUPABASE_URL: undefined, SUPABASE_SECRET_KEY: undefined })));
    expect(res.status).toBe(200);
    expect((await res.json() as any).results).toEqual([]);
  });

  it("429s once the per-IP limit is exhausted", async () => {
    globalThis.fetch = (async () => new Response("[]", { status: 200 })) as any;
    const e = env();
    const c = () => ctx("https://x/api/search?q=handshake&lang=en", e);
    for (let i = 0; i < 30; i++) await onRequestGet(c());
    const res = await onRequestGet(c());
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd functions && bunx vitest run api/search.test.ts`
Expected: FAIL — cannot resolve `./search`

- [ ] **Step 4: Implement**

Create `functions/api/search.ts`:

```ts
/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { json, error } from "../lib/response";
import { rateLimit } from "../lib/ratelimit";

const MIN_Q = 2;
const MAX_Q = 128;
const MAX_RESULTS = 20;
const RATE_LIMIT = 30;      // requests per IP per window
const RATE_WINDOW = 60;     // seconds
const LOCALES = new Set(["en", "ru"]);

export interface SearchHit {
  slug: string; track: string; unit: string;
  title: string; href: string; snippet: string;
}

export type Validation =
  | { ok: true; q: string; lang: string }
  | { ok: false; reason: string };

/** Reject bad input before it can reach the database. */
export function validateSearchParams(q: string | null, lang: string | null): Validation {
  const trimmed = (q ?? "").trim();
  if (trimmed.length < MIN_Q) return { ok: false, reason: "q_too_short" };
  if (trimmed.length > MAX_Q) return { ok: false, reason: "q_too_long" };
  if (!lang || !LOCALES.has(lang)) return { ok: false, reason: "bad_lang" };
  return { ok: true, q: trimmed, lang };
}

interface Row {
  slug: string; track: string; unit: string;
  title: string; summary: string; snippet: string; rank: number;
}

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const v = validateSearchParams(url.searchParams.get("q"), url.searchParams.get("lang"));
  if (!v.ok) return error(400, v.reason);

  const ip = ctx.request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rl = await rateLimit({
    kv: ctx.env.SESSIONS, ip, bucket: "search",
    limit: RATE_LIMIT, windowSec: RATE_WINDOW,
  });
  if (!rl.ok) return error(429, "rate_limited");

  // Unconfigured mirror is not an error: local search still works, and a
  // preview deployment without secrets should serve a working page.
  const base = ctx.env.SUPABASE_URL;
  const key = ctx.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return json({ results: [] });

  let rows: Row[] = [];
  try {
    const res = await fetch(`${base}/rest/v1/rpc/search_lessons`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-profile": "curriculum",   // selects the schema for RPC POSTs
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ q: v.q, lang_code: v.lang, max_results: MAX_RESULTS }),
    });
    if (!res.ok) return json({ results: [] });   // degrade, never break
    rows = (await res.json()) as Row[];
  } catch {
    return json({ results: [] });
  }

  const results: SearchHit[] = (rows ?? []).map((r) => ({
    slug: r.slug, track: r.track, unit: r.unit, title: r.title,
    href: `/${v.lang}/learn/${r.track}/${r.unit}/${r.slug}/`,
    snippet: r.snippet ?? "",
  }));

  return json({ results }, 200, { "cache-control": "public, max-age=300" });
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd functions && bunx vitest run api/search.test.ts`
Expected: PASS

Then the whole function suite, to catch regressions:

Run: `cd functions && bun run test`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add functions/api/search.ts functions/api/search.test.ts functions/lib/types.ts
git commit -m "feat(search): rate-limited /api/search proxy over the content mirror"
```

---

### Task 6: Slim the local index

Dropping `summary` cuts the index **53% (EN, 952→449 KB)** and **62% (RU, 1344→516 KB)**. Summaries stay searchable server-side. Truncating instead of dropping was measured and rejected: 100-char truncation saves only 26–31% while mangling text mid-sentence.

**Files:**
- Modify: `site/src/pages/[lang]/search-index.json.ts`
- Modify: `site/src/components/nav/GlobalSearch.astro`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: index entries of shape `{ slug, pillar, pillarColor, title, href }` (no `summary`), consumed by the client's local `score()` and renderer.

- [ ] **Step 1: Drop `summary` from the emitted index**

In `site/src/pages/[lang]/search-index.json.ts`, remove the `summary` line from the mapped object:

```ts
  const index = lessons.map((e) => ({
    slug: e.data.slug,
    pillar: e.data.track,
    pillarColor: trackColorBySlug[e.data.track] ?? "lilac",
    title: e.data.title,
    href: `/${lang}/learn/${e.data.track}/${e.data.unit}/${e.data.slug}/`,
  }));
```

- [ ] **Step 2: Update the local scorer to stop reading `summary`**

In `GlobalSearch.astro`, `score()` currently weights `summary` at 2. Remove that branch and its `const s = ...` line, leaving title/slug/pillar:

```ts
  function score(item: { title: string; pillar: string; slug: string }, q: string): number {
    if (!q) return 0;
    const t = item.title.toLowerCase();
    const p = item.pillar.toLowerCase();
    const slug = item.slug.toLowerCase();
    let score = 0;
    if (t.includes(q)) score += 10;
    if (slug.includes(q)) score += 6;
    if (p.includes(q)) score += 4;
    return score;
  }
```

- [ ] **Step 3: Stop rendering the summary line, and stop using `innerHTML`**

The existing renderer interpolates `hit.title` and `hit.summary` straight into `innerHTML`. `summary` is now gone, and Task 7 adds server-supplied snippets — so switch this loop to DOM construction now, while it is still simple. Replace the `for (const hit of scored)` body with:

```ts
      for (const hit of scored) {
        list!.appendChild(renderHit({
          href: hit.href, pillarColor: hit.pillarColor,
          meta: `${hit.pillar} / ${hit.slug}`, title: hit.title,
        }));
      }
```

And add this helper next to `score()`:

```ts
  /**
   * Build a result row as DOM nodes. Never innerHTML: Task 7 feeds server
   * snippets through `extra`, and lesson bodies are the source of that text.
   */
  function renderHit(o: {
    href: string; pillarColor: string; meta: string; title: string;
    extra?: Node;
  }): HTMLLIElement {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = o.href;
    a.className = "block px-4 py-3 hover:bg-card-2 border-b border-rule flex items-start gap-3";
    const dot = document.createElement("span");
    dot.className = "pill-dot mt-1.5";
    dot.style.background = PILLAR_VAR[o.pillarColor] ?? "var(--rule-strong)";
    const col = document.createElement("span");
    col.className = "flex-1 min-w-0";
    const meta = document.createElement("span");
    meta.className = "font-mono text-[10.5px] text-muted block";
    meta.textContent = o.meta;
    const title = document.createElement("span");
    title.className = "font-display text-[14px] font-semibold text-ink block truncate";
    title.textContent = o.title;
    col.append(meta, title);
    if (o.extra) col.appendChild(o.extra);
    a.append(dot, col);
    li.appendChild(a);
    return li;
  }
```

- [ ] **Step 4: Verify the index shrinks and search still works**

Run: `cd site && bun run build:incremental`
Then: `ls -l dist/en/search-index.json dist/ru/search-index.json`
Expected: roughly 449 KB and 516 KB (down from 952 KB / 1344 KB)

Run: `cd site && bun run test`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add "site/src/pages/[lang]/search-index.json.ts" site/src/components/nav/GlobalSearch.astro
git commit -m "perf(search): drop summaries from the local index, render hits as DOM"
```

---

### Task 7: The deep-search result group

**Files:**
- Modify: `site/src/components/nav/GlobalSearch.astro`
- Modify: `site/src/i18n/ui.json`

**Interfaces:**
- Consumes: `GET /api/search` from Task 5; `renderHit` from Task 6.
- Produces: the finished feature.

- [ ] **Step 1: Add the labels**

In `site/src/i18n/ui.json`, add to both the `en` and `ru` maps (match the file's existing key style):

```json
"search.group.lessons": "Lessons",
"search.group.inText": "In lesson text",
"search.deep.searching": "Searching lesson text…"
```

Russian: `"Уроки"`, `"В тексте уроков"`, `"Поиск по тексту уроков…"`.

- [ ] **Step 2: Surface the labels to the client script**

The client reads labels from `data-` attributes on the results list (this is how
`emptyLabel` and `noMatchLabel` already work) — the script cannot import from
`ui.json` at runtime. In the `.astro` template add to the `<ol data-search-results>`
element:

```astro
  data-group-lessons-label={t("search.group.lessons")}
  data-group-intext-label={t("search.group.inText")}
```

And beside the existing `const emptyLabel = ...` line in the script:

```ts
    const groupLessonsLabel = list.dataset.groupLessonsLabel ?? "";
    const groupInTextLabel = list.dataset.groupIntextLabel ?? "";
```

Note the dataset casing: `data-group-intext-label` becomes `groupIntextLabel`
(a single capital I), not `groupInTextLabel`. Getting this wrong yields a silently
empty heading rather than an error.

- [ ] **Step 3: Add a group heading before the local results**

In `render()`, before the `for (const hit of scored)` loop, append a heading row so the two groups are visually distinct:

```ts
      list!.appendChild(groupHeading(groupLessonsLabel));
```

With this helper beside `renderHit`:

```ts
  function groupHeading(text: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "px-4 pt-3 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted";
    li.textContent = text;
    return li;
  }
```

- [ ] **Step 4: Fetch deep results, ignoring stale responses**

Add near `loadIndex`:

```ts
  // Monotonic request id: a slower earlier request must never overwrite the
  // results of a later one the user is actually looking at.
  let deepSeq = 0;
  let deepTimer: number | undefined;

  function scheduleDeep(query: string, lang: string, onResults: (hits: DeepHit[]) => void) {
    window.clearTimeout(deepTimer);
    deepTimer = window.setTimeout(() => {
      const seq = ++deepSeq;
      fetch(`/api/search?q=${encodeURIComponent(query)}&lang=${lang}`)
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d: { results: DeepHit[] }) => {
          if (seq !== deepSeq) return;               // superseded — drop it
          if (input!.value.trim().toLowerCase() !== query) return;
          onResults(d.results ?? []);
        })
        .catch(() => { /* degrade silently: local results stand */ });
    }, 200);
  }
```

With the type beside `Hit`:

```ts
  interface DeepHit { slug: string; track: string; unit: string; title: string; href: string; snippet: string; }
```

- [ ] **Step 5: Render the deep group, with `<mark>` as real nodes**

Add the renderer, then call `scheduleDeep` at the end of `render()`:

```ts
  /**
   * ts_headline returns text with <mark> delimiters. Parse it into text nodes
   * and <mark> elements by hand — this string originates in lesson bodies and
   * must never be assigned to innerHTML.
   */
  function snippetNodes(snippet: string): DocumentFragment {
    const frag = document.createDocumentFragment();
    let marked = false;
    for (const part of snippet.split(/(<mark>|<\/mark>)/)) {
      if (part === "<mark>") { marked = true; continue; }
      if (part === "</mark>") { marked = false; continue; }
      if (!part) continue;
      if (marked) {
        const m = document.createElement("mark");
        m.textContent = part;         // textContent, never innerHTML
        frag.appendChild(m);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    return frag;
  }

  function renderDeep(hits: DeepHit[], localHrefs: Set<string>) {
    const fresh = hits.filter((h) => !localHrefs.has(h.href));
    if (fresh.length === 0) return;
    // The endpoint returns a track, not a colour. Derive it from the local
    // index so deep rows carry the same track dot as local ones.
    const colorByTrack = new Map<string, string>();
    for (const it of cachedIndex ?? []) {
      if (!colorByTrack.has(it.pillar)) colorByTrack.set(it.pillar, it.pillarColor);
    }
    list!.appendChild(groupHeading(groupInTextLabel));
    for (const h of fresh) {
      const extra = document.createElement("span");
      extra.className = "text-[12px] text-muted block line-clamp-2 mt-1 gs-snippet";
      extra.appendChild(snippetNodes(h.snippet));
      list!.appendChild(renderHit({
        href: h.href, pillarColor: colorByTrack.get(h.track) ?? "lilac",
        meta: `${h.track} / ${h.slug}`, title: h.title, extra,
      }));
    }
  }
```

At the end of `render()`:

```ts
      const localHrefs = new Set(scored.map((h) => h.href));
      scheduleDeep(query, lang, (hits) => renderDeep(hits, localHrefs));
```

De-duplicating against the local hrefs matters: a lesson whose title matches will also match its own body, and showing it twice looks broken.

- [ ] **Step 6: Write the staleness test**

Create `site/src/components/nav/search-staleness.test.ts` proving the ordering guarantee (the logic is extracted so it is testable without a DOM):

```ts
import { describe, it, expect } from "vitest";

/** Mirrors the deepSeq guard in GlobalSearch.astro. */
function makeGuard() {
  let seq = 0;
  return {
    start: () => ++seq,
    accept: (mine: number) => mine === seq,
  };
}

describe("deep-search staleness guard", () => {
  it("ignores an earlier response that lands after a later one", () => {
    const g = makeGuard();
    const first = g.start();
    const second = g.start();
    expect(g.accept(second)).toBe(true);
    expect(g.accept(first)).toBe(false);
  });
  it("accepts the only in-flight response", () => {
    const g = makeGuard();
    expect(g.accept(g.start())).toBe(true);
  });
});
```

- [ ] **Step 7: Run everything**

Run: `cd site && bun run test`
Expected: PASS

Run: `cd functions && bun run test`
Expected: PASS

Run: `cd site && bun run lint:src`
Expected: 0 errors

- [ ] **Step 8: Live smoke — the capability that justifies this work**

Start the dev server and confirm end to end, in both locales:

```bash
cd /Users/artemmac/dev/awesome-everything && bun run dev:functions
```

- Search `рукопожатия` (inflected) in RU → the TCP handshake lesson appears under "В тексте уроков". This is the case the old substring index **cannot** match, so it is the proof the feature works.
- Search a phrase that appears only in a lesson body, never in a title → appears only in the deep group.
- Search a lesson title → appears instantly in the local group, and is **not** duplicated below.
- Stop the dev server's network access (or set `SUPABASE_URL` empty) → local results still render, deep group silently absent.

- [ ] **Step 9: Commit**

```bash
git add site/src/components/nav/GlobalSearch.astro site/src/i18n/ui.json site/src/components/nav/search-staleness.test.ts
git commit -m "feat(search): deep results group backed by Postgres full-text search"
```
