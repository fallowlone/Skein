# Fullstack on-ramp ("zero level") — design

**Date:** 2026-05-30
**Status:** approved (pilot)
**Pilot scope:** `deployment` (Deployment & Infra). Rollout to the other 15 fullstack pillars is a separate follow-up effort.

## Problem

The three `foundations` tracks (`math`, `algorithms`, `base-cs`) open "from zero" — they assume no background. The 16 fullstack pillars deliberately target `middle+/senior` (see `curriculum.md`), so every pillar's first lesson is already `level: junior` on a real topic (e.g. Deployment opens at `01-image-layers`). A reader without background has no gentle entry into a pillar — there is no visible "zero level" on-ramp the way foundations has one.

Confirmed by inspection: the `level` enum in `src/content.config.ts` **does** include `"zero"` (alongside `junior | middle | senior`), and `AltitudeGauge`, `Lesson.astro`, and `connections-index` already handle it — but **no lesson is authored at `level: zero` yet**. Every deployment unit has exactly one `junior` lesson, so the gap is not missing junior coverage — it is the absence of the from-scratch `level: zero` entry the data model already anticipates.

## Goal

Add a single **on-ramp lesson** at the very top of a fullstack track that assumes nothing: it gives the mental model, the vocabulary, and a map of the track, then bridges into Unit 01. The rest of the track keeps its senior depth bar untouched.

Non-goals: building a full beginner sub-curriculum per pillar (that would duplicate `foundations` and break the parallel-program design), and changing the depth bar of existing lessons.

## Placement (approved)

A **dedicated new unit** `00-start-here` for the pilot track, containing one lesson.

- Unit slug: `00-start-here`, `order: 0`, title `{ en: "Start from zero", ru: "С нуля" }`. (Requires relaxing the `units` schema `order` from `.positive()` to `.nonnegative()` so a unit can sort before order 1.)
- Renders as the first card in the track nav: a visible "0 · Start from zero" entry — the "zero level" the user expected.
- One lesson, `lessonType: topic`, **`level: zero`**, authored EN + RU.

Rationale over the alternative (a `00-start` lesson nested inside `01-image-layers`): a standalone Unit 0 gives the strongest, most discoverable "zero level" signal and mirrors how foundations reads. The nested-lesson option remains the documented fallback if a unit-level lint rule blocks a quiz/project-less unit (see Risks).

## Lesson shape

Fullstack lessons use the **topic** skeleton. The build linter (`src/lint/rules/lessons.ts`, `checkTopicLesson`) requires, in order:

1. `hook`
2. `crux`
3. `explanation`
4. `key-takeaway`
5. `recap`

Plus: ≥1 visual widget (`data-lesson-visual`), ≥2 exercise widgets (e.g. `Quiz` + `DragOrder`), **exactly 1** `RetrievalDrawer`, and ≤5 hydration islands. Topic lessons do **not** require a `PracticeSet` (the existing `01-image-layers` topic lesson has none); inline exercise widgets satisfy the bar.

Content (Deployment pilot):

- **Hook** — "your code runs on your laptop; how does it end up running for users?"
- **Crux** — deployment = turning your code into a reproducibly runnable thing on someone else's machine.
- **Explanation** — a from-zero vocabulary pass, one sentence each on *why it exists*: image, container, registry, orchestrator, rollout, IaC, secret, load balancer.
- **Visual** — a simple pipeline diagram: `laptop → build → image → registry → run → users`.
- **Key-takeaway** — the whole track is "make that pipeline reliable and repeatable."
- **Recap + bridge** — "next: Unit 01, what an image is actually made of."

Components, frontmatter, and import paths are mirrored from an existing `topic` lesson (`deployment/01-image-layers/01-overview`) so whatever lint rules apply are satisfied by construction.

## Registration & data flow

1. Add the `00-start-here` unit object to `site/src/content/units.json` (fields mirror existing units: `id`, `slug`, `track`, `order`, `title`, `crux`, `lessons`, `status`). Its `lessons` list contains the single lesson slug (e.g. `01-overview`).
2. Author `site/src/content/lessons/en/deployment/00-start-here/01-overview/index.mdx` and the `ru/` mirror. Frontmatter `track: deployment`, `unit: 00-start-here`, `slug: 01-overview`, `lessonType: topic`, `level: junior`, `order: 1`, plus `summary`, `estMin`, `sources`, `concepts`, `status: ready`.
3. Lessons register via the `lessons` content collection (`getCollection`), keyed by `track/unit/slug`; the route `[lang]/learn/[track]/[unit]/[lesson].astro` builds the page. Practice attaches via the `practice` collection on `lessonKey = "deployment/00-start-here/01-overview"`.
4. Any new technical terms go into `site/src/i18n/glossary.json`, inserted alphabetically, locked per locale.

## Constraints

- **Bilingual or refuse** — EN and RU both authored or the work does not ship.
- **i18n parity** — glossary terms and UI labels present in both locales.
- **Lint clean** — `bun run build` in `site/` produces a clean `dist/lint-report.json` (topic-lesson rules + hydration cap + sources + i18n parity).
- **Depth bar** — only the on-ramp lesson is from-zero; no existing lesson is softened.

## Verification

1. `cd site && bun run build` — 0 lint errors; lesson page builds at `/{en,ru}/learn/deployment/00-start-here/01-overview/`.
2. Visual check both languages: rendering, the pipeline visual, exercise widgets, the single RetrievalDrawer, and the bridge link into Unit 01.
3. Track nav shows "0 · Start from zero" as the first card on the Deployment track page.

## Risks & open items (resolve during planning)

- **Unit-level obligations.** Existing units list `quiz-choice`, `quiz-short`, `project` in their `lessons` array, so a unit may be expected by `block-stubs.ts` / `practice.ts` / `drill.ts` lint to carry those blocks. Plan step 1 must run the relevant lint rule against a quiz/project-less Unit 0. If it fails, fall back to either (a) the nested-lesson placement inside `01-image-layers`, or (b) adding minimal quiz/project stubs to Unit 0.
- **Stub state.** Deployment units are currently `status: stub` with placeholder cruxes. The on-ramp is authored `ready`; it does not depend on the rest of the track being authored, but copy should not over-promise content that is still a stub.
- **Lint path matcher.** `lessonInfoFromPath` matches a 6-segment dist path while built lessons are 7 segments (`.../<track>/<unit>/<lesson>/index.html`); the topic-section checks may not currently fire on nested lessons. Mirror an existing topic lesson regardless so the lesson is correct even if the rule is dormant; note the discrepancy for a separate fix.

## Rollout (post-pilot)

Once the Deployment on-ramp is approved in-product, template the same Unit `00-start-here` + single topic lesson across the remaining 15 fullstack tracks (30 MDX files EN+RU), each with track-specific vocabulary and pipeline visual. Tracked as a separate effort.
