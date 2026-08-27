# Regex Engine — starter

Implement `compile` and `match` in `src/regex.ts` so the acceptance suite passes.

    bun test

Rules: use Thompson NFA construction (NOT recursive backtracking). `compile(pattern)`
returns an NFA; `match(nfa, input)` does full-string match via set-of-states simulation.
The suite checks literals, `.`, `*`, `+`, `?`, grouping, alternation, and — critically —
that `(a*)*b` on 30 'a's returns false without hanging (linear-time guarantee).

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Parse the pattern into an AST** (`parse-to-ast`)
2. **Build a Thompson NFA from the AST** (`thompson-nfa-construction`)
3. **Simulate: epsilon-closure and set-of-states** (`simulate-match`)
4. **Quantifiers: `*`, `+`, `?` and their edge cases** (`operators-star-plus-opt`)
5. **Alternation `|` and grouping `()`** (`alternation-and-groups`)
6. **Linear-time guarantee: no catastrophic backtracking** (`linear-time-vs-backtracking`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

