# Foundations Algorithms Track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `foundations` section with a second track — `algorithms` — by adding its data, lesson skeleton, widget family, linter branch, and `/teach` support, then prove the infrastructure end-to-end with one fully authored bilingual lesson.

**Architecture:** The `lessons` content collection, `tracks.json`/`units.json`, `Lesson.astro`, the `/learn/<track>/<lesson>` routing, the `/teach` command, and the build are all reused unchanged — the `lessons` collection is multi-track by design (the `track` field and the `"algorithms"` enum value already exist). New work is additive: a distinct algorithm lesson skeleton (Hook → Goal → Idea → Code → Trace → Complexity → Practice → Check → Recap), an algorithm widget family under `src/components/algo/`, a `track`-branched linter, a new optional `mathPrereqs` cross-track field, and lifting the `/teach` domain lock. The math track and the fullstack `book` collection are not modified.

**Tech Stack:** Astro 5, Tailwind, MDX, Zod content schemas, Vitest (linter rule tests), `bun` for install/build/check.

**Important pattern note (deviation from the spec):** The design spec section 4 described `AlgoTrace`, `CodeRunner`, and the practice widget as `.tsx` Preact islands. The *actual* foundations codebase ships every interactive lesson widget as an `.astro` component with an inline `<script>` and **zero hydration islands** (`math/PracticeSet.astro`, `pedagogy/Quiz.astro` both do this). This plan follows the established codebase pattern: all algorithm widgets are `.astro` + inline `<script>`, zero islands. The hydration-cap linter rule (≤5) stays, but algorithm lessons use 0 islands, exactly like math lessons. The spec's intent (interactive widgets, hydration cap respected) is fully met.

**Second deviation:** the spec says "extend `PracticeSet`". The math `PracticeSet.astro` is consumed by 32 shipped math lessons and only accepts numeric answers. Rather than risk those 32 lessons, this plan adds a **separate** `algo/AlgoPractice.astro` that emits the same `data-practice-set` / `data-practice-problem` attributes the linter already checks, and supports numeric / multiple-choice / ordering problems. The math `PracticeSet.astro` is left untouched. This better satisfies the spec's explicit "must remain backward-compatible" requirement.

**Scope:** This plan covers Phase 0 — infrastructure plus one fully authored proof lesson. It produces working, testable software: a navigable `/learn/algorithms/` section with one complete bilingual lesson and a passing build. Authoring the remaining lessons of Unit 01 and Units 02–12 (~155 lesson files) is Phase 1+ — repeated `/teach algorithms/...` invocations, one commit per lesson, not enumerated here (the same model used for the math track).

**Reference files (read before starting):**
- `site/src/content/config.ts` — collection schemas; the `lessons` schema is extended in Task 2.
- `site/src/content/units.json` — the 10 math units; the 12 algorithm units are appended in Task 1.
- `site/src/content/tracks.json` — the `math` track; the `algorithms` track is appended in Task 1.
- `site/src/lint/rules/lessons.ts` — the lesson linter; rewritten to branch on track in Task 9.
- `site/src/lint/rules/lessons.test.ts` — Vitest rule-test pattern; extended in Task 9.
- `site/src/lint/index.ts` — linter wiring; `checkMathPrereqs` is added in Task 9.
- `site/src/layouts/Lesson.astro` — track-agnostic lesson chrome, reused as-is.
- `site/src/components/lesson/*.astro` — `Hook`, `Goal`, `Step`, `WorkedExample`, `Check`, `Recap`, `Inset`. `Hook`/`Goal`/`Check`/`Recap`/`Inset` are reused; `Idea`/`Code`/`Trace`/`Complexity` are added in Task 4.
- `site/src/components/math/PracticeSet.astro` — the `.astro` + inline `<script>` interactive-widget pattern to mirror.
- `site/src/components/pedagogy/Quiz.astro` — the Check-block quiz, reused as-is.
- `site/src/content/lessons/en/math/01-numbers/01-counting/index.mdx` — the proof of import-path depth (six `..` segments).
- `docs/superpowers/specs/2026-05-16-foundations-algorithms-track-design.md` — the approved spec.

---

## File Structure

**Modified data / schema / config:**
- `site/src/content/tracks.json` — append the `algorithms` track.
- `site/src/content/units.json` — append the 12 algorithm units.
- `site/src/content/config.ts` — add the optional `mathPrereqs` field to the `lessons` schema.
- `site/src/i18n/ui.json` — add algorithm lesson UI strings (EN + RU).
- `site/src/components/lesson/Inset.astro` — add the `edgecase` inset kind.
- `site/src/lint/rules/lessons.ts` — rewrite `checkLessonRules` to branch on track; add `checkMathPrereqs`.
- `site/src/lint/rules/lessons.test.ts` — add algorithm-skeleton and `checkMathPrereqs` tests.
- `site/src/lint/index.ts` — wire in `checkMathPrereqs`.
- `.claude/commands/teach.md` — lift the domain lock to mathematics + algorithms.
- `CLAUDE.md` — document the algorithms track under the existing `/teach` section.

**New algorithm lesson-section components (`site/src/components/lesson/`):**
- `Idea.astro`, `Code.astro`, `Trace.astro`, `Complexity.astro`.

**New algorithm widgets (`site/src/components/algo/`):**
- `AnnotatedCode.astro`, `ComplexityChart.astro`, `StructureFigure.astro`, `MathRecall.astro` — static.
- `AlgoTrace.astro`, `CodeRunner.astro`, `AlgoPractice.astro` — `.astro` + inline `<script>`, zero islands.

**New content (proof lesson):**
- `site/src/content/lessons/en/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.mdx`
- `site/src/content/lessons/ru/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.mdx`

No new routing pages or layouts: `/learn/<track>/...` and `Lesson.astro` are track-agnostic and already handle `algorithms`.

---

## Phase 0 — Infrastructure + proof lesson

### Task 1: Track and unit data

**Files:**
- Modify: `site/src/content/tracks.json`
- Modify: `site/src/content/units.json`

- [ ] **Step 1: Append the `algorithms` track to `tracks.json`**

`site/src/content/tracks.json` is currently a one-element array. Change the closing `]`
so the array has two elements — add the `algorithms` object after the `math` object:

```json
[
  { "slug": "math", "order": 1, "color": "mint",
    "title": { "en": "Mathematics from zero", "ru": "Математика с нуля" },
    "blurb": {
      "en": "Start knowing only how to count. Finish with the math foundation a programmer needs.",
      "ru": "Начни, зная только счёт. Закончи с математической базой, нужной программисту."
    } },
  { "slug": "algorithms", "order": 2, "color": "sky",
    "title": { "en": "Algorithms from zero", "ru": "Алгоритмы с нуля" },
    "blurb": {
      "en": "Know one programming language, know no algorithms. Finish able to solve hard problems with confidence.",
      "ru": "Знаешь один язык программирования, не знаешь алгоритмов. Закончишь, уверенно решая сложные задачи."
    } }
]
```

- [ ] **Step 2: Append the 12 algorithm units to `units.json`**

`site/src/content/units.json` currently ends with the `10-probability` math unit and a
closing `]`. Insert the 12 algorithm-unit objects after the last math unit (after the
`10-probability` object's closing `}`, add a comma, then the objects below) and keep the
final `]`. Every algorithm unit's `lessons` array is `[]` except `01-thinking-complexity`,
which lists the proof lesson authored in Task 12.

```json
  { "slug": "01-thinking-complexity", "track": "algorithms", "order": 1,
    "title": { "en": "Algorithmic thinking and complexity", "ru": "Алгоритмическое мышление и сложность" },
    "crux": {
      "en": "How to measure an algorithm's cost before you ever run it.",
      "ru": "Как измерить цену алгоритма ещё до запуска."
    },
    "lessons": ["01-what-is-an-algorithm"] },
  { "slug": "02-arrays-strings", "track": "algorithms", "order": 2,
    "title": { "en": "Arrays and strings", "ru": "Массивы и строки" },
    "crux": {
      "en": "The array: a row of boxes, and the patterns that sweep across it.",
      "ru": "Массив: ряд ячеек и приёмы, что скользят по нему."
    },
    "lessons": [] },
  { "slug": "03-sorting-search", "track": "algorithms", "order": 3,
    "title": { "en": "Sorting and binary search", "ru": "Сортировка и бинарный поиск" },
    "crux": {
      "en": "Order unlocks speed: sort once, then find in logarithmic time.",
      "ru": "Порядок даёт скорость: отсортируй раз — ищи за логарифм."
    },
    "lessons": [] },
  { "slug": "04-recursion-backtracking", "track": "algorithms", "order": 4,
    "title": { "en": "Recursion and backtracking", "ru": "Рекурсия и backtracking" },
    "crux": {
      "en": "A function that calls itself, and how to explore every option.",
      "ru": "Функция, что зовёт сама себя, и как перебрать все варианты."
    },
    "lessons": [] },
  { "slug": "05-hashing", "track": "algorithms", "order": 5,
    "title": { "en": "Hashing", "ru": "Хеширование" },
    "crux": {
      "en": "Trade memory for time: answer 'have I seen this?' instantly.",
      "ru": "Меняем память на время: мгновенный ответ «видел ли я это?»."
    },
    "lessons": [] },
  { "slug": "06-lists-stacks-queues", "track": "algorithms", "order": 6,
    "title": { "en": "Linked lists, stacks, queues", "ru": "Связные списки, стеки, очереди" },
    "crux": {
      "en": "Three ways to hold a sequence, each with its own discipline.",
      "ru": "Три способа держать последовательность, у каждого своя дисциплина."
    },
    "lessons": [] },
  { "slug": "07-trees", "track": "algorithms", "order": 7,
    "title": { "en": "Trees", "ru": "Деревья" },
    "crux": {
      "en": "Data that branches, and recursion as the natural way to walk it.",
      "ru": "Данные, что ветвятся, и рекурсия как способ их обойти."
    },
    "lessons": [] },
  { "slug": "08-heaps", "track": "algorithms", "order": 8,
    "title": { "en": "Heaps and priority queues", "ru": "Кучи и приоритетные очереди" },
    "crux": {
      "en": "Always reach the smallest (or largest) item first.",
      "ru": "Всегда достать сначала наименьший (или наибольший) элемент."
    },
    "lessons": [] },
  { "slug": "09-graphs", "track": "algorithms", "order": 9,
    "title": { "en": "Graphs", "ru": "Графы" },
    "crux": {
      "en": "Nodes and edges — how to explore, order, and find shortest paths.",
      "ru": "Узлы и рёбра — как обойти, упорядочить и найти кратчайшие пути."
    },
    "lessons": [] },
  { "slug": "10-dynamic-programming", "track": "algorithms", "order": 10,
    "title": { "en": "Dynamic programming", "ru": "Динамическое программирование" },
    "crux": {
      "en": "Solve once, remember, reuse — turning exponential into polynomial.",
      "ru": "Реши раз, запомни, переиспользуй — экспонента становится полиномом."
    },
    "lessons": [] },
  { "slug": "11-greedy", "track": "algorithms", "order": 11,
    "title": { "en": "Greedy algorithms", "ru": "Жадные алгоритмы" },
    "crux": {
      "en": "Take the best local choice — and prove it stays best.",
      "ru": "Бери лучший локальный выбор — и докажи, что он останется лучшим."
    },
    "lessons": [] },
  { "slug": "12-toolbox", "track": "algorithms", "order": 12,
    "title": { "en": "Problem-solving toolbox", "ru": "Инструментарий решения задач" },
    "crux": {
      "en": "Bits, intervals, and reading a problem to pick the right tool.",
      "ru": "Биты, интервалы и чтение задачи ради верного инструмента."
    },
    "lessons": [] }
```

- [ ] **Step 3: Verify the content schema still loads**

Run: `cd site && bun run check`
Expected: PASS. `tracks` now has two entries, `units` has 22; both validate against the
existing Zod schemas (the `Track` enum already includes `"algorithms"`).

- [ ] **Step 4: Commit**

```bash
git add site/src/content/tracks.json site/src/content/units.json
git commit -m "feat(algorithms): add algorithms track and 12 unit definitions"
```

---

### Task 2: Add the `mathPrereqs` cross-track field

**Files:**
- Modify: `site/src/content/config.ts`

- [ ] **Step 1: Add `mathPrereqs` to the `lessons` schema**

In `site/src/content/config.ts`, inside the `lessons` collection's `schema` object,
add the `mathPrereqs` line immediately after the existing `prereqs` line:

```typescript
    prereqs: z.array(z.string()).default([]),
    mathPrereqs: z.array(z.string()).default([]),
    concepts: z.array(z.string()).default([]),
```

`mathPrereqs` is an optional list of cross-track prerequisites, each of the form
`math/<unit>/<lesson>` (e.g. `"math/08-growth/02-logarithms"`). It defaults to `[]`,
so every existing math lesson stays valid with no change.

- [ ] **Step 2: Verify the schema compiles**

Run: `cd site && bun run check`
Expected: PASS. All 32 existing math lessons validate (the new field is optional).

- [ ] **Step 3: Commit**

```bash
git add site/src/content/config.ts
git commit -m "feat(algorithms): add optional mathPrereqs cross-track field to lessons schema"
```

---

### Task 3: Algorithm lesson UI strings

**Files:**
- Modify: `site/src/i18n/ui.json`

- [ ] **Step 1: Add EN strings**

In `site/src/i18n/ui.json`, in the `en` object, the lesson strings currently end with
`"lesson.inset.mistake": "Common mistake"`. Add a comma after that value and append:

```json
    "lesson.inset.edgecase": "Edge cases",
    "lesson.idea": "The idea",
    "lesson.code": "The code",
    "lesson.trace": "Step-by-step trace",
    "lesson.complexity": "Complexity",
    "lesson.mathRecall": "From the math track",
    "trace.step": "Step",
    "trace.prev": "Previous step",
    "trace.next": "Next step",
    "coderunner.run": "Run",
    "coderunner.reset": "Reset",
    "coderunner.output": "Output"
```

- [ ] **Step 2: Add RU strings**

In the `ru` object, the lesson strings currently end with
`"lesson.inset.mistake": "Частая ошибка"`. Add a comma after that value and append:

```json
    "lesson.inset.edgecase": "Граничные случаи",
    "lesson.idea": "Идея",
    "lesson.code": "Код",
    "lesson.trace": "Пошаговый разбор",
    "lesson.complexity": "Сложность",
    "lesson.mathRecall": "Из курса математики",
    "trace.step": "Шаг",
    "trace.prev": "Предыдущий шаг",
    "trace.next": "Следующий шаг",
    "coderunner.run": "Запустить",
    "coderunner.reset": "Сброс",
    "coderunner.output": "Вывод"
```

- [ ] **Step 3: Verify the JSON parses**

Run: `cd site && bun run check`
Expected: PASS (no JSON syntax error).

- [ ] **Step 4: Commit**

```bash
git add site/src/i18n/ui.json
git commit -m "feat(algorithms): add algorithm lesson UI strings"
```

---

### Task 4: Algorithm lesson-section components

The algorithm skeleton adds four sections — Idea, Code, Trace, Complexity — between
Goal and Check. Each is a small `.astro` wrapper that emits a `data-lesson-section`
attribute the linter checks. The `Inset.astro` component gains an `edgecase` kind.

**Files:**
- Create: `site/src/components/lesson/Idea.astro`
- Create: `site/src/components/lesson/Code.astro`
- Create: `site/src/components/lesson/Trace.astro`
- Create: `site/src/components/lesson/Complexity.astro`
- Modify: `site/src/components/lesson/Inset.astro`

- [ ] **Step 1: Create `Idea.astro`**

Create `site/src/components/lesson/Idea.astro`:

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="idea" class="rounded-2xl bg-panel-sky border-l-[3px] border-bbg-purple px-5 py-4">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-purple font-semibold mb-1">
    {t("lesson.idea", lang)}
  </div>
  <div class="text-[15px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 2: Create `Code.astro`**

Create `site/src/components/lesson/Code.astro`:

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="code">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-muted font-semibold mb-2">
    {t("lesson.code", lang)}
  </div>
  <div class="space-y-3 text-[14.5px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 3: Create `Trace.astro`**

Create `site/src/components/lesson/Trace.astro`:

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="trace">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-muted font-semibold mb-2">
    {t("lesson.trace", lang)}
  </div>
  <div class="space-y-3 text-[14.5px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 4: Create `Complexity.astro`**

Create `site/src/components/lesson/Complexity.astro`:

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="complexity" class="rounded-2xl border-2 border-gray-200 bg-card p-6">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-muted font-semibold mb-3">
    {t("lesson.complexity", lang)}
  </div>
  <div class="space-y-3 text-[14.5px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 5: Add the `edgecase` kind to `Inset.astro`**

Replace the frontmatter of `site/src/components/lesson/Inset.astro` (between the `---`
fences) with:

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { kind: "why" | "practice" | "mistake" | "edgecase"; lang: Locale };
const { kind, lang } = Astro.props;
const label = t(`lesson.inset.${kind}`, lang);
const accent =
  kind === "mistake" ? "border-bbg-warn"
  : kind === "edgecase" ? "border-bbg-purple"
  : kind === "practice" ? "border-bbg-teal"
  : "border-gray-300";
---
```

The component body (the `<details>` block below the closing `---`) stays unchanged.

- [ ] **Step 6: Verify everything compiles**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add site/src/components/lesson/Idea.astro site/src/components/lesson/Code.astro site/src/components/lesson/Trace.astro site/src/components/lesson/Complexity.astro site/src/components/lesson/Inset.astro
git commit -m "feat(algorithms): add Idea/Code/Trace/Complexity sections and edgecase inset"
```

---

### Task 5: Static algorithm widgets

Four zero-island static widgets. They live in a new `site/src/components/algo/`
directory.

**Files:**
- Create: `site/src/components/algo/AnnotatedCode.astro`
- Create: `site/src/components/algo/ComplexityChart.astro`
- Create: `site/src/components/algo/StructureFigure.astro`
- Create: `site/src/components/algo/MathRecall.astro`

- [ ] **Step 1: Create `AnnotatedCode.astro`**

Renders a numbered code listing with optional per-line annotations shown below it.

Create `site/src/components/algo/AnnotatedCode.astro`:

```astro
---
type Annotation = { line: number; text: string };
type Props = { code: string; annotations?: Annotation[]; caption?: string };
const { code, annotations = [], caption } = Astro.props;
const lines = code.replace(/\n$/, "").split("\n");
const noted = new Set(annotations.map((a) => a.line));
---
<figure class="my-6 rounded-xl border-2 border-gray-200 bg-bbg-paper overflow-hidden">
  <pre class="overflow-x-auto px-0 py-3 text-[13px] leading-relaxed font-mono text-bbg-ink"><code>{lines.map((ln, i) => (
    <div class={`px-4 ${noted.has(i + 1) ? "bg-panel-sky" : ""}`}>
      <span class="inline-block w-7 select-none text-right pr-3 text-bbg-muted">{i + 1}</span>
      <span>{ln === "" ? " " : ln}</span>
    </div>
  ))}</code></pre>
  {annotations.length > 0 && (
    <ul class="border-t-2 border-gray-200 px-4 py-3 space-y-1.5 text-[12.5px] text-bbg-muted">
      {annotations.map((a) => (
        <li class="flex gap-2">
          <span class="font-mono shrink-0 text-bbg-purple font-semibold">L{a.line}</span>
          <span>{a.text}</span>
        </li>
      ))}
    </ul>
  )}
  {caption && <figcaption class="border-t-2 border-gray-200 px-4 py-2 text-[12px] text-bbg-muted">{caption}</figcaption>}
</figure>
```

- [ ] **Step 2: Create `ComplexityChart.astro`**

A static SVG comparing the standard growth curves. The `highlight` prop bolds the
named curves.

Create `site/src/components/algo/ComplexityChart.astro`:

```astro
---
type Props = { highlight?: string[] };
const { highlight = [] } = Astro.props;
const W = 520, H = 300, padL = 44, padB = 36, padT = 16, padR = 90;
const x = (n: number) => padL + (n / 16) * (W - padL - padR);
const yMax = 64;
const y = (v: number) => H - padB - (Math.min(v, yMax) / yMax) * (H - padB - padT);
const ns = Array.from({ length: 17 }, (_, i) => i);
const curves = [
  { name: "O(1)", color: "#94a3b8", f: () => 1 },
  { name: "O(log n)", color: "#0d9488", f: (n: number) => (n < 1 ? 0 : Math.log2(n)) },
  { name: "O(n)", color: "#7c3aed", f: (n: number) => n },
  { name: "O(n log n)", color: "#d97706", f: (n: number) => (n < 1 ? 0 : n * Math.log2(n)) },
  { name: "O(n²)", color: "#dc2626", f: (n: number) => n * n },
  { name: "O(2ⁿ)", color: "#be123c", f: (n: number) => 2 ** n },
];
const path = (f: (n: number) => number) =>
  ns.map((n, i) => `${i === 0 ? "M" : "L"} ${x(n).toFixed(1)} ${y(f(n)).toFixed(1)}`).join(" ");
---
<figure data-lesson-visual class="my-6">
  <svg viewBox={`0 0 ${W} ${H}`} class="w-full" role="img" aria-label="Growth of common complexity classes">
    <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#cbd5e1" stroke-width="1.5" />
    <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#cbd5e1" stroke-width="1.5" />
    <text x={(padL + W - padR) / 2} y={H - 8} text-anchor="middle" font-size="11" font-family="monospace" fill="#64748b">input size n</text>
    <text x={14} y={(padT + H - padB) / 2} text-anchor="middle" font-size="11" font-family="monospace" fill="#64748b" transform={`rotate(-90 14 ${(padT + H - padB) / 2})`}>operations</text>
    {curves.map((c) => {
      const on = highlight.length === 0 || highlight.includes(c.name);
      return (
        <g>
          <path d={path(c.f)} fill="none" stroke={c.color} stroke-width={on ? 2.6 : 1.2}
                stroke-opacity={on ? 1 : 0.35} stroke-linejoin="round" />
          <text x={W - padR + 6} y={y(c.f(16)) + 4} font-size="11" font-family="monospace"
                fill={c.color} fill-opacity={on ? 1 : 0.4} font-weight={on ? "700" : "400"}>{c.name}</text>
        </g>
      );
    })}
  </svg>
</figure>
```

- [ ] **Step 3: Create `StructureFigure.astro`**

A static figure for a linear structure — a labeled row of cells, covering arrays,
strings, stacks and queues (Units 01–06). Tree and graph figures are added in later
phases when Units 07 and 09 land.

Create `site/src/components/algo/StructureFigure.astro`:

```astro
---
type Cell = { value: string; mark?: "active" | "done" | "target" };
type Props = { cells: (Cell | string)[]; indices?: boolean; caption?: string };
const { cells, indices = true, caption } = Astro.props;
const norm = cells.map((c) => (typeof c === "string" ? { value: c } : c));
const fill = (m?: string) =>
  m === "active" ? "bg-panel-sky border-bbg-purple"
  : m === "done" ? "bg-panel-mint border-bbg-success"
  : m === "target" ? "bg-panel-rose border-bbg-warn"
  : "bg-white border-gray-300";
---
<figure data-lesson-visual class="my-6">
  <div class="flex gap-1.5 justify-center flex-wrap">
    {norm.map((c, i) => (
      <div class="flex flex-col items-center gap-1">
        <div class={`w-12 h-12 grid place-items-center rounded-lg border-2 font-mono text-[14px] text-bbg-ink ${fill(c.mark)}`}>
          {c.value}
        </div>
        {indices && <span class="font-mono text-[10px] text-bbg-muted">{i}</span>}
      </div>
    ))}
  </div>
  {caption && <figcaption class="mt-2 text-center text-[12px] text-bbg-muted">{caption}</figcaption>}
</figure>
```

- [ ] **Step 4: Create `MathRecall.astro`**

A non-blocking reminder linking to a math-track lesson. Used where an algorithm lesson
leans on a math concept.

Create `site/src/components/algo/MathRecall.astro`:

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale; href: string; title: string };
const { lang, href, title } = Astro.props;
---
<a href={href}
   class="my-4 flex items-center gap-3 rounded-xl border-2 border-bbg-teal/40 bg-panel-mint px-4 py-3 no-underline hover:border-bbg-teal transition-colors">
  <span class="font-mono text-[10px] uppercase tracking-wider text-bbg-teal font-semibold shrink-0">
    {t("lesson.mathRecall", lang)}
  </span>
  <span class="text-[13.5px] text-bbg-ink">{title}</span>
  <span class="ml-auto text-bbg-teal shrink-0" aria-hidden="true">&rarr;</span>
</a>
```

- [ ] **Step 5: Verify everything compiles**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/algo/AnnotatedCode.astro site/src/components/algo/ComplexityChart.astro site/src/components/algo/StructureFigure.astro site/src/components/algo/MathRecall.astro
git commit -m "feat(algorithms): add static algorithm widgets"
```

---

### Task 6: AlgoTrace widget

The Trace-block visualizer: it shows a code listing alongside a linear data structure,
and steps through pre-built frames, highlighting the current code line and cell marks.
`.astro` + inline `<script>`, zero hydration islands — the same pattern as
`math/PracticeSet.astro`.

**Files:**
- Create: `site/src/components/algo/AlgoTrace.astro`

- [ ] **Step 1: Create `AlgoTrace.astro`**

```astro
---
import { t, type Locale } from "../../i18n";

type Cell = { value: string; mark?: "active" | "done" | "target" };
type Frame = { caption: string; line?: number; cells: (Cell | string)[] };
type Props = { id: string; lang: Locale; code: string[]; frames: Frame[] };

const { id, lang, code, frames } = Astro.props;
const norm = frames.map((f) => ({
  ...f,
  cells: f.cells.map((c) => (typeof c === "string" ? { value: c } : c)),
}));
---
<figure id={id} data-lesson-visual data-algo-trace
        class="my-8 rounded-2xl border-2 border-gray-200 bg-card p-5">
  <pre class="overflow-x-auto rounded-lg bg-bbg-paper py-3 text-[13px] leading-relaxed font-mono text-bbg-ink"><code>{code.map((ln, i) => (
    <div data-code-line={i + 1} class="px-4">
      <span class="inline-block w-7 select-none text-right pr-3 text-bbg-muted">{i + 1}</span>
      <span>{ln === "" ? " " : ln}</span>
    </div>
  ))}</code></pre>

  <div data-trace-cells class="mt-4 flex gap-1.5 justify-center flex-wrap min-h-[3.5rem]"></div>
  <p data-trace-caption class="mt-3 text-center text-[13.5px] text-bbg-ink min-h-[1.4rem]"></p>

  <div class="mt-3 flex items-center justify-center gap-3">
    <button type="button" data-trace-prev aria-label={t("trace.prev", lang)}
      class="rounded-lg border-2 border-gray-200 px-3 py-1.5 text-[13px] font-medium text-bbg-ink hover:border-bbg-purple disabled:opacity-40 transition">&lsaquo;</button>
    <span data-trace-status class="font-mono text-[12px] text-bbg-muted tabular-nums"></span>
    <button type="button" data-trace-next aria-label={t("trace.next", lang)}
      class="rounded-lg border-2 border-gray-200 px-3 py-1.5 text-[13px] font-medium text-bbg-ink hover:border-bbg-purple disabled:opacity-40 transition">&rsaquo;</button>
  </div>

  <script type="application/json" data-trace-frames set:html={JSON.stringify(norm)} />
  <script type="application/json" data-trace-label set:html={JSON.stringify(t("trace.step", lang))} />
</figure>

<script>
  type Cell = { value: string; mark?: "active" | "done" | "target" };
  type Frame = { caption: string; line?: number; cells: Cell[] };

  function markClass(m?: string): string {
    if (m === "active") return "bg-panel-sky border-bbg-purple";
    if (m === "done") return "bg-panel-mint border-bbg-success";
    if (m === "target") return "bg-panel-rose border-bbg-warn";
    return "bg-white border-gray-300";
  }

  function initTrace(root: HTMLElement) {
    const framesEl = root.querySelector<HTMLElement>("[data-trace-frames]");
    const labelEl = root.querySelector<HTMLElement>("[data-trace-label]");
    if (!framesEl || !labelEl) return;
    const frames: Frame[] = JSON.parse(framesEl.textContent || "[]");
    const stepLabel: string = JSON.parse(labelEl.textContent || '"Step"');
    if (frames.length === 0) return;

    const cellsBox = root.querySelector<HTMLElement>("[data-trace-cells]")!;
    const caption = root.querySelector<HTMLElement>("[data-trace-caption]")!;
    const status = root.querySelector<HTMLElement>("[data-trace-status]")!;
    const prev = root.querySelector<HTMLButtonElement>("[data-trace-prev]")!;
    const next = root.querySelector<HTMLButtonElement>("[data-trace-next]")!;
    const codeLines = Array.from(root.querySelectorAll<HTMLElement>("[data-code-line]"));
    let i = 0;

    function render() {
      const f = frames[i];
      cellsBox.innerHTML = "";
      for (const c of f.cells) {
        const cell = document.createElement("div");
        cell.className =
          "w-12 h-12 grid place-items-center rounded-lg border-2 font-mono text-[14px] text-bbg-ink " +
          markClass(c.mark);
        cell.textContent = c.value;
        cellsBox.appendChild(cell);
      }
      caption.textContent = f.caption;
      status.textContent = `${stepLabel} ${i + 1} / ${frames.length}`;
      codeLines.forEach((el) => {
        const on = f.line !== undefined && Number(el.dataset.codeLine) === f.line;
        el.classList.toggle("bg-panel-sky", on);
      });
      prev.disabled = i === 0;
      next.disabled = i === frames.length - 1;
    }

    prev.addEventListener("click", () => { if (i > 0) { i -= 1; render(); } });
    next.addEventListener("click", () => { if (i < frames.length - 1) { i += 1; render(); } });
    render();
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-algo-trace]").forEach(initTrace);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/algo/AlgoTrace.astro
git commit -m "feat(algorithms): add AlgoTrace step-through visualizer"
```

---

### Task 7: CodeRunner widget

An editable JS sandbox: the reader edits starter JavaScript, runs it, and sees the
captured `console.log` output. `.astro` + inline `<script>`, zero islands. JavaScript
only (no TypeScript stripping) — the editable starter is plain JS.

**Files:**
- Create: `site/src/components/algo/CodeRunner.astro`

- [ ] **Step 1: Create `CodeRunner.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { id: string; lang: Locale; code: string };
const { id, lang, code } = Astro.props;
const starter = code.replace(/\n$/, "");
const rows = Math.min(Math.max(starter.split("\n").length + 1, 4), 22);
---
<section id={id} data-code-runner class="my-8 rounded-2xl border-2 border-bbg-purple/40 bg-panel-lilac/40 p-5">
  <textarea data-code-input rows={rows} spellcheck="false"
    class="w-full resize-y rounded-lg border-2 border-gray-200 bg-bbg-paper px-3 py-2.5 text-[13px] leading-relaxed font-mono text-bbg-ink focus-visible:border-bbg-purple outline-none">{starter}</textarea>
  <div class="mt-3 flex items-center gap-2">
    <button type="button" data-code-run
      class="rounded-lg bg-bbg-purple text-white text-[13px] font-medium px-4 py-2 hover:bg-bbg-purple/90 transition">
      {t("coderunner.run", lang)}
    </button>
    <button type="button" data-code-reset
      class="rounded-lg border-2 border-gray-200 text-[13px] font-medium px-3 py-2 text-bbg-ink hover:border-gray-300 transition">
      {t("coderunner.reset", lang)}
    </button>
  </div>
  <div class="mt-3">
    <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-muted font-semibold mb-1">
      {t("coderunner.output", lang)}
    </div>
    <pre data-code-output class="overflow-x-auto rounded-lg bg-bbg-ink px-3 py-2.5 text-[12.5px] leading-relaxed font-mono text-gray-100 min-h-[2.5rem] whitespace-pre-wrap"></pre>
  </div>
  <script type="application/json" data-code-starter set:html={JSON.stringify(starter)} />
</section>

<script>
  function runUserCode(source: string): string {
    const lines: string[] = [];
    const log = (...args: unknown[]) =>
      lines.push(
        args
          .map((a) => {
            if (typeof a === "string") return a;
            try { return JSON.stringify(a); } catch { return String(a); }
          })
          .join(" ")
      );
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("console", `"use strict";\n${source}`);
      fn({ log, error: log, warn: log, info: log });
    } catch (err) {
      lines.push(`⚠ ${err instanceof Error ? err.message : String(err)}`);
    }
    return lines.length ? lines.join("\n") : "—";
  }

  function initRunner(root: HTMLElement) {
    const input = root.querySelector<HTMLTextAreaElement>("[data-code-input]")!;
    const output = root.querySelector<HTMLElement>("[data-code-output]")!;
    const runBtn = root.querySelector<HTMLButtonElement>("[data-code-run]")!;
    const resetBtn = root.querySelector<HTMLButtonElement>("[data-code-reset]")!;
    const starterEl = root.querySelector<HTMLElement>("[data-code-starter]");
    const starter: string = starterEl ? JSON.parse(starterEl.textContent || '""') : "";

    runBtn.addEventListener("click", () => {
      output.textContent = runUserCode(input.value);
    });
    resetBtn.addEventListener("click", () => {
      input.value = starter;
      output.textContent = "";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = input.selectionStart, end = input.selectionEnd;
        input.value = input.value.slice(0, s) + "  " + input.value.slice(end);
        input.selectionStart = input.selectionEnd = s + 2;
      }
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-code-runner]").forEach(initRunner);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/algo/CodeRunner.astro
git commit -m "feat(algorithms): add CodeRunner editable JS sandbox"
```

---

### Task 8: AlgoPractice widget

The algorithm practice block. It emits the `data-practice-set` and
`data-practice-problem` attributes the linter checks, and supports three problem kinds:
`numeric` (a number answer), `choice` (multiple choice), and `order` (arrange steps in
the right order). `.astro` + inline `<script>`, zero islands.

**Files:**
- Create: `site/src/components/algo/AlgoPractice.astro`

- [ ] **Step 1: Create `AlgoPractice.astro`**

```astro
---
import { t, type Locale } from "../../i18n";

type NumericProblem = { kind: "numeric"; prompt: string; answer: number; tolerance?: number; hint: string };
type ChoiceProblem = { kind: "choice"; prompt: string; choices: string[]; answer: number; hint: string };
type OrderProblem = { kind: "order"; prompt: string; items: string[]; hint: string };
type Problem = NumericProblem | ChoiceProblem | OrderProblem;
type Props = { id: string; lessonSlug: string; lang: Locale; problems: Problem[] };

const { id, lessonSlug, lang, problems } = Astro.props;
const letters = ["A", "B", "C", "D", "E", "F"];
---
<section id={id} data-practice-set data-lesson-slug={lessonSlug}
  class="rounded-2xl border-2 border-gray-200 bg-card p-6 my-8">
  <header class="flex items-center justify-between mb-4">
    <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">
      {t("practice.title", lang)}
    </span>
    <span data-progress class="font-mono text-[12px] text-bbg-muted">0 / {problems.length}</span>
  </header>
  <div class="space-y-5">
    {problems.map((p) => (
      <div data-practice-problem data-kind={p.kind} class="rounded-xl border border-gray-200 p-4">
        <p class="text-[14.5px] text-bbg-ink mb-3">{p.prompt}</p>

        {p.kind === "numeric" && (
          <div class="flex items-center gap-2" data-answer={p.answer} data-tolerance={p.tolerance ?? 0}>
            <input type="number" data-input step="any"
              class="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-[14px] font-mono tabular-nums focus-visible:border-bbg-teal outline-none" />
            <button type="button" data-check
              class="rounded-lg bg-bbg-teal text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-teal/90 transition">
              {t("exercise.check", lang)}
            </button>
          </div>
        )}

        {p.kind === "choice" && (
          <div class="space-y-2" data-answer={p.answer}>
            {p.choices.map((c, ci) => (
              <button type="button" data-choice={ci}
                class="w-full text-left rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 px-3 py-2 flex items-center gap-2.5 transition">
                <span class="font-mono w-6 h-6 grid place-items-center rounded bg-gray-100 text-[11px] text-bbg-muted font-semibold">{letters[ci] ?? ci + 1}</span>
                <span class="text-[13.5px] text-bbg-ink">{c}</span>
              </button>
            ))}
          </div>
        )}

        {p.kind === "order" && (
          <div data-answer={p.items.join("|")}>
            <ol data-order-list class="space-y-1.5">
              {p.items.map((it, oi) => (
                <li data-order-item={oi} draggable="true"
                  class="cursor-grab rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-[13.5px] text-bbg-ink select-none">{it}</li>
              ))}
            </ol>
            <button type="button" data-check
              class="mt-2.5 rounded-lg bg-bbg-teal text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-teal/90 transition">
              {t("exercise.check", lang)}
            </button>
          </div>
        )}

        <div data-feedback class="mt-2 text-[12.5px]" hidden></div>
        <div data-hint hidden class="mt-2 text-[12.5px] text-bbg-muted">{p.hint}</div>
      </div>
    ))}
  </div>
</section>

<script>
  function initSet(root: HTMLElement) {
    const problems = Array.from(root.querySelectorAll<HTMLElement>("[data-practice-problem]"));
    const progress = root.querySelector<HTMLElement>("[data-progress]")!;
    let solved = 0;

    function solve(problem: HTMLElement, feedback: HTMLElement) {
      solved += 1;
      progress.textContent = `${solved} / ${problems.length}`;
      feedback.hidden = false;
      feedback.textContent = "✓";
      feedback.className = "mt-2 text-[12.5px] text-bbg-success font-semibold";
    }
    function fail(feedback: HTMLElement, hint: HTMLElement) {
      feedback.hidden = false;
      feedback.textContent = "Not quite — try again.";
      feedback.className = "mt-2 text-[12.5px] text-bbg-warn";
      hint.hidden = false;
    }

    problems.forEach((problem) => {
      const kind = problem.dataset.kind;
      const feedback = problem.querySelector<HTMLElement>("[data-feedback]")!;
      const hint = problem.querySelector<HTMLElement>("[data-hint]")!;
      let done = false;

      if (kind === "numeric") {
        const box = problem.querySelector<HTMLElement>("[data-answer]")!;
        const answer = Number(box.dataset.answer);
        const tolerance = Number(box.dataset.tolerance);
        const input = problem.querySelector<HTMLInputElement>("[data-input]")!;
        const btn = problem.querySelector<HTMLButtonElement>("[data-check]")!;
        const check = () => {
          if (done) return;
          const v = Number(input.value);
          if (Number.isNaN(v)) return;
          if (Math.abs(v - answer) <= tolerance) {
            done = true; solve(problem, feedback);
            input.disabled = true; btn.disabled = true;
          } else fail(feedback, hint);
        };
        btn.addEventListener("click", check);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });
      }

      if (kind === "choice") {
        const box = problem.querySelector<HTMLElement>("[data-answer]")!;
        const answer = Number(box.dataset.answer);
        const buttons = Array.from(problem.querySelectorAll<HTMLButtonElement>("[data-choice]"));
        buttons.forEach((b) => {
          b.addEventListener("click", () => {
            if (done) return;
            if (Number(b.dataset.choice) === answer) {
              done = true; solve(problem, feedback);
              b.classList.add("border-bbg-success", "bg-panel-mint");
              buttons.forEach((x) => (x.disabled = true));
            } else {
              b.classList.add("border-bbg-warn", "bg-panel-rose");
              b.disabled = true;
              fail(feedback, hint);
            }
          });
        });
      }

      if (kind === "order") {
        const box = problem.querySelector<HTMLElement>("[data-answer]")!;
        const list = problem.querySelector<HTMLElement>("[data-order-list]")!;
        const btn = problem.querySelector<HTMLButtonElement>("[data-check]")!;
        let dragged: HTMLElement | null = null;
        list.querySelectorAll<HTMLElement>("[data-order-item]").forEach((item) => {
          item.addEventListener("dragstart", () => { dragged = item; });
          item.addEventListener("dragover", (e) => e.preventDefault());
          item.addEventListener("drop", (e) => {
            e.preventDefault();
            if (!dragged || dragged === item) return;
            const items = Array.from(list.children);
            if (items.indexOf(dragged) < items.indexOf(item)) item.after(dragged);
            else item.before(dragged);
          });
        });
        btn.addEventListener("click", () => {
          if (done) return;
          const order = Array.from(list.querySelectorAll<HTMLElement>("[data-order-item]"))
            .map((el) => el.textContent?.trim() ?? "")
            .join("|");
          if (order === box.dataset.answer) {
            done = true; solve(problem, feedback);
            btn.disabled = true;
          } else fail(feedback, hint);
        });
      }
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-practice-set]").forEach((el) => {
      if (el.querySelector("[data-kind]")) initSet(el);
    });
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

Note: the `init` guard `el.querySelector("[data-kind]")` ensures this script only
drives `AlgoPractice` sets (whose problems carry `data-kind`) and never touches the
math `PracticeSet` (whose problems do not), even if both ever appear on one page.

- [ ] **Step 2: Verify it compiles**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/algo/AlgoPractice.astro
git commit -m "feat(algorithms): add AlgoPractice multi-kind practice widget"
```

---

### Task 9: Track-branched linter + cross-track prereq check

Rewrite `checkLessonRules` so it validates the math skeleton for `track: math` lessons
and the algorithm skeleton for `track: algorithms` lessons, branching on the track
segment of the built file path (`dist/<lang>/learn/<track>/<lesson>/index.html`). Add
`checkMathPrereqs`, a source-level check that every `mathPrereqs` entry resolves to a
real math lesson. The forward-link rule is fixed to ignore cross-track links.

**Files:**
- Modify: `site/src/lint/rules/lessons.ts`
- Modify: `site/src/lint/rules/lessons.test.ts`
- Modify: `site/src/lint/index.ts`

- [ ] **Step 1: Add the failing algorithm-skeleton + mathPrereqs tests**

In `site/src/lint/rules/lessons.test.ts`, update the import line and append two new
`describe` blocks. Change the first import line to:

```typescript
import { checkLessonRules, checkLessonParity, checkMathPrereqs } from "./lessons";
```

Then append, after the existing `checkLessonParity` describe block:

```typescript
const ALGO_PATH = "dist/en/learn/algorithms/01-what-is-an-algorithm/index.html";

function algoSkeleton(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("idea") ? `<div data-lesson-section="idea"></div>` : "",
    has("code") ? `<div data-lesson-section="code"></div>` : "",
    has("trace") ? `<div data-lesson-section="trace"><div data-lesson-visual></div></div>` : "",
    has("complexity") ? `<div data-lesson-section="complexity"></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
  ].join("\n");
}

describe("checkLessonRules — algorithms track", () => {
  test("a complete algorithm lesson passes", () => {
    expect(checkLessonRules(algoSkeleton(), ALGO_PATH)).toEqual([]);
  });

  test("flags a missing algorithm section", () => {
    const errs = checkLessonRules(algoSkeleton({ complexity: false }), ALGO_PATH);
    expect(errs.some((e) => /complexity/.test(e))).toBe(true);
  });

  test("flags a missing trace visual", () => {
    const errs = checkLessonRules(
      algoSkeleton().replace(`<div data-lesson-visual></div>`, ""),
      ALGO_PATH
    );
    expect(errs.some((e) => /visual/.test(e))).toBe(true);
  });

  test("does not require the math 'worked-example' section", () => {
    const errs = checkLessonRules(algoSkeleton(), ALGO_PATH);
    expect(errs.some((e) => /worked-example/.test(e))).toBe(false);
  });

  test("a cross-track link to a math lesson is not a forward link", () => {
    const html = algoSkeleton() + `<a href="/en/learn/math/08-logarithms/">x</a>`;
    const errs = checkLessonRules(html, ALGO_PATH);
    expect(errs.some((e) => /forward/.test(e))).toBe(false);
  });
});

async function mpFixture(root: string, rel: string, body: string) {
  const dir = join(root, "content/lessons", rel);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.mdx"), body);
}

describe("checkMathPrereqs", () => {
  test("flags a mathPrereqs ref with no matching math lesson", async () => {
    const r = await mkdtemp(join(tmpdir(), "mp-"));
    await mpFixture(r, "en/algorithms/01-thinking-complexity/01-what-is-an-algorithm",
      `---\nslug: 01-what-is-an-algorithm\nlang: en\ntrack: algorithms\nmathPrereqs: ["math/08-growth/02-logarithms"]\n---\nbody\n`);
    const errs = await checkMathPrereqs(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.some((e) => /02-logarithms/.test(e))).toBe(true);
  });

  test("passes when the referenced math lesson exists", async () => {
    const r = await mkdtemp(join(tmpdir(), "mp-"));
    await mpFixture(r, "en/math/08-growth/02-logarithms",
      `---\nslug: 02-logarithms\nlang: en\ntrack: math\n---\nbody\n`);
    await mpFixture(r, "en/algorithms/01-thinking-complexity/01-what-is-an-algorithm",
      `---\nslug: 01-what-is-an-algorithm\nlang: en\ntrack: algorithms\nmathPrereqs: ["math/08-growth/02-logarithms"]\n---\nbody\n`);
    const errs = await checkMathPrereqs(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd site && bunx vitest run src/lint/rules/lessons.test.ts`
Expected: FAIL — `checkMathPrereqs` is not exported, and the algorithm-track tests fail
because `checkLessonRules` currently validates the math skeleton for every track.

- [ ] **Step 3: Rewrite `lessons.ts`**

Replace the entire contents of `site/src/lint/rules/lessons.ts` with:

```typescript
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const MATH_SECTIONS = ["hook", "goal", "worked-example", "check", "recap"] as const;
const ALGO_SECTIONS = ["hook", "goal", "idea", "code", "trace", "complexity", "check", "recap"] as const;

/** Built lesson page: dist/<lang>/learn/<track>/<lesson>/index.html — else null. */
function lessonInfoFromPath(file: string): { slug: string; track: string } | null {
  const seg = file.split(/[\\/]/).filter(Boolean);
  if (seg.length === 6 && seg[0] === "dist" && seg[2] === "learn" && seg[5].startsWith("index.")) {
    return { track: seg[3], slug: seg[4] };
  }
  return null;
}

function orderOf(slug: string): number {
  const m = slug.match(/^(\d{2})-/);
  return m ? Number(m[1]) : NaN;
}

/** First occurrence index of each data-lesson-section value. */
function sectionIndexes(html: string): Map<string, number> {
  const seen = new Map<string, number>();
  const re = /data-lesson-section="([a-z-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!seen.has(m[1])) seen.set(m[1], m.index);
  }
  return seen;
}

type OrderEntry = readonly [string, number | undefined];

function checkOrder(order: readonly OrderEntry[], file: string): string[] {
  const errs: string[] = [];
  let prev = -1;
  let prevName = "start";
  for (const [name, idx] of order) {
    if (idx === undefined) continue;
    if (idx < prev) errs.push(`${file}: lesson section "${name}" appears before "${prevName}"`);
    prev = idx;
    prevName = name;
  }
  return errs;
}

/** Rules every track shares: visual, practice count, hydration cap, forward links, sources. */
function commonLessonRules(html: string, file: string, slug: string, track: string): string[] {
  const errs: string[] = [];

  if (html.search(/data-lesson-visual\b/) < 0) errs.push(`${file}: lesson has no visual widget`);
  if (html.search(/data-practice-set\b/) < 0) {
    errs.push(`${file}: lesson skeleton missing practice (no PracticeSet)`);
  }

  const practiceBlock = html.match(/<section[^>]*data-practice-set[^>]*>([\s\S]*?)<\/section>/);
  if (practiceBlock) {
    const problems = practiceBlock[1].match(/data-practice-problem\b/g)?.length ?? 0;
    if (problems < 4) errs.push(`${file}: practice problems: ${problems} found (min 4)`);
  }

  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  if (islands > 5) errs.push(`${file}: ${islands} hydration islands (max 5 on lesson pages)`);

  // Forward link: only links *within the same track* to a higher-ordered lesson count.
  const thisOrder = orderOf(slug);
  const linkRe = /href="\/(?:en|ru)\/learn\/([a-z-]+)\/(\d{2}-[a-z0-9-]+)\/?"/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    if (m[1] !== track) continue;
    const targetOrder = orderOf(m[2]);
    if (Number.isFinite(targetOrder) && Number.isFinite(thisOrder) && targetOrder > thisOrder) {
      errs.push(`${file}: forward link to higher-ordered lesson "${m[2]}"`);
    }
  }

  const footer = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
  if ((/Sources/i.test(footer) || /Источник/i.test(footer)) && !/href="https?:\/\//.test(footer)) {
    errs.push(`${file}: lesson sources footer has no external link`);
  }
  return errs;
}

function checkMathLesson(html: string, file: string, slug: string): string[] {
  const errs = commonLessonRules(html, file, slug, "math");
  const seen = sectionIndexes(html);
  for (const s of MATH_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: lesson skeleton missing "${s}" section`);
  }
  const stepIdx = html.search(/data-lesson-step\b/);
  if (stepIdx < 0) errs.push(`${file}: lesson skeleton missing explanation (no Step component)`);
  const visualIdx = html.search(/data-lesson-visual\b/);
  const practiceIdx = html.search(/data-practice-set\b/);
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
  return errs;
}

function checkAlgoLesson(html: string, file: string, slug: string): string[] {
  const errs = commonLessonRules(html, file, slug, "algorithms");
  const seen = sectionIndexes(html);
  for (const s of ALGO_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: algorithm lesson missing "${s}" section`);
  }
  const practiceIdx = html.search(/data-practice-set\b/);
  errs.push(
    ...checkOrder(
      [
        ["hook", seen.get("hook")],
        ["goal", seen.get("goal")],
        ["idea", seen.get("idea")],
        ["code", seen.get("code")],
        ["trace", seen.get("trace")],
        ["complexity", seen.get("complexity")],
        ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
        ["check", seen.get("check")],
        ["recap", seen.get("recap")],
      ],
      file
    )
  );
  return errs;
}

export function checkLessonRules(html: string, file: string): string[] {
  const info = lessonInfoFromPath(file);
  if (!info) return [];
  return info.track === "algorithms"
    ? checkAlgoLesson(html, file, info.slug)
    : checkMathLesson(html, file, info.slug);
}

async function walkMdx(dir: string): Promise<string[]> {
  let items: import("node:fs").Dirent[];
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walkMdx(p)));
    else if (i.name === "index.mdx" || i.name === "index.md") out.push(p);
  }
  return out;
}

/** Source-level: every ready EN lesson has a ready RU twin and vice versa. */
export async function checkLessonParity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsDir = join(siteSrc, "content/lessons");
  const files = await walkMdx(lessonsDir);
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
  for (const k of enReady) {
    if (!ruReady.has(k)) errs.push(`lesson-parity: EN ready lesson "${k}" missing RU twin`);
  }
  for (const k of ruReady) {
    if (!enReady.has(k)) errs.push(`lesson-parity: RU ready lesson "${k}" missing EN twin`);
  }
  return errs;
}

/** Source-level: every mathPrereqs entry resolves to an existing math lesson. */
export async function checkMathPrereqs(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsDir = join(siteSrc, "content/lessons");
  const files = await walkMdx(lessonsDir);

  const mathKeys = new Set<string>();
  for (const f of files) {
    const parts = f.split(/[\\/]/);
    const idx = parts.findIndex((p) => p === "lessons");
    if (parts[idx + 2] !== "math") continue;
    mathKeys.add(`math/${parts[idx + 3]}/${parts[idx + 4]}`);
  }

  for (const f of files) {
    const body = await readFile(f, "utf8");
    const fm = body.match(/^mathPrereqs:\s*\[([^\]]*)\]/m);
    if (!fm) continue;
    const refs = [...fm[1].matchAll(/["']([^"']+)["']/g)].map((r) => r[1]);
    for (const ref of refs) {
      if (!mathKeys.has(ref)) {
        errs.push(`math-prereq: "${f}" references missing math lesson "${ref}"`);
      }
    }
  }
  return errs;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd site && bunx vitest run src/lint/rules/lessons.test.ts`
Expected: PASS — all math-track tests, all algorithm-track tests, both
`checkLessonParity` tests, and both `checkMathPrereqs` tests.

- [ ] **Step 5: Wire `checkMathPrereqs` into the build linter**

In `site/src/lint/index.ts`, change the import line:

```typescript
import { checkLessonRules, checkLessonParity } from "./rules/lessons";
```

to:

```typescript
import { checkLessonRules, checkLessonParity, checkMathPrereqs } from "./rules/lessons";
```

Then, in the "Source-level + global checks" block, add the `checkMathPrereqs` call
right after the `checkLessonParity` line:

```typescript
        errs.push(...(await checkI18nParity(siteSrc)));
        errs.push(...(await checkLessonParity(siteSrc)));
        errs.push(...(await checkMathPrereqs(siteSrc)));
        errs.push(...(await checkReducedMotion(root)));
```

- [ ] **Step 6: Run the full build to confirm the linter still passes for the math track**

Run: `cd site && bun run build`
Expected: PASS, lint clean. The algorithms track has no lessons yet, so the new
algorithm branch is exercised by no pages; all 32 math lessons still pass. The page
count rises by 2 versus before this work — the EN and RU `/learn/algorithms/`
unit-overview pages (one per track per language).

- [ ] **Step 7: Commit**

```bash
git add site/src/lint/rules/lessons.ts site/src/lint/rules/lessons.test.ts site/src/lint/index.ts
git commit -m "feat(algorithms): branch lesson linter on track, add mathPrereqs check"
```

---

### Task 10: Extend the `/teach` command and document the track

**Files:**
- Modify: `.claude/commands/teach.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Lift the domain lock in `teach.md`**

In `.claude/commands/teach.md`, replace the `## Domain lock` section body:

```markdown
## Domain lock

This command authors **mathematics** lessons only (the algorithms track is added
later). Refuse any off-domain request.
```

with:

```markdown
## Domain lock

This command authors **mathematics** and **algorithms** lessons only. Refuse any
off-domain request (anything outside math or algorithms).
```

- [ ] **Step 2: Add the algorithms input form and skeleton to `teach.md`**

In `.claude/commands/teach.md`, in the `## Input form` section, add the algorithm
examples after the existing math examples:

```
/teach math/01-numbers/01-counting
/teach math/08-growth/04-what-is-a-logarithm
/teach algorithms/01-thinking-complexity/01-what-is-an-algorithm
/teach algorithms/09-graphs/03-breadth-first-search
```

In the Pipeline section, step 3 ("Author EN MDX") currently names only the math
skeleton. Replace that step's body with:

```markdown
3. **Author EN MDX** — follow the fixed linear skeleton for the track, in order:
   - **math:** Hook -> Goal -> Explanation (Step components) -> Visual (a math widget)
     -> WorkedExample -> Practice (PracticeSet, >= 4 problems) -> Check (a Quiz) ->
     Recap.
   - **algorithms:** Hook -> Goal -> Idea -> Code -> Trace (AlgoTrace) -> Complexity
     -> Practice (AlgoPractice, >= 4 problems) -> Check (a Quiz) -> Recap.
   Insert `<Inset>` blocks (`why` / `practice` / `mistake` / `edgecase`) where useful.
```

In step 2 ("Research"), add an algorithms sources sentence after the math sources
sentence:

```markdown
   For algorithms, use CLRS, Sedgewick, competitive-programming references, NeetCode,
   and vetted algorithm resources — not Khan Academy / OpenStax.
```

In the `## The command enforces` list, replace the skeleton line:

```markdown
- Skeleton present and in order.
```

with:

```markdown
- Skeleton present and in order for the track (math or algorithm skeleton).
- Algorithm lessons may declare `mathPrereqs` (cross-track prerequisites into the math
  track); each must resolve to an existing math lesson.
```

- [ ] **Step 3: Document the algorithms track in `CLAUDE.md`**

In `CLAUDE.md`, in the `## Secondary command: /teach` section, the first bullet
currently reads:

```markdown
- **First track:** `math` (mathematics from zero — for a reader who knows only basic
  arithmetic). The `algorithms` track is a later cycle.
```

Replace it with:

```markdown
- **Tracks:** `math` (mathematics from zero — for a reader who knows only basic
  arithmetic, complete) and `algorithms` (algorithms from zero — for a reader who knows
  one programming language but no algorithms; endpoint: confidently solve LeetCode
  Medium and most Hard). The `algorithms` track uses a distinct lesson skeleton
  (Hook -> Goal -> Idea -> Code -> Trace -> Complexity -> Practice -> Check -> Recap),
  its widgets live in `site/src/components/algo/`, and lessons may declare `mathPrereqs`
  cross-track prerequisites into the math track.
- Spec: `docs/superpowers/specs/2026-05-16-foundations-algorithms-track-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/teach.md CLAUDE.md
git commit -m "docs(algorithms): extend /teach domain lock to algorithms, document track"
```

---

### Task 11: Proof lesson — author `01-what-is-an-algorithm` (EN + RU)

Author one complete bilingual lesson to prove the infrastructure end-to-end: schema,
skeleton, every algorithm widget, the linter branch, routing, and the layout. Topic:
*What is an algorithm?* — the first lesson of Unit 01. The worked algorithm is finding
the largest number in a list.

**Files:**
- Create: `site/src/content/lessons/en/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.mdx`
- Modify: `site/src/i18n/glossary.json` — add the lesson's `concepts` terms.

- [ ] **Step 1: Add glossary terms**

In `site/src/i18n/glossary.json`, add these entries in alphabetical order among the
existing keys:

```json
  "algorithm":      { "en": "algorithm",       "ru": "алгоритм" },
  "input_output":   { "en": "input and output", "ru": "вход и выход" },
  "step_count":     { "en": "step count",      "ru": "число шагов" },
```

- [ ] **Step 2: Author the EN lesson**

Create `site/src/content/lessons/en/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.mdx`.
Use this exact frontmatter and import block (the import paths have **six** `..`
segments — verified against the math proof lesson):

```mdx
---
slug: 01-what-is-an-algorithm
lang: en
track: algorithms
unit: 01-thinking-complexity
order: 1
title: "What is an algorithm?"
summary: "An algorithm is a finite list of unambiguous steps that turns an input into an output."
estMin: 16
status: ready
prereqs: []
mathPrereqs: []
concepts: ["algorithm", "input_output", "step_count"]
sources:
  - https://en.wikipedia.org/wiki/Algorithm
  - https://developer.mozilla.org/en-US/docs/Glossary/Algorithm
---

import Hook from "../../../../../../components/lesson/Hook.astro";
import Goal from "../../../../../../components/lesson/Goal.astro";
import Idea from "../../../../../../components/lesson/Idea.astro";
import Code from "../../../../../../components/lesson/Code.astro";
import Trace from "../../../../../../components/lesson/Trace.astro";
import Complexity from "../../../../../../components/lesson/Complexity.astro";
import Check from "../../../../../../components/lesson/Check.astro";
import Recap from "../../../../../../components/lesson/Recap.astro";
import Inset from "../../../../../../components/lesson/Inset.astro";
import AnnotatedCode from "../../../../../../components/algo/AnnotatedCode.astro";
import AlgoTrace from "../../../../../../components/algo/AlgoTrace.astro";
import CodeRunner from "../../../../../../components/algo/CodeRunner.astro";
import AlgoPractice from "../../../../../../components/algo/AlgoPractice.astro";
import Quiz from "../../../../../../components/pedagogy/Quiz.astro";
```

Author the body in this exact section order. Each section uses the named component;
write the prose to a confident-beginner depth (the reader can already program, but has
never met the word "algorithm" as a precise term):

1. `<Hook>` — an everyday recipe/route-planning situation that is secretly an algorithm.
2. `<Goal lang="en">` — after this lesson the reader can define an algorithm precisely
   and count the steps a small algorithm takes.
3. `<Idea lang="en">` — an algorithm is a finite list of unambiguous steps; input goes
   in, output comes out; "finite" and "unambiguous" are the load-bearing words. Use an
   `<AnnotatedCode>` block here showing the `largestOf` function (code below) with 2–3
   line annotations.
4. `<Code lang="en">` — present the implementation in prose + the same `largestOf`
   function. The function:
   ```js
   function largestOf(numbers) {
     let largest = numbers[0];
     for (let i = 1; i < numbers.length; i++) {
       if (numbers[i] > largest) {
         largest = numbers[i];
       }
     }
     return largest;
   }
   ```
   Follow it with a `<CodeRunner id="cr-largest" lang="en" code={...} />` whose `code`
   prop is the `largestOf` function plus a `console.log(largestOf([3, 9, 2, 7]));`
   call, so the reader can run it.
5. `<Trace lang="en">` — an `<AlgoTrace>` stepping through `largestOf([3, 9, 2, 7])`.
   The `code` prop is the function's lines as a string array; the `frames` prop walks
   each loop iteration, marking the current cell `active`, settled cells `done`, and
   the running `largest` in the caption. At least 6 frames.
6. `<Complexity lang="en">` — the loop visits each of the n elements once, so the step
   count grows in step with n: this is O(n). Contrast with checking every pair (O(n²)).
   No `mathPrereqs` are needed for this lesson; later complexity lessons will use them.
7. `<AlgoPractice id="practice-algo-1" lessonSlug="01-what-is-an-algorithm" lang="en"
   problems={...} />` — at least 4 problems mixing the kinds: one `numeric` (step count
   for a given input), one `choice` (which of these is / is not an algorithm; or pick
   the complexity), one `order` (arrange the steps of `largestOf` correctly), and one
   more of any kind.
8. `<Check lang="en">` — a `<Quiz>` with one question and 3–4 choices, at least one
   carrying a `misconception`.
9. `<Recap lang="en">` — algorithm = finite, unambiguous steps; input → output; step
   count is how we measure cost.

Add one or two `<Inset>` blocks where useful (e.g. an `edgecase` inset on the empty-list
case of `largestOf`, or a `mistake` inset on confusing "an algorithm" with "code").

- [ ] **Step 3: Author the RU lesson**

Create `site/src/content/lessons/ru/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.mdx`
as a structurally identical translation. Frontmatter is the same except `lang: ru` and
translated `title` / `summary`. Use the same imports. Translate every section; keep the
code identical (code is language-neutral); translate captions, prompts, and hints.
Use the glossary terms added in Step 1.

- [ ] **Step 4: Add the lesson to the unit (already done in Task 1)**

Confirm `site/src/content/units.json` already lists `"01-what-is-an-algorithm"` in the
`01-thinking-complexity` unit's `lessons` array (added in Task 1, Step 2). No change
needed if so.

- [ ] **Step 5: Build and verify the linter passes**

Run: `cd site && bun run build`
Expected: PASS, lint clean. The page count rises by 2 — the EN and RU lesson pages.
Then inspect the report:

Run: `cd site && cat dist/lint-report.json`
Expected: `{ "errors": [], "warnings": [] }` (or warnings only — no errors).

- [ ] **Step 6: Visual check in a browser**

Run: `cd site && bun run dev`
Open these URLs and verify:
- `http://localhost:4321/en/learn/algorithms/` — the unit-overview page lists the 12
  units, and Unit 01 shows the `01-what-is-an-algorithm` lesson.
- `http://localhost:4321/en/learn/algorithms/01-what-is-an-algorithm` — the lesson
  renders; `AlgoTrace` prev/next steps and highlights the code line; `CodeRunner` Run
  produces output; `AlgoPractice` accepts answers for all three problem kinds; the
  `Quiz` works.
- `http://localhost:4321/ru/learn/algorithms/01-what-is-an-algorithm` — the RU twin
  renders identically.

Stop the dev server when done.

- [ ] **Step 7: Commit**

```bash
git add site/src/content/lessons/en/algorithms site/src/content/lessons/ru/algorithms site/src/i18n/glossary.json
git commit -m "content(algorithms): 01-thinking-complexity/01-what-is-an-algorithm EN+RU ready"
```

---

## After Phase 0

Phase 0 leaves a working `/learn/algorithms/` section: the track, 12 units, the
algorithm lesson skeleton, the widget family, the track-branched linter, the
`mathPrereqs` cross-track check, the extended `/teach` command, and one proven
bilingual lesson.

**Phase 1+ — authoring (not enumerated here).** The remaining lessons of Unit 01 and
all of Units 02–12 (~155 lesson files) are authored by repeated
`/teach algorithms/<unit>/<lesson>` invocations — one lesson EN+RU per invocation, one
commit per lesson, exactly as the math track's ~79 follow-on lessons were authored.
Each new unit's `lessons` array in `units.json` is filled as its lessons land. New
data-structure visuals (tree and graph figures) are added to
`site/src/components/algo/` when Units 07 and 09 are authored — `StructureFigure.astro`
covers the linear structures of Units 01–06.

Phasing follows the spec section 7: P1 = Units 02–04, P2 = Units 05–07, P3 = Units
08–09, P4 = Units 10–12.
