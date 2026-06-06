# Path Engine P3 — Cold-Start Calibration (Design Spec)

**Date:** 2026-06-06
**Status:** Approved design, pre-plan
**Parent spec:** `docs/superpowers/specs/2026-06-05-personalized-path-engine-design.md` (§5.3 seed, §9 CalibrationFlow + pre-unit check, §10 pretest rewire)
**Predecessors:** P0 core + P1 content + P2 PathView — all in `main` (`66297541`).

## 1. Purpose

Make the engine personalize for a *new* learner. Today cold-start always begins at the foundations
frontier regardless of what the learner knows. This sub-project (the first slice of P3) closes that
gap with three connected pieces:

1. **Pretest → concept seed** — fold the existing placement pretest into `KnowledgeState`.
2. **CalibrationFlow** — an adaptive diagnostic onboarding at `/calibrate` driven by `nextProbe` over
   the 35 committed diagnostic banks.
3. **Pre-unit quick-check** — "you may already know this" → mini-diagnostic → skip the unit on pass.

## 2. Scope (locked)

**In:** `pretest-seed.ts` (map + seed, pure); a shared `DiagnosticRunner` island that grades the
committed objective banks; `CalibrationFlow.tsx` + `/[lang]/calibrate` route; a `diagnostics-bundle.json`
build emit; the pre-unit quick-check as (a) an interactive card action on `/roadmap` and (b) a
zero-island server-rendered link on the unit's first lesson; `path-io.ts` wiring (seed-on-load, bundle
exposure, `pickProbe`, `applyDiagnosticResult`); unit tests for the pure helpers; build lint-clean;
EN+RU visual check.

**Out (own later P3 slices):** StateIO export/import; feedback→override loop; XP-on-step; custom-target
picker UI; drag-reorder; LLM "explain my path"/NL-goal (BYOK); long-tail ru-label content pass.

**No P0 core edits.** The pretest seed reuses the existing `applyDiagnostic` (a pretest answer is a
confidence signal); `pickProbe` wraps the existing `nextProbe`/info-gain. Nothing under
`src/scripts/path/{graph,knowledge,planner,schedule,config,diagnostic-select,types}.ts` changes.

## 3. Architecture

```
 pretest (userState.pretest)                committed banks
        │                                   diagnostics/*.json ──build──► diagnostics-bundle.json
        ▼                                                                        │ import
 pretest-seed.ts (pure)                                                          ▼
   seedFromPretest(state, graph, pretest) ─────────────►  path-io.ts  ◄──── DiagnosticRunner.tsx
                                            seed-on-load,   (adapter)          (grades mcq/blanks,
                                            pickProbe,                          reports correctFrac)
                                            applyDiagnosticResult                      ▲
                                                  │                                    │ reused by
                                                  ▼                                    │
                              /calibrate ──► CalibrationFlow.tsx        /roadmap PathCard quick-check
                              (route)        (nextProbe loop)           (modal)
```

All grading is client-side and objective — no runtime LLM, fully offline.

## 4. Pretest → concept seed (`src/scripts/path/pretest-seed.ts`, pure)

The pretest (`src/scripts/pretest-questions.ts`) is 4 stage-1 + 6 stage-2 questions; each stored answer
is the chosen choice index, and each choice carries a `weight: 0|1|2|3` (depth of the answer).

```ts
export const PRETEST_CONCEPT_MAP: Record<string, string[]> = {
  tcp:             ["tcp-handshake"],
  "db-index":      ["b-tree-index"],
  react:           ["reconciliation"],
  http:            ["http"],
  "adv-mvcc":      ["mvcc"],
  "adv-consensus": ["consensus"],
  "adv-http-cache":["cache-aside", "stale-while-revalidate"],
  "adv-event-loop":["event-loop"],
  "adv-tls-0rtt":  ["0-rtt", "tls"],
  "adv-cap":       ["eventual-consistency"],
};
// every target id verified to exist in concepts.json (a unit test asserts this).

const WEIGHT_FRAC = [0, 0.3, 0.6, 0.85]; // index = chosen choice weight; 0 ⇒ skip (no signal)
```

`seedFromPretest(state, graph, pretest, questions, advancedQuestions, now)`:
- For each answered question (stage1 then stage2), look up the chosen choice's `weight`; if `weight === 0`
  skip; else `frac = WEIGHT_FRAC[weight]` and for each concept in `PRETEST_CONCEPT_MAP[id]` apply
  `applyDiagnostic(state, graph, concept, frac, now)` (down-closure prereq lift comes free).
- Returns the new `KnowledgeState`. Pure; deterministic; idempotent for the same inputs.

`path-io.ts` calls it once on module load **only when `knowledge` is empty and a pretest exists**, so an
already-calibrated learner is never overwritten. (`userState.pretest` is read via the existing
`user-state.ts`; this read is the adapter's job, keeping the seed fn pure.)

## 5. DiagnosticRunner (`src/components/path/DiagnosticRunner.tsx`)

Shared, presentational-with-callbacks. Props: `{ lang; conceptIds: string[]; onConcept(concept, correctFrac): void; onDone(): void }`.

- Pulls each concept's bank from `content.diagnostics` (the bundle, §6). Renders items in order:
  - `mcq` — radio choices (`choices[i][lang]`); correct iff selected index === `answer`.
  - `blanks` — one text input per blank prompt; correct iff the trimmed lowercased value is in `answer[]`.
  - Each item offers **"skip / not sure"** (counts as incorrect, no penalty beyond not-known).
- After all items for a concept: `correctFrac = correctItems / totalItems`; calls `onConcept(concept, frac)`.
  After the last concept: `onDone()`. Grading helpers (`gradeMcq`, `gradeBlanks`, `fracOf`) are pure and
  exported for unit tests.

## 6. Diagnostics bundle (`build-path-data.mjs` emit)

The island cannot `readdir` the 35 files. Extend the assembler to also emit
`src/content/path/diagnostics-bundle.json` = `{ "<concept>": { items: [...] }, … }` (the full banks,
keyed by concept). `path-io.ts` imports it and exposes it as `content.diagnostics`. (`diagnostics-index.json`
from P2 stays — it is the lightweight id list; the bundle is the full content.)

## 7. CalibrationFlow (`/[lang]/calibrate` + `CalibrationFlow.tsx`)

Route `src/pages/[lang]/calibrate.astro` mounts `<CalibrationFlow client:only="preact" lang={lang} />`
inside `Topic`, reading an optional `?unit=<id>` query param (pre-unit entry).

Island logic:
- On mount, `path-io` has already seeded from the pretest (load-time). If a `?unit` param is present,
  the flow targets that unit's diagnosed concepts only; otherwise it calibrates toward the active goal.
- `frontier = targetFrontier(activeGoals, config, concepts)`. Loop, up to **8 probes**:
  `concept = pickProbe(knowledge, graph, frontier, diagnosedSet, threshold)`; if `null`, stop.
  Run that one concept through `DiagnosticRunner` → `applyDiagnosticResult(concept, frac)` → next probe.
- **Skippable** (a "Skip calibration" button → `/roadmap`) and **resumable** (progress lives in the
  persisted `KnowledgeState`; re-entering continues from the next unknown probe). On completion:
  a summary (concepts confirmed/known) + a link to `/roadmap`.

`pickProbe(state, graph, frontier, diagnosed, threshold)` (pure, in `src/scripts/path/calibration.ts`):
restrict candidates to `diagnosed` (only what we can objectively test), then pick the
max-graph-pruning unknown one — same information-gain metric as `nextProbe`, but filtered. Returns
`null` when no diagnosable unknown remains. Reuses `ancestors`/`descendants` from `graph.ts`.

## 8. Pre-unit quick-check

- **Roadmap card** (primary, interactive): the PathCard "quick check" badge (already shown when a unit
  teaches a diagnosed concept) becomes a button. Click → `DiagnosticRunner` modal for that unit's
  diagnosed concepts → on each `onConcept`, `applyDiagnosticResult`; if the unit's concepts end up known,
  the unit drops from the path (existing planner behavior). Lives inside the existing PathView island —
  **no new island**.
- **Lesson page** (secondary, zero-cost): in `Lesson.astro`, when `order === 1` and the unit teaches a
  diagnosed concept, render a **server-side `<a>`** — "Already know this? Quick check →" linking to
  `/calibrate?unit=<track>/<unit>`. Plain anchor, **0 hydration islands**, so the lesson page's 5-island
  budget is untouched.

## 9. path-io wiring (additive)

- Seed-on-load (§4).
- `content.diagnostics` = the bundle (§6).
- `pickProbe(...)` re-export (thin) and `diagnosedSet` on `content`.
- `applyDiagnosticResult(concept, frac)` mutation: `knowledge.value = applyDiagnostic(knowledge.value, graph, concept, frac, Date.now())`. (`graph` built once at module load via `buildConceptGraph(concepts)`.)
- PathView cold-start banner gains a primary CTA → `/<lang>/calibrate`.

## 10. Testing

- **Pure (Vitest):** `seedFromPretest` (weight→frac mapping, weight-0 skipped, prereq lift via
  `applyDiagnostic`, idempotent); `PRETEST_CONCEPT_MAP` targets all exist in `concepts.json`;
  `pickProbe` (filters to diagnosed, picks max info-gain, returns null when calibrated, deterministic
  tie-break); grading helpers `gradeMcq`/`gradeBlanks`/`fracOf`.
- **Build:** `bun run build` lint-clean; `/calibrate` EN+RU emitted; islands hydrate; no console errors.
- **Visual:** fresh localStorage → `/roadmap` cold-start banner → "Calibrate" → answer a few probes →
  path shortens; pretest taken first → path already reflects it; card quick-check skips a unit on pass.
- **Typecheck:** `bun run check` adds no new errors in path/components/pages.

## 11. Risks / decisions
- **Probe coverage** — only the 35 diagnosed concepts are probable; `pickProbe` filters to them, so
  calibration calibrates the *diagnosable* frontier, not every concept. Acceptable (broadening
  diagnostics is a separate content slice). Documented in the completion summary.
- **Seed source label** — pretest seed is recorded as `source:"diagnostic"` (reusing `applyDiagnostic`)
  rather than a distinct `"pretest"` source; the distinction is cosmetic and avoids a P0 edit.
- **Pre-unit on lesson pages** — implemented as a server-rendered link (0 islands), not a hydrating
  widget, to protect the 5-island lesson budget; the interactive check lives on `/roadmap` and `/calibrate`.
- **8-probe cap** — bounds onboarding to ~5 minutes; the learner can re-enter `/calibrate` to go deeper.

## 12. Build sequence (for the plan)
1. `pretest-seed.ts` (map + `seedFromPretest`) + tests.
2. `calibration.ts` (`pickProbe`) + tests.
3. `diagnostics-bundle.json` emit in `build-path-data.mjs`.
4. `path-io.ts` wiring (seed-on-load, bundle, `pickProbe`, `applyDiagnosticResult`, graph).
5. `DiagnosticRunner.tsx` (+ pure grading helpers tested).
6. `CalibrationFlow.tsx` + `/[lang]/calibrate.astro`; PathView cold-start CTA.
7. Pre-unit quick-check: PathCard badge→button + DiagnosticRunner modal in PathView; `Lesson.astro` link.
8. Full build lint-clean + EN+RU visual verification.
