# Fix: /assess evidence model — band/weight misattribution on multi-concept items

## Context

`feat/assess-engine` shipped a 13-task plan. A whole-branch review (written up in
`.superpowers/sdd/2026-07-31-assessment-engine/REPLAN-BRIEF.md`) found a design defect, not an
implementation bug: when a practice task has no explicit `concepts` list, the item builder falls
back to *every* concept the containing unit teaches (`unit.teaches`), and stamps the item with a
single `band` picked arbitrarily from `concepts[0]`. That one wrong band then leaks into the Bayes
math (likelihood curve), the evidence log, and the LLM-grading anchor for every *other* concept the
item touches — silently skewing posteriors for concepts that happen not to be first in the list.
A later round of work (commits c57b10dc4, e7ea951b9) fixed the *conceptId* plumbing (clamping
verdicts per concept instead of broadcasting concepts[0]'s verdict everywhere) but never fixed the
parallel *band* plumbing, so the same class of bug still exists at three of the four sites that
read `item.band`. `assess-apply-knowledge.ts` already has a defensive guard (rule 4,
`MIN_EVIDENCE_ITEMS`/`MIN_BAND_CONFIDENCE`) written specifically to blunt the symptom, confirming
the author was aware of the fallout but hadn't fixed the root cause.

Per-concept band data already exists and is threaded through the app as a `bandOf(conceptId)`
callback (built once in `AssessFlow.tsx`, from `concepts.json`, passed into `update.ts`,
`select.ts`, etc.) — the fix is to make every consumer use that per-concept lookup instead of the
single `item.band` field, not to invent new data.

## Root cause (one origin, four propagation sites)

`site/scripts/path/build-assess-items.mjs` (~line 77-90): when `task.concepts` is absent, it sets
`concepts = unit.teaches` (correct — item does touch all of them) but then does
`band: bandOf(concepts[0])` — an arbitrary single band for a potentially multi-band set of
concepts, and `weight: 1/concepts.length` (uniform dilution, acceptable to keep).

That `item.band` value then gets read as if it applied to *every* concept in `item.concepts` at:

1. `site/src/scripts/assess/update.ts:102` — evidence log entries stamp `band: item.band` for
   every concept instead of that concept's own band.
2. `site/src/scripts/assess/update.ts` (~line 75, inside `applyResponse`'s per-concept loop) →
   `site/src/scripts/assess/likelihood.ts:104-107` — `likelihoodVector(item, response, facet)`
   internally calls `pCorrect(level, item.band, ...)`, so the posterior *update itself* uses the
   wrong band for concepts[1..N], not just the log.
3. `site/src/components/assess/ItemView.tsx:92` — `anchorLevel(conceptId, item.facet, item.band,
   cells)` inside the per-concept LLM-grading loop; same mistake, band never became per-concept
   even though conceptId did (this is the gap left by the earlier c57b10dc4/e7ea951b9 partial fix).

`ordinal.ts`, `verdict.ts`, `select.ts`, `ungrounded-gap.ts`, `path/knowledge.ts` were all read and
confirmed clean — they consume computed posteriors/verdicts, not `item.band`, so they self-correct
once the three sites above are fixed. `verdict.ts`'s `items === 0` guard (the thing that keeps
untested concepts from being reported as gaps) is untouched by this fix and must keep working
exactly as-is.

## Approach

Stop treating band as an item-level property in the math/logging paths. Keep `item.band` on the
built item only as a display/debug convenience (documented as such), and make every math/logging
site take an explicit per-concept band argument sourced from the `bandOf(conceptId)` callback that
already flows through the app.

### 1. `site/src/scripts/assess/likelihood.ts`
Change `likelihoodVector(item, response, targetFacet)` to `likelihoodVector(item, response,
targetFacet, band)`, using the passed `band` param at the `pCorrect(...)` call instead of reading
`item.band` internally.

### 2. `site/src/scripts/assess/update.ts`
In `applyResponse`'s per-concept loop (already has `bandOf(conceptId)` in scope at line 74 for
`emptyCell`):
- Pass `bandOf(conceptId)` as the new 4th arg to `likelihoodVector(...)`.
- Change the evidence-stamping at line 102 from `band: item.band` to `band: bandOf(conceptId)`.

### 3. `site/src/components/assess/ItemView.tsx`
- Add a `bandOf: (conceptId: string) => Band` prop to `ItemViewProps`.
- Change the anchor call at line 92 from `anchorLevel(conceptId, item.facet, item.band, cells)` to
  `anchorLevel(conceptId, item.facet, bandOf(conceptId), cells)`.

### 4. `site/src/components/assess/AssessFlow.tsx`
Pass `bandOf={deps.bandOf}` into the existing `<ItemView ...>` call (~line 287) — `deps.bandOf` is
already constructed from the same `bandById` map used everywhere else, no new data needed.

### 5. `site/scripts/path/build-assess-items.mjs`
Leave `weight: 1/concepts.length` as-is (conservative dilution, not part of this defect). Keep
`band: bandOf(concepts[0])` on the built item too, but add a one-line comment marking it
display-only / not to be used for scoring math, so a future reader doesn't reintroduce the bug at
a 5th site.

### 6. `assess-apply-knowledge.ts` — no code change
Leave the rule-4 guard (`MIN_EVIDENCE_ITEMS`, `MIN_BAND_CONFIDENCE`) in place as defense-in-depth.
Flag in the verification section below that its calibration should be re-eyeballed once real
per-concept bands are flowing (evidenceCount/band.confidence distributions may shift slightly),
not necessarily changed.

## Files to touch
- `site/src/scripts/assess/likelihood.ts` — `likelihoodVector` signature + call
- `site/src/scripts/assess/update.ts` — `applyResponse` (pass band, fix evidence stamp)
- `site/src/components/assess/ItemView.tsx` — new prop, fix `anchorLevel` call
- `site/src/components/assess/AssessFlow.tsx` — thread `bandOf` into `<ItemView>`
- `site/scripts/path/build-assess-items.mjs` — comment only (no logic change)
- Existing tests likely need updates: `site/src/scripts/assess/likelihood.test.ts` (new
  `likelihoodVector` arg), `site/src/scripts/assess/update.test.ts` (evidence.band assertions),
  and `ItemView`/`AssessFlow` tests if any assert on `anchorLevel` calls — will check signatures
  fail loudly (TS compile error on missing arg) and fix as encountered rather than pre-guessing
  every fixture.

## Verification
- `npm run typecheck` (or equivalent) — the `likelihoodVector`/`anchorLevel` signature changes are
  additive-required-param, so any call site still passing the old arity will fail to compile,
  which is the primary safety net here.
- `npm test -- assess` (vitest) — run the assess module's test suite; fix any fixtures that
  constructed multi-concept items with mixed bands and asserted on the old (wrong) behavior.
- Manually construct or find one real fallback item (task with no explicit `.concepts`, unit
  teaches ≥2 concepts of different bands) and step through `/assess` in the browser: answer it,
  confirm each concept's evidence log entry (`band` field) and posterior shift matches that
  concept's own band, not concepts[0]'s.
- Re-run the whole-branch scenario that originally surfaced this in the review (if reproducible
  from the brief) to confirm the skew is gone.

## Also requested: recent work / site-improvement summary
Will produce after this fix is approved and applied — separate from the code change itself,
pulling from `git log` on this branch to summarize what shipped and its impact.
