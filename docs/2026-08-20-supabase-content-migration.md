# Supabase content migration

Status: **Phase 1 (mirror) live and verified** against project `zdtfehtbjcesuyawksgm`
on 2026-08-20. **Phase 2 direction decided** (runtime reads for dynamic surfaces
only, see below); not yet implemented.

## Why

`site/src/content/**` is the whole curriculum: 6,618 addressable records across
7 collections, ~150 MB of text. Astro reads it from disk at build time, which is
why a full render is several thousand pages and minutes long, and why anything
that wants to *query* the corpus (search, the path engine, analytics, an
authoring UI) has to re-walk the filesystem to do it.

Moving the corpus into Postgres is what makes those things cheap. The migration
is staged so that no stage can break the site.

## Measured corpus (2026-08-20)

| Collection | Rows  | Source of truth                          |
|-----------|------:|------------------------------------------|
| tracks    |    44 | `src/content/tracks.json` (1 row/entry)   |
| units     |   440 | `src/content/units.json` (1 row/entry)    |
| lessons   | 4,528 | `src/content/lessons/{en,ru}/**/index.mdx`|
| practice  | 1,540 | `src/content/practice/**/*.json`          |
| projects  |    51 | `src/content/projects/*.json`             |
| drill     |    11 | `src/content/drill/**/*.json`             |
| lab       |     4 | `src/content/lab/*.json`                  |
| **total** |**6,618** | |

Lesson bodies average ~17 KB, practice files ~26 KB.

## Phase 1 — mirror (implemented)

Files stay the single source of truth. The database is a **derived, disposable
copy**. Nothing reads from it yet, so it cannot break a build or a page.

- `supabase/schema.sql` — the `curriculum` schema: one table per collection,
  identity columns + `data`/`body` payload + `content_hash`, RLS with public
  read and service-role write.
- `site/scripts/supabase/corpus.ts` — pure, network-free corpus logic: walk,
  hash, frontmatter split, row building, ledger diffing. Unit-tested offline.
- `site/scripts/supabase/sync-content.ts` — `bun run sync:supabase`. Diffs the
  corpus against the `curriculum.sync_log` ledger and upserts only what changed.
- `site/scripts/supabase/verify-parity.ts` — `bun run verify:supabase-parity`.
  Compares every local hash against the mirror; missing / drifted / extra rows
  fail the gate.
- Deploy workflow runs both on `main` with `continue-on-error: true`.

Setup: [operator-setup-supabase.md](operator-setup-supabase.md).

### Design points worth keeping

**Content hashing is the sync contract.** Every row carries the sha256 its
source file hashed to; `sync_log` records the last hash pushed per key. An
unchanged corpus syncs zero rows. Lesson `body` is hashed separately
(`body_hash`) so a frontmatter-only edit is visible without diffing blobs.

**Ledger keys are namespaced** `"<kind>#<pk>"` and round-trip back to primary-key
columns (`ledgerKeyToPk` / `pkToLedgerKey`, property-tested). The namespace is
what lets a partial sync know which table a stale ledger entry belongs to.

**Deletion is opt-in and scoped.** `--prune` is the only path that deletes, and
the diff's deletion half is scoped to the collections in play — otherwise
`--only lessons` would see every non-lesson ledger entry as a vanished file and
prune would wipe six tables. Regression-tested in `corpus.test.ts`.

**Reads must paginate.** Supabase caps a PostgREST response at `max_rows`
(default 1,000). An unpaginated `.select()` over `sync_log` (6,618 rows) or
`lessons` (4,528) returns a silently short result: a truncated ledger re-pushes
the entire corpus every run, and a truncated parity fetch reports thousands of
phantom missing rows. `selectAll()` pages by rows actually returned, so it is
correct even if a project's `max_rows` is lower than the page size.

**Writes are byte-budgeted.** 400 lesson rows is a ~7 MB PostgREST request.
Batches are capped by serialized size (2 MB) as well as row count.

## Phase 1 — verified live (2026-08-20)

| Operation | Rows | Time |
|---|---:|---:|
| Full sync, cold | 6,518 | 51.4s |
| Re-sync, no changes | 0 | 1.2s |
| Single lesson edited | 1 | 1.3s |
| Full parity check | 6,618 | 5.1s |

Parity: `RESULT: OK (full) — no drift` across all seven collections.

Grant posture tested with the publishable key against the live database:
content read allowed, write **denied at the grant layer** (not merely by RLS),
`sync_log` read denied. The write refusal therefore survives a future
mis-written RLS policy — which matters because that key ships in browser bundles.

## Phase 2 — read path (decided, not started)

Astro builds statically, so "the site reads from the DB" can mean several very
different things.

1. **Build-time loader.** Replace the `glob()` loaders in `content.config.ts`
   with a Supabase-backed loader. Pages stay static; the DB becomes the build
   input. Biggest change to the build, smallest change to the site's runtime
   shape — and it makes the DB load-bearing, so the mirror has to become the
   source of truth first.
2. **Runtime reads for dynamic surfaces only.** Keep lessons static; let search,
   the path engine, progress, and assessment query Postgres live. This is where
   a database actually earns its keep, and it does not put the DB on the
   critical path of rendering a lesson.
3. **Hybrid.** Static lessons, DB-backed everything-else, with the mirror kept
   honest by the parity gate.

### Decision: option 2 — runtime reads for dynamic surfaces only

Chosen 2026-08-20. Lessons keep rendering from files at build time; only the
surfaces that genuinely need to *query* the corpus move to Postgres.

Why this and not option 1:

- **Blast radius.** Today a Supabase outage cannot affect a single reader,
  because nothing reads from it. Option 1 puts the database on the critical path
  of every build, so an outage becomes a failed deploy. Option 2 keeps that
  property: a database problem degrades search, not the curriculum.
- **It is where the DB actually pays.** The win was never "store MDX in
  Postgres" — files are excellent at that, and git gives history, review and
  bilingual diffing for free. The win is querying across 6,618 records without
  re-walking the filesystem: search, the path engine, progress, assessment.
- **Reversibility.** Option 2 is additive; each surface can move independently
  and move back. Option 1 inverts authoring (`/infographic`, `/teach`, the
  linter, bilingual parity all assume files) and is very hard to walk back.
- **The mirror stays disposable.** As long as files are canonical, the parity
  gate can be a hard failure and the fix is always "re-run the sync".

Consequence to accept: the mirror must stay fresh, so the CI sync is no longer
optional bookkeeping — it becomes the thing that keeps the dynamic surfaces
honest. Drop `continue-on-error` from the parity step once secrets are set.

Not chosen, and explicitly deferred: moving lesson rendering itself to the DB.
Revisit only if build time — not query capability — becomes the binding
constraint.

## Phase 3+ — authoring, if the DB becomes canonical

Out of scope under the option-2 decision above; kept for the record. Direction of the sync would invert
(DB → files, or DB-only with git as the archive), which is a much larger change
than this document covers: it touches `/infographic`, `/teach`, the linter, and
the bilingual-parity guarantees. Do not start it as a side effect of Phase 2.

## Invariants

- The site builds and deploys correctly with **no** Supabase credentials.
- The mirror never writes back to `site/src/content/**`.
- The service-role key never enters client code or a commit.
- Every schema change ships with a `sync_log` reset or a `--force` sync, because
  a changed row shape does not change a content hash.
