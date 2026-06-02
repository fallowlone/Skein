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
