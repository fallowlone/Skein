# Post-Audit High-Importance Roadmap (2026-06-19)

Derived from the 4-lens project audit (pedagogy / content / technical / UX). Sequenced by **leverage × cost × risk**, each phase self-contained (own branch → build+test gate → merge local main; no auto-push). Some phases need a brainstorming→spec gate before coding — flagged per phase.

**Headline finding:** the platform has production-grade machinery (FSRS, IRT calibration, concept graph, path engine, XP/streak/achievements) that is **disconnected at the seams**. The three broken loops — retention, daily habit, difficulty-feedback — are integration problems, not new builds. Highest leverage is wiring what exists, not adding more.

**Already resolved this session (quick fix):** SpacedRevisitBanner showed a raw mono slug → now a readable label (`f1158d37`). Audit's "no reduced-motion guard" finding was **wrong** — `global.css:62-68` already has the comprehensive universal `*` override; no action.

---

## Phase 1 — Pre-build source-level lint (velocity) · plannable now

**Why first:** the authoring feedback loop is hours, not seconds. Text-budget / i18n-parity / practice-parity / slug violations surface only after a 65-min full build (lint runs on 5777 rendered HTML files). Fixing this makes every later phase faster. Additive, low risk, no pipeline/Astro/CI surgery.

- **Scope:** new `site/scripts/lint-src.mjs` (run via `bun`) that checks the rules verifiable from MDX frontmatter+body — text budgets, EN/RU parity, practice-parity, RetrievalDrawer slug presence — before `astro build` starts. Keep the post-build HTML lint for rules that genuinely need rendered output (hydration-budget, reduced-motion).
- **Files:** `site/scripts/lint-src.mjs` (new); wire into `package.json` `prebuild`/`build` script and the CI `gates` job; reuse rule logic from `site/src/lint/rules/`.
- **Verify:** introduce a deliberate budget violation in a lesson → `lint-src` fails in <5s; remove it → passes; full build still green.
- **Risk:** rule logic drift between source-lint and HTML-lint. Mitigate: share the predicate where possible; source-lint is a fast pre-filter, HTML-lint stays authoritative.
- **Gate needed?** No brainstorming — well-specified. Straight to writing-plans.

## Phase 2 — Daily habit loop + guest→account merge (engagement) · plannable now

**Why early:** cheap, high-retention, data already exists. Two small wirings.

- **2a Streak/XP visible in the daily loop.** `streak.count`/XP are tracked but never shown; `recordActiveDay()` fires only from Pretest. Add a flame badge + count to TopNav (`client:idle`); fire a one-line completion toast on the first lesson finish per day (`Toast` already exists in `Topic.astro`). ~50 lines.
  - Files: `site/src/components/brand/` or nav, `site/src/scripts/user-state.ts` (read-only of streak), `Topic.astro` toast.
- **2b Guest→account progress merge.** `activateSyncIfSignedIn()` returns early if `!termsAccepted` → a guest who signs up loses all local progress (churn at peak intent). On first post-signup load with non-empty localStorage, prompt "save local progress to your account?" → `importUserState → pushProgress` before clearing the guest key.
  - Files: `site/src/scripts/user-state.ts`.
- **Verify:** streak badge increments across a simulated 2-day gap; toast fires once/day; signup with seeded localStorage preserves XP/history.
- **Gate needed?** Light. 2a no design needed. 2b has one UX decision (auto-merge vs prompt) — confirm inline, no full brainstorming.

## Phase 3 — Retention loop: FSRS ↔ concept graph + retrieval-rating persistence (THE structural fix) · NEEDS brainstorming→spec FIRST

**Why it's #1 in leverage but not #1 in order:** biggest impact (the system currently *enables* forgetting — mastered fullstack concepts leave the path forever; decay is display-only; `RetrievalDrawer` confidence 1–5 is discarded). But it's a real **design problem**, not transcription, and touches the core knowledge model — high blast radius. Do it with a proper gate, after the cheap wins de-risk the surrounding code.

- **Design questions to resolve in brainstorming (do NOT pre-decide):**
  1. Does FSRS **replace** the hand-coded `knowledge.ts` (`applyStudyEvidence`/`applyPracticeStruggle`) for concepts, or **layer on top** (FSRS schedules review dates; existing confidence stays the mastery signal)?
  2. How does a decayed/over-due concept **re-enter** the path plan (`planner.ts` currently drops it once `confidence ≥ threshold`)?
  3. Where does the retrieval confidence rating feed — a per-concept FSRS card grade, and via which mapping (1–5 → again/hard/good/easy)?
  4. Migration of existing `userState.history`/`retrieval` into cards without progress loss.
- **Likely surfaces:** `site/src/scripts/path/knowledge.ts`, `planner.ts`, `schedule.ts`, `site/src/scripts/user-state.ts`, `RetrievalDrawer.tsx`, `SpacedRevisitBanner.tsx` (drive from FSRS dates, not the 7-day heuristic).
- **Gate needed?** YES — `superpowers:brainstorming` → spec → writing-plans → subagent-driven. This is the one that deserves the full cycle.

## Phase 4 — Practice depth: generation-before-reveal + faded scaffold · partial design

**Why:** practice is mostly recognition (MCQ/DragOrder/select); free-recall + production retain 2–3× better. `FadedExample` exists but was unused in sampled lessons; the worked-example→faded→free-practice ladder is missing.

- **Scope:** (engine) make `RetrievalDrawer` (or a new prompt) support a generation item *before* the explanation; (content) insert `FadedExample` between worked example and free practice in algorithmic lessons. Add a `rationale` field per distractor shown only on failure (mechanistic feedback, not binary).
- **Mixed work:** small engine change + a content-authoring sweep (large). Split: engine slice first (plannable), content sweep as a separate campaign.
- **Gate needed?** Light brainstorming on the engine slice (where the generation prompt lives in the lesson flow); content sweep is mechanical once the pattern is set.

## Phase 5 — Content depth campaigns (separate kind of work) · content authoring

Heterogeneous authoring, not engineering. Sequence by career impact:
1. **Testing track** (CRITICAL gap) — new track, unit→integration→E2E→contract→mutation (Vitest/Supertest/Playwright). No compensating content exists. Biggest employability gap.
2. **Deepen security sub-tracks** from 1-overview-per-unit to 3–4 teaching lessons.
3. **AI/LLM to production-grade** — multi-agent, structured outputs, guardrails, LLM-observability, model economics.
4. **Deepen data-engineering + AWS** (one-lesson-deep today); add a **GraphQL** unit to `apis`.
5. **beginner→intermediate bridge** unit; move `logic` track to foundations ordering.

- **Approach:** the existing `/infographic`/authoring + Workflow pipeline; per-track parallel authors with build-lint gate. This is the project's well-trodden path — no new tooling.
- **Gate needed?** Per-track scoping, not full brainstorming. Largest time cost overall.

---

## Recommended order & rationale

1. **Phase 1** (velocity) — makes everything after it faster; safe, additive.
2. **Phase 2** (habit + guest-merge) — cheap, high-retention, de-risks user-state code before Phase 3 touches it.
3. **Phase 3** (FSRS retention) — highest leverage; full brainstorming→spec→plan cycle.
4. **Phase 4** (practice depth, engine slice) — then the content portion folds into Phase 5.
5. **Phase 5** (content campaigns) — largest, ongoing; testing track first.

## Constraints (all phases)

One branch per phase; `cd site && bun run build` + `bun run test` gate before merge; merge to LOCAL main only, no auto-push (user pushes manually). Full build ~65 min when shared src changes (Phase 1 directly attacks this); incremental ~2 min for lesson-body-only edits.
