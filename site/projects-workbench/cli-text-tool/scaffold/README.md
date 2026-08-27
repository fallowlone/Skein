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
