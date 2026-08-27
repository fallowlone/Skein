# Text Diff (Myers) — starter

Implement `lcs` and `diff` in `src/diff.ts` so the acceptance suite passes.

    bun test

Rules: `lcs<T>(a,b)` returns the longest common subsequence. `diff<T>(a,b)`
returns an edit script `{op:'keep'|'insert'|'delete', value:T}[]` where
keep+insert ops in order reproduce `b`, and keep+delete ops reproduce `a`.
No external deps — bun stdlib only. When green, push to the Myers O(ND)
diagonal search and add `apply` + hunk grouping per the project rubric.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Longest common subsequence via dynamic programming** (`lcs-dp`)
2. **Backtrack the DP table into a minimal edit script** (`backtrack-edit-script`)
3. **Replace the DP core with Myers O(ND) diagonal search** (`myers-ond`)
4. **Prove minimality: edit distance equals |deletes| + |inserts|** (`minimal-script`)
5. **Apply patch: round-trip fidelity and error handling** (`apply-patch`)
6. **Hunk grouping and context lines — unified diff output** (`hunk-grouping`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

