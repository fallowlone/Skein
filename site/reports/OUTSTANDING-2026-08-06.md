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
  space (weight=1, band='surface', self-generating responses); those parameters
  occur in 23 of 6520 real items. `DISCRIMINATION = 3.85` was tuned against a
  gate that could not fail.
- **C3** — `"assess"` in `STUDY_PROTECTED` makes false gaps permanent.
- **C4** — the `mayOverwrite` confidence bar is cleared at the prior, before any
  evidence is seen.

## Decisions already made (D1–D4), not yet implemented

- **D1** — require an explicit `concepts` field per task; `build-assess-items.mjs`
  skips items without one.
- **D2** — rebuild the gate on the real pool with an independent response model
  and re-derive `DISCRIMINATION`.
- **D3/D4** — remove `assess` from `STUDY_PROTECTED`; change the overwrite bar to
  `|Δ expectedLevel| >= τ`.

## Gating dependency (the big one)

D1 needs an **annotation project**: **0 of 8096 tasks currently carry explicit
`concepts`**. Until that lands, the feature cannot measure anything. This is the
critical path for the whole re-plan.

## Merge gating — IMPLEMENTED, uncommitted

Decided 2026-08-05, implemented 2026-08-06. Code lands, surface does not.
Verified present in the working tree (`git diff --stat`, 6 files):

1. `components/atlas/TopNav.astro` — /assess rail link commented out.
2. `pages/[lang]/assess.astro` — `getStaticPaths()` returns `[]`.
3. `components/assess/AssessReport.tsx` — Save action disabled (nothing reaches
   `applyKnowledgeWrites` / `toRetestCards`).
4. `scripts/assess/update.ts` + `assess.astro` — signposted.
5. `e2e/assess.spec.ts` — `test.describe.skip` with a pointer to the brief.

Also touched: `scripts/path/knowledge.ts` (1 line — the C3 `STUDY_PROTECTED` fix).

Nothing is deleted. Constants stay frozen; `verdict.ts`, `likelihood.ts`,
`ordinal.ts`, `simulate.ts` are zero-diff by design.

## Unverified and blocking merge

`pages/practice/[track]/[unit]/[lesson].json.ts` adds **~1540 prerendered routes**
to a build with a documented Cloudflare timeout at ~5k pages. It is
`selectOther`-gated so incremental builds are unaffected, but the next **full**
build is not.

**Action: run a full CI build before merging.** `bun run build` OOMs locally and
must not be attempted — gate on `bun run test` + `lint:src` + dev-render instead,
and let CI do the full render.

## Other known open items (from memory index, lower priority)

- SEO 67/100 + Firefox scroll-jank (performance pass 2026-06-16).
- `client:load` → `client:visible` for RetrievalDrawer / FadedExample.
- Metrics `/admin` needs operator setup (D1 + ADMIN_TOKEN).
- GitHub auth needs operator setup (GITHUB_CLIENT_ID / SECRET).
- PlacementMeter reads base `content.graph`, not `effectiveContent` (LOW debt).
