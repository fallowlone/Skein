# Project Workbench Phase 3a — Expansion to 7 More Runnable Projects

> **For agentic workers:** mirrors the Phase-1 fixture pattern (manifest + scaffold stub + acceptance suite + README + reference solution) on 7 existing projects whose core is pure, hermetic, bun-ts-testable. The engine (schema/verify:projects/build:starters/lint/render) already ships — this only adds fixtures + `workbench:true`.

**Goal:** Grow runnable, downloadable, CI-verified workbenches from 7 → 14 by adding a hermetic `bun:test` fixture to: signals-mini, numeric-toolkit, tiny-stack-vm, pathfinding-route-engine, at-least-once-queue, cache-stampede-lab, write-ahead-log.

**Architecture:** Per slug: `site/projects-workbench/<slug>/{manifest.json (stack bun-ts, test "bun test"), scaffold/{src,test,README.md}, solution/src}`. The acceptance suite lives in `scaffold/test/`; `scaffold/src` is a FAILING stub; `solution/src` overwrites the stub and PASSES. Add `"workbench": true` to the project JSON. Extract the project's PURE CORE (inject clocks/loaders — no DB, no network, no DOM, no filesystem) so the displayed snippet runs deterministically, exactly like rate-limiter's `TokenBucket`.

**Tech Stack:** Bun stdlib + `bun:test` ONLY. No third-party deps, no `bun install`, no network.

## Global Constraints

- Bun stdlib + `bun:test` only; hermetic + deterministic (inject `now`/loaders; no `Date.now()`, no real I/O).
- `verify:projects` is the gate: scaffold-only `bun test` exits non-zero; scaffold+solution exits zero.
- Every `workbench:true` project needs its dir (orphan/coherence lint) — add the key in the same change as the dir.
- Solution dir contains NO test files (only `src/`); the suite lives in `scaffold/test/` and is shared by both runs.
- README: ≤12 lines, says implement-the-stub + `bun test` + push-to-the-rubric.
- Stub must FAIL the suite (throw or return wrong) — not merely be incomplete in a way that passes.
- Bilingual not required here (code/tests are language-neutral; the JSON already has EN+RU rubric/reference from Phase 2).

## Per-project contracts (the unit under test + what the suite asserts)

### 1. signals-mini  (purest — start here)
Unit: `signal(v)` → `{ get(), set(v) }`; `computed(fn)`; `effect(fn)`; `batch(fn)`. Injected nothing (synchronous).
Suite asserts: (a) `effect` runs once on register then re-runs when a read signal changes; (b) `computed` is lazy + cached — recomputes only when a dependency changed (count fn calls); (c) diamond A→(B,C)→D evaluates D exactly once per update (glitch-free), not twice; (d) dynamic deps: a computed that conditionally reads `b` drops `b` as a dep when the branch flips; (e) `batch` coalesces multiple `set`s into a single effect run.

### 2. numeric-toolkit
Unit: `matmul(A,B)`, `solve(A,b)` (Gaussian elimination + partial pivoting), `variance(xs)` (numerically stable — Welford or two-pass).
Suite asserts: (a) `matmul` against a hand-computed product; (b) `solve` of a 3×3 with a known integer solution; (c) partial pivoting solves a system whose FIRST pivot is 0 (naive elimination divides-by-zero) — proves pivoting; (d) `variance` of `[1e9+1, 1e9+2, 1e9+3]` ≈ 1.0 (naive sum-of-squares loses it to cancellation); (e) a singular matrix makes `solve` throw.

### 3. tiny-stack-vm
Unit: `assemble(src: string)` → `number[]` bytecode; `run(code: number[])` → number (top of stack at HALT).
Suite asserts: (a) `PUSH 2 / PUSH 3 / ADD / HALT` → 5; (b) backward `JMP` loop sums 1..n; (c) `JMPIF` takes/skips by stack top; (d) `CALL`/`RET` with a frame: a square subroutine returns and the caller continues; (e) `ADD` on an empty stack throws (stack-underflow guard); (f) forward label resolves (two-pass assembler).

### 4. pathfinding-route-engine
Unit: `parseGrid(s)`; `MinHeap`; `dijkstra(grid,start,goal)` and `astar(grid,start,goal)` → `{ path, cost, expanded }`; `bfs` for unweighted.
Suite asserts: (a) `MinHeap` pops ascending; (b) BFS returns the shortest hop-count path on an open grid; (c) Dijkstra routes AROUND a high-weight cell to a cheaper longer path (weights respected); (d) A* with Manhattan heuristic returns the SAME `cost` as Dijkstra and `expanded_astar ≤ expanded_dijkstra` (admissible + not worse); (e) a walled-off goal → `path === null`.

### 5. at-least-once-queue  (model the semantics, injected clock — no DB)
Unit: in-memory `Queue` with injected `now`: `enqueue(job)`, `claim(now)` → job|null (sets a visibility deadline), `ack(id, now)`, `nack(id, now)`, plus an idempotent `process(job, effects)` keyed by `job.key`.
Suite asserts: (a) `claim` returns a job, a second immediate `claim` returns null (leased); (b) after the visibility timeout a `claim(later)` re-delivers the un-acked job (at-least-once); (c) an `ack`'d job never re-delivers; (d) two interleaved claims never hand out the same job; (e) the idempotent handler applied twice with the same key produces ONE effect; (f) a job that nacks past `maxAttempts` lands in the dead-letter list.

### 6. cache-stampede-lab  (single-flight + early-expiry, injected clock + counting loader)
Unit: `Cache` with injected `now` + `singleFlight`; `get(key, now, loader)`; `shouldEarlyRefresh(now, expiry, delta, beta, rand)` (XFetch: `now - delta*beta*ln(rand) >= expiry`).
Suite asserts: (a) N "concurrent" gets on a cold key (loader is async; resolve after scheduling all) call the loader exactly ONCE — coalesced; (b) after expiry a single refresh repopulates (loader count increments by 1, not N); (c) `shouldEarlyRefresh` returns true earlier as `delta` (recompute cost) grows; (d) stale-while-revalidate: while one refresh runs, callers get the stale value, not a block/miss.

### 7. write-ahead-log  (append/replay/checkpoint over an injected in-memory "disk")
Unit: `WAL` over a byte-buffer `Disk` with an explicit `fsync` barrier + a `crashTruncate(offset)`; `append(rec)`, `replay()` → records, `checkpoint()`. Records are length-framed + CRC32.
Suite asserts: (a) appended records `replay()` in order; (b) a torn tail (`crashTruncate` mid-last-record) is detected by the frame/CRC and dropped — earlier records survive (no total loss); (c) a CRC mismatch on a body marks that record corrupt and stops replay there; (d) `checkpoint()` then `replay()` returns only post-checkpoint records; (e) truncation after checkpoint reclaims the replayed prefix.

## Execution

Author-only parallel subagents (one per slug) — each writes its `projects-workbench/<slug>/**` (disjoint dirs) + adds `workbench:true` to its JSON, and SELF-PROVES in a tmp dir (`cp scaffold /tmp/x; bun test` → non-zero; `cp solution/src/* /tmp/x/src; bun test` → zero). They do NOT run `verify:projects`, NOT git, NOT build (avoids the shared-scan/git interference that forced Phase-1 sequencing). Controller then: `bun run verify:projects` (all 14 green) + `bun run test` + `bun run lint:src` + dev-render smoke → commit per slug or in one wave → whole-branch opus review → merge → deploy. `build:starters` will zip the 7 new scaffolds automatically (CI step already writes into dist).
