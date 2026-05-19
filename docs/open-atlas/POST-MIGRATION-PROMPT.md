# Consolidate branches into main + rebuild the site on the open-atlas design

You are working in the `awesome-everything` repo. This task has two parts:
(A) merge the completed open-atlas migration into `main`; (B) rebuild the site's
pages on the new open-atlas design wired to real data.

This task runs AFTER the migration completes. It must not run on a half-migrated
repo, and it must not run concurrently with the "continue migration" task — both
touch the same branch / worktree and will collide.

## PRECONDITION — verify before starting
The open-atlas migration must be COMPLETE. Check
`docs/superpowers/plans/2026-05-19-tier-to-single-level-migration.md` — the
Progress dashboard must show Phase B (51/51 units), Phase C, and Phase D all done;
and `site/src/content/book/` must no longer exist (Phase D removes it). If the
migration is NOT finished, STOP — run the `CONTINUE-PROMPT.md` task first. Do not
run this on a half-migrated repo.

Also check `docs/open-atlas/.migration-lock/` is absent. If it is present, the
migration is still running — STOP and wait.

## Part A — consolidate branches into main
Work from `/Users/artemmac/dev/awesome-everything` (the main repo working tree,
not a worktree).

1. `git branch` and `git worktree list` — enumerate every local branch and
   worktree.
2. Merge the migration branch `interesting-antonelli-002bf7` into `main`:
   `git checkout main && git merge interesting-antonelli-002bf7`. The branch has
   all post-migration commits stacked on top of the import-alias refactor that is
   already on main; expect a clean merge (likely fast-forward). Resolve any
   conflict.
3. Verify: `cd site && bun run build` ends with lint errors 0, warnings 0.
4. For every OTHER local branch (`networking-expansion` and the auto-named
   worktree branches such as `zen-galileo-*`, `busy-hertz-*`,
   `vibrant-lichterman-*`, `exciting-leavitt-*`, `funny-ellis-*`,
   `lucid-satoshi-*`): run `git log --oneline main..<branch>`.
   - If empty → the branch is already merged. Report it for the user to delete.
   - If it shows real wanted commits not already in main → merge it, resolve
     conflicts, confirm build green.
   - If it shows commits that look stale / unknown / experimental → do NOT merge.
     List the branch, its commits, and report it for the user to triage. Do NOT
     blind-merge mystery branches into main.
5. Do NOT push. Report the final branch state and the build result; ask the user
   before any `git push` to the remote.

## Part B — rebuild pages on the open-atlas design
The open-atlas design exists as built prototypes (see `docs/open-atlas/HANDOFF.md`
"Built so far"):
- Celestial-atlas HOME: `site/src/pages/[lang]/index.astro` (done, static inline
  sample data).
- Lesson reading shell: `site/src/pages/lesson-preview.astro` (standalone preview
  route, served at `/lesson-preview/`).
- Topic ascent-scene: `site/src/pages/topic-preview.astro` (standalone preview
  route, served at `/topic-preview/`).
- Redesigned glossary: `site/src/pages/[lang]/glossary/*` (done, wired to real
  collections).

The migration produced real `tracks`, `units`, `lessons` collections (16 fullstack
tracks + 3 foundations). This part wires the real per-topic page and the home to
those collections + the new design, and retires the standalone `*-preview.astro`
routes.

1. Read `docs/open-atlas/HANDOFF.md` — especially the Locked decisions and the
   Built so far sections. Then read the migration spec
   `docs/superpowers/specs/2026-05-19-tier-to-single-level-migration-design.md`
   sections §10 (routing) and §13 (full topic-page ascent-scene wiring is the
   named follow-up).
2. This is design work — use `superpowers:brainstorming` to scope it, then
   `superpowers:writing-plans` to produce a plan under
   `docs/superpowers/plans/`. Scope:
   - Wire the per-topic page (the ascent scene from `topic-preview.astro`) to the
     real `tracks` / `units` / `lessons` collections — replaces the inline sample
     data.
   - Wire the home (`[lang]/index.astro`) to the real collections — the
     constellation sample list becomes a query over real tracks.
   - Confirm lesson pages render correctly in the new design (Phase A wired
     `ConnectedLessons` into `Lesson.astro`; reconcile its visuals against the
     `lesson-preview.astro` prototype, which is the visual reference).
   - Retire the standalone `*-preview.astro` routes once the real routes match
     them.
3. Honor the HANDOFF Locked decisions: direction law #4 (advanced = UP), two zones
   #5 (dark cosmic navigation / light editorial reading), design language #6
   (celestial star-atlas, no gamification).
4. Build gate every step: `cd site && bun run build`, lint errors 0 warnings 0.

## Rules
- Caveman ultra mode on. Code, commits, and specs: normal prose.
- Never `git add -A` — stage explicit paths only. Do not push unless the user
  explicitly asks.
- Part B work goes on a feature branch off main (do not author directly on `main`).

## First action
Verify the precondition (migration complete, lock dir absent). If complete, start
Part A.
