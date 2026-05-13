# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

**Curriculum site** — `site/` (Astro 5 + Preact + Tailwind + i18n). 16 pillars × ~8 pieces × 2 langs = 256 piece slots. Chapter 01 (Networking) is fully authored EN+RU. Subsequent chapters land via `/infographic` invocations. Pedagogy widgets shipped: Pretest, TierAccordion, FadedExample, RetrievalDrawer, ReactiveDiagram, Sequencer, PersonaTag, SpiralCue, PrereqBadge, SpacedRevisitBanner, SettingsDrawer, Sandbox. Build-time linter enforces 9 rules (text budgets, depth checkpoints, hydration cap on piece pages, i18n parity + glossary, sources required, etc.).

**Domain lock**: every piece in this repo is about fullstack engineering (frontend, backend, databases, infra, distributed systems, security, performance, observability, AI integration, engineering practice). Off-domain topics are out of scope and the `/infographic` command will refuse them.

**Depth bar**: middle+ / senior fullstack engineer. See `curriculum.md` for the competency map and forbidden simplifications. Every piece must meet this bar — if a draft reads like documentation, it's too shallow. If it reads like a war-story postmortem, it's right.

**Three-tier hierarchy** (see `curriculum.md`):
- **Piece** — narrow topic ("TCP handshake", "JWT pitfalls") → 1 MDX file under `site/src/content/book/{en,ru}/<pillar>/<NN>-<piece>/`.
- **Chapter** — one pillar, ~8 pieces, learning path → folder under `site/src/content/book/`.
- **Topic** — 16 pillars, role-shaped ("Become senior fullstack") → full site with chapters 01–16, chapter 01 authored, rest via `/infographic` commands.

## Directory layout

```
site/                                        Astro 5 curriculum site (canonical output)
  astro.config.mjs
  package.json
  src/
    content/
      config.ts                              Collections: pillars, chapters, pieces
      pillars/01-networking.json … 16-engineering-practice.json
      chapters/01-networking.json … 16-engineering-practice.json
      book/
        en/<pillar>/<NN-piece>/index.mdx     EN pieces
        ru/<pillar>/<NN-piece>/index.mdx     RU pieces
    pages/
      index.astro                            Redirect to /en/
      [lang]/index.astro                     PillarGrid (16-card home)
      [lang]/[pillar]/index.astro            ChapterOverview + Sidebar
      [lang]/[pillar]/[piece].astro          Article reader
      [lang]/about.astro, settings.astro
    layouts/
      Topic.astro                            Outer chrome (head, title, lang switch, sources footer)
      Chapter.astro                          Sidebar + main article
    components/
      brand/           TitleBar.astro, LangSwitch.astro, SourcesFooter.astro
      prose/           Crux.astro, KeyTakeaway.astro, Callout.astro, Term.astro, SpiralCue.astro
      layout/          Card.astro, Misconception.astro, NumbersCard.astro, Pill.astro, StepBadge.astro
      diagram/         Connector.astro, Node.astro, Pulse.astro, Reveal.astro, PacketDot.astro, CountUp.astro, TypingText.astro
      pedagogy/        Pretest.tsx, TierAccordion.tsx, FadedExample.tsx, RetrievalDrawer.tsx, ReactiveDiagram.tsx, Sequencer.tsx, Sandbox.tsx, ProgressMeter.tsx, SpacedRevisitBanner.tsx, SettingsDrawer.tsx, PersonaTag.astro
      nav/             PillarGrid.astro, ChapterSidebar.astro, ChapterSidebarTOC.tsx
    i18n/
      ui.json                                UI labels (EN, RU)
      glossary.json                          Technical terms locked per locale
    scripts/
      user-state.ts, tier-router.ts, gsap-setup.ts, motion-flag.ts
  dist/                                      Built static output (generated, never edit)
  scripts/svg-to-png.sh                      SVG → PNG exporter (legacy, for reference assets)

docs/superpowers/                            Plans + specs (P0–P3 phases)
curriculum.md                                Fullstack depth bar + 16 pillars + 3-tier scoping (source of truth)
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
- Exactly 5 `..` segments in component import paths.

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

**Deploy:** Cloudflare Pages (or Hetzner CAX21 alt). Static output from `site/dist/`.

## Fenix rules

- No speculative edits — change only what is asked.
- Always check for existing patterns before introducing new ones.
- Prefer `bun` for Node projects (yarn as fallback).
- Before finishing any task: check types, lint, no console.log left in production code.
- Run the site build (`bun run build` in `site/`) if you touch any piece content.

## References

- `curriculum.md` — source of truth for depth bar, 16 pillars, forbidden simplifications.
- `style-guide.md` — ByteByteGo visual rules + component vocabulary.
- `docs/superpowers/specs/2026-05-12-fullstack-curriculum-site-design.md` — architecture spec.
- `docs/superpowers/plans/2026-05-12-fullstack-curriculum-site.md` — implementation plan (P2 pattern).
- `site/src/content/book/en/networking/03-tcp-handshake/index.mdx` — template piece (import paths, frontmatter, component usage).
