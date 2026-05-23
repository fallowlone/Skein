# Practice Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modular, data-driven practice layer (6 task types + projects page + 2 in-browser runtimes) so every lesson can carry 3–5 hands-on tasks, added by dropping one JSON file.

**Architecture:** A new `practice` content collection (one JSON per lesson, both languages inside) is rendered by a single `PracticeSection` island mounted after the lesson body. Non-runtime task types render deterministically; SQL/JS tasks lazy-import code-split WASM runtimes (PGlite/QuickJS) inside that one island, so the page gains exactly +1 island. A `projects` collection + `/[lang]/projects` page lists non-template build ideas. Build-time lint enforces EN/RU parity, lessonKey resolution, task count, and the practice hydration budget.

**Tech Stack:** Astro 6 + Preact (islands), Zod (content schemas), Vitest + jsdom (unit tests), `@electric-sql/pglite` (WASM Postgres), `quickjs-emscripten` (sandboxed JS). Build/lint via `bun run build`; tests via `bun run test`.

---

## Conventions (read once)

- **Working dir:** all paths are relative to `/Users/artemmac/dev/awesome-everything/site` unless noted. Run all `bun` commands from there.
- **Build output is filtered by an "RTK" proxy** that eats lines (including exit codes) and matches the literal string `error` inside glossary file paths. **Never judge build success from stdout.** After every `bun run build`, read `dist/lint-report.json` — success = `{"errors":[],"warnings":[...]}` with `errors` empty (warnings allowed in P1–P5). Tests (`bun run test`) print a normal Vitest summary; trust that.
- **Island convention** (see `src/components/pedagogy/sandboxes/DBLeverSandbox.tsx`): Preact default export, JSX uses `class` (not `className`), Tailwind editorial color tokens (`card`/`card-2`/`ink`/`muted`/`rule`/`ok` — var-backed, theme-aware. Do NOT use the legacy `bbg-*` color set — it is deprecated, and the specific token `bbg-rule` was never defined so those classes render no border), a `lang` prop with an inline `const t = (en, ru) => lang === "en" ? en : ru;` helper. Mount with `client:visible`.
- **i18n:** `import { t, type Locale, isLocale } from "~/i18n";` — `t(key, lang)` resolves from `src/i18n/ui.json`.
- **`~` alias** → `src/` (configured in both `vitest.config.ts` and the Astro tsconfig).
- **Commits:** the repo rule is *no commit unless the user asks*. Each task ends with a commit step **only because subagent-driven execution commits per task**; if running inline, batch-commit at phase checkpoints instead. Never push.

---

# PHASE P1 — Foundation

Practice collection + schema, the orchestrator island for non-runtime types, lesson-page wiring, lint rules (warn mode), and consolidating the dead `i18n-parity` book scanner onto `lessons/`.

---

### Task 1: `practice` content collection + schema

**Files:**
- Modify: `src/content.config.ts` (append after the `lessons` collection, before `export const collections`)
- Create: `src/content/practice/.gitkeep` (so the glob base dir exists at build time)
- Test: `src/content/practice-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

Create `src/content/practice-schema.test.ts`. This mirrors the schema (same pattern as the existing `src/content/config.test.ts`) so we can unit-test it without booting Astro:

```ts
import { describe, expect, test } from "vitest";
import { z } from "astro/zod";

// Mirror of the practice schema in content.config.ts
const BiText = z.object({ en: z.string().min(1), ru: z.string().min(1) });
const Difficulty = z.enum(["recall", "apply", "stretch"]);
const Blank = z.object({ id: z.string(), accept: z.array(z.string()).min(1), hint: BiText.optional() });
const ExecCheck = z.object({
  kind: z.enum(["stdout-equals", "stdout-contains", "rows-equal", "no-error"]),
  value: z.string().optional(),
});
const TaskBase = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  difficulty: Difficulty,
  estMin: z.number().int().positive(),
  title: BiText,
  prompt: BiText,
});
const PredictTask = TaskBase.extend({ type: z.literal("predict"), scenario: BiText, reveal: BiText });
const IncidentTask = TaskBase.extend({
  type: z.literal("incident"),
  steps: z.array(z.object({ label: BiText, prompt: BiText, reveal: BiText })).min(3).max(6),
});
const DiagnoseTask = TaskBase.extend({
  type: z.literal("diagnose"),
  evidence: BiText.optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("blanks"), blanks: z.array(Blank).min(1) }),
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
  ]),
});
const PracticeTask = z.discriminatedUnion("type", [PredictTask, IncidentTask, DiagnoseTask]);
const fileSchema = z.object({
  lessonKey: z.string(),
  track: z.string(),
  tasks: z.array(PracticeTask).min(1).max(8),
});

const validPredict = {
  id: "predict-plan", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "Predict", ru: "Предскажи" },
  prompt: { en: "What plan?", ru: "Какой план?" },
  scenario: { en: "EXPLAIN ...", ru: "EXPLAIN ..." },
  reveal: { en: "Nested loop", ru: "Nested loop" },
};

describe("practice schema", () => {
  test("accepts a valid predict task file", () => {
    expect(() => fileSchema.parse({ lessonKey: "databases/03-execution-plans/03-join-algorithms", track: "databases", tasks: [validPredict] })).not.toThrow();
  });
  test("rejects an empty task list", () => {
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [] })).toThrow();
  });
  test("rejects a task id with uppercase", () => {
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [{ ...validPredict, id: "Bad_Id" }] })).toThrow();
  });
  test("rejects an incident with fewer than 3 steps", () => {
    const oneStep = { en: "a", ru: "а" };
    const incident = { id: "inc", type: "incident", difficulty: "apply", estMin: 10,
      title: { en: "t", ru: "т" }, prompt: { en: "p", ru: "п" },
      steps: [{ label: oneStep, prompt: oneStep, reveal: oneStep }] };
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [incident] })).toThrow();
  });
  test("rejects a BiText missing ru", () => {
    const bad = { ...validPredict, title: { en: "only en" } };
    expect(() => fileSchema.parse({ lessonKey: "x/y/z", track: "databases", tasks: [bad] })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/content/practice-schema.test.ts`
Expected: tests run but FAIL (the mirrored schema is in the test only; this step proves the test harness and assertions are correct before we add the real schema). If they already PASS, that is also fine — the test is self-contained — proceed; its purpose is to lock the schema shape that Step 3 must match exactly.

- [ ] **Step 3: Add the real schema + collection to `content.config.ts`**

In `src/content.config.ts`, insert this block immediately after the `lessons` collection definition (after its closing `});` on line ~61) and before `export const collections`:

```ts
// ── Practice layer ──────────────────────────────────────────────────────────
const BiText = Bi; // { en: min1, ru: min1 } — markdown allowed
const Difficulty = z.enum(["recall", "apply", "stretch"]);

const Blank = z.object({
  id: z.string(),
  accept: z.array(z.string()).min(1),
  hint: BiText.optional(),
});
const ExecCheck = z.object({
  kind: z.enum(["stdout-equals", "stdout-contains", "rows-equal", "no-error"]),
  value: z.string().optional(),
});

const TaskBase = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  difficulty: Difficulty,
  estMin: z.number().int().positive(),
  title: BiText,
  prompt: BiText,
});

const DiagnoseTask = TaskBase.extend({
  type: z.literal("diagnose"),
  evidence: BiText.optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("blanks"), blanks: z.array(Blank).min(1) }),
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
  ]),
});
const FixTask = TaskBase.extend({
  type: z.literal("fix"),
  starter: z.string().optional(),
  grading: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("self"), model: BiText, rubric: z.array(BiText).min(1) }),
    z.object({ mode: z.literal("exec"), runtime: z.enum(["sql", "js"]), setup: z.string().optional(), check: ExecCheck }),
  ]),
});
const SandboxTask = TaskBase.extend({
  type: z.literal("sandbox"),
  runtime: z.enum(["sql", "js", "parametric"]),
  setup: z.string().optional(),
  expected: ExecCheck.optional(),
  parametric: z.object({ component: z.string() }).optional(),
});
const IncidentTask = TaskBase.extend({
  type: z.literal("incident"),
  steps: z.array(z.object({
    label: BiText,
    prompt: BiText,
    reveal: BiText,
  })).min(3).max(6),
});
const DesignTask = TaskBase.extend({
  type: z.literal("design"),
  constraints: BiText,
  rubric: z.array(BiText).min(2),
  model: BiText,
});
const PredictTask = TaskBase.extend({
  type: z.literal("predict"),
  scenario: BiText,
  reveal: BiText,
});

const PracticeTask = z.discriminatedUnion("type", [
  DiagnoseTask, FixTask, SandboxTask, IncidentTask, DesignTask, PredictTask,
]);

const practice = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/practice" }),
  schema: z.object({
    lessonKey: z.string(),
    track: Track,
    tasks: z.array(PracticeTask).min(1).max(8),
  }),
});

export type PracticeTaskData = z.infer<typeof PracticeTask>;
```

Then change the final line from:

```ts
export const collections = { tracks, units, lessons };
```

to:

```ts
export const collections = { tracks, units, lessons, practice };
```

- [ ] **Step 4: Create the glob base dir**

Create the file `src/content/practice/.gitkeep` with a single comment line so the directory exists (Astro's `glob` loader errors if the `base` dir is missing):

```
# keep this dir; practice/<track>/<unit>/<lesson>.json files live here
```

- [ ] **Step 5: Build to verify the collection loads**

Run: `bun run build`
Then read `dist/lint-report.json`.
Expected: `errors` array empty. (No practice files yet → empty collection is valid.)

- [ ] **Step 6: Run the schema test**

Run: `bun run test src/content/practice-schema.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/content.config.ts src/content/practice/.gitkeep src/content/practice-schema.test.ts
git commit -m "feat(practice): add practice content collection + schema"
```

---

### Task 2: Consolidate lesson EN/RU parity onto `lessons/` (criterion 7)

**Context:** `src/lint/rules/i18n-parity.ts` walks `content/book`, which is now empty (only an empty `performance/` dir) — it is a permanent no-op. Meanwhile `checkLessonParity` in `src/lint/rules/lessons.ts` already scans `content/lessons` and enforces the same EN/RU parity. To satisfy spec criterion 7 ("i18n-parity now scans `lessons/`, not the dead `book/`") **without shipping two identical rules**, repoint `i18n-parity.ts` to `lessons/` and remove the now-duplicate `checkLessonParity`.

**Files:**
- Modify: `src/lint/rules/i18n-parity.ts` (rewrite to scan `content/lessons`)
- Modify: `src/lint/rules/lessons.ts` (remove `checkLessonParity` + its now-unused `walkMdx`? — `walkMdx` is still used by `checkMathPrereqs`, so KEEP `walkMdx`; only remove `checkLessonParity`)
- Modify: `src/lint/index.ts` (drop the `checkLessonParity` import + call)
- Modify: `src/lint/rules/lessons.test.ts` (remove the `checkLessonParity` describe block)
- Test: `src/lint/rules/i18n-parity.test.ts` (new — migrated parity tests)

- [ ] **Step 1: Write the failing test for the repointed rule**

Create `src/lint/rules/i18n-parity.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { checkI18nParity } from "./i18n-parity";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function lessonFixture(root: string, lang: string, status: string) {
  const dir = join(root, "content/lessons", lang, "databases/03-execution-plans/03-join-algorithms");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.mdx"),
    `---\nslug: 03-join-algorithms\nlang: ${lang}\ntrack: databases\nunit: 03-execution-plans\norder: 3\nstatus: ${status}\n---\nbody\n`);
}

describe("checkI18nParity (lessons)", () => {
  test("flags an EN-ready lesson with no RU twin", async () => {
    const root = await mkdtemp(join(tmpdir(), "i18n-"));
    await lessonFixture(root, "en", "ready");
    const errs = await checkI18nParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs.some((e) => /missing RU/.test(e))).toBe(true);
  });

  test("passes when both EN and RU ready twins exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "i18n-"));
    await lessonFixture(root, "en", "ready");
    await lessonFixture(root, "ru", "ready");
    const errs = await checkI18nParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("ignores non-ready lessons", async () => {
    const root = await mkdtemp(join(tmpdir(), "i18n-"));
    await lessonFixture(root, "en", "draft");
    const errs = await checkI18nParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test src/lint/rules/i18n-parity.test.ts`
Expected: FAIL — the current `checkI18nParity` scans `content/book`, so the EN-ready fixture under `content/lessons` is not seen and no error is produced.

- [ ] **Step 3: Rewrite `i18n-parity.ts` to scan `lessons/`**

Replace the entire contents of `src/lint/rules/i18n-parity.ts` with:

```ts
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function walk(dir: string): Promise<string[]> {
  let items: import("node:fs").Dirent[];
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.name === "index.mdx" || i.name === "index.md") out.push(p);
  }
  return out;
}

/** Every ready EN lesson has a ready RU twin and vice versa. Scans content/lessons. */
export async function checkI18nParity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsDir = join(siteSrc, "content/lessons");
  const files = await walk(lessonsDir);
  const enReady = new Set<string>();
  const ruReady = new Set<string>();

  for (const f of files) {
    const body = await readFile(f, "utf8");
    const lang = body.match(/^lang:\s*(en|ru)/m)?.[1];
    const status = body.match(/^status:\s*(stub|draft|ready)/m)?.[1];
    if (!lang || status !== "ready") continue;
    const parts = f.split(/[\\/]/);
    const idx = parts.findIndex((p) => p === "lessons");
    const key = `${parts[idx + 2]}/${parts[idx + 3]}/${parts[idx + 4]}`;
    if (lang === "en") enReady.add(key);
    else ruReady.add(key);
  }
  for (const k of enReady) if (!ruReady.has(k)) errs.push(`i18n-parity: EN ready lesson "${k}" missing RU twin`);
  for (const k of ruReady) if (!enReady.has(k)) errs.push(`i18n-parity: RU ready lesson "${k}" missing EN twin`);
  return errs;
}
```

- [ ] **Step 4: Remove the duplicate `checkLessonParity` from `lessons.ts`**

In `src/lint/rules/lessons.ts`, delete the entire `checkLessonParity` function (the block starting with the comment `/** Source-level: every ready EN lesson has a ready RU twin and vice versa. */` and its `export async function checkLessonParity(...) { ... }`). **Keep** `walkMdx` (still used by `checkMathPrereqs`) and **keep** `checkMathPrereqs`.

- [ ] **Step 5: Update the lint aggregator**

In `src/lint/index.ts`:
- Change the import on line 12 from:
  ```ts
  import { checkLessonRules, checkLessonParity, checkMathPrereqs } from "./rules/lessons";
  ```
  to:
  ```ts
  import { checkLessonRules, checkMathPrereqs } from "./rules/lessons";
  ```
- Delete the line:
  ```ts
  errors.push(...(await checkLessonParity(siteSrc)));
  ```
  (`checkI18nParity(siteSrc)` on the line above now provides this guarantee.)

- [ ] **Step 6: Remove the migrated tests from `lessons.test.ts`**

In `src/lint/rules/lessons.test.ts`:
- Remove `checkLessonParity` from the import on line 2 → `import { checkLessonRules, checkMathPrereqs } from "./lessons";`
- Delete the entire `describe("checkLessonParity", ...)` block (and its `lessonFixture` helper if it is used only by that block — verify: `lessonFixture` is referenced only inside that describe → delete it too).

- [ ] **Step 7: Run the lint tests**

Run: `bun run test src/lint/rules/i18n-parity.test.ts src/lint/rules/lessons.test.ts`
Expected: PASS (i18n-parity: 3 tests; lessons: all remaining tests green).

- [ ] **Step 8: Full build to confirm no parity regression**

Run: `bun run build` then read `dist/lint-report.json`.
Expected: `errors` empty (the 519 ready lessons already have EN/RU twins, so the repointed rule stays green).

- [ ] **Step 9: Commit**

```bash
git add src/lint/rules/i18n-parity.ts src/lint/rules/i18n-parity.test.ts src/lint/rules/lessons.ts src/lint/rules/lessons.test.ts src/lint/index.ts
git commit -m "fix(lint): repoint i18n-parity to lessons/, drop duplicate lesson-parity rule"
```

---

### Task 3: Practice grading + progress helpers (pure logic)

**Files:**
- Create: `src/scripts/practice-grade.ts`
- Create: `src/scripts/practice-state.ts`
- Test: `src/scripts/practice-grade.test.ts`
- Test: `src/scripts/practice-state.test.ts`

- [ ] **Step 1: Write failing tests for the grading helper**

Create `src/scripts/practice-grade.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { checkBlank, applyExecCheck } from "./practice-grade";

describe("checkBlank", () => {
  test("accepts a case-insensitive trimmed match", () => {
    expect(checkBlank(["Nested Loop"], "  nested loop ")).toBe(true);
  });
  test("accepts any of several accepted answers", () => {
    expect(checkBlank(["hash join", "hashjoin"], "HashJoin")).toBe(true);
  });
  test("rejects a non-match", () => {
    expect(checkBlank(["merge join"], "nested loop")).toBe(false);
  });
});

describe("applyExecCheck", () => {
  test("no-error passes when there is no error", () => {
    expect(applyExecCheck({ kind: "no-error" }, { rows: [] })).toBe(true);
  });
  test("no-error fails when there is an error", () => {
    expect(applyExecCheck({ kind: "no-error" }, { error: "syntax" })).toBe(false);
  });
  test("any check fails when an error is present", () => {
    expect(applyExecCheck({ kind: "stdout-contains", value: "x" }, { error: "boom" })).toBe(false);
  });
  test("stdout-equals compares trimmed stdout", () => {
    expect(applyExecCheck({ kind: "stdout-equals", value: "42" }, { stdout: " 42 \n" })).toBe(true);
  });
  test("stdout-contains finds a substring", () => {
    expect(applyExecCheck({ kind: "stdout-contains", value: "Nested" }, { stdout: "Plan: Nested Loop" })).toBe(true);
  });
  test("rows-equal compares normalized JSON", () => {
    expect(applyExecCheck({ kind: "rows-equal", value: '[[1,2]]' }, { rows: [[1, 2]] })).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/scripts/practice-grade.test.ts`
Expected: FAIL with "Cannot find module './practice-grade'".

- [ ] **Step 3: Implement the grading helper**

Create `src/scripts/practice-grade.ts`:

```ts
export type ExecCheckKind = "stdout-equals" | "stdout-contains" | "rows-equal" | "no-error";
export type ExecCheck = { kind: ExecCheckKind; value?: string };
export type ExecResult = { rows?: unknown[]; stdout?: string; error?: string };

export function checkBlank(accept: string[], actual: string): boolean {
  const a = actual.trim().toLowerCase();
  return accept.some((x) => x.trim().toLowerCase() === a);
}

export function applyExecCheck(check: ExecCheck, result: ExecResult): boolean {
  if (result.error) return false;
  switch (check.kind) {
    case "no-error":
      return true;
    case "stdout-equals":
      return (result.stdout ?? "").trim() === (check.value ?? "").trim();
    case "stdout-contains":
      return (result.stdout ?? "").includes(check.value ?? "");
    case "rows-equal":
      return JSON.stringify(result.rows ?? []) === (check.value ?? "");
    default:
      return false;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/scripts/practice-grade.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Write failing tests for the progress helper**

Create `src/scripts/practice-state.test.ts`:

```ts
import { describe, expect, test, beforeEach } from "vitest";
import { readProgress, setTaskStatus } from "./practice-state";

beforeEach(() => localStorage.clear());

describe("practice-state", () => {
  test("readProgress returns {} when nothing stored", () => {
    expect(readProgress("a/b/c")).toEqual({});
  });
  test("setTaskStatus persists a task status", () => {
    setTaskStatus("a/b/c", "predict-1", "done");
    expect(readProgress("a/b/c")).toEqual({ "predict-1": "done" });
  });
  test("setTaskStatus merges across tasks", () => {
    setTaskStatus("a/b/c", "t1", "seen");
    setTaskStatus("a/b/c", "t2", "attempted");
    expect(readProgress("a/b/c")).toEqual({ t1: "seen", t2: "attempted" });
  });
  test("progress is scoped per lessonKey", () => {
    setTaskStatus("a/b/c", "t1", "done");
    expect(readProgress("x/y/z")).toEqual({});
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `bun run test src/scripts/practice-state.test.ts`
Expected: FAIL with "Cannot find module './practice-state'".

- [ ] **Step 7: Implement the progress helper**

Create `src/scripts/practice-state.ts` (mirrors the guarded localStorage pattern in `Lesson.astro:150-156`):

```ts
export type TaskStatus = "seen" | "attempted" | "done";

const keyFor = (lessonKey: string) => `atlas.practice.${lessonKey}`;

export function readProgress(lessonKey: string): Record<string, TaskStatus> {
  try {
    const raw = localStorage.getItem(keyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, TaskStatus>) : {};
  } catch {
    return {};
  }
}

export function setTaskStatus(lessonKey: string, taskId: string, status: TaskStatus): void {
  try {
    const cur = readProgress(lessonKey);
    cur[taskId] = status;
    localStorage.setItem(keyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `bun run test src/scripts/practice-state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add src/scripts/practice-grade.ts src/scripts/practice-grade.test.ts src/scripts/practice-state.ts src/scripts/practice-state.test.ts
git commit -m "feat(practice): grading + localStorage progress helpers"
```

---

### Task 4: `PracticeSection` orchestrator island (non-runtime types)

Renders the 5 non-runtime task types: `predict`, `diagnose` (blanks + self), `fix` (self mode), `design`, `incident`. `sandbox` tasks and `fix`-exec render `null` here and are filled in P3.

**Files:**
- Create: `src/components/pedagogy/PracticeSection.tsx`
- Test: `src/components/pedagogy/PracticeSection.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/pedagogy/PracticeSection.test.tsx`. Uses `preact-render-to-string` (already a transitive dep via Astro/Preact; if the import fails, add it: `bun add -d preact-render-to-string`).

```tsx
import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import PracticeSection from "./PracticeSection";
import type { PracticeTaskData } from "~/content.config";

const predict: PracticeTaskData = {
  id: "p1", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "Predict the plan", ru: "Предскажи план" },
  prompt: { en: "Which join?", ru: "Какой join?" },
  scenario: { en: "Small table joined to big table", ru: "Маленькая таблица к большой" },
  reveal: { en: "Hash join", ru: "Hash join" },
} as PracticeTaskData;

describe("PracticeSection", () => {
  test("renders the practice-layer marker with the lessonKey", () => {
    const html = render(<PracticeSection lang="en" lessonKey="databases/03-execution-plans/03-join-algorithms" tasks={[predict]} />);
    expect(html).toContain("data-practice-layer");
    expect(html).toContain('data-lesson-key="databases/03-execution-plans/03-join-algorithms"');
  });
  test("renders each task title (EN)", () => {
    const html = render(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[predict]} />);
    expect(html).toContain("Predict the plan");
  });
  test("renders RU titles when lang=ru", () => {
    const html = render(<PracticeSection lang="ru" lessonKey="a/b/c" tasks={[predict]} />);
    expect(html).toContain("Предскажи план");
  });
  test("shows a difficulty chip and estMin", () => {
    const html = render(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[predict]} />);
    expect(html).toContain("recall");
    expect(html).toContain("3");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/components/pedagogy/PracticeSection.test.tsx`
Expected: FAIL with "Cannot find module './PracticeSection'".

- [ ] **Step 3: Implement the orchestrator**

Create `src/components/pedagogy/PracticeSection.tsx`:

```tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import { checkBlank } from "~/scripts/practice-grade";
import { setTaskStatus } from "~/scripts/practice-state";

type Props = { lang: Locale; lessonKey: string; tasks: PracticeTaskData[] };

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function PracticeSection({ lang, lessonKey, tasks }: Props) {
  return (
    <section data-practice-layer data-lesson-key={lessonKey} class="my-12">
      <h2 class="font-bold text-ink text-2xl mb-1">{tt(lang, "Practice", "Практика")}</h2>
      <p class="text-sm text-muted mb-6">
        {tt(lang, "Do these to turn recognition into skill.", "Сделай это, чтобы превратить узнавание в навык.")}
      </p>
      <ol class="space-y-4">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskCard lang={lang} lessonKey={lessonKey} task={task} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TaskCard({ lang, lessonKey, task }: { lang: Locale; lessonKey: string; task: PracticeTaskData }) {
  const [open, setOpen] = useState(false);
  const onOpen = () => {
    setOpen((v) => {
      if (!v) setTaskStatus(lessonKey, task.id, "seen");
      return !v;
    });
  };
  return (
    <div data-practice-task={task.id} class="rounded-2xl border-2 border-rule bg-card p-5">
      <button type="button" onClick={onOpen} class="w-full flex items-center justify-between gap-3 text-left">
        <span class="font-semibold text-ink">{tt(lang, task.title.en, task.title.ru)}</span>
        <span class="flex items-center gap-2 shrink-0">
          <span class="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full border border-rule text-muted">{task.difficulty}</span>
          <span class="text-xs font-mono text-muted">{task.estMin} min</span>
        </span>
      </button>
      {open && (
        <div class="mt-4">
          <div class="prose max-w-none text-sm mb-4" dangerouslySetInnerHTML={{ __html: tt(lang, task.prompt.en, task.prompt.ru) }} />
          <TaskBody lang={lang} lessonKey={lessonKey} task={task} />
        </div>
      )}
    </div>
  );
}

function TaskBody({ lang, lessonKey, task }: { lang: Locale; lessonKey: string; task: PracticeTaskData }) {
  switch (task.type) {
    case "predict":
      return <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.reveal.en, task.reveal.ru)} pre={tt(lang, task.scenario.en, task.scenario.ru)} />;
    case "design":
      return (
        <div>
          <Constraints lang={lang} text={tt(lang, task.constraints.en, task.constraints.ru)} />
          <Rubric lang={lang} items={task.rubric.map((r) => tt(lang, r.en, r.ru))} />
          <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.model.en, task.model.ru)} />
        </div>
      );
    case "incident":
      return <Incident lang={lang} lessonKey={lessonKey} taskId={task.id} steps={task.steps.map((s) => ({ label: tt(lang, s.label.en, s.label.ru), prompt: tt(lang, s.prompt.en, s.prompt.ru), reveal: tt(lang, s.reveal.en, s.reveal.ru) }))} />;
    case "diagnose":
      if (task.grading.mode === "blanks") {
        return <Blanks lang={lang} lessonKey={lessonKey} taskId={task.id}
          evidence={task.evidence ? tt(lang, task.evidence.en, task.evidence.ru) : null}
          blanks={task.grading.blanks.map((b) => ({ id: b.id, accept: b.accept, hint: b.hint ? tt(lang, b.hint.en, b.hint.ru) : null }))} />;
      }
      return (
        <div>
          {task.evidence && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{tt(lang, task.evidence.en, task.evidence.ru)}</pre>}
          <Rubric lang={lang} items={task.grading.rubric.map((r) => tt(lang, r.en, r.ru))} />
          <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.grading.model.en, task.grading.model.ru)} />
        </div>
      );
    case "fix":
      if (task.grading.mode === "self") {
        return (
          <div>
            {task.starter && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{task.starter}</pre>}
            <Rubric lang={lang} items={task.grading.rubric.map((r) => tt(lang, r.en, r.ru))} />
            <Reveal lang={lang} lessonKey={lessonKey} taskId={task.id} body={tt(lang, task.grading.model.en, task.grading.model.ru)} />
          </div>
        );
      }
      return null; // fix-exec: runtime, filled in P3
    case "sandbox":
      return null; // runtime/parametric: filled in P3
    default:
      return null;
  }
}

function Reveal({ lang, lessonKey, taskId, body, pre }: { lang: Locale; lessonKey: string; taskId: string; body: string; pre?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      {pre && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{pre}</pre>}
      {!shown ? (
        <button type="button" class="px-4 py-1.5 rounded-full border-2 border-ok text-ok text-sm font-semibold"
          onClick={() => { setShown(true); setTaskStatus(lessonKey, taskId, "done"); }}>
          {tt(lang, "Reveal model answer", "Показать ответ")}
        </button>
      ) : (
        <div class="prose max-w-none text-sm mt-2" dangerouslySetInnerHTML={{ __html: body }} />
      )}
    </div>
  );
}

function Constraints({ lang, text }: { lang: Locale; text: string }) {
  return (
    <div class="mb-3">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Constraints", "Ограничения")}</div>
      <div class="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

function Rubric({ lang, items }: { lang: Locale; items: string[] }) {
  return (
    <div class="mb-3">
      <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Self-grade checklist", "Чек-лист самооценки")}</div>
      <ul class="space-y-1">
        {items.map((it, i) => (
          <li key={i} class="flex items-start gap-2 text-sm">
            <input type="checkbox" class="mt-1" /> <span dangerouslySetInnerHTML={{ __html: it }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Blanks({ lang, lessonKey, taskId, evidence, blanks }: {
  lang: Locale; lessonKey: string; taskId: string; evidence: string | null;
  blanks: { id: string; accept: string[]; hint: string | null }[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Record<string, boolean> | null>(null);
  const submit = () => {
    const r: Record<string, boolean> = {};
    let allOk = true;
    for (const b of blanks) {
      const ok = checkBlank(b.accept, values[b.id] ?? "");
      r[b.id] = ok;
      if (!ok) allOk = false;
    }
    setResult(r);
    setTaskStatus(lessonKey, taskId, allOk ? "done" : "attempted");
  };
  return (
    <div>
      {evidence && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{evidence}</pre>}
      <ul class="space-y-3">
        {blanks.map((b) => (
          <li key={b.id}>
            <input class="font-mono w-full max-w-md px-3 py-1.5 border border-gray-300 rounded"
              value={values[b.id] ?? ""}
              onInput={(e) => setValues({ ...values, [b.id]: (e.target as HTMLInputElement).value })} />
            {result && (
              <span class={`ml-2 text-sm ${result[b.id] ? "text-ok" : "text-red-600"}`}>
                {result[b.id] ? "✓" : tt(lang, "try again", "ещё раз")}
              </span>
            )}
            {result && !result[b.id] && b.hint && <div class="text-xs text-muted mt-1">{b.hint}</div>}
          </li>
        ))}
      </ul>
      <button type="button" class="mt-3 px-4 py-1.5 rounded-full bg-ink text-white text-sm font-semibold" onClick={submit}>
        {tt(lang, "Check", "Проверить")}
      </button>
    </div>
  );
}

function Incident({ lang, lessonKey, taskId, steps }: {
  lang: Locale; lessonKey: string; taskId: string;
  steps: { label: string; prompt: string; reveal: string }[];
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  return (
    <ol class="space-y-4">
      {steps.map((s, i) => (
        <li key={i} class="border-l-2 border-rule pl-4">
          <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{s.label}</div>
          <div class="prose max-w-none text-sm mb-2" dangerouslySetInnerHTML={{ __html: s.prompt }} />
          {!revealed[i] ? (
            <button type="button" class="text-sm text-ok font-semibold"
              onClick={() => {
                const next = { ...revealed, [i]: true };
                setRevealed(next);
                setTaskStatus(lessonKey, taskId, Object.keys(next).length === steps.length ? "done" : "attempted");
              }}>
              {tt(lang, "Reveal", "Показать")}
            </button>
          ) : (
            <div class="prose max-w-none text-sm bg-card-2 p-3 rounded" dangerouslySetInnerHTML={{ __html: s.reveal }} />
          )}
        </li>
      ))}
    </ol>
  );
}
```

> **Note on `dangerouslySetInnerHTML`:** task prose is markdown-allowed authored content from our own repo (not user input), rendered as trusted HTML. Authors write inline HTML/escaped markdown in the JSON. This matches how the content pipeline already trusts MDX. Do not wire a markdown parser in P1 — keep prose as pre-escaped HTML strings in the JSON.

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/components/pedagogy/PracticeSection.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/pedagogy/PracticeSection.tsx src/components/pedagogy/PracticeSection.test.tsx
git commit -m "feat(practice): PracticeSection orchestrator for non-runtime task types"
```

---

### Task 5: Wire `PracticeSection` into the lesson page (+1 island)

**Files:**
- Modify: `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro` (fetch the practice entry, pass tasks)
- Modify: `src/layouts/Lesson.astro` (accept `practice` prop, render the island after the body)

- [ ] **Step 1: Pass the practice entry from the route**

In `src/pages/[lang]/learn/[track]/[unit]/[lesson].astro`, update the frontmatter and the `<Lesson>` invocation.

Replace the frontmatter block (lines 1–24) with:

```astro
---
import { getCollection, render } from "astro:content";
import Lesson from "~/layouts/Lesson.astro";
import { type Locale, isLocale } from "~/i18n";

export async function getStaticPaths() {
  const all = await getCollection("lessons");
  return all.map((entry) => ({
    params: {
      lang: entry.data.lang,
      track: entry.data.track,
      unit: entry.data.unit,
      lesson: entry.data.slug,
    },
    props: { entry },
  }));
}

const { lang } = Astro.params as { lang: Locale; track: string; unit: string; lesson: string };
if (!isLocale(lang)) throw new Error("bad lang");

const { entry } = Astro.props;
const { Content } = await render(entry);

const lessonKey = `${entry.data.track}/${entry.data.unit}/${entry.data.slug}`;
const practiceEntries = await getCollection("practice");
const practiceMatch = practiceEntries.find((p) => p.data.lessonKey === lessonKey);
const practice = practiceMatch?.data.tasks ?? null;
---
```

Then change the `<Lesson ...>` open tag to add the `lessonKey` (already present) and a `practice` prop:

```astro
<Lesson
  title={entry.data.title}
  lang={lang}
  trackSlug={entry.data.track}
  unitSlug={entry.data.unit}
  slug={entry.data.slug}
  summary={entry.data.summary}
  estMin={entry.data.estMin}
  sources={entry.data.sources}
  lessonType={entry.data.lessonType}
  level={entry.data.level}
  lessonKey={lessonKey}
  practice={practice}
>
  <Content />
</Lesson>
```

- [ ] **Step 2: Accept the prop + render the island in the layout**

In `src/layouts/Lesson.astro`:

Add the import at the top of the frontmatter (after the existing component imports, around line 11):

```astro
import PracticeSection from "~/components/pedagogy/PracticeSection.tsx";
import type { PracticeTaskData } from "~/content.config";
```

Add `practice` to the `Props` type (inside the `type Props = { ... }` block, after `slug`):

```ts
  /** Practice tasks for this lesson, or null when none authored */
  practice?: PracticeTaskData[] | null;
```

Add `practice` to the destructure (the `const { ... } = Astro.props;` block):

```ts
const {
  title, lang, trackSlug, unitSlug, summary, estMin, sources,
  lessonType, level, lessonKey, slug, practice,
} = Astro.props;
```

Render the island immediately after the lesson-content slot. Find this block (lines ~128–130):

```astro
      <div class="lesson-content">
        <slot />
      </div>
```

and insert directly after it:

```astro
      {practice && practice.length > 0 && lessonKey && (
        <PracticeSection client:visible lang={lang} lessonKey={lessonKey} tasks={practice} />
      )}
```

- [ ] **Step 3: Build to verify nothing breaks (no practice files yet)**

Run: `bun run build` then read `dist/lint-report.json`.
Expected: `errors` empty. No lesson has a practice file yet, so every page renders exactly as before (the `practice && practice.length > 0` guard short-circuits).

- [ ] **Step 4: Commit**

```bash
git add "src/pages/[lang]/learn/[track]/[unit]/[lesson].astro" src/layouts/Lesson.astro
git commit -m "feat(practice): render PracticeSection after lesson body when authored"
```

---

### Task 6: Practice lint rules (warn mode) + sandbox budget

Four rules. Three are source-level (read `content/practice/*.json`): `practice-parity` (error), `practice-lessonkey` (error), `practice-count` (warn in P1). One is HTML-level: `practice-sandbox-budget` (error). Also: exclude the practice island from the existing lesson body island cap.

**Files:**
- Create: `src/components/pedagogy/parametric-registry.ts` (component-name allowlist, no Preact imports — safe for lint to import)
- Create: `src/lint/rules/practice.ts` (the four checks)
- Test: `src/lint/rules/practice.test.ts`
- Modify: `src/lint/index.ts` (wire the rules)
- Modify: `src/lint/rules/lessons.ts` (exclude PracticeSection from the body island count)

- [ ] **Step 1: Create the parametric registry (names only)**

Create `src/components/pedagogy/parametric-registry.ts`:

```ts
/** Names a `sandbox` task may reference via `parametric.component`.
 *  Names only — no Preact imports — so the linter can import this safely.
 *  PracticeSection builds the lazy import map keyed by these names. */
export const PARAMETRIC_COMPONENT_NAMES = ["DBLeverSandbox", "RequestBudgetSandbox"] as const;
export type ParametricComponentName = (typeof PARAMETRIC_COMPONENT_NAMES)[number];
```

- [ ] **Step 2: Write failing tests for the lint rules**

Create `src/lint/rules/practice.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkPracticeParity,
  checkPracticeLessonKey,
  checkPracticeCount,
  checkPracticeSandboxBudget,
} from "./practice";

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "practice-"));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

async function lesson(root: string, lang: string, key: string) {
  const dir = join(root, "content/lessons", lang, key);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.mdx"), `---\nlang: ${lang}\nstatus: ready\n---\nx\n`);
}

async function practiceFile(root: string, relPath: string, data: unknown) {
  const dir = join(root, "content/practice", relPath.split("/").slice(0, -1).join("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(join(root, "content/practice", relPath), JSON.stringify(data));
}

const goodTask = {
  id: "p1", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "T", ru: "Т" }, prompt: { en: "P", ru: "П" },
  scenario: { en: "S", ru: "С" }, reveal: { en: "R", ru: "Р" },
};

describe("checkPracticeParity", () => {
  test("flags a BiText with whitespace-only ru", async () => {
    await withRoot(async (root) => {
      const t = { ...goodTask, title: { en: "Title", ru: "   " } };
      await practiceFile(root, "databases/03-execution-plans/03-join-algorithms.json",
        { lessonKey: "databases/03-execution-plans/03-join-algorithms", track: "databases", tasks: [t] });
      const errs = await checkPracticeParity(root);
      expect(errs.length).toBeGreaterThan(0);
    });
  });
  test("flags an untranslated prose field (en === ru, long)", async () => {
    await withRoot(async (root) => {
      const longSame = "This is an untranslated long prose sentence that exceeds the threshold.";
      const t = { ...goodTask, prompt: { en: longSame, ru: longSame } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [t] });
      const errs = await checkPracticeParity(root);
      expect(errs.some((e) => /untranslated/.test(e))).toBe(true);
    });
  });
  test("passes a clean bilingual file", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [goodTask] });
      expect(await checkPracticeParity(root)).toEqual([]);
    });
  });
});

describe("checkPracticeLessonKey", () => {
  test("flags a lessonKey with no matching lesson", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [goodTask] });
      const errs = await checkPracticeLessonKey(root);
      expect(errs.some((e) => /a\/b\/c/.test(e))).toBe(true);
    });
  });
  test("passes when both EN and RU lessons exist", async () => {
    await withRoot(async (root) => {
      await lesson(root, "en", "databases/03-execution-plans/03-join-algorithms");
      await lesson(root, "ru", "databases/03-execution-plans/03-join-algorithms");
      await practiceFile(root, "databases/03-execution-plans/03-join-algorithms.json",
        { lessonKey: "databases/03-execution-plans/03-join-algorithms", track: "databases", tasks: [goodTask] });
      expect(await checkPracticeLessonKey(root)).toEqual([]);
    });
  });
  test("flags an unknown parametric component name", async () => {
    await withRoot(async (root) => {
      await lesson(root, "en", "a/b/c");
      await lesson(root, "ru", "a/b/c");
      const sandbox = { id: "s1", type: "sandbox", difficulty: "apply", estMin: 5,
        title: { en: "S", ru: "С" }, prompt: { en: "P", ru: "П" },
        runtime: "parametric", parametric: { component: "NoSuchThing" } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [sandbox] });
      const errs = await checkPracticeLessonKey(root);
      expect(errs.some((e) => /NoSuchThing/.test(e))).toBe(true);
    });
  });
});

describe("checkPracticeCount", () => {
  test("warns (not errors) for a ready lesson with no practice file in P1", async () => {
    await withRoot(async (root) => {
      await lesson(root, "en", "databases/03-execution-plans/03-join-algorithms");
      await lesson(root, "ru", "databases/03-execution-plans/03-join-algorithms");
      const { errors, warnings } = await checkPracticeCount(root);
      expect(errors).toEqual([]);
      expect(warnings.some((w) => /03-join-algorithms/.test(w))).toBe(true);
    });
  });
});

describe("checkPracticeSandboxBudget", () => {
  const LESSON = "/x/dist/en/learn/databases/03-execution-plans/03-join-algorithms/index.html";
  test("passes a single client:visible practice island", () => {
    const html = `<astro-island component-url="/_astro/PracticeSection.abc.js" client="visible"></astro-island><section data-practice-layer></section>`;
    expect(checkPracticeSandboxBudget(html, LESSON)).toEqual([]);
  });
  test("flags two practice-layer markers", () => {
    const html = `<section data-practice-layer></section><section data-practice-layer></section>`;
    expect(checkPracticeSandboxBudget(html, LESSON).some((e) => /at most one/.test(e))).toBe(true);
  });
  test("flags a client:load practice island", () => {
    const html = `<astro-island component-url="/_astro/PracticeSection.abc.js" client="load"></astro-island><section data-practice-layer></section>`;
    expect(checkPracticeSandboxBudget(html, LESSON).some((e) => /eager/.test(e))).toBe(true);
  });
  test("ignores non-lesson pages", () => {
    expect(checkPracticeSandboxBudget(`<section data-practice-layer></section><section data-practice-layer></section>`, "/x/dist/en/index.html")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `bun run test src/lint/rules/practice.test.ts`
Expected: FAIL with "Cannot find module './practice'".

- [ ] **Step 4: Implement the rules**

Create `src/lint/rules/practice.ts`:

```ts
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PARAMETRIC_COMPONENT_NAMES } from "../../components/pedagogy/parametric-registry";

const PARAMETRIC = new Set<string>(PARAMETRIC_COMPONENT_NAMES);
const UNTRANSLATED_MIN_LEN = 25; // only flag en===ru on prose-length fields

async function walkJson(dir: string): Promise<string[]> {
  let items: import("node:fs").Dirent[];
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walkJson(p)));
    else if (i.name.endsWith(".json")) out.push(p);
  }
  return out;
}

async function readPractice(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/practice");
  const files = await walkJson(dir);
  const out: { file: string; data: any }[] = [];
  for (const f of files) {
    try { out.push({ file: f, data: JSON.parse(await readFile(f, "utf8")) }); } catch { /* malformed handled by schema */ }
  }
  return out;
}

/** Recursively find every {en, ru} string pair in an object tree. */
function biTexts(node: any, out: { en: string; ru: string }[] = []): { en: string; ru: string }[] {
  if (node && typeof node === "object") {
    if (typeof node.en === "string" && typeof node.ru === "string") out.push({ en: node.en, ru: node.ru });
    for (const k of Object.keys(node)) biTexts(node[k], out);
  } else if (Array.isArray(node)) {
    for (const el of node) biTexts(el, out);
  }
  return out;
}

export async function checkPracticeParity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  for (const { file, data } of await readPractice(siteSrc)) {
    for (const bt of biTexts(data)) {
      if (!bt.en.trim() || !bt.ru.trim()) errs.push(`practice-parity: "${file}" has a whitespace-only en/ru field`);
      else if (bt.en.length >= UNTRANSLATED_MIN_LEN && bt.en.trim() === bt.ru.trim())
        errs.push(`practice-parity: "${file}" has an untranslated field (en === ru): "${bt.en.slice(0, 40)}…"`);
    }
  }
  return errs;
}

async function lessonKeys(siteSrc: string): Promise<{ en: Set<string>; ru: Set<string> }> {
  const en = new Set<string>(); const ru = new Set<string>();
  for (const langDir of ["en", "ru"] as const) {
    const base = join(siteSrc, "content/lessons", langDir);
    const files = await walkMdxKeys(base);
    for (const key of files) (langDir === "en" ? en : ru).add(key);
  }
  return { en, ru };
}

/** Returns "<track>/<unit>/<slug>" for each lesson under base. */
async function walkMdxKeys(base: string): Promise<string[]> {
  const out: string[] = [];
  async function rec(dir: string, parts: string[]) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      if (i.isDirectory()) await rec(join(dir, i.name), [...parts, i.name]);
      else if ((i.name === "index.mdx" || i.name === "index.md") && parts.length >= 3) {
        out.push(parts.slice(0, 3).join("/"));
      }
    }
  }
  await rec(base, []);
  return out;
}

export async function checkPracticeLessonKey(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const { en, ru } = await lessonKeys(siteSrc);
  for (const { file, data } of await readPractice(siteSrc)) {
    const key = data?.lessonKey;
    if (typeof key !== "string" || !en.has(key) || !ru.has(key)) {
      errs.push(`practice-lessonkey: "${file}" lessonKey "${key}" has no matching EN+RU lesson`);
    }
    for (const task of data?.tasks ?? []) {
      if (task?.type === "sandbox" && task?.runtime === "parametric") {
        const name = task?.parametric?.component;
        if (!name || !PARAMETRIC.has(name)) {
          errs.push(`practice-lessonkey: "${file}" task "${task?.id}" references unknown parametric component "${name}"`);
        }
      }
    }
  }
  return errs;
}

/** Tracks flipped to error (lesson without a 3–5 task practice file fails the build).
 *  Empty in P1 — everything is a warning. Add track slugs here as a track is filled. */
export const PRACTICE_REQUIRED_TRACKS: string[] = [];

export async function checkPracticeCount(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = []; const warnings: string[] = [];
  // ready EN lessons → "<track>/<unit>/<slug>"
  const readyKeys: string[] = [];
  const base = join(siteSrc, "content/lessons", "en");
  async function rec(dir: string, parts: string[]) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      if (i.isDirectory()) await rec(join(dir, i.name), [...parts, i.name]);
      else if ((i.name === "index.mdx" || i.name === "index.md") && parts.length >= 3) {
        const body = await readFile(join(dir, i.name), "utf8");
        if (/^status:\s*ready/m.test(body)) readyKeys.push(parts.slice(0, 3).join("/"));
      }
    }
  }
  await rec(base, []);

  const practiceByKey = new Map<string, any>();
  for (const { data } of await readPractice(siteSrc)) if (data?.lessonKey) practiceByKey.set(data.lessonKey, data);

  for (const key of readyKeys) {
    const track = key.split("/")[0];
    const required = PRACTICE_REQUIRED_TRACKS.includes(track);
    const data = practiceByKey.get(key);
    const count = data?.tasks?.length ?? 0;
    let msg: string | null = null;
    if (!data) msg = `practice-count: ready lesson "${key}" has no practice file`;
    else if (count < 3 || count > 5) msg = `practice-count: lesson "${key}" has ${count} tasks (want 3–5)`;
    if (msg) (required ? errors : warnings).push(msg);
  }
  return { errors, warnings };
}

/** HTML-level: at most one PracticeSection island per lesson page, never client:load. */
export function checkPracticeSandboxBudget(html: string, file: string): string[] {
  const norm = file.replace(/\\/g, "/");
  const isLesson = /\/dist\/(en|ru)\/learn\/.+\/index\.html$/.test(norm);
  if (!isLesson) return [];
  const errs: string[] = [];

  const markers = html.match(/data-practice-layer\b/g)?.length ?? 0;
  if (markers > 1) errs.push(`${file}: at most one PracticeSection per page (found ${markers})`);

  const islandRe = /<astro-island\b[^>]*component-url="[^"]*\/PracticeSection\.[^"]+\.js"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = islandRe.exec(html))) {
    if (/client="load"/.test(m[0])) errs.push(`${file}: PracticeSection must not be an eager (client:load) island`);
  }
  return errs;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `bun run test src/lint/rules/practice.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 6: Exclude the practice island from the lesson body island cap**

In `src/lint/rules/lessons.ts`, add this helper near the top (after the `ISLAND_COMPONENT_RE` constant on line 9):

```ts
/** Count hydration islands EXCLUDING the PracticeSection orchestrator,
 *  which is budgeted separately by practice-sandbox-budget. */
function countBodyIslands(html: string): number {
  const all = html.match(/<astro-island\b/g)?.length ?? 0;
  const practice = html.match(/<astro-island\b[^>]*component-url="[^"]*\/PracticeSection\.[^"]+\.js"/g)?.length ?? 0;
  return all - practice;
}
```

Then replace the two body island-count expressions:
- In `commonLessonRules` (line ~81): change
  ```ts
  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  ```
  to
  ```ts
  const islands = countBodyIslands(html);
  ```
- In `checkTopicLesson` (line ~245): change
  ```ts
  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  ```
  to
  ```ts
  const islands = countBodyIslands(html);
  ```

(Existing tests use non-PracticeSection islands, so `countBodyIslands` returns the same numbers — they stay green.)

- [ ] **Step 7: Wire the rules into the aggregator**

In `src/lint/index.ts`:
- Add the import after the other rule imports (after line 14):
  ```ts
  import { checkPracticeParity, checkPracticeLessonKey, checkPracticeCount, checkPracticeSandboxBudget } from "./rules/practice";
  ```
- Inside the per-file loop (after `errors.push(...checkLessonRules(html, f));` on line 44), add:
  ```ts
  errors.push(...checkPracticeSandboxBudget(html, f));
  ```
- In the source-level section (after `errors.push(...(await checkMathPrereqs(siteSrc)));`), add:
  ```ts
  errors.push(...(await checkPracticeParity(siteSrc)));
  errors.push(...(await checkPracticeLessonKey(siteSrc)));
  const pc = await checkPracticeCount(siteSrc);
  errors.push(...pc.errors);
  warnings.push(...pc.warnings);
  ```

- [ ] **Step 8: Full build — expect warnings, no errors**

Run: `bun run build` then read `dist/lint-report.json`.
Expected: `errors` empty; `warnings` now contains many `practice-count: ready lesson "…" has no practice file` lines (519 lessons). This is the intended P1 warn-mode state. The build still succeeds (warnings don't throw).

- [ ] **Step 9: Run the full test suite**

Run: `bun run test`
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/pedagogy/parametric-registry.ts src/lint/rules/practice.ts src/lint/rules/practice.test.ts src/lint/index.ts src/lint/rules/lessons.ts
git commit -m "feat(lint): practice parity/lessonkey/count/sandbox-budget rules (warn mode)"
```

---

# PHASE P2 — Reference content (non-runtime)

Author the worked reference practice file by hand so the whole P1 engine is exercised end-to-end with real content. (The remaining 6 lessons of the unit are authored via the `/practice` command in P5.)

---

### Task 7: Author the reference practice file `03-join-algorithms.json`

**Files:**
- Create: `src/content/practice/databases/03-execution-plans/03-join-algorithms.json`

**Reference lesson:** `src/content/lessons/en/databases/03-execution-plans/03-join-algorithms/index.mdx` (read it first to align task content with the lesson's concepts: nested loop / hash join / merge join, row-estimate errors, `work_mem`, join order).

- [ ] **Step 1: Read the lesson to ground the tasks**

Run: `cat src/content/lessons/en/databases/03-execution-plans/03-join-algorithms/index.mdx` (and the RU twin) to extract concepts, numbers, and failure modes the tasks should hit.

- [ ] **Step 2: Write the practice file**

Create `src/content/practice/databases/03-execution-plans/03-join-algorithms.json`. Five tasks forming a recall→apply→stretch ladder (predict → diagnose-blanks → fix-self → incident → design). Prose fields are pre-escaped HTML strings (see the P1 note). This is a complete, valid file:

```json
{
  "lessonKey": "databases/03-execution-plans/03-join-algorithms",
  "track": "databases",
  "tasks": [
    {
      "id": "predict-join-choice",
      "type": "predict",
      "difficulty": "recall",
      "estMin": 3,
      "title": { "en": "Predict the join the planner picks", "ru": "Предскажи join, который выберет планировщик" },
      "prompt": { "en": "Before revealing, decide which physical join PostgreSQL will choose and why.", "ru": "Перед тем как открыть ответ, реши, какой физический join выберет PostgreSQL и почему." },
      "scenario": { "en": "SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.country = 'DE';  -- customers: 5k rows, ~80 match DE (indexed); orders: 50M rows, indexed on customer_id.", "ru": "SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id WHERE c.country = 'DE';  -- customers: 5k строк, ~80 совпадают с DE (есть индекс); orders: 50M строк, индекс по customer_id." },
      "reveal": { "en": "<b>Nested loop</b> with an index scan on <code>orders.customer_id</code>: the outer side is tiny (~80 customers), and each lookup into the 50M-row table is a cheap indexed probe. A hash join would needlessly hash 50M rows; a merge join would need both inputs sorted.", "ru": "<b>Nested loop</b> с index scan по <code>orders.customer_id</code>: внешняя сторона крошечная (~80 клиентов), и каждый поиск в таблице на 50M строк — дешёвый индексный probe. Hash join зря захешировал бы 50M строк; merge join потребовал бы сортировки обоих входов." }
    },
    {
      "id": "diagnose-bad-estimate",
      "type": "diagnose",
      "difficulty": "apply",
      "estMin": 6,
      "title": { "en": "Name the cause of the slow hash join", "ru": "Назови причину медленного hash join" },
      "prompt": { "en": "The plan below ran 40× slower than expected. Fill in the blanks with the mechanism at fault.", "ru": "План ниже отработал в 40× медленнее ожидаемого. Заполни пропуски механизмом, который виноват." },
      "evidence": { "en": "Hash Join  (cost=... rows=120 width=...) (actual rows=480000 loops=1)\\n  ->  Seq Scan on big_table (actual rows=480000)\\n  Buckets: 1024  Batches: 64  (planned Batches: 1)", "ru": "Hash Join  (cost=... rows=120 width=...) (actual rows=480000 loops=1)\\n  ->  Seq Scan on big_table (actual rows=480000)\\n  Buckets: 1024  Batches: 64  (planned Batches: 1)" },
      "grading": {
        "mode": "blanks",
        "blanks": [
          { "id": "b1", "accept": ["row estimate", "row-estimate", "cardinality estimate", "estimate"], "hint": { "en": "Compare planned rows=120 vs actual rows=480000.", "ru": "Сравни planned rows=120 и actual rows=480000." } },
          { "id": "b2", "accept": ["batches", "spill", "disk spill", "spilled to disk"], "hint": { "en": "Planned 1, got 64 — the hash didn't fit in work_mem.", "ru": "Planned 1, стало 64 — хеш не влез в work_mem." } }
        ]
      }
    },
    {
      "id": "fix-force-better-plan",
      "type": "fix",
      "difficulty": "apply",
      "estMin": 8,
      "title": { "en": "Fix the spilling hash join", "ru": "Почини проливающийся hash join" },
      "prompt": { "en": "Write the change(s) that make the join above stop spilling to disk and pick a sane plan. Then reveal the model answer.", "ru": "Напиши изменение(я), которые остановят пролив join на диск и заставят выбрать вменяемый план. Затем открой образцовый ответ." },
      "starter": "-- the query that produced the bad plan\nSELECT ... FROM big_table b JOIN dim d ON d.id = b.dim_id WHERE b.flag = true;",
      "grading": {
        "mode": "self",
        "model": { "en": "Two levers: (1) <code>ANALYZE big_table;</code> so the planner's row estimate (120 vs 480k) is corrected — the wrong estimate is the root cause; (2) if the estimate is right and the set is genuinely large, raise <code>work_mem</code> for the session (<code>SET work_mem = '128MB';</code>) so the hash fits in one batch. Forcing with <code>enable_hashjoin = off</code> is a diagnostic, not a fix.", "ru": "Два рычага: (1) <code>ANALYZE big_table;</code> чтобы исправить оценку строк планировщика (120 против 480k) — неверная оценка и есть корень; (2) если оценка верна и набор реально большой, поднять <code>work_mem</code> на сессию (<code>SET work_mem = '128MB';</code>), чтобы хеш влез в один batch. Отключение через <code>enable_hashjoin = off</code> — это диагностика, а не фикс." },
        "rubric": [
          { "en": "Identifies the stale row estimate as the root cause (not just symptoms).", "ru": "Определяет устаревшую оценку строк как корень (а не только симптомы)." },
          { "en": "Proposes ANALYZE before reaching for work_mem.", "ru": "Предлагает ANALYZE раньше, чем тянуться к work_mem." },
          { "en": "Treats enable_hashjoin=off as diagnostic only.", "ru": "Считает enable_hashjoin=off только диагностикой." }
        ]
      }
    },
    {
      "id": "incident-join-order-prod",
      "type": "incident",
      "difficulty": "stretch",
      "estMin": 15,
      "title": { "en": "You shipped a query that took prod down", "ru": "Ты выкатил запрос, который уронил прод" },
      "prompt": { "en": "A new report query joins 6 tables. After deploy, p99 latency exploded and connections piled up. Work the incident.", "ru": "Новый запрос отчёта джойнит 6 таблиц. После деплоя p99 взлетел и соединения накопились. Разбери инцидент." },
      "steps": [
        {
          "label": { "en": "Triage", "ru": "Триаж" },
          "prompt": { "en": "What do you look at first to confirm the new query is the cause?", "ru": "Куда смотришь первым делом, чтобы подтвердить, что виноват новый запрос?" },
          "reveal": { "en": "<code>pg_stat_activity</code> for long-running queries + <code>pg_stat_statements</code> ordered by total_time. Confirm the new query's query_id dominates, and check wait_event (likely IO or a lock).", "ru": "<code>pg_stat_activity</code> на долгие запросы + <code>pg_stat_statements</code> по total_time. Подтверди, что query_id нового запроса доминирует, и проверь wait_event (вероятно IO или блокировка)." }
        },
        {
          "label": { "en": "Root cause", "ru": "Корневая причина" },
          "prompt": { "en": "EXPLAIN shows a 6-way nested loop with a 10000× row-estimate error on join #3. Why did it happen?", "ru": "EXPLAIN показывает 6-уровневый nested loop с ошибкой оценки строк в 10000× на join #3. Почему так вышло?" },
          "reveal": { "en": "Correlated columns across the joined tables broke the planner's independence assumption, so the estimate collapsed to ~1 row and it chained nested loops. The genuine row count is huge → each loop re-probes millions of rows.", "ru": "Коррелированные колонки между таблицами сломали предположение планировщика о независимости, оценка схлопнулась до ~1 строки, и он сцепил nested loop'ы. Реальное число строк огромно → каждый loop заново probe'ит миллионы строк." }
        },
        {
          "label": { "en": "Fix", "ru": "Фикс" },
          "prompt": { "en": "What stops the bleeding right now, and what fixes it properly?", "ru": "Что останавливает кровотечение прямо сейчас и что чинит это по-настоящему?" },
          "reveal": { "en": "Stop the bleeding: kill the running statements (<code>pg_terminate_backend</code>) and revert/disable the report. Proper fix: add <code>CREATE STATISTICS</code> (extended/ndistinct + dependencies) on the correlated columns so the planner estimates the join correctly, then re-test the plan.", "ru": "Останови кровотечение: убей выполняющиеся запросы (<code>pg_terminate_backend</code>) и откати/выключи отчёт. Правильный фикс: добавь <code>CREATE STATISTICS</code> (extended/ndistinct + dependencies) на коррелированные колонки, чтобы планировщик оценивал join верно, затем перепроверь план." }
        },
        {
          "label": { "en": "Prevent", "ru": "Профилактика" },
          "prompt": { "en": "What process change keeps this from recurring?", "ru": "Какое изменение процесса не даст этому повториться?" },
          "reveal": { "en": "Add an EXPLAIN (ANALYZE, BUFFERS) gate in CI for new report queries against a prod-sized snapshot, and a statement_timeout on the reporting role so a bad plan can never saturate the pool again.", "ru": "Добавь в CI проверку EXPLAIN (ANALYZE, BUFFERS) для новых отчётных запросов на снапшоте размером с прод и statement_timeout на роль отчётов, чтобы плохой план больше никогда не насыщал пул." }
        }
      ]
    },
    {
      "id": "design-join-strategy",
      "type": "design",
      "difficulty": "stretch",
      "estMin": 12,
      "title": { "en": "Design the join strategy for a star-schema report", "ru": "Спроектируй стратегию join для отчёта по star-схеме" },
      "prompt": { "en": "Given the constraints, decide join order, physical joins, and supporting statistics/indexes. Self-grade against the rubric.", "ru": "С учётом ограничений выбери порядок join, физические join и поддерживающую статистику/индексы. Оцени себя по рубрике." },
      "constraints": { "en": "Fact table: 500M rows. 4 dimension tables: 10k–2M rows. Report filters on 2 dimensions and aggregates. Read replica, work_mem=64MB, p95 budget 800ms.", "ru": "Таблица фактов: 500M строк. 4 таблицы измерений: 10k–2M строк. Отчёт фильтрует по 2 измерениям и агрегирует. Read replica, work_mem=64MB, бюджет p95 800ms." },
      "rubric": [
        { "en": "Filters the fact table via the most selective dimension first (smallest result set early).", "ru": "Фильтрует таблицу фактов через самое селективное измерение первым (малый набор раньше)." },
        { "en": "Chooses hash joins for large unsorted dimension joins, justifies work_mem fit or batching.", "ru": "Выбирает hash join для крупных несортированных join измерений, обосновывает влезание в work_mem или батчинг." },
        { "en": "Adds covering/partial indexes on the filtered dimension keys and CREATE STATISTICS on correlated dims.", "ru": "Добавляет covering/partial индексы на ключи фильтруемых измерений и CREATE STATISTICS на коррелированные измерения." }
      ],
      "model": { "en": "Drive from the most selective dimension → semi-join / hash-probe into the fact table to shrink it before the other joins; hash-join the remaining small dimensions (they fit in 64MB); pre-aggregate. Support with a partial index on the fact table's selective dimension FK and extended statistics on the two correlated dimensions.", "ru": "Стартуй от самого селективного измерения → semi-join / hash-probe в таблицу фактов, чтобы сжать её до остальных join; hash-join оставшихся малых измерений (влезают в 64MB); предагрегируй. Поддержи partial-индексом на FK селективного измерения в таблице фактов и extended statistics на двух коррелированных измерениях." }
    }
  ]
}
```

- [ ] **Step 3: Build and verify the file validates + renders**

Run: `bun run build` then read `dist/lint-report.json`.
Expected: `errors` empty. The `practice-count` warning for `databases/03-execution-plans/03-join-algorithms` is now GONE (the file has 5 tasks). All `practice-parity` / `practice-lessonkey` checks pass.

- [ ] **Step 4: Browser check**

Run: `bun run dev`, open `http://localhost:4321/en/learn/databases/03-execution-plans/03-join-algorithms/` and the `/ru/` twin. Verify:
- A "Practice" section renders after the lesson body with 5 collapsed cards (difficulty chip + min).
- Open each: predict reveals; diagnose blanks accept correct answers and show hints on wrong; fix reveals model + rubric checkboxes; incident steps reveal one by one; design shows constraints + rubric + model.
- Reload: cards you opened/answered keep nothing visual (progress is internal), but `localStorage` key `atlas.practice.databases/03-execution-plans/03-join-algorithms` exists (check DevTools → Application).

- [ ] **Step 5: Commit**

```bash
git add src/content/practice/databases/03-execution-plans/03-join-algorithms.json
git commit -m "content(practice): reference task set for databases/03-execution-plans/03-join-algorithms"
```

---

# PHASE P3 — Runtime sandboxes (PGlite + QuickJS)

Add real in-browser execution for `sandbox` and `fix`-exec tasks. WASM is lazy-imported inside `PracticeSection` (code-split), so the page still has +1 island.

---

### Task 8: Install runtimes + verify APIs

**Files:**
- Modify: `site/package.json` (deps)

- [ ] **Step 1: Confirm the current PGlite + QuickJS APIs via context7**

Per the repo's library rule, before writing runtime code: `context7:resolve-library-id` then `query-docs` for **`@electric-sql/pglite`** (topic: "create in-memory database, run query, EXPLAIN, get rows") and **`quickjs-emscripten`** (topic: "evaluate code in sandbox, capture console output, dispose"). Note any signature differences from the code in Task 9/10 and adjust those steps accordingly.

- [ ] **Step 2: Add the dependencies**

Run: `bun add @electric-sql/pglite quickjs-emscripten`
Expected: both appear under `dependencies` in `package.json`.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock 2>/dev/null; git add package.json
git commit -m "build(practice): add pglite + quickjs-emscripten runtimes"
```

---

### Task 9: `SqlSandbox` island (PGlite)

**Files:**
- Create: `src/components/pedagogy/SqlSandbox.tsx`
- Test: `src/components/pedagogy/SqlSandbox.test.tsx` (renders the editor shell; WASM execution is verified in-browser, not in jsdom)

- [ ] **Step 1: Write the failing render test**

Create `src/components/pedagogy/SqlSandbox.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import SqlSandbox from "./SqlSandbox";

describe("SqlSandbox (shell)", () => {
  test("renders an editor seeded with the starter SQL and a Run button", () => {
    const html = render(<SqlSandbox lang="en" setup="CREATE TABLE t(x int);" initialSql="SELECT 1;" />);
    expect(html).toContain("SELECT 1;");
    expect(html).toContain("Run");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/components/pedagogy/SqlSandbox.test.tsx`
Expected: FAIL with "Cannot find module './SqlSandbox'".

- [ ] **Step 3: Implement the island**

Create `src/components/pedagogy/SqlSandbox.tsx`. PGlite is dynamically imported on first run so its WASM is code-split out of the main bundle:

```tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { applyExecCheck, type ExecCheck, type ExecResult } from "~/scripts/practice-grade";

type Props = {
  lang: Locale;
  setup?: string;
  initialSql?: string;
  check?: ExecCheck;
  onResult?: (passed: boolean) => void;
};

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function SqlSandbox({ lang, setup, initialSql, check, onResult }: Props) {
  const [sql, setSql] = useState(initialSql ?? "");
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  const run = async () => {
    setBusy(true); setError(null); setRows(null); setVerdict(null);
    try {
      const { PGlite } = await import("@electric-sql/pglite"); // code-split WASM
      const db = new PGlite();
      if (setup) await db.exec(setup);
      const res = await db.query(sql);
      const out = (res.rows ?? []) as Record<string, unknown>[];
      setRows(out);
      if (check) {
        const r: ExecResult = { rows: out };
        const ok = applyExecCheck(check, r);
        setVerdict(ok); onResult?.(ok);
      }
      await db.close?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (check) {
        const ok = applyExecCheck(check, { error: msg });
        setVerdict(ok); onResult?.(ok);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="rounded-xl border border-rule bg-card-2 p-3">
      <textarea class="font-mono w-full text-xs p-2 rounded border border-gray-300 min-h-[96px]"
        value={sql} onInput={(e) => setSql((e.target as HTMLTextAreaElement).value)} />
      <button type="button" disabled={busy}
        class="mt-2 px-4 py-1.5 rounded-full bg-ink text-white text-sm font-semibold disabled:opacity-50"
        onClick={run}>
        {busy ? tt(lang, "Running…", "Выполняю…") : tt(lang, "Run", "Запустить")}
      </button>
      {error && <pre class="text-xs text-red-600 mt-2 whitespace-pre-wrap">{error}</pre>}
      {rows && (
        <pre class="text-xs mt-2 overflow-x-auto bg-card p-2 rounded">{JSON.stringify(rows, null, 2)}</pre>
      )}
      {verdict !== null && (
        <div class={`text-sm mt-2 font-semibold ${verdict ? "text-ok" : "text-red-600"}`}>
          {verdict ? tt(lang, "✓ passed", "✓ пройдено") : tt(lang, "✗ not yet", "✗ пока нет")}
        </div>
      )}
    </div>
  );
}
```

> If context7 (Task 8) shows a different PGlite call shape (e.g. `db.query` returns a different field than `.rows`, or `EXPLAIN` needs `db.exec`), adjust the `run()` body to match before moving on.

- [ ] **Step 4: Run to verify the shell test passes**

Run: `bun run test src/components/pedagogy/SqlSandbox.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pedagogy/SqlSandbox.tsx src/components/pedagogy/SqlSandbox.test.tsx
git commit -m "feat(practice): SqlSandbox island (PGlite, lazy WASM)"
```

---

### Task 10: `JsSandbox` island (QuickJS)

**Files:**
- Create: `src/components/pedagogy/JsSandbox.tsx`
- Test: `src/components/pedagogy/JsSandbox.test.tsx`

- [ ] **Step 1: Write the failing render test**

Create `src/components/pedagogy/JsSandbox.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import JsSandbox from "./JsSandbox";

describe("JsSandbox (shell)", () => {
  test("renders the editor with starter code and a Run button", () => {
    const html = render(<JsSandbox lang="en" initialCode="console.log(1+1)" />);
    expect(html).toContain("console.log(1+1)");
    expect(html).toContain("Run");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/components/pedagogy/JsSandbox.test.tsx`
Expected: FAIL with "Cannot find module './JsSandbox'".

- [ ] **Step 3: Implement the island**

Create `src/components/pedagogy/JsSandbox.tsx`. QuickJS is dynamically imported on first run (code-split WASM); user `console.log` output is captured via a host function:

```tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { applyExecCheck, type ExecCheck, type ExecResult } from "~/scripts/practice-grade";

type Props = {
  lang: Locale;
  setup?: string;
  initialCode?: string;
  check?: ExecCheck;
  onResult?: (passed: boolean) => void;
};

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function JsSandbox({ lang, setup, initialCode, check, onResult }: Props) {
  const [code, setCode] = useState(initialCode ?? "");
  const [stdout, setStdout] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<boolean | null>(null);

  const run = async () => {
    setBusy(true); setError(null); setStdout(null); setVerdict(null);
    let out = "";
    try {
      const { getQuickJS } = await import("quickjs-emscripten"); // code-split WASM
      const QuickJS = await getQuickJS();
      const vm = QuickJS.newContext();
      // expose console.log → capture
      const logFn = vm.newFunction("log", (...args) => {
        out += args.map((a) => vm.dump(a)).join(" ") + "\n";
      });
      const consoleObj = vm.newObject();
      vm.setProp(consoleObj, "log", logFn);
      vm.setProp(vm.global, "console", consoleObj);
      consoleObj.dispose(); logFn.dispose();

      const program = (setup ? setup + "\n" : "") + code;
      const result = vm.evalCode(program);
      if (result.error) {
        const msg = vm.dump(result.error);
        result.error.dispose();
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      result.value.dispose();
      vm.dispose();
      setStdout(out);
      if (check) {
        const r: ExecResult = { stdout: out };
        const ok = applyExecCheck(check, r);
        setVerdict(ok); onResult?.(ok);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (check) {
        const ok = applyExecCheck(check, { error: msg });
        setVerdict(ok); onResult?.(ok);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="rounded-xl border border-rule bg-card-2 p-3">
      <textarea class="font-mono w-full text-xs p-2 rounded border border-gray-300 min-h-[96px]"
        value={code} onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)} />
      <button type="button" disabled={busy}
        class="mt-2 px-4 py-1.5 rounded-full bg-ink text-white text-sm font-semibold disabled:opacity-50"
        onClick={run}>
        {busy ? tt(lang, "Running…", "Выполняю…") : tt(lang, "Run", "Запустить")}
      </button>
      {error && <pre class="text-xs text-red-600 mt-2 whitespace-pre-wrap">{error}</pre>}
      {stdout && <pre class="text-xs mt-2 overflow-x-auto bg-card p-2 rounded">{stdout}</pre>}
      {verdict !== null && (
        <div class={`text-sm mt-2 font-semibold ${verdict ? "text-ok" : "text-red-600"}`}>
          {verdict ? tt(lang, "✓ passed", "✓ пройдено") : tt(lang, "✗ not yet", "✗ пока нет")}
        </div>
      )}
    </div>
  );
}
```

> If context7 (Task 8) shows a different QuickJS API (e.g. `QuickJSAsyncContext`, or a different dispose contract), adjust `run()` accordingly. The disposal discipline (dispose every handle) is required to avoid leaks.

- [ ] **Step 4: Run to verify the shell test passes**

Run: `bun run test src/components/pedagogy/JsSandbox.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pedagogy/JsSandbox.tsx src/components/pedagogy/JsSandbox.test.tsx
git commit -m "feat(practice): JsSandbox island (QuickJS, lazy WASM)"
```

---

### Task 11: Wire runtimes + parametric registry into `PracticeSection`

Replace the two P1 `return null` branches (`sandbox`, `fix`-exec) with real renderers, lazy-loading the sandboxes and the parametric components.

**Files:**
- Modify: `src/components/pedagogy/PracticeSection.tsx`
- Test: `src/components/pedagogy/PracticeSection.test.tsx` (add sandbox-branch assertions)

- [ ] **Step 1: Add failing assertions for the sandbox branch**

Append to `src/components/pedagogy/PracticeSection.test.tsx`:

```tsx
test("renders a Run control for an sql sandbox task", () => {
  const sandbox = {
    id: "s1", type: "sandbox", difficulty: "apply", estMin: 5,
    title: { en: "Run EXPLAIN", ru: "Запусти EXPLAIN" },
    prompt: { en: "Try it", ru: "Попробуй" },
    runtime: "sql", setup: "CREATE TABLE t(x int);",
  } as unknown as import("~/content.config").PracticeTaskData;
  // The card is collapsed by default; assert the task card marker renders.
  // (data attrs present after expand are browser-only; render uses the top-of-file imports from Task 4.)
  const html = render(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[sandbox]} />);
  expect(html).toContain('data-practice-task="s1"');
});
```

- [ ] **Step 2: Run to verify it passes for the marker (and that nothing crashes)**

Run: `bun run test src/components/pedagogy/PracticeSection.test.tsx`
Expected: the new test PASSES on the marker assertion (the card renders collapsed). If it throws because the switch references a not-yet-imported symbol, that's the failing state to fix in Step 3.

- [ ] **Step 3: Implement the runtime branches**

In `src/components/pedagogy/PracticeSection.tsx`:

Add lazy imports + the parametric map near the top (after the existing imports):

```tsx
import { lazy, Suspense } from "preact/compat";

const SqlSandbox = lazy(() => import("./SqlSandbox"));
const JsSandbox = lazy(() => import("./JsSandbox"));

// name → lazy parametric component (must match PARAMETRIC_COMPONENT_NAMES)
const PARAMETRIC: Record<string, ReturnType<typeof lazy>> = {
  DBLeverSandbox: lazy(() => import("./sandboxes/DBLeverSandbox")),
  RequestBudgetSandbox: lazy(() => import("./sandboxes/RequestBudgetSandbox")),
};
```

Replace the `case "sandbox": return null;` branch with:

```tsx
    case "sandbox": {
      const done = () => setTaskStatus(lessonKey, task.id, "done");
      if (task.runtime === "parametric") {
        const Comp = task.parametric ? PARAMETRIC[task.parametric.component] : undefined;
        if (!Comp) return null;
        return <Suspense fallback={<Loading lang={lang} />}><Comp lang={lang} /></Suspense>;
      }
      if (task.runtime === "sql") {
        return <Suspense fallback={<Loading lang={lang} />}>
          <SqlSandbox lang={lang} setup={task.setup} initialSql="" check={task.expected} onResult={(ok) => ok && done()} />
        </Suspense>;
      }
      return <Suspense fallback={<Loading lang={lang} />}>
        <JsSandbox lang={lang} setup={task.setup} initialCode="" check={task.expected} onResult={(ok) => ok && done()} />
      </Suspense>;
    }
```

Replace the `return null; // fix-exec` line (inside the `case "fix"`) with:

```tsx
      {
        const done = () => setTaskStatus(lessonKey, task.id, "done");
        const common = { lang, setup: task.grading.setup, check: task.grading.check, onResult: (ok: boolean) => ok && done() };
        return (
          <div>
            {task.starter && <pre class="text-xs bg-card-2 p-3 rounded mb-3 overflow-x-auto">{task.starter}</pre>}
            <Suspense fallback={<Loading lang={lang} />}>
              {task.grading.runtime === "sql"
                ? <SqlSandbox {...common} initialSql={task.starter ?? ""} />
                : <JsSandbox {...common} initialCode={task.starter ?? ""} />}
            </Suspense>
          </div>
        );
      }
```

Add a tiny `Loading` helper at the bottom of the file:

```tsx
function Loading({ lang }: { lang: Locale }) {
  return <div class="text-xs text-muted py-3">{tt(lang, "Loading runtime…", "Загружаю среду…")}</div>;
}
```

- [ ] **Step 4: Run the component test**

Run: `bun run test src/components/pedagogy/PracticeSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add a runtime sandbox task to the reference file**

In `src/content/practice/databases/03-execution-plans/03-join-algorithms.json`, **replace** the `predict-join-choice` task (the first entry in the `tasks` array) with this SQL `sandbox` task. This keeps the lesson at exactly 5 tasks (so `practice-count` 3–5 stays satisfied) while adding the runtime sandbox acceptance #3 requires. The predict intent is preserved — the sandbox prompt asks the learner to predict the join before running:

```json
{
  "id": "sandbox-explain-live",
  "type": "sandbox",
  "difficulty": "apply",
  "estMin": 6,
  "title": { "en": "Run EXPLAIN on a real join, in your browser", "ru": "Запусти EXPLAIN на реальном join прямо в браузере" },
  "prompt": { "en": "The schema is seeded. Run the query, then wrap it in EXPLAIN. Confirm the planner picks the join you predicted.", "ru": "Схема засеяна. Запусти запрос, затем оберни его в EXPLAIN. Подтверди, что планировщик выбрал предсказанный join." },
  "runtime": "sql",
  "setup": "CREATE TABLE customers(id int primary key, country text); CREATE TABLE orders(id int primary key, customer_id int); INSERT INTO customers SELECT g, CASE WHEN g % 50 = 0 THEN 'DE' ELSE 'US' END FROM generate_series(1,5000) g; INSERT INTO orders SELECT g, (g % 5000)+1 FROM generate_series(1,50000) g; CREATE INDEX ON orders(customer_id);",
  "expected": { "kind": "no-error" }
}
```

> Decision: keep the lesson at **5 tasks** by replacing `predict-join-choice` with `sandbox-explain-live`. The predict intent is preserved (the sandbox prompt asks the learner to predict before running). This satisfies acceptance #3 (≥1 runtime sandbox) while honoring `practice-count` 3–5.

- [ ] **Step 6: Build + browser verify the runtime**

Run: `bun run build`, read `dist/lint-report.json` → `errors` empty.
Then `bun run dev` → open the join-algorithms lesson, expand the sandbox task, click **Run**. Expected: PGlite loads (a network chunk fetch), the query returns rows; wrapping in `EXPLAIN` returns a plan; the verdict shows ✓ (no-error).

- [ ] **Step 7: Verify WASM is code-split**

Run: `bun run build` then inspect the build output dir: `ls -la dist/_astro | grep -iE "pglite|quickjs|wasm"`.
Expected: separate hashed chunk(s) for PGlite/QuickJS WASM — NOT bundled into the main entry chunk. (If they are in the main chunk, the dynamic `import()` was tree-shaken wrong — re-check that the imports are inside `run()`/`lazy()`, not top-level.)

- [ ] **Step 8: Commit**

```bash
git add src/components/pedagogy/PracticeSection.tsx src/components/pedagogy/PracticeSection.test.tsx src/content/practice/databases/03-execution-plans/03-join-algorithms.json
git commit -m "feat(practice): wire SQL/JS/parametric runtimes into PracticeSection + add live EXPLAIN sandbox"
```

---

# PHASE P4 — Projects page

A `projects` collection + a `/[lang]/projects` route with a client-side track/difficulty filter and 6–8 seed projects.

---

### Task 12: `projects` collection + schema

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/content/projects/.gitkeep`
- Test: `src/content/projects-schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

Create `src/content/projects-schema.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { z } from "astro/zod";
import { TRACKS } from "./types";

const Track = z.enum(TRACKS as [string, ...string[]]);
const BiText = z.object({ en: z.string().min(1), ru: z.string().min(1) });
const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: BiText, pitch: BiText,
  tracks: z.array(Track).min(1),
  difficulty: z.enum(["starter", "intermediate", "advanced"]),
  estDays: z.number().int().positive(),
  skills: z.array(z.string()).min(1),
  deliverable: BiText,
  milestones: z.array(BiText).min(2),
  seniorStretch: z.array(BiText).min(1),
});

const valid = {
  slug: "url-shortener", title: { en: "URL shortener", ru: "Сокращатель ссылок" },
  pitch: { en: "Build a URL shortener", ru: "Собери сокращатель" },
  tracks: ["databases", "backend"], difficulty: "starter", estDays: 3,
  skills: ["hashing", "indexing"],
  deliverable: { en: "A running service", ru: "Работающий сервис" },
  milestones: [{ en: "schema", ru: "схема" }, { en: "api", ru: "апи" }],
  seniorStretch: [{ en: "add rate limiting", ru: "добавь rate limiting" }],
};

describe("projects schema", () => {
  test("accepts a valid project", () => { expect(() => schema.parse(valid)).not.toThrow(); });
  test("rejects fewer than 2 milestones", () => { expect(() => schema.parse({ ...valid, milestones: [{ en: "x", ru: "х" }] })).toThrow(); });
  test("rejects an unknown track", () => { expect(() => schema.parse({ ...valid, tracks: ["nope"] })).toThrow(); });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/content/projects-schema.test.ts`
Expected: tests run (self-contained, may pass — they lock the shape). Proceed.

- [ ] **Step 3: Add the collection to `content.config.ts`**

Insert after the `practice` collection (before the `export type PracticeTaskData` line is fine; keep exports together):

```ts
const ProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: BiText,
  pitch: BiText,
  tracks: z.array(Track).min(1),
  difficulty: z.enum(["starter", "intermediate", "advanced"]),
  estDays: z.number().int().positive(),
  skills: z.array(z.string()).min(1),
  deliverable: BiText,
  milestones: z.array(BiText).min(2),
  seniorStretch: z.array(BiText).min(1),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/projects" }),
  schema: ProjectSchema,
});

export type ProjectData = z.infer<typeof ProjectSchema>;
```

Update the collections export:

```ts
export const collections = { tracks, units, lessons, practice, projects };
```

- [ ] **Step 4: Create the glob base dir**

Create `src/content/projects/.gitkeep`:

```
# keep this dir; <slug>.json project files live here
```

- [ ] **Step 5: Build + test**

Run: `bun run build` then read `dist/lint-report.json` → `errors` empty.
Run: `bun run test src/content/projects-schema.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/content/projects/.gitkeep src/content/projects-schema.test.ts
git commit -m "feat(projects): add projects content collection + schema"
```

---

### Task 13: Projects filter island + route + seed data

**Files:**
- Create: `src/components/projects/ProjectsFilter.tsx`
- Create: `src/pages/[lang]/projects.astro`
- Create: 6 seed files under `src/content/projects/`
- Test: `src/components/projects/ProjectsFilter.test.tsx`

- [ ] **Step 1: Write the failing filter test**

Create `src/components/projects/ProjectsFilter.test.tsx`:

```tsx
import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import ProjectsFilter, { filterProjects } from "./ProjectsFilter";
import type { ProjectData } from "~/content.config";

const p = (slug: string, tracks: string[], difficulty: ProjectData["difficulty"]): ProjectData => ({
  slug, tracks, difficulty, estDays: 3, skills: ["x"],
  title: { en: slug, ru: slug }, pitch: { en: "p", ru: "п" },
  deliverable: { en: "d", ru: "д" },
  milestones: [{ en: "m1", ru: "м1" }, { en: "m2", ru: "м2" }],
  seniorStretch: [{ en: "s", ru: "с" }],
} as ProjectData);

const all = [p("a", ["databases"], "starter"), p("b", ["backend"], "advanced"), p("c", ["databases", "backend"], "intermediate")];

describe("filterProjects", () => {
  test("returns all when no filter", () => { expect(filterProjects(all, "all", "all").length).toBe(3); });
  test("filters by track", () => { expect(filterProjects(all, "databases", "all").map((x) => x.slug)).toEqual(["a", "c"]); });
  test("filters by difficulty", () => { expect(filterProjects(all, "all", "advanced").map((x) => x.slug)).toEqual(["b"]); });
  test("filters by both", () => { expect(filterProjects(all, "backend", "intermediate").map((x) => x.slug)).toEqual(["c"]); });
});

describe("ProjectsFilter render", () => {
  test("renders every project title", () => {
    const html = render(<ProjectsFilter lang="en" projects={all} />);
    expect(html).toContain(">a<");
    expect(html).toContain(">b<");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/components/projects/ProjectsFilter.test.tsx`
Expected: FAIL with "Cannot find module './ProjectsFilter'".

- [ ] **Step 3: Implement the filter island**

Create `src/components/projects/ProjectsFilter.tsx`:

```tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { ProjectData } from "~/content.config";

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export function filterProjects(projects: ProjectData[], track: string, difficulty: string): ProjectData[] {
  return projects.filter(
    (p) => (track === "all" || p.tracks.includes(track)) && (difficulty === "all" || p.difficulty === difficulty)
  );
}

type Props = { lang: Locale; projects: ProjectData[] };

export default function ProjectsFilter({ lang, projects }: Props) {
  const [track, setTrack] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const tracks = Array.from(new Set(projects.flatMap((p) => p.tracks))).sort();
  const shown = filterProjects(projects, track, difficulty);

  return (
    <div>
      <div class="flex flex-wrap gap-3 mb-6">
        <select class="text-sm border border-rule rounded px-2 py-1 bg-card" value={track} onChange={(e) => setTrack((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All tracks", "Все треки")}</option>
          {tracks.map((tr) => <option value={tr} key={tr}>{tr}</option>)}
        </select>
        <select class="text-sm border border-rule rounded px-2 py-1 bg-card" value={difficulty} onChange={(e) => setDifficulty((e.target as HTMLSelectElement).value)}>
          <option value="all">{tt(lang, "All levels", "Все уровни")}</option>
          {["starter", "intermediate", "advanced"].map((d) => <option value={d} key={d}>{d}</option>)}
        </select>
      </div>
      <ul class="grid gap-4 md:grid-cols-2">
        {shown.map((p) => (
          <li key={p.slug} class="rounded-2xl border-2 border-rule bg-card p-5">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h3 class="font-bold text-ink">{tt(lang, p.title.en, p.title.ru)}</h3>
              <span class="text-[10px] font-mono uppercase tracking-wide text-muted">{p.difficulty} · {p.estDays}d</span>
            </div>
            <p class="text-sm text-muted mb-2">{tt(lang, p.pitch.en, p.pitch.ru)}</p>
            <div class="flex flex-wrap gap-1 mb-2">
              {p.tracks.map((tr) => <span key={tr} class="text-[10px] font-mono px-2 py-0.5 rounded-full border border-rule text-muted">{tr}</span>)}
            </div>
            <button type="button" class="text-sm text-ok font-semibold" onClick={() => setOpen(open === p.slug ? null : p.slug)}>
              {open === p.slug ? tt(lang, "Hide", "Скрыть") : tt(lang, "Details", "Подробнее")}
            </button>
            {open === p.slug && (
              <div class="mt-3 space-y-3 text-sm">
                <div>
                  <div class="text-[10px] font-mono uppercase text-muted mb-1">{tt(lang, "Deliverable", "Результат")}</div>
                  <div>{tt(lang, p.deliverable.en, p.deliverable.ru)}</div>
                </div>
                <div>
                  <div class="text-[10px] font-mono uppercase text-muted mb-1">{tt(lang, "Milestones", "Этапы")}</div>
                  <ol class="list-decimal pl-5 space-y-1">{p.milestones.map((m, i) => <li key={i}>{tt(lang, m.en, m.ru)}</li>)}</ol>
                </div>
                <div>
                  <div class="text-[10px] font-mono uppercase text-muted mb-1">{tt(lang, "Make it senior", "Сделай по-сеньорски")}</div>
                  <ul class="list-disc pl-5 space-y-1">{p.seniorStretch.map((s, i) => <li key={i}>{tt(lang, s.en, s.ru)}</li>)}</ul>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/components/projects/ProjectsFilter.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the route**

Create `src/pages/[lang]/projects.astro` (mirrors the `getStaticPaths` + Atlas-layout pattern of `src/pages/[lang]/index.astro`):

```astro
---
import Atlas from "~/layouts/Atlas.astro";
import World from "~/components/atlas/World.astro";
import ProjectsFilter from "~/components/projects/ProjectsFilter.tsx";
import { getCollection } from "astro:content";
import { t, isLocale, type Locale } from "~/i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error(`Unknown locale: ${lang}`);

const projects = (await getCollection("projects")).map((p) => p.data);
---

<Atlas title={t("projects.title", lang)} lang={lang}>
  <World parallax={false} />
  <main class="projects">
    <header class="head">
      <p class="kicker">{t("projects.kicker", lang)}</p>
      <h1 class="title">{t("projects.title", lang)}</h1>
      <p class="crux">{t("projects.crux", lang)}</p>
    </header>
    <ProjectsFilter client:visible lang={lang} projects={projects} />
  </main>
</Atlas>

<style>
  .projects { position: relative; z-index: 2; max-width: 920px; margin: 0 auto; padding: 0 32px 80px; }
  .head { padding: 56px 0 28px; }
  .kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #62667f; margin: 0 0 18px; }
  .title { font-size: clamp(34px, 6vw, 52px); line-height: 1.06; letter-spacing: -0.02em; color: #e9eaf2; }
  .crux { font-family: var(--font-display); font-size: 18px; line-height: 1.5; color: #9499b4; margin: 16px 0 0; max-width: 34em; }
  @media (max-width: 660px) { .projects { padding: 0 20px 60px; } .head { padding: 36px 0 24px; } }
</style>
```

- [ ] **Step 6: Add the UI strings**

In `src/i18n/ui.json`, add these keys to BOTH the `en` and `ru` objects:

```json
"projects.title": "Projects",
"projects.kicker": "Build something real",
"projects.crux": "Non-template builds that exercise what you've learned. Pick one, ship it, then push it to senior."
```

RU values:

```json
"projects.title": "Проекты",
"projects.kicker": "Собери что-то настоящее",
"projects.crux": "Нешаблонные проекты, которые прокачивают изученное. Выбери один, доведи до конца, затем подними до сеньорского уровня."
```

- [ ] **Step 7: Create 6 seed projects**

Create six files under `src/content/projects/`. Each must satisfy the schema (≥2 milestones, ≥1 seniorStretch, ≥1 track, both langs). Below is one complete example; create five more covering varied tracks (`databases`, `backend`, `apis`, `caching`, `queues`, `distributed`, `observability`, `security`) and difficulties:

`src/content/projects/query-plan-visualizer.json`:

```json
{
  "slug": "query-plan-visualizer",
  "title": { "en": "Query plan visualizer", "ru": "Визуализатор планов запросов" },
  "pitch": { "en": "Paste an EXPLAIN (ANALYZE, FORMAT JSON) and render the plan tree with per-node timing and row-estimate error, so a bad join jumps out visually.", "ru": "Вставь EXPLAIN (ANALYZE, FORMAT JSON) и отрисуй дерево плана с таймингом по узлам и ошибкой оценки строк, чтобы плохой join был виден сразу." },
  "tracks": ["databases"],
  "difficulty": "intermediate",
  "estDays": 5,
  "skills": ["EXPLAIN JSON parsing", "tree layout", "estimate-vs-actual diffing"],
  "deliverable": { "en": "A web app that turns EXPLAIN JSON into an annotated, collapsible plan tree highlighting the worst node.", "ru": "Веб-приложение, превращающее EXPLAIN JSON в аннотированное сворачиваемое дерево плана с подсветкой худшего узла." },
  "milestones": [
    { "en": "Parse EXPLAIN JSON into a node tree.", "ru": "Распарси EXPLAIN JSON в дерево узлов." },
    { "en": "Render the tree with per-node actual vs planned rows.", "ru": "Отрисуй дерево с actual vs planned по каждому узлу." },
    { "en": "Highlight the node with the largest estimate error and the largest self-time.", "ru": "Подсветь узел с самой большой ошибкой оценки и самым большим self-time." }
  ],
  "seniorStretch": [
    { "en": "Detect spilled hash/sort nodes (Batches > 1) and suggest a work_mem target.", "ru": "Определи проливающиеся hash/sort узлы (Batches > 1) и предложи целевой work_mem." },
    { "en": "Diff two plans (before/after a fix) side by side.", "ru": "Сравни два плана (до/после фикса) рядом." }
  ]
}
```

Create five more in the same shape (vary `tracks`/`difficulty`): e.g. `rate-limiter.json` (apis/backend, intermediate), `write-ahead-log.json` (databases/distributed, advanced), `cache-stampede-lab.json` (caching, intermediate), `at-least-once-queue.json` (queues/distributed, advanced), `oauth-mini.json` (security/apis, starter). Each needs ≥2 milestones + ≥1 seniorStretch, both langs.

- [ ] **Step 8: Build + browser verify**

Run: `bun run build`, read `dist/lint-report.json` → `errors` empty; confirm page count increased by 2 (`/en/projects`, `/ru/projects`).
Run: `bun run dev` → open `/en/projects` and `/ru/projects`. Verify the grid renders ≥6 cards, the track + difficulty filters narrow the list, and a card expands to pitch/milestones/seniorStretch.

- [ ] **Step 9: Commit**

```bash
git add src/components/projects/ProjectsFilter.tsx src/components/projects/ProjectsFilter.test.tsx "src/pages/[lang]/projects.astro" src/i18n/ui.json src/content/projects/
git commit -m "feat(projects): /[lang]/projects page with track/difficulty filter + 6 seed projects"
```

- [ ] **Step 10: Link the page from nav (optional, if a nav exists)**

Check `src/components/atlas/` / layout headers for the learn nav. If there is a central nav list, add a `Projects` link to `/${lang}/projects/`. If there is no obvious single nav source, skip and note it — do not scatter the link across files.

---

# PHASE P5 — Authoring command + fill the reference unit

---

### Task 14: `/practice` authoring command

**Files:**
- Create: `.claude/commands/practice.md`

- [ ] **Step 1: Read the sibling command to match house style**

Run: `cat .claude/commands/infographic.md` (and `.claude/commands/teach.md` if present) to match the front-matter, tone, and pipeline structure.

- [ ] **Step 2: Write the command**

Create `.claude/commands/practice.md`. Concrete content (adapt the header block to match `infographic.md`'s exact frontmatter keys discovered in Step 1):

```markdown
---
description: Author a practice task set (3–5 tasks, EN+RU) for one lesson.
argument-hint: <track>/<unit>/<lesson>
---

# /practice <track>/<unit>/<lesson>

Author a single bilingual practice file for one lesson. EN+RU in one JSON, or refuse.

Input: `$ARGUMENTS` (e.g. `databases/03-execution-plans/04-statistics-and-analyze`).

## Pipeline

1. **Locate the lesson.** Confirm `site/src/content/lessons/en/$ARGUMENTS/index.mdx` AND the `ru` twin exist and are `status: ready`. If not, refuse.
2. **Mine the lesson.** Read both langs; extract `concepts`, `level`, the failure modes, and concrete numbers. The tasks must hit the SAME mechanisms the lesson teaches.
3. **Design 3–5 tasks** as a `recall → apply → stretch` ladder. At least one must be generative (`fix`/`design`) or hands-on (`sandbox`/`incident`) — not pure recognition. Allowed types: `predict`, `diagnose`, `fix`, `sandbox`, `incident`, `design` (schema in `site/src/content.config.ts`).
4. **Author both languages** in one file at `site/src/content/practice/$ARGUMENTS.json`. Use `site/src/i18n/glossary.json` for locked RU terms; add new terms alphabetically. Prose fields are pre-escaped HTML strings.
5. **Validate.** From `site/`: `bun run build`, then read `dist/lint-report.json` — `errors` must be empty, and the `practice-count` warning for this lesson must be gone. Confirm `practice-parity` (no `en===ru` prose, no whitespace-only) and `practice-lessonkey` pass.
6. **Stop.** Do not commit unless asked.

## Rules

- Bilingual or refuse.
- 3–5 tasks; unique `id` per task (`^[a-z0-9-]+$`).
- `incident` tasks: 3–6 staged steps (triage → root cause → fix → prevent).
- `sandbox`/`fix`-exec runtimes: `sql` (PGlite) or `js` (QuickJS); `parametric` must name a component in `site/src/components/pedagogy/parametric-registry.ts`.
- Never edit the lesson MDX. Practice is additive — one file, no core changes.
```

- [ ] **Step 3: Smoke-test the command on one lesson**

Invoke `/practice databases/03-execution-plans/04-statistics-and-analyze`. Verify it produces a valid file and `bun run build` → `dist/lint-report.json` `errors` empty, with the `practice-count` warning for that lesson gone.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/practice.md
git commit -m "feat(practice): /practice authoring command"
```

---

### Task 15: Fill the reference unit (acceptance #3) + flip it to error

Complete practice files for the remaining 6 lessons of `databases/03-execution-plans` via `/practice`, then add the track to the error allowlist for this unit's lessons.

**Files:**
- Create: `src/content/practice/databases/03-execution-plans/0{1,2,4,5,6,7}-*.json` (via `/practice`)
- Modify: `src/lint/rules/practice.ts` (optionally extend `PRACTICE_REQUIRED_TRACKS`)

- [ ] **Step 1: Author the 6 remaining lessons**

Run `/practice` for each: `01-explain-and-plans`, `02-scan-types`, `04-statistics-and-analyze`, `05-extended-statistics`, `06-plan-cache-and-tuning`, `07-plan-stability` (all under `databases/03-execution-plans/`). Each yields a 3–5 task file.

- [ ] **Step 2: Build — the unit's practice-count warnings should be gone**

Run: `bun run build`, read `dist/lint-report.json`. Expected: no `practice-count` warnings remain for any `databases/03-execution-plans/*` lesson; `errors` empty.

- [ ] **Step 3: (Optional) flip the track to error**

Only do this once EVERY ready `databases` lesson has a practice file (not just this unit) — otherwise the build breaks on the rest of the track. Since only one unit is filled, **leave `PRACTICE_REQUIRED_TRACKS` empty** and instead document the flip path in a comment. Skip the code change for this deliverable; the allowlist mechanism is already in place from P1.

- [ ] **Step 4: Browser verify the unit**

`bun run dev` → spot-check 2–3 of the newly authored lessons render their practice section in both langs.

- [ ] **Step 5: Commit**

```bash
git add src/content/practice/databases/03-execution-plans/
git commit -m "content(practice): complete task sets for the execution-plans unit"
```

---

## Final acceptance pass

- [ ] `bun run build` → `dist/lint-report.json` `errors` empty (practice-count warnings allowed for unfilled lessons).
- [ ] `bun run test` → full suite green.
- [ ] Browser: `/en/learn/databases/03-execution-plans/03-join-algorithms/` + RU twin — every task type works, the live `EXPLAIN` sandbox runs, progress persists (localStorage key present after reload).
- [ ] Browser: `/en/projects` + `/ru/projects` — ≥6 cards, working track/difficulty filter, card expands.
- [ ] A practice-less lesson (any `math` lesson) renders identically to before.
- [ ] `dist/_astro` shows PGlite/QuickJS WASM as separate code-split chunks.
- [ ] Each lesson page has exactly one `data-practice-layer` and the PracticeSection island is `client="visible"`.

---

## Notes / decisions surfaced for the user

1. **i18n-parity consolidation (Task 2):** the spec's "repoint i18n-parity to lessons/" overlapped an existing, working `checkLessonParity` that already scans `lessons/`. To avoid two identical rules, this plan repoints `i18n-parity` AND removes the duplicate. Net: one lesson-parity rule named `i18n-parity`, scanning `lessons/` (criterion 7 satisfied), no duplicate error output.
2. **Reference unit scope (Tasks 7, 15):** the worked reference file (`03-join-algorithms`) is authored by hand (concrete in this plan); the unit's other 6 lessons are filled via the `/practice` command in P5 — that command is the no-placeholder mechanism for bulk bilingual content. Acceptance #3 ("3–5 tasks on each lesson of the unit") is met after Task 15.
3. **predict→sandbox swap (Task 11 Step 5):** to include a runtime sandbox while keeping the lesson at 3–5 tasks, the `predict` task is replaced by an SQL `sandbox` task that preserves the predict-then-run intent. Adjust if you'd rather allow 6 tasks (schema permits ≤8, but `practice-count` warns >5).
4. **Non-runtime types rendered inline, not via the reuse widgets (Task 4):** spec §C lists `FadedExample` / `DesignPrompt` / `DebugLog` / `TraceScenario` as the renderers for blanks/design/incident. Three of those are `.astro` components, which cannot mount inside a Preact island — and `PracticeSection` must be one island to keep the +1 hydration budget. So the plan renders all non-runtime types inline inside `PracticeSection` (small `Blanks`/`Reveal`/`Incident`/`Rubric` sub-components). Only the parametric sandboxes (already Preact) and the two new runtimes are mounted lazily. Net effect on the budget is unchanged; the reuse is at the pattern level, not the component level.
```
