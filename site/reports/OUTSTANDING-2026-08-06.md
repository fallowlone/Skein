# Outstanding work — research notes 2026-08-06

Scratch findings from a read-only research pass on branch `feat/assess-engine`.
Sources: `.superpowers/sdd/2026-07-31-assessment-engine/REPLAN-BRIEF.md`,
memory `assess-engine-replan-2026-08-05.md`, working-tree diff.

## Context

Previous sessions built `/assess` — a deep skill-audit engine that probes the
learner with items, then writes calibrated knowledge estimates back into the
path engine. 13 tasks shipped; the engine is complete and well-tested.

A whole-branch review then ran the engine against the **real shipped index**
(not fixtures) and found the evidence model does not work on that corpus. This
is a spec-level design defect, not an implementation defect. Modules stay.

## The four defects (C1–C4)

- **C1** — `weight = 1 / concepts.length` used as a likelihood exponent. On the
  real corpus 6520 items have median weight 0.04 and 74% sit below 0.05, so the
  posterior never moves. The update is effectively null.
- **C2** — the accuracy gate was built on an unreachable corner of the parameter
  space (weight=1, band='surface', self-generating); those parameters occur in
  23 of 6520 real items. `DISCRIMINATION = 3.85` was tuned against a gate that
  could not fail.
- **C3** — `"assess"` in `STUDY_PROTECTED` makes false gaps permanent.
- **C4** — the `mayOverwrite` confidence bar is cleared at the prior, before any
  evidence is seen.

## Decisions already made (D1–D4), status

- **D1** — require an explicit `concepts` field per task. **IMPLEMENTED** —
  schema extended, builder skips unannotated tasks, pilot unit
  (networking/05-tls-handshake, 25 tasks) annotated. 0/8096 tasks still
  annotated; annotation project is the gating dependency for shipping.
- **D2** — rebuild the gate on the real pool with an independent response model
  and re-derive `DISCRIMINATION`. **NOT STARTED**.
- **D3** — remove `"assess"` from `STUDY_PROTECTED`. **IMPLEMENTED** (knowledge.ts).
- **D4** — change the overwrite bar to `|Δ expectedLevel| >= 0.5` per weakest
  facet. **IMPLEMENTED** (verdict.ts `posteriorMovement()`, assess-apply-knowledge.ts).

## Implemented this session

- `src/content.config.ts`: `TaskBase.concepts: z.array(z.string()).min(1).max(4).optional()`
- `scripts/path/build-assess-items.mjs`: skip tasks without explicit `concepts`;
  weight set to `1` (no dilution)
- `scripts/verify-task-concepts.mjs` (new): validates every declared concept id
  against concepts.json and unit scope (teaches ∪ prereqs), reports per-track
  coverage
- `package.json`: `"verify:task-concepts"` script
- `src/scripts/path/knowledge.ts`: `"assess"` removed from `STUDY_PROTECTED`
- `src/scripts/assess/verdict.ts`: new `posteriorMovement(cells, conceptId, bandOf)`
- `src/scripts/assess-apply-knowledge.ts`: `mayOverwrite` now uses
  `MIN_POSTERIOR_SHIFT = 0.5` instead of `MIN_BAND_CONFIDENCE = 0.4`
- `scripts/path/build-assess-items.test.mjs`: updated for D1 semantics
- `src/content/practice/networking/05-tls-handshake/01-*.json` (5 files):
  pilot annotation, 25 tasks, 31 concepts

## Tests

- `bun test src/scripts/assess/` (vitest, 11 files): **133 pass / 1 fail**
  — the 1 fail is `simulate.test.ts` `honestMinusGuesser` gate timing out at
  5 s after ~40 s of CPU. Confirmed pre-existing at HEAD (commit 8004f6aeb).
  All other assess tests pass with and without my changes.
- `bun test scripts/path/build-assess-items.test.mjs`: **12 pass**
- `bun scripts/verify-task-concepts.mjs --self-test`: **OK**
- Full `bun test`: 1544 pass / 455 fail — same pre-existing failures
  (localStorage polyfill missing for some tests, Playwright-test-injected
  globals in a unit-test run)

## Merge gating — IMPLEMENTED, uncommitted until D2 ships

Decided 2026-08-05, implemented 2026-08-06. Code lands, surface does not.

1. `components/atlas/TopNav.astro` — /assess rail link commented out ✓
2. `pages/[lang]/assess.astro` — `getStaticPaths()` returns `[]` ✓
3. `components/assess/AssessReport.tsx` — Save action disabled ✓
4. `scripts/assess/update.ts` + `assess.astro` — signposted ✓
5. `e2e/assess.spec.ts` — `test.describe.skip` with a pointer to the brief ✓

Not merged yet: `pages/practice/[track]/[unit]/[lesson].json.ts` adds ~1540
prerendered routes and needs a full CI build to clear.

## NOT YET SHIPPED (re-plan remaining)

- **D2**: rebuild the accuracy gate on the real pool with independent response
  model + re-derive DISCRIMINATION. This is the core of the re-plan.
- **H2**: item band comes from `concepts[0]` but is applied to all concepts
  (62640/158902 concept-slots mis-attributed). D1 mostly dissolves this (only
  explicit-concept tasks are assess-eligible), but the comment still says
  `bandOf(concepts[0])` and the per-concept banding plumbing in
  `likelihood.ts` / `update.ts` / `ItemView.tsx` has not been closed yet.
- **Merge gating removal**: after D2 ships, un-comment TopNav, restore
  `getStaticPaths()`, re-enable Save in AssessReport, re-enable e2e.

## Lower-priority items from the memory index

- SEO 67/100 + Firefox scroll-jank (performance pass 2026-06-16)
- `client:load` → `client:visible` for RetrievalDrawer / FadedExample
- Metrics `/admin` needs operator setup (D1 + ADMIN_TOKEN)
- GitHub auth needs operator setup (GITHUB_CLIENT_ID / SECRET)
- PlacementMeter reads base `content.graph`, not `effectiveContent` (LOW debt)
