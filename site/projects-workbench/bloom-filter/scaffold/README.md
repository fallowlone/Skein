# Bloom Filter — starter

Implement `BloomFilter` in `src/bloom.ts` so the acceptance suite passes.

    bun test

Rules: hash functions are injected (deterministic, no crypto). The suite checks
no-false-negatives (50 adds, all found), false-positive behavior (fresh item
may be absent), a loose FP-fraction bound over 1000 absent keys, and that
fillRatio starts at 0 and grows after inserts. When tests are green, read the
project rubric and push to the senior bar (sizing math, variants, tradeoffs).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Build the bit array and inject hash functions** (`bitset-and-hashing`)
2. **Implement add: run all k hashes and set all k bits** (`k-hashes-and-add`)
3. **Implement has: all-k-bits check and the false-positive guarantee** (`membership-and-false-positives`)
4. **Derive m and k from target capacity and FP rate** (`sizing-math`)
5. **Extend to counting or scalable variant** (`counting-or-scalable-variant`)
6. **Expose fill ratio, benchmark, and write the tradeoff memo** (`observe-fill-and-tradeoffs`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

