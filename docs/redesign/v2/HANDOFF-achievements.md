# HANDOFF — Achievements screen (UI components)

You build the **components** + stylesheet for the new Open Atlas "Achievements" screen (redesign v2, final screen). The pure read-models, the new Astro route, the enabled tab, and the shared `screen-kit.css` are **already done and committed** on the branch. Recreate the mockup visually, wired to the real achievements/titles engine. The controller verifies behind you.

## Start
```bash
git checkout feat/achievements-screen   # has Tasks 1–6
cd site && bun install
```
Plan: `docs/superpowers/plans/2026-06-07-achievements-screen.md` (your task is **Task 7**).
Spec: `docs/superpowers/specs/2026-06-07-achievements-screen-design.md`.

## Pixel source + canonical pattern
- Pixel: `docs/redesign/v2/project/Achievements.html`, `achievements.css`.
- **Match the SHIPPED Progression + Cabinet screens exactly** for idiom: `site/src/components/progression/ProfilePanel.tsx`, `site/src/components/account/CabinetPanel.tsx`, `site/src/styles/{progression,cabinet}-screen.css` + `screen-kit.css`. One-island composition, `const L={en,ru}` maps, `signal.value` reads, block-`<div>` fills, `.screen-section`/`.sec-head`/`.sec-index`, CSS scoped under `.screen`.

## Done-APIs — build on these
- **`~/scripts/progression/achievement-view.ts`**: `tally(earnedSet): {earned,total}`; `groupAchievements(earnedSet, dates, lang): ViewGroup[]` where `ViewGroup={category,label:{en,ru},earned,total,marks:ViewMark[]}` and `ViewMark={id,name,cond,icon /*emoji*/,earned,date:number|null}`; `CATEGORIES`, `CATEGORY_LABEL`.
- **`~/scripts/progression/near-miss.ts`**: `nearMiss(state, ctx, earnedSet, lang): NearMissMark[]` (top-3 closest locked, `{id,name,cond,current,target,pct}`).
- **`~/scripts/progression/equipped-title.ts`**: `equippedTitle` signal + `setEquippedTitle(id|null)`.
- **`~/scripts/progression/achievements.ts`**: `ACHIEVEMENTS` + `evaluateAchievements(state, ctx): string[]`.
- **`~/scripts/progression/titles.ts`**: `TITLES` (6 pillar titles `{id,pillar,label{en,ru}}`) + `titlesFromState(state): string[]`.
- **Building `ctx`:** copy it EXACTLY from `ProfilePanel.tsx` (it already builds the `AchievementCtx`): `loadStore()` from `~/components/algo/drill-state` for drills (drillsSolved/drillUnitsWithSolve/noHintSolve), `pillarsVisited` from `userState.history`, `seniorAnswers` via the same `countSeniorAnswers` over `pretestQuestions`/`advancedQuestions`, english via `~/english/stats` (`knownTotal`/`readUnitsCount`/`gradedOutputCount`/`grammarDoneCount`/`collocationDoneCount`) + `getPlacement()?.band`, `hourOfDay: new Date().getHours()`. Then `earned = new Set(evaluateAchievements(state, ctx))`, `dates = state.progression.achievements`.

## Hard contracts
1. ONE island — all sections inside `AchievementsPanel`; NO `client:*` anywhere; do NOT edit `achievements.astro`.
2. **Real data only** — NO `47/112`, NO invented seal names ("The Cartographer", "War-story scholar") — use the real `ACHIEVEMENTS` `label`/`desc`/emoji `icon`; real earned dates (`new Date(date).toLocaleDateString(lang)`, or "earned" with no date when `date===null`); real category counts (out of 33); near-miss from `near-miss.ts`; real `TITLES`. Omit anything not derivable.
3. EN+RU `L` maps on every component; light + dark.
4. a11y: title equip = single-select `<button aria-pressed>`; locked titles non-interactive; respect reduced-motion.
5. No `localStorage`/`Date.now()` in components EXCEPT `new Date().getHours()` for `ctx.hourOfDay` (client:only island, no SSR) — same as ProfilePanel.
6. Block-`<div>` progress fills (near-miss bars), never inline-`<span>` width.

## Your files (under `site/src/components/progression/achievements/`) + css
`SummaryBar.tsx`, `NearMiss.tsx`, `TitlesEquip.tsx`, `SealGroups.tsx`; rewrite `AchievementsPanel.tsx` (island shell building ctx → composes SummaryBar → NearMiss [omit if empty] → TitlesEquip → SealGroups, sectioned). Fill `site/src/styles/achievements-screen.css` (port `achievements.css` scoped under `.screen`). Exact per-component contracts: plan **Task 7**.

## Workflow
- Iterate `bun run test` + `bunx astro check`; full `bun run build` ONCE at end → 0/0 (`dist/lint-report.json`).
- Do NOT touch git. Leave changes in the working tree.
- Report: files changed, final build lint summary, test count, deviations, omissions.

## Done = build 0/0, tests green, real data both themes/locales, one island, tab links from the other screens.
