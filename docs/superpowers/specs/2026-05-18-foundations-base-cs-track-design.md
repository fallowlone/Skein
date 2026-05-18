# Foundations: Base CS Track — Design Spec

**Date:** 2026-05-18
**Status:** Approved (brainstorming)
**Scope:** Base CS track only — the third `foundations` track. Builds on the completed
math and algorithms tracks (each has its own spec → plan → implementation).

## Purpose

Add the third learning track to the `foundations` section: **Base CS**, the missing
rung in the open atlas spine between **Mathematics** and **Algorithms**. The algorithms
track currently assumes the reader "knows one programming language"; Base CS supplies
the theory underneath that assumption.

Base CS teaches **theory**, not hands-on language training. The open atlas platform
teaches theory zero → senior; learning a specific programming language by hand is a
separate kind of course and is out of scope. A Base CS reader is assumed to be loosely
familiar with code, or to be picking up syntax elsewhere in parallel. Base CS does not
drill syntax — it teaches what the machine is and what programming constructs *mean*.

- **Reader at entry:** zero CS theory. Knows arithmetic. Loosely familiar with code or
  learning syntax elsewhere. The math track is not a hard prerequisite.
- **Reader at exit:** understands the model of computation (bits → memory → CPU →
  execution) and the **theory of programming constructs** — what a value, type,
  variable, scope, function, call stack, recursion, and async actually are, and how
  each maps onto the machine. Can read and reason about code. Ready for the algorithms
  track.
- **Hardware leads, code illustrates.** The machine model is the explanatory spine:
  every programming concept is grounded in what the machine does. Code appears as a
  listing to be dissected, never as a syntax exercise.
- **Practice is conceptual** — tracing, state prediction, reasoning — never syntax
  drills.
- **Code language:** TypeScript / JavaScript, matching the site stack.

The math track, the algorithms track content, the fullstack `book` collection,
`/infographic`, and the fullstack linter are **not modified**.

## Decisions (from brainstorming)

1. **Track shape — Approach A: "machine-up, then language."** Units 01–04 build the
   machine model as one coherent block; units 05–12 cover the theory of programming
   constructs, each grounded back to the machine. The reader can hold the machine model
   in mind as a whole before constructs reference it.
2. **Endpoint — theory, not a programming course.** The reader reads and reasons about
   code; the track does not produce a hands-on coder. Teaching a specific language by
   hand is out of scope (separate courses).
3. **Hardware depth — bits → memory → CPU model.** Binary, memory as addressable cells,
   the CPU as an instruction executor, the stack/heap, compile vs interpret. Logic
   gates get one overview lesson. Transistors and deep OS/cache material belong to the
   later Systems & OS topic.
4. **Two lesson skeletons** via a new `lessonType: concept | coding` field. `concept`
   for pure machine-model lessons; `coding` for lessons built around a code listing.
   The linter branches on `track`, then on `lessonType`.
5. **Math relation — Base CS self-contains the little math it needs.** Binary numbers
   and boolean logic (and/or/not) are core Base CS content, taught inline in the "bits"
   unit. The `mathPrereqs` field is reused only for rare genuine math dependencies.
   Reading is never blocked.
6. **Track structure — 12 units**, ~4–6 lessons each.

## 1. Architecture and layout

Base CS is a **new track inside the existing `lessons` collection** — not a new
collection. It mirrors the algorithms track's integration exactly.

### Reused unchanged

- The `lessons` content collection and its Zod schema base.
- `tracks.json` / `units.json` data files (multi-track by design — the `track` field
  already exists).
- `Lesson.astro` layout, `/learn/<track>/index.astro` and `/learn/<track>/[lesson].astro`
  routing.
- The `/teach` authoring command.
- The Astro build and the `dist/lint-report.json` report.

### New

- A `base-cs` entry in `tracks.json` (`order: 2`; the algorithms track shifts
  `order: 2 → 3`, math stays `order: 1`).
- 12 Base CS units in `units.json`.
- A `lessonType: concept | coding` field in the `lessons` Zod schema.
- Two Base CS lesson skeletons, validated by a `track`- then `lessonType`-branched
  linter.
- One new static widget, `MachineFigure` (section 5).
- Lifting the `/teach` domain lock from math + algorithms to math + algorithms +
  base-cs.

### Not modified

The math track, the algorithms track content, the fullstack `book` collection,
`/infographic`, the fullstack linter, and the depth bar are untouched. The home atlas
uses static inline sample topic data not yet wired to content collections — it is not
updated by this work.

## 2. Track map

Approach A — machine-up, then language. **12 units**, ~4–6 lessons each, ~60–70 lessons
× 2 languages ≈ 130–140 lesson files. The exact lesson list per unit is fixed during
the implementation plan (writing-plans step), the same way the math and algorithms
`units.json` lesson arrays were filled.

### Machine arc (units 01–04) — concept-heavy

| #  | Unit                    | Covers                                                                                                            |
|----|-------------------------|-------------------------------------------------------------------------------------------------------------------|
| 01 | What a computer is      | bits, binary, why two states, place-value in base 2, encoding (numbers / text / colour as bits), boolean logic (and/or/not), one overview lesson: logic gates → adder |
| 02 | Memory                  | addressable cells, the byte, value vs address, the stack and the heap as regions                                 |
| 03 | The processor           | the instruction, fetch-decode-execute, registers, machine code, program-as-data, a toy CPU model                 |
| 04 | From machine code to a language | the assembler idea, why high-level languages exist, compilation vs interpretation, the runtime, source → running program |

### Programming-theory arc (units 05–12) — each unit grounded back to the machine

| #  | Unit                    | Covers                                                                                              |
|----|-------------------------|-----------------------------------------------------------------------------------------------------|
| 05 | Values and types        | what a value is in memory, a type as an interpretation of bits, why types exist                     |
| 06 | Variables and state     | a variable as a named memory cell, assignment, mutation, references vs values                       |
| 07 | Control flow            | conditionals as a CPU branch/jump, loops as repeated instructions, what "flow" means                |
| 08 | Functions and the call stack | a call as a stack frame, parameters, return, scope, a preview of recursion                     |
| 09 | Data in memory          | arrays as contiguous cells, objects as key-value, how collections sit in memory                     |
| 10 | Abstraction             | modules, objects/classes as a bundle of data + behaviour, why abstraction exists                    |
| 11 | When a program fails    | errors vs exceptions, the stack trace, undefined behaviour, debugging as reasoning                  |
| 12 | Time and concurrency    | why async exists (the CPU waits on slow I/O), the event loop, concurrency vs parallelism            |

Units 01–04 build the machine model as a coherent block. Units 05–12 each take one
construct family and explain it as theory grounded in the machine model.

## 3. Lesson model

### Two lesson skeletons (fixed linear order, linter-checked)

A new `lessonType` field selects the skeleton. The linter branches on `track`, then on
`lessonType`.

**`concept` skeleton** — pure machine-model lessons ("how memory addressing works"):

1. **Hook** — a situation that needs the concept.
2. **Goal** — what the reader will be able to do after the lesson.
3. **Explanation** — the model, in words.
4. **Visual** — a static figure of the model.
5. **WorkedExample** — the model applied to one concrete case, walked through.
6. **Practice** — ≥4 exercises with immediate feedback (the main block).
7. **Check** — a short "now you try" quiz.
8. **Recap** — what was learned.

This shape matches the math skeleton — deliberate, to reduce novelty and ease authoring.

**`coding` skeleton** — lessons built around a code listing ("what a function call does
to the stack"):

1. **Hook** — a situation that needs the construct.
2. **Goal** — what the reader will be able to do after the lesson.
3. **Idea** — the construct in words and a figure, before the code.
4. **Code** — a TS/JS listing, walked through.
5. **Trace** — a step-by-step run on a concrete input (`AlgoTrace`).
6. **Practice** — ≥4 exercises with immediate feedback (the main block).
7. **Check** — a short "now you try" quiz.
8. **Recap** — what was learned.

This is the algorithms skeleton minus the Complexity beat — Complexity is
algorithms-specific and has no place in a "what a variable is" lesson.

### Optional insets (collapsed by default)

Reused from the algorithms track: `<WhyInset>` (why it works), `<EdgeCaseInset>` (edge
cases), `<MistakeInset>` (a common mistake).

### Frontmatter schema (extends the `lessons` collection)

One new field is added to the shared `lessons` Zod schema:

```yaml
lessonType: coding        # concept | coding — NEW
```

In the schema: `lessonType: z.enum(["concept", "coding"]).optional()`. The field is
optional globally — math and algorithms lessons do not set it — but the Base CS linter
requires every `base-cs` lesson to set it explicitly. All other frontmatter fields
(`slug`, `lang`, `track`, `unit`, `order`, `title`, `summary`, `estMin`, `status`,
`prereqs`, `mathPrereqs`, `concepts`, `sources`) are unchanged.

`mathPrereqs` is reused for the rare genuine cross-track math dependency; it renders a
non-blocking `MathRecall` reminder link. Binary and boolean logic are taught inline in
unit 01 and are *not* declared as `mathPrereqs`.

### Absolute-zero principle

Every term is introduced before use, or reachable through the `prereqs` chain (or, in
the rare case, the `mathPrereqs` chain). No term is first defined in a later Base CS
lesson.

## 4. Widget family

Principle unchanged from the math and algorithms tracks: visuals are static SVG (zero
hydration); interaction only where it teaches. Hydration cap per lesson page = 5.

### Static widgets (`.astro`, 0 islands)

- `MachineFigure` — **new**. Static SVG figures of the machine model: bit layout, the
  memory grid, the CPU fetch-decode-execute cycle, logic gates. The visual backbone of
  the machine arc.
- `StructureFigure` — reused. A static diagram of a data structure in memory (array,
  object).
- `AnnotatedCode` — reused. A TS/JS listing with line numbers and callout annotations,
  for the `coding`-skeleton Code beat.
- `MathRecall` — reused. A non-blocking reminder link to a `mathPrereqs` lesson.

### Interactive widgets (`.tsx`, Preact islands, counted in the cap)

- `AlgoTrace` — reused. The step-through visualizer for the `coding`-skeleton Trace
  beat (tracing a function call, a memory mutation, a control-flow run).
- `AlgoPractice` / `PracticeSet` — reused for the Practice block. Problem types: state
  prediction, tracing, multiple choice. Not syntax drills. Many problems = 1 island.
- `Quiz` — reused from the fullstack site for the Check block.

`ComplexityChart` and `CodeRunner` are not used — there is no Complexity beat and
practice is conceptual rather than syntax-based.

The `algo/` widgets are reused as-is, without renaming — renaming would touch the
algorithms track and is out of scope. The `algo/` directory becomes the shared home
for foundations interactive widgets.

### Island budget for a typical lesson

`coding` lesson: `AlgoTrace` (1) + `PracticeSet` (1) + `Quiz` (1) = 3. `concept`
lesson: `PracticeSet` (1) + `Quiz` (1) = 2. Both well within the cap of 5.
`MachineFigure`, `StructureFigure`, `AnnotatedCode` are static.

## 5. Linter for the Base CS track

The foundations linter (`src/lint/rules/lessons.ts`) already branches on `track` (math
vs algorithms). A `base-cs` branch is added; inside it, the skeleton check branches on
`lessonType`. No text budgets — a lesson explains its topic fully. Linter rules are
written test-first (TDD).

Rules for `track: base-cs`:

1. **Skeleton** — present and in order, per `lessonType`: `concept` validates Hook →
   Goal → Explanation → Visual → WorkedExample → Practice → Check → Recap; `coding`
   validates Hook → Goal → Idea → Code → Trace → Practice → Check → Recap.
2. **lessonType** — present and one of `concept | coding` on every `base-cs` lesson.
3. **i18n parity** — every EN lesson has an RU twin with the same slug and structure.
4. **Glossary** — terms in `concepts` are locked per locale in the shared glossary.
5. **Concept prerequisite** — every term used is introduced in this lesson or reachable
   through the `prereqs` chain (or the `mathPrereqs` chain). No term from a future
   Base CS lesson.
6. **No forward links** — within-track links point only to prereq lessons or lessons
   with a lower `order`.
7. **Practice minimum** — every lesson has a `PracticeSet` with ≥4 problems.
8. **Visual minimum** — every lesson has ≥1 visual: `concept` lessons a `MachineFigure`
   or `StructureFigure`; `coding` lessons an `AlgoTrace` or `AnnotatedCode`.
9. **Hydration cap** — ≤5 islands per lesson page.
10. **Sources** — ≥1 source in frontmatter.

The report is written to `dist/lint-report.json` under the `foundations` section. The
build fails on any violation. The math- and algorithms-track rules are unchanged.

## 6. `/teach` command

The `/teach` command (`.claude/commands/teach.md`) is extended:

- The domain lock changes from math + algorithms to **math + algorithms + base-cs**. It
  still refuses off-domain requests.
- `/teach base-cs/<unit>/<lesson>` authors a Base CS lesson against the `concept` or
  `coding` skeleton, selected by the lesson's `lessonType`.
- Research sources for Base CS: nand2tetris, Petzold's *Code*, CSAPP (used in
  moderation), MDN and the TC39 specifications for JS semantics, and other vetted CS
  references — not Khan Academy / OpenStax (those remain the math sources), not CLRS /
  NeetCode (those remain the algorithms sources).
- Bilingual-or-refuse, the stub → draft → ready status flow, the linter gate, the
  visual check, and the commit step are unchanged.

`CLAUDE.md` updates the `/teach` description to mention the Base CS track without
modifying the `/infographic` description or the fullstack domain lock.

## 7. Phasing

Implementation is phased by unit, like the math and algorithms tracks — not a single
large pass. Each phase produces its lesson set with a clean build at the phase
boundary. The implementation plan (writing-plans step) details P0 step by step; P1–P3
follow the P0 pattern.

- **P0 — Infrastructure + Unit 01.** Add `base-cs` to `tracks.json` (and shift the
  algorithms track to `order: 3`) and `units.json`; add the `lessonType` field to the
  schema; add the two skeletons and the `track`/`lessonType`-branched linter (TDD); add
  the `MachineFigure` widget; apply the `/teach` domain-lock change. P0 finishes with
  Unit 01 authored in full, EN + RU, as the proof.
- **P1 — Units 02–04** (the rest of the machine arc: memory, the processor, machine
  code to a language).
- **P2 — Units 05–08** (values and types, variables and state, control flow, functions
  and the call stack).
- **P3 — Units 09–12** (data in memory, abstraction, when a program fails, time and
  concurrency).

## Out of scope

- The math track, the algorithms track content, the fullstack `book` collection,
  `/infographic`, the fullstack linter, and the depth bar.
- Hands-on training in a specific programming language — that is a separate kind of
  course.
- OS and systems internals depth (caches, virtual memory, the scheduler, the MMU) —
  the later Systems & OS topic in the spine.
- Transistor- and circuit-level depth — logic gates get one overview lesson and the
  track does not descend below that.
- Server-side code execution.
- User accounts or progress persistence beyond what the site already provides.
- Wiring the home atlas to content collections — it still uses static inline sample
  data.

## Open questions

None. All brainstorming decisions are resolved.
