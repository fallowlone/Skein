# Union-Find (DSU) — starter

Implement `DSU` in `src/dsu.ts` so the acceptance suite passes.

    bun test

Rules: path compression in `find`, union by rank (or size) in `union`.
`count()` tracks disjoint sets; `connected(a,b)` delegates to `find`.
The suite checks initialisation, merge, transitivity, idempotent unions,
multi-component construction, and stability of the representative after
many unions and repeated `find` calls.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Naive parent array: find by walking up, union by pointer** (`parent-array-naive`)
2. **Union by rank: keep trees shallow** (`union-by-rank`)
3. **Path compression: flatten the traversal path** (`path-compression`)
4. **Connectivity queries: count, connected, stress test** (`connectivity-queries`)
5. **Amortized analysis: measuring O(α(n)) in practice** (`near-constant-amortized`)
6. **Application: Kruskal's MST (or percolation threshold)** (`application-kruskal-or-percolation`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

