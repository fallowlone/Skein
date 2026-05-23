# Practice Layer — design

**Date:** 2026-05-23
**Area:** `site/` (Astro 5 + Preact). New `practice` + `projects` content collections, a practice-section renderer, an in-browser sandbox runtime, a projects page, a `/practice` authoring command, and build-time lint rules.
**Status:** approved design, ready for plan

## Goal

Close the audited gap between *knowing* and *doing*. Today lesson interaction is recall-heavy: Quiz 509/599 (85%), RetrievalDrawer 389/599 (65%), but applied practice is thin — Practice 85/599 (14%), FadedExample 31/599 (5%), runnable sandbox 0. Add a modular practice layer giving each lesson 3–5 hands-on tasks (diagnose / fix / sandbox / incident / design / predict), plus a separate projects page of non-template build ideas. The layer must be data-driven so new tasks are added by dropping a file — no core edits.

## Scope

In scope:
- New content collection `practice` (one JSON file per lesson, both languages inside).
- New content collection `projects` + route `/[lang]/projects`.
- New islands: `PracticeSection.tsx` (orchestrator), `SqlSandbox.tsx` (PGlite), `JsSandbox.tsx` (QuickJS).
- Reuse existing widgets for non-runtime task types.
- Lesson page integration (render practice section after lesson body).
- New build-time lint rules in the existing lint pass; redirect the stale `i18n-parity.ts` from the dead `book/` dir to `lessons/`.
- New `/practice <track>/<unit>/<lesson>` authoring command (mirror of `/infographic`).
- Reference content: one fully-wired track section (`databases/03-execution-plans`) including ≥1 PGlite sandbox task and ≥1 incident task; plus a seeded projects page.

Out of scope:
- Mass authoring of tasks for all 519 ready lessons (that is ongoing P6 work via `/practice`, not this deliverable).
- Any server/backend execution. The site stays static (Cloudflare Pages).
- Runtime LLM grading. All grading is deterministic (blanks/exec) or self-assessed (reveal + rubric).
- Changing existing lesson MDX content or the lesson format.

## Current state (anchors)

- Content config: `site/src/content.config.ts` — collections `tracks` (file loader), `units` (file loader), `lessons` (glob loader). Helpers: `Lang`, `Status`, `Bi = z.object({en,ru})`, `Track = z.enum(TRACKS)`, `SlugRe = /^\d{2}-[a-z0-9-]+$/`.
- Tracks/types: `site/src/types/index.ts` exports `TRACKS` (19 tracks incl. `math`, `base-cs`, `algorithms` + 16 pillars) and `Bilingual`.
- Lesson IDs (glob): track-relative path, e.g. `en/databases/03-execution-plans/03-join-algorithms`.
- Lesson route: `site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro` — `getStaticPaths` over `lessons`, renders `<Lesson … lessonKey={`${track}/${unit}/${slug}`}>`.
- Lesson layout: `site/src/layouts/Lesson.astro` — body slot at line 129 (`<div class="lesson-content"><slot /></div>`); `ConnectedLessons` at 132; `NextLessonCard` at 143; localStorage "last lesson" script at 150–157.
- Existing pedagogy widgets (`site/src/components/pedagogy/`): `FadedExample.tsx`, `Quiz.astro`, `RetrievalDrawer.tsx`, `DesignPrompt.astro`, `DebugLog.astro`, `TraceScenario.astro`, `DragOrder.astro`, `NumberDrill.astro`, `TradeoffMatrix.astro`, `RFCQuiz.astro`, `Sandbox.tsx` (wrapper), and `sandboxes/` (`DBLeverSandbox.tsx`, `RequestBudgetSandbox.tsx` — parametric simulators, no code runtime, no deps).
- Lint: `site/src/lint/rules/` with `index.ts` aggregator, `lessons.ts` (foundations rules), `i18n-parity.ts` (currently walks `content/book` which is now empty — effectively a no-op), `hydration-budget.ts`, `exercise-components.ts`. Report at `site/dist/lint-report.json` (`{errors:[],warnings:[]}`).
- No runtime/sandbox deps installed (no pglite/quickjs/pyodide).

## Locked decisions (from brainstorming)

1. **Sandbox = hybrid.** Parametric simulators stay the default; add real in-browser runtimes (PGlite for SQL, QuickJS for JS) opt-in for tasks where execution pays. Both lazy-loaded islands, `client:visible`, code-split. Zero backend.
2. **Generative grading = mix per task.** Each task picks `blanks` (deterministic), `self` (reveal model answer + self-rate), or `exec` (run in sandbox, diff output).
3. **Data model = new content collection.** `practice` glob collection, Zod-validated, one file per lesson holding both languages, lint-enforced.
4. **Deliverable = spec + plan** (this doc + the plan that follows). Code is a later step.

## Design

### A. `practice` content collection

Loader + schema added to `site/src/content.config.ts`:

```ts
const practice = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/practice" }),
  schema: z.object({
    lessonKey: z.string(),                 // "<track>/<unit>/<lesson>", must match a lesson
    track: Track,
    tasks: z.array(PracticeTask).min(1).max(8),
  }),
});
```

File layout (one file per lesson, **both langs inside** → parity by construction):

```
src/content/practice/<track>/<unit>/<lesson>.json
e.g. src/content/practice/databases/03-execution-plans/03-join-algorithms.json
```

`PracticeTask` schema (discriminated union on `type`):

```ts
const BiText = z.object({ en: z.string().min(1), ru: z.string().min(1) }); // markdown allowed
const Difficulty = z.enum(["recall", "apply", "stretch"]);

const TaskBase = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),    // unique within file
  difficulty: Difficulty,
  estMin: z.number().int().positive(),
  title: BiText,
  prompt: BiText,
});

const DiagnoseTask = TaskBase.extend({
  type: z.literal("diagnose"),
  // markdown evidence (EXPLAIN output / log / code) shown read-only
  evidence: BiText.optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("blanks"), blanks: z.array(Blank).min(1) }),
    z.object({ mode: z.literal("self"),   model: BiText, rubric: z.array(BiText).min(1) }),
  ]),
});

const FixTask = TaskBase.extend({
  type: z.literal("fix"),
  starter: z.string().optional(),          // language-agnostic starter snippet
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
    z.object({ mode: z.literal("exec"), runtime: z.enum(["sql","js"]), setup: z.string().optional(), check: ExecCheck }),
  ]),
});

const SandboxTask = TaskBase.extend({
  type: z.literal("sandbox"),
  runtime: z.enum(["sql", "js", "parametric"]),
  setup: z.string().optional(),            // sql seed / js preamble
  expected: ExecCheck.optional(),          // optional success assertion
  // parametric tasks reference an existing component by name
  parametric: z.object({ component: z.string() }).optional(),
});

const IncidentTask = TaskBase.extend({
  type: z.literal("incident"),             // "уронил и поднял прод"
  steps: z.array(z.object({               // staged: triage -> root cause -> fix -> prevent
    label: BiText,                         // step heading
    prompt: BiText,                        // what learner must answer/do
    reveal: BiText,                        // model answer revealed after attempt
  })).min(3).max(6),
});

const DesignTask = TaskBase.extend({
  type: z.literal("design"),
  constraints: BiText,                     // schema/workload/SLA given
  rubric: z.array(BiText).min(2),          // self-grade checklist
  model: BiText,                           // a strong reference solution
});

const PredictTask = TaskBase.extend({
  type: z.literal("predict"),
  scenario: BiText,
  reveal: BiText,
});

const PracticeTask = z.discriminatedUnion("type", [
  DiagnoseTask, FixTask, SandboxTask, IncidentTask, DesignTask, PredictTask,
]);
```

Supporting shapes:

```ts
const Blank = z.object({
  id: z.string(),
  accept: z.array(z.string()).min(1),      // accepted answers (case-insensitive, trimmed)
  hint: BiText.optional(),
});
const ExecCheck = z.object({
  kind: z.enum(["stdout-equals", "stdout-contains", "rows-equal", "no-error"]),
  value: z.string().optional(),            // expected stdout / substring
});
```

Why one file per lesson with both langs: a single source guarantees EN/RU parity (a task cannot exist in one language only), keeps the `/practice` command writing one artifact, and makes the lint parity check trivial (each `BiText` must have non-empty `en` and `ru` — already enforced by `.min(1)`).

### B. Task type taxonomy (the 6 types)

| type | learner does | bridges | grading |
|---|---|---|---|
| `predict` | predict output/behavior before reveal | recall→understand | `self` (reveal) |
| `diagnose` | given symptom/EXPLAIN/log, name the cause | understand→apply | `blanks` or `self` |
| `fix` | write the fix (SQL/code/config) | apply (generative) | `self` or `exec` |
| `sandbox` | run real/parametric experiment | apply (hands-on) | `exec` |
| `incident` | staged "broke prod, recover it": triage→root cause→fix→prevent | apply→judgment | staged `reveal` + self |
| `design` | open-ended: given schema+workload, design it | judgment | `rubric` self-grade |

Authoring guidance (enforced softly by `/practice`, not lint): each lesson's 3–5 tasks should form a `recall → apply → stretch` ladder, with at least one generative (`fix`/`design`) or hands-on (`sandbox`/`incident`) task so the lesson is not purely recognition.

### C. Components

**Reuse (no new code):** `FadedExample` (backs `blanks` grading), `DesignPrompt` (backs `design`), `DebugLog` + `TraceScenario` (back `incident` step rendering), `DragOrder`/`NumberDrill` (optional within prompts), parametric simulators in `sandboxes/` (referenced by `sandbox` tasks with `runtime: "parametric"`).

**New islands (3):**

1. `site/src/components/pedagogy/PracticeSection.tsx` — orchestrator. Props: `{ lang, lessonKey, tasks }`. Renders a task list (collapsed cards, difficulty chip, estMin), dispatches per `type` to the right sub-renderer, and tracks per-task progress in localStorage key `atlas.practice.<lessonKey>` (`{ [taskId]: "seen"|"attempted"|"done" }`). Mirrors the existing localStorage pattern in `Lesson.astro:150-157` (guarded try/catch). The runtime sandbox sub-renderers are lazy-imported so their WASM is only fetched when a `sandbox`/`exec` task is opened.

2. `site/src/components/pedagogy/SqlSandbox.tsx` — PGlite (`@electric-sql/pglite`, WASM Postgres). On mount (`client:visible`): create an in-memory DB, run `setup` SQL (seed schema/rows), expose an editor + Run. Runs user SQL incl. `EXPLAIN`/`EXPLAIN ANALYZE`; renders result rows or error. For `exec` grading, applies `ExecCheck` against the result. WASM is code-split (dynamic `import()`), not in the main bundle.

3. `site/src/components/pedagogy/JsSandbox.tsx` — QuickJS (`quickjs-emscripten`). Sandboxed JS eval: run `setup` preamble + user code, capture stdout (override `console.log`), apply `ExecCheck`. Used for algorithms/base-cs. Also lazy/code-split.

Runtime selection: a `fix`/`sandbox` task with `runtime: "sql"` → `SqlSandbox`; `"js"` → `JsSandbox`; `sandbox` with `runtime: "parametric"` → render the named existing component via a small static registry in `PracticeSection` (`{ DBLeverSandbox, RequestBudgetSandbox }`) so the string→component map is explicit and tree-shakeable. A `parametric.component` not in the registry is a lint error (`practice-lessonkey` pass extends to component-name resolution).

### D. Hydration budget (the hard constraint)

Lesson pages cap at 5 islands today (`hydration-budget.ts`). The practice section must not blow that.

- `PracticeSection` itself is **one** island, mounted `client:visible` (below the fold).
- Sandbox sub-renderers (`SqlSandbox`/`JsSandbox`) are **lazy-imported inside** `PracticeSection` — they are not separate top-level islands and their WASM loads only on demand.
- Net: the practice layer adds **+1 island** to a lesson page.
- New lint rule `practice-sandbox-budget` asserts a lesson page has at most one `PracticeSection` and that practice never introduces eager (`client:load`) runtime islands. The lesson-body cap of 5 is unchanged; the practice island is counted separately and capped at 1.

### E. Lesson page integration

`site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`:
- After fetching `entry`, also `getCollection("practice")` and find the entry whose `lessonKey === `${track}/${unit}/${slug}``. Pass `practice={match?.data.tasks ?? null}` into `<Lesson>`.

`site/src/layouts/Lesson.astro`:
- Add `practice?: PracticeTask[] | null` to `Props`.
- Immediately after the lesson-content slot (`<div class="lesson-content"><slot /></div>`, ~line 129) and before `ConnectedLessons`, render:
  ```astro
  {practice && practice.length > 0 && (
    <PracticeSection client:visible lang={lang} lessonKey={lessonKey} tasks={practice} />
  )}
  ```
- No other layout change. Lessons without a practice file render exactly as today.

### F. Projects page

New collection in `content.config.ts`:

```ts
const projects = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/projects" }),
  schema: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: BiText,
    pitch: BiText,                          // why it is interesting / non-template
    tracks: z.array(Track).min(1),          // which tracks it exercises
    difficulty: z.enum(["starter", "intermediate", "advanced"]),
    estDays: z.number().int().positive(),
    skills: z.array(z.string()).min(1),
    deliverable: BiText,                     // what "done" looks like
    milestones: z.array(BiText).min(2),
    seniorStretch: z.array(BiText).min(1),   // how to push it to senior level
  }),
});
```

Files: `src/content/projects/<slug>.json`. Route: `src/pages/[lang]/projects.astro` — grid of project cards (reuse `Card`/`Pill` brand components), client-side filter by track + difficulty (one small island, `client:visible`). Each card expands to pitch, milestones, and the "make it senior" stretch list. Linked from the learn nav.

### G. Authoring command `/practice`

New command `.claude/commands/practice.md`, mirroring `/infographic`:

Input: `/practice <track>/<unit>/<lesson>` (e.g. `/practice databases/03-execution-plans/03-join-algorithms`).

Pipeline:
1. Read the target lesson MDX; extract `concepts`, `level`, failure modes, numbers.
2. Derive 3–5 tasks across types forming a recall→apply→stretch ladder; at least one generative or hands-on.
3. Author both languages in one `practice/<track>/<unit>/<lesson>.json` (use `i18n/glossary.json` for RU terms).
4. Run `bun run build`; confirm lint clean (practice rules) and the lesson page renders the section.
5. Stop (no commit unless asked).

Modularity: adding tasks = adding/editing one JSON file. No core or schema change needed for new task instances; only adding a brand-new *type* touches schema + `PracticeSection`.

### H. Lint rules (same build pass)

Add to `site/src/lint/rules/` and wire into `index.ts`:

- `practice-parity` (**error**): every `BiText` in every task has non-empty `en` and `ru`. (Schema already enforces `.min(1)`; this rule additionally flags whitespace-only and untranslated `en===ru` for prose-length fields.)
- `practice-count` (**warn → error, phased**): a `ready` lesson should have a practice file with 3–5 tasks. Starts as **warning** (519 lessons have none on day 1); flipped to error per-track as tasks land, tracked by a `PRACTICE_REQUIRED_TRACKS` allowlist in the rule.
- `practice-lessonkey` (**error**): every practice file's `lessonKey` resolves to an existing lesson (both langs); additionally, every `sandbox` task with `runtime: "parametric"` names a `component` present in the `PracticeSection` registry.
- `practice-sandbox-budget` (**error**): at most one `PracticeSection` per page; no eager runtime islands.
- Fix `i18n-parity.ts`: repoint from `content/book` to `content/lessons` so the existing parity guarantee actually runs (currently a silent no-op on the empty `book/` dir).

### I. Phasing

- **P1 — foundation:** `practice` collection + schema, `PracticeSection` (non-runtime types only), lesson-page wiring, lint rules in warn mode, `i18n-parity` fix.
- **P2 — non-runtime tasks + reference:** `diagnose`/`fix(self)`/`predict`/`design`/`incident` renderers; author the reference section `databases/03-execution-plans` (3–5 tasks/lesson incl. one `incident`).
- **P3 — runtime sandboxes:** `SqlSandbox` (PGlite) + `JsSandbox` (QuickJS); add ≥1 `sandbox`/`exec` task to the reference section; `exec` grading.
- **P4 — projects:** `projects` collection + `/[lang]/projects` page + 6–8 seed projects.
- **P5 — authoring:** `/practice` command.
- **P6 — fill (ongoing, out of this deliverable):** author tasks per lesson, flip `practice-count` to error per track.

### J. Modularity guarantees

- New task **instance** → drop/edit one JSON file. Nothing else.
- New **project** → drop one JSON file.
- New task **type** → extend the discriminated union + add one branch in `PracticeSection` + (if runtime) reuse an existing sandbox. Isolated, additive.
- Data and rendering are separated; the lesson MDX is never touched to add practice.

## Constraints / guardrails

- **Static only.** No backend. All execution is in-browser WASM (PGlite/QuickJS), code-split, lazy.
- **Hydration.** Practice adds at most +1 island per lesson (`client:visible`); WASM never in the main chunk.
- **Bilingual or nothing.** Every task and project field is `{en,ru}`; schema + lint enforce parity.
- **No regressions.** Lessons without a practice file render unchanged. `practice-count` ships as warning so the build stays green on day 1.
- **Deterministic build.** No network at build/runtime for grading. WASM assets are bundled vendor files.
- **Reuse first.** Non-runtime task types render through existing widgets; only the orchestrator + two sandboxes are new code.

## Acceptance criteria

1. `bun run build` in `site/` passes; `dist/lint-report.json` has no new **errors** (practice-count warnings allowed in P1–P5); page count increases only by the new projects pages.
2. `practice` collection validates; a lesson with a practice file renders a `PracticeSection` after the lesson body; a lesson without one is unchanged.
3. Reference section `databases/03-execution-plans` has 3–5 tasks on each lesson, including ≥1 `incident` and ≥1 runtime `sandbox` (PGlite) task that actually runs `EXPLAIN` in-browser and applies its `ExecCheck`.
4. `/[lang]/projects` renders ≥6 projects in both EN and RU with working track/difficulty filter.
5. Hydration: each lesson page has exactly one practice island (`client:visible`); WASM is in a separate chunk (verified in `dist/` output), not the main bundle.
6. EN/RU parity holds for all practice files and projects (lint green on parity).
7. `i18n-parity` lint now scans `lessons/` (not the dead `book/`).
8. `/practice <track>/<unit>/<lesson>` produces a valid, lint-clean practice file for an arbitrary ready lesson.

## Verification

- Build + lint (above).
- Browser check at `/en/learn/databases/03-execution-plans/03-join-algorithms/` and its RU twin: open each task type, run the SQL sandbox (`EXPLAIN` returns a plan), step through the incident task, confirm self-grade reveals and blank checks work, confirm progress persists across reload.
- `/en/projects` and `/ru/projects`: filter by track/difficulty, expand a card.
- Confirm a practice-less lesson (e.g. any `math` lesson) renders identically to before.
- Inspect `dist/` to confirm PGlite/QuickJS WASM is code-split.
