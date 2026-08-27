# Tiny Stack VM — starter

Implement `assemble` and `run` in `src/vm.ts` so the acceptance suite passes.

    bun test

**`assemble(src)`** — two-pass assembler. Mnemonics: `PUSH <n>`, `ADD`, `SUB`,
`MUL`, `DUP`, `SWAP`, `ROT`, `JMP <label>`, `JMPIF <label>`, `CALL <label>`,
`RET`, `HALT`. Labels are `name:` lines; forward references are resolved in the
second pass.

**`run(code)`** — fetch-decode-execute loop. Returns top of value stack at
`HALT`. Throws `"stack underflow"` when a binary op finds fewer than 2 values.

When the suite is green, push to the senior bar: add a `MEM` store/load,
typed values, a disassembler, or a REPL.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Design the instruction set** (`design-the-isa`)
2. **The interpreter loop** (`fetch-decode-execute`)
3. **Assembler with labels** (`assembler-and-labels`)
4. **Branches and loops** (`jumps-and-control-flow`)
5. **Functions with real frames** (`call-ret-frames`)
6. **A flat addressable heap** (`addressable-heap`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

