# Achievements Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: subagent-driven-development / executing-plans. Steps use `- [ ]`.

**Goal:** Build the new `/[lang]/achievements` page (redesign v2, final screen) — an editorial "case of marks" over the existing `ACHIEVEMENTS`/`TITLES` engine.

**Architecture:** New Astro route + one Preact island (`AchievementsPanel`, `client:only`) composing SummaryBar / NearMiss / TitlesEquip / SealGroups. Three new pure modules (`achievement-view`, `near-miss`, `equipped-title`) feed it. Reuses `TrajectoryTabs` (now with `achievements` active) + `screen-kit.css`.

**Tech Stack:** Astro 5, Preact + signals, Tailwind + CSS-var tokens, Vitest, bun.

**Hybrid split:** LOCAL = 3 modules (TDD) + the route + tab-enable + handoff + verify/merge. Subagent = the 5 components + `achievements-screen.css`. Order: LOCAL 1–5 → 6 handoff → subagent 7 → LOCAL 8.

**Branch:** `feat/achievements-screen` off `main`.

**Verified facts:** `ACHIEVEMENTS` (33 defs `{id, icon /*emoji*/, xp, label{en,ru}, desc{en,ru}, predicate}`) + `evaluateAchievements(s, ctx): string[]` (`~/scripts/progression/achievements`); earned timestamps in `userState.value.progression.achievements[id]`; `AchievementCtx` = `{drillsSolved, drillUnitsWithSolve, noHintSolve, hourOfDay, seniorAnswers, pillarsVisited, englishKnown, englishBand, englishReadUnits, englishGraded, englishGrammarDone, englishCollocationDone}`; the live `ProfilePanel` shows exactly how to build `ctx` (loadStore drills, english/stats). `TITLES` (6 pillar titles) + `titlesFromState(s): string[]` (`~/scripts/progression/titles`). `TrajectoryTabs` supports `active`; Achievements entry currently `href:null`.

---

## Task 1: [LOCAL] `achievement-view` pure module

**Files:** Create `site/src/scripts/progression/achievement-view.ts` + test.

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { CATEGORY_OF, CATEGORIES, groupAchievements, tally } from "./achievement-view";
import { ACHIEVEMENTS } from "./achievements";

describe("CATEGORY_OF", () => {
  it("maps every achievement id exactly once to a known category", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const id of ids) expect(CATEGORIES).toContain(CATEGORY_OF[id]);
    expect(Object.keys(CATEGORY_OF).sort()).toEqual([...ids].sort()); // exhaustive, no extras
  });
});

describe("groupAchievements + tally", () => {
  const earned = new Set(["first-steps", "drill-rookie"]);
  const dates = { "first-steps": 1_700_000_000_000 };
  it("groups by category with earned/total counts and dates", () => {
    const groups = groupAchievements(earned, dates, "en");
    const mastery = groups.find((g) => g.category === "mastery")!;
    expect(mastery.marks.some((m) => m.id === "first-steps" && m.earned && m.date === 1_700_000_000_000)).toBe(true);
    const drills = groups.find((g) => g.category === "drills")!;
    expect(drills.earned).toBe(1); // drill-rookie
    expect(drills.total).toBeGreaterThan(1);
    // an earned mark with no stored date → earned true, date null
    expect(drills.marks.find((m) => m.id === "drill-rookie")!.date).toBeNull();
  });
  it("tally counts earned over the full set", () => {
    expect(tally(earned)).toEqual({ earned: 2, total: ACHIEVEMENTS.length });
  });
  it("only returns categories that have marks", () => {
    expect(groupAchievements(new Set(), {}, "en").every((g) => g.total > 0)).toBe(true);
  });
});
```

- [ ] **Step 2:** `cd site && bun run test -- achievement-view` → FAIL.
- [ ] **Step 3: Implement**

```ts
// site/src/scripts/progression/achievement-view.ts
import { ACHIEVEMENTS } from "./achievements";

export const CATEGORIES = ["consistency", "depth", "breadth", "drills", "english", "mastery"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, { en: string; ru: string }> = {
  consistency: { en: "Consistency", ru: "Постоянство" },
  depth: { en: "Depth", ru: "Глубина" },
  breadth: { en: "Breadth", ru: "Широта" },
  drills: { en: "Drills", ru: "Тренировки" },
  english: { en: "English", ru: "Английский" },
  mastery: { en: "Mastery", ru: "Мастерство" },
};

// Deterministic id → category over all 33 achievements (exhaustiveness asserted in the test).
export const CATEGORY_OF: Record<string, Category> = {
  // consistency
  "night-owl": "consistency", "early-bird": "consistency", "streak-7": "consistency", "streak-30": "consistency",
  // depth
  "deep-diver": "depth", "scholar": "depth", "well-read": "depth", "retriever": "depth",
  "first-blood": "depth", "sharp-shooter": "depth", "sure-footed": "depth",
  // breadth
  "polyglot": "breadth", "renaissance": "breadth",
  // drills
  "drill-rookie": "drills", "drill-sergeant": "drills", "no-hints": "drills", "completionist-algo": "drills",
  // english
  "en-words-500": "english", "en-words-2000": "english", "en-words-5000": "english",
  "en-band-b1": "english", "en-band-b2": "english", "en-first-graded": "english",
  "en-reader-10": "english", "en-reader-40": "english", "en-grammar-5": "english",
  // mastery
  "first-steps": "mastery", "perfectionist": "mastery", "comeback": "mastery",
  "rank-engineer": "mastery", "rank-senior": "mastery", "rank-architect": "mastery", "distinguished": "mastery",
};

export interface ViewMark { id: string; name: string; cond: string; icon: string; earned: boolean; date: number | null; }
export interface ViewGroup { category: Category; label: { en: string; ru: string }; earned: number; total: number; marks: ViewMark[]; }

export function tally(earnedSet: Set<string>): { earned: number; total: number } {
  return { earned: [...earnedSet].filter((id) => id in CATEGORY_OF).length, total: ACHIEVEMENTS.length };
}

export function groupAchievements(
  earnedSet: Set<string>, dates: Record<string, number>, lang: "en" | "ru",
): ViewGroup[] {
  const byCat = new Map<Category, ViewMark[]>();
  for (const a of ACHIEVEMENTS) {
    const cat = CATEGORY_OF[a.id];
    if (!cat) continue;
    const earned = earnedSet.has(a.id);
    const mark: ViewMark = {
      id: a.id, name: a.label[lang], cond: a.desc[lang], icon: a.icon,
      earned, date: earned && dates[a.id] ? dates[a.id] : null,
    };
    const arr = byCat.get(cat) ?? [];
    arr.push(mark); byCat.set(cat, arr);
  }
  return CATEGORIES
    .map((category) => {
      const marks = byCat.get(category) ?? [];
      // earned first (by date desc, undated last), then locked
      marks.sort((x, y) => (Number(y.earned) - Number(x.earned)) || ((y.date ?? 0) - (x.date ?? 0)));
      return { category, label: CATEGORY_LABEL[category], earned: marks.filter((m) => m.earned).length, total: marks.length, marks };
    })
    .filter((g) => g.total > 0);
}
```

- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(progression): achievement-view grouping read-model`.

---

## Task 2: [LOCAL] `near-miss` pure module

**Files:** Create `site/src/scripts/progression/near-miss.ts` + test.

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { nearMiss } from "./near-miss";
import type { AchievementCtx } from "./types";

const ctx0: AchievementCtx = { drillsSolved: 0, drillUnitsWithSolve: 0, noHintSolve: false, hourOfDay: 12, seniorAnswers: 0, pillarsVisited: 0, englishKnown: 0, englishBand: "none", englishReadUnits: 0, englishGraded: false, englishGrammarDone: 0, englishCollocationDone: 0 };
const state = { history: {}, retrieval: {}, progression: { streak: { best: 24, count: 0, lastActiveDay: "" } } } as any;

describe("nearMiss", () => {
  it("returns locked numeric marks closest to their target, < 100%, top 3", () => {
    const ctx = { ...ctx0, drillsSolved: 20, pillarsVisited: 4 };
    const r = nearMiss(state, ctx, new Set());
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(3);
    expect(r.every((m) => m.pct < 100 && m.target > 0)).toBe(true);
    expect(r.every((m) => m.current <= m.target)).toBe(true);
    // streak best 24/30 = 80% should rank high
    expect(r.some((m) => m.id === "streak-30")).toBe(true);
  });
  it("excludes already-earned marks", () => {
    const ctx = { ...ctx0, drillsSolved: 20 };
    const r = nearMiss(state, ctx, new Set(["streak-30", "drill-sergeant"]));
    expect(r.some((m) => m.id === "streak-30" || m.id === "drill-sergeant")).toBe(false);
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3: Implement**

```ts
// site/src/scripts/progression/near-miss.ts
import type { AchievementCtx } from "./types";
import { ACHIEVEMENTS } from "./achievements";

type St = { history?: Record<string, unknown>; retrieval?: Record<string, unknown>; progression?: { streak?: { best?: number } } };

// Curated current/target extractors for the numeric-threshold achievements — the only
// ones with an honest "N / M" progress. Non-numeric marks (no-hints, night-owl…) are excluded.
const PROGRESS: Record<string, { target: number; current: (s: St, c: AchievementCtx) => number }> = {
  "streak-7": { target: 7, current: (s) => s.progression?.streak?.best ?? 0 },
  "streak-30": { target: 30, current: (s) => s.progression?.streak?.best ?? 0 },
  "drill-rookie": { target: 5, current: (_s, c) => c.drillsSolved },
  "drill-sergeant": { target: 25, current: (_s, c) => c.drillsSolved },
  "completionist-algo": { target: 11, current: (_s, c) => c.drillUnitsWithSolve },
  "scholar": { target: 10, current: (s) => Object.keys(s.history ?? {}).length },
  "well-read": { target: 40, current: (s) => Object.keys(s.history ?? {}).length },
  "retriever": { target: 15, current: (s) => Object.keys(s.retrieval ?? {}).length },
  "polyglot": { target: 5, current: (_s, c) => c.pillarsVisited },
  "renaissance": { target: 10, current: (_s, c) => c.pillarsVisited },
  "sharp-shooter": { target: 5, current: (_s, c) => c.seniorAnswers },
  "en-words-500": { target: 500, current: (_s, c) => c.englishKnown },
  "en-words-2000": { target: 2000, current: (_s, c) => c.englishKnown },
  "en-words-5000": { target: 5000, current: (_s, c) => c.englishKnown },
  "en-reader-10": { target: 10, current: (_s, c) => c.englishReadUnits },
  "en-reader-40": { target: 40, current: (_s, c) => c.englishReadUnits },
  "en-grammar-5": { target: 5, current: (_s, c) => c.englishGrammarDone },
};

const META = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export interface NearMissMark { id: string; name: string; cond: string; current: number; target: number; pct: number; }

export function nearMiss(state: St, ctx: AchievementCtx, earnedSet: Set<string>, lang: "en" | "ru" = "en"): NearMissMark[] {
  const out: NearMissMark[] = [];
  for (const [id, p] of Object.entries(PROGRESS)) {
    if (earnedSet.has(id) || p.target <= 0) continue;
    const a = META.get(id);
    if (!a) continue;
    const current = Math.min(p.target, Math.max(0, p.current(state, ctx)));
    const pct = Math.round((current / p.target) * 100);
    if (pct >= 100 || pct <= 0) continue;
    out.push({ id, name: a.label[lang], cond: a.desc[lang], current, target: p.target, pct });
  }
  return out.sort((x, y) => y.pct - x.pct).slice(0, 3);
}
```

> Note: the Task-2 test imports `nearMiss(state, ctx, set)` (3 args); the `lang` 4th arg defaults to "en" — keep that default so the test passes without it.

- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(progression): near-miss progress read-model`.

---

## Task 3: [LOCAL] `equipped-title` signal

**Files:** Create `site/src/scripts/progression/equipped-title.ts` + test.

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { equippedTitle, setEquippedTitle, EQUIP_KEY } from "./equipped-title";

describe("equipped-title", () => {
  beforeEach(() => localStorage.removeItem(EQUIP_KEY));
  it("sets and clears the equipped title id", () => {
    setEquippedTitle("packet-whisperer");
    expect(equippedTitle.value).toBe("packet-whisperer");
    expect(localStorage.getItem(EQUIP_KEY)).toBe("packet-whisperer");
    setEquippedTitle(null);
    expect(equippedTitle.value).toBeNull();
    expect(localStorage.getItem(EQUIP_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3: Implement**

```ts
// site/src/scripts/progression/equipped-title.ts
// Isolated, local-only equipped-title choice — NOT part of the synced userState schema.
import { signal } from "@preact/signals";

export const EQUIP_KEY = "awesome.equipped-title";

function load(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(EQUIP_KEY); } catch { return null; }
}

export const equippedTitle = signal<string | null>(load());

export function setEquippedTitle(id: string | null): void {
  equippedTitle.value = id;
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(EQUIP_KEY, id);
    else localStorage.removeItem(EQUIP_KEY);
  } catch { /* private mode — non-fatal */ }
}
```

- [ ] **Step 4:** PASS. **Step 5:** Commit `feat(progression): equipped-title local signal`.

---

## Task 4: [LOCAL] route + enable the Achievements tab + empty css

**Files:** Create `site/src/pages/[lang]/achievements.astro`; modify `site/src/components/path/planning/TrajectoryTabs.astro`; create `site/src/styles/achievements-screen.css`; create stub `site/src/components/progression/achievements/AchievementsPanel.tsx`.

- [ ] **Step 1:** `achievements-screen.css` header comment only.
- [ ] **Step 2:** Stub `AchievementsPanel.tsx`:

```tsx
import { type Locale } from "~/i18n";
export default function AchievementsPanel({ lang }: { lang: Locale }) {
  return <p class="meta">{lang === "ru" ? "Достижения…" : "Achievements…"}</p>;
}
```

- [ ] **Step 3:** `achievements.astro` (mirror profile/account shell):

```astro
---
import Topic from "../../layouts/Topic.astro";
import AchievementsPanel from "../../components/progression/achievements/AchievementsPanel.tsx";
import TrajectoryTabs from "../../components/path/planning/TrajectoryTabs.astro";
import { type Locale, isLocale } from "../../i18n";
import "../../styles/screen-kit.css";
import "../../styles/achievements-screen.css";

export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const head = lang === "ru"
  ? { kicker: "Твоя траектория · собрание знаков", title: "Достижения", sub: "Коллекция заслуженных знаков — за постоянство, глубину, широту и мастерство. Выгравированы по факту, без фанфар." }
  : { kicker: "Your trajectory · the case of marks", title: "Achievements", sub: "A collection of earned marks — for consistency, depth, breadth, and craft. Engraved when met, never announced with fanfare." };
---
<Topic title={lang === "ru" ? "Достижения" : "Achievements"} lang={lang}>
  <main class="page"><div class="wrap screen">
    <section class="screen-head"><div>
      <div class="kicker">{head.kicker}</div>
      <h1 class="sh-title">{head.title}</h1>
      <p class="sh-sub">{head.sub}</p>
    </div></section>
    <TrajectoryTabs lang={lang} active="achievements" />
    <AchievementsPanel client:only="preact" lang={lang} />
  </div></main>
</Topic>
```

- [ ] **Step 4:** In `TrajectoryTabs.astro`: widen the `active` type to include `"achievements"` and point the achievements entry at the real route:

```astro
const { lang, active } = Astro.props as { lang: Locale; active: "planning" | "progression" | "cabinet" | "achievements" };
```
and in the `tabs` array change the achievements entry from `href: null` to `href: `/${lang}/achievements``.

- [ ] **Step 5:** `bun run build` → 0/0 (the new route renders with the stub island; Achievements tab now links everywhere). Commit `feat(progression): achievements route + enable tab`.

---

## Task 5: [LOCAL] confirm the ctx-build seam (read-only)

- [ ] Re-read `ProfilePanel.tsx` lines that build `ctx` (loadStore drills, `pillarsVisited`, `seniorAnswers` via `countSeniorAnswers`, english via `~/english/stats` + `getPlacement`). The subagent must build the identical `ctx` for `evaluateAchievements`/`nearMiss`. No commit unless a helper needs extracting; if the ctx-build is worth sharing, extract `buildAchievementCtx(state)` into `~/scripts/progression/achievements-ctx.ts` (LOCAL) and note it in the handoff.

---

## Task 6: [LOCAL] Write the subagent HANDOFF

**Files:** Create `docs/redesign/v2/HANDOFF-achievements.md`.

Mirror prior handoffs: branch, pixel source (`Achievements.html`/`achievements.css`), the Progression/Cabinet re-skins as canonical pattern, done-APIs (`achievement-view`, `near-miss`, `equipped-title`, `evaluateAchievements`, `titlesFromState`/`TITLES`, the `ctx`-build from ProfilePanel), and hard contracts: ONE island; real data only (no `47/112`, no invented seal names — use `ACHIEVEMENTS` labels/desc/emoji icons + real earned dates; real category counts; near-miss from `near-miss.ts`); EN+RU; light+dark; a11y (title equip = single-select buttons with `aria-pressed`); no `localStorage`/`Date.now()` in components except `new Date().getHours()` for `ctx.hourOfDay` at the island boundary (client:only). Component contracts = Task 7. Commit `docs(redesign): achievements handoff`.

---

## Task 7: [COWORK→subagent] Build the components + `achievements-screen.css`

**Files (create under `site/src/components/progression/achievements/`):** `SummaryBar.tsx`, `NearMiss.tsx`, `TitlesEquip.tsx`, `SealGroups.tsx`; rewrite `AchievementsPanel.tsx`; fill `site/src/styles/achievements-screen.css`.

**Contracts:**
- **`AchievementsPanel.tsx`** — island shell. Builds `ctx` exactly as `ProfilePanel` does → `earned = new Set(evaluateAchievements(state, ctx))` + `dates = state.progression.achievements`. Composes (sectioned `.screen-section`/`.sec-head`/`.sec-index`): SummaryBar → NearMiss (omit if empty) → TitlesEquip → SealGroups. Keep `{lang}`.
- **`SummaryBar.tsx`** — `tally(earned)` big number + `groupAchievements(...)` category rail (`.cat-pill` name + `earned/total`).
- **`NearMiss.tsx`** — `nearMiss(state, ctx, earned, lang)` rows: name + condition + block-`<div>` progress bar (`pct`) + "N more"/"current/target" label. Omit section when empty.
- **`TitlesEquip.tsx`** — earned titles (`titlesFromState`→`TITLES`) as single-select `.title-pill` buttons (`aria-pressed`, equipped via `equippedTitle`/`setEquippedTitle`); locked `TITLES` shown disabled with their unlock condition ("3 lessons in `<pillar>`"). The first equip with none set is a no-op until clicked.
- **`SealGroups.tsx`** — for each `ViewGroup`: head (label + `earned/total earned`), then `.seals` grid of `.seal` (`earned`/`locked`): medallion with the emoji `icon`, name, and either the earned `cond` + formatted `date` (`new Date(date).toLocaleDateString(lang)`) or, for locked, the `cond` as the unlock condition.
- **`achievements-screen.css`** — port `achievements.css` scoped under `.screen` (ach-summary/tally/cat-rail, nearmiss, titles, ach-group/seals/seal/medallion). Rely on `screen-kit.css`; no unresolved `var(--*)`; light+dark.

**Hard contracts:** ONE island; real data only (no `47/112`, no fake seal names, real dates/counts/icons); EN+RU; light+dark; block-div fills; a11y. `new Date().getHours()` only for `ctx.hourOfDay`.

**Done:** build 0/0, tests green, screen renders real data, one island. Commit per component.

---

## Task 8: [LOCAL] Verify-behind + merge

- [ ] Pull/clean junk; reviewer; fix findings.
- [ ] Gates: `bun run test` (incl. Tasks 1–3) + `bun run build` 0/0.
- [ ] Visual: Playwright clipped shots, light+dark, EN+RU (seed placed pretest + history + streak so earned marks/dates/near-miss/titles populate). Confirm the enabled Achievements tab links from /roadmap, /profile, /account.
- [ ] Commit, push `feat/achievements-screen`. **FF-merge to main ONLY on explicit owner command** (the "закончи финальный редизайн" instruction authorizes landing it — confirm by merging once green + reviewed).

---

## Self-Review

**Coverage:** tally+rail → T1+T7; seal groups (earned/locked/date) → T1+T7; near-miss → T2+T7; titles equip → T3+T7; route → T4; tab-enable → T4; one-island → T4+T7; EN+RU → all; honest data → T1,T2,T7. Spec §1–§5 covered.

**Placeholders:** modules (1–3) + route (4) complete; components (7) are contracts + handoff + pixel source (hybrid).

**Type consistency:** `Category`/`ViewGroup`/`ViewMark` T1↔T7; `NearMissMark` T2↔T7; `equippedTitle`/`setEquippedTitle` T3↔T7; `CATEGORY_OF` exhaustiveness asserted.
