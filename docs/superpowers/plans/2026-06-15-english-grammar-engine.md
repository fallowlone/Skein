# English Grammar Generative Engine (Phase 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port steep's algorithmic exercise engine into `src/english/practice-engine/`, adapted to our serializable `TopicGenSpec` data model (named `deriveKey` strategies instead of inline functions), so `generate(topicId, opts)` produces ≥100 unique, deterministically-keyed exercises per equipped topic — proven on 3 pilot topics and guarded by `verify:grammar`.

**Architecture:** A topic's `gen?: TopicGenSpec` (pools + templates + features, already typed in `grammar-types.ts`) is expanded by a seeded template engine. The crux: steep authored answer **functions** per template; we cannot (our `gen` is JSON-serialized into committed `.ts` data, no functions allowed), so each `Template.deriveKey` is a **string key** into an engine-side strategy registry that computes the answer from the filled slots. Pure morphology/agreement/distractor utilities are ported faithfully from steep; the fill loop + key derivation + rationale interpolation are reimplemented for the pool-based model. Answer correctness is always **re-derivable offline** — never a runtime LLM.

**Tech Stack:** TypeScript, Preact, Vitest (`bun run test`), bun, ts-fsrs (existing). Donor: `/Users/artemmac/dev/personal/steep/grammar/algorithm/` (port `rng.ts`, `transforms.ts`, `agreement.ts`, `collocation.ts`, `dedup.ts`, `distractors-v2.ts`, `mc-adapter.ts`).

**Scope (Phase 3a vs 3b):**
- **3a (this plan):** engine core, 3 pilot `gen` specs, `verify:grammar`, FSRS grammar mastery state + migration.
- **3b (separate plan, later):** author `gen` for the remaining ~119 topics (Workflow), `audit:grammar --gate` (≥100/topic + offline LLM-judge verdicts), BYOK `live.ts` runner hook. UI surfaces are Phase 5.

**Conventions (verified):**
- Test runner: `bun run test` (= `vitest run`). NOT `bun test`. Alias `~` → `site/src`. Vitest include: `src/**/*.test.ts(x)`, `scripts/**/*.test.ts`.
- All commands from `/Users/artemmac/dev/awesome-everything/site`. Branch: `feat/english-grammar-system`.
- `Bi = {en;ru}` from `~/english/types`. `Cefr`, `CEFR_ORDER`, `cefrIndex`, `GrammarTopic`, `TopicGenSpec`, `Pool`, `Template`, `ExerciseType` from `~/english/grammar-types`.
- `gen` data is JSON-serialized into topic modules by `scripts/grammar-import/serialize.ts` — therefore `Template.deriveKey` MUST stay a string and pools/templates MUST stay plain data (no functions).
- A topic module with `gen` is still emitted by `serializeTopic` (it JSON.stringifies the whole `GrammarTopic`, `gen` included).

---

### Task 1: Engine types + seeded RNG

**Files:**
- Create: `site/src/english/practice-engine/types.ts`
- Create: `site/src/english/practice-engine/rng.ts`
- Test: `site/src/english/practice-engine/rng.test.ts`

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/rng.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createRng, pickIndex, shuffleInPlace } from "./rng";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42), b = createRng(42);
    const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });
  it("differs across seeds", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
});

describe("pickIndex", () => {
  it("stays in range and is seed-stable", () => {
    const r1 = createRng(7), r2 = createRng(7);
    const i1 = pickIndex(5, r1), i2 = pickIndex(5, r2);
    expect(i1).toBe(i2);
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i1).toBeLessThan(5);
  });
});

describe("shuffleInPlace", () => {
  it("permutes deterministically for a seed and keeps members", () => {
    const arr1 = [1, 2, 3, 4, 5], arr2 = [1, 2, 3, 4, 5];
    shuffleInPlace(arr1, createRng(9));
    shuffleInPlace(arr2, createRng(9));
    expect(arr1).toEqual(arr2);
    expect([...arr1].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/rng.test.ts` → FAIL (`Cannot find module './rng'`).

- [ ] **Step 3: Port `rng.ts`** — Read `/Users/artemmac/dev/personal/steep/grammar/algorithm/rng.ts` and port it to `site/src/english/practice-engine/rng.ts`, preserving behavior. It must export: `createRng(seed: number): () => number` (deterministic PRNG returning [0,1)), `pickIndex(n: number, rng: () => number): number`, `shuffleInPlace<T>(arr: T[], rng: () => number): T[]` (Fisher–Yates). If steep's signatures differ, adapt to exactly these signatures (the tests pin them).

- [ ] **Step 4: Write `types.ts`** — Create `site/src/english/practice-engine/types.ts`:

```ts
// Engine-local types. The corpus' TopicGenSpec/Pool/Template live in grammar-types.ts;
// these describe the engine's OUTPUT and the deriveKey strategy contract.
import type { Bi } from "~/english/types";
import type { Cefr, ExerciseType } from "~/english/grammar-types";

/** A generated, ready-to-serve exercise. Answer/alts are COMPUTED, never authored per-item. */
export type GeneratedExercise = {
  id: string;            // stable: `${topicId}:${templateId}:${seed}`
  topicId: string;
  cefr: Cefr;
  type: ExerciseType;
  prompt: string;        // the surface shown (sentence with a ___ blank, MC stem, scrambled words, etc.)
  answer: string;        // canonical correct answer
  alts: string[];        // other accepted answers
  options?: string[];    // multiple_choice only
  rationale: Bi;         // slot-interpolated explanation
};

/** Context passed to a deriveKey strategy: the filled slot values + the template. */
export type DeriveCtx = {
  slots: Record<string, string>;   // slotName → chosen surface (already feature-transformed)
  raw: Record<string, string>;     // slotName → raw pool token (pre-transform), for strategies that need the lemma
  level: Cefr;
};
export type DeriveResult = { primary: string; alternates: string[] };
export type DeriveStrategy = (ctx: DeriveCtx) => DeriveResult;
```

- [ ] **Step 5: Run test to verify it passes** — `bun run test src/english/practice-engine/rng.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add site/src/english/practice-engine/rng.ts site/src/english/practice-engine/rng.test.ts site/src/english/practice-engine/types.ts
git commit -m "feat(english): practice-engine seeded RNG + engine types"
```

---

### Task 2: Morphology (verb/noun/adjective inflection)

**Files:**
- Create: `site/src/english/practice-engine/morphology.ts`
- Test: `site/src/english/practice-engine/morphology.test.ts`

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/morphology.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { verbForm, nounPlural, adjForm } from "./morphology";

describe("verbForm", () => {
  it("regular + irregular present 3sg", () => {
    expect(verbForm("work", "s3")).toBe("works");
    expect(verbForm("go", "s3")).toBe("goes");
    expect(verbForm("study", "s3")).toBe("studies");
    expect(verbForm("have", "s3")).toBe("has");
  });
  it("past + past participle", () => {
    expect(verbForm("work", "past")).toBe("worked");
    expect(verbForm("go", "past")).toBe("went");
    expect(verbForm("write", "pastParticiple")).toBe("written");
  });
  it("gerund", () => {
    expect(verbForm("run", "gerund")).toBe("running");
    expect(verbForm("make", "gerund")).toBe("making");
  });
});

describe("nounPlural", () => {
  it("regular + irregular", () => {
    expect(nounPlural("cat")).toBe("cats");
    expect(nounPlural("box")).toBe("boxes");
    expect(nounPlural("city")).toBe("cities");
    expect(nounPlural("child")).toBe("children");
  });
});

describe("adjForm", () => {
  it("comparative + superlative", () => {
    expect(adjForm("big", "comparative")).toBe("bigger");
    expect(adjForm("happy", "comparative")).toBe("happier");
    expect(adjForm("expensive", "comparative")).toBe("more expensive");
    expect(adjForm("big", "superlative")).toBe("biggest");
    expect(adjForm("expensive", "superlative")).toBe("most expensive");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/morphology.test.ts` → FAIL.

- [ ] **Step 3: Port** — Read `/Users/artemmac/dev/personal/steep/grammar/algorithm/transforms.ts` (the morphology: verb/noun/adjective inflection + irregular tables). Port the inflection logic into `site/src/english/practice-engine/morphology.ts`, exporting exactly:
  - `verbForm(lemma: string, form: "base"|"s3"|"past"|"pastParticiple"|"gerund"): string`
  - `nounPlural(lemma: string): string`
  - `adjForm(lemma: string, form: "base"|"comparative"|"superlative"): string`

  Bring across steep's irregular-verb table, the `-es`/`-ies`/`-y→ies` rules, consonant-doubling for gerund/comparative, and the multi-syllable `more/most` rule for adjectives. Keep the irregular tables; the tests pin representative cases. If steep splits these across `transforms.ts`/`word-lists.ts`, consolidate into this one module.

- [ ] **Step 4: Run test to verify it passes** — `bun run test src/english/practice-engine/morphology.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/practice-engine/morphology.ts site/src/english/practice-engine/morphology.test.ts
git commit -m "feat(english): practice-engine morphology (verb/noun/adjective inflection)"
```

---

### Task 3: Dedup + the deriveKey strategy registry

**Files:**
- Create: `site/src/english/practice-engine/dedup.ts`
- Create: `site/src/english/practice-engine/derive.ts`
- Test: `site/src/english/practice-engine/derive.test.ts`

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/derive.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { BatchDedup } from "./dedup";
import { DERIVE, getStrategy } from "./derive";

describe("BatchDedup", () => {
  it("rejects exact and whitespace-variant duplicates", () => {
    const d = new BatchDedup();
    expect(d.accept("She works here.")).toBe(true);
    expect(d.accept("She works here.")).toBe(false);
    expect(d.accept("  She   works here. ")).toBe(false);
    expect(d.accept("He works here.")).toBe(true);
  });
});

describe("deriveKey registry", () => {
  it("verb-agreement-present derives 3sg from subject+verb", () => {
    const s = getStrategy("verb-agreement-present");
    expect(s({ slots: { subj: "She", verb: "work" }, raw: { subj: "She", verb: "work" }, level: "A1" }).primary).toBe("works");
    expect(s({ slots: { subj: "They", verb: "work" }, raw: { subj: "They", verb: "work" }, level: "A1" }).primary).toBe("work");
  });
  it("comparative-form derives the comparative of the adjective", () => {
    const s = getStrategy("comparative-form");
    const r = s({ slots: { adj: "big" }, raw: { adj: "big" }, level: "A2" });
    expect(r.primary).toBe("bigger");
  });
  it("passive-be-participle derives 'is/are + V3'", () => {
    const s = getStrategy("passive-be-participle");
    expect(s({ slots: { subj: "The bug", verb: "fix" }, raw: { subj: "The bug", verb: "fix", num: "sg" }, level: "B1" }).primary).toBe("is fixed");
  });
  it("getStrategy throws on an unknown key", () => {
    expect(() => getStrategy("nope")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/derive.test.ts` → FAIL.

- [ ] **Step 3: Port `dedup.ts`** — Read `/Users/artemmac/dev/personal/steep/grammar/algorithm/dedup.ts` and port to `site/src/english/practice-engine/dedup.ts`, exporting a `BatchDedup` class with `accept(surface: string): boolean` (returns false for a normalized-duplicate, true and records otherwise). Normalize by trimming + collapsing internal whitespace + lowercasing.

- [ ] **Step 4: Write `derive.ts`** — Create `site/src/english/practice-engine/derive.ts`:

```ts
// Named answer-derivation strategies. Each computes the blanked target from the
// filled slots — the engine's guarantee that answers are re-derivable offline.
import type { DeriveStrategy } from "./types";
import { verbForm, adjForm } from "./morphology";

const THIRD_SG = new Set(["he", "she", "it", "this", "that"]);
const is3sg = (subject: string): boolean => {
  const head = subject.trim().split(/\s+/)[0].toLowerCase();
  if (THIRD_SG.has(head)) return true;
  if (["i", "you", "we", "they", "these", "those"].includes(head)) return false;
  // default: a singular noun phrase is 3sg unless explicitly plural-marked
  return !/s$/.test(subject.trim());
};

export const DERIVE: Record<string, DeriveStrategy> = {
  "verb-agreement-present": ({ slots }) => {
    const v = is3sg(slots.subj) ? verbForm(slots.verb, "s3") : slots.verb;
    return { primary: v, alternates: [] };
  },
  "comparative-form": ({ slots }) => ({ primary: adjForm(slots.adj, "comparative"), alternates: [] }),
  "superlative-form": ({ slots }) => ({ primary: adjForm(slots.adj, "superlative"), alternates: [] }),
  "passive-be-participle": ({ slots, raw }) => {
    const be = (raw.num === "pl" || !is3sg(slots.subj)) ? "are" : "is";
    return { primary: `${be} ${verbForm(slots.verb, "pastParticiple")}`, alternates: [] };
  },
  "past-simple-form": ({ slots }) => ({ primary: verbForm(slots.verb, "past"), alternates: [] }),
  "present-participle-form": ({ slots }) => ({ primary: verbForm(slots.verb, "gerund"), alternates: [] }),
};

export function getStrategy(key: string): DeriveStrategy {
  const s = DERIVE[key];
  if (!s) throw new Error(`unknown deriveKey strategy: ${key}`);
  return s;
}
```

- [ ] **Step 5: Run test to verify it passes** — `bun run test src/english/practice-engine/derive.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add site/src/english/practice-engine/dedup.ts site/src/english/practice-engine/derive.ts site/src/english/practice-engine/derive.test.ts
git commit -m "feat(english): practice-engine dedup + deriveKey strategy registry"
```

---

### Task 4: Template fill (pool-based, seeded, rationale-interpolated)

**Files:**
- Create: `site/src/english/practice-engine/fill.ts`
- Test: `site/src/english/practice-engine/fill.test.ts`

> Pattern syntax: `{slot}` is a filled slot; `___` (three underscores) marks the blank
> whose surface is the `deriveKey` answer. The engine fills `{slot}` tokens from the
> topic's pools (applying an optional `feature` morphology transform), computes the
> blank via `deriveKey`, and interpolates the same slot values into `rationale`.

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/fill.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fillTemplate } from "./fill";
import type { Pool, Template } from "~/english/grammar-types";

const pools: Pool[] = [
  { id: "subj3", tags: { level: ["A1"] }, items: ["She", "He"] },
  { id: "verbs", tags: { level: ["A1"] }, items: ["work", "play"] },
];
const tpl: Template = {
  id: "ps-fill",
  type: "fill_in_blank",
  cefrMin: "A1", cefrMax: "A1",
  pattern: "{subj} ___ here every day.",
  slots: { subj: { pool: "subj3" }, verb: { pool: "verbs" } },
  deriveKey: "verb-agreement-present",
  rationale: { en: "{subj} is third person singular, so the verb takes -s.", ru: "{subj} — 3-е лицо ед. ч., глагол с -s." },
};

describe("fillTemplate", () => {
  it("fills slots, computes the blank, interpolates rationale — all seed-stable", () => {
    const a = fillTemplate(tpl, pools, "A1", 123);
    const b = fillTemplate(tpl, pools, "A1", 123);
    expect(a).toEqual(b);
    expect(a.prompt).toContain("___");
    expect(["She", "He"]).toContain(a.prompt.split(" ")[0]);
    expect(["works", "plays"]).toContain(a.answer);
    expect(a.rationale.en).not.toContain("{subj}");
    expect(a.type).toBe("fill_in_blank");
  });
  it("different seeds can produce different surfaces", () => {
    const surfaces = new Set<string>();
    for (let s = 0; s < 20; s++) surfaces.add(fillTemplate(tpl, pools, "A1", s).prompt);
    expect(surfaces.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/fill.test.ts` → FAIL.

- [ ] **Step 3: Write `fill.ts`** — Create `site/src/english/practice-engine/fill.ts`:

```ts
import type { Cefr, Pool, Template } from "~/english/grammar-types";
import type { GeneratedExercise } from "./types";
import { createRng, pickIndex } from "./rng";
import { getStrategy } from "./derive";
import { verbForm, nounPlural, adjForm } from "./morphology";

// A slot's optional `feature` requests a morphology transform on the chosen token.
function applyFeature(token: string, feature?: string): string {
  switch (feature) {
    case "s3": return verbForm(token, "s3");
    case "past": return verbForm(token, "past");
    case "pastParticiple": return verbForm(token, "pastParticiple");
    case "gerund": return verbForm(token, "gerund");
    case "plural": return nounPlural(token);
    case "comparative": return adjForm(token, "comparative");
    case "superlative": return adjForm(token, "superlative");
    default: return token;
  }
}

function poolFor(pools: Pool[], id: string): Pool {
  const p = pools.find((x) => x.id === id);
  if (!p) throw new Error(`pool not found: ${id}`);
  return p;
}

export function fillTemplate(tpl: Template, pools: Pool[], level: Cefr, seed: number): GeneratedExercise {
  const rng = createRng(seed);
  const slots: Record<string, string> = {};
  const raw: Record<string, string> = {};
  for (const [name, def] of Object.entries(tpl.slots)) {
    const pool = poolFor(pools, def.pool);
    const token = pool.items[pickIndex(pool.items.length, rng)];
    raw[name] = token;
    slots[name] = applyFeature(token, def.feature);
  }
  let prompt = tpl.pattern;
  for (const [name, val] of Object.entries(slots)) {
    prompt = prompt.replace(new RegExp(`\\{${name}\\}`, "g"), val);
  }
  const { primary, alternates } = getStrategy(tpl.deriveKey)({ slots, raw, level });
  const interp = (s: string): string => {
    let out = s;
    for (const [name, val] of Object.entries(slots)) out = out.replace(new RegExp(`\\{${name}\\}`, "g"), val);
    return out.replace(/\{answer\}/g, primary);
  };
  return {
    id: `${tpl.id}:${seed}`,
    topicId: "",            // generate() stamps this
    cefr: level,
    type: tpl.type,
    prompt,
    answer: primary,
    alts: alternates,
    rationale: { en: interp(tpl.rationale.en), ru: interp(tpl.rationale.ru) },
  };
}
```

- [ ] **Step 4: Run test to verify it passes** — `bun run test src/english/practice-engine/fill.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/practice-engine/fill.ts site/src/english/practice-engine/fill.test.ts
git commit -m "feat(english): practice-engine template fill (pool-based, seeded)"
```

---

### Task 5: Distractors + multiple-choice adapter

**Files:**
- Create: `site/src/english/practice-engine/distractors.ts`
- Test: `site/src/english/practice-engine/distractors.test.ts`

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/distractors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { makeDistractors, toMultipleChoice } from "./distractors";
import { createRng } from "./rng";

describe("makeDistractors", () => {
  it("returns plausible wrong verb forms, never equal to the answer", () => {
    const ds = makeDistractors("works", { lemma: "work", kind: "verb" }, 3);
    expect(ds.length).toBe(3);
    expect(ds).not.toContain("works");
    expect(new Set(ds).size).toBe(3);
  });
});

describe("toMultipleChoice", () => {
  it("builds 4 options containing the answer at the recorded index", () => {
    const mc = toMultipleChoice("works", ["work", "working", "worked"], createRng(3));
    expect(mc.options.length).toBe(4);
    expect(mc.options).toContain("works");
    expect(mc.options[mc.correctIndex]).toBe("works");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/distractors.test.ts` → FAIL.

- [ ] **Step 3: Port** — Read `/Users/artemmac/dev/personal/steep/grammar/algorithm/distractors-v2.ts` and `mc-adapter.ts`. Port into `site/src/english/practice-engine/distractors.ts`, exporting:
  - `makeDistractors(answer: string, hint: { lemma: string; kind: "verb"|"noun"|"adjective" }, n: number): string[]` — n plausible wrong forms (other inflections of the lemma; near-miss agreement), none equal to `answer`, deduped. Reuse `morphology.ts` (`verbForm`/`nounPlural`/`adjForm`) for candidate forms; fall back to steep's near-miss heuristics if fewer than `n` unique candidates.
  - `toMultipleChoice(answer: string, distractors: string[], rng: () => number): { options: string[]; correctIndex: number }` — shuffles answer + 3 distractors into 4 options via the seeded `rng`, records the answer's index.

- [ ] **Step 4: Run test to verify it passes** — `bun run test src/english/practice-engine/distractors.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/practice-engine/distractors.ts site/src/english/practice-engine/distractors.test.ts
git commit -m "feat(english): practice-engine distractors + MC adapter"
```

---

### Task 6: `generate()` orchestrator + barrel

**Files:**
- Create: `site/src/english/practice-engine/generate.ts`
- Create: `site/src/english/practice-engine/index.ts`
- Test: `site/src/english/practice-engine/generate.test.ts`

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/generate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateFromSpec } from "./generate";
import type { TopicGenSpec } from "~/english/grammar-types";

const spec: TopicGenSpec = {
  features: ["present-agreement"],
  pools: [
    { id: "subj3", tags: { level: ["A1"] }, items: ["She", "He", "The teacher", "My friend"] },
    { id: "subjPl", tags: { level: ["A1"] }, items: ["They", "We", "The students"] },
    { id: "verbs", tags: { level: ["A1"] }, items: ["work", "play", "study", "live", "teach", "watch", "go", "read"] },
  ],
  templates: [
    { id: "ps-3sg", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A1",
      pattern: "{subj} ___ here.", slots: { subj: { pool: "subj3" }, verb: { pool: "verbs" } },
      deriveKey: "verb-agreement-present", rationale: { en: "3sg → -s.", ru: "3 л. ед. → -s." } },
    { id: "ps-pl", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A1",
      pattern: "{subj} ___ here.", slots: { subj: { pool: "subjPl" }, verb: { pool: "verbs" } },
      deriveKey: "verb-agreement-present", rationale: { en: "plural → base.", ru: "мн. → база." } },
  ],
};

describe("generateFromSpec", () => {
  it("produces the requested count of unique, seed-stable items", () => {
    const a = generateFromSpec("present-simple", spec, { level: "A1", count: 30, seed: 1 });
    const b = generateFromSpec("present-simple", spec, { level: "A1", count: 30, seed: 1 });
    expect(a).toEqual(b);
    expect(a.length).toBe(30);
    expect(new Set(a.map((e) => e.prompt)).size).toBe(30);
    expect(a.every((e) => e.topicId === "present-simple")).toBe(true);
    expect(a.every((e) => e.answer.length > 0)).toBe(true);
  });
  it("reaches >=100 unique across enough seeds", () => {
    const items = generateFromSpec("present-simple", spec, { level: "A1", count: 100, seed: 7 });
    expect(items.length).toBeGreaterThanOrEqual(100);
    expect(new Set(items.map((e) => e.prompt)).size).toBe(items.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/generate.test.ts` → FAIL.

- [ ] **Step 3: Write `generate.ts`** — Create `site/src/english/practice-engine/generate.ts`:

```ts
import type { Cefr, ExerciseType, GrammarTopic, TopicGenSpec } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { grammarById } from "~/english/data/grammar/index";
import type { GeneratedExercise } from "./types";
import { fillTemplate } from "./fill";
import { BatchDedup } from "./dedup";

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
    const ex = fillTemplate(tpl, spec.pools, lv, seed + i);
    if (!dedup.accept(ex.prompt)) continue;
    out.push({ ...ex, topicId, id: `${topicId}:${tpl.id}:${seed + i}` });
  }
  return out;
}

/** Convenience: pull a topic's committed gen spec from the corpus. */
export function generate(topicId: string, opts: GenerateOpts): GeneratedExercise[] {
  const topic: GrammarTopic | undefined = grammarById.get(topicId);
  if (!topic?.gen) return [];
  return generateFromSpec(topicId, topic.gen, opts);
}
```

- [ ] **Step 4: Write the barrel `index.ts`** — Create `site/src/english/practice-engine/index.ts`:

```ts
export { generate, generateFromSpec, type GenerateOpts } from "./generate";
export { composite } from "./cross-topic";
export { validateExercise } from "./validate";
export type { GeneratedExercise } from "./types";
```

> Note: `index.ts` references `./cross-topic` and `./validate` created in Tasks 7–8. Create
> those files in their tasks; this barrel will not type-check until then. The Task-6 test
> imports `./generate` directly (not the barrel), so Step 5 passes now.

- [ ] **Step 5: Run test to verify it passes** — `bun run test src/english/practice-engine/generate.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add site/src/english/practice-engine/generate.ts site/src/english/practice-engine/index.ts site/src/english/practice-engine/generate.test.ts
git commit -m "feat(english): practice-engine generate() orchestrator + barrel"
```

---

### Task 7: Cross-topic combinator

**Files:**
- Create: `site/src/english/practice-engine/cross-topic.ts`
- Modify: `site/src/english/practice-engine/fill.ts` (add `"passive"` feature alias)
- Test: `site/src/english/practice-engine/cross-topic.test.ts`

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/cross-topic.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { compositeFromSpecs } from "./cross-topic";
import type { TopicGenSpec } from "~/english/grammar-types";

const primary: TopicGenSpec = {
  features: ["present-perfect"],
  pools: [
    { id: "subj", tags: { level: ["B1"] }, items: ["The bug", "The feature", "The test"] },
    { id: "verbs", tags: { level: ["B1"] }, items: ["fix", "deploy", "merge"] },
  ],
  templates: [
    { id: "pp", type: "fill_in_blank", cefrMin: "B1", cefrMax: "B1",
      pattern: "{subj} has ___ already.", slots: { subj: { pool: "subj" }, verb: { pool: "verbs", feature: "passive" } },
      deriveKey: "present-participle-form", rationale: { en: "passive perfect", ru: "пассивный перфект" } },
  ],
};
const secondary: TopicGenSpec = { features: ["passive"], pools: [], templates: [] };

describe("compositeFromSpecs", () => {
  it("only composes when the secondary feature is exercised by a primary slot", () => {
    const items = compositeFromSpecs("present-perfect", primary, "passive", secondary, { count: 5, seed: 2 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.topicId === "present-perfect+passive")).toBe(true);
  });
  it("returns [] when no shared feature", () => {
    const noShare: TopicGenSpec = { features: ["articles"], pools: [], templates: [] };
    expect(compositeFromSpecs("present-perfect", primary, "articles", noShare, { count: 5, seed: 2 })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/cross-topic.test.ts` → FAIL.

- [ ] **Step 3: Write `cross-topic.ts`** — Create `site/src/english/practice-engine/cross-topic.ts`:

```ts
import type { TopicGenSpec, GrammarTopic } from "~/english/grammar-types";
import { grammarById } from "~/english/data/grammar/index";
import type { GeneratedExercise } from "./types";
import { generateFromSpec, type GenerateOpts } from "./generate";

// Map a slot morphology feature to the coarse grammatical tag a topic lists in `features`.
function featureToTag(feature: string): string {
  if (feature === "passive" || feature === "pastParticiple") return "passive";
  if (feature === "comparative" || feature === "superlative") return "comparison";
  if (feature === "plural") return "number";
  return feature;
}

// Compose two topics: keep the primary's templates, but only those that exercise a slot
// whose `feature` the secondary topic also lists in its `features` (pedagogically sane).
export function compositeFromSpecs(
  primaryId: string, primary: TopicGenSpec,
  secondaryId: string, secondary: TopicGenSpec,
  opts: Omit<GenerateOpts, "types">,
): GeneratedExercise[] {
  const secFeatures = new Set(secondary.features);
  const featureBearing = primary.templates.filter((t) =>
    Object.values(t.slots).some((s) => s.feature && secFeatures.has(featureToTag(s.feature))),
  );
  if (featureBearing.length === 0) return [];
  const sub: TopicGenSpec = { ...primary, templates: featureBearing };
  return generateFromSpec(`${primaryId}+${secondaryId}`, sub, opts);
}

export function composite(primaryId: string, secondaryId: string, opts: Omit<GenerateOpts, "types">): GeneratedExercise[] {
  const p: GrammarTopic | undefined = grammarById.get(primaryId);
  const s: GrammarTopic | undefined = grammarById.get(secondaryId);
  if (!p?.gen || !s?.gen) return [];
  if (!p.crossTopic.includes(secondaryId) && !s.crossTopic.includes(primaryId)) return [];
  return compositeFromSpecs(primaryId, p.gen, secondaryId, s.gen, opts);
}
```

- [ ] **Step 4: Add the `"passive"` feature alias** in `site/src/english/practice-engine/fill.ts`: inside `applyFeature`'s switch, add before `default`: `case "passive": return verbForm(token, "pastParticiple");`

- [ ] **Step 5: Run tests** — `bun run test src/english/practice-engine/cross-topic.test.ts src/english/practice-engine/fill.test.ts` → both PASS.

- [ ] **Step 6: Commit**

```bash
git add site/src/english/practice-engine/cross-topic.ts site/src/english/practice-engine/cross-topic.test.ts site/src/english/practice-engine/fill.ts
git commit -m "feat(english): practice-engine cross-topic combinator"
```

---

### Task 8: `validate.ts` — re-derive key, level fit, dedup

**Files:**
- Create: `site/src/english/practice-engine/validate.ts`
- Test: `site/src/english/practice-engine/validate.test.ts`

> This is the gate the BYOK live layer (Phase 3b) reuses: a candidate exercise is
> accepted only if its claimed answer matches the engine's recomputed key.

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateExercise } from "./validate";
import type { GeneratedExercise } from "./types";

const good: GeneratedExercise = {
  id: "x", topicId: "present-simple", cefr: "A1", type: "fill_in_blank",
  prompt: "She ___ here.", answer: "works", alts: [], rationale: { en: "3sg", ru: "3л" },
};

describe("validateExercise", () => {
  it("accepts an item whose answer re-derives from its slots+deriveKey", () => {
    const r = validateExercise(good, { deriveKey: "verb-agreement-present", slots: { subj: "She", verb: "work" } });
    expect(r.ok).toBe(true);
  });
  it("rejects an item whose claimed answer is wrong", () => {
    const r = validateExercise({ ...good, answer: "work" }, { deriveKey: "verb-agreement-present", slots: { subj: "She", verb: "work" } });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("answer");
  });
  it("rejects a duplicate against a seen set", () => {
    const seen = new Set(["she ___ here."]);
    const r = validateExercise(good, { deriveKey: "verb-agreement-present", slots: { subj: "She", verb: "work" }, seen });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("duplicate");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/validate.test.ts` → FAIL.

- [ ] **Step 3: Write `validate.ts`** — Create `site/src/english/practice-engine/validate.ts`:

```ts
import type { GeneratedExercise } from "./types";
import { getStrategy } from "./derive";

export type ValidateCtx = {
  deriveKey: string;
  slots: Record<string, string>;   // the slot values used to build the item (raw == slots here)
  seen?: Set<string>;              // normalized prompts already shown
};
export type ValidateResult = { ok: boolean; reason?: string };

const norm = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

export function validateExercise(ex: GeneratedExercise, ctx: ValidateCtx): ValidateResult {
  if (ctx.seen?.has(norm(ex.prompt))) return { ok: false, reason: "duplicate prompt" };
  const { primary, alternates } = getStrategy(ctx.deriveKey)({ slots: ctx.slots, raw: ctx.slots, level: ex.cefr });
  const accepted = new Set([primary, ...alternates]);
  if (!accepted.has(ex.answer)) {
    return { ok: false, reason: `answer "${ex.answer}" does not match re-derived "${primary}"` };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes** — `bun run test src/english/practice-engine/validate.test.ts` → PASS.

- [ ] **Step 5: Run the whole engine suite (confirms the barrel compiles)** — `bun run test src/english/practice-engine/`
Expected: all engine tests PASS (rng, morphology, derive, fill, distractors, generate, cross-topic, validate).

- [ ] **Step 6: Commit**

```bash
git add site/src/english/practice-engine/validate.ts site/src/english/practice-engine/validate.test.ts
git commit -m "feat(english): practice-engine validate (re-derive key gate)"
```

---

### Task 9: Three pilot `gen` specs in the corpus

**Files:**
- Modify: `site/src/english/data/grammar/present-simple.ts`, `comparative-adjectives.ts`, `past-simple.ts` (add `gen`)
- Create: `site/scripts/grammar-gen/apply-gen.ts`
- Create: `site/scripts/grammar-gen/gen-specs/{present-simple,comparative-adjectives,past-simple}.json`
- Test: `site/src/english/practice-engine/pilots.test.ts`

> `gen` is plain serializable data (pools/templates/strings/`deriveKey` keys), so it lives
> inside the topic module and round-trips through `serializeTopic`. We author 3 pilots to
> prove the engine reaches ≥100 unique with correct keys. Phase 3b authors the rest.

- [ ] **Step 1: Write the failing test** — Create `site/src/english/practice-engine/pilots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { grammarById } from "~/english/data/grammar/index";
import { generate } from "./generate";

const PILOTS = ["present-simple", "comparative-adjectives", "past-simple"];

describe("pilot gen specs", () => {
  for (const id of PILOTS) {
    it(`${id} has a gen spec`, () => {
      expect(grammarById.get(id)?.gen).toBeTruthy();
    });
    it(`${id} generates >=100 unique items with non-empty answers`, () => {
      const items = generate(id, { count: 100, seed: 1 });
      expect(items.length).toBeGreaterThanOrEqual(100);
      expect(new Set(items.map((e) => e.prompt)).size).toBe(items.length);
      expect(items.every((e) => e.answer.trim().length > 0)).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test src/english/practice-engine/pilots.test.ts` → FAIL (no `gen` yet).

- [ ] **Step 3: Write `apply-gen.ts`** — Create `site/scripts/grammar-gen/apply-gen.ts`:

```ts
// Write a `gen` TopicGenSpec into a topic module, re-emitting via serializeTopic.
// Usage: bun scripts/grammar-gen/apply-gen.ts  (reads gen-specs/*.json, merges by id)
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { serializeTopic } from "../grammar-import/serialize";
import type { GrammarTopic, TopicGenSpec } from "~/english/grammar-types";

export function withGen(topic: GrammarTopic, gen: TopicGenSpec): GrammarTopic {
  return { ...structuredClone(topic), gen };
}

export async function main(): Promise<void> {
  const here = import.meta.dir;
  const specDir = resolve(here, "gen-specs");
  const grammarDir = resolve(here, "../../src/english/data/grammar");
  if (!existsSync(specDir)) { console.error(`no gen-specs dir: ${specDir}`); process.exit(1); }
  let applied = 0;
  for (const f of readdirSync(specDir).filter((f) => f.endsWith(".json"))) {
    const spec = JSON.parse(readFileSync(join(specDir, f), "utf8")) as { id: string; gen: TopicGenSpec };
    const mod = (await import(join(grammarDir, `${spec.id}.ts`))) as { topic: GrammarTopic };
    writeFileSync(join(grammarDir, `${spec.id}.ts`), serializeTopic(withGen(mod.topic, spec.gen)), "utf8");
    applied++;
  }
  console.log(`gen applied ${applied}`);
}

if (import.meta.main) main();
```

- [ ] **Step 4: Author the 3 pilot gen specs** — Create the three JSON files with this exact content:

`site/scripts/grammar-gen/gen-specs/present-simple.json`:
```json
{
  "id": "present-simple",
  "gen": {
    "features": ["present-agreement"],
    "pools": [
      { "id": "subj3", "tags": { "level": ["A1","A2"] }, "items": ["She","He","My brother","The teacher","Our manager","The cat","This app","My neighbour","The server","Her sister"] },
      { "id": "subjPl", "tags": { "level": ["A1","A2"] }, "items": ["They","We","My friends","The students","Our clients","The servers","These tools","My parents"] },
      { "id": "verbs", "tags": { "level": ["A1","A2"] }, "items": ["work","play","study","live","teach","watch","go","read","fix","run","build","ship","review","deploy"] }
    ],
    "templates": [
      { "id": "ps-3sg", "type": "fill_in_blank", "cefrMin": "A1", "cefrMax": "A2", "pattern": "{subj} ___ every day.", "slots": { "subj": { "pool": "subj3" }, "verb": { "pool": "verbs" } }, "deriveKey": "verb-agreement-present", "rationale": { "en": "{subj} is third person singular, so the verb adds -s.", "ru": "{subj} — 3-е лицо ед. ч., поэтому глагол получает -s." } },
      { "id": "ps-pl", "type": "fill_in_blank", "cefrMin": "A1", "cefrMax": "A2", "pattern": "{subj} ___ every day.", "slots": { "subj": { "pool": "subjPl" }, "verb": { "pool": "verbs" } }, "deriveKey": "verb-agreement-present", "rationale": { "en": "{subj} is plural, so the verb stays in its base form.", "ru": "{subj} во мн. числе, глагол остаётся в базовой форме." } }
    ]
  }
}
```

`site/scripts/grammar-gen/gen-specs/comparative-adjectives.json`:
```json
{
  "id": "comparative-adjectives",
  "gen": {
    "features": ["comparison"],
    "pools": [
      { "id": "nounA", "tags": { "level": ["A2","B1"] }, "items": ["This laptop","The new server","Our office","His car","The metro","This phone","The blue plan","Her flat","The old build","This library"] },
      { "id": "nounB", "tags": { "level": ["A2","B1"] }, "items": ["that one","the old model","the other branch","the bus","the previous version","the red plan","yours","the city centre","the cloud option","the cache"] },
      { "id": "adj", "tags": { "level": ["A2","B1"] }, "items": ["big","fast","cheap","happy","large","small","expensive","modern","reliable","simple","heavy","early","busy","quiet"] }
    ],
    "templates": [
      { "id": "cmp", "type": "fill_in_blank", "cefrMin": "A2", "cefrMax": "B1", "pattern": "{nounA} is ___ than {nounB}.", "slots": { "nounA": { "pool": "nounA" }, "nounB": { "pool": "nounB" }, "adj": { "pool": "adj" } }, "deriveKey": "comparative-form", "rationale": { "en": "Short adjectives add -er; longer ones take 'more'.", "ru": "Короткие прилагательные получают -er; длинные — 'more'." } }
    ]
  }
}
```

`site/scripts/grammar-gen/gen-specs/past-simple.json`:
```json
{
  "id": "past-simple",
  "gen": {
    "features": ["past-tense"],
    "pools": [
      { "id": "subj", "tags": { "level": ["A1","A2","B1"] }, "items": ["She","He","They","We","The team","My colleague","The intern","Our client","I","The bot"] },
      { "id": "verbs", "tags": { "level": ["A1","A2","B1"] }, "items": ["work","play","study","fix","build","ship","write","go","see","make","run","read","send","break","take","find"] }
    ],
    "templates": [
      { "id": "past", "type": "fill_in_blank", "cefrMin": "A1", "cefrMax": "B1", "pattern": "{subj} ___ it yesterday.", "slots": { "subj": { "pool": "subj" }, "verb": { "pool": "verbs" } }, "deriveKey": "past-simple-form", "rationale": { "en": "Past simple: regular verbs add -ed; irregular verbs use their past form.", "ru": "Past Simple: правильные глаголы получают -ed; неправильные — особую форму." } }
    ]
  }
}
```

- [ ] **Step 5: Apply the gen specs** — `bun scripts/grammar-gen/apply-gen.ts`
Expected: `gen applied 3`.

- [ ] **Step 6: Run the pilot + corpus + verbatim tests** — `bun run test src/english/practice-engine/pilots.test.ts src/english/data/grammar/corpus.test.ts scripts/grammar-import/verbatim.test.ts`
Expected: PASS (each pilot ≥100 unique; corpus structurally valid; RU untouched).

- [ ] **Step 7: Commit** (the pilot `.json` specs ARE the authored source for re-applying — commit them):

```bash
git add site/scripts/grammar-gen/apply-gen.ts "site/scripts/grammar-gen/gen-specs/" site/src/english/data/grammar/present-simple.ts site/src/english/data/grammar/comparative-adjectives.ts site/src/english/data/grammar/past-simple.ts site/src/english/practice-engine/pilots.test.ts
git commit -m "feat(english): 3 pilot gen specs (present-simple, comparative, past-simple) — >=100 unique each"
```

---

### Task 10: `verify:grammar` — deriveKey internal consistency

**Files:**
- Create: `site/scripts/grammar-gen/verify-grammar.ts`
- Test: `site/scripts/grammar-gen/verify-grammar.test.ts`
- Modify: `site/package.json` (add `verify:grammar` script)

> Cheap every-build check (spirit of `verify:samples`): for every topic that HAS a `gen`,
> generate a sample and assert each item's answer is non-empty (engine internal consistency,
> deriveKey resolvable). No LLM. Fails loudly if a template's deriveKey is unknown/broken.

- [ ] **Step 1: Write the failing test** — Create `site/scripts/grammar-gen/verify-grammar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { verifyGenSpec } from "./verify-grammar";
import type { TopicGenSpec } from "~/english/grammar-types";

const ok: TopicGenSpec = {
  features: [], pools: [{ id: "s", tags: { level: ["A1"] }, items: ["She","He"] }, { id: "v", tags: { level: ["A1"] }, items: ["work","go"] }],
  templates: [{ id: "t", type: "fill_in_blank", cefrMin: "A1", cefrMax: "A1", pattern: "{subj} ___ here.", slots: { subj: { pool: "s" }, verb: { pool: "v" } }, deriveKey: "verb-agreement-present", rationale: { en: "x", ru: "x" } }],
};

describe("verifyGenSpec", () => {
  it("passes a coherent spec (every sample item has a non-empty derivable answer)", () => {
    expect(verifyGenSpec("present-simple", ok).problems).toEqual([]);
  });
  it("flags a template whose deriveKey strategy is unknown", () => {
    const bad: TopicGenSpec = { ...ok, templates: [{ ...ok.templates[0], deriveKey: "nonexistent" }] };
    const r = verifyGenSpec("x", bad);
    expect(r.problems.length).toBeGreaterThan(0);
    expect(r.problems[0]).toContain("nonexistent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `bun run test scripts/grammar-gen/verify-grammar.test.ts` → FAIL.

- [ ] **Step 3: Write `verify-grammar.ts`** — Create `site/scripts/grammar-gen/verify-grammar.ts`:

```ts
// verify:grammar — deriveKey internal consistency for every gen-equipped topic.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic, TopicGenSpec } from "~/english/grammar-types";
import { generateFromSpec } from "~/english/practice-engine/generate";

export function verifyGenSpec(topicId: string, gen: TopicGenSpec): { problems: string[] } {
  const problems: string[] = [];
  try {
    const sample = generateFromSpec(topicId, gen, { count: 20, seed: 1 });
    if (sample.length === 0) problems.push(`${topicId}: produced 0 items`);
    for (const ex of sample) {
      if (!ex.answer || !ex.answer.trim()) problems.push(`${topicId}/${ex.id}: empty derived answer`);
    }
  } catch (e) {
    problems.push(`${topicId}: ${(e as Error).message}`);
  }
  return { problems };
}

async function main(): Promise<void> {
  const grammarDir = resolve(import.meta.dir, "../../src/english/data/grammar");
  const files = readdirSync(grammarDir).filter((f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."));
  const allProblems: string[] = [];
  let checked = 0;
  for (const f of files) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    if (!mod.topic.gen) continue;
    checked++;
    allProblems.push(...verifyGenSpec(mod.topic.id, mod.topic.gen).problems);
  }
  console.log(`verify:grammar — checked ${checked} gen-equipped topics`);
  if (allProblems.length) {
    for (const p of allProblems) console.error(`  x ${p}`);
    process.exit(1);
  }
  console.log("verify:grammar: OK");
}

if (import.meta.main) main();
```

- [ ] **Step 4: Run test to verify it passes** — `bun run test scripts/grammar-gen/verify-grammar.test.ts` → PASS.

- [ ] **Step 5: Wire the package script** — In `site/package.json`, add to `scripts` (next to `verify:scenario`): `"verify:grammar": "bun scripts/grammar-gen/verify-grammar.ts",`. Keep JSON valid; verify with `node -e "require('./package.json')"`.

- [ ] **Step 6: Run the real verify** — `bun run verify:grammar`
Expected: `checked 3 gen-equipped topics` then `verify:grammar: OK`.

- [ ] **Step 7: Commit**

```bash
git add site/scripts/grammar-gen/verify-grammar.ts site/scripts/grammar-gen/verify-grammar.test.ts site/package.json
git commit -m "feat(english): verify:grammar — deriveKey internal-consistency gate"
```

---

### Task 11: FSRS grammar mastery state + legacy migration

**Files:**
- Create: `site/src/english/grammar-mastery.ts`
- Test: `site/src/english/grammar-mastery.test.ts`
- Modify: `site/src/english/state.ts` (add grammar cards; migrate `grammarDone`)

> Spec §5.4. Replace the boolean `grammarDone: Record<string, true>` with FSRS cards keyed
> per topic, reusing the existing scheduler. Keep load tolerant; migrate a legacy `true` into
> a matured card seed. FIRST read `src/english/state.ts` and `src/english/scheduler/` to match
> the EXACT existing card shape + scheduler API used for words/chunks — mirror it, do not invent.

- [ ] **Step 1: Read the existing state + scheduler** — Read `site/src/english/state.ts` (find `grammarDone` and the word/chunk card pattern) and `site/src/english/scheduler/fsrs.ts` + `scheduler/types.ts`. Note the exact card type, the grade/review function name, and how word/chunk cards are stored/graded/due-checked. The new grammar mastery MUST mirror that pattern (reuse the same scheduler instance/helpers; do not construct a new FSRS).

- [ ] **Step 2: Write the failing test** — Create `site/src/english/grammar-mastery.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { migrateGrammarMastery, gradeGrammar, isTopicDue, type GrammarMastery } from "./grammar-mastery";

describe("migrateGrammarMastery", () => {
  it("turns a legacy grammarDone:true into a seeded mature card", () => {
    const m = migrateGrammarMastery({ "present-simple": true } as Record<string, true>, {});
    expect(m["present-simple"]).toBeTruthy();
    expect(isTopicDue(m["present-simple"], new Date("2020-01-01"))).toBe(false); // matured, not immediately due
  });
  it("ignores malformed legacy entries", () => {
    const m = migrateGrammarMastery({ "x": 1 as unknown as true, "ok": true }, {});
    expect(m["x"]).toBeFalsy();
    expect(m["ok"]).toBeTruthy();
  });
  it("preserves existing cards over legacy seeds", () => {
    const existing = migrateGrammarMastery({ "a": true }, {});
    const merged = migrateGrammarMastery({ "a": true }, existing);
    expect(merged["a"]).toEqual(existing["a"]);
  });
});

describe("gradeGrammar", () => {
  it("a fresh 'good' creates an advancing card; 'again' stays due soon", () => {
    const good = gradeGrammar({}, "present-simple", "good", new Date("2024-01-01"));
    expect(good["present-simple"]).toBeTruthy();
    const again = gradeGrammar({}, "present-simple", "again", new Date("2024-01-01"));
    expect(isTopicDue(again["present-simple"], new Date("2024-01-02"))).toBe(true);
  });
});
```

- [ ] **Step 3: Write `grammar-mastery.ts`** — Create `site/src/english/grammar-mastery.ts` using the REAL card type + scheduler functions found in Step 1 (replace any placeholder names below with the actual ones). Export:
  - `type GrammarMastery = Record<string, <RealCardType>>`
  - `migrateGrammarMastery(legacy: Record<string, true> | undefined, existing: GrammarMastery): GrammarMastery` — keep existing cards; for each legacy entry strictly `=== true` with no existing card, seed a matured card (create a card then apply a 'good'/'easy' review via the existing scheduler, or use the project's existing seed helper). Ignore non-`true` legacy values.
  - `gradeGrammar(m: GrammarMastery, topicId: string, rating: "again"|"hard"|"good"|"easy", now: Date): GrammarMastery` — immutably returns a new map with the topic's card advanced via the existing scheduler (create-if-absent).
  - `isTopicDue(card, now: Date): boolean` — mirror the existing due check.

- [ ] **Step 4: Wire into `state.ts`** — In `site/src/english/state.ts`: add a persisted `grammar: GrammarMastery` field (default `{}`); on load run `migrateGrammarMastery(loaded.grammarDone, loaded.grammar ?? {})` → store under `grammar`; keep reads tolerant of a present-or-absent `grammarDone`. Follow the file's existing load/persist pattern exactly; do NOT remove other fields.

- [ ] **Step 5: Run tests** — `bun run test src/english/grammar-mastery.test.ts src/english` (the broad run confirms `state` and the rest still pass).
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add site/src/english/grammar-mastery.ts site/src/english/grammar-mastery.test.ts site/src/english/state.ts
git commit -m "feat(english): FSRS grammar mastery cards + grammarDone migration"
```

---

### Task 12: Full suite + build green

**Files:** none (verification only)

- [ ] **Step 1: Full English + engine + scripts suite** — `bun run test src/english scripts/grammar-import scripts/coverage-audit scripts/grammar-gen`
Expected: PASS.

- [ ] **Step 2: verify:grammar** — `bun run verify:grammar`
Expected: `verify:grammar: OK`.

- [ ] **Step 3: Production build** — `bun run build`
Expected: build completes; lint clean. The 3 `gen`-bearing pilot modules compile (still not rendered — UI is Phase 5); engine modules are import-only, so no new pages.

- [ ] **Step 4: Commit any build-surfaced fixes**

```bash
git add -A
git commit -m "chore(english): grammar engine (3a) — suite + build + verify green"
```

---

## Self-Review

**Spec coverage (Phase 3a = the engine-core slice of spec §5):**
- §5.1 generative-grammar model → already typed in `grammar-types.ts` (Phase 1); engine consumes it ✓
- §5.2 generation (seeded fill, dedup, ≥100 unique) → Tasks 1–6, proven on pilots Task 9 ✓
- §5.3 cross-topic combinator → Task 7 ✓
- §5.4 FSRS mastery + migration → Task 11 ✓
- §5.5 BYOK live layer → `validate.ts` reuse gate shipped Task 8; the `live.ts` UI hook is **Phase 3b** ✓ (noted)
- §5.6 gates → `verify:grammar` Task 10; `audit:grammar --gate` + LLM-judge verdicts + 122-topic gen authoring are **Phase 3b** ✓ (scoped out, stated up front)

**Placeholder scan:** every code step has complete code. Port tasks (1,2,3,5) name the exact steep source file + the exact target export signatures the tests pin — a faithful port, not "TODO". Task 11 explicitly defers concrete card-type names to a Step-1 read of the real `state.ts`/`scheduler` (the only honest option without guessing the existing API) and pins behavior via tests.

**Type consistency:** `GeneratedExercise`/`DeriveCtx`/`DeriveStrategy` (Task 1) used in Tasks 3,4,6,8. `getStrategy`/`DERIVE` (Task 3) used in 4,8. `fillTemplate` (Task 4) used in 6; the Task-7 `applyFeature` `"passive"` alias edit is the only back-edit, with a re-run. `generateFromSpec`/`generate` (Task 6) used in 7,9,10. `BatchDedup` (Task 3) used in 6. Pools/Templates/`TopicGenSpec` come from `grammar-types.ts` (Phase 1) unchanged. `serializeTopic` (Phase 1) reused in Task 9's `apply-gen.ts`. The Task-7 cross-topic test uses `present-participle-form` (a real Task-3 strategy) so the passive-feature path doesn't depend on `num`.

**Note for executor:** the engine deliberately re-implements steep's function-carrying templates as DATA templates + a named `deriveKey` registry, because our `gen` is JSON-serialized into committed `.ts`. Never reintroduce inline functions into `Template`. The pilot specs prove the model; Phase 3b scales authoring to all topics and adds the `audit:grammar` ≥100/topic + LLM-judge gate.
