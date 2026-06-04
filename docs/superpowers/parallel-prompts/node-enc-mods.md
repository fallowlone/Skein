# Author node unit `13-modules-deep` (encyclopedia round)

Branch: `expand-node-mods`. **First read** `docs/superpowers/parallel-prompts/PROTOCOL.md` and plan Task 8 in `docs/superpowers/plans/2026-06-04-node-encyclopedia-mastery-lab.md`. Exemplar: `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx`. Commit to `expand-node-mods` only; **do NOT merge/push**.

## Append this unit object to `site/src/content/units.json` (order 13)
```json
{ "id": "node/13-modules-deep", "slug": "13-modules-deep", "track": "node", "order": 13,
  "title": { "en": "Modules, deep", "ru": "Модули, глубже" },
  "crux": { "en": "How Node finds code, and how packages expose it.", "ru": "Как Node находит код и как пакеты его экспонируют." },
  "lessons": ["01-module-resolution-algorithm", "02-package-exports-and-conditions"] }
```

## Lessons (EN+RU each, status:ready, ≥1 diagram, practice ~6 tasks)
Paths: `site/src/content/lessons/{en,ru}/node/13-modules-deep/<lesson>/index.mdx` + practice `site/src/content/practice/node/13-modules-deep/<lesson>.json`.

1. **`01-module-resolution-algorithm`** (middle) — CJS `require` resolution (the `node_modules` walk, file/dir/index, extensions) vs ESM resolution (URL-based, mandatory extensions, `import` specifiers), `package.json` `main`/`module`/`type`, the interop edges.
2. **`02-package-exports-and-conditions`** (senior) — the `exports` field, subpath exports + patterns, `imports` (private `#` specifiers), conditional exports (`import`/`require`/`node`/`default`/`types`), the dual-package hazard and how to avoid it, encapsulation (blocking deep imports → `ERR_PACKAGE_PATH_NOT_EXPORTED`).

**Gotcha (PROTOCOL.md):** literal `{`/`}` and JSON like `"exports": { "." : {...} }` in display text/tables must be escaped (`&#123;`/`&#125;`) or wrapped in fenced code, never bare in MDX prose. A `diagnose` "why does this import fail" task fits well. Sources from nodejs.org "Modules: Packages" + "ESM". Depth middle/senior.

## Verify
- Zod-pre-validate practice JSON before building (PROTOCOL.md).
- `cd site && bun run build 2>&1 | tail -10` → `Complete!`, errors `0`.
- READ-ONLY correctness review (resolution/exports semantics, RU); fix.
- Commit `content(node): unit 13-modules-deep EN+RU ready`. Report branch + SHA + counts.
