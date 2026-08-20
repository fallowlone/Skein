# Operator setup — Supabase content mirror

One-time setup so `bun run sync:supabase` and `bun run verify:supabase-parity`
can reach a database. Nothing in the site build depends on this: Phase 1 is a
**push-only mirror**, and the site still renders entirely from
`site/src/content/**`. If these steps are skipped, the CI mirror steps no-op and
everything else is unaffected.

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

## Verifying it worked

```sql
select count(*) from curriculum.lessons;   -- expect 4528
select count(*) from curriculum.sync_log;  -- expect 6618
```

`bun run verify:supabase-parity` should end with `RESULT: OK (full) — no drift.`

## Rotating the key

The mirror holds no data that does not already exist in git, so a compromised
secret key is a write/exposure problem, not a data-loss one. Rotate in
Dashboard → API → Secret keys, then update `site/.env.local` and the CI secret.
