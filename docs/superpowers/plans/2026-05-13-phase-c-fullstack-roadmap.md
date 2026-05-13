# Phase C — Fullstack chapters 02-16 roadmap

> Roadmap, not detailed plan. Per-piece authoring already specified in `docs/superpowers/plans/2026-05-13-tier-text-migration-plan-b.md` (the Per-piece flow template). This document fixes ordering, gates, and milestones across the 15 remaining fullstack chapters.

**Scope:** 15 chapters × 8 pieces × 2 langs = **240 piece writes**. Chapter 01 (networking) is complete and serves as the reference shape (`site/src/content/book/en/networking/05-tls-handshake/index.mdx`).

**Pipeline:** unchanged. Every piece flows through `/infographic` → 3-tier scaffold (`site/scaffolds/3-tier-piece.mdx`) → `/verify-piece` → commit. Linter rules `tier-word-budgets` + `exercise-counts` enforce 3-tier integrity at build time (errors).

## Chapter ordering (ROI / interest)

Ordered by senior interview signal + production-frequency demand. Each chapter authors 8 pieces (pilot first, then fan out). Per-chapter pilot is the most-interesting piece — same role 05-tls-handshake played for networking.

| # | Chapter | Pillar | Pilot piece | Why first |
|---|---|---|---|---|
| 1 | 06-databases | databases | 04-mvcc-isolation | Highest senior interview demand, MVCC is dense + load-bearing across topics. |
| 2 | 04-backend | backend | 05-idempotency-retries | Foundational for queues, distributed, apis. Idempotency is interview staple. |
| 3 | 09-distributed | distributed | 02-raft-outline | Hardest depth bar; piloting here de-risks the rest. |
| 4 | 10-security | security | 02-oauth-oidc | OAuth depth is rare and high-leverage. |
| 5 | 05-apis | apis | 06-graphql-n-plus-one | Production failure that everyone hits, perfect senior tier material. |
| 6 | 07-caching | caching | 03-stampede | Cache stampede is a war-story magnet. |
| 7 | 08-queues | queues | 01-delivery-guarantees | Exactly-once-ish framing sets up the whole pillar. |
| 8 | 02-browser | browser | 03-v8-internals | V8 internals + event-loop + hydration depth — anchor the FE side. |
| 9 | 03-frontend | frontend | 02-data-fetching | Server/client boundary is the modern FE question. |
| 10 | 13-performance | performance | 03-cache-vs-bigo | Big-O vs cache behavior — the canonical senior performance insight. |
| 11 | 11-observability | observability | 04-red-use | RED + USE method is the production lens for the whole pillar. |
| 12 | 12-deployment | deployment | 04-rollout-strategies | Canary/blue-green nuance is rarely taught at depth. |
| 13 | 14-data-engineering | data-engineering | 04-materialized-views | OLAP/OLTP boundary, materialized views are the bridge. |
| 14 | 15-ai-llm | ai-llm | 03-rag-architecture | Most-asked LLM topic in 2026 hiring. |
| 15 | 16-engineering-practice | engineering-practice | 06-postmortems | Capstone — meta layer over everything that came before. |

## Per-chapter flow (8 pieces)

For each chapter, run the Phase B per-piece checklist (`tier-text-migration-plan-b.md` § "Per-piece flow") against every piece in order:

```
1. Pilot piece     — author EN+RU, /verify-piece, commit.
2. Pieces 2-7      — author EN+RU each in pilot order, /verify-piece, commit.
3. Piece 8 (`*-putting-it-together`) — synthesis piece, author last.
```

Per-piece deliverables (mirrors Phase B):
- 3-tier MDX (junior 200-700w + middle 2500-3700w + senior 2500-4000w).
- ~20 exercises split per tier mix (5 / 8 / 7).
- RU mirror with glossary updates appended alphabetically.
- `/verify-piece` report attached to commit if any ⚠ findings accepted.
- Commit: `content(<pillar>): <NN-piece> EN+RU ready`.

## Gates

Per-chapter:
- **G1 (pilot done)** — pilot piece committed, `/verify-piece` report clean, build green.
- **G2 (chapter complete)** — all 8 pieces committed in `status: ready`, build green, hydration cap met on every piece, glossary updated.
- **G3 (chapter retro)** — short reflection: what authoring shortcuts worked, what didn't, glossary growth count, time spent. Append to `docs/superpowers/retros/phase-c-<NN-pillar>.md` (one paragraph each).

Cross-chapter:
- **G4 (Phase C closed)** — all 15 chapters at G2. Total piece count = 240. Build green. Lint clean. Pretest re-tuned against observed user-state distribution if needed (see Phase B § Risks).

## Estimated effort

Per Phase B estimate (~6-7 days per piece), Phase C is **240 × 6.5 days ≈ 1560 days** of focused work if done serially by one author. Realistically:
- Each piece deepens authoring fluency, so per-piece time should compress 30-50% after the first 3-5 chapters.
- Subagent-driven authoring (`superpowers:subagent-driven-development`) can parallelize independent pieces inside a chapter (research → EN draft → RU translation → verify all run as separate subagent dispatches).
- Compounded: realistic floor is **~600-900 days** at single-author pace, less if multi-agent parallelism is exploited or if some pieces are merged/dropped from the 240 slot count.

This is not a constraint to optimize against — it is a magnitude estimate. Cadence is set by the author, not by a deadline.

## Out of scope for Phase C

- Topic 2 (CS Foundations) schema additions, route migration, topic switcher — see `docs/superpowers/specs/2026-05-13-cs-foundations-design.md`. All deferred until Phase C closes.
- New components beyond the 10 exercise components + existing prose/diagram inventory.
- New linter rules.
- Curriculum reshuffling. Chapter list and piece list in `chapters.json` are frozen; per-piece title/slug changes are allowed only via explicit user instruction.

## Risks + mitigations

1. **Authoring fatigue across 240 pieces.** Mitigation: per-chapter retros at G3 surface drift early; rotate chapter pilot order on user demand.
2. **Glossary divergence in RU.** Mitigation: `/verify-piece` i18n-parity check; alphabetical-order discipline; review glossary growth at every G2.
3. **Linter false positives across diverse chapter shapes.** Mitigation: rules already promoted to errors with chapter 01 evidence base; per-chapter exception list grows in `site/src/lint/index.ts` only with explicit justification.
4. **Component drift across the 15 chapters.** Mitigation: every new piece must `cp site/scaffolds/3-tier-piece.mdx` — refuse to draft fresh MDX from scratch.
5. **Hydration cap blowout.** Mitigation: prefer `.astro` exercises (already the case); per-piece review of `.tsx` island count at `/verify-piece`.
6. **`/verify-piece` over-flags as senior depth tightens.** Mitigation: tune verify-piece prompts after pilot of chapter 1 (06-databases) ships.

## References

- `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — parent spec.
- `docs/superpowers/plans/2026-05-13-tier-text-migration-plan-b.md` — per-piece flow + linter promotion (Tasks 9 + 10 shipped).
- `docs/superpowers/specs/2026-05-13-cs-foundations-design.md` — Topic 2 design (deferred).
- `.claude/commands/infographic.md` — 3-tier-mandatory authoring command.
- `site/scaffolds/3-tier-piece.mdx` — canonical scaffold for new pieces.
- `site/src/content/book/en/networking/05-tls-handshake/index.mdx` — pilot reference.
