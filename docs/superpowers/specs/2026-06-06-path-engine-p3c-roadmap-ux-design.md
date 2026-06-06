# Path Engine — P3-C: Roadmap UX (custom targets + DnD reorder + step XP)

**Date:** 2026-06-06
**Status:** design approved, ready for plan
**Branch:** `feat/path-engine-p3c-roadmap-ux`
**Predecessors:** P0/P1/P2/P3-A/P3-B + cross-track-edges debt slice — all on `main` (cross-track via PR #5 `b3f59ebb`).

## 1. Problem

Three `/roadmap` UX gaps remain in the Path Engine (P3 slice C):

1. **No custom-target picker.** The adapter supports concept-level goal targets (`toggleCustomTarget` / `config.customTargets`, honored by `targetFrontier`), but there is no UI — `GoalPicker` only exposes preset goals, excluded tracks, and the deadline.
2. **Reorder is ↑/↓ only.** Manual reordering uses per-card up/down buttons (`moveUnit` → `view.order`). No drag-and-drop.
3. **No XP tie to the path.** XP is derived from `user-state` (`xpFromState`: pretest + per-lesson history + retrieval + achievements + drills + english) and is not surfaced on `/roadmap` at all; completing path steps grants no recognition there.

## 2. Goals & decisions

Add the picker, native drag-and-drop reorder, and a derived step-completion XP bonus that feeds the global level — without touching P0 core and without a parallel/imperative XP economy.

**Approved decisions:**
- **A.** `PATH_STEP_BONUS = 20` XP per fully-completed step (≈2 lessons).
- **B.** The `/roadmap` progress strip shows the **global** level/XP (same number as `/profile`), not a path-local figure.
- **C.** On drop, DnD writes the **full** sequence of currently-visible unit ids into `view.order` (prior pins collapse into an explicit order). Accepted.
- **Step-complete = all of the unit's `teaches` concepts are known** in the path `knowledge` state (path-native; no new build artifact). Not lesson-history based.
- **DnD = native HTML5** (`draggable` + drag events), no new dependency; ↑/↓ kept as an accessibility fallback.

**Key consequence:** a fully-completed step **leaves the path** (`missingConcepts` drops known targets → `conceptsToUnits` no longer includes its unit). So the "done" recognition is a **progress strip count + bonus**, NOT a per-card badge (completed cards aren't rendered).

## 3. Architecture

### 3.1 Custom-target picker (`GoalPicker.tsx`)
New "Custom targets" section:
- A search `<input>` → pure `searchConcepts(concepts, query, limit)` in `path-io` (filter to **taught + clean-label** concepts; match on label[lang]/id; cap ~20; empty query → no results).
- Clicking a result calls the existing `toggleCustomTarget(id)`.
- Current `config.customTargets` render as removable chips (label by locale, `toggleCustomTarget` to remove).
- No adapter additions beyond the two pure helpers; `targetFrontier` already honors `customTargets` and respects `excludedTracks`.

### 3.2 DnD reorder (`PathCard.tsx` + `PathView.tsx` + `path-io`)
- `PathCard` becomes `draggable`, emitting `onReorder(draggedUnit, targetUnit)` via `onDragStart` (set dragged id) / `onDragOver` (preventDefault + drop-target highlight) / `onDrop`. ↑/↓ buttons and their `onMove` stay.
- `PathView` passes the current visible unit-id list and, on `onReorder`, calls a new mutator `reorderPath(from, to)`.
- `reorderPath` uses a pure helper `reorderList(unitIds, from, to)` (move `from` to `to`'s index in the full visible sequence) and writes the result as the complete `view.order` via the existing config setter. `applyViewOrder` already emits ordered-first.

### 3.3 Step XP bonus (`progression/path-xp.ts` + `xp.ts` + `ProfilePanel` + `PathView`)
- New pure module `src/scripts/progression/path-xp.ts`:
  - `export const PATH_STEP_BONUS = 20;`
  - `export function pathStepBonusXp(knowledge, units, concepts, threshold): number` — counts units where **every** `teaches` concept is known (`isKnown` at `threshold`), times `PATH_STEP_BONUS`. Pure, no I/O. (Units with empty `teaches` don't count.)
- `xp.ts`: `xpFromState(state, drillsSolved, englishKnown = 0, pathStepBonus = 0)` — add the optional 4th param folded into the total (`+ pathStepBonus`). Backward compatible: default 0 leaves every existing caller/test unchanged.
- `ProfilePanel.tsx` (the canonical level display): import the path `knowledge` signal + `content` + `pathStepBonusXp`, compute the bonus, pass it to `xpFromState` so the global level/XP includes it. (Path signals are global singletons from `path-io`; SSR sees empty knowledge → 0 bonus, hydration recomputes — same pattern as `PathView`.)
- `PathView.tsx`: a progress strip in the header — `level` / `xp` / `intoLevel → toNext` via `levelFromXp(xpFromState(... bonus))`, plus a line "Steps completed: N (+M XP)" where N = completed-step count and M = N × `PATH_STEP_BONUS`.
- Audit all `xpFromState` callers (e.g. `account-sync`, any summary builder). The param is optional so none break; update only those that must reflect the bonus in the global figure (ProfilePanel, and any place that computes the same canonical level the user sees).

## 4. File touch list

| File | Change |
|------|--------|
| `site/src/scripts/progression/path-xp.ts` | **new** — `PATH_STEP_BONUS` + `pathStepBonusXp` |
| `site/src/scripts/progression/path-xp.test.ts` | **new** — tests |
| `site/src/scripts/progression/xp.ts` | optional `pathStepBonus` param |
| `site/src/scripts/path/path-io.ts` | pure `searchConcepts` + `reorderList`; `reorderPath(from, to)` mutator |
| `site/src/scripts/path/path-io.test.ts` | tests for `searchConcepts` + `reorderList` |
| `site/src/components/path/GoalPicker.tsx` | custom-targets section (search + chips) |
| `site/src/components/path/PathCard.tsx` | `draggable` + `onReorder` (keep ↑/↓) |
| `site/src/components/path/PathView.tsx` | DnD wiring + progress strip |
| `site/src/components/progression/ProfilePanel.tsx` | pass path bonus into `xpFromState` |

P0 core (`graph.ts`, `types.ts`, `knowledge.ts`, `planner.ts`, `schedule.ts`, `config.ts`, `diagnostic-select.ts`) is **not** modified.

## 5. Testing & gates

- **Unit:**
  - `pathStepBonusXp`: a fully-known unit counts; a partially-known unit doesn't; empty-teaches unit doesn't; respects `threshold`.
  - `xpFromState`: passing a bonus adds it; default (omitted) leaves existing totals unchanged (regression guard).
  - `searchConcepts`: junk/short labels filtered out; matches on label and id; respects the result cap; empty query → [].
  - `reorderList`: move up, move down, to the ends, and when the source order is partial (a unit not yet in `view.order`).
- **Gates:** `bunx vitest run src/scripts/path/ src/scripts/progression/` then a full `astro build` (4849 pages, lint 0/0).
- **Visual:** `/roadmap` drag-reorder + custom-target picker + progress strip; `/profile` level reflecting the bonus.

## 6. Out of scope

- DnD animations / drag ghosts beyond a simple drop-target highlight.
- New path-specific achievements.
- A separate server sync for the bonus — it rides the existing `account-sync` because it's a pure client-side derivation of already-synced state.
- The lesson-history definition of "step complete" (concepts-known chosen).
- Touching P0 core or the cross-track-edge machinery.

## 7. Risks

- **Custom targets can expand the path** (a deep target pulls in its whole ancestor closure). Expected — the user explicitly targeted it; mitigated by `excludedTracks` and the breadth/depth knob.
- **`view.order` semantics**: it currently doubles as the pin set and the manual order; DnD writing the full visible order means a drag effectively pins everything visible. Accepted per decision C; pins remain togglable afterward.
- **Cross-island XP consistency**: ProfilePanel and PathView both compute the bonus from the same path signals + the same pure helper, so the two surfaces agree.
