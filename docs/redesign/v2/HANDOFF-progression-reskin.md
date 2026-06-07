# HANDOFF — Progression screen re-skin (UI components)

You build the **bulky Preact components** + the screen stylesheet for the Open Atlas "Progression" screen re-skin. The pure read-models, the Astro shell, tabs, and the shared `screen-kit.css` are **already done and committed** on the branch. Recreate the v2 mockup pixel-faithfully, wired to the finished APIs. The controller verifies behind you.

## Start
```bash
git checkout feat/progression-screen-reskin   # already has Tasks 1–7
cd site && bun install
```
Plan: `docs/superpowers/plans/2026-06-07-progression-screen-reskin.md` (your task is **8**).
Spec: `docs/superpowers/specs/2026-06-07-progression-screen-reskin-design.md`.

## Pixel source (recreate visually; do NOT copy the vanilla-JS / hardcoded arrays)
- `docs/redesign/v2/project/Progression.html` (sections/markup), `progression.css` (styles → `progression-screen.css`), `progression.js` (radar/ladder/spark render — reimplement as Preact wired to real data).
- `docs/redesign/v2/project/cluster.css`/`components.css`/`tokens.css` (shared chrome already in `screen-kit.css`).
- The intent is the "Screen 3 — PROGRESSION" block of `docs/redesign/v2/chats/chat2.md`.

## Reference the SHIPPED Planning re-skin for the exact patterns
Read `site/src/components/path/planning/*` + `site/src/components/path/PathView.tsx` — they are the canonical example of: one-island composition, the `L={en,ru}` bilingual map, signal subscription, block-`<div>` fills, `.screen-section`/`.sec-head` structure, and CSS scoped under `.screen` in `planning-screen.css`. Match that style exactly.

## Done-APIs — build on these (do NOT touch the engine)
**`~/scripts/progression/domain-ratings.ts`** (radar data):
```ts
interface DomainRating { key; label:{en,ru}; hue:string /* --d-* */; score:number /*0..100*/; known:number; total:number }
domainRatings(state, concepts, threshold): DomainRating[]   // per-domain competence over 8 families
weakestDomain(rs) / strongestDomain(rs): DomainRating | null
```
**`~/scripts/progression/missions.ts`** (derived missions):
```ts
interface Mission { id; title:{en,ru}; done:number; total:number; rewardLabel:{en,ru} }
deriveMissions({ domains: DomainRating[], streakCount: number }): Mission[]   // ≤3, honest, may be empty
```
**`~/scripts/progression/ladder.ts`** (the 25-rank ladder):
```ts
rankPosition(rank: RankDef): { index:number /*1..25*/, total:number, topPct:number }
ladderRows(currentRating: number): { rank:RankDef, reached:boolean, current:boolean }[]   // all 25
```
**`~/scripts/progression/ranks.ts`**: `RANKS` (25 `RankDef{id,tier,division,min,max,contentTier,icon,color,label{en,ru}}`), `ratingToRank`, `nextRank`, `rankById`.
**XP:** `currentXp()` (`~/scripts/progression/current`), `levelFromXp(xp)` (`~/scripts/progression/xp`).
**State:** `userState` signal (`~/scripts/user-state`) → `.value.pretest` (`{rating 0..1000, rank, confidence}` | undefined) + `.value.progression.streak.{count,best}` + `.titles`.
**Path data for the radar:** `knowledge` signal + `config` signal + `content.concepts` from `~/scripts/path/path-io`; threshold = `config.value.weights.masteryThreshold`.
**Reused components (do NOT rewrite):** `RankBadge`, `Pretest`, `AchievementGrid`, `StreakChip`, `XpBar` (under `~/components/progression/`); `titlesFromState`/`TITLES` (`~/scripts/progression/titles`).

## Non-negotiable contracts
1. **ONE island** — everything is plain Preact composed inside the rewritten `ProfilePanel`. NO `client:*` anywhere; do NOT edit `profile.astro` (it mounts the single island).
2. **Real data only.** NO `Season II`, NO `1,840` rating (the engine's rating is 0..1000 — show it as-is), NO fabricated quest rewards, NO invented streak date-range. The radar is **per-domain competence** (mastery-derived) — label it honestly as competence/mastery by domain, NOT a per-domain Elo. Omit anything not derivable.
3. **EN+RU** `L` map on every component (linter-enforced). **Light + dark.**
4. **a11y:** the radar SVG has `role="img"` + `aria-label`; segmented/toggle controls `aria-pressed`; honor reduced-motion.
5. **No `localStorage`/`Date.now()` in components** — read via the signals/helpers above.
6. **Block-div / SVG fills**, never inline-`<span>` width (the Planning gotcha): XP bar fill, domain bars, mission progress are block `<div style="width:%">`; the radar is SVG polygons/lines.
7. **NO rank-up banner, NO season** (cut from v1 — see spec §2.5/§2.6).

## Your files (create under `site/src/components/progression/`) + rewrites
- `RankNow.tsx`, `RankLadder.tsx`, `DomainRadar.tsx`, `XpStreakInstruments.tsx`, `MissionsList.tsx`, `PlacementIntro.tsx`
- rewrite `ProfilePanel.tsx` (island shell), fill `site/src/styles/progression-screen.css`

The exact per-component contracts are in the plan **Task 8** — follow them precisely. ProfilePanel order: `!pretest` → `PlacementIntro` + `Pretest`; else RankNow+RankLadder → DomainRadar (signature) → XpStreakInstruments → MissionsList → titles row + `AchievementGrid`.

## Workflow
- Iterate with `bun run test` (fast) + `bunx astro check`; run the full `bun run build` ONCE at the end → confirm **0 errors / 0 warnings** (`dist/lint-report.json`).
- **Do NOT touch git** — leave changes uncommitted; the controller reviews + commits.
- Report: files changed, final build lint summary, `bun run test` count, any deviations/omissions.

## Done = build 0/0, tests green, screen renders with real data both themes/locales, one island.
