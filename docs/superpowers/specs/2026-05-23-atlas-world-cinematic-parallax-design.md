# Atlas World — cinematic Dawn parallax

**Date:** 2026-05-23
**Component:** `site/src/components/atlas/World.astro`
**Status:** approved design, ready for plan

## Goal

Replace the flat, dark, muted parallax backdrop with a cinematic, colorful
"Dawn" scene inspired by nasaprospect.com (layered atmospheric depth, glowing
focal objects, drifting particles) and bgsprod.com (warm sun-flare, illustrated
layers). The strip must stay readable behind content and respect motion
preferences.

The user iterated through visual mockups and locked: **flat-layered SVG
language** (variant A), pushed to a **detailed + buried-treasure** scene
(variant B), in the **Dawn warm** color mood, with **ambient drift** animation.

## Scope

- Single file: `site/src/components/atlas/World.astro` (markup, inline script, styles).
- No new islands, no new dependencies, no new components.
- Affects both usage contexts:
  - `pages/[lang]/index.astro` — `<World parallax={false} />` (home backdrop, rests at translateY(0), shows the Orbit/top of strip).
  - `pages/[lang]/learn/[track]/index.astro` — `<World parallax={true} />` (scroll-coupled ascent, reveals strip bottom→top).

Out of scope: changing the parallax math, the layer count, the scroll-coupling
script's lerp behavior, or any consuming page.

## Current state (baseline)

- `.atlas-world` is `position:fixed; inset:0; z-index:0`, 5 absolutely-positioned
  `.layer`s each `height:400vh`.
- Layers + speed factors (parallax mode): `awStarFar` 0.80, `awClouds` 0.90,
  `awBase` 1.00, `awStarNear` 1.12, `awVeins` 1.15.
- `awBase` holds 4 stacked `.zone` blocks (25% each): `z-space`, `z-sky`,
  `z-grass`, `z-under`, each with its own gradient background, a thin `.horizon`
  line at the top of `z-grass`, and vertical `.zone-edge` labels
  (Orbit/Sky/Surface/Underground).
- Decorative: `starsFar` (55), `starsNear` (35), `clouds` (5), `veins` (7) —
  seeded by `mulberry32(20260521)`.
- Inline script (parallax mode only) gates on `prefers-reduced-motion` +
  `localStorage["awesome.motion"]`, then lerps layer transforms on scroll.

Vertical semantics (do not change): top of strip = Orbit (mastery/summit), bottom
= Underground (foundations/roots). On the learn page, scrolling down reveals from
Underground up to Orbit.

## Locked decisions

1. **Palette scope** — one continuous Dawn gradient across the whole 400vh strip;
   the 4 separate zone gradients are replaced. The Orbit band stays deep
   indigo/space with stars; warmth ramps to a sunrise band at the Surface horizon.
2. **Animation** — subtle ambient drift (rays sway, particles drift, crystal glow
   pulse), CSS keyframes gated so they only run when motion is enabled.
3. **Existing bits** — the scattered gold `veins` become branching gold **roots**
   reaching toward the crystal; the vertical `zone-edge` labels are kept.

## Design

### A. Continuous Dawn gradient (replaces per-zone backgrounds)

Define the strip background as one vertical gradient on `awBase` (a single
full-height `.atlas-world-strip`), with these stops (top→bottom, % of the 400vh
strip — Orbit 0–25, Sky 25–50, Surface 50–75, Underground 75–100):

| pos  | hex       | meaning                         |
|------|-----------|---------------------------------|
| 0%   | `#06060f` | deep space (Orbit top)          |
| 12%  | `#0a0e26` | space indigo                    |
| 28%  | `#161a40` | upper sky                       |
| 40%  | `#3b2f63` | violet sky                      |
| 47%  | `#8a4f6a` | pre-dawn mauve                  |
| 50%  | `#d98a5e` | sunrise band (the horizon)      |
| 51%  | `#f6b07a` | peach horizon highlight         |
| 54%  | `#3a2410` | top of soil (just below ground) |
| 75%  | `#1c130a` | mid underground                 |
| 100% | `#0b0805` | deep underground floor          |

The sunrise band is intentionally narrow (≈47–54%) so the horizon reads as a
crisp lit line, not a wash. Keep a faint `.horizon` highlight stroke at exactly
50%.

### B. Sky zone (25–50%) — atmosphere

- **God rays:** a fan of soft, blurred light wedges emanating from the horizon
  point (≈50% strip, horizontal center) upward into the sky. Inline SVG, low
  opacity (`~.10–.22`), warm `#ffe6bf`. Placed on a mid layer for parallax.
- **Clouds:** keep the 5 existing `clouds` but recolor warmer (peach/mauve tint)
  and lower opacity so they read as dawn haze.
- **Atmospheric haze:** a thin warm gradient band just above the horizon.

### C. Surface horizon (~50%) — the light source

- **Sun glow:** a large radial gradient (`#ffe6bf`→transparent) centered on the
  horizon line, plus a small bright core ellipse (`#fff1d8`, blurred).
- **Rim light:** the top edges of the upper hill layers get a thin peach/gold
  stroke (`#f6c98a`/`#ffd9a0`) to simulate backlight from the sun.

### D. Hills + grass (lower Sky / upper Surface)

- **4 hill layers**, atmospheric perspective (far = cooler/bluer `#43406e`,
  `#2f5a52`; near = greener `#2c6b3f`, `#236233`), overlapping quadratic-curve
  silhouettes.
- **Grass:** varied clumps of stroke blades in two greens (`#2f6a44` base,
  `#52a86a` highlight), differing heights, slight curve, clustered (not evenly
  spaced).
- **Wildflowers:** a few small color dots at blade tips — `#ffd86a` gold,
  `#ff8d6a` coral, `#ffeede` white, `#ffb14d` amber — the "красочно" pop.
- **Crumbled transition:** the top edge of the soil fill is an irregular
  bumpy path (little clods), not a straight line, so grass→soil reads organic.

### E. Underground (50–100%) — earth

- **Soil:** warm gradient (part of the master gradient) `#3a2410`→`#0b0805`.
- **Strata:** 3 horizontal separators across the depth — one solid curved, one
  dashed, one faint — in `#4a3018`/`#3a2a1a`, low opacity.
- **Speckle:** scattered small pebble dots (`#3a2a1a`) for texture.
- **Faceted rocks:** 2–3 rocks, each a polygon with 3 faces — lit top
  (`#4a3520`), body (`#2a1c0e`), shadow side (`#1c1208`).
- **Roots (replaces veins):** branching gold strokes (`#d8b06a`→`#ffe6bf`)
  descending from the grass base, fading with depth, reaching toward the crystal.

### F. Buried crystal (deep Underground) — the payoff

- A faceted gold crystal cluster (3–5 prisms), each prism split into 2–3 facets
  (`#fff0c8` lit, `#ffd98f` mid, `#d8a85a` shadow).
- A strong radial glow behind it (`#ffd98f`, heavily blurred).
- 1–2 faint light shafts rising from the crystal toward the surface.

### G. Layer assignment (depth)

Keep the 5 layers + speed factors. Assign new elements:

| layer (speed)        | contents                                                                 |
|----------------------|--------------------------------------------------------------------------|
| `awStarFar` (0.80)   | far stars (Orbit), faint far god-ray streaks                              |
| `awClouds` (0.90)    | dawn clouds/haze, slow drifting particles                                |
| `awBase` (1.00)      | gradient strip, sun glow, hills, grass, wildflowers, soil, strata, rocks, crystal+glow, zone-edge labels, horizon stroke |
| `awStarNear` (1.12)  | near stars, foreground particles                                          |
| `awVeins`→`awRoots` (1.15) | branching gold roots (nearest, fastest)                            |

Note: `awVeins` is renamed `awRoots` in markup, script layer list, and styles.

### H. Animation (ambient drift)

- CSS `@keyframes`: `ray-sway` (slow rotate/skew ±, ~14s), `particle-drift`
  (translate loop, ~18–26s, varied), `crystal-pulse` (opacity/scale on the glow,
  ~6s).
- **Gating:** the inline script already computes `enabled` from
  `prefers-reduced-motion` + `localStorage["awesome.motion"]` (same logic as
  `src/scripts/motion-flag.ts`). Extend it to add a `motion-on` class to
  `.atlas-world` whenever `enabled` is true — **including the home/non-parallax
  context** (currently the script `return`s early when `data-parallax!="true"`;
  the class-setting must run regardless of parallax mode). All new keyframe
  animations are scoped under `.atlas-world.motion-on …` so they are inert
  otherwise.

## Constraints / guardrails

- **Hydration cap** unaffected — World ships zero islands; all SVG is static
  markup + one inline `<script is:inline>`. Do not introduce a framework island.
- **Readability:** content sits on `z-index:2` above the world (`z-index:0`);
  keep new visuals dim enough not to compete. The brightest elements (sun core,
  crystal glow) sit near zone boundaries, away from the dense-text reading band.
- **Performance:** prefer CSS transforms/opacity for animation (compositor-only);
  avoid animating `filter`/`box-shadow`. Cap blurred-glow elements (a few large
  radials, not many). SVG node count should stay reasonable (grass/roots are the
  bulk — keep clumps, don't carpet).
- **Determinism:** keep `mulberry32(20260521)` seeding for any randomized
  placement (particles, extra speckle) so SSR output is stable.
- **No regressions:** zone-edge labels, the 400vh height, the parallax script's
  layer list (5 entries with the same speed factors), and the lerp behavior stay
  intact.

## Acceptance criteria

1. `bun run build` in `site/` passes; lint clean (`dist/lint-report.json` no new
   violations); page count unchanged.
2. Learn-track page: scrolling reveals a continuous Dawn gradient (no visible
   zone seams), sun glow + god rays at the horizon, layered hills, varied grass +
   colored wildflowers, crumbled soil edge, strata + faceted rocks, gold roots,
   and a glowing buried crystal — at the correct strip depths.
3. Home page: backdrop shows the deep-space Orbit top with stars; no broken
   layout.
4. With motion enabled: rays sway, particles drift, crystal glow pulses. With
   `prefers-reduced-motion` (or motion override "off"): everything is static, no
   animation runs.
5. No new island; no new dependency; `World.astro` remains the only changed file.

## Verification

- Build + lint (above).
- Visual check in browser at both `/en/learn/<track>/` and `/en/` (and one RU
  route) per CLAUDE.md's visual-check step: scroll the full strip, toggle the
  motion setting, and confirm reduced-motion stillness.
