# Readiness Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One `/readiness` page that unifies the whole adaptive cycle into a single "Am I ready?" view: live rank + "placed X → now Y" (P1), senior-by-date forecast (P1), weak spots (P3), and interview readiness (P4). Makes every measurement the system takes of the learner visible in one place.

**Architecture:** Persist the interview-readiness measurement into `Progression` (new field). Add a `currentReadiness()` selector in `path-io.ts` that bundles the existing tested selectors (rank derivation, `currentPace`/`projectRatingDate`, `currentWeakSpots`) plus the persisted interview readiness into one object. Render it with one client-only `ReadinessDashboard` island on a new `/[lang]/readiness.astro` page.

**Tech Stack:** TypeScript, Preact + signals, Astro 5, Vitest, bun.

## Global Constraints

- Imports use the `~/` alias; the `.astro` page may mirror `review.astro`/`profile.astro` relative imports for layout/i18n.
- Hydration cap = 5 islands/page; the readiness page mounts exactly ONE island (`ReadinessDashboard`).
- Reader-facing strings bilingual EN + RU via `t(key, lang)`; add new keys to BOTH `en` and `ru` in `src/i18n/ui.json`.
- Pure functions take no clock; the path-io selector may use `Date.now()` (matches `currentPace`/`currentWeakSpots`).
- No `console.log`.
- GATE (from `/Users/artemmac/dev/awesome-everything/site`): `bun run test` MUST pass; `bun run check` adds NO NEW errors in touched files; `bun run lint:src` MUST pass; for the page task, dev-curl `/en/readiness` + `/ru/readiness` for HTTP 200 (start dev with `NODE_OPTIONS=--max-old-space-size=8192 bun run dev` — default heap OOMs on this content set). DO NOT run `bun run build` (OOMs locally).
- Commit after each task with the exact plan message. Branch `feat/readiness-dashboard` (off main, which has P1–P4).

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/scripts/progression/types.ts` | `Progression` type | Modify — add `interviewReadiness?`, `interviewCompletedAt?` |
| `src/components/interview/InterviewRunner.tsx` | persist readiness on finish | Modify |
| `src/scripts/path/path-io.ts` | `currentReadiness()` selector | Modify |
| `src/components/progression/ReadinessDashboard.tsx` | dashboard island | Create |
| `src/pages/[lang]/readiness.astro` | page mount | Create |
| `src/i18n/ui.json` | `readiness.*` + `nav.readiness` | Modify |
| `src/components/atlas/TopNav.astro` | nav link | Modify |

Verified anchors: rank derivation `ProfilePanel.tsx` (`displayRating = Math.max(pretest?.rating ?? 0, peakRating)`, `displayRank = ratingToRank(displayRating).id`, `movedUp`); forecast pieces `barRatingForGoal(goalId)` + `projectRatingDate(effRating, barRating, pace?.projectedFinishMs ?? null, dl.targetDateMs)` + `currentPace()` (effRating = `Math.max(pretest?.rating ?? 0, studyEma ?? 0)`); `currentWeakSpots(): WeakSpot[]` + render via `startHref(lang, unitId)` + `content.unitTitleById.get(unitId)?.[lang]`; `readinessScore` `interview-session.ts`; `Progression` `progression/types.ts`; InterviewRunner finish block computes `score = Math.round(readinessScore(outcomes))`; page pattern `review.astro`/`profile.astro` (Topic + `client:only="preact"` + fallback removed on mount); nav `TopNav.astro` rail-item + `isX = seg === "..."`; `ratingToRank` returns `{id, icon, color, label:{en,ru}, ...}`.

---

### Task 1: Persist interview readiness into `Progression`

**Files:**
- Modify: `src/scripts/progression/types.ts` (the `Progression` interface)
- Modify: `src/components/interview/InterviewRunner.tsx` (finish block)

**Interfaces:**
- Produces: `Progression.interviewReadiness?: number` (0–100, high-water) + `interviewCompletedAt?: number`; InterviewRunner writes them on finish.

- [ ] **Step 1: Add the fields**

In `src/scripts/progression/types.ts`, append to the `Progression` interface (after the existing `peakRating?`/`studyEma?` fields):

```ts
  interviewReadiness?: number;   // 0–100, best score from a completed interview session (high-water)
  interviewCompletedAt?: number; // epoch ms of last interview finish
```

- [ ] **Step 2: Persist on finish in InterviewRunner**

In `src/components/interview/InterviewRunner.tsx`, in the finish branch (`if (idx >= items.length) { const score = Math.round(readinessScore(outcomes)); ... }`), add a persist call right after computing `score` and before the `return`. Use a one-shot guard so it writes once per mount:

```tsx
  if (idx >= items.length) {
    const score = Math.round(readinessScore(outcomes));
    const prog = userState.value.progression;
    if (score > (prog.interviewReadiness ?? 0)) {
      userState.value = {
        ...userState.value,
        progression: { ...prog, interviewReadiness: score, interviewCompletedAt: Date.now() },
      };
    }
    return (
      // ...existing finish JSX unchanged...
    );
  }
```

Ensure `userState` is imported (it is used elsewhere in the file via `userState.value`); if not, add `import { userState } from "~/scripts/user-state";`. (Writing during render is acceptable here because it is idempotent — guarded by the high-water check — and the component unmounts after; mirror the existing `recordActiveDay()` side-effect pattern already in this component.)

- [ ] **Step 3: Gate**

Run: `bun run test` then `bun run check`
Expected: PASS; no new type errors. (No new unit test — this is a one-line persistence of an already-tested score.)

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything/site
git add src/scripts/progression/types.ts src/components/interview/InterviewRunner.tsx
git commit -m "feat(interview): persist interview readiness into progression"
```

---

### Task 2: `currentReadiness()` selector in `path-io.ts`

**Files:**
- Modify: `src/scripts/path/path-io.ts`

**Interfaces:**
- Consumes (all in path-io scope or imported): `userState`, `config`, `ratingToRank`, `barRatingForGoal`, `projectRatingDate`, `currentPace`, `currentWeakSpots`, `type WeakSpot`, `type RatingForecast`, `type Pace`.
- Produces:
  - `export interface Readiness { displayRating: number; displayRank: string; placedRating: number; movedUp: boolean; barRating: number; forecast: RatingForecast | null; pace: Pace | null; weakSpots: WeakSpot[]; interviewReadiness: number | null }`
  - `export function currentReadiness(): Readiness`

- [ ] **Step 1: Add the imports (if missing)**

Confirm `ratingToRank` is imported in path-io (add `import { ratingToRank } from "~/scripts/progression/ranks";` if not). `barRatingForGoal`/`projectRatingDate`/`type RatingForecast` come from `~/scripts/progression/effective-rating` (already imported for the P1 work — add `projectRatingDate`, `type RatingForecast` to that import if absent). `type Pace` from `./pace`.

- [ ] **Step 2: Add the selector**

Add near `currentPace`/`currentWeakSpots` (after them):

```ts
export interface Readiness {
  displayRating: number;
  displayRank: string;
  placedRating: number;
  movedUp: boolean;
  barRating: number;
  forecast: RatingForecast | null;
  pace: Pace | null;
  weakSpots: WeakSpot[];
  interviewReadiness: number | null;
}

/** One bundle for the readiness dashboard: live rank (high-water), the senior-by-date
 *  forecast, weak spots, and the persisted interview readiness. Reuses the existing tested
 *  selectors; SSR-safe ([] / nulls on the server). */
export function currentReadiness(): Readiness {
  const s = userState.value;            // subscribe
  const cfg = config.value;             // subscribe
  const pretest = s.pretest;
  const placedRating = pretest?.rating ?? 0;
  const peakRating = s.progression.peakRating ?? 0;
  const displayRating = Math.max(placedRating, peakRating);
  const displayRank = ratingToRank(displayRating).id;
  const movedUp = !!pretest && displayRating > placedRating;

  const goalsSorted = [...cfg.goals].sort((a, b) => a.priority - b.priority);
  const goalId = goalsSorted[0]?.id ?? "senior-fullstack";
  const barRating = barRatingForGoal(goalId);
  const effRating = Math.max(placedRating, s.progression.studyEma ?? 0);
  const dl = cfg.deadline;
  const pace = typeof window === "undefined" ? null : currentPace();
  const forecast = dl ? projectRatingDate(effRating, barRating, pace?.projectedFinishMs ?? null, dl.targetDateMs) : null;

  return {
    displayRating,
    displayRank,
    placedRating,
    movedUp,
    barRating,
    forecast,
    pace,
    weakSpots: typeof window === "undefined" ? [] : currentWeakSpots(),
    interviewReadiness: s.progression.interviewReadiness ?? null,
  };
}
```

- [ ] **Step 3: Gate**

Run: `bun run test` then `bun run check`
Expected: PASS; no new type errors (the `Readiness` shape and all referenced selectors resolve).

- [ ] **Step 4: Commit**

```bash
git add src/scripts/path/path-io.ts
git commit -m "feat(path): currentReadiness selector bundling rank+forecast+weakspots+interview"
```

---

### Task 3: `ReadinessDashboard` island + `/readiness` page + nav + i18n

**Files:**
- Create: `src/components/progression/ReadinessDashboard.tsx`
- Create: `src/pages/[lang]/readiness.astro`
- Modify: `src/i18n/ui.json`
- Modify: `src/components/atlas/TopNav.astro`

**Interfaces:**
- Consumes: `currentReadiness()` (Task 2), `ratingToRank` (label/color), `startHref`-equivalent navigation (build hrefs as `/${lang}/learn/...` is internal to weak-spots; here reuse `content.unitTitleById` via the selector's unitIds — see below), `t`/`Locale`.

- [ ] **Step 1: Add i18n strings**

In `src/i18n/ui.json`, add to BOTH `en` and `ru` (near `review.*`):

EN:
```json
"nav.readiness": "Readiness",
"readiness.title": "Am I ready?",
"readiness.loading": "Reading your signals…",
"readiness.rank": "Current standing",
"readiness.placedNow": "Placed at {p} → now {n}",
"readiness.forecastReached": "You've reached the {bar} bar",
"readiness.forecastBy": "At this pace you reach the {bar} bar by {date} — {delta}",
"readiness.behind": "{d} days behind deadline",
"readiness.ahead": "{d} days ahead",
"readiness.onTime": "right on deadline",
"readiness.weak": "Weak spots to shore up",
"readiness.weakNone": "No weak spots flagged — keep going.",
"readiness.interview": "Interview readiness",
"readiness.interviewNone": "Not measured yet — try a mock interview.",
"readiness.interviewCta": "Start a mock interview"
```

RU:
```json
"nav.readiness": "Готовность",
"readiness.title": "Готов ли я?",
"readiness.loading": "Читаю твои сигналы…",
"readiness.rank": "Текущий уровень",
"readiness.placedNow": "Размещён на {p} → сейчас {n}",
"readiness.forecastReached": "Ты достиг планки {bar}",
"readiness.forecastBy": "При текущем темпе достигнешь планки {bar} к {date} — {delta}",
"readiness.behind": "на {d} дн. позже дедлайна",
"readiness.ahead": "на {d} дн. раньше",
"readiness.onTime": "точно к дедлайну",
"readiness.weak": "Слабые места",
"readiness.weakNone": "Слабых мест не отмечено — продолжай.",
"readiness.interview": "Готовность к собесу",
"readiness.interviewNone": "Ещё не измерено — пройди мок-интервью.",
"readiness.interviewCta": "Начать мок-интервью"
```

- [ ] **Step 2: Create the dashboard island**

Create `src/components/progression/ReadinessDashboard.tsx`:

```tsx
import { useEffect } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import { currentReadiness } from "~/scripts/path/path-io";
import { ratingToRank } from "~/scripts/progression/ranks";
import { content } from "~/scripts/path/path-io";

function fmtDate(ms: number): string { return new Date(ms).toISOString().slice(0, 10); }

export default function ReadinessDashboard({ lang }: { lang: Locale }) {
  useEffect(() => { document.getElementById("readiness-fallback")?.remove(); }, []);

  const r = currentReadiness();
  const rank = ratingToRank(r.displayRating);
  const barLabel = ratingToRank(r.barRating).label[lang];

  const deltaText = (d: number) =>
    d > 0 ? t("readiness.behind", lang).replace("{d}", String(d))
    : d < 0 ? t("readiness.ahead", lang).replace("{d}", String(-d))
    : t("readiness.onTime", lang);

  const weak = r.weakSpots
    .map((w) => ({ key: w.unitId, href: `/${lang}/learn/`, title: content.unitTitleById.get(w.unitId)?.[lang] ?? w.unitId }));

  return (
    <div class="readiness-grid">
      <section class="rd-card rd-rank" style={`border-color:${rank.color}`}>
        <span class="rd-head">{t("readiness.rank", lang)}</span>
        <strong class="rd-rank-label" style={`color:${rank.color}`}>{rank.icon} {rank.label[lang]}</strong>
        <span class="rd-rating">{r.displayRating}</span>
        {r.movedUp && (
          <span class="rd-moved">{t("readiness.placedNow", lang).replace("{p}", String(r.placedRating)).replace("{n}", String(r.displayRating))}</span>
        )}
      </section>

      {r.forecast && (
        <section class="rd-card rd-forecast">
          <span class="rd-head">{barLabel}</span>
          {r.forecast.reached
            ? <p>{t("readiness.forecastReached", lang).replace("{bar}", barLabel)}</p>
            : r.forecast.projectedMs
              ? <p>{t("readiness.forecastBy", lang).replace("{bar}", barLabel).replace("{date}", fmtDate(r.forecast.projectedMs)).replace("{delta}", deltaText(r.forecast.daysAheadBehind))}</p>
              : null}
        </section>
      )}

      <section class="rd-card rd-weak">
        <span class="rd-head">{t("readiness.weak", lang)}</span>
        {weak.length === 0
          ? <p class="rd-muted">{t("readiness.weakNone", lang)}</p>
          : <ul class="rd-list">{weak.map((w) => <li key={w.key}><a href={w.href}>{w.title}</a></li>)}</ul>}
      </section>

      <section class="rd-card rd-interview">
        <span class="rd-head">{t("readiness.interview", lang)}</span>
        {r.interviewReadiness == null
          ? <p class="rd-muted">{t("readiness.interviewNone", lang)} <a href={`/${lang}/interview/`}>{t("readiness.interviewCta", lang)}</a></p>
          : <strong class="rd-iv-score">{r.interviewReadiness}%</strong>}
      </section>
    </div>
  );
}
```

(If `content` is not an exported symbol from `path-io`, replace the weak-spot title lookup with the unitId directly — `title: w.unitId` — and leave a TODO comment; the page still renders. Prefer the title lookup if `content.unitTitleById` is exported.)

- [ ] **Step 3: Create the page**

Create `src/pages/[lang]/readiness.astro` (mirror `review.astro`):

```astro
---
import Topic from "../../layouts/Topic.astro";
import ReadinessDashboard from "../../components/progression/ReadinessDashboard.tsx";
import { type Locale, isLocale, t } from "../../i18n";
import { selectOther } from "~/scripts/build-incremental";

export function getStaticPaths() {
  return selectOther([{ params: { lang: "en" } }, { params: { lang: "ru" } }]);
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
---
<Topic title={t("readiness.title", lang)} lang={lang}>
  <h1 class="text-3xl font-extrabold mb-6">{t("readiness.title", lang)}</h1>
  <div id="readiness-fallback" class="review-empty">
    <p class="re-lead">{t("readiness.loading", lang)}</p>
  </div>
  <ReadinessDashboard client:only="preact" lang={lang} />
</Topic>
```

- [ ] **Step 4: Add the nav link**

In `src/components/atlas/TopNav.astro`, add `const isReadiness = seg === "readiness";` alongside the other `isX` checks, and a rail-item link next to the `review`/`interview` links (mirror their exact markup):

```astro
<a class="rail-item" href={`/${lang}/readiness/`} aria-current={isReadiness ? "page" : undefined}>
  {t("nav.readiness", lang)}
</a>
```

- [ ] **Step 5: Gate + dev-curl**

Run: `bun run check` then `bun run lint:src`
Expected: PASS (one island on the page).

Run `NODE_OPTIONS=--max-old-space-size=8192 bun run dev` (detached), then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/en/readiness
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/ru/readiness
```
Expected: 200 each.

- [ ] **Step 6: Commit**

```bash
git add src/components/progression/ReadinessDashboard.tsx src/pages/[lang]/readiness.astro src/i18n/ui.json src/components/atlas/TopNav.astro
git commit -m "feat(readiness): /readiness dashboard page + island + nav + i18n"
```

---

## Final verification

- [ ] `bun run test` green; `bun run check` no new errors; `bun run lint:src` clean.
- [ ] `/en/readiness` + `/ru/readiness` return 200 (dev with 8GB heap).
- [ ] Manual: the page shows the live rank (+ placed→now if study moved it), the senior-by-date forecast (when a deadline is set), the weak-spots list (or "none"), and interview readiness (or a CTA to the mock interview).

## Self-Review notes

- **Reuse-first:** rank derivation, `currentPace`/`projectRatingDate`/`barRatingForGoal`, and `currentWeakSpots` are all reused via the new `currentReadiness()` bundle; the only new logic is the bundle + presentation + the interview-readiness persistence.
- **Type consistency:** `Readiness` shape consistent across the selector and the island; `RatingForecast`/`WeakSpot`/`Pace` reused unchanged.
- **Deferred:** `currentReadiness()` duplicates the ~5-line forecast composition that also lives inline in `TodayFocus` — left as-is to avoid touching the live `TodayFocus` (could be DRY-refactored later to call `currentReadiness().forecast`).
