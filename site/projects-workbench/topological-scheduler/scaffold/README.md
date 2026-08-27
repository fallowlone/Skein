# Topological scheduler — starter

Implement `topoSort` and `CycleError` in `src/toposort.ts` so the suite passes.

    bun test

Rules: Kahn's algorithm, lexicographic tie-break among zero-in-degree nodes,
all nodes in output (including disconnected), throw `CycleError` (with `cycleNodes`)
on any cycle or self-loop. Optional: implement `batches()` for the parallel tests.
When green, extend to the runner milestone (see project rubric).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Model the task graph** (`graph-model`)
2. **Topological sort via Kahn's algorithm** (`kahn-indegree`)
3. **Cycle detection and typed CycleError** (`cycle-detection`)
4. **Prove determinism with an exact-output test** (`deterministic-order`)
5. **Parallel batching: group tasks by dependency level** (`parallel-batches`)
6. **Wire it into a real build runner** (`real-build-scheduler`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

