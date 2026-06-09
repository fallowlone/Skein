# Planning screen: role goals, depth-as-time, deadline optimizer, pace tracking, layout

- **Date:** 2026-06-08
- **Status:** design (awaiting review)
- **Surface:** `/[lang]/roadmap` planning screen (the path engine)
- **Scope:** content (`goals.json`), pure core (`scripts/path/*`), planning UI (`components/path/**`), i18n. No P0 graph/knowledge changes beyond one additive goal-rule form and one `DeadlineConfig` field.

## 1. Context & problem

The planning screen (`PathView`) drives the personalized path engine: pick goals → see a
dependency-ordered path → optionally set a deadline and get a dated, feasibility-checked
schedule. Pure core lives in `scripts/path/*` (graph, knowledge, planner, schedule, config)
and is consumed — never mutated — by the impure adapter `path-io.ts`. Components are thin
views over signals.

Two pain clusters surfaced:

**A. Goals are too narrow and the deadline tool is passive.**
- `goals.json` has 4 presets: `senior-fullstack`, `backend-job`, `interview-prep`,
  `ai-engineer`. No standalone **frontend**, **fullstack**, or **devops** role.
- When the schedule does not fit (`feasibility.verdict === "over"`), the UI drops the
  lowest-ROI tail units and prints a static sentence ("raise weekday hours or move the
  date"). It never computes *what specifically would close the gap* or by how much.
- "Behind schedule" is not modeled. The countdown shrinks and the over-budget delta grows,
  but there is no notion of *planned vs. actually completed* over calendar time, no
  projected finish date, no "you are N days behind" signal.
- `depthTier` is a **dead knob**: stored in config, read only by three UI controls
  (`AdvancedKnobs`, `DeadlineSection`, `PathConfigDrawer`), and consumed by neither
  `computePath` nor `schedulePlan`. Lowering "reading depth" currently changes nothing.

**B. The planning UI is duplicated, buried, and confusing.**
- Layout order is `XP → 01 GOAL → 02 mastery-map → 03 PATH (long all-tracks list) → 04
  DEADLINE → advanced`. Planning controls (goal + deadline) straddle and sit *below* the
  long path list. The user wants planning **on top**, above the tracks.
- There is no "what do I do **today**" focus. The schedule has a `today` row but it is the
  fourth section down, mixed into a multi-day list.
- **Two goal editors:** `GoalSection` cards (show `P1/P2/P3`) and `GoalPicker` modal
  (raw `<input type=number>` steppers). **Two deadline editors:** `DeadlineSection`
  (local timezone) and `GoalPicker` (hardcoded `tzOffsetMin: 0`, UTC `Date.parse`) — they
  disagree on timezone, a latent bug.
- Goal **priority is counterintuitive**: the planner computes `weight += trackWeight ×
  priority` (higher number → more weight), but `GoalSection` labels the first-added goal
  `P1` with `priority = 1` (the *least* weight). Label and math contradict. "2 vs 7" has
  no clear meaning.
- The weekday-hours pickers are poor: `DeadlineSection`'s grid is **click-to-increase
  only** (decrement is hidden behind right-click/wheel); `GoalPicker` uses naked native
  number spinners.

## 2. Goals / non-goals

**Goals**
1. Add `frontend-dev`, `fullstack-dev`, `devops-engineer` role presets.
2. Make depth tier a real time lever (skim ↔ deep-read).
3. Compute concrete, quantified optimization suggestions when over budget, plus a
   one-click "optimize for me".
4. Track pace (planned vs. completed) → status, projected finish, days behind.
5. Surface a prominent "today" focus.
6. Move planning controls above the path list.
7. One reusable, clear hours picker (explicit −/+) used everywhere.
8. Fix goal-priority semantics (1 = most important) and remove the duplicated `GoalPicker`
   modal.

**Non-goals**
- No combinatorial Pareto auto-planner (rejected approach C).
- No change to the P0 concept graph, topo sort, or knowledge-decay math.
- No new persistence backend; everything stays in the existing versioned `localStorage`
  config/knowledge signals.
- No server/API. Pure client recompute, as today.

## 3. Locked decisions (from brainstorm)

- **Approach A** — pure "advisor" modules + thin components; matches the existing
  pure-core / adapter split.
- **Roles:** frontend + fullstack + devops.
- **Optimization:** suggestions *and* a one-click apply.
- **Behind-deadline:** real pace tracking (baseline snapshot), not just countdown.
- **Priority:** number = importance, **1 = most important**; magnitude is irrelevant —
  values normalize to consecutive ranks; the planner weight inverts so rank 1 dominates;
  a live explainer shows the resulting time share. Both goal editors edit the same field
  with the same meaning.
- **De-dup:** **remove** the `GoalPicker` modal. Its unique pieces (custom-target concept
  search, excluded-track chips) move inline into the GOAL section as a collapsible "refine"
  block. `DeadlineSection` becomes the single deadline editor (the UTC editor is deleted,
  killing the tz bug). `PathConfigDrawer` ("Tune your path": focus/pace/depth/overrides/
  state-IO) is unrelated and stays.

## 4. Design

### Part 1 — Role goals (`goals.json` + goal-rule grammar)

Add a third `target` form to `resolveGoalTargets` (planner.ts), alongside the existing
`concepts` list and global `band>=<band>`:

```
target: { rule: "track-band>=middle" }
```

Resolves to: every concept whose `band >= middle` **and** whose `track` is a **core track
of this goal** — defined as a `trackWeights` entry with weight `>= 1.0`. Supporting tracks
(weight `< 1.0`) bias ordering only (via `goalTrackWeight`), they do **not** enter the
target frontier. This keeps the frontier scoped to the role's defining tracks instead of
ballooning to every weighted track.

Implementation note: `resolveGoalTargets(goal, concepts)` currently takes only
`(goal, concepts)`. The new form needs the goal's own `trackWeights` (already on `goal`)
and the band threshold token — both available from `goal`. Parse `^track-band>=(\w+)$`,
resolve the min band rank, collect core tracks `= Object.entries(goal.trackWeights).filter(([,w]) => w >= 1).map(([t]) => t)`, return concepts in those tracks with `BAND_RANK[c.band] >= min`.

Proposed presets (track slugs verified against `tracks.json`; weights are calibratable —
core = 1.0 targeted, support = 0.6–0.9 order-only):

```jsonc
// frontend-dev
{ "id": "frontend-dev",
  "label": { "en": "Become a frontend developer", "ru": "Стать frontend-разработчиком" },
  "target": { "rule": "track-band>=middle" },
  "trackWeights": {
    "frontend": 1, "browser": 1, "typescript": 1, "js-engine": 1,   // core (targeted)
    "performance": 0.8, "apis": 0.7, "networking": 0.6, "security": 0.6 } }  // support

// fullstack-dev
{ "id": "fullstack-dev",
  "label": { "en": "Become a fullstack developer", "ru": "Стать fullstack-разработчиком" },
  "target": { "rule": "track-band>=middle" },
  "trackWeights": {
    "frontend": 1, "backend": 1, "databases": 1, "apis": 1, "typescript": 1,  // core
    "system-design": 0.9, "node": 0.8, "caching": 0.7, "networking": 0.7,
    "browser": 0.7, "security": 0.6 } }  // support

// devops-engineer
{ "id": "devops-engineer",
  "label": { "en": "Become a DevOps engineer", "ru": "Стать DevOps-инженером" },
  "target": { "rule": "track-band>=middle" },
  "trackWeights": {
    "ci-cd": 1, "aws": 1, "deployment": 1, "observability": 1, "networking": 1,  // core
    "distributed": 0.8, "security": 0.8, "system-design": 0.7, "backend": 0.6 } }  // support
```

Final weights/track membership are finalized during implementation against real
unit/concept counts; the spec fixes the *mechanism*, not the exact numbers.

### Part 2 — Depth as a real time lever (`tier-effort.ts`, `schedule.ts`)

New pure module `scripts/path/tier-effort.ts`:

```ts
export function tierEffort(tier: Tier): number   // junior 0.65, middle 1.0, senior 1.25
```

A skim (junior) costs ~0.65× the canonical `estMin`; a deep senior read ~1.25×. `estMin`
remains the canonical middle-tier figure (no content change).

`schedulePlan(path, cfg, now)` gains the tier: scale each step's effective minutes and the
`required` total by `tierEffort(tier)` before packing/feasibility. Signature change:
`schedulePlan(path, cfg, now, tier)` where `tier = string-tier of cfg.depthTier` (the
per-track map case collapses to `middle` for v1, matching existing `currentTier()` logic).
`computePath()` passes `depthTier`. The path *membership* is unchanged — junior and senior
study the same units; only the time budget differs. The budget bar, verdict, dated
schedule, and dropped-tail all recompute from the scaled minutes, so lowering depth
genuinely closes the gap.

### Part 3 — Optimization suggestions (`optimize.ts`)

New pure module `scripts/path/optimize.ts`:

```ts
export type FixKind = "raise-hours" | "extend-date" | "lower-depth" | "drop-goal" | "exclude-track";
export interface Fix {
  kind: FixKind;
  deltaMin: number;          // minutes the lever adds to availability OR removes from required
  closesGap: boolean;        // does this single lever flip verdict to fits?
  patch: FixPatch;           // descriptor the adapter applies via existing mutators
  meta?: { goalId?: string; track?: string; days?: number; hours?: number; tier?: Tier };
}
export interface OptimizeInput {
  schedule: Schedule;        // current (over/fits/under) — provides deficitMin
  requiredMin: number; availMin: number;
  tier: Tier;                // for lower-depth delta via tierEffort
  goals: { id: string; rank: number; label; estMinShare: number }[];  // lowest-rank droppable
  tracks: { track: string; weight: number; estMin: number }[];        // lowest-weight excludable
  deadline: DeadlineConfig;
}
export function suggestFixes(input: OptimizeInput): Fix[];
export function bestCombo(fixes: Fix[], deficitMin: number): Fix[];  // minimal closing set
```

Levers and their computed deltas:
- **raise-hours** +0.5 / +1 h on each active weekday → Δavail = added-hours × remaining
  weekday count to the date.
- **extend-date** +7 / +14 days → Δavail = sum of weekday hours over the added span.
- **lower-depth** one tier step → Δrequired = `required × (1 − tierEffort(lower)/tierEffort(current))`.
- **drop-goal** lowest-rank active goal → Δrequired = minutes of units that leave the
  frontier when that goal is removed (computed by the adapter via a trial recompute, fed in
  as `estMinShare`).
- **exclude-track** lowest-weight non-core track → Δrequired = minutes of its units in the
  path.

`suggestFixes` sorts least-disruptive first (raise-hours < extend-date < lower-depth <
exclude-track < drop-goal) and flags each `closesGap`. `bestCombo` returns the minimal
ordered set whose summed delta covers the deficit. The component renders the list with one
"apply" button per fix and an "optimize for me" button that applies `bestCombo` through
existing mutators (`setKnob`, `setGoals`, `setDeadline`, `toggleExcludedTrack`). The pure
module returns **descriptors only** — it touches no signals.

The trial recompute for `drop-goal` / `exclude-track` deltas runs in `path-io.ts` (impure):
recompute the path with the candidate goal/track removed, diff total `estMin`. This stays
out of the pure module, which receives the precomputed `estMinShare`/`estMin`.

### Part 4 — Pace tracking (`pace.ts` + `DeadlineConfig`)

`DeadlineConfig` gains two fields (additive, optional for back-compat):

```ts
startedAtMs?: number;        // set when the deadline is first activated
baselineRequiredMin?: number;// snapshot of scaled required minutes at activation; re-snapshot if scope grows
```

`path-io.ts` sets/refreshes these in `setDeadline` / on activation: on first activation,
stamp `startedAtMs = now` and `baselineRequiredMin = currentScaledRequired`. On later writes,
if the current required exceeds the stored baseline (user added scope), raise the baseline to
match (so "done" never goes negative); otherwise keep it.

New pure module `scripts/path/pace.ts`:

```ts
export type PaceStatus = "ahead" | "on-track" | "behind" | "no-data";
export interface Pace {
  doneMin: number; expectedDoneMin: number; ratio: number;
  status: PaceStatus; projectedFinishMs: number | null; behindDays: number;
}
export function pace(baselineMin: number, currentRequiredMin: number,
                     startedAtMs: number, nowMs: number, targetMs: number): Pace;
```

- `doneMin = max(0, baselineMin − currentRequiredMin)` (work that left the path).
- `elapsedFrac = clamp01((now − start) / (target − start))`.
- `expectedDoneMin = baselineMin × elapsedFrac`.
- `ratio = expectedDoneMin > 0 ? doneMin / expectedDoneMin : 1`.
- `status`: `behind` if ratio < ~0.9, `ahead` if > ~1.1, else `on-track`; `no-data` until
  enough time has elapsed (`elapsedFrac` below a small floor) to avoid noise on day 0.
- `projectedFinishMs`: rate `= doneMin / (now − start)`; `null` if rate ≈ 0, else
  `now + currentRequiredMin / rate`.
- `behindDays`: `max(0, ceil((projectedFinishMs − targetMs) / DAY))`.

`DeadlineOutput` shows a pace row: "Done X of Y h · ~N days behind at current pace ·
projected finish &lt;date&gt;". When `status === "behind"`, the optimization suggestions
(Part 3) re-rank toward catch-up levers (raise-hours / extend-date / lower-depth first).

### Part 5 — "Today" focus card

A prominent card at the top of the planning area (below the cold-start banner):
- **Deadline set:** today's plan from `schedule.days[0]` — unit titles + total minutes +
  a Start link to the first unit's first lesson (reuse `NextPath`'s `startHrefFor`).
- **No deadline:** `path.steps[0]` as "next up" + Start.
- **Behind / over budget:** append the top catch-up action inline ("Behind ~N days —
  raise to X h/weekday?" with an apply button) sourced from `bestCombo`.
- Empty path → encouraging "nothing due / goal complete" state.

Lives as a new thin component `planning/TodayFocus.tsx`, reading `computePath()` +
`pace()` + `suggestFixes()`.

### Part 6 — Layout reorder (`PathView.tsx`)

New section order:

```
XP strip · cold-start banner · droppedLocal warning
TODAY focus            (Part 5)
01 · GOAL              (GoalSection + inline refine block — Part 8)
02 · DEADLINE          (DeadlineSection + suggestions + pace — Parts 2–4, 7)
03 · PATH              (NextPath — the long dependency-ordered list)
04 · MAP               (ConceptMasteryMap — moved down)
Advanced knobs         (AdvancedKnobs → PathConfigDrawer)
```

Planning (goal + deadline) now sits above the path and mastery list. Section index labels
and `L` strings update (`secGoal/secDl/secPath/secMap` renumbered). `screen-section`
markup pattern is reused unchanged.

### Part 7 — Reusable hours picker (`planning/HoursPicker.tsx`)

Extract the weekday-hours control into one component with **explicit −/+ buttons** per day
(plus keep wheel + arrow-key support, with proper `role="spinbutton"` a11y). Props:
`{ lang, hours: number[], onSet(i, v), min?, max?, step? }`. Renders the 7-day grid with a
clear value + unit and a week-total note. Replaces:
- `DeadlineSection`'s click-only `WeekHoursGrid` (deleted),
- `GoalPicker`'s native number spinners (deleted with the modal).

Clamp helper (`clampHour`) and the `DAY_KEYS`/day-label arrays move into the shared
component.

### Part 8 — Priority semantics + de-dup

**Priority.** Field stays `priority: number` but its meaning is fixed: **lower = more
important, 1 = top**. A new pure helper normalizes whatever numbers the user enters into
consecutive ranks:

```ts
// scripts/path/goal-rank.ts
export function normalizeRanks(goals: {id; priority}[]): {id; rank: number}[]; // sort by priority asc, assign 1..N
export function goalWeightFactor(rank: number, n: number): number;             // (n − rank + 1): rank 1 → n, rank n → 1
```

`planner.ts goalTrackWeight` switches from `× priority` to `× goalWeightFactor(rank, n)`
where `rank`/`n` come from `normalizeRanks(config.goals)`. Rank 1 now genuinely dominates,
matching the label.

`GoalSection` shows the rank (1, 2, 3…) with reorder controls (↑/↓ or drag) and a live
one-line explainer per active goal: "#1 → its tracks get the most time (~X%)", where X% is
that goal's `goalWeightFactor` share of the total. Toggling on appends at the next rank;
reordering rewrites priorities to the new order.

**De-dup.** Delete `GoalPicker.tsx` and its `modal === "goals"` wiring in `PathView`.
Move its two unique features into an inline collapsible "refine goal" block under the GOAL
section:
- **custom targets** — `searchConcepts` input + selected-target chips (`toggleCustomTarget`).
- **excluded tracks** — the track chips (`toggleExcludedTrack`).

The GOAL section's "+ Custom goal" card becomes a "Refine / custom targets" toggle that
expands this block in place. The single deadline editor is `DeadlineSection`; all deadline
writes go through it (consistent local-tz handling).

## 5. New / changed files

**New (pure, unit-tested):**
- `scripts/path/tier-effort.ts`
- `scripts/path/optimize.ts`
- `scripts/path/pace.ts`
- `scripts/path/goal-rank.ts`

**New (components):**
- `components/path/planning/TodayFocus.tsx`
- `components/path/planning/HoursPicker.tsx`

**Changed:**
- `content/path/goals.json` (+3 presets)
- `scripts/path/planner.ts` (`track-band>=` rule; rank-based `goalTrackWeight`)
- `scripts/path/schedule.ts` (tier-scaled minutes)
- `scripts/path/types.ts` (`DeadlineConfig.startedAtMs`, `.baselineRequiredMin`)
- `scripts/path/path-io.ts` (pass tier to `schedulePlan`; baseline stamping; trial-recompute
  deltas for drop-goal/exclude-track; optimize/pace wiring)
- `components/path/PathView.tsx` (layout order; remove goals modal; add TodayFocus)
- `components/path/planning/GoalSection.tsx` (rank UI + explainer + inline refine block)
- `components/path/planning/DeadlineSection.tsx` (use HoursPicker; suggestions panel; pace row)

**Deleted:**
- `components/path/GoalPicker.tsx`

## 6. Testing

Unit tests (Vitest, pure modules — no `astro:content`, mirror fixtures like existing
`scripts/path/*.test.ts`):
- `tier-effort`: monotonic, middle = 1.0.
- `optimize`: each lever's delta; `closesGap` flag; `bestCombo` minimality; behind-mode
  re-ranking.
- `pace`: done/expected/ratio; status thresholds; projectedFinish guards (rate 0 → null);
  behindDays; `no-data` floor; back-compat when `startedAtMs` absent.
- `goal-rank`: `normalizeRanks` collapses arbitrary numbers to 1..N by ascending priority;
  `goalWeightFactor` inversion (rank 1 = max).
- `planner`: `track-band>=middle` resolves only core-track (weight ≥ 1) mid+ concepts;
  rank-weighted ordering puts rank-1 goal's tracks first.
- `schedule`: tier scaling changes `required` and feasibility verdict as expected.

Integration: extend `engine.integration.test.ts` for a role goal + deadline + lowered
depth flipping `over → fits`.

Build/verify: `bun run build` in `site/` (Astro + 9-rule linter) must stay lint-clean at
the current page count; full test suite green. No `run`-tagged samples touched.

## 7. Calibration knobs (tune during implementation, not architecture)

- `tierEffort` values (0.65 / 1.0 / 1.25).
- Role `trackWeights` membership and weights.
- Suggestion increments (+0.5/+1 h, +7/+14 d) and lever ordering.
- Pace status thresholds (~0.9 / ~1.1) and the `no-data` elapsed floor.

## 8. Risks

- **Frontier size:** `track-band>=middle` on broad tracks (e.g. `browser` 277 mid+) yields
  large targets. Mitigated by core-track-only targeting and the depth/deadline levers; the
  build linter and a manual roadmap check confirm path length stays sane.
- **Baseline staleness:** changing goals/depth mid-deadline shifts required minutes. The
  raise-on-growth rule prevents negative "done"; a materially smaller required (goal
  dropped) simply reads as ahead — acceptable for v1; documented.
- **i18n parity:** every new string lands EN+RU in component `L` maps; glossary unaffected
  (no new locked terms).
- **Removing `GoalPicker`:** must re-home custom-targets + excluded-tracks before deleting,
  or those affordances vanish. Sequenced in the plan (add inline block → verify → delete
  modal).
