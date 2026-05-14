# Content + component audit — 2026-05-14

**Scope:** 16 piece pairs (networking 01-08, databases 01-08) × EN/RU = 32 MDX files; plus 5 layout/page files; plus all components touched in P1-P6 redesign.

**Method:** 4 parallel read-only investigator subagents covered (1) anchors+links, (2) component+import consistency, (3) i18n parity, (4) frontmatter+sources+style. Findings verified by controller before reporting (one agent had a false-positive on `client:load` detection due to multi-line tag grep — discarded).

## Severity legend

- **critical** — build break or rendered page unusable
- **important** — visual or correctness regression, user-visible
- **minor** — cosmetic / cleanup
- **trivial** — 1-line obvious auto-fix candidate

---

## Critical

None. Build is green, 301 pages render, lint clean.

---

## Important

### I1 — Databases 08 RU has `-ru` suffix on anchor IDs

**File:** `site/src/content/book/ru/databases/08-putting-it-together/index.mdx`

Auto-generated suffix breaks EN ↔ RU anchor parity. Examples found: `mm-1-ru`, `mm-2-ru` … `mm-8-ru`, `sr-tradeoff-matrix-ru`, `sr-design-1-ru`, plus more. EN uses unsuffixed IDs (`mm-1`, `sr-design-1`).

Impact: cross-link `[Y](#mm-1)` written for EN doesn't resolve to RU element. TOC depth checkpoints assume EN ids.

**Fix:** strip `-ru` from every `id="*-ru"` in RU file. ~20-30 substitutions. Mechanical.

### I2 — Networking RU pieces are short one RetrievalDrawer each

**Files:** networking/01 through 08 (EN has 4, RU has 3 in all 8 pieces; pattern is consistent).

The senior-tier RetrievalDrawer is present in EN but missing in RU translations across the entire networking chapter. RU readers on senior tier get fewer retrieval prompts.

Impact: i18n parity rule passes (parity rule counts component types loosely), but pedagogy drifts. Senior-tier RU reader misses one recall practice block per piece.

**Fix:** add 1 RetrievalDrawer to the senior tier of each RU networking piece (8 additions, ~3 lines each). Content authoring, not mechanical — needs translated retrieval prompts. Better deferred to a content sweep.

### I3 — Networking RU pieces missing SpiralCue / FadedExample

**Files / count drift:**

| Piece | EN SpiralCue | RU SpiralCue | EN FadedExample | RU FadedExample |
|-------|:---:|:---:|:---:|:---:|
| networking/01-physical-link | 1 | 0 | 0 | 0 |
| networking/04-dns-resolution | 2 | 1 | 1 | 0 |
| networking/06-http-versions | 2 | 1 | 1 | 1 |
| networking/07-cdn-edge | 2 | 1 | 1 | 0 |

Impact: thread navigation (`<SpiralCue>`) and worked-example walks (`<FadedExample>`) absent in RU. SpiralCue is small (one inline chip per occurrence); FadedExample is a full walkthrough island.

**Fix:** add the missing components to RU files. Each FadedExample needs translated step labels/code/notes. Defer to content sweep.

### I4 — Databases 08 + networking 08 capstones inline rendered HTML for MetaphorComplete

**Files:** `book/en/databases/08-putting-it-together/index.mdx`, `book/ru/databases/08-putting-it-together/index.mdx` (and probably the EN/RU networking 08 capstones too — not verified line-by-line).

`<MetaphorComplete>` JSX components were inlined as raw `<section data-metaphor-complete ...>` HTML during initial authoring. The capstone files contain 126 (EN) and 143 (RU) legacy class occurrences (`text-bbg-*`, `bg-panel-*`, `border-panel-*`) baked into these inlined blocks.

Impact:
- P1-P6 token migration does not propagate to these inlined sections (they still use legacy hex colours via the legacy aliases).
- Future component changes to `<MetaphorComplete>` won't apply.
- Visually inconsistent with the editorial restyle.

**Fix:** convert the inlined HTML blocks back to `<MetaphorComplete>` JSX calls. Mechanical-ish — the data (term, definition, accepted answers) is embedded in the HTML and can be lifted.

### I5 — Networking 08 RU thinner persona dialog density

**File:** `book/ru/networking/08-putting-it-together/index.mdx`

EN has 12 `<PersonaTag>` mentions across the walk (bea×3, sven×2, rex×2, cara×2, patty×2, rita×1). RU has 6 (one of each). The walk reads more terse in RU; some persona-as-character moments are flattened to single mention.

Impact: stylistic drift; doesn't break anything but the persona-driven narrative is the chapter's signature device.

**Fix:** translate the missing persona-tagged moments into RU body. Content authoring.

---

## Minor

### M1 — Chapter overview page uses legacy Tailwind tokens

**File:** `site/src/pages/[lang]/[pillar]/index.astro`

5 occurrences of `text-bbg-muted`, `bg-panel-lilac`, `border-panel-lilac-ink`, `text-panel-lilac-ink`, `text-bbg-ink` (lines 33, 37, 39, 42, 49).

Impact: visual mismatch with P1-P6 editorial palette. The pillar overview page still ships pastel cards from before the redesign.

**Fix:** P7 candidate — restyle this page to match the editorial system. Touch one file.

### M2 — Unused MDX imports

**Files (verified ≠ false positive):**

EN:
- `book/en/databases/08-putting-it-together/index.mdx:34` — `NumbersCard` unused
- `book/en/databases/08-putting-it-together/index.mdx:39` — `FadedExample` unused
- `book/en/databases/08-putting-it-together/index.mdx:40` — `TraceScenario` unused
- `book/en/networking/01-physical-link/index.mdx:35` — `PersonaTag` unused
- `book/en/networking/06-http-versions/index.mdx:40` — `Card` unused
- `book/en/networking/07-cdn-edge/index.mdx:35` — `Card` unused
- `book/en/networking/08-putting-it-together/index.mdx:34` — `Card` unused

RU:
- `book/ru/databases/08-putting-it-together/index.mdx:34` — `NumbersCard` unused
- `book/ru/databases/08-putting-it-together/index.mdx:39` — `FadedExample` unused
- `book/ru/databases/08-putting-it-together/index.mdx:40` — `TraceScenario` unused
- `book/ru/databases/08-putting-it-together/index.mdx:41` — `TradeoffMatrix` unused
- `book/ru/databases/08-putting-it-together/index.mdx:42` — `DesignPrompt` unused
- `book/ru/networking/01-physical-link/index.mdx:28` — `ReactiveDiagram` unused
- `book/ru/networking/01-physical-link/index.mdx:31` — `SpiralCue` unused (likely real — RU has 0)
- `book/ru/networking/04-dns-resolution/index.mdx:33` — `FadedExample` unused
- `book/ru/networking/06-http-versions/index.mdx:40` — `Card` unused
- `book/ru/networking/07-cdn-edge/index.mdx:29` — `FadedExample` unused
- `book/ru/networking/07-cdn-edge/index.mdx:36` — `Card` unused
- `book/ru/networking/08-putting-it-together/index.mdx:34` — `Card` unused

**Fix:** strip the unused `import X from "..."` lines. Mechanical. Trivial. Safe to auto-fix.

---

## Trivial (auto-fix scope)

- All M2 unused-import removals (~19 lines)
- M1 legacy class swaps in `[lang]/[pillar]/index.astro` (5 occurrences, deterministic mapping)

---

## Clean (no findings)

- Frontmatter completeness across all 32 pieces (slug/lang/pillar/chapter/order/title/summary/readingMin/status/prereqs/spiral/personas/depth/sources all present and valid).
- Status values (`stub`/`draft`/`ready`).
- Personas array refs only valid IDs.
- Spiral array refs only the 4 valid threads.
- Sources URLs — no placeholders, ≥3 sources on ready pieces.
- Cross-piece markdown links and anchor refs.
- `depth.{mechanism,tradeoff,failure_mode,numbers}` IDs all resolve to body elements (across 32 files).
- `frontmatter.prereqs[]` slugs all reference existing pieces in same chapter.
- Import path depth — all 5 `..` segments.
- Sandbox imports (`RequestBudgetSandbox`, `DBLeverSandbox`) paths + hydration directives correct.
- Component prop signatures across 32 pieces.
- `<RetrievalDrawer client:load>` present on all 56 instances (initial agent false positive verified).
- Topic.astro, Chapter.astro, `[lang]/index.astro` post-redesign composition correct.

---

## Recommendation order

1. Auto-fix Trivial (M1 + M2): one commit, mechanical.
2. Decide on I1 (databases/08 RU `-ru` suffix): pure mechanical mass-edit, low risk. Recommend fix now.
3. Defer I2 + I3 (networking RU component drift): real content authoring across 8 pieces. Schedule a content sweep session.
4. Defer I4 (capstone inlined HTML): scope is small but tedious. Single piece each lang. Can fit into the content sweep.
5. Defer I5 (networking 08 RU thin dialog): same content sweep.
6. P7 for visual chrome on `[lang]/[pillar]/index.astro`.
