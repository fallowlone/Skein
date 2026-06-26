# Git track — build roadmap (zero → senior)

Slug `git`, order 44, band `foundations`, abbr `GIT`. Lesson contract = same as `cli`
(default `checkMathLesson` skeleton: Hook → Goal → Step → Visual → WorkedExample →
Practice → Check → Recap; EN+RU MDX + per-lesson practice JSON). Seams already wired in
`types/index.ts`, `atlas/track-band.ts`, `scripts/track-meta.ts`, `scripts/path/mastery-field.ts`.

## Wave 1 — SHIPPED / IN PROGRESS (units registered in units.json)
- **01 Version control & the git model** — why-version-control · snapshots-not-diffs · the-three-areas · install-and-first-repo
- **02 Recording changes** — add-commit-status · reading-diffs-and-log · gitignore · good-commits
- **03 Branches & merging** — branches-are-pointers · create-and-switch · merging-and-fast-forward · merge-conflicts
- **04 Undo & rewrite history** — restore-and-reset · revert-safe-undo · reflog-recovery · amend-and-interactive-rebase · **changing-author-and-dates**

## Wave 2 — PLANNED (append to units.json + author when continuing)
- **05 Remotes & collaboration** — remotes-explained (origin, fetch vs pull, tracking branches) · push-and-pull · fetch-and-integrate (pull --rebase vs merge, ff-only) · force-push-safely (--force-with-lease) · pull-requests (PR/MR model)
- **06 Team workflows (the company "git flow")** — why-a-workflow · git-flow (Driessen develop/release/hotfix) · github-flow (main + short branches + PR) · trunk-based-development (feature flags, CI, what big orgs actually run) · choosing-a-workflow (team size, release cadence, monorepo)
- **07 Daily power tools** — stash · cherry-pick · tags-and-releases (lightweight vs annotated, semver, signing) · worktrees · aliases-and-config
- **08 Under the hood** — objects (blob/tree/commit/tag, SHA) · refs-and-head (packed-refs, symbolic refs) · how-merge-and-rebase-work · hooks (pre-commit/commit-msg/pre-push, husky/lefthook) · rerere

## Wave 3 — PLANNED (senior)
- **09 Scaling & rescue** — large-repos (partial clone, sparse-checkout, shallow) · submodules-and-subtrees · rewriting-whole-history (filter-repo: strip secrets/big files) · signing-and-trust (GPG/SSH signed commits) · disaster-recovery (fsck, reflog mastery, corrupted repo)
- **10 Putting it together (capstone)** — a-day-in-a-real-team (feature→PR→review→merge→release) · incident-a-bad-merge (recover botched force-push) · git-interview-fluency

## Verify / gate (full astro build OOMs locally ~4000 pages)
1. `bun scripts/path/build-lesson-tasks.mjs` (validates all practice JSON)
2. `bun scripts/lint-src.mjs`
3. `bunx vitest run` (track exhaustiveness, schema mirrors)
4. dev-render spot check: `NODE_OPTIONS=--max-old-space-size=8192 bun astro dev` then curl
   `/<lang>/learn/git/<unit>/<lesson>/` — assert 200 + all `data-lesson-section` present.
CI shards the full render; do not rely on local full build.
