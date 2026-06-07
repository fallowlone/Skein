# Integrated capstone — "URL shortener at scale" — design spec

- **Date:** 2026-06-07
- **Status:** approved (design)
- **Predecessor:** Senior+ Campaign §F (the one genuine net-new value-add after the audit
  verdict). Findings: `docs/audit/2026-06-07-depth-audit-findings.md`.
- **Branch:** new branch off `main` (campaign A+B+C already merged to local main).

## 1. Goal

One integrated, cross-stack **capstone** that carries a single system —
**a URL shortener built to run under load** — through the full senior lifecycle
(idea → design → code → test → deploy → observe → incident → post-mortem), weaving the
senior fullstack spine tracks together. It is the curriculum's "now put it all together"
finale: every milestone draws on (`feedsFrom`) the spine lessons that teach it.

## 2. Format — a guided project (reuse existing infra)

Author **one bilingual project JSON**: `site/src/content/projects/url-shortener-at-scale.json`,
validated by the existing `ProjectSchema` (`src/content.config.ts`). It reuses the shipped
guided-capstone framework end to end — `CapstonePath.tsx`, `capstone-state.ts`
(per-milestone localStorage + sync), the `[lang]/projects/[slug].astro` route, and the
`projects`/`capstones` lint rules. The glob loader auto-discovers it; it appears in the
Projects hub.

No new infrastructure, components, routes, or schema. This is content authoring on a proven
framework. (Note: the Step-C depth-audit re-grade gate grades *lessons*, not projects, so it
does not apply here — the quality gate is the projects lint + `bun run build` + the
senior-depth bar described in §5.)

Field plan (ProjectSchema):
- `slug: "url-shortener-at-scale"`, `category: "fullstack"`, `difficulty: "advanced"`,
  `estDays`: a realistic multi-day figure.
- `tracks`: the spine tracks it weaves — networking, backend, apis, databases, caching,
  performance, observability, security, deployment, engineering-practice (+ system-design,
  ci-cd where they feed a milestone). All must be valid `Track` (TRACKS) slugs.
- `pitch`, `deliverable`, `brief`, `skills`, `stack` — bilingual where the schema is BiText.
- `milestones`: the 8 `GuidedMilestone`s in §3.
- `seniorStretch`: §4.

## 3. Milestones (8 × GuidedMilestone)

Each milestone has `id`, `title`, `goal`, `definitionOfDone[]` (a real self-checklist), and
`feedsFrom` (exact spine lesson keys, resolved from the lesson inventory at authoring time —
e.g. `databases/02-indexes/...`, `caching/03-stampede/...`, `caching/07-dogpile/...`,
`observability/...`, `engineering-practice/06-postmortems/...`). A `reviewPrompt` (the stored
review seam) is added where it sharpens the milestone.

1. **frame** — scope, scale target (e.g. 10k redirects/s, 100M links, read:write ≫ 1), SLOs,
   explicit non-goals. feedsFrom: system-design foundations, apis.
2. **design** — API contract; data model + short-code generation (counter+base62 vs random
   vs hash, collision handling); index + capacity estimate; cache + CDN strategy. feedsFrom:
   databases (modeling/indexes), apis (rest-modeling), caching, system-design.
3. **build-core** — the redirect hot path: create + resolve, base62, indexed Postgres,
   the request lifecycle. feedsFrom: databases (indexes), backend (request lifecycle), apis.
4. **cache-and-protect** — read-through cache, rate-limit / abuse protection, idempotent
   create. feedsFrom: caching (layers, stampede), security (rate-limit/abuse), backend.
5. **test** — unit + integration + load test of the redirect path + API contract test.
   feedsFrom: engineering-practice (tdd, contract-testing), ci-cd (testing-in-ci).
6. **deploy** — containerize, CI/CD pipeline, canary/blue-green, config/secrets, CDN for
   redirects. feedsFrom: deployment (docker, k8s, load-balancing), ci-cd, security (secrets).
7. **observe** — RED metrics, traces, SLO/error budget, dashboards, structured logs on the
   hot path. feedsFrom: observability (RED/USE, structured-logging, trace-propagation, SLO).
8. **incident-and-postmortem** — a hot-key cache stampede spikes p99 and origin load; work
   the incident (detect via metrics → mitigate → root-cause), then write the post-mortem.
   feedsFrom: caching (stampede/dogpile), observability (profiling), performance (hot-paths),
   engineering-practice (postmortems).

## 4. seniorStretch (≥1 BiText)
- Multi-region with read-local / consistency trade-offs.
- An analytics pipeline (click events → queue → aggregation) without slowing the redirect.
- Custom domains + automated TLS.
- Abuse/fraud detection on create + redirect.

## 5. Quality bar
- Bilingual EN + RU (every BiText field), RU using the project glossary; i18n parity.
- Senior depth: each milestone names the real mechanism, the trade-off, and the failure mode
  it guards against — not a to-do list. The incident milestone reads like a real postmortem.
  `feedsFrom` keys are **real** lesson keys (verified against the inventory) so the cross
  links resolve.
- Validation: `bun run build` passes `ProjectSchema` + the `projects`/`capstones` lint;
  the project renders in the Projects hub and at `/[lang]/projects/url-shortener-at-scale`.

## 6. Out of scope
New components/routes/schema; the other optional value-adds (niche concurrency-theory,
debugger lesson, typescript nudge); any change to the depth-audit tool.

## 7. Open questions (non-blocking)
- Exact `estDays` and the precise `feedsFrom` key list per milestone — resolved at authoring
  from the lesson inventory.
