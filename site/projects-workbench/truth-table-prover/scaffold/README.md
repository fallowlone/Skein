# Truth-Table Prover — starter

Implement `parse`, `evaluate`, `classify`, and `equivalent` in `src/prover.ts` so
the acceptance suite passes.

    bun test

Rules: ASCII operators `!` `&` `|` `->` `<->`, single lowercase-letter variables,
parentheses. Precedence high→low: `!` > `&` > `|` > `->` > `<->`. `parse` must
throw on malformed input. `classify` enumerates all 2^n assignments. When the suite
is green, read the project page's rubric and push to the senior bar (CNF/DNF
normal forms, equivalence-via-biconditional proof, parser error recovery).

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **From text to a tree** (`parse-to-ast`)
2. **Evaluate under an assignment, then tabulate** (`evaluate-and-tabulate`)
3. **Decide tautology, satisfiability, equivalence** (`tautology-sat-equivalence`)
4. **Search smarter: a tiny DPLL** (`dpll-sat`)
5. **Check a proof, not just a truth value** (`natural-deduction-check`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

