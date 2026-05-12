# Astro Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution (preferred for this plan) or superpowers:subagent-driven-development.

**Goal:** Ship a Bun-driven Astro static site that renders one pilot infographic (`How a web request reaches the server`) using scroll-driven and idle ambient GSAP animations on top of the ByteByteGo visual language.

**Architecture:** Astro 5 static output. Tailwind CSS for ByteByteGo design tokens. GSAP 3 with ScrollTrigger and MotionPath for animations. TypeScript across components and client scripts. A build-time linter enforces text budgets and depth checkpoints, descending from the SVG validator concept.

**Tech Stack:** Astro 5, Tailwind CSS, GSAP 3 (+ ScrollTrigger, MotionPathPlugin), TypeScript, Bun.

**Spec:** `docs/superpowers/specs/2026-05-12-astro-pivot-design.md`

**Conventions for this plan:**

- No git commits unless the user explicitly asks.
- All paths from repo root `/Users/artemmac/dev/awesome-everything`.
- The Astro project lives in `site/`. Root remains `package.json`-free.
- The old SVG project at `scripts/build/` is archived in Task 1 of Phase H. It stays in repo for reference.
- TDD where unit-testable. Visual components rely on the build-passing + manual browser check as success criteria.
- Each component file is small and focused (one purpose). Karpathy: simplicity first; quality over LOC.

---

## Phase A: Foundation

### Task 1: Archive SVG MVP

**Files:**
- Move: `scripts/build/` -> `scripts/_archive/build/`
- Modify: `.gitignore` to keep ignore lines pointing at the new path

- [ ] Move directory:

```bash
mkdir -p scripts/_archive
git mv scripts/build scripts/_archive/build 2>/dev/null || mv scripts/build scripts/_archive/build
```

- [ ] Update `.gitignore` lines that referenced `scripts/build/`:

```
scripts/_archive/build/node_modules/
scripts/_archive/build/bun.lockb
```

- [ ] Verify the archived bun test still works:

```bash
cd scripts/_archive/build && bun test 2>&1 | tail -3
```

Expected: 59 pass / 0 fail (or close — broken paths are fine, the directory is reference-only).

**Checkpoint:** Old build tool out of the active path. Reference preserved.

---

### Task 2: Scaffold Astro project

**Files:**
- Create: `site/package.json`
- Create: `site/astro.config.mjs`
- Create: `site/tsconfig.json`
- Create: `site/src/pages/index.astro` (minimal placeholder)

- [ ] Create `site/package.json`:

```json
{
  "name": "@awesome-everything/site",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/tailwind": "^5.1.0",
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "gsap": "^3.12.5"
  }
}
```

- [ ] Create `site/astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "static",
  integrations: [tailwind({ applyBaseStyles: false })],
  vite: {
    ssr: { noExternal: ["gsap"] },
  },
});
```

- [ ] Create `site/tsconfig.json` extending Astro's strict config:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "~/*": ["*"]
    }
  }
}
```

- [ ] Create placeholder `site/src/pages/index.astro`:

```astro
---
const topics = [
  { slug: "web-request", title: "How a web request reaches the server" },
];
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>awesome-everything</title>
  </head>
  <body>
    <h1>Topics</h1>
    <ul>
      {topics.map((t) => <li><a href={`/${t.slug}/`}>{t.title}</a></li>)}
    </ul>
  </body>
</html>
```

- [ ] Install and smoke-test:

```bash
cd site && bun install && bun run build && ls -la dist/
```

Expected: `dist/index.html` exists.

**Checkpoint:** Astro builds.

---

### Task 3: Tailwind config with ByteByteGo tokens

**Files:**
- Create: `site/tailwind.config.ts`
- Create: `site/src/styles/global.css`
- Modify: `site/src/pages/index.astro` to import the stylesheet and confirm tokens work

- [ ] `site/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{astro,html,ts,tsx,js,jsx,md,mdx}"],
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
          paper: "#FAFAFA",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Menlo", "monospace"],
      },
      keyframes: {
        breath: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.04)" },
        },
        blink: {
          "0%, 80%, 100%": { opacity: "1" },
          "85%":           { opacity: "0.4" },
        },
        dashFlow: {
          to: { strokeDashoffset: "-20" },
        },
      },
      animation: {
        breath: "breath 2.4s ease-in-out infinite",
        blink:  "blink 1.6s ease-in-out infinite",
        "dash-flow": "dashFlow 1.2s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] `site/src/styles/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; color: theme(colors.bbg.ink); }
  body { background: #FFFFFF; }
  :root { color-scheme: light; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
  }
}
```

- [ ] Modify `site/src/pages/index.astro` head to import the stylesheet and add a colored span to confirm tokens compile:

```astro
---
import "../styles/global.css";
const topics = [
  { slug: "web-request", title: "How a web request reaches the server" },
];
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>awesome-everything</title>
  </head>
  <body class="min-h-screen bg-white">
    <main class="max-w-3xl mx-auto p-12">
      <h1 class="text-4xl font-extrabold">Topics</h1>
      <ul class="mt-6 space-y-2">
        {topics.map((t) => (
          <li class="bg-panel-lilac rounded-lg p-4 border-2 border-dashed border-panel-lilac-ink">
            <a class="font-semibold text-panel-lilac-ink" href={`/${t.slug}/`}>{t.title}</a>
          </li>
        ))}
      </ul>
    </main>
  </body>
</html>
```

- [ ] Smoke test: `bun run dev` (kill after build is stable), or `bun run build && open dist/index.html`. Confirm the lilac card renders.

**Checkpoint:** Design tokens load. Inter renders. Reduced-motion kill switch in CSS works.

---

### Task 4: GSAP setup and reduced-motion guard

**Files:**
- Create: `site/src/scripts/gsap-setup.ts`
- Create: `site/src/scripts/motion-flag.ts`

- [ ] `site/src/scripts/motion-flag.ts` (read once on import, also exposes a manual override):

```ts
export const MOTION_KEY = "awesome.motion";

export function motionEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const override = localStorage.getItem(MOTION_KEY);
  if (override === "off") return false;
  if (override === "on")  return true;
  return !reduce;
}

export function toggleMotion(): boolean {
  const next = motionEnabled() ? "off" : "on";
  localStorage.setItem(MOTION_KEY, next);
  return next === "on";
}
```

- [ ] `site/src/scripts/gsap-setup.ts`:

```ts
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { motionEnabled } from "./motion-flag";

let registered = false;

export function setupGsap(): boolean {
  if (registered) return motionEnabled();
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  registered = true;
  if (!motionEnabled()) {
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
  return motionEnabled();
}
```

- [ ] No tests yet — used by later tasks.

**Checkpoint:** GSAP entry point ready.

---

## Phase B: Brand and layout components

### Task 5: TitleBar and SourcesFooter

**Files:**
- Create: `site/src/components/brand/TitleBar.astro`
- Create: `site/src/components/brand/SourcesFooter.astro`

- [ ] `TitleBar.astro`:

```astro
---
type Props = { headline: string; wordmark?: boolean };
const { headline, wordmark = true } = Astro.props;
---
<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
  <div class="max-w-[1600px] mx-auto px-14 py-6 flex items-center gap-6">
    <span class="block w-1.5 h-12 bg-bbg-teal rounded-sm"></span>
    <h1 class="text-3xl md:text-4xl font-extrabold text-bbg-ink flex-1">{headline}</h1>
    {wordmark && (
      <div class="flex items-center gap-2 shrink-0">
        <span class="w-8 h-8 rounded-lg bg-bbg-teal grid place-items-center text-white font-extrabold">B</span>
        <span class="font-extrabold text-bbg-purple text-lg">ByteByteGo</span>
      </div>
    )}
  </div>
</header>
```

- [ ] `SourcesFooter.astro`:

```astro
---
type Props = { sources: string[] };
const { sources } = Astro.props;
---
<footer class="max-w-[1600px] mx-auto px-14 py-12 text-bbg-muted text-sm">
  <p class="font-semibold text-bbg-ink mb-2">Sources</p>
  <ul class="space-y-1">
    {sources.map((s) => <li><a class="underline hover:text-bbg-ink" href={s} target="_blank" rel="noreferrer">{s}</a></li>)}
  </ul>
  <p class="mt-6 text-xs">Trademarks belong to their respective owners. Editorial reference only.</p>
</footer>
```

**Checkpoint:** Brand chrome ready.

---

### Task 6: Pill and StepBadge

**Files:**
- Create: `site/src/components/layout/Pill.astro`
- Create: `site/src/components/layout/StepBadge.astro`

- [ ] `Pill.astro` (theme-aware pill title):

```astro
---
type Theme = "lilac" | "mint" | "peach" | "sky" | "rose";
type Props = { theme: Theme; children?: any };
const { theme } = Astro.props;
const cls = {
  lilac: "bg-panel-lilac-ink",
  mint:  "bg-panel-mint-ink",
  peach: "bg-panel-peach-ink",
  sky:   "bg-panel-sky-ink",
  rose:  "bg-panel-rose-ink",
}[theme];
---
<span class={`inline-flex items-center justify-center px-6 h-9 rounded-full text-white font-bold text-base ${cls}`}>
  <slot />
</span>
```

- [ ] `StepBadge.astro`:

```astro
---
type Props = { n: number; label?: string };
const { n, label } = Astro.props;
---
<div class="inline-flex items-center gap-3">
  <span class="w-11 h-11 rounded-full bg-bbg-success text-white font-extrabold grid place-items-center shadow-sm">{n}</span>
  {label && (
    <span class="font-bold text-bbg-ink text-lg">
      <span class="text-bbg-success mr-2">{n}</span>{label}
    </span>
  )}
</div>
```

**Checkpoint:** Pill + step badge available.

---

### Task 7: Stage (panel with scroll-triggered reveal)

**Files:**
- Create: `site/src/components/layout/Stage.astro`

- [ ] `Stage.astro`:

```astro
---
import Pill from "./Pill.astro";
import StepBadge from "./StepBadge.astro";

type Theme = "lilac" | "mint" | "peach" | "sky" | "rose";
type Props = {
  id: string;
  theme: Theme;
  title: string;       // pill text, <= 24 chars enforced by linter
  step?: number;
  stepLabel?: string;
};
const { id, theme, title, step, stepLabel } = Astro.props;
const bg     = { lilac:"bg-panel-lilac",  mint:"bg-panel-mint",  peach:"bg-panel-peach",  sky:"bg-panel-sky",  rose:"bg-panel-rose"  }[theme];
const border = { lilac:"border-panel-lilac-ink", mint:"border-panel-mint-ink", peach:"border-panel-peach-ink", sky:"border-panel-sky-ink", rose:"border-panel-rose-ink" }[theme];
---
<section
  id={id}
  data-stage-theme={theme}
  data-animated
  class={`relative my-16 mx-auto max-w-[1440px] rounded-3xl border-2 border-dashed ${bg} ${border} px-12 py-12`}
>
  <div class="absolute -top-5 left-1/2 -translate-x-1/2">
    <Pill theme={theme}>{title}</Pill>
  </div>
  {step !== undefined && (
    <div class="mb-8">
      <StepBadge n={step} label={stepLabel} />
    </div>
  )}
  <div data-stage-content class="space-y-8">
    <slot />
  </div>
</section>

<script>
  import { setupGsap } from "~/scripts/gsap-setup";
  import { gsap } from "gsap";
  import { ScrollTrigger } from "gsap/ScrollTrigger";

  const motion = setupGsap();
  if (motion) {
    document.querySelectorAll<HTMLElement>("[data-stage-content]").forEach((root) => {
      const children = Array.from(root.children);
      gsap.set(children, { opacity: 0, y: 24 });
      gsap.to(children, {
        opacity: 1, y: 0,
        duration: 0.6, ease: "power2.out", stagger: 0.12,
        scrollTrigger: { trigger: root.parentElement, start: "top 70%", once: true },
      });
    });
  } else {
    document.querySelectorAll<HTMLElement>("[data-stage-content]").forEach((root) => {
      Array.from(root.children).forEach((c) => (c as HTMLElement).style.opacity = "1");
    });
  }
</script>
```

**Checkpoint:** Panels reveal on scroll. Reduced-motion path falls through without GSAP.

---

### Task 8: Card, Misconception, NumbersCard

**Files:**
- Create: `site/src/components/layout/Card.astro`
- Create: `site/src/components/layout/Misconception.astro`
- Create: `site/src/components/layout/NumbersCard.astro`

- [ ] `Card.astro`:

```astro
---
type Props = { id?: string; variant?: "default" | "yellow" | "highlight" };
const { id, variant = "default" } = Astro.props;
const cls = {
  default:   "bg-white border-gray-300",
  yellow:    "bg-yellow-50 border-yellow-700",
  highlight: "bg-white border-bbg-success",
}[variant];
---
<div id={id} class={`rounded-xl border-2 ${cls} p-5 max-w-[640px]`} data-text-class="body">
  <slot />
</div>
```

- [ ] `Misconception.astro`:

```astro
---
type Props = { id: string; title?: string };
const { id, title = "Heads-up" } = Astro.props;
---
<aside id={id} data-text-class="misconception" class="rounded-xl bg-rose-50 border-2 border-bbg-warn p-5 max-w-[720px]">
  <div class="font-bold text-rose-900 mb-2">{title}</div>
  <div class="text-bbg-ink leading-relaxed"><slot /></div>
</aside>
```

- [ ] `NumbersCard.astro` (stacks numeric facts):

```astro
---
type Stat = { label: string; value: string };
type Props = { id?: string; stats: Stat[]; title?: string };
const { id, stats, title = "Typical timings" } = Astro.props;
---
<div id={id} class="rounded-xl bg-yellow-50 border-2 border-yellow-700 p-5 max-w-[720px]" data-text-class="annot">
  <div class="font-bold text-bbg-ink mb-3">{title}</div>
  <dl class="grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-sm text-bbg-annot">
    {stats.map((s) => (
      <div class="contents">
        <dt>{s.label}</dt>
        <dd class="text-right">{s.value}</dd>
      </div>
    ))}
  </dl>
</div>
```

**Checkpoint:** Static content containers ready.

---

## Phase C: Diagram primitives

### Task 9: Node (icon + label)

**Files:**
- Create: `site/src/components/diagram/Node.astro`

- [ ] `Node.astro`:

```astro
---
import Pulse from "./Pulse.astro";

type Props = {
  id: string;
  icon: string;        // component name lowercased: "server", "monitor", ...
  label: string;
  pulse?: boolean;
};
const { id, icon, label, pulse = true } = Astro.props;
const iconMap = {
  server:   () => import("../icons/Server.astro"),
  database: () => import("../icons/Database.astro"),
  monitor:  () => import("../icons/Monitor.astro"),
  globe:    () => import("../icons/Globe.astro"),
  cloud:    () => import("../icons/Cloud.astro"),
  resolver: () => import("../icons/Resolver.astro"),
  lock:     () => import("../icons/Lock.astro"),
  key:      () => import("../icons/Key.astro"),
  doc:      () => import("../icons/Doc.astro"),
};
const Icon = (await iconMap[icon as keyof typeof iconMap]?.())?.default;
if (!Icon) throw new Error(`Unknown icon: ${icon}`);
---
<div id={id} class="inline-flex flex-col items-center gap-2 group">
  <div class="hover:-translate-y-0.5 hover:drop-shadow-md transition" data-node-icon>
    {pulse ? <Pulse><Icon /></Pulse> : <Icon />}
  </div>
  <span class="text-sm font-semibold text-bbg-ink">{label}</span>
</div>
```

**Note:** Node uses dynamic import. Adjust the import map as new icons are added.

**Checkpoint:** Nodes compose icon + label with optional pulse.

---

### Task 10: Pulse, Reveal

**Files:**
- Create: `site/src/components/diagram/Pulse.astro`
- Create: `site/src/components/diagram/Reveal.astro`

- [ ] `Pulse.astro`:

```astro
---
type Props = { speed?: "slow" | "normal" | "fast" };
const { speed = "normal" } = Astro.props;
const cls = { slow: "animate-[breath_3.6s_ease-in-out_infinite]", normal: "animate-breath", fast: "animate-[breath_1.6s_ease-in-out_infinite]" }[speed];
---
<span class={`inline-block ${cls}`} data-animated><slot /></span>
```

- [ ] `Reveal.astro`:

```astro
---
type Props = { y?: number; delay?: number };
const { y = 24, delay = 0 } = Astro.props;
---
<div data-reveal data-reveal-y={String(y)} data-reveal-delay={String(delay)} data-animated><slot /></div>

<script>
  import { setupGsap } from "~/scripts/gsap-setup";
  import { gsap } from "gsap";
  const motion = setupGsap();
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    const y = Number(el.dataset.revealY ?? "24");
    const delay = Number(el.dataset.revealDelay ?? "0");
    if (!motion) { el.style.opacity = "1"; return; }
    gsap.from(el, {
      opacity: 0, y,
      duration: 0.6, ease: "power2.out", delay,
      scrollTrigger: { trigger: el, start: "top 80%", once: true },
    });
  });
</script>
```

**Checkpoint:** Pulse + Reveal ready.

---

### Task 11: Connector (measures DOM, draws SVG path between two element ids)

**Files:**
- Create: `site/src/components/diagram/Connector.astro`

This is the centerpiece: image-5 and image-6 bug class becomes impossible because the path is computed from real element rects, not literal coordinates.

- [ ] `Connector.astro`:

```astro
---
type Color = "neutral" | "success" | "warn" | "lilac" | "peach" | "sky";
type Props = {
  from: string;          // CSS selector or element id (with #)
  to: string;
  label?: string;        // <= 40 chars
  style?: "solid" | "dashed";
  color?: Color;
  drawLoop?: boolean;
};
const { from, to, label, style = "dashed", color = "neutral", drawLoop = false } = Astro.props;
const stroke = {
  neutral: "#374151", success: "#16A34A", warn: "#DC2626",
  lilac:   "#7C3AED", peach:   "#D97706", sky:     "#0284C7",
}[color];
const dash = style === "dashed" ? "4 6" : "0";
const id = `conn-${Math.random().toString(36).slice(2, 9)}`;
---
<svg
  data-connector
  data-from={from}
  data-to={to}
  data-stroke={stroke}
  data-dash={dash}
  data-draw-loop={drawLoop ? "1" : "0"}
  class="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
  aria-hidden="true"
>
  <defs>
    <marker id={`${id}-ah`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke}/>
    </marker>
  </defs>
  <path data-path stroke={stroke} stroke-width="2" stroke-dasharray={dash} fill="none" marker-end={`url(#${id}-ah)`} />
  {label && (
    <g data-label>
      <rect data-label-bg fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1" rx="6"/>
      <text data-label-text fill="#1F2937" font-family="Inter" font-weight="600" font-size="12" text-anchor="middle"></text>
    </g>
  )}
  <slot />
</svg>

<script>
  import { setupGsap } from "~/scripts/gsap-setup";
  const motion = setupGsap();

  function resolve(sel: string): HTMLElement | null {
    if (sel.startsWith("#")) return document.getElementById(sel.slice(1));
    return document.querySelector<HTMLElement>(sel);
  }

  function placeConnectors() {
    document.querySelectorAll<SVGSVGElement>("[data-connector]").forEach((svg) => {
      const fromEl = resolve(svg.dataset.from || "");
      const toEl   = resolve(svg.dataset.to   || "");
      const parent = svg.parentElement;
      if (!fromEl || !toEl || !parent) return;
      const parentBox = parent.getBoundingClientRect();
      const fb = fromEl.getBoundingClientRect();
      const tb = toEl.getBoundingClientRect();
      // anchor on the right edge of source, left edge of target
      const x1 = (fb.right) - parentBox.left;
      const y1 = (fb.top + fb.height / 2) - parentBox.top;
      const x2 = (tb.left) - parentBox.left;
      const y2 = (tb.top + tb.height / 2) - parentBox.top;
      const path = svg.querySelector<SVGPathElement>("[data-path]");
      const labelG = svg.querySelector<SVGGElement>("[data-label]");
      if (!path) return;
      path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);

      if (labelG) {
        const text = labelG.querySelector<SVGTextElement>("[data-label-text]");
        const rect = labelG.querySelector<SVGRectElement>("[data-label-bg]");
        if (text && rect) {
          const labelStr = svg.getAttribute("data-label") ?? text.textContent ?? "";
          // (The label is rendered in DOM via slot; the actual label string is read from the data attribute by Astro template at SSR.)
        }
      }

      if (svg.dataset.drawLoop === "1" && motion) {
        path.style.animation = "dash-flow 1.2s linear infinite";
      }
    });
  }

  // Re-measure after layout (fonts may shift things).
  if (document.readyState === "complete") placeConnectors();
  else window.addEventListener("load", placeConnectors);
  window.addEventListener("resize", placeConnectors);
</script>
```

**Note 1:** The label rendering uses the SSR-emitted text under `data-label-text`. To support that, the Astro template emits the label string inside the `<text>` element directly:

Update the template — replace `<text data-label-text ...></text>` with:

```astro
<text data-label-text x="0" y="0" fill="#1F2937" font-family="Inter" font-weight="600" font-size="12" text-anchor="middle">{label}</text>
```

After path placement, the script positions the label at the path midpoint:

```js
const midX = (x1 + x2) / 2;
const midY = (y1 + y2) / 2;
text.setAttribute("x", String(midX));
text.setAttribute("y", String(midY + 4));
const labelWidth = (text.getComputedTextLength?.() ?? labelStr.length * 7) + 16;
rect.setAttribute("x", String(midX - labelWidth / 2));
rect.setAttribute("y", String(midY - 8));
rect.setAttribute("width", String(labelWidth));
rect.setAttribute("height", "20");
```

**Note 2:** The parent of the Connector must be `relative position`. The Stage component already provides `relative`. If a Connector lives outside a Stage, the author wraps it in `<div class="relative">`.

**Checkpoint:** Connectors render correctly between two real DOM nodes with a label chip.

---

### Task 12: PacketDot (MotionPath ambient packet)

**Files:**
- Create: `site/src/components/diagram/PacketDot.astro`

- [ ] `PacketDot.astro`:

```astro
---
type Props = { color?: string; durationMs?: number; delayMs?: number; size?: number };
const { color = "#7C3AED", durationMs = 1800, delayMs = 0, size = 8 } = Astro.props;
---
<circle
  data-packet
  data-duration={String(durationMs)}
  data-delay={String(delayMs)}
  cx="0" cy="0" r={size / 2} fill={color}
/>

<script>
  import { setupGsap } from "~/scripts/gsap-setup";
  import { gsap } from "gsap";
  import { MotionPathPlugin } from "gsap/MotionPathPlugin";

  const motion = setupGsap();
  if (motion) {
    document.querySelectorAll<SVGCircleElement>("[data-packet]").forEach((dot) => {
      const svg = dot.ownerSVGElement;
      const path = svg?.querySelector<SVGPathElement>("[data-path]");
      if (!path) return;
      const duration = Number(dot.dataset.duration ?? "1800") / 1000;
      const delay = Number(dot.dataset.delay ?? "0") / 1000;
      gsap.set(dot, { opacity: 1 });
      gsap.to(dot, {
        duration, ease: "none", repeat: -1, repeatDelay: 0.4, delay,
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: false },
      });
    });
  }
</script>
```

**Checkpoint:** Packet dots loop along connector paths.

---

### Task 13: CountUp, TypingText

**Files:**
- Create: `site/src/components/diagram/CountUp.astro`
- Create: `site/src/components/diagram/TypingText.astro`

- [ ] `CountUp.astro`:

```astro
---
type Props = { target: number; unit?: string; label?: string };
const { target, unit = "", label } = Astro.props;
---
<div class="font-mono text-bbg-ink">
  {label && <div class="text-xs text-bbg-muted mb-1">{label}</div>}
  <div class="text-3xl font-extrabold">
    <span data-countup data-countup-target={String(target)}>0</span>{unit && <span class="text-lg ml-1 font-semibold">{unit}</span>}
  </div>
</div>

<script>
  import { setupGsap } from "~/scripts/gsap-setup";
  import { gsap } from "gsap";

  const motion = setupGsap();
  document.querySelectorAll<HTMLElement>("[data-countup]").forEach((el) => {
    const target = Number(el.dataset.countupTarget ?? "0");
    if (!motion) { el.textContent = String(target); return; }
    const state = { v: 0 };
    gsap.to(state, {
      v: target, duration: 1.2, ease: "power1.out",
      onUpdate: () => { el.textContent = String(Math.round(state.v)); },
      scrollTrigger: { trigger: el, start: "top 80%", once: true },
    });
  });
</script>
```

- [ ] `TypingText.astro`:

```astro
---
type Props = { text: string; speedMs?: number };
const { text, speedMs = 24 } = Astro.props;
---
<span data-typing data-typing-text={text} data-typing-speed={String(speedMs)} class="font-mono"></span>

<script>
  import { setupGsap } from "~/scripts/gsap-setup";
  import { gsap } from "gsap";
  const motion = setupGsap();
  document.querySelectorAll<HTMLElement>("[data-typing]").forEach((el) => {
    const text = el.dataset.typingText ?? "";
    if (!motion) { el.textContent = text; return; }
    let i = 0;
    gsap.to({}, {
      duration: (text.length * Number(el.dataset.typingSpeed ?? "24")) / 1000,
      ease: "none",
      onUpdate: function () {
        const next = Math.floor(this.progress() * text.length);
        if (next !== i) { i = next; el.textContent = text.slice(0, i); }
      },
      scrollTrigger: { trigger: el, start: "top 80%", once: true },
    });
  });
</script>
```

**Checkpoint:** Numeric and text reveal animations.

---

## Phase D: Icons

### Task 14: Icon component wrappers

**Files:**
- Create: `site/src/components/icons/Server.astro`
- Create: `site/src/components/icons/Database.astro`
- Create: `site/src/components/icons/Monitor.astro`
- Create: `site/src/components/icons/Globe.astro`
- Create: `site/src/components/icons/Cloud.astro`
- Create: `site/src/components/icons/Resolver.astro`
- Create: `site/src/components/icons/Lock.astro`
- Create: `site/src/components/icons/Key.astro`
- Create: `site/src/components/icons/Doc.astro`

- [ ] Each icon is a small `.astro` wrapper around inline SVG copied from `scripts/_archive/build/templates/svg-skeleton.svg` defs or `templates/icons/generic/server.svg`. Pattern (Server.astro):

```astro
---
type Props = { size?: number; class?: string };
const { size = 64, class: cls = "" } = Astro.props;
---
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} class={cls} aria-hidden="true">
  <rect x="6" y="10" width="52" height="14" rx="3" fill="#A7F3D0" stroke="#047857" stroke-width="1.5"/>
  <rect x="6" y="26" width="52" height="14" rx="3" fill="#A7F3D0" stroke="#047857" stroke-width="1.5"/>
  <rect x="6" y="42" width="52" height="14" rx="3" fill="#A7F3D0" stroke="#047857" stroke-width="1.5"/>
  <circle cx="14" cy="17" r="2" fill="#10B981"/>
  <circle cx="22" cy="17" r="2" fill="#FFFFFF" stroke="#047857" stroke-width="1"/>
  <circle cx="14" cy="33" r="2" fill="#10B981"/>
  <circle cx="22" cy="33" r="2" fill="#FFFFFF" stroke="#047857" stroke-width="1"/>
  <circle cx="14" cy="49" r="2" fill="#10B981"/>
  <circle cx="22" cy="49" r="2" fill="#FFFFFF" stroke="#047857" stroke-width="1"/>
</svg>
```

For `Database`, `Monitor`, `Globe`, `Cloud`, `Resolver`, `Lock`, `Key`, `Doc`: copy the corresponding `<symbol>` SVG body from the archived skeleton or author small chunky SVGs in the same style. Each must accept `size` and `class` props.

**Checkpoint:** 9 icons available.

---

## Phase E: Topic layout and pilot

### Task 15: Topic layout

**Files:**
- Create: `site/src/layouts/Topic.astro`

- [ ] `Topic.astro`:

```astro
---
import "../styles/global.css";
import TitleBar from "../components/brand/TitleBar.astro";
import SourcesFooter from "../components/brand/SourcesFooter.astro";

type Depth = { mechanism: string; tradeoff: string; failure_mode: string; numbers: string };
type Props = { title: string; pillars: string[]; depth: Depth; sources: string[] };
const { title, pillars, depth, sources } = Astro.props;
---
<html lang="en" data-depth={JSON.stringify(depth)} data-pillars={pillars.join(",")}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>{title}</title>
  </head>
  <body class="min-h-screen bg-white text-bbg-ink">
    <TitleBar headline={title} wordmark />
    <main class="max-w-[1600px] mx-auto px-6 md:px-12 pt-8 pb-24">
      <slot />
    </main>
    <SourcesFooter sources={sources} />
  </body>
</html>
```

**Checkpoint:** Topic layout ties everything together.

---

### Task 16: Pilot page — web-request.astro

**Files:**
- Create: `site/src/pages/web-request.astro`
- Reuse: every component built so far

- [ ] `web-request.astro`:

```astro
---
import Topic from "../layouts/Topic.astro";
import Stage from "../components/layout/Stage.astro";
import Card from "../components/layout/Card.astro";
import Misconception from "../components/layout/Misconception.astro";
import NumbersCard from "../components/layout/NumbersCard.astro";
import Node from "../components/diagram/Node.astro";
import Connector from "../components/diagram/Connector.astro";
import PacketDot from "../components/diagram/PacketDot.astro";
import CountUp from "../components/diagram/CountUp.astro";
import TypingText from "../components/diagram/TypingText.astro";
---
<Topic
  title="How a web request reaches the server"
  pillars={["networking"]}
  depth={{ mechanism: "c-tls", tradeoff: "card-cache", failure_mode: "mc-errors", numbers: "card-timings" }}
  sources={[
    "https://datatracker.ietf.org/doc/html/rfc9110",
    "https://datatracker.ietf.org/doc/html/rfc8446",
    "https://web.dev/articles/vitals",
  ]}
>
  <Stage id="s-resolve" theme="lilac" title="Resolve URL" step={1} stepLabel="Browser parses URL">
    <Card variant="yellow">
      <TypingText text="GET https://google.com HTTP/2" />
    </Card>
    <div class="relative flex items-center justify-between mt-8">
      <Node id="n-browser" icon="monitor" label="Browser" />
      <Connector from="#n-browser" to="#n-resolver" label="lookup" color="lilac" drawLoop>
        <PacketDot color="#7C3AED" durationMs={1800} />
      </Connector>
      <Node id="n-resolver" icon="resolver" label="OS resolver" />
    </div>
  </Stage>

  <Stage id="s-connect" theme="mint" title="DNS + TCP + TLS" step={2} stepLabel="Resolve and connect">
    <Card id="card-cache">
      <div class="flex items-center justify-between">
        <span class="font-mono text-sm">cached IP</span>
        <span class="font-mono text-sm text-bbg-success">0 ms</span>
      </div>
    </Card>
    <div class="relative flex items-center justify-between mt-8">
      <Node id="n-client" icon="monitor" label="Client" />
      <Connector id="c-tls" from="#n-client" to="#n-server" label="TCP + TLS 1 RTT" color="success" style="solid" drawLoop>
        <PacketDot color="#16A34A" durationMs={1500} />
        <PacketDot color="#16A34A" durationMs={1500} delayMs={500} />
      </Connector>
      <Node id="n-server" icon="server" label="Server" />
    </div>
  </Stage>

  <Stage id="s-respond" theme="peach" title="Server responds" step={3} stepLabel="200 OK and body">
    <NumbersCard
      id="card-timings"
      title="Typical timings"
      stats={[
        { label: "DNS",     value: "10-150 ms" },
        { label: "TCP",     value: "1 RTT (~25 ms)" },
        { label: "TLS 1.3", value: "1 RTT (0-RTT resume)" },
        { label: "TTFB",    value: "50-200 ms" },
        { label: "FCP",     value: "100-400 ms" },
        { label: "LCP",     value: "<= 2.5 s (good)" },
      ]}
    />
    <div class="flex items-center gap-6 mt-8">
      <CountUp target={120} unit="ms" label="TTFB this run" />
      <CountUp target={340} unit="ms" label="FCP this run" />
    </div>
    <Misconception id="mc-errors">
      Not all errors are 5xx. 4xx covers auth (401), forbidden (403), not-found (404), and rate limited (429). Treat them as a separate triage class.
    </Misconception>
  </Stage>
</Topic>
```

- [ ] Build and inspect:

```bash
cd site && bun run build && open dist/web-request/index.html
```

Expected: 3 panels render with the pilot content. Scroll-driven reveals fire. Packet dots loop along connectors. Connector labels visible.

**Checkpoint:** Pilot page works end-to-end. This is the MVP gate.

---

## Phase F: Build-time linter

### Task 17: Linter Vite plugin (v1)

**Files:**
- Create: `site/src/lint/index.ts` (or `site/integrations/lint.ts`)
- Modify: `site/astro.config.mjs` to register the integration

- [ ] Implement a minimal Astro integration that hooks into `astro:build:done` and scans each generated HTML file for:
  - `[data-text-class]` elements with class budgets violated.
  - Missing depth checkpoint ids on the page (parse `<html data-depth>` and verify each id exists somewhere).
  - Missing reduced-motion fallback on `[data-animated]` elements (it suffices to verify the global stylesheet contains the media query — a static check).
  
  Failing checks throw and fail the build. Warnings log.

- [ ] Register it in `astro.config.mjs`:

```js
import { lintBbg } from "./src/lint";
export default defineConfig({
  // ...
  integrations: [tailwind({ applyBaseStyles: false }), lintBbg()],
});
```

- [ ] Run `bun run build` on the pilot. Expected: pass. Intentionally violate a budget (e.g. overlong misconception text) and confirm the build fails with a helpful message.

**Checkpoint:** Editorial constraints enforced at build time.

---

## Phase G: Documentation and migration

### Task 18: Update CLAUDE.md, style-guide.md, /infographic command

**Files:**
- Modify: `CLAUDE.md`
- Modify: `style-guide.md`
- Modify: `.claude/commands/infographic.md`

- [ ] `CLAUDE.md` — replace the primary-command and pipeline sections with a description that points at `site/` and the new Astro workflow. Note that `scripts/_archive/build/` is reference only.

- [ ] `style-guide.md` — append a section "Astro component vocabulary" listing each component name and its purpose. Visual rules stay unchanged.

- [ ] `.claude/commands/infographic.md` — rewrite the per-piece body. The new pipeline:

```
4a. WebSearch research (3-5 queries).
4b. Write infographics/<slug>/spec.md and data.json (authoring notes, not consumed by build).
4c. Write site/src/pages/<slug>.astro extending Topic, composing Stages and components.
4d. Run: cd site && bun run build. Linter fails on text-budget, missing checkpoints, etc.
4e. (Optional) Generate thumbnail: bun run thumbnail <slug>.
4f. Open dist/<slug>/index.html in the browser and verify visually.
```

Add a hard rule: "Claude must never edit a built artifact under `site/dist/`. The only source files are under `site/src/`."

**Checkpoint:** Documentation aligned with the new pipeline.

---

## Self-Review

**1. Spec coverage:**

- Spec §4 (stack)         → Task 2, 3, 4.
- Spec §5 (file structure) → Tasks 2 + each component task.
- Spec §6 (Tailwind tokens) → Task 3.
- Spec §7 (page architecture) → Tasks 5–8, 15, 16.
- Spec §8 (animation system) → Tasks 4, 7, 10, 11, 12.
- Spec §9 (component contracts) → Tasks 5–14.
- Spec §10 (build-time linter) → Task 17.
- Spec §11 (workflow) → Task 18.
- Spec §12 (pilot) → Task 16.
- Spec §13 (migration) → Tasks 1, 18.

No gaps.

**2. Placeholder scan:** No "TBD", "TODO", "implement later". The icon task (14) describes a pattern and applies it to nine files; this is acceptable because the SVG bodies are sourced from the archived `templates/svg-skeleton.svg` defs.

**3. Type consistency:** Component props (`StageProps`, `ConnectorProps`, `MisconceptionProps`, `CountUpProps`, etc.) match across spec §9 and the plan code blocks. `Theme` union is identical in `Pill`, `Stage`. Color enum on `Connector` matches the spec.

**4. Ambiguity:** Connector script in Task 11 was edited inline to position the label at the path midpoint. Task 11 ends with a "Note 1" patch — the engineer must apply it (the patch is shown verbatim).

---

## Execution

Inline execution via the executing-plans skill. Each task tracked via TaskWrite; user reviews after each Phase or at the user's request.
