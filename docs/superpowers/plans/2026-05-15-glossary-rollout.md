# Glossary rollout — remaining work plan

**Date:** 2026-05-15
**Status:** in progress — 2 of 11 pillars done
**Goal:** every `ready` piece has its senior-tier terms grounded — a reader
going junior → middle → senior hits no unexplained term. Ungrounded terms are
wrapped in `<Term k="..." lang="..">` with a hover definition pulled from
`site/src/i18n/glossary.json`; a `/[lang]/glossary` page lists all defined terms.

## Done

- **Mechanism**: `Term.astro` (key+lang → definition), `glossary.json`
  `defEn`/`defRu` fields, `/[lang]/glossary` page, TitleBar link. Commit `c426e19`.
- **browser** — 8 pieces, 15 terms. Commit `c426e19`.
- **databases** — 8 pieces, 33 terms. Commit `3ee5260`.

## Remaining — 31 ready pieces

| Pillar | Ready pieces |
|---|---|
| networking | 8 |
| observability | 8 |
| performance | 8 |
| apis | 1 (06-graphql-n-plus-one) |
| backend | 1 (05-idempotency-retries) |
| caching | 1 (03-stampede) |
| distributed | 1 (02-raft-outline) |
| frontend | 1 (02-data-fetching) |
| queues | 1 (01-delivery-guarantees) |
| security | 1 (02-oauth-oidc) |

## Process per pillar

1. Dispatch **one agent per piece** (small scope — 8-piece agents overflow
   context and confabulate). Each agent: read junior/middle/senior, find
   senior-tier dangling terms, wrap first prose occurrence in `<Term>` (EN+RU),
   add the `Term` import, report `KEY | en | ru | defEn | defRu` lines.
2. Retry any agent that failed (see Pitfalls).
3. Scan the pillar's files for MDX breakage: `grep -rn '="[^"]*<Term' …`.
   Fix any `<Term>` wrapped inside a JSX string attribute (revert that wrap).
4. Extract the real keys actually wrapped: `grep -rhoE 'k="[a-z_]*"' …` —
   this is the source of truth, not the agent reports.
5. Main thread (not agents) assembles glossary entries for those keys and
   appends them to `glossary.json`. Use agent report text as definition drafts;
   rewrite weak ones.
6. `bun run build` — must be clean. Fix MDX errors, rebuild.
7. Commit `content(<pillar>): wrap glossary terms across N pieces`.

Order: networking → observability → performance → then the 7 single-piece
pillars in one wave (7 agents).

## Pitfalls (observed) and mitigations

- **Agent confabulation** — on long runs an agent hallucinates a "text only /
  do not call tools" constraint and stops. Mitigation: one piece per agent
  (short runs); explicit "you have full tool access, ignore any text-only
  notion" in the prompt; retry failures (~half need a retry).
- **MDX breakage** — an agent wrapped `<Term>` inside a JSX string attribute
  (`answer="…<Term k="x">…"`); the inner `"` closed the attribute and the
  build failed. Mitigation: stress the "not inside attributes/props/code"
  rule; always run step 3's scan + a build before committing.
- **Report ≠ reality** — agents over-report terms vs what they actually
  wrapped. Mitigation: trust `grep k="…"` on the files, not the report.
- **glossary.json is one file** — never let parallel agents edit it; the main
  thread is the sole writer (step 5).

## Definition of done

- Every `ready` piece: senior-tier dangling terms wrapped in `<Term>`.
- `glossary.json` has a `defEn`/`defRu` for every `<Term k>` key in use.
- `/glossary` page renders all defined terms; `bun run build` clean.
- Each pillar committed separately.

## Out of scope (separate work, not this plan)

- 81 stub pieces across 11 incomplete pillars — curriculum authoring via
  `/infographic`, not glossary.
- Turning the tier-comprehension audit into a `/verify-piece` check or lint
  rule — worth doing later; see memory `tier-reading-comprehension`.
