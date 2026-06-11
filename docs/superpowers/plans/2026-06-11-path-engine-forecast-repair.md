# Path Engine Forecast Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the path engine's time forecast (deadline feasibility, pace, fix suggestions) truthful: fix the day-packing bug that falsely reports "over" for any unit longer than one study day, wire real study progress (graded practice) and time decay into concept knowledge, stop over-counting unit minutes, and rebase pace on the study-day calendar.

**Architecture:** All changes live in the pure core `site/src/scripts/path/*` plus its impure adapter `path-io.ts` and 6 display components. The pure core stays clock-free and localStorage-free; only `path-io.ts` touches `Date.now()`/`localStorage` (existing contract, do not violate it). Every task is TDD against the existing Vitest suite (`bun test` in `site/`).

**Tech Stack:** TypeScript, Vitest (`bun test`), Preact signals, Astro 5 MPA. Tests for the path engine live next to sources (`site/src/scripts/path/*.test.ts`).

**Background (verified findings, 2026-06-11 analysis):**
1. `schedulePlan` (`schedule.ts:78-85`) never splits a step across days; a step whose scaled cost exceeds every single day's minutes scans all days and `break`s — that step **and the whole tail of the path** are dropped, verdict becomes `"over"` with `deltaMin` = sum of all dropped costs. Default hours (`DeadlineSection.tsx:96`) max out at 120 min/day while 155/337 units have `estMin > 120` (p50=75, p90=295, max=404) → deadline mode is effectively always falsely "over", and `currentFixes()` then suggests scope cuts that cannot help.
2. Reading lessons and passing graded practice never move concept knowledge — `applyActivity` is exported but called nowhere. Knowledge only moves via pretest seed, quick-check diagnostics, declare/skip. Pace therefore shows "behind" for a learner who genuinely studies. Objective per-lesson practice progress already exists in localStorage under `atlas.practice.<track>/<unit>/<lesson>` (statuses `seen|attempted|done`, written by `PracticeSection.tsx`).
3. `decay()` (`knowledge.ts:73`) is called nowhere, and the default `decayFloor` 0.85 > `masteryThreshold` 0.6 means it could never un-know a concept anyway.
4. `conceptsToUnits` (`planner.ts:70-73`) pulls in every unit that teaches ≥1 missing concept at full `estMin` — 630 concepts are taught by 2+ units → double-counted minutes; a unit with 1 missing concept of 6 still costs its full authored minutes.
5. `pace()` extrapolates wall-clock rate ignoring `perWeekdayHours`/blackouts; baseline is only raised inside `setDeadline`, so content growth reads as regress.
6. `studyDays` excludes the deadline day itself (`d < endDay`).
7. `bestCombo` can stack `raise-hours +0.5h` and `+1h` (alternatives, not additive).
8. `weights.prior` and `weights.recency` are clamped but never read anywhere (verified by grep). `weights.lessons` (0.35) and `weights.practice` (0.4) are also currently dead — Task 4 revives them with their evidently intended meaning: `0.35*read + 0.4*practiced = 0.75 ≥ 0.6 threshold`.

**Out of scope (explicitly, do not do):** wiring `srsDue` / `interleaveReviews` (the `/review` surface is separate; `srsAggressiveness` stays inert), partial-today budgeting, `DATA_FLOOR` tuning, the `applyDiagnostic`-overrides-declared-unknown question, calibrating tier multipliers from realized speed, and any UI redesign. No new dependencies. No changes to content JSON.

**Working directory for all commands:** `/Users/artemmac/dev/awesome-everything/site`

**Conventions:** run targeted tests as `bun test src/scripts/path/<file>.test.ts`; run the full suite as `bun test`. Commit after every task. Comment style: explain constraints, not change history — never write "fixed bug" / "new behavior" comments.

---

### Task 1: schedulePlan — split steps across days

A step must occupy as many days as it needs. Placement then has zero waste, so "unplaced" ⟺ `required > available`, and `feasibility()` can compute the honest verdict from totals.

**Files:**
- Modify: `src/scripts/path/schedule.ts:76-92` (the placement loop + feasibility call in `schedulePlan`)
- Test: `src/scripts/path/schedule.test.ts`

- [x] **Step 1: Update the test fixture and rewrite the packing tests**

In `src/scripts/path/schedule.test.ts`, change the `cfg` helper's default target to `+ 6 * DAY` (Sunday; weekend hours are 0, so the weekly budget stays 600 min — this also keeps the arithmetic stable when Task 2 makes the end day inclusive):

```ts
const cfg = (over: Partial<DeadlineConfig> = {}): DeadlineConfig => ({
  targetDateMs: MON_2026_06_08 + 6 * DAY,            // Sunday; Mon..Fri 2h → 600 min budget
  perWeekdayHours: [2, 2, 2, 2, 2, 0, 0],            // Mon..Fri 2h, weekend off
  tzOffsetMin: 0,
  ...over,
});
```

Replace the test `"schedulePlan packs steps into days up to each day's minutes"` (currently asserts day0=["a"], day1=["b"]) with:

```ts
it("schedulePlan splits a step across days instead of wasting day tails", () => {
  const path = { steps: [step("a", 90), step("b", 90), step("c", 90)] };
  const s = schedulePlan(path, cfg(), MON_2026_06_08);
  // 120-min days: day0 = a(90)+b(30), day1 = b(60)+c(60), day2 = c(30)
  expect(s.days[0].steps.map((x) => x.unit)).toEqual(["a", "b"]);
  expect(s.days[1].steps.map((x) => x.unit)).toEqual(["b", "c"]);
  expect(s.days[2].steps.map((x) => x.unit)).toEqual(["c"]);
  expect(s.feasibility.verdict).not.toBe("over"); // 270 required, 600 available
  expect(s.countdownDays).toBe(6);
});
```

Replace the test `"schedulePlan reports an unplaceable oversized step as over, not fits"` with the inverse — the bug this plan fixes:

```ts
it("a step larger than any single day is split, not dropped (the false-over bug)", () => {
  // 200-min step, 120-min days: occupies day0 (120) + day1 (80). Used to fall off entirely.
  const s = schedulePlan({ steps: [step("big", 200)] }, cfg(), MON_2026_06_08);
  expect(s.feasibility.verdict).not.toBe("over");
  expect(s.days[0].steps.map((x) => x.unit)).toEqual(["big"]);
  expect(s.days[1].steps.map((x) => x.unit)).toEqual(["big"]);
  expect(s.feasibility.dropped).toEqual([]);
});

it("over verdict reports the honest total deficit and drops only the true overflow", () => {
  // 6 × 120 = 720 required > 600 available → exactly the last unit fails to place.
  const path = { steps: Array.from({ length: 6 }, (_, i) => step(`u${i}`, 120)) };
  const s = schedulePlan(path, cfg(), MON_2026_06_08);
  expect(s.feasibility.verdict).toBe("over");
  expect(s.feasibility.deltaMin).toBe(120);          // required − available, not sum-of-dropped
  expect(s.feasibility.dropped).toEqual(["u5"]);
});
```

Replace the two tier tests `"junior packs more (or equal) steps than senior in the same budget"` and `"senior depth can flip fits → over (deep-read costs 1.25x)"` (step-entry counts are meaningless once steps span multiple days) with verdict-based assertions:

```ts
it("tier scales the verdict: junior under, middle fits, senior over on the same path", () => {
  // budget 600; 5 × 100 → junior 325 (600 > 325*1.25 → under), middle 500 (fits), senior 625 (over)
  const path = { steps: Array.from({ length: 5 }, (_, i) => step(`u${i}`, 100)) };
  expect(schedulePlan(path, cfg(), MON_2026_06_08, "junior").feasibility.verdict).toBe("under");
  expect(schedulePlan(path, cfg(), MON_2026_06_08, "middle").feasibility.verdict).toBe("fits");
  expect(schedulePlan(path, cfg(), MON_2026_06_08, "senior").feasibility.verdict).toBe("over");
  expect(tierEffort("senior")).toBe(1.25); // anchors the arithmetic above
});
```

Keep `"defaults to middle (1.0) when tier omitted"` unchanged. Keep all `studyDays`/`feasibility` unit tests unchanged (Task 2 touches them).

- [x] **Step 2: Run tests to verify the new ones fail**

Run: `bun test src/scripts/path/schedule.test.ts`
Expected: FAIL — "a step larger than any single day is split" (verdict is `"over"`), "splits a step across days" (day0 is `["a"]`), "over verdict reports the honest total deficit" (deltaMin is 720, dropped has 6 entries — the tail-drop bug).

- [x] **Step 3: Rewrite the placement loop in `schedulePlan`**

In `src/scripts/path/schedule.ts`, replace lines 76-92 (from `let di = 0, used = 0;` through the `feas` assignment) with:

```ts
  // Place steps in path order, splitting a step across as many days as it needs — a unit's
  // scaled cost routinely exceeds a single day's budget (median unit 75 min, p90 295 min vs a
  // 1–2 h day). A step appears in every day it occupies; budgeting uses the scaled cost while
  // the step keeps its canonical estMin for display. Splitting wastes nothing, so a step is
  // unplaced iff the total budget is exhausted.
  let di = 0, used = 0;
  const placed = new Set<string>();
  outer: for (const step of path.steps) {
    let left = scale(step.estMin);
    while (left > 0) {
      while (di < plan.length && used >= plan[di].minutes) { di++; used = 0; }
      if (di >= plan.length) break outer;
      plan[di].steps.push(step);
      const take = Math.min(plan[di].minutes - used, left);
      used += take;
      left -= take;
    }
    placed.add(step.unit);
  }
  // roi here is a cost-only placeholder (1/cost): with no per-step value field yet, longer
  // steps are dropped first. Replace with value/cost once steps carry a learning-value weight.
  const dropUnits = path.steps.filter((s) => !placed.has(s.unit))
    .map((s) => ({ id: s.unit, estMin: scale(s.estMin), roi: 1 / Math.max(1, scale(s.estMin)) }));
  const feas: Feasibility = feasibility(required, available, dropUnits);
```

Note: the old special-case branch (`dropUnits.length ? {verdict:"over", deltaMin: sum-of-dropped, ...} : feasibility(...)`) is deleted — `feasibility()` now always computes the verdict, and its `deltaMin` for "over" is the honest `required − available`. The `placed` set is still keyed by `s.unit` (unit ids are unique within a path).

- [x] **Step 4: Run tests to verify they pass**

Run: `bun test src/scripts/path/schedule.test.ts`
Expected: PASS (all tests in the file).

- [x] **Step 5: Run the full path suite to catch downstream breakage**

Run: `bun test src/scripts/path/`
Expected: PASS. If `engine.integration.test.ts` or `path-io.test.ts` assert old packing behavior (dropped lists / verdicts), update those assertions to the split semantics from Step 1 — verdicts must come from totals, a long step may appear on several days.

- [x] **Step 6: Commit**

```bash
git add src/scripts/path/schedule.ts src/scripts/path/schedule.test.ts
git commit -m "fix(path): split schedule steps across days; honest over-deficit from totals"
```

---

### Task 2: studyDays — make the deadline day a study day

The user picks "finish by June 30" — June 30 itself must be available for study. Currently `d < endDay` excludes it.

**Files:**
- Modify: `src/scripts/path/schedule.ts:34`
- Test: `src/scripts/path/schedule.test.ts`

- [ ] **Step 1: Update the three direct `studyDays` tests to expect the inclusive end day**

In `src/scripts/path/schedule.test.ts`:

```ts
it("studyDays enumerates days with hours, deadline day inclusive", () => {
  const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0);
  // Mon..Fri + the deadline Monday itself; weekend skipped
  expect(days.map((d) => d.date)).toEqual(
    ["2026-06-08","2026-06-09","2026-06-10","2026-06-11","2026-06-12","2026-06-15"]);
  expect(days[0].minutes).toBe(120);
});

it("blackoutDates remove a day", () => {
  const days = studyDays(MON_2026_06_08, MON_2026_06_08 + 3 * DAY, [2,2,2,2,2,0,0], ["2026-06-09"], 0);
  expect(days.map((d) => d.date)).toEqual(["2026-06-08","2026-06-10","2026-06-11"]); // Thu (deadline) included
});

it("availableMinutes sums the window including the deadline day", () => {
  expect(availableMinutes(studyDays(MON_2026_06_08, MON_2026_06_08 + 7 * DAY, [2,2,2,2,2,0,0], [], 0))).toBe(720);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/scripts/path/schedule.test.ts`
Expected: FAIL — 3 tests (missing the end-day entry / 600 vs 720).

- [ ] **Step 3: Make the loop inclusive**

In `src/scripts/path/schedule.ts` line 34, change:

```ts
  for (let d = startDay; d < endDay; d++) {
```

to:

```ts
  // Inclusive: the deadline day itself is a study day ("finish BY June 30" includes June 30).
  for (let d = startDay; d <= endDay; d++) {
```

- [ ] **Step 4: Run the path suite**

Run: `bun test src/scripts/path/`
Expected: PASS. The `schedulePlan` tests are unaffected because the Task 1 fixture targets a 0-hour Sunday. If any other test counts days from `studyDays`, adjust it for the one extra (inclusive) day.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/schedule.ts src/scripts/path/schedule.test.ts
git commit -m "fix(path): include the deadline day in the study-day budget"
```

---

### Task 3: pace — study-day calendar instead of wall-clock, baseline guard

`pace()` must measure progress against planned study minutes (so a weekends-only learner isn't "behind" every Wednesday) and project the finish date by walking the future study-day calendar. `currentPace()` must never report regress when scope grows (content updates raise `required` above the stored baseline).

**Files:**
- Modify: `src/scripts/path/pace.ts` (full rewrite below)
- Modify: `src/scripts/path/path-io.ts:369-377` (`currentPace`)
- Test: `src/scripts/path/pace.test.ts` (full rewrite below)

- [ ] **Step 1: Rewrite `pace.test.ts`**

Replace the entire file content with:

```ts
// src/scripts/path/pace.test.ts
import { describe, it, expect } from "vitest";
import { pace } from "./pace";

const DAY = 86_400_000;
const D0 = Date.UTC(2026, 6, 1); // 2026-07-01 — "now" in all tests
const iso = (i: number) => new Date(D0 + i * DAY).toISOString().slice(0, 10);
// n future study days of `min` minutes each, starting today (2026-07-01).
const futureDays = (n: number, min = 120) =>
  Array.from({ length: n }, (_, i) => ({ date: iso(i), minutes: min }));

const base = {
  baselineMin: 1000, currentRequiredMin: 500,
  elapsedAvailMin: 600, totalAvailMin: 1200,
  futureDays: futureDays(40), targetMs: D0 + 14 * DAY, nowMs: D0,
};

describe("pace", () => {
  it("on-track: done matches the elapsed share of planned study minutes", () => {
    const p = pace(base); // 500 done vs expected 1000 * (600/1200) = 500
    expect(p.doneMin).toBe(500);
    expect(p.expectedDoneMin).toBe(500);
    expect(p.status).toBe("on-track");
  });

  it("behind: done lags planned minutes; projection walks the study-day calendar", () => {
    const p = pace({ ...base, currentRequiredMin: 800 }); // 200 done at 50% of planned minutes
    expect(p.status).toBe("behind");
    // rate = 200/600 per planned minute; 800 remaining needs 2400 planned minutes = 20 study
    // days from 2026-07-01 → finishes 2026-07-20, 5 days past the 2026-07-15 target.
    expect(p.projectedFinishMs).toBe(Date.parse("2026-07-20T00:00:00Z"));
    expect(p.behindDays).toBe(5);
  });

  it("ahead: done exceeds the planned-minutes expectation", () => {
    expect(pace({ ...base, currentRequiredMin: 200 }).status).toBe("ahead"); // 800 done vs 500 expected
  });

  it("no-data before the elapsed floor (avoids day-0 noise)", () => {
    expect(pace({ ...base, elapsedAvailMin: 30, currentRequiredMin: 1000 }).status).toBe("no-data"); // 2.5% < 5%
  });

  it("projectedFinish is null when nothing is done yet (rate 0)", () => {
    expect(pace({ ...base, currentRequiredMin: 1000 }).projectedFinishMs).toBeNull();
  });

  it("projection beyond the supplied horizon clamps to the last horizon day", () => {
    // needs 20 study days, only 5 supplied → clamps to 2026-07-05 (status is still ratio-driven)
    const p = pace({ ...base, currentRequiredMin: 800, futureDays: futureDays(5) });
    expect(p.projectedFinishMs).toBe(Date.parse("2026-07-05T00:00:00Z"));
    expect(p.status).toBe("behind");
  });

  it("scope growth never reads as negative progress", () => {
    const p = pace({ ...base, currentRequiredMin: 1500 }); // required above baseline
    expect(p.doneMin).toBe(0);
    expect(p.status).toBe("behind");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test src/scripts/path/pace.test.ts`
Expected: FAIL — `pace` is called with one object argument but currently takes five positional ones (TypeScript error or runtime NaN assertions).

- [ ] **Step 3: Rewrite `pace.ts`**

Replace the entire file content with:

```ts
// src/scripts/path/pace.ts
// Pure: planned-vs-completed pace against a deadline, measured in PLANNED STUDY MINUTES, not
// wall-clock — a weekends-only learner must not drift "behind" every weekday. "Done" is inferred
// from the baseline snapshot (required minutes when the deadline was set) minus what currently
// remains. No clock here; all calendar math is injected by the caller (path-io currentPace).
const DAY = 86_400_000;
const BEHIND = 0.9;       // ratio below this → behind
const AHEAD = 1.1;        // ratio above this → ahead
const DATA_FLOOR = 0.05;  // need >5% of planned minutes elapsed before a verdict (day-0 noise guard)

export type PaceStatus = "ahead" | "on-track" | "behind" | "no-data";
export interface Pace {
  doneMin: number;
  expectedDoneMin: number;
  ratio: number;
  status: PaceStatus;
  projectedFinishMs: number | null;
  behindDays: number;
}

export interface PaceInputs {
  baselineMin: number;        // scaled required minutes when the deadline was activated
  currentRequiredMin: number; // scaled required minutes remaining now
  elapsedAvailMin: number;    // planned study minutes from activation to now
  totalAvailMin: number;      // planned study minutes from activation to the target date
  futureDays: { date: string; minutes: number }[]; // study days from now to an extended horizon
  targetMs: number;
  nowMs: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function pace(inp: PaceInputs): Pace {
  const { baselineMin, currentRequiredMin, elapsedAvailMin, totalAvailMin, futureDays, targetMs, nowMs } = inp;
  const elapsedFrac = totalAvailMin > 0 ? clamp01(elapsedAvailMin / totalAvailMin) : 0;
  const doneMin = Math.max(0, baselineMin - currentRequiredMin);
  const expectedDoneMin = baselineMin * elapsedFrac;
  const ratio = expectedDoneMin > 0 ? doneMin / expectedDoneMin : 1;

  // Projected finish: realized productivity per PLANNED study minute, walked over the future
  // study-day calendar. Clamps to the supplied horizon's last day when the rate is too low to
  // cover the remaining work inside it; null until there's a non-zero rate to extrapolate.
  const rate = elapsedAvailMin > 0 ? doneMin / elapsedAvailMin : 0;
  let projectedFinishMs: number | null = null;
  if (currentRequiredMin === 0) {
    projectedFinishMs = nowMs;
  } else if (rate > 0 && futureDays.length) {
    let needAvail = currentRequiredMin / rate;
    for (const d of futureDays) {
      needAvail -= d.minutes;
      if (needAvail <= 0) { projectedFinishMs = Date.parse(`${d.date}T00:00:00Z`); break; }
    }
    if (projectedFinishMs === null) projectedFinishMs = Date.parse(`${futureDays[futureDays.length - 1].date}T00:00:00Z`);
  }
  const behindDays = projectedFinishMs !== null && projectedFinishMs > targetMs
    ? Math.ceil((projectedFinishMs - targetMs) / DAY) : 0;

  let status: PaceStatus;
  if (elapsedFrac < DATA_FLOOR) status = "no-data";
  else if (ratio < BEHIND) status = "behind";
  else if (ratio > AHEAD) status = "ahead";
  else status = "on-track";

  return { doneMin, expectedDoneMin, ratio, status, projectedFinishMs, behindDays };
}
```

Note: the `Pace` result interface is unchanged on purpose — `DeadlineSection.tsx` and `TodayFocus.tsx` consume `doneMin`/`projectedFinishMs`/`behindDays`/`status` and need no edits. `projectedFinishMs` is the UTC midnight of a civil study-day date while `targetMs` is a local midnight; `behindDays` uses `ceil`, so the ≤24 h skew can shift the count by at most one day — acceptable for a "~N days behind" label.

- [ ] **Step 4: Update `currentPace()` in `path-io.ts`**

Replace the `currentPace` function (`path-io.ts:369-377`) with:

```ts
export function currentPace(): Pace | null {
  const cfg = config.value;
  const dl = cfg.deadline;
  if (!dl?.startedAtMs || dl.baselineRequiredMin == null) return null;
  const { path } = computePath();
  const tier = tierOf(cfg);
  const required = path.steps.reduce((n, s) => n + Math.round(s.estMin * tierEffort(tier)), 0);
  // Scope growth (content updates re-adding units) must never read as regress: when required
  // exceeds the stored baseline, the baseline is effectively the new required.
  const baseline = Math.max(dl.baselineRequiredMin, required);
  const now = Date.now();
  const sd = (a: number, b: number) => studyDays(a, b, dl.perWeekdayHours, dl.blackoutDates ?? [], dl.tzOffsetMin);
  const HORIZON_MS = 365 * 86_400_000;
  return pace({
    baselineMin: baseline,
    currentRequiredMin: required,
    elapsedAvailMin: availableMinutes(sd(dl.startedAtMs, Math.min(now, dl.targetDateMs))),
    totalAvailMin: availableMinutes(sd(dl.startedAtMs, dl.targetDateMs)),
    futureDays: sd(now, dl.targetDateMs + HORIZON_MS),
    targetMs: dl.targetDateMs,
    nowMs: now,
  });
}
```

(`studyDays` and `availableMinutes` are already imported in `path-io.ts:114`.)

- [ ] **Step 5: Run tests and typecheck**

Run: `bun test src/scripts/path/ && bunx astro check 2>&1 | tail -5`
Expected: tests PASS; no new type errors (pre-existing astro-check noise, if any, is unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/scripts/path/pace.ts src/scripts/path/pace.test.ts src/scripts/path/path-io.ts
git commit -m "fix(path): pace measured in planned study minutes; baseline guard for scope growth"
```

---

### Task 4: wire graded practice into concept knowledge

Replace the never-called `applyActivity` with `applyStudyEvidence`: confidence target = `weights.lessons * touchedFrac + weights.practice * doneFrac` per unit. With defaults (0.35/0.4): touching a unit's lessons alone → 0.35 (shaky, below the 0.6 threshold); touching + completing graded practice → 0.75 (known → the unit leaves the path → the forecast and pace finally move). The adapter reads `atlas.practice.<track>/<unit>/<lesson>` localStorage entries on every page load (Astro MPA re-runs the module), idempotently.

**Files:**
- Modify: `src/scripts/path/knowledge.ts` (replace `applyActivity`; drop `ACTIVITY_CAP`)
- Modify: `src/scripts/path/planner.ts:56-58` (comment references `applyActivity`)
- Modify: `src/scripts/path/path-io.ts` (collector + init call)
- Test: `src/scripts/path/knowledge.test.ts`, `src/scripts/path/path-io.test.ts`

- [ ] **Step 1: Write the failing `applyStudyEvidence` test**

In `src/scripts/path/knowledge.test.ts`, replace the test `"applyActivity bumps taught concepts but never above ACTIVITY_CAP nor over diagnostic evidence"` with:

```ts
  it("applyStudyEvidence: reading alone stays shaky; reading + graded practice crosses the threshold", () => {
    let s = applyStudyEvidence(emptyState(), ["indexing"], 1, 0, 0.35, 0.4, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.35, 5);   // touched only → below 0.6
    s = applyStudyEvidence(s, ["indexing"], 1, 1, 0.35, 0.4, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.75, 5);   // touched + done → known
  });

  it("applyStudyEvidence never lowers and never overrides diagnostic/declared evidence", () => {
    let s = applyDiagnostic(emptyState(), g, "indexing", 0.2, NOW); // failed quick-check
    s = applyStudyEvidence(s, ["indexing"], 1, 1, 0.35, 0.4, NOW);
    expect(masteryOf(s, "indexing")).toBeCloseTo(0.2, 5);          // diagnostic wins
    let s2 = applyStudyEvidence(emptyState(), ["mvcc"], 1, 1, 0.35, 0.4, NOW);
    s2 = applyStudyEvidence(s2, ["mvcc"], 0.5, 0, 0.35, 0.4, NOW); // weaker later evidence
    expect(masteryOf(s2, "mvcc")).toBeCloseTo(0.75, 5);            // never lowered
  });
```

Update the import at the top of the file: replace `applyActivity` and `ACTIVITY_CAP` with `applyStudyEvidence`:

```ts
import {
  emptyState, masteryOf, isKnown, applyDiagnostic, applyStudyEvidence, applySelfDeclare, decay,
  PROP_UP_FACTOR,
} from "./knowledge";
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test src/scripts/path/knowledge.test.ts`
Expected: FAIL — `applyStudyEvidence` is not exported.

- [ ] **Step 3: Replace `applyActivity` in `knowledge.ts`**

Delete the `ACTIVITY_CAP` constant (`knowledge.ts:9`) and replace the whole `applyActivity` function (`knowledge.ts:54-64`) with:

```ts
// Reading + graded-practice evidence for a unit's taught concepts. `touchedFrac` = share of the
// unit's lessons with any practice interaction, `doneFrac` = share with ≥1 task completed.
// Target = wLessons*touchedFrac + wPractice*doneFrac: with the default weights (0.35/0.4),
// reading alone stays below masteryThreshold (shaky), reading + passing practice crosses it —
// graded practice is objective enough to retire a unit from the path without a quick-check.
export function applyStudyEvidence(
  state: KnowledgeState, taught: string[], touchedFrac: number, doneFrac: number,
  wLessons: number, wPractice: number, now: number,
): KnowledgeState {
  let next = state;
  const target = clamp01(wLessons * clamp01(touchedFrac) + wPractice * clamp01(doneFrac));
  for (const c of taught) {
    const cur = next.get(c);
    if (cur && STRONG.includes(cur.source)) continue;     // never override stronger evidence
    if (masteryOf(next, c) >= target) continue;           // never lower
    next = setMastery(next, c, { confidence: target, source: "activity", lastAt: now });
  }
  return next;
}
```

In `src/scripts/path/planner.ts:56-58`, update the comment's function name (`applySelfDeclare/applyActivity do not` → `applySelfDeclare/applyStudyEvidence do not`).

- [ ] **Step 4: Run knowledge tests**

Run: `bun test src/scripts/path/knowledge.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing tests for the pure fraction collector**

Append to `src/scripts/path/path-io.test.ts`:

```ts
describe("unitPracticeFractions", () => {
  const counts = new Map([["docker/01-images", 4], ["go/02-slices", 2]]);
  it("groups lesson keys by unit and computes touched/done shares", () => {
    const progress = new Map<string, Record<string, string>>([
      ["docker/01-images/01-what-is-an-image", { t1: "done", t2: "seen" }],
      ["docker/01-images/02-layers",           { t1: "attempted" }],
      ["go/02-slices/01-intro",                { t1: "done" }],
    ]);
    const f = unitPracticeFractions(progress, counts);
    expect(f.get("docker/01-images")).toEqual({ touchedFrac: 0.5, doneFrac: 0.25 }); // 2/4 touched, 1/4 done
    expect(f.get("go/02-slices")).toEqual({ touchedFrac: 0.5, doneFrac: 0.5 });
  });
  it("ignores malformed keys, empty task maps, and unknown units", () => {
    const progress = new Map<string, Record<string, string>>([
      ["docker-lab-senior", { t1: "done" }],        // lab key — not <track>/<unit>/<lesson>
      ["docker/01-images/03-registries", {}],        // no interactions recorded
      ["ghost/99-unit/01-lesson", { t1: "done" }],   // unit absent from the content bundle
    ]);
    expect(unitPracticeFractions(progress, counts).size).toBe(0);
  });
});
```

Add `unitPracticeFractions` to the test file's import from `./path-io`.

- [ ] **Step 6: Run to verify it fails**

Run: `bun test src/scripts/path/path-io.test.ts`
Expected: FAIL — `unitPracticeFractions` is not exported.

- [ ] **Step 7: Add the collector + refresh to `path-io.ts`**

Update the knowledge import at `path-io.ts:115` to include the new function:

```ts
import { emptyState, applySelfDeclare, applyDiagnostic, applyStudyEvidence } from "./knowledge";
```

Insert the following block AFTER the three persistence `effect(...)` calls (after `path-io.ts:208`) — it reads the `config`/`knowledge` signals, so it must come after their declarations:

```ts
// ── study evidence: graded practice progress → concept confidence ──────────────
const PRACTICE_PREFIX = "atlas.practice.";
const unitLessonCounts = new Map<string, number>(
  (unitsJson as any[]).map((u) => [u.id as string, ((u.lessons as string[]) ?? []).length]),
);

// Pure (exported for tests): per-unit touched/done lesson shares from raw practice-progress
// maps keyed by lesson key ("<track>/<unit>/<lesson>"; PracticeSection's storage shape).
export function unitPracticeFractions(
  progress: Map<string, Record<string, string>>,
  lessonCounts: Map<string, number>,
): Map<string, { touchedFrac: number; doneFrac: number }> {
  const touched = new Map<string, Set<string>>();
  const done = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, unit: string, lesson: string) => {
    const s = m.get(unit) ?? new Set<string>();
    s.add(lesson);
    m.set(unit, s);
  };
  for (const [lessonKey, tasks] of progress) {
    const seg = lessonKey.split("/");
    if (seg.length < 3) continue; // lab keys and other non-lesson entries
    const unitId = `${seg[0]}/${seg[1]}`;
    const lesson = seg.slice(2).join("/");
    const statuses = Object.values(tasks ?? {});
    if (!statuses.length) continue;
    add(touched, unitId, lesson);
    if (statuses.includes("done")) add(done, unitId, lesson);
  }
  const out = new Map<string, { touchedFrac: number; doneFrac: number }>();
  for (const [unitId, set] of touched) {
    const count = lessonCounts.get(unitId) ?? 0;
    if (!count) continue;
    out.set(unitId, {
      touchedFrac: Math.min(1, set.size / count),
      doneFrac: Math.min(1, (done.get(unitId)?.size ?? 0) / count),
    });
  }
  return out;
}

function readPracticeProgress(): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  if (typeof window === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PRACTICE_PREFIX)) continue;
    try {
      const v = JSON.parse(localStorage.getItem(k) ?? "{}");
      if (v && typeof v === "object" && !Array.isArray(v)) out.set(k.slice(PRACTICE_PREFIX.length), v);
    } catch { /* corrupt entry — skip */ }
  }
  return out;
}

// Fold graded-practice progress into concept confidence. Idempotent and monotone: never lowers,
// never overrides diagnostic/declared evidence; when nothing increases, the signal keeps its
// reference, so running on every page load causes no persist churn.
export function refreshStudyEvidence(): void {
  const fractions = unitPracticeFractions(readPracticeProgress(), unitLessonCounts);
  if (!fractions.size) return;
  const { lessons: wL, practice: wP } = config.value.weights;
  const now = Date.now();
  let next = knowledge.value;
  for (const [unitId, f] of fractions) {
    const taught = teachesByUnit.get(unitId);
    if (taught) next = applyStudyEvidence(next, taught, f.touchedFrac, f.doneFrac, wL, wP, now);
  }
  knowledge.value = next;
}
if (typeof window !== "undefined") refreshStudyEvidence();
```

- [ ] **Step 8: Run the full path suite**

Run: `bun test src/scripts/path/`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/scripts/path/knowledge.ts src/scripts/path/knowledge.test.ts src/scripts/path/planner.ts src/scripts/path/path-io.ts src/scripts/path/path-io.test.ts
git commit -m "feat(path): graded practice progress feeds concept knowledge (applyStudyEvidence)"
```

---

### Task 5: wire decay as a read-model

`decay()` exists, is tested, and is never called; its default floor (0.85) sits above the mastery threshold (0.6), so it could never matter. Wire it as a non-persisted read-model: `effectiveKnowledge()` applies decay to the raw signal on every call. Never write the decayed values back — decay lerps from the current value, so persisting would compound it on every load.

**Files:**
- Modify: `src/scripts/path/config.ts` (default 0.3, clamp 0..0.5)
- Modify: `src/scripts/path/path-io.ts` (add `effectiveKnowledge`; use in `computePath`, `buildInputFor`, `nextCalibrationProbe`)
- Modify: `src/components/path/PathView.tsx:58`, `src/components/path/planning/NextPath.tsx:43`, `src/components/path/planning/ConceptMasteryMap.tsx:34`, `src/components/progression/DomainRadar.tsx:30`, `src/components/progression/MissionsList.tsx:20`
- Modify: `src/components/path/PathConfigDrawer.tsx:57-58` (slider max 0.5)
- Test: `src/scripts/path/config.test.ts`

- [ ] **Step 1: Write the failing config test**

In `src/scripts/path/config.test.ts`, add (and update any existing assertion that expects `decayFloor: 0.85` as the default):

```ts
  it("decayFloor defaults below masteryThreshold and clamps to [0, 0.5]", () => {
    expect(DEFAULT_CONFIG.weights.decayFloor).toBe(0.3);
    // a stored pre-repair config (0.85 — above the threshold, made decay a no-op) is pulled down
    expect(mergeConfig({ weights: { ...DEFAULT_CONFIG.weights, decayFloor: 0.85 } }).weights.decayFloor).toBe(0.5);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test src/scripts/path/config.test.ts`
Expected: FAIL (default is 0.85; clamp allows 0.85).

- [ ] **Step 3: Change the default and the clamp in `config.ts`**

Line 15: `decayFloor: 0.85` → `decayFloor: 0.3`.
Line 37: `decayFloor: clamp(c.weights.decayFloor, 0, 1)` → with a constraint comment:

```ts
      // must stay below masteryThreshold's floor (0.1..0.95): a decayFloor above the threshold
      // makes decay incapable of ever un-knowing a concept (the pre-repair 0.85 default bug)
      decayFloor: clamp(c.weights.decayFloor, 0, 0.5),
```

- [ ] **Step 4: Run config tests**

Run: `bun test src/scripts/path/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `effectiveKnowledge()` to `path-io.ts` and route readers through it**

Extend the knowledge import (from Task 4) with `decay`:

```ts
import { emptyState, applySelfDeclare, applyDiagnostic, applyStudyEvidence, decay } from "./knowledge";
```

Add right before `computePath` (after the `effectiveContent` block, `path-io.ts:~221`):

```ts
// Read-model: knowledge with time decay applied (stale confidence erodes toward decayFloor and
// re-enters the path). Always computed from the RAW signal — decay is never persisted, so it
// cannot compound across loads. Reading `knowledge.value` inside keeps signal subscriptions alive.
export function effectiveKnowledge(): KnowledgeState {
  return decay(knowledge.value, graph, Date.now(), config.value.weights.decayFloor);
}
```

Then switch the three in-file read sites from raw to effective:
- `computePath` (`path-io.ts:229`): `state: knowledge.value,` → `state: effectiveKnowledge(),`
- `buildInputFor` (`path-io.ts:242`): `state: knowledge.value,` → `state: effectiveKnowledge(),`
- `nextCalibrationProbe` (`path-io.ts:362`): `pickProbe(knowledge.value, ...)` → `pickProbe(effectiveKnowledge(), ...)`

Mutators (`declareKnown`, `skipUnit`, `applyDiagnosticResult`, `importState`, `refreshStudyEvidence`) keep reading/writing the RAW signal — they must compare against stored evidence, not the decayed view.

- [ ] **Step 6: Route the five display components through `effectiveKnowledge()`**

In each file, add `effectiveKnowledge` to the existing `~/scripts/path/path-io` import and replace the raw read (the `// subscribe` comments stay accurate — `effectiveKnowledge()` reads `knowledge.value` during render):
- `src/components/path/PathView.tsx:58`: `const k = knowledge.value;` → `const k = effectiveKnowledge();`
- `src/components/path/planning/NextPath.tsx:43`: `const state = knowledge.value;` → `const state = effectiveKnowledge();`
- `src/components/path/planning/ConceptMasteryMap.tsx:34`: `const state = knowledge.value;` → `const state = effectiveKnowledge();`
- `src/components/progression/DomainRadar.tsx:30`: `const state = knowledge.value;` → `const state = effectiveKnowledge();`
- `src/components/progression/MissionsList.tsx:20`: `domainRatings(knowledge.value, ...)` → `domainRatings(effectiveKnowledge(), ...)`

Leave `CalibrationFlow.tsx:71` as is (it only displays `knowledge.value.size`). If a replaced component no longer references `knowledge` directly, drop it from that file's import list.

- [ ] **Step 7: Update the decay slider bounds**

`src/components/path/PathConfigDrawer.tsx:58`: change the range input to `min={0} max={0.5} step={0.05}` (was `max={1}`).

- [ ] **Step 8: Run the full path suite + typecheck**

Run: `bun test src/scripts/path/ && bunx astro check 2>&1 | tail -5`
Expected: tests PASS; no new type errors. The pure `decay()` tests in `knowledge.test.ts` pass floor values as arguments and stay valid.

- [ ] **Step 9: Commit**

```bash
git add src/scripts/path/config.ts src/scripts/path/config.test.ts src/scripts/path/path-io.ts src/components/path/PathView.tsx src/components/path/planning/NextPath.tsx src/components/path/planning/ConceptMasteryMap.tsx src/components/progression/DomainRadar.tsx src/components/progression/MissionsList.tsx src/components/path/PathConfigDrawer.tsx
git commit -m "feat(path): wire time decay as a read-model; decayFloor below the mastery threshold"
```

---

### Task 6: planner — greedy set cover + partial-unit cost

630 concepts are taught by 2+ units; `conceptsToUnits` currently includes every teacher at full cost. Replace with deterministic greedy set cover. Also scale each step's `estMin` by the share of its concepts still missing — required minutes then shrink smoothly as concepts become known, which also makes pace granular.

**Files:**
- Modify: `src/scripts/path/planner.ts:70-73` (`conceptsToUnits`) and `:173-177` (the `learn` mapping in `buildPath`)
- Test: `src/scripts/path/planner.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/scripts/path/planner.test.ts`:

```ts
describe("conceptsToUnits — greedy set cover", () => {
  const u = (unit: string, teaches: string[], estMin: number) =>
    ({ unit, track: unit.split("/")[0], teaches, requires: [], estMin }) as any;
  it("picks one unit per concept when several teach it", () => {
    const units = [u("a/01", ["x", "y"], 60), u("b/01", ["x"], 30)];
    expect(conceptsToUnits(["x", "y"], units).map((q) => q.unit)).toEqual(["a/01"]); // covers both
  });
  it("breaks coverage ties by smaller estMin, then unit id", () => {
    const units = [u("a/01", ["x"], 60), u("b/01", ["x"], 30)];
    expect(conceptsToUnits(["x"], units).map((q) => q.unit)).toEqual(["b/01"]);
  });
  it("leaves concepts taught by no unit uncovered without looping", () => {
    expect(conceptsToUnits(["ghost"], [u("a/01", ["x"], 60)])).toEqual([]);
  });
});

describe("buildPath — partial-unit cost", () => {
  it("scales a step's estMin by the missing share of its teaches", () => {
    // networking/01-ip teaches ip-addressing + ports-sockets (see mini-graph fixture).
    // Self-declare ports-sockets known (declare does NOT propagate to its prereqs, so
    // ip-addressing stays missing) → 1 of 2 concepts missing → half the authored estMin.
    const s = applySelfDeclare(emptyState(), "ports-sockets", true, 0);
    const path = buildPath({
      state: s, goals: [GOALS[0]], config: cfg(), content: { concepts: CONCEPTS, units: UNITS, goalById },
      srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    const ip = path.steps.find((st) => st.unit === "networking/01-ip")!;
    const authored = UNITS.find((x) => x.unit === "networking/01-ip")!;
    expect(ip.unlocks).toEqual(["ip-addressing"]);
    expect(ip.estMin).toBe(Math.max(5, Math.round(authored.estMin * (1 / authored.teaches.length))));
  });
});
```

Add `applySelfDeclare` to the test file's existing import from `./knowledge`.

Before running: open `src/scripts/path/__fixtures__/mini-graph.ts` and confirm `networking/01-ip` teaches exactly `["ip-addressing", "ports-sockets"]` (adjust the test's concept names to the fixture if they differ — keep the structure: self-declare one of the unit's two taught concepts known, assert half cost). If the fixture path is longer than `stepsAhead` 5 and `networking/01-ip` falls outside the slice, pass `cfg({ pace: { stepsAhead: 10, srsAggressiveness: 0 } })`.

- [ ] **Step 2: Run to verify it fails**

Run: `bun test src/scripts/path/planner.test.ts`
Expected: FAIL — set-cover tests (both units returned) and partial-cost test (full estMin).

- [ ] **Step 3: Implement set cover and partial cost**

Replace `conceptsToUnits` (`planner.ts:70-73`) with:

```ts
// Greedy set cover over units teaching ≥1 missing concept: repeatedly take the unit covering the
// most still-uncovered concepts (ties: smaller estMin, then unit id). ~630 concepts are taught by
// 2+ units — without the cover step every teacher entered the path and double-counted its minutes.
export function conceptsToUnits(missing: string[], units: UnitConcepts[]): UnitConcepts[] {
  const uncovered = new Set(missing);
  const candidates = units.filter((u) => u.teaches.some((c) => uncovered.has(c)));
  const picked = new Set<string>();
  const out: UnitConcepts[] = [];
  while (uncovered.size) {
    let best: UnitConcepts | undefined;
    let bestCover = 0;
    for (const u of candidates) {
      if (picked.has(u.unit)) continue;
      let cover = 0;
      for (const c of u.teaches) if (uncovered.has(c)) cover++;
      if (!cover) continue;
      if (!best || cover > bestCover ||
          (cover === bestCover && (u.estMin < best.estMin || (u.estMin === best.estMin && u.unit < best.unit)))) {
        best = u;
        bestCover = cover;
      }
    }
    if (!best) break; // remaining concepts are taught by no unit
    picked.add(best.unit);
    out.push(best);
    for (const c of best.teaches) uncovered.delete(c);
  }
  return out;
}
```

Replace the `learn` mapping in `buildPath` (`planner.ts:173-177`) with:

```ts
  const learn: PathStep[] = ordered.map((u) => {
    const unlocks = u.teaches.filter((c) => missingSet.has(c));
    const labels = unlocks.map((c) => byId.get(c)?.label.en ?? c).join(", ");
    // Remaining-effort estimate: authored estMin scaled by the share of the unit's concepts
    // still missing — a mostly-known unit costs a fraction of a full read. 5-min floor keeps a
    // step from rounding to nothing.
    const share = u.teaches.length ? unlocks.length / u.teaches.length : 1;
    const estMin = Math.max(5, Math.round(u.estMin * share));
    return { unit: u.unit, track: u.track, unlocks, reason: `Unlocks ${labels}`, kind: "learn", estMin };
  });
```

- [ ] **Step 4: Run the planner tests, then the full path suite**

Run: `bun test src/scripts/path/planner.test.ts && bun test src/scripts/path/`
Expected: PASS. If an existing test asserts a unit list that the cover now legitimately trims (a fixture concept taught by two units), update its expectation and note why in the assertion comment. `engine.integration.test.ts` may assert exact step lists — re-derive expectations under cover semantics, don't weaken assertions to `toContain`.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/planner.ts src/scripts/path/planner.test.ts
git commit -m "feat(path): set-cover unit selection + remaining-effort step cost"
```

---

### Task 7: bestCombo — one lever per kind

`raise-hours +0.5h` and `+1h` are alternatives; stacking them applies +1.5h. Take each kind's strongest variant, walking kinds in disruption order.

**Files:**
- Modify: `src/scripts/path/optimize.ts:52-65` (`bestCombo`)
- Test: `src/scripts/path/optimize.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/scripts/path/optimize.test.ts`:

```ts
  it("bestCombo takes one lever per kind — hour variants are alternatives, not additive", () => {
    const fixes = suggestFixes({
      deficitMin: 1000,
      raiseHours: [{ hours: 0.5, deltaMin: 300 }, { hours: 1, deltaMin: 600 }],
      extendDate: [{ days: 7, deltaMin: 300 }],
      behind: false,
    });
    const combo = bestCombo(fixes, 1000);
    expect(combo.filter((f) => f.kind === "raise-hours")).toHaveLength(1);
    expect(combo.find((f) => f.kind === "raise-hours")!.deltaMin).toBe(600); // strongest variant
    expect(combo.find((f) => f.kind === "extend-date")!.deltaMin).toBe(300);
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test src/scripts/path/optimize.test.ts`
Expected: FAIL — old greedy includes both raise-hours fixes (300 then 600).

- [ ] **Step 3: Rewrite `bestCombo`**

Replace `bestCombo` (`optimize.ts:51-65`) with:

```ts
// Cover the deficit with at most one lever PER KIND (the 0.5h/1h raises and 7d/14d extensions
// are alternatives — applying two of a kind stacks beyond what either delta promised), walking
// kinds in disruption order and taking each kind's strongest variant.
export function bestCombo(fixes: Fix[], deficitMin: number): Fix[] {
  if (deficitMin <= 0) return [];
  // Prefer a single lever that closes the gap (least disruptive first).
  const single = fixes.find((f) => f.closesGap);
  if (single) return [single];
  const combo: Fix[] = [];
  let sum = 0;
  for (const kind of ORDER) {
    if (sum >= deficitMin) break;
    const ofKind = fixes.filter((f) => f.kind === kind);
    if (!ofKind.length) continue;
    const strongest = ofKind.reduce((a, b) => (b.deltaMin > a.deltaMin ? b : a));
    combo.push(strongest);
    sum += strongest.deltaMin;
  }
  return combo;
}
```

- [ ] **Step 4: Run the optimize tests**

Run: `bun test src/scripts/path/optimize.test.ts`
Expected: PASS. If a pre-existing `bestCombo` test asserted the old smallest-first prefix (e.g. both hour variants in the combo), update it to the one-per-kind/strongest-variant semantics.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/path/optimize.ts src/scripts/path/optimize.test.ts
git commit -m "fix(path): bestCombo applies at most one lever per kind"
```

---

### Task 8: remove dead weights (`prior`, `recency`)

Verified by grep: only `types.ts:44` and `config.ts:15,32,35` reference them (plus tests). `lessons`/`practice` are now live (Task 4) and stay. Stored configs with the old keys are harmless — `mergeConfig` spreads them and the type simply drops them.

**Files:**
- Modify: `src/scripts/path/types.ts:43-47` (`PathWeights`)
- Modify: `src/scripts/path/config.ts:15,30-38`
- Test: `src/scripts/path/config.test.ts`

- [ ] **Step 1: Remove the fields**

`types.ts` — `PathWeights` becomes:

```ts
export interface PathWeights {
  lessons: number; practice: number;       // study-evidence blend (applyStudyEvidence)
  masteryThreshold: number; // concept "known" cutoff
  decayFloor: number;       // base confidence floor after decay
}
```

`config.ts:15` — default weights become:

```ts
  weights: { lessons: 0.35, practice: 0.4, masteryThreshold: 0.6, decayFloor: 0.3 },
```

`config.ts` clamp block — delete the `prior:` and `recency:` lines.

- [ ] **Step 2: Fix compile fallout in tests**

Run: `bun test src/scripts/path/ 2>&1 | head -30`
Expected: only `config.test.ts` (and possibly a fixture) referencing `prior`/`recency` fails to compile or assert. Remove those references; everything else passes.

- [ ] **Step 3: Typecheck the site**

Run: `bunx astro check 2>&1 | tail -5`
Expected: no new errors (verifies no component constructed a full `PathWeights` literal with the removed keys).

- [ ] **Step 4: Commit**

```bash
git add src/scripts/path/types.ts src/scripts/path/config.ts src/scripts/path/config.test.ts
git commit -m "refactor(path): drop never-read prior/recency weights"
```

---

### Task 9: full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Full unit-test suite**

Run: `bun test`
Expected: all green (suite was 278+ tests before this plan; no skips added).

- [ ] **Step 2: Full site build + linter**

Run: `bun run build`
Expected: build completes (~4859 pages), `dist/lint-report.json` shows 0 errors / 0 warnings.

- [ ] **Step 3: Console-log scan of touched files**

Run: `grep -rn "console\.log" src/scripts/path/ src/components/path/ | grep -v test`
Expected: no output.

- [ ] **Step 4: Manual smoke check in the browser**

Run: `bun run preview` and open `http://localhost:4321/en/roadmap`. Verify:
1. Set a deadline ~2 months out with default hours → the budget bar shows a sane need-vs-available ratio and the verdict is NOT "over" with an absurd deficit (the pre-repair symptom).
2. A multi-hour unit appears across consecutive day cards in the deadline section instead of vanishing.
3. Open a lesson (`/en/learn/...`), complete one practice task, return to `/en/roadmap` → the concept-mastery map shows the unit's concepts as shaky/known and required hours decreased.
4. Suggestions panel ("Как уложиться"), when forced over (set 0.5h/day), proposes levers whose "saves X h" numbers are plausible against the shown deficit.

- [ ] **Step 5: Report**

Summarize verdicts per the four checks; if any fails, stop and fix before declaring the plan done. Do not push — the owner pushes manually.

---

## Self-review notes (already applied)

- The Pace interface is intentionally unchanged so `DeadlineSection.tsx`/`TodayFocus.tsx` need no edits in Task 3; only `currentPace()` changes its internals.
- Task 1's fixture change (`+6 * DAY` Sunday target) deliberately keeps the 600-min weekly budget constant across Task 2's inclusive-end change, so the two tasks don't fight over test arithmetic.
- `refreshStudyEvidence` and `effectiveKnowledge` both read `config.value`, declared earlier in `path-io.ts` — insertion points in Tasks 4/5 respect declaration order.
- `decay` must never be persisted (Task 5) — it lerps from the current value; persisting would compound the erosion on every page load.
- `applyStudyEvidence` keeps `applyActivity`'s two safety rules verbatim: never lower, never override `diagnostic`/`declared` sources.
