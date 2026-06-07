# Planning Screen Re-skin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin `/[lang]/roadmap` (the path engine, `PathView.tsx`) into the editorial-cartographic "Planning" layout from `docs/redesign/v2/`, wired to real engine data — no engine math changes.

**Architecture:** One Preact island (`PathView`, `client:only`) re-drawn as a sectioned screen (Goal → Concept-mastery map → Next path → Deadline → Advanced). Static screen-head + Trajectory tab-bar render in `roadmap.astro`. Two new pure read-models (`mastery-field`, `schedule-budget`) feed the signature instruments; every write reuses existing `path-io` setters. A scoped stylesheet (`planning-screen.css`) ports the mockup CSS + missing base classes/tokens.

**Tech Stack:** Astro 5, Preact + @preact/signals, Tailwind + CSS-variable tokens (atlas-kit), Vitest, bun.

**Hybrid split (per `feedback_cowork-hybrid`):**
- **[LOCAL]** = cheap logic/data/coordination, TDD pure modules, astro page, token additions, build/verify/merge. Done by the controller (me).
- **[COWORK]** = bulky UI component build + CSS port, against the LOCAL pure APIs + the HANDOFF doc. Verified locally behind cowork (vitest + independent build + visual + contrast pass + junk cleanup).
- Tasks 1–4 + 9 are LOCAL and run first (so the handoff references finished APIs). Task 5 writes the handoff. Tasks 6–8 are COWORK. Task 10 is the LOCAL verification/cutover/merge.

**Branch:** `feat/planning-screen-reskin` off `main`.

**Verified facts (from source, do not re-derive):**
- Routes `/[lang]/profile` and `/[lang]/account` exist → tab-bar targets are valid; Achievements is `aria-disabled`.
- Live tokens present: `--d-network/-data/-systems/-backend/-frontend/-ai` (global.css), `--card-2/--ink-2/--hairline-2/--ok/--warn` (lesson-kit.css), `--on-accent/--kicker` (atlas-kit.css).
- **Missing tokens to add:** `--known`, `--shaky`, `--unknown`, `--cal-filter`.
- **Missing base/component classes to port:** `.panel`, `.screen`, `.inset`, `.btn-primary`, `.btn-secondary`, `.btn-sm`. (`.seg/.sec-head/.sec-index/.fig-caption/.wrap` exist but are scoped under `.hub` in english-hub.css → planning-screen.css must define its own copies scoped under `.screen`.)
- `path-io` already exports: `knowledge`, `config`, `content`, `computePath`, `masteryByTrack`, `searchConcepts`, `setGoals`, `toggleCustomTarget`, `toggleExcludedTrack`, `setKnob`, `setDeadline`, `skipUnit`, `declareKnown`, `pinUnit`, `moveUnit`, `reorderPath`, `isPinned`, `loosenUnit`, `resetPath`, `unitProbeConcepts`, `applyDiagnosticResult`, `activeGoals`. `content` has `{concepts, conceptById, unitTitleById, quickCheckUnits, goals, ...}`.
- `Concept` has `{id, label:{en,ru}, track, band, requires}`. `masteryThreshold` default 0.6. `Schedule = {days:{date,minutes,steps}[], feasibility:{verdict:"fits"|"over"|"under", deltaMin, dropped}, countdownDays}`.
- `TRACK_BAND` (in `src/components/atlas/track-band.ts`) maps all 29 tracks → band; the 29 slugs are listed in Task 1.

---

## Task 1: [LOCAL] `mastery-field` pure read-model (the signature instrument's data)

**Files:**
- Create: `site/src/scripts/path/mastery-field.ts`
- Test: `site/src/scripts/path/mastery-field.test.ts`

The concept-mastery map groups concepts into 8 domain families, each tagged known/shaky/unknown. Pure, deterministic, TDD.

- [ ] **Step 1: Write failing tests**

```ts
// site/src/scripts/path/mastery-field.test.ts
import { describe, it, expect } from "vitest";
import { DOMAIN_FAMILIES, conceptState, masteryField, topGaps, topShaky } from "./mastery-field";
import type { Concept, KnowledgeState } from "./types";

const ALL_TRACKS = [
  "math","algorithms","base-cs","networking","browser","frontend","backend","apis","databases",
  "caching","queues","distributed","security","observability","deployment","performance",
  "data-engineering","ai-llm","engineering-practice","sql-postgres","js-engine","typescript",
  "system-design","system-design-cases","aws","python","ci-cd","node","nest",
] as const;

describe("DOMAIN_FAMILIES", () => {
  it("covers every one of the 29 tracks exactly once", () => {
    const mapped = DOMAIN_FAMILIES.flatMap((f) => f.tracks);
    expect(new Set(mapped).size).toBe(mapped.length); // no dupes
    expect(new Set(mapped)).toEqual(new Set(ALL_TRACKS));
    expect(mapped.length).toBe(29);
  });
  it("every family has en+ru label and a hue token", () => {
    for (const f of DOMAIN_FAMILIES) {
      expect(f.label.en.length).toBeGreaterThan(0);
      expect(f.label.ru.length).toBeGreaterThan(0);
      expect(f.hue).toMatch(/^--d-/);
    }
  });
});

describe("conceptState", () => {
  const T = 0.6;
  it("known at/above threshold", () => { expect(conceptState(0.6, T)).toBe("known"); expect(conceptState(1, T)).toBe("known"); });
  it("shaky strictly between 0 and threshold", () => { expect(conceptState(0.59, T)).toBe("shaky"); expect(conceptState(0.01, T)).toBe("shaky"); });
  it("unknown at zero", () => { expect(conceptState(0, T)).toBe("unknown"); });
});

function mk(id: string, track: string): Concept {
  return { id, label: { en: id, ru: id }, track: track as any, band: "surface" as any, requires: [] };
}

describe("masteryField", () => {
  const concepts: Concept[] = [mk("a", "networking"), mk("b", "networking"), mk("c", "databases")];
  const state: KnowledgeState = new Map([
    ["a", { confidence: 0.9, source: "diagnostic", lastAt: 0 }],
    ["b", { confidence: 0.3, source: "activity", lastAt: 0 }],
  ]); // c absent → unknown

  it("groups by family with correct counts", () => {
    const field = masteryField(state, concepts, 0.6);
    const net = field.find((f) => f.tracks.includes("networking" as any))!;
    expect(net.known).toBe(1); expect(net.shaky).toBe(1); expect(net.unknown).toBe(0); expect(net.total).toBe(2);
    const data = field.find((f) => f.tracks.includes("databases" as any))!;
    expect(data.known).toBe(0); expect(data.unknown).toBe(1); expect(data.total).toBe(1);
  });
  it("only returns families that have concepts", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(field.every((f) => f.total > 0)).toBe(true);
  });
  it("orders nodes known → shaky → unknown", () => {
    const field = masteryField(state, concepts, 0.6);
    const net = field.find((f) => f.tracks.includes("networking" as any))!;
    expect(net.nodes.map((n) => n.state)).toEqual(["known", "shaky"]);
  });
});

describe("topGaps / topShaky", () => {
  const concepts: Concept[] = [mk("raft", "distributed"), mk("paxos", "distributed"), mk("idx", "databases")];
  const state: KnowledgeState = new Map([["idx", { confidence: 0.3, source: "activity", lastAt: 0 }]]);
  it("topGaps returns unknown concept labels", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(topGaps(field, "en", 5)).toEqual(expect.arrayContaining(["raft", "paxos"]));
  });
  it("topShaky returns shaky concept labels", () => {
    const field = masteryField(state, concepts, 0.6);
    expect(topShaky(field, "en", 5)).toEqual(["idx"]);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd site && bun run test -- mastery-field` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// site/src/scripts/path/mastery-field.ts
import type { Concept, KnowledgeState, Track } from "./types";
import { masteryOf } from "./knowledge";

export type CState = "known" | "shaky" | "unknown";

export interface DomainFamily { key: string; label: { en: string; ru: string }; hue: string; tracks: Track[]; }

// Deterministic 8-family grouping of all 29 tracks. Hues reuse the live --d-* domain tokens.
export const DOMAIN_FAMILIES: DomainFamily[] = [
  { key: "foundations", label: { en: "Foundations", ru: "Основы" }, hue: "--d-hardware",
    tracks: ["math", "base-cs", "algorithms"] as Track[] },
  { key: "frontend", label: { en: "Frontend · runtime", ru: "Фронтенд · рантайм" }, hue: "--d-frontend",
    tracks: ["browser", "frontend", "typescript", "js-engine"] as Track[] },
  { key: "backend", label: { en: "Backend · APIs", ru: "Бэкенд · API" }, hue: "--d-backend",
    tracks: ["backend", "apis", "node", "nest", "python"] as Track[] },
  { key: "data", label: { en: "Databases · data", ru: "Базы · данные" }, hue: "--d-data",
    tracks: ["databases", "sql-postgres", "caching", "data-engineering"] as Track[] },
  { key: "distributed", label: { en: "Distributed · design", ru: "Распределённые · дизайн" }, hue: "--d-systems",
    tracks: ["distributed", "queues", "system-design", "system-design-cases"] as Track[] },
  { key: "network-sec", label: { en: "Networking · security", ru: "Сети · безопасность" }, hue: "--d-network",
    tracks: ["networking", "security"] as Track[] },
  { key: "infra", label: { en: "Infra · operations", ru: "Инфра · эксплуатация" }, hue: "--d-crypto",
    tracks: ["deployment", "aws", "ci-cd", "observability", "performance", "engineering-practice"] as Track[] },
  { key: "ai", label: { en: "AI · LLMs", ru: "AI · LLM" }, hue: "--d-ai",
    tracks: ["ai-llm"] as Track[] },
];

const FAMILY_OF: Map<string, DomainFamily> = (() => {
  const m = new Map<string, DomainFamily>();
  for (const f of DOMAIN_FAMILIES) for (const t of f.tracks) m.set(t, f);
  return m;
})();

export function conceptState(confidence: number, threshold: number): CState {
  if (confidence >= threshold) return "known";
  if (confidence > 0) return "shaky";
  return "unknown";
}

export interface FieldNode { id: string; label: string; state: CState; }
export interface FamilyField {
  key: string; label: { en: string; ru: string }; hue: string; tracks: Track[];
  known: number; shaky: number; unknown: number; total: number; nodes: FieldNode[];
}

const RANK: Record<CState, number> = { known: 0, shaky: 1, unknown: 2 };

// Survey of every concept grouped by domain family, each tagged known/shaky/unknown.
// `lang` controls node label locale; nodes are ordered known→shaky→unknown (stable within state).
export function masteryField(state: KnowledgeState, concepts: Concept[], threshold: number, lang: "en" | "ru" = "en"): FamilyField[] {
  const acc = new Map<string, FamilyField>();
  for (const c of concepts) {
    const fam = FAMILY_OF.get(c.track);
    if (!fam) continue; // unmapped track (should not happen — covered by exhaustiveness test)
    let ff = acc.get(fam.key);
    if (!ff) { ff = { key: fam.key, label: fam.label, hue: fam.hue, tracks: fam.tracks, known: 0, shaky: 0, unknown: 0, total: 0, nodes: [] }; acc.set(fam.key, ff); }
    const s = conceptState(masteryOf(state, c.id), threshold);
    ff[s]++; ff.total++;
    ff.nodes.push({ id: c.id, label: c.label[lang], state: s });
  }
  const out = DOMAIN_FAMILIES.map((f) => acc.get(f.key)).filter((x): x is FamilyField => !!x && x.total > 0);
  for (const ff of out) ff.nodes.sort((a, b) => RANK[a.state] - RANK[b.state]);
  return out;
}

function pickByState(field: FamilyField[], st: CState, n: number): string[] {
  const out: string[] = [];
  for (const f of field) for (const node of f.nodes) {
    if (node.state === st) out.push(node.label);
    if (out.length >= n) return out;
  }
  return out;
}
export function topGaps(field: FamilyField[], _lang: "en" | "ru", n = 6): string[] { return pickByState(field, "unknown", n); }
export function topShaky(field: FamilyField[], _lang: "en" | "ru", n = 6): string[] { return pickByState(field, "shaky", n); }
```

- [ ] **Step 4: Run to verify pass**

Run: `cd site && bun run test -- mastery-field` → PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/mastery-field.ts site/src/scripts/path/mastery-field.test.ts
git commit -m "feat(path): mastery-field read-model for concept-mastery map"
```

---

## Task 2: [LOCAL] `scheduleBudget` pure helper (deadline have/need bar)

**Files:**
- Create: `site/src/scripts/path/schedule-budget.ts`
- Test: `site/src/scripts/path/schedule-budget.test.ts`

The deadline budget bar shows hours available vs hours needed. Derive honestly from the real `Schedule`.

- [ ] **Step 1: Write failing tests**

```ts
// site/src/scripts/path/schedule-budget.test.ts
import { describe, it, expect } from "vitest";
import { scheduleBudget } from "./schedule-budget";
import type { Schedule } from "./types";

function sched(minsPerDay: number[], verdict: "fits" | "over" | "under", deltaMin: number): Schedule {
  return {
    days: minsPerDay.map((m, i) => ({ date: `2026-07-0${i + 1}`, minutes: m, steps: [] })),
    feasibility: { verdict, deltaMin, dropped: [] },
    countdownDays: minsPerDay.length,
  };
}

describe("scheduleBudget", () => {
  it("fits: need = avail - slack", () => {
    const b = scheduleBudget(sched([60, 60, 60], "under", 60)); // avail 180, slack +60
    expect(b.availMin).toBe(180);
    expect(b.needMin).toBe(120);
    expect(b.deltaMin).toBe(60);
    expect(b.pct).toBe(100); // avail covers need → full
  });
  it("over: need = avail + deficit, pct < 100", () => {
    const b = scheduleBudget(sched([60, 60], "over", -120)); // avail 120, deficit 120 → need 240
    expect(b.availMin).toBe(120);
    expect(b.needMin).toBe(240);
    expect(b.pct).toBe(50);
  });
  it("zero need is safe", () => {
    const b = scheduleBudget(sched([0], "fits", 0));
    expect(b.needMin).toBe(0);
    expect(b.pct).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify fail** — `cd site && bun run test -- schedule-budget` → FAIL.

- [ ] **Step 3: Implement**

```ts
// site/src/scripts/path/schedule-budget.ts
import type { Schedule } from "./types";

export interface Budget { availMin: number; needMin: number; deltaMin: number; pct: number; }

// availMin = total scheduled minutes in the window; deltaMin = signed slack (>0 ahead, <0 behind);
// needMin = the work the plan requires = avail - delta (delta already = avail - need).
// pct = how much of need is covered by avail, clamped 0..100.
export function scheduleBudget(s: Schedule): Budget {
  const availMin = s.days.reduce((a, d) => a + (d.minutes || 0), 0);
  const deltaMin = s.feasibility.deltaMin;
  const needMin = Math.max(0, availMin - deltaMin);
  const pct = needMin === 0 ? 100 : Math.min(100, Math.round((availMin / needMin) * 100));
  return { availMin, needMin, deltaMin, pct };
}
```

> **Note for implementer:** verify the sign convention of `feasibility.deltaMin` against `site/src/scripts/path/schedule.ts` before trusting the test fixtures. If `deltaMin` is defined as `need - avail` (deficit-positive), flip the two `availMin - deltaMin` / `availMin + deltaMin` usages and update the fixtures to match. The invariant to preserve: `over` ⇒ `needMin > availMin`, `under` ⇒ `needMin < availMin`. Read schedule.ts at step 1.

- [ ] **Step 4: Run to verify pass** (after reconciling the sign convention) → PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/schedule-budget.ts site/src/scripts/path/schedule-budget.test.ts
git commit -m "feat(path): scheduleBudget helper for deadline budget bar"
```

---

## Task 3: [LOCAL] Add missing CSS tokens (`--known/--shaky/--unknown/--cal-filter`)

**Files:**
- Modify: `site/src/styles/global.css` (the `:root` / `[data-theme]` token blocks)

The survey map needs 3-state colors and the date input needs a dark-mode icon filter. Add to the global token scale (both themes) so any screen can use them. Match the mockup's intent: known = the success/green family, shaky = the warn/amber family, unknown = a faint neutral.

- [ ] **Step 1: Read** `docs/redesign/v2/project/tokens.css` for the exact `--known/--shaky/--unknown/--cal-filter` values, and `site/src/styles/global.css` for the existing `:root` + `[data-theme="dark"]` token blocks and the names of the live `--ok`/`--warn`/`--faint` tokens.

- [ ] **Step 2: Add tokens** to `:root` (light) and the dark override, anchored to existing tokens so they track theme changes. Example shape (use the real adjacent token names found in step 1):

```css
:root {
  --known: var(--ok);
  --shaky: var(--warn);
  --unknown: color-mix(in srgb, var(--ink) 14%, transparent);
  --cal-filter: none;
}
[data-theme="dark"] {
  --unknown: color-mix(in srgb, var(--paper) 22%, transparent);
  --cal-filter: invert(1) brightness(1.4);
}
```

- [ ] **Step 3: Verify** `cd site && bun run build` → 0 errors. Grep the built CSS to confirm the tokens resolve: `grep -r -- "--known" dist/_astro/*.css | head -1`.

- [ ] **Step 4: Commit**

```bash
git add site/src/styles/global.css
git commit -m "feat(styles): add --known/--shaky/--unknown/--cal-filter survey tokens"
```

---

## Task 4: [LOCAL] Trajectory tab-bar + screen-head in `roadmap.astro`

**Files:**
- Create: `site/src/components/path/planning/TrajectoryTabs.astro`
- Modify: `site/src/pages/[lang]/roadmap.astro`

Static (zero-hydration) cross-screen nav + the section header, rendered in the Astro page around the island.

- [ ] **Step 1: Create `TrajectoryTabs.astro`** — a static nav. Planning active; Progression → `/${lang}/profile`; Cabinet → `/${lang}/account`; Achievements `aria-disabled` (span, not link). Class names match the mockup (`.traj-tabs`, `.tt-kick`, `.ti`) so `planning-screen.css` styles them. Props: `{ lang: Locale; active: "planning" }`. Labels EN+RU inline.

```astro
---
import type { Locale } from "~/i18n";
const { lang } = Astro.props as { lang: Locale };
const L = lang === "ru"
  ? { kick: "Траектория", plan: "Планирование", ach: "Достижения", prog: "Прогресс", cab: "Кабинет" }
  : { kick: "Trajectory", plan: "Planning", ach: "Achievements", prog: "Progression", cab: "Cabinet" };
---
<nav class="traj-tabs" aria-label={L.kick}>
  <span class="tt-kick">{L.kick}</span>
  <a aria-current="true"><span class="ti">01</span>{L.plan}</a>
  <span aria-disabled="true" class="tt-soon"><span class="ti">02</span>{L.ach}</span>
  <a href={`/${lang}/profile`}><span class="ti">03</span>{L.prog}</a>
  <a href={`/${lang}/account`}><span class="ti">04</span>{L.cab}</a>
</nav>
```

- [ ] **Step 2: Rewrite `roadmap.astro`** to import `planning-screen.css`, render the screen-head + `<TrajectoryTabs>` statically, then mount the island. Keep `getStaticPaths`/`isLocale`.

```astro
---
import Topic from "../../layouts/Topic.astro";
import PathView from "../../components/path/PathView.tsx";
import TrajectoryTabs from "../../components/path/planning/TrajectoryTabs.astro";
import { type Locale, isLocale, t } from "../../i18n";
import "../../styles/planning-screen.css";

export function getStaticPaths() { return [{ params: { lang: "en" } }, { params: { lang: "ru" } }]; }
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
const head = lang === "ru"
  ? { kicker: "Твоя траектория · path engine", title: "Планирование", sub: "Размеченный маршрут по 29 трекам — что учить, в каком порядке и по какому графику. Пререквизиты вперёд; уже известное пропускается." }
  : { kicker: "Your trajectory · the path engine", title: "Planning", sub: "A surveyed route through 29 tracks — what to learn, in what order, on what schedule. Prerequisites first; what you already know is skipped." };
---
<Topic title={t("roadmap.title", lang)} lang={lang}>
  <main class="page"><div class="wrap screen">
    <section class="screen-head">
      <div>
        <div class="kicker">{head.kicker}</div>
        <h1 class="sh-title">{head.title}</h1>
        <p class="sh-sub">{head.sub}</p>
      </div>
    </section>
    <TrajectoryTabs lang={lang} active="planning" />
    <PathView client:only="preact" lang={lang} />
  </div></main>
</Topic>
```

> **Note:** `planning-screen.css` (Task 6) must exist for the build to pass. During LOCAL-first execution, create an empty `site/src/styles/planning-screen.css` placeholder in this task so the import resolves; cowork fills it in Task 6.

- [ ] **Step 3:** Create empty `site/src/styles/planning-screen.css` with a one-line header comment. Run `cd site && bun run build` → 0 errors (page renders head + tabs + existing island).

- [ ] **Step 4: Commit**

```bash
git add site/src/components/path/planning/TrajectoryTabs.astro site/src/pages/\[lang\]/roadmap.astro site/src/styles/planning-screen.css
git commit -m "feat(path): trajectory tab-bar + screen-head shell on /roadmap"
```

---

## Task 5: [LOCAL] Write the cowork HANDOFF doc

**Files:**
- Create: `docs/redesign/v2/HANDOFF-planning-reskin.md`

After Tasks 1–4 land on the pushed branch, write the dense handoff so cowork builds components against finished APIs (mirrors `HANDOFF-tasks-10-13.md`). Must include:

- [ ] **Branch + how to start** (`git fetch && git checkout feat/planning-screen-reskin`).
- [ ] **Pixel source:** `docs/redesign/v2/project/Planning.html` + `planning.css` + `planning.js` (behaviours) + `cluster.css` (chrome) + `tokens.css`/`components.css`. "Recreate visually; do not copy the prototype's vanilla-JS structure."
- [ ] **Done-APIs to build on** (exact signatures): `mastery-field` (`masteryField/conceptState/topGaps/topShaky/DOMAIN_FAMILIES/FamilyField`), `schedule-budget` (`scheduleBudget/Budget`), and the full `path-io` setter list from this plan's header. The `content` bundle shape. `computePath()` return shape.
- [ ] **Non-negotiable contracts:** (1) ONE island only — components are plain Preact composed by `PathView`, no new `client:*`. (2) Real data only — no hardcoded "428 concepts"/named callouts; compute from `masteryField`/`topGaps`. Omit anything not derivable. (3) EN+RU `L` maps on every component; EN canonical. (4) a11y: keyboard-operable week-hours steppers (`role="spinbutton"`, Arrow keys), `aria-pressed` on goals/segments, `aria-disabled` honored. (5) No `localStorage`/`Date.now()` in components — only via `path-io`. (6) Reduced-motion respected.
- [ ] **Resolved gotchas:** the band-fill block-`<div>`-not-inline rule (from chat2 + `feedback_subagent-...`); full-page screenshots exaggerate faintness (judge on clips); `planning-screen.css` must self-contain `.seg/.sec-head/.sec-index/.fig-caption/.wrap/.panel/.screen/.inset/.btn-*` scoped under `.screen` (english-hub.css versions are `.hub`-scoped); tokens `--known/--shaky/--unknown/--cal-filter` already added in Task 3.
- [ ] **The exact component list + contracts** = Tasks 6–8 below (copy their contracts verbatim).
- [ ] **What I verify behind you:** vitest + independent build + visual (light/dark/EN/RU) + contrast pass + junk cleanup. "You may not be able to push; I pull and push."

Commit: `git add docs/redesign/v2/HANDOFF-planning-reskin.md && git commit -m "docs(redesign): planning re-skin cowork handoff"`.

---

## Task 6: [COWORK] `planning-screen.css` — port + reconcile

**Files:**
- Modify: `site/src/styles/planning-screen.css` (placeholder created in Task 4)

Port `docs/redesign/v2/project/planning.css` + the `.screen`/`.screen-head`/`.traj-tabs`/`.page`/`.badge`/`.panel`/`.inset`/`.btn*`/`.seg` rules from `cluster.css`+`components.css`, reconciled to live atlas-kit.

**Contract:**
- All selectors scoped so they cannot leak site-wide: prefix structural/base classes with `.screen ` (e.g. `.screen .panel`, `.screen .btn-primary`) OR keep the mockup's `.cluster`/`.screen` wrapper. The page wrapper is `.wrap.screen` (Task 4).
- Use only tokens that resolve in the live kit (verified list in the header) + the four added in Task 3. No unresolved `var(--*)`.
- Light + dark must both read correctly. The editorial muted/faint palette is borderline-AA — the controller adds a scoped contrast pass in Task 10; build it faithfully first.
- Responsive: keep the mockup's `@media (max-width: 860px / 760px)` collapses.

**Acceptance:** `cd site && bun run build` 0/0; no unresolved `var()`; visual check (Task 10) shows the survey map + deadline grid as instruments in both themes.

Commit per component: `git commit -m "feat(path): planning-screen.css port"`.

---

## Task 7: [COWORK] Signature components — `ConceptMasteryMap` + `DeadlineSection`

**Files:**
- Create: `site/src/components/path/planning/ConceptMasteryMap.tsx`
- Create: `site/src/components/path/planning/DeadlineSection.tsx` (+ co-located `WeekHoursGrid`, `BlackoutList` if split)

**`ConceptMasteryMap` contract:**
- Props: `{ lang: Locale }`. Reads `knowledge.value`, `content.concepts`, `config.value.weights.masteryThreshold`; computes `masteryField(state, concepts, threshold, lang)`.
- Renders the mockup's `.cmap` per family: label (sq hue + name + `known/total · N shaky`) + bar (`known/total`) + node field (`.cnode` `.known`/`.shaky`/unknown). Cap nodes per family for render (e.g. 80) with a `+N` count if exceeded.
- Footer callouts from `topShaky(field,lang,3)` and `topGaps(field,lang,3)` — real data, omit a callout if its list is empty. The `.fig-caption` signature line from the mockup (translated).
- No hardcoded totals; the `428 concepts mapped` line = computed total across families.

**`DeadlineSection` contract:**
- Props: `{ lang: Locale }`. Reads `config.value.deadline` + `computePath().schedule`.
- **Config (input):** target-date `<input type=date>`; 7-day `WeekHoursGrid` (Mon..Sun steppers, 0=off, keyboard `role=spinbutton` + Arrow keys + wheel, matching `planning.js`); `BlackoutList` (add/remove ISO dates); reading-depth `.seg` (junior/middle/senior). Every edit composes a full `DeadlineConfig` (`{targetDateMs, perWeekdayHours[7], blackoutDates[], tzOffsetMin}`) and calls `setDeadline(cfg)`. `tzOffsetMin` from `new Date().getTimezoneOffset()` at write time. Clearing the date → `setDeadline(undefined)`.
- **Output:** when `schedule` exists — verdict block (`fits`/`over`/`under` → on-track/over styling + `countdownDays` "days left"); budget bar via `scheduleBudget(schedule)` (have `availMin`, need `needMin`, `pct` fill + need marker); honest verdict sentence built from `feasibility` + `dropped` (real `content.unitTitleById` titles); dated schedule list from `schedule.days` (first ~6 non-empty, today marker, rest/blackout rows). No schedule → neutral empty output.
- depthTier writes via `setKnob({ depthTier })` (shared with Advanced knobs) — it genuinely re-weights the plan.

**Acceptance:** both render with real engine data; setting a date produces a live verdict + dated schedule; build 0/0; a11y steppers keyboard-operable.

Commit per component.

---

## Task 8: [COWORK] `GoalSection` + `NextPath`/`UnitRow` + `AdvancedKnobs` + `PathView` shell rewrite

**Files:**
- Create: `site/src/components/path/planning/GoalSection.tsx`
- Create: `site/src/components/path/planning/NextPath.tsx` + `UnitRow.tsx`
- Create: `site/src/components/path/planning/AdvancedKnobs.tsx`
- Rewrite: `site/src/components/path/PathView.tsx`

**`GoalSection` contract:** preset goals from `content.goals`/`goals.json` as `.goal` cards with live P1/P2/P3 priority chips driven by `config.value.goals` (toggling reflows priorities via `setGoals`). A dashed "Custom goal" card opens the existing `GoalPicker` modal (reuse — `searchConcepts` + track-exclude). `aria-pressed` reflects active goals.

**`NextPath`/`UnitRow` contract:** `ol.unit-list` from `computePath().path.steps`. Each `UnitRow` shows domain-tag (hue via the concept's family/track), title (`content.unitTitleById`), `u-why` (`step.reason` + unlocked concept labels from `step.unlocks` via `content.conceptById`), meta (prereq met/queued from step state, `estMin`, `kind`). Carries the existing affordances as controls: `skipUnit`, `pinUnit`/`isPinned`, `moveUnit`, `reorderPath` (HTML5 DnD), `loosenUnit`, and quick-check (opens `DiagnosticRunner` via `unitProbeConcepts`). Primary CTA "Start" → the unit's first lesson route; queued units get the secondary "Queued" style. Preserve all current PathCard behaviours — nothing regresses.

**`AdvancedKnobs` contract:** collapsed `<details class="inset">` with breadth⇄depth range (`setKnob({breadthVsDepth})`, label Breadth/Balanced/Depth-leaning), pace range (`setKnob({pace:{...}})`, Relaxed/Steady/Intense), depth-tier `.seg` (`setKnob({depthTier})`). A quiet link "advanced graph edits" opens the existing `PathConfigDrawer` (reuse — full weights/excluded-tracks/overrides). No new engine fields.

**`PathView` rewrite contract:** the island shell. Reads signals once; composes, in order: XP/level strip (re-skinned, `currentXp`/`levelFromXp`/`completedStepCount`), cold-start banner (re-skinned → `/calibrate`), `droppedLocal` warning, `GoalSection`, `ConceptMasteryMap`, `NextPath`, `DeadlineSection`, `AdvancedKnobs`. Owns modal/drawer state (`GoalPicker`, `PathConfigDrawer`, `DiagnosticRunner`). Sectioned with `.screen-section` + `.sec-head`/`.sec-index` like the mockup. Keep `lang` prop. The component file stays the island entry imported by `roadmap.astro`.

**Acceptance:** full screen renders + all interactions work on real data; build 0/0; i18n parity; exactly one island on the page.

Commit per component.

---

## Task 9: [LOCAL] (runs before Task 5 handoff is final) — confirm reuse seams

**Files:** read-only verification, no commit unless a seam needs a tiny export.

- [ ] Confirm `GoalPicker.tsx` and `PathConfigDrawer.tsx` accept `{ lang, onClose }` and can be opened/closed by a parent (they already are, in current `PathView`). If cowork needs a prop they don't expose, add it here (LOCAL) and note it in the handoff. Confirm `DiagnosticRunner` props (`{lang, conceptIds, onConcept, onDone}`) from current `PathView`. Confirm the unit→first-lesson route helper exists (search `next-lesson.ts` / `unitTitleById`); if the "Start" CTA needs a route builder not present, add a tiny LOCAL helper and document it. This task de-risks the cowork build; do it during Tasks 1–4.

---

## Task 10: [LOCAL] Verify-behind, contrast pass, cutover, merge

**Files:**
- Modify: `site/src/styles/planning-screen.css` (scoped contrast block, like english-hub.css's `.hub{--meta}` pass)
- Delete: dead components once unreferenced (`DeadlinePanel.tsx`, `PathCard.tsx`, and any drawer no longer mounted) — only after grep confirms zero imports.

- [ ] **Step 1: Pull cowork work**, clean sandbox junk (`*.symlink.aside`, `vitest.config.ts.timestamp-*.mjs`), `git status` review.
- [ ] **Step 2: Gates** — `cd site && bun run test` (all pass incl. Tasks 1–2) and `bun run build` (0/0). If cowork left commits local-only, they're already pulled; if not, re-create from their diff.
- [ ] **Step 3: Visual** — Playwright clipped 2× shots of the map + deadline sections, light+dark, EN+RU. Judge contrast on clips. Confirm signature regions read as instruments and the band-fill renders (block div, not collapsed).
- [ ] **Step 4: Contrast pass** — if muted/faint text is borderline (it was on English Hub), add a scoped `.screen { --meta: color-mix(...) }` block + element overrides at the END of `planning-screen.css` (mirror the english-hub.css fix). Global tokens untouched.
- [ ] **Step 5: Dead-code cutover** — grep for imports of `DeadlinePanel`/`PathCard`; if zero, delete them. Re-build 0/0.
- [ ] **Step 6: Final review** — dispatch a code-quality reviewer subagent over the whole branch (spec-compliance + quality). Fix findings.
- [ ] **Step 7: Commit + push + merge** — only on explicit owner command (FF-merge rule). `git commit`, push branch. Merge to main when owner says.

```bash
git add -A && git commit -m "feat(path): planning screen re-skin — contrast pass + dead-code cutover"
git push -u origin feat/planning-screen-reskin
# FF-merge to main ONLY on explicit owner command
```

---

## Self-Review

**Spec coverage:** GOAL picker → T8. Concept-mastery map → T1+T7. NEXT path → T8. Deadline (input+output+budget+dated schedule) → T2+T7. Advanced knobs → T8. Tab-bar → T4. Screen-head/chrome reuse → T4. One-island → T4+T8. 3-state derivation → T1. Domain families → T1. Tokens/base-class port → T3+T6. EN+RU → every component task. Cold-start/droppedLocal/XP kept → T8. Reuse tested drawers → T8+T9. Testing → T1,T2 (unit), T10 (build/visual/contrast). Hybrid verification → T10. All spec §1–§5 requirements have a task. ✅

**Placeholder scan:** Pure-module tasks (1,2) and structural tasks (3,4) contain full code. Component tasks (6,7,8) are contract-specs by design (hybrid: the HANDOFF doc + pixel-source mockup is the detailed instruction; cowork recreates pixel-perfect from `Planning.html`/`planning.css`/`planning.js`). This is the intended division, not a placeholder gap — the contracts name exact files, props, APIs, and acceptance.

**Type consistency:** `FamilyField`/`FieldNode`/`CState`/`DomainFamily` consistent T1↔T7. `Budget` fields (`availMin/needMin/deltaMin/pct`) consistent T2↔T7. `path-io` setter names match the verified header list. `DeadlineConfig` shape matches types.ts. Tab targets `/profile`,`/account` verified to exist. ✅

**Ordering:** LOCAL 1→2→3→4→9 first (APIs + shell + seams) → 5 (handoff) → COWORK 6,7,8 → LOCAL 10 (verify/merge). The `planning-screen.css` placeholder (T4) keeps the build green before cowork fills it (T6).
