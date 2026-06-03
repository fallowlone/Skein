# AWS & Python tracks, Projects hub, repo cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AWS track and a Python track (tiered, pilot-sized), enrich the existing Projects hub with categories + per-project detail pages + new frontend/backend briefs, and delete junk scripts from the repo root.

**Architecture:** Four independent phases on branch `aws-python-projects-cleanup`. Phase 0 (cleanup) and Phase 1 (projects hub) are code/tooling with real unit tests (TDD). Phases 2–3 (the two tracks) wire the track into 5 locations, scaffold stubs with a one-shot script, then author each lesson to `status: ready` via the existing `/infographic` lesson pipeline (research → EN → RU + practice + diagram + sources). Each phase ends green (`cd site && bun run build`, 0 lint warnings) and is independently committable/mergeable.

**Tech Stack:** Astro 5 + Preact + Tailwind, Zod content schemas (`astro:content`), Vitest, Node ESM scripts, bun.

**Spec:** `docs/superpowers/specs/2026-06-03-aws-python-tracks-projects-hub-cleanup-design.md`

**Reference facts (verified in codebase):**
- New track must patch **5 locations**: `site/src/types/index.ts` (`Track` union + `TRACKS`), `site/src/components/atlas/track-band.ts` (`TRACK_BAND`, exhaustive `Record<Track,Band>`), `site/src/scripts/track-meta.ts` (`TRACK_ABBR`, exhaustive `Record<Track,string>`), `site/src/content/tracks.json`, `site/src/content/units.json`.
- `tracks.json` `color` is a fixed enum reused across tracks: `"lilac" | "mint" | "peach" | "sky" | "rose"` — pick any, not unique.
- Max existing track `order` = 24. New: `aws`=25, `python`=26.
- Scaffolder pattern: `site/scripts/scaffold-tracks.mjs` (SPEC-driven, idempotent; writes tracks.json + units.json + EN/RU stub MDX).
- Build = `astro build` + the lint integration (`site/src/lint/`). It does **not** run `astro check`, but `bun run test` (Vitest) does cover the exhaustive-Record tests — run it.

---

## Phase 0 — Repo cleanup (WS3)

**Files:**
- Delete: 54 root `*.py` (`debug*.py`, `fix_frontmatter*.py`, `test_*.py`), `site/src/content/units.json.bak`, `test_sources_before_after.mdx`, `awesome-everything.*.log`, `site/_flow.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Prove the root scripts are unreferenced**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
# List the deletion candidates (tracked .py in root + stray files)
git ls-files --full-name . | grep -E '^[^/]+\.py$' > /tmp/py_candidates.txt
wc -l /tmp/py_candidates.txt
# For each candidate, search the repo (excluding the file itself) for any import/reference
while read -r f; do
  base="${f%.py}"
  hits=$(grep -RInE "(import +${base}\b|from +${base} +import|['\"]\./${f}['\"]|\b${f}\b)" \
      --exclude-dir=.git --exclude-dir=node_modules --exclude="${f}" . | grep -v '^/tmp' | wc -l)
  echo "$hits  $f"
done < /tmp/py_candidates.txt | sort -n
```
Expected: every line shows `0  <file>` (zero references). If any file shows non-zero, **remove it from the deletion set** and report it. These are one-off frontmatter fixers / scratch debug scripts.

- [ ] **Step 2: Confirm the non-`.py` strays are scratch**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
grep -RIn "units.json.bak\|test_sources_before_after\|_flow.mjs" --exclude-dir=.git --exclude-dir=node_modules . | grep -v '^Binary'
head -5 site/_flow.mjs 2>/dev/null; echo "---"; cat test_sources_before_after.mdx 2>/dev/null
```
Expected: no source file references these; `site/_flow.mjs` and `test_sources_before_after.mdx` are scratch. If `site/_flow.mjs` looks load-bearing, keep it and report.

- [ ] **Step 3: Delete the junk**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything
git rm -q $(git ls-files --full-name . | grep -E '^[^/]+\.py$')
git rm -q site/src/content/units.json.bak test_sources_before_after.mdx
rm -f awesome-everything.*.log site/_flow.mjs
git status --short
```
Expected: deletions of all root `.py`, the `.bak`, the scratch mdx; `awesome-everything.*.log` already gitignored (working-tree removed); `site/_flow.mjs` untracked + removed.

- [ ] **Step 4: Guard against regressions in `.gitignore`**

Add to `.gitignore` (under the Python section):
```gitignore
# Ad-hoc one-off scripts must live in scripts/, never the repo root
/debug*.py
/fix_*.py
/test_*.py
/*.log
```

- [ ] **Step 5: Verify build still green**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build 2>&1 | tail -20
```
Expected: build completes, lint report clean (0 errors). Page count unchanged from before cleanup.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add -A
git commit -m "chore: remove root junk scripts and scratch files

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Enrich the Projects hub (WS4)

Approach A: one hub. Extend the `projects` schema, add a category axis to the filter, add per-project detail pages, backfill existing projects, author new FE/BE briefs.

### Task 1.1 — Extend the project schema

**Files:**
- Modify: `site/src/content.config.ts:181-192`
- Test: `site/src/content/projects-schema.test.ts`

- [ ] **Step 1: Write the failing test** — append to `projects-schema.test.ts` (and add `category`/`stack`/`brief` to the `valid` fixture object near the top):

```ts
// extend the existing `valid` fixture:
//   category: "backend", stack: ["node"], brief: bi,
test("accepts the new category/stack/brief fields", () => {
  expect(() => ProjectSchema.parse({ ...valid, category: "frontend", stack: ["preact"], brief: bi })).not.toThrow();
});
test("requires category", () => {
  const { category, ...noCat } = valid as any;
  expect(() => ProjectSchema.parse(noCat)).toThrow();
});
test("rejects an unknown category", () => {
  expect(() => ProjectSchema.parse({ ...valid, category: "mobile" })).toThrow();
});
test("allows omitting optional stack/brief", () => {
  const { stack, brief, ...lean } = valid as any;
  expect(() => ProjectSchema.parse(lean)).not.toThrow();
});
```
Also mirror the new fields in the test file's local `ProjectSchema` copy (it is a hand-mirror of content.config.ts — keep both in sync):
```ts
  category: z.enum(["frontend", "backend", "fullstack", "infra"]),
  stack: z.array(z.string()).optional(),
  resources: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
  brief: BiText.optional(),
```

- [ ] **Step 2: Run test, expect fail**

Run: `cd site && bun run test src/content/projects-schema.test.ts`
Expected: FAIL (real schema lacks `category`).

- [ ] **Step 3: Add the fields to the real schema** — `site/src/content.config.ts`, inside `ProjectSchema` (after `seniorStretch`):

```ts
const ProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: BiText,
  pitch: BiText,
  deliverable: BiText,
  tracks: z.array(Track).min(1),
  category: z.enum(["frontend", "backend", "fullstack", "infra"]),
  difficulty: z.enum(["starter", "intermediate", "advanced"]),
  estDays: z.number().int().positive(),
  skills: z.array(z.string()).min(1),
  stack: z.array(z.string()).optional(),
  resources: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
  milestones: z.array(BiText).min(2),
  seniorStretch: z.array(BiText).min(1),
  brief: BiText.optional(),
});
```

- [ ] **Step 4: Run test, expect pass**

Run: `cd site && bun run test src/content/projects-schema.test.ts`
Expected: PASS. (Build will now FAIL until 1.2 backfills `category` on the 6 existing projects — that is the next task.)

### Task 1.2 — Backfill `category` on existing projects

**Files:** Modify all 6 `site/src/content/projects/*.json`

- [ ] **Step 1: Add `category` to each** (place after `"tracks"`):
```
at-least-once-queue.json   → "category": "infra",
cache-stampede-lab.json    → "category": "backend",
oauth-mini.json            → "category": "backend",
query-plan-visualizer.json → "category": "backend",
rate-limiter.json          → "category": "backend",
write-ahead-log.json       → "category": "infra",
```

- [ ] **Step 2: Verify content collection parses**

Run: `cd site && bun run build 2>&1 | tail -15`
Expected: build succeeds (all projects now satisfy the required `category`).

### Task 1.3 — Add the category axis to the filter

**Files:**
- Modify: `site/src/components/projects/ProjectsFilter.tsx`
- Test: Create `site/src/components/projects/ProjectsFilter.test.ts`

- [ ] **Step 1: Write the failing test** — `ProjectsFilter.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { filterProjects } from "./ProjectsFilter";

const p = (slug: string, category: string, difficulty = "intermediate") =>
  ({ slug, category, difficulty, tracks: ["frontend"] }) as any;
const all = [p("a", "frontend"), p("b", "backend"), p("c", "infra")];

describe("filterProjects", () => {
  test("returns all when every axis is 'all'", () => {
    expect(filterProjects(all, "all", "all", "all")).toHaveLength(3);
  });
  test("filters by category", () => {
    expect(filterProjects(all, "all", "all", "frontend").map((x) => x.slug)).toEqual(["a"]);
  });
  test("combines category and difficulty", () => {
    expect(filterProjects(all, "all", "intermediate", "backend").map((x) => x.slug)).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

Run: `cd site && bun run test src/components/projects/ProjectsFilter.test.ts`
Expected: FAIL (`filterProjects` takes 3 args, not 4).

- [ ] **Step 3: Update `filterProjects` + component** — replace lines 7–11 and add the category select. New `filterProjects`:

```ts
export function filterProjects(
  projects: ProjectData[],
  track: string,
  difficulty: string,
  category: string,
): ProjectData[] {
  return projects.filter(
    (p) =>
      (track === "all" || p.tracks.includes(track)) &&
      (difficulty === "all" || p.difficulty === difficulty) &&
      (category === "all" || p.category === category),
  );
}
```
In the component body add state + call + a select, and link each card to the detail page. Add near the other `useState`:
```tsx
  const [category, setCategory] = useState("all");
  const shown = filterProjects(projects, track, difficulty, category);
```
Add this select before the track select (inside the filter row `div`):
```tsx
        <select class="text-sm border border-rule rounded-[var(--r-sm)] px-2 py-1 bg-card" value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All categories", "Все категории")}</option>
          {[["frontend","Frontend"],["backend","Backend"],["fullstack","Fullstack"],["infra","Infra"]].map(([v,l]) => <option value={v} key={v}>{l}</option>)}
        </select>
```
In each card, replace the inline `Details` button with a link to the detail page (keep the title/pitch/tracks markup):
```tsx
            <a href={`/${lang}/projects/${p.slug}`} class="text-sm text-ok font-semibold">{tt(lang, "Open project →", "Открыть проект →")}</a>
```
Remove the now-unused `open`/`setOpen` state and the inline expand block.

- [ ] **Step 4: Run test, expect pass**

Run: `cd site && bun run test src/components/projects/ProjectsFilter.test.ts`
Expected: PASS.

### Task 1.4 — Per-project detail page

**Files:** Create `site/src/pages/[lang]/projects/[slug].astro`

- [ ] **Step 1: Create the route** (mirrors the i18n-by-prop style of `ProjectBrief.astro` and the `getStaticPaths` of `projects.astro`):

```astro
---
import Atlas from "~/layouts/Atlas.astro";
import { getCollection } from "astro:content";
import { isLocale, type Locale } from "~/i18n";

export async function getStaticPaths() {
  const projects = await getCollection("projects");
  const langs: Locale[] = ["en", "ru"];
  return langs.flatMap((lang) =>
    projects.map((p) => ({ params: { lang, slug: p.data.slug }, props: { project: p.data } })),
  );
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error(`Unknown locale: ${lang}`);
const { project: p } = Astro.props;
const tt = (en: string, ru: string) => (lang === "ru" ? ru : en);

const L = {
  back: tt("All projects", "Все проекты"),
  category: tt("Category", "Категория"),
  deliverable: tt("Deliverable", "Результат"),
  skills: tt("Skills", "Навыки"),
  stack: tt("Suggested stack", "Рекомендуемый стек"),
  milestones: tt("Milestones", "Этапы"),
  stretch: tt("Make it senior", "Сделай по-сеньорски"),
  resources: tt("Resources", "Материалы"),
};
---
<Atlas title={tt(p.title.en, p.title.ru)} lang={lang}>
  <div class="oa-wrap" style="padding-bottom: var(--s-9);">
    <a href={`/${lang}/projects`} class="text-sm text-muted">← {L.back}</a>
    <header class="oa-pagehead mt-2">
      <p class="kicker">{p.category} · {p.difficulty} · {p.estDays}d</p>
      <h1>{tt(p.title.en, p.title.ru)}</h1>
      <p class="ph-blurb">{tt(p.pitch.en, p.pitch.ru)}</p>
    </header>

    {p.brief && <section class="prose-block my-6">{tt(p.brief.en, p.brief.ru)}</section>}

    <section class="my-6">
      <h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-1">{L.deliverable}</h2>
      <p>{tt(p.deliverable.en, p.deliverable.ru)}</p>
    </section>

    <section class="my-6">
      <h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-2">{L.milestones}</h2>
      <ol class="list-decimal pl-5 space-y-1">{p.milestones.map((m) => <li>{tt(m.en, m.ru)}</li>)}</ol>
    </section>

    <section class="my-6">
      <h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-2">{L.stretch}</h2>
      <ul class="list-disc pl-5 space-y-1">{p.seniorStretch.map((s) => <li>{tt(s.en, s.ru)}</li>)}</ul>
    </section>

    <section class="my-6 flex flex-wrap gap-2">
      <div class="w-full"><h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-1">{L.skills}</h2></div>
      {p.skills.map((s) => <span class="text-[11px] font-mono px-2 py-0.5 rounded-full border border-rule text-muted">{s}</span>)}
    </section>

    {p.stack && <section class="my-6 flex flex-wrap gap-2">
      <div class="w-full"><h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-1">{L.stack}</h2></div>
      {p.stack.map((s) => <span class="text-[11px] font-mono px-2 py-0.5 rounded-full border border-rule text-muted">{s}</span>)}
    </section>}

    {p.resources && <section class="my-6">
      <h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-2">{L.resources}</h2>
      <ul class="list-disc pl-5 space-y-1">{p.resources.map((r) => <li><a class="text-ok" href={r.url}>{r.label}</a></li>)}</ul>
    </section>}
  </div>
</Atlas>
```

- [ ] **Step 2: Build + verify the route renders both locales**

Run:
```bash
cd site && bun run build 2>&1 | tail -15
ls dist/en/projects/ dist/ru/projects/ 2>/dev/null | head
```
Expected: build green; `dist/{en,ru}/projects/<slug>/index.html` exist for every project (e.g. `oauth-mini`).

### Task 1.5 — Author new FE/BE project briefs

**Files:** Create `site/src/content/projects/*.json` (one per project)

- [ ] **Step 1: Add a frontend exemplar** — `site/src/content/projects/collab-cursors.json`:

```json
{
  "slug": "collab-cursors",
  "title": { "en": "Collaborative cursors", "ru": "Совместные курсоры" },
  "pitch": { "en": "Show every connected user's live cursor and selection in a shared document, conflict-free, over WebSocket.", "ru": "Показать живой курсор и выделение каждого подключённого пользователя в общем документе, без конфликтов, через WebSocket." },
  "deliverable": { "en": "A page where two browser tabs see each other's cursors move in real time with names and colors, surviving reconnects.", "ru": "Страница, где две вкладки видят движение курсоров друг друга в реальном времени с именами и цветами, переживая переподключения." },
  "tracks": ["frontend", "distributed"],
  "category": "frontend",
  "difficulty": "intermediate",
  "estDays": 4,
  "skills": ["WebSocket", "presence protocol", "CRDT basics", "throttling / interpolation"],
  "stack": ["preact", "ws", "yjs"],
  "milestones": [
    { "en": "Broadcast cursor position over a WebSocket and render remote cursors.", "ru": "Транслируй позицию курсора через WebSocket и отрисуй удалённые курсоры." },
    { "en": "Add presence (join/leave, name, color) and clean up on disconnect.", "ru": "Добавь presence (вход/выход, имя, цвет) и очистку при отключении." }
  ],
  "seniorStretch": [
    { "en": "Interpolate remote cursor motion and throttle outgoing updates to a fixed rate.", "ru": "Интерполируй движение удалённого курсора и троттли исходящие апдейты до фиксированной частоты." },
    { "en": "Make shared text edits conflict-free with a CRDT (Yjs) and prove convergence across tabs.", "ru": "Сделай совместное редактирование текста без конфликтов через CRDT (Yjs) и докажи сходимость между вкладками." }
  ]
}
```

- [ ] **Step 2: Add a backend exemplar** — `site/src/content/projects/feature-flags-service.json`:

```json
{
  "slug": "feature-flags-service",
  "title": { "en": "Feature-flag service", "ru": "Сервис фич-флагов" },
  "pitch": { "en": "Build a small flag service with targeting rules, percentage rollouts, and a typed SDK that evaluates flags client-side from a cached ruleset.", "ru": "Собери небольшой сервис флагов с правилами таргетинга, процентными раскатками и типизированным SDK, который вычисляет флаги на клиенте из закешированного набора правил." },
  "deliverable": { "en": "An API that serves a flag ruleset and an SDK where flagOn('x', user) returns a deterministic, percentage-correct boolean.", "ru": "API, отдающее набор правил флагов, и SDK, где flagOn('x', user) возвращает детерминированный, процентно-корректный boolean." },
  "tracks": ["backend", "apis"],
  "category": "backend",
  "difficulty": "intermediate",
  "estDays": 5,
  "skills": ["rule evaluation", "consistent hashing for rollouts", "caching + ETag", "typed SDK design"],
  "stack": ["node", "hono", "zod"],
  "milestones": [
    { "en": "Model flags + rules and serve them over a cached, ETag'd endpoint.", "ru": "Смоделируй флаги + правила и отдай их через закешированный эндпоинт с ETag." },
    { "en": "Implement deterministic percentage rollout via hashing user id + flag key.", "ru": "Реализуй детерминированную процентную раскатку через хеш id пользователя + ключа флага." }
  ],
  "seniorStretch": [
    { "en": "Add a streaming update channel (SSE) so SDKs refresh without polling.", "ru": "Добавь стриминговый канал обновлений (SSE), чтобы SDK обновлялись без поллинга." },
    { "en": "Prove rollout stability: a user never flickers between on/off as unrelated flags change.", "ru": "Докажи стабильность раскатки: пользователь не мерцает между on/off при изменении несвязанных флагов." }
  ]
}
```

- [ ] **Step 3: Author the remaining briefs** — create one JSON per row below, following the schema and the two exemplars exactly (bilingual EN+RU, `milestones` ≥2, `seniorStretch` ≥1, valid `tracks` from the TRACKS enum). Keep each genuinely interesting and learning-first (not landing/todo/shop):

| slug | category | tracks | difficulty | one-line pitch |
|---|---|---|---|---|
| `virtual-data-grid` | frontend | frontend, performance | advanced | Render & scroll 100k rows at 60fps with windowing + sticky headers + keyboard nav |
| `offline-pwa-sync` | frontend | frontend, browser | advanced | Offline-first notes PWA with a sync queue and last-writer-wins conflict resolution |
| `signals-mini` | frontend | frontend | intermediate | Build a ~100-line reactive signals library (signal/computed/effect) with glitch-free updates |
| `command-palette` | frontend | frontend | intermediate | A ⌘K command palette with fuzzy ranking, async actions, and full keyboard control |
| `presigned-upload` | backend | backend, apis, security | intermediate | Direct-to-storage uploads via presigned URLs with size/type limits and a completion webhook |
| `job-scheduler` | backend | backend, queues | advanced | A cron + backoff job runner with at-least-once delivery and idempotent handlers |

- [ ] **Step 4: Build + verify all projects + detail pages**

Run:
```bash
cd site && bun run build 2>&1 | tail -15
ls dist/en/projects/ | wc -l   # expect 14 (6 existing + 8 new)
```
Expected: build green, 0 lint warnings, 14 project detail pages per locale.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add -A
git commit -m "feat(projects): category axis, detail pages, FE/BE briefs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — AWS track pilot (WS1)

`aws`, band `advanced`, color `rose`, order 25. Pilot units: `00-start-here`, `01-core-model`, `02-compute-and-deploy`. Lessons tiered (middle+), cert-tagged (CLF-C02 / SAA-C03).

### Task 2.1 — Patch the 3 shared TS Records (TDD)

**Files:**
- Modify: `site/src/types/index.ts:21-38`, `site/src/components/atlas/track-band.ts`, `site/src/scripts/track-meta.ts`
- Test: existing `site/src/components/atlas/track-band.test.ts`, `site/src/scripts/track-meta.test.ts`

- [ ] **Step 1: Run the Record-completeness tests to see current state**

Run: `cd site && bun run test track-band track-meta`
Expected: PASS now (Records complete for current `TRACKS`). After Step 2 adds `aws`/`python` to `TRACKS` but not yet to the Records, these must FAIL — that is the guard.

- [ ] **Step 2: Add both new slugs to the `Track` union and `TRACKS`** — `site/src/types/index.ts`:

```ts
export type Track =
  | "math" | "base-cs" | "algorithms"
  | "networking" | "browser" | "frontend" | "backend"
  | "apis" | "databases" | "caching" | "queues"
  | "distributed" | "security" | "observability" | "deployment"
  | "performance" | "data-engineering" | "ai-llm" | "engineering-practice"
  | "sql-postgres" | "js-engine" | "typescript"
  | "system-design" | "system-design-cases"
  | "aws" | "python";

export const TRACKS: Track[] = [
  "math", "base-cs", "algorithms",
  "networking", "browser", "frontend", "backend",
  "apis", "databases", "caching", "queues",
  "distributed", "security", "observability", "deployment",
  "performance", "data-engineering", "ai-llm", "engineering-practice",
  "sql-postgres", "js-engine", "typescript",
  "system-design", "system-design-cases",
  "aws", "python",
];
```

- [ ] **Step 3: Run Record tests, expect FAIL**

Run: `cd site && bun run test track-band track-meta`
Expected: FAIL / type error — `TRACK_BAND` and `TRACK_ABBR` are missing `aws`/`python` keys.

- [ ] **Step 4: Add `TRACK_BAND` entries** — `site/src/components/atlas/track-band.ts`, inside `TRACK_BAND` (add `python` to the surface group, `aws` to the advanced group):

```ts
  // deep language/engine dives — sit with their day-to-day siblings
  "sql-postgres":       "surface",
  "js-engine":          "surface",
  "typescript":         "surface",
  "python":             "surface",
```
```ts
  "engineering-practice": "advanced",
  "system-design-cases":  "advanced",
  "aws":                  "advanced",
```

- [ ] **Step 5: Add `TRACK_ABBR` entries** — `site/src/scripts/track-meta.ts`, inside `TRACK_ABBR`:

```ts
  "sql-postgres": "SQL", "js-engine": "JSE", "typescript": "TS",
  "aws": "AWS", "python": "PY",
```
(If `system-design`/`system-design-cases` are also missing from this Record, add `"system-design": "SD", "system-design-cases": "SDC"` to keep the exhaustive `Record<Track,string>` valid.)

- [ ] **Step 6: Run Record tests, expect PASS**

Run: `cd site && bun run test track-band track-meta`
Expected: PASS.

- [ ] **Step 7: Commit the wiring**

```bash
cd /Users/artemmac/dev/awesome-everything
git add -A && git commit -m "feat(tracks): register aws + python in Track records

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 2.2 — Scaffold the AWS + Python stubs

**Files:** Create `site/scripts/scaffold-aws-python.mjs` (copy of `scaffold-tracks.mjs` with a new SPEC)

- [ ] **Step 1: Create the scaffolder** — copy `site/scripts/scaffold-tracks.mjs` to `site/scripts/scaffold-aws-python.mjs` and replace the `SPEC` array with:

```js
const SPEC = [
  {
    slug: "aws", order: 25, color: "rose",
    title: { en: "AWS, hands-on", ru: "AWS на практике" },
    blurb: {
      en: "Deploy real systems on AWS — the core model, compute, storage and networking — mapped to the CLF-C02 and SAA-C03 objectives.",
      ru: "Разворачивай реальные системы на AWS — базовая модель, вычисления, хранилище и сеть — с привязкой к целям CLF-C02 и SAA-C03.",
    },
    src: "https://docs.aws.amazon.com/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "What AWS actually is, and the handful of words the rest of the track assumes.", ru: "Что такое AWS на самом деле и горстка слов, которые остальной трек считает знакомыми." },
        lessons: [["01-what-aws-is","What AWS actually is"]] },
      { slug: "01-core-model", order: 1, title: { en: "The core model", ru: "Базовая модель" },
        crux: { en: "Regions, IAM and billing — the three things every AWS decision touches.", ru: "Регионы, IAM и биллинг — три вещи, которых касается любое решение в AWS." },
        lessons: [["01-regions-and-az","Regions and availability zones"],["02-iam-and-shared-responsibility","IAM and the shared-responsibility model"],["03-billing-and-cost","Billing and cost basics"]] },
      { slug: "02-compute-and-deploy", order: 2, title: { en: "Compute & deploy", ru: "Вычисления и деплой" },
        crux: { en: "EC2 vs containers vs serverless — and shipping a container end to end.", ru: "EC2 против контейнеров против serverless — и доставка контейнера от начала до конца." },
        lessons: [["01-compute-options","Compute options: EC2, ECS/Fargate, Lambda, App Runner"],["02-deploy-a-container","Deploy a container end to end"]] },
    ],
  },
  {
    slug: "python", order: 26, color: "sky",
    title: { en: "Python for JS/TS developers", ru: "Python для JS/TS-разработчиков" },
    blurb: {
      en: "Learn Python coming from JavaScript — language core, scripting and automation, with an eye toward AI tooling.",
      ru: "Освой Python, придя из JavaScript — ядро языка, скриптинг и автоматизация, с прицелом на AI-инструменты.",
    },
    src: "https://docs.python.org/3/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "Why a JS/TS developer should add Python, and where it differs.", ru: "Зачем JS/TS-разработчику добавлять Python и чем он отличается." },
        lessons: [["01-why-python-for-js-devs","Why Python for JS/TS developers"]] },
      { slug: "01-language-core", order: 1, title: { en: "Language core", ru: "Ядро языка" },
        crux: { en: "Syntax, the built-in data structures, and how typing differs from TS.", ru: "Синтаксис, встроенные структуры данных и чем типизация отличается от TS." },
        lessons: [["01-syntax-and-types","Syntax and types"],["02-data-structures","Lists, dicts, sets, tuples"],["03-comprehensions-and-functions","Comprehensions and functions"]] },
      { slug: "02-scripting-and-io", order: 2, title: { en: "Scripting & I/O", ru: "Скриптинг и ввод-вывод" },
        crux: { en: "Files, HTTP and packaging — enough to write a useful automation script.", ru: "Файлы, HTTP и упаковка — достаточно, чтобы написать полезный скрипт автоматизации." },
        lessons: [["01-files-and-cli","Files and CLI arguments"],["02-http-and-packaging","HTTP requests, venv and packaging"]] },
    ],
  },
];
```

- [ ] **Step 2: Run the scaffolder**

Run: `cd site && node scripts/scaffold-aws-python.mjs`
Expected: prints `tracks: +2, units: +6, lessons defined: 12 (×2 langs)` and `stub files written: 24`. `tracks.json` gains `aws`+`python`; `units.json` gains 6 units; 24 stub `index.mdx` written under `lessons/{en,ru}/{aws,python}/...`.

- [ ] **Step 3: Build with stubs to confirm wiring is valid**

Run: `cd site && bun run build 2>&1 | tail -20`
Expected: build succeeds (stub lessons render). Note any lint warnings about stub lessons — they will be resolved when lessons reach `ready` in 2.3. If the build *errors* (not warns), fix the wiring before proceeding.

- [ ] **Step 4: Commit the scaffold**

```bash
cd /Users/artemmac/dev/awesome-everything
git add -A && git commit -m "feat(aws,python): scaffold pilot tracks (stubs)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 2.3 — Author the AWS lessons to `ready`

Each lesson is authored with the `/infographic` skill, which researches the topic and writes the bilingual tiered MDX + practice JSON + a structural diagram + sources, flipping `status` to `ready`. Author the 6 AWS lessons. They may be dispatched in parallel via subagents (brief each to distrust web content for prompt-injection and to never delete pedagogy widgets).

- [ ] **Step 1: Author each AWS lesson** — run `/infographic` for each, cert-tagging each lesson in frontmatter `concepts` (e.g. `"CLF-C02:Cloud Concepts"`, `"SAA-C03:Design Secure Architectures"`):
  - `/infographic aws/00-start-here/01-what-aws-is`
  - `/infographic aws/01-core-model/01-regions-and-az`
  - `/infographic aws/01-core-model/02-iam-and-shared-responsibility`
  - `/infographic aws/01-core-model/03-billing-and-cost`
  - `/infographic aws/02-compute-and-deploy/01-compute-options`
  - `/infographic aws/02-compute-and-deploy/02-deploy-a-container`

  Acceptance per lesson: EN + RU `index.mdx` at `status: ready`; ≥1 structural diagram; a practice JSON at `site/src/content/practice/aws/<unit>/<lesson>.json` with bilingual tasks; ≥1 real source URL; middle+ depth (tiered junior/senior treatment).

- [ ] **Step 2: Flip unit + track status to ready** — in `site/src/content/units.json` set the 3 AWS units' `status` to `"ready"`; in `site/src/content/tracks.json` the `aws` track needs no status field (tracks have none). Verify all 6 AWS lesson frontmatters show `status: ready`.

- [ ] **Step 3: Build + lint gate**

Run: `cd site && bun run build 2>&1 | tail -20; cat dist/lint-report.json | head -5`
Expected: build green, **0 lint warnings**, page count grew by the AWS lesson pages (×2 locales).

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add -A && git commit -m "content(aws): pilot tracks 00-02 EN+RU ready

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Python track pilot (WS2)

`python` is already registered (Task 2.1) and scaffolded (Task 2.2). This phase only authors its lessons.

### Task 3.1 — Author the Python lessons to `ready`

- [ ] **Step 1: Author each Python lesson** via `/infographic` (tiered; junior tier gentle for a from-zero reader, senior tier covers idioms; contrast with JS/TS where useful; thread the AI/scripting angle):
  - `/infographic python/00-start-here/01-why-python-for-js-devs`
  - `/infographic python/01-language-core/01-syntax-and-types`
  - `/infographic python/01-language-core/02-data-structures`
  - `/infographic python/01-language-core/03-comprehensions-and-functions`
  - `/infographic python/02-scripting-and-io/01-files-and-cli`
  - `/infographic python/02-scripting-and-io/02-http-and-packaging`

  Acceptance per lesson: same bar as 2.3 (EN+RU ready, ≥1 diagram, practice JSON under `site/src/content/practice/python/...`, ≥1 source, middle+ depth).

- [ ] **Step 2: Flip unit status to ready** — set the 3 Python units' `status` to `"ready"` in `units.json`; verify all 6 lesson frontmatters are `ready`.

- [ ] **Step 3: Build + lint gate**

Run: `cd site && bun run build 2>&1 | tail -20`
Expected: build green, **0 lint warnings**, page count grew by the Python lesson pages (×2 locales).

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add -A && git commit -m "content(python): pilot tracks 00-02 EN+RU ready

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Full build + test sweep**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site
bun run test 2>&1 | tail -15
bun run build 2>&1 | tail -20
```
Expected: all Vitest suites pass (incl. `projects-schema`, `ProjectsFilter`, `track-band`, `track-meta`); build green; `dist/lint-report.json` shows 0 errors / 0 warnings.

- [ ] **Spot-check the new surfaces** — confirm these exist in `dist/`:
  - `dist/{en,ru}/projects/index.html` (hub with category filter)
  - `dist/{en,ru}/projects/collab-cursors/index.html` (a detail page)
  - `dist/{en,ru}/learn/aws/...` and `.../python/...` lesson pages (route per `/learn/<track>/<lesson>`)
  - `aws` + `python` cards appear on the home page in the `advanced` and `surface` bands respectively.

---

## Self-review notes (spec coverage)

- WS3 cleanup → Phase 0 ✓ (grep-guarded deletion, .gitignore guard).
- WS4 Approach A → Phase 1 ✓ (schema `category`/`stack`/`resources`/`brief`, filter axis, detail route, backfill, 8 new briefs).
- WS1 AWS pilot → Phase 2 ✓ (5-place wiring, scaffold, 6 lessons cert-tagged).
- WS2 Python pilot → Phase 3 ✓ (authoring; wiring shared with Phase 2).
- Cross-cutting gates (build green, 0 warnings, EN+RU parity, no widget deletion) → enforced per-phase + final sweep ✓.
- Out-of-scope items (README/CI/Dockerfile, full course completion, German) correctly absent.

**Known deferred-to-execution detail:** lesson prose is generated by `/infographic` (the repo's documented lesson-authoring command), not pre-written here — by design, since lessons are research-based bilingual content. The scaffold SPEC, the 5-place wiring, schema/filter/route code, and per-lesson acceptance criteria are fully specified.
