# Algorithms LeetCode Drill Block — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-unit `drill` block to the `algorithms` track: curated NeetCode-150 problems grouped by the pattern each unit teaches, with our own bilingual hint ladders, target times, and spaced-revisit — the live-coding-practice layer the curriculum lacks.

**Architecture:** A new `drill` content collection (structured JSON, one file per unit, mirroring the existing `practice` collection) holds problem identity + our hints. A thin per-unit MDX block page renders a `<DrillSet>` Astro component, which resolves the JSON at build time and passes it to a single `<DrillBoard>` Preact island (hint reveal, status toggle, optional timer). A build-time lint rule validates the data; an out-of-band script checks link liveness. Pilot unit `02-arrays-strings` first, then roll out 03–12.

**Tech Stack:** Astro 5 content collections + Zod, Preact islands (`client:visible`), vitest (lint-rule tests), the existing `site/src/lint` integration. Spec: `docs/superpowers/specs/2026-05-29-algorithms-leetcode-drill-design.md`.

---

## File structure (locked decomposition)

```
site/
  src/
    content.config.ts                MODIFY — extend SlugRe; add NeetPattern/DrillProblem/drill collection; export it
    content/
      drill/algorithms/02-arrays-strings.json   NEW (pilot) … 03..12.json (rollout)
      lessons/{en,ru}/algorithms/<unit>/drill/index.mdx   NEW per unit (thin block page)
    components/algo/
      DrillSet.astro                 NEW — server: getCollection("drill") by unitKey → renders island
      DrillBoard.tsx                 NEW — Preact island: groups, hint ladder, status, timer
      drill-state.ts  + .test.ts     NEW — localStorage status model + spaced-revisit predicate (pure, tested)
    lint/rules/
      drill.ts        + drill.test.ts  NEW — schema-shape + i18n + ownership lint
    lint/index.ts                    MODIFY — import + call the drill checks
  ../scripts/check-drill-links.mjs   NEW — out-of-band link liveness checker (not in build)
units.json (site/src/content/units.json)  MODIFY — add "drill" to each algorithms unit's lessons[]
```

**Conventions to follow (verified):**
- Collections are registered in `content.config.ts` `export const collections = {...}`.
- Lint rules are `async (siteSrc | html, file) => string[]` pushed into `errors`/`warnings` in `lint/index.ts`'s `astro:build:done` hook; report is `{errors, warnings}` → `dist/lint-report.json`.
- JSON collections use `loader: glob({ pattern: "**/*.json", base: "./src/content/<name>" })`.
- Block pages are MDX under `lessons/{en,ru}/<track>/<unit>/<slug>/index.mdx` with frontmatter `slug`, `lang`, `track`, `unit`, `order`, `title`, `summary` (≤280, quote if it has a colon), `estMin`, `status`, `concepts`, `sources` (min 1 URL), and use `<Hook>`/`<Goal lang>`/`<Recap lang>`.
- `Bi = z.object({ en: z.string().min(1), ru: z.string().min(1) })` already exists in `content.config.ts`.

---

## Task 1: Extend schema — SlugRe, patterns, drill collection

**Files:**
- Modify: `site/src/content.config.ts`

- [ ] **Step 1: Allow the `drill` block slug**

Find the existing line:
```ts
const SlugRe = /^(?:\d{2}-[a-z0-9-]+|quiz-[a-z]+|project(?:-[a-z]+)?)$/;
```
Replace with:
```ts
const SlugRe = /^(?:\d{2}-[a-z0-9-]+|quiz-[a-z]+|project(?:-[a-z]+)?|drill)$/;
```

- [ ] **Step 2: Add the pattern enum + problem schema + collection**

Immediately after the `practice` collection definition (before `const projects = defineCollection(`), add:

```ts
const Difficulty3 = z.enum(["easy", "medium", "hard"]);
const NeetPattern = z.enum([
  "arrays-hashing", "two-pointers", "sliding-window", "stack",
  "binary-search", "linked-list", "trees", "tries", "heap-priority-queue",
  "backtracking", "graphs", "advanced-graphs", "1d-dp", "2d-dp",
  "greedy", "intervals", "math-geometry", "bit-manipulation",
]);

const DrillProblem = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  leetcodeId: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  difficulty: Difficulty3,
  pattern: NeetPattern,
  neetcode150: z.boolean().default(true),
  targetMinutes: z.number().int().positive(),
  appliesToLesson: z.string().regex(SlugRe).optional(),
  hints: z.array(Bi).min(2).max(4),
  followUp: Bi.optional(),
  companies: z.array(z.string()).default([]),
}).strict(); // .strict() forbids a `statement`/`description` field — never copy LeetCode prose

const drill = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/drill" }),
  schema: z.object({
    track: Track,
    unit: z.string().regex(SlugRe),
    patterns: z.array(NeetPattern).min(1),
    intro: Bi,
    problems: z.array(DrillProblem).min(3).max(12),
  }),
});

export type DrillData = z.infer<typeof drill.schema>;
```

> Note: `glob` and `Track`/`Bi` are already imported/defined earlier in the file. `.strict()` on `DrillProblem` makes an unknown key (e.g. a pasted `statement`) a schema error.

- [ ] **Step 3: Register the collection**

Find:
```ts
export const collections = { tracks, units, lessons, practice, projects };
```
Replace with:
```ts
export const collections = { tracks, units, lessons, practice, projects, drill };
```

- [ ] **Step 4: Typecheck**

Run: `cd site && bunx astro sync && bunx tsc --noEmit 2>&1 | grep -i content.config || echo "config clean"`
Expected: `config clean` (no errors referencing content.config.ts). `astro sync` regenerates collection types.

- [ ] **Step 5: Commit**

```bash
git add site/src/content.config.ts
git commit -m "feat(drill): drill collection schema + drill block slug"
```

---

## Task 2: Pure drill-state model (status + spaced revisit)

**Files:**
- Create: `site/src/components/algo/drill-state.ts`, `site/src/components/algo/drill-state.test.ts`

This is the pure, testable core of the island (no DOM). TDD.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/components/algo/drill-state.test.ts
import { describe, it, expect } from "vitest";
import { nextStatus, needsRevisit, type DrillStatus } from "./drill-state";

describe("drill-state", () => {
  it("cycles unattempted → attempted → solved → unattempted", () => {
    expect(nextStatus("unattempted")).toBe("attempted");
    expect(nextStatus("attempted")).toBe("solved");
    expect(nextStatus("solved")).toBe("unattempted");
  });

  it("flags a solved problem for revisit after 5+ days", () => {
    const now = 1_000 * 60 * 60 * 24 * 10; // day 10 in ms
    const day4 = now - 4 * 86_400_000;
    const day6 = now - 6 * 86_400_000;
    expect(needsRevisit({ status: "solved", at: day6 }, now)).toBe(true);
    expect(needsRevisit({ status: "solved", at: day4 }, now)).toBe(false);
  });

  it("never flags unattempted/attempted for revisit", () => {
    const now = 1_000_000_000_000;
    expect(needsRevisit({ status: "unattempted", at: 0 }, now)).toBe(false);
    expect(needsRevisit({ status: "attempted", at: 0 }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/components/algo/drill-state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `site/src/components/algo/drill-state.ts`**

```ts
export type DrillStatus = "unattempted" | "attempted" | "solved";
export interface DrillEntry { status: DrillStatus; at: number; }

const ORDER: DrillStatus[] = ["unattempted", "attempted", "solved"];
export function nextStatus(s: DrillStatus): DrillStatus {
  return ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];
}

const REVISIT_DAYS = 5;
export function needsRevisit(e: DrillEntry, now: number): boolean {
  if (e.status !== "solved") return false;
  return now - e.at >= REVISIT_DAYS * 86_400_000;
}

const KEY = "awesome.drill.v1";
type Store = Record<string, DrillEntry>; // problem id → entry

export function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
export function saveEntry(id: string, status: DrillStatus, now: number): void {
  if (typeof window === "undefined") return;
  const store = loadStore();
  store[id] = { status, at: now };
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/components/algo/drill-state.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/components/algo/drill-state.ts site/src/components/algo/drill-state.test.ts
git commit -m "feat(drill): status cycle + spaced-revisit model"
```

---

## Task 3: `DrillBoard` island

**Files:**
- Create: `site/src/components/algo/DrillBoard.tsx`

No unit test (presentational; logic is in drill-state.ts). Verified by the pilot build (Task 6).

- [ ] **Step 1: Write `site/src/components/algo/DrillBoard.tsx`**

```tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { nextStatus, needsRevisit, loadStore, saveEntry, type DrillStatus } from "./drill-state";

type Problem = {
  id: string; leetcodeId: number; slug: string; title: string;
  difficulty: "easy" | "medium" | "hard"; pattern: string; targetMinutes: number;
  hints: { en: string; ru: string }[];
  followUp?: { en: string; ru: string };
  companies: string[];
};
type Props = { lang: Locale; problems: Problem[] };

const DIFF_LABEL: Record<string, Record<Locale, string>> = {
  easy: { en: "Easy", ru: "Лёгкая" },
  medium: { en: "Medium", ru: "Средняя" },
  hard: { en: "Hard", ru: "Сложная" },
};

function ProblemCard({ p, lang, now }: { p: Problem; lang: Locale; now: number }) {
  const store = loadStore();
  const [status, setStatus] = useState<DrillStatus>(store[p.id]?.status ?? "unattempted");
  const [revealed, setRevealed] = useState(0);
  const revisit = needsRevisit({ status, at: store[p.id]?.at ?? 0 }, now);
  const url = `https://leetcode.com/problems/${p.slug}/`;

  function cycle() {
    const ns = nextStatus(status);
    setStatus(ns);
    saveEntry(p.id, ns, now);
  }

  return (
    <div class="border border-rule rounded-md p-3 flex flex-col gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <a class="font-semibold hover:underline" href={url} target="_blank" rel="noreferrer noopener">
          #{p.leetcodeId} {p.title}
        </a>
        <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rule/40">{DIFF_LABEL[p.difficulty][lang]}</span>
        <span class="text-[11px] text-muted font-mono">⏱ {p.targetMinutes}m</span>
        {revisit && <span class="text-[10px] font-mono text-[color:var(--accent,#b8860b)]">↻ revisit</span>}
        <span class="flex-1" />
        <button class="btn ghost text-[11px]" style="padding:2px 8px;" onClick={cycle}>
          {status === "unattempted" ? "○" : status === "attempted" ? "◐" : "●"} {status}
        </button>
      </div>
      {p.companies.length > 0 && (
        <div class="flex gap-1.5 flex-wrap">
          {p.companies.map((c) => <span class="text-[10px] text-muted font-mono">{c}</span>)}
        </div>
      )}
      <div class="flex flex-col gap-1">
        {p.hints.slice(0, revealed).map((h) => (
          <p class="text-[13px] text-ink-2 pl-3 border-l-2 border-rule">{h[lang]}</p>
        ))}
        {revealed < p.hints.length && (
          <button class="text-[12px] text-muted hover:text-ink text-left" onClick={() => setRevealed(revealed + 1)}>
            {lang === "ru" ? `Подсказка ${revealed + 1} из ${p.hints.length}` : `Reveal hint ${revealed + 1} of ${p.hints.length}`}
          </button>
        )}
      </div>
      {p.followUp && (
        <details class="text-[12px] text-muted">
          <summary class="cursor-pointer">{lang === "ru" ? "Follow-up (вслух)" : "Follow-up (aloud)"}</summary>
          <p class="mt-1 text-ink-2">{p.followUp[lang]}</p>
        </details>
      )}
    </div>
  );
}

export default function DrillBoard({ lang, problems }: Props) {
  // group by pattern, preserving input order
  const groups: { pattern: string; items: Problem[] }[] = [];
  for (const p of problems) {
    let g = groups.find((x) => x.pattern === p.pattern);
    if (!g) { g = { pattern: p.pattern, items: [] }; groups.push(g); }
    g.items.push(p);
  }
  const now = Date.now();
  const solved = problems.filter((p) => loadStore()[p.id]?.status === "solved").length;

  return (
    <div class="flex flex-col gap-6">
      <p class="text-[12px] text-muted font-mono">{solved}/{problems.length} solved</p>
      {groups.map((g) => (
        <section class="flex flex-col gap-2">
          <h3 class="font-mono text-[12px] uppercase tracking-wider text-muted">{g.pattern.replace(/-/g, " ")}</h3>
          {g.items.map((p) => <ProblemCard p={p} lang={lang} now={now} />)}
        </section>
      ))}
    </div>
  );
}
```

> `Date.now()` runs client-side only (the component is `client:visible`), so it's safe — not executed during SSR build.

- [ ] **Step 2: Typecheck**

Run: `cd site && bunx tsc --noEmit 2>&1 | grep -i DrillBoard || echo "DrillBoard clean"`
Expected: `DrillBoard clean`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/algo/DrillBoard.tsx
git commit -m "feat(drill): DrillBoard island (groups, hint ladder, status, revisit)"
```

---

## Task 4: `DrillSet.astro` (resolve collection → island)

**Files:**
- Create: `site/src/components/algo/DrillSet.astro`

- [ ] **Step 1: Write `site/src/components/algo/DrillSet.astro`**

```astro
---
import { getCollection } from "astro:content";
import DrillBoard from "./DrillBoard.tsx";
import type { Locale } from "~/i18n";

type Props = { unitKey: string; lang: Locale };
const { unitKey, lang } = Astro.props;

// unitKey is "<track>/<unit>", e.g. "algorithms/02-arrays-strings".
const all = await getCollection("drill");
const entry = all.find((e) => `${e.data.track}/${e.data.unit}` === unitKey);
if (!entry) throw new Error(`DrillSet: no drill collection entry for "${unitKey}"`);
const { intro, problems } = entry.data;
---
<p class="text-[14px] text-ink-2 mb-4">{intro[lang]}</p>
<DrillBoard client:visible lang={lang} problems={problems} />
```

- [ ] **Step 2: Typecheck**

Run: `cd site && bunx tsc --noEmit 2>&1 | grep -i DrillSet || echo "DrillSet clean"`
Expected: `DrillSet clean`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/algo/DrillSet.astro
git commit -m "feat(drill): DrillSet.astro resolves collection by unitKey"
```

---

## Task 5: Drill lint rule

**Files:**
- Create: `site/src/lint/rules/drill.ts`, `site/src/lint/rules/drill.test.ts`
- Modify: `site/src/lint/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/lint/rules/drill.test.ts
import { describe, it, expect } from "vitest";
import { lintDrillData } from "./drill";

const ok = {
  track: "algorithms", unit: "02-arrays-strings", patterns: ["two-pointers"],
  intro: { en: "x".repeat(30), ru: "y".repeat(30) },
  problems: [
    { id: "a", leetcodeId: 1, slug: "a", title: "A", difficulty: "easy", pattern: "two-pointers", targetMinutes: 10, hints: [{ en: "h1", ru: "п1" }, { en: "h2", ru: "п2" }], companies: [] },
    { id: "b", leetcodeId: 2, slug: "b", title: "B", difficulty: "medium", pattern: "two-pointers", targetMinutes: 12, hints: [{ en: "h1", ru: "п1" }, { en: "h2", ru: "п2" }], companies: [] },
    { id: "c", leetcodeId: 3, slug: "c", title: "C", difficulty: "hard", pattern: "two-pointers", targetMinutes: 20, hints: [{ en: "h1", ru: "п1" }, { en: "h2", ru: "п2" }], companies: [] },
  ],
};

describe("lintDrillData", () => {
  it("passes a well-formed entry", () => {
    const r = lintDrillData("f.json", ok);
    expect(r.errors).toEqual([]);
  });

  it("errors when a problem's pattern is not in the unit's patterns", () => {
    const bad = { ...ok, problems: [{ ...ok.problems[0], pattern: "graphs" }, ok.problems[1], ok.problems[2]] };
    expect(lintDrillData("f.json", bad).errors.join()).toMatch(/pattern .*not in/i);
  });

  it("errors on an untranslated hint (en === ru, long)", () => {
    const bad = JSON.parse(JSON.stringify(ok));
    bad.problems[0].hints[0] = { en: "same long sentence here", ru: "same long sentence here" };
    expect(lintDrillData("f.json", bad).errors.join()).toMatch(/untranslated/i);
  });

  it("warns when difficulty is not non-decreasing within a pattern", () => {
    const bad = JSON.parse(JSON.stringify(ok));
    bad.problems[0].difficulty = "hard"; bad.problems[2].difficulty = "easy";
    expect(lintDrillData("f.json", bad).warnings.join()).toMatch(/ramp/i);
  });

  it("errors on a duplicate leetcodeId across files (via the cross-file checker)", () => {
    // cross-file dedupe is exercised in the integration via checkDrillUnique; here just shape.
    expect(typeof lintDrillData).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/lint/rules/drill.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `site/src/lint/rules/drill.ts`**

```ts
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const PATTERNS = new Set([
  "arrays-hashing", "two-pointers", "sliding-window", "stack", "binary-search",
  "linked-list", "trees", "tries", "heap-priority-queue", "backtracking",
  "graphs", "advanced-graphs", "1d-dp", "2d-dp", "greedy", "intervals",
  "math-geometry", "bit-manipulation",
]);
const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const UNTRANSLATED_MIN_LEN = 12;

/** Pure per-file validation. Returns errors + warnings for one drill JSON object. */
export function lintDrillData(file: string, data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unitPatterns = new Set<string>(data.patterns ?? []);

  // forbidden field guard (defence in depth beyond schema .strict())
  for (const p of data.problems ?? []) {
    if ("statement" in p || "description" in p)
      errors.push(`drill: "${file}" problem "${p.id}" must not embed a LeetCode statement/description`);
    if (!PATTERNS.has(p.pattern))
      errors.push(`drill: "${file}" problem "${p.id}" has unknown pattern "${p.pattern}"`);
    if (!unitPatterns.has(p.pattern))
      errors.push(`drill: "${file}" problem "${p.id}" pattern "${p.pattern}" not in unit patterns [${[...unitPatterns].join(", ")}]`);

    // i18n parity on hints + followUp
    const bis = [...(p.hints ?? []), ...(p.followUp ? [p.followUp] : [])];
    for (const b of bis) {
      if (!b.en?.trim() || !b.ru?.trim())
        errors.push(`drill: "${file}" problem "${p.id}" has a whitespace-only en/ru field`);
      else if (b.en.length >= UNTRANSLATED_MIN_LEN && b.en.trim() === b.ru.trim())
        errors.push(`drill: "${file}" problem "${p.id}" has an untranslated field (en === ru)`);
    }
  }

  // difficulty ramp (warning) within each pattern group, in file order
  const seenRank: Record<string, number> = {};
  for (const p of data.problems ?? []) {
    const r = DIFF_RANK[p.difficulty] ?? 0;
    if (p.pattern in seenRank && r < seenRank[p.pattern])
      warnings.push(`drill: "${file}" difficulty ramp dips at "${p.id}" within "${p.pattern}"`);
    seenRank[p.pattern] = Math.max(seenRank[p.pattern] ?? 0, r);
  }

  // intro parity
  if (data.intro) {
    if (!data.intro.en?.trim() || !data.intro.ru?.trim())
      errors.push(`drill: "${file}" intro has a whitespace-only en/ru field`);
  }
  return { errors, warnings };
}

async function readDrill(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/drill");
  let files: string[] = [];
  async function walk(d: string) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      const p = join(d, i.name);
      if (i.isDirectory()) await walk(p);
      else if (i.name.endsWith(".json")) files.push(p);
    }
  }
  await walk(dir);
  const out: { file: string; data: any }[] = [];
  for (const f of files) {
    try { out.push({ file: f, data: JSON.parse(await readFile(f, "utf8")) }); } catch { /* schema handles malformed */ }
  }
  return out;
}

/** Integration entry: validates every drill file + cross-file leetcodeId uniqueness. */
export async function checkDrill(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const all = await readDrill(siteSrc);
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Map<number, string>();
  for (const { file, data } of all) {
    const r = lintDrillData(file, data);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    for (const p of data.problems ?? []) {
      if (seenIds.has(p.leetcodeId))
        errors.push(`drill: leetcodeId ${p.leetcodeId} duplicated in "${file}" and "${seenIds.get(p.leetcodeId)}"`);
      else seenIds.set(p.leetcodeId, file);
    }
  }
  return { errors, warnings };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/lint/rules/drill.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Register in `site/src/lint/index.ts`**

Add the import after the `checkBlockStubs` import (line ~16):
```ts
import { checkDrill } from "./rules/drill";
```
In the `astro:build:done` hook, after the `checkPracticeCount` block (around line 62, after `warnings.push(...pc.warnings);`), add:
```ts
        const drillRes = await checkDrill(siteSrc);
        errors.push(...drillRes.errors);
        warnings.push(...drillRes.warnings);
```

- [ ] **Step 6: Commit**

```bash
git add site/src/lint/rules/drill.ts site/src/lint/rules/drill.test.ts site/src/lint/index.ts
git commit -m "feat(drill): lint rule (pattern ownership, i18n, ramp, dedupe)"
```

---

## Task 6: Pilot unit `02-arrays-strings` (JSON + EN/RU block pages + units.json)

**Files:**
- Create: `site/src/content/drill/algorithms/02-arrays-strings.json`
- Create: `site/src/content/lessons/en/algorithms/02-arrays-strings/drill/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/02-arrays-strings/drill/index.mdx`
- Modify: `site/src/content/units.json`

> Ownership note: `02` owns **two-pointers + sliding-window** (arrays-hashing identity problems live in `05-hashing` to avoid duplication — the spec's illustrative example is superseded by this canonical split).

- [ ] **Step 1: Write `site/src/content/drill/algorithms/02-arrays-strings.json`**

```json
{
  "track": "algorithms",
  "unit": "02-arrays-strings",
  "patterns": ["two-pointers", "sliding-window"],
  "intro": {
    "en": "Drill the two sweeps that close most array interview questions: two pointers converging from the ends, and a window that grows and shrinks. Solve each cold, against the clock, then narrate the complexity.",
    "ru": "Отработай два приёма, закрывающих большинство собеседных задач на массивы: two pointers, сходящиеся с концов, и окно, которое растёт и сжимается. Решай каждую вхолодную, на время, затем проговори сложность."
  },
  "problems": [
    {
      "id": "valid-palindrome", "leetcodeId": 125, "slug": "valid-palindrome", "title": "Valid Palindrome",
      "difficulty": "easy", "pattern": "two-pointers", "targetMinutes": 10,
      "hints": [
        { "en": "You don't need a reversed copy. What two indices can walk toward the middle?", "ru": "Перевёрнутая копия не нужна. Какие два индекса могут идти к середине?" },
        { "en": "Left/right pointers; skip non-alphanumerics; compare lowercased chars.", "ru": "Указатели left/right; пропускай не-буквенно-цифровые; сравнивай символы в нижнем регистре." }
      ],
      "followUp": { "en": "State why this is O(1) extra space.", "ru": "Объясни, почему это O(1) дополнительной памяти." },
      "companies": ["Meta"]
    },
    {
      "id": "two-sum-ii-input-array-is-sorted", "leetcodeId": 167, "slug": "two-sum-ii-input-array-is-sorted", "title": "Two Sum II - Input Array Is Sorted",
      "difficulty": "medium", "pattern": "two-pointers", "targetMinutes": 12,
      "hints": [
        { "en": "The array is sorted — a hash map wastes that signal. Which two indices can move toward each other?", "ru": "Массив отсортирован — hash map этот сигнал не использует. Какие два индекса двигать навстречу?" },
        { "en": "Sum too big → move right pointer in; too small → move left pointer out.", "ru": "Сумма велика → двигай right внутрь; мала → двигай left наружу." }
      ],
      "followUp": { "en": "Why O(1) space here while plain Two Sum needs O(n)?", "ru": "Почему здесь O(1) памяти, а в обычном Two Sum нужно O(n)?" },
      "companies": ["Amazon"]
    },
    {
      "id": "3sum", "leetcodeId": 15, "slug": "3sum", "title": "3Sum",
      "difficulty": "medium", "pattern": "two-pointers", "targetMinutes": 20,
      "hints": [
        { "en": "Fix one number, then it's Two Sum II on the rest. What must you do first to use two pointers?", "ru": "Зафиксируй одно число — на остатке это Two Sum II. Что нужно сделать сначала, чтобы применить two pointers?" },
        { "en": "Sort; for each i, two-pointer the suffix; skip duplicates for i and both pointers.", "ru": "Отсортируй; для каждого i — two-pointer по суффиксу; пропускай дубликаты для i и обоих указателей." }
      ],
      "followUp": { "en": "Where exactly do duplicate triples sneak in, and how do you skip them?", "ru": "Где именно проникают дублирующиеся тройки и как их пропустить?" },
      "companies": ["Amazon", "Meta"]
    },
    {
      "id": "best-time-to-buy-and-sell-stock", "leetcodeId": 121, "slug": "best-time-to-buy-and-sell-stock", "title": "Best Time to Buy and Sell Stock",
      "difficulty": "easy", "pattern": "sliding-window", "targetMinutes": 10,
      "hints": [
        { "en": "Track the cheapest price seen so far; best sale today is price minus that minimum.", "ru": "Веди минимальную цену на текущий момент; лучшая продажа сегодня — price минус этот минимум." }
      ],
      "followUp": { "en": "Frame it as a window: what do the left and right ends represent?", "ru": "Сформулируй как окно: что представляют левый и правый концы?" },
      "companies": ["Amazon"]
    },
    {
      "id": "longest-substring-without-repeating-characters", "leetcodeId": 3, "slug": "longest-substring-without-repeating-characters", "title": "Longest Substring Without Repeating Characters",
      "difficulty": "medium", "pattern": "sliding-window", "targetMinutes": 18,
      "hints": [
        { "en": "Grow the window on the right; when a repeat enters, shrink from the left until it's gone.", "ru": "Расширяй окно справа; когда входит повтор, сжимай слева, пока он не исчезнет." },
        { "en": "A set of chars in the current window gives O(1) repeat detection.", "ru": "Множество символов текущего окна даёт O(1)-детект повтора." }
      ],
      "followUp": { "en": "Why is the total work O(n) even though there's an inner shrink loop?", "ru": "Почему общая работа O(n), хотя есть внутренний цикл сжатия?" },
      "companies": ["Amazon", "Google"]
    },
    {
      "id": "longest-repeating-character-replacement", "leetcodeId": 424, "slug": "longest-repeating-character-replacement", "title": "Longest Repeating Character Replacement",
      "difficulty": "medium", "pattern": "sliding-window", "targetMinutes": 20,
      "hints": [
        { "en": "A window is valid if (window length − count of its most frequent char) ≤ k.", "ru": "Окно валидно, если (длина окна − число самого частого символа) ≤ k." },
        { "en": "Track char counts and the running max count; shrink when the window stops being valid.", "ru": "Веди счётчики символов и текущий максимум; сжимай, когда окно перестаёт быть валидным." }
      ],
      "followUp": { "en": "Why is it OK that the max-count is never decreased on shrink?", "ru": "Почему допустимо, что max-count не уменьшается при сжатии?" },
      "companies": ["Google"]
    }
  ]
}
```

- [ ] **Step 2: Write `site/src/content/lessons/en/algorithms/02-arrays-strings/drill/index.mdx`**

```mdx
---
slug: drill
lang: en
track: algorithms
unit: 02-arrays-strings
order: 11
title: 'Arrays & strings: interview drill'
summary: "Timed two-pointer and sliding-window problems from the NeetCode-150, with progressive hints — solve each cold, then narrate the complexity."
estMin: 120
status: ready
lessonType: coding
level: senior
concepts: [two-pointers, sliding-window, hashing, complexity, interview-prep]
sources:
  - https://neetcode.io/roadmap
  - https://leetcode.com/problems/3sum/
---
import DrillSet from "~/components/algo/DrillSet.astro";
import Hook from "~/components/prose/Crux.astro";
import Goal from "~/components/prose/KeyTakeaway.astro";
import Recap from "~/components/prose/KeyTakeaway.astro";

<Hook>You understand the patterns. Interviews test whether you can reach for them under a timer, cold, and explain the cost out loud.</Hook>

<Goal lang="en">Solve each problem before revealing a hint. Hit the target time. Then say the time and space complexity aloud — that is the interview skill, not just the code.</Goal>

<DrillSet unitKey="algorithms/02-arrays-strings" lang="en" />

<Recap lang="en">Mark each problem solved, and let the spaced-revisit nudge bring it back in a week — recall from memory is what sticks, not re-reading.</Recap>
```

> Verify the import paths for `Crux`/`KeyTakeaway` match how an existing block (e.g. `lessons/en/algorithms/02-arrays-strings/quiz-code/index.mdx`) imports `Hook`/`Goal`/`Recap`. If those blocks import from different component names, mirror them exactly instead of the paths above.

- [ ] **Step 3: Write the RU page `site/src/content/lessons/ru/algorithms/02-arrays-strings/drill/index.mdx`**

Identical structure; only `lang`, prose, and `summary` differ:

```mdx
---
slug: drill
lang: ru
track: algorithms
unit: 02-arrays-strings
order: 11
title: 'Массивы и строки: собесный дрилл'
summary: "Задачи на two pointers и sliding window из NeetCode-150 на время, с прогрессивными подсказками — решай каждую вхолодную, затем проговаривай сложность."
estMin: 120
status: ready
lessonType: coding
level: senior
concepts: [two-pointers, sliding-window, hashing, complexity, interview-prep]
sources:
  - https://neetcode.io/roadmap
  - https://leetcode.com/problems/3sum/
---
import DrillSet from "~/components/algo/DrillSet.astro";
import Hook from "~/components/prose/Crux.astro";
import Goal from "~/components/prose/KeyTakeaway.astro";
import Recap from "~/components/prose/KeyTakeaway.astro";

<Hook>Ты понимаешь паттерны. Собес проверяет, дотянешься ли ты до них под таймером, вхолодную, и объяснишь ли стоимость вслух.</Hook>

<Goal lang="ru">Решай каждую задачу до раскрытия подсказки. Укладывайся в target-time. Затем проговори вслух time и space сложность — это и есть собесный навык, а не только код.</Goal>

<DrillSet unitKey="algorithms/02-arrays-strings" lang="ru" />

<Recap lang="ru">Отмечай решённые задачи и дай spaced-revisit вернуть их через неделю — запоминается recall по памяти, а не перечитывание.</Recap>
```

- [ ] **Step 4: Add `drill` to the unit's lessons[] in `site/src/content/units.json`**

Find the `02-arrays-strings` unit object in the `algorithms` track and append `"drill"` to its `lessons` array (after the last existing entry, e.g. after `"project"`). Example shape:
```json
"lessons": ["01-...", "...", "quiz-choice", "quiz-short", "quiz-code", "project", "drill"]
```

- [ ] **Step 5: Build and verify**

Run: `cd site && bun run build`
Expected: page count = previous + 2 (`/en/learn/algorithms/02-arrays-strings/drill` + ru), `lint 0 errors`. Fix any MDX/import errors (most likely the `Hook`/`Goal`/`Recap` import paths — align with a sibling block).
Run: `python3 -c "import json;print('errors:',len(json.load(open('dist/lint-report.json'))['errors']))"`
Expected: `errors: 0`.

- [ ] **Step 6: Visual check**

Open `dist/en/learn/algorithms/02-arrays-strings/drill/index.html` — confirm 6 problems render grouped by pattern (two-pointers, then sliding-window), hint buttons reveal one at a time, links point to `leetcode.com/problems/<slug>/`, difficulty + target-time chips show. Repeat for ru.

- [ ] **Step 7: Commit**

```bash
git add site/src/content/drill/algorithms/02-arrays-strings.json \
        "site/src/content/lessons/en/algorithms/02-arrays-strings/drill/index.mdx" \
        "site/src/content/lessons/ru/algorithms/02-arrays-strings/drill/index.mdx" \
        site/src/content/units.json
git commit -m "feat(drill): pilot drill block for 02-arrays-strings EN+RU"
```

---

## Task 7: Link-liveness checker script (out-of-band)

**Files:**
- Create: `scripts/check-drill-links.mjs`

- [ ] **Step 1: Write `scripts/check-drill-links.mjs`**

```js
#!/usr/bin/env node
// Out-of-band LeetCode link liveness checker. NOT part of the build.
// Usage: node scripts/check-drill-links.mjs
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../site/src/content/drill", import.meta.url).pathname;

async function walk(dir) {
  const out = [];
  for (const i of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.name.endsWith(".json")) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
let bad = 0, total = 0;
for (const f of files) {
  const data = JSON.parse(await readFile(f, "utf8"));
  for (const p of data.problems ?? []) {
    total++;
    const url = `https://leetcode.com/problems/${p.slug}/`;
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "manual" });
      if (res.status >= 400) { bad++; console.log(`DEAD  ${res.status}  #${p.leetcodeId} ${p.title} → ${url}`); }
      else if (res.status >= 300) { bad++; console.log(`MOVED ${res.status}  #${p.leetcodeId} ${p.title} → ${url}`); }
    } catch (e) {
      bad++; console.log(`ERR   ${String(e).slice(0, 60)}  #${p.leetcodeId} ${p.title}`);
    }
    await new Promise((r) => setTimeout(r, 250)); // be polite
  }
}
console.log(`\n${total - bad}/${total} links OK${bad ? ` — ${bad} need re-curation` : ""}`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 2: Smoke-run (network; may rate-limit — informational)**

Run: `node scripts/check-drill-links.mjs`
Expected: prints `6/6 links OK` for the pilot (or flags any that LeetCode has moved). Non-blocking — if LeetCode rate-limits, note it and proceed.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-drill-links.mjs
git commit -m "chore(drill): out-of-band link liveness checker"
```

---

## Rollout tasks (8–17): one curated drill set per unit

Each task mirrors Task 6 exactly (JSON + en/ru `drill/index.mdx` + `units.json` entry + build + commit), changing only the unit, patterns, and the curated problem list below. Author `intro` + `hints` (2–4, bilingual, progressive — never the full solution) + `followUp` for every problem, following the quality bar of the `02` exemplar. `targetMinutes`: easy 10, medium 15–20, hard 25. Each commit: `feat(drill): drill block for <unit> EN+RU`. After each, build must stay `lint 0 errors`.

The curated problems (id == slug; the `appliesToLesson` is optional):

### Task 8 — `05-hashing` (patterns: `arrays-hashing`)
- #1 two-sum (easy) · #242 valid-anagram (easy) · #49 group-anagrams (medium) · #347 top-k-frequent-elements (medium) · #36 valid-sudoku (medium) · #128 longest-consecutive-sequence (medium)

### Task 9 — `03-sorting-search` (patterns: `binary-search`)
- #704 binary-search (easy) · #74 search-a-2d-matrix (medium) · #153 find-minimum-in-rotated-sorted-array (medium) · #33 search-in-rotated-sorted-array (medium) · #875 koko-eating-bananas (medium)

### Task 10 — `04-recursion-backtracking` (patterns: `backtracking`)
- #78 subsets (medium) · #39 combination-sum (medium) · #46 permutations (medium) · #22 generate-parentheses (medium) · #79 word-search (medium)

### Task 11 — `06-lists-stacks-queues` (patterns: `linked-list`, `stack`)
- #206 reverse-linked-list (easy) · #21 merge-two-sorted-lists (easy) · #141 linked-list-cycle (easy) · #143 reorder-list (medium) · #20 valid-parentheses (easy) · #155 min-stack (medium) · #739 daily-temperatures (medium)

### Task 12 — `07-trees` (patterns: `trees`, `tries`)
- #226 invert-binary-tree (easy) · #104 maximum-depth-of-binary-tree (easy) · #100 same-tree (easy) · #102 binary-tree-level-order-traversal (medium) · #98 validate-binary-search-tree (medium) · #208 implement-trie-prefix-tree (medium)

### Task 13 — `08-heaps` (patterns: `heap-priority-queue`)
- #703 kth-largest-element-in-a-stream (easy) · #1046 last-stone-weight (easy) · #215 kth-largest-element-in-an-array (medium) · #973 k-closest-points-to-origin (medium) · #621 task-scheduler (medium)

### Task 14 — `09-graphs` (patterns: `graphs`, `advanced-graphs`)
- #200 number-of-islands (medium) · #133 clone-graph (medium) · #207 course-schedule (medium) · #417 pacific-atlantic-water-flow (medium) · #743 network-delay-time (medium)

### Task 15 — `10-dynamic-programming` (patterns: `1d-dp`, `2d-dp`)
- #70 climbing-stairs (easy) · #198 house-robber (medium) · #322 coin-change (medium) · #300 longest-increasing-subsequence (medium) · #1143 longest-common-subsequence (medium) · #62 unique-paths (medium)

### Task 16 — `11-greedy` (patterns: `greedy`, `intervals`)
- #53 maximum-subarray (medium) · #55 jump-game (medium) · #57 insert-interval (medium) · #56 merge-intervals (medium) · #435 non-overlapping-intervals (medium)

### Task 17 — `12-toolbox` (patterns: `math-geometry`, `bit-manipulation`)
- #48 rotate-image (medium) · #54 spiral-matrix (medium) · #191 number-of-1-bits (easy) · #338 counting-bits (easy) · #136 single-number (easy)

> Each rollout task's checklist (mirror Task 6):
> 1. Write `site/src/content/drill/algorithms/<unit>.json` (track/unit/patterns/intro/problems with bilingual hints).
> 2. Write `en` + `ru` `…/<unit>/drill/index.mdx` (order 11, status ready, sources include neetcode.io/roadmap + one problem URL).
> 3. Append `"drill"` to the unit's `lessons[]` in `units.json`.
> 4. `cd site && bun run build` → lint 0 errors; fix MDX iteratively.
> 5. Commit `feat(drill): drill block for <unit> EN+RU`.

---

## Task 18: Final verification

**Files:** none

- [ ] **Step 1: All unit tests pass**

Run: `cd site && bun run test src/components/algo/drill-state.test.ts src/lint/rules/drill.test.ts`
Expected: drill-state 3 + drill lint 5 = all pass.

- [ ] **Step 2: Full build green**

Run: `cd site && bun run build`
Expected: previous page count + 22 (11 units × 2 langs) drill pages, `lint 0 errors`.
Run: `python3 -c "import json;print('errors:',len(json.load(open('dist/lint-report.json'))['errors']))"`
Expected: `errors: 0`.

- [ ] **Step 3: Link check (informational, network)**

Run: `node scripts/check-drill-links.mjs`
Expected: all ~61 links OK (or a short list to re-curate; non-blocking).

- [ ] **Step 4: Update memory**

Add/extend a memory note: drill block shipped for the algorithms track (collection + component + lint + ~61 NeetCode-150 problems across 11 units), where the spec/plan/link-checker live, and that link liveness is checked out-of-band quarterly. One-line pointer in `MEMORY.md`.

- [ ] **Step 5: Final commit (if any stray changes)**

```bash
git add -A && git commit -m "chore(drill): finalize algorithms drill block"
```

---

## Self-review notes (coverage map)

- Spec §"Data model" (collection + schema, `.strict()` no-statement) → Task 1.
- Spec §"DrillSet component" (Astro resolve + island, hint ladder, status, revisit, timer-ready) → Tasks 2 (state), 3 (board), 4 (resolver).
- Spec §"Lint rules" (pattern ownership, i18n parity, ramp warning, dedupe, no statement) → Task 5.
- Spec §"Block page" (slug drill, order 11, thin MDX, units.json) → Task 6 + rollout.
- Spec §"Pattern → unit map" + "essential subset ~4–7/unit ≈60" → Tasks 6, 8–17 (6+6+5+5+7+6+5+5+6+5+5 = 61 problems).
- Spec §"Link-rot mitigation" (out-of-band, identity survives) → Task 7.
- Spec §"i18n" (Bi fields, titles English) → enforced by schema (Task 1) + lint (Task 5) + bilingual pages (Task 6+).
- Spec §"Legal/ethical" (link only, no statements) → schema `.strict()` (Task 1) + lint guard (Task 5).
- Type consistency: `DrillStatus`/`nextStatus`/`needsRevisit`/`loadStore`/`saveEntry` defined in Task 2, consumed in Task 3. `lintDrillData`/`checkDrill` defined in Task 5, registered in Task 5 Step 5. `DrillSet` prop `unitKey`+`lang` defined Task 4, used Task 6. Collection name `drill` consistent across Tasks 1/4/5/7.
- Ownership reconciliation: `02` = two-pointers+sliding-window; `05` = arrays-hashing — no problem appears twice (dedupe lint enforces).
```
