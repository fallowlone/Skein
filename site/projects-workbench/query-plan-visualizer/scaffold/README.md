# Query plan visualizer — starter

Implement `src/plan.ts` until the acceptance suite passes:

    bun test

The suite encodes the one thing that separates a useful plan viewer from a JSON
pretty-printer: **`Loops` scaling**. Postgres reports `Actual Rows` and
`Actual Total Time` per loop, so an inner index scan running 5,000 times reports
"1 row, 0.15 ms". Multiply by `Loops` and it becomes 5,000 rows and 750 ms — the
real hot spot. The suite also pins self-time (total minus children, never
negative), a symmetric estimate-error ratio, and finding the worst node anywhere
in the tree rather than at the root.

Green suite = the analysis core is correct. Then build the UI on the project
page: the collapsible tree, per-node planned-vs-actual badges, and the
highlighted worst node.

---

Product milestones — see the project page for the full 5-step product brief:

1. **Parse EXPLAIN JSON to a tree** (`parse-plan-tree`)
2. **Per-node timing and row estimates** (`render-actual-vs-planned`)
3. **Surface the worst node without false alarms** (`highlight-worst-node`)
4. **Spill detection and work_mem reasoning** (`spill-and-work-mem`)
5. **Diff two plans and observe an incident** (`diff-and-observe`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

