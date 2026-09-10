-- ─────────────────────────────────────────────────────────────────────────────
-- Skein — Supabase content database (Phase 1 mirror)
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
  render_tree   jsonb,
  render_hash   text,
  content_hash  text not null,
  updated_at    timestamptz not null default now(),
  primary key (lang, track, unit, slug)
);
create index if not exists lessons_track_idx on curriculum.lessons (track);
create index if not exists lessons_unit_idx  on curriculum.lessons (track, unit);
create index if not exists lessons_updated   on curriculum.lessons (updated_at desc);

-- Existing mirrors gain the prepared data-only lesson body in place. Keep the
-- source MDX during the gradual rollout for search/fallback; runtime reads use
-- render_tree as soon as it has been published.
alter table curriculum.lessons
  add column if not exists render_tree jsonb,
  add column if not exists render_hash text;

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

-- Canonical concept registry mirrored from src/content/path/concepts.json.
-- One row per concept keeps prerequisite/concept lookups index-backed instead
-- of shipping/scanning the ~8k-entry registry for a single lesson request.
create table if not exists curriculum.concepts (
  id            text primary key,
  data          jsonb not null,
  content_hash  text not null,
  updated_at    timestamptz not null default now()
);

-- Materialized planner read-model: exactly the 440 curriculum learning units.
-- Quiz/project/drill concepts live in the concept registry but do not become
-- learning units here, preserving the planner's unit semantics.
create table if not exists curriculum.unit_concepts (
  unit_key      text primary key,                              -- "<track>/<unit>"
  data          jsonb not null,                               -- { teaches, requires, estMin }
  content_hash  text not null,
  updated_at    timestamptz not null default now()
);

-- Language-independent materialized lesson graph, generated at content publish
-- time. Requests read one adjacency row by PK; the full graph is never rebuilt
-- or scanned on the request path.
create table if not exists curriculum.lesson_graph (
  lesson_key    text primary key,                              -- "<track>/<unit>/<slug>"
  track         text not null,
  unit          text not null,
  slug          text not null,
  data          jsonb not null,                               -- concepts/prereqs/prev/next/related
  content_hash  text not null,
  updated_at    timestamptz not null default now()
);
create index if not exists lesson_graph_unit_idx on curriculum.lesson_graph (track, unit);

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
alter table curriculum.concepts  enable row level security;
alter table curriculum.unit_concepts enable row level security;
alter table curriculum.lesson_graph  enable row level security;
alter table curriculum.sync_log  enable row level security;

-- Postgres has no `create policy if not exists`, so re-running this script would
-- fail here with "policy already exists". Drop-then-create keeps the whole file
-- safely re-runnable, which is what the header promises.
drop policy if exists tracks_read   on curriculum.tracks;
drop policy if exists units_read    on curriculum.units;
drop policy if exists lessons_read  on curriculum.lessons;
drop policy if exists practice_read on curriculum.practice;
drop policy if exists projects_read on curriculum.projects;
drop policy if exists drill_read    on curriculum.drill;
drop policy if exists lab_read      on curriculum.lab;
drop policy if exists concepts_read on curriculum.concepts;
drop policy if exists unit_concepts_read on curriculum.unit_concepts;
drop policy if exists lesson_graph_read on curriculum.lesson_graph;

create policy tracks_read   on curriculum.tracks   for select using (true);
create policy units_read    on curriculum.units    for select using (true);
create policy lessons_read  on curriculum.lessons  for select using (true);
create policy practice_read on curriculum.practice for select using (true);
create policy projects_read on curriculum.projects for select using (true);
create policy drill_read    on curriculum.drill    for select using (true);
create policy lab_read      on curriculum.lab      for select using (true);
create policy concepts_read on curriculum.concepts for select using (true);
create policy unit_concepts_read on curriculum.unit_concepts for select using (true);
create policy lesson_graph_read on curriculum.lesson_graph for select using (true);

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

-- NOTE: a per-FUNCTION statement_timeout does NOT work here. `alter function
-- ... set statement_timeout` applies the GUC on function ENTRY, by which point
-- the enclosing statement's timer is already armed — so it cannot cap that
-- call. Bound this at the ROLE level instead, where it is applied at session
-- start: `alter role service_role set statement_timeout = '10s'`. On Supabase,
-- anon (3s) and authenticated (8s) already carry one; service_role does not.
-- User-facing latency is separately bounded by AbortSignal.timeout(3000) in
-- functions/api/search.ts.

revoke all on function curriculum.search_lessons(text, text, int) from public, anon, authenticated;
grant execute on function curriculum.search_lessons(text, text, int) to service_role;

-- ── Backend-driven lesson read model ────────────────────────────────────────
-- One RPC returns the lesson row plus its materialized graph adjacency,
-- practice, track/unit metadata, localized metadata for only the lessons in its
-- materialized adjacency, and only the concept definitions referenced by that
-- lesson/prerequisite closure. No request rebuilds the graph or loads the full
-- lesson/concept corpus.
--
-- `render_tree` is the runtime body. Source MDX stays mirrored temporarily for
-- search/fallback and Git-parity during the gradual migration; requests never
-- compile it when a prepared tree is present.
create or replace function curriculum.get_lesson_payload(
  lang_code    text,
  track_code   text,
  unit_code    text,
  lesson_slug  text
)
returns table (payload jsonb, version text)
language sql
stable
set search_path = pg_catalog, curriculum
as $$
  with row_data as (
    select
      l.*,
      p.data as practice_data,
      p.content_hash as practice_hash,
      d.data as drill_data,
      d.content_hash as drill_hash,
      g.data as graph_data,
      g.content_hash as graph_hash,
      u.data as unit_data,
      u.content_hash as unit_hash,
      t.data as track_data,
      t.content_hash as track_hash
    from curriculum.lessons l
    left join curriculum.practice p
      on p.lesson_key = l.track || '/' || l.unit || '/' || l.slug
    left join curriculum.drill d
      on d.track = l.track and d.unit = l.unit
    left join curriculum.lesson_graph g
      on g.lesson_key = l.track || '/' || l.unit || '/' || l.slug
    left join curriculum.units u
      on u.track = l.track and u.slug = l.unit
    left join curriculum.tracks t
      on t.slug = l.track
    where l.lang = lang_code
      and l.track = track_code
      and l.unit = unit_code
      and l.slug = lesson_slug
    limit 1
  ), enriched as (
    select
      r.*,
      concept_data.data as concept_data,
      lesson_meta.data as lesson_meta,
      project_data.data as project_data,
      md5(concat_ws(':',
        r.content_hash,
        coalesce(r.practice_hash, ''),
        coalesce(r.drill_hash, ''),
        coalesce(r.graph_hash, ''),
        coalesce(r.unit_hash, ''),
        coalesce(r.track_hash, ''),
        concept_data.hashes,
        lesson_meta.hashes,
        project_data.hashes
      )) as payload_version
    from row_data r
    left join lateral (
      select
        coalesce(jsonb_object_agg(c.id, c.data), '{}'::jsonb) as data,
        coalesce(string_agg(c.content_hash, ':' order by c.id), '') as hashes
      from curriculum.concepts c
      where c.id in (
        select jsonb_array_elements_text(coalesce(r.graph_data->'concepts', '[]'::jsonb))
        union
        select jsonb_array_elements_text(coalesce(r.graph_data->'prereqConcepts', '[]'::jsonb))
      )
    ) concept_data on true
    left join lateral (
      select
        coalesce(
          jsonb_object_agg(
            m.track || '/' || m.unit || '/' || m.slug,
            jsonb_build_object(
              'title', m.title,
              'level', m.level,
              'track', m.track,
              'unit', m.unit,
              'slug', m.slug
            )
          ),
          '{}'::jsonb
        ) as data,
        coalesce(string_agg(m.content_hash, ':' order by m.track, m.unit, m.slug), '') as hashes
      from curriculum.lessons m
      where m.lang = lang_code
        and (m.track || '/' || m.unit || '/' || m.slug) in (
          select ref
          from (
            select r.graph_data->>'prev' as ref
            union select r.graph_data->>'next'
            union select r.graph_data->>'navPrev'
            union select r.graph_data->>'navNext'
            union select jsonb_array_elements_text(coalesce(r.graph_data->'prereqLessons', '[]'::jsonb))
            union select jsonb_array_elements_text(coalesce(r.graph_data->'related', '[]'::jsonb))
            union select jsonb_array_elements_text(coalesce(r.graph_data->'buildsOn', '[]'::jsonb))
            union select jsonb_array_elements_text(coalesce(r.graph_data->'unlocks', '[]'::jsonb))
            union select jsonb_array_elements_text(coalesce(r.graph_data->'deepensInto', '[]'::jsonb))
            union select jsonb_array_elements_text(coalesce(r.graph_data->'appearsAgainIn', '[]'::jsonb))
          ) refs
          where ref is not null
        )
    ) lesson_meta on true
    left join lateral (
      select
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'slug', p.slug,
              'title', p.data->'title'->>lang_code,
              'pitch', p.data->'pitch'->>lang_code
            ) order by p.slug
          ),
          '[]'::jsonb
        ) as data,
        coalesce(string_agg(p.content_hash, ':' order by p.slug), '') as hashes
      from (
        select project.*
        from curriculum.projects project
        where exists (
          select 1
          from jsonb_array_elements(coalesce(project.data->'milestones', '[]'::jsonb)) milestone
          where coalesce(milestone->'feedsFrom', '[]'::jsonb)
            ? (r.track || '/' || r.unit || '/' || r.slug)
        )
        order by project.slug
        limit 2
      ) p
    ) project_data on true
  )
  select
    jsonb_build_object(
      'version', r.payload_version,
      'lesson', jsonb_build_object(
        'key', r.track || '/' || r.unit || '/' || r.slug,
        'lang', r.lang,
        'track', r.track,
        'unit', r.unit,
        'slug', r.slug,
        'order', r.order_no,
        'title', r.title,
        'summary', r.summary,
        'estMin', r.est_min,
        'status', r.status,
        'lessonType', r.lesson_type,
        'level', r.level,
        'sources', coalesce(r.meta->'sources', '[]'::jsonb),
        'prereqs', coalesce(r.meta->'prereqs', '[]'::jsonb),
        'mathPrereqs', coalesce(r.meta->'mathPrereqs', '[]'::jsonb),
        'concepts', coalesce(r.meta->'concepts', '[]'::jsonb),
        'body', coalesce(
          r.render_tree,
          jsonb_build_object(
            'format', 'mdx-source-v1',
            'sourceHash', r.body_hash,
            'source', r.body
          )
        )
      ),
      'graph', coalesce(r.graph_data, '{}'::jsonb),
      'practice', r.practice_data,
      'drill', r.drill_data,
      'unit', r.unit_data,
      'track', r.track_data,
      'concepts', r.concept_data,
      'lessonMeta', r.lesson_meta,
      'projects', r.project_data
    ) as payload,
    r.payload_version as version
  from enriched r;
$$;

revoke all on function curriculum.get_lesson_payload(text, text, text, text)
  from public, anon, authenticated;
grant execute on function curriculum.get_lesson_payload(text, text, text, text)
  to service_role;

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
