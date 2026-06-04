# Author node unit `14-v8-and-crypto` (encyclopedia round)

Branch: `expand-node-v8`. **First read** `docs/superpowers/parallel-prompts/PROTOCOL.md` and plan Task 9 in `docs/superpowers/plans/2026-06-04-node-encyclopedia-mastery-lab.md`. Exemplar: `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx`. Commit to `expand-node-v8` only; **do NOT merge/push**.

## Append this unit object to `site/src/content/units.json` (order 14)
```json
{ "id": "node/14-v8-and-crypto", "slug": "14-v8-and-crypto", "track": "node", "order": 14,
  "title": { "en": "V8 internals & crypto", "ru": "Внутренности V8 и crypto" },
  "crux": { "en": "How V8 optimizes your code, and using crypto correctly.", "ru": "Как V8 оптимизирует код и как правильно использовать crypto." },
  "lessons": ["01-v8-optimization", "02-crypto-deep", "03-heap-snapshots-and-flamegraphs"] }
```

## Lessons (EN+RU each, status:ready, ≥1 diagram, practice ~6 tasks)
Paths: `site/src/content/lessons/{en,ru}/node/14-v8-and-crypto/<lesson>/index.mdx` + practice `site/src/content/practice/node/14-v8-and-crypto/<lesson>.json`.

1. **`01-v8-optimization`** (senior) — hidden classes / object shapes (what breaks them), inline caches (mono/poly/megamorphic), JIT tiers + deoptimization triggers, GC generations (scavenge young gen vs mark-sweep-compact old gen), why monomorphic stable-shape code is fast. Mention `--allow-natives-syntax`/`%GetOptimizationStatus` as a *peek*, not production.
2. **`02-crypto-deep`** (middle) — `crypto`: hashing vs HMAC, `createHash`/`createHmac`, sign/verify (asymmetric), password KDFs (`scrypt`/`pbkdf2`, never plain SHA for passwords), `randomBytes`/`randomUUID`, `timingSafeEqual` and why `===` on secrets leaks timing. Natural home for a `fix` exec(js) task on `timingSafeEqual`.
3. **`03-heap-snapshots-and-flamegraphs`** (senior) — heap snapshots (`v8.writeHeapSnapshot`/inspector), reading retainers + the 3-snapshot leak technique, CPU profiling `--cpu-prof`/`--prof`, flame graphs, distinguishing a leak from churn.

Sources: V8 blog (hidden classes, ICs), nodejs.org `crypto`, the diagnostics/"don't block" guides. Depth senior (crypto-deep middle).

## Verify
- Zod-pre-validate practice JSON before building (PROTOCOL.md). `fix` exec runtime must be `"js"`; `check.kind` one of stdout-equals/stdout-contains/no-error.
- `cd site && bun run build 2>&1 | tail -10` → `Complete!`, errors `0`.
- READ-ONLY correctness review (V8 internals, crypto correctness — wrong crypto teaches insecure habits; RU); fix.
- Commit `content(node): unit 14-v8-and-crypto EN+RU ready`. Report branch + SHA + counts.
