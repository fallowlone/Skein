# `/assess` Deep Skill Audit Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/assess` — an audit that measures each concept along three facets (recognition / mechanism / production) as an ordinal posterior, so "strong React, weak Nest" and "does it but cannot explain it" are representable, and prove the measurement is accurate with a simulation gate in CI.

**Architecture:** A pure functional core in `site/src/scripts/assess/` (no DOM, no storage, no `Date.now()` inside the math) wrapped by one Preact island. Items are harvested from the existing 8096 practice tasks at build time into `src/content/path/assess-items.json`. Deterministic graders reuse `practice-grade.ts` and the QuickJS runner; the BYOK LLM layer is additive and optional. Results collapse into the existing `KnowledgeState` and `/review` card store.

**Tech Stack:** TypeScript, Preact islands, Astro 5, Vitest (`bun run test`), Playwright (`bunx playwright test`), existing `scripts/path/bayes.ts` for 3PL primitives, `quickjs-emscripten` for code execution.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-assessment-engine-design.md`. Every requirement there is in force.
- Pure core: nothing under `src/scripts/assess/` may import `path-io.ts`, touch `localStorage`, or call `Date.now()` — timestamps are passed in as parameters. Same discipline as `src/scripts/path/`.
- Bilingual: every user-visible string exists in `en` and `ru`. No exceptions.
- `dont_know` must be strictly gentler than `wrong` and strictly harsher than `partial`, at every level. Unit-tested.
- Untested never becomes a gap. A concept with no evidence is reported as `untested`, and writes nothing to `KnowledgeState`.
- A practice task with status `done` for that learner is **burned** and must never be selected.
- Run tests with `bun run test` from `site/` (NOT `bun test` — that runs the wrong runner). Lint with `bun run lint:src`.
- Never run a full `bun run build` locally — it OOMs on this content volume. Gate on `bun run test` + `bun run lint:src` + a dev-server render check.
- File size: keep each module under ~200 lines. If a module grows past that, it is doing two jobs.

---

## File Structure

**New pure core** — `site/src/scripts/assess/`

| File | Responsibility |
|---|---|
| `types.ts` | `Level`, `Facet`, `ItemKind`, `Outcome`, `AssessItem`, `Evidence`, `Cell`, `AssessState` |
| `ordinal.ts` | Posterior algebra over 4 ordered levels: normalise, entropy, expected level, band label with ± |
| `likelihood.ts` | `P(response \| level)` from item kind, band, hints, outcome; facet alignment damping |
| `update.ts` | Bayes update of a cell; ordinal propagation across the concept DAG |
| `select.ts` | Expected-information-gain item selection, fatigue and facet-rotation rules, block budget |
| `item-pool.ts` | Load the built item index, apply burn/weight rules, answer "what can I ask about X" |
| `verdict.ts` | Facet vector → band + confidence; `untested` handling |
| `patterns.ts` | Named patterns (term-without-mechanism, does-without-explaining, fragile, declined) |
| `report.ts` | Assemble the report model (per-concept rows, top gaps, hidden strengths) |
| `retest.ts` | Evidence → verbatim re-test prompts → `CardSeed`s |
| `session.ts` | Pure block/session reducer (state in, action in, new state out) |
| `simulate.ts` | Test-only virtual learners + accuracy metrics |
| `graders/index.ts` | Deterministic grader dispatch returning `{ outcome, failureNote? }` |

**New build script** — `site/scripts/path/build-assess-items.mjs` → `src/content/path/assess-items.json` + `assess-coverage.json`.

**New storage adapter** — `site/src/scripts/assess-io.ts` (the only file allowed to touch `localStorage` for assessment; mirrors `review-state.ts`).

**New UI** — `site/src/components/assess/`: `AssessFlow.tsx`, `ScopePicker.tsx`, `ItemView.tsx`, `HintLadder.tsx`, `BlockVerdict.tsx`, `AssessReport.tsx`. Route `site/src/pages/[lang]/assess.astro`. Styles `site/src/styles/assess-screen.css`.

**Modified** — `scripts/path/types.ts` (`Source` += `"assess"`), `scripts/review-state.ts` (`CardSource` += `"assess"`), `src/i18n/ui.json`, `site/package.json` (build step), `src/components/atlas/TopNav.astro` (nav entry).

---

## Task 1: Ordinal posterior algebra

**Files:**
- Create: `site/src/scripts/assess/types.ts`
- Create: `site/src/scripts/assess/ordinal.ts`
- Test: `site/src/scripts/assess/ordinal.test.ts`

**Interfaces:**
- Consumes: `Band` from `~/components/atlas/track-band`.
- Produces: `LEVELS`, `Level`, `Posterior`, `FACETS`, `Facet`, `ItemKind`, `Outcome`, `AssessResponse`, `AssessItem`, `Evidence`, `Cell`; `uniform()`, `normalize(v)`, `entropyOrd(p)`, `expectedLevel(p)`, `bandLabel(p)`, `priorFromBand(band, facet)`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/ordinal.test.ts
import { describe, expect, test } from "vitest";
import { uniform, normalize, entropyOrd, expectedLevel, bandLabel, priorFromBand } from "./ordinal";

describe("ordinal posterior", () => {
  test("uniform is normalised and maximally uncertain", () => {
    const u = uniform();
    expect(u.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(entropyOrd(u)).toBeCloseTo(1); // normalised to [0,1]
  });

  test("a certain posterior has zero entropy", () => {
    expect(entropyOrd(normalize([0, 0, 1, 0]))).toBeCloseTo(0);
  });

  test("expectedLevel sits between the two levels carrying the mass", () => {
    expect(expectedLevel(normalize([0, 1, 1, 0]))).toBeCloseTo(1.5);
  });

  test("bandLabel qualifies with + when mass leans to the next level up", () => {
    const p = normalize([0, 7, 3, 0]); // junior-heavy, leaning middle
    const l = bandLabel(p);
    expect(l.level).toBe("junior");
    expect(l.qualifier).toBe("+");
  });

  test("bandLabel qualifies with - when mass leans down", () => {
    const l = bandLabel(normalize([3, 7, 0, 0]));
    expect(l.level).toBe("junior");
    expect(l.qualifier).toBe("-");
  });

  test("production starts strictly below recognition for the same band", () => {
    const rec = expectedLevel(priorFromBand("surface", "recognition"));
    const prod = expectedLevel(priorFromBand("surface", "production"));
    expect(prod).toBeLessThan(rec);
  });

  test("an advanced concept has more prior mass on gap than a foundations one", () => {
    expect(priorFromBand("advanced", "mechanism")[0]).toBeGreaterThan(
      priorFromBand("foundations", "mechanism")[0],
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/ordinal.test.ts`
Expected: FAIL — `Failed to resolve import "./ordinal"`.

- [ ] **Step 3: Write the types**

```ts
// site/src/scripts/assess/types.ts
// Shared vocabulary for the audit engine. Pure types only — no runtime imports beyond Band.
import type { Band } from "~/components/atlas/track-band";

export type { Band };

/** Ordered ability levels. Index order is meaningful: comparisons and the ± qualifier rely on it. */
export const LEVELS = ["gap", "junior", "middle", "senior"] as const;
export type Level = (typeof LEVELS)[number];

/** Probability mass over LEVELS, in LEVELS order. Always normalised to sum 1. */
export type Posterior = readonly [number, number, number, number];

/**
 * What is being measured. Not nested: production without mechanism is a real state
 * ("copies the pattern, cannot explain it") and the report names it rather than averaging.
 */
export const FACETS = ["recognition", "mechanism", "production"] as const;
export type Facet = (typeof FACETS)[number];

export type ItemKind = "mcq" | "predict" | "debug" | "review" | "exec" | "explain";

export type Outcome = "correct" | "partial" | "wrong" | "dont_know";

export interface AssessResponse {
  outcome: Outcome;
  hintsUsed: 0 | 1 | 2;
  /** Recorded for the report only — deliberately NOT an input to the likelihood (spec §11). */
  elapsedMs: number;
}

export interface AssessItem {
  /** Stable id: `${lessonKey}#${taskId}`. */
  id: string;
  lessonKey: string;
  taskId: string;
  kind: ItemKind;
  /** The facet this item's likelihood targets. Other facets get damped evidence. */
  facet: Facet;
  band: Band;
  /** Concepts this item speaks to. Multi-concept attribution is handled by `weight`. */
  concepts: string[];
  /** 1 / number-of-attributed-concepts, times any contamination discount. */
  weight: number;
  estMin: number;
}

export interface Evidence {
  conceptId: string;
  facet: Facet;
  itemId: string;
  /** Carried so a re-test card can point back at the lesson the item came from. */
  lessonKey: string;
  kind: ItemKind;
  band: Band;
  response: AssessResponse;
  /** What the learner actually chose or wrote, truncated to 240 chars for the report. */
  answerDigest: string;
  /** Grader-supplied specifics, e.g. "map keyed on target - nums[i] instead of nums[i]". */
  failureNote?: string;
  atMs: number;
}

export interface Cell {
  conceptId: string;
  facet: Facet;
  posterior: Posterior;
  items: number;
  evidence: Evidence[];
}

export type CellKey = `${string}::${Facet}`;
export const cellKey = (conceptId: string, facet: Facet): CellKey => `${conceptId}::${facet}`;
```

- [ ] **Step 4: Write the ordinal algebra**

```ts
// site/src/scripts/assess/ordinal.ts
// Posterior algebra over the four ordered levels. Pure; no I/O.
import { LEVELS, type Band, type Facet, type Level, type Posterior } from "./types";

const N = LEVELS.length;

export const uniform = (): Posterior => [0.25, 0.25, 0.25, 0.25];

export function normalize(v: readonly number[]): Posterior {
  const safe = v.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const sum = safe.reduce((a, b) => a + b, 0);
  if (sum <= 0) return uniform();
  return [safe[0] / sum, safe[1] / sum, safe[2] / sum, safe[3] / sum];
}

/** Shannon entropy normalised to [0,1] so thresholds read the same whatever N is. */
export function entropyOrd(p: Posterior): number {
  let h = 0;
  for (const x of p) if (x > 0) h -= x * Math.log2(x);
  return h / Math.log2(N);
}

/** Mass-weighted index over LEVELS: 0 = certainly gap, 3 = certainly senior. */
export function expectedLevel(p: Posterior): number {
  return p.reduce((acc, x, i) => acc + x * i, 0);
}

export interface BandLabel {
  level: Level;
  /** "-" / "" / "+" — where the mass leans relative to the modal level. */
  qualifier: "-" | "" | "+";
  /** Mass on the modal level: how sure we are of the label itself. */
  confidence: number;
}

export function bandLabel(p: Posterior): BandLabel {
  let mode = 0;
  for (let i = 1; i < N; i++) if (p[i] > p[mode]) mode = i;
  const below = mode > 0 ? p[mode - 1] : 0;
  const above = mode < N - 1 ? p[mode + 1] : 0;
  const LEAN = 0.15; // a lean smaller than this is noise, not a qualifier
  const qualifier = above - below > LEAN ? "+" : below - above > LEAN ? "-" : "";
  return { level: LEVELS[mode], qualifier, confidence: p[mode] };
}

// Prior mass by concept band. Harder bands start with more mass on `gap`.
const BAND_PRIOR: Record<Band, Posterior> = {
  foundations: [0.20, 0.35, 0.30, 0.15],
  surface:     [0.30, 0.35, 0.25, 0.10],
  middle:      [0.45, 0.30, 0.18, 0.07],
  advanced:    [0.60, 0.25, 0.11, 0.04],
};

// Recognising a term is strictly easier than producing working code, so the facets do
// not start equal. Weights multiply the prior and are renormalised.
const FACET_TILT: Record<Facet, Posterior> = {
  recognition: [0.8, 1.1, 1.1, 1.0],
  mechanism:   [1.0, 1.0, 1.0, 1.0],
  production:  [1.3, 1.0, 0.8, 0.7],
};

export function priorFromBand(band: Band, facet: Facet): Posterior {
  const base = BAND_PRIOR[band];
  const tilt = FACET_TILT[facet];
  return normalize([base[0] * tilt[0], base[1] * tilt[1], base[2] * tilt[2], base[3] * tilt[3]]);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/ordinal.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add site/src/scripts/assess/types.ts site/src/scripts/assess/ordinal.ts site/src/scripts/assess/ordinal.test.ts
git commit -m "feat(assess): ordinal posterior algebra over four ability levels"
```

---

## Task 2: Likelihood — hints, honesty, facet alignment

**Files:**
- Create: `site/src/scripts/assess/likelihood.ts`
- Test: `site/src/scripts/assess/likelihood.test.ts`

**Interfaces:**
- Consumes: `AssessItem`, `AssessResponse`, `Facet`, `Posterior`, `Level` from `./types`; `normalize` from `./ordinal`.
- Produces: `LEVEL_THETA`, `FACET_ALIGN`, `pCorrect(level, band, hintsUsed)`, `likelihoodVector(item, response, targetFacet): Posterior`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/likelihood.test.ts
import { describe, expect, test } from "vitest";
import { likelihoodVector, pCorrect } from "./likelihood";
import type { AssessItem, AssessResponse } from "./types";

const item = (over: Partial<AssessItem> = {}): AssessItem => ({
  id: "l#t", lessonKey: "l", taskId: "t", kind: "exec", facet: "production",
  band: "surface", concepts: ["c"], weight: 1, estMin: 5, ...over,
});
const res = (over: Partial<AssessResponse> = {}): AssessResponse =>
  ({ outcome: "correct", hintsUsed: 0, elapsedMs: 1000, ...over });

// Likelihood ratio between "senior" and "gap": how much this response argues for ability.
const llr = (v: readonly number[]) => v[3] / Math.max(v[0], 1e-9);

describe("likelihood", () => {
  test("a higher level is likelier to answer correctly", () => {
    expect(pCorrect("senior", "surface", 0)).toBeGreaterThan(pCorrect("junior", "surface", 0));
    expect(pCorrect("junior", "surface", 0)).toBeGreaterThan(pCorrect("gap", "surface", 0));
  });

  test("a harder item is answered correctly less often at the same level", () => {
    expect(pCorrect("middle", "advanced", 0)).toBeLessThan(pCorrect("middle", "foundations", 0));
  });

  test("each hint weakens the evidence a correct answer carries", () => {
    const none = llr(likelihoodVector(item(), res({ hintsUsed: 0 }), "production"));
    const one = llr(likelihoodVector(item(), res({ hintsUsed: 1 }), "production"));
    const two = llr(likelihoodVector(item(), res({ hintsUsed: 2 }), "production"));
    expect(one).toBeLessThan(none);
    expect(two).toBeLessThan(one);
  });

  test("hints never make a correct answer worse than a wrong one", () => {
    const hinted = llr(likelihoodVector(item(), res({ hintsUsed: 2 }), "production"));
    const wrong = llr(likelihoodVector(item(), res({ outcome: "wrong" }), "production"));
    expect(hinted).toBeGreaterThan(wrong);
  });

  test("dont_know is gentler than wrong and harsher than partial", () => {
    const dk = llr(likelihoodVector(item(), res({ outcome: "dont_know" }), "production"));
    const wrong = llr(likelihoodVector(item(), res({ outcome: "wrong" }), "production"));
    const partial = llr(likelihoodVector(item(), res({ outcome: "partial" }), "production"));
    expect(dk).toBeGreaterThan(wrong);
    expect(dk).toBeLessThan(partial);
  });

  test("evidence for a non-primary facet is damped and never certifies it", () => {
    const own = llr(likelihoodVector(item({ kind: "mcq", facet: "recognition" }), res(), "recognition"));
    const other = llr(likelihoodVector(item({ kind: "mcq", facet: "recognition" }), res(), "production"));
    expect(other).toBeLessThan(own);
    expect(other).toBeLessThan(1.6); // an MCQ can never argue strongly for production skill
  });

  test("every vector is a normalised distribution", () => {
    for (const outcome of ["correct", "partial", "wrong", "dont_know"] as const) {
      const v = likelihoodVector(item(), res({ outcome }), "production");
      expect(v.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/likelihood.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/assess/likelihood.ts
// P(response | level) for one item, as an unnormalised-then-normalised vector over LEVELS.
// Built from three multipliers (spec §4.2): item-facet alignment, item difficulty, hint ladder.
import { normalize } from "./ordinal";
import { LEVELS, type AssessItem, type AssessResponse, type Band, type Facet, type ItemKind, type Level, type Posterior } from "./types";

/** Ability on the logit scale, one notch per level. */
export const LEVEL_THETA: Record<Level, number> = { gap: -1.5, junior: -0.5, middle: 0.5, senior: 1.5 };

/** Item difficulty on the same scale. Mirrors BAND_DIFFICULTY in scripts/path/bayes.ts. */
const BAND_B: Record<Band, number> = { foundations: -1.0, surface: 0, middle: 0.8, advanced: 1.6 };

/** Guess floor: an MCQ can be right by luck; writing working code cannot. */
const GUESS: Record<ItemKind, number> = { mcq: 0.25, predict: 0.10, review: 0.15, debug: 0.05, exec: 0.02, explain: 0.05 };

const DISCRIMINATION = 1.2;

/**
 * How much an item of kind K informs facet F. The diagonal is 1; everything else is capped
 * at 0.25 so a cheap item can never certify an expensive skill (spec §4.2a).
 */
export const FACET_ALIGN: Record<ItemKind, Record<Facet, number>> = {
  mcq:     { recognition: 1.0, mechanism: 0.20, production: 0.05 },
  predict: { recognition: 0.25, mechanism: 1.0, production: 0.15 },
  debug:   { recognition: 0.15, mechanism: 1.0, production: 0.25 },
  review:  { recognition: 0.20, mechanism: 1.0, production: 0.10 },
  exec:    { recognition: 0.10, mechanism: 0.25, production: 1.0 },
  explain: { recognition: 0.25, mechanism: 1.0, production: 0.05 },
};

/** Each hint makes the item effectively easier, so being right proves less. */
const HINT_STEP = 0.9;

/** P(correct | level) under a 3PL curve with the hint-adjusted difficulty. */
export function pCorrect(level: Level, band: Band, hintsUsed: number, kind: ItemKind = "exec"): number {
  const b = BAND_B[band] - HINT_STEP * hintsUsed;
  const c = GUESS[kind];
  const z = DISCRIMINATION * (LEVEL_THETA[level] - b);
  return c + (1 - c) / (1 + Math.exp(-z));
}

// A knower occasionally says "don't know"; a non-knower says it often rather than guessing.
// Same constants as scripts/path/bayes.ts, kept in sync deliberately.
const PDK_KNOWN = 0.04;
const PDK_UNKNOWN = 0.55;

/** Three-category base likelihoods at one level; they sum to 1 by construction. */
function categories(p: number): { correct: number; wrong: number; dont_know: number } {
  return {
    correct: p * (1 - PDK_KNOWN),
    dont_know: p * PDK_KNOWN + (1 - p) * PDK_UNKNOWN,
    wrong: (1 - p) * (1 - PDK_UNKNOWN),
  };
}

/**
 * `partial` sits between correct and wrong — geometric mean, which keeps it strictly
 * between the two in likelihood-ratio terms whatever the level.
 */
function rawLikelihood(outcome: AssessResponse["outcome"], p: number): number {
  const c = categories(p);
  if (outcome === "correct") return c.correct;
  if (outcome === "wrong") return c.wrong;
  if (outcome === "dont_know") return c.dont_know;
  return Math.sqrt(c.correct * c.wrong);
}

/**
 * Damping applied to the log-likelihood ratio. Below 1 flattens the evidence:
 *  - cross-facet leakage uses FACET_ALIGN;
 *  - an honest "don't know" is attenuated so it is gentler than a wrong answer (spec §4.2).
 */
const DK_ATTENUATION = 0.6;

export function likelihoodVector(item: AssessItem, response: AssessResponse, targetFacet: Facet): Posterior {
  const align = FACET_ALIGN[item.kind][targetFacet];
  const damp = align * (response.outcome === "dont_know" ? DK_ATTENUATION : 1);
  const raw = LEVELS.map((level) =>
    rawLikelihood(response.outcome, pCorrect(level, item.band, response.hintsUsed, item.kind)),
  );
  // Flatten toward uniform by raising to a power ≤ 1: damp=1 keeps the evidence intact,
  // damp→0 makes the response uninformative.
  return normalize(raw.map((x) => Math.pow(x, damp)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/likelihood.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/assess/likelihood.ts site/src/scripts/assess/likelihood.test.ts
git commit -m "feat(assess): response likelihood with hint ladder and honest dont-know"
```

---

## Task 3: Cell update and DAG propagation

**Files:**
- Create: `site/src/scripts/assess/update.ts`
- Test: `site/src/scripts/assess/update.test.ts`

**Interfaces:**
- Consumes: `likelihoodVector` (Task 2), `normalize`/`priorFromBand`/`expectedLevel` (Task 1), `ConceptGraph`/`ancestors` from `~/scripts/path/graph`.
- Produces: `emptyCell(conceptId, facet, band)`, `applyResponse(cells, item, response, bandOf, atMs)`, `propagate(cells, graph, conceptId, facet, bandOf)`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/update.test.ts
import { describe, expect, test } from "vitest";
import { applyResponse, emptyCell, propagate } from "./update";
import { expectedLevel } from "./ordinal";
import { cellKey, type AssessItem, type Band, type Cell, type CellKey } from "./types";

const bandOf = (): Band => "surface";
const item: AssessItem = {
  id: "l#t", lessonKey: "l", taskId: "t", kind: "exec", facet: "production",
  band: "surface", concepts: ["promises"], weight: 1, estMin: 5,
};
const seed = (): Map<CellKey, Cell> =>
  new Map([[cellKey("promises", "production"), emptyCell("promises", "production", "surface")]]);

describe("applyResponse", () => {
  test("a correct unaided answer raises the expected level", () => {
    const before = seed();
    const after = applyResponse(before, item, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    const b = before.get(cellKey("promises", "production"))!;
    const a = after.get(cellKey("promises", "production"))!;
    expect(expectedLevel(a.posterior)).toBeGreaterThan(expectedLevel(b.posterior));
  });

  test("the input map is not mutated", () => {
    const before = seed();
    const snapshot = before.get(cellKey("promises", "production"))!.posterior;
    applyResponse(before, item, { outcome: "wrong", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(before.get(cellKey("promises", "production"))!.posterior).toBe(snapshot);
  });

  test("evidence is appended with the item and the response", () => {
    const after = applyResponse(seed(), item, { outcome: "partial", hintsUsed: 1, elapsedMs: 10 }, bandOf, 42);
    const cell = after.get(cellKey("promises", "production"))!;
    expect(cell.items).toBe(1);
    expect(cell.evidence).toHaveLength(1);
    expect(cell.evidence[0]).toMatchObject({ itemId: "l#t", atMs: 42, facet: "production" });
  });

  test("a multi-concept item creates a cell per attributed concept", () => {
    const multi = { ...item, concepts: ["promises", "event-loop"], weight: 0.5 };
    const after = applyResponse(new Map(), multi, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(after.has(cellKey("promises", "production"))).toBe(true);
    expect(after.has(cellKey("event-loop", "production"))).toBe(true);
  });

  test("a half-weight item moves the posterior less than a full-weight one", () => {
    const full = applyResponse(seed(), item, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    const half = applyResponse(seed(), { ...item, weight: 0.5 }, { outcome: "correct", hintsUsed: 0, elapsedMs: 10 }, bandOf, 1);
    expect(expectedLevel(full.get(cellKey("promises", "production"))!.posterior))
      .toBeGreaterThan(expectedLevel(half.get(cellKey("promises", "production"))!.posterior));
  });
});

describe("propagate", () => {
  const graph = {
    byId: new Map([
      ["async-await", { id: "async-await", label: { en: "", ru: "" }, track: "backend", band: "surface", requires: ["promises"] }],
      ["promises", { id: "promises", label: { en: "", ru: "" }, track: "backend", band: "surface", requires: [] }],
    ]),
  } as unknown as Parameters<typeof propagate>[1];

  test("strong production evidence flows down to prerequisites", () => {
    let cells = new Map([[cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")]]);
    for (let i = 0; i < 3; i++) {
      cells = applyResponse(cells, { ...item, concepts: ["async-await"] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    const after = propagate(cells, graph, "async-await", "production", bandOf);
    const prereq = after.get(cellKey("promises", "production"));
    expect(prereq).toBeDefined();
    expect(expectedLevel(prereq!.posterior)).toBeGreaterThan(expectedLevel(emptyCell("promises", "production", "surface").posterior));
  });

  test("recognition evidence does NOT propagate — knowing a term says nothing about its prerequisites", () => {
    let cells = new Map([[cellKey("async-await", "recognition"), emptyCell("async-await", "recognition", "surface")]]);
    cells = applyResponse(cells, { ...item, kind: "mcq", facet: "recognition", concepts: ["async-await"] },
      { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const after = propagate(cells, graph, "async-await", "recognition", bandOf);
    expect(after.has(cellKey("promises", "recognition"))).toBe(false);
  });

  test("propagated evidence never overwrites a directly measured cell", () => {
    let cells = new Map([
      [cellKey("async-await", "production"), emptyCell("async-await", "production", "surface")],
      [cellKey("promises", "production"), emptyCell("promises", "production", "surface")],
    ]);
    cells = applyResponse(cells, { ...item, concepts: ["promises"] }, { outcome: "wrong", hintsUsed: 0, elapsedMs: 5 }, bandOf, 1);
    const measured = cells.get(cellKey("promises", "production"))!.posterior;
    for (let i = 0; i < 3; i++) {
      cells = applyResponse(cells, { ...item, concepts: ["async-await"] }, { outcome: "correct", hintsUsed: 0, elapsedMs: 5 }, bandOf, i);
    }
    const after = propagate(cells, graph, "async-await", "production", bandOf);
    expect(after.get(cellKey("promises", "production"))!.posterior).toEqual(measured);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/update.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/assess/update.ts
// Bayes update of one cell + ordinal propagation across the concept DAG. Pure.
import type { ConceptGraph } from "~/scripts/path/graph";
import { likelihoodVector } from "./likelihood";
import { expectedLevel, normalize, priorFromBand } from "./ordinal";
import { cellKey, type AssessItem, type AssessResponse, type Band, type Cell, type CellKey, type Facet, type Posterior } from "./types";

export function emptyCell(conceptId: string, facet: Facet, band: Band): Cell {
  return { conceptId, facet, posterior: priorFromBand(band, facet), items: 0, evidence: [] };
}

const DIGEST_MAX = 240;
const digest = (s: string) => (s.length > DIGEST_MAX ? s.slice(0, DIGEST_MAX) + "…" : s);

export interface ResponseMeta {
  answerDigest?: string;
  failureNote?: string;
}

/**
 * Apply one response to every (concept, facet) cell it speaks to. Returns a NEW map —
 * callers hold the previous state for undo and for the report's before/after.
 */
export function applyResponse(
  cells: ReadonlyMap<CellKey, Cell>,
  item: AssessItem,
  response: AssessResponse,
  bandOf: (conceptId: string) => Band,
  atMs: number,
  meta: ResponseMeta = {},
): Map<CellKey, Cell> {
  const next = new Map(cells);
  for (const conceptId of item.concepts) {
    for (const facet of ["recognition", "mechanism", "production"] as const) {
      const key = cellKey(conceptId, facet);
      const prior = next.get(key) ?? emptyCell(conceptId, facet, bandOf(conceptId));
      const lik = likelihoodVector(item, response, facet);
      // item.weight < 1 (multi-concept attribution or a partly-contaminated item) flattens
      // the evidence the same way cross-facet damping does.
      const w = Math.max(0, Math.min(1, item.weight));
      const posterior = normalize(
        prior.posterior.map((p, i) => p * Math.pow(lik[i], w)),
      );
      const isTarget = facet === item.facet;
      next.set(key, {
        ...prior,
        posterior,
        items: prior.items + (isTarget ? 1 : 0),
        evidence: isTarget
          ? [...prior.evidence, {
              conceptId, facet, itemId: item.id, lessonKey: item.lessonKey, kind: item.kind, band: item.band,
              response, answerDigest: digest(meta.answerDigest ?? ""), failureNote: meta.failureNote, atMs,
            }]
          : prior.evidence,
      });
    }
  }
  return next;
}

/** Below this mass on the top two levels there is nothing worth propagating. */
const PROPAGATE_MIN_LEVEL = 1.8;
/** Propagated evidence is a rumour, not a measurement — it moves a prior by at most this. */
const PROPAGATE_DAMP = 0.35;

/**
 * Push a settled result to prerequisites. Only mechanism and production propagate:
 * recognising a term says nothing about the machinery underneath it (spec §4.3).
 * Cells with their own evidence are never overwritten.
 */
export function propagate(
  cells: ReadonlyMap<CellKey, Cell>,
  graph: ConceptGraph,
  conceptId: string,
  facet: Facet,
  bandOf: (conceptId: string) => Band,
): Map<CellKey, Cell> {
  const next = new Map(cells);
  if (facet === "recognition") return next;

  const source = next.get(cellKey(conceptId, facet));
  if (!source || source.items === 0) return next;
  const level = expectedLevel(source.posterior);
  if (level < PROPAGATE_MIN_LEVEL) return next;

  const node = graph.byId.get(conceptId);
  for (const prereqId of node?.requires ?? []) {
    const key = cellKey(prereqId, facet);
    const existing = next.get(key);
    if (existing && existing.evidence.length > 0) continue; // measured beats inferred
    const base = existing ?? emptyCell(prereqId, facet, bandOf(prereqId));
    next.set(key, { ...base, posterior: blendToward(base.posterior, source.posterior, PROPAGATE_DAMP) });
  }
  return next;
}

function blendToward(base: Posterior, toward: Posterior, weight: number): Posterior {
  return normalize(base.map((p, i) => p * (1 - weight) + toward[i] * weight));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/update.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/assess/update.ts site/src/scripts/assess/update.test.ts
git commit -m "feat(assess): cell update with weighted evidence and prerequisite propagation"
```

---

## Task 4: Verdict and named patterns

**Files:**
- Create: `site/src/scripts/assess/verdict.ts`
- Create: `site/src/scripts/assess/patterns.ts`
- Test: `site/src/scripts/assess/verdict.test.ts`

**Interfaces:**
- Consumes: `Cell`, `Facet`, `bandLabel`, `expectedLevel`.
- Produces: `conceptVerdict(cells, conceptId): ConceptVerdict`, `SETTLE_ENTROPY`, `MAX_ITEMS_PER_CELL`, `isSettled(cell)`; `detectPatterns(v): PatternId[]`, `PATTERN_LABELS`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/verdict.test.ts
import { describe, expect, test } from "vitest";
import { conceptVerdict, isSettled } from "./verdict";
import { detectPatterns } from "./patterns";
import { emptyCell } from "./update";
import { cellKey, type Cell, type CellKey, type Facet, type Posterior } from "./types";

const cellWith = (facet: Facet, posterior: Posterior, items = 2): Cell => ({
  ...emptyCell("c", facet, "surface"), posterior, items,
  evidence: Array.from({ length: items }, (_, i) => ({
    conceptId: "c", facet, itemId: `i${i}`, kind: "exec" as const, band: "surface" as const,
    response: { outcome: "correct" as const, hintsUsed: 0 as const, elapsedMs: 1 },
    answerDigest: "", atMs: i,
  })),
});

const mk = (entries: [Facet, Posterior][]): Map<CellKey, Cell> =>
  new Map(entries.map(([f, p]) => [cellKey("c", f), cellWith(f, p)]));

describe("conceptVerdict", () => {
  test("an unmeasured concept is untested, not a gap", () => {
    const v = conceptVerdict(new Map(), "c");
    expect(v.status).toBe("untested");
    expect(v.band).toBeNull();
  });

  test("the band is the minimum across MEASURED facets", () => {
    const v = conceptVerdict(mk([
      ["recognition", [0, 0, 0.1, 0.9]],
      ["production", [0.8, 0.2, 0, 0]],
    ]), "c");
    expect(v.band?.level).toBe("gap");
  });

  test("an unmeasured facet does not drag the band down", () => {
    const v = conceptVerdict(mk([["mechanism", [0, 0, 0.2, 0.8]]]), "c");
    expect(v.band?.level).toBe("senior");
    expect(v.facets.production.status).toBe("untested");
  });

  test("a cell reached only with hints is flagged fragile", () => {
    const cells = mk([["mechanism", [0, 0.2, 0.7, 0.1]]]);
    const cell = cells.get(cellKey("c", "mechanism"))!;
    cell.evidence[0].response = { outcome: "correct", hintsUsed: 2, elapsedMs: 1 };
    expect(conceptVerdict(cells, "c").fragile).toBe(true);
  });
});

describe("isSettled", () => {
  test("a sharp posterior is settled", () => {
    expect(isSettled(cellWith("mechanism", [0.01, 0.02, 0.95, 0.02], 1))).toBe(true);
  });
  test("a flat posterior with items left is not settled", () => {
    expect(isSettled(cellWith("mechanism", [0.25, 0.25, 0.25, 0.25], 1))).toBe(false);
  });
  test("a cell that used its item budget is settled regardless", () => {
    expect(isSettled(cellWith("mechanism", [0.25, 0.25, 0.25, 0.25], 3))).toBe(true);
  });
});

describe("detectPatterns", () => {
  test("names term-without-mechanism", () => {
    const v = conceptVerdict(mk([
      ["recognition", [0, 0, 0.8, 0.2]],
      ["mechanism", [0.7, 0.3, 0, 0]],
    ]), "c");
    expect(detectPatterns(v)).toContain("term-without-mechanism");
  });

  test("names does-without-explaining", () => {
    const v = conceptVerdict(mk([
      ["production", [0, 0, 0.8, 0.2]],
      ["mechanism", [0.7, 0.3, 0, 0]],
    ]), "c");
    expect(detectPatterns(v)).toContain("does-without-explaining");
  });

  test("names declined after two dont_know answers", () => {
    const cells = mk([["mechanism", [0.6, 0.3, 0.1, 0]]]);
    for (const e of cells.get(cellKey("c", "mechanism"))!.evidence) {
      e.response = { outcome: "dont_know", hintsUsed: 0, elapsedMs: 1 };
    }
    expect(detectPatterns(conceptVerdict(cells, "c"))).toContain("declined");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/verdict.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write verdict.ts**

```ts
// site/src/scripts/assess/verdict.ts
// Cells → a per-concept verdict. Pure.
import { bandLabel, entropyOrd, expectedLevel, type BandLabel } from "./ordinal";
import { FACETS, cellKey, type Cell, type CellKey, type Facet } from "./types";

/**
 * Entropy below which a cell stops being asked about. Tuned by the simulation harness
 * (Task 10) — the loosest threshold that still clears the band-recovery gate.
 */
export const SETTLE_ENTROPY = 0.55;
export const MAX_ITEMS_PER_CELL = 3;

export function isSettled(cell: Cell): boolean {
  return cell.items >= MAX_ITEMS_PER_CELL || entropyOrd(cell.posterior) <= SETTLE_ENTROPY;
}

export interface FacetVerdict {
  status: "measured" | "untested";
  band: BandLabel | null;
  items: number;
  fragile: boolean;
  declined: number;
}

export interface ConceptVerdict {
  conceptId: string;
  status: "measured" | "untested";
  /** Minimum across measured facets. Null when nothing was measured. */
  band: BandLabel | null;
  facets: Record<Facet, FacetVerdict>;
  fragile: boolean;
  evidenceCount: number;
}

function facetVerdict(cell: Cell | undefined): FacetVerdict {
  if (!cell || cell.items === 0) {
    return { status: "untested", band: null, items: 0, fragile: false, declined: 0 };
  }
  const fragile = cell.evidence.some((e) => e.response.outcome === "correct" && e.response.hintsUsed >= 2);
  const declined = cell.evidence.filter((e) => e.response.outcome === "dont_know").length;
  return { status: "measured", band: bandLabel(cell.posterior), items: cell.items, fragile, declined };
}

export function conceptVerdict(cells: ReadonlyMap<CellKey, Cell>, conceptId: string): ConceptVerdict {
  const facets = Object.fromEntries(
    FACETS.map((f) => [f, facetVerdict(cells.get(cellKey(conceptId, f)))]),
  ) as Record<Facet, FacetVerdict>;

  const measured = FACETS.filter((f) => facets[f].status === "measured");
  if (measured.length === 0) {
    return { conceptId, status: "untested", band: null, facets, fragile: false, evidenceCount: 0 };
  }

  // A hole in any facet is a hole: the concept's band is the weakest measured facet.
  let worst: Facet = measured[0];
  for (const f of measured) {
    const cur = cells.get(cellKey(conceptId, f))!;
    const best = cells.get(cellKey(conceptId, worst))!;
    if (expectedLevel(cur.posterior) < expectedLevel(best.posterior)) worst = f;
  }
  return {
    conceptId,
    status: "measured",
    band: facets[worst].band,
    facets,
    fragile: measured.some((f) => facets[f].fragile),
    evidenceCount: measured.reduce((n, f) => n + facets[f].items, 0),
  };
}
```

- [ ] **Step 4: Write patterns.ts**

```ts
// site/src/scripts/assess/patterns.ts
// Named shapes of knowledge, derived mechanically from the facet vector (spec §9.1).
import { LEVELS, type Facet } from "./types";
import type { ConceptVerdict } from "./verdict";

export type PatternId =
  | "term-without-mechanism"
  | "does-without-explaining"
  | "knows-cannot-apply"
  | "fragile"
  | "declined"
  | "untested";

export const PATTERN_LABELS: Record<PatternId, { en: string; ru: string }> = {
  "term-without-mechanism": { en: "Knows the term, not the mechanism", ru: "Знает термин, не знает механизм" },
  "does-without-explaining": { en: "Does it, cannot explain it", ru: "Делает, но не объясняет" },
  "knows-cannot-apply": { en: "Explains it, cannot write it", ru: "Объясняет, но не пишет" },
  fragile: { en: "Reached only with hints — fragile", ru: "Дошёл только с подсказками — хрупко" },
  declined: { en: "Declined the question", ru: "Отказ от ответа" },
  untested: { en: "Not tested", ru: "Не проверялось" },
};

const idx = (level: string) => LEVELS.indexOf(level as (typeof LEVELS)[number]);
const at = (v: ConceptVerdict, f: Facet) => (v.facets[f].band ? idx(v.facets[f].band!.level) : null);
const MIDDLE = idx("middle");
const JUNIOR = idx("junior");

export function detectPatterns(v: ConceptVerdict): PatternId[] {
  if (v.status === "untested") return ["untested"];
  const out: PatternId[] = [];
  const rec = at(v, "recognition"), mech = at(v, "mechanism"), prod = at(v, "production");

  if (rec !== null && mech !== null && rec >= MIDDLE && mech <= JUNIOR) out.push("term-without-mechanism");
  if (prod !== null && mech !== null && prod >= MIDDLE && mech <= JUNIOR) out.push("does-without-explaining");
  if (mech !== null && prod !== null && mech >= MIDDLE && prod <= JUNIOR) out.push("knows-cannot-apply");
  if (v.fragile) out.push("fragile");
  if (Object.values(v.facets).reduce((n, f) => n + f.declined, 0) >= 2) out.push("declined");
  return out;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/verdict.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add site/src/scripts/assess/verdict.ts site/src/scripts/assess/patterns.ts site/src/scripts/assess/verdict.test.ts
git commit -m "feat(assess): concept verdict from facet vector plus named knowledge patterns"
```

---

## Task 5: Item index build script

**Files:**
- Create: `site/scripts/path/build-assess-items.mjs`
- Create: `site/scripts/path/build-assess-items.test.mjs`
- Modify: `site/package.json` (add `build:assess-items`, prepend to `build`)

**Interfaces:**
- Consumes: practice JSON files, `src/content/path/unit-concepts.json`, `src/content/path/concepts.json`.
- Produces: `src/content/path/assess-items.json` = `{ [itemId]: { lessonKey, taskId, kind, facet, band, concepts, weight, estMin } }`, `src/content/path/assess-coverage.json` = `{ [conceptId]: { recognition: n, mechanism: n, production: n } }`, and the exported pure functions `facetOf(task)`, `kindOf(task)`, `buildAssessIndex(files, unitConcepts, bandOf, read)`.

- [ ] **Step 1: Write the failing test**

```js
// site/scripts/path/build-assess-items.test.mjs
import { describe, expect, test } from "vitest";
import { buildAssessIndex, facetOf, kindOf } from "./build-assess-items.mjs";

const unitConcepts = { "backend/01-promises": { teaches: ["promises", "event-loop"], requires: [], estMin: 5 } };
const bandOf = () => "surface";

const file = (lessonKey, tasks) => JSON.stringify({ lessonKey, tasks });

describe("facet mapping", () => {
  test("diagnose+blanks measures recognition", () => {
    expect(facetOf({ type: "diagnose", grading: { mode: "blanks" } })).toBe("recognition");
  });
  test("sandbox measures production", () => {
    expect(facetOf({ type: "sandbox" })).toBe("production");
  });
  test("debug is a mechanism probe, not two items", () => {
    expect(facetOf({ type: "debug" })).toBe("mechanism");
    expect(kindOf({ type: "debug" })).toBe("debug");
  });
  test("design is an explain item", () => {
    expect(kindOf({ type: "design" })).toBe("explain");
  });
});

describe("buildAssessIndex", () => {
  const files = ["a.json"];
  const read = () => file("backend/01-promises", [
    { id: "t1", type: "sandbox", difficulty: "apply", estMin: 6 },
    { id: "t2", type: "predict", difficulty: "recall", estMin: 3 },
  ]);

  test("emits one item per task, keyed lessonKey#taskId", () => {
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, read);
    expect(Object.keys(items).sort()).toEqual(["backend/01-promises#t1", "backend/01-promises#t2"]);
  });

  test("attributes a task to every concept its unit teaches, at 1/n weight", () => {
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, read);
    const it = items["backend/01-promises#t1"];
    expect(it.concepts).toEqual(["promises", "event-loop"]);
    expect(it.weight).toBeCloseTo(0.5);
  });

  test("an explicit concepts field on the task wins and keeps full weight", () => {
    const withExplicit = () => file("backend/01-promises", [
      { id: "t1", type: "sandbox", difficulty: "apply", estMin: 6, concepts: ["promises"] },
    ]);
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, withExplicit);
    expect(items["backend/01-promises#t1"].concepts).toEqual(["promises"]);
    expect(items["backend/01-promises#t1"].weight).toBe(1);
  });

  test("coverage counts items per concept per facet", () => {
    const { coverage } = buildAssessIndex(files, unitConcepts, bandOf, read);
    expect(coverage["promises"]).toEqual({ recognition: 0, mechanism: 1, production: 1 });
  });

  test("a lesson whose unit is unknown is skipped rather than guessed", () => {
    const orphan = () => file("ghost/99-nope", [{ id: "t1", type: "sandbox", difficulty: "apply", estMin: 4 }]);
    const { items } = buildAssessIndex(files, unitConcepts, bandOf, orphan);
    expect(Object.keys(items)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run scripts/path/build-assess-items.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the build script**

```js
#!/usr/bin/env bun
// site/scripts/path/build-assess-items.mjs
// Harvest the practice corpus into an item index for /assess. Mirrors build-lesson-tasks.mjs:
// a pure exported builder plus a thin CLI, so the mapping is unit-testable without the filesystem.
//   src/content/path/assess-items.json    { [itemId]: AssessItem }
//   src/content/path/assess-coverage.json { [conceptId]: { recognition, mechanism, production } }
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PRACTICE_DIR = "src/content/practice";
const UNIT_CONCEPTS = "src/content/path/unit-concepts.json";
const CONCEPTS = "src/content/path/concepts.json";
const OUT_ITEMS = "src/content/path/assess-items.json";
const OUT_COVERAGE = "src/content/path/assess-coverage.json";

const FACETS = ["recognition", "mechanism", "production"];

/** Primary facet per practice task type (spec §5.1). One item, one facet. */
export function facetOf(task) {
  switch (task.type) {
    case "diagnose":
      return task.grading?.mode === "blanks" ? "recognition" : "mechanism";
    case "predict":
    case "debug":
    case "review":
    case "design":
    case "incident":
      return "mechanism";
    case "sandbox":
      return "production";
    case "fix":
      return task.grading?.mode === "exec" ? "production" : "mechanism";
    default:
      return null; // unknown type: skipped, never guessed
  }
}

export function kindOf(task) {
  switch (task.type) {
    case "diagnose":
      return task.grading?.mode === "blanks" ? "mcq" : "explain";
    case "predict": return "predict";
    case "debug": return "debug";
    case "review": return "review";
    case "sandbox": return "exec";
    case "fix": return task.grading?.mode === "exec" ? "exec" : "explain";
    case "design":
    case "incident": return "explain";
    default: return null;
  }
}

const unitOf = (lessonKey) => lessonKey.split("/").slice(0, 2).join("/");

export function buildAssessIndex(files, unitConcepts, bandOf, read = (p) => readFileSync(p, "utf8")) {
  const items = {};
  const coverage = {};
  const bump = (conceptId, facet) => {
    coverage[conceptId] ??= { recognition: 0, mechanism: 0, production: 0 };
    coverage[conceptId][facet] += 1;
  };

  for (const f of files) {
    let j;
    try { j = JSON.parse(read(f)); } catch { continue; }
    if (!j || typeof j.lessonKey !== "string" || !Array.isArray(j.tasks)) continue;

    const unit = unitConcepts[unitOf(j.lessonKey)];
    if (!unit || !Array.isArray(unit.teaches) || unit.teaches.length === 0) continue;

    for (const t of j.tasks) {
      if (!t || typeof t.id !== "string") continue;
      const facet = facetOf(t);
      const kind = kindOf(t);
      if (!facet || !kind) continue;

      const explicit = Array.isArray(t.concepts) && t.concepts.length > 0;
      const concepts = explicit ? t.concepts : unit.teaches;
      const id = `${j.lessonKey}#${t.id}`;
      items[id] = {
        lessonKey: j.lessonKey,
        taskId: t.id,
        kind,
        facet,
        band: bandOf(concepts[0]),
        concepts,
        weight: explicit ? 1 : 1 / concepts.length,
        estMin: typeof t.estMin === "number" ? t.estMin : 5,
      };
      for (const c of concepts) bump(c, facet);
    }
  }

  const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  return { items: sortKeys(items), coverage: sortKeys(coverage) };
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

if (import.meta.main) {
  const unitConcepts = JSON.parse(readFileSync(UNIT_CONCEPTS, "utf8"));
  const concepts = JSON.parse(readFileSync(CONCEPTS, "utf8"));
  const bandById = new Map(concepts.map((c) => [c.id, c.band]));
  const bandOf = (id) => bandById.get(id) ?? "surface";

  const { items, coverage } = buildAssessIndex(walk(PRACTICE_DIR).sort(), unitConcepts, bandOf);
  writeFileSync(OUT_ITEMS, JSON.stringify(items) + "\n");
  writeFileSync(OUT_COVERAGE, JSON.stringify(coverage) + "\n");

  const cells = Object.values(coverage);
  const empty = FACETS.map((f) => [f, cells.filter((c) => c[f] === 0).length]);
  console.log(`build:assess-items — ${Object.keys(items).length} items over ${cells.length} concepts`);
  for (const [f, n] of empty) console.log(`  ${f}: ${n} concepts with no item`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bunx vitest run scripts/path/build-assess-items.test.mjs`
Expected: PASS, 9 tests.

- [ ] **Step 5: Generate the real index and read the coverage report**

Run: `cd site && bun scripts/path/build-assess-items.mjs`
Expected: prints the item count and, per facet, how many concepts have zero items. **Record these numbers in the commit message** — they decide the size of the authored layer (spec §14).

- [ ] **Step 6: Wire the build**

In `site/package.json`, add to `scripts`:

```json
"build:assess-items": "bun scripts/path/build-assess-items.mjs",
```

and prepend it to the `build` chain, immediately after `build:lesson-tasks`:

```json
"build": "bun scripts/path/build-lesson-tasks.mjs && bun scripts/path/build-assess-items.mjs && bun scripts/lint-src.mjs && bun scripts/gen-infographics.mjs --check && NODE_OPTIONS=--max-old-space-size=10240 astro build && bun scripts/lint-dist.mjs",
```

- [ ] **Step 7: Commit**

```bash
git add site/scripts/path/build-assess-items.mjs site/scripts/path/build-assess-items.test.mjs \
        site/package.json site/src/content/path/assess-items.json site/src/content/path/assess-coverage.json
git commit -m "feat(assess): harvest the practice corpus into an item index with a coverage report"
```

---

## Task 6: Item pool with contamination control

**Files:**
- Create: `site/src/scripts/assess/item-pool.ts`
- Test: `site/src/scripts/assess/item-pool.test.ts`

**Interfaces:**
- Consumes: the index shape from Task 5, `AssessItem`, `TaskStatus` from `~/scripts/practice-state`.
- Produces: `buildPool(index, progressOf): AssessItem[]`, `itemsFor(pool, conceptId, facet): AssessItem[]`, `BURN_WEIGHT`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/item-pool.test.ts
import { describe, expect, test } from "vitest";
import { buildPool, itemsFor } from "./item-pool";

const index = {
  "backend/01-promises/01-intro#t1": {
    lessonKey: "backend/01-promises/01-intro", taskId: "t1", kind: "exec", facet: "production",
    band: "surface", concepts: ["promises"], weight: 1, estMin: 5,
  },
  "backend/01-promises/01-intro#t2": {
    lessonKey: "backend/01-promises/01-intro", taskId: "t2", kind: "mcq", facet: "recognition",
    band: "surface", concepts: ["promises"], weight: 1, estMin: 3,
  },
} as const;

describe("buildPool", () => {
  test("an unseen task keeps full weight", () => {
    const pool = buildPool(index, () => ({}));
    expect(pool.find((i) => i.taskId === "t1")!.weight).toBe(1);
  });

  test("a task already DONE in the lesson is burned — it measures memory, not knowledge", () => {
    const pool = buildPool(index, () => ({ t1: "done" }));
    expect(pool.some((i) => i.taskId === "t1")).toBe(false);
    expect(pool.some((i) => i.taskId === "t2")).toBe(true);
  });

  test("a merely attempted task stays but at half weight", () => {
    const pool = buildPool(index, () => ({ t1: "attempted" }));
    expect(pool.find((i) => i.taskId === "t1")!.weight).toBeCloseTo(0.5);
  });

  test("itemsFor filters by concept and facet", () => {
    const pool = buildPool(index, () => ({}));
    expect(itemsFor(pool, "promises", "recognition").map((i) => i.taskId)).toEqual(["t2"]);
    expect(itemsFor(pool, "promises", "mechanism")).toEqual([]);
  });

  test("multi-concept attribution weight survives the burn discount", () => {
    const multi = { ...index, "x#t3": { ...index["backend/01-promises/01-intro#t1"], lessonKey: "x", taskId: "t3", weight: 0.5 } };
    const pool = buildPool(multi as typeof index, () => ({ t3: "attempted" }));
    expect(pool.find((i) => i.taskId === "t3")!.weight).toBeCloseTo(0.25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/item-pool.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/assess/item-pool.ts
// The set of items /assess may ask, after contamination control (spec §5.2). Pure:
// the caller supplies the learner's practice progress, this file never reads storage.
import type { TaskStatus } from "~/scripts/practice-state";
import type { AssessItem, Facet } from "./types";

export type AssessIndex = Record<string, Omit<AssessItem, "id">>;

/** A task the learner merely opened is weaker evidence, but still evidence. */
export const BURN_WEIGHT: Record<TaskStatus, number | null> = {
  done: null,      // burned: excluded entirely
  attempted: 0.5,
  seen: 0.5,
};

export function buildPool(
  index: AssessIndex,
  progressOf: (lessonKey: string) => Record<string, TaskStatus>,
): AssessItem[] {
  const out: AssessItem[] = [];
  for (const [id, raw] of Object.entries(index)) {
    const status = progressOf(raw.lessonKey)[raw.taskId];
    const discount = status ? BURN_WEIGHT[status] : 1;
    if (discount === null) continue;
    out.push({ ...raw, id, weight: raw.weight * discount });
  }
  return out;
}

export function itemsFor(pool: readonly AssessItem[], conceptId: string, facet: Facet): AssessItem[] {
  return pool.filter((i) => i.facet === facet && i.concepts.includes(conceptId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/item-pool.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/assess/item-pool.ts site/src/scripts/assess/item-pool.test.ts
git commit -m "feat(assess): item pool with burned-item contamination control"
```

---

## Task 7: Selection by expected information gain

**Files:**
- Create: `site/src/scripts/assess/select.ts`
- Test: `site/src/scripts/assess/select.test.ts`

**Interfaces:**
- Consumes: `likelihoodVector`, `entropyOrd`, `normalize`, `isSettled`, `itemsFor`, `emptyCell`.
- Produces: `expectedGain(cell, item)`, `nextItem(args): AssessItem | null` where `args = { pool, cells, candidates, bandOf, askedIds, recentKinds }`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/select.test.ts
import { describe, expect, test } from "vitest";
import { expectedGain, nextItem } from "./select";
import { emptyCell } from "./update";
import { cellKey, type AssessItem, type Cell, type CellKey } from "./types";

const mkItem = (over: Partial<AssessItem>): AssessItem => ({
  id: over.id ?? "x", lessonKey: "l", taskId: over.id ?? "x", kind: "exec", facet: "production",
  band: "surface", concepts: ["c"], weight: 1, estMin: 5, ...over,
});

const bandOf = () => "surface" as const;
const base = () => new Map<CellKey, Cell>();

describe("expectedGain", () => {
  test("an uncertain cell has more to gain than a settled one", () => {
    const flat = emptyCell("c", "production", "surface");
    const sharp = { ...flat, posterior: [0.01, 0.02, 0.95, 0.02] as const };
    const item = mkItem({});
    expect(expectedGain(flat, item)).toBeGreaterThan(expectedGain(sharp, item));
  });

  test("an aligned item gains more than a cross-facet one", () => {
    const cell = emptyCell("c", "production", "surface");
    expect(expectedGain(cell, mkItem({ kind: "exec", facet: "production" })))
      .toBeGreaterThan(expectedGain(cell, mkItem({ kind: "mcq", facet: "recognition" })));
  });
});

describe("nextItem", () => {
  const pool = [
    mkItem({ id: "a", facet: "production", kind: "exec" }),
    mkItem({ id: "b", facet: "recognition", kind: "mcq" }),
    mkItem({ id: "c2", facet: "mechanism", kind: "predict" }),
  ];

  test("returns null when every candidate cell is settled", () => {
    const cells = new Map<CellKey, Cell>();
    for (const f of ["recognition", "mechanism", "production"] as const) {
      cells.set(cellKey("c", f), { ...emptyCell("c", f, "surface"), items: 3 });
    }
    expect(nextItem({ pool, cells, candidates: ["c"], bandOf, askedIds: new Set(), recentKinds: [] })).toBeNull();
  });

  test("never repeats an item already asked", () => {
    const asked = new Set(["a", "b"]);
    const picked = nextItem({ pool, cells: base(), candidates: ["c"], bandOf, askedIds: asked, recentKinds: [] });
    expect(picked?.id).toBe("c2");
  });

  test("refuses a third consecutive item of the same kind", () => {
    const picked = nextItem({
      pool, cells: base(), candidates: ["c"], bandOf, askedIds: new Set(), recentKinds: ["exec", "exec"],
    });
    expect(picked?.kind).not.toBe("exec");
  });

  test("prefers the item with the best gain per minute", () => {
    const cheap = mkItem({ id: "cheap", estMin: 2, kind: "predict", facet: "mechanism" });
    const dear = mkItem({ id: "dear", estMin: 30, kind: "predict", facet: "mechanism" });
    const picked = nextItem({ pool: [dear, cheap], cells: base(), candidates: ["c"], bandOf, askedIds: new Set(), recentKinds: [] });
    expect(picked?.id).toBe("cheap");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/select.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/assess/select.ts
// Which question to ask next. Pure: no storage, no clock.
import { likelihoodVector } from "./likelihood";
import { entropyOrd, normalize } from "./ordinal";
import { emptyCell } from "./update";
import { isSettled } from "./verdict";
import { FACETS, cellKey, type AssessItem, type Band, type Cell, type CellKey, type ItemKind, type Outcome } from "./types";

const OUTCOMES: Outcome[] = ["correct", "partial", "wrong", "dont_know"];

/**
 * Expected reduction in entropy from asking this item about this cell:
 *   H(prior) − Σ_outcome P(outcome) · H(posterior | outcome)
 */
export function expectedGain(cell: Cell, item: AssessItem): number {
  const prior = cell.posterior;
  const before = entropyOrd(prior);
  let after = 0;
  for (const outcome of OUTCOMES) {
    const lik = likelihoodVector(item, { outcome, hintsUsed: 0, elapsedMs: 0 }, cell.facet);
    const joint = prior.map((p, i) => p * lik[i]);
    const pOutcome = joint.reduce((a, b) => a + b, 0);
    if (pOutcome <= 0) continue;
    after += pOutcome * entropyOrd(normalize(joint));
  }
  return Math.max(0, before - after);
}

export interface SelectArgs {
  pool: readonly AssessItem[];
  cells: ReadonlyMap<CellKey, Cell>;
  /** Concepts in scope, already ranked by the caller (keystone × goal relevance). */
  candidates: readonly string[];
  bandOf: (conceptId: string) => Band;
  askedIds: ReadonlySet<string>;
  /** Kinds of the last two items, newest last — used for the fatigue rule. */
  recentKinds: readonly ItemKind[];
}

/** Two of a kind in a row is a rhythm; three is a grind. */
function kindBlocked(recentKinds: readonly ItemKind[], kind: ItemKind): boolean {
  const last2 = recentKinds.slice(-2);
  return last2.length === 2 && last2.every((k) => k === kind);
}

export function nextItem({ pool, cells, candidates, bandOf, askedIds, recentKinds }: SelectArgs): AssessItem | null {
  let best: { item: AssessItem; score: number } | null = null;

  for (const conceptId of candidates) {
    for (const facet of FACETS) {
      const cell = cells.get(cellKey(conceptId, facet)) ?? emptyCell(conceptId, facet, bandOf(conceptId));
      if (isSettled(cell)) continue;

      for (const item of pool) {
        if (item.facet !== facet || !item.concepts.includes(conceptId)) continue;
        if (askedIds.has(item.id)) continue;
        if (kindBlocked(recentKinds, item.kind)) continue;

        const score = (expectedGain(cell, item) * item.weight) / Math.max(1, item.estMin);
        if (!best || score > best.score) best = { item, score };
      }
    }
  }
  return best?.item ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/select.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/assess/select.ts site/src/scripts/assess/select.test.ts
git commit -m "feat(assess): information-gain item selection with fatigue rules"
```

---

## Task 8: Session reducer and storage adapter

**Files:**
- Create: `site/src/scripts/assess/session.ts`
- Create: `site/src/scripts/assess-io.ts`
- Test: `site/src/scripts/assess/session.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: `startSession(scope, atMs)`, `reduce(state, action, deps)`, `AssessState`, `AssessAction`; and in `assess-io.ts`: `ASSESS_KEY`, `loadSession()`, `saveSession(state)`, `clearSession()`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/session.test.ts
import { describe, expect, test } from "vitest";
import { reduce, startSession, BLOCK_MAX_ITEMS, BLOCK_MAX_MIN } from "./session";
import type { AssessItem } from "./types";

const item = (id: string, estMin = 4): AssessItem => ({
  id, lessonKey: "l", taskId: id, kind: "predict", facet: "mechanism",
  band: "surface", concepts: ["c"], weight: 1, estMin,
});

const deps = {
  pool: [item("a"), item("b"), item("c2"), item("d"), item("e"), item("f"), item("g"), item("h")],
  candidates: ["c"],
  bandOf: () => "surface" as const,
  graph: { byId: new Map() } as never,
};

describe("session", () => {
  test("a fresh session has no evidence and no verdicts", () => {
    const s = startSession(["backend"], 1000);
    expect(s.cells.size).toBe(0);
    expect(s.blockIndex).toBe(0);
    expect(s.asked.size).toBe(0);
  });

  test("answering records evidence and advances the block", () => {
    let s = startSession(["backend"], 1000);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 1001 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: 0, elapsedMs: 500 }, atMs: 1002 }, deps);
    expect(s.asked.has("a")).toBe(true);
    expect(s.blockItems).toBe(1);
    expect([...s.cells.values()].some((c) => c.evidence.length === 1)).toBe(true);
  });

  test("a block closes at the item cap", () => {
    let s = startSession(["backend"], 0);
    for (let i = 0; i < BLOCK_MAX_ITEMS; i++) {
      s = reduce(s, { type: "serve", item: item(`i${i}`, 1), atMs: i }, deps);
      s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: 0, elapsedMs: 1 }, atMs: i }, deps);
    }
    expect(s.phase).toBe("block-verdict");
  });

  test("a block closes at the minute budget even with items left", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("big", BLOCK_MAX_MIN + 1), atMs: 0 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: 0, elapsedMs: 1 }, atMs: 1 }, deps);
    expect(s.phase).toBe("block-verdict");
  });

  test("hints are recorded on the response, not swallowed", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 0 }, deps);
    s = reduce(s, { type: "hint", atMs: 1 }, deps);
    s = reduce(s, { type: "hint", atMs: 2 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "correct", hintsUsed: s.hintsUsed, elapsedMs: 5 }, atMs: 3 }, deps);
    const ev = [...s.cells.values()].flatMap((c) => c.evidence);
    expect(ev[0].response.hintsUsed).toBe(2);
  });

  test("abandoning leaves unasked concepts untested, not failed", () => {
    let s = startSession(["backend"], 0);
    s = reduce(s, { type: "serve", item: item("a"), atMs: 0 }, deps);
    s = reduce(s, { type: "answer", response: { outcome: "wrong", hintsUsed: 0, elapsedMs: 1 }, atMs: 1 }, deps);
    s = reduce(s, { type: "stop", atMs: 2 }, deps);
    expect(s.phase).toBe("report");
    expect(s.cells.has("never-asked::mechanism" as never)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write session.ts**

```ts
// site/src/scripts/assess/session.ts
// The session as a pure reducer: state in, action in, new state out. The island owns
// timing and storage; this file owns the rules.
import type { ConceptGraph } from "~/scripts/path/graph";
import { applyResponse, propagate, type ResponseMeta } from "./update";
import type { AssessItem, AssessResponse, Band, Cell, CellKey } from "./types";

export const BLOCK_MAX_ITEMS = 10;
export const BLOCK_MAX_MIN = 15;

export type Phase = "scope" | "asking" | "block-verdict" | "report";

export interface AssessState {
  scope: string[];
  phase: Phase;
  cells: Map<CellKey, Cell>;
  asked: Set<string>;
  current: AssessItem | null;
  hintsUsed: 0 | 1 | 2;
  blockIndex: number;
  blockItems: number;
  blockMinutes: number;
  recentKinds: AssessItem["kind"][];
  startedAtMs: number;
  updatedAtMs: number;
}

export type AssessAction =
  | { type: "serve"; item: AssessItem; atMs: number }
  | { type: "hint"; atMs: number }
  | { type: "answer"; response: AssessResponse; meta?: ResponseMeta; atMs: number }
  | { type: "next-block"; atMs: number }
  | { type: "stop"; atMs: number };

export interface SessionDeps {
  pool: readonly AssessItem[];
  candidates: readonly string[];
  bandOf: (conceptId: string) => Band;
  graph: ConceptGraph;
}

export function startSession(scope: string[], atMs: number): AssessState {
  return {
    scope, phase: "asking", cells: new Map(), asked: new Set(), current: null, hintsUsed: 0,
    blockIndex: 0, blockItems: 0, blockMinutes: 0, recentKinds: [], startedAtMs: atMs, updatedAtMs: atMs,
  };
}

export function reduce(state: AssessState, action: AssessAction, deps: SessionDeps): AssessState {
  switch (action.type) {
    case "serve":
      return { ...state, current: action.item, hintsUsed: 0, phase: "asking", updatedAtMs: action.atMs };

    case "hint":
      return { ...state, hintsUsed: Math.min(2, state.hintsUsed + 1) as 0 | 1 | 2, updatedAtMs: action.atMs };

    case "answer": {
      const item = state.current;
      if (!item) return state;
      let cells = applyResponse(state.cells, item, action.response, deps.bandOf, action.atMs, action.meta);
      for (const conceptId of item.concepts) cells = propagate(cells, deps.graph, conceptId, item.facet, deps.bandOf);

      const blockItems = state.blockItems + 1;
      const blockMinutes = state.blockMinutes + item.estMin;
      const blockDone = blockItems >= BLOCK_MAX_ITEMS || blockMinutes >= BLOCK_MAX_MIN;
      return {
        ...state,
        cells,
        asked: new Set(state.asked).add(item.id),
        current: null,
        hintsUsed: 0,
        blockItems,
        blockMinutes,
        recentKinds: [...state.recentKinds, item.kind].slice(-2),
        phase: blockDone ? "block-verdict" : "asking",
        updatedAtMs: action.atMs,
      };
    }

    case "next-block":
      return {
        ...state, phase: "asking", blockIndex: state.blockIndex + 1,
        blockItems: 0, blockMinutes: 0, recentKinds: [], updatedAtMs: action.atMs,
      };

    case "stop":
      return { ...state, phase: "report", current: null, updatedAtMs: action.atMs };
  }
}
```

- [ ] **Step 4: Write assess-io.ts**

```ts
// site/src/scripts/assess-io.ts
// The only place assessment state touches localStorage. Mirrors review-state.ts:
// own key, defensive parse, silent degrade when storage is unavailable.
import type { AssessState } from "./assess/session";
import type { Cell, CellKey } from "./assess/types";

export const ASSESS_KEY = "atlas.assess.v1";

interface Serialized {
  scope: string[];
  phase: AssessState["phase"];
  cells: [CellKey, Cell][];
  asked: string[];
  blockIndex: number;
  startedAtMs: number;
  updatedAtMs: number;
}

export function saveSession(state: AssessState): void {
  try {
    const payload: Serialized = {
      scope: state.scope, phase: state.phase, cells: [...state.cells.entries()],
      asked: [...state.asked], blockIndex: state.blockIndex,
      startedAtMs: state.startedAtMs, updatedAtMs: state.updatedAtMs,
    };
    localStorage.setItem(ASSESS_KEY, JSON.stringify(payload));
  } catch { /* private mode / quota — the session still works, it just will not resume */ }
}

export function loadSession(): AssessState | null {
  try {
    const raw = localStorage.getItem(ASSESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Serialized;
    if (!Array.isArray(p.cells) || !Array.isArray(p.scope)) return null;
    return {
      scope: p.scope, phase: p.phase, cells: new Map(p.cells), asked: new Set(p.asked),
      current: null, hintsUsed: 0, blockIndex: p.blockIndex, blockItems: 0, blockMinutes: 0,
      recentKinds: [], startedAtMs: p.startedAtMs, updatedAtMs: p.updatedAtMs,
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try { localStorage.removeItem(ASSESS_KEY); } catch { /* nothing to clear */ }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/session.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add site/src/scripts/assess/session.ts site/src/scripts/assess/session.test.ts site/src/scripts/assess-io.ts
git commit -m "feat(assess): session reducer with block budgets and resumable storage"
```

---

## Task 9: Deterministic graders

**Files:**
- Create: `site/src/scripts/assess/graders/index.ts`
- Test: `site/src/scripts/assess/graders/index.test.ts`

**Interfaces:**
- Consumes: `applyExecCheck`, `checkBlank` from `~/scripts/practice-grade`; `runJs` from `~/scripts/run-js`.
- Produces: `gradeMcq(choices, picked)`, `gradeBlanks(blanks, answers)`, `gradeReview(findings, picked)`, `gradeExec(check, result)`, `GradeResult = { outcome: Outcome; failureNote?: string }`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/graders/index.test.ts
import { describe, expect, test } from "vitest";
import { gradeBlanks, gradeExec, gradeMcq, gradeReview } from "./index";

describe("gradeMcq", () => {
  test("correct choice", () => {
    expect(gradeMcq([{ correct: true }, {}], 0).outcome).toBe("correct");
  });
  test("wrong choice never returns partial — a single choice has no degrees", () => {
    expect(gradeMcq([{ correct: true }, {}], 1).outcome).toBe("wrong");
  });
});

describe("gradeBlanks", () => {
  test("all blanks right is correct", () => {
    expect(gradeBlanks([{ accept: ["map"] }, { accept: ["set"] }], ["map", "set"]).outcome).toBe("correct");
  });
  test("some blanks right is partial, and says which", () => {
    const r = gradeBlanks([{ accept: ["map"] }, { accept: ["set"] }], ["map", "array"]);
    expect(r.outcome).toBe("partial");
    expect(r.failureNote).toContain("2");
  });
  test("none right is wrong", () => {
    expect(gradeBlanks([{ accept: ["map"] }], ["array"]).outcome).toBe("wrong");
  });
});

describe("gradeReview", () => {
  test("finding every planted defect is correct", () => {
    const findings = [{ id: "a", planted: true }, { id: "b", planted: true }, { id: "c", planted: false }];
    expect(gradeReview(findings, ["a", "b"]).outcome).toBe("correct");
  });
  test("finding some is partial", () => {
    const findings = [{ id: "a", planted: true }, { id: "b", planted: true }];
    expect(gradeReview(findings, ["a"]).outcome).toBe("partial");
  });
  test("selecting a decoy costs the correct verdict", () => {
    const findings = [{ id: "a", planted: true }, { id: "c", planted: false }];
    const r = gradeReview(findings, ["a", "c"]);
    expect(r.outcome).toBe("partial");
    expect(r.failureNote).toContain("decoy");
  });
});

describe("gradeExec", () => {
  test("a passing check is correct", () => {
    expect(gradeExec({ kind: "stdout-equals", value: "42" }, { stdout: "42" }).outcome).toBe("correct");
  });
  test("a runtime error is wrong and carries the message", () => {
    const r = gradeExec({ kind: "no-error" }, { error: "ReferenceError: x is not defined" });
    expect(r.outcome).toBe("wrong");
    expect(r.failureNote).toContain("ReferenceError");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/graders/index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/assess/graders/index.ts
// Deterministic grading. Reuses the practice graders rather than reimplementing them,
// and adds the one thing the report needs: a specific failureNote instead of "wrong".
import { applyExecCheck, checkBlank, type ExecCheck, type ExecResult } from "~/scripts/practice-grade";
import type { Outcome } from "../types";

export interface GradeResult {
  outcome: Outcome;
  failureNote?: string;
}

export function gradeMcq(choices: readonly { correct?: boolean }[], picked: number): GradeResult {
  const correct = choices.findIndex((c) => c.correct === true);
  if (picked === correct) return { outcome: "correct" };
  return { outcome: "wrong", failureNote: `picked option ${picked + 1}, correct was ${correct + 1}` };
}

export function gradeBlanks(blanks: readonly { accept: string[] }[], answers: readonly string[]): GradeResult {
  const hits = blanks.filter((b, i) => checkBlank(b.accept, answers[i] ?? "")).length;
  if (hits === blanks.length) return { outcome: "correct" };
  if (hits === 0) return { outcome: "wrong", failureNote: `0 of ${blanks.length} blanks correct` };
  return { outcome: "partial", failureNote: `${hits} of ${blanks.length} blanks correct` };
}

export function gradeReview(
  findings: readonly { id: string; planted: boolean }[],
  picked: readonly string[],
): GradeResult {
  const planted = findings.filter((f) => f.planted).map((f) => f.id);
  const found = planted.filter((id) => picked.includes(id));
  const decoys = picked.filter((id) => !planted.includes(id));
  if (found.length === planted.length && decoys.length === 0) return { outcome: "correct" };
  if (found.length === 0) {
    return { outcome: "wrong", failureNote: `missed all ${planted.length} planted findings` };
  }
  const note = [`found ${found.length}/${planted.length}`, decoys.length ? `${decoys.length} decoy(s) selected` : ""]
    .filter(Boolean).join("; ");
  return { outcome: "partial", failureNote: note };
}

export function gradeExec(check: ExecCheck, result: ExecResult): GradeResult {
  if (result.error) return { outcome: "wrong", failureNote: result.error.slice(0, 200) };
  return applyExecCheck(check, result)
    ? { outcome: "correct" }
    : { outcome: "wrong", failureNote: `output did not satisfy ${check.kind}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/graders/index.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/assess/graders/index.ts site/src/scripts/assess/graders/index.test.ts
git commit -m "feat(assess): deterministic graders with specific failure notes"
```

---

## Task 10: Simulation harness — the accuracy gate

**Files:**
- Create: `site/src/scripts/assess/simulate.ts`
- Test: `site/src/scripts/assess/simulate.test.ts`

**Interfaces:**
- Consumes: Tasks 1–8.
- Produces: `makeLearner(profile, seed)`, `runSimulation(args): SimResult`, `PROFILES`.

This task is what makes "maximally precise" a measured claim rather than a slogan. If a
gate here fails, the constants in `likelihood.ts` / `verdict.ts` are wrong — tune those,
do not loosen the gate.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/simulate.test.ts
import { describe, expect, test } from "vitest";
import { PROFILES, runSimulation } from "./simulate";

describe("accuracy gates (spec §10)", () => {
  const result = runSimulation({ learners: 200, conceptsPerLearner: 12, seed: 20260731 });

  test("≥90% of settled cells land within ±1 level of the truth", () => {
    expect(result.withinOne).toBeGreaterThanOrEqual(0.9);
  });

  test("the estimator is not systematically flattering or harsh", () => {
    expect(Math.abs(result.meanSignedError)).toBeLessThanOrEqual(0.25);
  });

  test("an honest learner is never scored below a guesser of the same true ability", () => {
    expect(result.honestMinusGuesser).toBeGreaterThanOrEqual(0);
  });

  test("settling a cell costs at most 3 items at the median", () => {
    expect(result.medianItemsToSettle).toBeLessThanOrEqual(3);
  });

  test("no cell is ever reported as a gap without evidence", () => {
    expect(result.gapsWithoutEvidence).toBe(0);
  });

  test("the awkward profiles are recovered as distinct shapes, not averaged away", () => {
    // "strong production, weak mechanism" must NOT come out as uniformly middle.
    const p = result.byProfile["production-not-mechanism"];
    expect(p.production.mean).toBeGreaterThan(p.mechanism.mean + 0.8);
  });

  test("every profile in PROFILES is exercised", () => {
    expect(Object.keys(result.byProfile).sort()).toEqual(Object.keys(PROFILES).sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/simulate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the harness**

```ts
// site/src/scripts/assess/simulate.ts
// Virtual learners with KNOWN ground truth, so the engine can be measured instead of
// trusted. Test-only: never imported by UI code.
import { pCorrect } from "./likelihood";
import { expectedLevel } from "./ordinal";
import { nextItem } from "./select";
import { emptyCell, applyResponse } from "./update";
import { isSettled } from "./verdict";
import { LEVELS, cellKey, type AssessItem, type Band, type Cell, type CellKey, type Facet, type Level, type Outcome } from "./types";

export interface Profile {
  /** True level index (0..3) per facet. */
  truth: Record<Facet, number>;
  /** Says "don't know" instead of guessing when unsure. */
  honest: boolean;
}

export const PROFILES: Record<string, Profile> = {
  "uniform-junior":            { truth: { recognition: 1, mechanism: 1, production: 1 }, honest: true },
  "uniform-senior":            { truth: { recognition: 3, mechanism: 3, production: 3 }, honest: true },
  "production-not-mechanism":  { truth: { recognition: 2, mechanism: 1, production: 3 }, honest: true },
  "terms-only":                { truth: { recognition: 3, mechanism: 1, production: 0 }, honest: true },
  "honest-beginner":           { truth: { recognition: 1, mechanism: 0, production: 0 }, honest: true },
  "guesser-beginner":          { truth: { recognition: 1, mechanism: 0, production: 0 }, honest: false },
};

/** Deterministic PRNG so a failing gate is reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const SLIP = 0.08; // even a knower fumbles sometimes

export function makeLearner(profile: Profile, rand: () => number) {
  return (item: AssessItem): Outcome => {
    const level = LEVELS[profile.truth[item.facet]] as Level;
    const p = pCorrect(level, item.band, 0, item.kind) * (1 - SLIP);
    if (rand() < p) return "correct";
    // Below their level, an honest learner declines; a guesser always answers.
    if (profile.honest && rand() < 0.6) return "dont_know";
    return "wrong";
  };
}

export interface SimArgs {
  learners: number;
  conceptsPerLearner: number;
  seed: number;
}

export interface FacetStat { mean: number; n: number }

export interface SimResult {
  withinOne: number;
  meanSignedError: number;
  medianItemsToSettle: number;
  gapsWithoutEvidence: number;
  honestMinusGuesser: number;
  byProfile: Record<string, Record<Facet, FacetStat>>;
}

const FACETS: Facet[] = ["recognition", "mechanism", "production"];
const KINDS: { kind: AssessItem["kind"]; facet: Facet }[] = [
  { kind: "mcq", facet: "recognition" },
  { kind: "predict", facet: "mechanism" },
  { kind: "debug", facet: "mechanism" },
  { kind: "exec", facet: "production" },
];

function poolFor(conceptIds: string[], band: Band): AssessItem[] {
  const out: AssessItem[] = [];
  for (const c of conceptIds) {
    for (const { kind, facet } of KINDS) {
      for (let n = 0; n < 4; n++) {
        out.push({
          id: `${c}#${kind}${n}`, lessonKey: c, taskId: `${kind}${n}`, kind, facet,
          band, concepts: [c], weight: 1, estMin: 4,
        });
      }
    }
  }
  return out;
}

export function runSimulation({ learners, conceptsPerLearner, seed }: SimArgs): SimResult {
  const rand = rng(seed);
  const names = Object.keys(PROFILES);
  const bandOf = () => "surface" as Band;
  const graph = { byId: new Map() } as never;

  const errors: number[] = [];
  const itemsToSettle: number[] = [];
  let gapsWithoutEvidence = 0;
  const byProfile: Record<string, Record<Facet, { sum: number; n: number }>> = {};
  const profileMeans: Record<string, number> = {};

  for (let i = 0; i < learners; i++) {
    const name = names[i % names.length];
    const profile = PROFILES[name];
    const answer = makeLearner(profile, rand);
    const conceptIds = Array.from({ length: conceptsPerLearner }, (_, k) => `c${k}`);
    const pool = poolFor(conceptIds, "surface");

    let cells = new Map<CellKey, Cell>();
    const asked = new Set<string>();
    let recentKinds: AssessItem["kind"][] = [];

    for (let step = 0; step < conceptsPerLearner * FACETS.length * 3; step++) {
      const item = nextItem({ pool, cells, candidates: conceptIds, bandOf, askedIds: asked, recentKinds });
      if (!item) break;
      asked.add(item.id);
      recentKinds = [...recentKinds, item.kind].slice(-2);
      cells = applyResponse(cells, item, { outcome: answer(item), hintsUsed: 0, elapsedMs: 0 }, bandOf, step);
    }

    byProfile[name] ??= { recognition: { sum: 0, n: 0 }, mechanism: { sum: 0, n: 0 }, production: { sum: 0, n: 0 } };
    let learnerErrorSum = 0, learnerCells = 0;

    for (const c of conceptIds) {
      for (const f of FACETS) {
        const cell = cells.get(cellKey(c, f));
        if (!cell || cell.items === 0) continue;
        const est = expectedLevel(cell.posterior);
        const truth = profile.truth[f];
        errors.push(est - truth);
        learnerErrorSum += est - truth;
        learnerCells++;
        byProfile[name][f].sum += est;
        byProfile[name][f].n += 1;
        if (isSettled(cell)) itemsToSettle.push(cell.items);
        if (est < 0.5 && cell.evidence.length === 0) gapsWithoutEvidence++;
      }
    }
    if (learnerCells > 0) {
      profileMeans[name] = (profileMeans[name] ?? 0) + learnerErrorSum / learnerCells;
    }
  }

  const sorted = [...itemsToSettle].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  return {
    withinOne: errors.filter((e) => Math.abs(e) <= 1).length / Math.max(1, errors.length),
    meanSignedError: errors.reduce((a, b) => a + b, 0) / Math.max(1, errors.length),
    medianItemsToSettle: median,
    gapsWithoutEvidence,
    honestMinusGuesser: (profileMeans["honest-beginner"] ?? 0) - (profileMeans["guesser-beginner"] ?? 0),
    byProfile: Object.fromEntries(
      Object.entries(byProfile).map(([k, v]) => [
        k,
        Object.fromEntries(FACETS.map((f) => [f, { mean: v[f].n ? v[f].sum / v[f].n : 0, n: v[f].n }])) as Record<Facet, FacetStat>,
      ]),
    ),
  };
}
```

- [ ] **Step 4: Run the gates**

Run: `cd site && bunx vitest run src/scripts/assess/simulate.test.ts`
Expected: PASS. If a gate fails, tune in this order and re-run: `SETTLE_ENTROPY` and
`MAX_ITEMS_PER_CELL` in `verdict.ts` (cost vs accuracy), then `DISCRIMINATION` and
`HINT_STEP` in `likelihood.ts` (sharpness), then `BAND_PRIOR`/`FACET_TILT` in `ordinal.ts`
(bias). Do not change the thresholds in the test.

- [ ] **Step 5: Record the tuned constants**

Add a comment block at the top of `verdict.ts` stating the simulation numbers the current
`SETTLE_ENTROPY` produces — `withinOne`, `meanSignedError`, `medianItemsToSettle` — so a
future edit can see what it is trading away.

- [ ] **Step 6: Commit**

```bash
git add site/src/scripts/assess/simulate.ts site/src/scripts/assess/simulate.test.ts site/src/scripts/assess/verdict.ts
git commit -m "test(assess): simulation gate — band recovery, bias, honesty and cost"
```

---

## Task 11: Report model and downstream writes

**Files:**
- Create: `site/src/scripts/assess/report.ts`
- Create: `site/src/scripts/assess/retest.ts`
- Modify: `site/src/scripts/path/types.ts` (`Source` += `"assess"`)
- Modify: `site/src/scripts/review-state.ts` (`CardSource` += `"assess"`)
- Test: `site/src/scripts/assess/report.test.ts`

**Interfaces:**
- Consumes: `conceptVerdict`, `detectPatterns`, `Cell`.
- Produces: `buildReport(cells, opts): AssessReportModel`, `toKnowledgeWrites(cells, atMs): { conceptId, confidence, source, lastAt }[]`, `toRetestCards(cells, lang, atMs): CardSeed[]`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/report.test.ts
import { describe, expect, test } from "vitest";
import { buildReport, toKnowledgeWrites } from "./report";
import { toRetestCards } from "./retest";
import { emptyCell } from "./update";
import { cellKey, type Cell, type CellKey } from "./types";

const measured = (conceptId: string, facet: "recognition" | "mechanism" | "production", posterior: readonly number[], outcome: "correct" | "wrong" | "dont_know" = "correct"): [CellKey, Cell] => [
  cellKey(conceptId, facet),
  {
    ...emptyCell(conceptId, facet, "surface"),
    posterior: posterior as never,
    items: 2,
    evidence: [{
      conceptId, facet, itemId: `${conceptId}#i`, kind: "predict", band: "surface",
      response: { outcome, hintsUsed: 0, elapsedMs: 1 },
      answerDigest: "…", failureNote: outcome === "wrong" ? "off-by-one in the loop bound" : undefined, atMs: 1,
    }],
  },
];

describe("buildReport", () => {
  test("untested concepts are listed separately and never counted as gaps", () => {
    const cells = new Map([measured("promises", "mechanism", [0, 0, 0.9, 0.1])]);
    const r = buildReport(cells, { scopeConcepts: ["promises", "streams"], goalConcepts: [] });
    expect(r.rows.map((x) => x.conceptId)).toEqual(["promises"]);
    expect(r.untested).toEqual(["streams"]);
    expect(r.topGaps.some((g) => g.conceptId === "streams")).toBe(false);
  });

  test("top gaps are ranked by goal impact, not alphabetically", () => {
    const cells = new Map([
      measured("aaa-irrelevant", "mechanism", [0.9, 0.1, 0, 0], "wrong"),
      measured("zzz-on-goal", "mechanism", [0.9, 0.1, 0, 0], "wrong"),
    ]);
    const r = buildReport(cells, { scopeConcepts: ["aaa-irrelevant", "zzz-on-goal"], goalConcepts: ["zzz-on-goal"] });
    expect(r.topGaps[0].conceptId).toBe("zzz-on-goal");
  });

  test("a row carries its evidence and the grader's failure note", () => {
    const cells = new Map([measured("promises", "mechanism", [0.8, 0.2, 0, 0], "wrong")]);
    const r = buildReport(cells, { scopeConcepts: ["promises"], goalConcepts: [] });
    expect(r.rows[0].evidence[0].failureNote).toBe("off-by-one in the loop bound");
  });
});

describe("toKnowledgeWrites", () => {
  test("writes a confidence for measured concepts only", () => {
    const cells = new Map([
      measured("promises", "mechanism", [0, 0, 0.9, 0.1]),
      [cellKey("streams", "mechanism"), emptyCell("streams", "mechanism", "surface")],
    ]);
    const writes = toKnowledgeWrites(cells, 1000);
    expect(writes.map((w) => w.conceptId)).toEqual(["promises"]);
    expect(writes[0].source).toBe("assess");
    expect(writes[0].confidence).toBeGreaterThan(0.5);
  });

  test("a gap writes a low confidence rather than nothing — it is a measurement too", () => {
    const cells = new Map([measured("promises", "mechanism", [0.9, 0.1, 0, 0], "wrong")]);
    expect(toKnowledgeWrites(cells, 1)[0].confidence).toBeLessThan(0.3);
  });
});

describe("toRetestCards", () => {
  test("a confirmed gap becomes a card carrying the verbatim prompt", () => {
    const cells = new Map([measured("promises", "mechanism", [0.9, 0.1, 0, 0], "wrong")]);
    const cards = toRetestCards(cells, "ru", 1000, (id) => `Объясни: ${id}`);
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toBe("Объясни: promises");
    expect(cards[0].source).toBe("assess");
  });

  test("a confidently known concept produces no card", () => {
    const cells = new Map([measured("promises", "mechanism", [0, 0, 0.1, 0.9])]);
    expect(toRetestCards(cells, "en", 1, (id) => id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/report.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Extend the two shared unions**

In `site/src/scripts/path/types.ts`:

```ts
export type Source = "pretest" | "diagnostic" | "activity" | "declared" | "review" | "assess";
```

In `site/src/scripts/review-state.ts`:

```ts
export type CardSource = "retrieval" | "practice" | "assess";
```

- [ ] **Step 4: Write report.ts**

```ts
// site/src/scripts/assess/report.ts
// Cells → the report model the UI renders and the writes the rest of the app consumes.
import type { Source } from "~/scripts/path/types";
import { expectedLevel } from "./ordinal";
import { detectPatterns, type PatternId } from "./patterns";
import { conceptVerdict, type ConceptVerdict } from "./verdict";
import { FACETS, LEVELS, cellKey, type Cell, type CellKey, type Evidence } from "./types";

export interface ReportRow {
  conceptId: string;
  verdict: ConceptVerdict;
  patterns: PatternId[];
  evidence: Evidence[];
}

export interface AssessReportModel {
  rows: ReportRow[];
  untested: string[];
  topGaps: ReportRow[];
  hiddenStrengths: ReportRow[];
}

export interface ReportOpts {
  scopeConcepts: string[];
  /** Concepts the active goal needs — used to rank gaps by impact, not alphabetically. */
  goalConcepts: string[];
}

const evidenceOf = (cells: ReadonlyMap<CellKey, Cell>, conceptId: string): Evidence[] =>
  FACETS.flatMap((f) => cells.get(cellKey(conceptId, f))?.evidence ?? []);

const GAP_LEVEL = 1.0;    // expected level below this is a gap worth acting on
const STRONG_LEVEL = 2.2;

export function buildReport(cells: ReadonlyMap<CellKey, Cell>, opts: ReportOpts): AssessReportModel {
  const rows: ReportRow[] = [];
  const untested: string[] = [];

  for (const conceptId of opts.scopeConcepts) {
    const verdict = conceptVerdict(cells, conceptId);
    if (verdict.status === "untested") { untested.push(conceptId); continue; }
    rows.push({ conceptId, verdict, patterns: detectPatterns(verdict), evidence: evidenceOf(cells, conceptId) });
  }

  const levelOf = (r: ReportRow) => LEVELS.indexOf(r.verdict.band!.level);
  const onGoal = new Set(opts.goalConcepts);

  const topGaps = rows
    .filter((r) => levelOf(r) <= GAP_LEVEL)
    .sort((a, b) => {
      const impact = (r: ReportRow) => (onGoal.has(r.conceptId) ? 1 : 0) * 10 + r.verdict.band!.confidence;
      return impact(b) - impact(a);
    });

  const hiddenStrengths = rows.filter((r) => levelOf(r) >= STRONG_LEVEL);
  return { rows, untested, topGaps, hiddenStrengths };
}

export interface KnowledgeWrite {
  conceptId: string;
  confidence: number;
  source: Source;
  lastAt: number;
}

/**
 * Collapse the facet vector into the single `confidence` the path engine understands.
 * Only measured concepts are written — an untested concept must leave KnowledgeState alone.
 */
export function toKnowledgeWrites(cells: ReadonlyMap<CellKey, Cell>, atMs: number): KnowledgeWrite[] {
  const byConcept = new Map<string, number[]>();
  for (const cell of cells.values()) {
    if (cell.items === 0) continue;
    const list = byConcept.get(cell.conceptId) ?? [];
    list.push(expectedLevel(cell.posterior) / (LEVELS.length - 1)); // → 0..1
    byConcept.set(cell.conceptId, list);
  }
  return [...byConcept.entries()]
    .map(([conceptId, values]) => ({
      conceptId,
      confidence: Math.min(...values), // weakest measured facet, same rule as the band
      source: "assess" as Source,
      lastAt: atMs,
    }))
    .sort((a, b) => a.conceptId.localeCompare(b.conceptId));
}
```

- [ ] **Step 5: Write retest.ts**

```ts
// site/src/scripts/assess/retest.ts
// Confirmed gaps and fragile concepts → spaced-repetition cards carrying the verbatim
// question, so the re-test is the same question, not a paraphrase (spec §9.3).
import type { CardSeed } from "~/scripts/review-state";
import { expectedLevel } from "./ordinal";
import { LEVELS, type Cell, type CellKey } from "./types";

/** Two to four weeks out, per the spec; the SRS scheduler takes over from there. */
export const RETEST_DELAY_MS = 21 * 24 * 60 * 60 * 1000;

const RETEST_LEVEL = 1.2;

export function toRetestCards(
  cells: ReadonlyMap<CellKey, Cell>,
  lang: "en" | "ru",
  atMs: number,
  promptFor: (conceptId: string, cell: Cell) => string,
): CardSeed[] {
  const out: CardSeed[] = [];
  let index = 0;
  for (const cell of cells.values()) {
    if (cell.items === 0) continue;
    const level = expectedLevel(cell.posterior);
    const fragile = cell.evidence.some((e) => e.response.outcome === "correct" && e.response.hintsUsed >= 2);
    if (level > RETEST_LEVEL && !fragile) continue;

    const note = cell.evidence.map((e) => e.failureNote).filter(Boolean).join("; ");
    out.push({
      cardKey: `assess:${cell.conceptId}:${cell.facet}:${atMs}`,
      lessonKey: cell.evidence[0]?.lessonKey ?? cell.conceptId,
      source: "assess",
      index: index++,
      front: promptFor(cell.conceptId, cell),
      back: note || LEVELS[Math.round(level)],
      lang,
    });
  }
  return out;
}
```

`Evidence.lessonKey` already exists (Task 1) and is populated by `applyResponse`
(Task 3) — `retest.ts` reads it directly, no patching needed.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd site && bunx vitest run src/scripts/assess/report.test.ts src/scripts/assess/update.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add site/src/scripts/assess/report.ts site/src/scripts/assess/retest.ts site/src/scripts/assess/types.ts \
        site/src/scripts/assess/update.ts site/src/scripts/assess/report.test.ts \
        site/src/scripts/path/types.ts site/src/scripts/review-state.ts
git commit -m "feat(assess): report model, knowledge writes and verbatim re-test cards"
```

---

## Task 12: The `/assess` screen

**Files:**
- Create: `site/src/pages/[lang]/assess.astro`
- Create: `site/src/components/assess/AssessFlow.tsx`
- Create: `site/src/components/assess/ScopePicker.tsx`
- Create: `site/src/components/assess/ItemView.tsx`
- Create: `site/src/components/assess/HintLadder.tsx`
- Create: `site/src/components/assess/BlockVerdict.tsx`
- Create: `site/src/components/assess/AssessReport.tsx`
- Create: `site/src/styles/assess-screen.css`
- Modify: `site/src/components/atlas/TopNav.astro`, `site/src/i18n/ui.json`
- Test: `site/e2e/assess.spec.ts`

**Interfaces:**
- Consumes: `startSession`/`reduce` (Task 8), `nextItem` (Task 7), `buildPool` (Task 6), graders (Task 9), `buildReport`/`toKnowledgeWrites` (Task 11), `loadSession`/`saveSession` (Task 8).
- Produces: the route `/[lang]/assess` and the island `AssessFlow`.

- [ ] **Step 1: Write the failing e2e test**

```ts
// site/e2e/assess.spec.ts
import { test, expect } from "@playwright/test";

test("an audit block runs, records an answer, and ends with a partial verdict", async ({ page }) => {
  test.slow();
  await page.goto("/ru/assess");

  // Scope: pick one track and start.
  await page.getByRole("button", { name: /Выбрать тему|databases/i }).first().click();
  await page.getByRole("button", { name: /Начать/ }).click();

  const item = page.locator(".assess-item");
  await expect(item).toBeVisible();

  // "I don't know" is a first-class answer and must be reachable without guessing.
  await expect(page.getByRole("button", { name: /Не знаю/ })).toBeVisible();
  await page.getByRole("button", { name: /Не знаю/ }).click();

  // Progress is visible and the session survives a reload (resumable, spec §7).
  await expect(page.locator(".assess-progress")).toContainText("1");
  await page.reload();
  await expect(page.locator(".assess-item, .assess-block-verdict")).toBeVisible();
});

test("stopping mid-session reports untested concepts as untested, not as gaps", async ({ page }) => {
  test.slow();
  await page.goto("/ru/assess");
  await page.getByRole("button", { name: /Выбрать тему|databases/i }).first().click();
  await page.getByRole("button", { name: /Начать/ }).click();
  await page.getByRole("button", { name: /Не знаю/ }).click();
  await page.getByRole("button", { name: /Завершить/ }).click();

  const report = page.locator(".assess-report");
  await expect(report).toBeVisible();
  await expect(report.locator(".ar-untested")).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd site && E2E_BASE_URL=http://localhost:4321 bunx playwright test e2e/assess.spec.ts`
Expected: FAIL — `/ru/assess` 404s.

- [ ] **Step 3: Write the route**

```astro
---
// site/src/pages/[lang]/assess.astro
import Atlas from "~/layouts/Atlas.astro";
import AssessFlow from "~/components/assess/AssessFlow.tsx";
import { isLocale, t, type Locale } from "~/i18n";
import { selectOther } from "~/scripts/build-incremental";
import "~/styles/assess-screen.css";

export function getStaticPaths() {
  return selectOther((["en", "ru"] as const).map((lang) => ({ params: { lang } })));
}

const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error(`Unknown locale: ${lang}`);
---

<Atlas title={t("assess.title", lang)} lang={lang} description={t("assess.blurb", lang)}>
  <div class="oa-wrap screen">
    <header class="oa-pagehead oa-pagehead-wide">
      <p class="kicker">{t("assess.kicker", lang)}</p>
      <h1>{t("assess.title", lang)}</h1>
      <p class="ph-blurb">{t("assess.blurb", lang)}</p>
    </header>
    <AssessFlow client:only="preact" lang={lang} />
  </div>
</Atlas>
```

- [ ] **Step 4: Write the island**

`AssessFlow.tsx` owns exactly three things the pure core deliberately does not: the clock,
storage, and the item's content lookup. Everything else delegates.

```tsx
// site/src/components/assess/AssessFlow.tsx
import { useEffect, useMemo, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { loadSession, saveSession, clearSession } from "~/scripts/assess-io";
import { reduce, startSession, type AssessState } from "~/scripts/assess/session";
import { nextItem } from "~/scripts/assess/select";
import { buildPool } from "~/scripts/assess/item-pool";
import { buildReport } from "~/scripts/assess/report";
import { readProgress } from "~/scripts/practice-state";
import ScopePicker from "./ScopePicker";
import ItemView from "./ItemView";
import BlockVerdict from "./BlockVerdict";
import AssessReport from "./AssessReport";

export default function AssessFlow({ lang }: { lang: Locale }) {
  const [state, setState] = useState<AssessState | null>(() => loadSession());
  const [deps, setDeps] = useState<Awaited<ReturnType<typeof loadDeps>> | null>(null);

  useEffect(() => { void loadDeps().then(setDeps); }, []);
  useEffect(() => { if (state) saveSession(state); }, [state]);

  // Serve the next item whenever we are asking and have none in hand.
  useEffect(() => {
    if (!state || !deps || state.phase !== "asking" || state.current) return;
    const item = nextItem({
      pool: deps.pool, cells: state.cells, candidates: deps.candidatesFor(state.scope),
      bandOf: deps.bandOf, askedIds: state.asked, recentKinds: state.recentKinds,
    });
    setState(item
      ? reduce(state, { type: "serve", item, atMs: Date.now() }, deps.session)
      : reduce(state, { type: "stop", atMs: Date.now() }, deps.session));
  }, [state, deps]);

  if (!deps) return <p class="assess-loading">…</p>;
  if (!state) return <ScopePicker lang={lang} onStart={(scope) => setState(startSession(scope, Date.now()))} />;

  if (state.phase === "report") {
    const model = buildReport(state.cells, {
      scopeConcepts: deps.candidatesFor(state.scope),
      goalConcepts: deps.goalConcepts,
    });
    return <AssessReport lang={lang} model={model} onRestart={() => { clearSession(); setState(null); }} />;
  }

  if (state.phase === "block-verdict") {
    return (
      <BlockVerdict
        lang={lang}
        state={state}
        onContinue={() => setState(reduce(state, { type: "next-block", atMs: Date.now() }, deps.session))}
        onStop={() => setState(reduce(state, { type: "stop", atMs: Date.now() }, deps.session))}
      />
    );
  }

  return (
    <ItemView
      lang={lang}
      item={state.current}
      hintsUsed={state.hintsUsed}
      onHint={() => setState(reduce(state, { type: "hint", atMs: Date.now() }, deps.session))}
      onAnswer={(response, meta) =>
        setState(reduce(state, { type: "answer", response, meta, atMs: Date.now() }, deps.session))}
      onStop={() => setState(reduce(state, { type: "stop", atMs: Date.now() }, deps.session))}
    />
  );
}

/** Lazy: the item index and concept graph are large and must not enter the initial bundle. */
async function loadDeps() {
  const [{ default: index }, { default: concepts }, graphMod] = await Promise.all([
    import("~/content/path/assess-items.json"),
    import("~/content/path/concepts.json"),
    import("~/scripts/path/graph"),
  ]);
  const bandById = new Map((concepts as { id: string; band: string }[]).map((c) => [c.id, c.band]));
  const trackById = new Map((concepts as { id: string; track: string }[]).map((c) => [c.id, c.track]));
  const pool = buildPool(index as never, readProgress);
  const graph = graphMod.buildGraph(concepts as never);
  return {
    pool,
    bandOf: (id: string) => (bandById.get(id) ?? "surface") as never,
    candidatesFor: (scope: string[]) =>
      [...trackById.entries()].filter(([, tr]) => scope.includes(tr)).map(([id]) => id),
    goalConcepts: [] as string[],
    session: { pool, candidates: [] as string[], bandOf: (id: string) => (bandById.get(id) ?? "surface") as never, graph },
  };
}
```

- [ ] **Step 5: Write the remaining components**

`ScopePicker.tsx` — track checkboxes plus "everything", a `Начать` / `Start` button.
`HintLadder.tsx` — up to two hint buttons; each click calls `onHint` and reveals the next
hint text from the task.
`ItemView.tsx` — renders by `item.kind`: `mcq` → choices; `predict` → text input;
`exec` → the existing `CodeDrawer` launcher; `debug`/`review` → the practice components;
`explain` → textarea. Every kind renders three controls: submit, **`Не знаю` / `I don't
know`**, and `Завершить` / `Finish`. Grading calls the Task 9 graders and passes
`{ outcome, failureNote }` up as `meta`.
`BlockVerdict.tsx` — the block's cells with their `bandLabel` and patterns, plus
`Продолжить` / `Завершить`.
`AssessReport.tsx` — the four sections of `AssessReportModel` (`rows`, `topGaps`,
`hiddenStrengths`, `untested` inside `.ar-untested`), with a button that applies
`toKnowledgeWrites` and `toRetestCards`.

Every string goes through `t()` with an `assess.*` key added to `src/i18n/ui.json` in both
locales. Container class names must match the e2e selectors: `.assess-item`,
`.assess-progress`, `.assess-block-verdict`, `.assess-report`, `.ar-untested`.

- [ ] **Step 6: Run the e2e test**

Run: `cd site && NODE_OPTIONS=--max-old-space-size=10240 bun run dev --port 4321` in one
shell, then `E2E_BASE_URL=http://localhost:4321 bunx playwright test e2e/assess.spec.ts`.
Expected: PASS, 2 tests.

- [ ] **Step 7: Commit**

```bash
git add site/src/pages/\[lang\]/assess.astro site/src/components/assess site/src/styles/assess-screen.css \
        site/src/i18n/ui.json site/src/components/atlas/TopNav.astro site/e2e/assess.spec.ts
git commit -m "feat(assess): the /assess screen — scope, blocks, verdicts and report"
```

---

## Task 13: Optional LLM layer for explanations

**Files:**
- Create: `site/src/scripts/assess/llm-grade.ts`
- Modify: `site/src/components/assess/ItemView.tsx`
- Test: `site/src/scripts/assess/llm-grade.test.ts`

**Interfaces:**
- Consumes: `hasKey`/`gradeWithLlm` from `~/scripts/practice-grade-llm`.
- Produces: `buildAssessRubric(item, conceptLabel)`, `parseFacetVerdict(raw)`, `llmAvailable()`.

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/assess/llm-grade.test.ts
import { describe, expect, test } from "vitest";
import { parseFacetVerdict, clampAgainstDeterministic } from "./llm-grade";

describe("parseFacetVerdict", () => {
  test("reads a level and a one-line justification", () => {
    const v = parseFacetVerdict('{"level":"middle","why":"names the mechanism, misses the failure mode"}');
    expect(v).toEqual({ level: "middle", why: "names the mechanism, misses the failure mode" });
  });

  test("garbage in means no verdict, not a guessed one", () => {
    expect(parseFacetVerdict("I think they did well!")).toBeNull();
  });

  test("an out-of-range level is rejected", () => {
    expect(parseFacetVerdict('{"level":"godlike","why":"x"}')).toBeNull();
  });
});

describe("clampAgainstDeterministic", () => {
  test("the LLM may move a cell by at most one level (spec §12)", () => {
    expect(clampAgainstDeterministic("gap", "senior")).toBe("junior");
    expect(clampAgainstDeterministic("senior", "gap")).toBe("middle");
  });
  test("a one-level move is allowed through unchanged", () => {
    expect(clampAgainstDeterministic("junior", "middle")).toBe("middle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run src/scripts/assess/llm-grade.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// site/src/scripts/assess/llm-grade.ts
// The optional BYOK layer. It grades free-text explanations and may nudge a cell by one
// level — never more, so a drifting model cannot rewrite a deterministic measurement.
import { LEVELS, type Level } from "./types";

export interface FacetVerdict {
  level: Level;
  why: string;
}

export function parseFacetVerdict(raw: string): FacetVerdict | null {
  try {
    const j = JSON.parse(raw) as { level?: unknown; why?: unknown };
    if (typeof j.level !== "string" || typeof j.why !== "string") return null;
    if (!(LEVELS as readonly string[]).includes(j.level)) return null;
    return { level: j.level as Level, why: j.why };
  } catch {
    return null;
  }
}

/** Clamp the model's opinion to ±1 level around the deterministic estimate. */
export function clampAgainstDeterministic(deterministic: Level, llm: Level): Level {
  const d = LEVELS.indexOf(deterministic);
  const l = LEVELS.indexOf(llm);
  const clamped = Math.max(d - 1, Math.min(d + 1, l));
  return LEVELS[clamped];
}

export const ASSESS_RUBRIC_EN = [
  "Return ONLY JSON: {\"level\":\"gap|junior|middle|senior\",\"why\":\"one line\"}.",
  "gap: cannot state the idea. junior: states it, no mechanism. middle: explains the mechanism and one failure mode. senior: explains the mechanism, the tradeoff, and when it breaks.",
  "Judge only what the learner wrote. Do not credit what they might have meant.",
].join("\n");

export const ASSESS_RUBRIC_RU = [
  "Верни ТОЛЬКО JSON: {\"level\":\"gap|junior|middle|senior\",\"why\":\"одна строка\"}.",
  "gap: не может сформулировать идею. junior: формулирует, механизма нет. middle: объясняет механизм и один режим отказа. senior: объясняет механизм, компромисс и когда он ломается.",
  "Оценивай только написанное. Не додумывай за ученика.",
].join("\n");
```

- [ ] **Step 4: Wire it into `ItemView.tsx`**

For `explain` items: if `hasKey()` is false, render the deterministic path (self-grade
against the model answer, same as practice) and set a `llmUnavailable` flag on the
session's report so `AssessReport` prints, in both locales: *"mechanism measured from
predict/debug items only; free-text explanation was not assessed."* Never degrade
silently.

- [ ] **Step 5: Run tests**

Run: `cd site && bunx vitest run src/scripts/assess/llm-grade.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Full gate + commit**

```bash
cd site && bun run lint:src && bun run test
git add site/src/scripts/assess/llm-grade.ts site/src/scripts/assess/llm-grade.test.ts site/src/components/assess/ItemView.tsx
git commit -m "feat(assess): optional BYOK explanation grading, clamped to one level"
```

---

## Self-review notes

- **Spec coverage:** §3 → Tasks 1–2; §4 → Tasks 2–3, 7; §5 → Tasks 5–6; §6 → Task 7;
  §7 → Task 8; §8 → Tasks 9, 13; §9 → Tasks 4, 11, 12; §10 → Task 10; §11 non-goals are
  respected (no timing in the likelihood — `elapsedMs` is recorded and unused; no LLM item
  generation); §12 risks → burned items (Task 6), one-level clamp (Task 13), coverage
  report (Task 5); §13 file inventory matches the File Structure section above.
- **Deferred in the spec, resolved here:** §14 (authored-layer size) is answered by Task 5
  Step 5 — the coverage numbers decide it, and the authoring itself is a follow-up plan,
  not part of this one.
- **Known follow-ups, deliberately out of scope:** the authored item layer
  (`src/content/assess/*.json` + schema), and surfacing `/assess` results on the readiness
  dashboard. Both need this engine to exist first.
