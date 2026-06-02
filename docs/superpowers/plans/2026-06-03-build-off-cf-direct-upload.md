# Build off Cloudflare + Direct Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move production builds off Cloudflare's git-integration builder (the OOM/time-limit source) into GitHub Actions, deploying prebuilt `site/dist` + repo-root `functions/` via `wrangler pages deploy`.

**Architecture:** A single GitHub Actions workflow checks out the repo, installs deps with bun, runs the existing `astro build` (which runs the linter and emits `site/dist`), then runs `wrangler pages deploy site/dist` **from the repo root** so the `functions/` auth dir is bundled. `output: "static"`, the auth functions, the linter, and all rendering are untouched. An operator runbook documents the CF API token, GitHub secrets, Git-disconnect, and the zero-downtime cutover.

**Tech Stack:** GitHub Actions, bun 1.3.11, Astro 6 (static), Wrangler 4 (Cloudflare Pages direct upload).

**Spec:** `docs/superpowers/specs/2026-06-03-build-off-cf-direct-upload-design.md`

---

## File Structure

- **Create:** `.github/workflows/deploy.yml` — the build+deploy pipeline (the only executable artifact).
- **Create:** `docs/operator-setup-deploy.md` — operator runbook (API token scope, GitHub secrets, Git-disconnect, cutover sequence). Mirrors `docs/operator-setup-auth.md`.
- **No changes** to `site/`, `functions/`, `astro.config.mjs`, `package.json`, or the linter — this is purely a deploy-path change.

## Verified facts (baked into commands below)

- Root `bun.lock` exists → `bun install --frozen-lockfile` at root works and provides `wrangler` (root `devDependencies`).
- `site/bun.lock` exists → `bun install --frozen-lockfile` in `site/` works.
- No workspace → root and `site/` are installed separately.
- `functions/package.json` is **dep-free by design** → no CI install for `functions/`.
- `wrangler pages deploy <dir>` bundles a `functions/` dir found at the command's working directory (CF docs) → deploy step runs from repo **root**.
- `site/package.json` `build` already sets `NODE_OPTIONS=--max-old-space-size=6144` → `bun run build` carries the heap cap; safe on the 16 GB runner.

---

### Task 1: Create the deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/deploy.yml` with exactly this content:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      branch:
        description: "Pages deploy branch — 'main' = production, anything else = preview URL"
        required: false
        default: "main"

# A newer push to the same ref supersedes an in-flight build.
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11

      - name: Install root deps (provides wrangler)
        run: bun install --frozen-lockfile

      - name: Install site deps
        run: bun install --frozen-lockfile
        working-directory: site

      - name: Build site (astro build + lint)
        run: bun run build
        working-directory: site

      - name: Resolve deploy branch
        id: branch
        run: echo "name=${{ github.event_name == 'workflow_dispatch' && inputs.branch || 'main' }}" >> "$GITHUB_OUTPUT"

      # Run from repo ROOT so the functions/ auth dir is bundled (CF docs).
      - name: Deploy to Cloudflare Pages
        run: bunx wrangler pages deploy site/dist --project-name=awesome-everything --branch="${{ steps.branch.outputs.name }}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Verify the YAML parses**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml')); print('YAML OK')"
```
Expected: `YAML OK`.
If `python3`/PyYAML is unavailable, run instead:
```bash
bunx --yes js-yaml .github/workflows/deploy.yml >/dev/null && echo "YAML OK"
```
Expected: `YAML OK`. (GitHub also schema-validates the workflow server-side on push.)

- [ ] **Step 3: Verify the deploy command matches the proven `deploy:prod` shape**

The workflow's deploy command must match the project/flags already proven in root `package.json` `deploy:prod`. Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -q 'wrangler pages deploy site/dist --project-name=awesome-everything' .github/workflows/deploy.yml && echo "deploy cmd OK"
grep -q "CLOUDFLARE_API_TOKEN" .github/workflows/deploy.yml && grep -q "CLOUDFLARE_ACCOUNT_ID" .github/workflows/deploy.yml && echo "secrets wired OK"
```
Expected:
```
deploy cmd OK
secrets wired OK
```

- [ ] **Step 4: Confirm the deploy step runs from repo root (functions/ bundling)**

The `Deploy` step must have **no** `working-directory:` (so it runs at repo root where `functions/` lives). Run:
```bash
cd /Users/artemmac/dev/awesome-everything
awk '/name: Deploy to Cloudflare Pages/{f=1} f&&/working-directory/{print "FAIL: deploy step has working-directory"; exit 1} f&&/^      - name:/&&!/Deploy to Cloudflare/{exit 0} END{print "deploy runs at repo root OK"}' .github/workflows/deploy.yml
```
Expected: `deploy runs at repo root OK` (no FAIL line).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add .github/workflows/deploy.yml
git commit -m "ci(deploy): build in GitHub Actions + wrangler direct upload to CF Pages"
```

---

### Task 2: Operator runbook

**Files:**
- Create: `docs/operator-setup-deploy.md`

- [ ] **Step 1: Confirm the sibling runbook pattern exists**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
ls docs/operator-setup-auth.md && echo "pattern file present"
```
Expected: `pattern file present` (this is the doc whose structure we mirror; if absent, proceed anyway — content below is self-contained).

- [ ] **Step 2: Write the runbook**

Create `docs/operator-setup-deploy.md` with exactly this content:

````markdown
# Operator Setup — Production Deploy (GitHub Actions → Cloudflare Pages)

Production deploys are built in GitHub Actions and uploaded to Cloudflare Pages with
`wrangler pages deploy` (direct upload). This replaces Cloudflare's own git-integration
builds, which OOM'd on the ~4240-page render. See
`docs/superpowers/specs/2026-06-03-build-off-cf-direct-upload-design.md`.

The pipeline lives in `.github/workflows/deploy.yml`. Three one-time operator actions are
required before it can deploy.

## 1. Create a Cloudflare API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token → Create Custom Token**:

- **Permissions:** `Account` → `Cloudflare Pages` → **Edit**, and `Account` → `Account Settings` → **Read**.
- **Account Resources:** Include → your account.
- No D1/KV/R2 scopes are needed (migrations are not run from this workflow).

Copy the token value (shown once).

Find your account ID: dashboard → **Workers & Pages** → right sidebar **Account ID** (or
`wrangler whoami`).

## 2. Add GitHub repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

- `CLOUDFLARE_API_TOKEN` = the token from step 1.
- `CLOUDFLARE_ACCOUNT_ID` = your account ID.

## 3. Disconnect Cloudflare's Git integration

Cloudflare dashboard → **Workers & Pages → awesome-everything → Settings →
Builds & deployments → Disconnect** (the Git connection).

This stops Cloudflare from building on push; GitHub Actions becomes the sole deploy path.
Do this **after** the dry-run in the cutover below succeeds.

Project-level secrets already set for auth (`GITHUB_CLIENT_SECRET`, `SESSION_SECRET`) and
all `wrangler.toml` bindings (D1 `DB`, KV `SESSIONS`, R2 `MODELS`, `[vars]`) are unaffected —
direct uploads preserve them.

## Cutover sequence (zero-downtime)

1. Land `.github/workflows/deploy.yml` and add the two secrets (steps 1–2 above).
2. **Dry-run to a preview branch.** Repo → **Actions → Deploy to Cloudflare Pages → Run
   workflow**, set the `branch` input to `preview`. On the resulting `*.pages.dev` preview
   URL, verify: pages render, an `/api/*` route responds, and the GitHub login flow works
   end-to-end. This proves `functions/` was bundled and bindings/secrets are intact.
3. **Disconnect Git** (step 3 above).
4. Deploy production: push to `main` (or run the workflow with `branch` = `main`).

Cloudflare keeps serving the last good production deployment throughout, so there is no
downtime between disconnect and the first GitHub-Actions production deploy.

## Rollback

Cloudflare retains deployment history: **Workers & Pages → awesome-everything →
Deployments → … → Rollback**.

## Notes

- The deploy command runs from the **repo root** so wrangler bundles the root `functions/`
  directory (Cloudflare requires Wrangler, not dashboard drag-and-drop, to compile Functions).
- Per-PR preview deploys (a perk of the old Git integration) are not reproduced here; add a
  `pull_request`-triggered workflow deploying to `--branch=<pr-ref>` later if wanted.
````

- [ ] **Step 3: Verify the runbook parses as Markdown and has the key sections**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -q "CLOUDFLARE_API_TOKEN" docs/operator-setup-deploy.md \
  && grep -q "Disconnect" docs/operator-setup-deploy.md \
  && grep -q "Cutover sequence" docs/operator-setup-deploy.md \
  && echo "runbook sections OK"
```
Expected: `runbook sections OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add docs/operator-setup-deploy.md
git commit -m "docs(deploy): operator runbook for GitHub Actions direct-upload deploys"
```

---

### Task 3: Local end-to-end build dry-run (no deploy)

Confirm the exact build the workflow runs still produces a green `site/dist` locally, so a CI failure would be the deploy step (credentials/network), not the build.

**Files:** none (verification only).

- [ ] **Step 1: Run the workflow's build commands locally**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
bun install --frozen-lockfile
cd site && bun install --frozen-lockfile && bun run build
```
Expected: build completes, ends with the linter summary (`0 errors / 0 warnings`) and ~4240 pages emitted to `site/dist`. (Local heap cap 6144 is in the `build` script; the build is known-green at this size.)

- [ ] **Step 2: Confirm wrangler resolves at repo root**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
bunx wrangler --version
```
Expected: a `wrangler 4.x` version string (proves the deploy step's `bunx wrangler` resolves the locally installed binary, no network fetch needed).

- [ ] **Step 3: Confirm `functions/` is present at root for bundling**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
test -f functions/_middleware.ts && test -d functions/api && echo "functions/ present for bundling"
```
Expected: `functions/ present for bundling`.

No commit (verification only).

---

## Post-implementation (operator-gated, not an agent task)

The actual production cutover requires the three operator actions in
`docs/operator-setup-deploy.md` (API token, GitHub secrets, Git-disconnect) and the
dry-run-to-preview-then-promote sequence. An agent cannot perform these (dashboard +
secrets). After this plan's tasks land, hand off to the operator with that runbook.

---

## Self-Review

- **Spec coverage:**
  - §4/§5.1 workflow → Task 1 (full `deploy.yml`). ✅
  - §5.2 operator runbook → Task 2. ✅
  - §5.3 no code changes → enforced (only `.github/` + `docs/` touched). ✅
  - §6 operator steps + §6.1 cutover → documented in Task 2's runbook. ✅
  - §7 functions/ bundling (run from root) → Task 1 Step 4 asserts no `working-directory`; Task 3 Step 3 asserts `functions/` present. ✅
  - §10 testing (build gate, dry-run, smoke, rollback) → Task 3 build dry-run + runbook cutover/rollback. ✅
  - §3 "matches deploy:prod" → Task 1 Step 3 grep assertion. ✅
- **Placeholders:** none — every step has the literal file content or an exact command + expected output.
- **Consistency:** project name `awesome-everything`, branch flag, and secret names `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` are identical across `deploy.yml`, the runbook, and the verification greps. bun pinned `1.3.11` matches local. ✅
