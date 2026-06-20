# PageSpeed Fixes — A11y Contrast + LCP Self-Host — Design

**Date:** 2026-06-20
**Status:** approved (brainstorming) → ready for writing-plans
**Branch:** `pagespeed-fixes` off `origin/main` (clean; current `ru-polish-and-fixes`
dirty WIP `StreakBadge.tsx` + `atlas-kit.css` and the RU-polish commits stay untouched —
implementation starts by branching from `origin/main`, not from the current working tree).

## Goal

Lift two Lighthouse scores on the curriculum site (`awesome-everything.pages.dev` /
`fallowlone.com`):

- **Desktop Accessibility 95 → 100** — fix the rail contrast audit.
- **Mobile Performance 93 → target ≥99** — fix LCP 3.2s by self-hosting fonts.

Evidence: PageSpeed/Lighthouse run captured 2026-06-20 (Moto G Power, Slow-4G,
Lighthouse 13.4.0). Mobile metrics: FCP 1.7s ✅, **LCP 3.2s ⚠️ (sole drag)**,
TBT 0ms ✅, CLS 0.001 ✅, SI 1.7s ✅.

## Out of scope (non-goals)

- **Node 24 / GitHub Actions runtime bump** — separate follow-up PR. The GH warning
  (`actions/cache/restore@v4`, `actions/upload-artifact@v4` forced onto Node 24) is the
  *action runtime*, not the project's Node; the site builds with Bun. Do NOT touch CI
  Node here.
- The pre-existing uncommitted WIP (`src/components/brand/StreakBadge.tsx`,
  `src/styles/atlas-kit.css` streak-height change) — branch off `origin/main` so it is
  not carried in. (Note: the contrast fix DOES edit `atlas-kit.css`, but on a clean
  checkout from main, not on top of the WIP diff.)
- RU-polish work (`ru-polish-and-fixes` branch) — unrelated, finalized separately.
- No broad refactor of the rail, fonts system, or layout beyond the lines named below.

## Part A — A11y contrast (desktop 95 → 100)

**Root cause.** Four left-rail elements render `color: var(--muted)` (light `#6f6a5e`)
on the rail paper background → contrast ≈ 4.0:1, below WCAG AA 4.5:1 for normal text.
Primary rail items use `--ink-2` (`#2d2b25`) and already pass. Failing elements (from the
audit):

| Element | Selector | File:line | Current color |
|---|---|---|---|
| "A MAP OF THE CRAFT" wordmark tag | `.rail-wordmark .wm-tag` | `atlas-kit.css:80` | `var(--muted)` |
| "English for Engineers", "Glossary" | `.rail-item.secondary` (label) | `atlas-kit.css:94` | `var(--muted)` |
| "Language" label | `.rail-lang > .lbl` | `atlas-kit.css:111` | `var(--muted)` |

**Fix.** Scoped to the rail, both themes — change these three selectors' text color from
`var(--muted)` to `var(--ink-2)`:

- `.wm-tag` is 9px decorative mono — hierarchy stays via size/letter-spacing, not sub-AA color.
- `.rail-item.secondary` — "secondary" feel preserved by the existing `.ico { opacity: 0.85 }`,
  not by low-contrast text. Hover already promotes to `--ink-2`/`--ink`.
- `.rail-lang > .lbl` — small uppercase label → `--ink-2`.

**Token values (for the verification math):**
- Light: `--ink: #1a1916`, `--ink-2: #2d2b25`, `--muted: #6f6a5e` (tokens.css).
- Dark: `--ink: #ece8dc`, `--ink-2: #d7d2c2`, `--muted: #8e887a` (tokens.css).
- High-contrast override (global.css): `--ink-2: #000000` (always passes).

**Verification.** Compute contrast of `--ink-2` against the rail background in BOTH light
and dark themes; each must be ≥ 4.5:1 (`.wm-tag` at 9px is normal-size for WCAG, needs 4.5,
not 3.0). Re-check dark `--ink-2 #d7d2c2` on the dark rail surface.

## Part B — Perf LCP (mobile 93, LCP 3.2s → target < 2.5s)

**Root cause.** The LCP element is `.oa-hero h1` (Fraunces display heading,
`atlas-kit.css:267`, weight 460). Fonts arrive through a Google Fonts CSS round-trip
(`SeoHead.astro:27-29`: preload-as-style + print-onload swap). The font *binaries* are not
preloaded, so the heading repaints when Fraunces swaps in — Lighthouse records LCP at that
swap (~3.2s). The two implicit preconnects (`fonts.googleapis.com`, `fonts.gstatic.com`)
plus the external CSS sit in the critical chain.

**Fix — self-host via `@fontsource-variable`.**

1. `bun add @fontsource-variable/fraunces @fontsource-variable/inter-tight @fontsource-variable/jetbrains-mono`
2. Import variable CSS in `global.css` (replace the Google CSS dependency). Required faces:
   - **Fraunces** — roman + **italic** (the hero `h1 em` is italic 400; `atlas-kit.css:268`).
     Subsets: latin + latin-ext only — *Fraunces has no Cyrillic*, so RU `h1` keeps today's
     `'Source Serif Pro'/Georgia` serif fallback (no regression).
   - **Inter Tight** — latin + latin-ext + **cyrillic** (RU body text).
   - **JetBrains Mono** — latin + latin-ext + **cyrillic** (RU mono/code).
3. Remove the three Google Fonts `<link>`s (preload + print stylesheet + noscript) from
   `SeoHead.astro:27-29`. The implicit preconnects go with them.
4. Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Fraunces
   latin **roman** variable woff2 (the /en/ LCP weight). Resolve the URL via the fontsource
   asset that Astro fingerprints into `/_astro/` (import the woff2 in the layout frontmatter
   so Astro emits + hashes it, then preload that resolved URL — do not hardcode a hash).
5. Keep `font-display: swap` (fontsource default ships `size-adjust`/`ascent-override`
   metric overrides → CLS stays ~0). Self-host + preload means the font is ready quickly so
   the LCP heading paints final fast.
6. **CSP** — if a real enforced CSP file is located (no `public/_headers` / config match
   found during brainstorming; `SeoHead` only *comments* about a CSP), drop `googleapis`
   from `style-src` and `gstatic` from `font-src`, leaving fonts as `'self'`. If no
   enforced CSP exists, skip and note it.

**Tradeoff (accepted).** Adds same-origin woff2 (~Fraunces latin variable 30–50KB +
Inter Tight & JetBrains with Cyrillic ~50–70KB each), cached and fingerprinted — in
exchange for removing the entire external font chain and the swap repaint. Within the
performance budget (microsite CSS < 15KB unaffected; fonts are a separate, cached class).
Variable fonts keep weight counts to one file per family.

## Architecture / units

| File | Change | Part |
|---|---|---|
| `src/styles/atlas-kit.css` | 3 color lines `--muted` → `--ink-2` | A |
| `package.json` | add 3 `@fontsource-variable/*` deps | B |
| `src/styles/global.css` | import fontsource variable CSS (replaces Google dep) | B |
| `src/components/brand/SeoHead.astro` | remove Google `<link>`s; add local Fraunces preload | B |
| layout frontmatter (`Topic.astro`/`Atlas.astro` or `SeoHead.astro`) | import woff2 asset for fingerprinted preload URL | B |
| CSP file *if found* | drop googleapis/gstatic origins | B |

Each part is independently shippable and independently testable.

## Verification (whole branch)

1. `cd site && bun run build` — clean (9-rule linter, ~301 pages, no new warnings).
2. Lighthouse via chrome-devtools MCP (`lighthouse_audit`) on `/en/`:
   - **Mobile**: LCP < 2.5s; Performance ≥ 99; CLS unchanged (~0).
   - **Desktop**: Accessibility 100; the "contrast ratio" audit passes.
3. Network panel: no requests to `fonts.googleapis.com` / `fonts.gstatic.com`; the
   Fraunces woff2 is preloaded same-origin.
4. Visual, both themes: rail labels (wm-tag, English, Glossary, Language) clearly readable;
   `h1` renders in Fraunces (EN) / serif fallback (RU); body in Inter Tight incl. RU
   Cyrillic; mono in JetBrains incl. RU Cyrillic.

## Follow-up (separate PR, not this work)

- Bump `actions/cache/restore` + `actions/upload-artifact` to node24-targeting releases and
  optionally move project `setup-node` to Node 24 — resolves the GH deprecation warning.
  Low risk (Bun builds the site; Node only runs tooling).
