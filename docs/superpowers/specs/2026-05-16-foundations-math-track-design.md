# Foundations: Math Track — Design Spec

**Date:** 2026-05-16
**Status:** Approved (brainstorming)
**Scope:** Math track only. Algorithms track is a separate later cycle (own spec → plan → implementation).

## Purpose

Add an absolute-beginner learning section to the curriculum site, parallel to the
existing 16-pillar fullstack program. The first track is **mathematics**, taught for
a reader who knows only basic arithmetic (counting and small-number +−×÷). It must
use very detailed explanations, visual demonstrations, and heavy practice, and carry
the learner up to the math foundation required for a future algorithms track.

The existing fullstack program (`book` collection, `/infographic` command, depth bar
middle+/senior, domain lock) is **not modified**. The new section is fully isolated.

## Decisions (from brainstorming)

1. **Location** — separate section inside the same repo (`site/`), reusing the Astro
   build and shared components, but with its own content collections, schema, linter,
   layout, and authoring command.
2. **Order** — math first; algorithms is a later, separately specced cycle.
3. **Lesson format** — linear guided path with optional collapsible insets. This is
   the *inversion* of the fullstack site: there the tiered accordion is the mandatory
   skeleton; here the skeleton is linear and depth insets are optional add-ons. An
   absolute beginner must not be asked to pick a depth tier.
4. **Visuals** — own widget family, minimal JS. Most visuals are static SVG (Astro,
   zero hydration); a few interactive Preact islands only where interaction teaches.
5. **Languages** — bilingual RU + EN, with i18n parity enforced (same as fullstack).
6. **Math scope endpoint** — "foundation for CS": arithmetic → fractions/percents →
   variables/algebra → functions → logic/sets → growth/logarithms → combinatorics →
   probability.

## 1. Architecture and layout

The new section lives in `site/`, reuses Astro and the build, but runs its own
pipeline. Terminology is parallel to the fullstack program but distinct, to avoid
confusion:

- **Track** = `math` (analog of Topic). `algorithms` added later.
- **Unit** = a chapter of a track (analog of Chapter), ~6–9 lessons.
- **Lesson** = one lesson (analog of Piece) — one MDX file.

### Content tree

```
site/src/content/
  foundations.json          16-pillar fullstack — UNCHANGED
  chapters.json             UNCHANGED
  tracks.json               NEW: tracks (math; later algorithms)
  units.json                NEW: units (chapters) of a track
  lessons/                  NEW: lessons collection
    en/math/<NN-unit>/<NN-lesson>/index.mdx
    ru/math/<NN-unit>/<NN-lesson>/index.mdx
```

### Routing

New pages under the `/learn/` prefix, separate from the fullstack routes
(`[lang]/[pillar]/`):

```
src/pages/[lang]/learn/index.astro              track list
src/pages/[lang]/learn/[track]/index.astro      unit overview for a track
src/pages/[lang]/learn/[track]/[lesson].astro   lesson reader
```

### Isolation

`book` (fullstack) and `lessons` (foundations) are two independent Astro content
collections in `config.ts`. The `CLAUDE.md` domain lock continues to govern
`/infographic`; the new `/teach` command has its own domain (mathematics, later
algorithms). No conflict between the two programs.

## 2. Lesson model

### Frontmatter schema (`lessons` collection, Zod)

No `depth` object — the lesson body is linear.

```yaml
slug: 03-place-value          # ^\d{2}-[a-z0-9-]+$
lang: ru                      # en | ru
track: math
unit: 01-numbers              # ^\d{2}-[a-z0-9-]+$
order: 3
title: "Разряды числа"
summary: "Почему 30 и 3 — разные, хотя цифра одна."
estMin: 18
status: ready                 # stub | draft | ready
prereqs: ["01-counting", "02-comparing"]
concepts: ["разряд", "ноль как заполнитель"]   # feeds the glossary
sources:
  - https://...                                # >= 1
```

### Lesson body skeleton (fixed linear order, linter-checked)

1. **Hook** — 1–2 sentences, an everyday situation.
2. **Goal** — what the learner will be able to do after the lesson (replaces `Crux`).
3. **Explanation** — broken into small `<Step>` units, one idea per step.
4. **Visual** — a math widget (number line / plot / figure).
5. **WorkedExample** — one example solved fully, step by step, nothing hidden.
6. **Practice** — several exercises with immediate feedback (the main block — "heavy
   practice").
7. **Check** — a short "now you try" check.
8. **Recap** — what was learned (replaces `KeyTakeaway`).

### Optional insets (collapsed by default, inserted where useful)

- `<WhyInset>` — "why this works" (intuition / proof).
- `<MorePracticeInset>` — extra problems for the curious.
- `<MistakeInset>` — a common mistake and how to avoid it.

### Absolute-zero principle

Every new term is introduced before it is used. No word from a future lesson appears.
The linter verifies every term in `concepts` is introduced in this lesson or reachable
through the `prereqs` chain.

## 3. Math track map

Start: the reader knows counting and small-number arithmetic only. Finish: the math
foundation required for an algorithms track. **10 units**, each ~6–9 lessons.

| #  | Unit                      | Covers                                                                 | CS relevance              |
|----|---------------------------|------------------------------------------------------------------------|---------------------------|
| 01 | Numbers and counting      | place value, number line, comparison, negatives, integers             | base intuition            |
| 02 | Four operations in depth  | meaning of +−×÷, order of operations, properties, remainder            | division remainder → modulo |
| 03 | Fractions, decimals, %    | part of a whole, equivalence, operations, ratios                       | fractions, normalization  |
| 04 | Powers and roots          | what xⁿ means, square root, powers of two                              | 2ⁿ, bits                  |
| 05 | Variables and algebra     | what a variable is, expressions, equations, solving linear equations   | variable = a cell         |
| 06 | Functions                 | input→output machine, notation, graphs, linear function, slope         | function in code          |
| 07 | Logic and sets            | true/false, AND/OR/NOT, sets, membership, Venn diagrams                | boolean logic, conditions |
| 08 | Growth and logarithms     | linear vs exponential growth, what a logarithm is, log as inverse      | O(log n), complexity      |
| 09 | Combinatorics             | multiplication rule, permutations, combinations                        | counting possibilities    |
| 10 | Probability               | basic probability, independent events, expected value                  | randomized algorithms     |

Total ~70–80 lessons × 2 languages. Units 07–10 are the direct bridge to the future
algorithms track.

Implementation is phased by unit (e.g. P0 = infrastructure + Unit 01, P1 = Units
02–04, etc.) — not a single large pass. The implementation plan defines the phases.

## 4. Math widget family

Principle: most visuals are static SVG (Astro, zero hydration); interaction is used
only where it teaches. Hydration cap per lesson = 5 islands (same as fullstack).

### Static visual widgets (`.astro`, 0 islands)

- `NumberLine` — a number line with marked points and highlighting.
- `PlaceValueGrid` — digit/place columns.
- `BarModel` — bar / area model (fractions, multiplication).
- `FunctionPlot` — a function plotted on a grid.
- `GeometryFigure` — shapes and angles.
- `StepThrough` — scroll-triggered step animation (GSAP, like the existing diagram
  primitives `Reveal`/`Connector` — no hydration).

### Interactive widgets (`.tsx`, Preact islands, counted in the cap)

- `PracticeSet` — the main practice block. One island holds several problems:
  numeric input / multiple choice / drag-order. Immediate checking, step hints,
  optionally generated number variations. Many problems = 1 island.
- `FunctionExplorer` — a slider changes a parameter and the plot rebuilds (slope,
  growth) — for Units 06 and 08.
- `NumberLineDrag` — drag a point, see the value.

### Reused from the fullstack site

- GSAP scroll primitives (`Reveal`, `CountUp`, `Pulse`) — static.
- `Quiz` — used for the Check block.
- prose / layout primitives (`Callout`, `Term`, `Card`).

### Island budget for a typical lesson

`PracticeSet` (1) + one interactive visual (1) + `Quiz` for Check (1) = 3. Within the
cap of 5 with margin. `WorkedExample` is static (steps visible immediately —
absolute-zero hides nothing); `StepReveal` is optional.

## 5. Linter for `lessons`

A separate ruleset (a foundations linter file) runs inside `bun run build`. No text
budgets — a lesson explains its topic fully (no word-count caps).

Rules:

1. **Skeleton** — present and in order: Hook → Goal → Explanation → Visual →
   WorkedExample → Practice → Check → Recap.
2. **i18n parity** — every EN lesson has an RU twin with the same slug and structure.
3. **Glossary** — terms in `concepts` are locked per locale in the shared glossary.
4. **Concept prerequisite** (the core absolute-zero rule) — every term used in a
   lesson is introduced in that lesson or reachable through the `prereqs` chain. No
   word from a future lesson.
5. **No forward links** — links point only to prereq lessons or lessons with a lower
   `order`, never to future lessons.
6. **Practice minimum** — every lesson has a `PracticeSet` with >= 4 problems.
7. **Visual minimum** — every lesson has >= 1 visual widget.
8. **Hydration cap** — <= 5 islands per lesson page.
9. **Sources** — >= 1 source in frontmatter.

The report is written to the existing `dist/lint-report.json` under a `foundations`
section. The build fails on any violation, same as today.

## 6. `/teach` command

An authoring command parallel to `/infographic`, defined in
`.claude/commands/teach.md`.

### Input form

```
/teach math/01-numbers/03-place-value
/teach math/08-growth-logs/04-what-is-a-logarithm
```

### Pipeline (one lesson, EN + RU)

1. **Verify stub** — `site/src/content/lessons/en/math/<unit>/<lesson>/index.mdx`
   exists.
2. **Research** — sources for absolute-beginner math: Khan Academy, OpenStax, vetted
   educational resources (not RFCs). Focus: correctness, common beginner mistakes,
   effective metaphors.
3. **Author EN MDX** — linear skeleton Hook → Goal → Explanation → Visual →
   WorkedExample → Practice → Check → Recap, plus insets where useful.
4. **Translate RU** — via the shared `glossary.json`, new terms added alphabetically.
5. **Verify linter** — `bun run build` in `site/`, check the `foundations` section of
   `dist/lint-report.json`.
6. **Visual check** — open EN and RU in a browser, verify rendering and widget
   interactivity.
7. **Commit** — `git commit -m "content(math): <unit>/<lesson> EN+RU ready"`.

### The command enforces

- Bilingual or refuse.
- Domain lock: mathematics only (algorithms later) — refuse off-domain.
- Skeleton in order, >= 4 practice problems, >= 1 visual, hydration cap 5.
- Absolute-zero: zero terms from future lessons.
- Status flow: stub → draft → ready.

`CLAUDE.md` gains a section describing `/teach` and the `foundations` section without
modifying the `/infographic` description.

## Out of scope

- The algorithms track (separate spec/plan/implementation cycle).
- Any change to the fullstack `book` collection, `/infographic`, the fullstack
  linter, or the depth bar.
- User accounts, progress persistence beyond what the existing site already provides.
- Auto-generated exercise content beyond the simple number-variation generation in
  `PracticeSet`.

## Open questions

None. All brainstorming decisions are resolved.
