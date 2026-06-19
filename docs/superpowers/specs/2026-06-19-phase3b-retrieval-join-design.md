# Phase 3b — Retrieval-Grade → Concept-Mastery Join

**Date:** 2026-06-19
**Status:** Design approved, pending implementation plan
**Predecessor:** `2026-06-19-retention-loop-review-concept-graph-design.md` (Phase 3, shipped)

## Problem

Phase 3 wired retrieval grades into the retention loop: `<RetrievalDrawer>` 1–4 grade
buttons call `recordReview`, grades persist to `/review`, and `unitReviewHealth` is meant
to fold review evidence into concept mastery (Seam B1/B2). For **PRACTICE** cards this
works — `PracticeSection` receives a route-derived 3-segment `lessonKey`
(`<track>/<unit>/<slug>`) from `Lesson.astro`, so `cardsFromPractice` seeds a joinable key.

For **RETRIEVAL** cards the join is dead. Every real `<RetrievalDrawer>` call site
(~2696, en+ru) passes a hand-authored bare `id` like `id="07-stability-retrieval"` —
single-segment, ad-hoc, not the lesson slug. `cardsFromRetrieval` seeds that bare id as
the card's `lessonKey`, and `unitReviewHealth` drops it:

```
// src/scripts/path/path-io.ts (unitReviewHealth)
const seg = c.lessonKey.split("/");
if (seg.length < 2) continue;          // bare id has 0 slashes → dropped
const unitId = `${seg[0]}/${seg[1]}`;
```

Result: retrieval grades never reach `applyReviewEvidence`, so the retention loop ignores
the single most pedagogically important signal (active recall). Documented in code at
`path-io.ts` (comment, commit `97d9d584`) and deferred from Phase 3.

## Why the layout can't fix it centrally

`RetrievalDrawer` is instantiated **inside the MDX body** via an explicit
`import RetrievalDrawer from "~/components/pedagogy/RetrievalDrawer.tsx"`. Explicit MDX
imports shadow Astro's `<Content components={...}>` map, so `Lesson.astro` — which already
holds the canonical key (`${trackSlug}/${unitSlug}/${slug}`, line 118) — cannot inject a
per-instance prop into the drawer. The Preact island also cannot read Astro page context
at runtime. The canonical key must be supplied at or before MDX compile.

## Approach (chosen)

**Frontmatter-derived injection via a build-time remark plugin.** Rejected alternatives:
codemod 2696 call sites (huge diff, fragile JSX rewrite, needs template + lint follow-up
to keep future lessons compliant); runtime id→key resolver (bare ids are not globally
unique → collisions; island has no page context).

The remark plugin reads each lesson's frontmatter (`track`, `unit`, `slug` — present on
every lesson) and injects `lessonKey="<track>/<unit>/<slug>"` into every `RetrievalDrawer`
JSX node. Zero content edits, single source of truth, automatically covers all current and
future lessons.

## Components

### 1. `site/src/lib/remark-retrieval-lessonkey.mjs` (new)

A remark plugin (`(tree, file) => void`) that:

- Visits `mdxJsxFlowElement` nodes where `node.name === "RetrievalDrawer"`.
- Reads `file.data.astro.frontmatter`. If `track && unit && slug` are all present, computes
  `lessonKey = \`${track}/${unit}/${slug}\`` and pushes an `mdxJsxAttribute`
  (`name: "lessonKey"`, value: the string).
- **Guards:** skip if frontmatter lacks any of track/unit/slug (non-lesson MDX, e.g. legacy
  `book/` — leaves the bare-id fallback intact, current behavior); skip if the node already
  has a `lessonKey` attribute (idempotent).

Registered in `astro.config.mjs` under `markdown.remarkPlugins`. Uses `unist-util-visit`
(transitive dep of the existing MDX toolchain — confirm availability at plan time; vendor a
2-line manual walk if absent).

### 2. `site/src/scripts/review-harvest.ts` — `cardsFromRetrieval`

Signature changes from `(pieceSlug, lang, questions)` to
`(cardSlug, lessonKey, lang, questions)`:

- `cardKey = \`${cardSlug}::retrieval::${index}\`` — **unchanged shape, derived from the
  bare id** so existing SM-2 schedules are preserved (not orphaned).
- `lessonKey = lessonKey` — the canonical join key.

Only callers: `RetrievalDrawer.tsx` and the harvest test. `cardsFromPractice` is untouched.

### 3. `site/src/components/pedagogy/RetrievalDrawer.tsx`

- Add optional prop `lessonKey?: string` to `Props`.
- `slug = pieceSlug ?? id ?? ""` stays the card/display/`recordReview` identifier.
- Seed call becomes `cardsFromRetrieval(slug, lessonKey ?? slug, lang, questions)` — when
  the plugin didn't inject (non-lesson / incomplete frontmatter), falls back to the bare
  slug = exactly today's behavior, no regression.

### 4. `site/src/scripts/review-state.ts` — `addCard` self-heal

The existing-card branch currently refreshes only content fields:

```
s[seed.cardKey] = { ...existing, front: seed.front, back: seed.back, lang: seed.lang };
```

Add `lessonKey: seed.lessonKey` so cards seeded in the Phase-3a era with a bare `lessonKey`
get the canonical key refreshed on the next drawer mount. The SM-2 schedule, `dueAt`,
`addedAt`, and `lastReviewedAt` are untouched — only the derived join field updates.

## Data flow

```
MDX build
  → remark plugin reads frontmatter track/unit/slug
  → injects lessonKey="<track>/<unit>/<slug>" into <RetrievalDrawer>
  → Astro serializes prop to Preact island
  → cardsFromRetrieval(slug, lessonKey, …) seeds card { cardKey: bare, lessonKey: canonical }
  → addCard upserts (self-heals stale lessonKey on existing cards)
  → unitReviewHealth: lessonKey.split("/") → ["track","unit","slug"] → bucket "track/unit"
  → applyReviewEvidence folds review evidence into concept mastery (Seam B1/B2)
```

This is the identical path PRACTICE cards already travel; retrieval cards now join it.

## Error handling / edge cases

- **Incomplete frontmatter:** plugin no-ops → bare-id fallback → card seeded but dropped by
  `unitReviewHealth` (today's behavior, no crash).
- **Pre-existing bare-id cardKey collisions** (two lessons with the same ad-hoc id): out of
  scope. This fix touches only `lessonKey`, not `cardKey`; collision risk is unchanged from
  before Phase 3b.
- **JSX-bodied questions:** still skipped by `cardsFromRetrieval` (needs string front/back);
  unchanged.

## Testing

- **Plugin unit test:** injects `lessonKey` given full frontmatter; skips when
  track/unit/slug missing; ignores non-`RetrievalDrawer` nodes; idempotent when the
  attribute is already present.
- **`cardsFromRetrieval`:** seeds canonical `lessonKey` while keeping `cardKey` bare.
- **`addCard`:** refreshes `lessonKey` on an existing cardKey, preserves the schedule.
- **`unitReviewHealth`:** retrieval cards with a canonical key now contribute to the unit
  bucket — direct regression guard for the original bug.

## Verification

- `bun run build` (in `site/`): lessons render with the injected prop; spot-check a built
  page's HTML island props for the canonical `lessonKey`.
- Full unit suite (1135 + new) green; `lint:src` clean.

## Scope boundaries

- No change to `cardKey` format (keep bare id — preserves graded-card history).
- No codemod of MDX content.
- No `/infographic` or `/teach` template change required (plugin is automatic).
- Out of scope: bare-id cardKey collision dedup.
