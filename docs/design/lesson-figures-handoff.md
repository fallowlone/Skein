# Lesson figures — new-chat context

Paste the brief below into a new chat to produce per-lesson SVG diagrams.
Reference implementation: `site/src/components/figures/db-join/` (3 figures
for `databases/03-execution-plans/03-join-algorithms`), previews in
`docs/design/prototypes/db-join/`.

---

## Brief for the new chat

You author **static bilingual SVG lesson figures** for Skein (Astro 6 + Preact,
Cloudflare). Scope rule: **2–3 figures per lesson, one per heavy topic or
concept** — each figure sits immediately after its concept's subsection in
**both** `site/src/content/lessons/en/...` and `.../ru/.../index.mdx`.

### Color scheme (site tokens — `site/src/styles/tokens.css`)

- Monochrome editorial foundation. Page/box/text roles:
  - panel background `var(--card)`, inner chips `var(--paper)`,
    primary text `var(--ink)`, secondary `var(--muted)`.
- **`var(--accent)` is near-black `#202020` in light theme and near-white
  `#f2f2f2` in dark theme — it is NOT a color.** Arrows, counts and highlight
  strokes in accent render black-on-white. That is the house style (all 600+
  existing figures do this).
- Domain hues (`--d-data` for databases, `--d-backend`, …) only as **small
  purposeful accents** when the lesson already uses one — never as base, never
  blue/purple washes, no gradients, no glow, no emoji.
- Dark theme is free **iff you use only vars — zero hardcoded hex colors.**
- Fonts via tokens only: figure root `font-family="var(--font-mono)"`,
  headline `font-family="var(--font-display)"`.

### Figure template

`site/src/components/figures/<track>-*/<lesson>-<n>.astro`:

- `lang: "en" | "ru"` prop + `dict = { en: {...}, ru: {...} }`, `const t = dict[lang]`.
- `<figure data-lesson-visual class="my-6">` → `<svg viewBox="0 0 800 420"
  role="img">` with `<title lang="en">` + `<title lang="ru">` →
  `<figcaption style="text-align: center;">` carrying the takeaway.
- Size ladder: headline 22 (display), sub 13 (muted), box titles 12–13,
  body labels 11–12, emphasis numbers 15–20, hero numerals ≤ 30.
- Unique `<marker>` ids per file (`dbj-<slug>-arrow`); arrows carry the
  direction, accent color carries the emphasis.

### Bilingual + honesty rules

- Same geometry both locales; **numbers identical**; code terms stay
  untranslated in RU (`loops`, `Batches`, `work_mem`, `EXPLAIN` output).
- Every depicted number/label must trace to a line in the lesson body —
  no invented values. Captions preserve the lesson's takeaway beats.

### Wiring (no registry edits needed)

- Import with a descriptive alias
  (`import NestedLoopBlowup from "~/components/figures/db-join/01-nested-loop-1.astro"`)
  and embed as `<NestedLoopBlowup lang="en" />` / `lang="ru"` right after the
  concept's paragraphs. `LessonRenderTree` resolves `figures/*` via glob.

### QA pipeline (must all pass)

1. `bun scripts/figure-qa/audit-geometry.mjs` — extend its `RULES` with one
   entry per new figure: `[dictKey, containerWidthPx, fontSize]`; rects/circles
   must stay in the 800×420 viewBox.
2. `bun scripts/figure-qa/render-figures.mjs <en|ru> <files…> [--out dir]`,
   rasterize with sharp (bundles librsvg), **eye-check every render for
   overlaps** — fix geometry, never the audit.
3. Compile both locales via `compileLessonRenderTree` (figure refs present,
   zero unresolvable elements).
4. `bun run lint:src` (0 errors), `bun run check` (0/0/0), render-tree vitest.
