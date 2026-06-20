# PageSpeed Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise desktop Accessibility 95→100 (rail contrast) and mobile Performance 93→≥99 (LCP 3.2s→<2.5s via self-hosted fonts) on the curriculum site.

**Architecture:** Two independent changes. Part A: three CSS color lines in the left-rail (`--muted`→`--ink-2`) to clear WCAG AA. Part B: replace the Google-Fonts CSS round-trip with self-hosted `@fontsource-variable` packages + a preload of the LCP heading's Fraunces woff2, removing the external font chain and swap repaint.

**Tech Stack:** Astro 6 (static), Bun, `@fontsource-variable/*`, Cloudflare Pages, chrome-devtools MCP for Lighthouse.

## Global Constraints

- Branch `pagespeed-fixes` off `origin/main` — do NOT carry the current `ru-polish-and-fixes` uncommitted WIP (`StreakBadge.tsx`, the `atlas-kit.css` streak-height diff). Cherry-pick the already-committed spec doc (`d5d0a93e8`) onto the new branch.
- Builds run with `bun`, not npm/yarn. Build command: `cd site && bun run build` (Astro build + 9-rule linter, ~301 pages, must stay clean).
- Component imports use the `~/` alias; no `..` relative segments.
- These are CSS/font/asset changes — no unit tests exist or apply. Verify via build + Lighthouse + visual, not failing-test-first.
- Out of scope: Node 24 / GitHub Actions bump (separate PR); any rail/layout refactor beyond the named lines; the pre-existing dirty WIP.
- Contrast target: WCAG AA ≥ 4.5:1 normal text, BOTH light and dark themes.
- Fraunces has no Cyrillic — RU `h1` intentionally keeps the serif fallback; do not try to add a Cyrillic Fraunces.

---

### Task 0: Branch setup

**Files:**
- None modified; git branch only.

- [ ] **Step 1: Fetch and create the clean branch from main**

```bash
cd /Users/artemmac/dev/awesome-everything
git fetch origin
git stash push -u -m "ru-polish wip parking" -- site/src/components/brand/StreakBadge.tsx site/src/styles/atlas-kit.css
git checkout -b pagespeed-fixes origin/main
git cherry-pick d5d0a93e8   # the spec doc commit
```
Expected: `pagespeed-fixes` created at origin/main + spec doc present. The two WIP files are stashed (restore later with `git stash pop` after returning to `ru-polish-and-fixes`).

- [ ] **Step 2: Verify clean baseline builds**

Run: `cd site && bun install && bun run build`
Expected: build succeeds, lint clean, ~301 pages. Records the pre-change baseline.

- [ ] **Step 3: Confirm working tree is clean except spec**

Run: `git status --short`
Expected: nothing staged/dirty (spec already committed). If `StreakBadge.tsx`/`atlas-kit.css` appear dirty, STOP — the stash failed; do not proceed.

---

### Task 1: Part A — rail contrast (desktop a11y 95→100)

**Files:**
- Modify: `site/src/styles/atlas-kit.css:80` (`.rail-wordmark .wm-tag`)
- Modify: `site/src/styles/atlas-kit.css:94` (`.rail-item.secondary`)
- Modify: `site/src/styles/atlas-kit.css:111` (`.rail-lang > .lbl`)

**Interfaces:**
- Consumes: tokens `--ink-2`, `--muted` from `tokens.css` (light `--ink-2:#2d2b25`, dark `#d7d2c2`).
- Produces: nothing for later tasks (independent change).

- [ ] **Step 1: Compute the contrast to confirm the fix clears AA**

The three failing elements use `var(--muted)`. Confirm `var(--ink-2)` clears 4.5:1 against the rail background in both themes before editing. Rail background = `--paper` (light) / dark rail surface. Light `--ink-2 #2d2b25` on cream `--paper` ≈ 12:1 (passes). Dark `--ink-2 #d7d2c2` on dark rail ≈ 9:1 (passes). Record both numbers in the report.

- [ ] **Step 2: Edit line 80 — wordmark tag**

Change:
```css
.rail-wordmark .wm-tag { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
```
to (only `color`):
```css
.rail-wordmark .wm-tag { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-2); white-space: nowrap; }
```

- [ ] **Step 3: Edit line 94 — secondary rail items**

Change:
```css
.rail-item.secondary { color: var(--muted); }
```
to:
```css
.rail-item.secondary { color: var(--ink-2); }
```

- [ ] **Step 4: Edit line 111 — language label**

Change:
```css
.rail-lang > .lbl { color: var(--muted); font-size: var(--fs-small); margin-right: auto; }
```
to:
```css
.rail-lang > .lbl { color: var(--ink-2); font-size: var(--fs-small); margin-right: auto; }
```

- [ ] **Step 5: Build**

Run: `cd site && bun run build`
Expected: clean, ~301 pages, no lint regressions.

- [ ] **Step 6: Commit**

```bash
git add site/src/styles/atlas-kit.css
git commit -m "fix(a11y): rail wm-tag/secondary/lang labels to --ink-2 for WCAG AA contrast"
```

---

### Task 2: Part B — self-host fonts (mobile LCP 3.2s→<2.5s)

**Files:**
- Modify: `site/package.json` (add 3 deps)
- Modify: `site/src/styles/global.css` (import fontsource variable CSS)
- Modify: `site/src/styles/tokens.css:13-15` (prepend Variable family names)
- Modify: `site/src/components/brand/SeoHead.astro:24-29` (remove Google `<link>`s, add local Fraunces preload)

**Interfaces:**
- Consumes: font-family tokens already declared in `tokens.css` (`--font-display: 'Fraunces'…`, `--font-body: 'Inter Tight'…`, `--font-mono: 'JetBrains Mono'…`) — family names must match what fontsource registers (`Fraunces Variable`, `Inter Tight Variable`, `JetBrains Mono Variable`). See Step 3.
- Produces: nothing for later tasks.

- [ ] **Step 1: Add the fontsource packages**

```bash
cd site && bun add @fontsource-variable/fraunces @fontsource-variable/inter-tight @fontsource-variable/jetbrains-mono
```
Expected: 3 deps added to `package.json`.

- [ ] **Step 2: Confirm the registered family names + woff2 filenames**

```bash
cd site
grep -h "font-family" node_modules/@fontsource-variable/fraunces/index.css | head -1
grep -h "font-family" node_modules/@fontsource-variable/inter-tight/index.css | head -1
grep -h "font-family" node_modules/@fontsource-variable/jetbrains-mono/index.css | head -1
ls node_modules/@fontsource-variable/fraunces/files/ | grep "latin-wght-normal"
ls node_modules/@fontsource-variable/fraunces/*.css
```
Expected: families register as `'Fraunces Variable'`, `'Inter Tight Variable'`, `'JetBrains Mono Variable'`. The Fraunces latin roman file is `fraunces-latin-wght-normal.woff2`. Record exact strings — they drive Steps 3, 4, 5.

- [ ] **Step 3: Reconcile token family names with fontsource**

`tokens.css:13-15` lists `'Fraunces'`, `'Inter Tight'`, `'JetBrains Mono'`. fontsource-variable registers the `… Variable` names. Prepend the Variable name to each stack so the self-hosted face is used first, keeping the old name + system fallbacks:
```css
  --font-display: 'Fraunces Variable', 'Fraunces', 'Source Serif Pro', Georgia, 'Times New Roman', serif;
  --font-body:    'Inter Tight Variable', 'Inter Tight', 'Inter', system-ui, -apple-system, 'Helvetica Neue', sans-serif;
  --font-mono:    'JetBrains Mono Variable', 'JetBrains Mono', 'SF Mono', 'Berkeley Mono', ui-monospace, Menlo, monospace;
```
(If Step 2 shows non-`Variable` names, use the exact names from Step 2 instead.)

- [ ] **Step 4: Import the fontsource CSS in global.css**

At the TOP of `site/src/styles/global.css` (before other rules; Astro/Vite resolves these at build, so no runtime round-trip), add:
```css
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/fraunces/standard-italic.css';
@import '@fontsource-variable/inter-tight';
@import '@fontsource-variable/jetbrains-mono';
```
If `standard-italic.css` is not in the package (per Step 2's `ls *.css`), drop that line — the hero `h1 em` italic synthesizes from the roman face (acceptable). Inter Tight + JetBrains indexes include the Cyrillic subset via `unicode-range` (fetched only on RU pages) — no extra import needed.

- [ ] **Step 5: Remove Google Fonts links + add local preload in SeoHead.astro**

In `site/src/components/brand/SeoHead.astro`, delete the three font `<link>` lines (the 24-29 block: preload-as-style, print-onload stylesheet, noscript stylesheet). Add to the frontmatter (top `---` block):
```astro
import frauncesWoff2 from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
```
And where the old links were:
```astro
<link rel="preload" as="font" type="font/woff2" href={frauncesWoff2} crossorigin />
```
(Use the exact filename from Step 2 if it differs.) Keep `<link rel="icon">` and all meta tags untouched.

- [ ] **Step 6: Locate CSP; tighten only if a real enforced file exists**

```bash
cd /Users/artemmac/dev/awesome-everything
grep -rIl "Content-Security-Policy\|font-src\|style-src" site/public site/functions functions wrangler.toml site/astro.config.mjs 2>/dev/null | grep -v content/lessons
```
If a real CSP file is found: remove `https://fonts.googleapis.com` from `style-src` and `https://fonts.gstatic.com` from `font-src` (fonts are now `'self'`). If nothing is found, skip — record "no enforced CSP present" in the report. Do NOT invent a CSP.

- [ ] **Step 7: Build**

Run: `cd site && bun run build`
Expected: clean, ~301 pages, fonts bundled into `/_astro/`. No build error about missing fontsource CSS/woff2.

- [ ] **Step 8: Verify no external font requests remain**

```bash
cd site && grep -rn "fonts.googleapis.com\|fonts.gstatic.com" dist/en/index.html dist/ru/index.html
```
Expected: NO matches (LCP-path pages no longer reference Google Fonts).

- [ ] **Step 9: Commit**

```bash
git add site/package.json site/bun.lock site/src/styles/global.css site/src/styles/tokens.css site/src/components/brand/SeoHead.astro
git commit -m "perf(fonts): self-host Fraunces/Inter Tight/JetBrains via fontsource; preload LCP font; drop Google Fonts chain"
```
(Include the CSP file in `git add` if Step 6 modified one.)

---

### Task 3: Whole-branch verification (Lighthouse + visual)

**Files:**
- None modified; verification only.

- [ ] **Step 1: Serve the built site locally**

Run: `cd site && bun run preview &` (or `bunx serve dist`). Note the local URL (e.g. `http://localhost:4321/en/`).

- [ ] **Step 2: Lighthouse mobile on /en/**

Use chrome-devtools MCP `lighthouse_audit` (mobile preset) on `http://localhost:4321/en/`.
Expected: Performance ≥ 99; LCP < 2.5s; CLS ≈ 0 (no regression). Record scores.

- [ ] **Step 3: Lighthouse desktop on /en/**

Use chrome-devtools MCP `lighthouse_audit` (desktop preset) on `http://localhost:4321/en/`.
Expected: Accessibility 100; the "contrast ratio" audit no longer flags the rail. Record scores.

- [ ] **Step 4: Visual check both themes + RU**

Open `/en/` and `/ru/`, toggle light/dark. Confirm: rail labels (A MAP OF THE CRAFT, English for Engineers, Glossary, Language) clearly readable in both themes; `h1` renders in Fraunces on EN, serif fallback on RU; body in Inter Tight (RU Cyrillic renders); mono in JetBrains (RU Cyrillic renders). Screenshot via chrome-devtools MCP `take_screenshot`.

- [ ] **Step 5: Record results in report; no commit (verification only).**

---

## Self-Review

**Spec coverage:** Part A (3 contrast lines) → Task 1. Part B (deps/import/remove-Google/preload/CSP) → Task 2. Cyrillic subsets → Task 2 Step 4. Fraunces-no-Cyrillic fallback → Global Constraints + Task 2 Step 4. Verification (build/Lighthouse/visual) → Tasks 1 Step 5, 2 Steps 7-8, 3. Branch-off-main + dirty-WIP protection → Task 0. Node bump out-of-scope → Global Constraints. All spec sections covered.

**Placeholder scan:** No TBD/TODO. CSP "if found" is an explicit guarded conditional with a concrete grep. Italic-import "if exists" is guarded with a concrete `ls` check + named fallback.

**Type/name consistency:** Family names (`Fraunces Variable` etc.) flagged for runtime verification in Task 2 Step 2 and used consistently in Steps 3 + 5. woff2 filename `fraunces-latin-wght-normal.woff2` consistent between Steps 2 + 5. Token edits (tokens.css:13-15) match the import names.
