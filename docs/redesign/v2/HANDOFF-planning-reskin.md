# HANDOFF — Planning screen re-skin (cowork build of the UI components)

You are building the **bulky UI components** for the Open Atlas "Planning" screen re-skin. The cheap logic, data read-models, the Astro page shell, and the CSS tokens are **already done and pushed** on the branch. Your job: recreate the v2 mockup pixel-faithfully as Preact components wired to the finished APIs below. The controller verifies behind you (tests + build + visual + contrast pass) — you do not need to run the visual pass.

## Start

```bash
git fetch origin
git checkout feat/planning-screen-reskin   # already has Tasks 1–5 committed
cd site && bun install
```

Plan: `docs/superpowers/plans/2026-06-07-planning-screen-reskin.md` (your tasks are **6, 7, 8**).
Spec: `docs/superpowers/specs/2026-06-07-planning-screen-reskin-design.md`.

## Pixel source (recreate visually; do NOT copy the prototype's vanilla-JS structure)

- `docs/redesign/v2/project/Planning.html` — the screen markup & section order.
- `docs/redesign/v2/project/planning.css` — the screen styles (port into `site/src/styles/planning-screen.css`).
- `docs/redesign/v2/project/planning.js` — the **behaviours** (weekday-hours stepper interaction, schedule fill, goal priority reflow, knob labels). Reimplement these as Preact, wired to real engine writes — not the mockup's hardcoded `PLAN`/`CLUSTERS` arrays.
- `docs/redesign/v2/project/cluster.css` + `components.css` + `tokens.css` — shared chrome / base classes / token names.
- The chat intent lives in `docs/redesign/v2/chats/chat2.md` (the four-screen brief). The Planning brief is the "Screen 1 — PLANNING" block.

## Done-APIs — build on these (do not reimplement, do not touch the engine)

**`~/scripts/path/mastery-field.ts`** (the concept-mastery map's data):
```ts
export const DOMAIN_FAMILIES: { key; label:{en,ru}; hue:string /* --d-* */; tracks:Track[] }[]; // 8 families, all 29 tracks
export function conceptState(confidence:number, threshold:number): "known"|"shaky"|"unknown";
export interface FieldNode { id:string; label:string; state:"known"|"shaky"|"unknown" }
export interface FamilyField { key; label:{en,ru}; hue:string; tracks:Track[]; known:number; shaky:number; unknown:number; total:number; nodes:FieldNode[] }
export function masteryField(state, concepts, threshold, lang:"en"|"ru"): FamilyField[]; // families with concepts, in DOMAIN_FAMILIES order; nodes known→shaky→unknown
export function topGaps(field, lang, n=6): string[];   // unknown concept labels
export function topShaky(field, lang, n=6): string[];  // shaky concept labels
```

**`~/scripts/path/schedule-budget.ts`** (the deadline budget bar):
```ts
export interface Budget { availMin:number; needMin:number; deltaMin:number; pct:number }
export function scheduleBudget(s: Schedule): Budget; // deltaMin is a positive magnitude; pct = avail/need clamped 0..100
```

**`~/scripts/path/path-io.ts`** (the ONLY place state is read/written — use these, never localStorage/Date.now in a component):
```ts
// reactive signals
knowledge: Signal<KnowledgeState>            // Map<conceptId, {confidence,source,lastAt}>
config: Signal<StoredPathConfig>             // {goals:{id,priority}[], customTargets?, excludedTracks, breadthVsDepth, depthTier, pace:{stepsAhead,srsAggressiveness}, weights:{masteryThreshold,...}, deadline?, view:{order}}
// content bundle (committed data)
content: { concepts:Concept[], conceptById:Map, unitTitleById:Map<unitId,{en,ru}>, quickCheckUnits:Set, goals:Goal[], goalById:Map, taughtConcepts:Set, ... }
// the single recompute entry point (subscribes the caller to signals)
computePath(): { path:{steps:PathStep[]}, schedule?:Schedule, droppedLocal:boolean }
// reads
masteryByTrack(state, concepts, threshold): {track,known,total,avg}[]
searchConcepts(concepts, taught:Set, query, lang, limit=20): Concept[]
activeGoals(): Goal[]; isPinned(unitId): boolean; unitProbeConcepts(unitId): string[]
// writes (each → autosave → reactive recompute)
setGoals(g:{id,priority}[]); toggleCustomTarget(id); toggleExcludedTrack(track)
setKnob({breadthVsDepth?, depthTier?, pace?, weights?}); setDeadline(d:DeadlineConfig|undefined)
skipUnit(unitId); declareKnown(concept,known); pinUnit(unitId); moveUnit(unitId,"up"|"down")
reorderPath(unitIds:string[], from, to); loosenUnit(unitId); resetPath()
applyDiagnosticResult(concept, correctFrac)
```

**Types** (`~/scripts/path/types.ts`):
```ts
PathStep { unit:string; track:Track; unlocks:string[]; reason:string; kind:"learn"|"review"|"check"; estMin:number }
Schedule { days:{date:string;minutes:number;steps:PathStep[]}[]; feasibility:{verdict:"fits"|"over"|"under"; deltaMin:number; dropped:string[]}; countdownDays:number }
DeadlineConfig { targetDateMs:number; perWeekdayHours:number[/*7, Mon..Sun, 0=off*/]; blackoutDates?:string[/*ISO YYYY-MM-DD*/]; tzOffsetMin:number }
Concept { id; label:{en,ru}; track:Track; band:Band; requires:string[] }
```

**Reusable existing components** (mount conditionally from `PathView`, do not rewrite):
```ts
GoalPicker({ lang, onClose })            // custom-goal modal: searchConcepts + track exclude
PathConfigDrawer({ lang, onClose })      // deep config: weights + OverridesEditor + StateIOPanel
DiagnosticRunner({ lang, conceptIds:string[], onConcept:(c,frac)=>void, onDone:()=>void }) // quick-check
```

**Start-CTA route:** `~/scripts/next-lesson.ts` exports `resolveNextLesson(...)` → `{unit, slug} | null`. Read it for the exact signature; use it to build the unit "Start" link (`/${lang}/learn/...`). If a unit has no resolvable lesson, render the CTA disabled.

## Non-negotiable contracts

1. **ONE island.** Every component you build is plain Preact composed inside `PathView` (the island). Do **not** add any `client:*` directive anywhere. The page already mounts exactly one island.
2. **Real data only.** No hardcoded "428 concepts", no fabricated cluster counts, no canned shaky/gap callouts, no mockup `PLAN`/`CLUSTERS` arrays. Everything comes from `masteryField`/`computePath`/`scheduleBudget`/`content`. If a value is not derivable, **omit it** (do not invent — the English Hub omitted an underivable "89% retained" with a comment; do the same).
3. **EN + RU.** Every user-facing string via an in-component `L = { en:{...}, ru:{...} }` map keyed by `lang`. EN is canonical; RU parity is build-enforced by the linter.
4. **a11y.** Week-hours steppers: `role="spinbutton"`, `aria-label`, keyboard ↑/↓ (and wheel), like `planning.js`. `aria-pressed` on goal/segment toggles. Honor `aria-disabled`. Respect `prefers-reduced-motion`.
5. **No direct state.** Never touch `localStorage` or `Date.now()` in a component. `tzOffsetMin` for `setDeadline` comes from `new Date().getTimezoneOffset()` computed in the event handler (the one allowed `Date` use, at write time) — or better, expose it through a tiny path-io helper if you prefer; ask the controller.
6. **BYOK / security:** not on this screen — but if you touch any shared file with a security disclosure, carry it verbatim.

## Resolved gotchas (heed these — they cost rebuilds before)

- **Band/progress fills must be a block `<div>` with inline `width`, inside a block parent** — never a `<span>`/inline element (the mockup's `innerHTML` had a span-in-inline width-collapse bug; Preact `createElement` of a `<div>` avoids it). Applies to `.cl-bar > i`, `.budget .bbar > i`, `.cnode` fields.
- **`planning-screen.css` is `.screen`-scoped.** The classes `.seg/.sec-head/.sec-index/.fig-caption/.wrap/.kicker` exist elsewhere but scoped under `.hub` (english-hub.css) — define your own copies scoped under `.screen`. The classes `.panel/.screen/.inset/.btn-primary/.btn-secondary/.btn-sm` do **not** exist live — port them from `cluster.css`/`components.css`, scoped.
- **Tokens already added** (Task 3, both themes): `--known` (=ok/green), `--shaky` (=warn/amber), `--unknown` (faint neutral), `--cal-filter` (date-picker icon, dark-mode invert). Use them; don't redefine.
- **Don't run full-page screenshots to judge contrast** — they downscale and exaggerate faintness. The controller judges contrast on 2× clipped section shots.

## Your tasks (verbatim contracts)

### Task 6 — `site/src/styles/planning-screen.css`
Port `planning.css` + the needed base classes, all scoped under `.screen`. Light + dark correct. Keep the `@media (max-width:860px/760px)` collapses. No unresolved `var(--*)`. Build 0/0.

### Task 7 — signature components
- `site/src/components/path/planning/ConceptMasteryMap.tsx` — `{lang}`; `masteryField(knowledge.value, content.concepts, config.value.weights.masteryThreshold, lang)`; render `.cmap` per family (sq hue + name + `known/total · N shaky` + `known/total` bar + `.cnode` field). Cap nodes/family at ~80 with `+N` overflow count. Footer callouts from `topShaky(...,3)` / `topGaps(...,3)` (omit if empty). Computed total in the panel head. `.fig-caption` signature line (translated).
- `site/src/components/path/planning/DeadlineSection.tsx` (+ co-located `WeekHoursGrid`, `BlackoutList`) — `{lang}`; reads `config.value.deadline` + `computePath().schedule`. Input: date, 7-day stepper grid (keyboard), blackout add/remove, reading-depth `.seg`. Every edit → full `DeadlineConfig` → `setDeadline`. Output (when schedule exists): verdict block (`fits/over/under` + `countdownDays`), budget bar via `scheduleBudget`, honest sentence from `feasibility`+`dropped` (titles via `content.unitTitleById`), dated list from `schedule.days` (first ~6 non-empty, today marker). depthTier writes via `setKnob({depthTier})`.

### Task 8 — `GoalSection`, `NextPath`+`UnitRow`, `AdvancedKnobs`, and rewrite `PathView.tsx`
- `GoalSection.tsx` — preset goals from `content.goals` as `.goal` cards, P1/P2/P3 chips from `config.value.goals`, toggle via `setGoals` (reflow priorities). Dashed "Custom goal" card → open `GoalPicker`. `aria-pressed`.
- `NextPath.tsx` + `UnitRow.tsx` — `ol.unit-list` from `computePath().path.steps`. Each row: domain hue (from the unit's track family), title (`unitTitleById`), `u-why` (`step.reason` + unlocked labels via `conceptById`), meta (prereq/est/kind). Controls: `skipUnit`, `pinUnit`/`isPinned`, `moveUnit`, `reorderPath` (HTML5 DnD), `loosenUnit`, quick-check → `DiagnosticRunner` via `unitProbeConcepts`. "Start" CTA via `resolveNextLesson`; queued style otherwise. **Preserve every current PathCard behaviour.**
- `AdvancedKnobs.tsx` — collapsed `<details class="inset">`: breadth⇄depth range (`setKnob({breadthVsDepth})`), pace range (`setKnob({pace})`), depth-tier `.seg` (`setKnob({depthTier})`). Quiet link "advanced graph edits" → `PathConfigDrawer`.
- `PathView.tsx` rewrite — the island shell. Order: XP/level strip (re-skin; `currentXp`/`levelFromXp`/`completedStepCount` from `~/scripts/progression/*` as in the current file) → cold-start banner (`knowledge.size===0` → `/calibrate`) → `droppedLocal` warning → `GoalSection` → `ConceptMasteryMap` → `NextPath` → `DeadlineSection` → `AdvancedKnobs`. Owns modal state for `GoalPicker`/`PathConfigDrawer`/`DiagnosticRunner`. Sectioned with `.screen-section` + `.sec-head`/`.sec-index` (`01 · GOAL`, `02 · INSTRUMENT`, `03 · PATH`, `04 · INSTRUMENT`). Keep the `{lang}` prop and stay the entry imported by `roadmap.astro`.

## Done = 
All components build (`cd site && bun run build` → 0/0), tests still green (`bun run test`), screen renders with real engine data in both themes/locales, exactly one island. Commit per component. The controller pulls your branch, runs the gates + visual + contrast pass, removes dead `DeadlinePanel.tsx`/`PathCard.tsx`, and merges.
