# Project weaknesses audit — 2026-06-07

Honest, evidence-based assessment of what blocks this project from reliably taking a
learner from junior → **senior+** fullstack, and from being a complete language layer.
Sorted by severity. This doc is the input to the **Senior+ Campaign** spec (Phase 1).

Method: three parallel read-only explorations of `site/src/content/`, `site/src/`, and
the build/CI pipeline, cross-checked against direct `grep`/`find` counts on 2026-06-07.
Two earlier agent claims were **corrected** by direct inspection (noted inline).

---

## Severity: CRITICAL

### C1. Knowledge depth is uneven — ~47% of units are stubs
- 45 units `status: ready`, 80 `no-status`, **149 `stub`** (~33%). Usable ≈ 125/274 (~47%).
- Senior-depth is real where authored (Algorithms, Networking, Databases, Observability —
  verified by reading lessons: mechanism + tradeoff + failure mode + real numbers).
- But depth is **inconsistent**: Backend/Frontend read junior-to-middle; Testing, Security
  (only OAuth 2.1 ready; OWASP/JWT = stubs), APIs (only GraphQL N+1 ready) are thin.
- No machine-checkable **depth bar** per unit → no way to see the gap at a glance.
- **Impact:** a learner hits senior-grade material in some tracks and placeholder stubs in
  others. The "senior+" promise is unmet outside the deep tracks.

### C2. Missing tracks a senior fullstack must have
Entirely absent or stub-only, despite being core to the depth bar:
- **Testing & test strategy** — TDD unit exists but `no-status` (unpublished); no
  unit/integration/e2e tradeoffs, mocking, fixtures, flaky-test diagnosis.
- **Debugging & diagnostics** — scattered (one Base-CS lesson); no systematic track
  (debugger, profiler reading, memory-leak hunt, strace/perf, core dumps).
- **Microservices / service decomposition** — Raft exists; no service boundaries, gateways,
  saga, inter-service comms, failure modes.
- **Concurrency & parallelism theory** — fragmented across Networking/Browser/Node; no
  unified threads-vs-processes-vs-coroutines, locks, memory ordering, deadlock.
- Also thin: ORM/query-builder patterns, frontend state-management deep dives,
  error-handling/recovery (retry/backoff/bulkhead/degradation), production-readiness
  (load testing, capacity planning, graceful shutdown, rate-limit implementation).

### C3. Bus factor = 1
- Single author; custom subsystems (path-engine, progression, English SRS/speech, lint
  rules) have **no design docs / runbooks**.
- "Don't parallelize the build or it OOMs" is tribal knowledge encoded only in a code
  comment. Onboarding a second maintainer or recovering after an absence is undocumented.

---

## Severity: HIGH

### H1. Build is at its scaling ceiling
- `astro.config.mjs`: `build: { concurrency: 1 }` — forced serial because concurrency >1
  held multiple render contexts and OOM-killed the Cloudflare 8 GB builder.
- `package.json`: `NODE_OPTIONS=--max-old-space-size=10240` (10 GB heap) needed.
- `deploy.yml`: single-threaded render ≈ **23 min for ~4850 pages and growing**;
  `timeout-minutes: 60` (was 30, raised after a mid-lint SIGKILL).
- Lint runs as a **separate post-build process** (`lint-dist.mjs`) because the in-process
  `astro:build:done` hook inherited the render's heap and OOM'd.
- **Impact:** +10 tracks likely re-breaches the memory ceiling. Build time grows linearly.
  Code comment names the real fix: **shard the render**.
- **Correction:** an earlier audit claimed "no CI/CD." False — `.github/workflows/deploy.yml`
  exists and already builds on GitHub Actions, then `wrangler pages deploy`s. The cloud
  builder is no longer the bottleneck; the **slow single-threaded render** is.

### H2. Practice coverage is incomplete (but infra is strong)
- **962 practice JSON files for 1686 lessons ≈ 57% coverage.** ~43% of lessons have no
  practice set.
- **Correction:** an earlier audit called practice "minimal quizzes." False — the infra is
  good: live SQL via PGlite (`SqlSandbox`), live JS via quickjs (`JsSandbox`), AI grading
  (`GradeWithAi` / `practice-grade-llm.ts`), task types `sandbox / diagnose / fix /
  incident` (multi-step incident walk-throughs with rubrics).
- The real gap is **coverage + senior-grade depth**, not infrastructure: need 100% coverage
  and a heavier mix of `incident`/`stretch` tasks grounded in real-world failure cases.

### H3. UI/component test coverage is thin
- 126 test files; core engines well covered (path-engine ~89%, English ~74%, progression).
- But **86 components, ~4 component tests (~5%)**. Pedagogy widgets (Sandbox, ReactiveDiagram,
  TierAccordion, Pretest) have **0 unit tests**. UI regressions ship undetected.

---

## Severity: MEDIUM

### M1. German layer is a stub (being removed in Phase 0)
- English: 3759 vocab (A2/B1/B2, NGSL/NAWL-sourced), 837 reading units, FSRS SRS,
  real STT (Web Speech + on-device Whisper), AI-graded writing.
- German: **~114 vocab** total (30× smaller), ~15 reading units, no B2, no placement.
  Plateaus at pre-A2. **Decision: remove now** (`src/german`, `src/components/german`,
  `src/pages/[lang]/german`); recoverable from git.

### M2. No integrated fullstack capstone
- Tracks are silos. No sequence that carries one feature idea → design → code → test →
  deploy → observe → incident → post-mortem across the stack. This is the exact muscle a
  senior is hired for, and it's absent.

### M3. No content lifecycle / staleness detection
- `stub → draft → ready` status exists, but nothing flags aging content for review. With
  1686×2 lessons, tech drift will silently rot the deep tracks first.

### M4. Practice is not auto-graded end-to-end for open answers
- `fix`/`incident` tasks grade via self-rubric or optional AI (BYOK). Without a key, the
  hardest, most senior-shaped tasks have no objective check.

---

## Severity: LOW (track, don't fixate)

- `src/lint/rules/hydration-budget.ts` is **dead** (guards piece pages; none exist) → archive.
- 61 `: any`, 1 `@ts-ignore`, 1 `eslint-disable` — all localized to JSON trust boundaries.
  Not a pattern. Zero `TODO/FIXME/HACK` in source.
- i18n parity is **perfect** (EN 1686 = RU 1686, lint-enforced) — a genuine strength.

---

## What is genuinely good (don't regress)
- Deep tracks (Algorithms, Networking, Databases, Observability) are senior-grade.
- Practice infrastructure (sandboxes + AI grade + incident sims) is strong.
- 17-rule build-time curriculum linter; perfect i18n parity; clean, low-debt codebase.
- CI already on GitHub Actions with cheap fail-fast gates (tests + `verify:samples`) before
  the expensive render.

---

## Verdict
Exceptional **foundations engine** with strong **practice infra** and a strong **technical-
English** layer. Blockers to "reliably reach senior+": (C1) uneven depth / 47% stubs,
(C2) missing core tracks, (H2) 57% practice coverage with too few senior-grade tasks,
(M2) no integrated capstone — plus the (H1) build ceiling and (C3) bus factor as enabling
risks. The Senior+ Campaign (Phase 1) targets C1, C2, H2, M2; Phase 0 clears H1 + M1 + this
doc.
