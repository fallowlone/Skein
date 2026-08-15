# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

**Curriculum site** — `site/` (Astro 5 + Preact + Tailwind + i18n). Live corpus (`site/src/content/tracks.json` + `units.json`): 44 tracks, 440 units. `networking` was the original flagship track and remains fully authored EN+RU (13 units, 125/125 lessons on disk); EN and RU lesson-file counts match exactly (2264/2264) across all 44 tracks. New or revised units land via `/infographic <track>/<unit>` invocations. Pedagogy widgets shipped (`site/src/components/pedagogy/`, `site/src/components/prose/`): Pretest, FadedExample, RetrievalDrawer, ReactiveDiagram, Sequencer, PersonaTag, SpiralCue, PrereqBadge, SpacedRevisitBanner, SettingsDrawer, Sandbox, plus newer additions (Quiz, ProgressMeter, PracticeSection, ReviewSession, GradeWithAi, JsSandbox, SqlSandbox, and more). The build-time linter (`site/src/lint/rules/*.ts`) enforces structural and bilingual rules — text budgets, hydration caps on lesson pages, i18n parity + glossary, sources required, and more.

**Domain lock**: every lesson in this repo is about fullstack engineering (frontend, backend, databases, infra, distributed systems, security, performance, observability, AI integration, engineering practice). Off-domain topics are out of scope and the `/infographic` command will refuse them.

**Depth bar**: middle+ / senior fullstack engineer. See `curriculum.md` for the competency map and forbidden simplifications. Every unit's lessons must meet this bar — if a draft reads like documentation, it's too shallow. If it reads like a war-story postmortem, it's right.

**Authoring model**: track → unit → lesson (no chapter/piece/topic tier). `/infographic <track>/<unit>` authors one unit; each lesson lands at `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`, bilingual EN+RU or the command refuses. See `curriculum.md`'s `## Authoring model` section for the full definition.

## Directory layout

```
site/                                        Astro 5 curriculum site (canonical output)
  astro.config.mjs
  package.json
  src/
    content.config.ts                        Collections: tracks, units, lessons, practice, projects, drill, lab
    content/
      tracks.json                            44 tracks (slug, order, title, blurb, color)
      units.json                             440 units (slug, track, order, title, crux, lessons[])
      personas.json                          Reader-persona metadata (imported directly, not a collection)
      lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx   EN+RU lesson MDX
      practice/<track>/<unit>/*.json         Practice task sets (bilingual, per lesson)
      projects/<slug>.json                   Guided project briefs + rubrics
      drill/<track>/*.json                   Algorithm-drill problem banks
      lab/<track>/*.json                     Mastery Lab tiered task sets (warmup/build/diagnose/capstone)
      interview/                             Empty — interview pages read the `practice` collection + src/data/interview-questions.json instead
      path/*.json                            Learning-path engine data (concepts, goals, diagnostics, edges) — read directly, not a collection
    pages/
      index.astro                            Redirect to /en/
      [lang]/index.astro                     Atlas homepage — track-band grid + "continue learning" resume strip
      [lang]/learn/index.astro               Track index
      [lang]/learn/[track]/index.astro       Track overview + unit list
      [lang]/learn/[track]/[unit]/[lesson].astro   Lesson article reader
      [lang]/learn/[track]/lab.astro         Mastery Lab
      [lang]/about.astro, settings.astro, assess.astro, interview.astro, projects.astro, …   (dozens more: assess/english/interview/projects/etc., not enumerated)
    layouts/
      Atlas.astro                            Homepage chrome (inlined critical CSS, TopNav, SEO)
      Topic.astro                            Outer page chrome (nav, sources footer, SEO/CSP, spaced-revisit banner)
      Lesson.astro                           Lesson article layout (Topbar, AltitudeGauge, LessonPlate, RightRail, NextLessonCard)
    components/
      brand/           TitleBar.astro, LangSwitch.astro, SourcesFooter.astro, SeoHead.astro, ThemeToggle.astro
      prose/           Crux.astro, KeyTakeaway.astro, Callout.astro, Term.astro, SpiralCue.astro
      layout/          Card.astro, Misconception.astro, NumbersCard.astro, Pill.astro, StepBadge.astro
      diagram/         Connector.astro, Node.astro, Pulse.astro, Reveal.astro, PacketDot.astro, CountUp.astro, FlowDiagram.astro
      pedagogy/        Pretest.tsx, FadedExample.tsx, RetrievalDrawer.tsx, ReactiveDiagram.tsx, Sequencer.tsx, Sandbox.tsx, ProgressMeter.tsx, SpacedRevisitBanner.tsx, SettingsDrawer.tsx, PersonaTag.astro
      nav/             GlobalSearch.astro, KeyboardShortcuts.astro, PersonaLegend.astro
      atlas/           TopNav.astro, HomeResume.astro, World.astro, Altimeter.astro, Summit.astro — homepage/global nav chrome
      lesson/          Hook.astro, Explanation.astro, Recap.astro, Topbar.astro, LessonPlate.astro — lesson-article building blocks
    i18n/
      ui.json                                UI labels (EN, RU)
      glossary.json                          Technical terms locked per locale
    scripts/
      user-state.ts, tier-router.ts, gsap-setup.ts, motion-flag.ts
  dist/                                      Built static output (generated, never edit)
  scripts/                                   Build tooling (bun scripts — lint-src.mjs, incremental-build.mjs, gen-infographics.mjs, audits)

docs/superpowers/                            Plans + specs
curriculum.md                                Fullstack depth bar + authoring model (source of truth)
style-guide.md                               ByteByteGo visual rules + component vocabulary
CLAUDE.md                                    This file
.claude/commands/infographic.md              `/infographic` command definition (site pipeline)

[LEGACY — reference only, not maintained]
infographics/, assets/exports/, drafts/, figma/   Old SVG+PNG infographics workflow (kept for historical reference)
```

## Primary command: `/infographic <pillar>/<NN-chapter>/<NN-piece>`

Author a single piece (stub → draft → ready) for the curriculum site's bilingual pipeline. Every piece is en English + Russian or the command refuses.

Input form:
```
/infographic networking/01-networking/03-tcp-handshake
/infographic databases/04-databases/07-postgres-mvcc
/infographic security/10-security/05-csrf-modern
```

Pipeline (per piece, codified in `.claude/commands/infographic.md`):

1. **Verify piece stub exists** — check `site/src/content/book/en/<pillar>/<NN-piece>/index.mdx`.
2. **Research** — WebSearch + Context7 (≥3 queries, middle+/senior depth: mechanism, tradeoff, failure mode, numbers).
3. **Author EN MDX** — frontmatter + body following the template structure: Crux → mechanism → tradeoff → failure mode → numbers → KeyTakeaway → RetrievalDrawer → SpiralCue.
4. **Translate to RU** — using `site/src/i18n/glossary.json`, add new terms alphabetically.
5. **Verify linter passes** — `bun run build` in `site/`, check `dist/lint-report.json`.
6. **Visual check** — open both EN and RU in a browser, verify rendering and interactivity.
7. **Commit** — `git commit -m "content(<pillar>): <NN-piece> EN+RU ready"`.

The command enforces:
- Bilingual or refuse.
- Text budgets (Crux ≤140, KeyTakeaway ≤220, Misconception ≤320, Card annot ≤240).
- Hydration cap = 5 islands per page (TierAccordion + FadedExample + RetrievalDrawer + 2 baseline).
- Status flow: stub → draft (optional) → ready.
- Component imports use the `~/` alias (`~` → `site/src/`); no `..` relative segments.

## Secondary command: `/teach <track>/<NN-unit>/<NN-lesson>`

Author a single absolute-beginner lesson (EN + RU) for the `foundations` section —
a learning track parallel to, and isolated from, the 16-pillar fullstack program.

- **Tracks:** `math` (mathematics from zero), `algorithms` (algorithms from zero),
  and `base-cs` (Base CS from zero — the spine rung between math and algorithms:
  how a computer runs code and what every programming construct means). The
  `algorithms` and `base-cs` tracks use distinct lesson skeletons; `base-cs` selects
  its skeleton per-lesson via the `lessonType: concept | coding` frontmatter field.
  Its widgets live in `site/src/components/algo/`, and lessons may declare
  `mathPrereqs` cross-track prerequisites into the math track.
- Spec: `docs/superpowers/specs/2026-05-16-foundations-algorithms-track-design.md`.
- **Content lives in** `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`,
  with `tracks.json` and `units.json` as the track/unit data files.
- **Lesson format is linear** (Hook → Goal → Explanation → Visual → WorkedExample →
  Practice → Check → Recap), with optional collapsible `<Inset>` blocks — the
  inverse of the tiered fullstack piece.
- **Routing:** `/learn/<track>/<lesson>`.
- **Linter:** the foundations rules in `src/lint/rules/lessons.ts` run in the same
  build pass; lesson pages have a hydration cap of 5 and require ≥4 practice
  problems and ≥1 visual.

The `/infographic` command and its fullstack domain lock are unchanged. `/teach` has
its own domain (mathematics and algorithms).

## MCP servers (when to use)

- **`claude.ai Figma`** — design-to-code, screenshots, FigJam diagrams, Code Connect. Use for Figma URLs (parse `fileKey` and `nodeId`; convert `-` → `:`).
- **`Excalidraw`** — quick low-fi diagrams or `export_to_excalidraw` for sketches.
- **`context7`** — fetch live docs for any library/SDK before writing code. Always resolve → query before coding.

## Skills (when to invoke)

- `superpowers:brainstorming` — required before designing a new piece concept (depth, pedagogy, composition).
- `superpowers:writing-plans` — when the piece needs a structured implementation plan.
- `superpowers:executing-plans` — when executing a written plan with review checkpoints.
- `superpowers:subagent-driven-development` — when a piece has independent sub-tasks (research, auth EN, RU translation, etc.).
- `design-system` — auditing visual consistency, reviewing styling changes.
- `frontend-patterns` — when a piece focuses on frontend architecture.
- `data-scraper-agent` — building a recurring scraper for piece data.
- `documentation-lookup` — wrapper around Context7.
- `seo` — when publishing a piece or chapter as a public web page.
- `video-editing` / `ui-demo` — when animating or demoing a piece.

## Build and deploy

**Local build:**
```bash
cd /Users/artemmac/dev/awesome-everything/site
bun install
bun run build   # Runs Astro build + linter
```

Expected: 301 pages, lint clean.

**Runnable code samples:** lesson code that should actually execute is opt-in.
Tag a fenced block with `run` in its info string and `bun run verify:samples`
(in `site/`) executes it under `bun`, asserting exit 0 within a timeout:

````
```js run
import crypto from 'node:crypto';
// … self-contained, stdlib-only or site/-installed deps; runs as the reader sees it
```
````

Directives: `run` (execute), `no-run` (never), `expect-throws` (must fail —
teaching a failure), `timeout=15000` (ms). Untagged blocks are left alone (most
are illustrative fragments). A `run` block must be self-contained — its own
imports, no hidden setup — so green means the displayed snippet works. EN is the
canonical run (code is identical across locales); mirror the tag to RU for parity.
`site/scripts/run-code-samples.mjs --self-test` proves the runner catches a crash.

**Deploy:** Cloudflare Pages (or Hetzner CAX21 alt). Static output from `site/dist/`.
CI (`.github/workflows/deploy.yml`) gates the deploy on unit tests + `verify:samples`
before the build, so a sample that crashes on its runtime blocks the deploy.

## Fenix rules

- No speculative edits — change only what is asked.
- Always check for existing patterns before introducing new ones.
- Prefer `bun` for Node projects (yarn as fallback).
- Before finishing any task: check types, lint, no console.log left in production code.
- Run the site build (`bun run build` in `site/`) if you touch any piece content.
- If you add or edit a `run`-tagged code sample, run `bun run verify:samples` (in `site/`).

## References

- `curriculum.md` — source of truth for depth bar, 16 pillars, forbidden simplifications.
- `style-guide.md` — ByteByteGo visual rules + component vocabulary.
- `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — architecture spec.
- `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` — implementation plan (P2 pattern).
- `site/src/content/book/en/networking/03-tcp-handshake/index.mdx` — template piece (import paths, frontmatter, component usage).

## Working style

- Thorough in reasoning, concise in output.
- No sycophantic openers or closing fluff.
- Do not guess APIs, versions, flags, commit SHAs, or package names — verify by reading code or docs before asserting.
