# Hybrid lesson search on the Supabase content mirror

Date: 2026-08-20
Status: approved design, not yet implemented
Phase: 2 of the Supabase content migration
Prior art: [../../2026-08-20-supabase-content-migration.md](../../2026-08-20-supabase-content-migration.md)

## Why

Search today is a static per-locale JSON index fetched on first search-open and
matched in memory with `String.includes()` over `title`, `summary`, `track` and
`slug`. It has two real weaknesses, and one commonly-cited weakness that is not
actually a problem:

- **Russian is badly served.** Substring matching cannot handle inflection:
  `рукопожатие` does not match `рукопожатия`. Half the corpus is Russian.
- **4,528 lesson bodies are unsearchable.** ~77 MB of prose — already mirrored
  into Postgres in Phase 1 — is invisible to search.
- **Not a problem: page weight.** The index loads lazily on first search-open
  and is cached, so it is not on the page-load critical path. That was fixed
  earlier. Payload reduction is a welcome side effect here, not the motive.

Phase 1 put the whole corpus in Postgres. Full-text search is the first surface
where that genuinely pays.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Database split | Supabase owns content; D1 keeps users/progress/events | No migration of working auth-critical data; each store keeps what it is good at. |
| Phase 2 scope | Search only | Self-contained, degrades safely, proves the runtime-read pattern on low-stakes ground. |
| Search shape | Hybrid: instant local titles + server-side deep results | Preserves the 0 ms common case (find a lesson by name) while adding body search and stemming. |
| Transport | Cloudflare Pages Function proxy | Rate limiting and edge caching on a public unauthenticated endpoint; key stays server-side; backend stays swappable. |

Explicitly rejected: server-only search (regresses the most common interaction),
direct browser→Supabase (unbounded query bill on a public site), and moving
lesson rendering to the database (Phase 2 decision in the migration doc).

## Architecture

```
Browser ──type──▶ slim local index ─────────────▶ "Lessons" group      (0 ms)
         └─debounce 200 ms─▶ /api/search ──▶ Supabase ──▶ "In lesson text" group (~250 ms)
```

Two visually separate result groups. The local group renders instantly, exactly
as today; the server group fills in beneath it. **The groups are never merged
or co-ranked** — that removes the hardest part of hybrid search (reconciling two
incomparable score scales) and makes each half independently testable.

Measured impact on the local index (dropping `summary`, which becomes
server-searchable):

| Locale | Today | Slim | Saved |
|---|---:|---:|---:|
| EN | 952 KB | 364 KB | 62% |
| RU | 1344 KB | 432 KB | 68% |

## Data model

Two additions to `curriculum.lessons`.

### `body_text` — prose extracted from MDX

Written by the sync, not derived in SQL. Indexing raw MDX would match component
names: searching `sequencer` would hit every lesson that imports `<Sequencer>`.

Extraction rules (applied in order, in `corpus.ts`):

1. Drop `import` / `export` statement lines.
2. Drop JSX/HTML tags, keeping their text children (`<Term k="x">TCP</Term>` → `TCP`).
3. Drop fenced code blocks entirely — code is not prose, and tokenizing it
   pollutes the index with punctuation and keywords.
4. Drop inline-code backticks but keep the token (`` `SYN` `` → `SYN`), since
   identifiers are exactly what an engineer searches for.
5. Strip markdown emphasis/heading/link syntax, keeping link text, dropping URLs.
6. Collapse whitespace runs to single spaces.

This is a pure string→string function, unit-tested offline against fixtures. It
is deliberately lossy and approximate: its output is only ever tokenized by
Postgres, never displayed.

### `search_vector` — generated tsvector + GIN index

```sql
alter table curriculum.lessons
  add column if not exists body_text text not null default '';

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

Per-row language selection is the point: Russian rows get the Russian stemmer.
The two-argument `to_tsvector(regconfig, text)` form is immutable, which a
generated column requires; the one-argument form is not and cannot be used.

Because the column is `generated always ... stored`, it recomputes on every
upsert. **The mirror keeps the search index current with no new sync step.**

**Risk — verify first.** Whether Postgres accepts the `case`-over-`regconfig`
expression as immutable inside a generated column is unverified: PostgREST
cannot execute DDL and this project has no scripted Postgres connection, so
schema changes are operator steps via the Dashboard SQL editor. If it is
rejected, fall back to two columns (`fts_en`, `fts_ru`), each with a literal
config and a partial index on `lang`. Same behaviour, slightly more storage.
**This is task 1 of implementation** — nothing else is worth building until it
is settled.

### Sync impact

`body_text` participates in the row payload, so every lesson row grows. The
content hash is unchanged (it still hashes the source file), so a one-off
`--force` sync is required to backfill `body_text` for all 4,528 lessons.
Recorded as an invariant in the migration doc: a changed row *shape* does not
change a content hash.

## Endpoint contract

`GET /api/search?q=<query>&lang=<en|ru>`

- **Validation.** `q` trimmed, 2–128 chars, else `400`. `lang` must be in the
  locale allowlist, else `400`. Both are rejected before any database call.
- **Rate limiting.** Reuses `functions/lib/ratelimit.ts`. Unauthenticated public
  endpoint on a public site: without a limit, query cost is unbounded.
- **Query.** `websearch_to_tsquery(<config>, q)` — gives users `"exact phrase"`
  and `-exclusion` syntax for free, and never throws on malformed input the way
  `to_tsquery` does.
- **Ranking.** `ts_rank(search_vector, query)` descending, capped at 20 rows.
- **Snippet.** `ts_headline` over `body_text`, so results show *why* they
  matched. Delimiters are `<mark>`; the client inserts them as text nodes, never
  via `innerHTML`.
- **Response.** `{ results: [{ slug, track, unit, title, href, snippet }] }`
- **Caching.** `Cache-Control: public, max-age=300` so the edge absorbs repeats.
- **Secret.** The Supabase secret key stays in the Cloudflare environment and
  never reaches the client. This is why the proxy exists.

## Client changes

- `src/pages/[lang]/search-index.json.ts` — drop `summary` from the emitted rows.
- `src/components/nav/GlobalSearch.astro` — keep existing local scoring
  untouched; add a debounced (200 ms) fetch to `/api/search`, rendered as a
  second labelled group. In-flight requests are superseded by newer keystrokes
  (track a request id; ignore stale responses).
- New i18n labels for both group headings and the deep-search empty/error state.
- No new hydrated island: the search drawer is already a plain client script,
  and this adds no framework component.

## Failure modes

Degradation is the design, not an afterthought.

| Failure | Behaviour |
|---|---|
| `/api/search` 5xx, timeout, or network error | Deep group is not rendered. Local results unaffected. No error toast. |
| Rate limited (429) | Same as above. Search stays usable. |
| Supabase down entirely | Same as above. |
| Slim index fails to load | Existing behaviour: empty local group; deep group still works. |

Search is never broken — only ever shallower. This mirrors the render path: a
database problem degrades a feature, never the curriculum.

## Testing

| Layer | What | Where |
|---|---|---|
| MDX→prose extraction | Pure function, fixture-driven: tags stripped, code fenced out, inline code kept, links keep text | `scripts/supabase/corpus.test.ts` |
| Query/param validation | Length and locale rejection, boundary cases | `functions/api/search.test.ts` |
| Endpoint behaviour | Faked Supabase response: shape, cap, error → empty | `functions/api/search.test.ts` |
| Client merge/staleness | Stale response ignored when a newer query is in flight | co-located with GlobalSearch |
| Live smoke | A known Russian inflection matches its lesson (the capability that justifies this work) | manual / scripted check |

The offline layers must be runnable with no network and no credentials, matching
the Phase 1 convention that made `corpus.ts` fully testable.

## Rollout

1. Verify the generated-column expression (operator SQL). Settle the fallback.
2. Implement `body_text` extraction + tests; `--force` sync to backfill.
3. Apply the schema migration (operator SQL); verify with a live query.
4. Build and test the endpoint.
5. Slim the local index; wire the client's second group.
6. Ship. The static index remains the floor, so rollback is reverting the client.

## Out of scope

- Search over practice tasks, projects, drills, lab tiers. Lessons first.
- Semantic/vector search. Postgres FTS first; embeddings are a separate question.
- Path engine and assessment reads (deferred Phase 2 candidates).
- Any change to lesson rendering, which stays file-based.
