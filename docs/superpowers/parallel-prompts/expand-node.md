# Expand the `node` track to full depth (zero → senior+)

Branch: `expand-node`. First read `PROTOCOL.md` in this folder and follow it exactly.
Track `node` already has units 00-start-here, 01-modules-and-runtime, 02-async-and-streams (orders 0-2). Add the units below (orders 3+), author every lesson EN+RU to `ready`.

## Units to add (each = a unit object in units.json + EN+RU stubs + authored lessons)

### 03-errors-and-diagnostics  (crux: how Node surfaces, propagates, and lets you diagnose failures)
- `01-error-handling` (middle) — Error objects, throw vs reject, error-first callbacks, `cause`, custom errors, `uncaughtException`/`unhandledRejection`, never swallow.
- `02-debugging-and-inspect` (middle) — `--inspect`/Chrome DevTools, breakpoints, `node --inspect-brk`, source maps, `util.debuglog`.
- `03-diagnostics` (senior) — `diagnostics_channel`, `async_hooks`/AsyncLocalStorage for request context, `process` signals, core dumps, `--cpu-prof`/`--heap-prof`.

### 04-performance  (crux: find and fix the event-loop and memory bottlenecks)
- `01-event-loop-monitoring` (middle) — event-loop lag, `perf_hooks`, `monitorEventLoopDelay`, blocking detection.
- `02-cpu-and-memory-profiling` (senior) — CPU profiles, heap snapshots, finding leaks, GC basics for Node.
- `03-worker-threads-and-clustering` (senior) — worker_threads for CPU work, the cluster module / multiple processes, when each.

### 05-http-and-frameworks  (crux: from the raw http module to a production HTTP service)
- `01-http-module` (middle) — `http`/`https` server+client, streaming requests/responses, keep-alive, timeouts.
- `02-express-vs-fastify` (middle) — routing, middleware model, the two ecosystems, when which (TradeoffMatrix).
- `03-middleware-and-errors` (middle) — middleware composition, centralized error handling, validation, graceful shutdown.

### 06-testing  (crux: fast, trustworthy Node tests)
- `01-unit-testing` (middle) — `node:test`/Vitest, assertions, mocking modules/timers, fixtures.
- `02-integration-and-supertest` (middle) — testing an HTTP API in-process, test DB, isolation.

### 07-security  (crux: the Node-specific attack surface)
- `01-input-and-secrets` (senior) — input validation, injection, secrets handling, `process.env`, env files.
- `02-dependencies-and-supply-chain` (senior) — `npm audit`, lockfile integrity, prototype pollution, sandboxing untrusted code.

### 08-packaging-and-deploy  (crux: ship a Node service)
- `01-bundling-and-publishing` (middle) — ESM/CJS publish, `exports`, tree-shaking, building a CLI.
- `02-containerizing-node` (middle) — multi-stage Docker for Node, distroless, signals/PID 1, healthchecks.

### 09-putting-it-together
- `01-capstone-production-service` (senior) — design + harden a small Node HTTP service end to end (errors, perf, tests, security, deploy).

Author at middle/senior depth (mechanism + tradeoff + real failure mode). Build green on `expand-node`, commit, do NOT merge.
