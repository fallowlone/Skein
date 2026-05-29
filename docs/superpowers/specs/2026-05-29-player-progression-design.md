# Player progression — adaptive leveling + gamification — design

**Date:** 2026-05-29
**Status:** approved (brainstorming) → awaiting user review before plan
**Scope:** the `site/` curriculum app. Extends the existing Pretest/tier system into a two-stage adaptive placement test that produces a gamified rank, plus a progression layer (XP/level, achievements, streak, titles, profile dashboard).

## Goal

Today the site has a single flat **Pretest**: ~8–10 weighted MCQs, summed, mapped to `junior | middle | senior`. It has no resolution at the top — everyone scoring ≥7 collapses into one "senior". Replace it with:

1. A **two-stage adaptive test (MST)**: a standard round for everyone; a deeper round unlocked only for top performers, which is the only way to earn the upper ranks.
2. A **25-rank ladder** (engineering career theme) driven by a 0–1000 rating, with the existing 3-tier content routing derived from the rank.
3. A **gamification layer** that turns the learner into a "player": XP/level, ~24 achievements, daily streak, domain titles, and a profile dashboard — all derived from signals the app already tracks (pretest, drill solves, quiz/retrieval attempts, lesson history) plus a small amount of new persisted state.

The whole thing must be **honest**: it is an MCQ self-assessment — a placement signal and a motivator, never a certificate or an access gate. Content stays open.

## Non-goals

- **No real coding judge.** We do not execute or grade code; the rating is from MCQ answers (+ optional derived signals).
- **No leaderboard / multiplayer / social ranking.** Needs a server beyond what's set up and raises privacy questions. Future.
- **No rank decay / seasons.** Future.
- **No new content authoring beyond** the Stage-2 question bank, the rank ladder data, and the achievement definitions (all EN+RU, authored as part of implementation).
- **No change to the 3-tier content routing contract** — `tier-router`/`TierAccordion` keep consuming `junior|middle|senior`; the rank just derives it.

## Existing system (what we extend, verified)

- `site/src/scripts/pretest-questions.ts` — `PretestQuestion { id, prompt:Bilingual, choices:{label:Bilingual, weight:0|1|2|3}[] }`, exported array `pretestQuestions`.
- `site/src/scripts/tier-router.ts` — `scorePretest(answers)` (sums chosen weights), `scoreToTier(score)` (≤3 junior, ≤6 middle, else senior).
- `site/src/scripts/user-state.ts` — signal-based localStorage state; `pretest: { takenAt, score, answers } | null`, `tier: Tier`, plus `history`/`retrieval`/`dismissedRevisit` maps with timestamps. `setPretest`, `setTier` setters. The auth feature added server sync of the whole `UserState` (so any field we add syncs automatically once terms-accepted).
- `site/src/components/pedagogy/Pretest.tsx` — the current one-shot flow (untaken → in-progress → done).
- `site/src/components/algo/drill-state.ts` — drill status store (`awesome.drill.v1`: id → {status, at}) — a signal for achievements/XP (drills solved, no-hints, completionist).

## Architecture

A pure, testable **progression core** + thin presentational components. The core never touches the DOM or localStorage directly (state is passed in), so every rule is unit-tested.

```
site/src/scripts/progression/
  ranks.ts            25-rank ladder data (id, tier-name, division, rating band, icon, color, label EN+RU) + ratingToRank()
  rating.ts           scoreStage(answers, bank), qualifiesForStage2(s1), computeRating(s1, s2?), confidenceOf(...)
  rank-tier.ts        rankToTier(rank) -> junior|middle|senior  (the routing bridge)
  xp.ts               xpFromState(state) -> number, levelFromXp(xp) -> {level, intoLevel, toNext}
  achievements.ts     achievement defs (~24, id + predicate(state) + label/desc EN+RU + icon) + evaluateAchievements(state)
  streak.ts           updateStreak(streak, todayISO) -> streak, isActiveToday(...)
  titles.ts           titlesFromState(state) -> Title[]  (domain flair from strongest pillar signals)
  index.ts            re-exports
  *.test.ts           vitest per module

site/src/scripts/pretest-questions.ts   + export advancedQuestions (Stage-2 bank)
site/src/scripts/user-state.ts          extend pretest shape + add `progression`; derive tier from rank
site/src/components/pedagogy/Pretest.tsx   two-stage flow + rank-up reveal
site/src/components/progression/
  RankBadge.tsx       rank icon + division + label (static-friendly; tiny island only where interactive)
  XpBar.tsx           level + progress-to-next bar
  AchievementGrid.tsx lit/dim grid of the ~24 achievements
  StreakChip.tsx      streak count + best
  RankUpReveal.tsx    result animation (rank, rating, confidence, derived tier)
site/src/pages/[lang]/profile.astro      player dashboard page (+ link in AccountMenu)
```

## The leveling algorithm (MST)

### Stage 1 — standard (everyone)
The existing broad bank. `s1 = scoreStage(stage1Answers, stage1Bank) / maxScore(stage1Bank)` ∈ [0,1].

### Gate
`qualifiesForStage2(s1) = s1 >= 0.75`. If false → finalize on Stage 1.

### Stage 2 — advanced (top only)
A new bank of harder, discriminating questions (subtle failure modes / tradeoffs only seniors know), same `{weight:0..3}` shape. `s2 = scoreStage(stage2Answers, stage2Bank) / maxScore(stage2Bank)` ∈ [0,1].

### Rating (0–1000)
```
rating =
  !stage2  →  round(750 * s1)                 // cap 750 (stage-1-only ceiling)
  stage2   →  750 + round(250 * s2)            // 750–1000, unlocked only by the deep round
```
Skipping Stage 2 after qualifying caps the rating at `round(750 * s1)` (so you can decline and stay where Stage 1 placed you, but the top is closed until you take it).

### Confidence
`confidenceOf(answers, bank)` = "high" if the chosen weights are consistent (low spread — e.g. stdev of normalized per-question weights ≤ 0.25), else "medium". Displayed, not used to alter the rating. (No "low" — two stages already give enough signal; keep it simple.)

### Rank
`ratingToRank(rating)` maps to one of 25 ranks via fixed bands (see ladder). `rankToTier(rank)` collapses to the content tier.

## The 25-rank ladder (`ranks.ts`)

Engineering career theme; 8 tiers × 3 divisions (III→II→I, low→high) + 1 apex = 25. Rating 0–1000 split into 24 equal-ish lower bands + the apex at the top. Indicative mapping (exact band edges fixed in `ranks.ts`):

| Tier | Divisions | Rating range | Content tier |
|---|---|---|---|
| Initiate | III, II, I | 0–125 | junior |
| Apprentice | III, II, I | 125–280 | junior |
| Practitioner | III, II, I | 280–450 | junior |
| Engineer | III, II, I | 450–600 | middle |
| Senior Engineer | III, II, I | 600–750 | middle |
| Staff | III, II, I | 750–840 | senior |
| Principal | III, II, I | 840–930 | senior |
| Architect | III, II, I | 930–990 | senior |
| **Distinguished** | (apex) | 990–1000 | senior |

Because Stage-1-only caps rating at 750, the **Staff tier and above (senior) is reachable only through Stage 2** — the deep round earns the top ranks, exactly as intended. `rankToTier` is monotonic: no higher rank maps to a lower tier. Each rank carries an icon, accent color, and bilingual label.

## Two progress axes

- **Rating (skill)** — from the MST. Drives the **rank**. Improves only by (re)taking the test.
- **XP (effort) → Level** — `xpFromState(state)` sums activity the app already records:
  - pretest taken (+flat), Stage 2 taken (+flat),
  - lessons visited (`history` keys), drills solved (`awesome.drill.v1` solved count — read into state), quiz/retrieval attempts (`retrieval` map),
  - achievements unlocked (+per-achievement XP).
  `levelFromXp(xp)` uses a gentle growing curve (e.g. `level = floor( (xp/100) ** 0.7 ) + 1`), returns `{level, intoLevel, toNext}` for the XP bar. Level is the "how much you've invested" number, distinct from rank.

## Gamification features

1. **25-rank ladder** with `RankBadge` (icon + division + label) and a rank-up reveal on the result screen.
2. **XP + Level** (`XpBar`) with progress-to-next.
3. **Achievements (~24)** (`achievements.ts`): each is `{ id, icon, label:Bi, desc:Bi, xp, predicate(state):boolean }`. `evaluateAchievements(state)` returns the set currently satisfied; newly-satisfied ones get stamped into `progression.achievements`. Examples (final list in the file):
   - `first-blood` — first weight-3 (senior) answer.
   - `polyglot` — strong answers across ≥5 distinct pillars.
   - `deep-diver` — completed Stage 2.
   - `perfectionist` — full Stage-2 score (s2 == 1).
   - `drill-sergeant` — 25 drills solved.
   - `no-hints` — solved a drill with 0 hints revealed (drill-state extended to record max hints used per id — small addition).
   - `completionist-algo` — every algorithms drill unit has ≥1 solved.
   - `streak-7` / `streak-30` — streak milestones.
   - `comeback` — re-took Stage 2 and improved rating.
   - `night-owl`, `early-bird` — activity-time flavor (from timestamps).
   - …(~24 total, EN+RU).
4. **Daily streak** (`streak.ts`): `updateStreak(prev, todayISO)` increments on consecutive UTC days, resets on a gap, tracks `best`. Surfaced as `StreakChip`. Called once per session from a page load.
5. **Titles** (`titles.ts`): domain flair from the strongest-pillar signals (e.g. `Index Surgeon` for databases, `Packet Whisperer` for networking, `Concurrency Wrangler` for distributed). `titlesFromState` returns earned titles; displayed on profile.
6. **Next-rank progress** — "+N rating to <next rank>" shown on the result screen, profile, and AccountMenu.
7. **Ranked re-climb** — retaking the test keeps the **best** rating/rank (never demotes on a worse retake); `comeback` achievement on improvement.

## Data model (`user-state.ts`, backward-compatible)

```ts
type Rank = string; // rank id from ranks.ts, e.g. "engineer-2", "distinguished"

interface PretestResult {
  takenAt: number;
  stage1: { score: number; answers: number[] };
  stage2?: { score: number; answers: number[] };
  rating: number;            // 0–1000, best-ever (re-climb keeps max)
  rank: Rank;                // derived from rating
  confidence: "high" | "medium";
}

interface Progression {
  xp: number;                // cached; recomputable from state via xpFromState
  level: number;
  achievements: Record<string, number>;   // id → unlockedAt (ms)
  streak: { lastActiveDay: string; count: number; best: number };
  titles: string[];          // title ids
}

// UserState gains:
pretest: PretestResult | null;   // shape widened from the old {takenAt,score,answers}
progression: Progression;        // defaulted; lazily populated
tier: Tier;                      // now derived via rankToTier(pretest.rank) when present
```

Migration: an old-shape `pretest` (`{takenAt, score, answers}`) is detected on load and upgraded — treat it as a Stage-1-only result, compute `rating = round(750 * score/oldMax)`, set rank/confidence. `progression` defaults to a zeroed object. All additive → existing users keep their data and the server sync (auth) carries the new fields.

## Components

- **`Pretest.tsx`** (rewritten flow, same island slot): `untaken → stage1 → [gate] → stage2? → reveal`. On finish: compute rating/rank/confidence, write `pretest` (keeping best on re-climb), trigger `RankUpReveal`. Honest framing copy throughout.
- **`RankUpReveal.tsx`** — result card: rank badge + division, rating, confidence, derived content tier, next-rank bar, "take/retake advanced" CTA. Light confetti/animation respecting the existing reduced-motion flag (`motion-flag.ts`).
- **`RankBadge` / `XpBar` / `AchievementGrid` / `StreakChip`** — small, mostly-static components; only `Pretest`/profile interactivity is hydrated (stay within the 5-island page cap — these compose into ≤1–2 islands per page).
- **`/[lang]/profile.astro`** — `getStaticPaths` en/ru; hydrates one `ProfilePanel` island that reads `userState` + drill store, runs the progression core, and renders rank, XP/level, achievements grid, streak, titles, per-pillar competence bars, and a re-climb CTA. Linked from `AccountMenu` (next to Account).

## Testing

vitest on the progression core (the algorithm is the high-value surface):
- `rating.ts`: `scoreStage` sums/normalizes; gate boundary (s1 0.74 → no stage2, 0.75 → stage2); `computeRating` cap 750 without stage2, 750–1000 with; confidence high vs medium on consistent vs spread answers.
- `ranks.ts`: `ratingToRank` at every band edge (0, 124/125, …, 989/990, 1000) returns the right rank; bands are contiguous and cover 0–1000 with no gap/overlap.
- `rank-tier.ts`: `rankToTier` monotonic (rating↑ never lowers tier); Staff+ ⇒ senior; Stage-1 ceiling (≤750) never yields senior-via-Staff.
- `xp.ts`: `xpFromState` monotonic in activity; `levelFromXp` boundaries.
- `achievements.ts`: each predicate fires on a crafted state and not on an empty one; `evaluateAchievements` returns the satisfied set; idempotent stamping.
- `streak.ts`: consecutive day increments, gap resets, best tracked, same-day no-op.
- `titles.ts`: earned on strong-pillar state, empty otherwise.
- user-state migration: old-shape pretest upgrades correctly; defaults applied.

Astro build stays green (these are `site/` additions + one new page ×2 langs). Hydration cap respected.

## Component / unit boundaries

Each progression module has one job and a pure interface (state in → result out), independently testable:
- `rating` — owns scoring/gate/confidence (in: answers + bank; out: numbers).
- `ranks` — owns the ladder + rating→rank (in: rating; out: rank).
- `rank-tier` — owns the routing bridge (in: rank; out: tier).
- `xp` — owns effort→level (in: state; out: level info).
- `achievements`/`streak`/`titles` — own their respective derivations (in: state[/today]; out: unlocked/updated).
The components are thin: read state, call the core, render. No business logic in JSX.

## Phasing (incremental, each shippable)

- **Phase 1 — leveling core:** Stage-2 bank, `rating.ts` + `ranks.ts` (25 ranks) + `rank-tier.ts`, user-state shape widen + migration + derive tier, `Pretest.tsx` two-stage flow + `RankUpReveal` + `RankBadge`. This alone delivers "the complex leveling algorithm: standard + deep test → rank." Build green, tests pass.
- **Phase 2 — XP & profile:** `xp.ts`, `XpBar`, `/[lang]/profile.astro` + `ProfilePanel`, AccountMenu link, next-rank bar.
- **Phase 3 — achievements, streak, titles:** `achievements.ts` (+ `no-hints` drill-state tweak), `streak.ts`, `titles.ts`, `AchievementGrid`, `StreakChip`, wire into profile + reveal.

## Honesty / framing

Every surface states plainly: this is a self-assessment placement, not a certification, and content is never gated by rank. The rank/level exist to route depth and motivate, nothing more.
