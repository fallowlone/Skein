# Path Engine P1 — Overnight Report

**Date:** 2026-06-06 (autonomous overnight run)
**Branch:** `feat/path-engine-p1` (off `main`; not pushed, not merged — per instructions)
**Scope:** P1 content bootstrap — generate the data artifacts the P0 pure core consumes.

---

## TL;DR

P1 is **functionally complete for all 274 units**. The spec §4 artifacts exist, validate,
and drive the P0 engine end-to-end. All generation ran through **session-auth subagents only**
(no external API / no key). A deterministic assembler is the robustness floor; LLM enrichment
(ru labels + diagnostics) is layered on top and is fully additive.

> **⚠️ Needs a morning semantic review of the dirty auto-accept data** — see "Review backlog".
> Structure is build-enforced and green; *semantics* (concept granularity, prereq-edge
> pedagogy, long-tail ru labels, diagnostic answer-keys) were auto-accepted and are not guaranteed.

---

## What was done

1. **Deterministic assembler** — `site/scripts/path/build-path-data.mjs` (pure, no network/LLM/clock).
   Harvests every EN lesson's frontmatter (`concepts`, `level`, `prereqs`) + `units.json` +
   practice `estMin` + `track-band`, and emits the committed artifacts. Stable/sorted output so
   reruns diff cleanly. Reads `.path-cache/labels.json` (ru) when present. Re-runnable; a partial
   run still yields a complete, valid graph (deterministic fallbacks for any gap).

2. **Artifacts** under `site/src/content/path/` (spec §4):
   - `concepts.json` — **4798 concepts**, `{id,label{en,ru},track,band,requires[]}`. Acyclic DAG.
   - `unit-concepts.json` — **274 units**, `{teaches,requires,estMin}`. `estMin` = reading
     (wordcount/200 × depth factor) + Σ practice `estMin`.
   - `goals.json` — 4 goals (senior-fullstack `band>=middle`, backend-job, interview-prep,
     ai-engineer) with `trackWeights`; explicit targets selected from real concept ids so every
     goal resolves.
   - `concept-overrides.json` — empty `{addEdges,removeEdges,retag}` skeleton (the cheap fix path).
   - `diagnostics/*.json` — **35 objective bilingual banks** (mcq/blanks, 2–3 items) for the
     goal-target concepts.

3. **Validator** — `site/src/lint/rules/path.ts` joins the build linter (`src/lint/index.ts`),
   plus `path.test.ts` (9 cases). Enforces spec §8: DAG-acyclic-after-overrides, requires/teaches
   referential integrity, every concept taught by ≥1 unit, goals resolve, i18n label parity,
   override id validity, diagnostic shape (type/prompt-parity/answer/choices). A failure fails the build.

4. **LLM enrichment** (session-auth subagents, no key): 174 ru concept labels + 35 diagnostics.

---

## Coverage

| Artifact            | Count  | Notes |
|---------------------|--------|-------|
| Units               | 274 / 274 | 100% (1 empty unit `typescript/02-everyday-types` got a synthetic concept) |
| Concepts            | 4798   | harvested from 992 lessons' frontmatter `concepts` |
| Concept edges       | 4516   | per-track spine (acyclic; 0 dropped by cycle-break) |
| ru labels (real)    | 174    | goal-target + concepts reused in ≥3 units |
| ru labels (fallback)| ~4624  | humanized-en placeholder — **review backlog** |
| Diagnostics         | 35     | the goal-target concepts |
| Goals               | 4      | all resolve to ≥1 real concept |

---

## Build / test status

- **Unit tests:** 60 passing (P0 core 51 unchanged + path-rule 9). `bunx vitest run src/scripts/path/ src/lint/rules/path.test.ts` green.
- **Validator on real artifacts:** `checkPath('./src')` → **0 errors**.
- **Engine smoke (real data):** `buildPath(senior-fullstack, cold-start)` → dependency-ordered path
  (networking foundations → databases), `estMin` populated, prereqs respected.
- **Typecheck (`bun run check`):** 19 pre-existing repo errors (content.config.ts `z` namespace,
  PracticeSection, etc.) — **none in path files**. My files are type-clean.
- **Full build (`bun run build`, astro + lint-dist):** ✅ **clean** — 4847 pages built in 591s,
  `lint: clean — 0 errors, 0 warnings`. The path validator ran in the real build pass and passed.

---

## Subagent budget

- **19 subagent runs total** (Agent tool, session auth): 5 label-translation (haiku) + 7 initial
  diagnostics (sonnet) + 7 diagnostics-writers (sonnet). 0 Workflow runs. Well under the ~500 cap.
- Why Agent-tool over Workflow: the deterministic harvest already produced the concept inventory
  for free (frontmatter), so the LLM only needed bounded enrichment (labels + diagnostics), which
  parallel Agent calls handle with direct, capturable output. Mass per-unit Workflow extraction
  was unnecessary.

---

## Review backlog (morning — dirty auto-accept data)

**A semantic review is required before this data is user-facing.** Structure passes; meaning is best-effort:

1. **Long-tail ru labels (~4624)** fall back to humanized-en (English text in the ru field). Real ru
   exists only for the 174 high-value concepts. Fix path: extend `.path-cache/labels.json` (batch more
   concepts through the same translation subagents) and re-run the assembler — additive, no code change.
2. **Concept granularity is fine-grained** (median ~18 concepts/unit from frontmatter tags). Good for
   "skip what you know" precision, but some tags are talking-points not skills. A coarsening pass (or
   `retag` overrides) may improve path readability.
3. **Prereq edges are a per-track spine** (unit-order anchors), not semantic cross-track edges
   (e.g. `replication`→`tcp-handshake` is NOT encoded). Cross-track prerequisites should be added via
   `concept-overrides.json addEdges` or a future LLM edge pass. Edges were auto-accepted, not verified.
4. **Diagnostic answer-keys are unverified.** 35 banks were authored by subagents; questions look
   senior-grade and answers in-range, but correctness was not independently checked. Spot-check before
   exposing in calibration.
5. **A few rough ru translations** in the 174 (e.g. literal idioms). Quick human pass.

---

## Gaps / TODO (out of P1 scope or deferred)

- Diagnostics cover only the 35 goal-target concepts. Broaden to more frontier concepts as needed
  (same subagent recipe; bounded by budget).
- No `pretest→concept` seed map yet (spec §10; that's P2 wiring).
- The bootstrap is split as designed: subagents = LLM touchpoint (write `.path-cache` / diagnostics);
  `build-path-data.mjs` = deterministic assembler. There is no `bootstrap-*.mjs` that itself calls an
  LLM (forbidden here) — the subagent step replaces it.

---

## How to continue

1. **Broaden ru labels:** add concept ids to a batch, run the label subagents, append to
   `.path-cache/labels.json`, `bun scripts/path/build-path-data.mjs`, rebuild.
2. **Add diagnostics:** same recipe, write to `src/content/path/diagnostics/<id>.json`.
3. **Fix bad edges/tags:** edit `concept-overrides.json` (validated + honored by the planner).
4. **Re-derive everything:** `bun scripts/path/build-path-data.mjs` is idempotent; `--tracks a,b`
   scopes to a subset.
5. **Then P2 (UI):** CalibrationFlow / PathView / GoalPicker per spec §9 consume these artifacts.

## Why it stopped

Reached a clean, committed, validated end state for the full 274-unit corpus within budget. No
STOP-condition tripped (no orchestration failures, budget not exhausted, validators pass). Two
commits on `feat/path-engine-p1`: slice (670a1937) + scale-up (788bff11). Final build result above.
