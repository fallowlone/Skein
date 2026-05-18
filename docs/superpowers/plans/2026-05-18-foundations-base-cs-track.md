# Base CS Foundations Track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `base-cs` track — the third `foundations` track, the open atlas spine rung between Mathematics and Algorithms — with two lesson skeletons, a `track`-branched linter, the `MachineFigure` widget, and Unit 01 authored EN+RU as the proof.

**Architecture:** `base-cs` is a new track inside the existing `lessons` content collection, mirroring how the algorithms track was added. No new collection, route, or layout. New: a `Track` enum value, `tracks.json` / `units.json` entries, a `lessonType` schema field, two skeletons validated by a `track`- then `lessonType`-branched linter, one new static widget, and a `/teach` domain-lock change.

**Tech Stack:** Astro 5, Preact islands, TypeScript, Tailwind, Vitest (linter rules), Zod (content schema). Build + lint: `bun run build` in `site/`.

**Spec:** `docs/superpowers/specs/2026-05-18-foundations-base-cs-track-design.md`

---

## File Structure

**Modified:**
- `site/src/types/index.ts` — add `"base-cs"` to the `Track` type and `TRACKS` array.
- `site/src/content/tracks.json` — add the `base-cs` track entry; shift `algorithms` to `order: 3`.
- `site/src/content/units.json` — add 12 `base-cs` unit entries.
- `site/src/content/config.ts` — add the optional `lessonType` field to the `lessons` schema.
- `site/src/pages/[lang]/learn/[track]/[lesson].astro` — pass `lessonType` to the layout.
- `site/src/layouts/Lesson.astro` — accept `lessonType`, emit `data-lesson-type`.
- `site/src/lint/rules/lessons.ts` — add the `base-cs` branch and `checkBaseCsLesson`.
- `site/src/lint/rules/lessons.test.ts` — add `base-cs` linter tests.
- `.claude/commands/teach.md` — extend the domain lock to `base-cs`.
- `CLAUDE.md` — extend the `/teach` description to mention `base-cs`.

**Created:**
- `site/src/components/algo/MachineFigure.astro` — static machine-model figure widget.
- `site/src/content/lessons/{en,ru}/base-cs/01-what-a-computer-is/<lesson>/index.mdx` — Unit 01 lessons (10 files, via `/teach`).

**Reused unchanged:** `lessons` collection, `Lesson.astro` chrome, the `/learn` routes, the `lesson/` skeleton components (`Hook`, `Goal`, `Idea`, `Code`, `Trace`, `Step`, `WorkedExample`, `Check`, `Recap`, `Inset`), the `algo/` widgets (`AnnotatedCode`, `AlgoTrace`, `AlgoPractice`, `StructureFigure`, `MathRecall`), `Quiz`, the `lesson.*` i18n keys.

---

## Task 1: Register the `base-cs` track

**Files:**
- Modify: `site/src/types/index.ts:21-23`
- Modify: `site/src/content/tracks.json`
- Modify: `site/src/content/units.json`

- [ ] **Step 1: Add `base-cs` to the `Track` type and `TRACKS` array**

In `site/src/types/index.ts`, replace lines 21 and 23:

```ts
export type Track = "math" | "algorithms" | "base-cs";
```

```ts
export const TRACKS: Track[] = ["math", "algorithms", "base-cs"];
```

- [ ] **Step 2: Add the `base-cs` entry to `tracks.json` and shift `algorithms`**

In `site/src/content/tracks.json`, change the `algorithms` object's `"order": 2` to `"order": 3`, then append a third object (the array currently holds `math` then `algorithms`):

```json
  { "slug": "base-cs", "order": 2, "color": "peach",
    "title": { "en": "Base CS from zero", "ru": "Базовый CS с нуля" },
    "blurb": {
      "en": "Start with no CS theory. Finish understanding how a computer runs your code and what every programming construct really means.",
      "ru": "Начни без теории CS. Закончи, понимая, как компьютер исполняет твой код и что на самом деле значит каждая программная конструкция."
    } }
```

The `color` value must be one of the `tracks` schema enum (`lilac | mint | peach | sky | rose`); `math` uses `mint`, `algorithms` uses `sky`, so `base-cs` takes `peach`.

- [ ] **Step 3: Add the 12 `base-cs` units to `units.json`**

In `site/src/content/units.json`, append these 12 objects to the array (after the last `algorithms` unit). Unit 01's `lessons` array is filled; units 02–12 use empty arrays (the same pattern as algorithms units 10–12), filled in later phases:

```json
  { "slug": "01-what-a-computer-is", "track": "base-cs", "order": 1,
    "title": { "en": "What a computer is", "ru": "Что такое компьютер" },
    "crux": {
      "en": "A computer stores everything as bits and is built from two-state switches.",
      "ru": "Компьютер хранит всё битами и собран из двухпозиционных переключателей."
    },
    "lessons": ["01-bits-and-binary", "02-counting-in-binary", "03-encoding-the-world", "04-boolean-logic", "05-logic-gates"] },
  { "slug": "02-memory", "track": "base-cs", "order": 2,
    "title": { "en": "Memory", "ru": "Память" },
    "crux": {
      "en": "Memory is a long row of numbered cells; an address is the number, a value is what sits there.",
      "ru": "Память — длинный ряд пронумерованных ячеек; адрес — номер, значение — то, что в ячейке."
    },
    "lessons": [] },
  { "slug": "03-the-processor", "track": "base-cs", "order": 3,
    "title": { "en": "The processor", "ru": "Процессор" },
    "crux": {
      "en": "The CPU repeats one loop forever: fetch an instruction, decode it, execute it.",
      "ru": "CPU вечно повторяет один цикл: достать инструкцию, расшифровать, исполнить."
    },
    "lessons": [] },
  { "slug": "04-machine-code-to-language", "track": "base-cs", "order": 4,
    "title": { "en": "From machine code to a language", "ru": "От машинного кода к языку" },
    "crux": {
      "en": "High-level code is translated — compiled or interpreted — into the instructions the CPU runs.",
      "ru": "Высокоуровневый код переводится — компиляцией или интерпретацией — в инструкции, которые исполняет CPU."
    },
    "lessons": [] },
  { "slug": "05-values-and-types", "track": "base-cs", "order": 5,
    "title": { "en": "Values and types", "ru": "Значения и типы" },
    "crux": {
      "en": "Bits mean nothing alone; a type is the rule that says how to read them.",
      "ru": "Биты сами по себе ничего не значат; тип — правило, как их читать."
    },
    "lessons": [] },
  { "slug": "06-variables-and-state", "track": "base-cs", "order": 6,
    "title": { "en": "Variables and state", "ru": "Переменные и состояние" },
    "crux": {
      "en": "A variable is a named memory cell; assignment changes what it holds.",
      "ru": "Переменная — именованная ячейка памяти; присваивание меняет её содержимое."
    },
    "lessons": [] },
  { "slug": "07-control-flow", "track": "base-cs", "order": 7,
    "title": { "en": "Control flow", "ru": "Поток управления" },
    "crux": {
      "en": "Conditionals and loops are the CPU choosing which instruction to run next.",
      "ru": "Ветвления и циклы — это выбор CPU, какую инструкцию исполнить следующей."
    },
    "lessons": [] },
  { "slug": "08-functions-and-the-call-stack", "track": "base-cs", "order": 8,
    "title": { "en": "Functions and the call stack", "ru": "Функции и стек вызовов" },
    "crux": {
      "en": "Every call pushes a frame onto the stack; returning pops it back off.",
      "ru": "Каждый вызов кладёт кадр на стек; возврат снимает его обратно."
    },
    "lessons": [] },
  { "slug": "09-data-in-memory", "track": "base-cs", "order": 9,
    "title": { "en": "Data in memory", "ru": "Данные в памяти" },
    "crux": {
      "en": "Arrays are contiguous cells; objects are labelled cells — both are layouts in memory.",
      "ru": "Массивы — соседние ячейки; объекты — помеченные ячейки — и то и другое раскладка в памяти."
    },
    "lessons": [] },
  { "slug": "10-abstraction", "track": "base-cs", "order": 10,
    "title": { "en": "Abstraction", "ru": "Абстракция" },
    "crux": {
      "en": "Bundling data with the operations on it lets you stop thinking about the machine.",
      "ru": "Связка данных с операциями над ними позволяет перестать думать о машине."
    },
    "lessons": [] },
  { "slug": "11-when-a-program-fails", "track": "base-cs", "order": 11,
    "title": { "en": "When a program fails", "ru": "Когда программа падает" },
    "crux": {
      "en": "An error is the machine reporting it cannot continue; the stack trace says where.",
      "ru": "Ошибка — это сообщение машины, что она не может продолжать; stack trace говорит где."
    },
    "lessons": [] },
  { "slug": "12-time-and-concurrency", "track": "base-cs", "order": 12,
    "title": { "en": "Time and concurrency", "ru": "Время и конкурентность" },
    "crux": {
      "en": "Async exists because the CPU must not sit idle while a slow device answers.",
      "ru": "Async существует, потому что CPU не должен простаивать, пока медленное устройство отвечает."
    },
    "lessons": [] }
```

- [ ] **Step 4: Run the build to verify the track data is valid**

Run: `cd site && bun run build`
Expected: build succeeds. The track now exists with empty/Unit-01 unit data. Unit 01 has no authored lessons yet, so its lessons may 404 — that is fine; the build itself must pass the content-collection schema.

- [ ] **Step 5: Commit**

```bash
git add site/src/types/index.ts site/src/content/tracks.json site/src/content/units.json
git commit -m "feat(base-cs): register the base-cs track and its 12 units"
```

---

## Task 2: Add the `lessonType` field to the `lessons` schema

**Files:**
- Modify: `site/src/content/config.ts:98-113`

- [ ] **Step 1: Add the optional `lessonType` field**

In `site/src/content/config.ts`, inside the `lessons` collection `schema` object, add one line after `status: Status.default("stub"),`:

```ts
    lessonType: z.enum(["concept", "coding"]).optional(),
```

The field is optional globally — `math` and `algorithms` lessons do not set it. The `base-cs` linter (Task 6) requires it on every `base-cs` lesson.

- [ ] **Step 2: Run the build to verify the schema still accepts all existing lessons**

Run: `cd site && bun run build`
Expected: build succeeds. No existing lesson sets `lessonType`; an optional field changes nothing for them.

- [ ] **Step 3: Commit**

```bash
git add site/src/content/config.ts
git commit -m "feat(base-cs): add optional lessonType field to the lessons schema"
```

---

## Task 3: Emit `data-lesson-type` in the lesson layout

The linter works on built HTML. The `base-cs` skeleton check (Task 6) branches on `lessonType`, so the value must reach the HTML. The layout emits it as a `data-lesson-type` attribute.

**Files:**
- Modify: `site/src/layouts/Lesson.astro:1-29`
- Modify: `site/src/pages/[lang]/learn/[track]/[lesson].astro:21-31`

- [ ] **Step 1: Accept `lessonType` in `Lesson.astro` and emit it**

In `site/src/layouts/Lesson.astro`, add `lessonType` to the `Props` type and destructuring, and emit it on the `<article>`. The full updated frontmatter and `<article>` open tag:

```astro
---
import Topic from "./Topic.astro";
import { type Locale } from "../i18n";

type Props = {
  title: string;
  lang: Locale;
  trackSlug: string;
  unitSlug: string;
  summary: string;
  estMin: number;
  sources: string[];
  lessonType?: "concept" | "coding";
};

const { title, lang, trackSlug, unitSlug, summary, estMin, sources, lessonType } = Astro.props;
const backHref = `/${lang}/learn/${trackSlug}/`;
---

<Topic title={title} lang={lang} sources={sources}>
  <article class="mx-auto max-w-[44rem] px-5 py-10" data-lesson-type={lessonType}>
```

Astro omits the attribute entirely when `lessonType` is `undefined`, so `math` and `algorithms` pages are unaffected.

- [ ] **Step 2: Pass `lessonType` from the lesson route**

In `site/src/pages/[lang]/learn/[track]/[lesson].astro`, add one prop to the `<Lesson>` element (after `sources={entry.data.sources}`):

```astro
  lessonType={entry.data.lessonType}
```

- [ ] **Step 3: Run the build to verify nothing breaks**

Run: `cd site && bun run build`
Expected: build succeeds. Existing pages render identically (no `data-lesson-type` attribute on them).

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/Lesson.astro "site/src/pages/[lang]/learn/[track]/[lesson].astro"
git commit -m "feat(base-cs): emit data-lesson-type on lesson pages"
```

---

## Task 4: MachineFigure widget

A static (zero-island) widget for the machine-model visuals — bit/memory cells, the CPU cycle, and a logic gate. It emits `data-lesson-visual` so it satisfies the linter's visual-minimum rule. Modelled on `StructureFigure.astro`.

**Files:**
- Create: `site/src/components/algo/MachineFigure.astro`

- [ ] **Step 1: Create the component**

Create `site/src/components/algo/MachineFigure.astro` with exactly this content:

```astro
---
import { Fragment } from "astro/jsx-runtime";

type Cell = { value: string; addr?: string; mark?: "active" | "done" | "target" };
type Gate = { name: string; inputs?: string[]; out?: string };
type Props = {
  kind: "cells" | "cpu" | "gate";
  cells?: (Cell | string)[];
  gate?: Gate;
  caption?: string;
};

const { kind, cells = [], gate, caption } = Astro.props;
const norm: Cell[] = cells.map((c) => (typeof c === "string" ? { value: c } : c));
const fill = (m?: string) =>
  m === "active" ? "bg-panel-sky border-bbg-purple"
  : m === "done" ? "bg-panel-mint border-bbg-success"
  : m === "target" ? "bg-panel-rose border-bbg-warn"
  : "bg-white border-gray-300";
const stages = ["Fetch", "Decode", "Execute"];
---

<figure data-lesson-visual class="my-6">
  {kind === "cells" && (
    <div class="flex gap-1.5 justify-center flex-wrap">
      {norm.map((c) => (
        <div class="flex flex-col items-center gap-1">
          <div class={`w-12 h-12 grid place-items-center rounded-lg border-2 font-mono text-[14px] text-bbg-ink ${fill(c.mark)}`}>
            {c.value}
          </div>
          {c.addr && <span class="font-mono text-[10px] text-bbg-muted">{c.addr}</span>}
        </div>
      ))}
    </div>
  )}

  {kind === "cpu" && (
    <div class="flex items-center justify-center gap-2 flex-wrap">
      {stages.map((s, i) => (
        <Fragment>
          <div class="px-4 py-3 rounded-lg border-2 border-bbg-purple bg-panel-sky font-mono text-[13px] text-bbg-ink">
            {s}
          </div>
          {i < stages.length - 1 && <span class="text-bbg-muted">&rarr;</span>}
        </Fragment>
      ))}
      <span class="text-bbg-muted">&#x21BA;</span>
    </div>
  )}

  {kind === "gate" && gate && (
    <div class="flex items-center justify-center gap-3">
      <div class="flex flex-col gap-1 font-mono text-[12px] text-bbg-muted">
        {(gate.inputs ?? []).map((x) => <span>{x}</span>)}
      </div>
      <span class="text-bbg-muted">&rarr;</span>
      <div class="px-5 py-4 rounded-lg border-2 border-bbg-purple bg-panel-sky font-mono text-[14px] font-semibold text-bbg-ink">
        {gate.name}
      </div>
      <span class="text-bbg-muted">&rarr;</span>
      <span class="font-mono text-[12px] text-bbg-muted">{gate.out ?? "out"}</span>
    </div>
  )}

  {caption && <figcaption class="mt-2 text-center text-[12px] text-bbg-muted">{caption}</figcaption>}
</figure>
```

- [ ] **Step 2: Run the build to verify the component compiles**

Run: `cd site && bun run build`
Expected: build succeeds. The component is not yet imported by any lesson; this step only confirms it has no syntax error.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/algo/MachineFigure.astro
git commit -m "feat(base-cs): add MachineFigure static widget"
```

---

## Task 5: Linter — the `base-cs` branch

The foundations linter (`lessons.ts`) branches on `track`. Add a `base-cs` branch that reads `data-lesson-type` from the HTML and validates the matching skeleton: `concept` validates the math-shaped skeleton; `coding` validates the algorithm skeleton minus the Complexity beat. Test-first.

**Files:**
- Modify: `site/src/lint/rules/lessons.test.ts`
- Modify: `site/src/lint/rules/lessons.ts`

- [ ] **Step 1: Write the failing tests**

In `site/src/lint/rules/lessons.test.ts`, add these two helpers and one `describe` block at the end of the file:

```ts
function basecsConcept(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    `<article data-lesson-type="concept">`,
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("step") ? `<div data-lesson-step></div>` : "",
    has("visual") ? `<div data-lesson-visual></div>` : "",
    has("worked") ? `<div data-lesson-section="worked-example"></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
    `</article>`,
  ].join("\n");
}

function basecsCoding(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    `<article data-lesson-type="coding">`,
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("idea") ? `<div data-lesson-section="idea"></div>` : "",
    has("code") ? `<div data-lesson-section="code"></div>` : "",
    has("trace") ? `<div data-lesson-section="trace"></div>` : "",
    has("visual") ? `<div data-lesson-visual></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
    `</article>`,
  ].join("\n");
}

const BASECS_PATH = "dist/en/learn/base-cs/01-bits-and-binary/index.html";

describe("checkLessonRules — base-cs", () => {
  test("a complete concept lesson passes", () => {
    expect(checkLessonRules(basecsConcept(), BASECS_PATH)).toEqual([]);
  });

  test("a complete coding lesson passes", () => {
    expect(checkLessonRules(basecsCoding(), BASECS_PATH)).toEqual([]);
  });

  test("flags a base-cs lesson with no lessonType", () => {
    const html = basecsConcept().replace(' data-lesson-type="concept"', "");
    const errs = checkLessonRules(html, BASECS_PATH);
    expect(errs.some((e) => /lessonType/.test(e))).toBe(true);
  });

  test("flags a concept lesson missing the worked-example section", () => {
    const errs = checkLessonRules(basecsConcept({ worked: false }), BASECS_PATH);
    expect(errs.some((e) => /worked-example/.test(e))).toBe(true);
  });

  test("flags a coding lesson missing the trace section", () => {
    const errs = checkLessonRules(basecsCoding({ trace: false }), BASECS_PATH);
    expect(errs.some((e) => /trace/.test(e))).toBe(true);
  });

  test("does not require a complexity section on a coding lesson", () => {
    expect(checkLessonRules(basecsCoding(), BASECS_PATH)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd site && bunx vitest run src/lint/rules/lessons.test.ts`
Expected: FAIL — the new `base-cs` tests fail because `checkLessonRules` currently routes any non-`algorithms` track to `checkMathLesson`, which neither knows `data-lesson-type` nor the coding skeleton.

- [ ] **Step 3: Add the `base-cs` branch to `lessons.ts`**

In `site/src/lint/rules/lessons.ts`, add this constant after the `ALGO_SECTIONS` line (line 5):

```ts
const BASECS_CODING_SECTIONS = ["hook", "goal", "idea", "code", "trace", "check", "recap"] as const;
```

Add this function immediately before `export function checkLessonRules` (before line 138):

```ts
function checkBaseCsLesson(html: string, file: string, slug: string): string[] {
  const errs = commonLessonRules(html, file, slug, "base-cs");
  const type = html.match(/data-lesson-type="(concept|coding)"/)?.[1];
  if (!type) {
    errs.push(`${file}: base-cs lesson has no lessonType (concept|coding)`);
    return errs;
  }
  const seen = sectionIndexes(html);
  const practiceIdx = html.search(/data-practice-set\b/);

  if (type === "concept") {
    for (const s of MATH_SECTIONS) {
      if (!seen.has(s)) errs.push(`${file}: lesson skeleton missing "${s}" section`);
    }
    const stepIdx = html.search(/data-lesson-step\b/);
    if (stepIdx < 0) errs.push(`${file}: lesson skeleton missing explanation (no Step component)`);
    const visualIdx = html.search(/data-lesson-visual\b/);
    errs.push(
      ...checkOrder(
        [
          ["hook", seen.get("hook")],
          ["goal", seen.get("goal")],
          ["step", stepIdx >= 0 ? stepIdx : undefined],
          ["visual", visualIdx >= 0 ? visualIdx : undefined],
          ["worked-example", seen.get("worked-example")],
          ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
          ["check", seen.get("check")],
          ["recap", seen.get("recap")],
        ],
        file
      )
    );
  } else {
    for (const s of BASECS_CODING_SECTIONS) {
      if (!seen.has(s)) errs.push(`${file}: coding lesson missing "${s}" section`);
    }
    errs.push(
      ...checkOrder(
        [
          ["hook", seen.get("hook")],
          ["goal", seen.get("goal")],
          ["idea", seen.get("idea")],
          ["code", seen.get("code")],
          ["trace", seen.get("trace")],
          ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
          ["check", seen.get("check")],
          ["recap", seen.get("recap")],
        ],
        file
      )
    );
  }
  return errs;
}
```

Replace the body of `checkLessonRules` (lines 138-144) with:

```ts
export function checkLessonRules(html: string, file: string): string[] {
  const info = lessonInfoFromPath(file);
  if (!info) return [];
  if (info.track === "algorithms") return checkAlgoLesson(html, file, info.slug);
  if (info.track === "base-cs") return checkBaseCsLesson(html, file, info.slug);
  return checkMathLesson(html, file, info.slug);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd site && bunx vitest run src/lint/rules/lessons.test.ts`
Expected: PASS — all tests, including the existing `math` and parity tests, pass.

- [ ] **Step 5: Run the build to confirm the linter still runs clean**

Run: `cd site && bun run build`
Expected: build succeeds, lint clean — no `base-cs` lessons exist yet so the new branch is inert in the build.

- [ ] **Step 6: Commit**

```bash
git add site/src/lint/rules/lessons.ts site/src/lint/rules/lessons.test.ts
git commit -m "feat(base-cs): lint the base-cs track with two skeletons"
```

---

## Task 6: Extend the `/teach` command to `base-cs`

**Files:**
- Modify: `.claude/commands/teach.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the domain lock in `teach.md`**

In `.claude/commands/teach.md`, replace the "Domain lock" section body:

```markdown
## Domain lock

This command authors **mathematics**, **algorithms**, and **Base CS** lessons only.
Refuse any off-domain request (anything outside math, algorithms, or Base CS).
```

- [ ] **Step 2: Add `base-cs` input examples**

In the "Input form" code block of `teach.md`, append two lines:

```
/teach base-cs/01-what-a-computer-is/01-bits-and-binary
/teach base-cs/08-functions-and-the-call-stack/03-recursion-preview
```

- [ ] **Step 3: Add the `base-cs` research sources and skeletons**

In `teach.md` pipeline step 2 (Research), append after the algorithms sources sentence:

```
For Base CS, use nand2tetris, Petzold's "Code", CSAPP (in moderation), MDN and the
TC39 specifications for JS semantics, and vetted CS references — not Khan Academy /
OpenStax, not CLRS / NeetCode.
```

In `teach.md` pipeline step 3 (Author EN MDX), append a third skeleton bullet after the `algorithms` one:

```
   - **base-cs:** the skeleton depends on the lesson's `lessonType` frontmatter.
     `concept`: Hook -> Goal -> Explanation (Step components) -> Visual (a MachineFigure
     or StructureFigure) -> WorkedExample -> Practice (PracticeSet, >= 4 problems) ->
     Check (a Quiz) -> Recap.
     `coding`: Hook -> Goal -> Idea -> Code -> Trace (AlgoTrace) -> Practice
     (AlgoPractice, >= 4 problems) -> Check (a Quiz) -> Recap. No Complexity beat.
     Every base-cs lesson MUST set `lessonType: concept | coding` in its frontmatter.
```

- [ ] **Step 4: Update the `/teach` description in `CLAUDE.md`**

In `CLAUDE.md`, in the "Secondary command: `/teach`" section, replace the `**Tracks:**` paragraph so it lists three tracks. The new text:

```markdown
- **Tracks:** `math` (mathematics from zero), `algorithms` (algorithms from zero),
  and `base-cs` (Base CS from zero — the spine rung between math and algorithms:
  how a computer runs code and what every programming construct means). The
  `algorithms` and `base-cs` tracks use distinct lesson skeletons; `base-cs` selects
  its skeleton per-lesson via the `lessonType: concept | coding` frontmatter field.
  Its widgets live in `site/src/components/algo/`, and lessons may declare
  `mathPrereqs` cross-track prerequisites into the math track.
```

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/teach.md CLAUDE.md
git commit -m "feat(base-cs): extend /teach domain lock to the base-cs track"
```

---

## Task 7: Author Unit 01 — "What a computer is" (the P0 proof)

Unit 01 is authored EN + RU through the `/teach` pipeline, one lesson at a time. All five Unit-01 lessons are `lessonType: concept` — Unit 01 is pure machine model with no code listings. The `coding` skeleton is already proven by the Task 5 linter tests; it is first authored in P2.

Each lesson runs the full `/teach` pipeline (research with ≥3 queries, author EN MDX against the `concept` skeleton, translate RU, linter gate, visual check, commit). The stub-creation step of `/teach` creates the `index.mdx` files and is already covered because Unit 01's `lessons` array was filled in Task 1.

- [ ] **Step 1: Author `01-bits-and-binary`**

Run: `/teach base-cs/01-what-a-computer-is/01-bits-and-binary`
Covers: what a bit is, why hardware uses two states, a binary digit vs a decimal digit. `lessonType: concept`. Visual: a `MachineFigure` `kind="cells"` row of bits.
Expected: EN + RU `index.mdx` authored `status: ready`, build clean.

- [ ] **Step 2: Author `02-counting-in-binary`**

Run: `/teach base-cs/01-what-a-computer-is/02-counting-in-binary`
Covers: place value in base 2, reading and writing binary numbers, converting to and from decimal. `lessonType: concept`.
Expected: EN + RU authored, build clean.

- [ ] **Step 3: Author `03-encoding-the-world`**

Run: `/teach base-cs/01-what-a-computer-is/03-encoding-the-world`
Covers: numbers, text (character codes), colour, and sound all encoded as bits — the same bits mean different things under different encodings. `lessonType: concept`.
Expected: EN + RU authored, build clean.

- [ ] **Step 4: Author `04-boolean-logic`**

Run: `/teach base-cs/01-what-a-computer-is/04-boolean-logic`
Covers: true and false as one bit, the AND / OR / NOT operations, truth tables. `lessonType: concept`.
Expected: EN + RU authored, build clean.

- [ ] **Step 5: Author `05-logic-gates`**

Run: `/teach base-cs/01-what-a-computer-is/05-logic-gates`
Covers: a logic gate as hardware that realises a boolean operation, combining gates, an overview of how gates build an adder. `lessonType: concept`. Visual: a `MachineFigure` `kind="gate"`. This is the single overview lesson on gates — the track does not descend below this.
Expected: EN + RU authored, build clean.

- [ ] **Step 6: Verify the full Unit 01 build and lint**

Run: `cd site && bun run build`
Expected: build succeeds, lint clean. `dist/lint-report.json` has zero errors. All ten Unit-01 lesson pages (5 × EN/RU) render.

- [ ] **Step 7: Visual check**

Launch the `atlas-preview` server (Claude Preview, serves `site/dist` on port 4400). Open `/en/learn/base-cs/` and `/ru/learn/base-cs/`, then each Unit-01 lesson. Verify the track index lists Unit 01, the `MachineFigure` figures render, the `PracticeSet` and `Quiz` islands work, and EN/RU are structurally identical.

- [ ] **Step 8: Update the handoff and commit**

Update `docs/open-atlas/HANDOFF.md`: move "Base CS foundations track" out of the Work queue into "Built so far" as "P0 done — track registered, two skeletons, linter, MachineFigure, Unit 01 authored EN+RU"; leave P1–P3 as the remaining queue item.

```bash
git add docs/open-atlas/HANDOFF.md
git commit -m "docs(open-atlas): base-cs P0 complete — infra + Unit 01"
```

---

## P1 — Units 02–04 (rest of the machine arc)

Units 02 (Memory), 03 (The processor), 04 (From machine code to a language). Mostly
`concept` lessons; a `coding` lesson may appear where a tiny code listing illustrates a
machine idea. For each unit, follow the P0 Task 7 pattern:

1. Fix the unit's lesson list (4–6 slugs) and write it into the unit's `lessons` array
   in `units.json` — the same way Task 1 filled Unit 01.
2. Author each lesson EN + RU via `/teach base-cs/<unit>/<lesson>`, setting `lessonType`
   per lesson.
3. Run `bun run build` — lint must be clean at the unit boundary.
4. Commit per lesson (`content(base-cs): <unit>/<lesson> EN+RU ready`).

P1 ends with a clean build of Units 01–04 and a `HANDOFF.md` update.

## P2 — Units 05–08 (values/types, variables, control flow, functions)

Units 05–08. This phase introduces the first `coding` lessons (e.g. tracing a function
call through the call stack in Unit 08). Same per-unit pattern as P1. Confirm both
skeletons render correctly end-to-end on a real authored page during the Unit 05 visual
check. P2 ends with a clean build of Units 01–08 and a `HANDOFF.md` update.

## P3 — Units 09–12 (data in memory, abstraction, failure, concurrency)

Units 09–12. Same per-unit pattern. P3 ends with a clean build of the full 12-unit
track, a `HANDOFF.md` update marking the Base CS track complete, and the algorithms
track confirmed still building at `order: 3`.

---

## Self-Review

**Spec coverage:**
- Spec §1 (architecture: new track in `lessons`, reuse routes/layout) → Tasks 1–3.
- Spec §1 (`tracks.json` order shift, `units.json`) → Task 1.
- Spec §2 (12-unit track map) → Task 1 (unit slugs/titles/crux) + P1–P3 (lesson lists).
- Spec §3 (two skeletons, `lessonType` field, frontmatter) → Task 2 (schema), Task 5 (linter), Task 6 (`/teach`).
- Spec §4 (widget family: `MachineFigure` new, others reused) → Task 4; reused widgets need no task.
- Spec §5 (linter: 10 rules, `track`+`lessonType` branch) → Task 5. Rules 3–10 are inherited from the existing `commonLessonRules` / parity / `mathPrereqs` checks, which already cover every track; rules 1–2 (skeleton, `lessonType` presence) are the new `base-cs` branch. Verified: no linter rule is unimplemented.
- Spec §6 (`/teach`) → Task 6.
- Spec §7 (phasing P0–P3) → Task 7 is P0's proof; P1–P3 sections.
- Spec "out of scope" → nothing in the plan touches the math track, algorithms content, the fullstack pipeline, or the home atlas.

**Placeholder scan:** No "TBD"/"TODO". The P1–P3 sections intentionally defer per-unit lesson lists — that matches the spec ("the exact lesson list per unit is fixed during the implementation plan" was done for Unit 01; later units follow the math/algorithms precedent of fixing lists at phase start). Every P0 task has complete code.

**Type consistency:** `Track` gains `"base-cs"` (Task 1) and is used as the track slug in `tracks.json`/`units.json` (Task 1), the route param, and the linter path segment (Task 5). `lessonType` is `z.enum(["concept","coding"]).optional()` in the schema (Task 2), a `"concept" | "coding"` optional prop in `Lesson.astro` (Task 3), the `data-lesson-type` attribute value (Task 3), and the regex capture in `checkBaseCsLesson` (Task 5) — consistent throughout. `MachineFigure` props (`kind`, `cells`, `gate`, `caption`) are defined once in Task 4 and referenced by name in Task 7.
