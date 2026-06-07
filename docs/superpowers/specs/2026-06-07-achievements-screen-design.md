# Achievements Screen — Design

**Date:** 2026-06-07
**Sub-project:** Redesign v2, screen 5 of 5 (final). Source: `docs/redesign/v2/`.
**Target:** a **NEW** route `/[lang]/achievements` (the only screen with no live page — the tab-bar entry is currently disabled). Wired to the real achievements/titles engine.
**Nature:** New page that visualizes the existing `ACHIEVEMENTS` engine as an editorial "case of marks" — earned vs locked seals grouped by category, a near-miss strip, and equippable titles. No new achievement predicates.

---

## 1. Data → mockup mapping (verified against source)

| Mockup region | Real source | Status |
|---|---|---|
| Tally "N / M marks earned" | `evaluateAchievements(state, ctx)` length / `ACHIEVEMENTS.length` (32) | exists |
| Category rail (Consistency/Depth/Breadth/Drills/English/Mastery) | **new** id→category map over `ACHIEVEMENTS` + earned counts | **new** `achievement-view.ts` |
| Seal groups — earned (icon, name, condition, **date**) vs locked (condition) | `ACHIEVEMENTS` (`label`/`desc`/`icon` emoji) + `evaluateAchievements` (earned set) + `userState.progression.achievements[id]` (earned timestamp) | exists + **new grouping** |
| "Within reach" near-miss progress | **new** curated numeric progress for locked achievements with a clear current/target from `AchievementCtx`/state | **new** `near-miss.ts` |
| Titles — equip (single-select), earned vs locked | `titlesFromState(state)` + `TITLES` (6 pillar titles); **new** persisted "equipped" choice | exists + **new** `equipped-title` signal |

**No fabricated data.** The mockup's `47/112`, the named seals ("The Cartographer", "War-story scholar"), and the specific near-miss numbers are NOT carried — real counts (out of 32), the real `ACHIEVEMENTS` labels/conditions/icons, real earned dates, and real `TITLES` replace them. Categories and near-miss are computed from the real engine; nothing is invented.

---

## 2. Decisions (locked, autonomous)

1. **New route** `site/src/pages/[lang]/achievements.astro` mirroring the cabinet/profile shell (screen-head + `TrajectoryTabs active="achievements"` + one `client:only` island) + `screen-kit.css` + `achievements-screen.css`.
2. **Enable the tab.** `TrajectoryTabs` gains `active="achievements"` support and points the Achievements entry at `/[lang]/achievements` (no longer disabled).
3. **Categories** = a deterministic id→category map (`CATEGORY_OF`) covering all 32 achievements into the 6 mockup categories. Counts are real (earned/total per category). If real category totals differ from the mockup's, the real numbers win.
4. **Earned vs locked.** Earned = in `evaluateAchievements(state, ctx)`. Date = `progression.achievements[id]` formatted with `toLocaleDateString(lang)`; if a mark is predicate-earned but has no stored timestamp, show "earned" without a date (honest). Locked = the rest, showing `desc` as the unlock condition.
5. **Near-miss** = `near-miss.ts`: a curated map of locked achievements whose progress is a clear `current/target` from `AchievementCtx`/state (streak best→30, drillsSolved→25, englishKnown→2000/5000, pillarsVisited→5/10, history→40, englishReadUnits→40, …). Returns the top 3 closest (highest pct, < 100%). Honest; omitted when none qualify.
6. **Titles equip.** Show earned (`titlesFromState`) + locked `TITLES` (locked → condition "3 lessons in `<pillar>`"). Equip is single-select, persisted via a small isolated `equipped-title` signal (`localStorage["awesome.equipped-title"]`) — NOT a `userState` schema change. "Shown beside your name" is noted as a future hook (not wired into other screens here).
7. **Icons** = the real emoji `icon` from each `AchievementDef`, set inside the editorial seal medallion (no bespoke SVG per mark).
8. **One island**, EN+RU, light+dark. Cold/empty account: tally 0/32, every group all-locked, near-miss may be empty, no titles — renders cleanly, never crashes.

---

## 3. Architecture

```
achievements.astro                     (Astro page — NEW)
  ├─ screen-kit.css + achievements-screen.css
  ├─ screen-head ("the case of marks")        ← static
  ├─ <TrajectoryTabs active="achievements"/>  ← static (tab now enabled)
  └─ <AchievementsPanel client:only="preact"/>  ← THE island
        ├─ SummaryBar      (tally + category rail)
        ├─ NearMiss        (within-reach strip)
        ├─ TitlesEquip     (equippable titles)
        └─ SealGroups      (per-category earned/locked seal grid)
```

### New pure modules (TDD, local)
- **`src/scripts/progression/achievement-view.ts`** — `CATEGORY_OF: Record<string, Category>` (all 32 ids; exhaustiveness test); `Category` = `"consistency"|"depth"|"breadth"|"drills"|"english"|"mastery"`; `groupAchievements(earnedSet, dates, lang): { category, label, earned, total, marks: {id,name,cond,icon,earned,date|null}[] }[]` + `tally(earnedSet)` → `{earned, total}`.
- **`src/scripts/progression/near-miss.ts`** — `nearMiss(state, ctx, earnedSet): { id, name, cond, current, target, pct }[]` (top 3, < 100%, from the curated numeric map). Pure.

### New island state (local)
- **`src/scripts/progression/equipped-title.ts`** — `equippedTitle` signal + `setEquippedTitle(id|null)` persisted to `localStorage["awesome.equipped-title"]` (isolated; no userState migration).

### Components (built by a subagent vs the HANDOFF)
`src/components/progression/achievements/`: `AchievementsPanel` (island shell), `SummaryBar`, `NearMiss`, `TitlesEquip`, `SealGroups`. New `achievements-screen.css`.

---

## 4. Data flow & error handling

- The island reads `userState.value` (pretest/history/retrieval/progression) + builds the same `ctx` `ProfilePanel` builds (drills via `loadStore`, english via `english/stats`, etc.) → `evaluateAchievements` → earned set. Dates from `progression.achievements`. All synchronous reads; signal-subscribed.
- Fresh account: earned set empty → tally 0/32, all seals locked, near-miss from whatever ctx allows (often empty), no titles. No throw.
- Near-miss guards division-by-zero and only emits `< 100%` items with a positive target.
- Equip writes the isolated localStorage signal; never touches synced state.
- `ctx.hourOfDay` uses `new Date().getHours()` at the island boundary (client:only, no SSR) — same pattern as the live ProfilePanel.

## 5. Testing

- **Unit:** `achievement-view.test.ts` (CATEGORY_OF covers all 32 ids exactly once; grouping counts; date passthrough/null); `near-miss.test.ts` (curated progress, top-3, <100% filter, zero-target guard).
- **Build/lint:** `bun run build` 0/0; i18n parity; one island; the new route renders EN+RU.
- **Visual:** Playwright clipped 2× shots, light+dark, EN+RU (seed a placed pretest + history + streak so earned marks + dates + near-miss + titles populate) — tally/rail, near-miss, titles equip toggle, seal groups (earned with date vs locked). Confirm the now-enabled Achievements tab links correctly from the other screens.
- **Hybrid verify-behind:** reviewer + gates + visual per `feedback_cowork-hybrid`.

## 6. Out of scope

- New achievement predicates / categories beyond mapping existing ones.
- Showing the equipped title on other screens (the signal exists; wiring its display elsewhere is a follow-up).
- Bespoke per-mark SVG icons (real emoji used).
