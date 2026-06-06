# Path Engine P3-B — StateIO + Feedback→Override (Design Spec)

**Date:** 2026-06-06
**Status:** Approved design, pre-plan
**Parent spec:** `docs/superpowers/specs/2026-06-05-personalized-path-engine-design.md` (§4.5 overrides, §9 StateIO, §10 feedback→override)
**Predecessors:** P0 core + P1 content + P2 PathView + P3-A calibration — all in `main` (`019185c5`).

## 1. Purpose

The second P3 slice. Two connected pieces of state portability + correction:

1. **Feedback → override** — let a learner say "this prerequisite is wrong", fixing their path
   immediately (a local override layer applied at runtime) and producing an exportable correction.
   This also closes a real gap: the committed `concept-overrides.json` is currently **never applied
   at runtime** (`buildPath` builds its graph without overrides) — it is only lint-validated.
2. **StateIO** — export/import the learner's full local progress as a versioned JSON, for backup and
   device-to-device transfer.

## 2. Scope (locked)

**In:** runtime override wiring (`overrides.ts` pure helpers + `path-io` local-override signal + cycle
guard); a per-card "loosen prerequisites" action; a manual override editor (add/remove
concept→requires edges by id); StateIO export/import of **full progress** (path knowledge + config +
local overrides + `userState`); a `StateIOPanel` + `OverridesEditor` in the Tune drawer; unit tests
for the pure helpers; build lint-clean; EN+RU visual.

**Out (other slices / later):** XP-on-step, custom-target picker, drag-reorder (slice C); content
ru-label/diagnostic-key pass (slice D); `retag` overrides (this slice handles **edges only** —
`addEdges`/`removeEdges`); server-side feedback collection (the export IS the maintainer channel).

**No P0 core edits** to `src/scripts/path/{graph,knowledge,planner,schedule,config,diagnostic-select,types}.ts`.
One additive helper (`importUserState`) is added to `src/scripts/user-state.ts` (app state, not the path core).

## 3. Architecture

```
 concept-overrides.json (committed)  ┐
                                     ├─ mergeOverrides ─► applyOverridesToConcepts(concepts, ov)
 awesome.path-overrides.v1 (local) ──┘     (cycle-guard)        │ adjusted Concept[].requires
   ▲ feedback writes here                                        ▼
   │                                            path-io.computePath → buildPath(effectiveConcepts)
 PathCard "loosen"  +  OverridesEditor                                   │ reactive to overrides signal
                                                                          ▼  ordered path

 StateIO:  signals (knowledge, config, overrides, userState) ──serialize──► JSON download
                                                              ◄──parse/validate── file upload
```

Pre-applying overrides to the concepts array means `buildPath` (which builds its own graph internally)
sees the corrected `requires` without any P0 change. Everything is client-side + offline.

## 4. Override runtime wiring (`src/scripts/path/overrides.ts`, pure)

Reuses the existing `Overrides` type from `graph.ts` (`{ addEdges?, removeEdges?, retag? }`).

- `mergeOverrides(committed, local): Overrides` — concatenate `addEdges`/`removeEdges` (dedupe by
  `concept|requires`); `retag` ignored in this slice.
- `applyOverridesToConcepts(concepts, ov): Concept[]` — return a new array where each concept's
  `requires` has the override `addEdges` added and `removeEdges` removed (ids that don't exist are
  skipped, not thrown — unlike `buildConceptGraph`'s strict addEdges).
- `safeApply(concepts, committed, local): { concepts: Concept[]; droppedLocal: boolean }` — apply
  `merge(committed, local)`; if the result is cyclic (via `buildConceptGraph` + `validateAcyclic`),
  retry with committed-only and set `droppedLocal: true`. User-entered local edges must never crash
  the path or introduce a cycle.
- `loosenUnitEdges(unit, units, concepts): { concept: string; requires: string }[]` — for the unit's
  taught concepts, the `removeEdges` set that drops each taught concept's prereqs (so the unit floats
  earlier). Returns the entries to merge into the local overrides.

## 5. Local override store (`path-io.ts`, additive)

- New signal `overrides` persisted at `awesome.path-overrides.v1` (an `Overrides`; load merges onto
  `{ addEdges: [], removeEdges: [] }`, SSR-guarded like the other signals).
- The committed overrides are imported (`import committedOverrides from "~/content/path/concept-overrides.json"`).
- `computePath` builds `const { concepts: eff, droppedLocal } = safeApply(rawConcepts, committedOverrides, overrides.value)`
  and passes `eff` as `content.concepts` into `buildPath`. Exposes `droppedLocal` so PathView can warn.
- Mutations: `loosenUnit(unitId)` (merge `loosenUnitEdges` into the overrides signal),
  `addOverrideEdge(concept, requires, kind: "add"|"remove")`, `removeOverrideEntry(kind, concept, requires)`,
  `clearOverrides()`.
- The module-level `graph` used by calibration/seed stays the **base** graph (overrides affect path
  ordering, the visible effect; calibration's info-gain is unaffected by a single user edge). Documented.

## 6. Feedback UX

- **PathCard** gains a small "Loosen" button → `loosenUnit(s.unit)`. The unit's taught concepts lose
  their prereqs in the local layer → it can appear earlier on the next (immediate) recompute. Reversible
  via the editor / "Reset overrides".
- **OverridesEditor** (`src/components/path/OverridesEditor.tsx`, a section in `PathConfigDrawer`'s
  advanced area): two concept fields (each an `<input list=…>` backed by a `<datalist>` of concept
  ids+labels) + "Add prereq" / "Remove prereq" buttons → `addOverrideEdge`. Below: the current local
  overrides as a list, each with a ✕ (`removeOverrideEntry`), plus "Reset overrides" (`clearOverrides`).
  If `droppedLocal`, a red note: "Some local overrides created a cycle and were ignored."

## 7. StateIO (`src/scripts/path/state-io.ts` + `StateIOPanel.tsx`)

**Pure (tested):**
- `serializeStateBundle({ knowledge, config, overrides, userState }, now): StateBundle` →
  `{ version: 1, exportedAt: now, pathKnowledge: [[id, mastery]], pathConfig, pathOverrides, userState }`.
- `parseStateBundle(text): { ok: true; bundle } | { ok: false; error }` — JSON-parse; reject when
  `version !== 1`, when present sections fail a shape check (pathKnowledge is `[[string, {confidence,…}]]`,
  pathConfig has `goals`/`weights`, etc.). Partial bundles are tolerated (missing section → skipped on
  import), but a present-but-malformed section is an error (never half-write).

**Impure (`state-io.ts` + the panel):**
- `exportState()` — read the live signal values, `serializeStateBundle`, trigger a `Blob` download
  (`awesome-path-state-<exportedAt>.json`). `exportedAt` is passed in by the caller (`Date.now()` in
  the click handler, not the pure fn).
- `importState(text)` — `parseStateBundle`; on `ok`, for each present section set the corresponding
  signal + persist: `knowledge.value = deserialize(pathKnowledge)`, `config.value = mergeConfig(pathConfig)+view`,
  `overrides.value = pathOverrides`, and `importUserState(userState)`. On error, return the message
  for the panel to show; do not mutate anything.
- `importUserState(partial)` — a NEW additive export in `src/scripts/user-state.ts`: merges `partial`
  onto the module `defaults`, sets `userState.value`, and saves (mirrors `load()`'s merge so old/partial
  payloads stay valid). Keeps `defaults` private; account-sync is untouched.

**`StateIOPanel.tsx`** (section in `PathConfigDrawer`): an "Export progress" button (download) and an
"Import progress" file input; on import, show success ("Imported — your path is restored") or the parse
error. A confirm step before import (it replaces local progress).

## 8. UI placement
Both `OverridesEditor` and `StateIOPanel` are **sections inside the existing `PathConfigDrawer`**
(the "Tune" drawer) under the advanced disclosure — no new island, no new route. The PathCard "Loosen"
button is inside the existing PathView island.

## 9. Testing
- **Pure (Vitest):** `applyOverridesToConcepts` (add edge, remove edge, unknown id skipped);
  `safeApply` (cycle from local → committed-only + `droppedLocal`); `loosenUnitEdges` (correct removeEdges
  set); `mergeOverrides` (dedupe); `serializeStateBundle`/`parseStateBundle` (round-trip; reject bad
  version; reject malformed section; tolerate missing section).
- **Build:** `bun run build` lint-clean (the path lint rule still validates `concept-overrides.json`).
- **Visual (EN+RU):** Tune → Overrides editor adds/removes an edge → path recomputes; card "Loosen"
  floats a unit earlier; Export downloads JSON; Import the same JSON into a fresh profile restores the path.
- **Typecheck:** `bun run check` adds no new errors in path/components/user-state.

## 10. Risks / decisions
- **Cycle from user edits** → `safeApply` falls back to committed-only + a visible `droppedLocal` note;
  the path never crashes.
- **Override scope** → affects path computation only; calibration/seed use the base graph (documented).
  `retag` deferred (edges only).
- **StateIO couples two persistence layers** (path + userState) by request (full backup). Import is a
  local restore — it does not push to the server; a signed-in user's next account-sync proceeds normally.
- **Import safety** → all-or-nothing per section; malformed input never half-writes; a confirm gate
  precedes overwrite.
- **`buildConceptGraph` strict addEdges** throws on unknown ids; `applyOverridesToConcepts` is lenient
  (skips unknown) so a stale exported override never crashes a newer graph.

## 11. Build sequence (for the plan)
1. `overrides.ts` (`mergeOverrides`, `applyOverridesToConcepts`, `safeApply`, `loosenUnitEdges`) + tests.
2. `state-io.ts` pure (`serializeStateBundle`, `parseStateBundle`) + tests; `importUserState` in user-state.ts.
3. `path-io.ts` wiring (overrides signal + key, `computePath` via `safeApply`, mutations, `droppedLocal`;
   `state-io` impure `exportState`/`importState`).
4. `OverridesEditor.tsx` + `StateIOPanel.tsx`; wire both into `PathConfigDrawer`.
5. PathCard "Loosen" action + PathView `droppedLocal` note.
6. Full build lint-clean + EN+RU visual.
