# P4 — Mock-Interview Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A `/interview` mock-interview loop that runs a curated sequence of the existing graded system-design tasks (design/incident/diagnose), grades each via the existing BYOK LLM grader (self-grade fallback when no key), records outcomes through the existing practice path (so failures auto-feed SRS + confidence erosion → resurface in the P3 weak-spots block), and shows an interview-readiness score at the end.

**Architecture:** A pure `interview-session.ts` curates the task list at build time and computes the readiness score. A single client-only Preact island `InterviewRunner.tsx` runs the session, REUSING `GradeWithAi` for per-task grading and `recordPracticeOutcome` for outcome recording. A `/[lang]/interview.astro` page queries the practice content collection, builds the session, and mounts the island. ~90% of the work is reuse; the new code is orchestration + page + i18n.

**Tech Stack:** TypeScript, Preact + signals, Astro 5 content collections, Vitest, bun.

## Global Constraints

- Imports use the `~/` alias; never `..` segments (the `.astro` page may use the repo's existing relative pattern for layout/i18n, matching `review.astro`).
- Hydration cap = 5 islands/page; the interview page mounts exactly ONE island (`InterviewRunner`); `GradeWithAi` is rendered as a child component inside it, not a separate island.
- Reader-facing strings bilingual EN + RU via `t(key, lang)` from `~/i18n`; add all new keys to `src/i18n/ui.json` under both `en` and `ru`.
- Pure functions take no clock; `interview-session.ts` has no `Date.now()`. Use `import type` for `PracticeTaskData` so `astro:content` is never pulled into the client bundle or the unit test.
- No `console.log`.
- GATE (from `/Users/artemmac/dev/awesome-everything/site`): `bun run test` MUST pass; `bun run check` must add NO NEW errors in touched files (judge only touched files vs the pre-existing baseline); `bun run lint:src` MUST pass (it enforces the hydration cap + import rules). DO NOT run `bun run build` (full astro build OOMs locally). For the page task, dev-curl `/en/interview` + `/ru/interview` for HTTP 200.
- Commit after each task with the exact plan message. Branch `feat/p4-interview` (already checked out, off the deployed main).

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/scripts/interview/interview-session.ts` | PURE session curation + readiness | Create |
| `src/scripts/interview/interview-session.test.ts` | unit tests | Create |
| `src/components/interview/InterviewRunner.tsx` | client-only runner island | Create |
| `src/pages/[lang]/interview.astro` | page: query collection → mount island | Create |
| `src/i18n/ui.json` | `interview.*` + `nav.interview` strings | Modify |
| `src/components/atlas/TopNav.astro` | nav link | Modify |

Verified anchors: practice collection `content.config.ts:167-172` (`loader: glob(base:"./src/content/practice")`, schema `{ tasks: z.array(PracticeTask).min(1).max(8) }`); `entry.id` = lessonKey `<track>/<unit>/<lesson>` (e.g. `system-design/09-interview-framework/01-requirements`); interview tasks live in `src/content/practice/system-design/09-interview-framework/` (4 files: 01-requirements, 02-estimation, 03-hld-and-deep-dive, 04-bottlenecks-and-tradeoffs); `gradePractice(task, lang, text, model)` + `GradeWithAi({lang, task})` default export `src/components/pedagogy/GradeWithAi.tsx` (handles BYOK key gate + self-grade fallback + renders `PracticeCritique`); `recordPracticeOutcome(lessonKey, taskId, passed)` `path-io.ts:452-456` (→ `recordAttempt` + `recordReview("again")` on fail → feeds SRS + confidence erosion); `cardsFromPractice(lessonKey, lang, tasks: {id,title,prompt}[])` `review-harvest.ts:46-56`; `addCard(seed)` `review-state.ts:68-78`; `recordActiveDay()` `user-state.ts:169`; runner template `ReviewSession.tsx` (queue snapshot + idx + advance + finish screen); page template `review.astro` (Topic layout + `getStaticPaths`/`selectOther` + `client:only="preact"` + fallback div removed on mount); `t(key, lang)` `i18n/index.ts:10`; nav `TopNav.astro` (rail-item links + `seg`-based `isX` checks); `PracticeTaskData` discriminated union exported from `content.config.ts:176` (graded types: `design` has `constraints`/`rubric`/`model`; `incident` has `steps`; `diagnose` has `grading`).

---

### Task 1: Pure `interview-session.ts` — curate the session + readiness score

**Files:**
- Create: `src/scripts/interview/interview-session.ts`
- Test: `src/scripts/interview/interview-session.test.ts`

**Interfaces:**
- Produces:
  - `type Outcome = "pass" | "partial" | "fail"`
  - `interface SessionItem { lessonKey: string; task: PracticeTaskData }`
  - `interface PracticeEntryLite { id: string; tasks: PracticeTaskData[] }`
  - `buildSession(entries: PracticeEntryLite[], opts?: { includePrefixes?: string[]; max?: number }): SessionItem[]`
  - `readinessScore(outcomes: Outcome[]): number`

- [ ] **Step 1: Write the failing test**

Create `src/scripts/interview/interview-session.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSession, readinessScore, type PracticeEntryLite } from "./interview-session";

const task = (id: string, type: string) => ({ id, type, title: { en: id, ru: id }, prompt: { en: id, ru: id } }) as any;

const entries: PracticeEntryLite[] = [
  { id: "system-design/09-interview-framework/01-requirements", tasks: [task("a", "design"), task("b", "sandbox")] },
  { id: "system-design/09-interview-framework/02-estimation", tasks: [task("c", "incident")] },
  { id: "react/01-hooks/01-intro", tasks: [task("d", "design")] }, // off-prefix → excluded
];

describe("buildSession", () => {
  it("keeps only graded tasks from the interview-framework prefix", () => {
    const s = buildSession(entries);
    expect(s.map((i) => i.task.id)).toEqual(["a", "c"]); // b is sandbox (not graded), d is off-prefix
  });
  it("excludes off-prefix entries and respects a custom prefix", () => {
    const s = buildSession(entries, { includePrefixes: ["react/"] });
    expect(s.map((i) => i.task.id)).toEqual(["d"]);
  });
  it("caps at max", () => {
    expect(buildSession(entries, { max: 1 })).toHaveLength(1);
  });
  it("carries the lessonKey for each item", () => {
    const s = buildSession(entries);
    expect(s[0].lessonKey).toBe("system-design/09-interview-framework/01-requirements");
  });
});

describe("readinessScore", () => {
  it("empty → 0", () => expect(readinessScore([])).toBe(0));
  it("all pass → 100", () => expect(readinessScore(["pass", "pass"])).toBe(100));
  it("partial weights half", () => expect(readinessScore(["pass", "partial", "fail"])).toBeCloseTo((1 + 0.5 + 0) / 3 * 100));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/interview/interview-session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/scripts/interview/interview-session.ts`:

```ts
import type { PracticeTaskData } from "~/content.config";

export type Outcome = "pass" | "partial" | "fail";
export interface SessionItem { lessonKey: string; task: PracticeTaskData; }
export interface PracticeEntryLite { id: string; tasks: PracticeTaskData[]; }

// Graded task types the LLM grader (gradePractice) + GradeWithAi support.
const GRADED_TYPES = new Set(["design", "incident", "diagnose"]);

/** Curate the interview session: graded tasks from the interview-framework lessons,
 *  stable-ordered, capped. Pure — entries come from the practice content collection at build. */
export function buildSession(
  entries: PracticeEntryLite[],
  opts: { includePrefixes?: string[]; max?: number } = {},
): SessionItem[] {
  const prefixes = opts.includePrefixes ?? ["system-design/09-interview-framework/"];
  const max = opts.max ?? 8;
  const out: SessionItem[] = [];
  for (const e of entries) {
    if (!prefixes.some((p) => e.id.startsWith(p))) continue;
    for (const task of e.tasks) {
      if (!GRADED_TYPES.has(task.type)) continue;
      out.push({ lessonKey: e.id, task });
    }
  }
  out.sort((a, b) => (a.lessonKey + "::" + a.task.id).localeCompare(b.lessonKey + "::" + b.task.id));
  return out.slice(0, Math.max(0, max));
}

const WEIGHT: Record<Outcome, number> = { pass: 1, partial: 0.5, fail: 0 };

/** Interview readiness 0–100 from per-task self/graded outcomes. */
export function readinessScore(outcomes: Outcome[]): number {
  if (!outcomes.length) return 0;
  return (outcomes.reduce((s, o) => s + WEIGHT[o], 0) / outcomes.length) * 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/interview/interview-session.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything/site
git add src/scripts/interview/interview-session.ts src/scripts/interview/interview-session.test.ts
git commit -m "feat(interview): pure session curation + readiness score"
```

---

### Task 2: `InterviewRunner.tsx` — the client-only runner island

**Files:**
- Create: `src/components/interview/InterviewRunner.tsx`

**Interfaces:**
- Consumes: `SessionItem`/`Outcome`/`readinessScore` (Task 1); `GradeWithAi` (reused verbatim); `recordPracticeOutcome` (path-io); `recordActiveDay` (user-state); `cardsFromPractice`/`addCard` (SRS seed); `t`/`Locale` (i18n).
- Produces: `export default function InterviewRunner({ lang, items }: { lang: Locale; items: SessionItem[] })`.

- [ ] **Step 1: Write the component**

Create `src/components/interview/InterviewRunner.tsx`:

```tsx
import { useState, useEffect } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import GradeWithAi from "~/components/pedagogy/GradeWithAi";
import { recordPracticeOutcome } from "~/scripts/path/path-io";
import { recordActiveDay } from "~/scripts/user-state";
import { cardsFromPractice } from "~/scripts/review-harvest";
import { addCard } from "~/scripts/review-state";
import { readinessScore, type SessionItem, type Outcome } from "~/scripts/interview/interview-session";

const PICKS: Outcome[] = ["pass", "partial", "fail"];

export default function InterviewRunner({ lang, items }: { lang: Locale; items: SessionItem[] }) {
  const [idx, setIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [pick, setPick] = useState<Outcome | null>(null);

  // Remove the SSR fallback once the island mounts.
  useEffect(() => { document.getElementById("interview-fallback")?.remove(); }, []);

  // Seed the interview tasks as SRS cards once, so they re-surface in /review.
  useEffect(() => {
    const byLesson = new Map<string, SessionItem["task"][]>();
    for (const it of items) {
      const arr = byLesson.get(it.lessonKey) ?? [];
      arr.push(it.task);
      byLesson.set(it.lessonKey, arr);
    }
    for (const [lessonKey, tasks] of byLesson) {
      cardsFromPractice(lessonKey, lang, tasks.map((tk) => ({ id: tk.id, title: tk.title, prompt: tk.prompt }))).forEach(addCard);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!items.length) {
    return <p class="re-lead">{t("interview.empty", lang)}</p>;
  }

  if (idx >= items.length) {
    const score = Math.round(readinessScore(outcomes));
    return (
      <section class="iv-done">
        <div class="meta mb-2">{t("interview.title", lang)}</div>
        <p class="iv-score">{t("interview.readiness", lang)}: {score}%</p>
        <p class="text-muted text-xs">{t("interview.doneHint", lang)}</p>
        <a class="re-cta" href={`/${lang}/roadmap/`}>{t("interview.reviewCta", lang)}</a>
      </section>
    );
  }

  const item = items[idx];
  const task = item.task;

  function next() {
    if (!pick) return;
    if (idx === 0) recordActiveDay();
    recordPracticeOutcome(item.lessonKey, task.id, pick === "pass");
    setOutcomes((o) => [...o, pick]);
    setPick(null);
    setIdx((i) => i + 1);
  }

  const counter = t("interview.task", lang).replace("{n}", String(idx + 1)).replace("{total}", String(items.length));

  return (
    <section class="iv-task">
      <div class="meta mb-1">{counter}</div>
      <h2 class="iv-prompt">{task.title[lang]}</h2>
      <p class="iv-body">{task.prompt[lang]}</p>
      {task.type === "design" && <p class="iv-constraints">{task.constraints[lang]}</p>}
      <GradeWithAi lang={lang} task={task} />
      <fieldset class="iv-assess">
        <legend>{t("interview.selfAssess", lang)}</legend>
        {PICKS.map((o) => (
          <button
            type="button"
            key={o}
            class={`iv-pick ${pick === o ? "on" : ""}`}
            aria-pressed={pick === o}
            onClick={() => setPick(o)}
          >
            {t(`interview.${o}`, lang)}
          </button>
        ))}
      </fieldset>
      <button type="button" class="iv-next" disabled={!pick} onClick={next}>{t("interview.next", lang)}</button>
    </section>
  );
}
```

- [ ] **Step 2: Gate (types + source lint)**

Run: `bun run check` then `bun run lint:src`
Expected: PASS. No new type errors in the new file. `lint:src` clean (the file is one island; `GradeWithAi` is a child component, not a second island). If `check` flags `task.constraints` narrowing, confirm the `task.type === "design"` guard precedes it (it does).

- [ ] **Step 3: Commit**

```bash
git add src/components/interview/InterviewRunner.tsx
git commit -m "feat(interview): InterviewRunner island — graded task loop + readiness"
```

---

### Task 3: `/interview` page + i18n strings + nav link

**Files:**
- Create: `src/pages/[lang]/interview.astro`
- Modify: `src/i18n/ui.json`
- Modify: `src/components/atlas/TopNav.astro`

**Interfaces:**
- Consumes: `buildSession` (Task 1), `InterviewRunner` (Task 2), the `practice` collection, `t`/`selectOther`.

- [ ] **Step 1: Add the i18n strings**

In `src/i18n/ui.json`, add these keys to BOTH the `en` and `ru` objects (place near the existing `review.*` keys):

EN:
```json
"nav.interview": "Interview",
"interview.title": "Interview Practice",
"interview.loading": "Loading your interview set…",
"interview.empty": "No interview tasks available yet.",
"interview.task": "Question {n} of {total}",
"interview.selfAssess": "How did you do?",
"interview.pass": "Solid",
"interview.partial": "Partial",
"interview.fail": "Struggled",
"interview.next": "Next question",
"interview.readiness": "Interview readiness",
"interview.doneHint": "Weak answers were added to your reviews and your plan.",
"interview.reviewCta": "Back to your plan"
```

RU:
```json
"nav.interview": "Собес",
"interview.title": "Практика собеседования",
"interview.loading": "Готовлю набор вопросов…",
"interview.empty": "Пока нет вопросов для собеседования.",
"interview.task": "Вопрос {n} из {total}",
"interview.selfAssess": "Как справился?",
"interview.pass": "Уверенно",
"interview.partial": "Частично",
"interview.fail": "Тяжело",
"interview.next": "Следующий вопрос",
"interview.readiness": "Готовность к собесу",
"interview.doneHint": "Слабые ответы добавлены в повторы и в твой план.",
"interview.reviewCta": "Назад к плану"
```

- [ ] **Step 2: Create the page**

Create `src/pages/[lang]/interview.astro` (mirror `review.astro` exactly for layout/paths):

```astro
---
import Topic from "../../layouts/Topic.astro";
import InterviewRunner from "../../components/interview/InterviewRunner.tsx";
import { type Locale, isLocale, t } from "../../i18n";
import { selectOther } from "~/scripts/build-incremental";
import { getCollection } from "astro:content";
import { buildSession } from "~/scripts/interview/interview-session";

export function getStaticPaths() {
  return selectOther([{ params: { lang: "en" } }, { params: { lang: "ru" } }]);
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");

const entries = await getCollection("practice");
const session = buildSession(entries.map((e) => ({ id: e.id, tasks: e.data.tasks })));
---
<Topic title={t("interview.title", lang)} lang={lang}>
  <h1 class="text-3xl font-extrabold mb-6">{t("interview.title", lang)}</h1>
  <div id="interview-fallback" class="review-empty">
    <p class="re-lead">{t("interview.loading", lang)}</p>
  </div>
  <InterviewRunner client:only="preact" lang={lang} items={session} />
</Topic>
```

- [ ] **Step 3: Add the nav link**

In `src/components/atlas/TopNav.astro`, add a segment check alongside the existing ones (e.g. after `const isReview = seg === "review";`):

```ts
const isInterview = seg === "interview";
```

And add a rail-item link next to the existing `review` link:

```astro
<a class="rail-item" href={`/${lang}/interview/`} aria-current={isInterview ? "page" : undefined}>
  {t("nav.interview", lang)}
</a>
```

(Match the exact markup of the neighboring `rail-item` anchors — if they include an icon/`<span class="lbl">`, mirror that structure.)

- [ ] **Step 4: Gate + dev-curl**

Run: `bun run check` then `bun run lint:src`
Expected: PASS (no new errors; page mounts one island).

Run `bun run dev`, then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/en/interview
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/ru/interview
curl -s http://localhost:4321/en/interview | grep -ci "interview\|question" | head
```
Expected: 200 each; page renders (the island hydrates client-side; SSR shows the loading fallback).

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/interview.astro src/i18n/ui.json src/components/atlas/TopNav.astro
git commit -m "feat(interview): /interview page + i18n + nav link"
```

---

## Final verification (after all tasks)

- [ ] `bun run test` — green incl. `interview-session.test.ts`.
- [ ] `bun run check` — no NEW errors in touched files.
- [ ] `bun run lint:src` — clean (hydration cap respected: interview page = 1 island).
- [ ] Manual: `/interview` runs a sequence of system-design questions; each shows the prompt + the GradeWithAi grader (LLM critique with a BYOK key, self-grade model answer without); self-assessment + Next advances; a "Struggled" answer is recorded (so it appears in `/review` and the P3 weak-spots block); the finish screen shows a readiness %.

## Self-Review notes (author)

- **Spec coverage:** session curation + readiness → Task 1; runner reusing the LLM grader + outcome→SRS/confidence wiring → Task 2; page + i18n + nav → Task 3. The approved P4 scope (interview loop reusing existing graded-practice infra) is mapped.
- **Scope honesty (deferred, YAGNI):** behavioral STAR / explain-to-staff task *types* are NOT added in v1 — the loop runs the existing graded system-design tasks. Per-task LLM verdict is advisory; the recorded outcome comes from the learner's self-assessment (robust to the no-key path). Both are noted for a later refinement. Session-level transcript persistence is out of scope (per-task outcomes already persist via `recordPracticeOutcome`).
- **Bundle note:** `InterviewRunner` imports `recordPracticeOutcome` from `path-io`, which self-initializes the client-side path engine — this is the established pattern (TodayFocus etc. already run it) and gives the bonus that interview outcomes immediately update effective-rating + weak-spots.
- **Type consistency:** `SessionItem`/`Outcome`/`PracticeEntryLite`/`buildSession`/`readinessScore` identical across module, test, runner, and page; `PracticeTaskData` imported type-only to keep `astro:content` out of the client bundle.
