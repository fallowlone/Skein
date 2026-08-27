# CLI text tool — starter

Implement the CLI in `src/tool.ts` so the acceptance suite passes.

    bun test

The tool must:
- read from stdin or a file arg,
- support --filter <pattern>, --count, --slice <start>:<end>, --help,
- handle large files via streams (line-by-line, chunk-boundary correct),
- exit non-zero on bad input, compose via pipes.

Run as: `echo hi | bun src/tool.ts --filter hi` or `bun src/tool.ts --count file.txt`

See `src/tool.ts` for the stub — it exits 0 without doing anything.

---

Product milestones — see the project page for the full 5-step product brief:

1. **A CLI that runs** (`hello-cli`)
2. **Stdin or file, same code** (`stdin-or-file`)
3. **Flags: filter, count, slice** (`flags-filter-count-slice`)
4. **Streams for large files** (`streams-for-large-files`)
5. **Compose with pipes and redirects** (`compose-with-pipes`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

