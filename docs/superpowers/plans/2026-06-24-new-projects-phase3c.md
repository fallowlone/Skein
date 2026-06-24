# Project Workbench Phase 3c — 6 More New Runnable Guided Projects

> Same proven recipe as Phase 3b (full bilingual ProjectSchema JSON + hermetic bun:test workbench). Engine ships; new JSONs auto-list. Catalog 45 → 51; runnable workbenches 20 → 26.

**Goal:** Add 6 classic pure-logic algorithms/data-structure projects that ship runnable immediately.

## Global Constraints (identical to Phase 3b)

- Schema required: slug, title, pitch, deliverable (BiText), `tracks` (≥1 from TRACKS enum), `category` (frontend|backend|fullstack|infra|security|systems|data|algorithms), `difficulty` (starter|intermediate|advanced), `estDays` (+int), `skills` (≥1), `milestones` (≥2 GuidedMilestone: id/title/goal/definitionOfDone≥1, optional reviewPrompt — OMIT feedsFrom), `seniorStretch` (≥1). + brief, rubric (3-4 dims), reference (3-5), workbench:true.
- Bilingual or it does not ship (genuine ru; lint fails en===ru ≥25 chars). Depth = job-scheduler. Rubric = real junior→mid→senior ladder, project-specific.
- Fixture: Bun stdlib + bun:test only; hermetic + deterministic (inject RNG/hash/clock — never Math.random/Date.now in the unit). Stub FAILS, solution PASSES; verify:projects is the gate.

## The 6 (slug · category · tracks · fixture contract)

### bloom-filter · data · ["data-engineering","backend"] · intermediate · 4d
Unit (`bloom.ts`): `BloomFilter(bits, k, hashes?)` — inject k deterministic hash fns; `add(s)`, `has(s):boolean`, `fillRatio():number`. Suite: added items always `has`→true (NO false negatives, ever); a never-added item is mostly false but the structure tolerates false positives; false-positive rate over a large sample stays below a computed bound for the chosen bits/k; `fillRatio` rises with inserts. Inject deterministic hashes in the test.

### skip-list · algorithms · ["algorithms","databases"] · advanced · 6d
Unit (`skiplist.ts`): `SkipList(coinFlip)` — inject a deterministic `coinFlip()` so levels are reproducible; `insert(k)`, `has(k)`, `delete(k)`, `toArray()` (ascending). Suite: insert/has; delete removes; `toArray` is sorted regardless of insert order; duplicate insert handled; a forced level distribution (via the injected coin) yields a multi-level structure; search visits fewer than N nodes on a tall list (expose a node-visit counter).

### regex-engine · algorithms · ["algorithms","js-engine"] · advanced · 7d
Unit (`regex.ts`): `compile(pattern): NFA` + `match(nfa, input): boolean` (Thompson NFA) supporting concat, alternation `|`, `*`, `+`, `?`, grouping `()`, and `.`. Suite: literal match; `.` wildcard; `a*` matches zero+; `a+` needs one+; `(ab|cd)*` alternation under star; anchored full-string match (reject partial); a pathological `(a*)*b`-style input does NOT hang (NFA simulation stays linear, not catastrophic backtracking).

### huffman-coding · algorithms · ["algorithms","data-engineering"] · advanced · 6d
Unit (`huffman.ts`): `build(freqs: Record<string,number>): Tree`, `codes(tree): Record<string,string>`, `encode(s, codes): string` (bit-string), `decode(bits, tree): string`. Suite: prefix-free (no code is a prefix of another); a more-frequent symbol gets a code no longer than a rarer one; `decode(encode(s)) === s` round-trip; single-symbol input handled; encoded length ≤ fixed-width length on a skewed distribution (compression win).

### topological-scheduler · algorithms · ["algorithms","engineering-practice"] · intermediate · 4d
Unit (`toposort.ts`): `topoSort(nodes, edges): string[]` (Kahn's) returning a valid order, throwing a `CycleError` (listing a cycle) on a cyclic graph. Suite: a DAG yields an order where every dependency precedes its dependent; independent nodes all appear; a cycle throws CycleError; a self-loop throws; disconnected components all included; deterministic tie-break (e.g. lexicographic) so output is stable.

### union-find · algorithms · ["algorithms","distributed"] · intermediate · 4d
Unit (`dsu.ts`): `DSU(n)` with `find(x)`, `union(a,b)`, `connected(a,b):boolean`, `count():number` (number of disjoint sets); union-by-rank/size + path compression. Suite: initially n singletons (count===n); union merges (connected true, count drops); transitive connectivity after a chain of unions; union of already-connected is a no-op on count; path compression keeps the forest shallow (assert find is correct after many unions); `count` accurate across a sequence.

## Execution

6 parallel author-only sonnet subagents (one per project; disjoint files; no git/verify/build). Controller: structural-jq schema check + verify:projects 26/26 + build:starters 26 zips + lint:src + test + dev-render 6 pages → commit → opus correctness+depth review → fix → merge → deploy → confirm prod.
