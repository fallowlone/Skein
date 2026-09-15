# Skein — Codex project context

This file is the durable entry point for Codex. It explains what Skein is, how the
current system is shaped, where the sources of truth live, and which invariants must
survive changes. For the current revision and active stage, read
[`CURRENT_STATE.md`](./CURRENT_STATE.md).

## Product

Skein is a bilingual (English/Russian) learning platform for progressing from
foundations toward middle+/senior fullstack engineering. The product combines a
large curriculum with prerequisite-aware planning, diagnostics, graded practice,
spaced review, projects, algorithm practice, English-for-engineers modules, account
sync, and optional AI coaching.

The central product idea is a learning graph with feedback: learner evidence changes
mastery state, and mastery state changes what Skein recommends next.

## Repository shape

The main product lives in `site/`.

| Area | Role |
| --- | --- |
| `site/src/content/` | Canonical authored curriculum and learning data. |
| `site/src/content/lessons/{en,ru}/` | Canonical bilingual lesson source. |
| `site/src/components/` | Astro/Preact UI, pedagogy, lesson, path, assessment, and product components. |
| `site/src/pages/` | Static application routes other than runtime lesson rendering. |
| `site/lesson-worker/` | Astro SSR entry point that renders lesson URLs at the edge. |
| `site/scripts/` | Build generators, curriculum lint, audits, verification, and Supabase publishing. |
| `functions/` | Cloudflare Pages Functions APIs, auth/session, billing, learning APIs, and lesson payload API. |
| `supabase/` | Curriculum schema and RPC definitions used by dynamic curriculum reads. |
| `docs/` | Design history, audits, operator docs, plans/specs, and historical handoffs. |
| `.github/workflows/deploy.yml` | CI/CD authority for test, build, curriculum publish/parity, Pages deploy, and lesson Worker deploy. |

Generated output such as `site/dist/` and `dist-lessons/` is not source code and must
not be edited directly.

## Current runtime architecture

Skein uses two delivery paths.

### Main application

- Astro 6 with static output.
- Preact islands for interactive surfaces.
- Tailwind for styling.
- Cloudflare Pages hosts the built application.
- Pages Functions provide stateful/dynamic APIs.
- D1/KV are used by server-side product features such as accounts, sessions,
  progress, and billing where configured.

### Lesson delivery

Lesson URLs under `/{lang}/learn/{track}/{unit}/{lesson}/` are no longer rendered as
ordinary static MDX pages by the main Astro build.

The production path is:

```text
Git lesson MDX
  -> build/publish pipeline compiles lesson-render-tree-v1
  -> Supabase curriculum tables + get_lesson_payload RPC
  -> /api/lessons/{lang}/{track}/{unit}/{lesson} Pages Function
  -> skein-lessons Astro SSR Cloudflare Worker
  -> Lesson.astro + LessonRenderTree.astro
  -> HTML response
```

Relevant sources:

- `site/scripts/content/lesson-render-tree.ts`
- `site/scripts/supabase/publish-corpus.ts`
- `functions/api/lessons/[[path]].ts`
- `site/lesson-worker/src/lib/lesson-payload.ts`
- `site/lesson-worker/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`
- `site/astro.lessons.config.mjs`

Lesson payloads are cacheable at the edge and versioned with an ETag. The Worker
fails explicitly when the lesson backend is unavailable or produces an invalid
payload.

## Content and data authority

Files in Git remain the authoring source of truth for curriculum content.

- Tracks: `site/src/content/tracks.json`
- Units: `site/src/content/units.json`
- Lessons: `site/src/content/lessons/{en,ru}/.../index.mdx`
- Practice/projects/drills/labs: their collections under `site/src/content/`
- Curriculum depth contract: `curriculum.md`
- Visual/component contract: `style-guide.md`
- Fullstack authoring workflow: `.claude/commands/infographic.md`
- Foundations authoring workflow: `docs/superpowers/specs/2026-05-16-foundations-algorithms-track-design.md`

Supabase is a published runtime representation of curriculum data. Do not make
Supabase the implicit authoring source of truth as a side effect of feature work.
Publishing and parity verification are part of CI/CD.

## Learning-system invariants

- Preserve EN/RU parity for authored lessons.
- Prerequisites constrain recommendations; market/job-demand signals may rank
  already-eligible material but must not bypass prerequisites.
- Reading, hints, self-report, or an LLM response alone must not be treated as strong
  mastery evidence.
- Prefer independent retrieval, graded attempts, delayed recall, and transfer
  evidence when changing mastery.
- Paid managed-AI paths must verify server-owned entitlement state. Client claims
  are not authority.
- BYOK flows remain distinct from managed paid AI.
- Do not send learner answers, code, or error content to analytics by default.
- Preserve bilingual, accessibility, keyboard, and mobile behavior when changing
  shared learning surfaces.

## Engineering rules that matter most

- Read `AGENTS.md` first and obey nearby/local instructions.
- Reuse existing components, scripts, data shapes, and lint rules before adding new
  infrastructure.
- Keep lesson/content changes bilingual when the authored surface is bilingual.
- Do not weaken curriculum lint, security checks, types, or tests to make a build
  pass.
- Prefer `bun`.
- A lesson content change requires `cd site && bun run build` plus inspection of
  `dist/lint-report.json`; runnable samples also require `bun run verify:samples`.
- For normal code changes, run targeted tests/checks first. CI/CD is the final
  authority for full production build and deploy behavior.

## Useful commands

From `site/`:

```bash
bun run dev
bun run check
bun run test
bun run build
bun run build:content
bun run verify:samples
bun run verify:projects
bun run verify:supabase-parity
bun run audit:practice-coverage
bun run verify:task-concepts
```

From `functions/`:

```bash
bun run test
bun run typecheck
```

## How to read historical docs

The repository contains many dated plans, audits, migration documents, and handoffs.
They are evidence and history, not automatically the current state. In particular,
older documents can predate the lesson Worker, production billing, or later CI
successes.

Use this order when facts conflict:

1. Current source/configuration and current CI evidence.
2. `.codex/CURRENT_STATE.md`.
3. `AGENTS.md`, `curriculum.md`, and maintained operator/source-of-truth docs.
4. Dated audits, plans, reports, and old handoffs.
