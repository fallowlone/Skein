# Foundations Math Track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the isolated infrastructure for an absolute-beginner math learning section (collections, routing, layout, widgets, linter, `/teach` command) and prove it end-to-end with one fully authored bilingual lesson.

**Architecture:** A new `foundations` section lives inside the existing `site/` Astro project. It adds three content collections (`tracks`, `units`, `lessons`) fully separate from the fullstack `book` collection, its own linear lesson layout, its own widget family (mostly static SVG `.astro`, interactivity via inline `<script>` so zero hydration islands), and its own linter ruleset wired into the existing `astro:build:done` lint pass. Authoring a lesson is done with a new `/teach` command parallel to `/infographic`.

**Tech Stack:** Astro 5, Preact (compat off), Tailwind, MDX, Zod content schemas, Vitest (linter rule tests), `bun` for install/build.

**Scope:** This plan covers Phase 0 (infrastructure) and Phase 1 (one proof lesson). It produces working, testable software: a navigable `/learn/math/` section with one complete lesson and a passing build. Authoring the remaining ~79 lessons is Phase 2+ — repeated `/teach` invocations, one commit per lesson, not enumerated here.

**Reference files (read before starting):**
- `site/src/content/config.ts` — collection definitions to extend.
- `site/src/types/index.ts` — shared types.
- `site/src/lint/index.ts` + `site/src/lint/rules/*` — linter integration and rule pattern.
- `site/src/lint/rules/text-budgets.test.ts` — Vitest rule-test pattern.
- `site/src/layouts/Chapter.astro`, `site/src/layouts/Topic.astro` — layout pattern to mirror.
- `site/src/pages/[lang]/[pillar]/[piece].astro` — piece-page route pattern to mirror.
- `site/src/components/pedagogy/NumberDrill.astro` — `.astro` + inline `<script>` interactive widget pattern (zero hydration islands).
- `site/src/components/prose/Term.astro` — glossary term component.
- `docs/superpowers/specs/2026-05-16-foundations-math-track-design.md` — the approved spec.

---

## File Structure

**New content data files:**
- `site/src/content/tracks.json` — track list (math; algorithms later).
- `site/src/content/units.json` — units (chapters) of each track.

**New content collection (lessons):**
- `site/src/content/lessons/en/math/01-numbers/01-counting/index.mdx` — EN proof lesson.
- `site/src/content/lessons/ru/math/01-numbers/01-counting/index.mdx` — RU proof lesson.

**Modified:**
- `site/src/content/config.ts` — add `tracks`, `units`, `lessons` collections.
- `site/src/types/index.ts` — add `TRACKS` constant + types.
- `site/src/lint/index.ts` — wire in foundations rules.
- `site/src/i18n/ui.json` — add lesson UI strings.
- `site/src/i18n/glossary.json` — add proof-lesson concepts.
- `CLAUDE.md` — document `/teach` and the foundations section.

**New routing pages:**
- `site/src/pages/[lang]/learn/index.astro` — track list.
- `site/src/pages/[lang]/learn/[track]/index.astro` — unit overview.
- `site/src/pages/[lang]/learn/[track]/[lesson].astro` — lesson reader.

**New layout:**
- `site/src/layouts/Lesson.astro` — linear lesson chrome.

**New lesson-section components (`site/src/components/lesson/`):**
- `Hook.astro`, `Goal.astro`, `Step.astro`, `WorkedExample.astro`, `Check.astro`, `Recap.astro`, `Inset.astro`.

**New math widgets (`site/src/components/math/`):**
- `NumberLine.astro`, `PlaceValueGrid.astro`, `BarModel.astro`, `FunctionPlot.astro`, `PracticeSet.astro`.

**New linter rule file + test:**
- `site/src/lint/rules/lessons.ts`, `site/src/lint/rules/lessons.test.ts`.

**New command:**
- `.claude/commands/teach.md`.

---

## Phase 0 — Infrastructure

### Task 1: Track and unit data + types

**Files:**
- Modify: `site/src/types/index.ts`
- Create: `site/src/content/tracks.json`
- Create: `site/src/content/units.json`

- [ ] **Step 1: Add track types to `types/index.ts`**

Append to `site/src/types/index.ts`:

```typescript
export type Track = "math" | "algorithms";

export const TRACKS: Track[] = ["math", "algorithms"];

export type LessonStatus = "stub" | "draft" | "ready";
```

- [ ] **Step 2: Create `tracks.json`**

Create `site/src/content/tracks.json`:

```json
[
  { "slug": "math", "order": 1, "color": "mint",
    "title": { "en": "Mathematics from zero", "ru": "Математика с нуля" },
    "blurb": {
      "en": "Start knowing only how to count. Finish with the math foundation a programmer needs.",
      "ru": "Начни, зная только счёт. Закончи с математической базой, нужной программисту."
    } }
]
```

- [ ] **Step 3: Create `units.json` with the 10 math units**

Create `site/src/content/units.json`. Unit 01 lists its lessons; later units list `[]` for now (filled as lessons are authored).

```json
[
  { "slug": "01-numbers", "track": "math", "order": 1,
    "title": { "en": "Numbers and counting", "ru": "Числа и счёт" },
    "crux": {
      "en": "What a number really is, and why where a digit sits changes its value.",
      "ru": "Что такое число на самом деле и почему место цифры меняет её значение."
    },
    "lessons": ["01-counting"] },
  { "slug": "02-operations", "track": "math", "order": 2,
    "title": { "en": "Four operations in depth", "ru": "Четыре действия глубоко" },
    "crux": {
      "en": "Addition, subtraction, multiplication, division — what they mean, not just how.",
      "ru": "Сложение, вычитание, умножение, деление — что они значат, а не только как."
    },
    "lessons": [] },
  { "slug": "03-fractions", "track": "math", "order": 3,
    "title": { "en": "Fractions, decimals, percents", "ru": "Дроби, десятичные, проценты" },
    "crux": {
      "en": "Three ways to write a part of a whole, and how to move between them.",
      "ru": "Три способа записать часть целого и как переходить между ними."
    },
    "lessons": [] },
  { "slug": "04-powers", "track": "math", "order": 4,
    "title": { "en": "Powers and roots", "ru": "Степени и корни" },
    "crux": {
      "en": "Repeated multiplication, and the question it cannot un-ask: the root.",
      "ru": "Повторное умножение и обратный к нему вопрос: корень."
    },
    "lessons": [] },
  { "slug": "05-algebra", "track": "math", "order": 5,
    "title": { "en": "Variables and algebra", "ru": "Переменные и алгебра" },
    "crux": {
      "en": "A letter that stands for a number you do not know yet.",
      "ru": "Буква, которая обозначает число, пока тебе неизвестное."
    },
    "lessons": [] },
  { "slug": "06-functions", "track": "math", "order": 6,
    "title": { "en": "Functions", "ru": "Функции" },
    "crux": {
      "en": "A machine: one input goes in, one output comes out, every time.",
      "ru": "Машина: один вход входит, один выход выходит, каждый раз."
    },
    "lessons": [] },
  { "slug": "07-logic", "track": "math", "order": 7,
    "title": { "en": "Logic and sets", "ru": "Логика и множества" },
    "crux": {
      "en": "True and false, and how to combine them; collections of things.",
      "ru": "Истина и ложь и как их соединять; наборы вещей."
    },
    "lessons": [] },
  { "slug": "08-growth", "track": "math", "order": 8,
    "title": { "en": "Growth and logarithms", "ru": "Рост и логарифмы" },
    "crux": {
      "en": "Some things grow slowly, some explode — and the log measures the difference.",
      "ru": "Что-то растёт медленно, что-то взрывается — а логарифм измеряет разницу."
    },
    "lessons": [] },
  { "slug": "09-combinatorics", "track": "math", "order": 9,
    "title": { "en": "Combinatorics", "ru": "Комбинаторика" },
    "crux": {
      "en": "Counting possibilities without listing them one by one.",
      "ru": "Подсчёт вариантов без перечисления их по одному."
    },
    "lessons": [] },
  { "slug": "10-probability", "track": "math", "order": 10,
    "title": { "en": "Probability", "ru": "Вероятность" },
    "crux": {
      "en": "Putting a number on how likely something is.",
      "ru": "Как поставить число на то, насколько что-то вероятно."
    },
    "lessons": [] }
]
```

- [ ] **Step 4: Commit**

```bash
git add site/src/types/index.ts site/src/content/tracks.json site/src/content/units.json
git commit -m "feat(foundations): add track and unit data files"
```

---

### Task 2: Lessons collection schema

**Files:**
- Modify: `site/src/content/config.ts`

- [ ] **Step 1: Add the three collections to `config.ts`**

In `site/src/content/config.ts`, after the existing `book` collection definition and before the `export const collections` line, add:

```typescript
import { TRACKS } from "../types";

const Track = z.enum(TRACKS as [string, ...string[]]);
const SlugRe = /^\d{2}-[a-z0-9-]+$/;

const tracks = defineCollection({
  loader: file("src/content/tracks.json"),
  schema: z.object({
    slug: Track,
    order: z.number().int().positive(),
    title: Bi,
    blurb: Bi,
    color: z.enum(["lilac", "mint", "peach", "sky", "rose"]),
  }),
});

const units = defineCollection({
  loader: file("src/content/units.json"),
  schema: z.object({
    slug: z.string().regex(SlugRe),
    track: Track,
    order: z.number().int().positive(),
    title: Bi,
    crux: Bi,
    lessons: z.array(z.string().regex(SlugRe)),
  }),
});

const lessons = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/lessons",
    generateId: ({ entry }) =>
      entry.replace(/\/index\.(md|mdx)$/, "").replace(/\.(md|mdx)$/, ""),
  }),
  schema: z.object({
    slug: z.string().regex(SlugRe),
    lang: Lang,
    track: Track,
    unit: z.string().regex(SlugRe),
    order: z.number().int().positive(),
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(280),
    estMin: z.number().int().positive(),
    status: Status.default("stub"),
    prereqs: z.array(z.string()).default([]),
    concepts: z.array(z.string()).default([]),
    sources: z.array(z.string().url()).min(1),
  }),
});
```

Note: `Bi`, `Lang`, `Status`, `defineCollection`, `glob`, `file`, `z` are already imported/defined at the top of the file. Only `TRACKS` is a new import — place its `import` line next to the existing `import { PILLARS } from "../types";`.

- [ ] **Step 2: Register the new collections in the export**

Change the last line of `config.ts` from:

```typescript
export const collections = { pillars, chapters, book };
```

to:

```typescript
export const collections = { pillars, chapters, book, tracks, units, lessons };
```

- [ ] **Step 3: Run the type check to verify the schema compiles**

Run: `cd site && bun run check`
Expected: PASS (no content collection errors). `tracks`/`units` load from JSON; `lessons` has no entries yet, which is valid.

- [ ] **Step 4: Commit**

```bash
git add site/src/content/config.ts
git commit -m "feat(foundations): add tracks, units, lessons collections"
```

---

### Task 3: Foundations linter rules

The linter runs in `astro:build:done` on the built `dist/` HTML, plus source-level checks. This task adds one HTML-level rule function and one source-level rule function, both Vitest-tested.

Lesson pages build to `dist/<lang>/learn/<track>/<lesson>/index.html` — five path segments after `dist/`. The existing `hydration-budget` rule only fires on four-segment piece pages, so lesson pages are untouched by it; the foundations rule owns lesson-page checks.

**Files:**
- Create: `site/src/lint/rules/lessons.ts`
- Create: `site/src/lint/rules/lessons.test.ts`
- Modify: `site/src/lint/index.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/lint/rules/lessons.test.ts`:

```typescript
import { describe, expect, test } from "vitest";
import { checkLessonRules } from "./lessons";

const LESSON_PATH = "dist/en/learn/math/01-counting/index.html";

function skeleton(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
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
  ].join("\n");
}

describe("checkLessonRules", () => {
  test("a complete lesson passes", () => {
    expect(checkLessonRules(skeleton(), LESSON_PATH)).toEqual([]);
  });

  test("ignores non-lesson pages", () => {
    expect(checkLessonRules("<div></div>", "dist/en/networking/03-tcp-handshake/index.html")).toEqual([]);
  });

  test("flags a missing skeleton section", () => {
    const errs = checkLessonRules(skeleton({ recap: false }), LESSON_PATH);
    expect(errs.some((e) => /recap/.test(e))).toBe(true);
  });

  test("flags fewer than 4 practice problems", () => {
    const html = skeleton().replace(
      /<section data-practice-set>[\s\S]*?<\/section>/,
      `<section data-practice-set><div data-practice-problem></div></section>`
    );
    const errs = checkLessonRules(html, LESSON_PATH);
    expect(errs.some((e) => /practice/.test(e))).toBe(true);
  });

  test("flags zero visual widgets", () => {
    const errs = checkLessonRules(skeleton({ visual: false }), LESSON_PATH);
    expect(errs.some((e) => /visual/.test(e))).toBe(true);
  });

  test("flags more than 5 hydration islands", () => {
    const html = skeleton() + "<astro-island></astro-island>".repeat(6);
    const errs = checkLessonRules(html, LESSON_PATH);
    expect(errs.some((e) => /hydration/.test(e))).toBe(true);
  });

  test("flags a forward link to a higher-ordered lesson family", () => {
    const html = skeleton() + `<a href="/en/learn/math/99-future-lesson/">x</a>`;
    const errs = checkLessonRules(html, LESSON_PATH);
    expect(errs.some((e) => /forward/.test(e))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd site && bun run test src/lint/rules/lessons.test.ts`
Expected: FAIL with "Cannot find module './lessons'".

- [ ] **Step 3: Write `lessons.ts`**

Create `site/src/lint/rules/lessons.ts`:

```typescript
const REQUIRED_SECTIONS = ["hook", "goal", "worked-example", "check", "recap"] as const;

/** True only for built lesson pages: dist/<lang>/learn/<track>/<lesson>/index.html */
function lessonSlugFromPath(file: string): string | null {
  const afterDist = file.split(/[\\/]dist[\\/]/)[1] ?? "";
  const seg = afterDist.split(/[\\/]/).filter(Boolean);
  // ["en","learn","math","01-counting","index.html"]
  if (seg.length === 5 && seg[1] === "learn" && seg[4].startsWith("index.")) {
    return seg[3];
  }
  return null;
}

function orderOf(slug: string): number {
  const m = slug.match(/^(\d{2})-/);
  return m ? Number(m[1]) : NaN;
}

export function checkLessonRules(html: string, file: string): string[] {
  const lessonSlug = lessonSlugFromPath(file);
  if (!lessonSlug) return [];
  const errs: string[] = [];

  // Rule 1: skeleton sections present and ordered.
  const seen = new Map<string, number>();
  const sectionRe = /data-lesson-section="([a-z-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(html))) {
    if (!seen.has(m[1])) seen.set(m[1], m.index);
  }
  const stepIdx = html.search(/data-lesson-step\b/);
  const visualIdx = html.search(/data-lesson-visual\b/);
  const practiceIdx = html.search(/data-practice-set\b/);

  for (const s of REQUIRED_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: lesson skeleton missing "${s}" section`);
  }
  if (stepIdx < 0) errs.push(`${file}: lesson skeleton missing explanation (no Step component)`);
  if (visualIdx < 0) errs.push(`${file}: lesson has no visual widget`);
  if (practiceIdx < 0) errs.push(`${file}: lesson skeleton missing practice (no PracticeSet)`);

  // Ordering: hook < goal < step < visual < worked-example < practice < check < recap.
  const order = [
    ["hook", seen.get("hook")],
    ["goal", seen.get("goal")],
    ["step", stepIdx >= 0 ? stepIdx : undefined],
    ["visual", visualIdx >= 0 ? visualIdx : undefined],
    ["worked-example", seen.get("worked-example")],
    ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
    ["check", seen.get("check")],
    ["recap", seen.get("recap")],
  ] as const;
  let prev = -1;
  let prevName = "start";
  for (const [name, idx] of order) {
    if (idx === undefined) continue;
    if (idx < prev) errs.push(`${file}: lesson section "${name}" appears before "${prevName}"`);
    prev = idx;
    prevName = name;
  }

  // Rule: >= 4 practice problems.
  const practiceBlock = html.match(/<section[^>]*data-practice-set[^>]*>([\s\S]*?)<\/section>/);
  if (practiceBlock) {
    const problems = practiceBlock[1].match(/data-practice-problem\b/g)?.length ?? 0;
    if (problems < 4) {
      errs.push(`${file}: PracticeSet has ${problems} problems (min 4)`);
    }
  }

  // Rule: hydration cap 5.
  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  if (islands > 5) errs.push(`${file}: ${islands} hydration islands (max 5 on lesson pages)`);

  // Rule: no forward links to a higher-ordered lesson in the same track.
  const thisOrder = orderOf(lessonSlug);
  const linkRe = /href="\/(?:en|ru)\/learn\/[a-z-]+\/(\d{2}-[a-z0-9-]+)\/?"/g;
  while ((m = linkRe.exec(html))) {
    const targetOrder = orderOf(m[1]);
    if (Number.isFinite(targetOrder) && Number.isFinite(thisOrder) && targetOrder > thisOrder) {
      errs.push(`${file}: forward link to higher-ordered lesson "${m[1]}"`);
    }
  }

  // Rule: sources footer must carry an external link.
  const footer = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
  if ((/Sources/i.test(footer) || /Источник/i.test(footer)) && !/href="https?:\/\//.test(footer)) {
    errs.push(`${file}: lesson sources footer has no external link`);
  }

  return errs;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd site && bun run test src/lint/rules/lessons.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Write the failing test for the source-level parity check**

Append to `site/src/lint/rules/lessons.test.ts`:

```typescript
import { checkLessonParity } from "./lessons";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function lessonFixture(root: string, lang: string, status: string) {
  const dir = join(root, "content/lessons", lang, "math/01-numbers/01-counting");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "index.mdx"),
    `---\nslug: 01-counting\nlang: ${lang}\ntrack: math\nunit: 01-numbers\norder: 1\nstatus: ${status}\nconcepts: ["natural-number"]\n---\nbody\n`
  );
}

describe("checkLessonParity", () => {
  test("flags an EN-ready lesson with no RU twin", async () => {
    const root = await mkdtemp(join(tmpdir(), "lint-"));
    await lessonFixture(root, "en", "ready");
    const errs = await checkLessonParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs.some((e) => /missing RU/.test(e))).toBe(true);
  });

  test("passes when both EN and RU ready lessons exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "lint-"));
    await lessonFixture(root, "en", "ready");
    await lessonFixture(root, "ru", "ready");
    const errs = await checkLessonParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });
});
```

- [ ] **Step 6: Run the parity test to verify it fails**

Run: `cd site && bun run test src/lint/rules/lessons.test.ts`
Expected: FAIL with "checkLessonParity is not a function".

- [ ] **Step 7: Add `checkLessonParity` to `lessons.ts`**

Append to `site/src/lint/rules/lessons.ts`:

```typescript
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

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
    // .../lessons/<lang>/<track>/<unit>/<lesson>/index.mdx
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
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd site && bun run test src/lint/rules/lessons.test.ts`
Expected: PASS (9 tests total).

- [ ] **Step 9: Wire the rules into `src/lint/index.ts`**

In `site/src/lint/index.ts`:

Add the import near the other rule imports:

```typescript
import { checkLessonRules, checkLessonParity } from "./rules/lessons";
```

In the per-file loop, after the existing `errors.push(...checkExerciseCounts(html, f));` line, add:

```typescript
          errors.push(...checkLessonRules(html, f));
```

In the source-level section, after `errors.push(...(await checkI18nParity(siteSrc)));`, add:

```typescript
        errors.push(...(await checkLessonParity(siteSrc)));
```

- [ ] **Step 10: Commit**

```bash
git add site/src/lint/rules/lessons.ts site/src/lint/rules/lessons.test.ts site/src/lint/index.ts
git commit -m "feat(foundations): add lesson linter rules"
```

> **Note on spec rule 4 (concept-prerequisite):** The spec's "no term from a future lesson" rule cannot be fully verified mechanically from frontmatter alone (it needs prose-level term tracking). This plan enforces the mechanically-checkable parts — skeleton order, no forward links, practice/visual minimums, hydration cap, i18n parity — and delegates vocabulary discipline to the `/teach` command (Task 8). Glossary presence of `concepts` terms is covered by the existing `checkI18nParity` glossary path once concepts are added to `glossary.json` in Task 10.

---

### Task 4: Lesson layout

The lesson layout reuses `Topic.astro` (outer chrome: head, title, lang switch, sources footer) and renders a linear single-column article — no tier sidebar. Mirror the structure of `Chapter.astro` but strip the piece/tier navigation.

**Files:**
- Create: `site/src/layouts/Lesson.astro`

- [ ] **Step 1: Read the reference layouts**

Read `site/src/layouts/Topic.astro` and `site/src/layouts/Chapter.astro` in full to learn the `Topic` props interface and the article wrapper markup.

- [ ] **Step 2: Create `Lesson.astro`**

Create `site/src/layouts/Lesson.astro`. It accepts the lesson metadata, renders `Topic` as the outer shell, and provides a centered single-column `<article>` for the MDX `<slot />`. Use `Chapter.astro` as the structural reference for how `Topic` is invoked and how `sources` are passed; remove `ChapterSidebar`, `PieceTOC`, `DepthBadges`, `NextPieceCard`, `RelatedPieces`, `PersonaLegend` — a linear lesson needs none of them.

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
};

const { title, lang, trackSlug, unitSlug, summary, estMin, sources } = Astro.props;
const backHref = `/${lang}/learn/${trackSlug}/`;
---

<Topic title={title} lang={lang} sources={sources}>
  <article class="mx-auto max-w-[44rem] px-5 py-10">
    <a href={backHref} class="text-[13px] text-bbg-muted hover:text-bbg-ink">&larr; {unitSlug}</a>
    <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-bbg-ink">{title}</h1>
    <p class="mt-2 text-[15px] text-bbg-muted">{summary}</p>
    <p class="mt-1 font-mono text-[11px] uppercase tracking-wider text-bbg-muted">{estMin} min</p>
    <div class="lesson-body mt-8 space-y-6">
      <slot />
    </div>
  </article>
</Topic>
```

If `Topic.astro`'s prop names differ from `title`/`lang`/`sources` (confirmed in Step 1), adjust the `<Topic ... >` invocation to match exactly. Do not invent props.

- [ ] **Step 3: Verify the layout type-checks**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add site/src/layouts/Lesson.astro
git commit -m "feat(foundations): add linear Lesson layout"
```

---

### Task 5: Routing pages

**Files:**
- Create: `site/src/pages/[lang]/learn/index.astro`
- Create: `site/src/pages/[lang]/learn/[track]/index.astro`
- Create: `site/src/pages/[lang]/learn/[track]/[lesson].astro`

- [ ] **Step 1: Create the track-list page**

Create `site/src/pages/[lang]/learn/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Topic from "../../../layouts/Topic.astro";
import { type Locale, isLocale } from "../../../i18n";

export function getStaticPaths() {
  return (["en", "ru"] as const).map((lang) => ({ params: { lang } }));
}

const { lang } = Astro.params as { lang: Locale };
if (!isLocale(lang)) throw new Error("bad lang");

const tracks = (await getCollection("tracks")).sort((a, b) => a.data.order - b.data.order);
---

<Topic title={lang === "ru" ? "Учиться с нуля" : "Learn from zero"} lang={lang} sources={[]}>
  <div class="mx-auto max-w-[44rem] px-5 py-10">
    <h1 class="text-3xl font-extrabold tracking-tight text-bbg-ink">
      {lang === "ru" ? "Учиться с нуля" : "Learn from zero"}
    </h1>
    <ul class="mt-8 space-y-4">
      {tracks.map((tr) => (
        <li>
          <a href={`/${lang}/learn/${tr.data.slug}/`}
             class="block rounded-2xl border-2 border-gray-200 p-6 hover:border-bbg-teal">
            <div class="text-xl font-bold text-bbg-ink">{tr.data.title[lang]}</div>
            <p class="mt-1 text-[14px] text-bbg-muted">{tr.data.blurb[lang]}</p>
          </a>
        </li>
      ))}
    </ul>
  </div>
</Topic>
```

- [ ] **Step 2: Create the unit-overview page**

Create `site/src/pages/[lang]/learn/[track]/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Topic from "../../../../layouts/Topic.astro";
import { type Locale, isLocale } from "../../../../i18n";

export async function getStaticPaths() {
  const tracks = await getCollection("tracks");
  return tracks.flatMap((tr) =>
    (["en", "ru"] as const).map((lang) => ({ params: { lang, track: tr.data.slug } }))
  );
}

const { lang, track } = Astro.params as { lang: Locale; track: string };
if (!isLocale(lang)) throw new Error("bad lang");

const trackEntry = (await getCollection("tracks")).find((t) => t.data.slug === track);
if (!trackEntry) throw new Error(`Unknown track: ${track}`);

const units = (await getCollection("units"))
  .filter((u) => u.data.track === track)
  .sort((a, b) => a.data.order - b.data.order);

const lessons = await getCollection("lessons", (l) => l.data.lang === lang && l.data.track === track);
---

<Topic title={trackEntry.data.title[lang]} lang={lang} sources={[]}>
  <div class="mx-auto max-w-[44rem] px-5 py-10">
    <h1 class="text-3xl font-extrabold tracking-tight text-bbg-ink">{trackEntry.data.title[lang]}</h1>
    <ol class="mt-8 space-y-6">
      {units.map((u) => (
        <li>
          <div class="font-mono text-[11px] uppercase tracking-wider text-bbg-muted">{u.data.slug}</div>
          <div class="text-lg font-bold text-bbg-ink">{u.data.title[lang]}</div>
          <p class="text-[13px] text-bbg-muted">{u.data.crux[lang]}</p>
          <ul class="mt-2 space-y-1">
            {u.data.lessons.map((lessonSlug) => {
              const lesson = lessons.find(
                (l) => l.data.unit === u.data.slug && l.data.slug === lessonSlug
              );
              return (
                <li>
                  {lesson ? (
                    <a href={`/${lang}/learn/${track}/${lessonSlug}/`}
                       class="text-[14px] text-bbg-teal hover:underline">
                      {lesson.data.title}
                    </a>
                  ) : (
                    <span class="text-[14px] text-bbg-muted">{lessonSlug}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  </div>
</Topic>
```

- [ ] **Step 3: Create the lesson-reader page**

Create `site/src/pages/[lang]/learn/[track]/[lesson].astro`. Mirror `site/src/pages/[lang]/[pillar]/[piece].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import Lesson from "../../../../layouts/Lesson.astro";
import { type Locale, isLocale } from "../../../../i18n";

export async function getStaticPaths() {
  const all = await getCollection("lessons");
  return all.map((entry) => ({
    params: { lang: entry.data.lang, track: entry.data.track, lesson: entry.data.slug },
    props: { entry },
  }));
}

const { lang } = Astro.params as { lang: Locale; track: string; lesson: string };
if (!isLocale(lang)) throw new Error("bad lang");

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<Lesson
  title={entry.data.title}
  lang={lang}
  trackSlug={entry.data.track}
  unitSlug={entry.data.unit}
  summary={entry.data.summary}
  estMin={entry.data.estMin}
  sources={entry.data.sources}
>
  <Content />
</Lesson>
```

- [ ] **Step 4: Verify the routes type-check**

Run: `cd site && bun run check`
Expected: PASS. (The `[lesson].astro` route produces zero pages until a lesson MDX exists — that is valid.)

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/[lang]/learn
git commit -m "feat(foundations): add /learn routing pages"
```

---

### Task 6: Lesson-section components

Seven small `.astro` components. Each section component emits a `data-lesson-section` marker so the linter (Task 3) can verify the skeleton. `Step` emits `data-lesson-step`. `Inset` is a single component covering all three inset kinds (`why`, `practice`, `mistake`) using a collapsed `<details>`.

**Files:**
- Create: `site/src/components/lesson/Hook.astro`
- Create: `site/src/components/lesson/Goal.astro`
- Create: `site/src/components/lesson/Step.astro`
- Create: `site/src/components/lesson/WorkedExample.astro`
- Create: `site/src/components/lesson/Check.astro`
- Create: `site/src/components/lesson/Recap.astro`
- Create: `site/src/components/lesson/Inset.astro`

- [ ] **Step 1: Create `Hook.astro`**

```astro
---
// Opening everyday situation. 1-2 sentences.
---
<div data-lesson-section="hook" class="text-[17px] leading-relaxed text-bbg-ink">
  <slot />
</div>
```

- [ ] **Step 2: Create `Goal.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="goal" class="rounded-2xl bg-panel-mint border-l-[3px] border-bbg-teal px-5 py-4">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-teal font-semibold mb-1">
    {t("lesson.goal", lang)}
  </div>
  <div class="text-[15px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 3: Create `Step.astro`**

```astro
---
type Props = { n: number };
const { n } = Astro.props;
---
<div data-lesson-step class="flex gap-4">
  <span class="shrink-0 w-7 h-7 rounded-full bg-bbg-teal text-white grid place-items-center font-mono text-[13px] font-bold">
    {n}
  </span>
  <div class="text-[15px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 4: Create `WorkedExample.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="worked-example" class="rounded-2xl border-2 border-gray-200 bg-card p-6">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-muted font-semibold mb-3">
    {t("lesson.workedExample", lang)}
  </div>
  <div class="space-y-3 text-[14.5px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 5: Create `Check.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="check">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-muted font-semibold mb-2">
    {t("lesson.check", lang)}
  </div>
  <slot />
</div>
```

- [ ] **Step 6: Create `Recap.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { lang: Locale };
const { lang } = Astro.props;
---
<div data-lesson-section="recap" class="rounded-2xl bg-panel-mint border-l-[3px] border-bbg-success px-5 py-4">
  <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-success font-semibold mb-1">
    {t("lesson.recap", lang)}
  </div>
  <div class="text-[15px] leading-relaxed text-bbg-ink"><slot /></div>
</div>
```

- [ ] **Step 7: Create `Inset.astro`**

```astro
---
import { t, type Locale } from "../../i18n";
type Props = { kind: "why" | "practice" | "mistake"; lang: Locale };
const { kind, lang } = Astro.props;
const label = t(`lesson.inset.${kind}`, lang);
const accent =
  kind === "mistake" ? "border-bbg-warn" : kind === "practice" ? "border-bbg-teal" : "border-gray-300";
---
<details class={`rounded-xl border-2 ${accent} bg-white px-4 py-3`}>
  <summary class="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-bbg-muted font-semibold">
    {label}
  </summary>
  <div class="mt-3 text-[14px] leading-relaxed text-bbg-ink"><slot /></div>
</details>
```

- [ ] **Step 8: Add the UI strings**

In `site/src/i18n/ui.json`, add these keys to both the `en` and `ru` objects:

```json
"lesson.goal": "Goal",
"lesson.workedExample": "Worked example",
"lesson.check": "Check yourself",
"lesson.recap": "Recap",
"lesson.inset.why": "Why this works",
"lesson.inset.practice": "More practice",
"lesson.inset.mistake": "Common mistake"
```

RU values:

```json
"lesson.goal": "Цель",
"lesson.workedExample": "Разбор примера",
"lesson.check": "Проверь себя",
"lesson.recap": "Итог",
"lesson.inset.why": "Почему это работает",
"lesson.inset.practice": "Ещё практика",
"lesson.inset.mistake": "Частая ошибка"
```

- [ ] **Step 9: Verify type check**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add site/src/components/lesson site/src/i18n/ui.json
git commit -m "feat(foundations): add lesson-section components"
```

---

### Task 7: Math widgets

Five widgets in `site/src/components/math/`. `NumberLine`, `PlaceValueGrid`, `BarModel`, `FunctionPlot` are static SVG `.astro` components emitting `data-lesson-visual`. `PracticeSet` is an `.astro` component with an inline `<script>` for immediate feedback — modelled on `NumberDrill.astro`, so it costs zero hydration islands. Each holds N problems via a `problems` prop.

**Files:**
- Create: `site/src/components/math/NumberLine.astro`
- Create: `site/src/components/math/PlaceValueGrid.astro`
- Create: `site/src/components/math/BarModel.astro`
- Create: `site/src/components/math/FunctionPlot.astro`
- Create: `site/src/components/math/PracticeSet.astro`

- [ ] **Step 1: Create `NumberLine.astro`**

```astro
---
type Props = { min: number; max: number; marks?: number[]; highlight?: number[] };
const { min, max, marks, highlight = [] } = Astro.props;
const ticks = marks ?? Array.from({ length: max - min + 1 }, (_, i) => min + i);
const W = 640, H = 80, padX = 24;
const x = (v: number) => padX + ((v - min) / (max - min)) * (W - 2 * padX);
---
<figure data-lesson-visual class="my-6">
  <svg viewBox={`0 0 ${W} ${H}`} class="w-full" role="img" aria-label={`Number line from ${min} to ${max}`}>
    <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="#94a3b8" stroke-width="2" />
    {ticks.map((v) => (
      <g>
        <line x1={x(v)} y1={H / 2 - 8} x2={x(v)} y2={H / 2 + 8}
              stroke={highlight.includes(v) ? "#0d9488" : "#94a3b8"} stroke-width="2" />
        <circle cx={x(v)} cy={H / 2} r={highlight.includes(v) ? 6 : 0} fill="#0d9488" />
        <text x={x(v)} y={H / 2 + 26} text-anchor="middle" font-size="13"
              font-family="monospace" fill="#334155">{v}</text>
      </g>
    ))}
  </svg>
</figure>
```

- [ ] **Step 2: Create `PlaceValueGrid.astro`**

```astro
---
// Renders a number split into place-value columns.
type Props = { value: number; lang: "en" | "ru" };
const { value } = Astro.props;
const digits = String(Math.trunc(Math.abs(value))).split("");
const placeNames = ["1", "10", "100", "1000", "10000", "100000"];
const cols = digits.map((d, i) => ({
  digit: d,
  place: placeNames[digits.length - 1 - i] ?? "",
}));
---
<figure data-lesson-visual class="my-6 flex gap-2 justify-center">
  {cols.map((c) => (
    <div class="text-center">
      <div class="w-14 h-14 grid place-items-center rounded-lg border-2 border-bbg-teal font-mono text-2xl font-bold text-bbg-ink">
        {c.digit}
      </div>
      <div class="mt-1 font-mono text-[11px] text-bbg-muted">&times;{c.place}</div>
    </div>
  ))}
</figure>
```

- [ ] **Step 3: Create `BarModel.astro`**

```astro
---
// Part-of-a-whole bar. `parts` are filled segments; `total` is the whole.
type Props = { total: number; filled: number; label?: string };
const { total, filled, label } = Astro.props;
const segs = Array.from({ length: total }, (_, i) => i < filled);
---
<figure data-lesson-visual class="my-6">
  <div class="flex gap-1">
    {segs.map((on) => (
      <div class={`h-10 flex-1 rounded ${on ? "bg-bbg-teal" : "bg-gray-200"}`}></div>
    ))}
  </div>
  {label && <figcaption class="mt-2 text-center font-mono text-[12px] text-bbg-muted">{label}</figcaption>}
</figure>
```

- [ ] **Step 4: Create `FunctionPlot.astro`**

```astro
---
// Plots y = f(x) over [xMin,xMax]. `points` is a precomputed [x,y][] list
// so the component stays pure (no eval). Author supplies points in frontmatter or inline.
type Props = { points: [number, number][]; xMin: number; xMax: number; yMin: number; yMax: number };
const { points, xMin, xMax, yMin, yMax } = Astro.props;
const W = 480, H = 320, pad = 32;
const sx = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
const sy = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);
const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0])},${sy(p[1])}`).join(" ");
---
<figure data-lesson-visual class="my-6">
  <svg viewBox={`0 0 ${W} ${H}`} class="w-full max-w-md mx-auto" role="img" aria-label="Function plot">
    <line x1={pad} y1={sy(0)} x2={W - pad} y2={sy(0)} stroke="#cbd5e1" stroke-width="1.5" />
    <line x1={sx(0)} y1={pad} x2={sx(0)} y2={H - pad} stroke="#cbd5e1" stroke-width="1.5" />
    <path d={d} fill="none" stroke="#0d9488" stroke-width="2.5" />
  </svg>
</figure>
```

- [ ] **Step 5: Create `PracticeSet.astro`**

Model the inline `<script>` on `site/src/components/pedagogy/NumberDrill.astro` (read it first). Each problem has a numeric `answer`, an optional `tolerance`, a `prompt`, and a `hint` shown after a wrong attempt. The component renders all problems and a shared progress count; the script handles per-problem checking.

```astro
---
import { t, type Locale } from "../../i18n";

type Problem = { prompt: string; answer: number; tolerance?: number; hint: string };
type Props = { id: string; lessonSlug: string; lang: Locale; problems: Problem[] };

const { id, lessonSlug, lang, problems } = Astro.props;
---
<section
  id={id}
  data-practice-set
  data-lesson-slug={lessonSlug}
  class="rounded-2xl border-2 border-gray-200 bg-card p-6 my-8"
>
  <header class="flex items-center justify-between mb-4">
    <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">
      {t("practice.title", lang)}
    </span>
    <span data-progress class="font-mono text-[12px] text-bbg-muted">0 / {problems.length}</span>
  </header>
  <div class="space-y-5">
    {problems.map((p, i) => (
      <div
        data-practice-problem
        data-answer={p.answer}
        data-tolerance={p.tolerance ?? 0}
        class="rounded-xl border border-gray-200 p-4"
      >
        <p class="text-[14.5px] text-bbg-ink mb-3">{p.prompt}</p>
        <div class="flex items-center gap-2">
          <input type="number" data-input step="any"
            class="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-[14px] font-mono tabular-nums focus-visible:border-bbg-teal outline-none" />
          <button type="button" data-check
            class="rounded-lg bg-bbg-teal text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-teal/90 transition">
            {t("exercise.check", lang)}
          </button>
        </div>
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

    problems.forEach((problem) => {
      const answer = Number(problem.dataset.answer);
      const tolerance = Number(problem.dataset.tolerance);
      const input = problem.querySelector<HTMLInputElement>("[data-input]")!;
      const checkBtn = problem.querySelector<HTMLButtonElement>("[data-check]")!;
      const feedback = problem.querySelector<HTMLElement>("[data-feedback]")!;
      const hint = problem.querySelector<HTMLElement>("[data-hint]")!;
      let done = false;
      let attempts = 0;

      checkBtn.addEventListener("click", () => {
        if (done) return;
        const v = Number(input.value);
        if (Number.isNaN(v)) return;
        attempts += 1;
        if (Math.abs(v - answer) <= tolerance) {
          done = true;
          solved += 1;
          progress.textContent = `${solved} / ${problems.length}`;
          feedback.hidden = false;
          feedback.textContent = "✓";
          feedback.className = "mt-2 text-[12.5px] text-bbg-success font-semibold";
          input.disabled = true;
          checkBtn.disabled = true;
        } else {
          feedback.hidden = false;
          feedback.textContent = "Not quite — try again.";
          feedback.className = "mt-2 text-[12.5px] text-bbg-warn";
          if (attempts >= 1) hint.hidden = false;
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") checkBtn.click();
      });
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-practice-set]").forEach(initSet);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 6: Add the practice UI string**

In `site/src/i18n/ui.json`, add to both `en` and `ru` objects (the `exercise.check` key already exists — reuse it; only add `practice.title`):

EN: `"practice.title": "Practice",`
RU: `"practice.title": "Практика",`

- [ ] **Step 7: Verify type check**

Run: `cd site && bun run check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add site/src/components/math site/src/i18n/ui.json
git commit -m "feat(foundations): add math widget family"
```

---

### Task 8: `/teach` command

**Files:**
- Create: `.claude/commands/teach.md`

- [ ] **Step 1: Read the existing command for structure**

Read `.claude/commands/infographic.md` in full to mirror its front-matter and section structure.

- [ ] **Step 2: Create `teach.md`**

Create `.claude/commands/teach.md`:

```markdown
# /teach <track>/<NN-unit>/<NN-lesson>

Author one absolute-beginner lesson (stub -> draft -> ready) for the `foundations`
section. Every lesson is English + Russian or the command refuses.

## Domain lock

This command authors **mathematics** lessons only (the algorithms track is added
later). Refuse any off-domain request.

## Input form

```
/teach math/01-numbers/01-counting
/teach math/08-growth/04-what-is-a-logarithm
```

## Pipeline

1. **Verify the lesson stub exists** — `site/src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx`.
   If absent, create stub MDX files (EN + RU) with `status: stub` frontmatter, and
   add the lesson slug to the unit's `lessons` array in `site/src/content/units.json`.
2. **Research** — WebSearch + Context7. Sources for absolute-beginner math: Khan
   Academy, OpenStax, vetted educational references. Focus on correctness, common
   beginner mistakes, and effective metaphors. Minimum 3 queries.
3. **Author EN MDX** — follow the fixed linear skeleton, in order:
   Hook -> Goal -> Explanation (Step components) -> Visual (a math widget) ->
   WorkedExample -> Practice (PracticeSet, >= 4 problems) -> Check (a Quiz) -> Recap.
   Insert `<Inset>` blocks (`why` / `practice` / `mistake`) where useful.
4. **Translate to RU** — use `site/src/i18n/glossary.json`; add new terms
   alphabetically. Keep EN and RU structurally identical.
5. **Verify the linter passes** — run `bun run build` in `site/`, check the lesson
   entries in `dist/lint-report.json`.
6. **Visual check** — open both EN and RU lessons in a browser; verify rendering and
   widget interactivity.
7. **Commit** — `git commit -m "content(math): <unit>/<lesson> EN+RU ready"`.

## The command enforces

- Bilingual or refuse.
- Absolute-zero vocabulary: introduce every term before using it; use no term that
  is first defined in a later lesson.
- Skeleton present and in order.
- >= 4 practice problems in the PracticeSet.
- >= 1 visual widget.
- Hydration cap: <= 5 islands per lesson page.
- Status flow: stub -> draft -> ready.
- Exactly 6 `..` segments in component import paths
  (`../../../../../../components/...` from a lesson MDX file — verify against the
  proof lesson once it exists).
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/teach.md
git commit -m "feat(foundations): add /teach authoring command"
```

---

### Task 9: Document the foundations section in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a foundations section to `CLAUDE.md`**

In `CLAUDE.md`, after the `## Primary command: /infographic ...` section and before `## MCP servers (when to use)`, insert:

```markdown
## Secondary command: `/teach <track>/<NN-unit>/<NN-lesson>`

Author a single absolute-beginner lesson (EN + RU) for the `foundations` section —
a learning track parallel to, and isolated from, the 16-pillar fullstack program.

- **First track:** `math` (mathematics from zero — for a reader who knows only basic
  arithmetic). The `algorithms` track is a later cycle.
- **Content lives in** `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`,
  with `tracks.json` and `units.json` as the track/unit data files.
- **Lesson format is linear** (Hook -> Goal -> Explanation -> Visual -> WorkedExample
  -> Practice -> Check -> Recap), with optional collapsible `<Inset>` blocks — the
  inverse of the tiered fullstack piece.
- **Routing:** `/learn/<track>/<lesson>`.
- **Linter:** the foundations rules in `src/lint/rules/lessons.ts` run in the same
  build pass; lesson pages have a hydration cap of 5 and require >= 4 practice
  problems and >= 1 visual.

The `/infographic` command and its fullstack domain lock are unchanged. `/teach` has
its own domain (mathematics; later algorithms).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document /teach command and foundations section"
```

---

## Phase 1 — Proof lesson

### Task 10: Author `math/01-numbers/01-counting` (EN + RU)

This proves the whole pipeline: a real lesson rendered through the new collection,
routes, layout, components, and widgets, passing the linter.

**Files:**
- Create: `site/src/content/lessons/en/math/01-numbers/01-counting/index.mdx`
- Create: `site/src/content/lessons/ru/math/01-numbers/01-counting/index.mdx`
- Modify: `site/src/i18n/glossary.json`

- [ ] **Step 1: Add the lesson's concepts to the glossary**

In `site/src/i18n/glossary.json`, add (alphabetically) an entry for the one concept
this lesson introduces:

```json
"natural-number": {
  "en": "natural number",
  "ru": "натуральное число",
  "defEn": "A counting number: 1, 2, 3, and so on.",
  "defRu": "Число для счёта: 1, 2, 3 и так далее."
}
```

- [ ] **Step 2: Determine the component import depth**

A lesson MDX file sits at
`site/src/content/lessons/en/math/01-numbers/01-counting/index.mdx`.
From there to `site/src/components/` is six `../` segments:
`../../../../../../components/lesson/Hook.astro`.
Verify this path resolves during the build in Step 4; adjust the count if the build
reports an unresolved import.

- [ ] **Step 3: Write the EN lesson**

Create `site/src/content/lessons/en/math/01-numbers/01-counting/index.mdx`. Use real,
pedagogically sound content for an absolute beginner — the block below is the
complete file, not a placeholder:

```mdx
---
slug: 01-counting
lang: en
track: math
unit: 01-numbers
order: 1
title: "Counting"
summary: "What a number is before it is anything else: a way to count things."
estMin: 12
status: ready
prereqs: []
concepts: ["natural-number"]
sources:
  - https://www.khanacademy.org/math/early-math/cc-early-math-counting-topic
  - https://openstax.org/books/prealgebra-2e/pages/1-1-introduction-to-whole-numbers
---

import Hook from "../../../../../../components/lesson/Hook.astro";
import Goal from "../../../../../../components/lesson/Goal.astro";
import Step from "../../../../../../components/lesson/Step.astro";
import WorkedExample from "../../../../../../components/lesson/WorkedExample.astro";
import Check from "../../../../../../components/lesson/Check.astro";
import Recap from "../../../../../../components/lesson/Recap.astro";
import Inset from "../../../../../../components/lesson/Inset.astro";
import NumberLine from "../../../../../../components/math/NumberLine.astro";
import PracticeSet from "../../../../../../components/math/PracticeSet.astro";
import Quiz from "../../../../../../components/pedagogy/Quiz.astro";

<Hook>
You have a handful of coins on a table. Someone asks: how many? To answer, you do
the oldest piece of mathematics there is — you count.
</Hook>

<Goal lang="en">
After this lesson you can explain what a number is, count a group of objects without
losing your place, and place a number on a number line.
</Goal>

<Step n={1}>
**Counting is matching.** When you count five coins, you say "one, two, three, four,
five" — and each word lands on exactly one coin. One word, one coin. Nothing counted
twice, nothing skipped. The last word you say — "five" — is the answer.
</Step>

<Step n={2}>
**The counting numbers have names in order.** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, and they
never stop — there is always a next one. These are the **natural numbers**: the
numbers you count with.
</Step>

<Step n={3}>
**A number line puts the numbers in a row.** Each natural number gets its own spot,
evenly spaced, growing to the right. The line is a picture of counting: moving one
step right means counting one more.
</Step>

<NumberLine min={0} max={10} highlight={[5]} />

<WorkedExample lang="en">
**Count the dots: how many are in the group `* * * * * * *`?**

Touch each dot once, saying the next number: one, two, three, four, five, six, seven.
The last word is **seven**. There are 7 dots. On the number line, 7 sits seven steps
to the right of 0.
</WorkedExample>

<Inset kind="mistake" lang="en">
The most common counting mistake is counting one object twice — or skipping one —
when the objects are not in a tidy row. Fix: move each object aside as you count it,
or touch it. One touch, one number.
</Inset>

<PracticeSet
  id="counting-practice"
  lessonSlug="01-counting"
  lang="en"
  problems={[
    { prompt: "How many: * * * *", answer: 4, hint: "Touch each star once and say the next number." },
    { prompt: "How many: * * * * * * * * *", answer: 9, hint: "The last number you say is the answer." },
    { prompt: "What natural number comes right after 6?", answer: 7, hint: "Count one more." },
    { prompt: "What natural number comes right before 10?", answer: 9, hint: "Count one back." },
    { prompt: "On the number line, how many steps right of 0 is the number 8?", answer: 8, hint: "Each step is one count." },
  ]}
/>

<Check lang="en">
  <Quiz
    id="counting-check"
    pieceSlug="01-counting"
    lang="en"
    question="Why does each counting word have to land on exactly one object?"
    choices={[
      { label: "So no object is counted twice and none is skipped", correct: true },
      { label: "Because counting words are magic", misconception: "Counting is a matching process, not magic — one word per object keeps the total honest." },
      { label: "So the count is always an even number", misconception: "The count can be any natural number, odd or even." },
    ]}
  />
</Check>

<Recap lang="en">
A number is a way to count. The natural numbers — 1, 2, 3, ... — never end. Counting
is matching one number word to one object; the last word is the total. A number line
is counting drawn as a row of evenly spaced spots.
</Recap>
```

- [ ] **Step 4: Build and verify the EN lesson renders and passes the linter**

Run: `cd site && bun run build`
Expected: the build completes; `dist/en/learn/math/01-counting/index.html` exists.
At this point the build WILL FAIL the linter with a `lesson-parity` error: "EN ready
lesson missing RU twin". That is expected — fixed in the next step.

- [ ] **Step 5: Write the RU lesson**

Create `site/src/content/lessons/ru/math/01-numbers/01-counting/index.mdx` — a
faithful Russian translation with identical structure. `lang: ru`, same `slug`,
`unit`, `order`, `concepts`, `sources`. Translate every Hook/Goal/Step/WorkedExample/
Inset/Recap body and every PracticeSet `prompt`/`hint` and Quiz `question`/`label`/
`misconception`. Keep the same import paths and the same component props.

```mdx
---
slug: 01-counting
lang: ru
track: math
unit: 01-numbers
order: 1
title: "Счёт"
summary: "Что такое число до того, как оно станет чем-то ещё: способ считать предметы."
estMin: 12
status: ready
prereqs: []
concepts: ["natural-number"]
sources:
  - https://www.khanacademy.org/math/early-math/cc-early-math-counting-topic
  - https://openstax.org/books/prealgebra-2e/pages/1-1-introduction-to-whole-numbers
---

import Hook from "../../../../../../components/lesson/Hook.astro";
import Goal from "../../../../../../components/lesson/Goal.astro";
import Step from "../../../../../../components/lesson/Step.astro";
import WorkedExample from "../../../../../../components/lesson/WorkedExample.astro";
import Check from "../../../../../../components/lesson/Check.astro";
import Recap from "../../../../../../components/lesson/Recap.astro";
import Inset from "../../../../../../components/lesson/Inset.astro";
import NumberLine from "../../../../../../components/math/NumberLine.astro";
import PracticeSet from "../../../../../../components/math/PracticeSet.astro";
import Quiz from "../../../../../../components/pedagogy/Quiz.astro";

<Hook>
На столе горсть монет. Тебя спрашивают: сколько? Чтобы ответить, ты делаешь самое
старое, что есть в математике, — ты считаешь.
</Hook>

<Goal lang="ru">
После этого урока ты можешь объяснить, что такое число, посчитать группу предметов,
не сбившись, и поставить число на числовую прямую.
</Goal>

<Step n={1}>
**Счёт — это сопоставление.** Когда ты считаешь пять монет, ты говоришь «один, два,
три, четыре, пять» — и каждое слово попадает ровно на одну монету. Одно слово — одна
монета. Ничего не посчитано дважды, ничего не пропущено. Последнее слово — «пять» —
и есть ответ.
</Step>

<Step n={2}>
**У чисел для счёта есть имена по порядку.** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, и они
никогда не кончаются — всегда есть следующее. Это **натуральные числа**: числа,
которыми считают.
</Step>

<Step n={3}>
**Числовая прямая ставит числа в ряд.** У каждого натурального числа своё место,
через равные промежутки, и они растут вправо. Прямая — это картинка счёта: шаг
вправо означает «посчитать ещё одно».
</Step>

<NumberLine min={0} max={10} highlight={[5]} />

<WorkedExample lang="ru">
**Посчитай точки: сколько их в группе `* * * * * * *`?**

Коснись каждой точки один раз, называя следующее число: один, два, три, четыре, пять,
шесть, семь. Последнее слово — **семь**. Точек 7. На числовой прямой 7 стоит на семь
шагов правее 0.
</WorkedExample>

<Inset kind="mistake" lang="ru">
Самая частая ошибка счёта — посчитать предмет дважды или пропустить его, когда
предметы лежат не ровным рядом. Решение: отодвигай каждый предмет, когда считаешь
его, или касайся его. Одно касание — одно число.
</Inset>

<PracticeSet
  id="counting-practice"
  lessonSlug="01-counting"
  lang="ru"
  problems={[
    { prompt: "Сколько: * * * *", answer: 4, hint: "Коснись каждой звезды один раз и назови следующее число." },
    { prompt: "Сколько: * * * * * * * * *", answer: 9, hint: "Последнее названное число и есть ответ." },
    { prompt: "Какое натуральное число идёт сразу после 6?", answer: 7, hint: "Посчитай на одно больше." },
    { prompt: "Какое натуральное число идёт прямо перед 10?", answer: 9, hint: "Посчитай на одно назад." },
    { prompt: "На числовой прямой на сколько шагов правее 0 стоит число 8?", answer: 8, hint: "Каждый шаг — это один счёт." },
  ]}
/>

<Check lang="ru">
  <Quiz
    id="counting-check"
    pieceSlug="01-counting"
    lang="ru"
    question="Почему каждое слово счёта должно попадать ровно на один предмет?"
    choices={[
      { label: "Чтобы ни один предмет не был посчитан дважды и ни один не пропущен", correct: true },
      { label: "Потому что слова счёта волшебные", misconception: "Счёт — это сопоставление, а не волшебство: одно слово на предмет держит итог честным." },
      { label: "Чтобы счёт всегда был чётным числом", misconception: "Счёт может быть любым натуральным числом, чётным или нечётным." },
    ]}
  />
</Check>

<Recap lang="ru">
Число — это способ считать. Натуральные числа — 1, 2, 3, ... — никогда не кончаются.
Счёт — это сопоставление одного слова-числа одному предмету; последнее слово — итог.
Числовая прямая — это счёт, нарисованный как ряд равномерных точек.
</Recap>
```

- [ ] **Step 6: Build and verify the full pipeline passes**

Run: `cd site && bun run build`
Expected: build completes, lint passes (no errors in `dist/lint-report.json`).
Both `dist/en/learn/math/01-counting/index.html` and
`dist/ru/learn/math/01-counting/index.html` exist.

- [ ] **Step 7: Visual check in a browser**

Run: `cd site && bun run dev`
Open `http://localhost:4321/en/learn/` — confirm the math track card shows.
Open `http://localhost:4321/en/learn/math/` — confirm Unit 01 lists the lesson.
Open `http://localhost:4321/en/learn/math/01-counting/` — confirm the lesson renders:
the number line draws, the practice problems accept input and show ✓ on the right
answer, the quiz works, the mistake inset expands. Repeat for the `/ru/` URLs.

- [ ] **Step 8: Commit**

```bash
git add site/src/content/lessons site/src/content/units.json site/src/i18n/glossary.json
git commit -m "content(math): 01-numbers/01-counting EN+RU ready"
```

---

### Task 11: Full build verification

**Files:** none (verification only).

- [ ] **Step 1: Run the linter rule tests**

Run: `cd site && bun run test`
Expected: PASS — all suites green, including `lessons.test.ts` (9 tests).

- [ ] **Step 2: Run the type check**

Run: `cd site && bun run check`
Expected: PASS — 0 errors.

- [ ] **Step 3: Run the full build**

Run: `cd site && bun run build`
Expected: build completes; the page count grew from 301 by the new
`/learn/`, `/learn/math/`, and two `/learn/math/01-counting/` pages (EN + RU);
`dist/lint-report.json` shows `"errors": []`.

- [ ] **Step 4: Confirm the fullstack program is untouched**

Run: `git diff --stat HEAD~11 -- site/src/content/book site/src/lint/rules/text-budgets.ts .claude/commands/infographic.md`
Expected: no output — no fullstack piece, no fullstack-only linter rule, and the
`/infographic` command were modified.

- [ ] **Step 5: Final commit (if any uncommitted changes remain)**

```bash
git status
```

Expected: clean working tree. If anything is uncommitted, review and commit it with
an appropriate message.

---

## Phase 2+ — Remaining lessons (not enumerated)

The remaining ~79 lessons across Units 01–10 are authored by repeated `/teach`
invocations, one lesson at a time, each producing its own
`content(math): <unit>/<lesson> EN+RU ready` commit. Suggested phasing (each phase is
a batch of `/teach` runs, not a code task):

- **P2:** finish Unit 01 (numbers and counting).
- **P3:** Units 02–04 (operations, fractions, powers).
- **P4:** Units 05–06 (algebra, functions).
- **P5:** Units 07–10 (logic, growth, combinatorics, probability) — the bridge to the
  future algorithms track.

As later units need widgets beyond the five built here (e.g. an interactive
`FunctionExplorer` slider for Units 06/08), add them as their own small tasks at the
start of the relevant phase, following the `PracticeSet` pattern (`.astro` + inline
`<script>`, zero hydration islands) or as a `.tsx` island only if real Preact state
is required — staying within the 5-island lesson cap.

---

## Phase 2 — Lesson authoring queue

Phase 0 + Phase 1 shipped the infrastructure and proof lesson. Phase 2 authors the
remaining math lessons — one `/teach` invocation per lesson, one commit per lesson.
This section enumerates the queue so "continue the plan" is unambiguous.

**Authored so far:** 32 lessons, all `status: ready` (Units 01–10, see `units.json`).
**Queue below:** 40 lessons → track total **72** (spec target ~70–80, §3).

**Per-lesson flow** (unchanged, from `.claude/commands/teach.md`):
`/teach math/<NN-unit>/<NN-lesson>` → research → EN MDX (Hook → Goal → Explanation →
Visual → WorkedExample → Practice → Check → Recap) → RU mirror + glossary → `bun run
build` clean → `git commit -m "content(math): <unit>/<lesson> EN+RU ready"`. After each
lesson, append its slug to the unit's `lessons` array in `units.json`.

Author units in order; within a unit, top to bottom. Each new lesson lists the
previous lesson (and any cross-unit topic it leans on) in `prereqs`.

### Unit 01 — Numbers and counting (3 done → 7)
- [ ] `/teach math/01-numbers/04-the-number-line`
- [ ] `/teach math/01-numbers/05-negative-numbers`
- [ ] `/teach math/01-numbers/06-integers`
- [ ] `/teach math/01-numbers/07-rounding-and-estimation`

### Unit 02 — Four operations in depth (4 done → 8)
- [ ] `/teach math/02-operations/05-order-of-operations`
- [ ] `/teach math/02-operations/06-properties-of-operations`
- [ ] `/teach math/02-operations/07-remainder-and-divisibility`
- [ ] `/teach math/02-operations/08-factors-and-primes`

### Unit 03 — Fractions, decimals, percents (5 done → 8)
- [ ] `/teach math/03-fractions/06-multiplying-fractions`
- [ ] `/teach math/03-fractions/07-dividing-fractions`
- [ ] `/teach math/03-fractions/08-ratios-and-proportions`

### Unit 04 — Powers and roots (3 done → 7)
- [ ] `/teach math/04-powers/04-powers-of-two`
- [ ] `/teach math/04-powers/05-zero-and-negative-exponents`
- [ ] `/teach math/04-powers/06-scientific-notation`
- [ ] `/teach math/04-powers/07-cube-roots-and-beyond`

### Unit 05 — Variables and algebra (4 done → 7)
- [ ] `/teach math/05-algebra/05-solving-two-step-equations`
- [ ] `/teach math/05-algebra/06-formulas-and-substitution`
- [ ] `/teach math/05-algebra/07-word-problems`

### Unit 06 — Functions (3 done → 7)
- [ ] `/teach math/06-functions/04-slope`
- [ ] `/teach math/06-functions/05-function-notation`
- [ ] `/teach math/06-functions/06-domain-and-range`
- [ ] `/teach math/06-functions/07-nonlinear-functions`

### Unit 07 — Logic and sets (3 done → 7)
- [ ] `/teach math/07-logic/04-implication`
- [ ] `/teach math/07-logic/05-venn-diagrams`
- [ ] `/teach math/07-logic/06-quantifiers`
- [ ] `/teach math/07-logic/07-truth-tables`

### Unit 08 — Growth and logarithms (2 done → 7)
- [ ] `/teach math/08-growth/03-logarithm-as-inverse`
- [ ] `/teach math/08-growth/04-log-rules`
- [ ] `/teach math/08-growth/05-log-base-two`
- [ ] `/teach math/08-growth/06-comparing-growth-rates`
- [ ] `/teach math/08-growth/07-where-logs-appear`

### Unit 09 — Combinatorics (3 done → 7)
- [ ] `/teach math/09-combinatorics/04-factorials`
- [ ] `/teach math/09-combinatorics/05-pascals-triangle`
- [ ] `/teach math/09-combinatorics/06-counting-with-repetition`
- [ ] `/teach math/09-combinatorics/07-counting-strategies`

### Unit 10 — Probability (2 done → 7)
- [ ] `/teach math/10-probability/03-independent-events`
- [ ] `/teach math/10-probability/04-conditional-probability`
- [ ] `/teach math/10-probability/05-expected-value`
- [ ] `/teach math/10-probability/06-probability-and-counting`
- [ ] `/teach math/10-probability/07-common-pitfalls`

**Gate (Phase 2 closed):** all 72 lessons `status: ready` EN+RU, every unit's
`lessons` array in `units.json` complete, `bun run build` clean, foundations linter
rules green on every lesson page.

---

## Self-Review

**Spec coverage:**
- Spec §1 (architecture/layout) → Tasks 1, 2, 5.
- Spec §2 (lesson model: frontmatter + skeleton + insets) → Tasks 2, 6.
- Spec §3 (10-unit math map) → Task 1 (`units.json`).
- Spec §4 (widget family) → Task 7.
- Spec §5 (linter rules) → Task 3. Note: spec rule 4 (concept-prerequisite) is
  partially mechanical only — documented honestly in Task 3's closing note;
  vocabulary discipline is enforced by `/teach` (Task 8).
- Spec §6 (`/teach` command) → Task 8, with `CLAUDE.md` update in Task 9.
- Proof of the pipeline → Tasks 10, 11.

**Placeholder scan:** No "TBD"/"TODO"/"implement later". The proof lesson content in
Task 10 is complete real prose. Large Astro files (`Lesson.astro`, the routing pages)
have full code; where a file closely mirrors an existing one, the existing file is
named exactly and the deltas are spelled out.

**Type consistency:** `Track`/`TRACKS` (Task 1) used consistently in `config.ts`
(Task 2). The `lessons` schema fields (`slug`, `lang`, `track`, `unit`, `order`,
`title`, `summary`, `estMin`, `status`, `prereqs`, `concepts`, `sources`) match the
`Lesson.astro` props consumed in Task 5's `[lesson].astro` and the lesson frontmatter
in Task 10. Linter markers are consistent: components in Task 6 emit
`data-lesson-section` / `data-lesson-step`; widgets in Task 7 emit
`data-lesson-visual` / `data-practice-set` / `data-practice-problem`; the linter in
Task 3 reads exactly those attribute names.

**Scope check:** Phase 0 + Phase 1 is one coherent implementation plan producing
working, testable software (a navigable lesson + passing build). Phase 2 is content
authoring via an existing command (`/teach`), one commit per lesson — its lesson
queue is now enumerated above (40 remaining lessons → track total 72).
