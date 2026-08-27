# Virtual Data Grid — starter

Implement `visibleRange` in `src/grid.ts` so the acceptance suite passes.

    bun test

Rules: pure windowing math — no DOM, no network, no npm deps.
Given scroll position, row height, viewport size, total row count, and overscan,
return `{ start, end, padTop, padBottom }` where `end` is exclusive.

The suite checks top clamping, middle windowing, bottom clamping, the spacer
invariant (`padTop + renderedH + padBottom === total * rowHeight`), and the
zero-rowHeight guard. When it is green, read the project page's rubric and push
to the senior bar (variable row heights, overscan tuning, scroll-stutter incident).

---

Product milestones — see the project page for the full 6-step product brief:

1. **Window the rows: render only what's on screen** (`window-the-rows`)
2. **Variable row heights with a measurement cache** (`variable-heights`)
3. **Column virtualization and frozen columns** (`column-virtualization-frozen`)
4. **Server-side data: paging, sort, and filter** (`server-side-data`)
5. **Editing, selection, and an accessible ARIA grid** (`editing-selection-a11y`)
6. **100k-row perf budget: profile, INP, and a scroll-stutter incident** (`perf-budget-and-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

