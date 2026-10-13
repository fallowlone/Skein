# JS engine diagrams: user visual reference

Reference image supplied by the user on 2026-09-27: [editorial schematic spread](./references/editorial-schematic-user-reference.png). Keep this file as an internal design reference; do not publish the image as a lesson asset or reproduce its subject or composition literally.

Use it when creating **new** diagrams and reviewing **existing** `js-engine` schematics. The qualities to carry over are:

- A technical illustration that explains physical or causal structure, drawn with precise thin linework instead of a collection of UI cards.
- A mostly light, quiet field, light grid texture only where it helps orientation, and generous empty space around the mechanism. The reference's blue is not Skein's default palette.
- Small monospace callouts, leaders, figure numbers, and labels anchored to specific parts of the drawing. Every callout must describe real behavior or structure.
- An editorial relationship between readable prose, a small supporting view, and one larger reference figure. Scale follows explanatory importance.
- Visible layering or before/after relationships when they reveal the mechanism; avoid decorative exploded views.

Use neutral ink for structure and Skein's semantic colors only when state demands them (success, pending, failure, selection). The site palette is white and near-black, with neutral grays for surfaces and rules. Domain colors are small, deliberate accents. Do not use blue as the base color for the course or copy the reference's palette. Color must never be the only carrier of meaning. Preserve EN/RU labels, mobile readability, and accessible text equivalents.

For each existing schematic, ask whether the learner can follow the mechanism from its geometry and callouts. Replace generic flow boxes or summary posters where they fail that test. Keep a simpler table or diagram when it already explains the mechanism more clearly.

## Concrete drawing rules for the first review sample

1. **One hero mechanism.** Give the main technical structure roughly two-thirds of the canvas. Use a small companion view only to explain a different scale or state. Do not tile unrelated cards.
2. **White field.** Keep the background white or near-white; if a grid helps alignment, use hairlines at very low contrast. Leave generous margins and gaps around parts. No shadows, gradients, ornamental frames, or large colored panels.
3. **Two contour weights.** At desktop size, use about 1–1.5 CSS px for primary outlines and 0.75–1 CSS px for guides, leaders, and secondary contours. Use dashed guides only for a hidden alignment, continuation, or movement that the reader needs to understand.
4. **Separated parts with alignment.** When a structure has layers or stages, place them at consistent intervals and connect corresponding edges with quiet guides. The separation must reveal assembly, state, or causality; an exploded layout is never decorative.
5. **Anchored technical labels.** Keep labels short, uppercase, and monospace, around 10–11 CSS px at desktop and at least 11 px on mobile. Attach each label to a real feature using a fine leader and a small arrowhead. Keep figure number and explanatory caption outside the drawing.
6. **Restricted color.** Near-black ink carries the structure; neutral gray carries secondary information. Use at most one non-blue accent for the active path or state. Accent area stays small, and shape/text must still explain the diagram without color.
7. **Responsive causal order.** At narrow widths, restack or recompose parts so the same path is readable in sequence, without shrinking labels below legibility or causing page overflow. Give the figure an accessible text explanation and test EN/RU independently.

These are qualities inferred from the user's reference, not a template to copy literally. The Ignition bytecode dispatch sample was approved by the user on 2026-09-27, so this style can be applied to further diagrams.

A static 2.5D schematic is welcome when perspective or separated layers reveal assembly, state, or execution order, as in the user's reference. Animation is optional and should only be added when movement explains something the still drawing cannot. If a figure moves, keep a useful static first frame, provide controls and reduced-motion behavior, and make the explanation understandable without motion. Before accepting each figure, inspect EN/RU at desktop and mobile widths and both themes; verify that labels, leaders, controls, and content do not overlap or clip, including during movement when present.
