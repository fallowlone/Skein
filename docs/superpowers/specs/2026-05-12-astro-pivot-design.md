# Astro Pivot Design

**Status:** draft, awaiting user review.
**Date:** 2026-05-12.
**Replaces:** `2026-05-12-visual-qa-system-design.md` (SVG generator) as the primary teaching artifact. The SVG MVP is archived for reference.

## 1. Problem

The SVG generator delivered a working pipeline (`layout.json` to validated SVG) but the resulting infographics are pedagogically weak. Static visuals cannot:

- Convey temporal mechanisms (packet flight, handshake order, render pipeline, RTT timing) - which are most of what a senior fullstack engineer needs to learn.
- Drive narrative focus. Everything is visible at once; the reader has no guide.
- Reach the information density of an animated storytelling page; SVG canvas space ends up sparse.

A static infographic can still serve as a printable summary or social share, but it is the wrong vehicle for deep teaching. The user has chosen to pivot the primary deliverable to an animated HTML site.

## 2. Goals

1. Each topic renders as a scroll-driven HTML page with idle ambient motion. The reader scrolls, the story unfolds, and even at rest the page feels alive.
2. Visual language stays ByteByteGo. Palette, panels with dashed borders and pill titles, chunky icons, numbered green steps - all translate directly to CSS.
3. Same depth bar applies (`curriculum.md` is unchanged). The HTML medium just makes it easier to hit the bar without text walls.
4. Output remains a static asset. The page builds to a deployable static bundle, no runtime server, no JS-heavy framework runtime overhead.
5. Animation respects accessibility and performance: honors `prefers-reduced-motion`, runs only when in viewport.

## 3. Non-goals

- SSR, ISR, or any dynamic server rendering. Static output only.
- A CMS. Topics are authored as `.astro` pages (or markdown with components) in the repo.
- A component design system as a standalone package. The components live in `site/src/components/` and serve this repo.
- Backwards compatibility with the SVG `layout.json` schema. That artifact is archived. The Astro pipeline is a clean restart.
- Video output. Animated HTML only. (Remotion can be added later if a topic needs a recorded clip.)

## 4. Stack

- **Astro 5+** with `output: "static"`. Bun runtime, since the user already has Bun installed.
- **Tailwind CSS** via `@astrojs/tailwind`. ByteByteGo palette tokens defined in `tailwind.config.ts`.
- **GSAP 3** with the **ScrollTrigger** plugin (both free) for scroll-driven and idle animations. GSAP is loaded only on pages that animate.
- **MotionPath** plugin (free, bundled in gsap/MotionPathPlugin) for packet-dot animations along SVG paths.
- **TypeScript** throughout (Astro components and client scripts).

Project lives at `site/`. The repo root remains free of `package.json`. The existing `scripts/build/` SVG project is archived to `scripts/_archive/build/` and stays referenceable but is no longer in the primary workflow.

## 5. File structure

```
site/
  package.json
  tsconfig.json
  astro.config.mjs
  tailwind.config.ts
  src/
    layouts/
      Topic.astro                # page layout for a single topic
    components/
      brand/
        TitleBar.astro           # teal stripe + headline + ByteByteGo wordmark
        SourcesFooter.astro
      layout/
        Stage.astro              # full-width panel that anchors a scroll segment
        Pill.astro               # rounded pill (panel title)
        Card.astro               # rounded card with content slot
        StepBadge.astro          # green numbered circle + label
        Misconception.astro      # red callout
        NumbersCard.astro        # yellow note with stats
      diagram/
        Node.astro               # generic visual node wrapper (icon + label)
        Connector.astro          # SVG connector between two element ids
        PacketDot.astro          # ambient packet that travels along a connector
        Pulse.astro              # idle pulse wrapper
        Reveal.astro             # scroll-triggered reveal wrapper
        CountUp.astro            # number animates up to target
        TypingText.astro         # text reveals on scroll
      icons/
        Server.astro Database.astro Monitor.astro Globe.astro Cloud.astro
        Resolver.astro Lock.astro Key.astro Doc.astro CDN.astro Queue.astro
        ...
    scripts/
      gsap-setup.ts              # ScrollTrigger init, reduced-motion guard
      ambient.ts                 # idle loops (packet flow, pulses, draw-loops)
      hover.ts                   # micro-interactions
    styles/
      global.css                 # Tailwind base + BBG tokens + keyframes
    pages/
      index.astro                # landing: list of topics
      web-request.astro          # first topic (pilot)
  public/
    favicon.svg
docs/superpowers/
  specs/2026-05-12-astro-pivot-design.md       # this file
  plans/                                       # plan written next
scripts/_archive/build/                        # archived SVG generator
style-guide.md                                 # editorial reference, unchanged
curriculum.md                                  # depth bar, unchanged
CLAUDE.md                                      # updated to point at site/
```

The root `package.json` rule still holds. Only `site/package.json` exists at the project layer.

## 6. Tailwind tokens

`tailwind.config.ts` registers the ByteByteGo palette as named colors so components can use `bg-panel-lilac`, `border-panel-lilac`, `text-step`, etc.

```ts
theme: {
  extend: {
    colors: {
      panel: {
        lilac:  { DEFAULT: "#EEEAFE", ink: "#7C3AED" },
        mint:   { DEFAULT: "#E6F6EE", ink: "#16A34A" },
        peach:  { DEFAULT: "#FEEFE0", ink: "#D97706" },
        sky:    { DEFAULT: "#E0F2FE", ink: "#0284C7" },
        rose:   { DEFAULT: "#FCE7F3", ink: "#DB2777" },
      },
      bbg: {
        teal: "#1FBFA8",
        purple: "#7C3AED",
        ink: "#1F2937",
        muted: "#6B7280",
        warn: "#DC2626",
        success: "#16A34A",
        annot: "#374151",
      },
    },
    fontFamily: {
      sans: ["Inter", "ui-sans-serif", "system-ui"],
      mono: ["ui-monospace", "Menlo"],
    },
  },
},
```

Fonts: load `Inter` via `<link rel="preconnect">` to Google Fonts in `Topic.astro` head with `font-display: swap`. No webfont bundling.

## 7. Page architecture

Each topic page extends `Topic.astro` and is composed of:

1. `<TitleBar headline="..." />` - sticky at top.
2. A sequence of `<Stage theme="lilac" title="Resolve URL" step={1}>` blocks. Each Stage:
   - Renders a panel with the chosen pastel theme, dashed border, pill title.
   - Wraps content slots. Slots include free composition of Cards, Nodes, Connectors, Numbers, etc.
   - Becomes the ScrollTrigger anchor: when at least 30% in viewport, GSAP scrubs an entry timeline that fades+rises the inner content.
3. A `<SourcesFooter />` with attribution and ByteByteGo wordmark.

Page structure example:

```astro
---
import Topic from "../layouts/Topic.astro";
import Stage from "../components/layout/Stage.astro";
import Card from "../components/layout/Card.astro";
import Node from "../components/diagram/Node.astro";
import Connector from "../components/diagram/Connector.astro";
import PacketDot from "../components/diagram/PacketDot.astro";
import Misconception from "../components/layout/Misconception.astro";
---
<Topic
  title="How a web request reaches the server"
  pillars={["networking"]}
  depth={{
    mechanism: "stage-connect",
    tradeoff:  "stage-resolve",
    failure_mode: "mc-errors",
    numbers: "card-timings",
  }}
  sources={["https://datatracker.ietf.org/doc/html/rfc9110"]}
>
  <Stage id="stage-resolve" theme="lilac" step={1} title="Resolve URL">
    <Card variant="yellow">GET https://google.com</Card>
    <Node id="n-browser" icon="monitor" label="Browser" />
    <Node id="n-resolver" icon="resolver" label="OS resolver" />
    <Connector from="#n-browser" to="#n-resolver" label="lookup">
      <PacketDot color="bbg-purple" durationMs={1800} />
    </Connector>
  </Stage>

  <Stage id="stage-connect" theme="mint" step={2} title="DNS + TCP + TLS">
    <Node id="n-edge" icon="server" label="Edge" />
    <Node id="n-origin" icon="server" label="Origin" />
    <Connector from="#n-edge" to="#n-origin" label="TCP + TLS 1 RTT">
      <PacketDot color="bbg-success" durationMs={1500} />
    </Connector>
  </Stage>

  <Stage id="stage-respond" theme="peach" step={3} title="Server responds">
    <Card variant="yellow" id="card-timings">
      <CountUp target={120} unit="ms" label="TTFB" />
    </Card>
    <Misconception id="mc-errors">
      Not all errors are 5xx. 4xx covers auth, not-found, rate limit.
    </Misconception>
  </Stage>
</Topic>
```

Note: the depth checkpoints reference component ids in the page, not separate JSON. This is the new equivalent of `meta.depth`.

## 8. Animation system

### 8.1 Scroll-driven (primary narrative)

`Stage` mounts a ScrollTrigger that scrubs a GSAP timeline as the panel travels through viewport. The timeline fades and slides each direct child of the Stage in sequence (`stagger: 0.12`). Reveal is a one-way effect: scrolling backwards does not reset.

Within a Stage, individual elements can opt into more specific scroll behaviour by wrapping in `<Reveal>` with optional `start` and `end` offsets relative to the parent Stage.

`<TypingText>` reveals characters in proportion to scroll progress; useful for code snippets.

`<CountUp>` ticks a number from 0 to target as scroll progresses through the Stage.

### 8.2 Idle ambient (always-on micro-motion)

Four ambient patterns, each implemented as a stand-alone GSAP loop:

1. **Packet dots along connectors.** `<PacketDot color durationMs delayMs />` injects a small circle and uses MotionPath to traverse the parent `<Connector>` SVG path. The animation loops indefinitely with a small `delayMs` between cycles. Multiple dots can stack on one connector for higher density.
2. **Icon pulse / breathing.** `<Pulse>` wraps any node; CSS keyframes scale 1 to 1.04 over 2.4 s, ease-in-out, infinite. For server status dots, an additional opacity blink at 1.2 s period.
3. **Connector draw-loop.** When a `<Connector>` has the `draw-loop` prop, `stroke-dashoffset` animates from `length` to 0 over 1.8 s and repeats, giving the impression of flow direction. Combines well with packet dots.
4. **Hover micro-interactions.** Tailwind classes plus a single `hover.ts` script attach event listeners: lift (translate -2px), shadow bump, tooltip with the node's `label` and any inline metadata.

All idle loops are gated by an IntersectionObserver. When the node leaves the viewport its `animation-play-state` is paused; when it re-enters, it resumes. This caps CPU usage to currently visible elements.

### 8.3 Accessibility and reduced motion

`gsap-setup.ts` reads `window.matchMedia("(prefers-reduced-motion: reduce)")`. If true:

- All GSAP timelines `kill()` themselves before starting.
- Scroll-driven reveals snap to their end state immediately.
- Ambient loops are removed from the DOM (packet dots, pulses, draw-loops not attached).
- Hover lifts still work; they are not motion-disturbing.

A small toggle in the top-right also lets the user opt out manually. The setting is stored in `localStorage`.

## 9. Component contracts

Each component has a strict prop interface so subagents can implement and test independently.

### Stage

```ts
type StageProps = {
  id: string;
  theme: "lilac" | "mint" | "peach" | "sky" | "rose";
  title: string;            // <= 24 chars
  step?: number;            // optional numbered badge top-left
  stepLabel?: string;       // <= 32 chars, shown next to the number
};
```

Renders the panel rectangle with dashed border and the pill title. Reveals children on scroll via ScrollTrigger.

### Connector

```ts
type ConnectorProps = {
  from: string;             // DOM selector or element id of source
  to: string;               // selector of target
  label?: string;           // small chip rendered at midpoint
  style?: "solid" | "dashed";
  color?: "neutral" | "success" | "warn" | "lilac" | "peach" | "sky";
  drawLoop?: boolean;       // ambient draw-loop effect
};
```

Implementation detail: at hydration time, Connector measures the bounding rects of `from` and `to`, draws an SVG path between their edges (orthogonal or straight depending on geometry), and renders the label chip and any `PacketDot` children inside the SVG. It re-measures on window resize.

This kills the image-5 and image-6 bug class structurally: there is no way to author a connector with literal coordinates, only by referencing an existing node id.

### PacketDot

```ts
type PacketDotProps = {
  color?: string;           // CSS color or token (default bbg-purple)
  durationMs?: number;      // 1500
  delayMs?: number;         // 0
  size?: number;            // 8
};
```

Must be nested inside a Connector. Inherits the Connector's path.

### Misconception

```ts
type MisconceptionProps = {
  id: string;
  title?: string;           // default "Heads-up"
  // text is the default slot, <= 200 chars
};
```

Red callout. Always non-text in the depth-coverage sense (counts as a visual element).

### Card

```ts
type CardProps = {
  id?: string;
  variant?: "default" | "yellow" | "highlight";
};
```

Container only. Text fit is the author's responsibility but the page lints text length at build time (see Section 10).

### CountUp

```ts
type CountUpProps = {
  target: number;
  unit?: string;
  label?: string;
  durationScrollFraction?: number;  // 0..1, default 0.6
};
```

Scroll-driven number animation. Inside a Stage, animates from 0 to target across the Stage's scroll range.

### Other components

`StepBadge`, `Pill`, `TitleBar`, `Node`, `Reveal`, `Pulse`, `TypingText`, `SourcesFooter` all have similarly minimal contracts. Each is its own file under `src/components/`.

## 10. Build-time editorial linting

A Vite plugin (or simple `astro:config:setup` hook) runs across every page on `astro build`:

- Inspects rendered HTML for `[data-text-class]` attributes (each text-class component emits one).
- Enforces character and line budgets per class (the same table from `style-guide.md`).
- Verifies `Topic.depth` checkpoints exist as id attributes in the page.
- Verifies at least one `CountUp`, `<data-numbers>` or `Card` numeric element per Stage.
- Verifies `prefers-reduced-motion` fallbacks are present on any element with a `data-animated` flag.

Failures fail the build. Warnings are logged.

The linter is the descendant of the SVG validator. It runs at `astro build` time, not at runtime, and its rules are TypeScript modules under `site/src/lint/`.

## 11. Per-topic authoring workflow

The `/infographic <topic>` command is rewritten to produce an Astro page rather than a layout.json. The pipeline:

1. Research (`WebSearch`, 3-5 queries).
2. Write `infographics/<slug>/spec.md` and `data.json` as authoring notes. They are not consumed by the build; they live alongside the Astro page as a paper trail of intent, sources, and depth checkpoint plan.
3. Write `site/src/pages/<slug>.astro` using the `Topic` layout and the component library above. Choose Stages, place Nodes, write Connectors, set CountUps for numbers, write a Misconception. This file is the only artifact the build consumes.
4. Run `cd site && bun run build`. Linter fails the build on text overflow, missing checkpoints, or missing reduced-motion fallbacks. The author fixes the page and re-runs.
5. Optionally generate a thumbnail with Playwright (`bun run thumbnail <slug>`) which loads the page, scrolls to a chosen "hero" point, and saves a 1600x900 PNG to `assets/exports/<slug>/thumb.png` for social previews.

Tier system (piece, chapter, topic) stays intact:

- A *piece* is one Astro page.
- A *chapter* is a directory `site/src/pages/<chapter>/<NN>-<piece>.astro` + an `index.astro` chapter overview page.
- A *topic* is `site/src/pages/<topic>/index.astro` (the MAP) + chapter subdirectories.

## 12. Pilot scope

The first concrete deliverable is one topic page: `web-request.astro` (the same topic the SVG MVP attempted). This pilot:

- Implements 3 stages (Resolve URL, DNS+TCP+TLS, Server responds).
- Uses all four ambient patterns (packet dots, icon pulse, draw-loop, hover).
- Has a Misconception, a NumbersCard with CountUp, and a sources footer.
- Passes the build-time linter.
- Renders at <2 s on a fast 4G connection (CSS+JS budget <100 kB gzipped, GSAP lazy-loaded only for `[data-animated]` pages).

A second pilot ("HTTPS handshake") is recommended once the first ships, but is post-pilot scope.

## 13. Migration plan from the SVG MVP

1. Move `scripts/build/` to `scripts/_archive/build/`. Update `.gitignore` if needed. The directory stays for reference.
2. The old plan and spec stay in `docs/superpowers/`. A note at the top of the SVG spec marks it superseded by this document.
3. `templates/icons/` files are reused by `src/components/icons/` (each icon becomes a tiny Astro component that inlines the SVG body and accepts a `class` prop).
4. `style-guide.md` adds a short "Astro components" section at the bottom describing the new component names. The visual rules themselves are unchanged.
5. `curriculum.md` is unchanged.
6. `CLAUDE.md` updates the primary workflow section to point at `site/` and the new `/infographic` command body.

## 14. What this kills from prior accumulated tech debt

- Custom SVG resolver and validator pipeline. CSS + DOM measurement handles layout.
- Hand-tuned font width tables. Browser renders real fonts.
- Misconception text wrap heuristics in the emitter. CSS does it.
- Connector break-for split logic. The Connector component draws the path around overlapping children using SVG masking.
- `infographic.svg` build artifacts (still produced as thumbnails via Playwright but no longer the canonical artifact).

## 15. Open questions

1. Should the linter live in TypeScript inside `site/`, or as a separate Bun script that reads `site/dist/`? Current preference: inside `site/` as Vite plugin so it sees source HTML before assets are hashed.
2. Do we want a Storybook-style component playground? Skip for v1.
3. Should `/infographic <topic>` auto-run `bun run build` and `bun run thumbnail`, or print the commands and let the user run them? Default to printing for v1.

## 16. Implementation plan

Out of scope for this document. The next step is writing-plans skill produces `docs/superpowers/plans/2026-05-12-astro-pivot.md` covering the pilot.
