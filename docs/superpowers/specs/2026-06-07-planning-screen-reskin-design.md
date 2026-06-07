# Planning Screen Re-skin — Design

**Date:** 2026-06-07
**Sub-project:** Redesign v2, screen 2 of 5 (after English Hub). Source bundle: `docs/redesign/v2/`.
**Target:** `/[lang]/roadmap` — the path-engine front-end (`PathView.tsx`).
**Nature:** Re-skin of a **working feature wired to real data**, NOT greenfield. The engine already computes everything the mockup shows; the current UI renders it plainly. This re-skin re-presents the same real data in the editorial-cartographic "Planning" layout and surfaces engine capabilities the plain UI hides.

---

## 1. Why / scope

The path engine (`src/scripts/path/*`) computes goals, a concept-mastery field, a dependency-ordered unit path, and a dated deadline schedule with an honest feasibility verdict. The live `/roadmap` (`PathView.tsx`) shows this as: header buttons → XP strip → cold-start banner → output-only deadline panel → flat path cards → a plain per-track mastery bar grid, with goals/config behind drawers.

The v2 "Planning" mockup (`docs/redesign/v2/project/Planning.html` + `planning.css` + `planning.js`) is the same engine re-drawn as a sectioned instrument: GOAL picker (priorities) → **concept-mastery map** (signature) → dependency-ordered NEXT units → **deadline & exam-prep mode** (signature) → collapsed advanced knobs.

**This is a pure re-skin + capability-surfacing.** No engine math changes. P0 core (`graph/knowledge/planner/schedule/config`) is untouched. One new *pure* read-model (`mastery-field`) and one small pure helper (`scheduleBudget`) are added; everything else reuses existing `path-io` setters.

### Data → mockup mapping (verified against source)

| Mockup region | Real engine source | Status |
|---|---|---|
| GOAL picker, P1/P2/P3 priorities + Custom | `config.goals: {id,priority}[]` + `config.customTargets`; `path-io.setGoals` / `toggleCustomTarget`; `goals.json`; `searchConcepts` | exists |
| Concept-mastery map (known/shaky/unknown by domain) | `knowledge` (confidence 0..1/concept) + `masteryThreshold`; `Concept.track`/`band` | **new read-model** `mastery-field` |
| NEXT units (why / unlocks / prereq / est / skip) | `computePath().path.steps` (`PathStep{unlocks,reason,kind,estMin}`); `skip/pin/move/reorder/loosen/quickCheck` | exists |
| Deadline: target date + 7-day hours grid + blackouts + depth | `DeadlineConfig{targetDateMs, perWeekdayHours[7], blackoutDates[], tzOffsetMin}`; `path-io.setDeadline` | exists (input UI new) |
| Honest verdict + budget bar + dated schedule + "what drops" | `computePath().schedule` (`Schedule{days, feasibility{verdict,deltaMin,dropped}, countdownDays}`) | exists; **new** `scheduleBudget` for have/need hours |
| Advanced: breadth⇄depth, pace, depth tier | `config.breadthVsDepth` / `pace` / `depthTier`; `path-io.setKnob` | exists |
| XP / level strip, cold-start, droppedLocal | `currentXp`, `levelFromXp`, `completedStepCount`; `isColdStart`; `droppedLocal` | exists — kept, re-skinned |

**No fabricated data.** Where the mockup hardcodes (e.g. "428 concepts", named shaky callouts), we compute from `mastery-field`. Where a value is not derivable, it is omitted (not faked).

---

## 2. Decisions (locked, autonomous)

1. **Trajectory tab-bar → existing routes.** Build the `01 Planning / 02 Achievements / 03 Progression / 04 Cabinet` tab-bar. Planning = active; **Progression → `/[lang]/profile`**, **Cabinet → `/[lang]/account`** (both live today); **Achievements → disabled** (`aria-disabled`, "coming"). No link leads nowhere.
2. **Outer chrome reuse.** The mockup's `topnav`/wordmark is NOT ported — the site's `Topic.astro` already provides head, title, lang-switch, theme, footer. We render only the page *body* (screen-head + tabs + sections).
3. **One island, client-only.** `roadmap.astro` keeps `<PathView client:only="preact">`. Static screen-head + tab-bar render in the Astro page (zero hydration); the interactive regions stay inside the single Preact island. Hydration budget unchanged (1 island).
4. **3-state derivation.** `known` = confidence ≥ `masteryThreshold` (0.6); `shaky` = 0 < confidence < threshold; `unknown` = absent / 0. (Honest: "shaky" = touched but not solid.)
5. **Domain families for the map.** The 29 tracks group into 8 domain families (deterministic map in `mastery-field.ts`), each with a domain hue, matching the mockup's by-domain clustering. Reuses existing `TRACK_BAND`/`Track` types; hue tokens reconciled in CSS.
6. **Reuse tested drawers for deep cases.** Preset goals + the 3 common knobs render inline (mockup style). The **custom-goal** flow reuses the existing `GoalPicker` modal (its `searchConcepts` + track-exclude UI); **deep config** (weights, excluded tracks, graph overrides via `PathConfigDrawer`/`OverridesEditor`) stays reachable from an "advanced graph edits" link in the collapsed inset. Don't rewrite working, tested components.
7. **Bilingual.** Every string EN+RU via in-component `L` maps, per site rule. EN is canonical; RU parity required by the linter.
8. **Replace, don't duplicate.** `PathView.tsx` is rewritten into the new screen shell importing the new section components. `DeadlinePanel.tsx` (output-only) and the flat mastery grid are superseded; `PathCard.tsx`'s affordances move into the new `UnitRow`. Dead components removed after the cutover (verified unreferenced).

---

## 3. Architecture

```
roadmap.astro                          (Astro page)
  ├─ <link> planning-screen.css        (scoped re-skin stylesheet)
  ├─ screen-head (kicker/title/sub/badges)   ← static
  ├─ <TrajectoryTabs active="planning"/>     ← static links to /profile, /account
  └─ <PathView client:only="preact"/>        ← THE island
        PathView  (shell; reads signals via path-io, owns drawer/modal state)
          ├─ XpStrip / ColdStart / droppedLocal   (kept, re-skinned)
          ├─ <GoalSection/>            goals.json + setGoals/toggleCustomTarget; opens GoalPicker for custom
          ├─ <ConceptMasteryMap/>      mastery-field(knowledge, concepts, threshold)
          ├─ <NextPath/> → <UnitRow/>  computePath().path.steps + skip/pin/move/reorder/loosen/quickCheck
          ├─ <DeadlineSection/>        DeadlineConfig editor → setDeadline; schedule + scheduleBudget output
          ├─ <AdvancedKnobs/>          breadth/pace/tier → setKnob; link → PathConfigDrawer
          ├─ GoalPicker / PathConfigDrawer  (reused modals, conditionally mounted)
          └─ DiagnosticRunner modal    (kept, for unit quick-check)
```

### New pure modules (TDD, local)

- **`src/scripts/path/mastery-field.ts`**
  - `DOMAIN_FAMILIES: { key, label:{en,ru}, hue, tracks: Track[] }[]` — deterministic 8-family grouping covering all 29 tracks (assert exhaustive in a test).
  - `conceptState(confidence, threshold): "known" | "shaky" | "unknown"`.
  - `masteryField(state, concepts, threshold): FamilyField[]` where `FamilyField = { key, label, hue, known, shaky, unknown, total, nodes: {id,label,state}[] }`. Sorted by `DOMAIN_FAMILIES` order; nodes ordered known→shaky→unknown (stable, capped for render with a `+N more` count).
  - `topGaps(field, lang, n)` / `topShaky(field, lang, n)` → the named callouts under the map (from real data, not hardcoded).
- **`src/scripts/path/schedule-budget.ts`** (or co-located): `scheduleBudget(schedule): { availMin, needMin, deltaMin, pct }` derived from `schedule.days[].minutes` + `feasibility.deltaMin` — powers the have/need budget bar honestly.

### New components (cowork-eligible — bulky UI)

`src/components/path/planning/`: `TrajectoryTabs`, `GoalSection`, `ConceptMasteryMap`, `NextPath` + `UnitRow`, `DeadlineSection` (with `WeekHoursGrid`, `BlackoutList`), `AdvancedKnobs`. Plus the `PathView.tsx` rewrite (shell) and `src/styles/planning-screen.css` (port of `planning.css` + needed `cluster.css`/base classes, tokens reconciled to live atlas-kit + a scoped contrast pass).

---

## 4. Data flow & error handling

- All reads go through `path-io` signals (`knowledge`, `config`) and `computePath()`; all writes through existing setters → autosave effect → reactive recompute. No component touches `localStorage` or `Date.now()` directly.
- **Cold start** (`knowledge.size === 0`): show the re-skinned "Start here → Calibrate" banner; the map renders all-unknown; the path still renders the default senior-fullstack plan. No crash on empty state.
- **No deadline set**: DeadlineSection shows the input with an empty/neutral output state (no verdict); setting a date triggers `setDeadline` → schedule appears. Clearing the date → `setDeadline(undefined)`.
- **droppedLocal** (override cycle): keep the existing warning line, re-skinned.
- **Weekday grid / blackouts**: edits build a `DeadlineConfig` and call `setDeadline`; `tzOffsetMin` taken from the browser at write time (in `path-io`, not the pure core). Invalid dates are ignored (no NaN into config; `clampConfig` is the backstop).
- **Token fallbacks**: every `var(--*)` used must resolve in the live atlas-kit; the CSS task reconciles mockup-only tokens (`--known/--shaky/--unknown`, `--d-*` hues, `--cal-filter`, base `.panel/.screen/.seg`) — port or alias them, never ship an unresolved `var()` (English-Hub gotcha).

---

## 5. Testing

- **Unit (Vitest):** `mastery-field.test.ts` — family exhaustiveness over all 29 tracks; `conceptState` band boundaries (0, just-below-threshold, threshold, 1); `masteryField` counts/ordering/cap on a fixture; `topGaps`/`topShaky` selection. `schedule-budget.test.ts` — have/need/delta/pct on fits / over / under fixtures.
- **Build/lint:** `bun run build` from `site/` → 0 errors / 0 warnings; i18n parity for any new UI strings; hydration cap respected (1 island on the page).
- **Visual:** Playwright clipped 2× section shots, light + dark, EN + RU — judge contrast on clips, not full-page (downscale exaggerates faintness — English-Hub gotcha). Verify the two signature regions (map, deadline) read as instruments.
- **Hybrid verification:** if components are built by cowork, run the full gate locally behind it (vitest + independent build + visual + contrast pass + dead-code/junk cleanup) — non-negotiable per `feedback_cowork-hybrid`.

---

## 6. Out of scope

- Engine math changes (planner/scheduler weights). The knobs only write existing config fields.
- The other three v2 screens (Achievements / Progression / Cabinet) — separate sub-projects; only the tab-bar entry points are added here.
- Per-text coverage or any data the engine doesn't already compute.
