# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

ByteByteGo-style **educational/explainer infographics** for **fullstack development** built via Claude Code + Figma. Output channels: live Figma files, SVG/PNG exports, HTML/React pages, and video/animation. Data is pulled from APIs or scraped from public sources.

**Domain lock**: every infographic in this repo is about fullstack engineering (frontend, backend, databases, infra, distributed systems, security, performance, observability, AI integration, engineering practice). Off-domain topics are out of scope and the `/infographic` command will refuse them.

**Depth bar**: middle+ / senior fullstack engineer. See `curriculum.md` for the competency map and forbidden simplifications. Every infographic must meet this bar — diagrams that read like documentation are too shallow.

**Three-tier hierarchy**: `/infographic` auto-classifies input into one of three tiers (see `curriculum.md`):

- **Piece** — narrow ("HTTP/2 multiplexing") → 1 SVG.
- **Chapter** — one pillar / multi-mechanism feature ("How HTTPS works") → 3–12 pieces with an `INDEX.md`. Hard cap 12 per chapter.
- **Topic** — multi-pillar / role-shaped ("Become senior fullstack") → unbounded `MAP.md` of chapters; auto-runs only chapter 01; emits continuation commands for the rest.

The hierarchy is how we go beyond 12 — never raise the per-chapter cap.

This is **not a code project** — there is no package.json, no build step, no test runner. The repo holds *artifacts and orchestration*: Figma file IDs, scraped data, exported assets, style rules, and one-off scripts.

## Directory layout

```
infographics/
  <piece-slug>/                                       Tier A — narrow topic, 1 piece
    spec.md, data.json, infographic.svg
  <chapter-slug>/                                     Tier B — chapter
    INDEX.md                                          Outline of 3–12 pieces
    <NN>-<piece-slug>/                                Each piece, standalone
      spec.md, data.json, infographic.svg
  <topic-slug>/                                       Tier C — mega-topic
    MAP.md                                            Unbounded list of chapters
    <NN>-<chapter-slug>/                              One subfolder per chapter
      INDEX.md
      <NN>-<piece-slug>/                              Pieces within chapter
        spec.md, data.json, infographic.svg

assets/exports/<...mirrored path...>/infographic.png  PNG exports mirror the infographics/ tree
figma/                                                Figma file registry (files.json + schema)
templates/svg-skeleton.svg                            Pre-styled SVG canvas (palette as CSS vars)
scripts/svg-to-png.sh                                 SVG → PNG (rsvg → inkscape → Chrome → qlmanage)
data/                                                 Raw data dumps + sessions.db
style-guide.md                                        ByteByteGo visual rules
curriculum.md                                         Fullstack depth bar + pillar map + 3-tier scoping
```

Each piece dir contains at minimum:
- `spec.md` — title, tier, audience, composition pattern, **depth checkpoints** (mechanism / tradeoff / failure mode / numbers — all 4 required), key points, sources, misconception
- `data.json` — structured facts/numbers driving the visual
- `infographic.svg` — the rendered piece
- (optional) a pointer in `figma/files.json` if also pushed to Figma

## Primary command: `/infographic <topic>`

The whole point of this repo is to go from a fullstack topic to finished infographic(s) in one shot. The command is defined in `.claude/commands/infographic.md` and runs an unattended pipeline.

```
/infographic Как устроен интернет
/infographic JWT vs session auth
/infographic PostgreSQL MVCC
```

Behaviour:

1. **Refuses non-fullstack topics** with a 2-line message.
2. **Parses the input**:
   - `topic/chapter/piece` (3 path segments) → piece tier directly.
   - `topic/chapter` (2 segments) → chapter tier directly.
   - Free-form text → classifies into piece / chapter / topic.
3. Branches by tier:
   - **Piece**: research → spec → data → SVG → PNG.
   - **Chapter**: `INDEX.md` + ≤12 pieces, each standalone, varied composition patterns, final = "putting it together".
   - **Topic**: `MAP.md` listing chapters (unbounded), auto-runs chapter 01, emits a list of `/infographic <topic>/02-...` continuation commands.
4. Reports outline + paths.

The cap of 12 stays per chapter — never raise it. The way to cover more is to declare the request a topic and let the hierarchy work.

## When NOT to use `/infographic`

Use the manual workflow below when:
- The user provides their own spec/data and only wants the visual rendered.
- The output needs to be a Figma design file (not local SVG/PNG). Then call Figma MCP write tools directly.
- The output is a video — kick off `video-editing` skill instead.

## Manual workflow

1. **Brainstorm topic + spec** → write `infographics/<slug>/spec.md`. Use the `superpowers:brainstorming` skill for non-trivial concepts.
2. **Collect data** → scrape/fetch via a script in `scripts/`, store as `infographics/<slug>/data.json`. Use the `data-scraper-agent` skill when the source is recurring.
3. **Design in Figma** → register the file in `figma/files.json`, then drive layout with the Figma MCP (`get_design_context`, `get_screenshot`, Code Connect mappings, FigJam `generate_diagram` for flow-style pieces).
4. **Export** → SVG/PNG into `assets/exports/<slug>/`.
5. **Republish (optional)** → render an HTML/React page for the web, or hand off to Remotion/CapCut/ffmpeg for video.

Always check `style-guide.md` before producing anything visual. ByteByteGo style is opinionated (numbered steps, isometric-ish shapes, blue/orange accent palette, generous whitespace) — deviating without reason produces off-brand work.

## MCP servers (when to use)

- **`claude.ai Figma`** — primary tool. Use for any Figma URL the user shares, design-to-code, screenshots, FigJam diagrams, Code Connect. Parse URLs to extract `fileKey` and `nodeId` (convert `-` → `:` in nodeId from query strings).
- **`Excalidraw`** — quick low-fi diagrams or `export_to_excalidraw` when a sketch is faster than Figma.
- **`context7`** — fetch live docs for any library/SDK before writing code (Remotion, Figma plugin API, scraping libs, etc.). Always resolve → query before coding.

## Skills (when to invoke)

- `design-system` — auditing visual consistency, generating tokens, reviewing styling changes.
- `frontend-patterns` — when output is HTML/React.
- `data-scraper-agent` — building a recurring scraper for an infographic data source.
- `video-editing` / `ui-demo` — when the output is animated/video.
- `documentation-lookup` — wrapper around Context7; use for any unfamiliar API.
- `superpowers:brainstorming` — required before designing a new infographic concept.
- `seo` — when publishing an infographic as a public web page.

## Scripts in `scripts/`

- `svg-to-png.sh <input.svg> [output.png]` — renders SVG → PNG using the best available tool (rsvg-convert → inkscape → headless Chrome → qlmanage). Output defaults to `assets/exports/<slug>/infographic.png`. No npm/brew install required — `qlmanage` is always present on macOS as the last-resort fallback.

Other scripts here are intentionally ad-hoc — no shared framework. Keep them small and self-contained. If a scraper is needed long-term, promote it to the `data-scraper-agent` skill (scheduled on GitHub Actions, results into Notion/Sheets/Supabase).

For one-off scrapes, output JSON next to its consumer: `infographics/<slug>/data.json`.

## Figma file registry

`figma/files.json` is the single source of truth mapping infographic slugs → Figma `fileKey` and the relevant `nodeId`s (canvas, frames, components). When a user shares a Figma URL, parse it and register it here before doing real work — that way the slug becomes the durable handle and the URL is just one of many ways to reach it.

## What this repo does *not* have

No tests, no lint, no build, no CI yet. Don't invent them. If a script grows large enough to need TypeScript + a test runner, ask first before scaffolding a full Node project — the explicit choice was to keep the repo as an assets-and-Figma workspace, not a code project.
