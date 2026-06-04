# Expand the `ci-cd` track to full depth

Branch: `expand-cicd`. First read `PROTOCOL.md` in this folder and follow it exactly.
Track `ci-cd` already has units 00-start-here, 01-pipelines, 02-testing-in-ci (orders 0-2). Add the units below (orders 3+), author every lesson EN+RU to `ready`.

## Units to add

### 03-delivery-and-deploy  (crux: get a tested artifact safely into production)
- `01-cd-strategies` (middle) — continuous delivery vs deployment, blue-green, canary, rolling, feature-flag-gated release (TradeoffMatrix).
- `02-environments-and-approvals` (middle) — staging→prod promotion, manual approvals/gates, deployment environments, rollback.
- `03-build-once-promote` (senior) — build-once-deploy-many, immutable artifacts, config-per-env, the "rebuild drift" failure.

### 04-release-automation  (crux: versioning and releasing without manual toil)
- `01-semver-and-changelogs` (middle) — semver in practice, conventional commits, changesets/release-please, automated changelogs.
- `02-tagging-and-publishing` (middle) — git tags, GitHub Releases, publishing packages/images from CI on tag.

### 05-supply-chain  (crux: trust what you ship)
- `01-sbom-and-provenance` (senior) — SBOM, build provenance/SLSA, signing artifacts with sigstore/cosign.
- `02-dependency-and-secret-hygiene` (senior) — pinning, dependabot/renovate, secret scanning, least-privilege CI tokens (recap OIDC).

### 06-scaling-ci  (crux: keep CI fast as the repo grows)
- `01-monorepo-and-affected` (senior) — affected-only builds, remote caching, Nx/Turborepo, sharding.
- `02-pipeline-performance` (middle) — caching layers, parallelism, fail-fast, flaky-quarantine (recap), cost.

### 07-putting-it-together
- `01-capstone-full-pipeline` (senior) — design a complete pipeline: PR checks → build-once → staged deploy with canary + rollback + provenance.

Author at middle/senior depth (mechanism + tradeoff + real failure mode). Sources from docs.github.com/actions + the relevant tool docs. Build green on `expand-cicd`, commit, do NOT merge.
