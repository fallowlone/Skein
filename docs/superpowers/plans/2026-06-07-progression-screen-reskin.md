# Progression Screen Re-skin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Re-skin `/[lang]/profile` (`ProfilePanel.tsx`) into the editorial-cartographic "Progression" layout from `docs/redesign/v2/`, wired to the real progression engine — no new rating math.

**Architecture:** One Preact island (`ProfilePanel`, `client:only`) re-drawn as sections: rank-now + ladder → per-domain competence radar (signature) → XP/streak instruments → derived missions → placement (first-run). Static screen-head + tabs in `profile.astro`. Three new pure read-models (`domain-ratings`, `missions`, `ladder`) feed the new instruments; rank/XP/streak/titles/placement reuse existing engine.

**Tech Stack:** Astro 5, Preact + signals, Tailwind + CSS-var tokens, Vitest, bun.

**Hybrid split:** LOCAL = pure modules (TDD) + screen-kit.css extraction + TrajectoryTabs generalization + profile.astro + verify/merge (controller). COWORK-equivalent = bulky components built in-process by ONE implementer subagent against the HANDOFF (cowork can't use git). Order: LOCAL 1–6 → 7 handoff → subagent 8 → LOCAL 9 verify/merge.

**Branch:** `feat/progression-screen-reskin` off `main`.

**Verified facts (from source):**
- `ranks.ts`: `RANKS` (25 defs: 8 tiers×3 div + Distinguished; each `{id,tier,division,min,max,contentTier,icon,color,label{en,ru}}`), `ratingToRank(rating)`, `nextRank(rank)`, `rankById(id)`.
- `userState.progression` = `{ xp, level, achievements:{}, streak:{lastActiveDay,count,best}, titles:[] }`. `userState.pretest` = `{rating(0–1000), rank, confidence, stage1, stage2?}` or undefined (first run).
- `currentXp()` (progression/current), `levelFromXp(xp)` (progression/xp).
- path-io exports `knowledge` signal, `config` signal, `content.concepts`, `masteryByTrack`. `masteryOf(state,id)` is pure in `~/scripts/path/knowledge`. `DOMAIN_FAMILIES` (8 families, all 29 tracks) is pure in `~/scripts/path/mastery-field`.
- `Pretest.tsx` is the 2-stage placement; current ProfilePanel renders it when `!pretest`.
- `RankBadge.tsx`, `AchievementGrid.tsx`, `StreakChip.tsx`, `XpBar.tsx`, `titlesFromState`/`TITLES` exist and are reused.
- `TrajectoryTabs.astro` (built for Planning) currently hardcodes Planning as active — generalize.
- Cluster chrome classes (`.page/.wrap/.screen/.screen-head/.traj-tabs/.panel/.btn*/.seg/.sec-head/.badge/.fig-caption`) live in `planning-screen.css` — extract to `screen-kit.css`.

---

## Task 1: [LOCAL] `domain-ratings` pure read-model (radar data)

**Files:** Create `site/src/scripts/progression/domain-ratings.ts` + `domain-ratings.test.ts`.

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { domainRatings, weakestDomain } from "./domain-ratings";
import type { Concept, KnowledgeState } from "~/scripts/path/types";

const mk = (id: string, track: string): Concept => ({ id, label: { en: id, ru: id }, track: track as any, band: "surface" as any, requires: [] });

describe("domainRatings", () => {
  const concepts: Concept[] = [mk("a", "networking"), mk("b", "networking"), mk("c", "databases")];
  const state: KnowledgeState = new Map([
    ["a", { confidence: 1, source: "diagnostic", lastAt: 0 }],
    ["b", { confidence: 0.5, source: "activity", lastAt: 0 }],
  ]); // c absent → 0

  it("scores each family by avg confidence (0..100)", () => {
    const rs = domainRatings(state, concepts, 0.6);
    const net = rs.find((r) => r.key === "network-sec")!;
    expect(net.score).toBe(75);        // (1 + 0.5)/2 * 100
    expect(net.known).toBe(1);         // only a >= 0.6
    expect(net.total).toBe(2);
    const data = rs.find((r) => r.key === "data")!;
    expect(data.score).toBe(0);
    expect(data.known).toBe(0);
  });
  it("only returns families with concepts, in DOMAIN_FAMILIES order", () => {
    const rs = domainRatings(state, concepts, 0.6);
    expect(rs.every((r) => r.total > 0)).toBe(true);
  });
  it("weakestDomain picks the lowest-score family with a real gap", () => {
    const rs = domainRatings(state, concepts, 0.6);
    expect(weakestDomain(rs)!.key).toBe("data"); // score 0, has gap
  });
});
```

- [ ] **Step 2:** Run `cd site && bun run test -- domain-ratings` → FAIL.

- [ ] **Step 3: Implement**

```ts
// site/src/scripts/progression/domain-ratings.ts
import type { Concept, KnowledgeState, Track } from "~/scripts/path/types";
import { masteryOf } from "~/scripts/path/knowledge";
import { DOMAIN_FAMILIES } from "~/scripts/path/mastery-field";

const FAMILY_OF: Map<string, (typeof DOMAIN_FAMILIES)[number]> = (() => {
  const m = new Map<string, (typeof DOMAIN_FAMILIES)[number]>();
  for (const f of DOMAIN_FAMILIES) for (const t of f.tracks) m.set(t, f);
  return m;
})();

export interface DomainRating { key: string; label: { en: string; ru: string }; hue: string; score: number; known: number; total: number; }

// Per-domain competence (0..100) = average concept confidence in the family's tracks.
// Honest substitute for a per-domain Elo (the engine has only a single global rating).
export function domainRatings(state: KnowledgeState, concepts: Concept[], threshold: number): DomainRating[] {
  const acc = new Map<string, { fam: (typeof DOMAIN_FAMILIES)[number]; known: number; total: number; sum: number }>();
  for (const c of concepts) {
    const fam = FAMILY_OF.get(c.track);
    if (!fam) continue;
    let a = acc.get(fam.key);
    if (!a) { a = { fam, known: 0, total: 0, sum: 0 }; acc.set(fam.key, a); }
    const conf = masteryOf(state, c.id);
    a.total++; a.sum += conf;
    if (conf >= threshold) a.known++;
  }
  return DOMAIN_FAMILIES
    .map((f) => acc.get(f.key))
    .filter((a): a is NonNullable<typeof a> => !!a && a.total > 0)
    .map((a) => ({ key: a.fam.key, label: a.fam.label, hue: a.fam.hue, score: Math.round((a.sum / a.total) * 100), known: a.known, total: a.total }));
}

export function weakestDomain(rs: DomainRating[]): DomainRating | null {
  const gaps = rs.filter((r) => r.known < r.total);
  if (!gaps.length) return null;
  return gaps.reduce((lo, r) => (r.score < lo.score ? r : lo));
}
export function strongestDomain(rs: DomainRating[]): DomainRating | null {
  return rs.length ? rs.reduce((hi, r) => (r.score > hi.score ? r : hi)) : null;
}
```

- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat(progression): domain-ratings read-model for the per-domain radar`.

---

## Task 2: [LOCAL] `missions` pure derivation

**Files:** Create `site/src/scripts/progression/missions.ts` + test.

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { deriveMissions } from "./missions";
import type { DomainRating } from "./domain-ratings";

const dom = (key: string, score: number, known: number, total: number): DomainRating => ({ key, label: { en: key, ru: key }, hue: "--d-data", score, known, total });

describe("deriveMissions", () => {
  it("makes a weakest-domain gap mission and a streak mission", () => {
    const ms = deriveMissions({ domains: [dom("data", 20, 2, 10), dom("backend", 80, 8, 10)], streakCount: 5 });
    expect(ms[0].id).toBe("gap-data");
    expect(ms[0].done).toBe(2); expect(ms[0].total).toBe(10);
    expect(ms.find((m) => m.id === "streak-7")).toBeTruthy(); // next milestone above 5
  });
  it("drops the gap mission when every domain is complete", () => {
    const ms = deriveMissions({ domains: [dom("data", 100, 10, 10)], streakCount: 0 });
    expect(ms.some((m) => m.id.startsWith("gap-"))).toBe(false);
  });
  it("caps at 3 and never pads", () => {
    const ms = deriveMissions({ domains: [], streakCount: 100 });
    expect(ms.length).toBeLessThanOrEqual(3);
    expect(ms.every((m) => m.total > 0)).toBe(true);
  });
});
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**

```ts
// site/src/scripts/progression/missions.ts
import type { DomainRating } from "./domain-ratings";
import { weakestDomain } from "./domain-ratings";

export interface Mission { id: string; title: { en: string; ru: string }; done: number; total: number; rewardLabel: { en: string; ru: string }; }

const MILESTONES = [7, 14, 30, 60, 100, 200, 365];

// Honest missions derived from real signals — no fabricated rating rewards.
export function deriveMissions(input: { domains: DomainRating[]; streakCount: number }): Mission[] {
  const out: Mission[] = [];
  const weak = weakestDomain(input.domains);
  if (weak) {
    out.push({
      id: `gap-${weak.key}`,
      title: { en: `Close the ${weak.label.en} gap`, ru: `Закрой пробел: ${weak.label.ru}` },
      done: weak.known, total: weak.total,
      rewardLabel: { en: `Completes the ${weak.label.en} domain`, ru: `Завершает домен ${weak.label.ru}` },
    });
  }
  const next = MILESTONES.find((m) => input.streakCount < m);
  if (next) {
    out.push({
      id: `streak-${next}`,
      title: { en: `${next}-day consistency`, ru: `${next} дней подряд` },
      done: input.streakCount, total: next,
      rewardLabel: { en: `A ${next}-day streak`, ru: `Серия из ${next} дней` },
    });
  }
  return out.slice(0, 3);
}
```

- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(progression): derived missions from real signals`.

---

## Task 3: [LOCAL] `ladder` pure helpers

**Files:** Create `site/src/scripts/progression/ladder.ts` + test.

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { rankPosition, ladderRows } from "./ladder";
import { RANKS, ratingToRank } from "./ranks";

describe("ladder", () => {
  it("rankPosition gives 1-based index of 25 and a top%", () => {
    const first = rankPosition(RANKS[0]);
    expect(first.index).toBe(1); expect(first.total).toBe(25);
    const last = rankPosition(RANKS[RANKS.length - 1]);
    expect(last.index).toBe(25); expect(last.topPct).toBe(4); // top 4% at the apex
  });
  it("ladderRows flags reached + current from rating", () => {
    const rating = 460; // Engineer III-ish
    const rows = ladderRows(rating);
    expect(rows).toHaveLength(25);
    expect(rows.filter((r) => r.current)).toHaveLength(1);
    expect(rows.find((r) => r.current)!.rank.id).toBe(ratingToRank(rating).id);
    expect(rows[0].reached).toBe(true);                 // floor 0 always reached
    expect(rows[rows.length - 1].reached).toBe(false);  // apex not reached at 460
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3: Implement**

```ts
// site/src/scripts/progression/ladder.ts
import type { RankDef } from "./types";
import { RANKS, ratingToRank } from "./ranks";

export function rankPosition(rank: RankDef): { index: number; total: number; topPct: number } {
  const i = RANKS.findIndex((r) => r.id === rank.id);
  const index = (i < 0 ? 0 : i) + 1;
  const total = RANKS.length;
  // top% = how high you sit: apex (index=total) → smallest %. round(100*(total-index+1)/total).
  const topPct = Math.round((100 * (total - index + 1)) / total);
  return { index, total, topPct };
}

export function ladderRows(currentRating: number): { rank: RankDef; reached: boolean; current: boolean }[] {
  const cur = ratingToRank(currentRating);
  return RANKS.map((r) => ({ rank: r, reached: currentRating >= r.min, current: r.id === cur.id }));
}
```

- [ ] **Step 4:** PASS (verify `topPct` at apex = round(100*1/25)=4). **Step 5:** Commit `feat(progression): ladder position + rows helpers`.

---

## Task 4: [LOCAL] Extract `screen-kit.css` (shared cluster chrome)

**Files:** Create `site/src/styles/screen-kit.css`; modify `site/src/styles/planning-screen.css`; modify `site/src/pages/[lang]/roadmap.astro`.

- [ ] **Step 1:** Read `planning-screen.css`. Move the **shared** chrome rules (`.page`, `.wrap`, `.screen`, `.screen-head/.sh-*`, `.badge`, `.traj-tabs/.tt-*/.ti`, `.screen-section`, `.sec-head/.sec-index/.sec-note`, `.fig-caption`, `.cite`, `.panel/.panel-head/.ph-*`, `.btn/.btn-primary/.btn-secondary/.btn-sm/.arrow`, `.seg`, `.km-legend`+`.kd`, `prefers-reduced-motion`) into `screen-kit.css` verbatim (all already scoped under `.screen`). Leave the planning-**specific** rules (`.goals/.goal`, `.cmap*`, `.unit*`, `.deadline/.weekgrid/.dl-*`, `.knobs`, `.xp-strip`, `.banner`) in `planning-screen.css`.
- [ ] **Step 2:** In `roadmap.astro`, add `import "../../styles/screen-kit.css";` BEFORE the planning import.
- [ ] **Step 3:** `cd site && bun run build` → 0/0. **Visually confirm `/en/roadmap` is byte-identical to before** (same classes, just relocated). 
- [ ] **Step 4:** Commit `refactor(styles): extract shared screen-kit.css from planning-screen.css`.

---

## Task 5: [LOCAL] Generalize `TrajectoryTabs.astro`

**Files:** Modify `site/src/components/path/planning/TrajectoryTabs.astro`.

- [ ] **Step 1:** Make `active` drive `aria-current`. Replace the body so each of the 4 entries is a link unless it's `active` (then a non-link `aria-current="true"` span) — and Achievements stays disabled regardless.

```astro
---
import type { Locale } from "~/i18n";
const { lang, active } = Astro.props as { lang: Locale; active: "planning" | "progression" | "cabinet" };
const L = lang === "ru"
  ? { kick: "Траектория", plan: "Планирование", ach: "Достижения", prog: "Прогресс", cab: "Кабинет" }
  : { kick: "Trajectory", plan: "Planning", ach: "Achievements", prog: "Progression", cab: "Cabinet" };
const tabs = [
  { key: "planning", n: "01", label: L.plan, href: `/${lang}/roadmap` },
  { key: "achievements", n: "02", label: L.ach, href: null }, // not built yet
  { key: "progression", n: "03", label: L.prog, href: `/${lang}/profile` },
  { key: "cabinet", n: "04", label: L.cab, href: `/${lang}/account` },
];
---
<nav class="traj-tabs" aria-label={L.kick}>
  <span class="tt-kick">{L.kick}</span>
  {tabs.map((tb) => (
    tb.key === active ? (
      <a aria-current="true"><span class="ti">{tb.n}</span>{tb.label}</a>
    ) : tb.href ? (
      <a href={tb.href}><span class="ti">{tb.n}</span>{tb.label}</a>
    ) : (
      <span class="tt-soon" aria-disabled="true"><span class="ti">{tb.n}</span>{tb.label}</span>
    )
  ))}
</nav>
```

- [ ] **Step 2:** Confirm `roadmap.astro` still passes `active="planning"` (it does). Build → 0/0. **Step 3:** Commit `feat(path): generalize TrajectoryTabs active prop`.

---

## Task 6: [LOCAL] `profile.astro` shell + empty `progression-screen.css`

**Files:** Modify `site/src/pages/[lang]/profile.astro`; create `site/src/styles/progression-screen.css`.

- [ ] **Step 1:** Create `progression-screen.css` placeholder (header comment only). 
- [ ] **Step 2:** Rewrite `profile.astro`: load `screen-kit.css` + `progression-screen.css`; render screen-head (kicker "Your trajectory · the rating" / "Твоя траектория · рейтинг", title Progression/Прогресс, sub from the mockup, translated) + `<TrajectoryTabs active="progression"/>` + `<ProfilePanel client:only="preact"/>`. **Remove `DueToday`** (decision §8). Keep `getStaticPaths`/`isLocale`.

```astro
---
import Topic from "../../layouts/Topic.astro";
import ProfilePanel from "../../components/progression/ProfilePanel.tsx";
import TrajectoryTabs from "../../components/path/planning/TrajectoryTabs.astro";
import { type Locale, isLocale } from "../../i18n";
import "../../styles/screen-kit.css";
import "../../styles/progression-screen.css";

export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const head = lang === "ru"
  ? { kicker: "Твоя траектория · рейтинг", title: "Прогресс", sub: "Оценка компетентности — как Elo или сертификационная лестница, по доменам, а не одним числом. Зарабатывается медленно, читается точно." }
  : { kicker: "Your trajectory · the rating", title: "Progression", sub: "A competence rating, like an Elo or a certification ladder — measured per domain, not a single number. Earned slowly, read precisely." };
---
<Topic title={lang === "ru" ? "Прогресс" : "Progression"} lang={lang}>
  <main class="page"><div class="wrap screen">
    <section class="screen-head"><div>
      <div class="kicker">{head.kicker}</div>
      <h1 class="sh-title">{head.title}</h1>
      <p class="sh-sub">{head.sub}</p>
    </div></section>
    <TrajectoryTabs lang={lang} active="progression" />
    <ProfilePanel client:only="preact" lang={lang} />
  </div></main>
</Topic>
```

- [ ] **Step 3:** Build → 0/0 (existing ProfilePanel still renders inside the new shell). **Step 4:** Commit `feat(progression): profile.astro screen shell + tabs`.

---

## Task 7: [LOCAL] Write cowork/subagent HANDOFF

**Files:** Create `docs/redesign/v2/HANDOFF-progression-reskin.md`.

Mirror `HANDOFF-planning-reskin.md`: branch, pixel source (`Progression.html`/`progression.css`/`progression.js`), done-APIs (`domain-ratings`, `missions`, `ladder`, `ranks`, `currentXp`/`levelFromXp`, `userState.progression`, reused components `RankBadge`/`Pretest`/`AchievementGrid`/`StreakChip`/`titles`), the hard contracts (ONE island; real data only — NO season, NO fabricated rating/rewards, radar = competence-by-domain labelled honestly; EN+RU; a11y; no Date.now/localStorage in components; block-div fills incl. the SVG radar and bars), resolved gotchas (screen-kit.css is shared+`.screen`-scoped; progression-screen.css holds only progression-specific rules; rank-up banner is OUT of v1; DueToday removed). Component contracts = Task 8 verbatim. Commit `docs(redesign): progression re-skin handoff`.

---

## Task 8: [COWORK→subagent] Build the components + `progression-screen.css`

**Files (create under `site/src/components/progression/`):** `RankNow.tsx`, `RankLadder.tsx`, `DomainRadar.tsx`, `XpStreakInstruments.tsx`, `MissionsList.tsx`, `PlacementIntro.tsx`; rewrite `ProfilePanel.tsx`; fill `site/src/styles/progression-screen.css`.

**Contracts:**
- **`ProfilePanel.tsx` (rewrite, island shell):** reads `userState.value`. If `!pretest` → `PlacementIntro` + existing `Pretest`. Else compose, sectioned (`.screen-section` + `.sec-head`/`.sec-index`): `RankNow` + `RankLadder` (rank-top row) → `DomainRadar` (signature) → `XpStreakInstruments` → `MissionsList` → titles row + a link to `/[lang]/achievements`-style inline marks via existing `AchievementGrid`. Keep `{lang}`. NO rank-up banner, NO season.
- **`RankNow.tsx`:** `rankById(pretest.rank)`, `nextRank`, `rankPosition` (ladder.ts). Seal with rank ordinal + arc (block SVG); tier label; "rank N of 25 · top X%"; rating `{pretest.rating}` /1000; "+{next.min-rating} to {next.label}". Reuse `RankBadge` if it fits.
- **`RankLadder.tsx`:** `ladderRows(pretest.rating)` → 25 rows; mark reached/current; show tier+division label + rating floor; current row highlighted; condense distant rows if needed (show all 25 or a windowed view around current — your call, must include neighbors).
- **`DomainRadar.tsx` (signature):** `domainRatings(knowledge.value, content.concepts, config.value.weights.masteryThreshold)`. SVG radar polygon (one axis per family, score 0–100) + a `.dom-bars` list (family hue + label + score bar, block-div fills). Caption (`.fig-caption`) translated. Empty → hidden (gated behind placement anyway).
- **`XpStreakInstruments.tsx`:** XP/level panel (`currentXp`, `levelFromXp` → into-level %, block-div fill) + current streak (`progression.streak.count`) + best streak (`.best`). NO fabricated date range.
- **`MissionsList.tsx`:** `deriveMissions({ domains: domainRatings(...), streakCount: streak.count })`. Each mission: title, `done/total` + progress (block-div fill), reward label. Omit the whole section if zero missions.
- **`PlacementIntro.tsx`:** re-skin the mockup's 2-stage placement intro copy (translated) + a "Begin placement" that renders/links the existing `Pretest`.
- **`progression-screen.css`:** port `progression.css` (rank-seal, ladder, radar, dom-bars, inst-row, quests→missions, placement) scoped under `.screen`; rely on `screen-kit.css` for the shared chrome; only progression-specific rules here. No unresolved `var(--*)`; light+dark.

**Hard contracts:** ONE island; real data only (no season, no `1,840`, no fabricated rewards, radar honestly labelled competence/mastery); EN+RU; a11y; no `localStorage`/`Date.now()` in components; all progress/radar fills are block `<div>`/SVG, never inline-`<span>` width.

**Done:** `bun run build` 0/0, `bun run test` green, screen renders with real data, one island. Commit per component.

---

## Task 9: [LOCAL] Verify-behind + cutover + merge

- [ ] Pull/clean subagent junk; independent reviewer over the diff; fix findings.
- [ ] Gates: `bun run test` (incl. Tasks 1–3) + `bun run build` 0/0.
- [ ] Visual: Playwright clipped 2× shots, light+dark, EN+RU (seed knowledge + a placed pretest via localStorage) — radar polygon + ladder + missions + rank seal render with real data. **Confirm `/roadmap` unchanged after the screen-kit extraction.** Contrast pass only if borderline.
- [ ] Dead-code: remove `DueToday` import from profile (done in T6); delete any now-unused old ProfilePanel helpers/components only if grep-confirmed unreferenced.
- [ ] Commit, push `feat/progression-screen-reskin`. **FF-merge to main ONLY on explicit owner command.**

---

## Self-Review

**Coverage:** rank-now+ladder → T3+T8; radar (signature) → T1+T8; XP/streak → T8; missions → T2+T8; placement → T8; tabs → T5; shell/chrome → T4+T6; one-island → T6+T8; honest framing (no season/Elo/rewards) → T1,T2,T8; EN+RU → all component tasks; titles/achievements inline → T8. All spec §1–§5 covered.

**Placeholders:** pure modules (1–3) + structural (4–6) have complete code; component tasks (8) are contracts + pixel-source + handoff (the intended hybrid division).

**Type consistency:** `DomainRating` fields consistent T1↔T2↔T8; `Mission` consistent T2↔T8; `RANKS`/`RankDef`/`ratingToRank` reused from ranks.ts; `rankPosition`/`ladderRows` consistent T3↔T8.

**Ordering:** LOCAL 1–6 (modules + chrome + shell) → 7 handoff → subagent 8 → LOCAL 9. The `screen-kit.css` extraction (T4) must keep Planning byte-identical (QA gate in T9).
