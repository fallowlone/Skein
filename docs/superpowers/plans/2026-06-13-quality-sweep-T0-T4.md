# Quality Sweep T0–T4 — execution plan (2026-06-13)

Orchestrator-driven audit → fix sweep. Audit verdict: content is senior-grade in ~31/34
tracks; gaps are `logic` track, a 828-widget correctness bug, diagram/interactivity breadth,
and RU polish. Delegate dirty work to sonnet/haiku; verify before mass edits.

## Wave discipline
- One build at the END (shared pedagogy/*.astro change already forces full render ~11min;
  no point building between waves). Final gate: `cd site && bun run build` + `bun run test`.
- Agents own DISJOINT file sets per wave (concurrent same-file edits = corruption).
- Every content agent: edit EN + RU twin, keep i18n parity, no harness-tag leakage, run
  Zod frontmatter sanity, NEVER git checkout/reset.

## T0 — correctness (DONE in main session, needs final build)
- [x] DragOrder / MetaphorComplete / TraceScenario: added `lessonSlug?` +
  `const slug = lessonSlug ?? pieceSlug ?? ""`, `data-piece-slug={slug}`. Fixes 828
  strict-widget invocations that passed `lessonSlug` → undefined pieceSlug → mis-scoped
  progress. Mirrors existing tolerant pattern in Quiz.astro / TradeoffMatrix.astro.
- [ ] level: frontmatter mislabels — fold into T3 cleanup agent (needs per-lesson judgment).
  Flagged: deployment/01-image-layers/01-overview (junior→middle),
  deployment/08-putting-it-together/01-overview (junior→senior).

## T1 — logic track rebuild (WAVE 1, isolated track `logic/`)
19 lessons EN+RU. All authored in topic format (Crux/KeyTakeaway/RetrievalDrawer) — wrong
for a from-zero foundations track. Per lesson:
- Convert `lessonType: topic` → `concept` (or `coding` where it teaches code).
- Adopt foundations skeleton: Hook→Goal→Explanation(Step)→Visual→WorkedExample→PracticeSet→Check→Recap.
- Add `<PracticeSet>` with ≥4 problems (currently 2–3 MCQ only).
- Add a real visual where missing (truth-table figure for propositional logic, call-tree
  diagram component for recursion instead of monospace ASCII).
- Split dense `05-recursion-and-recurrences/02-unrolling-recurrences` into two lessons;
  fix `prereqs: []` → real prereqs.
Lint: lessons.ts requires concept lessons to have hook/goal/worked-example/check/recap
sections + Step + visual + practice. Split agents by unit group; ≤4 units per agent.

## T2 — diagram enrichment (WAVE 2, tracks: distributed, ai-llm, data-engineering, apis,
## frontend, security, queues, caching, math)
Replace filler `data-lesson-visual` tables / hand-rolled SVG with typed diagram components
(FlowDiagram / SequenceDiagram / StackDiagram / StructureFigure). Use /diagram skill.
Census real-diagram coverage today: ai-llm 8/41, data-eng 8/41, distributed/apis/frontend/
security/queues/caching ~13/46, math 0 (trivial NumberLine). Target the `01-overview` of each
unit first (that's where the filler table lives). math: add balance-scale / box-substitution
figures. NOTE verified false-positive: a diagram sitting between `</Explanation>` and
`<KeyTakeaway>` is the CORRECT template layout — do NOT "fix" that.

## T3 — interactivity breadth (WAVE 2, tracks: system-design, system-design-cases, go,
## nextjs, react) — DISJOINT from T2 tracks
Add one TradeoffMatrix / FadedExample / DragOrder per lesson where a real decision exists
(shard-key choice, goroutine-dump reading, EXPLAIN-ANALYZE diagnosis, monorepo invalidation
chain, reconciliation keys). Also fix the 2 deployment `level:` mislabels here.

## T4 — RU polish (WAVE 3, after T1–T3 settle to avoid ru/ collisions)
- Translate English instructional comments inside fenced code blocks (node, nest, algorithms
  RU corpus). Keep API names / terminal output English; translate natural-language comments.
- Kill verb anglicisms: мандатит→требует, эхо-нит→воспроизводит, ретраят→повторяют,
  embed-ит→встраивает, реплейабельность→воспроизводимость (security, queues, data-engineering RU).
- Typo: performance/01-profile-first/03-measurement-loop RU "Ключая"→"Ключевая".
Scan-driven (grep English-comment patterns in ru/ fenced blocks).

## Final gate
`cd site && bun run build` (expect ~1923 lessons, lint clean) + `bun run test`.
Re-run strict-widget scan → expect 0 broken (or all tolerated now).
Commit per wave: `content(quality): <wave> ...`. Do NOT push (user pushes manually).
