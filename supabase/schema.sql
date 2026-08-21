-- ─────────────────────────────────────────────────────────────────────────────
-- awesome-everything — Supabase content database (Phase 1 mirror)
-- Docs: docs/2026-08-20-supabase-content-migration.md
-- Setup: docs/operator-setup-supabase.md
--
-- Apply via the Dashboard SQL editor, or:
--   supabase link --project-ref <ref>
--   supabase db push
--
-- After applying, expose the `curriculum` schema to the API (Dashboard → API →
-- Exposed schemas, or run the `pgrst` statements at the bottom) so PostgREST
-- (and supabase-js) can serve it.
-- ─────────────────────────────────────────────────────────────────────────────

create schema if not exists curriculum;

-- Tracks — one row per entry in site/src/content/tracks.json (44 rows).
create table if not exists curriculum.tracks (
  slug          text primary key,
  data          jsonb not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now()
);

-- Units — one row per entry in site/src/content/units.json (440 rows).
create table if not exists curriculum.units (
  track         text not null,
  slug          text not null,
  data          jsonb not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now(),
  primary key (track, slug)
);

-- Lessons — one row per lesson MDX/MD file (EN + RU, ~4.5k rows).
-- `meta` holds the cross-page frontmatter (prereqs, deepensInto, spiral,
-- mathPrereqs, concepts, sources). `body` is the MDX body (frontmatter split
-- off), hashed separately so incremental syncs never touch unchanged blobs.
create table if not exists curriculum.lessons (
  lang          text not null check (lang in ('en','ru')),
  track         text not null,
  unit          text not null,
  slug          text not null,
  order_no      integer,
  title         text not null default '',
  summary       text not null default '',
  est_min       integer,
  status        text not null default 'stub',          -- stub | draft | ready
  lesson_type   text,                                  -- concept | coding | topic
  level         text,                                  -- zero | junior | middle | senior
  meta          jsonb not null default '{}'::jsonb,
  body          text not null,
  body_hash     text not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now(),
  primary key (lang, track, unit, slug)
);
create index if not exists lessons_track_idx on curriculum.lessons (track);
create index if not exists lessons_unit_idx  on curriculum.lessons (track, unit);
create index if not exists lessons_updated   on curriculum.lessons (updated_at desc);

-- Practice — one row per practice JSON file (1,540 rows).
create table if not exists curriculum.practice (
  lesson_key    text primary key,                       -- "<track>/<unit>/<slug>"
  track         text not null,
  data          jsonb not null,                         -- { lessonKey, track, tasks[] }
  content_hash  text not null,
  updated_at    timestamptz not null default now()
);

-- Projects / drill / lab — single row per file.
create table if not exists curriculum.projects (
  slug          text primary key,
  data          jsonb not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now()
);

create table if not exists curriculum.drill (
  track         text not null,
  unit          text not null,
  data          jsonb not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now(),
  primary key (track, unit)
);

create table if not exists curriculum.lab (
  track         text not null,
  tier          text not null,                                 -- warmup | build | diagnose | capstone
  data          jsonb not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now(),
  primary key (track, tier)
);

-- Sync ledger — mirror-only: the sync tool (site/scripts/supabase/sync-content.mjs)
-- owns this table. ledger_key is the row's primary key for single-file kinds and
-- "<kind>#<pk>" for multi-entry files (tracks/units).
create table if not exists curriculum.sync_log (
  ledger_key    text primary key,
  kind          text not null,                          -- tracks|units|lessons|practice|projects|drill|lab
  content_hash  text not null,
  synced_at     timestamptz not null default now()
);

-- Row-level security: content is public read; writes flow through the
-- service-role key (the sync tool). sync_log stays private (no read policy).
alter table curriculum.tracks    enable row level security;
alter table curriculum.units     enable row level security;
alter table curriculum.lessons   enable row level security;
alter table curriculum.practice  enable row level security;
alter table curriculum.projects  enable row level security;
alter table curriculum.drill     enable row level security;
alter table curriculum.lab       enable row level security;
alter table curriculum.sync_log  enable row level security;

create policy tracks_read   on curriculum.tracks   for select using (true);
create policy units_read    on curriculum.units    for select using (true);
create policy lessons_read  on curriculum.lessons  for select using (true);
create policy practice_read on curriculum.practice for select using (true);
create policy projects_read on curriculum.projects for select using (true);
create policy drill_read    on curriculum.drill    for select using (true);
create policy lab_read      on curriculum.lab      for select using (true);

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

-- Ranked full-text search over mirrored lessons. Lives in SQL because
-- PostgREST cannot ORDER BY ts_rank or produce ts_headline snippets.
-- `stable`, read-only, and callable only by service_role (the /api/search proxy).
--
-- Ranking and the LIMIT happen in the `ranked` CTE; ts_headline is computed
-- only in the outer SELECT, over the (at most 50) surviving rows. Doing the
-- headline in the same query as ORDER BY rank / LIMIT would build a snippet
-- for every matching row before the limit discards most of them — on a broad
-- query this means re-parsing a large share of the corpus's prose per
-- request on an unauthenticated endpoint.
--
-- search_path is pinned (Supabase linter: function_search_path_mutable) so
-- this can't be redirected by a caller's session search_path; every table
-- reference below is schema-qualified regardless.
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
set search_path = pg_catalog, curriculum
as $$
  with cfg as (
    select case lang_code when 'ru' then 'russian'::regconfig
                          else 'english'::regconfig end as c
  ), query as (
    select websearch_to_tsquery((select c from cfg), q) as tsq
  ), ranked as (
    select
      l.slug, l.track, l.unit, l.title, l.summary, l.body_text,
      ts_rank(l.search_vector, (select tsq from query)) as rank
    from curriculum.lessons l
    where l.lang = lang_code
      and l.status = 'ready'
      and l.search_vector @@ (select tsq from query)
    order by rank desc, l.track, l.slug
    limit least(greatest(coalesce(max_results, 20), 1), 50)
  )
  select
    r.slug, r.track, r.unit, r.title, r.summary,
    ts_headline(
      (select c from cfg),
      r.body_text,
      (select tsq from query),
      'StartSel=<mark>,StopSel=</mark>,MaxWords=30,MinWords=12,MaxFragments=1,FragmentDelimiter= … '
    ) as snippet,
    r.rank
  from ranked r
  order by r.rank desc, r.track, r.slug;
$$;

-- Belt-and-braces against a slow query holding a connection open: even with
-- the LIMIT pushed into the `ranked` CTE, cap how long a single call may run.
alter function curriculum.search_lessons(text, text, int) set statement_timeout = '3s';

revoke all on function curriculum.search_lessons(text, text, int) from public, anon, authenticated;
grant execute on function curriculum.search_lessons(text, text, int) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants. A custom schema does NOT inherit the auto-grants Supabase applies to
-- `public`, so without this block every API call fails with
-- "permission denied for schema curriculum" even once the schema is exposed.
--
-- Deliberately narrower than the stock Supabase snippet: the public API roles
-- get SELECT only, so the publishable key can never write. RLS (above) gates
-- which rows they see; these grants gate what they could ever do.
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema curriculum to anon, authenticated, service_role;

grant select on all tables in schema curriculum to anon, authenticated;
alter default privileges for role postgres in schema curriculum
  grant select on tables to anon, authenticated;

-- The sync tool authenticates with the secret key (→ service_role) and writes.
grant all on all tables in schema curriculum to service_role;
alter default privileges for role postgres in schema curriculum
  grant all on tables to service_role;

-- The ledger is mirror-internal: no public read, belt-and-braces with its
-- policy-free RLS.
revoke select on curriculum.sync_log from anon, authenticated;

-- Expose the schema to PostgREST so supabase-js / REST can address it.
-- (Equivalent to Dashboard → API → Exposed schemas → curriculum.)
alter role authenticator set pgrst.db_schemas to 'public, curriculum';
notify pgrst, 'reload config';
