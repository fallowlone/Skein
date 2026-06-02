# Build off Cloudflare + Direct Upload — Design Spec

**Date:** 2026-06-03
**Status:** Approved (design); pending implementation plan
**Author:** Claude (brainstorm with repo owner)
**Supersedes the build-scaling stopgap in** `memory/build_timeout.md` (`23afdce1`: serial render + 6 GB heap).

---

## 1. Problem

Cloudflare Pages builds the site on its own git-integration VM. The site emits **4240 pages** (2861 `learn/**` + 1362 `glossary/**` + ~17 app pages). `astro build` route generation is single-threaded, CPU- and memory-bound (Shiki highlighting dominates). After the three deep tracks landed the CF build flipped from **time-limit** (~35 min wall) to **OOM** (`FATAL: heap out of memory` / SIGABRT) at Node's default ~4 GB heap on CF's 8 GB builder.

The current fix (`build.concurrency: 1` + `NODE_OPTIONS=--max-old-space-size=6144`, commit `23afdce1`) keeps the build green but is a **stopgap**: render volume grows with content (track-deepening, new tracks), so the OOM/time-limit will recur. The root cause is not a bug — it is page volume against CF's *builder* resource caps.

## 2. Goal

Decouple production deploys from Cloudflare's builder. Build on a runner with no time limit and ample memory (GitHub Actions: `ubuntu-latest`, 4 vCPU / 16 GB, 6 h job cap), then ship the prebuilt `site/dist` plus the repo-root `functions/` directory via `wrangler pages deploy`.

**Non-goals.** No move to on-demand SSR (evaluated as "Plan A" and deferred — see §8). No change to `output: "static"`, the auth `functions/`, the build-time linter, or any page rendering. This spec changes *where and how the build runs and deploys*, nothing about *what it produces*.

## 3. Why this approach (vs the alternatives)

The site is a **content site**: pages change only when lessons are authored, not per request. Per-user personalization already lives client-side and in `functions/` (D1/KV). That profile is the textbook case for **static + direct upload**.

- **Plan A (on-demand SSR, `@astrojs/cloudflare`)** — rejected for now. It would make the build trivial but (a) emits `_worker.js`, which makes CF Pages *ignore* the existing `functions/` dir (mutually exclusive), forcing a full port of auth into Astro middleware; (b) moves Shiki render cost to runtime per cold page; (c) risks Worker bundle/chunk size across ~4223 MDX; (d) guts lint-on-dist. High cost, high risk, no product need today.
- **Plan B (this spec)** — removes the CF *builder* limit entirely with zero architecture change. Keeps `output: static`, auth, lint, and all rendering. ~90 % pre-wired: the root `package.json` already has `deploy:prod = bun run build && wrangler pages deploy site/dist --project-name=awesome-everything --branch=main`.
- **Micro-optimizations** (memoization, parallel lint, build cache) — already applied (`855c257a`); they shaved single-digit percentages and cannot durably outrun content growth.

## 4. Architecture

```
push → main  (or workflow_dispatch)
  └─ GitHub Actions: ubuntu-latest (16 GB, no time limit)
       1. checkout
       2. setup bun (oven-sh/setup-bun) + cache ~/.bun
       3. bun install                     # in site/
       4. bun run build                   # astro build + lintCurriculum() integration → site/dist
       │       ↑ lint or build failure → job fails → NO deploy (deploy gated on green)
       5. wrangler pages deploy site/dist \
              --project-name=awesome-everything --branch=main
          # run from repo ROOT → functions/ auto-bundled (CF docs, see §7)
          # env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
  └─ Cloudflare Pages serves:
       • static assets  (site/dist)
       • Pages Functions worker  (functions/  → /api/*, _middleware.ts)
       • bindings from wrangler.toml  (D1 DB, KV SESSIONS, R2 MODELS, [vars])
       • project secrets  (GITHUB_CLIENT_SECRET, SESSION_SECRET — set via dashboard, unchanged)
```

The deploy command **must run from the repository root**, because that is where `functions/` lives and wrangler bundles a `functions/` directory found at its working directory (§7).

## 5. Components

### 5.1 `.github/workflows/deploy.yml` (new — the only real artifact)

- **Triggers:** `push` to `main`; `workflow_dispatch` (manual + preview-branch dry-runs).
- **Concurrency:** group `deploy-${{ github.ref }}`, `cancel-in-progress: true` — a newer push supersedes an in-flight build.
- **Permissions:** `contents: read` (minimal; no write/PR scopes needed).
- **Steps:**
  1. `actions/checkout@v4`
  2. `oven-sh/setup-bun@v2` (pin bun to match local `1.3.11`; cache `~/.bun/install/cache`)
  3. `bun install` — run in `site/` (install the Astro app deps)
  4. `bun install` — run at repo root (provides `wrangler` from root `devDependencies`)
  5. `bun run build` in `site/` (or `bun run --cwd site build`) → `site/dist`
  6. `bunx wrangler pages deploy site/dist --project-name=awesome-everything --branch=main` from repo **root**, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `env`.
- **Heap:** the build script already caps heap at 6144 MB; on a 16 GB runner this is safe headroom. v1 keeps the proven serial config. (Optional follow-up: restore `build.concurrency: 2` + raise heap once green, to cut build time — not in v1.)
- **`functions/` deps:** none — `functions/package.json` is dep-free by design (so wrangler bundles a clean dir). CI needs **no** functions install step.

### 5.2 `docs/operator-setup-deploy.md` (new — operator runbook)

Mirrors the existing `docs/operator-setup-auth.md`. Documents the three operator actions (§6) and the cutover sequence (§6.1), with exact dashboard paths and the API-token scope.

### 5.3 No changes to `site/` or `functions/`

`astro.config.mjs`, `package.json`, the linter, and all content/components are untouched. This is purely a deploy-path change.

## 6. Operator steps (manual — cannot be automated from the repo)

1. **Create a CF API token.** Scope: **Account → Cloudflare Pages: Edit**, plus **Account → Account Settings: Read**. (No D1/KV scopes in v1 — migrations are not run from CI here.)
2. **Add GitHub repo secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. **Disconnect Git integration** on the Pages project: *Workers & Pages → awesome-everything → Settings → Builds & deployments → Disconnect*. This stops CF's own builds; GitHub Actions becomes the sole deploy path.

Project-level secrets already set for auth (`GITHUB_CLIENT_SECRET`, `SESSION_SECRET`) and all `wrangler.toml` bindings are unaffected by switching the deploy method — direct uploads preserve them.

### 6.1 Cutover sequence (zero-downtime)

1. Land `deploy.yml` and add the two GH secrets.
2. **Dry-run first:** `workflow_dispatch` with the deploy step targeting a **preview** branch (`--branch=preview`). On the resulting `*.pages.dev` preview URL, verify: pages render, an `/api/*` route responds, and the GitHub login flow works end-to-end (proves `functions/` bundled + bindings + secrets intact).
3. **Disconnect Git** (operator step 3).
4. Deploy `--branch=main` (push to main or manual dispatch) = production.

Throughout, Cloudflare keeps serving the last good production deployment, so there is **no downtime** in the gap between disconnect and the first GH-Actions production deploy.

## 7. Key validated facts

- **`functions/` is bundled on direct upload.** Cloudflare docs (Pages → direct upload, Functions troubleshooting): *"When deploying a project using Wrangler, if a functions folder exists where the command is run, that functions folder will be uploaded with the project."* Running `wrangler pages deploy site/dist` from repo root (where `functions/` lives) ships the auth worker. Dashboard drag-and-drop does **not** compile functions — Wrangler is required, which is exactly what this design uses.
- **Bindings apply from `wrangler.toml` on deploy.** The root `wrangler.toml` declares D1 `DB`, KV `SESSIONS`, R2 `MODELS`, and `[vars]`; wrangler applies them on `pages deploy`.
- **`functions/` is intentionally dep-free** (`functions/package.json` comment: "the deployed Pages Functions dir must stay clean (no node_modules) or wrangler bundles it and fails"). No CI install for it.

## 8. Deferred: Plan A (on-demand SSR)

Kept on the shelf. Becomes the right tool only if a real need appears for: server-rendered per-user personalization, instant content publish without any rebuild, or page counts (100k+) where even a no-limit runner build is too slow. If adopted later it requires: `@astrojs/cloudflare` adapter, `prerender = false` on `learn/**` + `glossary/**`, a full port of `functions/` auth into Astro middleware (because `_worker.js` and `functions/` are mutually exclusive on Pages), an edge-cache strategy, Worker bundle-size validation across ~4223 MDX, and a rewrite of lint-on-dist into a render pass.

## 9. Tradeoffs accepted

- **Loss of automatic per-PR preview deploys** (a perk of Git integration). Mitigation, out of scope for v1: an optional second workflow on `pull_request` deploying to `--branch=<pr-ref>` for a preview URL.
- **Build time still grows with content.** Acceptable on a no-time-limit runner; addressed durably only by Plan A if/when warranted.
- **CI minutes.** Negligible — unlimited for public repos; ~7 min/run otherwise, within the free tier.

## 10. Testing & verification

- **Dry-run on a preview branch** (§6.1 step 2): asset serving, `/api/*` response, full auth login.
- **Build gate:** confirm a deliberately lint-failing build fails the job and produces no deployment.
- **Post-cutover production smoke:** home, a lesson page, a glossary term, login, and one D1/KV-backed action (e.g. progress write) on the production domain.
- **Rollback:** Cloudflare retains deployment history; roll back via the Pages dashboard if a deploy regresses.

## 11. Out of scope

PR preview workflow; D1 migration automation from CI; build-time parallelism / heap tuning; any move to SSR (Plan A); changes to content, components, or the linter.
