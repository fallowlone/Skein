# Backlog Sweep — phased sequencing (2026-06-18)

**Goal:** Tackle every *real-open* backlog item one phase at a time, each phase self-contained (own branch → build+test gate → merge local main; NO auto-push except Phase 0).

**Context for resume-after-compact:** planning-engine plan-network is COMPLETE + merged local main (ahead 6, NOT pushed). This doc sequences what remains. Stale items already verified DONE and dropped: build-opt render-shard (reverted), English Grammar P6 BYOK (shipped 2e3e1088), Cybersecurity cluster (merged+deleted), PageSpeed search-index (lazy endpoint shipped), feat/english-grammar-system (deleted).

## Phases (recommended order)

### Phase 0 — Push + deploy verify (unblock prod)
- `git push origin main` (6 commits: 241 diag banks + Plan C). Prod currently stale at `6af49164`.
- `gh run list` → confirm deploy green (~25 min build). GATE: green deploy.
- Needs explicit OK (user pushes manually by default).

### Phase 1 — Quality sweep T2 (diagram enrichment)
- Plan: `docs/superpowers/plans/2026-06-13-quality-sweep-T0-T4.md` §T2.
- Branch `feat/quality-T2-diagrams`. Tracks: distributed, ai-llm, data-engineering, apis, frontend, security, queues, caching, math.
- Replace filler `data-lesson-visual` tables / hand-SVG with typed diagram components (FlowDiagram/SequenceDiagram/StackDiagram/StructureFigure). Target each unit's `01-overview` first. math: balance-scale / box-substitution figures.
- DO NOT "fix" a diagram sitting between `</Explanation>` and `<KeyTakeaway>` — that's correct template layout.
- Subagent-driven, parallel per-track authors. Build+test gate. Merge local main.

### Phase 2 — Quality sweep T3 (interactivity breadth)
- §T3. Branch `feat/quality-T3-interactivity`. Tracks: system-design, system-design-cases, go, nextjs, react (DISJOINT from T2).
- One TradeoffMatrix / FadedExample / DragOrder per lesson where a real decision exists. Fix the 2 deployment `level:` mislabels.
- Subagent-driven. Gate. Merge. (T2/T3 disjoint → parallelizable via worktrees if desired; default sequential for clean build gates.)

### Phase 3 — Quality sweep T4 (RU polish)
- §T4. Branch `feat/quality-T4-ru`. MUST run after T2/T3 settle (avoid ru/ collisions).
- Translate English instructional comments inside ru fenced code blocks (keep API names / terminal output English); kill verb anglicisms (мандатит→требует, эхо-нит→воспроизводит, ретраят→повторяют, embed-ит→встраивает, реплейабельность→воспроизводимость); fix typo performance/01-profile-first/03-measurement-loop RU "Ключая"→"Ключевая". Scan-driven. Gate. Merge.

### Phase 4 — v2-screens Plan B: B2 (Progression + Achievements)
- Handoffs: `docs/redesign/v2/HANDOFF-progression-reskin.md`, `HANDOFF-achievements.md`. Read-only data screens (lower risk).
- Branch `feat/v2-B2`. Reskin per handoff, preserve real data wiring. Subagent-driven per-screen. Visual-verify EN/RU (structural — no Chrome locally). Gate. Merge.

### Phase 5 — v2-screens Plan B: B3 (Planning + Cabinet)
- Handoffs: `HANDOFF-planning-reskin.md`, `HANDOFF-cabinet-reskin.md`. Higher risk: cabinet touches auth/sync; Planning = PathView (just got PlacementMeter — reskin MUST preserve it).
- Branch `feat/v2-B3`. Gate. Merge.

### Phase 6 — Hygiene
- Bump `actions/cache@v4` (Node 20 deprecation warning) in `.github/workflows/`.
- Delete stale `feat/english-screens` (427 behind main, 1 ahead — unmergeable, rework moot).
- Decide fate of `docs/superpowers/plans/2026-06-11-english-methodology-alignment.md` (now committed).
- Gate: CI yaml still valid.

### Phase 7 — (OPTIONAL) English Grammar Spec B — adaptive study planner
- NO written spec exists → needs brainstorming + spec FIRST (superpowers:brainstorming → writing-plans). Net-new. Defer unless explicitly wanted.

## Global Constraints
- One branch per phase; build (`cd site && bun run build`) + `bun run test` gate before merge; merge to LOCAL main only, NO auto-push (except Phase 0). User pushes manually.
- Content waves: full build ~25 min (incremental ~2 min when only lesson bodies change). Budget time accordingly.
- Commit per wave: `content(quality): <wave> ...` (T-phases) / `feat(v2): <screen> ...` (B-phases).
- Subagent-driven execution per phase; per-task review + final whole-branch review; ledger at `.git/sdd/progress.md`.

## Risks
- Build time × 6 phases (mitigate: incremental cache; batch commits per wave).
- T4 depends on T2/T3 (ordering hard requirement).
- B3 cabinet = real auth/sync logic into static mockup → regression risk; must preserve PlacementMeter on Planning.
- Scope scatter (136 files already this session) → strict one-branch-per-phase discipline.
- Compact between phases → this doc + memory are the resume map.
