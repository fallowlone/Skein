# Project Workbench Phase 3b — 6 New Runnable Guided Projects

> **For agentic workers:** author 6 brand-new guided projects, each a FULL bilingual project JSON (to job-scheduler depth) + a runnable hermetic bun:test workbench fixture (rate-limiter pattern). The engine (schema/verify:projects/build:starters/lint/render/hub-listing) already ships — new JSONs auto-surface on the hub and per-track pages.

**Goal:** Grow the catalog 39 → 45 projects and runnable workbenches 14 → 20, filling classic data-structure / systems / parsing gaps with pure-logic projects that ship runnable immediately (no Go/Python toolchain needed).

**Architecture:** Per project: (1) `site/src/content/projects/<slug>.json` validating against ProjectSchema with rubric+reference+brief+`workbench:true`; (2) `site/projects-workbench/<slug>/{manifest,scaffold/{src,test,README},solution/src}` hermetic fixture. New JSONs auto-list (hub `projects.astro`, `learn/[track]/index.astro`, detail `[slug].astro`).

**Tech Stack:** Astro content (Zod), Bun stdlib + bun:test (fixtures).

## Global Constraints

- **Schema (required):** slug (`^[a-z0-9-]+$`), title, pitch, deliverable (all BiText en+ru), `tracks` (≥1, from the TRACKS enum), `category` (one of frontend|backend|fullstack|infra|security|systems|data|algorithms), `difficulty` (starter|intermediate|advanced), `estDays` (positive int), `skills` (≥1), `milestones` (≥2 — use GuidedMilestone objects: `id` `^[a-z0-9-]+$`, title, goal, `definitionOfDone` ≥1, optional reviewPrompt), `seniorStretch` (≥1). Optional: stack, brief, rubric, reference, workbench.
- **OMIT `feedsFrom`** on milestones (it warns unless the key is a real track/unit/lesson) — these are new projects; skip it.
- **Bilingual or it does not ship.** Every BiText needs a genuine ru. Lint fails en===ru on prose ≥25 chars.
- **Depth = job-scheduler.json** (4–6 rich GuidedMilestones with senior-grade goal prose + a real definitionOfDone) + rate-limiter-grade rubric (3–4 project-specific dims, junior→mid→senior ladder) + reference (3–5 why-not-what sections) + a brief.
- **Fixture:** Bun stdlib + bun:test only; hermetic + deterministic (inject clocks/rand — no Date.now/Math.random in the unit). Stub FAILS the suite; solution PASSES. `verify:projects` is the gate. Add `workbench:true` to the JSON (its dir is required by the orphan/coherence lint).
- Gate locally: `bun run test` + `bun run verify:projects` + `bun run lint:src` + dev-curl. Full astro build OOMs locally; CI renders.

## The 6 projects (slug · category · tracks · fixture unit contract)

### lru-cache · backend · ["backend","caching"] · intermediate · 4d
Fixture unit (`cache.ts`): `LRUCache<K,V>(capacity)` with `get(k)`, `put(k,v)`, `has(k)`, `size`, backed by a hashmap + doubly-linked list for O(1). Suite: get/put round-trips; LRU eviction at capacity (least-recently-used evicted, get/put both count as use); updating an existing key refreshes recency without growing size; capacity 0 / eviction order asserted; `has` does not bump recency (or does — pick one and assert it). Milestones: naive array → hashmap+DLL O(1) → recency on read → eviction policy → TTL variant → instrument hit-rate.

### trie-autocomplete · algorithms · ["algorithms","frontend"] · intermediate · 4d
Fixture unit (`trie.ts`): `Trie` with `insert(word, weight?)`, `has(word)`, `startsWith(prefix)`, and `autocomplete(prefix, k)` returning up to k completions ranked by weight then lexicographically. Suite: insert/has; startsWith true/false; autocomplete returns prefix matches ranked by weight; ties break lexicographically; k limits results; empty prefix / no-match returns []. Milestones: trie nodes → insert/lookup → prefix walk → ranked completions → weight updates → memory vs DAWG tradeoff.

### json-parser · algorithms · ["algorithms","typescript"] · advanced · 6d
Fixture unit (`parser.ts`): `parse(input: string): JsonValue` — a recursive-descent parser handling objects, arrays, strings (with `\n \t \" \\ \uXXXX` escapes), numbers (int/float/exp/negative), true/false/null, and whitespace; throws a `ParseError` carrying the position on malformed input. Suite: parses each type; nested object/array; escape sequences; numbers incl negative/exponent; rejects trailing comma / unquoted key / unterminated string with a positioned error. Milestones: tokenizer → values → strings+escapes → numbers → nesting+errors-with-position → spec edge cases.

### consistent-hashing · systems · ["distributed","backend"] · advanced · 5d
Fixture unit (`ring.ts`): `HashRing(opts: {vnodes, hash?})` with `addNode(id)`, `removeNode(id)`, `getNode(key)`. Inject a deterministic `hash` fn (NOT a real crypto hash) so tests are reproducible. Suite: getNode maps a key to some node; adding a node only remaps keys that fall in the new node's arc (measure: fraction of keys remapped is bounded, not ~all); removing a node redistributes its keys to neighbors only; vnodes improve balance (stddev of load drops vs vnodes=1). Milestones: ring + modular placement → vnodes → add/remove minimal-remap → load balance measurement → weighted nodes → bounded-load extension.

### circuit-breaker · backend · ["backend","distributed"] · intermediate · 4d
Fixture unit (`breaker.ts`): `CircuitBreaker(opts:{failureThreshold, openMs, halfOpenMax})` with `call(fn, now)` and a `state(now)` accessor; injected clock via `now`. States closed→open (after threshold failures)→half-open (after openMs)→closed (on half-open success) / →open (on half-open failure). Suite: stays closed under successes; trips to open after threshold consecutive failures; rejects fast while open (does not call fn) until openMs elapses; transitions to half-open at openMs and allows a probe; a successful probe closes, a failed probe re-opens and resets the timer. Milestones: failure counter → open/short-circuit → half-open probe (injected clock) → success/failure transitions → rolling-window failures → metrics + fallback.

### text-diff-myers · algorithms · ["algorithms","engineering-practice"] · advanced · 6d
Fixture unit (`diff.ts`): `lcs(a[], b[]): T[]` and `diff(a[], b[]): Array<{op:'keep'|'insert'|'delete', value:T}>` (line/element diff; the edit script reconstructs b from a). Suite: identical inputs → all keep; pure insertion / pure deletion; a real interleaved change yields a minimal script; applying the script to a reproduces b; lcs length correct on a known pair. Milestones: LCS DP table → backtrack edit script → Myers O(ND) → minimal script → apply/patch → hunk grouping (unified-diff style).

## Execution

Author-only parallel subagents (one per project) — each writes its `<slug>.json` + `projects-workbench/<slug>/**` (disjoint), self-proves the fixture in a tmp dir (scaffold bun test → non-zero; solution → zero), and does NOT git/verify/build. Controller then: `bun run test` (schema + lint), `bun run verify:projects` (20/20), `bun run lint:src`, `build:starters` (20 zips), dev-render the 6 new pages → commit → whole-branch opus review (correctness + depth + bilingual) → fix → merge → deploy → confirm prod.
