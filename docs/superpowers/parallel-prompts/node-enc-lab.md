# Fill the Node Mastery Lab challenge set (encyclopedia round)

Branch: `expand-node-lab`. **First read** `docs/superpowers/parallel-prompts/PROTOCOL.md` and plan Task 10 in `docs/superpowers/plans/2026-06-04-node-encyclopedia-mastery-lab.md`. Commit to `expand-node-lab` only; **do NOT merge/push**.

This is DATA, not MDX lessons. The `lab` collection + page + lint rule already exist on `main` (Phase 0). Four seed files already exist with 3 challenges each — **expand them in place** up to the per-tier targets (overwrite/extend, keep the existing well-formed challenges):
- `site/src/content/lab/node/00-warmup.json` → **≥5** challenges (`predict`/`fix`)
- `site/src/content/lab/node/01-build.json` → **≥8** (`design`)
- `site/src/content/lab/node/02-diagnose.json` → **≥5** (`incident`/`fix`)
- `site/src/content/lab/node/03-capstone.json` → **≥3** (`design`; collection schema requires ≥3 per file)

Hitting these counts clears the 3 current lint **warnings** (under-target tiers) → build goes fully `0/0`.

## Schema (each challenge is a `PracticeTask` — `site/src/content.config.ts:77-130`)
Types + required fields (NO `grading` wrapper on `design`/`incident`/`predict`):
- `predict`: `scenario` {en,ru}, `reveal` {en,ru}
- `design`: `constraints` {en,ru}, `rubric` [{en,ru} ×≥2], `model` {en,ru}
- `incident`: `steps` [{label,prompt,reveal} all {en,ru}] × 3–6
- `fix`: optional `starter` (plain STRING, not object), `grading` = {mode:"self",model,rubric[≥1 {en,ru}]} OR {mode:"exec",runtime:"js",check:{kind,value?}}
- `diagnose`: `grading` = {mode:"blanks",blanks[…]} OR {mode:"self",model,rubric}
- All share: `id` (`^[a-z0-9-]+$`, **globally unique within node lab**), `type`, `difficulty` (recall|apply|stretch), `estMin`, `title` {en,ru}, `prompt` {en,ru}.

**Lint note:** a `{en,ru}` field with en===ru and len ≥25 is flagged "untranslated" UNLESS the key is `evidence`. For code-only `scenario`/`model` snippets, add a localized leading comment so en !== ru (see existing warmup challenges for the pattern).

## Challenge ideas (understanding-focused; reuse where the seeds already cover one)
- **warmup**: output ordering, blocking spot, stream-vs-buffer (seeded), + ESM/CJS resolution result, microtask starvation by recursive nextTick.
- **build**: static file server on raw `net` (seeded), Transform w/ backpressure (seeded), timing-safe token check (seeded), + UDP service-discovery on `dgram`, dual-package ESM/CJS lib with `exports` map, N-API hello-world (or WASM alt), HTTP/2 server with ALPN, undici keep-alive client pool.
- **diagnose**: 3-snapshot heap leak (seeded), event-loop lag→sync call (seeded), TLS chain failure (seeded), + fix a V8 deopt from `--prof`, debug a dual-package hazard (two state copies).
- **capstone**: production service (seeded), published dual-package lib (seeded), streaming CLI (seeded).

## Verify
- **Zod-pre-validate ALL four files against `PracticeTask` BEFORE building** (PROTOCOL.md — reconstruct the discriminated union from content.config.ts; `safeParse` each). This is the #1 time-saver.
- `cd site && bun run build 2>&1 | tail -10` → `Complete!`, lint **0 errors / 0 warnings**; `dist/{en,ru}/learn/node/lab/index.html` exist.
- READ-ONLY correctness review over challenge prompts/models (technical accuracy, RU); fix.
- Commit `content(lab): full node Mastery Lab challenge set`. Report branch + SHA + per-tier counts.
