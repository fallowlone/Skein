# English Grammar Coverage Audit (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an English Grammar Profile (EGP) competency inventory (zero→C2), tag the 122-topic corpus against it, and ship an `audit:coverage --gate` that proves every CEFR band's required grammar areas are covered or explicitly waived.

**Architecture:** A typed EGP inventory (original "can-do" phrasing, authored per band — NOT verbatim Cambridge, to stay copyright-safe) lives as committed data under `src/english/data/egp/`. A pure `grammar-coverage.ts` maps each `GrammarTopic.egp[]` onto the inventory and computes per-band covered/missing/waived. A bun gate script (`scripts/coverage-audit/audit.ts`, mirroring `scenario-audit/audit.ts`) writes `dist/coverage-report.json` and exits non-zero on uncovered, un-waived areas. Gaps are closed by either re-tagging, auto-authoring a new topic, or an explicit waiver.

**Tech Stack:** TypeScript, Astro 5 (Vite `import.meta.glob` in barrels — NOT usable under plain `bun`), Preact, Vitest (`bun run test`), bun, Zod. Phase 1 corpus already shipped at `src/english/data/grammar/<id>.ts` (×122) with `egp: ["EGP:best-effort"]` placeholders.

**Conventions (verified):**
- Test runner: `bun run test` (= `vitest run`). NOT `bun test`.
- Vitest `include`: `src/**/*.test.ts(x)`, `scripts/**/*.test.ts`. Alias `~` → `site/src`.
- Audit scripts: `audit:<x> = bun scripts/<x>/audit.ts`; `--gate` flag → exit 1 on gaps; report file under `dist/`.
- All commands run from `/Users/artemmac/dev/awesome-everything/site`. Branch: `feat/english-grammar-system`.
- **Barrels that use `import.meta.glob` (`data/grammar/index.ts`, and the new `data/egp/index.ts`) throw under plain `bun`.** Bun-runtime scripts (`audit.ts`, `apply-egp.ts`) must NOT import those barrels — they `readdirSync` + dynamic-`import()` each module by absolute path (the proven pattern from `apply-authoring.ts`). Vitest tests CAN import the barrels.
- `Bi = { en: string; ru: string }` from `~/english/types`. `Cefr`, `CEFR_ORDER`, `cefrIndex`, `GrammarTopic` from `~/english/grammar-types`.

---

### Task 1: EGP types + category registry

**Files:**
- Create: `site/src/english/data/egp/types.ts`
- Test: `site/src/english/data/egp/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/data/egp/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EGP_CATEGORIES, isEgpCategory, makeEgpId, type EgpEntry } from "./types";

describe("EGP categories", () => {
  it("exposes a stable, non-empty category list", () => {
    expect(EGP_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(EGP_CATEGORIES).size).toBe(EGP_CATEGORIES.length);
  });
  it("narrows known/unknown categories", () => {
    expect(isEgpCategory("tenses-aspect")).toBe(true);
    expect(isEgpCategory("made-up")).toBe(false);
  });
});

describe("makeEgpId", () => {
  it("builds a stable namespaced id", () => {
    expect(makeEgpId("A1", "tenses-aspect", "present-simple-states"))
      .toBe("egp.a1.tenses-aspect.present-simple-states");
  });
  it("kebab-collapses the slug", () => {
    expect(makeEgpId("B2", "clauses", "Reduced Relative Clauses"))
      .toBe("egp.b2.clauses.reduced-relative-clauses");
  });
});

it("EgpEntry shape compiles", () => {
  const e: EgpEntry = {
    id: makeEgpId("A1", "verbs", "be-present"),
    cefr: "A1",
    category: "verbs",
    can_do: { en: "Can use 'be' in the present.", ru: "Умеет использовать 'be' в настоящем." },
  };
  expect(e.cefr).toBe("A1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/english/data/egp/types.test.ts`
Expected: FAIL — `Cannot find module './types'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/english/data/egp/types.ts`:

```ts
// English Grammar Profile (EGP) competency inventory model. See
// docs/superpowers/specs/2026-06-15-english-grammar-system-design.md §7.
// can_do phrasing is ORIGINAL (not verbatim Cambridge EGP) to stay copyright-safe.
import type { Bi } from "~/english/types";
import type { Cefr } from "~/english/grammar-types";

export type EgpCategory =
  | "verbs" | "tenses-aspect" | "modality" | "conditionals" | "passive"
  | "nouns-determiners" | "pronouns" | "adjectives-adverbs" | "prepositions"
  | "clauses" | "questions-negation" | "discourse-cohesion" | "word-order";

export const EGP_CATEGORIES: EgpCategory[] = [
  "verbs", "tenses-aspect", "modality", "conditionals", "passive",
  "nouns-determiners", "pronouns", "adjectives-adverbs", "prepositions",
  "clauses", "questions-negation", "discourse-cohesion", "word-order",
];

export function isEgpCategory(s: string): s is EgpCategory {
  return (EGP_CATEGORIES as string[]).includes(s);
}

const kebab = (s: string): string =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Stable namespaced id, e.g. "egp.a1.tenses-aspect.present-simple-states". */
export function makeEgpId(cefr: Cefr, category: EgpCategory, slug: string): string {
  return `egp.${cefr.toLowerCase()}.${category}.${kebab(slug)}`;
}

export type EgpEntry = {
  id: string;
  cefr: Cefr;
  category: EgpCategory;
  can_do: Bi;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/english/data/egp/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/data/egp/types.ts site/src/english/data/egp/types.test.ts
git commit -m "feat(english): EGP inventory types + category registry"
```

---

### Task 2: EGP inventory barrel + seed + inventory test

**Files:**
- Create: `site/src/english/data/egp/index.ts`
- Create (seed, replaced by Task 3 authoring): `site/src/english/data/egp/a1.ts`
- Test: `site/src/english/data/egp/inventory.test.ts`

> The full per-band inventories (`a1.ts`…`c2.ts`) are authored in Task 3. This task
> establishes the barrel + a minimal `a1.ts` seed so the structure compiles and the
> test harness exists. Task 3 overwrites `a1.ts` and adds `a2.ts`…`c2.ts`.

- [ ] **Step 1: Write the failing test**

Create `site/src/english/data/egp/inventory.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EGP_INVENTORY, egpById } from "./index";
import { isEgpCategory } from "./types";
import { CEFR_ORDER } from "~/english/grammar-types";

describe("EGP inventory", () => {
  it("is non-empty with unique ids", () => {
    expect(EGP_INVENTORY.length).toBeGreaterThan(0);
    const ids = EGP_INVENTORY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every entry has a valid cefr (A1..C2) and known category", () => {
    const bands = new Set<string>(CEFR_ORDER);
    const bad = EGP_INVENTORY.filter(
      (e) => !bands.has(e.cefr) || e.cefr === "A0" || !isEgpCategory(e.category),
    );
    expect(bad.map((e) => e.id)).toEqual([]);
  });
  it("ids follow the egp.<cefr>.<category>.<slug> namespace", () => {
    const bad = EGP_INVENTORY.filter((e) => !/^egp\.[a-c][12]\.[a-z-]+\.[a-z0-9-]+$/.test(e.id));
    expect(bad.map((e) => e.id)).toEqual([]);
  });
  it("byId map resolves entries", () => {
    const first = EGP_INVENTORY[0];
    expect(egpById.get(first.id)?.id).toBe(first.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/english/data/egp/inventory.test.ts`
Expected: FAIL — `Cannot find module './index'`.

- [ ] **Step 3: Write the minimal seed `a1.ts`**

Create `site/src/english/data/egp/a1.ts`:

```ts
// AUTHORED per-band EGP inventory (original phrasing). Task 3 overwrites/extends.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  {
    id: makeEgpId("A1", "verbs", "be-present"),
    cefr: "A1",
    category: "verbs",
    can_do: { en: "Can use the present forms of 'be'.", ru: "Умеет использовать формы 'be' в настоящем времени." },
  },
];
```

- [ ] **Step 4: Write the barrel `index.ts`**

Create `site/src/english/data/egp/index.ts`:

```ts
// Barrel over per-band EGP inventory modules (a1.ts…c2.ts). Vite import.meta.glob
// (eager) so new band files are picked up without editing this file. Excludes
// index/types and any .test. file. NOTE: throws under plain bun — bun scripts must
// load band modules by path instead (see scripts/coverage-audit/audit.ts).
import type { EgpEntry } from "./types";
import { cefrIndex } from "~/english/grammar-types";

const mods = import.meta.glob<{ entries: EgpEntry[] }>("./*.ts", { eager: true });

export const EGP_INVENTORY: EgpEntry[] = Object.entries(mods)
  .filter(([p]) => !/\/(index|types)\.ts$/.test(p) && !p.includes(".test."))
  .flatMap(([, m]) => m.entries ?? [])
  .sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr) || a.id.localeCompare(b.id));

export const egpById: Map<string, EgpEntry> = new Map(EGP_INVENTORY.map((e) => [e.id, e]));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test src/english/data/egp/inventory.test.ts`
Expected: PASS (1-entry seed satisfies all shape rules).

- [ ] **Step 6: Commit**

```bash
git add site/src/english/data/egp/index.ts site/src/english/data/egp/a1.ts site/src/english/data/egp/inventory.test.ts
git commit -m "feat(english): EGP inventory barrel + seed + shape test"
```

---

### Task 3: Author the full EGP inventory (Workflow, per band)

> Content authoring (not TDD). The gate is the inventory test (Task 2) staying green
> plus a per-band minimum count. RU + EN are both authored fresh; phrasing is ORIGINAL,
> never copied from Cambridge EGP. Each band is an independent agent writing one module.

**Files:**
- Overwrite: `site/src/english/data/egp/a1.ts`
- Create: `site/src/english/data/egp/a2.ts`, `b1.ts`, `b2.ts`, `c1.ts`, `c2.ts`

- [ ] **Step 1: Run a Workflow — one agent per CEFR band (A1, A2, B1, B2, C1, C2)**

Each band agent enumerates the **canonical English grammar competencies a learner must control at that band** (the standard syllabus a serious A1/…/C2 course covers — independent of what our corpus happens to contain, so the inventory is an honest yardstick). For each competency it emits an `EgpEntry` literal. The agent WRITES the band module directly.

Per-band agent brief (critical guardrails):
- Output ONLY a valid TS module of this exact shape (no markdown fences, no harness/tool tags):

```ts
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  {
    id: makeEgpId("<BAND>", "<category>", "<short-slug>"),
    cefr: "<BAND>",
    category: "<one of the 13 categories>",
    can_do: { en: "Can <do X>.", ru: "Умеет <делать X>." },
  },
  // … 30–55 entries for this band
];
```

- `<category>` MUST be one of: verbs, tenses-aspect, modality, conditionals, passive, nouns-determiners, pronouns, adjectives-adverbs, prepositions, clauses, questions-negation, discourse-cohesion, word-order.
- `cefr` MUST equal the band you were assigned. Produce **30–55** entries spanning multiple categories appropriate to the band (lower bands lean to verbs/tenses/nouns/questions; higher bands add modality, clauses, discourse-cohesion, word-order).
- `can_do.en` is a concise original "can-do" statement; `can_do.ru` its Russian equivalent. Do NOT copy Cambridge wording.
- Slugs must be unique within the band and descriptive (e.g. "present-simple-habits", "comparative-short-adjectives", "reported-statements-backshift").
- Write the file to `site/src/english/data/egp/<band-lower>.ts` (e.g. `a1.ts`).

Workflow shape (parallel over the 6 bands; pass bands via `args` — REMEMBER `args` arrives as a STRING, `JSON.parse` it):

```js
const BANDS = typeof args === 'string' ? JSON.parse(args) : args; // ["A1","A2","B1","B2","C1","C2"]
phase('Inventory')
const results = await parallel(BANDS.map((b) => () =>
  agent(buildBandPrompt(b), { label: `egp:${b}`, phase: 'Inventory', agentType: 'general-purpose' })
    .then((r) => ({ b, ok: r != null }))
));
```

- [ ] **Step 2: Verify the inventory compiles and is substantial**

Run: `bun run test src/english/data/egp/inventory.test.ts`
Expected: PASS. Then count per band:

Run: `for b in a1 a2 b1 b2 c1 c2; do printf "$b: "; grep -c "makeEgpId(" site/src/english/data/egp/$b.ts; done`
Expected: each band ≥ 30; total (sum) ≥ 180.

- [ ] **Step 3: Scan for contamination**

Run: `grep -lE '</(invoke|output|content|parameter)>|```' site/src/english/data/egp/*.ts || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add site/src/english/data/egp/
git commit -m "content(english): author EGP competency inventory A1–C2 (original phrasing)"
```

---

### Task 4: Coverage computation core (pure)

**Files:**
- Create: `site/src/english/grammar-coverage.ts`
- Test: `site/src/english/grammar-coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/grammar-coverage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeGrammarCoverage, type Waiver } from "./grammar-coverage";
import type { EgpEntry } from "./data/egp/types";
import type { GrammarTopic } from "./grammar-types";

const inv: EgpEntry[] = [
  { id: "egp.a1.verbs.be", cefr: "A1", category: "verbs", can_do: { en: "", ru: "" } },
  { id: "egp.a1.tenses-aspect.present-simple", cefr: "A1", category: "tenses-aspect", can_do: { en: "", ru: "" } },
  { id: "egp.b2.clauses.relative", cefr: "B2", category: "clauses", can_do: { en: "", ru: "" } },
];

function topic(id: string, egp: string[]): GrammarTopic {
  return { id, title: { en: id, ru: id }, cefr: "A1", levels: ["A1"], family: "tenses",
    egp, archetype: "x", lessons: {}, related: [], crossTopic: [] };
}

describe("computeGrammarCoverage", () => {
  it("marks covered, missing, and waived per band", () => {
    const topics = [topic("t1", ["egp.a1.verbs.be", "egp.a1.tenses-aspect.present-simple"])];
    const waivers: Waiver[] = [{ id: "egp.b2.clauses.relative", rationale: { en: "later", ru: "позже" } }];
    const cov = computeGrammarCoverage(topics, inv, waivers);
    const a1 = cov.bands.find((b) => b.cefr === "A1")!;
    expect(a1.covered).toBe(2);
    expect(a1.missing).toEqual([]);
    expect(a1.pct).toBe(100);
    const b2 = cov.bands.find((b) => b.cefr === "B2")!;
    expect(b2.covered).toBe(0);
    expect(b2.waived).toBe(1);
    expect(b2.missing).toEqual([]);
    expect(cov.missingTotal).toBe(0);
    expect(cov.overallPct).toBe(100);
  });
  it("reports a true gap when neither tagged nor waived", () => {
    const cov = computeGrammarCoverage([topic("t1", ["egp.a1.verbs.be"])], inv, []);
    expect(cov.missingTotal).toBe(2);
    expect(cov.bands.find((b) => b.cefr === "B2")!.missing).toEqual(["egp.b2.clauses.relative"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test src/english/grammar-coverage.test.ts`
Expected: FAIL — `Cannot find module './grammar-coverage'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/english/grammar-coverage.ts`:

```ts
// Pure EGP coverage computation. See spec §7. No I/O, no barrels.
import type { Bi } from "./types";
import type { Cefr, GrammarTopic } from "./grammar-types";
import { CEFR_ORDER } from "./grammar-types";
import type { EgpEntry } from "./data/egp/types";

export type Waiver = { id: string; rationale: Bi };
export type BandCoverage = {
  cefr: Cefr; total: number; covered: number; waived: number; missing: string[]; pct: number;
};
export type GrammarCoverage = { bands: BandCoverage[]; overallPct: number; missingTotal: number };

export function computeGrammarCoverage(
  topics: GrammarTopic[],
  inventory: EgpEntry[],
  waivers: Waiver[],
): GrammarCoverage {
  const tagged = new Set<string>(topics.flatMap((t) => t.egp));
  const waived = new Set<string>(waivers.map((w) => w.id));
  const presentBands = CEFR_ORDER.filter((c) => inventory.some((e) => e.cefr === c));
  const bands: BandCoverage[] = presentBands.map((cefr) => {
    const entries = inventory.filter((e) => e.cefr === cefr);
    const missing = entries.filter((e) => !tagged.has(e.id) && !waived.has(e.id)).map((e) => e.id);
    const waivedCount = entries.filter((e) => !tagged.has(e.id) && waived.has(e.id)).length;
    const covered = entries.length - missing.length - waivedCount;
    const pct = entries.length === 0 ? 100 : Math.round((100 * (covered + waivedCount)) / entries.length);
    return { cefr, total: entries.length, covered, waived: waivedCount, missing, pct };
  });
  const missingTotal = bands.reduce((s, b) => s + b.missing.length, 0);
  const overallPct = inventory.length === 0 ? 100 : Math.round((100 * (inventory.length - missingTotal)) / inventory.length);
  return { bands, overallPct, missingTotal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test src/english/grammar-coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/english/grammar-coverage.ts site/src/english/grammar-coverage.test.ts
git commit -m "feat(english): pure EGP coverage computation"
```

---

### Task 5: EGP re-tagging — replace placeholders with real inventory ids

> Phase 1 left `egp: ["EGP:best-effort"]` on every topic. Here a Workflow proposes, per
> topic, the inventory ids that topic actually covers; `apply-egp.ts` validates them
> against the inventory and replaces the placeholder. Only `egp` is touched.

**Files:**
- Create: `site/scripts/coverage-audit/apply-egp.ts`
- Test: `site/scripts/coverage-audit/apply-egp.test.ts`
- Modify at runtime: `site/src/english/data/grammar/<id>.ts` (egp field only)
- Patches (gitignored): `site/scripts/coverage-audit/egp-patches/<id>.json`

- [ ] **Step 1: Write the failing test**

Create `site/scripts/coverage-audit/apply-egp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyEgp } from "./apply-egp";
import type { GrammarTopic } from "~/english/grammar-types";

function topic(egp: string[]): GrammarTopic {
  return { id: "present-simple", title: { en: "Present Simple", ru: "x" }, cefr: "A1",
    levels: ["A1"], family: "tenses", egp, archetype: "timeline", lessons: {}, related: [], crossTopic: [] };
}
const valid = new Set(["egp.a1.tenses-aspect.present-simple", "egp.a1.verbs.be"]);

describe("applyEgp", () => {
  it("replaces the placeholder with validated ids", () => {
    const t = applyEgp(topic(["EGP:best-effort"]), ["egp.a1.tenses-aspect.present-simple", "egp.x.bogus"], valid);
    expect(t.egp).toEqual(["egp.a1.tenses-aspect.present-simple"]);
  });
  it("treats an empty egp as a placeholder", () => {
    const t = applyEgp(topic([]), ["egp.a1.verbs.be"], valid);
    expect(t.egp).toEqual(["egp.a1.verbs.be"]);
  });
  it("does not overwrite already real-tagged topics", () => {
    const t = applyEgp(topic(["egp.a1.verbs.be"]), ["egp.a1.tenses-aspect.present-simple"], valid);
    expect(t.egp).toEqual(["egp.a1.verbs.be"]);
  });
  it("drops a patch that yields zero valid ids (keeps placeholder for the gate to flag)", () => {
    const t = applyEgp(topic(["EGP:best-effort"]), ["egp.x.bogus"], valid);
    expect(t.egp).toEqual(["EGP:best-effort"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test scripts/coverage-audit/apply-egp.test.ts`
Expected: FAIL — `Cannot find module './apply-egp'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/scripts/coverage-audit/apply-egp.ts`:

```ts
// Replace the Phase-1 "EGP:best-effort" placeholder with validated inventory ids.
// Pure merge (applyEgp) + bun I/O driver (main) that avoids the Vite barrels.
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { serializeTopic } from "../grammar-import/serialize";
import type { GrammarTopic } from "~/english/grammar-types";

const isReal = (id: string): boolean => /^egp\.[a-c][12]\./.test(id);

export function applyEgp(topic: GrammarTopic, egpIds: string[], validEgp: Set<string>): GrammarTopic {
  const placeholder = topic.egp.length === 0 || !topic.egp.some(isReal);
  if (!placeholder) return topic;
  const clean = egpIds.filter((id) => validEgp.has(id));
  if (clean.length === 0) return topic; // leave placeholder so the gate flags it
  return { ...structuredClone(topic), egp: clean };
}

const PatchSchema = z.object({ id: z.string(), egp: z.array(z.string()) });

export async function main(): Promise<void> {
  const here = import.meta.dir;
  const patchesDir = resolve(here, "egp-patches");
  const grammarDir = resolve(here, "../../src/english/data/grammar");
  const egpDir = resolve(here, "../../src/english/data/egp");
  if (!existsSync(patchesDir)) { console.error(`no egp-patches dir: ${patchesDir}`); process.exit(1); }

  // Build the valid-id set from the band modules (NOT the Vite barrel).
  const bandFiles = readdirSync(egpDir).filter(
    (f) => /\.ts$/.test(f) && !/(index|types)\.ts$/.test(f) && !f.includes(".test."),
  );
  const validEgp = new Set<string>();
  for (const f of bandFiles) {
    const mod = (await import(join(egpDir, f))) as { entries?: { id: string }[] };
    for (const e of mod.entries ?? []) validEgp.add(e.id);
  }

  const topicFiles = readdirSync(grammarDir).filter(
    (f) => /\.ts$/.test(f) && !/(index|families)\.ts$/.test(f) && !f.includes(".test."),
  );
  const byId = new Map<string, GrammarTopic>();
  for (const f of topicFiles) {
    const mod = (await import(join(grammarDir, f))) as { topic: GrammarTopic };
    byId.set(mod.topic.id, mod.topic);
  }

  let applied = 0, skipped = 0;
  for (const f of readdirSync(patchesDir).filter((f) => f.endsWith(".json"))) {
    const parsed = PatchSchema.safeParse(JSON.parse(readFileSync(join(patchesDir, f), "utf8")));
    if (!parsed.success) { console.error(`bad egp patch ${f}`); skipped++; continue; }
    const topic = byId.get(parsed.data.id);
    if (!topic) { console.error(`unknown topic ${parsed.data.id}`); skipped++; continue; }
    const merged = applyEgp(topic, parsed.data.egp, validEgp);
    if (merged === topic) { skipped++; continue; }
    writeFileSync(join(grammarDir, `${topic.id}.ts`), serializeTopic(merged), "utf8");
    applied++;
  }
  console.log(`egp applied ${applied}, skipped ${skipped}`);
}

if (import.meta.main) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test scripts/coverage-audit/apply-egp.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Add the egp-patches dir to .gitignore**

Append to `site/.gitignore` (after the existing `scripts/grammar-import/patches/` line):

```
scripts/coverage-audit/egp-patches/
```

- [ ] **Step 6: Run a Workflow to author the per-topic egp patches**

`mkdir -p site/scripts/coverage-audit/egp-patches` first. Then a Workflow over the 122 topic ids
(pass via `args`; `JSON.parse` the string). Each agent: Reads its topic module
(`src/english/data/grammar/<id>.ts`) for context (title, levels, RU/EN prose) AND reads the
relevant band inventory file(s) under `src/english/data/egp/` to choose ids, then WRITES
`scripts/coverage-audit/egp-patches/<id>.json` = `{ "id": "<id>", "egp": ["egp.<band>.<cat>.<slug>", …] }`
listing the 1–6 inventory ids that topic teaches (only ids that EXIST in the inventory).
Final reply: `<id> ok`. Guardrails identical to Phase-1 authoring (no fences/tags; strict JSON).

- [ ] **Step 7: Merge the egp patches**

Run: `bun scripts/coverage-audit/apply-egp.ts`
Expected: `egp applied N, skipped M` (N close to 122; M = topics whose patch yielded no valid id — those keep the placeholder and the Task 6 gate will list them).

- [ ] **Step 8: Confirm corpus still structurally valid + RU untouched**

Run: `bun run test src/english/data/grammar/corpus.test.ts scripts/grammar-import/verbatim.test.ts`
Expected: PASS (egp change is structurally inert; RU verbatim unaffected).

- [ ] **Step 9: Commit**

```bash
git add site/scripts/coverage-audit/apply-egp.ts site/scripts/coverage-audit/apply-egp.test.ts site/.gitignore site/src/english/data/grammar/
git commit -m "feat(english): re-tag corpus with real EGP inventory ids"
```

---

### Task 6: Waivers + audit gate + report + package script

**Files:**
- Create: `site/src/english/data/egp/waivers.ts`
- Create: `site/scripts/coverage-audit/audit.ts`
- Test: `site/scripts/coverage-audit/audit.test.ts`
- Modify: `site/package.json` (add `audit:coverage` script)

- [ ] **Step 1: Write the waivers file (starts empty)**

Create `site/src/english/data/egp/waivers.ts`:

```ts
import type { Waiver } from "~/english/grammar-coverage";

// Inventory ids deliberately out of scope (archaic/marginal forms). Each needs an
// explicit rationale. Starts empty; add entries only when a gap is a conscious choice.
export const COVERAGE_WAIVERS: Waiver[] = [];
```

- [ ] **Step 2: Write the failing test for the audit's gate decision**

Create `site/scripts/coverage-audit/audit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { gateExitCode, renderReport } from "./audit";
import type { GrammarCoverage } from "~/english/grammar-coverage";

const clean: GrammarCoverage = {
  bands: [{ cefr: "A1", total: 2, covered: 2, waived: 0, missing: [], pct: 100 }],
  overallPct: 100, missingTotal: 0,
};
const gappy: GrammarCoverage = {
  bands: [{ cefr: "A1", total: 2, covered: 1, waived: 0, missing: ["egp.a1.x.y"], pct: 50 }],
  overallPct: 50, missingTotal: 1,
};

describe("audit gate", () => {
  it("exit 0 when nothing missing", () => { expect(gateExitCode(clean)).toBe(0); });
  it("exit 1 when something missing", () => { expect(gateExitCode(gappy)).toBe(1); });
});
describe("renderReport", () => {
  it("includes overall pct and a per-band line", () => {
    const r = renderReport(gappy);
    expect(r).toContain("50%");
    expect(r).toContain("A1");
    expect(r).toContain("egp.a1.x.y");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun run test scripts/coverage-audit/audit.test.ts`
Expected: FAIL — `Cannot find module './audit'`.

- [ ] **Step 4: Write the audit driver**

Create `site/scripts/coverage-audit/audit.ts`:

```ts
#!/usr/bin/env bun
// Map the corpus' EGP tags onto the EGP inventory, write dist/coverage-report.json,
// print a per-band table, and (with --gate) exit 1 if any band has uncovered,
// un-waived areas. Mirrors scripts/scenario-audit/audit.ts. Avoids Vite barrels.
import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { computeGrammarCoverage, type GrammarCoverage } from "~/english/grammar-coverage";
import { COVERAGE_WAIVERS } from "~/english/data/egp/waivers";
import type { EgpEntry } from "~/english/data/egp/types";
import type { GrammarTopic } from "~/english/grammar-types";

export function gateExitCode(cov: GrammarCoverage): number {
  return cov.missingTotal > 0 ? 1 : 0;
}

export function renderReport(cov: GrammarCoverage): string {
  let r = `# Grammar coverage (EGP)\n\nOverall: ${cov.overallPct}% | missing: ${cov.missingTotal}\n\n`;
  r += `| band | covered | waived | total | pct |\n|---|---|---|---|---|\n`;
  for (const b of cov.bands) r += `| ${b.cefr} | ${b.covered} | ${b.waived} | ${b.total} | ${b.pct}% |\n`;
  const gaps = cov.bands.filter((b) => b.missing.length);
  if (gaps.length) {
    r += `\n## Missing areas\n`;
    for (const b of gaps) r += `\n**${b.cefr}** (${b.missing.length}):\n${b.missing.map((m) => `- ${m}`).join("\n")}\n`;
  }
  return r;
}

async function loadKeyed<T>(dir: string, exclude: RegExp, key: "topic" | "entries"): Promise<T[]> {
  const files = readdirSync(dir).filter((f) => /\.ts$/.test(f) && !exclude.test(f) && !f.includes(".test."));
  const out: T[] = [];
  for (const f of files) {
    const mod = (await import(join(dir, f))) as Record<string, unknown>;
    const v = mod[key];
    if (Array.isArray(v)) out.push(...(v as T[]));
    else if (v) out.push(v as T);
  }
  return out;
}

async function main(): Promise<void> {
  const root = resolve(import.meta.dir, "../..");
  const topics = await loadKeyed<GrammarTopic>(
    join(root, "src/english/data/grammar"), /(index|families)\.ts$/, "topic",
  );
  const inventory = await loadKeyed<EgpEntry>(
    join(root, "src/english/data/egp"), /(index|types|waivers)\.ts$/, "entries",
  );
  const cov = computeGrammarCoverage(topics, inventory, COVERAGE_WAIVERS);
  const report = renderReport(cov);
  console.log(report);
  const distDir = join(root, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(join(distDir, "coverage-report.json"), JSON.stringify(cov, null, 2));
  if (process.argv.includes("--gate")) {
    const code = gateExitCode(cov);
    if (code) console.error(`coverage gate: ${cov.missingTotal} area(s) uncovered and un-waived.`);
    else console.log("coverage gate: OK — every band covered or waived.");
    process.exit(code);
  }
}

if (import.meta.main) main();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test scripts/coverage-audit/audit.test.ts`
Expected: PASS (4 tests). The `import.meta.main` guard keeps `main()` from running during the vitest import.

- [ ] **Step 6: Wire the package script**

In `site/package.json`, add to `scripts` (next to `audit:scenario`):

```json
    "audit:coverage": "bun scripts/coverage-audit/audit.ts",
```

- [ ] **Step 7: Commit**

```bash
git add site/src/english/data/egp/waivers.ts site/scripts/coverage-audit/audit.ts site/scripts/coverage-audit/audit.test.ts site/package.json
git commit -m "feat(english): coverage audit gate + report + audit:coverage script"
```

---

### Task 7: Run the audit, close gaps, gate green

**Files:** `site/src/english/data/egp/waivers.ts` and/or new topic modules, as gaps demand.

- [ ] **Step 1: Run the audit (no gate) and read the report**

Run: `bun run audit:coverage`
Expected: a per-band table + a "Missing areas" list (likely small — the 122-topic corpus is broad).

- [ ] **Step 2: Resolve each missing area** (choose per area)

For each id in "Missing areas":
- **Re-tag** — if an existing topic actually teaches it but wasn't tagged, add the id to that topic's `egp[]` by writing/adjusting its `egp-patches/<id>.json` and re-running `bun scripts/coverage-audit/apply-egp.ts`.
- **Auto-author** — if no topic covers it and it deserves a topic, author a new `GrammarTopic` skeleton + authoring patch (reuse the Phase-1 import + authoring flow for that one id) so the corpus grows past 122, then tag it.
- **Waive** — if the area is genuinely out of scope (archaic/marginal), add to `COVERAGE_WAIVERS` with an explicit bilingual rationale:

```ts
export const COVERAGE_WAIVERS: Waiver[] = [
  { id: "egp.c2.verbs.subjunctive-were-archaic", rationale: { en: "Marginal/literary; out of the working syllabus.", ru: "Маргинальная/литературная форма; вне рабочей программы." } },
];
```

- [ ] **Step 3: Re-run the gate until green**

Run: `bun run audit:coverage --gate`
Expected: `coverage gate: OK — every band covered or waived.` (exit 0). Loop Step 2 until green.

- [ ] **Step 4: Commit gap resolutions**

```bash
git add site/src/english/data/egp/ site/src/english/data/grammar/
git commit -m "content(english): close EGP coverage gaps (re-tag/author/waive); gate green"
```

---

### Task 8: Full suite + build green

**Files:** none (verification only)

- [ ] **Step 1: Run the whole English + coverage-audit suite**

Run: `bun run test src/english scripts/grammar-import scripts/coverage-audit`
Expected: PASS — types, inventory, coverage core, apply-egp, audit gate all green.

- [ ] **Step 2: Production build + coverage gate**

Run: `bun run build && bun run audit:coverage --gate`
Expected: build completes (lint clean; `dist/coverage-report.json` written), then coverage gate exits 0.

- [ ] **Step 3: Commit any build-surfaced fixes**

```bash
git add -A
git commit -m "chore(english): grammar coverage — suite + build + gate green"
```

---

## Self-Review

**Spec coverage (Phase 2 = spec §7):**
- `data/egp/inventory.ts` (EGP inventory, CEFR-mapped, typed) → Tasks 1–3 (as per-band modules + barrel) ✓
- `audit:coverage --gate` maps egp→inventory, per-band covered/missing → Tasks 4, 6 ✓
- Gaps resolved by auto-author OR `coverage-waivers.ts` → Task 7 (+ `waivers.ts` Task 6) ✓
- Report to `dist/coverage-report.json` (mirrors `lint-report.json`) → Task 6 ✓
- Modules: UI surfaces (§8), engine (§5), animations (§4), BYOK, design prompt → **out of scope**, separate phase plans.

**Placeholder scan:** every code step has complete code. Tasks 3 and 5 Step 6 are content authoring with exact module/patch shapes + guardrails + a green gate (inventory test / apply-egp), not "TODO". Task 7 is gap triage with the three concrete resolution recipes shown.

**Type consistency:** `EgpEntry`/`EgpCategory`/`makeEgpId` (Task 1) used in Tasks 2,3,4,5,6. `EGP_INVENTORY`/`egpById` barrel (Task 2) used by vitest only; bun scripts load band modules by path (Tasks 5,6). `computeGrammarCoverage`/`Waiver`/`GrammarCoverage` (Task 4) used in Task 6. `applyEgp` (Task 5) is pure; `serializeTopic` reused from Phase 1. `gateExitCode`/`renderReport` (Task 6) tested in isolation; `main()` guarded by `import.meta.main`.

**Note for executor:** the inventory (Task 3) is authored as an HONEST yardstick (canonical syllabus per band, independent of the corpus) so that Task 7 surfaces REAL gaps. Do not author the inventory to merely mirror existing topic tags.
