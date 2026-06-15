# English Grammar Engine — Scale to All Topics (Phase 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every one of the 122 grammar topics generatively practiceable — ≥100 unique, offline-re-derivable exercises per topic — gated in the build, with a validated BYOK live layer on top.

**Architecture:** Phase 3a shipped the engine core (`site/src/english/practice-engine/`) and 3 token-pool pilots. Phase 3b adds the **second generative mechanism** the remaining ~119 topics need — *tagged-context pools*, where each authored context sentence carries its own correct answer + distractors, so selection-type grammar (articles, prepositions, modals, relative pronouns, …) is generative without a per-phenomenon morphology function while keeping the **"answers re-derive offline, never runtime-LLM"** invariant. Volume to ≥100/topic comes from native generation (combinatorial pools for morphology topics; ≥50 distinct context stems × 2 framings for selection topics) optionally enriched at runtime by cross-topic composites. A new `audit:grammar --gate` enforces the floor and reads committed offline LLM-judge verdicts. A BYOK `live.ts` runner proposes extra items through a structural validator before any are shown.

**Tech Stack:** TypeScript, Vitest (`bun run test`), bun CLI scripts, Zod, existing `practice-engine/` modules, Workflow tool (batched) for content authoring.

**Branch:** `feat/english-grammar-system` (already checked out, NOT pushed — user pushes manually).

**Locked invariant (do not violate):** an exercise's correctness must be reproducible offline. Token-pool templates compute the answer via a named `deriveKey` strategy. Tagged-context templates read the authored answer that travels with the context. The BYOK layer may *propose* but every shown item passes a structural validator first. No serve-time LLM call ever decides correctness.

**Test runner:** `bun run test` (= `vitest run`), NOT `bun test`. Vitest include covers `src/**/*.test.ts(x)` + `scripts/**/*.test.ts`; alias `~` → `site/src`. All `bun scripts/...` CLI entrypoints must avoid importing the Vite corpus barrel (`src/english/data/grammar/index.ts` uses `import.meta.glob`, which throws under plain bun) — load topic modules by `readdirSync` + dynamic `import()` instead (see existing `verify-grammar.ts` / `apply-gen.ts`).

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `site/src/english/grammar-types.ts` | corpus model | **modify** — add `TaggedContext`, `ContextFraming`; extend `TopicGenSpec.contexts?`, `Template.usesContext?`/`framings?` |
| `site/src/english/practice-engine/types.ts` | engine output/derive contract | unchanged (re-read for context) |
| `site/src/english/practice-engine/fill.ts` | render one exercise from a template | **modify** — add `fillContext()`; export both |
| `site/src/english/practice-engine/derive.ts` | named answer strategies | **modify** — add plural/negative/question/possessive strategies |
| `site/src/english/practice-engine/morphology.ts` | inflection helpers | **modify** — add `negate()`, `questionAux()`, `possessive()` (port steep transforms) |
| `site/src/english/practice-engine/generate.ts` | orchestrate generation | **modify** — route context templates; add `generateTopicSet()` (native + composites → ≥100) |
| `site/src/english/practice-engine/validate.ts` | re-derive gate | **modify** — handle context templates + add `validateProposed()` for BYOK |
| `site/src/english/practice-engine/live.ts` | BYOK validated runner | **create** — `proposeLiveExercises()` with injected proposer |
| `site/src/english/practice-engine/index.ts` | barrel | **modify** — export `live`, `generateTopicSet` |
| `site/scripts/grammar-gen/gen-specs/*.json` | per-topic gen specs | **create** — 119 new specs (Workflow-authored) |
| `site/scripts/grammar-gen/audit-grammar.ts` | ≥100/validate/verdict gate | **create** + `.test.ts` |
| `site/scripts/grammar-gen/judge-verdicts.ts` | read/shape committed LLM verdicts | **create** + `.test.ts` |
| `site/src/english/data/grammar/grammar-judge-verdicts.json` | committed offline judge verdicts | **create** (Workflow-authored) |
| `site/package.json` | scripts | **modify** — add `audit:grammar` |

---

## Mechanism decision table (authors apply in Task 9)

| Family | Mechanism | deriveKey / framing |
|--------|-----------|---------------------|
| tenses, aspect | token pool (subject×verb) | `verb-agreement-present`, `past-simple-form`, `present-participle-form` |
| passive | token pool | `passive-be-participle` |
| adjectives (comparative/superlative) | token pool (adj) | `comparative-form`, `superlative-form` |
| nouns (plural) | token pool (noun) | `noun-plural-form` (new) |
| questions, negation | token pool (subject×verb) | `question-aux-present/past`, `negative-present/past` (new) |
| modals, conditionals, articles, prepositions, pronouns, relative-clauses, reported-speech, conjunctions, word-order, discourse, verb-patterns, phrasal-verbs | **tagged-context pool** | `context` framing `["cloze","mc"]` |

A topic may mix: a token-pool template *and* a tagged-context template are both allowed in one spec.

---

### Task 1: Schema — tagged-context types

**Files:**
- Modify: `site/src/english/grammar-types.ts`
- Test: `site/src/english/grammar-types.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```ts
// site/src/english/grammar-types.test.ts  (append; create file with imports if it does not exist)
import { describe, it, expect } from "vitest";
import type { TopicGenSpec, Template, TaggedContext } from "./grammar-types";

describe("tagged-context schema", () => {
  it("a TopicGenSpec accepts a contexts array and a usesContext template", () => {
    const ctx: TaggedContext = {
      stem: "I bought ___ apple at the market.",
      answer: "an",
      distractors: ["a", "the", "—"],
      cefr: "A1",
    };
    const tpl: Template = {
      id: "art-ctx",
      type: "fill_in_blank",
      cefrMin: "A1",
      cefrMax: "A2",
      pattern: "{context}",
      slots: {},
      deriveKey: "context",
      usesContext: true,
      framings: ["cloze", "mc"],
      rationale: { en: "Choose the article that fits.", ru: "Выберите подходящий артикль." },
    };
    const spec: TopicGenSpec = { pools: [], templates: [tpl], features: [], contexts: [ctx] };
    expect(spec.contexts?.[0].answer).toBe("an");
    expect(spec.templates[0].framings).toEqual(["cloze", "mc"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/grammar-types.test.ts`
Expected: FAIL — `TaggedContext` not exported / `usesContext` and `framings` not on `Template` / `contexts` not on `TopicGenSpec`.

- [ ] **Step 3: Implement the schema additions**

In `site/src/english/grammar-types.ts`, after the `Register` type and before `export type Pool`, add:

```ts
export type ContextFraming = "cloze" | "mc";
/** A selection-grammar item whose correct answer is authored alongside the context.
 *  Re-derivation is a pure lookup of this committed data — fully offline. */
export type TaggedContext = {
  stem: string;            // sentence with exactly one ___ blank
  answer: string;          // correct filler
  alts?: string[];         // other accepted fillers
  distractors?: string[];  // wrong options (used to build MC framing)
  cefr?: Cefr;
};
```

Extend `Template` (add the two optional fields, keep the rest):

```ts
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
  usesContext?: boolean;       // when true, the engine pulls from TopicGenSpec.contexts
  framings?: ContextFraming[]; // which surfaces to emit for a context template
};
```

Extend `TopicGenSpec`:

```ts
export type TopicGenSpec = {
  pools: Pool[];
  templates: Template[];
  features: string[];
  contexts?: TaggedContext[]; // tagged-context items for selection-grammar topics
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/grammar-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/grammar-types.ts site/src/english/grammar-types.test.ts
git commit -m "feat(english): tagged-context schema for selection-grammar gen specs"
```

---

### Task 2: Morphology — negate / questionAux / possessive

**Files:**
- Modify: `site/src/english/practice-engine/morphology.ts`
- Test: `site/src/english/practice-engine/morphology.test.ts`

- [ ] **Step 1: Write the failing test** (append to existing `morphology.test.ts`)

```ts
import { negate, questionAux, possessive } from "./morphology";

describe("negate", () => {
  it("present uses don't/doesn't by subject; past uses didn't", () => {
    expect(negate("work", "present", "She")).toBe("doesn't work");
    expect(negate("work", "present", "They")).toBe("don't work");
    expect(negate("go", "past", "He")).toBe("didn't go");
  });
});

describe("questionAux", () => {
  it("returns Do/Does/Did by tense and subject", () => {
    expect(questionAux("present", "She")).toBe("Does");
    expect(questionAux("present", "They")).toBe("Do");
    expect(questionAux("past", "I")).toBe("Did");
  });
});

describe("possessive", () => {
  it("adds 's, or bare ' after a final s", () => {
    expect(possessive("dog")).toBe("dog's");
    expect(possessive("James")).toBe("James'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/practice-engine/morphology.test.ts`
Expected: FAIL — `negate`/`questionAux`/`possessive` not exported.

- [ ] **Step 3: Implement** (append to `morphology.ts`; reuse existing `verbForm`)

```ts
// --- selection helpers (ported from steep transforms.ts) ---
function is3sgSubject(subject: string): boolean {
  const s = subject.trim().toLowerCase();
  if (/^(i|you|we|they)\b/.test(s)) return false;
  if (/^(my parents|the students|the children|the teachers)\b/.test(s)) return false;
  return !/s$/.test(s); // a singular noun phrase is 3sg unless plural-marked
}

export function negate(lemma: string, tense: "present" | "past", subject: string): string {
  const base = verbForm(lemma, "base");
  if (tense === "past") return `didn't ${base}`;
  return is3sgSubject(subject) ? `doesn't ${base}` : `don't ${base}`;
}

export function questionAux(tense: "present" | "past", subject: string): string {
  if (tense === "past") return "Did";
  return is3sgSubject(subject) ? "Does" : "Do";
}

export function possessive(noun: string): string {
  const w = noun.trim();
  if (w.length === 0) return "'s";
  return w.slice(-1).toLowerCase() === "s" ? `${w}'` : `${w}'s`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/practice-engine/morphology.test.ts`
Expected: PASS (all prior morphology tests still green).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/practice-engine/morphology.ts site/src/english/practice-engine/morphology.test.ts
git commit -m "feat(english): morphology negate/questionAux/possessive helpers"
```

---

### Task 3: DERIVE registry — plural / negative / question / possessive strategies

**Files:**
- Modify: `site/src/english/practice-engine/derive.ts`
- Test: `site/src/english/practice-engine/derive.test.ts`

- [ ] **Step 1: Write the failing test** (append)

```ts
import { getStrategy } from "./derive";

describe("DERIVE — new strategies", () => {
  it("noun-plural-form", () => {
    expect(getStrategy("noun-plural-form")({ slots: { noun: "city" }, raw: { noun: "city" }, level: "A1" }).primary).toBe("cities");
  });
  it("negative-present by subject", () => {
    expect(getStrategy("negative-present")({ slots: { subj: "She", verb: "work" }, raw: { subj: "She", verb: "work" }, level: "A2" }).primary).toBe("doesn't work");
  });
  it("question-aux-past", () => {
    expect(getStrategy("question-aux-past")({ slots: { subj: "They", verb: "go" }, raw: { subj: "They", verb: "go" }, level: "A2" }).primary).toBe("Did");
  });
  it("possessive-s", () => {
    expect(getStrategy("possessive-s")({ slots: { noun: "dog" }, raw: { noun: "dog" }, level: "A1" }).primary).toBe("dog's");
  });
  it("context strategy is a no-op placeholder (engine overrides via fillContext)", () => {
    expect(getStrategy("context")({ slots: {}, raw: {}, level: "A1" }).primary).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/practice-engine/derive.test.ts`
Expected: FAIL — unknown deriveKey strategies.

- [ ] **Step 3: Implement** (extend the `DERIVE` map in `derive.ts`; import the new helpers)

Change the import line to:
```ts
import { verbForm, adjForm, nounPlural, negate, questionAux, possessive } from "./morphology";
```
Add these entries to the `DERIVE` object:
```ts
  "noun-plural-form": ({ slots }) => ({ primary: nounPlural(slots.noun), alternates: [] }),
  "negative-present": ({ slots }) => ({ primary: negate(slots.verb, "present", slots.subj), alternates: [] }),
  "negative-past": ({ slots }) => ({ primary: negate(slots.verb, "past", slots.subj), alternates: [] }),
  "question-aux-present": ({ slots }) => ({ primary: questionAux("present", slots.subj), alternates: [] }),
  "question-aux-past": ({ slots }) => ({ primary: questionAux("past", slots.subj), alternates: [] }),
  "possessive-s": ({ slots }) => ({ primary: possessive(slots.noun), alternates: [] }),
  // Sentinel: tagged-context templates carry the answer with the context; fillContext
  // supplies it directly. This keeps getStrategy total so validate.ts never throws.
  "context": () => ({ primary: "", alternates: [] }),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/practice-engine/derive.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/practice-engine/derive.ts site/src/english/practice-engine/derive.test.ts
git commit -m "feat(english): DERIVE plural/negative/question/possessive + context sentinel"
```

---

### Task 4: fill.ts — fillContext()

**Files:**
- Modify: `site/src/english/practice-engine/fill.ts`
- Test: `site/src/english/practice-engine/fill.test.ts`

- [ ] **Step 1: Write the failing test** (append)

```ts
import { fillContext } from "./fill";
import type { Template, TaggedContext } from "~/english/grammar-types";

const ctxTpl: Template = {
  id: "art", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A2",
  pattern: "{context}", slots: {}, deriveKey: "context",
  usesContext: true, framings: ["cloze", "mc"],
  rationale: { en: "Article before {answer}.", ru: "Артикль перед {answer}." },
};
const ctxs: TaggedContext[] = [
  { stem: "I saw ___ owl.", answer: "an", distractors: ["a", "the"], cefr: "A1" },
  { stem: "She is ___ engineer.", answer: "an", distractors: ["a", "the"], cefr: "A1" },
];

describe("fillContext", () => {
  it("cloze framing: prompt is the stem, answer is the authored answer", () => {
    const ex = fillContext(ctxTpl, ctxs, "cloze", "A2", 0);
    expect(ex.type).toBe("fill_in_blank");
    expect(ex.prompt).toMatch(/___/);
    expect(ex.answer === "an").toBe(true);
    expect(ex.rationale.en).toContain("an"); // {answer} interpolated
  });
  it("mc framing: options include the answer and all distractors", () => {
    const ex = fillContext(ctxTpl, ctxs, "mc", "A2", 1);
    expect(ex.type).toBe("multiple_choice");
    expect(ex.options).toBeDefined();
    expect(ex.options!).toContain(ex.answer);
    expect(ex.options!.length).toBeGreaterThanOrEqual(2);
  });
  it("is deterministic for a fixed seed", () => {
    expect(fillContext(ctxTpl, ctxs, "cloze", "A2", 5)).toEqual(fillContext(ctxTpl, ctxs, "cloze", "A2", 5));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/practice-engine/fill.test.ts`
Expected: FAIL — `fillContext` not exported.

- [ ] **Step 3: Implement** (append to `fill.ts`; reuse `createRng`/`pickIndex`)

```ts
import type { ContextFraming, TaggedContext } from "~/english/grammar-types";

/** Deterministic seeded shuffle (Fisher–Yates over a copy). */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = pickIndex(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Render one exercise from a tagged-context template. The answer travels with the
 *  context (authored), so this is fully offline and reproducible. */
export function fillContext(
  tpl: Template,
  contexts: TaggedContext[],
  framing: ContextFraming,
  level: Cefr,
  seed: number,
): GeneratedExercise {
  if (contexts.length === 0) throw new Error(`fillContext: no contexts for template ${tpl.id}`);
  const rng = createRng(seed);
  const ctx = contexts[pickIndex(contexts.length, rng)];
  const answer = ctx.answer;
  const interp = (s: string): string => s.replace(/\{answer\}/g, answer);
  const base = {
    id: `${tpl.id}:${framing}:${seed}`,
    topicId: "",
    cefr: ctx.cefr ?? level,
    prompt: ctx.stem,
    answer,
    alts: ctx.alts ?? [],
    rationale: { en: interp(tpl.rationale.en), ru: interp(tpl.rationale.ru) },
  };
  if (framing === "mc") {
    const options = shuffle([answer, ...(ctx.distractors ?? [])], rng);
    return { ...base, type: "multiple_choice", options };
  }
  return { ...base, type: "fill_in_blank" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/practice-engine/fill.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/practice-engine/fill.ts site/src/english/practice-engine/fill.test.ts
git commit -m "feat(english): fillContext — cloze + MC framing for tagged contexts"
```

---

### Task 5: generate.ts — route context templates + generateTopicSet()

**Files:**
- Modify: `site/src/english/practice-engine/generate.ts`
- Test: `site/src/english/practice-engine/generate.test.ts`

> Read `cross-topic.ts` first to confirm the real `composite` signature before writing `generateTopicSet`; the supplier below assumes `composite(focus, peer, { count, seed }) => GeneratedExercise[]`. Adapt to the actual export, keeping the contract: return composite items whose `topicId` is the focus topic.

- [ ] **Step 1: Write the failing test** (append)

```ts
import { generateFromSpec, generateSetFromSpec } from "./generate";
import type { TopicGenSpec } from "~/english/grammar-types";

const selSpec: TopicGenSpec = {
  pools: [], features: [],
  contexts: Array.from({ length: 30 }, (_, i) => ({
    stem: `Context number ${i} needs ___ here.`,
    answer: i % 2 === 0 ? "an" : "a",
    distractors: ["the", "—"],
    cefr: "A1" as const,
  })),
  templates: [{
    id: "sel", type: "fill_in_blank", cefrMin: "A1", cefrMax: "B2",
    pattern: "{context}", slots: {}, deriveKey: "context",
    usesContext: true, framings: ["cloze", "mc"],
    rationale: { en: "Pick {answer}.", ru: "Выберите {answer}." },
  }],
};

describe("context generation", () => {
  it("30 stems x 2 framings yields >=60 unique items", () => {
    const out = generateFromSpec("articles", selSpec, { count: 100, seed: 1 });
    expect(out.length).toBeGreaterThanOrEqual(60);
    const keys = new Set(out.map((e) => `${e.type}|${e.prompt}`));
    expect(keys.size).toBe(out.length); // all unique
  });
});

describe("generateSetFromSpec", () => {
  it("reaches the requested count using composites when native is short", () => {
    const composites = Array.from({ length: 50 }, (_, i) => ({
      id: `comp:${i}`, topicId: "articles", cefr: "A2" as const,
      type: "fill_in_blank" as const, prompt: `Composite ${i}: ___ thing.`,
      answer: "the", alts: [], rationale: { en: "x", ru: "x" },
    }));
    const out = generateSetFromSpec("articles", selSpec, { count: 100, seed: 1 }, () => composites);
    expect(out.length).toBeGreaterThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/practice-engine/generate.test.ts`
Expected: FAIL — context templates not routed (low/zero output) and `generateSetFromSpec` not exported.

- [ ] **Step 3: Implement**

In `generate.ts`, import `fillContext` and rewrite `generateFromSpec` to route context templates, then add `generateSetFromSpec` + `generateTopicSet`. Replace the file body with:

```ts
import type { Cefr, ExerciseType, GrammarTopic, TopicGenSpec } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { grammarById } from "~/english/data/grammar/index";
import type { GeneratedExercise } from "./types";
import { fillTemplate, fillContext } from "./fill";
import { BatchDedup } from "./dedup";
import { composite } from "./cross-topic";

export type GenerateOpts = { level?: Cefr; types?: ExerciseType[]; count: number; seed: number };

const inBand = (min: Cefr, max: Cefr, lv: Cefr): boolean =>
  cefrIndex(lv) >= cefrIndex(min) && cefrIndex(lv) <= cefrIndex(max);

export function generateFromSpec(topicId: string, spec: TopicGenSpec, opts: GenerateOpts): GeneratedExercise[] {
  const { count, seed } = opts;
  const level = opts.level;
  let templates = spec.templates;
  if (opts.types?.length) templates = templates.filter((t) => opts.types!.includes(t.type));
  if (level) templates = templates.filter((t) => inBand(t.cefrMin, t.cefrMax, level));
  if (templates.length === 0) return [];

  const dedup = new BatchDedup();
  const out: GeneratedExercise[] = [];
  const MAX_TRIES = count * 50;
  for (let i = 0; i < MAX_TRIES && out.length < count; i++) {
    const tpl = templates[i % templates.length];
    const lv = level ?? tpl.cefrMin;
    if (tpl.usesContext) {
      const framings = tpl.framings ?? ["cloze"];
      const framing = framings[i % framings.length];
      const ex = fillContext(tpl, spec.contexts ?? [], framing, lv, seed + i);
      if (!dedup.accept(`${ex.type}|${ex.prompt}`)) continue;
      out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${framing}:${seed + i}` });
    } else {
      const ex = fillTemplate(tpl, spec.pools, lv, seed + i);
      if (!dedup.accept(ex.prompt)) continue;
      out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${seed + i}` });
    }
  }
  return out;
}

/** Supplier of cross-topic composite items for a focus topic, used to top up volume. */
export type CompositeSupplier = (topicId: string, seed: number) => GeneratedExercise[];

/** Generate up to `count` unique items: native first, then composites if native is short. */
export function generateSetFromSpec(
  topicId: string,
  spec: TopicGenSpec,
  opts: GenerateOpts,
  composites?: CompositeSupplier,
): GeneratedExercise[] {
  const native = generateFromSpec(topicId, spec, opts);
  if (native.length >= opts.count || !composites) return native;
  const seen = new Set(native.map((e) => `${e.type}|${e.prompt}`));
  const out = native.slice();
  for (const ex of composites(topicId, opts.seed)) {
    if (out.length >= opts.count) break;
    const key = `${ex.type}|${ex.prompt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...ex, topicId });
  }
  return out;
}

/** Convenience: pull a topic's committed gen spec from the corpus. */
export function generate(topicId: string, opts: GenerateOpts): GeneratedExercise[] {
  const topic: GrammarTopic | undefined = grammarById.get(topicId);
  if (!topic?.gen) return [];
  return generateFromSpec(topicId, topic.gen, opts);
}

/** Corpus-backed: native gen for `topicId`, topped up with composites against its crossTopic siblings. */
export function generateTopicSet(topicId: string, opts: GenerateOpts): GeneratedExercise[] {
  const topic = grammarById.get(topicId);
  if (!topic?.gen) return [];
  const supplier: CompositeSupplier = (id, seed) => {
    const peers = topic.crossTopic ?? [];
    const acc: GeneratedExercise[] = [];
    for (let k = 0; k < peers.length && acc.length < opts.count; k++) {
      const peer = grammarById.get(peers[k]);
      if (!peer?.gen) continue;
      acc.push(...composite(topic, peer, { count: Math.ceil(opts.count / Math.max(1, peers.length)), seed: seed + k * 1000 }));
    }
    return acc;
  };
  return generateSetFromSpec(topicId, topic.gen, opts, supplier);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/practice-engine/generate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/practice-engine/generate.ts site/src/english/practice-engine/generate.test.ts
git commit -m "feat(english): route context templates + generateTopicSet (native + composites)"
```

---

### Task 6: validate.ts — context items + validateProposed()

**Files:**
- Modify: `site/src/english/practice-engine/validate.ts`
- Modify: `site/src/english/practice-engine/index.ts`
- Test: `site/src/english/practice-engine/validate.test.ts`

- [ ] **Step 1: Write the failing test** (append)

```ts
import { validateProposed } from "./validate";

describe("validateProposed (BYOK structural gate)", () => {
  it("accepts a well-formed fill item with a blank and an answer", () => {
    const r = validateProposed({ type: "fill_in_blank", prompt: "She ___ home.", answer: "goes", rationale: { en: "x", ru: "x" } });
    expect(r.ok).toBe(true);
  });
  it("rejects a fill item with no blank", () => {
    expect(validateProposed({ type: "fill_in_blank", prompt: "She goes home.", answer: "goes", rationale: { en: "x", ru: "x" } }).ok).toBe(false);
  });
  it("rejects an MC item whose options exclude the answer", () => {
    expect(validateProposed({ type: "multiple_choice", prompt: "She ___ home.", answer: "goes", options: ["go", "gone"], rationale: { en: "x", ru: "x" } }).ok).toBe(false);
  });
  it("rejects an empty answer", () => {
    expect(validateProposed({ type: "fill_in_blank", prompt: "She ___ home.", answer: "  ", rationale: { en: "x", ru: "x" } }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/practice-engine/validate.test.ts`
Expected: FAIL — `validateProposed` not exported.

- [ ] **Step 3: Implement**

Read the current `validate.ts` first. Add (and export) `validateProposed` + `ProposedItem` — structural checks only (no deriveKey re-run; proposed items have no template):

```ts
import type { ExerciseType } from "~/english/grammar-types";
import type { Bi } from "~/english/types";

export type ProposedItem = {
  type: ExerciseType;
  prompt: string;
  answer: string;
  options?: string[];
  alts?: string[];
  rationale: Bi;
};

const VALID_TYPES: ExerciseType[] = [
  "fill_in_blank", "multiple_choice", "error_correction", "sentence_transformation", "word_order",
];

/** Structural gate for BYOK-proposed items. Correctness of a free-form LLM item cannot be
 *  re-derived from a deriveKey, so we enforce the structural invariants we CAN check and
 *  never show an item that fails. */
export function validateProposed(item: ProposedItem): { ok: boolean; reason?: string } {
  if (!VALID_TYPES.includes(item.type)) return { ok: false, reason: "bad type" };
  if (!item.prompt?.trim()) return { ok: false, reason: "empty prompt" };
  if (!item.answer?.trim()) return { ok: false, reason: "empty answer" };
  if (!item.rationale?.en?.trim() || !item.rationale?.ru?.trim()) return { ok: false, reason: "missing rationale" };
  if (item.type === "fill_in_blank" && !item.prompt.includes("___")) return { ok: false, reason: "no blank" };
  if (item.type === "multiple_choice") {
    if (!item.options || item.options.length < 2) return { ok: false, reason: "too few options" };
    if (!item.options.includes(item.answer)) return { ok: false, reason: "answer not in options" };
  }
  return { ok: true };
}
```

Leave any existing `validateExercise(ex)` untouched — context items already carry a literal authored answer (no deriveKey on a `GeneratedExercise`), so they validate by construction. Only if `validateExercise` currently throws on context-derived items, add the minimal guard. Export `validateProposed` and `ProposedItem` from `index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/practice-engine/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/practice-engine/validate.ts site/src/english/practice-engine/index.ts site/src/english/practice-engine/validate.test.ts
git commit -m "feat(english): validateProposed structural gate for BYOK items"
```

---

### Task 7: BYOK live runner — live.ts

**Files:**
- Create: `site/src/english/practice-engine/live.ts`
- Modify: `site/src/english/practice-engine/index.ts`
- Test: `site/src/english/practice-engine/live.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/english/practice-engine/live.test.ts
import { describe, it, expect } from "vitest";
import { proposeLiveExercises } from "./live";
import type { GrammarTopic } from "~/english/grammar-types";

const topic = { id: "present-simple", title: { en: "Present simple", ru: "—" }, cefr: "A1" } as unknown as GrammarTopic;

describe("proposeLiveExercises", () => {
  it("returns only items that pass the structural validator", async () => {
    const proposer = async () => [
      { type: "fill_in_blank" as const, prompt: "She ___ home.", answer: "goes", rationale: { en: "x", ru: "y" } },
      { type: "fill_in_blank" as const, prompt: "no blank here", answer: "goes", rationale: { en: "x", ru: "y" } }, // invalid
    ];
    const out = await proposeLiveExercises(topic, proposer, 2);
    expect(out.length).toBe(1);
    expect(out[0].prompt).toContain("___");
    expect(out[0].topicId).toBe("present-simple");
  });

  it("never throws when the proposer rejects — returns []", async () => {
    const proposer = async () => { throw new Error("network"); };
    const out = await proposeLiveExercises(topic, proposer, 3);
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test src/english/practice-engine/live.test.ts`
Expected: FAIL — `live.ts` does not exist.

- [ ] **Step 3: Implement**

```ts
// site/src/english/practice-engine/live.ts
// BYOK live layer: an injected proposer (a user-keyed LLM in production, a mock in tests)
// suggests extra exercises; EVERY proposed item passes the structural validator before it
// is shown. The proposer never decides correctness — it only suggests.
import type { GrammarTopic } from "~/english/grammar-types";
import type { GeneratedExercise } from "./types";
import { validateProposed, type ProposedItem } from "./validate";

export type LiveProposer = (topic: GrammarTopic, n: number) => Promise<ProposedItem[]>;

export async function proposeLiveExercises(
  topic: GrammarTopic,
  proposer: LiveProposer,
  n: number,
): Promise<GeneratedExercise[]> {
  let raw: ProposedItem[];
  try {
    raw = await proposer(topic, n);
  } catch {
    return []; // a failing proposer must never break the session
  }
  const out: GeneratedExercise[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!validateProposed(item).ok) continue;
    out.push({
      id: `${topic.id}:live:${i}`,
      topicId: topic.id,
      cefr: topic.cefr ?? "B1",
      type: item.type,
      prompt: item.prompt,
      answer: item.answer,
      alts: item.alts ?? [],
      options: item.options,
      rationale: item.rationale,
    });
  }
  return out;
}
```

Export `proposeLiveExercises` and `LiveProposer` from `index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test src/english/practice-engine/live.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/practice-engine/live.ts site/src/english/practice-engine/index.ts site/src/english/practice-engine/live.test.ts
git commit -m "feat(english): BYOK live runner — proposer behind structural validator"
```

---

### Task 8: audit:grammar gate script

**Files:**
- Create: `site/scripts/grammar-gen/audit-grammar.ts`
- Create: `site/scripts/grammar-gen/judge-verdicts.ts`
- Test: `site/scripts/grammar-gen/audit-grammar.test.ts`
- Modify: `site/package.json` (add `"audit:grammar": "bun scripts/grammar-gen/audit-grammar.ts"`)

The gate runs against committed gen specs. Like `verify-grammar.ts`, it must NOT import the corpus barrel — load topic modules by `readdirSync` + dynamic `import()` and **inline** the generation logic (it cannot import `generate.ts`, which top-level-imports the barrel). The native generator measured by the gate must reach `TARGET` (100) WITHOUT composites — so selection topics need ≥50 distinct stems × 2 framings.

- [ ] **Step 1: Write the failing test**

```ts
// site/scripts/grammar-gen/audit-grammar.test.ts
import { describe, it, expect } from "vitest";
import { auditTopicGen, type GenAuditResult } from "./audit-grammar";
import type { TopicGenSpec } from "~/english/grammar-types";

const morphSpec: TopicGenSpec = {
  features: [], contexts: [],
  pools: [
    { id: "subj3", tags: { level: ["A1"] }, items: ["She", "He", "The teacher", "My brother", "Our manager"] },
    { id: "verbs", tags: { level: ["A1"] }, items: ["work", "play", "study", "teach", "go", "read", "fix", "run", "build", "ship"] },
  ],
  templates: [{
    id: "ps", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A2",
    pattern: "{subj} ___ ({verb}) every day.", slots: { subj: { pool: "subj3" }, verb: { pool: "verbs" } },
    deriveKey: "verb-agreement-present", rationale: { en: "3sg adds -s.", ru: "3 л. ед. ч. + -s." },
  }],
};

describe("auditTopicGen", () => {
  it("passes a morphology spec that yields >=100 unique with non-empty answers", () => {
    const r: GenAuditResult = auditTopicGen("present-simple", morphSpec);
    expect(r.unique).toBeGreaterThanOrEqual(100);
    expect(r.emptyAnswers).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("flags a context spec below the >=100 native floor", () => {
    const thin: TopicGenSpec = {
      pools: [], features: [],
      contexts: Array.from({ length: 5 }, (_, i) => ({ stem: `S${i} ___ x.`, answer: "a", distractors: ["the"], cefr: "A1" as const })),
      templates: [{ id: "c", type: "fill_in_blank", cefrMin: "A1", cefrMax: "B2", pattern: "{context}", slots: {}, deriveKey: "context", usesContext: true, framings: ["cloze", "mc"], rationale: { en: "x", ru: "y" } }],
    };
    const r = auditTopicGen("articles", thin);
    expect(r.ok).toBe(false);
    expect(r.unique).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test scripts/grammar-gen/audit-grammar.test.ts`
Expected: FAIL — module/exports do not exist.

- [ ] **Step 3: Implement**

`judge-verdicts.ts` — read + shape the committed verdict file (pure, testable):

```ts
// site/scripts/grammar-gen/judge-verdicts.ts
import { readFileSync, existsSync } from "node:fs";
export type TopicVerdict = { topicId: string; sampled: number; passed: number; failures: string[] };
export type VerdictFile = Record<string, TopicVerdict>;
export function loadVerdicts(path: string): VerdictFile {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as VerdictFile;
}
export function verdictPassRate(v: TopicVerdict): number {
  return v.sampled === 0 ? 0 : v.passed / v.sampled;
}
```

`audit-grammar.ts` — inline generation (no barrel), per-topic audit + CLI driver:

```ts
// site/scripts/grammar-gen/audit-grammar.ts
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic, TopicGenSpec, ContextFraming } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { fillTemplate, fillContext } from "~/english/practice-engine/fill";
import { BatchDedup } from "~/english/practice-engine/dedup";
import type { GeneratedExercise } from "~/english/practice-engine/types";
import { loadVerdicts, verdictPassRate } from "./judge-verdicts";

const TARGET = 100;
const STEM_FLOOR = 50;       // selection topics: distinct native context stems (×2 framings = 100)
const PASS_RATE_FLOOR = 0.9; // committed LLM-judge verdicts

export type GenAuditResult = {
  topicId: string; unique: number; distinctStems: number;
  emptyAnswers: number; isContext: boolean; ok: boolean; problems: string[];
};

/** Inline generation — mirrors generateFromSpec without importing the barrel. */
function gen(topicId: string, spec: TopicGenSpec, count: number, seed: number): GeneratedExercise[] {
  const templates = spec.templates.filter((t) => cefrIndex(t.cefrMax) >= cefrIndex("A1"));
  if (templates.length === 0) return [];
  const dedup = new BatchDedup();
  const out: GeneratedExercise[] = [];
  const MAX = count * 50;
  for (let i = 0; i < MAX && out.length < count; i++) {
    const tpl = templates[i % templates.length];
    if (tpl.usesContext) {
      const framings: ContextFraming[] = tpl.framings ?? ["cloze"];
      const framing = framings[i % framings.length];
      const ex = fillContext(tpl, spec.contexts ?? [], framing, tpl.cefrMin, seed + i);
      if (!dedup.accept(`${ex.type}|${ex.prompt}`)) continue;
      out.push({ ...ex, topicId });
    } else {
      const ex = fillTemplate(tpl, spec.pools, tpl.cefrMin, seed + i);
      if (!dedup.accept(ex.prompt)) continue;
      out.push({ ...ex, topicId });
    }
  }
  return out;
}

export function auditTopicGen(topicId: string, spec: TopicGenSpec): GenAuditResult {
  const isContext = spec.templates.some((t) => t.usesContext);
  const items = gen(topicId, spec, TARGET, 1);
  const unique = new Set(items.map((e) => `${e.type}|${e.prompt}`)).size;
  const distinctStems = isContext ? new Set((spec.contexts ?? []).map((c) => c.stem)).size : Infinity;
  const emptyAnswers = items.filter((e) => !e.answer || !e.answer.trim()).length;
  const problems: string[] = [];
  if (unique < TARGET) problems.push(`only ${unique} unique (<${TARGET})`);
  if (isContext && distinctStems < STEM_FLOOR) problems.push(`only ${distinctStems} distinct stems (<${STEM_FLOOR})`);
  if (emptyAnswers > 0) problems.push(`${emptyAnswers} empty answers`);
  return { topicId, unique, distinctStems, emptyAnswers, isContext, ok: problems.length === 0, problems };
}

async function main(): Promise<void> {
  const grammarDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  const verdictPath = resolve(grammarDir, "grammar-judge-verdicts.json");
  const gate = process.argv.includes("--gate");
  const files = readdirSync(grammarDir).filter((f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."));
  const verdicts = loadVerdicts(verdictPath);
  const results: GenAuditResult[] = [];
  let withGen = 0;
  for (const f of files) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    if (!mod.topic.gen) continue;
    withGen++;
    const r = auditTopicGen(mod.topic.id, mod.topic.gen);
    const v = verdicts[mod.topic.id];
    if (!v) r.problems.push("no committed judge verdict");
    else if (verdictPassRate(v) < PASS_RATE_FLOOR) r.problems.push(`judge pass-rate ${(verdictPassRate(v) * 100).toFixed(0)}% (<${PASS_RATE_FLOOR * 100}%)`);
    r.ok = r.problems.length === 0;
    results.push(r);
  }
  const failing = results.filter((r) => !r.ok);
  console.log(`audit:grammar — ${withGen} gen topics, ${failing.length} failing`);
  for (const r of failing) console.error(`  x ${r.topicId}: ${r.problems.join("; ")}`);
  if (gate && failing.length) process.exit(1);
}

if (import.meta.main) main();
```

Add to `site/package.json` scripts: `"audit:grammar": "bun scripts/grammar-gen/audit-grammar.ts"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test scripts/grammar-gen/audit-grammar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/grammar-gen/audit-grammar.ts site/scripts/grammar-gen/judge-verdicts.ts site/scripts/grammar-gen/audit-grammar.test.ts site/package.json
git commit -m "feat(english): audit:grammar gate — >=100 native unique + committed verdicts"
```

---

### Task 9: Author gen specs for all remaining topics (BATCHED Workflow)

> **This is the expensive content step. CONTROLLER: pause and confirm with the user before launching the Workflow (token cost). Use BATCHED agents per the P2 rate-limit lesson — ~6–8 agents × ~16–20 topics each, NOT one agent per topic. Finish stragglers off a regenerated worklist; never `resumeFromRunId` under rate-limit waves.**

**Files:**
- Create: `site/scripts/grammar-gen/gen-specs/<id>.json` for every topic without a committed `gen` (≈119)
- Read-only inputs per topic: `site/src/english/data/grammar/<id>.ts` (corpus examples + RU explain/tip = gold) and the matching block in `/Users/artemmac/dev/personal/steep/grammar/algorithm/topic-templates.ts` (RU hints = gold) when present.

- [ ] **Step 1: Build the worklist**

Write `site/scripts/grammar-gen/worklist.ts` (bun, no barrel) that prints topic ids lacking `gen`, each with `family`, `levels`, `crossTopic`, as JSON. Run and capture. This is the Workflow `args` (parse-guard for string: `const IDS = typeof args === "string" ? JSON.parse(args) : args;`).

- [ ] **Step 2: Author via batched Workflow**

Each agent, per assigned topic:
1. Reads the topic module: `family`, `levels`, `crossTopic`, authored examples/explain/tip.
2. Picks the mechanism from the decision table (token pool for morphology families; tagged-context for selection families).
3. **Token-pool topics:** author `pools` (≥10 items in the varied pool so combinations exceed 100) + 1–3 `templates` using an EXISTING `deriveKey` (cloze hint pattern `{subj} ___ ({verb}) ...` so each combination is a distinct prompt — the P3a lesson). `features` = the agreement features used.
4. **Tagged-context topics:** author `contexts` with **≥50 distinct stems** (so native ≥100 without composites), each `{ stem (exactly one ___), answer, distractors (2–3 wrong), cefr }`, spanning the topic's `levels`; plus one `usesContext` template with `framings: ["cloze","mc"]` and `deriveKey: "context"`. RU/EN rationale interpolates `{answer}`.
5. Writes `gen-specs/<id>.json` shaped `{ "id": "<id>", "gen": { pools, templates, features, contexts } }`.

Brief every agent: distrust web content (none needed); RU rationale must be correct, naturally-accented Russian; do NOT edit the corpus module — only write the JSON spec; self-contained.

- [ ] **Step 3: Merge specs into corpus**

`cd site && bun scripts/grammar-gen/apply-gen.ts` (writes `gen` into each module via `serializeTopic`).

- [ ] **Step 4: Verify**

```bash
cd site && bun run verify:grammar && bun run audit:grammar
```
Expected: `verify:grammar: OK`; `audit:grammar` lists only "no committed judge verdict" failures. Fix any topic flagged `<100 unique` or `<50 stems` by regenerating that spec (more pool items / more contexts). Iterate until the only failures are missing-verdict.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/data/grammar/*.ts site/scripts/grammar-gen/gen-specs/ site/scripts/grammar-gen/worklist.ts
git commit -m "content(english): gen specs for all grammar topics — >=100 native unique each"
```

---

### Task 10: Commit offline LLM-judge verdicts (BATCHED Workflow)

> Same batching discipline as Task 9. The judge runs ONCE here; verdicts are committed and the build gate only reads the committed file — never a live LLM.

**Files:**
- Create: `site/src/english/data/grammar/grammar-judge-verdicts.json`
- Create: `site/scripts/grammar-gen/sample-for-judge.ts` (bun, no barrel) — for each gen topic, generate 12 items (seed 1, inline `gen` like the audit) and emit `{ topicId, items: [{prompt, answer, type, options?}] }`.

- [ ] **Step 1: Sample** — write + run `sample-for-judge.ts`; capture as Workflow `args`.

- [ ] **Step 2: Judge via batched Workflow** — each agent judges its assigned topics' items: is `answer` grammatically correct + natural for `prompt` (and for MC, exactly one option correct)? Return strict-schema `{ topicId, sampled, passed, failures: ["<prompt> — <why>"] }`. Offline judgement of given strings; distrust nothing external.

- [ ] **Step 3: Assemble + commit verdicts** — merge into `grammar-judge-verdicts.json` keyed by `topicId` (= `judge-verdicts.ts` `VerdictFile`). For any topic with pass-rate <0.9, fix the offending spec items (Task 9 mechanism) and re-sample/re-judge just those before committing.

- [ ] **Step 4: Gate**

```bash
cd site && bun run audit:grammar --gate
echo "exit=$?"
```
Expected: `exit=0` — every gen topic ≥100 native unique + committed pass-rate ≥90%.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/english/data/grammar/grammar-judge-verdicts.json site/scripts/grammar-gen/sample-for-judge.ts
git commit -m "content(english): offline LLM-judge verdicts (audit:grammar --gate green)"
```

---

### Task 11: Full build + final review

**Files:** none (verification only)

- [ ] **Step 1: Wire audit into the gate (optional)** — if `verify:grammar` is a build/CI step, add `audit:grammar --gate` alongside (check `site/package.json` build + `.github/workflows/deploy.yml`; mirror `verify:samples`/`audit:scenario`). Else leave the build untouched; `audit:grammar --gate` is the standalone gate (matches `verify:grammar`'s wiring).

- [ ] **Step 2: Tests** — `cd site && bun run test` → all green.

- [ ] **Step 3: Full astro build** — `cd site && bun run build` → ~5531 pages, lint 0/0 (`index.ts`/`generate.ts` touch the import graph).

- [ ] **Step 4: Final review** — dispatch a final code-quality reviewer over `git diff 837ba923..HEAD`. SPOT-CHECK CORRECTNESS (P3a lesson — gates check non-empty, not right): ~5 random morphology topics' computed answers, ~5 selection topics' authored `answer`/`distractors` + RU rationale naturalness. Fix anything wrong; re-run Steps 2–3.

- [ ] **Step 5: Update memory** — `project_english-grammar-system-2026-06-15.md`: Phase 3b complete, commit range, tagged-context mechanism, `audit:grammar --gate`, gotchas. Update `MEMORY.md` hook line.

---

## Self-Review

**Spec coverage:** ≥100 unique/topic across all topics (Tasks 5/8/9), cross-topic composition (Task 5 `generateTopicSet`, runtime enrichment), offline re-derivable answers (Tasks 1/3/4 — computed or authored-with-context, never runtime-LLM), `audit:grammar --gate` (Task 8) with committed LLM-judge verdicts (Task 10), validated BYOK live layer (Tasks 6/7). All Spec-A "engine" items covered. Animations (P4), UI (P5), BYOK UI (P6), design prompt (P7) explicitly out of scope.

**Native-floor reconciliation:** the build gate measures NATIVE generation only (it can't import the barrel for composites). So selection topics must reach ≥100 natively: Task 9 requires ≥50 distinct stems × 2 framings = 100; Task 8 `STEM_FLOOR = 50`. Composites are a runtime enrichment via `generateTopicSet`, never a gate dependency.

**Placeholder scan:** every code step shows real code consistent with the current tree's types (`TopicGenSpec`/`Template`/`Pool`/`GeneratedExercise`/`DeriveStrategy`/`fillTemplate`/`generateFromSpec`/`createRng`/`pickIndex`/`BatchDedup`/`cefrIndex`/`grammarById`). The one adapt-on-read note (Task 5 `composite` signature) carries its exact behavioral contract.

**Type consistency:** `deriveKey: "context"` sentinel keeps `getStrategy` total (Task 3) so `fillTemplate`/`validate` never throw on context templates; `fillContext` bypasses the strategy with the authored answer (Task 4). Context dedup key `${type}|${prompt}` is identical in Tasks 5 and 8. `ProposedItem` defined once in `validate.ts` (Task 6), reused by `live.ts` (Task 7).
