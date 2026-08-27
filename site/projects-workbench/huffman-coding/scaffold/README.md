# Huffman Coding — starter

Implement the four functions in `src/huffman.ts` so the acceptance suite passes.

    bun test

Rules: `build` constructs a Huffman tree from a frequency map, `codes` derives the
prefix-free code table, `encode` maps a string to bits, `decode` recovers the original.
Break priority-queue ties deterministically (lower symbol wins). The suite checks
prefix-free property, frequency-vs-length order, round-trip, single-symbol edge case,
and compression ratio vs fixed-width. When it is green, read the rubric and push to
the senior bar (canonical codes, entropy bound analysis, bit-packing).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Count frequencies and build a min-heap priority queue** (`frequency-and-priority-queue`)
2. **Build the Huffman tree by repeated greedy merge** (`build-huffman-tree`)
3. **Derive prefix-free codes by tree traversal** (`derive-prefix-codes`)
4. **Encode: map symbols to bit strings** (`encode`)
5. **Decode: walk the tree bit by bit** (`decode`)
6. **Optimality proof and canonical Huffman codes** (`optimality-and-canonical-codes`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

