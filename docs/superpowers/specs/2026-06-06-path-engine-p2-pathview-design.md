# Path Engine P2 — PathView on /roadmap (Design Spec)

**Date:** 2026-06-06
**Status:** Approved design, pre-plan
**Parent spec:** `docs/superpowers/specs/2026-06-05-personalized-path-engine-design.md` (§6 adapter, §9 UI, §10 removals)
**Predecessors:** P0 pure core (in `main`), P1 content bootstrap (in `main`: `src/content/path/`)

## 1. Purpose

Make the personalized path engine usable: replace the (now-empty) `CompetencyMap` on `/roadmap`
with **PathView** — an interactive surface that shows the learner *what to study next, in what order,
why, and on what schedule*, driven by the committed concept graph + the deterministic P0 engine,
persisting all learner state client-side.

This is **P2** of the four-phase plan. CalibrationFlow, StateIO, and the pre-unit "quick check"
are **out of scope** here (separate surfaces). Pretest→concept seeding is **deferred** (cold-start
starts at the goal's foundations frontier).

## 2. Scope (locked)

**In:** `path-io.ts` adapter; `PathView` island on `/roadmap`; `GoalPicker` (goals + priorities +
custom targets + exclude/lock tracks + deadline setup); `PathConfigDrawer` (four knob groups);
per-track mastery overview; "I already know this" / skip / pin / reorder; deadline countdown +
per-day plan + dropped-scope notice; removal of `CompetencyMap` + `competency.ts` /
`competency-inputs.ts` + their tests; `path.*` i18n keys (EN+RU); unit tests for the pure adapter
helpers; build lint-clean; visual verification EN+RU.

**Out (own later work):** CalibrationFlow (adaptive onboarding); StateIO export/import; pre-unit
mini-diagnostic on lesson pages; pretest→concept seed map; the runtime "explain my path" LLM call;
full drag-and-drop reorder (replaced here by up/down move).

## 3. Architecture

**One island.** `/roadmap` is not a reader page (exempt from the 5/7-island cap), so the entire
interactive surface is a **single PathView hydration root**; GoalPicker and PathConfigDrawer render
as **drawers inside it**, not as separate islands. This matches spec §9 ("PathView composes one
island") and gives one shared state source with no cross-island sync.

```
roadmap.astro  ──renders──►  <PathView client:only="preact" lang={lang} />
                                   │ imports
                                   ▼
                          src/scripts/path/path-io.ts  (impure adapter)
                            • imports concepts.json / unit-concepts.json / goals.json
                              + diagnostics index  → content bundle (built once, module load)
                            • signals: knowledgeState, pathConfig (versioned localStorage)
                            • recompute(): buildPath(...) [+ schedulePlan when deadline set]
                            • interaction helpers (declareKnown, skipUnit, pin/move, setGoal, …)
                                   │ pure inputs (state, goals, config, content, now)
                                   ▼
                          src/scripts/path/{planner,schedule,knowledge,graph,config}.ts  (P0, unchanged)
```

The pure core is **not modified**. `Date.now()` is called only in `path-io.ts`/PathView.

## 4. Content bundle (build → bundle)

The four JSON artifacts are `import`ed directly by `path-io.ts` (Vite bundles them into the island
chunk — loaded once, cached; **not** inlined into per-page HTML, so EN+RU pages stay light).
`path-io.ts` builds, once at module load:

- `concepts: Concept[]` — from `concepts.json`.
- `units: UnitConcepts[]` — `unit-concepts.json` is a map `{ "<track>/<unit>": {teaches,requires,estMin} }`;
  transform to the engine's `UnitConcepts[]` by adding `unit` (the key) and `track` (key prefix).
- `goalById: Map<string, Goal>` + `goals: Goal[]` — from `goals.json`.
- `diagnosedConcepts: Set<string>` — concept ids that have a `diagnostics/<id>.json` file (a build-time
  generated index, since the island can't `readdir`; see §7).
- `trackOrder: Map<string, number>` — from `tracks.json` `order`.

## 5. Persistence (client-side, versioned)

Mirrors `user-state.ts` discipline (load → merge onto defaults → `@preact/signals` signal → `effect` autosave):

| Key | Shape | Notes |
|---|---|---|
| `awesome.path-knowledge.v1` | `KnowledgeState` serialized as `[id, ConceptMastery][]` | Map ⇄ array on load/save. |
| `awesome.path-config.v1` | `PathConfig` + a UI-only `view` field | `mergeConfig` (P0 `config.ts`) clamps/normalizes on load. |

The UI-only `view` field (`{ pins: string[]; manualOrder?: string[] }`) holds pin/reorder state. It is
**view-layer only** — never fed to the pure planner — so the P0 `PathConfig` type stays unchanged
(`view` is an additive optional property the core ignores).

Both keys are independent of `awesome.user-state.v1` (progression/XP untouched). `resetAll`-style
clearing for the path engine clears only these two keys.

## 6. Interaction → engine mapping (no core changes)

| UI action | Effect |
|---|---|
| "I already know this" (concept) | `applySelfDeclare(state, concept, true, now)` |
| "I already know this" / "skip" (unit) | `applySelfDeclare` for each of the unit's `teaches` |
| "I don't know this after all" | `applySelfDeclare(..., false, now)` |
| pin unit / move up·down | mutate `config.view.pins` / `manualOrder`; **re-order the rendered path only** |
| pick goals + priorities | `config.goals = [{id, priority}]` |
| custom targets | `config.customTargets` |
| exclude / lock track | `config.excludedTracks` |
| breadth↔depth, pace, srs, depth tier, expert weights | the matching `PathConfig` fields |
| set deadline (date + per-weekday hours + blackouts) | `config.deadline: DeadlineConfig` |
| recompute | re-run `recompute()` (also runs reactively on any state/config change) |

Every mutation writes through the signal → autosaves → `recompute()` re-derives the `Path` (and
`Schedule` when `config.deadline` is set).

## 7. Components

All new files under `src/components/path/` unless noted.

### 7.1 `src/scripts/path/path-io.ts` (adapter, ~150 lines)
- Builds the content bundle (§4).
- `knowledgeState` + `pathConfig` signals with versioned load/save (§5).
- `recompute()` → `{ path: Path; schedule?: Schedule }` via `buildPath` (+ `schedulePlan`).
- Helpers: `declareKnown(concept, known)`, `skipUnit(unit)`, `pinUnit(unit)`, `moveUnit(unit, dir)`,
  `setGoals(...)`, `setCustomTargets(...)`, `setExcludedTracks(...)`, `setKnob(...)`, `setDeadline(...)`,
  `clearDeadline()`, `resetPath()`. Pure-data helpers (e.g. `applyViewOrder(path, view)`,
  `masteryByTrack(state, concepts)`) are exported separately for unit testing.

### 7.2 `PathView.tsx` (island)
- **Header:** active goal(s) summary + Recompute + buttons opening GoalPicker / Config drawers.
- **Path list:** ordered `PathStep` cards — unit title (resolve via units.json titles), concepts
  unlocked (labels from `concepts.json`), the "why" reason, `estMin`, `kind` badge (learn/review/check).
  Per card: "I already know this", skip, pin, move up/down; a "quick check" affordance when the unit
  teaches a `diagnosedConcept`.
- **Deadline panel** (when `config.deadline` set): countdown days, on/behind-track delta, per-day plan,
  explicit dropped-scope notice (the `feasibility.dropped` set — never silent).
- **Mastery overview:** 29 per-track rollups (avg confidence + known/total), each expandable to its
  concepts. Not 4798 flat rows.
- Empty/cold-start: explains the default `senior-fullstack` foundations-frontier start + CTA to set a goal.

### 7.3 `GoalPicker.tsx` (drawer)
Goals (from `goals.json`) with priority steppers; custom target add/remove (track or concept);
exclude/lock track toggles; deadline setup — date input, 7-cell per-weekday hours grid, blackout-date
list. Writes `PathConfig` via adapter helpers.

### 7.4 `PathConfigDrawer.tsx` (drawer, reuses SettingsDrawer chrome)
Four knob groups: goal/focus (breadth↔depth), pace/volume (`stepsAhead`, `srsAggressiveness`), depth
tier (global or per-track), expert signal-weights (hidden under an "advanced" disclosure).

### 7.5 `roadmap.astro` (rewrite)
Drop the competency bundle assembly; render `<PathView client:only="preact" lang={lang} />` inside
`Topic`. A small build step (or inline frontmatter) writes the diagnostics index the bundle needs —
preferred: a generated `src/content/path/diagnostics-index.json` (list of diagnosed ids) emitted by
extending `scripts/path/build-path-data.mjs`, so the island imports it instead of reading the dir.

## 8. Removals (spec §10)
Delete `src/components/progression/CompetencyMap.tsx`, `src/scripts/progression/competency.ts`,
`src/scripts/progression/competency-inputs.ts`, and their `*.test.ts`. Grep first for references
(`roadmap.astro` is the known consumer; confirm no others) and remove them. Keep all other
progression code (ranks, rating, streak, XP) untouched.

## 9. i18n
Add a `path.*` namespace to `src/i18n/ui.json` (EN+RU): titles, button labels, card affordances,
goal/knob labels, deadline/feasibility strings, mastery-overview labels. Concept/unit/goal display
text comes from the committed JSON (already bilingual). No hard-coded UI strings in components.

## 10. Testing & verification
- **Unit (Vitest):** `path-io` pure helpers — bundle transform (map→`UnitConcepts[]`),
  `applyViewOrder` (pins/reorder), `masteryByTrack`, knowledge/config round-trip serialization.
  (DOM-heavy island rendering is covered by the visual check, not unit tests — consistent with the
  repo's island testing posture.)
- **Build:** `bun run build` lint-clean (existing rules + path rule); island hydrates; no console errors.
- **Visual:** `/en/roadmap` and `/ru/roadmap` — cold-start path renders, goal change recomputes,
  "I already know this" shortens the path, deadline mode shows countdown + dropped-scope.
- **Typecheck:** `bun run check` adds no new errors in path/progression files.

## 11. Risks / decisions
- **4798-concept render cost** → mastery overview is per-track rollups with lazy per-track expansion;
  path list is `pace.stepsAhead`-bounded (or schedule-bounded). No full-graph render.
- **Bundle size** (~220 KB JSON in the island chunk) → acceptable on a non-reader route; loaded once,
  cached; not duplicated into HTML. Revisit with a fetch() if it regresses LCP.
- **Pretest seed deferred** → cold-start at foundations frontier of the default goal; documented gap.
- **Reorder** → up/down move (persisted in `config.view`), not drag-and-drop; full DnD is a later polish.
- **No P0 core/type edits** → all interactions map to existing engine primitives + a view-only
  `config.view` field the core ignores.

## 12. Build sequence (for the plan)
1. `path-io.ts` adapter + pure-helper unit tests (TDD).
2. `diagnostics-index.json` emit in `build-path-data.mjs`.
3. `PathView.tsx` (path list + mastery overview + cold-start) on `/roadmap`; remove CompetencyMap.
4. `GoalPicker.tsx` (+ deadline setup) and `PathConfigDrawer.tsx` drawers.
5. `path.*` i18n; visual verification EN+RU; full build lint-clean.
