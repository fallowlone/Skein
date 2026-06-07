# Progression Screen Re-skin — Design

**Date:** 2026-06-07
**Sub-project:** Redesign v2, screen 3 of 5 (after English Hub, Planning). Source: `docs/redesign/v2/`.
**Target:** `/[lang]/profile` — the player-progression screen (`ProfilePanel.tsx`).
**Nature:** Re-skin of a **working feature wired to real data**. The progression engine (`src/scripts/progression/*`) already computes rank, rating, XP, streak, titles, achievements, and the placement flow. This re-skin re-presents them in the editorial-cartographic "Progression" layout and adds two honestly-derived instruments (per-domain competence radar, derived missions) on top of existing signals — no new rating math.

---

## 1. Data → mockup mapping (verified against source)

| Mockup region | Real engine source | Status |
|---|---|---|
| Current rank seal + tier + position + "+X to next" | `ranks.ts` (`RANKS` 25, `ratingToRank`, `nextRank`, `rankById`); `userState.pretest.rating`/`.rank` | exists |
| 25-rank ladder (neighbors, top %) | `RANKS` array (index → position/top%) | exists |
| **Per-domain rating radar (signature)** | **NEW** `domain-ratings.ts` — aggregate `masteryByTrack` (path-io) over `DOMAIN_FAMILIES` (mastery-field) → competence 0–100 per domain | **new read-model** |
| XP / level instrument | `currentXp`, `levelFromXp` (progression) | exists |
| Streak current / best | `userState.progression.streak.{count,best}` | exists (best date-range omitted — not stored) |
| Quests / missions | **NEW** `missions.ts` — derive 2–3 from real signals (weakest-domain gap, streak-to-milestone, capstone progress) | **new derivation** |
| Rank-up acknowledgment | derived: current rank index vs a stored `ackedRank` in userState; dismiss persists | small new state |
| Placement (first-run) | `Pretest.tsx` (2-stage adaptive), shown when `!pretest` — current behaviour | exists |
| Titles earned | `titlesFromState` + `TITLES` | exists |
| Season / "ends in 18 days" | — no engine — | **OMITTED** (no fabrication) |

**No fabricated data.** The mockup's `1,840` rating, `Season II`, named streak date-range, and the canned quest reward numbers (`+90 rating`) are NOT carried — the engine has no season, no per-quest rating reward, no per-domain Elo. Real values replace them; underivable ones are omitted.

### The signature, honestly framed

The engine has a **single** rating (0–1000, from the placement pretest), not a per-domain Elo. The radar therefore plots **per-domain competence** derived from the path-engine knowledge (concept mastery aggregated to the 8 `DOMAIN_FAMILIES`), on a 0–100 scale. It is labelled as competence/mastery by domain — NOT presented as a per-domain rating the engine doesn't compute. This keeps the signature honest while delivering exactly the mockup's intent ("strong backend next to a real distributed gap"). The global rating stays the headline number; the radar is the per-domain texture beneath it.

---

## 2. Decisions (locked, autonomous)

1. **Reuse `TrajectoryTabs`** (built for Planning) — generalize it to honor the `active` prop (set `aria-current` on the active tab, link the rest). Progression active; Planning → `/roadmap`, Cabinet → `/account`, Achievements disabled.
2. **Extract a shared `screen-kit.css`** — the cluster chrome (`.page/.wrap/.screen/.screen-head/.traj-tabs/.panel/.btn*/.seg/.sec-head/.badge/.fig-caption`) currently lives in `planning-screen.css`. Move the shared base into `src/styles/screen-kit.css`; `planning-screen.css` and the new `progression-screen.css` both `@import`/load it + their screen-specific rules. DRY across the 4-screen cluster. **Planning must render identically after the extraction** (verified in QA).
3. **Per-domain radar = competence from mastery**, 0–100, 8 domain families (reuse `DOMAIN_FAMILIES`). New pure `domain-ratings.ts`. Both an SVG radar polygon and the domain bars read from it.
4. **Missions = derived, honest.** `missions.ts` produces up to 3 from real signals: (a) weakest-domain gap (`domain-ratings` lowest family → "Close the <domain> gap: known/total"), (b) consistency (`streak.count` → next 7/14/30 milestone), (c) capstone progress (from `capstone-state.ts` if it exposes progress; else dropped). Reward line states the **real** outcome (e.g. "completes the Distributed domain", "unlocks Title: …") — no fabricated `+rating`. Fewer than 3 is fine; never pad.
5. **Rank-up ack** — show only when `rankIndex(pretest.rank) > userState.progression.ackedRank` (default 0/absent → no banner for a fresh non-placed account; first placement sets it without a banner). Dismiss persists `ackedRank`. Minimal honest state addition.
6. **Omit season.** No season engine → no season chip/countdown.
7. **Rating scale stays 0–1000** (the engine's). Rank seal shows the rank ordinal (1–25); "top %" from ladder index. No invented Elo magnitude.
8. **Drop `DueToday` from `/profile`.** It belongs to the review/roadmap flow (the mockup Progression has no due-today). Keep the screen focused; DueToday remains on `/roadmap`+`/review`.
9. **One island, client-only.** `profile.astro` keeps a single `<ProfilePanel client:only="preact">`; static screen-head + tabs render in the Astro page. Hydration unchanged.
10. **Bilingual EN+RU**, linter-enforced. **Light + dark.**

---

## 3. Architecture

```
profile.astro                          (Astro page)
  ├─ load screen-kit.css + progression-screen.css
  ├─ screen-head (kicker/title/sub)            ← static
  ├─ <TrajectoryTabs active="progression"/>    ← static
  └─ <ProfilePanel client:only="preact"/>      ← THE island
        ProfilePanel (shell; reads userState + path-io + progression scripts)
          ├─ first-run? → PlacementIntro → <Pretest/>           (re-skin of current no-pretest path)
          ├─ RankUpBanner (conditional, derived)
          ├─ RankNow (seal + tier + position + "+X to next") + RankLadder (25)
          ├─ DomainRadar  (signature: SVG polygon + domain bars)   ← domain-ratings
          ├─ XpStreakInstruments (XP/level + current + best streak)
          ├─ MissionsList (derived)                                 ← missions
          └─ TitlesRow / AchievementsLink
```

### New pure modules (TDD, local)

- **`src/scripts/progression/domain-ratings.ts`** — `domainRatings(knowledge, concepts, threshold): { key, label, hue, score /*0..100*/, known, total }[]` over `DOMAIN_FAMILIES`; `score = round(100 * known/total)` (or avg confidence — pick avg-confidence for a smoother radar; spec'd in plan). Plus `weakestDomain(ratings)` / `strongestDomain` for the radar caption + missions.
- **`src/scripts/progression/missions.ts`** — `deriveMissions(ctx): Mission[]` where `ctx = { domains, streak, capstone? }`, `Mission = { id, title{en,ru}, done, total, rewardKind, rewardLabel{en,ru} }`. Pure; ≤3; drops a mission whose source is empty.
- **`src/scripts/progression/ladder.ts`** (or extend ranks usage) — pure helpers `ladderRows(currentRating): { rank, current, reached, ratingFloor }[]` and `rankPosition(rank): { index /*1..25*/, topPct }`. (Thin wrappers over `RANKS`; unit-tested for boundaries.)

### New components (built in-process by a subagent vs the HANDOFF, like Planning — cowork can't use git)

`src/components/progression/`: `RankNow`, `RankLadder`, `DomainRadar`, `XpStreakInstruments`, `MissionsList`, `RankUpBanner`, `PlacementIntro`, and the `ProfilePanel` rewrite. Reuse existing `RankBadge`, `Pretest`, `AchievementGrid`, `titles`. New `progression-screen.css` + extracted `screen-kit.css`.

---

## 4. Data flow & error handling

- Reads: `userState` signal (pretest/rating/streak/titles/achievements/ackedRank), `knowledge`+`config` (path-io, for the radar/missions), `currentXp`. Writes: only `userState` for the rank-up ack dismiss (existing signal pattern). No new persistence keys beyond an `ackedRank` field on `userState.progression`.
- **First run** (`!pretest`): radar/rank/missions hidden; show the re-skinned placement intro + `Pretest`. No crash on empty knowledge (radar all-zero is fine, but it's gated behind placement anyway).
- **Empty knowledge but placed:** radar renders all-low (honest); missions may be empty → MissionsList omits itself.
- **Capstone source absent:** the capstone mission is simply not produced.
- **Rank-up ack:** guarded so a first placement does not flash a "rank up" (sets `ackedRank` silently); only a genuine increase shows the banner.
- **CSS:** every `var(--*)` resolves live; the radar uses domain `--d-*` hues + `--known`/`--accent`. No unresolved tokens.

---

## 5. Testing

- **Unit (Vitest):** `domain-ratings.test.ts` (family aggregation, 0/partial/full, weakest/strongest); `missions.test.ts` (derivation, ≤3, empty-source drop, milestone thresholds); `ladder.test.ts` (position/topPct at rank boundaries, neighbors).
- **Build/lint:** `bun run build` 0/0; i18n parity; one island on the page.
- **Visual:** Playwright clipped 2× shots, light+dark, EN+RU — radar polygon + ladder + missions + rank seal render with real (seeded) data. Judge contrast on clips. **Confirm Planning still renders identically after the `screen-kit.css` extraction.**
- **Hybrid verify-behind:** independent reviewer + controller fixes + gates + visual + dead-code/junk cleanup (per `feedback_cowork-hybrid`).

---

## 6. Out of scope

- Rating math / per-domain Elo (radar uses derived mastery competence, clearly labelled).
- Achievements **screen** (separate sub-project 4); this screen only links to it + shows earned titles/marks inline as the mockup does.
- Seasons, quest reward economy (no engine).
- The other two screens (Achievements, Personal Cabinet).
