# Operator setup — Supabase content mirror

One-time setup so `bun run sync:supabase` and `bun run verify:supabase-parity`
can reach a database. Nothing in the site **build** depends on this: lessons
still render entirely from `site/src/content/**`. But skipping setup is no
longer consequence-free — as of the Phase 2 deep-search endpoint
(`/api/search`), skipping the steps below leaves the CI mirror steps
no-op-ing (harmless) **and** disables deep search in production, silently
(see [§7](#7-pages-runtime-secrets-required-for-deep-search) below).

## 1. Create the project

1. Create a Supabase project (any region close to the deploy target).
2. Note the **Project URL** (`https://<ref>.supabase.co`) and the
   **secret key** — `sb_secret_...` (Dashboard → Project Settings → API → Secret keys → Reveal). Formerly called the service-role key. The publishable key `sb_publishable_...` will not work: it is read-only under RLS.

The secret key bypasses RLS. It is a write credential for the mirror and
must never reach the browser bundle, an `PUBLIC_*` variable, or a commit.

## 2. Apply the schema

Dashboard → SQL editor → paste `supabase/schema.sql` → Run. Or with the CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

The script is idempotent (`create ... if not exists`), so re-running it is safe.

## 3. Expose the `curriculum` schema

PostgREST only serves schemas on its exposed list. `schema.sql` ends with the
`alter role authenticator ...` statement that does this, but if the Dashboard
later overwrites it, re-add it under **API → Exposed schemas**: `public,
curriculum`. Without this, every sync fails with a schema-not-found error.

## 4. Local credentials

Create `site/.env.local` (already gitignored):

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Real environment variables win over this file, so CI needs no file.

## 5. CI credentials

Add repository secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`
(Settings → Secrets and variables → Actions). The deploy workflow reads them for
the two mirror steps, which run only on `main` and are `continue-on-error: true`
— a mirror problem must never block a content deploy.

These are **CI-only** secrets — they feed the sync step in the deploy workflow.
They are separate from the Pages runtime secrets in [§7](#7-pages-runtime-secrets-required-for-deep-search)
below, which feed the deployed `/api/search` Worker itself. Setting one pair
and not the other is a common half-done setup: CI syncs happily while the live
endpoint keeps returning empty results.

The sync always mirrors whichever working tree it runs from — including
uncommitted changes. Running it from a dirty checkout publishes what's on
disk, not what's committed. (This already caused a false parity-drift alarm
during development: a sync run against local edits, then a parity check run
against a clean checkout.)

## 6. First sync

```bash
cd site
bun run sync:supabase -- --dry-run          # offline; needs no credentials
bun run sync:supabase -- --limit 50         # small live smoke test
bun run sync:supabase                       # full corpus (~6.6k rows, ~110 MB)
bun run verify:supabase-parity
```

The first full sync pushes every lesson body, so expect it to take a while and
to move real bandwidth. Later runs diff against `curriculum.sync_log` and touch
only what changed.

## 7. Pages runtime secrets (required for deep search)

`functions/api/search.ts` reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from
`ctx.env` at request time — this is a **separate** credential path from the CI
secrets in [§5](#5-ci-credentials), which only feed the sync step. Nothing sets
these for the deployed Worker automatically, and there is nothing in
`wrangler.toml` that could: `[vars]` there is public and committed, and this is
a write-capable secret key, so it must never go there.

Set both as Pages secrets instead of `[vars]`:

```bash
bunx wrangler pages secret put SUPABASE_URL           # or a plain (non-secret) var — it's not sensitive on its own
bunx wrangler pages secret put SUPABASE_SECRET_KEY
```

This targets the **Production** environment. Cloudflare Pages keeps Production
and Preview secrets separate, and the CLI does not populate both — so also add
both under Pages project → **Settings → Environment variables → Preview**, or
preview deploys will keep silently serving local-search-only results forever.
Confirm both environments have real values before relying on preview search.

### Verifying it worked

```bash
curl 'https://<site>/api/search?q=tcp&lang=en'
```

Expect a non-empty `results` array. **An empty array is the failure signal** —
by design, this endpoint degrades silently (never a 4xx/5xx) when the mirror is
unreachable or unconfigured, so there is no log line or error to alert you.
An empty array here means the secrets above are missing or wrong on whichever
environment (Production/Preview) you just tested — there is no other symptom.

## Verifying the sync worked

```sql
select count(*) from curriculum.lessons;   -- expect 4528
select count(*) from curriculum.sync_log;  -- expect 6618
```

`bun run verify:supabase-parity` should end with `RESULT: OK (full) — no drift.`

## Rotating the key

The mirror holds no data that does not already exist in git, so a compromised
secret key is a write/exposure problem, not a data-loss one. Rotate in
Dashboard → API → Secret keys, then update `site/.env.local`, the CI secret,
and both Pages runtime secrets (Production and Preview — see §7).
