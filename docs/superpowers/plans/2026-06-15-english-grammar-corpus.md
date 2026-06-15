# English Grammar Corpus (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import steep's 122 grammar topic JSONs into a typed, bilingual, CEFR-leveled corpus under `site/src/english/`, with a deterministic mapper, a runtime validator, a barrel, and tests — the foundation every later phase (engine, animations, coverage, UI) depends on.

**Architecture:** Plain-TS data modules (one `GrammarTopic` per file under `data/grammar/`) mirroring the existing `vocab-*.ts` data-module convention, produced by a *deterministic* mapper over steep JSON (RU prose copied verbatim) plus a later LLM-authoring pass (EN prose + taxonomy tags) committed as static data. The generative practice spec (`gen`) is typed here but its data is authored in Phase 3 (engine). A runtime validator + Vitest tests gate the shape.

**Tech Stack:** TypeScript, Astro 5 (Vite `import.meta.glob`), Preact, Vitest (`bun run test`), bun. Source corpus: `/Users/artemmac/dev/personal/steep/grammar/explanations/data/*.json`.

**Conventions (verified):**
- Test runner: `bun run test` (= `vitest run`). NOT `bun test`.
- Vitest `include`: `src/**/*.test.ts(x)`, `scripts/**/*.test.ts`. Alias `~` → `site/src`.
- All commands run from `/Users/artemmac/dev/awesome-everything/site`.
- Branch already created: `feat/english-grammar-system`.
- Steep example format: `"English text (Русский текст)"` — RU is the trailing parenthetical.

---

### Task 1: Grammar types + runtime validators

**Files:**
- Create: `site/src/english/grammar-types.ts`
- Modify: `site/src/english/types.ts` (re-export the new types)
- Test: `site/src/english/grammar-types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/grammar-types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  CEFR_ORDER,
  validateGrammarTopic,
  authoringErrors,
  type GrammarTopic,
} from "./grammar-types";

function minimalSkeleton(): GrammarTopic {
  return {
    id: "present-simple",
    title: { en: "", ru: "Present Simple" },
    cefr: "A1",
    levels: ["A1"],
    family: "unclassified",
    egp: [],
    archetype: "",
    lessons: {
      A1: {
        cefr: "A1",
        explain: { en: "", ru: "Время для привычек." },
        structure: { en: "", ru: "" },
        examples: [{ en: "I work.", ru: "Я работаю." }],
        tip: { en: "", ru: "Добавляй -s для he/she/it." },
      },
    },
    related: [],
    crossTopic: [],
  };
}

describe("CEFR_ORDER", () => {
  it("orders bands zero→C2", () => {
    expect(CEFR_ORDER).toEqual(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]);
  });
});

describe("validateGrammarTopic (structural)", () => {
  it("accepts a valid skeleton", () => {
    expect(validateGrammarTopic(minimalSkeleton())).toEqual([]);
  });
  it("flags a missing id", () => {
    const t = { ...minimalSkeleton(), id: "" };
    expect(validateGrammarTopic(t)).toContain("id is empty");
  });
  it("flags an empty levels list", () => {
    const t = { ...minimalSkeleton(), levels: [] };
    expect(validateGrammarTopic(t)).toContain("levels is empty");
  });
  it("flags a lesson missing ru explanation", () => {
    const t = minimalSkeleton();
    t.lessons.A1!.explain = { en: "", ru: "" };
    expect(validateGrammarTopic(t).some((e) => e.includes("explain.ru"))).toBe(true);
  });
});

describe("authoringErrors (completeness, post-authoring)", () => {
  it("flags an unclassified family and empty en prose on a skeleton", () => {
    const errs = authoringErrors(minimalSkeleton());
    expect(errs).toContain("family is unclassified");
    expect(errs.some((e) => e.includes("title.en"))).toBe(true);
  });
  it("passes a fully authored topic", () => {
    const t = minimalSkeleton();
    t.title.en = "Present Simple";
    t.family = "tenses";
    t.archetype = "timeline";
    t.lessons.A1!.explain.en = "Use it for habits and facts.";
    t.lessons.A1!.structure = { en: "subject + verb(+s)", ru: "подлежащее + глагол(+s)" };
    expect(authoringErrors(t)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/english/grammar-types.test.ts`
Expected: FAIL — `Cannot find module './grammar-types'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/english/grammar-types.ts`:

```ts
// site/src/english/grammar-types.ts
// Typed, bilingual, CEFR-leveled grammar corpus model. See
// docs/superpowers/specs/2026-06-15-english-grammar-system-design.md §4–§5.
import type { Bi } from "./types";

export type Cefr = "A0" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const CEFR_ORDER: Cefr[] = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];
export const cefrIndex = (c: Cefr): number => CEFR_ORDER.indexOf(c);

export type GrammarFamily =
  | "tenses" | "aspect" | "modals" | "conditionals" | "passive"
  | "articles" | "nouns" | "pronouns" | "adjectives" | "adverbs"
  | "prepositions" | "relative-clauses" | "reported-speech"
  | "questions" | "verb-patterns" | "phrasal-verbs" | "conjunctions"
  | "word-order" | "discourse"
  | "unclassified"; // import-time sentinel; authoring replaces it

export type ExerciseType =
  | "fill_in_blank" | "multiple_choice" | "error_correction"
  | "sentence_transformation" | "word_order";

// --- Generative practice spec (typed now; DATA authored in Phase 3 / engine) ---
export type Register = "neutral" | "engineering" | "academic";
export type Pool = {
  id: string;
  tags: { level: Cefr[]; register?: Register[] };
  items: string[];
};
export type Template = {
  id: string;
  type: ExerciseType;
  cefrMin: Cefr;
  cefrMax: Cefr;
  pattern: string;
  slots: Record<string, { pool: string; feature?: string }>;
  deriveKey: string;
  rationale: Bi;
  contrast?: { wrong: string; why: Bi }[];
};
export type TopicGenSpec = {
  pools: Pool[];
  templates: Template[];
  features: string[];
};

export type GrammarLesson = {
  cefr: Cefr;
  explain: Bi;     // RU verbatim from steep; EN authored
  structure: Bi;   // the rule named
  examples: { en: string; ru: string; note?: Bi }[];
  tip: Bi;         // steep "tip"
  pitfalls?: { wrong: string; right: string; why: Bi }[];
};

export type GrammarTopic = {
  id: string;                 // kebab from steep topicId, e.g. "present-simple"
  title: Bi;
  cefr: Cefr;                 // entry level (lowest authored)
  levels: Cefr[];             // levels with authored lessons, low→high
  family: GrammarFamily;
  egp: string[];              // English Grammar Profile competency ids (Phase 2)
  archetype: string;          // key into the animation archetype map (Phase 4)
  archetypeParams?: Record<string, string | string[]>;
  lessons: Partial<Record<Cefr, GrammarLesson>>;
  gen?: TopicGenSpec;         // authored in Phase 3
  related: string[];          // confusable/sibling topic ids
  crossTopic: string[];       // topic ids this composes with
};

const nonEmpty = (s: unknown): boolean => typeof s === "string" && s.trim().length > 0;

/** Structural invariants — must hold the moment the importer writes a skeleton. */
export function validateGrammarTopic(t: GrammarTopic): string[] {
  const errs: string[] = [];
  if (!nonEmpty(t.id)) errs.push("id is empty");
  if (!nonEmpty(t.title?.ru)) errs.push("title.ru is empty");
  if (!Array.isArray(t.levels) || t.levels.length === 0) errs.push("levels is empty");
  for (const lv of t.levels ?? []) {
    const lesson = t.lessons?.[lv];
    if (!lesson) { errs.push(`lessons.${lv} missing`); continue; }
    if (!nonEmpty(lesson.explain?.ru)) errs.push(`lessons.${lv}.explain.ru is empty`);
    if (!nonEmpty(lesson.tip?.ru)) errs.push(`lessons.${lv}.tip.ru is empty`);
    if (!Array.isArray(lesson.examples) || lesson.examples.length === 0)
      errs.push(`lessons.${lv}.examples is empty`);
  }
  return errs;
}

/** Completeness invariants — must hold AFTER the authoring pass (Phase 1, Task 8). */
export function authoringErrors(t: GrammarTopic): string[] {
  const errs = validateGrammarTopic(t);
  if (t.family === "unclassified") errs.push("family is unclassified");
  if (!nonEmpty(t.title?.en)) errs.push("title.en is empty");
  if (!nonEmpty(t.archetype)) errs.push("archetype is empty");
  for (const lv of t.levels ?? []) {
    const lesson = t.lessons?.[lv];
    if (lesson && !nonEmpty(lesson.explain?.en)) errs.push(`lessons.${lv}.explain.en is empty`);
  }
  return errs;
}
```

- [ ] **Step 4: Re-export from `types.ts`**

Append to `site/src/english/types.ts` (end of file):

```ts
export type {
  Cefr, GrammarFamily, ExerciseType, GrammarLesson, GrammarTopic,
  TopicGenSpec, Pool, Template, Register,
} from "./grammar-types";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test src/english/grammar-types.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add site/src/english/grammar-types.ts site/src/english/grammar-types.test.ts site/src/english/types.ts
git commit -m "feat(english): grammar corpus types + structural/authoring validators"
```

---

### Task 2: Example parser (`"EN (RU)"` → `{en, ru}`)

**Files:**
- Create: `site/scripts/grammar-import/parse-example.ts`
- Test: `site/scripts/grammar-import/parse-example.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/scripts/grammar-import/parse-example.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseExample } from "./parse-example";

describe("parseExample", () => {
  it("splits a simple EN (RU) example", () => {
    expect(parseExample("I live in Moscow. (Я живу в Москве.)")).toEqual({
      en: "I live in Moscow.",
      ru: "Я живу в Москве.",
    });
  });
  it("uses the LAST Cyrillic parenthetical when EN has its own parens", () => {
    expect(parseExample("Use 'the' (definite article). (Используй 'the'.)")).toEqual({
      en: "Use 'the' (definite article).",
      ru: "Используй 'the'.",
    });
  });
  it("falls back to en-only when no Cyrillic parenthetical exists", () => {
    expect(parseExample("He works.")).toEqual({ en: "He works.", ru: "" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test scripts/grammar-import/parse-example.test.ts`
Expected: FAIL — `Cannot find module './parse-example'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/scripts/grammar-import/parse-example.ts`:

```ts
// Parse steep's "English text (Русский перевод)" example strings.
const CYR = /[А-Яа-яЁё]/;

export function parseExample(raw: string): { en: string; ru: string } {
  const s = raw.trim();
  // Find the last balanced "(...)" whose content contains Cyrillic.
  let depth = 0, open = -1, lastOpen = -1, lastClose = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") { if (depth === 0) open = i; depth++; }
    else if (s[i] === ")") {
      depth--;
      if (depth === 0 && open >= 0) {
        const inner = s.slice(open + 1, i);
        if (CYR.test(inner)) { lastOpen = open; lastClose = i; }
      }
    }
  }
  if (lastOpen >= 0) {
    return {
      en: s.slice(0, lastOpen).trim(),
      ru: s.slice(lastOpen + 1, lastClose).trim(),
    };
  }
  return { en: s, ru: "" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test scripts/grammar-import/parse-example.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/grammar-import/parse-example.ts site/scripts/grammar-import/parse-example.test.ts
git commit -m "feat(english): steep example parser (EN/RU split)"
```

---

### Task 3: Deterministic topic mapper

**Files:**
- Create: `site/scripts/grammar-import/map.ts`
- Test: `site/scripts/grammar-import/map.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/scripts/grammar-import/map.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { kebab, mapSteepTopic, type SteepTopic } from "./map";
import { validateGrammarTopic } from "~/english/grammar-types";

const fixture: SteepTopic = {
  topicId: "present_simple",
  levels: {
    B1: {
      content: "**Present Simple** — время для привычек.",
      examples: ["She likes cats. (Она любит кошек.)"],
      tip: "Добавляй -s для he/she/it.",
    },
    A1: {
      content: "Простое время.",
      examples: ["I work. (Я работаю.)"],
      tip: "Не забывай -s.",
    },
  },
};

describe("kebab", () => {
  it("converts snake_case to kebab-case", () => {
    expect(kebab("article_with_proper_nouns")).toBe("article-with-proper-nouns");
  });
});

describe("mapSteepTopic", () => {
  const t = mapSteepTopic(fixture);

  it("produces a structurally valid skeleton", () => {
    expect(validateGrammarTopic(t)).toEqual([]);
  });
  it("kebabs the id and sorts levels low→high", () => {
    expect(t.id).toBe("present-simple");
    expect(t.levels).toEqual(["A1", "B1"]);
    expect(t.cefr).toBe("A1");
  });
  it("copies RU prose verbatim and parses examples", () => {
    expect(t.lessons.A1!.explain.ru).toBe("Простое время.");
    expect(t.lessons.B1!.tip.ru).toBe("Добавляй -s для he/she/it.");
    expect(t.lessons.B1!.examples[0]).toEqual({ en: "She likes cats.", ru: "Она любит кошек." });
  });
  it("leaves EN prose and taxonomy empty for the authoring pass", () => {
    expect(t.lessons.A1!.explain.en).toBe("");
    expect(t.family).toBe("unclassified");
    expect(t.archetype).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test scripts/grammar-import/map.test.ts`
Expected: FAIL — `Cannot find module './map'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/scripts/grammar-import/map.ts`:

```ts
import { CEFR_ORDER, cefrIndex, type Cefr, type GrammarLesson, type GrammarTopic } from "~/english/grammar-types";
import { parseExample } from "./parse-example";

export type SteepLevel = { content: string; examples?: string[]; tip?: string };
export type SteepTopic = { topicId: string; levels: Record<string, SteepLevel> };

export const kebab = (s: string): string => s.replace(/_/g, "-").toLowerCase();

const isCefr = (s: string): s is Cefr => (CEFR_ORDER as string[]).includes(s);

export function mapSteepTopic(raw: SteepTopic): GrammarTopic {
  const levels = (Object.keys(raw.levels).filter(isCefr) as Cefr[])
    .sort((a, b) => cefrIndex(a) - cefrIndex(b));

  const lessons: Partial<Record<Cefr, GrammarLesson>> = {};
  for (const lv of levels) {
    const src = raw.levels[lv];
    lessons[lv] = {
      cefr: lv,
      explain: { en: "", ru: src.content ?? "" },
      structure: { en: "", ru: "" },
      examples: (src.examples ?? []).map(parseExample),
      tip: { en: "", ru: src.tip ?? "" },
    };
  }

  return {
    id: kebab(raw.topicId),
    title: { en: "", ru: titleFromId(raw.topicId) },
    cefr: levels[0] ?? "A1",
    levels,
    family: "unclassified",
    egp: [],
    archetype: "",
    lessons,
    related: [],
    crossTopic: [],
  };
}

// Human-ish RU placeholder title from the id; authoring replaces title.en and may refine ru.
function titleFromId(topicId: string): string {
  return topicId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test scripts/grammar-import/map.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/grammar-import/map.ts site/scripts/grammar-import/map.test.ts
git commit -m "feat(english): deterministic steep→GrammarTopic mapper"
```

---

### Task 4: Topic serializer (GrammarTopic → TS module text)

**Files:**
- Create: `site/scripts/grammar-import/serialize.ts`
- Test: `site/scripts/grammar-import/serialize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/scripts/grammar-import/serialize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serializeTopic } from "./serialize";
import { mapSteepTopic, type SteepTopic } from "./map";

const fixture: SteepTopic = {
  topicId: "present_simple",
  levels: { A1: { content: "Строка с \"кавычками\"\nи переносом.", examples: ["I work. (Я работаю.)"], tip: "Совет." } },
};

describe("serializeTopic", () => {
  const text = serializeTopic(mapSteepTopic(fixture));

  it("imports the type and exports a `topic` const", () => {
    expect(text).toContain('import type { GrammarTopic } from "~/english/grammar-types";');
    expect(text).toContain("export const topic: GrammarTopic =");
  });
  it("round-trips through JSON (the literal is valid JSON)", () => {
    // Slice the object literal: first "{" AFTER the export keyword (the import
    // line above also contains braces) through the final "}".
    const start = text.indexOf("{", text.indexOf("export const topic"));
    const json = text.slice(start, text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("present-simple");
    expect(parsed.lessons.A1.explain.ru).toContain("переносом");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test scripts/grammar-import/serialize.test.ts`
Expected: FAIL — `Cannot find module './serialize'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/scripts/grammar-import/serialize.ts`:

```ts
import type { GrammarTopic } from "~/english/grammar-types";

// JSON.stringify output is a valid TS object literal (newlines/quotes escaped),
// so the emitted module both compiles and JSON-parses for tests.
export function serializeTopic(t: GrammarTopic): string {
  const body = JSON.stringify(t, null, 2);
  return [
    "// AUTO-GENERATED by scripts/grammar-import/run.ts, then hand-authored (EN prose + taxonomy).",
    "// RU prose is verbatim from steep and must not be edited. See spec §4.",
    'import type { GrammarTopic } from "~/english/grammar-types";',
    "",
    `export const topic: GrammarTopic = ${body};`,
    "",
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test scripts/grammar-import/serialize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/grammar-import/serialize.ts site/scripts/grammar-import/serialize.test.ts
git commit -m "feat(english): GrammarTopic → TS module serializer"
```

---

### Task 5: Import driver — generate the 122 topic files

**Files:**
- Create: `site/scripts/grammar-import/run.ts`
- Creates at runtime: `site/src/english/data/grammar/<id>.ts` (×122)

- [ ] **Step 1: Write the driver**

Create `site/scripts/grammar-import/run.ts`:

```ts
// One-time, re-runnable importer. Reads steep grammar JSONs → maps → serializes
// one TS module per topic. Idempotent: regenerates skeletons. Authored fields
// (EN prose, taxonomy) live in the files after Task 8; re-running this OVERWRITES
// them, so only run it on a clean corpus (before authoring) or with --dry first.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { mapSteepTopic, type SteepTopic } from "./map";
import { serializeTopic } from "./serialize";

const SRC = process.env.STEEP_GRAMMAR_DIR
  ?? "/Users/artemmac/dev/personal/steep/grammar/explanations/data";
const OUT = resolve(import.meta.dir, "../../src/english/data/grammar");
const dry = process.argv.includes("--dry");

function main(): void {
  if (!existsSync(SRC)) { console.error(`steep source not found: ${SRC}`); process.exit(1); }
  if (!dry) mkdirSync(OUT, { recursive: true });
  const files = readdirSync(SRC).filter((f) => f.endsWith(".json"));
  let n = 0;
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(SRC, f), "utf8")) as SteepTopic;
    const topic = mapSteepTopic(raw);
    const dest = join(OUT, `${topic.id}.ts`);
    if (dry) { console.log(`would write ${topic.id}.ts (${topic.levels.join(",")})`); n++; continue; }
    writeFileSync(dest, serializeTopic(topic), "utf8");
    n++;
  }
  console.log(`${dry ? "planned" : "wrote"} ${n} topic modules → ${OUT}`);
}

main();
```

> Note: `import.meta.dir` is Bun-specific and the driver runs under `bun`. The pure logic (map/serialize/parse) is already covered by Vitest in Tasks 2–4; this driver is I/O glue and is exercised by running it.

- [ ] **Step 2: Dry-run to verify wiring**

Run: `bun scripts/grammar-import/run.ts --dry`
Expected: `planned 122 topic modules → …/data/grammar` (122 lines of `would write …`).

- [ ] **Step 3: Generate the files**

Run: `bun scripts/grammar-import/run.ts`
Expected: `wrote 122 topic modules → …/data/grammar`.

- [ ] **Step 4: Typecheck the generated corpus compiles**

Run: `bun run test scripts/grammar-import/map.test.ts` (sanity; full corpus test arrives in Task 6).
Then: `npx tsc --noEmit -p tsconfig.json 2>&1 | head -20`
Expected: no errors referencing `data/grammar/*.ts`.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/grammar-import/run.ts "site/src/english/data/grammar/"
git commit -m "feat(english): import 122 grammar topic skeletons from steep (RU verbatim)"
```

---

### Task 6: Barrel + families + corpus test

**Files:**
- Create: `site/src/english/data/grammar/index.ts`
- Create: `site/src/english/data/grammar/families.ts`
- Test: `site/src/english/data/grammar/corpus.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/data/grammar/corpus.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { grammarTopics, grammarById } from "./index";
import { FAMILIES } from "./families";
import { validateGrammarTopic } from "~/english/grammar-types";

describe("grammar corpus", () => {
  it("loads at least 122 topics", () => {
    expect(grammarTopics.length).toBeGreaterThanOrEqual(122);
  });
  it("has unique ids and a matching byId map", () => {
    const ids = grammarTopics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(grammarById.get("present-simple")?.id).toBe("present-simple");
  });
  it("every topic is structurally valid", () => {
    const broken = grammarTopics
      .map((t) => ({ id: t.id, errs: validateGrammarTopic(t) }))
      .filter((r) => r.errs.length > 0);
    expect(broken).toEqual([]);
  });
  it("every topic family is a known family (incl. the import sentinel)", () => {
    const known = new Set<string>([...FAMILIES.map((f) => f.id), "unclassified"]);
    const bad = grammarTopics.filter((t) => !known.has(t.family));
    expect(bad.map((t) => t.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/english/data/grammar/corpus.test.ts`
Expected: FAIL — `Cannot find module './index'` (and `./families`).

- [ ] **Step 3: Write `families.ts`**

Create `site/src/english/data/grammar/families.ts`:

```ts
import type { Bi } from "~/english/types";
import type { GrammarFamily } from "~/english/grammar-types";

export type FamilyMeta = { id: Exclude<GrammarFamily, "unclassified">; title: Bi };

// Display order for the Atlas (Phase 5). "unclassified" is intentionally excluded —
// it is an import sentinel that must be gone after the authoring pass (Task 8).
export const FAMILIES: FamilyMeta[] = [
  { id: "tenses", title: { en: "Tenses", ru: "Времена" } },
  { id: "aspect", title: { en: "Aspect", ru: "Вид" } },
  { id: "modals", title: { en: "Modals", ru: "Модальные глаголы" } },
  { id: "conditionals", title: { en: "Conditionals", ru: "Условные" } },
  { id: "passive", title: { en: "Passive", ru: "Пассив" } },
  { id: "articles", title: { en: "Articles", ru: "Артикли" } },
  { id: "nouns", title: { en: "Nouns", ru: "Существительные" } },
  { id: "pronouns", title: { en: "Pronouns", ru: "Местоимения" } },
  { id: "adjectives", title: { en: "Adjectives", ru: "Прилагательные" } },
  { id: "adverbs", title: { en: "Adverbs", ru: "Наречия" } },
  { id: "prepositions", title: { en: "Prepositions", ru: "Предлоги" } },
  { id: "relative-clauses", title: { en: "Relative clauses", ru: "Относительные придаточные" } },
  { id: "reported-speech", title: { en: "Reported speech", ru: "Косвенная речь" } },
  { id: "questions", title: { en: "Questions", ru: "Вопросы" } },
  { id: "verb-patterns", title: { en: "Verb patterns", ru: "Глагольные модели" } },
  { id: "phrasal-verbs", title: { en: "Phrasal verbs", ru: "Фразовые глаголы" } },
  { id: "conjunctions", title: { en: "Conjunctions", ru: "Союзы" } },
  { id: "word-order", title: { en: "Word order", ru: "Порядок слов" } },
  { id: "discourse", title: { en: "Discourse", ru: "Дискурс" } },
];
```

- [ ] **Step 4: Write the barrel `index.ts`**

Create `site/src/english/data/grammar/index.ts`:

```ts
// Barrel over per-topic modules. Vite's import.meta.glob (eager) loads them so
// new topic files are picked up without editing this file.
import type { GrammarTopic } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";

const mods = import.meta.glob<{ topic: GrammarTopic }>("./*.ts", { eager: true });

export const grammarTopics: GrammarTopic[] = Object.entries(mods)
  .filter(([p]) => !/\/(index|families)\.ts$/.test(p) && !p.includes(".test."))
  .map(([, m]) => m.topic)
  .filter(Boolean)
  .sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr) || a.id.localeCompare(b.id));

export const grammarById: Map<string, GrammarTopic> = new Map(
  grammarTopics.map((t) => [t.id, t]),
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test src/english/data/grammar/corpus.test.ts`
Expected: PASS (≥122 topics, all structurally valid, families known).

- [ ] **Step 6: Commit**

```bash
git add site/src/english/data/grammar/index.ts site/src/english/data/grammar/families.ts site/src/english/data/grammar/corpus.test.ts
git commit -m "feat(english): grammar corpus barrel + family registry + corpus test"
```

---

### Task 7: RU-verbatim guard test

**Files:**
- Test: `site/scripts/grammar-import/verbatim.test.ts`

- [ ] **Step 1: Write the test**

Create `site/scripts/grammar-import/verbatim.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mapSteepTopic, kebab, type SteepTopic } from "./map";

const SRC = process.env.STEEP_GRAMMAR_DIR
  ?? "/Users/artemmac/dev/personal/steep/grammar/explanations/data";

// A handful of representative topics across bands.
const SAMPLE = ["present_simple", "third_conditional", "article_with_proper_nouns", "inversion"];

describe("RU prose is preserved verbatim from steep", () => {
  it.skipIf(!existsSync(SRC))("matches committed corpus RU explain/tip for samples", async () => {
    for (const topicId of SAMPLE) {
      const file = join(SRC, `${topicId}.json`);
      if (!existsSync(file)) continue;
      const raw = JSON.parse(readFileSync(file, "utf8")) as SteepTopic;
      const mapped = mapSteepTopic(raw);
      // Relative (not `~`): vitest can't resolve a `~`-aliased dynamic import
      // with an interpolated segment — no static base to glob against.
      const committed = (await import(`../../src/english/data/grammar/${kebab(topicId)}.ts`)).topic;
      for (const lv of mapped.levels) {
        expect(committed.lessons[lv].explain.ru).toBe(mapped.lessons[lv]!.explain.ru);
        expect(committed.lessons[lv].tip.ru).toBe(mapped.lessons[lv]!.tip.ru);
      }
    }
  });
});
```

> `it.skipIf(!existsSync(SRC))` keeps CI green on machines without the steep
> checkout (the donor repo is not vendored). On the authoring machine it runs and
> guards against RU drift introduced by the Task 8 authoring pass.

- [ ] **Step 2: Run the test**

Run: `bun run test scripts/grammar-import/verbatim.test.ts`
Expected: PASS (runs locally where steep exists; skips otherwise).

- [ ] **Step 3: Commit**

```bash
git add site/scripts/grammar-import/verbatim.test.ts
git commit -m "test(english): RU-verbatim guard for grammar corpus"
```

---

### Task 8: Authoring pass — EN prose + taxonomy (Workflow)

> This task fills the fields the deterministic mapper left empty: `title.en`,
> `lessons[*].explain.en`, `structure.{en,ru}`, example `note`s, `pitfalls`,
> and the taxonomy (`family`, `egp`, `archetype` + `archetypeParams`, `related`,
> `crossTopic`). RU prose is **never touched** (Task 7 guards this). It is content
> authoring, not TDD — the gate is `authoringErrors` returning empty for all topics.

**Files:**
- Modify: `site/src/english/data/grammar/<id>.ts` (×122, in-place field fill)
- Create: `site/scripts/grammar-import/apply-authoring.ts`
- Create: `site/scripts/grammar-import/authoring-gate.test.ts`

- [ ] **Step 1: Write the authoring gate test FIRST (red)**

Create `site/scripts/grammar-import/authoring-gate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { grammarTopics } from "~/english/data/grammar/index";
import { authoringErrors } from "~/english/grammar-types";

describe("grammar corpus is fully authored", () => {
  it("no topic has authoring gaps (en prose, family, archetype)", () => {
    const gaps = grammarTopics
      .map((t) => ({ id: t.id, errs: authoringErrors(t) }))
      .filter((r) => r.errs.length > 0);
    expect(gaps).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to confirm it fails (corpus still skeletons)**

Run: `bun run test scripts/grammar-import/authoring-gate.test.ts`
Expected: FAIL — many topics report `family is unclassified`, `title.en is empty`, etc.

- [ ] **Step 3: Author via Workflow**

Run a `Workflow` that pipelines the 122 topics in batches. Per topic, a subagent
receives the topic's RU lessons + examples and returns a structured patch
(`StructuredOutput` schema below), which `apply-authoring.ts` merges into the
topic file — editing ONLY the empty fields, never RU prose.

Per-topic StructuredOutput schema (one object):

```jsonc
{
  "id": "present-simple",
  "title_en": "Present Simple",
  "family": "tenses",                 // one of the FAMILIES ids (never "unclassified")
  "archetype": "timeline",            // an archetype key (Phase 4 vocabulary)
  "archetypeParams": { "labels": ["habit", "fact"] },
  "egp": ["EGP:1.1", "EGP:1.2"],      // best-effort EGP ids; refined in Phase 2
  "related": ["present-continuous", "past-simple"],
  "crossTopic": ["adverbs-of-frequency", "zero-article"],
  "levels": {
    "A1": {
      "explain_en": "Use the present simple for habits, routines, and facts.",
      "structure_en": "subject + base verb (+ -s for he/she/it)",
      "structure_ru": "подлежащее + глагол (для he/she/it + -s)",
      "example_notes": { "0": { "en": "habit", "ru": "привычка" } },
      "pitfalls": [
        { "wrong": "She work here.", "right": "She works here.", "why_en": "3rd-person -s.", "why_ru": "Окончание -s в 3-м лице." }
      ]
    }
  }
}
```

Authoring subagent brief (critical guardrails):
- You are localizing/teaching, not rewriting. Output ONLY the schema above.
- Never emit harness/tool tags or markdown fences in any string field.
- `family` MUST be one of: tenses, aspect, modals, conditionals, passive,
  articles, nouns, pronouns, adjectives, adverbs, prepositions,
  relative-clauses, reported-speech, questions, verb-patterns, phrasal-verbs,
  conjunctions, word-order, discourse.
- `related`/`crossTopic` MUST be existing topic ids (kebab) from the provided id list.
- EN prose targets the lesson's CEFR level; keep it concise and correct.

`apply-authoring.ts` behavior: load each patch, load the matching topic JSON
(read the committed module's `topic` export), set ONLY the empty fields
(`title.en`, per-level `explain.en`/`structure`/example notes/pitfalls, taxonomy),
drop invalid `related`/`crossTopic` ids (keep only those present in `grammarById`),
leave an unknown `family` as `"unclassified"` (so the gate fails loudly rather
than silently miscategorizing), then re-emit via `serializeTopic`.

- [ ] **Step 4: Run the authoring gate to verify it passes**

Run: `bun run test scripts/grammar-import/authoring-gate.test.ts`
Expected: PASS — `gaps` is `[]`.

- [ ] **Step 5: Re-run the verbatim guard (RU untouched)**

Run: `bun run test scripts/grammar-import/verbatim.test.ts`
Expected: PASS (authoring must not have changed RU prose).

- [ ] **Step 6: Commit**

```bash
git add "site/src/english/data/grammar/" site/scripts/grammar-import/authoring-gate.test.ts site/scripts/grammar-import/apply-authoring.ts
git commit -m "content(english): author EN prose + taxonomy for 122 grammar topics"
```

---

### Task 9: Full suite + build green

**Files:** none (verification only)

- [ ] **Step 1: Run the whole English test suite**

Run: `bun run test src/english scripts/grammar-import`
Expected: PASS — types, parser, mapper, serializer, corpus, verbatim, authoring-gate all green.

- [ ] **Step 2: Run the production build**

Run: `bun run build`
Expected: build completes; lint report clean. The corpus modules compile (they
are not yet rendered — UI is Phase 5 — so no new pages, but TS must compile).

- [ ] **Step 3: Commit any build-surfaced fixes**

```bash
git add -A
git commit -m "chore(english): grammar corpus — suite + build green"
```

---

## Self-Review

**Spec coverage (Phase 1 = spec §4 + the typed half of §5):**
- §4.1 data model → Task 1 (types) ✓
- §4.2 storage/barrel/families → Tasks 5, 6 ✓
- §4.3 import pipeline (deterministic map + verbatim guard + LLM authoring) → Tasks 2–5, 7, 8 ✓
- §5 generative types declared (data deferred to Phase 3) → Task 1 (`TopicGenSpec`/`Pool`/`Template` typed, `gen` optional) ✓
- Modules 2 (coverage), 3 (engine logic), 4 (animations), UI, BYOK, design-prompt → **out of scope**, separate phase plans (spec §12 phases 2–7).

**Placeholder scan:** every code step has complete code. Task 8 is content authoring (not code) and specifies an exact StructuredOutput schema + merge behavior + a red/green gate test — no "TODO".

**Type consistency:** `validateGrammarTopic` (structural) and `authoringErrors` (completeness) defined in Task 1, used in Tasks 3, 6, 8. `kebab`, `mapSteepTopic`, `SteepTopic` defined in Task 3, reused in Tasks 4, 5, 7, 8. `serializeTopic` defined in Task 4, reused in Tasks 5, 8. `GrammarFamily` includes the `"unclassified"` sentinel (Task 1) which Task 6's corpus test allows and Task 8's authoring gate forbids — intentional, sequenced.

**Note for executor:** `gen` data and `egp` refinement are intentionally NOT completed here. The `egp` tags authored in Task 8 are best-effort seeds; Phase 2 (coverage audit) reconciles them against the real EGP inventory.
