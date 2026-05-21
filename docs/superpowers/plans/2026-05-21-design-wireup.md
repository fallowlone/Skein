# Open-Atlas Design Wire-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the OLD home + track-index + lesson-layout designs with the cosmic / ascent / editorial design already prototyped in the `*-preview.astro` shells; verify with `bun run build` lint 0/0 after every commit.

**Architecture:** New `Atlas.astro` layout for dark-cosmic routes (home + topic ascent). Reusable atlas primitives under `site/src/components/atlas/`. `Topic.astro` and `Lesson.astro` stay for the light-zone reading shell, with `Lesson.astro` extended with editorial chrome (topbar, altitude gauge, right rail, next-lesson card) and scoped body typography that ports the preview's CSS.

**Tech Stack:** Astro 5 content collections (`tracks`, `units`, `lessons`), Preact (existing islands only — no new ones added), Tailwind for legacy utility classes only, `is:inline` scripts for scroll / localStorage progressive enhancement, Vitest for pure-logic unit tests.

**Branch:** `design-wireup` (off `main`, spec committed at `f796b13`).

**Spec:** `docs/superpowers/specs/2026-05-21-design-wireup-design.md` — read it before starting any task.

---

## Conventions (apply to every task)

- All imports use the `~/` alias. Never `..` relative segments.
- Stage explicit paths only. Never `git add -A` / `git add .`.
- Never `--no-verify`, never `--no-gpg-sign`. If a pre-commit hook fails, investigate the root cause and create a NEW commit; do NOT amend.
- Build gate: `cd site && bun run build` must finish with `dist/lint-report.json` showing `errors: 0, warnings: 0` (the build command exits non-zero on lint errors; on warnings it still exits 0 — read the report).
- Lesson page hydration cap is 5. None of the new components add an island.
- No MDX content edits anywhere under `site/src/content/lessons/`.
- No edits under `site/src/pages/[lang]/glossary/` or `site/src/components/lesson/ConnectedLessons.astro`.
- Co-author commits with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` (matches the existing repo convention).
- Commit messages use the Conventional Commits style already in the repo (`feat(open-atlas):`, `chore(open-atlas):`, `docs(open-atlas):`).

---

## Task 1: T1 — cosmic home on `[lang]/` route

**Files:**

- Create: `site/src/components/atlas/track-band.ts`
- Create: `site/src/components/atlas/track-band.test.ts`
- Create: `site/src/components/atlas/Constellation.astro`
- Create: `site/src/components/atlas/World.astro`
- Create: `site/src/components/atlas/Meridian.astro`
- Create: `site/src/components/atlas/TopNav.astro`
- Create: `site/src/layouts/Atlas.astro`
- Modify: `site/src/i18n/ui.json` (additive — new `home.*` and `nav.atlas.*` keys, EN + RU)
- Modify: `site/src/pages/[lang]/index.astro` (rewritten)
- Delete: `site/src/components/nav/PillarGrid.astro`
- Delete: `site/src/components/nav/SpiralThreadsIndex.astro`
- Delete: `site/src/components/brand/HeroBlock.astro`

- [ ] **Step 1: Write failing test for `track-band.ts`**

Create `site/src/components/atlas/track-band.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TRACK_BAND, BANDS, bandOf } from "./track-band";
import { TRACKS } from "~/types";

describe("track-band", () => {
  it("assigns every known track to exactly one band", () => {
    for (const slug of TRACKS) {
      const band = TRACK_BAND[slug];
      expect(band, `${slug} has no band`).toBeDefined();
      expect(BANDS).toContain(band);
    }
  });

  it("BANDS enumerates exactly the four altitude bands top→bottom", () => {
    expect(BANDS).toEqual(["advanced", "middle", "surface", "foundations"]);
  });

  it("groups foundations tracks under foundations", () => {
    expect(TRACK_BAND["math"]).toBe("foundations");
    expect(TRACK_BAND["base-cs"]).toBe("foundations");
    expect(TRACK_BAND["algorithms"]).toBe("foundations");
  });

  it("groups the day-to-day fullstack tracks under surface", () => {
    expect(TRACK_BAND["networking"]).toBe("surface");
    expect(TRACK_BAND["databases"]).toBe("surface");
    expect(TRACK_BAND["frontend"]).toBe("surface");
    expect(TRACK_BAND["backend"]).toBe("surface");
  });

  it("groups distributed / observability / security under middle", () => {
    expect(TRACK_BAND["distributed"]).toBe("middle");
    expect(TRACK_BAND["observability"]).toBe("middle");
    expect(TRACK_BAND["security"]).toBe("middle");
  });

  it("groups ai-llm / data-engineering / deployment / performance / engineering-practice under advanced", () => {
    expect(TRACK_BAND["ai-llm"]).toBe("advanced");
    expect(TRACK_BAND["data-engineering"]).toBe("advanced");
    expect(TRACK_BAND["deployment"]).toBe("advanced");
    expect(TRACK_BAND["performance"]).toBe("advanced");
    expect(TRACK_BAND["engineering-practice"]).toBe("advanced");
  });

  it("bandOf returns the band for a known slug", () => {
    expect(bandOf("networking")).toBe("surface");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd site && bun run vitest --run src/components/atlas/track-band.test.ts
```

Expected: FAIL — `Cannot find module './track-band'`.

- [ ] **Step 3: Implement `track-band.ts`**

Create `site/src/components/atlas/track-band.ts`:

```ts
import type { Track } from "~/types";

export const BANDS = ["advanced", "middle", "surface", "foundations"] as const;
export type Band = (typeof BANDS)[number];

// Source of truth for "which altitude does each track live at on the home page".
// Order within a band is incidental; the home page renders tracks in band groups
// (DOM order = senior at top, zero at bottom per the direction law).
export const TRACK_BAND: Record<Track, Band> = {
  // foundations — the underground
  "math":               "foundations",
  "base-cs":            "foundations",
  "algorithms":         "foundations",
  // surface — day-to-day fullstack
  "networking":         "surface",
  "browser":            "surface",
  "frontend":           "surface",
  "backend":            "surface",
  "apis":               "surface",
  "databases":          "surface",
  "caching":            "surface",
  "queues":             "surface",
  // middle — systems concerns
  "distributed":        "middle",
  "observability":      "middle",
  "security":           "middle",
  // advanced — the orbit
  "ai-llm":             "advanced",
  "data-engineering":   "advanced",
  "deployment":         "advanced",
  "performance":        "advanced",
  "engineering-practice": "advanced",
};

export function bandOf(slug: Track): Band {
  return TRACK_BAND[slug];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd site && bun run vitest --run src/components/atlas/track-band.test.ts
```

Expected: PASS — all 7 tests green.

- [ ] **Step 5: Create `Constellation.astro` — deterministic SVG constellation generator**

Create `site/src/components/atlas/Constellation.astro`:

```astro
---
type Props = {
  seed: number;
  count?: number;
  inset?: number;
  /** Container size in px; controls the SVG width/height. */
  size?: number;
  /** Tailwind/absolute positioning classes for the wrapping span. */
  class?: string;
  style?: string;
};

const { seed, count = 11, inset = 14, size = 230, class: className = "", style = "" } = Astro.props;

function mulberry32(s: number) {
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(seed >>> 0);
const span = 100 - inset * 2;
const pts = Array.from({ length: count }, () => ({
  x: +(inset + rng() * span).toFixed(1),
  y: +(inset + rng() * span).toFixed(1),
}));
const lines: [number, number][] = [];
for (let i = 0; i < count - 1; i++) lines.push([i, i + 1]);
const extra = 2 + Math.floor(rng() * 3);
for (let k = 0; k < extra; k++) {
  const a = Math.floor(rng() * count);
  const b = Math.floor(rng() * count);
  if (a !== b) lines.push([a, b]);
}
---

<svg
  class={`atlas-constellation ${className}`}
  style={`width:${size}px;height:${size}px;${style}`}
  viewBox="0 0 100 100"
  aria-hidden="true"
>
  {lines.map(([a, b]) => (
    <line
      x1={pts[a].x} y1={pts[a].y}
      x2={pts[b].x} y2={pts[b].y}
      class="cn-line"
    />
  ))}
  {pts.map((p, i) => (
    <circle cx={p.x} cy={p.y} r={i === 0 ? 2.4 : 1.5} class="cn-dot" />
  ))}
</svg>

<style>
  .atlas-constellation { overflow: visible; opacity: 0.85; }
  .cn-line { stroke: rgba(47, 214, 189, 0.4); stroke-width: 0.6; fill: none; }
  .cn-dot  { fill: #2fd6bd; }
</style>
```

- [ ] **Step 6: Create `World.astro` — fixed 400vh parallax world**

Create `site/src/components/atlas/World.astro`:

```astro
---
type Props = {
  /** When true, couple worldStrip.transform to scrollY (topic ascent).
   *  When false, strip rests at translateY(0) — orbit visible (home backdrop). */
  parallax?: boolean;
};
const { parallax = false } = Astro.props;

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260521);
const stars = Array.from({ length: 90 }, () => ({
  x: +(rng() * 100).toFixed(2),
  y: +(rng() * 55).toFixed(2),
  s: +(0.7 + rng() * 1.9).toFixed(2),
  o: +(0.18 + rng() * 0.6).toFixed(2),
}));
const clouds = Array.from({ length: 5 }, () => ({
  x: +(rng() * 90).toFixed(1),
  y: +(28 + rng() * 18).toFixed(1),
  w: Math.round(170 + rng() * 200),
  o: +(0.05 + rng() * 0.07).toFixed(3),
}));
const blades = Array.from({ length: 46 }, () => ({
  x: +(rng() * 100).toFixed(1),
  h: Math.round(14 + rng() * 30),
  d: +(rng() * 8 - 4).toFixed(1),
  o: +(0.3 + rng() * 0.45).toFixed(2),
}));
const veins = Array.from({ length: 7 }, () => ({
  x: +(rng() * 100).toFixed(1),
  y: +(rng() * 88).toFixed(1),
  r: Math.round(rng() * 360),
  l: Math.round(40 + rng() * 120),
  o: +(0.06 + rng() * 0.1).toFixed(3),
}));
---

<div class="atlas-world" aria-hidden="true" data-parallax={parallax ? "true" : "false"}>
  <div class="atlas-world-strip" id="atlasWorldStrip">
    <div class="zone z-space">
      {stars.map((st) => (
        <i class="star" style={`left:${st.x}%;top:${(st.y / 55) * 100}%;width:${st.s}px;height:${st.s}px;opacity:${st.o}`}></i>
      ))}
      <slot name="space-decor" />
      <span class="zone-edge">Orbit</span>
    </div>
    <div class="zone z-sky">
      {clouds.map((c) => (
        <i class="cloud" style={`left:${c.x}%;top:${c.y}%;width:${c.w}px;height:${Math.round(c.w * 0.4)}px;opacity:${c.o}`}></i>
      ))}
      <span class="zone-edge">Sky</span>
    </div>
    <div class="zone z-grass">
      <div class="horizon"></div>
      <div class="blades">
        {blades.map((bl) => (
          <i class="blade" style={`left:${bl.x}%;height:${bl.h}px;transform:rotate(${bl.d}deg);opacity:${bl.o}`}></i>
        ))}
      </div>
      <span class="zone-edge">Surface</span>
    </div>
    <div class="zone z-under">
      {veins.map((v) => (
        <i class="vein" style={`left:${v.x}%;top:${v.y}%;width:${v.l}px;transform:rotate(${v.r}deg);opacity:${v.o}`}></i>
      ))}
      <span class="zone-edge">Underground</span>
    </div>
  </div>
</div>

<script is:inline>
  (function () {
    const world = document.querySelector(".atlas-world");
    if (!world) return;
    const parallax = world.getAttribute("data-parallax") === "true";
    if (!parallax) return;

    // Respect prefers-reduced-motion + the site's motion override key
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const override = localStorage.getItem("awesome.motion");
    const enabled = override === "on" ? true : override === "off" ? false : !reduce;
    if (!enabled) return;

    const strip = document.getElementById("atlasWorldStrip");
    if (!strip) return;

    function update() {
      const max = document.body.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      strip.style.transform = "translateY(" + (-(1 - p) * 300) + "vh)";
    }
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    update();
  })();
</script>

<style>
  .atlas-world {
    position: fixed; inset: 0; z-index: 0;
    overflow: hidden; pointer-events: none;
  }
  .atlas-world-strip {
    position: absolute; left: 0; right: 0; top: 0;
    height: 400vh; will-change: transform;
  }
  .zone { position: absolute; left: 0; right: 0; height: 25%; overflow: hidden; }
  .z-space  { top: 0; }
  .z-sky    { top: 25%; }
  .z-grass  { top: 50%; }
  .z-under  { top: 75%; }

  .z-space {
    background:
      radial-gradient(120% 80% at 50% 0%, #141a33 0%, transparent 60%),
      linear-gradient(to bottom, #070912 0%, #0a0c16 100%);
  }
  .z-sky {
    background: linear-gradient(to bottom, #0a0c16 0%, #0d1226 55%, #121a33 100%);
  }
  .z-grass {
    background: linear-gradient(to bottom, #121a33 0%, #101a22 38%, #0c160f 100%);
  }
  .z-under {
    background:
      radial-gradient(100% 60% at 50% 100%, #1a1208 0%, transparent 70%),
      linear-gradient(to bottom, #0c160f 0%, #110d09 50%, #0b0805 100%);
  }

  .star { position: absolute; background: #fff; border-radius: 50%; }
  .cloud {
    position: absolute; border-radius: 50%; background: #aab6e0;
    filter: blur(34px);
  }

  .horizon {
    position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(to right, transparent,
      rgba(47, 214, 189, 0.5) 50%, transparent);
    box-shadow: 0 0 22px 3px rgba(47, 214, 189, 0.18);
  }
  .blades { position: absolute; left: 0; right: 0; bottom: 0; height: 60px; }
  .blade {
    position: absolute; bottom: 0; width: 2px;
    background: linear-gradient(to top, #2a3f33, transparent);
    transform-origin: bottom center;
  }
  .vein {
    position: absolute; height: 1px;
    background: linear-gradient(to right, transparent,
      rgba(216, 176, 106, 1) 50%, transparent);
    transform-origin: center;
  }
  .zone-edge {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%) rotate(180deg);
    writing-mode: vertical-rl;
    font-size: 10px; letter-spacing: 0.3em; color: #62667f;
    opacity: 0.5;
  }
</style>
```

- [ ] **Step 7: Create `Meridian.astro` — vertical rope**

Create `site/src/components/atlas/Meridian.astro`:

```astro
---
type Props = { fill?: boolean };
const { fill = false } = Astro.props;
---

<div class="atlas-meridian" aria-hidden="true">
  {fill && <span class="meridian-fill" id="atlasMeridianFill"></span>}
</div>

{fill && (
  <script is:inline>
    (function () {
      const el = document.getElementById("atlasMeridianFill");
      if (!el) return;
      function update() {
        const max = document.body.scrollHeight - innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
        el.style.height = (p * 100) + "%";
      }
      addEventListener("scroll", update, { passive: true });
      addEventListener("resize", update, { passive: true });
      update();
    })();
  </script>
)}

<style>
  .atlas-meridian {
    position: absolute; left: 17px; top: 0; bottom: 0; width: 2px;
    background: rgba(233, 234, 242, 0.18);
  }
  .meridian-fill {
    position: absolute; left: 0; top: 0; width: 100%; height: 0;
    background: linear-gradient(to bottom, #2fd6bd, rgba(47, 214, 189, 0.3));
  }
</style>
```

- [ ] **Step 8: Create `TopNav.astro` — dark-zone top header**

Create `site/src/components/atlas/TopNav.astro`:

```astro
---
import LangSwitch from "~/components/brand/LangSwitch.astro";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };
const { lang } = Astro.props;
---

<nav class="atlas-nav">
  <a class="nav-logo" href={`/${lang}/`}>
    open atlas <span>· {t("site.tagline", lang)}</span>
  </a>
  <div class="nav-links">
    <a href={`/${lang}/`}>{t("nav.atlas.atlas", lang)}</a>
    <a href={`/${lang}/about/`}>{t("nav.about", lang)}</a>
    <a href={`/${lang}/glossary/`}>{t("nav.glossary", lang)}</a>
    <LangSwitch />
  </div>
</nav>

<style>
  .atlas-nav {
    position: relative; z-index: 3;
    display: flex; justify-content: space-between; align-items: center;
    max-width: 1180px; margin: 0 auto; padding: 22px 32px;
  }
  .nav-logo {
    font-family: var(--font-display); font-size: 17px;
    font-style: italic; color: #e9eaf2; text-decoration: none;
  }
  .nav-logo span { color: #62667f; font-style: normal; font-size: 13px; }
  .nav-links {
    display: flex; gap: 24px; align-items: center;
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .nav-links a {
    color: #9499b4; text-decoration: none; transition: color .15s;
  }
  .nav-links a:hover { color: #e9eaf2; }
  @media (max-width: 660px) {
    .atlas-nav { padding: 18px 20px; }
    .nav-links { gap: 14px; }
  }
</style>
```

- [ ] **Step 9: Create `Atlas.astro` layout**

Create `site/src/layouts/Atlas.astro`:

```astro
---
import "~/styles/global.css";
import TopNav from "~/components/atlas/TopNav.astro";
import { t, type Locale } from "~/i18n";

type Props = { title: string; lang: Locale };
const { title, lang } = Astro.props;
---

<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <title>{title} — {t("site.title", lang)}</title>
  </head>
  <body class="atlas-body">
    <TopNav lang={lang} />
    <slot />
    <footer class="atlas-foot">
      <p class="foot-logo">open atlas <em>· {t("home.tagline", lang)}</em></p>
      <p class="foot-fine">© 2026 open atlas · CC BY-SA 4.0 · MMXXVI</p>
    </footer>

    <style is:global>
      .atlas-body {
        --bg: #0a0c16;
        --ink: #e9eaf2;
        --dim: #9499b4;
        --faint: #62667f;
        --teal: #2fd6bd;
        --gold: #d8b06a;
        --line: rgba(233, 234, 242, 0.10);
        --line-2: rgba(233, 234, 242, 0.18);
        margin: 0;
        background: var(--bg);
        color: var(--ink);
        font-family: var(--font-body);
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
        min-height: 100vh;
      }
      .atlas-body a { color: inherit; text-decoration: none; }
      .atlas-body h1,
      .atlas-body h2,
      .atlas-body h3 {
        font-family: var(--font-display); font-weight: 600; margin: 0;
      }
      .atlas-foot {
        position: relative; z-index: 2;
        margin-top: 10px; padding: 30px 0 60px;
        border-top: 1px solid var(--line); text-align: center;
      }
      .atlas-foot .foot-logo { font-family: var(--font-display); font-size: 15px; margin: 0; }
      .atlas-foot .foot-logo em { color: var(--faint); font-size: 12px; }
      .atlas-foot .foot-fine {
        font-family: var(--font-mono); font-size: 10px;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--faint); margin: 12px 0 0;
      }
    </style>
  </body>
</html>
```

- [ ] **Step 10: Add i18n keys for home + atlas nav**

Modify `site/src/i18n/ui.json` — add these keys (additive) under both the `en` and `ru` objects.

Add inside the EN block:

```json
"nav.atlas.atlas": "Atlas",
"home.tagline": "learning, in the open",
"home.kicker": "open atlas · curriculum",
"home.title1": "Zero to senior,",
"home.title2": "in the open.",
"home.crux": "19 tracks across mathematics, computer science, and fullstack engineering — every lesson a node in one connected atlas.",
"home.scrollCue": "Scroll down through the bands. Foundations are underground; senior work is in orbit.",
"home.band.advanced": "Orbit · senior systems",
"home.band.middle": "Sky · the middle altitude",
"home.band.surface": "Surface · day-to-day fullstack",
"home.band.foundations": "Underground · foundations",
"home.band.advanced.note": "Cross-cutting concerns: distributed systems, observability, security, deployment, performance, AI/LLM, data engineering, engineering practice.",
"home.band.middle.note": "Systems concerns that surface once a service grows up.",
"home.band.surface.note": "What a senior fullstack practitioner touches every week.",
"home.band.foundations.note": "Bedrock no one sees but everything rests on — mathematics, base CS, algorithms.",
"home.track.lessons": "lessons",
"home.track.units": "units"
```

Add inside the RU block:

```json
"nav.atlas.atlas": "Атлас",
"home.tagline": "обучение в открытом доступе",
"home.kicker": "open atlas · программа",
"home.title1": "От нуля до сеньора,",
"home.title2": "в открытом доступе.",
"home.crux": "19 треков — математика, computer science и fullstack-инженерия. Каждый урок — узел в едином связном атласе.",
"home.scrollCue": "Листай вниз по поясам. Основания — под землёй; работа сеньора — на орбите.",
"home.band.advanced": "Орбита · senior-системы",
"home.band.middle": "Небо · средний эшелон",
"home.band.surface": "Поверхность · ежедневный fullstack",
"home.band.foundations": "Под землёй · основания",
"home.band.advanced.note": "Сквозные темы: распределённые системы, observability, безопасность, деплой, производительность, AI/LLM, data engineering, инженерные практики.",
"home.band.middle.note": "Системные темы, которые всплывают, когда сервис взрослеет.",
"home.band.surface.note": "То, что senior-fullstack трогает каждую неделю.",
"home.band.foundations.note": "Фундамент, который никто не видит, но всё стоит на нём — математика, базовая CS, алгоритмы.",
"home.track.lessons": "уроков",
"home.track.units": "юнитов"
```

Verify the file is valid JSON: `cd site && jq . src/i18n/ui.json > /dev/null && echo OK`.

- [ ] **Step 11: Rewrite `[lang]/index.astro` — cosmic home**

Replace the entire contents of `site/src/pages/[lang]/index.astro`:

```astro
---
import Atlas from "~/layouts/Atlas.astro";
import World from "~/components/atlas/World.astro";
import Meridian from "~/components/atlas/Meridian.astro";
import Constellation from "~/components/atlas/Constellation.astro";
import { getCollection } from "astro:content";
import { t, isLocale, type Locale } from "~/i18n";
import { TRACK_BAND, BANDS, type Band } from "~/components/atlas/track-band";
import type { Track } from "~/types";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error(`Unknown locale: ${lang}`);

const tracks = (await getCollection("tracks")).sort((a, b) => a.data.order - b.data.order);
const units = await getCollection("units");

function lessonCount(slug: string): number {
  return units
    .filter((u) => u.data.track === slug)
    .reduce((acc, u) => acc + u.data.lessons.length, 0);
}
function unitCount(slug: string): number {
  return units.filter((u) => u.data.track === slug).length;
}

type Row = { slug: Track; title: string; blurb: string; lessons: number; units: number };
const byBand: Record<Band, Row[]> = {
  advanced: [], middle: [], surface: [], foundations: [],
};
for (const tr of tracks) {
  const slug = tr.data.slug as Track;
  byBand[TRACK_BAND[slug]].push({
    slug,
    title: tr.data.title[lang],
    blurb: tr.data.blurb[lang],
    lessons: lessonCount(slug),
    units: unitCount(slug),
  });
}
---

<Atlas title={t("nav.atlas.atlas", lang)} lang={lang}>
  <World parallax={false}>
    <Constellation
      seed={0x4174_4c41}
      count={9}
      class="home-constellation"
      style="right:6%;top:10%;"
      slot="space-decor"
    />
  </World>

  <main class="home">
    <header class="home-head">
      <p class="kicker">{t("home.kicker", lang)}</p>
      <h1 class="title">
        {t("home.title1", lang)}<br />
        <em>{t("home.title2", lang)}</em>
      </h1>
      <p class="crux">{t("home.crux", lang)}</p>
      <p class="scroll-cue">{t("home.scrollCue", lang)} <span class="cue-arrow">↓</span></p>
    </header>

    <div class="rope">
      <Meridian />

      {BANDS.map((band) => (
        <section class={`band band-${band}`}>
          <header class="band-head">
            <span class="band-label">{t(`home.band.${band}`, lang)}</span>
            <span class="band-note">{t(`home.band.${band}.note`, lang)}</span>
          </header>
          <ul class="band-tracks">
            {byBand[band].map((row) => (
              <li class="track-row">
                <a class="track-card" href={`/${lang}/learn/${row.slug}/`}>
                  <div class="card-top">
                    <span class="card-slug">{row.slug}</span>
                    <span class="card-meta">
                      {row.units} {t("home.track.units", lang)} · {row.lessons} {t("home.track.lessons", lang)}
                    </span>
                  </div>
                  <h3 class="card-title">{row.title}</h3>
                  <p class="card-blurb">{row.blurb}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </main>
</Atlas>

<style>
  .home {
    position: relative; z-index: 2;
    max-width: 760px; margin: 0 auto; padding: 0 32px;
  }
  .home-head { padding: 56px 0 40px; }
  .kicker {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #62667f; margin: 0 0 18px;
  }
  .title {
    font-size: clamp(40px, 7vw, 64px); line-height: 1.04;
    letter-spacing: -0.02em; color: #e9eaf2;
  }
  .title em { font-style: italic; font-weight: 400; color: #c9d3e8; }
  .crux {
    font-family: var(--font-display); font-size: 19px; line-height: 1.5;
    color: #9499b4; margin: 18px 0 0; max-width: 30em;
  }
  .scroll-cue {
    font-family: var(--font-mono); font-size: 10.5px; line-height: 2;
    color: #62667f; letter-spacing: 0.1em; margin: 30px 0 0;
    text-transform: uppercase;
  }
  .cue-arrow { color: #2fd6bd; }

  .rope { position: relative; padding-left: 56px; padding-bottom: 60px; }

  .band { padding: 30px 0 14px; }
  .band:first-child { padding-top: 4px; }
  .band-head { margin-bottom: 16px; }
  .band-label {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #d8b06a;
  }
  .band-advanced    .band-label { color: #2fd6bd; }
  .band-middle      .band-label { color: #7fb0e6; }
  .band-surface     .band-label { color: #8fcf7a; }
  .band-foundations .band-label { color: #d8b06a; }
  .band-note {
    display: block; font-size: 13px; line-height: 1.5;
    color: #62667f; margin-top: 5px;
  }

  .band-tracks { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .track-card {
    display: block; padding: 14px 18px;
    border: 1px solid rgba(233, 234, 242, 0.10); border-radius: 4px;
    background: rgba(12, 14, 26, 0.72);
    backdrop-filter: blur(3px);
    transition: border-color .16s, background .16s, transform .16s;
  }
  .track-card:hover {
    border-color: rgba(233, 234, 242, 0.18);
    background: rgba(18, 21, 38, 0.85);
    transform: translateX(3px);
  }
  .card-top {
    display: flex; justify-content: space-between; gap: 12px;
    align-items: baseline; margin-bottom: 4px;
  }
  .card-slug {
    font-family: var(--font-mono); font-size: 10.5px;
    letter-spacing: 0.08em; color: #62667f;
  }
  .card-meta {
    font-family: var(--font-mono); font-size: 10px;
    color: #62667f;
  }
  .card-title {
    font-size: 19px; font-style: italic; font-weight: 400;
    color: #e9eaf2; margin: 2px 0;
  }
  .card-blurb {
    font-size: 13.5px; line-height: 1.55; color: #9499b4; margin: 0;
  }

  @media (max-width: 660px) {
    .home { padding: 0 20px; }
    .home-head { padding: 36px 0 30px; }
    .rope { padding-left: 42px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .track-card { transition: none !important; }
    .track-card:hover { transform: none; }
  }
</style>
```

- [ ] **Step 12: Verify the new home does NOT import the old components**

```bash
cd site && grep -E "PillarGrid|HeroBlock|SpiralThreadsIndex" src/pages/[lang]/index.astro
```

Expected: no output (zero matches).

```bash
cd site && grep -rln "PillarGrid\|HeroBlock\|SpiralThreadsIndex" src/ --exclude-dir=graphify-out
```

Expected: only the three old component files themselves; no other importers.

- [ ] **Step 13: Delete the orphaned old home components**

```bash
git rm site/src/components/nav/PillarGrid.astro \
       site/src/components/nav/SpiralThreadsIndex.astro \
       site/src/components/brand/HeroBlock.astro
```

- [ ] **Step 14: Run the build gate**

```bash
cd site && bun run build
```

Expected: build succeeds, `dist/lint-report.json` shows `errors: 0`.

Verify lint count:

```bash
cd site && jq '{errors: (.violations | map(select(.severity == "error")) | length), warnings: (.violations | map(select(.severity == "warning")) | length)}' dist/lint-report.json
```

Expected: `{"errors": 0, "warnings": 0}` (or warnings ≥ 0 — only `errors` matters for the gate).

Verify page count:

```bash
find site/dist -name "index.html" | wc -l
```

Expected: ~2361 pages (matches main's count; only home content changed).

- [ ] **Step 15: Manual visual verification**

Start the preview server (already configured as `atlas-preview` on port 4400):

```bash
cd site && python3 -m http.server 4400 -d dist >/dev/null 2>&1 &
sleep 1
```

Verify in a browser at `http://localhost:4400/en/`:

- 19 track cards visible across 4 bands
- DOM order: Advanced first, Foundations last (direction law)
- Cosmic dark background, starfield visible
- Clicking a track navigates to `/en/learn/{slug}/`

Same at `http://localhost:4400/ru/` — Russian copy renders correctly.

Stop the server: `kill %1 2>/dev/null || true`.

- [ ] **Step 16: Commit T1**

```bash
git add site/src/layouts/Atlas.astro \
        site/src/components/atlas/ \
        site/src/pages/[lang]/index.astro \
        site/src/i18n/ui.json
git status
```

Verify `git status` shows: added Atlas.astro + 5 atlas components + track-band.{ts,test.ts}, modified ui.json + index.astro, deleted 3 old nav/brand components.

```bash
git commit -m "$(cat <<'EOF'
feat(open-atlas): cosmic home on [lang]/ route

Replaces the old [lang]/index.astro (Topic.astro + PillarGrid + HeroBlock
+ SpiralThreadsIndex) with the cosmic atlas: dark-cosmic Atlas.astro
layout, World/Meridian/Constellation/TopNav primitives under
components/atlas/, 19 tracks rendered into 4 altitude bands via a
track-band.ts map (foundations / surface / middle / advanced).

Decision: no scroll-driven camera flight on home (static cosmic backdrop);
the parallax camera is reserved for the topic ascent page. Direction law
preserved: foundations at the bottom of the DOM, advanced at the top.

Deletes the now-orphaned PillarGrid / HeroBlock / SpiralThreadsIndex
components (sole importer was the old home).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit lands on `design-wireup` with no pre-commit hook failures.

```bash
git log --oneline -2
```

Expected: top of the log shows the new commit, followed by the spec commit `f796b13`.

---

## Task 2: T2 — ascent topic page on `[lang]/learn/[track]/` route

**Files:**

- Create: `site/src/components/atlas/next-track.ts`
- Create: `site/src/components/atlas/next-track.test.ts`
- Create: `site/src/components/atlas/Altimeter.astro`
- Create: `site/src/components/atlas/UnitMarker.astro`
- Create: `site/src/components/atlas/LessonRow.astro`
- Create: `site/src/components/atlas/ResumeCTA.astro`
- Create: `site/src/components/atlas/TopicHeader.astro`
- Create: `site/src/components/atlas/Summit.astro`
- Modify: `site/src/i18n/ui.json` (additive — new `topic.*` keys, EN + RU)
- Modify: `site/src/pages/[lang]/learn/[track]/index.astro` (rewritten)

- [ ] **Step 1: Write failing test for `next-track.ts`**

Create `site/src/components/atlas/next-track.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextTrackByOrder } from "./next-track";

const tracks = [
  { slug: "math",                 order: 1 },
  { slug: "base-cs",              order: 2 },
  { slug: "algorithms",           order: 3 },
  { slug: "networking",           order: 4 },
  { slug: "engineering-practice", order: 19 },
];

describe("nextTrackByOrder", () => {
  it("returns the track at order + 1", () => {
    expect(nextTrackByOrder(tracks, 1)?.slug).toBe("base-cs");
    expect(nextTrackByOrder(tracks, 3)?.slug).toBe("networking");
  });

  it("returns null when no track at order + 1 exists", () => {
    expect(nextTrackByOrder(tracks, 19)).toBeNull();
  });

  it("returns null for gaps in the order sequence", () => {
    expect(nextTrackByOrder(tracks, 4)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd site && bun run vitest --run src/components/atlas/next-track.test.ts
```

Expected: FAIL — `Cannot find module './next-track'`.

- [ ] **Step 3: Implement `next-track.ts`**

Create `site/src/components/atlas/next-track.ts`:

```ts
export type TrackLike = { slug: string; order: number };

export function nextTrackByOrder<T extends TrackLike>(tracks: readonly T[], currentOrder: number): T | null {
  return tracks.find((t) => t.order === currentOrder + 1) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd site && bun run vitest --run src/components/atlas/next-track.test.ts
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Create `Altimeter.astro`**

Create `site/src/components/atlas/Altimeter.astro`:

```astro
---
import { t, type Locale } from "~/i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---

<aside class="atlas-altimeter" aria-hidden="true">
  <span class="alt-cap">{t("topic.altimeter.cap", lang)}</span>
  <div class="alt-track">
    <span class="alt-tick t-space"><b></b>{t("topic.altimeter.orbit", lang)}</span>
    <span class="alt-tick t-sky"><b></b>{t("topic.altimeter.sky", lang)}</span>
    <span class="alt-tick t-grass"><b></b>{t("topic.altimeter.surface", lang)}</span>
    <span class="alt-tick t-under"><b></b>{t("topic.altimeter.under", lang)}</span>
    <span class="alt-dot" id="atlasAltDot"></span>
  </div>
  <span class="alt-pct" id="atlasAltPct">0%</span>
</aside>

<script is:inline>
  (function () {
    const dot = document.getElementById("atlasAltDot");
    const pct = document.getElementById("atlasAltPct");
    if (!dot || !pct) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const override = localStorage.getItem("awesome.motion");
    const enabled = override === "on" ? true : override === "off" ? false : !reduce;
    if (!enabled) return;

    function update() {
      const max = document.body.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      dot.style.bottom = (p * 100) + "%";
      pct.textContent = Math.round(p * 100) + "%";
    }
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    update();
  })();
</script>

<style>
  .atlas-altimeter {
    position: fixed; z-index: 3; left: 28px; top: 50%;
    transform: translateY(-50%);
    display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .alt-cap, .alt-pct {
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.12em; text-transform: uppercase; color: #62667f;
  }
  .alt-pct { color: #2fd6bd; }
  .alt-track {
    position: relative; width: 2px; height: 280px;
    background: linear-gradient(to top, rgba(233, 234, 242, 0.18), #2fd6bd);
  }
  .alt-tick {
    position: absolute; left: 12px; white-space: nowrap;
    font-family: var(--font-mono); font-size: 8.5px; color: #62667f;
    display: flex; align-items: center; gap: 7px;
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .alt-tick b {
    position: absolute; left: -12px; width: 7px; height: 1px;
    background: rgba(233, 234, 242, 0.18);
  }
  .t-space { top: 0; }
  .t-sky   { top: 33.33%; }
  .t-grass { top: 66.66%; }
  .t-under { top: 100%; transform: translateY(-100%); }
  .alt-dot {
    position: absolute; left: 50%; bottom: 0;
    width: 9px; height: 9px; border-radius: 50%;
    background: #2fd6bd; transform: translate(-50%, 50%);
    box-shadow: 0 0 10px 2px rgba(47, 214, 189, 0.55);
  }
  @media (max-width: 880px) {
    .atlas-altimeter { display: none; }
  }
</style>
```

- [ ] **Step 6: Create `LessonRow.astro`**

Create `site/src/components/atlas/LessonRow.astro`:

```astro
---
type Props = {
  n: number;
  title: string;
  href: string;
  estMin?: number;
};
const { n, title, href, estMin } = Astro.props;
---

<li class="atlas-lesson-row">
  <a class="row-link" href={href}>
    <span class="row-n">{n}</span>
    <span class="row-title">{title}</span>
    {typeof estMin === "number" && <span class="row-meta">{estMin} min</span>}
  </a>
</li>

<style>
  .atlas-lesson-row { list-style: none; }
  .row-link {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: baseline; gap: 10px;
    padding: 6px 10px; border-radius: 3px;
    color: #c9d3e8; text-decoration: none;
    transition: background .12s, color .12s;
  }
  .row-link:hover {
    background: rgba(47, 214, 189, 0.05);
    color: #e9eaf2;
  }
  .row-n {
    font-family: var(--font-mono); font-size: 10px;
    color: #62667f; text-align: right;
  }
  .row-title {
    font-size: 14px; line-height: 1.4;
  }
  .row-meta {
    font-family: var(--font-mono); font-size: 10px;
    color: #62667f; white-space: nowrap;
  }
</style>
```

- [ ] **Step 7: Create `UnitMarker.astro`**

Create `site/src/components/atlas/UnitMarker.astro`:

```astro
---
type Props = {
  n: number;
  title: string;
  crux: string;
  firstLessonHref: string;
};
const { n, title, crux, firstLessonHref } = Astro.props;
---

<article class="atlas-unit">
  <a class="unit-marker" href={firstLessonHref} aria-label={`Unit ${n}: ${title}`}>
    <span class="m-dot">{n}</span>
  </a>
  <div class="unit-card">
    <header class="unit-head">
      <span class="unit-kicker">unit {String(n).padStart(2, "0")}</span>
      <h3 class="unit-title">{title}</h3>
      <p class="unit-crux">{crux}</p>
    </header>
    <ul class="unit-lessons">
      <slot />
    </ul>
  </div>
</article>

<style>
  .atlas-unit {
    position: relative; padding: 18px 0;
  }
  .unit-marker {
    position: absolute; left: -56px; top: 18px;
    width: 36px; display: flex; justify-content: center;
    text-decoration: none;
  }
  .m-dot {
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-mono); font-size: 12px;
    background: #0a0c16; border: 1.5px solid rgba(233, 234, 242, 0.18);
    color: #9499b4; position: relative; z-index: 1;
    transition: border-color .16s, color .16s, box-shadow .16s;
  }
  .unit-marker:hover .m-dot {
    border-color: #2fd6bd; color: #2fd6bd;
    box-shadow: 0 0 12px 1px rgba(47, 214, 189, 0.45);
  }
  .unit-card {
    border: 1px solid rgba(233, 234, 242, 0.10); border-radius: 4px;
    background: rgba(12, 14, 26, 0.72);
    backdrop-filter: blur(3px);
    padding: 14px 18px;
  }
  .unit-head { margin-bottom: 10px; }
  .unit-kicker {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; color: #62667f;
  }
  .unit-title {
    font-size: 19px; font-style: italic; font-weight: 400;
    color: #e9eaf2; margin: 4px 0 2px;
  }
  .unit-crux {
    font-size: 13.5px; line-height: 1.55; color: #9499b4; margin: 0;
  }
  .unit-lessons {
    list-style: none; margin: 8px 0 0; padding: 0;
    border-top: 1px solid rgba(233, 234, 242, 0.10);
    padding-top: 8px;
  }
  @media (max-width: 660px) {
    .unit-marker { left: -42px; width: 30px; }
    .m-dot { width: 26px; height: 26px; font-size: 11px; }
  }
</style>
```

- [ ] **Step 8: Create `TopicHeader.astro`**

Create `site/src/components/atlas/TopicHeader.astro`:

```astro
---
import { t, type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  order: number;
  title: string;
  blurb: string;
  unitCount: number;
  lessonCount: number;
};
const { lang, order, title, blurb, unitCount, lessonCount } = Astro.props;
---

<header class="atlas-topic-head">
  <p class="kicker">
    {t("topic.kicker", lang)} {String(order).padStart(2, "0")}
  </p>
  <h1 class="title">{title}</h1>
  <p class="crux">{blurb}</p>

  <div class="head-meta">
    <span class="hm">✦ {unitCount} {t("topic.units", lang)}</span>
    <span class="hm">◆ {lessonCount} {t("topic.lessons", lang)}</span>
  </div>
</header>

<style>
  .atlas-topic-head { padding: 56px 0 24px; }
  .kicker {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: #62667f; margin: 0 0 18px;
  }
  .title {
    font-size: clamp(40px, 7vw, 62px); line-height: 1.04;
    letter-spacing: -0.02em; color: #e9eaf2;
  }
  .crux {
    font-family: var(--font-display); font-size: 19px; line-height: 1.5;
    color: #9499b4; margin: 18px 0 0; max-width: 30em;
  }
  .head-meta {
    display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 26px 0 0;
    padding: 16px 0; border-top: 1px solid rgba(233, 234, 242, 0.10);
    border-bottom: 1px solid rgba(233, 234, 242, 0.10);
  }
  .hm {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.04em; color: #62667f;
  }
</style>
```

- [ ] **Step 9: Create `ResumeCTA.astro`**

Create `site/src/components/atlas/ResumeCTA.astro`:

```astro
---
import { t, type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  trackSlug: string;
  firstLessonHref: string;
  firstLessonTitle: string;
};
const { lang, trackSlug, firstLessonHref, firstLessonTitle } = Astro.props;
---

<a
  class="atlas-resume"
  id="atlasResume"
  href={firstLessonHref}
  data-track={trackSlug}
  data-default-href={firstLessonHref}
  data-default-title={firstLessonTitle}
>
  <span class="resume-k" id="atlasResumeKicker">{t("topic.resume.start", lang)}</span>
  <span class="resume-t" id="atlasResumeTitle">{firstLessonTitle}</span>
</a>

<script is:inline define:vars={{
  resumeKickerText: t("topic.resume.resume", lang),
}}>
  (function () {
    const el = document.getElementById("atlasResume");
    if (!el) return;
    const track = el.getAttribute("data-track");
    if (!track) return;
    try {
      const raw = localStorage.getItem("atlas.last." + track);
      if (!raw) return;
      const last = JSON.parse(raw);
      if (!last || !last.href || !last.title) return;
      el.setAttribute("href", last.href);
      const kicker = document.getElementById("atlasResumeKicker");
      const title = document.getElementById("atlasResumeTitle");
      if (kicker) kicker.textContent = resumeKickerText;
      if (title) title.textContent = last.title;
    } catch (_) { /* ignore */ }
  })();
</script>

<style>
  .atlas-resume {
    display: flex; flex-direction: column; gap: 6px; margin-top: 24px;
    padding: 18px 20px; border-radius: 4px;
    border: 1px solid rgba(47, 214, 189, 0.45);
    background: rgba(47, 214, 189, 0.05);
    text-decoration: none;
    transition: border-color .16s, background .16s, transform .16s;
  }
  .atlas-resume:hover {
    border-color: #2fd6bd; background: rgba(47, 214, 189, 0.09);
    transform: translateY(-2px);
  }
  .resume-k {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase; color: #2fd6bd;
  }
  .resume-t {
    font-family: var(--font-display); font-size: 21px;
    color: #e9eaf2; margin-top: 2px;
  }
</style>
```

- [ ] **Step 10: Create `Summit.astro`**

Create `site/src/components/atlas/Summit.astro`:

```astro
---
import { t, type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  trackTitle: string;
  nextTrack: { slug: string; title: string; blurb: string } | null;
};
const { lang, trackTitle, nextTrack } = Astro.props;
---

<section class="atlas-summit">
  <span class="summit-tag">{t("topic.summit.tag", lang)}</span>
  <h2 class="summit-title">{t("topic.summit.title", lang)}</h2>
  <p class="summit-text">
    {t("topic.summit.body", lang).replace("{track}", trackTitle)}
  </p>
  <div class={`summit-acts ${nextTrack ? "two" : "one"}`}>
    {nextTrack && (
      <a class="act act-next" href={`/${lang}/learn/${nextTrack.slug}/`}>
        <span class="act-k">{t("topic.summit.unlocks", lang)}</span>
        <span class="act-t">{nextTrack.title}</span>
        <span class="act-sub">{nextTrack.blurb}</span>
      </a>
    )}
    <a class="act" href={`/${lang}/`}>
      <span class="act-k">{t("topic.summit.back", lang)}</span>
      <span class="act-t">{t("topic.summit.atlas", lang)}</span>
      <span class="act-sub">{t("topic.summit.atlasSub", lang)}</span>
    </a>
  </div>
</section>

<style>
  .atlas-summit {
    margin-top: 64px; padding: 40px 0 56px;
    border-top: 1px solid rgba(233, 234, 242, 0.10);
    text-align: center;
  }
  .summit-tag {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.12em; text-transform: uppercase; color: #2fd6bd;
  }
  .summit-title {
    font-size: clamp(26px, 4vw, 34px); font-style: italic;
    font-weight: 400; margin: 14px 0 0; line-height: 1.2; color: #e9eaf2;
  }
  .summit-text {
    font-size: 14.5px; line-height: 1.65; color: #9499b4;
    margin: 14px auto 0; max-width: 32em;
  }
  .summit-acts {
    display: grid; gap: 14px; margin-top: 30px; text-align: left;
  }
  .summit-acts.two { grid-template-columns: 1fr 1fr; }
  .summit-acts.one { grid-template-columns: 1fr; max-width: 360px; margin-left: auto; margin-right: auto; }
  .act {
    display: flex; flex-direction: column; gap: 5px;
    padding: 18px 20px; border-radius: 4px;
    border: 1px solid rgba(233, 234, 242, 0.18);
    background: rgba(255, 255, 255, 0.02);
    text-decoration: none;
    transition: border-color .16s, background .16s, transform .16s;
  }
  .act:hover {
    background: rgba(255, 255, 255, 0.05); transform: translateY(-2px);
  }
  .act-next { border-color: rgba(47, 214, 189, 0.4); }
  .act-next:hover { border-color: #2fd6bd; }
  .act-k {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; color: #62667f;
  }
  .act-next .act-k { color: #2fd6bd; }
  .act-t {
    font-family: var(--font-display); font-size: 20px; color: #e9eaf2;
  }
  .act-sub {
    font-size: 12.5px; color: #9499b4;
  }
  @media (max-width: 660px) {
    .summit-acts.two { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 11: Add i18n keys for the topic page**

Modify `site/src/i18n/ui.json` — add inside the EN block:

```json
"topic.kicker": "topic",
"topic.units": "units",
"topic.lessons": "lessons",
"topic.resume.start": "Start here",
"topic.resume.resume": "Resume",
"topic.altimeter.cap": "Altitude",
"topic.altimeter.orbit": "Orbit",
"topic.altimeter.sky": "Sky",
"topic.altimeter.surface": "Surface",
"topic.altimeter.under": "Underground",
"topic.summit.tag": "The summit · orbit reached",
"topic.summit.title": "You can see the whole topic now.",
"topic.summit.body": "Every unit, from the underground to the orbit. {track} is one constellation in the atlas — climb another topic and watch the next one light up.",
"topic.summit.unlocks": "Unlocks above ↑",
"topic.summit.back": "Back to orbit",
"topic.summit.atlas": "Return to the atlas",
"topic.summit.atlasSub": "See every topic as one chart"
```

Add inside the RU block:

```json
"topic.kicker": "тема",
"topic.units": "юнитов",
"topic.lessons": "уроков",
"topic.resume.start": "Начать отсюда",
"topic.resume.resume": "Продолжить",
"topic.altimeter.cap": "Высота",
"topic.altimeter.orbit": "Орбита",
"topic.altimeter.sky": "Небо",
"topic.altimeter.surface": "Поверхность",
"topic.altimeter.under": "Под землёй",
"topic.summit.tag": "Вершина · орбита достигнута",
"topic.summit.title": "Теперь видно тему целиком.",
"topic.summit.body": "Каждый юнит, от под землёй до орбиты. {track} — одно созвездие в атласе; одолей следующую тему и оно загорится рядом.",
"topic.summit.unlocks": "Открывается выше ↑",
"topic.summit.back": "Обратно на орбиту",
"topic.summit.atlas": "Вернуться в атлас",
"topic.summit.atlasSub": "Увидеть все темы как одну карту"
```

Verify JSON validity: `cd site && jq . src/i18n/ui.json > /dev/null && echo OK`.

- [ ] **Step 12: Rewrite the track-index route**

Replace the entire contents of `site/src/pages/[lang]/learn/[track]/index.astro`:

```astro
---
import Atlas from "~/layouts/Atlas.astro";
import World from "~/components/atlas/World.astro";
import Meridian from "~/components/atlas/Meridian.astro";
import Constellation from "~/components/atlas/Constellation.astro";
import Altimeter from "~/components/atlas/Altimeter.astro";
import TopicHeader from "~/components/atlas/TopicHeader.astro";
import ResumeCTA from "~/components/atlas/ResumeCTA.astro";
import UnitMarker from "~/components/atlas/UnitMarker.astro";
import LessonRow from "~/components/atlas/LessonRow.astro";
import Summit from "~/components/atlas/Summit.astro";
import { getCollection } from "astro:content";
import { type Locale, isLocale } from "~/i18n";
import { nextTrackByOrder } from "~/components/atlas/next-track";

export async function getStaticPaths() {
  const tracks = await getCollection("tracks");
  return tracks.flatMap((tr) =>
    (["en", "ru"] as const).map((lang) => ({
      params: { lang, track: tr.data.slug },
    })),
  );
}

const { lang, track } = Astro.params as { lang: Locale; track: string };
if (!isLocale(lang)) throw new Error("bad lang");

const allTracks = await getCollection("tracks");
const trackEntry = allTracks.find((t) => t.data.slug === track);
if (!trackEntry) throw new Error(`Unknown track: ${track}`);

const units = (await getCollection("units"))
  .filter((u) => u.data.track === track)
  .sort((a, b) => a.data.order - b.data.order);

const allLessons = await getCollection("lessons", (l) => l.data.lang === lang && l.data.track === track);

// Per-unit slug -> lesson entry index for fast title + estMin lookup
const lessonBySlug = new Map(allLessons.map((l) => [l.data.slug, l]));

const lessonCount = units.reduce((acc, u) => acc + u.data.lessons.length, 0);

// Next track on the spine — Decision 4 in the spec
const tracksLite = allTracks
  .map((t) => ({ slug: t.data.slug, order: t.data.order, title: t.data.title[lang], blurb: t.data.blurb[lang] }))
  .sort((a, b) => a.order - b.order);
const next = nextTrackByOrder(tracksLite, trackEntry.data.order);

// First lesson (for the Resume CTA fallback): unit 1's first lesson slug
const firstUnit = units[0];
const firstLessonSlug = firstUnit?.data.lessons[0];
const firstLessonEntry = firstLessonSlug ? lessonBySlug.get(firstLessonSlug) : undefined;
const firstLessonHref = firstLessonEntry
  ? `/${lang}/learn/${track}/${firstLessonSlug}/`
  : `/${lang}/learn/${track}/`;
const firstLessonTitle = firstLessonEntry?.data.title ?? trackEntry.data.title[lang];

// Render senior at the top (Decision 1 + direction law) — reverse a copy
const unitsTopDown = [...units].reverse();

// Deterministic seed per track for the named constellation
function trackSeed(slug: string): number {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  return h >>> 0;
}
---

<Atlas title={trackEntry.data.title[lang]} lang={lang}>
  <World parallax={true}>
    <Constellation
      seed={trackSeed(track)}
      count={11}
      class="topic-constellation"
      style="right:7%;top:14%;"
      slot="space-decor"
    />
  </World>
  <Altimeter lang={lang} />

  <main class="climb">
    <TopicHeader
      lang={lang}
      order={trackEntry.data.order}
      title={trackEntry.data.title[lang]}
      blurb={trackEntry.data.blurb[lang]}
      unitCount={units.length}
      lessonCount={lessonCount}
    />

    <ResumeCTA
      lang={lang}
      trackSlug={track}
      firstLessonHref={firstLessonHref}
      firstLessonTitle={firstLessonTitle}
    />

    <div class="rope">
      <Meridian fill={true} />

      {unitsTopDown.map((u) => {
        const firstSlugInUnit = u.data.lessons[0];
        const unitHref = firstSlugInUnit
          ? `/${lang}/learn/${track}/${firstSlugInUnit}/`
          : `/${lang}/learn/${track}/`;
        return (
          <UnitMarker
            n={u.data.order}
            title={u.data.title[lang]}
            crux={u.data.crux[lang]}
            firstLessonHref={unitHref}
          >
            {u.data.lessons.map((slug, idx) => {
              const entry = lessonBySlug.get(slug);
              return (
                <LessonRow
                  n={idx + 1}
                  title={entry?.data.title ?? slug}
                  href={`/${lang}/learn/${track}/${slug}/`}
                  estMin={entry?.data.estMin}
                />
              );
            })}
          </UnitMarker>
        );
      })}
    </div>

    <Summit
      lang={lang}
      trackTitle={trackEntry.data.title[lang]}
      nextTrack={next ? { slug: next.slug, title: next.title, blurb: next.blurb } : null}
    />
  </main>
</Atlas>

<style>
  .climb {
    position: relative; z-index: 2;
    max-width: 660px; margin: 0 auto; padding: 0 32px;
  }
  .rope { position: relative; padding-left: 56px; padding-top: 30px; }
  @media (max-width: 660px) {
    .climb { padding: 0 20px; }
    .rope { padding-left: 42px; }
  }
</style>
```

- [ ] **Step 13: Run the build gate**

```bash
cd site && bun run build
```

Expected: build succeeds.

```bash
cd site && jq '{errors: (.violations | map(select(.severity == "error")) | length)}' dist/lint-report.json
```

Expected: `{"errors": 0}`.

```bash
find site/dist -name "index.html" | wc -l
```

Expected: ~2361 pages (unchanged; only existing routes were updated).

- [ ] **Step 14: Manual visual verification — largest and smallest track**

```bash
cd site && python3 -m http.server 4400 -d dist >/dev/null 2>&1 &
sleep 1
```

Open in a browser:

- `http://localhost:4400/en/learn/networking/` — 12 units × 76 lessons. Verify: senior unit at top, foundations unit at bottom, lesson sub-rows render under each unit card, altimeter visible on the left ≥880px, scroll causes camera to fly and altimeter dot to climb, summit shows "Unlocks above ↑ Browser" (next by order).
- `http://localhost:4400/en/learn/ai-llm/` — 8 units × 8 lessons. Verify: same structure, lower density.
- `http://localhost:4400/en/learn/engineering-practice/` — last track by order. Verify summit shows only "Back to atlas".
- `http://localhost:4400/ru/learn/networking/` — Russian copy renders correctly (header, altimeter ticks, summit copy with `{track}` substituted).

Stop the server: `kill %1 2>/dev/null || true`.

- [ ] **Step 15: Commit T2**

```bash
git add site/src/components/atlas/ \
        site/src/pages/[lang]/learn/[track]/index.astro \
        site/src/i18n/ui.json
git status
```

Verify added: Altimeter / UnitMarker / LessonRow / ResumeCTA / TopicHeader / Summit / next-track.{ts,test.ts}, modified ui.json + index.astro.

```bash
git commit -m "$(cat <<'EOF'
feat(open-atlas): ascent scene on [lang]/learn/[track]/ route

Replaces the bare track listing with the cosmic ascent scroll-scene from
the open-atlas design. Atlas.astro layout, scroll-driven parallax World,
Altimeter on the left edge, Meridian with a fill that tracks scroll
progress, TopicHeader + ResumeCTA + per-unit markers with nested lesson
sub-rows + Summit with auto-linked next track by order+1.

Marker granularity decision: HYBRID — every unit is a meridian marker;
its lessons appear as sub-rows under the unit card. Preserves the
preview's compact cosmic rhythm (~12 markers per track) and scales
identically from ai-llm (8 lessons) to networking (76 lessons).

Resume CTA is a server-rendered "Start here" fallback; a tiny is:inline
script reads localStorage atlas.last.{track} and swaps the href + title
when present (no Preact island).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```bash
git log --oneline -3
```

Expected: T2 commit on top, then T1, then the spec commit.

---

## Task 3: T3 — light-zone lesson reading shell on `Lesson.astro`

**Files:**

- Create: `site/src/scripts/next-lesson.ts`
- Create: `site/src/scripts/next-lesson.test.ts`
- Create: `site/src/components/lesson/Topbar.astro`
- Create: `site/src/components/lesson/AltitudeGauge.astro`
- Create: `site/src/components/lesson/RightRail.astro`
- Create: `site/src/components/lesson/NextLessonCard.astro`
- Modify: `site/src/layouts/Lesson.astro`
- Modify: `site/src/pages/[lang]/learn/[track]/[lesson].astro` (to pass new props)
- Modify: `site/src/i18n/ui.json` (additive — new `lesson.*` keys, EN + RU)

- [ ] **Step 1: Write failing test for `next-lesson.ts`**

Create `site/src/scripts/next-lesson.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveNextLesson } from "./next-lesson";

const units = [
  { slug: "01-a", order: 1, lessons: ["01-x", "02-y"] },
  { slug: "02-b", order: 2, lessons: ["01-p", "02-q", "03-r"] },
  { slug: "03-c", order: 3, lessons: ["01-z"] },
];

describe("resolveNextLesson", () => {
  it("returns the next lesson in the same unit", () => {
    expect(resolveNextLesson(units, "01-a", "01-x")).toEqual({ unit: "01-a", slug: "02-y" });
  });

  it("falls back to the first lesson of the next unit", () => {
    expect(resolveNextLesson(units, "01-a", "02-y")).toEqual({ unit: "02-b", slug: "01-p" });
  });

  it("returns null when the lesson is the last in the last unit", () => {
    expect(resolveNextLesson(units, "03-c", "01-z")).toBeNull();
  });

  it("returns null when the unit is unknown", () => {
    expect(resolveNextLesson(units, "99-unknown", "01-x")).toBeNull();
  });

  it("returns null when the lesson is not in the named unit", () => {
    expect(resolveNextLesson(units, "01-a", "03-r")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd site && bun run vitest --run src/scripts/next-lesson.test.ts
```

Expected: FAIL — `Cannot find module './next-lesson'`.

- [ ] **Step 3: Implement `next-lesson.ts`**

Create `site/src/scripts/next-lesson.ts`:

```ts
export type UnitLite = {
  slug: string;
  order: number;
  lessons: readonly string[];
};

export type NextLesson = { unit: string; slug: string } | null;

export function resolveNextLesson(
  units: readonly UnitLite[],
  currentUnitSlug: string,
  currentLessonSlug: string,
): NextLesson {
  const unit = units.find((u) => u.slug === currentUnitSlug);
  if (!unit) return null;
  const idx = unit.lessons.indexOf(currentLessonSlug);
  if (idx === -1) return null;

  if (idx + 1 < unit.lessons.length) {
    return { unit: unit.slug, slug: unit.lessons[idx + 1] };
  }

  const nextUnit = units.find((u) => u.order === unit.order + 1);
  if (!nextUnit) return null;
  const firstSlug = nextUnit.lessons[0];
  if (!firstSlug) return null;
  return { unit: nextUnit.slug, slug: firstSlug };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd site && bun run vitest --run src/scripts/next-lesson.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Create `Topbar.astro`**

Create `site/src/components/lesson/Topbar.astro`:

```astro
---
import { t, type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  trackSlug: string;
  trackTitle: string;
  lessonTitle: string;
};
const { lang, trackSlug, trackTitle, lessonTitle } = Astro.props;
---

<header class="lesson-topbar">
  <a class="crumb" href={`/${lang}/`}>
    <span>{t("nav.atlas.atlas", lang)}</span><i>/</i>
    <a href={`/${lang}/learn/${trackSlug}/`} class="crumb-link">{trackTitle}</a><i>/</i>
    <b>{lessonTitle}</b>
  </a>
  <a class="back" href={`/${lang}/learn/${trackSlug}/`}>
    ↑ {t("lesson.backToClimb", lang)}
  </a>
</header>

<style>
  .lesson-topbar {
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px; padding: 14px 0;
    border-bottom: var(--rule-w) solid var(--rule);
    flex-wrap: nowrap;
  }
  .crumb {
    font-family: var(--font-mono); font-size: 11.5px; color: var(--muted);
    display: flex; align-items: center; gap: 7px;
    letter-spacing: 0.02em; min-width: 0;
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    text-decoration: none;
  }
  .crumb i { color: var(--muted-2); font-style: normal; }
  .crumb b {
    color: var(--ink); font-weight: 600;
    overflow: hidden; text-overflow: ellipsis;
  }
  .crumb-link {
    color: var(--muted); text-decoration: none;
  }
  .crumb-link:hover { color: var(--ink); }
  .back {
    font-family: var(--font-mono); font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.04em; text-decoration: none;
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .lesson-topbar { flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px 0; }
    .crumb, .back { font-size: 11px; }
  }
</style>
```

- [ ] **Step 6: Create `AltitudeGauge.astro`**

Create `site/src/components/lesson/AltitudeGauge.astro`:

```astro
---
import { t, type Locale } from "~/i18n";

type Level = "zero" | "junior" | "middle" | "senior";
type Props = { lang: Locale; level?: Level };
const { lang, level } = Astro.props;

const ORDER: Level[] = ["zero", "junior", "middle", "senior"];
const currentIdx = level ? ORDER.indexOf(level) : -1;
---

{level && (
  <div class="altitude">
    <span class="alt-cap">{t("lesson.altitude.cap", lang)}</span>
    <div class="alt-track">
      {ORDER.map((seg, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "is-here" : "";
        return <span class={`alt-seg ${state}`}>{t(`lesson.altitude.${seg}`, lang)}</span>;
      })}
    </div>
    <span class="alt-now">
      {t(`lesson.altitude.now.${level}`, lang)}
    </span>
  </div>
)}

<style>
  .altitude { margin-top: 26px; }
  .alt-cap {
    display: block; font-family: var(--font-mono); font-size: 10.5px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted-2);
    margin-bottom: 11px;
  }
  .alt-track { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .alt-seg {
    position: relative; font-family: var(--font-mono); font-size: 11.5px;
    text-align: center; padding: 10px 4px 0; color: var(--muted-2);
    border-top: 2px solid var(--rule);
  }
  .alt-seg.done {
    border-top-color: color-mix(in oklch, var(--accent) 45%, transparent);
    color: var(--muted);
  }
  .alt-seg.is-here {
    color: var(--accent); font-weight: 600;
    border-top-color: var(--accent);
  }
  .alt-seg.is-here::before {
    content: ""; position: absolute; top: -6px; left: 50%;
    transform: translateX(-50%); width: 9px; height: 9px; border-radius: 50%;
    background: var(--accent); border: 2px solid var(--paper);
  }
  .alt-now {
    display: block; font-family: var(--font-mono); font-size: 11px;
    color: var(--muted); margin-top: 11px; letter-spacing: 0.02em;
  }
</style>
```

- [ ] **Step 7: Create `RightRail.astro`**

Create `site/src/components/lesson/RightRail.astro`:

```astro
---
import { t, type Locale } from "~/i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---

<aside class="lesson-rail">
  <div class="rail-stick">
    <div class="prog">
      <div class="prog-row">
        <span>{t("lesson.rail.progress", lang)}</span>
        <span class="prog-pct" id="lessonProgPct">0%</span>
      </div>
      <div class="prog-bar"><span id="lessonProgBar" style="width:8%"></span></div>
    </div>

    <nav class="toc" id="lessonToc" aria-label={t("lesson.rail.toc", lang)}>
      <p class="toc-head">{t("lesson.rail.toc", lang)}</p>
      <div id="lessonTocLinks"></div>
    </nav>
  </div>
</aside>

<script is:inline>
  (function () {
    const tocRoot = document.getElementById("lessonTocLinks");
    const bar = document.getElementById("lessonProgBar");
    const pct = document.getElementById("lessonProgPct");
    if (!tocRoot || !bar || !pct) return;

    const headings = Array.from(document.querySelectorAll(".lesson-body h2"));
    let slugBase = 0;
    function slugify(text) {
      const base = text.toLowerCase()
        .replace(/[^a-z0-9Ѐ-ӿ\s-]/g, "")
        .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      return base || ("h-" + (slugBase++));
    }

    headings.forEach((h) => {
      if (!h.id) h.id = slugify(h.textContent || "");
      const a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent || "";
      a.className = "toc-link";
      a.setAttribute("data-target", h.id);
      tocRoot.appendChild(a);
    });

    const links = Array.from(tocRoot.querySelectorAll("a.toc-link"));

    function update() {
      const h = document.body.scrollHeight - innerHeight;
      const p = h > 0 ? Math.min(100, Math.max(0, Math.round((scrollY / h) * 100))) : 0;
      bar.style.width = Math.max(8, p) + "%";
      pct.textContent = p + "%";

      // Active heading: the last one whose top has scrolled past 1/3 of the viewport
      let activeIdx = -1;
      const threshold = innerHeight / 3;
      headings.forEach((h, i) => {
        if (h.getBoundingClientRect().top < threshold) activeIdx = i;
      });
      links.forEach((a, i) => a.classList.toggle("is-here", i === activeIdx));
    }
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    update();
  })();
</script>

<style>
  .lesson-rail { padding-top: 24px; }
  .rail-stick { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 22px; }
  .prog-row {
    display: flex; justify-content: space-between;
    font-family: var(--font-mono); font-size: 10.5px;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
  }
  .prog-pct { color: var(--accent); }
  .prog-bar { height: 3px; background: var(--rule); border-radius: 2px; margin-top: 7px; }
  .prog-bar span {
    display: block; height: 100%; background: var(--accent);
    border-radius: 2px; transition: width .15s;
  }
  .toc-head {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.13em; text-transform: uppercase;
    color: var(--muted-2); margin: 0 0 10px;
  }
  .toc { border-left: var(--rule-w) solid var(--rule); padding-left: 14px; }
  :global(.toc-link) {
    display: block; font-size: 13px; color: var(--muted);
    padding: 5px 0; transition: color .14s; text-decoration: none;
  }
  :global(.toc-link:hover) { color: var(--ink); }
  :global(.toc-link.is-here) { color: var(--accent); font-weight: 600; }
</style>
```

- [ ] **Step 8: Create `NextLessonCard.astro`**

Create `site/src/components/lesson/NextLessonCard.astro`:

```astro
---
import { t, type Locale } from "~/i18n";

type Props = {
  lang: Locale;
  nextHref: string | null;
  nextTitle: string | null;
};
const { lang, nextHref, nextTitle } = Astro.props;
---

{nextHref && nextTitle && (
  <a class="next-lesson" href={nextHref}>
    <span class="np-k">{t("lesson.continue", lang)}</span>
    <span class="np-t">{nextTitle}</span>
  </a>
)}

<style>
  .next-lesson {
    display: flex; flex-direction: column; gap: 4px; margin-top: 22px;
    border: var(--rule-w) solid var(--rule-strong); border-radius: 3px;
    padding: 14px 16px; text-align: right;
    transition: background .14s, border-color .14s;
    text-decoration: none;
  }
  .next-lesson:hover {
    background: var(--card-2); border-color: var(--accent);
  }
  .np-k {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent);
  }
  .np-t {
    font-family: var(--font-display); font-size: 17px; font-weight: 600;
    color: var(--ink);
  }
</style>
```

- [ ] **Step 9: Add i18n keys for the lesson chrome**

Modify `site/src/i18n/ui.json` — add inside the EN block:

```json
"lesson.backToClimb": "Back to the climb",
"lesson.continue": "Continue the climb ↑",
"lesson.cruxTag": "Crux",
"lesson.altitude.cap": "Your altitude — climbing toward senior",
"lesson.altitude.zero": "Zero",
"lesson.altitude.junior": "Junior",
"lesson.altitude.middle": "Middle",
"lesson.altitude.senior": "Senior",
"lesson.altitude.now.zero": "You are at zero altitude — the bedrock",
"lesson.altitude.now.junior": "You are at junior altitude — the surface",
"lesson.altitude.now.middle": "You are at middle altitude — in the sky",
"lesson.altitude.now.senior": "You are at senior altitude — in orbit",
"lesson.rail.progress": "Lesson progress",
"lesson.rail.toc": "On this page"
```

Add inside the RU block:

```json
"lesson.backToClimb": "Обратно к восхождению",
"lesson.continue": "Продолжить восхождение ↑",
"lesson.cruxTag": "Суть",
"lesson.altitude.cap": "Высота — путь к senior",
"lesson.altitude.zero": "Ноль",
"lesson.altitude.junior": "Junior",
"lesson.altitude.middle": "Middle",
"lesson.altitude.senior": "Senior",
"lesson.altitude.now.zero": "Ты на нуле — фундамент",
"lesson.altitude.now.junior": "Ты на junior-высоте — поверхность",
"lesson.altitude.now.middle": "Ты на middle-высоте — в небе",
"lesson.altitude.now.senior": "Ты на senior-высоте — в орбите",
"lesson.rail.progress": "Прогресс урока",
"lesson.rail.toc": "На этой странице"
```

Verify: `cd site && jq . src/i18n/ui.json > /dev/null && echo OK`.

- [ ] **Step 10: Extend `Lesson.astro` with chrome + scoped body typography**

Replace the entire contents of `site/src/layouts/Lesson.astro`:

```astro
---
import Topic from "~/layouts/Topic.astro";
import { getCollection } from "astro:content";
import { t, type Locale } from "~/i18n";
import ConnectedLessons, { type ConnectionMeta } from "~/components/lesson/ConnectedLessons.astro";
import { resolveConnections, type LessonDescriptor } from "~/scripts/connections-index";
import { resolveNextLesson } from "~/scripts/next-lesson";
import Topbar from "~/components/lesson/Topbar.astro";
import AltitudeGauge from "~/components/lesson/AltitudeGauge.astro";
import RightRail from "~/components/lesson/RightRail.astro";
import NextLessonCard from "~/components/lesson/NextLessonCard.astro";

type Level = "zero" | "junior" | "middle" | "senior";
type Props = {
  title: string;
  lang: Locale;
  trackSlug: string;
  unitSlug: string;
  summary: string;
  estMin: number;
  sources: string[];
  lessonType?: "concept" | "coding" | "topic";
  level?: Level;
  /** Required for topic lessons: "<track>/<unit>/<slug>" */
  lessonKey?: string;
  /** Lesson slug — used for the last-visited write */
  slug: string;
};

const {
  title, lang, trackSlug, unitSlug, summary, estMin, sources,
  lessonType, level, lessonKey, slug,
} = Astro.props;

// Resolve track title for the breadcrumb
const allTracks = await getCollection("tracks");
const trackEntry = allTracks.find((t) => t.data.slug === trackSlug);
const trackTitle = trackEntry?.data.title[lang] ?? trackSlug;

// Resolve connections graph (existing behaviour)
let connections: {
  buildsOn: string[]; unlocks: string[];
  deepensInto: string[]; appearsAgainIn: string[];
} | null = null;
let metaLookup: Record<string, ConnectionMeta> = {};

const allLessons = await getCollection("lessons");

if (lessonType === "topic" && lessonKey) {
  const descriptors: LessonDescriptor[] = allLessons
    .filter((e) => e.data.lang === "en")
    .map((e) => ({
      id: `${e.data.track}/${e.data.unit}/${e.data.slug}`,
      track: e.data.track,
      unit: e.data.unit,
      order: e.data.order,
      level: (e.data.level ?? "junior") as LessonDescriptor["level"],
      prereqs: e.data.prereqs ?? [],
      deepensInto: e.data.deepensInto ?? [],
      spiral: e.data.spiral ?? [],
    }));

  const connMap = resolveConnections(descriptors);
  connections = connMap[lessonKey] ?? null;

  if (connections) {
    const localeEntries = allLessons.filter((e) => e.data.lang === lang);
    const byKey = new Map(localeEntries.map((e) => [
      `${e.data.track}/${e.data.unit}/${e.data.slug}`, e,
    ]));
    const allIds = [
      ...connections.buildsOn,
      ...connections.unlocks,
      ...connections.deepensInto,
      ...connections.appearsAgainIn,
    ];
    for (const id of allIds) {
      const entry = byKey.get(id);
      if (!entry) continue;
      metaLookup[id] = {
        title: entry.data.title,
        level: entry.data.level,
        track: entry.data.track,
        unit: entry.data.unit,
        href: `/${lang}/learn/${entry.data.track}/${entry.data.slug}`,
      };
    }
  }
}

// Resolve next-lesson card (within unit, fallback to next unit's first lesson)
const trackUnits = (await getCollection("units"))
  .filter((u) => u.data.track === trackSlug)
  .sort((a, b) => a.data.order - b.data.order)
  .map((u) => ({ slug: u.data.slug, order: u.data.order, lessons: u.data.lessons }));

const next = resolveNextLesson(trackUnits, unitSlug, slug);
const nextLessonEntry = next
  ? allLessons.find((l) => l.data.lang === lang && l.data.track === trackSlug && l.data.slug === next.slug)
  : null;
const nextHref = next ? `/${lang}/learn/${trackSlug}/${next.slug}/` : null;
const nextTitle = nextLessonEntry?.data.title ?? null;

// For the last-visited write
const lessonHref = `/${lang}/learn/${trackSlug}/${slug}/`;
---

<Topic title={title} lang={lang} sources={sources}>
  <Topbar lang={lang} trackSlug={trackSlug} trackTitle={trackTitle} lessonTitle={title} />

  <div class="lesson-shell">
    <article class="lesson-body" data-lesson-type={lessonType}>
      <header class="lesson-head">
        <p class="lesson-kicker">{trackTitle}</p>
        <h1 class="lesson-title">{title}</h1>
        <div class="lesson-crux">
          <span class="crux-tag">{t("lesson.cruxTag", lang)}</span>
          {summary}
        </div>

        <AltitudeGauge lang={lang} level={level} />

        <div class="hdr-meta">
          <span class="hm">◷ {estMin} min</span>
        </div>
      </header>

      <div class="lesson-content">
        <slot />
      </div>

      {lessonType === "topic" && connections && (
        <ConnectedLessons
          lang={lang}
          buildsOn={connections.buildsOn}
          unlocks={connections.unlocks}
          deepensInto={connections.deepensInto}
          appearsAgainIn={connections.appearsAgainIn}
          meta={metaLookup}
        />
      )}

      <NextLessonCard lang={lang} nextHref={nextHref} nextTitle={nextTitle} />
    </article>

    <RightRail lang={lang} />
  </div>
</Topic>

<script is:inline define:vars={{ trackSlug, slug, title, lessonHref }}>
  try {
    localStorage.setItem(
      "atlas.last." + trackSlug,
      JSON.stringify({ slug, title, href: lessonHref, at: Date.now() })
    );
  } catch (_) { /* private browsing, storage full, etc. — non-fatal */ }
</script>

<style>
  .lesson-shell {
    max-width: 1080px; margin: 0 auto; padding: 0 32px;
    display: grid; grid-template-columns: minmax(0, 1fr) 232px; gap: 56px;
    align-items: start;
  }
  .lesson-body { padding: 40px 0 64px; min-width: 0; max-width: 680px; }
  .lesson-kicker {
    font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--muted); margin: 0 0 14px;
  }
  .lesson-title {
    font-family: var(--font-display); font-size: clamp(34px, 5vw, 46px);
    font-weight: 600; line-height: 1.08; letter-spacing: -0.015em; margin: 0;
  }
  .lesson-crux {
    margin: 22px 0 0; padding: 16px 0 16px 20px;
    border-left: 2px solid var(--accent);
    font-family: var(--font-display); font-size: 19px; line-height: 1.5;
    color: var(--ink-2);
  }
  .crux-tag {
    display: block; font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent);
    margin-bottom: 7px;
  }
  .hdr-meta {
    display: flex; flex-wrap: wrap; gap: 18px; margin-top: 22px;
    padding-top: 18px; border-top: var(--rule-w) solid var(--rule);
  }
  .hm {
    font-family: var(--font-mono); font-size: 11px; color: var(--muted);
    letter-spacing: 0.03em;
  }

  /* ── editorial prose, scoped to MDX content body ── */
  .lesson-content { margin-top: 30px; }
  .lesson-content :global(h2) {
    font-family: var(--font-display); font-size: 25px; font-weight: 600;
    letter-spacing: -0.01em; margin: 38px 0 14px;
  }
  .lesson-content :global(h3) {
    font-family: var(--font-display); font-size: 19px; font-weight: 600;
    margin: 28px 0 10px;
  }
  .lesson-content :global(p) {
    font-size: 16.5px; line-height: 1.72; color: var(--ink-2); margin: 0 0 16px;
  }
  .lesson-content :global(code) {
    font-family: var(--font-mono); font-size: 0.85em;
    background: var(--card-2); padding: 1px 5px; border-radius: 2px;
  }
  .lesson-content :global(pre) {
    background: var(--card); border: var(--rule-w) solid var(--rule);
    border-radius: 3px; padding: 14px 16px; overflow-x: auto;
    font-size: 13px; line-height: 1.55;
  }
  .lesson-content :global(pre code) {
    background: transparent; padding: 0; border-radius: 0;
  }
  .lesson-content :global(ul),
  .lesson-content :global(ol) {
    font-size: 16.5px; line-height: 1.72; color: var(--ink-2);
    margin: 0 0 16px; padding-left: 24px;
  }
  .lesson-content :global(li) { margin-bottom: 6px; }
  .lesson-content :global(blockquote) {
    border-left: 2px solid var(--rule-strong); padding-left: 16px;
    color: var(--muted); font-style: italic; margin: 16px 0;
  }
  .lesson-content :global(figure) { margin: 24px 0; }
  .lesson-content :global(figcaption) {
    font-family: var(--font-mono); font-size: 11px; color: var(--muted);
    margin-top: 9px; letter-spacing: 0.02em;
  }

  @media (max-width: 880px) {
    .lesson-shell { grid-template-columns: 1fr; gap: 0; padding-left: 20px; padding-right: 20px; }
    .lesson-body { max-width: 100%; }
    .lesson-rail { display: none; }
  }
</style>
```

- [ ] **Step 11: Update the lesson route to pass `slug` and `level`**

Modify `site/src/pages/[lang]/learn/[track]/[lesson].astro` to pass the two new props through to the layout. Replace the file body:

```astro
---
import { getCollection, render } from "astro:content";
import Lesson from "~/layouts/Lesson.astro";
import { type Locale, isLocale } from "~/i18n";

export async function getStaticPaths() {
  const all = await getCollection("lessons");
  return all.map((entry) => ({
    params: { lang: entry.data.lang, track: entry.data.track, lesson: entry.data.slug },
    props: { entry },
  }));
}

const { lang } = Astro.params as { lang: Locale; track: string; lesson: string };
if (!isLocale(lang)) throw new Error("bad lang");

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<Lesson
  title={entry.data.title}
  lang={lang}
  trackSlug={entry.data.track}
  unitSlug={entry.data.unit}
  slug={entry.data.slug}
  summary={entry.data.summary}
  estMin={entry.data.estMin}
  sources={entry.data.sources}
  lessonType={entry.data.lessonType}
  level={entry.data.level}
  lessonKey={`${entry.data.track}/${entry.data.unit}/${entry.data.slug}`}
>
  <Content />
</Lesson>
```

- [ ] **Step 12: Run the build gate**

```bash
cd site && bun run build
```

Expected: build succeeds.

```bash
cd site && jq '{errors: (.violations | map(select(.severity == "error")) | length)}' dist/lint-report.json
```

Expected: `{"errors": 0}`.

```bash
find site/dist -name "index.html" | wc -l
```

Expected: ~2361 pages (unchanged).

- [ ] **Step 13: Manual visual verification — lesson types and mobile**

```bash
cd site && python3 -m http.server 4400 -d dist >/dev/null 2>&1 &
sleep 1
```

Verify in a browser:

- `http://localhost:4400/en/learn/networking/01-bits-on-the-wire/` (or any networking lesson) — topbar breadcrumb, altitude gauge at junior, right rail with progress + TOC built from `<h2>`, next-lesson card at the bottom.
- A lesson with no `level` frontmatter — altitude gauge is omitted (graceful).
- Resize the browser to 360px wide — topbar reflows (breadcrumb above "Back to the climb"), right rail hidden, content unaffected.
- Visit two lessons in the same track in sequence, then go to that track's index page — ResumeCTA shows the second lesson visited.

Stop the server: `kill %1 2>/dev/null || true`.

- [ ] **Step 14: Verify hydration cap is unchanged**

The lint rule `hydration-cap` enforces ≤5 islands on lesson pages. T3 adds zero new islands.

```bash
cd site && jq '.violations[] | select(.rule == "hydration-cap")' dist/lint-report.json
```

Expected: empty (no violations).

- [ ] **Step 15: Commit T3**

```bash
git add site/src/components/lesson/ \
        site/src/scripts/next-lesson.ts \
        site/src/scripts/next-lesson.test.ts \
        site/src/layouts/Lesson.astro \
        site/src/pages/[lang]/learn/[track]/[lesson].astro \
        site/src/i18n/ui.json
git status
```

Verify added: 4 new lesson chrome components + next-lesson.{ts,test.ts}, modified Lesson.astro + lesson route + ui.json.

```bash
git commit -m "$(cat <<'EOF'
feat(open-atlas): light-zone lesson reading shell

Extends Lesson.astro with the open-atlas editorial chrome from the
lesson-preview shell: Topbar with breadcrumb + "Back to the climb",
AltitudeGauge driven by frontmatter level, RightRail with sticky scroll
progress + auto-built TOC (no Preact island; is:inline script reads
.lesson-body h2 after DOMContentLoaded), and NextLessonCard ("Continue
the climb ↑") that resolves the next slug in-unit, falling back to the
first lesson of the next unit by order.

Body typography ported from lesson-preview.astro into a scoped style
block on .lesson-content (serif h2, monospace code, 16.5px/1.72 body).
ConnectedLessons block kept verbatim — the Phase A work it carried is
preserved.

Mobile fix: at ≤640px the topbar stacks the breadcrumb above the back
link, killing the HANDOFF "Back to the climb crowding" bug.

Lesson page also writes localStorage.atlas.last.{track} on every load,
which the topic-page ResumeCTA reads to restore the user's place. Zero
new hydration islands; cap stays at 5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```bash
git log --oneline -4
```

Expected: T3 commit on top, then T2, T1, spec.

---

## Task 4: T4 — retire preview routes

**Files:**

- Delete: `site/src/pages/topic-preview.astro`
- Delete: `site/src/pages/lesson-preview.astro`

This task only runs after T1, T2, T3 are committed AND manually verified on the running preview server.

- [ ] **Step 1: Final verification before retiring previews**

Run the full build once more:

```bash
cd site && bun run build && \
  jq '{errors: (.violations | map(select(.severity == "error")) | length)}' dist/lint-report.json
```

Expected: build succeeds, errors = 0.

Spin up the preview server and confirm all three production routes render correctly (do **not** rely on the preview routes still being present):

```bash
cd site && python3 -m http.server 4400 -d dist >/dev/null 2>&1 &
sleep 1
```

- `http://localhost:4400/en/` — cosmic home renders
- `http://localhost:4400/en/learn/networking/` — ascent topic renders
- `http://localhost:4400/en/learn/networking/01-bits-on-the-wire/` (or any real lesson) — editorial shell renders

Stop the server: `kill %1 2>/dev/null || true`.

- [ ] **Step 2: Delete the preview routes**

```bash
git rm site/src/pages/topic-preview.astro \
       site/src/pages/lesson-preview.astro
```

- [ ] **Step 3: Run the build gate**

```bash
cd site && bun run build
```

Expected: build succeeds.

```bash
cd site && jq '{errors: (.violations | map(select(.severity == "error")) | length)}' dist/lint-report.json
```

Expected: `{"errors": 0}`.

```bash
find site/dist -name "index.html" | wc -l
```

Expected: 2359 (drops by 2 from the prior 2361 — one page per deleted preview route).

- [ ] **Step 4: Commit T4**

```bash
git status
```

Verify only the two deletions are staged.

```bash
git commit -m "$(cat <<'EOF'
chore(open-atlas): retire preview routes — content now on production routes

T1 wired the cosmic home into [lang]/index.astro; T2 wired the ascent
scene into [lang]/learn/[track]/index.astro; T3 ported the editorial
shell into Lesson.astro. The standalone /topic-preview and
/lesson-preview routes are no longer load-bearing.

Page count: 2361 → 2359.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

```bash
git log --oneline -5
```

Expected, top to bottom:

```
chore(open-atlas): retire preview routes — content now on production routes
feat(open-atlas): light-zone lesson reading shell
feat(open-atlas): ascent scene on [lang]/learn/[track]/ route
feat(open-atlas): cosmic home on [lang]/ route
docs(open-atlas): spec for design wire-up to production routes
```

---

## End-of-session report

After T4 commits cleanly, produce a one-paragraph end-of-session summary that includes:

1. The four implementation commit SHAs (use `git log --oneline -5`).
2. The final page count (`find site/dist -name "index.html" | wc -l`).
3. The visual decision on topic-page marker granularity — **hybrid: unit markers on the meridian with nested lesson sub-rows, decided during brainstorming** (see Q1 in the spec). The decision is also documented in the T2 commit body so future readers can grep the rationale without opening the spec.
4. Branch name: `design-wireup`. NOT pushed, NOT merged to main — left for review.

If any task's build gate failed and was recovered from, note the recovery commit(s) too.
