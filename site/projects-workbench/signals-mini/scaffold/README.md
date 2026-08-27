# Signals mini — starter

Implement `signal`, `computed`, `effect`, and `batch` in `src/signals.ts`.

    bun test

Rules: synchronous only, no deps, no I/O. Auto-track dependencies via a
current-execution-context stack. `computed` must be lazy and cached.
`batch` must coalesce writes so effects fire once. The diamond graph
`a→(b,c)→effect(b+c)` must evaluate the effect exactly once per update
to `a` (glitch-free). Dynamic deps: conditionally-read signals must
unsubscribe when the branch is not taken.

---

Product milestones — see the project page for the full 5-step product brief:

1. **signal() + effect() with auto-tracking** (`signal-and-effect`)
2. **Lazy cached computed()** (`computed`)
3. **Glitch-free batching** (`batching-glitch-free`)
4. **untrack() and effect cleanup** (`untrack-and-cleanup`)
5. **Benchmark and observe the graph** (`benchmark-and-observe`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

