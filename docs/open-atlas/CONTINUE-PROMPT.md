# Autonomous continuation — open atlas migration

You are continuing the open-atlas content migration in the `awesome-everything` repo
(Astro 5 curriculum site under `site/`). Work autonomously; do not wait for user
input. The user has granted full autonomy — decide and proceed, do not ask.

## Working location
- All migration work happens in the worktree
  `/Users/artemmac/dev/awesome-everything/.claude/worktrees/interesting-antonelli-002bf7`,
  branch `interesting-antonelli-002bf7`. `cd` there first.
- All migration commits stay on this branch — do NOT push, do NOT merge to `main`
  (a separate task, `POST-MIGRATION-PROMPT.md`, handles that after the migration
  completes).
- Run `git branch --show-current`; confirm you are on `interesting-antonelli-002bf7`.

## Concurrency lock — ACQUIRE BEFORE ANYTHING ELSE
Scheduled and manual agents can target this worktree at once and collide. A
`ps`/mtime check is racy. Use this atomic lock. At run start, before reading or
authoring:

1. `cd` to the worktree, then `mkdir docs/open-atlas/.migration-lock`.
   - **Succeeds** → you hold the lock. Record ownership:
     `printf '%s  %s\n' "$$" "$(date -u +%FT%TZ)" > docs/open-atlas/.migration-lock/owner`
   - **Fails** → the lock is held. Read `docs/open-atlas/.migration-lock/owner`. If
     its timestamp is more than 90 minutes old the holder is presumed dead — `rm
     -rf docs/open-atlas/.migration-lock` and retry once. Otherwise STOP: another
     agent is migrating this worktree. Do not read further, do not author/edit, do
     not commit — report "withdrew: lock held" and exit.
2. Release the lock on EVERY exit path — clean rotation or abort:
   `rm -rf docs/open-atlas/.migration-lock`.
3. The lock dir is git-ignored — never `git add` it.

## Read first, in order
1. `docs/open-atlas/HANDOFF.md` — project source of truth.
2. `docs/superpowers/specs/2026-05-19-tier-to-single-level-migration-design.md` — the
   approved design (commit `32582c1`).
3. `docs/superpowers/plans/2026-05-19-tier-to-single-level-migration.md` — the plan
   and progress dashboard. The dashboard's `RESUME HERE` line is the canonical
   resume point.

## State (as of 2026-05-20)
- Phase A (additive infra) COMPLETE — A1-A10, 8 commits `9437c70`..`bf07038`,
  build 1977 pages, lint 0/0, 66 migration tests pass.
- Phase B (content migration) IN PROGRESS — **26/51 units done**. Pillars complete:
  networking (12/12), browser (8/8). databases (6/8) in progress.
- **RESUME at the unit named in the plan dashboard's `RESUME HERE` line** (current:
  `databases/07-sharding`). The dashboard is authoritative — always read it first.
- Brainstorming + spec + writing-plans are COMPLETE. Do NOT re-run the
  `brainstorming` skill. The spec is the agreed design.

## Per-unit procedure
ONE sonnet implementer subagent per unit. Do NOT migrate inline — one unit ≈ 16
senior-depth bilingual files, too large for the main agent. Do NOT interrupt a
running unit subagent — a killed run leaves orphan files (it has happened and was
cleaned up in commit history).

The subagent: reads the 3-tier `site/src/content/book/{en,ru}/<pillar>/<unit>/`
source → cuts into ~5-9 single-level `topic` lessons (junior tier→1, middle→2-4,
senior→2-4) → authors EN from `site/scaffolds/topic-lesson.mdx` → translates RU
using `site/src/i18n/glossary.json` → adds the unit to `site/src/content/units.json`
→ `cd site && bun run build` (lint must end errors 0 warnings 0) → `git rm` the
source piece → commits `content(<pillar>): migrate <unit> to N lessons EN+RU`.
Lesson slugs MUST be `NN-kebab` matching `/^\d{2}-[a-z0-9-]+$/`. Re-use the
networking and browser unit prompts and the plan's "Phase B — Procedure (per unit)"
as the template.

After each unit: bump the plan dashboard (`N/51` + `RESUME HERE`), commit a
`docs(open-atlas): Phase B progress` line.

## Pillar order (Phase B)
networking ✓ → browser ✓ → databases (6/8) → observability → performance → 7 lone
ready pieces: apis/06-graphql-n-plus-one, backend/05-idempotency-retries,
caching/03-stampede, distributed/02-raft-outline, frontend/02-data-fetching,
queues/01-delivery-guarantees, security/02-oauth-oidc.

After Phase B (51/51), execute Phase C (81 stub pieces → unit + lesson stubs) then
Phase D (teardown of the `book`/`pillars`/`chapters` collections, piece routes,
`TierAccordion.astro`, the 3-tier scaffold, and the piece-only lint rules) per the
plan.

## Rules
- Caveman ultra mode on (token efficiency). Code, commits, and specs: normal prose.
- Never `git add -A` — stage explicit paths only. Do not push. Do not commit
  directly to `main` (you should not even be on it).
- Unrelated uncommitted files exist in the main working tree (`vitest.config.ts`,
  `lesson-preview.astro`, `topic-preview.astro`, `.claude/launch.json`, worktree
  dirs) — never stage them.
- `bunx vitest run` has 3 pre-existing failures (user-state, exercise-counts)
  unrelated to this work — ignore; the build linter (errors 0, warnings 0) is the
  gate.
- Update `HANDOFF.md` whenever a pillar or phase completes.
- **Context rotation:** at ~75-80% context, stop at a unit boundary — update
  `HANDOFF.md` and the plan dashboard with the exact state + next unit, release
  the lock, exit. A fresh chat resumes from this prompt.

## First action
`cd` to the worktree, acquire the lock, read the three files above, then dispatch
the implementer subagent for the unit named by the plan dashboard's `RESUME HERE`
line. Continue unit by unit through Phase B → C → D until the migration is
complete.
