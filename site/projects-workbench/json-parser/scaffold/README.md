# JSON Parser — starter

Implement `parse` and `ParseError` in `src/parser.ts` so the acceptance suite passes.

    bun test

Rules: recursive descent, no `JSON.parse`, throw `ParseError` (with numeric
`position`) on malformed input. The suite checks primitives, nesting, all RFC 8259
string escapes (including \\uXXXX surrogate pairs), number forms (negative,
decimal, exponent), trailing commas, and unterminated strings.
When green, read the project page's rubric and push to the senior bar.

---

Product milestones — see the project page for the full 6-step product brief:

1. **Tokenizer: scan the input into a token stream** (`tokenizer`)
2. **Value dispatcher: literals, arrays, and objects** (`values`)
3. **String decoder: escapes and \uXXXX** (`strings-and-escapes`)
4. **Number decoder: sign, decimal, and exponent** (`numbers`)
5. **Nesting depth, EOF handling, and error positions** (`nesting-and-errors`)
6. **Spec edges: conformance, round-trip, and adversarial inputs** (`spec-edges`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

