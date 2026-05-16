# Foundations: Algorithms Track — Design Spec

**Date:** 2026-05-16
**Status:** Approved (brainstorming)
**Scope:** Algorithms track only. Builds on the completed math track (own spec → plan → implementation).

## Purpose

Add the second learning track to the `foundations` section: **algorithms**, taught for
a reader who already knows one programming language (variables, loops, functions,
arrays) but has never studied algorithms or data structures. The track starts directly
with algorithmic thinking.

Endpoint: the reader confidently solves LeetCode Medium across every major pattern and
takes most Hard problems (advanced DP, graph algorithms, balanced trees). Not
competitive/olympiad level — that is explicitly out of scope.

The algorithms track is directly connected to the existing math track via soft
cross-track prerequisites (see section 2). The math track, the fullstack `book`
collection, `/infographic`, and the fullstack linter are **not modified**.

## Decisions (from brainstorming)

1. **Reader baseline** — knows one programming language, zero algorithms. The track
   starts with algorithmic thinking and complexity; no programming primer needed.
2. **Code language** — TypeScript / JavaScript for all code examples. Matches the site
   stack; no new rendering tooling.
3. **Endpoint** — Medium confidently + most Hard. Not competitive.
4. **Math connection** — soft cross-links. Algorithm lessons declare cross-track
   prerequisites into specific math lessons and render a reminder link. Reading is
   never blocked. The linter allows cross-track prereqs.
5. **Lesson skeleton** — a new linear skeleton for algorithms (distinct from the math
   skeleton), with an explicit Complexity beat. The linter branches on the `track`
   field.
6. **Track structure** — hybrid: data structures introduced in increasing order with
   solving patterns woven in where the structure carries them; dynamic programming and
   greedy as dedicated paradigm units near the end; a final problem-solving toolbox
   unit.
7. **Executable code** — lessons include an editable in-browser JS sandbox
   (`CodeRunner`), in addition to the deterministic step-through visualizer.

## 1. Architecture and layout

The algorithms track is a **new track inside the existing `lessons` collection** — not
a new collection. The `lessons` collection, `tracks.json`, `units.json`,
`Lesson.astro`, the `/learn/<track>/<lesson>` routing, the `/teach` command, and the
build are all reused.

### Reused unchanged

- `lessons` content collection and its Zod schema base.
- `tracks.json` / `units.json` data files (multi-track by design — the `track` field
  already exists).
- `Lesson.astro` layout, `/learn/<track>/index.astro` and
  `/learn/<track>/[lesson].astro` routing.
- `/teach` authoring command.
- The Astro build and `dist/lint-report.json` report.

### New

- An `algorithms` entry in `tracks.json` and its units in `units.json`.
- A new algorithm lesson skeleton, validated by a `track`-branched linter.
- An algorithm widget family (section 4).
- Cross-track prerequisite support in the linter (`mathPrereqs` field).
- Lifting the `/teach` domain lock from mathematics-only to mathematics + algorithms.

### Not modified

The math track, the fullstack `book` collection, `/infographic`, the fullstack linter,
and the depth bar are untouched.

## 2. Track map

Hybrid structure. **12 units**, ~6–8 lessons each, ~80 lessons × 2 languages ≈ 160
lesson files.

| #  | Unit                              | Covers                                                                          | Patterns woven in                                              | Math prereq            |
|----|-----------------------------------|---------------------------------------------------------------------------------|----------------------------------------------------------------|------------------------|
| 01 | Algorithmic thinking & complexity | what an algorithm is, correctness, counting operations, Big-O, complexity classes O(1)…O(2ⁿ), time vs space, estimating from constraints | —                                                              | 08-growth (logarithms, linear vs exponential) |
| 02 | Arrays & strings                  | array as memory, indexing cost, traversal                                       | two pointers, sliding window, prefix sums, in-place            | —                      |
| 03 | Sorting & binary search           | why sorting matters, insertion/merge/quick sort (idea + complexity), binary search on a sorted array | binary search over the answer space                           | 08-growth (logarithms) |
| 04 | Recursion & backtracking          | recursion model, base + recursive case, recursion tree, call stack, recurrence → complexity | backtracking: subsets, permutations, combinations              | 09-combinatorics       |
| 05 | Hashing                           | hash map / hash set, collisions (lightly), tradeoffs                             | frequency counting, the "seen before" pattern, grouping        | —                      |
| 06 | Linked lists, stacks, queues      | linked list, pointer manipulation, stack / queue / deque                         | monotonic stack, next-greater-element                          | —                      |
| 07 | Trees                             | binary tree, terminology, traversals (pre/in/post/level-order), recursion on trees, BST | tree DP (basics)                                               | —                      |
| 08 | Heaps & priority queues           | heap structure, priority queue operations                                       | top-K, k-way merge                                             | —                      |
| 09 | Graphs                            | adjacency list/matrix representations, connected components                      | BFS/DFS, topological sort, shortest paths (BFS, Dijkstra), union-find | 07-logic (sets)        |
| 10 | Dynamic programming               | overlapping subproblems + optimal substructure, memoization vs tabulation        | 1D DP, 2D DP, knapsack, LIS, interval DP                       | 06-functions, 08-growth |
| 11 | Greedy algorithms                 | what greedy is, the exchange argument, when greedy works vs fails                | interval scheduling, classic greedy problems                   | —                      |
| 12 | Problem-solving toolbox           | bit manipulation, intervals / sweep line, reading constraints → choosing an approach, breaking down an unfamiliar problem | everything assembled                                           | —                      |

Units 01–09 introduce structures with patterns embedded. Units 10–11 are paradigm
units where the pattern is the protagonist. Unit 12 assembles the skill of attacking
an unfamiliar problem.

The exact lesson list per unit is fixed during the implementation plan (writing-plans
step), the same way the math `units.json` lesson arrays were filled.

## 3. Lesson model

### New algorithm lesson skeleton (fixed linear order, linter-checked)

The math skeleton is Hook → Goal → Explanation → Visual → WorkedExample → Practice →
Check → Recap. The algorithm skeleton is distinct:

1. **Hook** — a task/situation where the algorithm is needed.
2. **Goal** — what the reader will be able to do after the lesson.
3. **Idea** — the algorithm's idea in words and a figure, before any code.
4. **Code** — a TS/JS implementation, walked through line by line.
5. **Trace** — a step-by-step run of the code on a concrete input (`AlgoTrace`).
6. **Complexity** — time and space analysis, and why it is exactly that.
7. **Practice** — ≥4 exercises with immediate feedback (the main block).
8. **Check** — a short "now you try" quiz.
9. **Recap** — what was learned.

The linter branches on `track`: `math` lessons validate the math skeleton, `algorithms`
lessons validate this skeleton.

### Optional insets (collapsed by default)

- `<WhyInset>` — why the algorithm works (intuition / proof).
- `<EdgeCaseInset>` — edge cases and how to handle them.
- `<MistakeInset>` — a common mistake and how to avoid it.

### Frontmatter schema (extends the `lessons` collection)

```yaml
slug: 02-binary-search          # ^\d{2}-[a-z0-9-]+$
lang: ru                        # en | ru
track: algorithms
unit: 03-sorting-search         # ^\d{2}-[a-z0-9-]+$
order: 2
title: "Бинарный поиск"
summary: "..."
estMin: 25
status: ready                   # stub | draft | ready
prereqs: ["03-sorting-search/01-why-sort"]      # within-track
mathPrereqs: ["math/08-growth/02-logarithms"]   # NEW: cross-track, optional
concepts: ["бинарный поиск", "инвариант цикла"] # feeds the glossary
sources:
  - https://...                                # >= 1
```

`mathPrereqs` is a new optional field — a list of cross-track prerequisites pointing
into the `math` track. The linter verifies each target exists. Reading is never
blocked: the lesson renders a reminder link via a `MathRecall` widget.

### Absolute-zero principle (adjusted for algorithms)

Every term is introduced before use, or reachable through the `prereqs` chain — now
**also** reachable through `mathPrereqs`. No term first defined in a later algorithms
lesson.

## 4. Widget family

Principle unchanged from the math track: most visuals static SVG (zero hydration);
interaction only where it teaches. Hydration cap per lesson = 5 islands.

### Static widgets (`.astro`, 0 islands)

- `AnnotatedCode` — a TS/JS listing with line numbers and callout annotations.
- `ComplexityChart` — growth curves O(1)…O(2ⁿ) for comparison (static SVG).
- `StructureFigure` — a static diagram of a data structure (array, tree, graph, heap).
- `MathRecall` — a reminder link to a `mathPrereqs` lesson, rendered inline near the
  point where the math concept is used. Non-blocking; purely a soft cross-track link.

### Interactive widgets (`.tsx`, Preact islands, counted in the cap)

- `AlgoTrace` — the key Trace-block widget. A deterministic step-through visualizer:
  it draws the data structure, and on each step highlights the current code line and
  state, with prev/next controls. One per lesson.
- `PracticeSet` — **extended**. The math version accepts only numeric answers. For
  algorithms it gains problem types: complexity choice (multiple choice), state
  prediction ("what is the array after step 3"), and step ordering. Many problems = 1
  island. The extension must remain backward-compatible with existing math lessons.
- `CodeRunner` — an editable in-browser JS sandbox: the reader edits code and runs it,
  output shown inline. Implemented as a Preact island; in-browser `eval` of JS. The
  implementation must first evaluate reusing the existing fullstack
  `components/pedagogy/Sandbox.tsx` before building a new widget.
- `Quiz` — reused from the fullstack site for the Check block.

### Reused from the fullstack site

GSAP scroll primitives (`Reveal`, `Pulse`) — static. Prose/layout primitives
(`Callout`, `Term`, `Card`).

### Island budget for a typical lesson

`AlgoTrace` (1) + `PracticeSet` (1) + `Quiz` (1) + `CodeRunner` (1) = 4. Within the cap
of 5 with margin. `AnnotatedCode`, `ComplexityChart`, `StructureFigure` are static.

## 5. Linter for the algorithms track

The foundations linter (`src/lint/rules/lessons.ts`) branches on the `track` field. No
text budgets — a lesson explains its topic fully.

Rules for `track: algorithms`:

1. **Skeleton** — present and in order: Hook → Goal → Idea → Code → Trace →
   Complexity → Practice → Check → Recap.
2. **i18n parity** — every EN lesson has an RU twin with the same slug and structure.
3. **Glossary** — terms in `concepts` are locked per locale in the shared glossary.
4. **Concept prerequisite** — every term used is introduced in this lesson or reachable
   through the `prereqs` chain **or** the `mathPrereqs` chain. No term from a future
   algorithms lesson.
5. **No forward links** — within-track links point only to prereq lessons or lessons
   with a lower `order`. `mathPrereqs` targets must exist in the `math` track; they do
   not count as forward links.
6. **Practice minimum** — every lesson has a `PracticeSet` with ≥4 problems.
7. **Visual minimum** — every lesson has ≥1 visual (`AlgoTrace` or `StructureFigure`).
8. **Hydration cap** — ≤5 islands per lesson page.
9. **Sources** — ≥1 source in frontmatter.

The report is written to `dist/lint-report.json` under the `foundations` section. The
build fails on any violation. The math-track rules are unchanged.

## 6. `/teach` command

The `/teach` command (`.claude/commands/teach.md`) is extended:

- The domain lock changes from mathematics-only to **mathematics + algorithms**. It
  still refuses off-domain requests (anything outside math/algorithms).
- `/teach algorithms/<unit>/<lesson>` authors an algorithm lesson against the algorithm
  skeleton.
- Research sources for algorithms: CLRS, Sedgewick, competitive-programming references,
  NeetCode and vetted algorithm resources — not Khan Academy / OpenStax (those remain
  the math sources).
- Bilingual-or-refuse, the stub → draft → ready status flow, the linter gate, the
  visual check, and the commit step are unchanged.

`CLAUDE.md` updates the `/teach` description to mention the algorithms track without
modifying the `/infographic` description or the fullstack domain lock.

## 7. Phasing

Implementation is phased by unit, like the math track — not a single large pass. The
implementation plan (writing-plans step) details P0 step by step; P1–P4 follow the P0
pattern.

- **P0 — Infrastructure + Unit 01.** Add `algorithms` to `tracks.json` / `units.json`,
  the new skeleton, the `track`-branched linter, the `mathPrereqs` field, the widget
  family (`AnnotatedCode`, `ComplexityChart`, `StructureFigure`, `AlgoTrace`, the
  `PracticeSet` extension, `CodeRunner`, `MathRecall`), and the `/teach` domain-lock
  change. P0 finishes with Unit 01 authored in full, EN + RU, as the proof.
- **P1 — Units 02–04** (arrays & strings, sorting & binary search, recursion &
  backtracking).
- **P2 — Units 05–07** (hashing, linked lists/stacks/queues, trees).
- **P3 — Units 08–09** (heaps & priority queues, graphs).
- **P4 — Units 10–12** (dynamic programming, greedy, problem-solving toolbox).

Each phase produces its lesson set with a clean build at the phase boundary.

## Out of scope

- The fullstack `book` collection, `/infographic`, the fullstack linter, the depth bar.
- The math track content, its skeleton, and its linter rules.
- Competitive / olympiad-level material (segment trees, heavy number theory, advanced
  graph algorithms beyond Dijkstra/union-find).
- A programming primer — the reader is assumed to know one language.
- User accounts or progress persistence beyond what the site already provides.
- Server-side code execution — `CodeRunner` evaluates JS in the browser only.

## Open questions

None. All brainstorming decisions are resolved.
