# Skip List — starter

Implement `SkipList` in `src/skiplist.ts` so the acceptance suite passes.

    bun test

Rules: inject `coinFlip` (never `Math.random()`), support `insert(k)`,
`has(k)`, `delete(k)`, `toArray()` ascending. The suite checks multi-level
promotion, sorted order, delete correctness, duplicate safety, and visit-count
sub-linearity on a tall list. When green, read the rubric and push to the
senior bar (rank(), persistent copy, cache-optimised layout).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Nodes, sentinels, and the level layout** (`nodes-and-levels`)
2. **Probabilistic level generation and the coin-flip contract** (`probabilistic-level`)
3. **Insert and search: the update-vector pattern** (`insert-and-search`)
4. **Delete: predecessor scan and multi-level unlinking** (`delete`)
5. **Ordered iteration: toArray() and the level-0 lane** (`ordered-iteration`)
6. **Complexity proof, parameter tuning, and adversarial inputs** (`complexity-and-tuning`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

