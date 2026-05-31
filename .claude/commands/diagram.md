# /diagram <track>/<unit>/<lesson>

Author ONE on-brand explanatory diagram for a single lesson, EN + RU, using the
diagram kit. Additive — insert into the lesson Visual slot; never rewrite prose.

## Steps
1. Read `site/src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx` and the RU mirror.
2. **Idempotency:** STOP and report "already has a visual — skipped" if either file
   already renders a visual. The marker `data-lesson-visual` is emitted by the
   *component*, not written literally in the MDX, so check for BOTH:
   - the literal string `data-lesson-visual`, AND
   - any import/usage of a figure component that emits it:
     `MachineFigure`, `StructureFigure`, `ComplexityChart`, `AlgoTrace`,
     `AnnotatedCode`, `FlowDiagram`, `StackDiagram`, `SequenceDiagram`, `DiagramFrame`.
   (e.g. `grep -Eq 'data-lesson-visual|MachineFigure|StructureFigure|ComplexityChart|AlgoTrace|AnnotatedCode|FlowDiagram|StackDiagram|SequenceDiagram|DiagramFrame'`).
   Note: most `base-cs` and `algorithms` lessons already carry a figure — expect to skip them.
3. Choose the single best-fit primitive for the lesson's core concept:
   - `FlowDiagram` — a process / architecture / state flow (boxes + arrows).
   - `StackDiagram` — layers (encapsulation, tiers, request path).
   - `SequenceDiagram` — a time-ordered exchange (handshake, protocol, API call).
   - `StructureFigure` / `ComplexityChart` / `AlgoTrace` — only for algorithms/base-cs structure/complexity/trace lessons.
   Base the diagram ONLY on what the lesson text states. Invent nothing. If no
   primitive genuinely clarifies the concept, STOP and report "no good diagram fits"
   with a one-line reason (do not force a weak diagram).
4. Import the chosen component (`import X from "~/components/diagram/X.astro";`) and
   insert the diagram into the **Visual slot** — directly after the main Explanation,
   before Practice/Check. Use a clear `label` (a11y) and a one-sentence `caption`.
5. Mirror into the RU file: SAME diagram + structure, RU labels/caption.
6. Build: `cd site && bun run build`; confirm 0 errors and the lesson page now
   contains `data-lesson-visual`.
7. Commit: `content(diagram): <track>/<unit>/<lesson> add <Primitive> EN+RU`.

## Hard rules
- One diagram per lesson. Kit primitives + tokens only; no raw palette; no raster.
- EN/RU parity. Idempotent. Technically correct or skip.
