# ByteByteGo Visual Style Guide

Reference rules for all infographics in this repo. Mirrors the *ByteByteGo* (Alex Xu) house style — magazine-feel explainers, friendly but technical, dense without crowding.

There are **two visual modes**. Pick one per infographic; never mix them inside the same canvas.

| Mode | When to use | Reference |
|------|-------------|-----------|
| **light-pastel** | "What happens when…" explainers, single-topic teaching pieces | "What Happens When You Type a URL into a Browser" |
| **dark-poster** | Big multi-panel "Must Know" reference posters, dashboards of concepts | "Must Know System Design Building Blocks" |

## Canvas

- **Single explainer** (light-pastel): `1600 × 1200` or `1200 × 1500` portrait when the flow is vertical.
- **Multi-panel poster** (dark-poster): `1600 × 2100` portrait (2 columns × N rows of panels).
- **8-pt grid**. All coordinates, padding, stroke widths are multiples of 4 or 8.
- **Outer margin**: 56 px. **Gutter between panels**: 32 px.

## Title bar (top of every canvas)

- Left: small **teal accent stripe** (4 × 64 px, color `#1FBFA8`).
- Center: **headline** in 44–56 pt Inter Bold, sentence case. For dark-poster, the headline sits in a colored **pill** (rounded 24 px, fill from the palette).
- Right: **`ByteByteGo` wordmark + logo** placeholder (32 px tall, color `#7C3AED` or palette-matched). In our repo, render the wordmark with `font: 800 22px Inter` and skip the glyph until we have an SVG asset.
- Title bar height: ~96 px. Separator: none (whitespace).

## Panels

Every conceptual section is a **panel** with:

1. **Pastel or dark fill** (see palette below).
2. **Dashed border**, 2 px stroke, color matching the panel's title pill (not the fill).
3. **Rounded corners**, 16 px.
4. **Title pill** anchored to the top-center (or top-left), 32 px tall, rounded 16 px, fill = panel accent, text = white (dark mode) or panel-accent (light mode).
5. **24–32 px inner padding**.

Panels can be: single full-width, two-column split, or grid (e.g. 3 × 2 in poster mode).

## Palette

### light-pastel mode (explainer)

| Panel theme | Fill | Border / pill | Text | When to use |
|-------------|------|---------------|------|-------------|
| Lilac | `#EEEAFE` | `#7C3AED` | `#1F2937` | Network / DNS / domain resolution |
| Mint | `#E6F6EE` | `#16A34A` | `#1F2937` | Request / TCP / TLS / encryption |
| Peach | `#FEEFE0` | `#D97706` | `#1F2937` | Response / parsing / rendering |
| Sky | `#E0F2FE` | `#0284C7` | `#1F2937` | Caching / CDN / edge |
| Rose | `#FCE7F3` | `#DB2777` | `#1F2937` | Failure modes / warnings |

Numbered step circles are always **deep green** `#16A34A` fill, white digit, **24 px radius**. The step label next to the circle uses the same `#16A34A` for the number-prefix word ("HTTP Request") and `#1F2937` for the rest.

### dark-poster mode (reference card)

| Panel theme | Fill | Border / pill | Text |
|-------------|------|---------------|------|
| Forest | `#0E2A22` | `#1FBFA8` | `#E5E7EB` |
| Plum | `#231538` | `#C084FC` | `#E5E7EB` |
| Navy | `#0F1F3A` | `#60A5FA` | `#E5E7EB` |
| Maroon | `#2A0E10` | `#F87171` | `#E5E7EB` |
| Olive | `#1B2510` | `#A3E635` | `#E5E7EB` |
| Sienna | `#2A170A` | `#FB923C` | `#E5E7EB` |

In dark mode, accent components inside panels use saturated colors: `#34D399` (mint), `#F472B6` (pink), `#FCD34D` (yellow), `#60A5FA` (blue), `#FB7185` (coral). Server icons get cheerful mint-green fills with white inner dots.

## Iconography

Icons in ByteByteGo are **stylized 3D-ish** — soft fills, slight depth, friendly proportions. Use these in our SVG as reusable `<defs>`:

- **Server rack** — 3 stacked rounded rectangles (44 × 14 each, 4 px corner) with two small dots (one green, one neutral) on each tier. Optional subtle bottom shadow.
- **Database** — cylinder = top ellipse + two vertical sides + bottom ellipse fill. Add a faint highlight line on the upper-left of the cylinder body.
- **Monitor / browser** — rounded rect 56 × 40 + small stand at bottom; inner colored band for "viewport" with 2 dot-icons for tabs and a colored block representing content.
- **Globe** — circle with 2 horizontal ellipses (latitude) and one vertical curve (longitude); fill light blue.
- **DNS resolver** — squat rounded rect with three small "world" globes connected by dashed lines.
- **Cloud** — bumpy shape: one larger central circle + two smaller flanking circles + flat bottom rectangle.
- **Lock / TLS** — shackle (open arc) + rounded body, slight inner highlight.
- **Key** — circle with a hole + short rectangular shaft with two teeth.
- **Document / packet** — rounded rectangle 40 × 32 with folded corner triangle and 2–3 short horizontal lines.

All icons are **flat 2D in actual rendering** (we don't do real 3D), but their *proportions* mimic chunky 3D toy assets: short, wide, generous radii, no spindly line art.

Avoid: monoline minimal icons (Lucide / Tabler style — wrong vibe), photographic illustrations, isometric voxel sets.

## Numbered steps (light-pastel)

- `<circle r="22" fill="#16A34A">` + white bold digit, **outside** the related box, top-left.
- A label sits **to the right of the circle** in the form: `<span fill="#16A34A" weight=700>1</span> <span fill="#1F2937" weight=600>Look up in cache</span>` (in BBG examples the number text is reused as a label prefix in the same green, e.g. "1 Look up in cache").
- Steps connect with **dashed curved arrows** flowing through the panel.

## Connectors (arrows)

- Default arrow: **dashed**, `stroke-dasharray="4 6"`, 2 px, dark gray `#374151`.
- Solid arrows only when emphasizing a primary "happy path".
- Arrowhead: small filled triangle, scaled to stroke. Never double-ended.
- Arrows curve smoothly via cubic Bezier; only straight when distance is short and direction is obvious.
- Label arrows with a small white-fill chip if the meaning isn't obvious from context.

## Typography

- **Headline (canvas title)**: Inter Bold, 44–56 pt, `#1F2937` (light mode) / `#F9FAFB` (dark mode).
- **Panel title (inside pill)**: Inter Bold, 22–26 pt, white in dark-poster, panel-accent in light-pastel.
- **Section sub-label** (small caps above a sub-block): Inter SemiBold, 14 pt, `letter-spacing: 1.6px`, color = panel accent.
- **Body / annotation**: Inter Medium 15–16 pt, `#1F2937` (light) / `#E5E7EB` (dark).
- **Code / numbers / IPs**: `ui-monospace` 13–14 pt, `#374151` in light, `#FCD34D` in dark.
- **Step label / number**: Inter Bold, 18 pt, green `#16A34A` in light. Dark mode: bright `#34D399`.

Line height 1.35–1.45. No italics for emphasis — use weight and color.

## Composition patterns

ByteByteGo doesn't enforce one layout; it has a small repertoire. Pick the right one per topic:

- **Vertical explainer (3 panels stacked)** — best for "what happens when X" sequences. Each panel is one phase. Curved dashed arrows hop between panels through a side margin.
- **Two-column split** — left = client / outgoing, right = server / incoming.
- **Sequence diagram** — vertical lifelines (Client, DNS, Server, …), time flows down, dashed message arrows between. Keep ≤6 lifelines.
- **Multi-panel grid (2 × N, dark-poster)** — independent reference cards on one canvas, each panel its own theme color.
- **System diagram** — central element (e.g. service mesh) with peripheral actors connected by dashed lines. Good for "X overview".
- **Before/after** — left red-tinted, right green-tinted, vertical divider, label both sides.

Each infographic uses exactly **one** primary pattern. Sub-blocks inside a panel can be mini-patterns (e.g. a small sequence inside a "Initiate Request" panel), but the canvas pattern is singular.

## Anti-patterns (instant tells of "off-brand")

- White canvas with no panel backgrounds — looks like a Notion doc.
- Monoline / Lucide-style icons in the main illustrations (fine for tiny secondary glyphs only).
- Solid arrows everywhere — BBG breathes through dashed connectors.
- Numbered circles **inside** the box they describe (BBG always places them outside, top-left).
- Centered text inside technical boxes (left-align; only headlines and panel titles are centered).
- Decorative gradients, glass, 3D extrusion.
- More than ~6 hues per canvas. The pastel palette already gives ~5 panel themes; pick 2–4.
- Emoji as content (rare BBG callouts only).

## ByteByteGo wordmark + branding

Until we have the official SVG asset, render the top-right "branding" as:

```
<text font-family="Inter" font-weight="800" font-size="22" fill="#7C3AED" x="..." y="...">ByteByteGo</text>
```

with a small placeholder glyph (a teal rounded square + white "B" letter, 28 × 28) immediately to the left of the wordmark.

When the user provides the real asset, drop it into `assets/icons/bytebytego-logo.svg` and inline it via `<image href>` only as a fallback — prefer inline path data.

## Quick-check before exporting

- Each panel has: fill, dashed border in matching color, pill title, ≥24 px inner padding.
- Numbered circles are outside boxes, green `#16A34A`.
- Connectors are dashed (unless explicitly emphasizing a primary path).
- ≤4 panel themes used.
- Icons feel chunky, not monoline.
- Headline + ByteByteGo wordmark present in the title bar.
- 8-pt grid honored.
