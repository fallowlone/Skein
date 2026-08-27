# Trie Autocomplete — starter

Implement `Trie` in `src/trie.ts` so the acceptance suite passes.

    bun test

Rules: children = Map (open alphabet), weight on terminal node, `has` checks
`isEnd`, `startsWith` ignores it, `autocomplete(prefix, k)` returns ≤k words
ranked weight-DESC then lexicographic-ASC. When green, read the rubric and
push to the senior bar (heap ranking, radix compression, serialisation).

---

Product milestones — see the project page for the full 6-step product brief:

1. **Design the node: children map, end flag, weight** (`trie-nodes`)
2. **Insert and point lookup: insert, has, startsWith** (`insert-lookup`)
3. **Collect all words under a prefix with DFS** (`prefix-walk`)
4. **Rank and cap: autocomplete(prefix, k) with deterministic tie-breaking** (`ranked-completions`)
5. **Weight updates and re-ranking consistency** (`weight-updates`)
6. **Memory trade-off analysis: flat Map vs compressed trie** (`memory-tradeoff`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

