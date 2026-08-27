# Consistent Hashing Ring — starter

Implement `HashRing` in `src/ring.ts` so the acceptance suite passes.

    bun test

Rules: inject the hash function (no crypto inside ring.ts), support `vnodes`
(V positions per node), implement `addNode(id)`, `removeNode(id)`, and
`getNode(key): string`. The suite checks: presence of returned node id,
minimal remap on membership change, removeNode isolation, and that higher
vnodes yields lower load standard deviation.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Build the ring: sorted positions, key lookup** (`ring-and-placement`)
2. **Virtual nodes: replicate positions across the ring** (`vnodes`)
3. **Minimal remap: only the departing arc re-routes** (`add-remove-minimal-remap`)
4. **Measure load balance: std-dev of key counts across nodes** (`load-balance`)
5. **Weighted nodes: proportional capacity allocation** (`weighted-nodes`)
6. **Bounded load: cap any node at ε above the average** (`bounded-load`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

