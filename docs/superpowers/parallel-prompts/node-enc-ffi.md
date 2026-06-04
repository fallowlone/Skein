# Author node unit `12-native-and-ffi` (encyclopedia round)

Branch: `expand-node-ffi`. **First read** `docs/superpowers/parallel-prompts/PROTOCOL.md` and plan Task 7 in `docs/superpowers/plans/2026-06-04-node-encyclopedia-mastery-lab.md`. Exemplar: `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx`. Commit to `expand-node-ffi` only; **do NOT merge/push**.

## Append this unit object to `site/src/content/units.json` (order 12)
```json
{ "id": "node/12-native-and-ffi", "slug": "12-native-and-ffi", "track": "node", "order": 12,
  "title": { "en": "Native addons & FFI", "ru": "Нативные аддоны и FFI" },
  "crux": { "en": "Calling C/C++ from Node — and when not to.", "ru": "Вызов C/C++ из Node — и когда этого не делать." },
  "lessons": ["01-native-addons-napi", "02-build-and-wasm-alternatives"] }
```

## Lessons (EN+RU each, status:ready, ≥1 diagram, practice ~6 tasks)
Paths: `site/src/content/lessons/{en,ru}/node/12-native-and-ffi/<lesson>/index.mdx` + practice `site/src/content/practice/node/12-native-and-ffi/<lesson>.json`.

1. **`01-native-addons-napi`** (senior) — N-API / node-addon-api, the ABI-stability guarantee (why N-API over raw V8/NAN), the addon boundary, passing values across, async work (`napi_async_work`), the cost of crossing into native.
2. **`02-build-and-wasm-alternatives`** (senior) — node-gyp, `binding.gyp`, prebuilds/`prebuildify`, install-time compilation pain, and the alternatives — WebAssembly (WASI/wasm modules), child process to a native binary, pure-JS — with an explicit decision rule for *when NOT to* write a native addon.

Sources from nodejs.org N-API docs, node-gyp README, a WASM-in-Node reference. Depth senior. Show real code (a tiny addon + its `binding.gyp` + the JS `require`), and be honest about the maintenance cost.

## Verify
- Zod-pre-validate practice JSON before building (PROTOCOL.md).
- `cd site && bun run build 2>&1 | tail -10` → `Complete!`, errors `0`.
- READ-ONLY correctness review (N-API/node-gyp/WASM claims, RU); fix.
- Commit `content(node): unit 12-native-and-ffi EN+RU ready`. Report branch + SHA + counts.
