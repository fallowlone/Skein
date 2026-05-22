# Atlas World — cinematic Dawn parallax Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat dark parallax backdrop in `World.astro` with a cinematic, colorful "Dawn" scene (continuous gradient, sun glow + god rays, layered hills, grass + wildflowers, textured earth, branching roots, glowing buried crystal) with motion-gated ambient drift.

**Architecture:** Single component, `site/src/components/atlas/World.astro`. Keep the existing 5-layer / 400vh / parallax-lerp system untouched. Replace the four per-zone background gradients with one continuous strip gradient. Add scene elements as percentage-positioned absolute SVG/`div` blocks inside the existing layers (same idiom as the current stars/clouds/veins), so every element aligns to the strip by `top %` and the horizon sits exactly at 50%. Animation is CSS keyframes scoped under `.atlas-world.motion-on`, a class the inline script sets whenever motion is enabled (in both parallax and static contexts).

**Tech Stack:** Astro 5 component, inline SVG, CSS (gradients, transforms, keyframes), one `<script is:inline>`. No new islands, no new dependencies.

---

## Verification model (read first)

This project has **no component unit tests**; the correctness gate is the build +
linter + a browser visual check (per `CLAUDE.md`). So in every task the "test"
steps are:

- **Build/lint:** `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
  → expect it to finish without error and print the page count (~301). Then the
  linter output `dist/lint-report.json` must have **no new violations** (World is
  not lint-scoped content, but a broken build/MDX would fail here).
- **Visual:** `cd /Users/artemmac/dev/awesome-everything/site && bun run dev`,
  open the printed localhost URL at `/en/learn/algorithms/` (a parallax track
  page) and `/en/` (static home), scroll the full page, and confirm the criteria
  listed in the task.

Keep `bun run dev` running across tasks in a second terminal to avoid restart
churn; Astro hot-reloads `World.astro` edits.

## File map

- **Modify only:** `site/src/components/atlas/World.astro`
  - frontmatter (recolor `clouds`, drop `veins`, add `particles`)
  - markup (gradient strip, scene SVG blocks, layer rename `awVeins`→`awRoots`)
  - `<script is:inline>` (set `motion-on` class in both contexts; update layer id list)
  - `<style>` (continuous gradient, scene element styles, keyframes)

No other files change. No consumer (`index.astro`, `learn/[track]/index.astro`) changes.

---

### Task 1: Continuous Dawn gradient + zone cleanup + motion-on class + roots rename

**Files:**
- Modify: `site/src/components/atlas/World.astro`

This task lays the foundation: one strip gradient, zone divs kept only for labels +
horizon, the `awVeins`→`awRoots` rename, and the inline script setting `motion-on`
in both contexts. No new scene art yet — but the build stays green and the
backdrop already looks like a continuous dawn.

- [ ] **Step 1: Replace the four per-zone background rules with one strip gradient**

In `<style>`, replace the block from `.z-space { background: …` through the end of
`.z-under { … }` (the four zone background rules) with a single gradient on the
strip and stripped-down zone rules:

```css
  .atlas-world-strip {
    background: linear-gradient(to bottom,
      #06060f 0%,
      #0a0e26 12%,
      #161a40 28%,
      #3b2f63 40%,
      #8a4f6a 47%,
      #d98a5e 50%,
      #f6b07a 51%,
      #3a2410 54%,
      #1c130a 75%,
      #0b0805 100%);
  }
  .zone { position: absolute; left: 0; right: 0; height: 25%; }
  .z-space  { top: 0; }
  .z-sky    { top: 25%; }
  .z-grass  { top: 50%; }
  .z-under  { top: 75%; }
```

(The `.zone { … overflow:hidden }` and the four `top` rules already exist; the key
changes are: remove `overflow:hidden` from `.zone` so glow/labels are not clipped,
add `.atlas-world-strip` gradient, and delete the four `background:` rules.)

- [ ] **Step 2: Move the horizon stroke to exactly 50% of the strip**

The `.horizon` currently sits at the top of `z-grass` (which is 50%). Keep it but
make it a warm dawn line. Replace the `.horizon` rule with:

```css
  .horizon {
    position: absolute; left: 0; right: 0; top: 0; height: 1px;
    background: linear-gradient(to right, transparent,
      rgba(246, 201, 138, 0.55) 50%, transparent);
  }
```

- [ ] **Step 3: Rename the veins layer to roots (markup + script + style + data)**

In the frontmatter, delete the `veins` array (lines defining `const veins = …`).
In the markup, delete the entire `<div class="layer" id="awVeins"> … </div>` block
(it will be re-added as roots in Task 5). In `<style>`, delete the `.vein` rule. In
the inline script's `layers` array, change the line
`[document.getElementById("awVeins"), 1.15],` to
`[document.getElementById("awRoots"), 1.15],`.

(Removing the markup block now means `getElementById("awRoots")` returns null until
Task 5; the script already `.filter((l) => l[0])`s out missing layers, so this is
safe.)

- [ ] **Step 4: Set `motion-on` class in BOTH contexts**

In `<script is:inline>`, the function currently `return`s early when
`data-parallax !== "true"`, so the static home context never evaluates motion.
Restructure the top of the IIFE so the motion class is set first, regardless of
parallax mode. Replace from `const world = document.querySelector(".atlas-world");`
down to (but not including) the `// [layer element, speed factor]` comment with:

```js
    const world = document.querySelector(".atlas-world");
    if (!world) return;

    // Respect prefers-reduced-motion + the site's motion override key
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const override = localStorage.getItem("awesome.motion");
    const enabled = override === "on" ? true : override === "off" ? false : !reduce;
    if (enabled) world.classList.add("motion-on");

    // Parallax coupling only runs in parallax mode with motion enabled
    if (world.getAttribute("data-parallax") !== "true") return;
    if (!enabled) return;
```

- [ ] **Step 5: Build**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: build succeeds, ~301 pages, no error. `dist/lint-report.json` unchanged
violation count.

- [ ] **Step 6: Visual check**

With `bun run dev`, open `/en/learn/algorithms/` and scroll top→bottom: the
backdrop is now a single continuous gradient (deep space at the summit → violet →
a crisp warm dawn line at the surface → amber underground), **no visible seams**
between the old zones. Zone labels (Orbit/Sky/Surface/Underground) still show.
Open `/en/`: home backdrop shows deep-space top, intact layout.

- [ ] **Step 7: Commit**

```bash
git add site/src/components/atlas/World.astro
git commit -m "feat(atlas): continuous Dawn gradient + motion-on class + roots rename"
```

---

### Task 2: Hills + grass + wildflowers + crumbled soil edge

**Files:**
- Modify: `site/src/components/atlas/World.astro`

Adds the horizon-band scene SVG (4 rim-lit hill layers, varied grass clumps,
colored wildflowers, irregular soil top edge) on `awBase`, straddling the 50% line.

- [ ] **Step 1: Add the hills/grass SVG inside `awBase`**

In the markup, inside `<div class="atlas-world-strip layer" id="awBase">`, AFTER the
four `.zone` divs, add:

```astro
    <svg class="scene-hills" viewBox="0 0 240 120" preserveAspectRatio="none" aria-hidden="true">
      <!-- hills: far(cool)→near(green), atmospheric perspective -->
      <path d="M0 64 Q60 50 120 60 T240 56 V120 H0 Z" fill="#43406e"/>
      <path d="M0 64 Q60 50 120 60 T240 56" fill="none" stroke="#f6c98a" stroke-width="0.8" opacity=".5"/>
      <path d="M0 74 Q70 60 140 70 T240 66 V120 H0 Z" fill="#2f5a52"/>
      <path d="M0 74 Q70 60 140 70 T240 66" fill="none" stroke="#ffd9a0" stroke-width="0.8" opacity=".35"/>
      <path d="M0 82 Q50 75 130 82 T240 79 V120 H0 Z" fill="#2c6b3f"/>
      <path d="M0 90 Q60 85 150 90 T240 88 V120 H0 Z" fill="#236233"/>
      <!-- crumbled soil top edge -->
      <path d="M0 96 q10 -3 18 0 q8 4 16 0 q9 -4 18 1 q8 3 15 -1 q10 -3 19 1 q8 3 16 -1 q9 -4 18 1 q8 3 15 -1 q10 -3 19 1 q8 3 16 -1 q9 -3 17 1 V120 H0 Z" fill="#3a2410"/>
      <!-- grass clumps, two greens -->
      <g stroke-linecap="round" fill="none">
        <g stroke="#2f6a44" stroke-width="1.4">
          <path d="M10 92 q-2 -10 -4 -15"/><path d="M16 92 q1 -8 2 -13"/><path d="M22 92 q-1 -11 -3 -16"/>
          <path d="M58 91 q-2 -9 -3 -14"/><path d="M64 91 q1 -11 3 -16"/><path d="M70 91 q-1 -8 -2 -13"/>
          <path d="M114 91 q-2 -11 -4 -17"/><path d="M120 91 q1 -9 2 -14"/><path d="M126 91 q-1 -12 -3 -18"/>
          <path d="M170 90 q-2 -9 -3 -14"/><path d="M176 90 q1 -11 3 -17"/><path d="M182 90 q-1 -8 -2 -13"/>
          <path d="M214 89 q-2 -10 -4 -15"/><path d="M220 89 q1 -9 2 -14"/>
        </g>
        <g stroke="#52a86a" stroke-width="1.2">
          <path d="M13 92 q3 -8 6 -12"/><path d="M67 91 q-3 -8 -5 -12"/><path d="M123 91 q3 -9 6 -13"/><path d="M179 90 q-3 -8 -5 -11"/>
        </g>
      </g>
      <!-- wildflowers (the colorful pop) -->
      <g>
        <circle cx="40" cy="84" r="1.6" fill="#ffd86a"/>
        <circle cx="92" cy="83" r="1.6" fill="#ff8d6a"/>
        <circle cx="150" cy="82" r="1.6" fill="#ffeede"/>
        <circle cx="198" cy="83" r="1.6" fill="#ffb14d"/>
      </g>
    </svg>
```

- [ ] **Step 2: Add `.scene-hills` positioning style**

In `<style>`, add:

```css
  .scene-hills {
    position: absolute; left: 0; right: 0;
    top: 43%; height: 12%; width: 100%;
  }
```

(`top:43% height:12%` → band spans 43–55% of the strip; the crumbled soil edge at
viewBox y96/120 = 80% of band lands at strip 43+0.8*12 ≈ 52.6%, just below the 50%
horizon — correct.)

- [ ] **Step 3: Build**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: success, ~301 pages, no error.

- [ ] **Step 4: Visual check**

`/en/learn/algorithms/`: at the surface band there are now layered hills with a
warm rim-light on the top ridges, clustered grass blades in two greens, four
colored wildflower dots, and an irregular soil edge meeting the underground. The
horizon line still reads at 50%. Adjust `top`/`height` of `.scene-hills` by a
percent if the grass sits visibly above/below the dawn line.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/atlas/World.astro
git commit -m "feat(atlas): rim-lit hills, grass clumps, wildflowers, crumbled soil edge"
```

---

### Task 3: Sun glow + god rays + warm clouds

**Files:**
- Modify: `site/src/components/atlas/World.astro`

Adds the horizon light source: a radial sun glow at 50%, a fan of soft god rays in
the sky, and recolors the existing clouds to warm dawn haze.

- [ ] **Step 1: Add the god-rays SVG and sun-glow div inside `awBase`**

In the markup, inside `awBase`, BEFORE the `.scene-hills` svg (so rays/glow render
behind the hills), add:

```astro
    <svg class="scene-rays" viewBox="0 0 240 240" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="awRay" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#ffe6bf" stop-opacity=".22"/>
          <stop offset="1" stop-color="#ffe6bf" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="rays">
        <path d="M120 240 L60 0 L84 0 Z" fill="url(#awRay)"/>
        <path d="M120 240 L98 0 L114 0 Z" fill="url(#awRay)"/>
        <path d="M120 240 L138 0 L156 0 Z" fill="url(#awRay)"/>
        <path d="M120 240 L176 0 L198 0 Z" fill="url(#awRay)"/>
      </g>
    </svg>
    <div class="sun-glow"></div>
    <div class="sun-core"></div>
```

- [ ] **Step 2: Add styles for rays, sun glow, sun core**

In `<style>`, add:

```css
  .scene-rays {
    position: absolute; left: 0; right: 0;
    top: 26%; height: 24%; width: 100%;
    filter: blur(2px);
  }
  .rays { transform-origin: 50% 100%; }
  .sun-glow {
    position: absolute; left: 50%; top: 50%;
    width: 130%; height: 22%;
    transform: translate(-50%, -50%);
    background: radial-gradient(closest-side,
      rgba(255,230,191,0.55) 0%, rgba(255,199,133,0.28) 40%, transparent 75%);
  }
  .sun-core {
    position: absolute; left: 50%; top: 50%;
    width: 60px; height: 24px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #fff1d8;
    filter: blur(8px);
  }
```

- [ ] **Step 3: Recolor clouds to warm dawn haze**

In the frontmatter, the `clouds` array stays. In `<style>`, replace the `.cloud`
rule with:

```css
  .cloud {
    position: absolute; border-radius: 50%; background: #e0b29a;
    filter: blur(34px);
  }
```

- [ ] **Step 4: Build**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: success, ~301 pages, no error.

- [ ] **Step 5: Visual check**

`/en/learn/algorithms/`: a warm radial glow + soft bright core now sits on the
horizon; faint god-ray wedges fan upward into the sky behind the hills; clouds read
as warm dawn haze (not blue). The glow should not blow out the text band — if the
content over the surface is hard to read, lower the `.sun-glow` alpha values.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/atlas/World.astro
git commit -m "feat(atlas): horizon sun glow, god rays, warm dawn clouds"
```

---

### Task 4: Underground texture — strata, speckle, faceted rocks

**Files:**
- Modify: `site/src/components/atlas/World.astro`

- [ ] **Step 1: Add the underground SVG inside `awBase`**

In the markup, inside `awBase`, AFTER the `.scene-hills` svg, add:

```astro
    <svg class="scene-earth" viewBox="0 0 240 460" preserveAspectRatio="none" aria-hidden="true">
      <!-- strata -->
      <g stroke="#4a3018" stroke-width="1" fill="none">
        <path d="M0 80 q60 5 120 0 t120 -1" opacity=".5"/>
        <path d="M0 200 q70 -5 140 1 t100 0" opacity=".35" stroke-dasharray="7 9"/>
        <path d="M0 330 q60 5 130 -1 t110 1" opacity=".28"/>
      </g>
      <!-- speckle pebbles -->
      <g fill="#3a2a1a" opacity=".5">
        <circle cx="30" cy="120" r="1.6"/><circle cx="90" cy="150" r="1.2"/>
        <circle cx="200" cy="110" r="1.7"/><circle cx="60" cy="250" r="1.3"/>
        <circle cx="150" cy="270" r="1.4"/><circle cx="210" cy="320" r="1.2"/>
        <circle cx="40" cy="370" r="1.4"/><circle cx="120" cy="400" r="1.2"/>
      </g>
      <!-- faceted rocks (lit / body / shadow) -->
      <g>
        <path d="M34 150 L52 120 L78 132 L86 162 L58 182 L38 174 Z" fill="#2a1c0e"/>
        <path d="M52 120 L78 132 L62 146 L42 142 Z" fill="#4a3520"/>
        <path d="M78 132 L86 162 L58 182 L62 146 Z" fill="#1c1208"/>
      </g>
      <g>
        <path d="M158 300 L182 268 L210 282 L216 314 L186 336 L162 326 Z" fill="#2a1c0e"/>
        <path d="M182 268 L210 282 L192 296 L168 290 Z" fill="#4a3520"/>
        <path d="M210 282 L216 314 L186 336 L192 296 Z" fill="#1c1208"/>
      </g>
    </svg>
```

- [ ] **Step 2: Add `.scene-earth` positioning style**

In `<style>`, add:

```css
  .scene-earth {
    position: absolute; left: 0; right: 0;
    top: 54%; height: 46%; width: 100%;
  }
```

- [ ] **Step 3: Build**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: success, ~301 pages, no error.

- [ ] **Step 4: Visual check**

`/en/learn/algorithms/`: scrolling into the underground band shows three strata
separators (one dashed), scattered pebble specks, and two faceted rocks reading as
3-D (lit top, dark side). Colors stay warm/earthy against the amber gradient.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/atlas/World.astro
git commit -m "feat(atlas): underground strata, speckle, faceted rocks"
```

---

### Task 5: Buried crystal + glow + light shafts + roots layer

**Files:**
- Modify: `site/src/components/atlas/World.astro`

Adds the payoff crystal (on `awBase`) and re-adds the `awRoots` layer (renamed from
veins in Task 1) with branching gold roots reaching toward the crystal.

- [ ] **Step 1: Add the crystal SVG inside `awBase`**

In the markup, inside `awBase`, AFTER the `.scene-earth` svg, add:

```astro
    <svg class="scene-crystal" viewBox="0 0 240 160" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="awGem" cx="50%" cy="55%" r="60%">
          <stop offset="0" stop-color="#ffd98f" stop-opacity=".8"/>
          <stop offset="1" stop-color="#ffd98f" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse class="gem-glow" cx="120" cy="86" rx="70" ry="52" fill="url(#awGem)"/>
      <g>
        <path d="M110 72 L120 52 L130 72 L120 110 Z" fill="#ffd98f"/>
        <path d="M110 72 L120 52 L120 110 Z" fill="#d8a85a"/>
        <path d="M130 72 L120 52 L120 110 Z" fill="#fff0c8"/>
        <path d="M94 82 L101 66 L108 82 L101 104 Z" fill="#e8be72"/>
        <path d="M101 66 L108 82 L101 104 Z" fill="#c79a4e"/>
        <path d="M132 78 L139 64 L146 78 L139 100 Z" fill="#f0c878"/>
        <path d="M139 64 L146 78 L139 100 Z" fill="#caa45a"/>
      </g>
    </svg>
```

- [ ] **Step 2: Add the `awRoots` layer AFTER `awStarNear` in the markup**

In the markup, after the `<div class="layer" id="awStarNear"> … </div>` block, add:

```astro
  <div class="layer" id="awRoots">
    <svg class="scene-roots" viewBox="0 0 240 340" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="#d8b06a" fill="none" stroke-linecap="round">
        <path d="M120 0 q-5 60 -11 104 q-4 34 1 64" stroke-width="1.3" opacity=".4"/>
        <path d="M120 0 q16 80 40 150" stroke-width="1.1" opacity=".4"/>
        <path d="M112 68 q-22 12 -34 22" stroke-width="1" opacity=".3"/>
        <path d="M116 130 q20 18 38 24" stroke-width="1" opacity=".3"/>
        <path d="M150 160 q8 22 12 34" stroke-width="1" opacity=".35"/>
        <path d="M108 200 q-18 16 -28 32" stroke-width=".9" opacity=".25"/>
      </g>
    </svg>
  </div>
```

- [ ] **Step 3: Add styles for crystal, glow, roots**

In `<style>`, add:

```css
  .scene-crystal {
    position: absolute; left: 0; right: 0;
    top: 78%; height: 16%; width: 100%;
  }
  .scene-roots {
    position: absolute; left: 0; right: 0;
    top: 54%; height: 34%; width: 100%;
  }
```

- [ ] **Step 4: Build**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: success, ~301 pages, no error.

- [ ] **Step 5: Visual check**

`/en/learn/algorithms/`: deep in the underground there is now a faceted gold
crystal cluster with a soft glow behind it; gold roots branch down from the grass
base toward the crystal (roots sit on the fastest parallax layer, so they drift
slightly faster than the earth when scrolling). Confirm the crystal sits in the
deep band (~78–94%), below the rocks, not overlapping the surface.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/atlas/World.astro
git commit -m "feat(atlas): buried gold crystal, glow, branching roots layer"
```

---

### Task 6: Drifting particles + ambient animations (motion-gated)

**Files:**
- Modify: `site/src/components/atlas/World.astro`

Adds floating motes and the three ambient animations (ray sway, particle drift,
crystal pulse), all scoped under `.atlas-world.motion-on` so reduced-motion users
see a still scene.

- [ ] **Step 1: Add a seeded `particles` array in the frontmatter**

In the frontmatter, after the `clouds` array, add:

```ts
const particles = Array.from({ length: 18 }, () => ({
  x: +(rng() * 100).toFixed(2),
  y: +(28 + rng() * 60).toFixed(2),
  s: +(1 + rng() * 1.8).toFixed(2),
  o: +(0.3 + rng() * 0.5).toFixed(2),
  d: +(16 + rng() * 12).toFixed(1),     // drift duration (s)
  delay: +(rng() * -20).toFixed(1),     // negative = desync start
}));
```

- [ ] **Step 2: Render particles split across two layers**

In the markup, inside `awClouds` (after the clouds map) add the first half, and
inside `awStarNear` (after the stars map) add the second half:

In `awClouds`:

```astro
    {particles.slice(0, 9).map((p) => (
      <i class="mote" style={`left:${p.x}%;top:${p.y}%;width:${p.s}px;height:${p.s}px;opacity:${p.o};--d:${p.d}s;--delay:${p.delay}s`}></i>
    ))}
```

In `awStarNear`:

```astro
    {particles.slice(9).map((p) => (
      <i class="mote" style={`left:${p.x}%;top:${p.y}%;width:${p.s}px;height:${p.s}px;opacity:${p.o};--d:${p.d}s;--delay:${p.delay}s`}></i>
    ))}
```

- [ ] **Step 3: Add the mote style and the motion-gated keyframes**

In `<style>`, add:

```css
  .mote {
    position: absolute; border-radius: 50%; background: #ffe6bf;
  }

  @keyframes aw-ray-sway {
    0%, 100% { transform: skewX(0deg) scaleY(1); }
    50%      { transform: skewX(3deg) scaleY(1.04); }
  }
  @keyframes aw-mote-drift {
    0%   { transform: translate(0, 0); }
    50%  { transform: translate(8px, -14px); }
    100% { transform: translate(0, 0); }
  }
  @keyframes aw-gem-pulse {
    0%, 100% { opacity: .65; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.06); }
  }

  .atlas-world.motion-on .rays {
    animation: aw-ray-sway 14s ease-in-out infinite;
  }
  .atlas-world.motion-on .mote {
    animation: aw-mote-drift var(--d, 20s) ease-in-out infinite;
    animation-delay: var(--delay, 0s);
  }
  .atlas-world.motion-on .gem-glow {
    transform-box: fill-box; transform-origin: center;
    animation: aw-gem-pulse 6s ease-in-out infinite;
  }
```

- [ ] **Step 4: Build**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: success, ~301 pages, no error.

- [ ] **Step 5: Visual check — motion ON**

`/en/learn/algorithms/` (default, motion on): god rays slowly sway, motes drift in
the sky, and the crystal glow gently pulses. Motion should be subtle, not
distracting behind text.

- [ ] **Step 6: Visual check — motion OFF**

Toggle reduced motion: either set `localStorage.setItem("awesome.motion","off")`
in the browser console and reload, or use the site's Settings motion toggle, or
enable OS "reduce motion". Reload `/en/learn/algorithms/`: the `motion-on` class is
absent (`document.querySelector('.atlas-world').classList` has no `motion-on`) and
**nothing animates** — rays, motes, crystal all static. Reset with
`localStorage.removeItem("awesome.motion")`.

- [ ] **Step 7: Commit**

```bash
git add site/src/components/atlas/World.astro
git commit -m "feat(atlas): drifting motes + motion-gated ambient animations"
```

---

### Task 7: Final verification across both contexts + RU

**Files:**
- None (verification only)

- [ ] **Step 1: Clean build + lint**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: success, ~301 pages. Open `dist/lint-report.json` and confirm no new
violations vs. the pre-change baseline.

- [ ] **Step 2: Parallax context, full scroll**

`bun run dev` → `/en/learn/algorithms/`: scroll the whole strip and confirm all
acceptance criteria from the spec — continuous gradient (no seams), sun glow + god
rays at horizon, layered rim-lit hills, varied grass + colored wildflowers,
crumbled soil edge, strata + faceted rocks, gold roots, glowing buried crystal —
each at the correct depth, and content stays readable over the backdrop.

- [ ] **Step 3: Static home context**

`/en/`: backdrop shows the deep-space Orbit top with stars; layout intact; with
motion on, the stars/clouds are static (no parallax) but motes/rays/crystal that
fall within view animate subtly — confirm nothing is broken.

- [ ] **Step 4: RU route parity**

Open `/ru/learn/algorithms/`: identical scene (World has no text content, so it
must look the same as EN). Confirm no layout break.

- [ ] **Step 5: Reduced-motion final pass**

With OS reduce-motion (or `awesome.motion="off"`), reload both `/en/learn/algorithms/`
and `/en/`: zero animation anywhere. Reset the override afterward.

- [ ] **Step 6: Final commit (if any tuning edits were made)**

```bash
git add site/src/components/atlas/World.astro
git commit -m "fix(atlas): visual tuning for Dawn parallax scene"
```

(Skip if Tasks 1–6 needed no further edits.)

---

## Self-review

**Spec coverage:**
- Continuous Dawn gradient (spec A) → Task 1.
- Sky god rays + warm clouds + haze (spec B) → Task 3.
- Surface sun glow + rim light (spec C) → Task 3 (glow/core) + Task 2 (rim strokes).
- Hills + grass + wildflowers + crumbled edge (spec D) → Task 2.
- Underground strata/speckle/rocks + roots (spec E) → Task 4 (strata/speckle/rocks) + Task 5 (roots).
- Buried crystal (spec F) → Task 5.
- Layer assignment (spec G) → rays/glow/hills/earth/crystal on `awBase`, motes split across `awClouds`/`awStarNear`, roots on `awRoots` (Tasks 2–6); speed factors untouched (Task 1 only renames the id).
- Animation gating (spec H) → Task 1 (class in both contexts) + Task 6 (keyframes).
- Constraints (no island, determinism via `mulberry32(20260521)`, labels kept, 400vh + 5 layers + lerp intact) → preserved across all tasks; verified in Task 7.

**Placeholder scan:** every code step contains the actual markup/CSS/JS to paste; no TBD/TODO/"handle edge cases".

**Type/name consistency:** layer id `awRoots` used identically in Task 1 (script list), Task 5 (markup). Class `motion-on` set in Task 1, consumed in Task 6. CSS classes `scene-rays`/`sun-glow`/`sun-core`/`scene-hills`/`scene-earth`/`scene-crystal`/`scene-roots`/`mote`/`gem-glow`/`rays` each defined where introduced and reused consistently. SVG gradient ids `awRay`/`awGem` are unique. Seed `mulberry32(20260521)` and `rng` reused for `particles` (Task 6) consistent with existing stars/clouds.
