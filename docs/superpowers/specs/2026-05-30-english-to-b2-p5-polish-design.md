# English → B2 — P5: Daily-driver polish (Design Addendum)

**Date:** 2026-05-31
**Status:** Approved design, pre-implementation
**Owner:** Artem
**Parent spec:** `docs/superpowers/specs/2026-05-30-english-to-b2-design.md` (§5 integration, §8 P5)
**P4 addendum:** `docs/superpowers/specs/2026-05-30-english-to-b2-p4-grammar-b2-design.md`
**Branch:** `english-p5-polish` (off `main`)
**Related:** `project_english-layer` (memory); `project_player-progression` (XP/rank/achievements engine); `project_github-auth` (account-sync, not yet live).

## 0. Frame

P5 is the **final phase** of the English layer. Content is complete (P0–P4: engine, vocab
A2–B2 ≈3.7k, reading A2–B2, output/BYOK, grammar/collocations). P5 closes the loop:
make English progress **visible, rewarded, and durable** — achievements, a hub dashboard, a
synced progress summary, and small streak/catch-up polish. After P5 the English layer is done.

**Locked design decisions (brainstorming 2026-05-31):**
1. **English achievements extend the existing registry** — add English badges to the single
   `ACHIEVEMENTS[]` list (`src/scripts/progression/achievements.ts`) via new `AchievementCtx`
   fields, reusing the existing evaluate → lazy-award → XP → notify machinery. Not a separate
   English registry (would split the badge wall + duplicate machinery).
2. **Dashboard = a panel atop the English hub** (`/[lang]/english/`), mirroring `ProfilePanel`
   styling. Not a `/profile` rebuild; an optional thin English line in profile is out of scope.
3. **State graduation = compact summary synced, FSRS card deck stays local.** A small
   `englishSummary` object is mirrored into `user-state.progression` (additive, guarded in
   `mergeProgress`) so achievements, the dashboard, and cross-device continuity work. The
   per-word FSRS card deck stays in its own `awesome.english.v2` localStorage key — it is
   potentially thousands of cards and would bloat the synced progression payload; it is
   re-derivable (losing it cross-device just means re-reviewing, acceptable). This is the one
   real architectural call; full-deck sync and no-sync were both rejected.
4. **Streak / catch-up = minimal.** Surface the overdue-review count and a gentle "welcome
   back" after a gap; keep `REVIEW_CAP`; confirm never-punish. Low-risk.

**Non-goals (P5):** AI features beyond the shipped grading (§12 future); tighter Astro
experimental CSP (separate risk, P3 left `script-src 'unsafe-inline'` as a documented
fallback); audio/listening; any new content.

## 1. Existing surface this builds on (verified 2026-05-31)

- **Progression** (`src/scripts/progression/`): `Progression = { xp, level, achievements:
  Record<id, awardedAt>, streak, titles }` lives in `user-state.progression`, synced via
  `account-sync`. `ACHIEVEMENTS[]` = registry of `{ id, icon, xp, label, desc, predicate(s,
  ctx) }`. `AchievementCtx` (in `progression/types.ts`) carries drill/test/pillar fields.
  `evaluateAchievements(s, ctx)` returns unlocked ids. `xpFromState(s, drillsSolved,
  englishKnown=0)` already adds `englishXp(englishKnown)`.
- **Award call-site** (`components/progression/ProfilePanel.tsx`): builds `ctx` (already pulls
  `englishKnownTotal()` for XP), computes `unlocked`, and on mount **lazily persists** newly
  unlocked ids into `progression.achievements` (`useEffect([])`). Drill achievements follow
  the same lazy pattern — English will too.
- **account-sync** (`scripts/account-sync.ts`): `mergeProgress(local, server)` →
  `mergeProgression` coalesces: `xp`/`level`/`streak.best` by max, `achievements` union,
  `titles` union, `streak` latest-day wins. A new `englishSummary` field merges here.
- **English state** (`src/english/state.ts`, key `awesome.english.v2`): exposes
  `englishKnownTotal()`, `knownCount(ids)`, `statusOf`, `getPlacement()`, `isUnitRead`,
  and holds `words` (FSRS cards), `readUnits`, `outputAttempts`, `grammarDone`,
  `collocationDone`. Already imports `recordActiveDay` from `user-state` (one-directional dep;
  `user-state.ts` does NOT import english/state — safe to extend).
- **Vocab decks**: `vocabA2`/`vocabB1`/`vocabB2` give the `id → band` mapping needed to bucket
  known words per band. `bands.ts` `BAND_SIZE = { A2: 800, B1: 1200, B2: 1760 }`.
- **Hub** (`pages/[lang]/english/index.astro`): 2-segment route; sections Today / Reading /
  Grammar & Phrasing / Output, each a `client:visible` island.

## 2. English achievements (decision 1)

### 2.1 `AchievementCtx` extension (`progression/types.ts`)
Add English fields (all derivable, no new persistent state required for evaluation):
```ts
export interface AchievementCtx {
  // ...existing fields...
  englishKnown: number;            // englishKnownTotal()
  englishBand: "none" | "A2" | "B1" | "B2";   // placement band, or "none" if not placed
  englishReadUnits: number;        // count of read units
  englishGraded: boolean;          // any output attempt that was AI-graded (scoreBand set)
  englishGrammarDone: number;      // count of completed grammar points
  englishCollocationDone: number;  // count of completed collocation sets
}
```

### 2.2 New achievement defs (append to `ACHIEVEMENTS[]`)
Predicates read `ctx` only (English data is not on `Pick<UserState,…>`). Ids/icons/XP:
- `en-words-500` 🔤 30 — "500 English words known" — `c.englishKnown >= 500`.
- `en-words-2000` 📘 70 — "2000 words known" — `c.englishKnown >= 2000`.
- `en-words-5000` 🧠 150 — "5000 words known" — `c.englishKnown >= 5000`.
- `en-band-b1` 🇬🇧 40 — "Reached B1 English" — `c.englishBand === "B1" || c.englishBand === "B2"`.
- `en-band-b2` 🎓 90 — "Reached B2 English" — `c.englishBand === "B2"`.
- `en-first-graded` ✍️ 25 — "First AI-graded writing" — `c.englishGraded`.
- `en-reader-10` 📰 30 — "Read 10 English texts" — `c.englishReadUnits >= 10`.
- `en-reader-40` 📚 60 — "Read 40 English texts" — `c.englishReadUnits >= 40`.
- `en-grammar-5` 🧩 25 — "Five grammar points practiced" — `c.englishGrammarDone >= 5`.

Each bilingual `label`/`desc` (EN+RU). Achievement XP flows through the existing
`XP.achievement` count-based formula automatically (one award = +25 base) **plus** the per-def
`xp` is display metadata as today — no XP formula change needed.

### 2.3 Award wiring (`ProfilePanel.tsx`)
Extend the `ctx` built in ProfilePanel with the six English fields, derived from `english/state`
getters (same place `englishKnownTotal()` is already called). The existing `useEffect([])`
lazy-award then persists English badges into `progression.achievements` with no further change.
A fresh device with synced `progression.achievements` keeps already-earned English badges.

## 3. English stats module (`src/english/stats.ts`)

A new pure-ish module so both the dashboard and the summary share one derivation. No DOM deps.
```ts
export type Band = "A2" | "B1" | "B2";
export function knownByBand(): Record<Band, number>;   // buckets known ids via vocab decks
export function readUnitsCount(): number;
export function gradedOutputCount(): number;           // outputAttempts with scoreBand set
export function grammarDoneCount(): number;
export function collocationDoneCount(): number;
export function englishSummary(now: number): EnglishSummary;  // compact, see §4
```
`knownByBand` builds an `id → band` map from `vocabA2/B1/B2` once (module-level), then counts
ids the user `isKnown`. Tested against `BAND_SIZE` upper bounds and disjointness.

## 4. Synced summary — state graduation (decision 3)

### 4.1 `EnglishSummary` on `Progression`
```ts
export interface EnglishSummary {
  knownTotal: number;
  knownByBand: { A2: number; B1: number; B2: number };
  band: "none" | "A2" | "B1" | "B2";
  readUnits: number;
  grammarDone: number;
  collocationDone: number;
  graded: boolean;
  updatedAt: number;     // epoch ms; merge tiebreaker
}
```
Added optional to `Progression`: `englishSummary?: EnglishSummary`. Optional keeps old
localStorage / old server payloads valid (additive, backward-compatible).

### 4.2 Push hook (`english/sync.ts` — reactive, no import cycle)
The summary is mirrored by a **reactive `effect`** in a new module `english/sync.ts`, NOT by
calls inside `state.ts` mutations (that would force `state → stats → state` cycle, since
`stats.ts` imports `state.ts`). `sync.ts` imports the `englishState` signal, `englishSummary`
from `stats.ts`, and `userState` from `user-state` — all one-directional. It runs
`effect(() => pushEnglishSummary())`, which derives the summary from the current `englishState`
and writes it into `userState.value.progression.englishSummary` **only if it differs** (guards
signal churn / write loops). Window-guarded (no-op in SSR). The effect is registered once by
importing `sync.ts` from the hub-mounted dashboard island (§5). `state.ts` and `stats.ts` stay
free of any `userState` dependency.

### 4.3 Merge (`account-sync.ts` `mergeProgression`)
Coalesce monotonically so an empty fresh device cannot erase server progress:
```ts
englishSummary: mergeEnglishSummary(a?.englishSummary, b?.englishSummary)
```
`mergeEnglishSummary` = field-wise **max** for all counts (`knownTotal`, each `knownByBand`,
`readUnits`, `grammarDone`, `collocationDone`), **OR** for `graded`, **higher-`updatedAt` wins**
for `band` and `updatedAt`. Missing on one side → take the other. Tested.

### 4.4 Dashboard fallback
The dashboard reads local `english/state` (rich, always current on the active device). When
local English state is empty but `progression.englishSummary` exists (fresh device, synced),
the dashboard shows the synced summary so progress is visible before any local activity.

## 5. Dashboard island (`components/english/EnglishDashboard.tsx`) — decision 2

A compact panel at the **top of the English hub**, above Today. Mirrors `ProfilePanel`/card
styling (mono meta, `bg-card`, rule borders, progress bars).

Shows:
- **Vocabulary** — per-band progress bars `knownByBand[band] / BAND_SIZE[band]` (A2/B1/B2) +
  total known.
- **Placement band** + level contribution (English XP share, from `englishXp(knownTotal)`).
- **Activity** — texts read (`readUnits`), grammar points done, collocation sets done,
  AI-graded writings.
- **Streak** — current streak + best (from `userState.progression.streak`) and **due today**
  count (from `dueWordIds`).
- **Badges** — the English achievements earned (filter `progression.achievements` to the
  `en-*` ids), small icon row; locked ones dimmed.

Mounted `client:visible`. Hub now has 5 islands (Dashboard + Today/Reading/Grammar/Output) on
a 2-segment route — outside the lesson hydration cap; per-island hydration stays minimal.

## 6. Streak / catch-up polish (decision 4) — `Today.tsx`

- **Overdue surfacing:** show the total due count and, when it exceeds `REVIEW_CAP`, a quiet
  "N reviews waiting — capped at 30 today" line (no guilt framing).
- **Welcome back:** if `userState.progression.streak.lastActiveDay` is ≥2 days before today,
  show a one-line "Welcome back — your streak is safe, pick up where you left off." Never
  punishes a missed day (existing streak logic already rewards return).
- Keep `REVIEW_CAP = 30`. No scheduler change.

## 7. Testing & gates (TDD)

- `achievements.test.ts` — the new `en-*` predicates fire on the right `ctx` thresholds and not
  below; existing achievements unaffected.
- `english/stats.test.ts` — `knownByBand` buckets correctly and respects `BAND_SIZE` bounds;
  counts match seeded state; `englishSummary` shape + values.
- `account-sync.test.ts` — `mergeEnglishSummary`: max-per-count, OR for `graded`, latest band;
  a fresh empty local cannot lower a synced summary; missing-on-one-side cases.
- `english/sync.test.ts` — the effect writes a correct summary into
  `userState.progression.englishSummary` and only on change (no write when summary unchanged).
- `xp.test.ts` — unchanged formula still holds (English XP already wired in P0); add a guard if
  needed.
- Build: `bunx vitest run src/english src/scripts` green; `bun run build` → **0 errors**,
  warnings **≤1271** (no regression). Page count unchanged (no new routes).

## 8. Build order (one plan, gate-first)

1. `AchievementCtx` English fields + `EnglishSummary` type (types only).
2. `english/stats.ts` + tests (red→green).
3. English achievement defs in `ACHIEVEMENTS[]` + `achievements.test.ts`.
4. `progression.englishSummary` field + `mergeEnglishSummary` + `account-sync.test.ts`.
5. `english/sync.ts` reactive summary-push effect + test (`sync.test.ts`); imported by the dashboard.
6. `ProfilePanel.tsx` — extend `ctx` with English fields (award wiring).
7. `EnglishDashboard.tsx` island + mount atop hub.
8. `Today.tsx` streak/catch-up polish.
9. Full `vitest` + `bun run build` green.

All commands from `site/`. No content fan-out this phase — pure code, single-session
subagent-driven (no heavy 2-concurrent waves needed).

## 9. Isolation boundaries

- `progression/types.ts` — `+AchievementCtx` English fields, `+EnglishSummary`.
- `progression/achievements.ts` — `+en-*` defs (data only).
- `english/stats.ts` — new pure derivation (knownByBand/summary); depends on vocab decks + state only (NO userState import).
- `english/sync.ts` — new; reactive `effect` mirroring the summary into `userState.progression`. Depends on englishState signal + stats + userState. The only English→userState writer.
- `english/state.ts` — untouched API (FSRS deck + existing functions); no new dependency.
- `account-sync.ts` — `+mergeEnglishSummary` inside `mergeProgression`.
- `components/english/EnglishDashboard.tsx` — new island; reads state + progression only.
- `components/progression/ProfilePanel.tsx` — `ctx` extended; award loop unchanged.
- `pages/[lang]/english/index.astro` — `+1` island at top.

Each unit answers: what it does, how to use it, what it depends on. Files stay focused.

## 10. Open questions (resolve during planning)

- `englishBand` for band-up achievements: placement band (chosen) vs maturity-derived. Use
  placement band — simplest, and direct B2 placement legitimately earns `en-band-b2`.
- `pushEnglishSummary` cadence: on every mutation (chosen, with change-guard) vs debounced.
  Change-guarded per-mutation is simple and cheap (summary is small).
- Dashboard level-contribution display: show English XP share vs full level math. Show English
  XP contribution only (full level lives in `/profile`).
