# Player Progression — Adaptive Leveling + Gamification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Pretest with a two-stage adaptive test (standard → deep round for top performers) that produces a 25-rank gamified level, plus an XP/level + achievements + streak + titles progression layer and a player profile page.

**Architecture:** A pure, unit-tested `progression/` core (state in → numbers/ranks/achievements out, no DOM/localStorage) drives thin Preact components. The existing 3-tier content routing (`junior|middle|senior`) is derived from the rank, so nothing downstream changes. New state is additive on `UserState` and rides the existing auth progress-sync. Built in 3 shippable phases.

**Tech Stack:** Astro 5 + Preact (`class`, `preact/hooks`, `~` alias), `@preact/signals` user-state, vitest. Types in `site/src/types/index.ts` (`Tier`, `Lang`, `Bilingual`). Spec: `docs/superpowers/specs/2026-05-29-player-progression-design.md`.

---

## File structure (locked decomposition)

```
site/src/scripts/progression/
  rating.ts        + rating.test.ts        scoreStage, maxScore, qualifiesForStage2, computeRating, confidenceOf
  ranks.ts         + ranks.test.ts         RANKS[] (25), ratingToRank, nextRank
  rank-tier.ts     + rank-tier.test.ts     rankToTier
  xp.ts            + xp.test.ts            xpFromState, levelFromXp
  achievements.ts  + achievements.test.ts  ACHIEVEMENTS[], evaluateAchievements
  streak.ts        + streak.test.ts        updateStreak, todayISO
  titles.ts        + titles.test.ts        TITLES[], titlesFromState
  types.ts                                 shared progression types (Rank, PretestResult, Progression, AchievementCtx)
site/src/scripts/pretest-questions.ts      + export advancedQuestions (Stage-2 bank)
site/src/scripts/user-state.ts             widen pretest, add progression, derive tier, setPretestResult, recordActiveDay
site/src/scripts/account-sync.ts           mergeProgress learns `progression` + widened `pretest`
site/src/components/progression/
  RankBadge.tsx        rank icon + division + label
  RankUpReveal.tsx     result card (rank, rating, confidence, tier, next-rank bar)
  XpBar.tsx            level + progress-to-next
  AchievementGrid.tsx  lit/dim grid
  StreakChip.tsx       streak count + best
  ProfilePanel.tsx     dashboard island (reads userState + drill store → core → render)
site/src/components/pedagogy/Pretest.tsx   two-stage flow
site/src/pages/[lang]/profile.astro        profile page
site/src/components/account/AccountMenu.tsx  + profile link
```

**Conventions:** Preact islands import hooks from `preact/hooks`, use `class`, default export, `~` alias → `site/src`. i18n via `import { t, type Locale } from "~/i18n"`. Run a single test file: `cd site && bun run test <path>`. Full build: `cd site && bun run build` (slow; lint must be 0 errors — check `dist/lint-report.json`).

---

# PHASE 1 — leveling core

## Task 1: `progression/rating.ts` + types

**Files:** Create `site/src/scripts/progression/types.ts`, `site/src/scripts/progression/rating.ts`, `site/src/scripts/progression/rating.test.ts`

- [ ] **Step 1: Create `site/src/scripts/progression/types.ts`**

```ts
import type { Tier } from "~/types";

export type RankId = string; // e.g. "engineer-2", "distinguished"

export interface RankDef {
  id: RankId;
  tier: string;       // display tier name, e.g. "Engineer"
  division: 1 | 2 | 3 | null; // null = apex
  min: number;        // inclusive rating lower bound
  max: number;        // exclusive upper bound (except the apex, inclusive at 1000)
  contentTier: Tier;  // junior | middle | senior
  icon: string;       // emoji/glyph
  color: string;      // css var or hex
  label: { en: string; ru: string };
}

export interface StageResult { score: number; answers: number[]; }

export interface PretestResult {
  takenAt: number;
  stage1: StageResult;
  stage2?: StageResult;
  rating: number;        // 0–1000, best-ever
  rank: RankId;
  confidence: "high" | "medium";
}

export interface Progression {
  xp: number;
  level: number;
  achievements: Record<string, number>; // id → unlockedAt ms
  streak: { lastActiveDay: string; count: number; best: number };
  titles: string[];
}

export interface AchievementCtx {
  drillsSolved: number;
  drillUnitsWithSolve: number;
  noHintSolve: boolean;
  hourOfDay: number; // 0–23, local
}
```

- [ ] **Step 2: Write the failing test `rating.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { scoreStage, maxScore, qualifiesForStage2, computeRating, confidenceOf } from "./rating";

const bank = [
  { id: "a", prompt: { en: "", ru: "" }, choices: [{ label: { en: "", ru: "" }, weight: 0 }, { label: { en: "", ru: "" }, weight: 3 }] },
  { id: "b", prompt: { en: "", ru: "" }, choices: [{ label: { en: "", ru: "" }, weight: 0 }, { label: { en: "", ru: "" }, weight: 3 }] },
] as any;

describe("rating", () => {
  it("scores chosen weights and maxScore is sum of per-question maxima", () => {
    expect(maxScore(bank)).toBe(6);
    expect(scoreStage([1, 1], bank)).toBe(6); // both weight-3
    expect(scoreStage([0, 1], bank)).toBe(3);
  });

  it("gate fires at s1 >= 0.75, not below", () => {
    expect(qualifiesForStage2(0.74)).toBe(false);
    expect(qualifiesForStage2(0.75)).toBe(true);
  });

  it("rating caps at 750 without stage 2, unlocks 750–1000 with it", () => {
    expect(computeRating(1)).toBe(750);          // perfect stage1, no stage2
    expect(computeRating(0.5)).toBe(375);
    expect(computeRating(1, 0)).toBe(750);       // qualified, bombed stage2
    expect(computeRating(1, 1)).toBe(1000);      // perfect both
    expect(computeRating(1, 0.5)).toBe(875);
  });

  it("confidence is high when chosen weights are consistent, medium when spread", () => {
    expect(confidenceOf([[3, 3, 3]])).toBe("high");           // all top
    expect(confidenceOf([[0, 3, 0, 3]])).toBe("medium");      // alternating
  });
});
```

- [ ] **Step 3: Run → fail.** `cd site && bun run test src/scripts/progression/rating.test.ts` → FAIL (module not found).

- [ ] **Step 4: Write `rating.ts`**

```ts
import type { PretestQuestion } from "../pretest-questions";

export function maxScore(bank: PretestQuestion[]): number {
  return bank.reduce((sum, q) => sum + Math.max(0, ...q.choices.map((c) => c.weight)), 0);
}

export function scoreStage(answers: number[], bank: PretestQuestion[]): number {
  return answers.reduce((sum, choiceIdx, qIdx) => sum + (bank[qIdx]?.choices[choiceIdx]?.weight ?? 0), 0);
}

export function qualifiesForStage2(s1: number): boolean {
  return s1 >= 0.75;
}

/** s1, s2 are normalized [0,1]. Stage-1-only caps at 750; stage 2 unlocks 750–1000. */
export function computeRating(s1: number, s2?: number): number {
  if (s2 === undefined) return Math.round(750 * clamp01(s1));
  return 750 + Math.round(250 * clamp01(s2));
}

/** Consistency of the per-question normalized weights chosen across both stages. */
export function confidenceOf(weightLists: number[][]): "high" | "medium" {
  const all = weightLists.flat();
  if (all.length === 0) return "medium";
  const norm = all.map((w) => w / 3);
  const mean = norm.reduce((a, b) => a + b, 0) / norm.length;
  const variance = norm.reduce((a, b) => a + (b - mean) ** 2, 0) / norm.length;
  return Math.sqrt(variance) <= 0.25 ? "high" : "medium";
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
```

- [ ] **Step 5: Run → pass.** Same command → 4 tests pass.

- [ ] **Step 6: Commit**
```bash
git add site/src/scripts/progression/types.ts site/src/scripts/progression/rating.ts site/src/scripts/progression/rating.test.ts
git commit -m "feat(progression): MST rating core (scoring, gate, rating, confidence)"
```

---

## Task 2: `progression/ranks.ts` — the 25-rank ladder

**Files:** Create `site/src/scripts/progression/ranks.ts`, `ranks.test.ts`

- [ ] **Step 1: Write the failing test `ranks.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { RANKS, ratingToRank, nextRank } from "./ranks";

describe("ranks", () => {
  it("has 25 ranks covering 0–1000 contiguously with no gap/overlap", () => {
    expect(RANKS).toHaveLength(25);
    let prev = 0;
    for (const r of RANKS) { expect(r.min).toBe(prev); prev = r.max; }
    expect(prev).toBe(1000);
  });

  it("maps boundary ratings to the right rank", () => {
    expect(ratingToRank(0).id).toBe("initiate-3");
    expect(ratingToRank(1000).id).toBe("distinguished");
    expect(ratingToRank(750).tier).toBe("Staff");        // first senior rank
    expect(ratingToRank(749).contentTier).not.toBe("senior"); // stage-1 ceiling stays sub-senior
  });

  it("nextRank returns the rank above, null at the apex", () => {
    expect(nextRank(ratingToRank(0)).id).toBe("initiate-2");
    expect(nextRank(ratingToRank(1000))).toBeNull();
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Write `ranks.ts`** (band edges fixed; each tier 3 divisions III→II→I except apex)

```ts
import type { RankDef, RankId } from "./types";

type Tri = [number, number, number, number]; // [d3min, d2min, d1min, tierMax]
function tier(name: string, ct: RankDef["contentTier"], icon: string, color: string, edges: Tri,
  labels: { en: string; ru: string }): RankDef[] {
  const [a, b, c, d] = edges;
  const mk = (div: 3 | 2 | 1, min: number, max: number): RankDef => ({
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-${div}`,
    tier: name, division: div, min, max, contentTier: ct, icon, color,
    label: { en: `${labels.en} ${roman(div)}`, ru: `${labels.ru} ${roman(div)}` },
  });
  return [mk(3, a, b), mk(2, b, c), mk(1, c, d)];
}
function roman(d: number): string { return d === 1 ? "I" : d === 2 ? "II" : "III"; }

export const RANKS: RankDef[] = [
  ...tier("Initiate", "junior", "🌱", "#8a8f9c", [0, 42, 84, 125], { en: "Initiate", ru: "Initiate" }),
  ...tier("Apprentice", "junior", "🔧", "#7c9aa6", [125, 177, 228, 280], { en: "Apprentice", ru: "Apprentice" }),
  ...tier("Practitioner", "junior", "⚙️", "#6fae8f", [280, 337, 394, 450], { en: "Practitioner", ru: "Practitioner" }),
  ...tier("Engineer", "middle", "🛠️", "#6aa3d6", [450, 500, 550, 600], { en: "Engineer", ru: "Engineer" }),
  ...tier("Senior Engineer", "middle", "📐", "#5c8ad6", [600, 650, 700, 750], { en: "Senior Engineer", ru: "Senior Engineer" }),
  ...tier("Staff", "senior", "🧭", "#9a7cd6", [750, 780, 810, 840], { en: "Staff", ru: "Staff" }),
  ...tier("Principal", "senior", "🔭", "#c07cd6", [840, 870, 900, 930], { en: "Principal", ru: "Principal" }),
  ...tier("Architect", "senior", "🏛️", "#d6a25c", [930, 950, 970, 990], { en: "Architect", ru: "Architect" }),
  { id: "distinguished", tier: "Distinguished", division: null, min: 990, max: 1000, contentTier: "senior", icon: "👑", color: "#d6c15c", label: { en: "Distinguished", ru: "Distinguished" } },
];

export function ratingToRank(rating: number): RankDef {
  const r = Math.max(0, Math.min(1000, rating));
  for (const rank of RANKS) {
    if (r >= rank.min && (r < rank.max || (rank.division === null && r <= rank.max))) return rank;
  }
  return RANKS[RANKS.length - 1];
}

export function nextRank(rank: RankDef): RankDef | null {
  const i = RANKS.findIndex((r) => r.id === rank.id);
  return i >= 0 && i < RANKS.length - 1 ? RANKS[i + 1] : null;
}

export function rankById(id: RankId): RankDef {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}
```

- [ ] **Step 4: Run → pass** (3 tests). Fix band edges if the contiguity test fails (each tier's `tierMax` must equal the next tier's first `min`).

- [ ] **Step 5: Commit**
```bash
git add site/src/scripts/progression/ranks.ts site/src/scripts/progression/ranks.test.ts
git commit -m "feat(progression): 25-rank ladder + ratingToRank"
```

---

## Task 3: `progression/rank-tier.ts` — routing bridge

**Files:** Create `site/src/scripts/progression/rank-tier.ts`, `rank-tier.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { rankToTier } from "./rank-tier";
import { ratingToRank, RANKS } from "./ranks";
import type { Tier } from "~/types";

describe("rank-tier", () => {
  it("derives the content tier from a rank id", () => {
    expect(rankToTier("initiate-3")).toBe("junior");
    expect(rankToTier("engineer-1")).toBe("middle");
    expect(rankToTier("staff-3")).toBe("senior");
    expect(rankToTier("distinguished")).toBe("senior");
  });

  it("is monotonic: rising rating never lowers the tier", () => {
    const order: Tier[] = ["junior", "middle", "senior"];
    let max = 0;
    for (const r of RANKS) {
      const idx = order.indexOf(rankToTier(r.id));
      expect(idx).toBeGreaterThanOrEqual(max);
      max = idx;
    }
  });

  it("no rank at or below the stage-1 ceiling (750) is senior", () => {
    expect(rankToTier(ratingToRank(749).id)).not.toBe("senior");
    expect(rankToTier(ratingToRank(750).id)).toBe("senior");
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Write `rank-tier.ts`**
```ts
import type { Tier } from "~/types";
import { rankById } from "./ranks";

export function rankToTier(rankId: string): Tier {
  return rankById(rankId).contentTier;
}
```

- [ ] **Step 4: Run → pass** (3 tests).

- [ ] **Step 5: Commit**
```bash
git add site/src/scripts/progression/rank-tier.ts site/src/scripts/progression/rank-tier.test.ts
git commit -m "feat(progression): rank → content-tier bridge"
```

---

## Task 4: Stage-2 advanced question bank

**Files:** Modify `site/src/scripts/pretest-questions.ts`

- [ ] **Step 1: Append an `advancedQuestions` export** after the existing `pretestQuestions` array. Author **6** hard, discriminating senior+ questions across distinct pillars, each with 4 choices weighted 0–3 (weight 3 = the genuinely-expert answer; weight 2 = plausible-but-incomplete; 1 = shallow; 0 = wrong). EN+RU. Same `PretestQuestion` shape. Topics (one each): Postgres MVCC bloat / `VACUUM` vs `autovacuum` freeze, distributed consensus (why Raft needs a majority quorum / split-brain), HTTP caching (`Vary` + `stale-while-revalidate` semantics), JS event-loop microtask vs macrotask starvation, TLS session resumption (0-RTT replay risk), and CAP/PACELC tradeoff under partition. Write at the depth of the existing `db-index` BRIN question (the existing exemplar in this file). Example shape to match exactly:

```ts
export const advancedQuestions: PretestQuestion[] = [
  {
    id: "adv-mvcc",
    prompt: {
      en: "An append-heavy Postgres table's reads slow down over weeks despite an index. autovacuum is on. Most likely?",
      ru: "Чтения из append-heavy таблицы Postgres деградируют неделями, несмотря на индекс. autovacuum включён. Вероятная причина?",
    },
    choices: [
      { label: { en: "The index is corrupt", ru: "Индекс повреждён" }, weight: 0 },
      { label: { en: "Table needs more RAM", ru: "Таблице нужно больше RAM" }, weight: 1 },
      { label: { en: "Dead tuples accumulate faster than autovacuum reclaims them, bloating heap + index", ru: "Мёртвые кортежи копятся быстрее, чем их собирает autovacuum — раздувание heap и индекса" }, weight: 2 },
      { label: { en: "Long-running transactions hold the xmin horizon back, so autovacuum can't remove dead tuples — bloat + index-only scans degrade until the snapshot is released", ru: "Долгие транзакции удерживают xmin horizon, autovacuum не может удалить мёртвые кортежи — bloat и деградация index-only scan, пока снапшот не освобождён" }, weight: 3 },
    ],
  },
  // … 5 more: adv-consensus, adv-http-cache, adv-event-loop, adv-tls-0rtt, adv-capacity
];
```
Author the remaining 5 at the same depth. (The full set ships in the file; this plan fixes the ids, count, and depth bar.)

- [ ] **Step 2: Add a count guard test** `site/src/scripts/progression/bank.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pretestQuestions, advancedQuestions } from "../pretest-questions";

describe("question banks", () => {
  it("stage 1 has questions; stage 2 has ≥5 advanced, all 4 choices weighted 0–3 with a top-weight present", () => {
    expect(pretestQuestions.length).toBeGreaterThanOrEqual(4);
    expect(advancedQuestions.length).toBeGreaterThanOrEqual(5);
    for (const q of advancedQuestions) {
      expect(q.choices.length).toBe(4);
      expect(Math.max(...q.choices.map((c) => c.weight))).toBe(3);
      expect(q.prompt.en.length).toBeGreaterThan(10);
      expect(q.prompt.ru.length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 3: Run → pass.** `cd site && bun run test src/scripts/progression/bank.test.ts`

- [ ] **Step 4: Commit**
```bash
git add site/src/scripts/pretest-questions.ts site/src/scripts/progression/bank.test.ts
git commit -m "feat(progression): stage-2 advanced question bank EN+RU"
```

---

## Task 5: widen `user-state` + migration + sync merge

**Files:** Modify `site/src/scripts/user-state.ts`, `site/src/scripts/account-sync.ts`; create `site/src/scripts/user-state.migrate.test.ts`

- [ ] **Step 1: Failing test `user-state.migrate.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { migratePretest, defaultProgression } from "./user-state";

describe("user-state migration", () => {
  it("upgrades a legacy flat pretest to a stage-1-only result", () => {
    const legacy = { takenAt: 100, score: 6, answers: [3, 3] } as any;
    const r = migratePretest(legacy, 6); // oldMax = 6
    expect(r.stage1.score).toBe(6);
    expect(r.rating).toBe(750);          // 750 * (6/6)
    expect(r.stage2).toBeUndefined();
    expect(typeof r.rank).toBe("string");
    expect(r.confidence).toBeDefined();
  });
  it("passes through an already-migrated result unchanged", () => {
    const modern = { takenAt: 1, stage1: { score: 3, answers: [1] }, rating: 375, rank: "practitioner-2", confidence: "high" } as any;
    expect(migratePretest(modern, 6)).toBe(modern);
  });
  it("defaultProgression is zeroed", () => {
    const p = defaultProgression();
    expect(p.xp).toBe(0); expect(p.level).toBe(1);
    expect(p.achievements).toEqual({}); expect(p.streak.count).toBe(0);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Edit `user-state.ts`.**

(a) Replace the `import type { Tier, Lang }` line and add progression imports:
```ts
import type { Tier, Lang } from "../types";
import type { PretestResult, Progression } from "./progression/types";
import { ratingToRank } from "./progression/ranks";
import { rankToTier } from "./progression/rank-tier";
import { computeRating, confidenceOf } from "./progression/rating";
```

(b) Change the `UserState` `pretest` field and add `progression`:
```ts
  pretest: PretestResult | null;
  progression: Progression;
```

(c) Add to `defaults`:
```ts
  pretest: null,
  progression: { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] },
```

(d) Add exported helpers + migration, and run migration inside `load()`:
```ts
export function defaultProgression(): Progression {
  return { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] };
}

/** Upgrade a legacy { takenAt, score, answers } pretest to a PretestResult. Idempotent. */
export function migratePretest(p: any, oldMax: number): PretestResult | null {
  if (!p) return null;
  if (p.stage1) return p as PretestResult; // already modern
  const s1 = oldMax > 0 ? p.score / oldMax : 0;
  const rating = computeRating(s1);
  return {
    takenAt: p.takenAt ?? Date.now(),
    stage1: { score: p.score ?? 0, answers: p.answers ?? [] },
    rating,
    rank: ratingToRank(rating).id,
    confidence: confidenceOf([(p.answers ?? []).map((_: number, i: number) => 0)]),
  };
}
```
In `load()`, after `const merged = { ...defaults, ...JSON.parse(raw) }` (refactor the return to a named `merged`), normalize:
```ts
    const merged = { ...defaults, ...JSON.parse(raw) } as UserState;
    if (!merged.progression) merged.progression = defaultProgression();
    // migrate legacy pretest shape (oldMax = number of legacy stage-1 questions × 3 ceiling; use the live bank length)
    // Lazy import avoided: legacy oldMax is recomputed from the stored answers' length as a safe lower bound.
    if (merged.pretest && !(merged.pretest as any).stage1) {
      const ans = (merged.pretest as any).answers ?? [];
      merged.pretest = migratePretest(merged.pretest as any, Math.max(1, ans.length * 3));
    }
    return merged;
```

(e) Replace `setPretest` with `setPretestResult` (keep best-on-reclimb) and derive tier:
```ts
export function setPretestResult(result: PretestResult) {
  const prev = userState.value.pretest;
  // ranked re-climb: keep the better rating
  const best = prev && prev.rating >= result.rating ? prev : result;
  userState.value = { ...userState.value, pretest: best, tier: rankToTier(best.rank) };
}
```
Keep the old `setPretest(score, answers)` as a thin shim that builds a stage-1-only result via `migratePretest`, so any other caller still compiles:
```ts
export function setPretest(score: number, answers: number[]) {
  const r = migratePretest({ takenAt: Date.now(), score, answers }, Math.max(1, answers.length * 3));
  if (r) setPretestResult(r);
}
```

(f) Add a streak hook used by pages:
```ts
import { updateStreak, todayISO } from "./progression/streak"; // (streak.ts lands in Phase 3; this import is added in Phase 3, NOT here)
```
> Do NOT add the streak import in Phase 1 — `streak.ts` doesn't exist yet. The `recordActiveDay` function is added in Phase 3 Task 10. Leave it out now.

- [ ] **Step 4: Edit `account-sync.ts` `mergeProgress`** so the new fields survive sync. Add to the returned object (after the existing `pretest` line):
```ts
    pretest: pickBetterPretest(local.pretest, server.pretest),
    progression: mergeProgression(local.progression, server.progression),
```
and add these helpers at the bottom of the file:
```ts
import type { PretestResult, Progression } from "./progression/types";

function pickBetterPretest(a?: PretestResult | null, b?: PretestResult | null): PretestResult | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.rating >= b.rating ? a : b; // keep the higher rating across devices
}

function mergeProgression(a?: Progression, b?: Progression): Progression {
  const base: Progression = a ?? { xp: 0, level: 1, achievements: {}, streak: { lastActiveDay: "", count: 0, best: 0 }, titles: [] };
  if (!b) return base;
  return {
    xp: Math.max(a?.xp ?? 0, b.xp ?? 0),
    level: Math.max(a?.level ?? 1, b.level ?? 1),
    achievements: { ...b.achievements, ...(a?.achievements ?? {}) }, // earliest-wins union (local kept on conflict)
    streak: { // keep the most recent day; best is the max
      lastActiveDay: (a?.streak.lastActiveDay ?? "") >= (b.streak.lastActiveDay ?? "") ? (a?.streak.lastActiveDay ?? "") : b.streak.lastActiveDay,
      count: (a?.streak.lastActiveDay ?? "") >= (b.streak.lastActiveDay ?? "") ? (a?.streak.count ?? 0) : b.streak.count,
      best: Math.max(a?.streak.best ?? 0, b.streak.best ?? 0),
    },
    titles: Array.from(new Set([...(a?.titles ?? []), ...b.titles])),
  };
}
```
> The existing `mergeProgress` currently has `pretest: local.pretest ?? server.pretest`. Replace that single line with the `pickBetterPretest(...)` call; add the `progression` line; the type-only import of `PretestResult`/`Progression` is additive.

- [ ] **Step 5: Run migration test → pass.** `cd site && bun run test src/scripts/user-state.migrate.test.ts`. Then run the existing `account-sync.test.ts` to confirm no regression: `cd site && bun run test src/scripts/account-sync.test.ts`.

- [ ] **Step 6: Typecheck** `cd site && bun run check 2>&1 | grep -iE 'user-state|account-sync|progression' || echo "clean"` → no new errors.

- [ ] **Step 7: Commit**
```bash
git add site/src/scripts/user-state.ts site/src/scripts/account-sync.ts site/src/scripts/user-state.migrate.test.ts
git commit -m "feat(progression): widen user-state (rank result + progression) + sync merge + migration"
```

---

## Task 6: `Pretest.tsx` two-stage flow + `RankBadge` + `RankUpReveal`

**Files:** Create `site/src/components/progression/RankBadge.tsx`, `RankUpReveal.tsx`; rewrite the flow in `site/src/components/pedagogy/Pretest.tsx`

- [ ] **Step 1: `RankBadge.tsx`**
```tsx
import type { Locale } from "~/i18n";
import { rankById } from "~/scripts/progression/ranks";

export default function RankBadge({ rankId, lang, size = "md" }: { rankId: string; lang: Locale; size?: "sm" | "md" | "lg" }) {
  const r = rankById(rankId);
  const px = size === "lg" ? 40 : size === "sm" ? 18 : 26;
  return (
    <span class="inline-flex items-center gap-2">
      <span style={`font-size:${px}px;line-height:1;`} aria-hidden="true">{r.icon}</span>
      <span class="font-semibold" style={`color:${r.color};`}>{r.label[lang]}</span>
    </span>
  );
}
```

- [ ] **Step 2: `RankUpReveal.tsx`**
```tsx
import type { Locale } from "~/i18n";
import RankBadge from "./RankBadge";
import { ratingToRank, nextRank, rankById } from "~/scripts/progression/ranks";
import { rankToTier } from "~/scripts/progression/rank-tier";

export default function RankUpReveal({ rating, rankId, confidence, lang }:
  { rating: number; rankId: string; confidence: "high" | "medium"; lang: Locale }) {
  const r = rankById(rankId);
  const nxt = nextRank(r);
  const toNext = nxt ? nxt.min - rating : 0;
  const tier = rankToTier(rankId);
  return (
    <div class="flex flex-col gap-3">
      <div class="text-[11px] font-mono uppercase tracking-wider text-muted">{lang === "ru" ? "твой ранг" : "your rank"}</div>
      <div class="text-[28px]"><RankBadge rankId={rankId} lang={lang} size="lg" /></div>
      <div class="font-mono text-[13px] text-ink-2">
        {lang === "ru" ? "рейтинг" : "rating"} <strong>{rating}</strong> / 1000 · {confidence === "high" ? (lang === "ru" ? "уверенно" : "high confidence") : (lang === "ru" ? "средняя уверенность" : "medium confidence")}
      </div>
      {nxt && (
        <div class="flex flex-col gap-1">
          <div class="h-[6px] bg-rule rounded-full overflow-hidden">
            <div class="h-full bg-ink" style={`width:${Math.round(((rating - r.min) / (r.max - r.min)) * 100)}%`} />
          </div>
          <div class="text-[11px] text-muted font-mono">+{toNext} {lang === "ru" ? "до" : "to"} {nxt.label[lang]}</div>
        </div>
      )}
      <p class="text-[12px] text-muted">{lang === "ru"
        ? `Контентный уровень: ${tier}. Это placement-сигнал и мотивация, не сертификат — контент открыт весь.`
        : `Content tier: ${tier}. A placement signal and a nudge, not a certificate — all content stays open.`}</p>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `Pretest.tsx` flow.** Replace the imports and the `in-progress`/`done` logic so it runs Stage 1, gates, optionally runs Stage 2, then shows `RankUpReveal`. Full new file:

```tsx
import { useState } from "preact/hooks";
import { userState, setPretestResult } from "~/scripts/user-state";
import { pretestQuestions, advancedQuestions, type PretestQuestion } from "~/scripts/pretest-questions";
import { scoreStage, maxScore, qualifiesForStage2, computeRating, confidenceOf } from "~/scripts/progression/rating";
import { ratingToRank } from "~/scripts/progression/ranks";
import RankUpReveal from "~/components/progression/RankUpReveal";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };
type Phase = "untaken" | "stage1" | "gate" | "stage2" | "done";

const wrapClass = "my-8 max-w-[760px] bg-card border border-rule-strong rounded-[2px] overflow-hidden";
const headerClass = "flex items-center justify-between px-4 py-2.5 bg-card-2 border-b border-rule";

export default function Pretest({ lang }: Props) {
  const existing = userState.value.pretest;
  const [phase, setPhase] = useState<Phase>(existing ? "done" : "untaken");
  const [stage, setStage] = useState<1 | 2>(1);
  const [step, setStep] = useState(0);
  const [a1, setA1] = useState<number[]>([]);
  const [a2, setA2] = useState<number[]>([]);

  const bank: PretestQuestion[] = stage === 1 ? pretestQuestions : advancedQuestions;

  function finalize(s1: number, ans1: number[], s2?: number, ans2?: number[]) {
    const rating = computeRating(s1, s2);
    const weights1 = ans1.map((c, i) => pretestQuestions[i]?.choices[c]?.weight ?? 0);
    const weights2 = (ans2 ?? []).map((c, i) => advancedQuestions[i]?.choices[c]?.weight ?? 0);
    setPretestResult({
      takenAt: Date.now(),
      stage1: { score: scoreStage(ans1, pretestQuestions), answers: ans1 },
      stage2: s2 !== undefined ? { score: scoreStage(ans2 ?? [], advancedQuestions), answers: ans2 ?? [] } : undefined,
      rating,
      rank: ratingToRank(rating).id,
      confidence: confidenceOf([weights1, weights2]),
    });
    setPhase("done");
  }

  function answer(choiceIdx: number) {
    if (stage === 1) {
      const next = [...a1, choiceIdx];
      if (step + 1 >= pretestQuestions.length) {
        const s1 = scoreStage(next, pretestQuestions) / maxScore(pretestQuestions);
        setA1(next);
        if (qualifiesForStage2(s1)) { setPhase("gate"); }
        else finalize(s1, next);
      } else { setA1(next); setStep(step + 1); }
    } else {
      const next = [...a2, choiceIdx];
      if (step + 1 >= advancedQuestions.length) {
        const s1 = scoreStage(a1, pretestQuestions) / maxScore(pretestQuestions);
        const s2 = scoreStage(next, advancedQuestions) / maxScore(advancedQuestions);
        finalize(s1, a1, s2, next);
      } else { setA2(next); setStep(step + 1); }
    }
  }

  function restart() { setStage(1); setStep(0); setA1([]); setA2([]); setPhase("untaken"); }

  if (phase === "untaken") {
    return (
      <aside class={wrapClass}>
        <div class={headerClass}><span class="meta">{t("pretest.title", lang)}</span>
          <span class="badge muted">{lang === "en" ? `2 rounds · ~5 min` : `2 раунда · ~5 мин`}</span></div>
        <div class="px-6 pt-5 pb-6">
          <h3 class="font-display text-[22px] font-bold leading-[1.15] m-0 text-ink">
            {lang === "en" ? "What's your level?" : "Какой у тебя уровень?"}</h3>
          <p class="text-[14px] text-ink-2 leading-relaxed mt-2 mb-4">
            {lang === "en" ? "A standard round places you. Top scorers unlock a deeper round to earn the upper ranks."
              : "Стандартный раунд определяет уровень. Лучшие открывают углублённый раунд и зарабатывают верхние ранги."}</p>
          <button type="button" class="btn" onClick={() => { setStage(1); setStep(0); setA1([]); setA2([]); setPhase("stage1"); }}>
            {lang === "en" ? "Begin" : "Начать"}
          </button>
        </div>
      </aside>
    );
  }

  if (phase === "gate") {
    return (
      <aside class={wrapClass}>
        <div class={headerClass}><span class="meta">{lang === "en" ? "top band unlocked" : "топ-уровень открыт"}</span></div>
        <div class="px-6 pt-5 pb-6 flex flex-col gap-3">
          <h3 class="font-display text-[20px] font-bold m-0 text-ink">{lang === "en" ? "You're in the top band." : "Ты в топе."}</h3>
          <p class="text-[13.5px] text-ink-2">{lang === "en"
            ? "Take the advanced round to resolve your exact rank — Staff and above can only be earned here."
            : "Пройди углублённый раунд, чтобы определить точный ранг — Staff и выше зарабатываются только здесь."}</p>
          <div class="flex gap-2.5">
            <button type="button" class="btn" onClick={() => { setStage(2); setStep(0); setPhase("stage2"); }}>
              {lang === "en" ? "Advanced round" : "Углублённый раунд"}</button>
            <button type="button" class="btn ghost text-[12px]" onClick={() => {
              const s1 = scoreStage(a1, pretestQuestions) / maxScore(pretestQuestions); finalize(s1, a1);
            }}>{lang === "en" ? "Skip (cap at Gold)" : "Пропустить (потолок — middle)"}</button>
          </div>
        </div>
      </aside>
    );
  }

  if (phase === "stage1" || phase === "stage2") {
    const q = bank[step];
    return (
      <aside class={wrapClass}>
        <div class={headerClass}>
          <span class="meta">{stage === 1 ? (lang === "en" ? "standard" : "стандарт") : (lang === "en" ? "advanced" : "углублённый")} · {step + 1}/{bank.length}</span>
          <button type="button" class="btn link text-muted text-[11px]" onClick={restart}>{lang === "en" ? "restart" : "заново"}</button>
        </div>
        <div class="h-[2px] bg-rule relative"><div class="absolute inset-0 bg-ink" style={`width:${((step + 1) / bank.length) * 100}%`} /></div>
        <div class="px-6 pt-5 pb-6">
          <h3 class="font-display text-[19px] font-semibold leading-[1.25] m-0 text-ink mb-4">{q.prompt[lang]}</h3>
          <ul class="flex flex-col gap-2">
            {q.choices.map((c, i) => (
              <li><button type="button" onClick={() => answer(i)}
                class="flex items-start gap-3 w-full text-left bg-transparent border border-rule-strong rounded-[1px] px-3 py-2.5 text-[13px] text-ink hover:border-ink hover:bg-card-2 transition-colors">
                <span class="font-mono text-[11px] text-muted mt-[2px] w-4 shrink-0">{String.fromCharCode(65 + i)}</span>
                <span>{c.label[lang]}</span></button></li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }

  // done
  const result = userState.value.pretest!;
  return (
    <aside class={wrapClass}>
      <div class={headerClass}><span class="meta">{lang === "en" ? "placement · complete" : "placement · готово"}</span></div>
      <div class="px-6 pt-5 pb-6">
        <RankUpReveal rating={result.rating} rankId={result.rank} confidence={result.confidence} lang={lang} />
        <div class="flex items-center gap-2.5 mt-4">
          <button type="button" class="btn ghost text-[12px]" onClick={restart}>{lang === "en" ? "Re-climb" : "Переиграть"}</button>
          <a class="btn link text-[12px]" href={`/${lang}/profile`}>{lang === "en" ? "View profile" : "Профиль"}</a>
        </div>
      </div>
    </aside>
  );
}
```
> Also export `PretestQuestion` type from `pretest-questions.ts` if not already exported (it is a `type` there — confirm `export type PretestQuestion`). If `PretestChoice`/`PretestQuestion` aren't exported, add `export` to them.

- [ ] **Step 4: Build.** `cd site && bun run build`. Expected: lint 0 errors, page count unchanged (Pretest is used where it already was). Fix any import/type errors. Confirm: `python3 -c "import json;print('errors:',len(json.load(open('dist/lint-report.json'))['errors']))"` → 0.

- [ ] **Step 5: Commit**
```bash
git add site/src/components/progression/RankBadge.tsx site/src/components/progression/RankUpReveal.tsx site/src/components/pedagogy/Pretest.tsx site/src/scripts/pretest-questions.ts
git commit -m "feat(progression): two-stage pretest flow + rank reveal (Phase 1 complete)"
```

---

# PHASE 2 — XP, level & profile dashboard

## Task 7: `progression/xp.ts`

**Files:** Create `site/src/scripts/progression/xp.ts`, `xp.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { xpFromState, levelFromXp } from "./xp";

const empty = { pretest: null, history: {}, retrieval: {}, progression: { achievements: {} } } as any;
const active = {
  pretest: { stage2: {}, },
  history: { a: {}, b: {}, c: {} },
  retrieval: { x: {}, y: {} },
  progression: { achievements: { "first-blood": 1, "deep-diver": 2 } },
} as any;

describe("xp", () => {
  it("is zero-ish for an empty state and monotonic in activity", () => {
    expect(xpFromState(empty, 0)).toBeLessThan(xpFromState(active, 5));
  });
  it("counts the documented signals", () => {
    // pretest+stage2 (50+100) + 3 lessons*10 + 2 retr*15 + 2 ach*25 + 5 drills*8
    expect(xpFromState(active, 5)).toBe(150 + 30 + 30 + 50 + 40);
  });
  it("levelFromXp grows and reports progress to next", () => {
    const lo = levelFromXp(0); const hi = levelFromXp(1000);
    expect(lo.level).toBe(1); expect(hi.level).toBeGreaterThan(lo.level);
    expect(hi.toNext).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Write `xp.ts`**
```ts
import type { UserState } from "../user-state";

const XP = { pretest: 50, stage2: 100, lesson: 10, retrieval: 15, achievement: 25, drill: 8 };

export function xpFromState(state: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">, drillsSolved: number): number {
  let xp = 0;
  if (state.pretest) xp += XP.pretest;
  if (state.pretest?.stage2) xp += XP.stage2;
  xp += Object.keys(state.history ?? {}).length * XP.lesson;
  xp += Object.keys(state.retrieval ?? {}).length * XP.retrieval;
  xp += Object.keys(state.progression?.achievements ?? {}).length * XP.achievement;
  xp += Math.max(0, drillsSolved) * XP.drill;
  return xp;
}

/** Gentle growing curve. level = floor((xp/100)^0.7) + 1. */
export function levelFromXp(xp: number): { level: number; intoLevel: number; toNext: number } {
  const lvl = Math.floor((Math.max(0, xp) / 100) ** 0.7) + 1;
  const xpForLevel = (l: number) => Math.ceil(((l - 1) ** (1 / 0.7)) * 100);
  const cur = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  return { level: lvl, intoLevel: xp - cur, toNext: Math.max(0, next - xp) };
}
```

- [ ] **Step 4: Run → pass** (3 tests).

- [ ] **Step 5: Commit**
```bash
git add site/src/scripts/progression/xp.ts site/src/scripts/progression/xp.test.ts
git commit -m "feat(progression): XP from activity + level curve"
```

---

## Task 8: Profile page + `XpBar` + `ProfilePanel` + AccountMenu link

**Files:** Create `site/src/components/progression/XpBar.tsx`, `ProfilePanel.tsx`, `site/src/pages/[lang]/profile.astro`; modify `site/src/components/account/AccountMenu.tsx`

- [ ] **Step 1: `XpBar.tsx`**
```tsx
import type { Locale } from "~/i18n";
import { levelFromXp } from "~/scripts/progression/xp";

export default function XpBar({ xp, lang }: { xp: number; lang: Locale }) {
  const { level, intoLevel, toNext } = levelFromXp(xp);
  const pct = intoLevel + toNext > 0 ? Math.round((intoLevel / (intoLevel + toNext)) * 100) : 100;
  return (
    <div class="flex flex-col gap-1">
      <div class="flex justify-between text-[12px] font-mono"><span>LVL {level}</span><span class="text-muted">{xp} XP</span></div>
      <div class="h-[8px] bg-rule rounded-full overflow-hidden"><div class="h-full bg-ink" style={`width:${pct}%`} /></div>
      <div class="text-[11px] text-muted font-mono">{toNext} {lang === "ru" ? "до LVL" : "to LVL"} {level + 1}</div>
    </div>
  );
}
```

- [ ] **Step 2: `ProfilePanel.tsx`** — reads `userState` + drill store, runs the core, renders. (Phase 3 will add `AchievementGrid`/`StreakChip`; here render rank, XP, rating, tier, per-pillar note.)
```tsx
import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { xpFromState } from "~/scripts/progression/xp";
import RankBadge from "./RankBadge";
import XpBar from "./XpBar";
import { nextRank, rankById } from "~/scripts/progression/ranks";
import { t, type Locale } from "~/i18n";

export default function ProfilePanel({ lang }: { lang: Locale }) {
  const s = userState.value;
  const drillsSolved = Object.values(loadStore()).filter((e: any) => e.status === "solved").length;
  const xp = xpFromState(s, drillsSolved);
  const pretest = s.pretest;

  if (!pretest) {
    return <p class="text-[14px] text-ink-2">{lang === "ru"
      ? "Пройди placement-тест, чтобы получить ранг." : "Take the placement test to earn a rank."}</p>;
  }
  const r = rankById(pretest.rank);
  const nxt = nextRank(r);
  return (
    <div class="flex flex-col gap-6 max-w-[640px]">
      <div class="flex items-center justify-between">
        <div class="text-[30px]"><RankBadge rankId={pretest.rank} lang={lang} size="lg" /></div>
        <div class="text-right font-mono text-[13px]">
          <div>{lang === "ru" ? "рейтинг" : "rating"} <strong>{pretest.rating}</strong>/1000</div>
          <div class="text-muted text-[11px]">{pretest.confidence === "high" ? (lang === "ru" ? "уверенно" : "high conf.") : (lang === "ru" ? "средне" : "medium conf.")}</div>
        </div>
      </div>
      <XpBar xp={xp} lang={lang} />
      {nxt && <div class="text-[12px] text-muted font-mono">+{nxt.min - pretest.rating} {lang === "ru" ? "до" : "to"} {nxt.label[lang]}</div>}
      <div class="text-[12px] text-muted">{lang === "ru"
        ? "Самооценка-placement, не сертификат. Контент открыт весь."
        : "A self-assessment placement, not a certificate. All content stays open."}</div>
    </div>
  );
}
```

- [ ] **Step 3: `site/src/pages/[lang]/profile.astro`**
```astro
---
import Topic from "../../layouts/Topic.astro";
import ProfilePanel from "../../components/progression/ProfilePanel.tsx";
import { type Locale, isLocale, t } from "../../i18n";

export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
---
<Topic title={lang === "ru" ? "Профиль" : "Profile"} lang={lang}>
  <h1 class="text-3xl font-extrabold mb-6">{lang === "ru" ? "Профиль игрока" : "Player profile"}</h1>
  <ProfilePanel client:only="preact" lang={lang} />
</Topic>
```

- [ ] **Step 4: AccountMenu link.** In `site/src/components/account/AccountMenu.tsx`, inside the signed-in dropdown (the `role="menu"` block), add a Profile link before the Account link:
```tsx
          <a class="block px-3 py-2 text-[13px] hover:bg-rule/30" href={`/${lang}/profile`} role="menuitem">{lang === "ru" ? "Профиль" : "Profile"}</a>
```

- [ ] **Step 5: Build.** `cd site && bun run build` → +2 pages (profile en/ru), lint 0 errors. Verify `dist/en/profile/index.html` renders.

- [ ] **Step 6: Commit**
```bash
git add site/src/components/progression/XpBar.tsx site/src/components/progression/ProfilePanel.tsx "site/src/pages/[lang]/profile.astro" site/src/components/account/AccountMenu.tsx
git commit -m "feat(progression): XP bar + player profile page (Phase 2 complete)"
```

---

# PHASE 3 — achievements, streak, titles

## Task 9: `progression/achievements.ts` (+ drill no-hints signal)

**Files:** Create `site/src/scripts/progression/achievements.ts`, `achievements.test.ts`; modify `site/src/components/algo/drill-state.ts` (record no-hint solves)

- [ ] **Step 1: Add no-hint tracking to `drill-state.ts`.** Extend `DrillEntry` with optional `noHint?: boolean` and a setter; the board passes whether 0 hints were revealed at solve time. Add:
```ts
export interface DrillEntry { status: DrillStatus; at: number; noHint?: boolean; }
export function saveEntry(id: string, status: DrillStatus, now: number, noHint?: boolean): void {
  if (typeof window === "undefined") return;
  const store = loadStore();
  store[id] = { status, at: now, noHint: noHint ?? store[id]?.noHint };
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}
```
> In `DrillBoard.tsx`, change the `cycle(id)` call to pass `revealed === 0` as the 4th arg when the new status is `"solved"`: `saveEntry(id, ns, now, revealedFor(id) === 0)`. Keep it minimal — if wiring the per-card revealed count up is awkward, pass `undefined` (the achievement just won't fire) and note it. Do not block on this.

- [ ] **Step 2: Failing test `achievements.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements";

const ctx0 = { drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false, hourOfDay: 12 };
const empty = { pretest: null, history: {}, retrieval: {}, progression: { achievements: {} } } as any;

describe("achievements", () => {
  it("defines ≥12 achievements, each with id + bilingual label + predicate", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12);
    for (const a of ACHIEVEMENTS) { expect(a.id).toBeTruthy(); expect(a.label.en && a.label.ru).toBeTruthy(); expect(typeof a.predicate).toBe("function"); }
  });
  it("none satisfied on an empty state", () => {
    expect(evaluateAchievements(empty, ctx0)).toEqual([]);
  });
  it("deep-diver fires when stage2 exists; drill-sergeant at 25 solves", () => {
    const s = { pretest: { stage2: {} }, history: {}, retrieval: {}, progression: { achievements: {} } } as any;
    expect(evaluateAchievements(s, ctx0)).toContain("deep-diver");
    expect(evaluateAchievements(empty, { ...ctx0, drillsSolved: 25 })).toContain("drill-sergeant");
  });
});
```

- [ ] **Step 3: Run → fail.**

- [ ] **Step 4: Write `achievements.ts`** (≥12; predicates pure over state+ctx)
```ts
import type { UserState } from "../user-state";
import type { AchievementCtx } from "./types";

export interface AchievementDef {
  id: string; icon: string; xp: number;
  label: { en: string; ru: string };
  desc: { en: string; ru: string };
  predicate: (s: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">, ctx: AchievementCtx) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-steps", icon: "🌱", xp: 10, label: { en: "First Steps", ru: "Первые шаги" }, desc: { en: "Take the placement test", ru: "Пройти placement-тест" }, predicate: (s) => !!s.pretest },
  { id: "deep-diver", icon: "🤿", xp: 40, label: { en: "Deep Diver", ru: "Глубокое погружение" }, desc: { en: "Complete the advanced round", ru: "Пройти углублённый раунд" }, predicate: (s) => !!s.pretest?.stage2 },
  { id: "perfectionist", icon: "💯", xp: 60, label: { en: "Perfectionist", ru: "Перфекционист" }, desc: { en: "Max score on the advanced round", ru: "Максимум в углублённом раунде" }, predicate: (s) => { const st2 = s.pretest?.stage2; return !!st2 && st2.score > 0 && (s.pretest!.rating >= 1000); } },
  { id: "scholar", icon: "📚", xp: 20, label: { en: "Scholar", ru: "Книжный червь" }, desc: { en: "Visit 10 lessons", ru: "Открыть 10 уроков" }, predicate: (s) => Object.keys(s.history ?? {}).length >= 10 },
  { id: "well-read", icon: "📖", xp: 40, label: { en: "Well-Read", ru: "Начитанный" }, desc: { en: "Visit 40 lessons", ru: "Открыть 40 уроков" }, predicate: (s) => Object.keys(s.history ?? {}).length >= 40 },
  { id: "retriever", icon: "🧠", xp: 25, label: { en: "Retriever", ru: "Вспоминатель" }, desc: { en: "Attempt 15 retrieval drawers", ru: "Сделать 15 retrieval-попыток" }, predicate: (s) => Object.keys(s.retrieval ?? {}).length >= 15 },
  { id: "drill-rookie", icon: "🎯", xp: 15, label: { en: "Drill Rookie", ru: "Новичок дрилла" }, desc: { en: "Solve 5 drills", ru: "Решить 5 задач" }, predicate: (_s, c) => c.drillsSolved >= 5 },
  { id: "drill-sergeant", icon: "🪖", xp: 50, label: { en: "Drill Sergeant", ru: "Сержант" }, desc: { en: "Solve 25 drills", ru: "Решить 25 задач" }, predicate: (_s, c) => c.drillsSolved >= 25 },
  { id: "no-hints", icon: "🧩", xp: 30, label: { en: "No Hints", ru: "Без подсказок" }, desc: { en: "Solve a drill with no hints", ru: "Решить задачу без подсказок" }, predicate: (_s, c) => c.noHintSolve },
  { id: "completionist-algo", icon: "🏁", xp: 60, label: { en: "Completionist", ru: "Завершитель" }, desc: { en: "A solve in every algorithms unit", ru: "Решение в каждом algorithms-юните" }, predicate: (_s, c) => c.drillUnitsWithSolve >= 11 },
  { id: "comeback", icon: "📈", xp: 30, label: { en: "Comeback", ru: "Камбэк" }, desc: { en: "Improve your rating on a re-climb", ru: "Поднять рейтинг переигровкой" }, predicate: (s) => (s.progression?.achievements?.["comeback"] ?? 0) > 0 },
  { id: "night-owl", icon: "🦉", xp: 10, label: { en: "Night Owl", ru: "Сова" }, desc: { en: "Study after midnight", ru: "Учиться после полуночи" }, predicate: (_s, c) => c.hourOfDay >= 0 && c.hourOfDay < 5 },
  { id: "early-bird", icon: "🐦", xp: 10, label: { en: "Early Bird", ru: "Жаворонок" }, desc: { en: "Study before 7am", ru: "Учиться до 7 утра" }, predicate: (_s, c) => c.hourOfDay >= 5 && c.hourOfDay < 7 },
  { id: "streak-7", icon: "🔥", xp: 30, label: { en: "On Fire", ru: "В ударе" }, desc: { en: "7-day streak", ru: "7 дней подряд" }, predicate: (s) => (s.progression?.streak?.best ?? 0) >= 7 },
  { id: "streak-30", icon: "🌋", xp: 100, label: { en: "Unstoppable", ru: "Неудержимый" }, desc: { en: "30-day streak", ru: "30 дней подряд" }, predicate: (s) => (s.progression?.streak?.best ?? 0) >= 30 },
];

export function evaluateAchievements(
  s: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">, ctx: AchievementCtx,
): string[] {
  return ACHIEVEMENTS.filter((a) => a.predicate(s, ctx)).map((a) => a.id);
}
```
> The 15 achievements above satisfy the ≥12 test.

- [ ] **Step 5: Run → pass** (3 tests).

- [ ] **Step 6: Commit**
```bash
git add site/src/scripts/progression/achievements.ts site/src/scripts/progression/achievements.test.ts site/src/components/algo/drill-state.ts
git commit -m "feat(progression): achievements (15) + drill no-hint signal"
```

---

## Task 10: `progression/streak.ts` + `recordActiveDay`

**Files:** Create `site/src/scripts/progression/streak.ts`, `streak.test.ts`; modify `site/src/scripts/user-state.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { updateStreak } from "./streak";

const s0 = { lastActiveDay: "", count: 0, best: 0 };
describe("streak", () => {
  it("starts a streak", () => { expect(updateStreak(s0, "2026-05-29")).toEqual({ lastActiveDay: "2026-05-29", count: 1, best: 1 }); });
  it("increments on the next day", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 3, best: 3 }, "2026-05-30")).toEqual({ lastActiveDay: "2026-05-30", count: 4, best: 4 });
  });
  it("is a no-op on the same day", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 3, best: 5 }, "2026-05-29")).toEqual({ lastActiveDay: "2026-05-29", count: 3, best: 5 });
  });
  it("resets after a gap but keeps best", () => {
    expect(updateStreak({ lastActiveDay: "2026-05-29", count: 9, best: 9 }, "2026-06-02")).toEqual({ lastActiveDay: "2026-06-02", count: 1, best: 9 });
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Write `streak.ts`**
```ts
export interface Streak { lastActiveDay: string; count: number; best: number; }

export function todayISO(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

export function updateStreak(prev: Streak, today: string): Streak {
  if (prev.lastActiveDay === today) return prev;
  if (!prev.lastActiveDay) return { lastActiveDay: today, count: 1, best: Math.max(1, prev.best) };
  const gap = daysBetween(prev.lastActiveDay, today);
  const count = gap === 1 ? prev.count + 1 : 1;
  return { lastActiveDay: today, count, best: Math.max(prev.best, count) };
}
```

- [ ] **Step 4: Run → pass** (4 tests).

- [ ] **Step 5: Add `recordActiveDay` to `user-state.ts`** (now that `streak.ts` exists):
```ts
import { updateStreak, todayISO } from "./progression/streak";

export function recordActiveDay() {
  const p = userState.value.progression;
  const streak = updateStreak(p.streak, todayISO());
  if (streak === p.streak) return;
  userState.value = { ...userState.value, progression: { ...p, streak } };
}
```

- [ ] **Step 6: Commit**
```bash
git add site/src/scripts/progression/streak.ts site/src/scripts/progression/streak.test.ts site/src/scripts/user-state.ts
git commit -m "feat(progression): daily streak + recordActiveDay"
```

---

## Task 11: `progression/titles.ts`

**Files:** Create `site/src/scripts/progression/titles.ts`, `titles.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { TITLES, titlesFromState } from "./titles";

describe("titles", () => {
  it("defines titles with bilingual labels", () => {
    expect(TITLES.length).toBeGreaterThanOrEqual(4);
    for (const tt of TITLES) { expect(tt.label.en && tt.label.ru).toBeTruthy(); }
  });
  it("earns a title from matching visited-pillar history, none from empty", () => {
    expect(titlesFromState({ history: {} } as any)).toEqual([]);
    const s = { history: { "databases/04-databases/07-postgres-mvcc": {}, "databases/04-databases/03-indexes": {}, "databases/04-databases/01-acid": {} } } as any;
    expect(titlesFromState(s)).toContain("index-surgeon");
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Write `titles.ts`** (title earned when ≥3 visited lessons fall under a pillar prefix)
```ts
import type { UserState } from "../user-state";

export interface TitleDef { id: string; pillar: string; label: { en: string; ru: string }; }

export const TITLES: TitleDef[] = [
  { id: "index-surgeon", pillar: "databases", label: { en: "Index Surgeon", ru: "Хирург индексов" } },
  { id: "packet-whisperer", pillar: "networking", label: { en: "Packet Whisperer", ru: "Заклинатель пакетов" } },
  { id: "concurrency-wrangler", pillar: "distributed", label: { en: "Concurrency Wrangler", ru: "Укротитель конкурентности" } },
  { id: "cache-alchemist", pillar: "caching", label: { en: "Cache Alchemist", ru: "Алхимик кэша" } },
  { id: "latency-hunter", pillar: "performance", label: { en: "Latency Hunter", ru: "Охотник за латентностью" } },
  { id: "shield-bearer", pillar: "security", label: { en: "Shield Bearer", ru: "Щитоносец" } },
];

export function titlesFromState(s: Pick<UserState, "history">): string[] {
  const counts: Record<string, number> = {};
  for (const key of Object.keys(s.history ?? {})) {
    const pillar = key.split("/")[0];
    counts[pillar] = (counts[pillar] ?? 0) + 1;
  }
  return TITLES.filter((tt) => (counts[tt.pillar] ?? 0) >= 3).map((tt) => tt.id);
}
```
> NOTE: `history` keys are lesson slugs; confirm their format with `recordVisit` callers. If keys are not `<pillar>/...`, adjust the split to match the real slug shape (read a couple `history` writes). The test encodes the assumed `<pillar>/<unit>/<lesson>` shape — align both if reality differs.

- [ ] **Step 4: Run → pass** (2 tests).

- [ ] **Step 5: Commit**
```bash
git add site/src/scripts/progression/titles.ts site/src/scripts/progression/titles.test.ts
git commit -m "feat(progression): domain titles from pillar history"
```

---

## Task 12: wire achievements/streak/titles into UI

**Files:** Create `site/src/components/progression/AchievementGrid.tsx`, `StreakChip.tsx`; modify `ProfilePanel.tsx`; modify `Pretest.tsx` (record active day + evaluate achievements on finish)

- [ ] **Step 1: `AchievementGrid.tsx`**
```tsx
import type { Locale } from "~/i18n";
import { ACHIEVEMENTS } from "~/scripts/progression/achievements";

export default function AchievementGrid({ unlocked, lang }: { unlocked: Set<string>; lang: Locale }) {
  return (
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ACHIEVEMENTS.map((a) => {
        const on = unlocked.has(a.id);
        return (
          <div key={a.id} class={`border border-rule rounded-md p-2 flex items-center gap-2 ${on ? "" : "opacity-40"}`} title={a.desc[lang]}>
            <span class="text-[20px]" aria-hidden="true">{a.icon}</span>
            <span class="text-[12px] font-semibold">{a.label[lang]}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: `StreakChip.tsx`**
```tsx
import type { Locale } from "~/i18n";

export default function StreakChip({ count, best, lang }: { count: number; best: number; lang: Locale }) {
  return (
    <span class="inline-flex items-center gap-1.5 text-[12px] font-mono">
      <span aria-hidden="true">🔥</span> {count} {lang === "ru" ? "дн." : "d"} <span class="text-muted">· best {best}</span>
    </span>
  );
}
```

- [ ] **Step 3: Extend `ProfilePanel.tsx`** — compute ctx + unlocked, persist newly-unlocked, render grid + streak + titles. Add imports and, after computing `drillsSolved`, build context and evaluate:
```tsx
import AchievementGrid from "./AchievementGrid";
import StreakChip from "./StreakChip";
import { evaluateAchievements } from "~/scripts/progression/achievements";
import { titlesFromState, TITLES } from "~/scripts/progression/titles";
import { loadStore } from "~/components/algo/drill-state";
import { useEffect } from "preact/hooks";
```
Inside the component (after `drillsSolved`):
```tsx
  const store = loadStore();
  const unitsWithSolve = new Set(Object.entries(store).filter(([, e]: any) => e.status === "solved").map(([id]) => id.split("-")[0])).size;
  const noHintSolve = Object.values(store).some((e: any) => e.status === "solved" && e.noHint);
  const ctx = { drillsSolved, drillUnitsWithSolve: unitsWithSolve, noHintSolve, hourOfDay: new Date().getHours() };
  const unlocked = new Set(evaluateAchievements(s, ctx));
  const titles = titlesFromState(s);
  useEffect(() => { // persist newly-unlocked into progression.achievements
    const now = Date.now(); const have = s.progression.achievements; let changed = false; const next = { ...have };
    unlocked.forEach((id) => { if (!(id in next)) { next[id] = now; changed = true; } });
    if (changed) userState.value = { ...userState.value, progression: { ...s.progression, achievements: next } };
  }, []);
```
Render below the XP bar:
```tsx
      <StreakChip count={s.progression.streak.count} best={s.progression.streak.best} lang={lang} />
      {titles.length > 0 && <div class="flex flex-wrap gap-1.5">{TITLES.filter((tt) => titles.includes(tt.id)).map((tt) => <span key={tt.id} class="text-[11px] font-mono border border-rule rounded px-1.5 py-0.5">{tt.label[lang]}</span>)}</div>}
      <AchievementGrid unlocked={unlocked} lang={lang} />
```

- [ ] **Step 4: `Pretest.tsx` — record active day on mount + comeback detection.** Add `import { recordActiveDay } from "~/scripts/user-state";` and `import { useEffect } from "preact/hooks";`, and at the top of the component:
```tsx
  useEffect(() => { recordActiveDay(); }, []);
```
In `finalize`, before `setPretestResult`, detect a comeback (rating improved over the previous best) and stamp the achievement:
```tsx
    const prev = userState.value.pretest;
    const improved = prev && rating > prev.rating;
```
After `setPretestResult({...})`, if `improved`, stamp:
```tsx
    if (improved) {
      const p = userState.value.progression;
      userState.value = { ...userState.value, progression: { ...p, achievements: { ...p.achievements, comeback: Date.now() } } };
    }
```

- [ ] **Step 5: Build.** `cd site && bun run build` → lint 0 errors, profile renders grid/streak/titles. `python3 -c "import json;print('errors:',len(json.load(open('dist/lint-report.json'))['errors']))"` → 0.

- [ ] **Step 6: Commit**
```bash
git add site/src/components/progression/AchievementGrid.tsx site/src/components/progression/StreakChip.tsx site/src/components/progression/ProfilePanel.tsx site/src/components/pedagogy/Pretest.tsx
git commit -m "feat(progression): achievements grid + streak + titles in profile (Phase 3 complete)"
```

---

## Task 13: final verification + memory

- [ ] **Step 1: All progression tests pass**
Run: `cd site && bun run test src/scripts/progression src/scripts/user-state.migrate.test.ts`
Expected: rating 4 + ranks 3 + rank-tier 3 + bank 1 + migrate 3 + xp 3 + achievements 3 + streak 4 + titles 2 = all pass.

- [ ] **Step 2: Existing suite green** (no regression in pretest consumers / sync)
Run: `cd site && bun run test src/scripts/account-sync.test.ts`
Expected: pass.

- [ ] **Step 3: Full build**
Run: `cd site && bun run build` → previous page count + 2 (profile en/ru), lint 0 errors.

- [ ] **Step 4: Update memory** — add `project_player-progression.md`: feature shipped (MST leveling → 25 ranks → derived tier; XP/level; ~15 achievements; streak; titles; profile page), where spec/plan live, that it's a self-assessment placement (not a gate), and that new state rides the auth sync. One-line pointer in `MEMORY.md`.

- [ ] **Step 5: Final commit (if stray)**
```bash
git add -A && git commit -m "chore(progression): finalize player progression feature"
```

---

## Self-review notes (coverage map)

- Spec §"MST algorithm" → Task 1 (rating/gate/confidence), Task 4 (stage-2 bank), Task 6 (flow wiring).
- Spec §"25-rank ladder" → Task 2 (RANKS + ratingToRank), Task 3 (rankToTier monotonic, senior only ≥750).
- Spec §"two axes (rating vs XP)" → Task 1 (rating) + Task 7 (xp/level).
- Spec §"data model + migration + sync" → Task 5 (widen user-state, migratePretest, mergeProgression/pickBetterPretest).
- Spec §"gamification: achievements/streak/titles/reveal/next-rank/re-climb" → Task 6 (reveal, next-rank, re-climb best-rating), Task 9 (achievements + comeback), Task 10 (streak), Task 11 (titles), Task 12 (grid/chip/titles UI + comeback stamp).
- Spec §"profile dashboard + AccountMenu link" → Task 8.
- Spec §"honesty framing" → copy in RankUpReveal (Task 6) + ProfilePanel (Task 8).
- Spec §"testing" → per-module vitest in every core task; build-green gates in Tasks 6, 8, 12.
- Type consistency: `PretestResult`/`Progression`/`RankDef`/`AchievementCtx` defined in Task 1's `types.ts`, consumed everywhere; `setPretestResult` (Task 5) used by `Pretest.tsx` (Task 6); `ratingToRank`/`rankById`/`nextRank` (Task 2) used in Tasks 3/6/8/12; `loadStore` (existing drill-state) consumed in Tasks 8/12; `xpFromState(state, drillsSolved)` signature consistent Task 7↔8↔12; `updateStreak`/`todayISO` (Task 10) used by `recordActiveDay` (Task 10) called in Task 12.
- Known follow-ups flagged inline: drill no-hint wiring may pass `undefined` (Task 9 Step 1); `titles.ts` history-key shape must be confirmed against `recordVisit` (Task 11 Step 3); profile hydration uses `client:only` so SSR-safe.
```
