# /teach <track>/<NN-unit>/<NN-lesson>

Author one absolute-beginner lesson (stub -> draft -> ready) for the `foundations`
section. Every lesson is English + Russian or the command refuses.

## Domain lock

This command authors **mathematics**, **algorithms**, and **Base CS** lessons only.
Refuse any off-domain request (anything outside math, algorithms, or Base CS).

## Input form

```
/teach math/01-numbers/01-counting
/teach math/08-growth/04-what-is-a-logarithm
/teach algorithms/01-thinking-complexity/01-what-is-an-algorithm
/teach algorithms/09-graphs/03-breadth-first-search
/teach base-cs/01-what-a-computer-is/01-bits-and-binary
/teach base-cs/08-functions-and-the-call-stack/03-recursion-preview
```

## Pipeline

1. **Verify the lesson stub exists** — `site/src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx`.
   If absent, create stub MDX files (EN + RU) with `status: stub` frontmatter, and
   add the lesson slug to the unit's `lessons` array in `site/src/content/units.json`.
2. **Research** — WebSearch + Context7. Sources for absolute-beginner math: Khan
   Academy, OpenStax, vetted educational references. Focus on correctness, common
   beginner mistakes, and effective metaphors. Minimum 3 queries.
   For algorithms, use CLRS, Sedgewick, competitive-programming references, NeetCode,
   and vetted algorithm resources — not Khan Academy / OpenStax.
   For Base CS, use nand2tetris, Petzold's "Code", CSAPP (in moderation), MDN and the
   TC39 specifications for JS semantics, and vetted CS references — not Khan Academy /
   OpenStax, not CLRS / NeetCode.
3. **Author EN MDX** — follow the fixed linear skeleton for the track, in order:
   - **math:** Hook -> Goal -> Explanation (Step components) -> Visual (a math widget)
     -> WorkedExample -> Practice (PracticeSet, >= 4 problems) -> Check (a Quiz) ->
     Recap.
   - **algorithms:** Hook -> Goal -> Idea -> Code -> Trace (AlgoTrace) -> Complexity
     -> Practice (AlgoPractice, >= 4 problems) -> Check (a Quiz) -> Recap.
   - **base-cs:** the skeleton depends on the lesson's `lessonType` frontmatter.
     `concept`: Hook -> Goal -> Explanation (Step components) -> Visual (a MachineFigure
     or StructureFigure) -> WorkedExample -> Practice (PracticeSet, >= 4 problems) ->
     Check (a Quiz) -> Recap.
     `coding`: Hook -> Goal -> Idea -> Code -> Trace (AlgoTrace) -> Practice
     (AlgoPractice, >= 4 problems) -> Check (a Quiz) -> Recap. No Complexity beat.
     Every base-cs lesson MUST set `lessonType: concept | coding` in its frontmatter.
   Insert `<Inset>` blocks (`why` / `practice` / `mistake` / `edgecase`) where useful.
4. **Translate to RU** — use `site/src/i18n/glossary.json`; add new terms
   alphabetically. Keep EN and RU structurally identical.
5. **Verify the linter passes** — run `bun run build` in `site/`, check the lesson
   entries in `dist/lint-report.json`.
6. **Visual check** — open both EN and RU lessons in a browser; verify rendering and
   widget interactivity.
7. **Commit** — `git commit -m "content(math): <unit>/<lesson> EN+RU ready"`.

## The command enforces

- Bilingual or refuse.
- Absolute-zero vocabulary: introduce every term before using it; use no term that
  is first defined in a later lesson.
- Skeleton present and in order for the track (math, algorithm, or base-cs skeleton;
  a base-cs lesson picks its `concept` or `coding` skeleton from the `lessonType`
  frontmatter field).
- Algorithm and base-cs lessons may declare `mathPrereqs` (cross-track prerequisites
  into the math track); each must resolve to an existing math lesson.
- >= 4 practice problems in the PracticeSet.
- >= 1 visual widget.
- Hydration cap: <= 5 islands per lesson page.
- Status flow: stub -> draft -> ready.
- Component imports use the `~/` path alias (`~` → `site/src/`, configured in
  `astro.config.mjs` + `tsconfig.json`), e.g.
  `import Hook from "~/components/lesson/Hook.astro";` — never `..` relative segments.
