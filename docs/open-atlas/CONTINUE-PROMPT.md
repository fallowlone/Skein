# Autonomous continuation — open atlas migration

You are continuing the **open atlas** migration in the `awesome-everything` repo
(Astro 5 curriculum site under `site/`). Work autonomously; do not wait for user
input. The user has granted full autonomy — decide and proceed, do not ask.

## Read first, in order
1. `docs/open-atlas/HANDOFF.md` — project source of truth.
2. `docs/superpowers/specs/2026-05-19-tier-to-single-level-migration-design.md` — the
   approved design for the current task. The migration converts all 16 pillars from
   the 3-tier `book/` model to single-level `lessons` (open-atlas Model A).
3. `docs/superpowers/plans/2026-05-19-tier-to-single-level-migration.md` — the
   implementation plan. It tracks per-step / per-lesson progress; resume from its
   markers. If absent, see Next step 1.

## Task
Work queue item 1 — "Migration: 3-tier → single-level lessons". Execute to completion
per the spec.

## Working location
- All migration work happens in the worktree
  `/Users/artemmac/dev/awesome-everything/.claude/worktrees/interesting-antonelli-002bf7`,
  branch `interesting-antonelli-002bf7`. `cd` there first.
- Spec + plan + migration commits are on that branch, on top of `main` (`6d162d6`).
- Run `git branch --show-current`; confirm you are on `interesting-antonelli-002bf7`.

## Concurrency lock — ACQUIRE BEFORE ANYTHING ELSE

Scheduled and manual agents can target this worktree at once and collide (it happened
2026-05-19 on unit 01 — two agents overwrote each other's lessons). A `ps`/mtime check
is racy. Use this atomic lock. At run start, before reading files or authoring:

1. `cd` to the worktree, then: `mkdir docs/open-atlas/.migration-lock`
   - **Succeeds** → you hold the lock. Record ownership:
     `printf '%s  %s\n' "$$" "$(date -u +%FT%TZ)" > docs/open-atlas/.migration-lock/owner`
   - **Fails** → the lock is held. Read `docs/open-atlas/.migration-lock/owner`. If its
     timestamp is more than 90 minutes old the holder is presumed dead — `rm -rf
     docs/open-atlas/.migration-lock` and retry once. Otherwise STOP: another agent is
     migrating this worktree. Do not read further, do not author/edit, do not commit —
     report "withdrew: lock held" and exit.
2. Release the lock on EVERY exit path — clean rotation or abort:
   `rm -rf docs/open-atlas/.migration-lock`.
3. The lock dir is git-ignored — never `git add` it.

## State (as of 2026-05-19)
- `import-alias-refactor` merged into `main` (`6d162d6`).
- Migration brainstormed; spec written and committed (`32582c1`).
- **Brainstorming is COMPLETE — do NOT re-run the brainstorming skill.** The spec is
  the agreed design.

## Next steps
1. If the plan file does not exist: invoke `superpowers:writing-plans`, produce
   `docs/superpowers/plans/2026-05-19-tier-to-single-level-migration.md` from the
   spec. Phase it per spec §11 (A additive infra → B content → C stubs → D teardown).
   The plan MUST track per-step and per-lesson progress so any chat can resume
   mid-migration.
2. Execute with `superpowers:executing-plans` + `superpowers:subagent-driven-development`.
   Offload research, authoring, and investigation to subagents to preserve context.
3. Gate after each phase/unit: `cd site && bun run build` — pass requires lint
   **errors 0, warnings 0**.
4. Use `superpowers:verification-before-completion` before claiming any unit done.

## Operating rules
- Keep **caveman ultra** mode on (token efficiency). Write code, commits, and specs
  in normal prose.
- **Context rotation:** at ~75-80% context, stop cleanly — update `HANDOFF.md` and
  the plan file with exact state + the next concrete step, finish the current small
  unit, then a fresh chat resumes from this prompt. Do not rely on auto-compaction.
- Git: never `git add -A` — stage explicit paths only. Do not push unless the user
  asks. Never commit migration changes directly to `main`.
- `bunx vitest run` has 3 pre-existing failures (user-state, exercise-counts)
  unrelated to this work — do not block on them. The build's linter (errors 0,
  warnings 0) is the gate.
- Unrelated uncommitted files exist in the main working tree (`vitest.config.ts`,
  `lesson-preview.astro`, `topic-preview.astro`, `.claude/launch.json`, worktree
  dirs) — never stage them.
- Update `HANDOFF.md` whenever a phase or queue item completes.

## First action
`cd` to the worktree, then **acquire the concurrency lock** (see the section above) —
if it is held by a live agent, withdraw and exit. Holding the lock: read the three
files above, confirm git state, then continue from the plan's progress dashboard
(Phase B, next unmarked unit). Release the lock (`rm -rf docs/open-atlas/.migration-lock`)
when you rotate or exit.
