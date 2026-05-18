# Spec — Migration: 3-tier pieces → single-level lessons

**Date:** 2026-05-19
**Status:** design approved; implementation plan pending
**Project:** open atlas — Work queue item 1
**Source of truth:** `docs/open-atlas/HANDOFF.md`

## 1. Context & goal

The curriculum site currently holds two content models:

- **3-tier pieces** (`book/` collection) — one MDX file packs junior + middle +
  senior tiers behind `<TierAccordion>`. 16 pillars: 51 pieces fully authored
  (networking 12, browser 8, databases 8, observability 8, performance 8, plus 7
  lone ready pieces in partial pillars), 81 stub pieces.
- **single-level lessons** (`lessons/` collection) — foundations tracks (math,
  base-cs, algorithms): one focused lesson per file, one level.

open-atlas Locked Decision #2 mandates Model A: every topic is a connected chain of
single-level lessons spanning zero→senior — NOT the 3-tier-in-one-document model.

**Goal:** retire the 3-tier model; convert all `book/` content into the unified
single-level `lessons` model. No dual model remains.

## 2. Locked inputs

From HANDOFF + this brainstorm:

- Scope: all 16 pillars. 51 ready pieces content-migrated; 81 stubs → lesson stubs.
- Split shape (decision A2): each piece → ~5-9 single-level lessons, cut at subtopic
  boundaries. Junior tier → 1 lesson; middle/senior tiers → 2-4 lessons each.
- Direction law (#4): zero at bottom, senior at top.
- Lessons are the light editorial reading zone (#5).
- Theory only; practice deferred (#8).

## 3. Target taxonomy

| 3-tier model | → | lesson model |
|---|---|---|
| Pillar (16) | → | Track |
| Piece — narrow topic, e.g. "TCP handshake" (132) | → | Unit |
| Tier — junior/middle/senior in one piece | → | N lessons, each one level |

- 16 pillar slugs join the `Track` enum (math, base-cs, algorithms + 16 = 19 tracks).
- `tracks.json`: 16 entries ported from `pillars.json` — slug, spine order,
  `title{en,ru}`, `blurb{en,ru}`, `color`. Extend the `tracks` `color` enum if pillar
  colors exceed the current 5 values.
- `units.json`: 132 entries ported from `chapters.json` piece lists. Per unit:
  `slug` = piece slug, `track` = pillar, `order` = piece order, `title{en,ru}` =
  piece EN+RU titles, `crux{en,ru}` = piece EN+RU summaries, `lessons: []` filled as
  lessons are authored.
- Retire the `book`, `pillars`, `chapters` collections once content has moved.

## 4. Lesson schema changes

`lessons` collection gains:

- `level: "zero" | "junior" | "middle" | "senior"` — optional in schema; linter
  requires it for `topic` lessons.
- `deepensInto: string[]` — optional; lesson slugs this lesson spirals up into
  (same subtopic, higher level).
- `spiral: string[]` — optional; cross-topic thread tags, ported from the piece
  `spiral` field (encapsulation, multiplexing, statefulness, latency, …).
- `lessonType` enum extended: `concept | coding | topic`.

Reused unchanged: `prereqs` (→ builds-on), `track`, `unit`, `order`, `status`,
`sources`, `concepts`, `summary`, `estMin`.

## 5. The `topic` lesson skeleton

New `lessonType: topic` for fullstack lessons. Body skeleton — one level, one
subtopic:

```
Hook → Crux → Explanation (prose + ≥1 Visual)
     → exercises + <Inset> interleaved
     → KeyTakeaway → RetrievalDrawer → Recap
```

- The connected-lessons block is rendered by the lesson layout from resolved
  frontmatter — not authored in MDX.
- Linter contract — required sections: `hook`, `crux`, `explanation`,
  `key-takeaway`, `recap`; ≥1 element with `data-lesson-visual`; ≥2 exercise
  widgets (typical 3-5); exactly 1 RetrievalDrawer; ≤5 hydration islands. Skeleton
  components emit the section sentinels the linter checks.
- `<Inset kind="why|mistake|edgecase">` carries deep-dive asides — the destination
  for content that was senior-tier-only in the source piece.

## 6. Component migration

Surviving components, moved from piece → lesson context with no API change: Crux,
KeyTakeaway, Misconception, NumbersCard, SpiralCue, PersonaTag, FadedExample,
RetrievalDrawer, and exercises Quiz, DragOrder, MetaphorComplete, TraceScenario,
DebugLog, TradeoffMatrix, RFCQuiz, DesignPrompt.

Removed: `TierAccordion.astro` and the 3-tier scaffold `site/scaffolds/3-tier-piece.mdx`.
Senior-tier asides relocate into `<Inset>`.

## 7. Connection relations

Four relations surfaced on every lesson page (per `lesson-preview.astro`):

| Relation | Source |
|---|---|
| builds-on | `prereqs` frontmatter — explicit |
| unlocks | derived — inverse of all lessons' `prereqs` |
| deepens-into | `deepensInto` frontmatter — explicit; fallback = next-higher-`level` lessons in the same unit |
| appears-again-in | derived — lessons in *other* tracks sharing a `spiral` thread tag |

Build-time `site/src/scripts/connections-index.ts`, modeled on the existing
`glossary-index.ts`: scans all lessons, resolves the four relations into a per-lesson
connection object consumed by the lesson layout. Pure and unit-tested.

## 8. Linter rework

- **Removed** (piece-only, dead after migration): `depth-checkpoints`,
  `tier-accordion`, `tier-word-budgets`, `exercise-counts`.
- **Retargeted** to lessons: `text-budgets`, `sources`, `personas`, `spiral-cues`,
  `i18n-parity` (EN/RU lesson parity).
- `lessons.ts`: new `checkTopicLesson` branch, routed by `lessonType: topic`,
  enforcing the §5 linter contract.
- **New** `connection-integrity.ts`: every `prereqs` and `deepensInto` slug resolves
  to an existing lesson — no dangling references.
- **Unchanged**: `cjk-leak`, `reduced-motion`.

Additions (the `topic` branch, `connection-integrity`, sentinels) land in Phase A;
removals land in Phase D — see §11.

## 9. /infographic rework

`/infographic <track>/<unit>` authors a fullstack unit's `topic` lessons — parallel
to `/teach` for foundations.

Pipeline: verify unit in `units.json` → research (WebSearch + Context7) → author the
unit's N EN lessons per the `topic` skeleton → translate RU → `bun run build` lint
gate → commit.

Drops: 3-tier scaffold, tier word budgets, per-tier exercise mix. Keeps:
bilingual-or-refuse, domain lock, text budgets, ≤5 island cap, status flow
(stub → draft → ready).

## 10. Routing

- Removed: `[lang]/[pillar]/[piece].astro` and `[lang]/[pillar]/index.astro` — the
  `book` routes; once `book/` is empty they generate 0 pages.
- Lessons render via the existing `[lang]/learn/[track]/[lesson].astro`.
- Topic index `[lang]/learn/[track]/index.astro` extended to the 16 new tracks.
- Home `[lang]/index.astro` (celestial atlas) — unaffected; uses inline sample data.
- Wiring `topic-preview`'s full ascent-scene to real collection data is a follow-up
  queue item, not this migration; the topic index route must resolve in the interim.

## 11. Execution phasing

Sequenced in detail by the implementation plan; high level. The 3-tier and lesson
models coexist transiently *during* execution — the old content cannot be deleted
before the new exists — but the end state has neither dual model nor 3-tier content.

- **Phase A — additive infra.** Non-destructive only: extend the `lessons`/`tracks`/
  `units` schema and data files, add the `topic` skeleton + components + linter-
  contract sentinels, add `connections-index`, add the `checkTopicLesson` and
  `connection-integrity` linter rules, rework `/infographic` to author `topic`
  lessons. `book/`, its routes, and its rules stay intact. Gate: `bun run build`
  green, lint 0/0.
- **Phase B — content.** Per pillar: (1) **cut plan** — for each piece decide the
  subtopic split, enumerate the lesson inventory (slug, level, title); (2) author the
  lessons EN+RU; (3) delete that pillar's now-migrated `book/` pieces. Order:
  networking, then browser, databases, observability, performance, then the 7 lone
  ready pieces.
- **Phase C — stubs.** 81 stub pieces → unit + lesson stubs (mechanical, frontmatter
  only); delete the stub `book/` pieces.
- **Phase D — teardown.** `book/` is now empty: remove the `book`/`pillars`/
  `chapters` collections, the piece routes, the piece-only linter rules
  (`depth-checkpoints`, `tier-accordion`, `tier-word-budgets`, `exercise-counts`),
  `TierAccordion.astro`, and the 3-tier scaffold. Gate: `bun run build` green.

Volume: ~400+ lessons EN, ~800+ EN+RU. Multi-chat work; the plan file tracks
per-lesson progress for resumability.

## 12. Resolved open decisions

- §10 routing: dead `book` routes are **removed**, not kept vestigial.
- §7 deepens-into: **explicit `deepensInto` field with a derived fallback**, not
  fully derived.

## 13. Non-goals

- Authoring zero-level content — pieces have none; the zero band is backfilled later
  (Wedge — Вариант 1).
- Reorganising the 16 pillars into the 7-topic open-atlas spine — taxonomy reorg is
  a separate concern.
- Full topic-page ascent-scene data wiring — follow-up queue item.
- New practice/exercises beyond what pieces already contain.

## 14. Risks

- **Build-green throughout.** Phase A is additive and Phase D is teardown of an
  already-empty `book/` — both keep the build green by construction. The real risk
  is mid-Phase-B: a pillar half-migrated across both models. Mitigation: migrate one
  pillar fully — author all its lessons, then delete all its pieces — before
  starting the next; never leave a pillar split across models.
- **A2 variable N.** The lesson inventory is unknown until each piece's cut plan is
  done. Mitigation: the cut plan is the first sub-step per pillar; the plan file
  records the enumerated inventory before any authoring.
- **~800 files / context exhaustion across chats.** Mitigation: per-lesson progress
  tracked in the plan file; subagent-driven authoring; HANDOFF rotation protocol.
