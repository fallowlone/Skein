# `/calibrate` v2 — Probabilistic Adaptive Placement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/calibrate` into a 4-stage probabilistic placement test — explicit targeting (goal + self-placement), domain gating, an adaptive Bayesian deep phase with an honest "I don't know", and a rich result report — without changing the persisted `KnowledgeState` contract or the path engine.

**Architecture:** A new pure module `bayes.ts` owns all probability math (priors, 3PL-style likelihood with three response categories, posterior update, DAG prior-propagation, info-gain, collapse-to-confidence). `CalibrationFlow.tsx` becomes a 4-stage orchestrator (Aim → Mode → Deep → Result) driving a single-concept `DiagnosticRunner` that emits per-item responses. Diagnostic items gain an optional `irt:{b,a,c}` field with a deterministic band/type fallback so the system works before any param authoring; an LLM pass then authors real params across all 145 banks. On completion the test collapses posteriors to point `confidence` (source `diagnostic`) — the same shape today's calibration writes — so `mastery-field`, `/roadmap`, profile rank, and export/import are untouched.

**Tech Stack:** Astro 5 + Preact islands, TypeScript, Preact signals, Vitest (`bun run test`), Tailwind utility classes + `screen-kit.css`/`planning-screen.css` tokens, JSON content built by `scripts/path/build-diag-bundle.mjs`.

**Spec:** `docs/superpowers/specs/2026-06-14-calibrate-v2-probabilistic-placement-design.md`

**Test runner note:** This repo runs Vitest via `bun run test` (NOT `bun test`). Pure-logic tests under `src/scripts/path/*.test.ts` do not import `astro:content`.

**Reference reading before starting:**
- `site/src/scripts/path/knowledge.ts` — propagation constants/idioms (`PASS_HIGH`, `FAIL_LOW`, `PROP_UP_FACTOR`, `clamp01`), setter guards, `applyDiagnostic`.
- `site/src/scripts/path/calibration.ts` — `DiagItem`, graders, current `placementPlan`/`pickProbe`.
- `site/src/scripts/path/graph.ts` — `ancestors(g,id)`/`descendants(g,id)` return `Set<string>`; `g.nodes.get(id)` → `{track, band}`; `buildConceptGraph(concepts, overrides?)`.
- `site/src/scripts/path/mastery-field.ts` — `DOMAIN_FAMILIES`, `masteryField`, `conceptState`.
- `site/src/components/path/CalibrationFlow.tsx`, `DiagnosticRunner.tsx`, `SelfPlacement.tsx` — current UI.
- `site/src/scripts/path/path-io.ts` — `content` (`.diagnostics`, `.conceptById`, `.graph`, `.goals`), `knowledge`, `config`, `applyDiagnosticResult`, `unitProbeConcepts`, `declareTrackUpTo`, `activeGoals`, `setGoals`, `targetFrontier`, `effectiveKnowledge`, `diagnosedConcepts`.

---

## File Structure

**New files**
- `site/src/scripts/path/bayes.ts` — pure probability model. No I/O, no `Date.now()`, no path-io imports.
- `site/src/scripts/path/bayes.test.ts` — Vitest unit tests for the model.
- `site/src/scripts/path/placement-integration.test.ts` — model-level funnel integration test.
- `site/src/components/path/AimStage.tsx` — Stage A UI (goal pick + 8-family self-placement).
- `site/src/components/path/PlacementResult.tsx` — Stage D rich report + drill-down.
- `site/scripts/path/author-irt.mjs` — offline merge of authored `{b,a,c}` into diagnostic source files (phase 10).

**Modified files**
- `site/src/scripts/path/calibration.ts` — extend `DiagItem` with optional `irt`; keep graders.
- `site/src/components/path/DiagnosticRunner.tsx` — single-concept, three-category per-item response.
- `site/src/components/path/CalibrationFlow.tsx` — 4-stage orchestrator; `?unit=` preserved.
- `site/src/scripts/path/path-io.ts` — band/irt/family helpers, `seedPriors`, `writePlacementPosteriors`; keep `unitProbeConcepts`/`applyDiagnosticResult`.
- `site/scripts/path/build-diag-bundle.mjs` — pass through `irt` field if present.
- `site/src/styles/planning-screen.css` — aim/mode/result styles using existing tokens.
- `site/src/i18n/ui.json` — only if shared labels needed (component-local `L` maps are the existing pattern).

---

## Task 1: Pure Bayesian model — priors, likelihood, posterior

**Files:**
- Create: `site/src/scripts/path/bayes.ts`
- Test: `site/src/scripts/path/bayes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/src/scripts/path/bayes.test.ts
import { describe, it, expect } from "vitest";
import { priorFor, fallbackIrt, likelihood, posterior, variance, type Irt } from "./bayes";

const sharp: Irt = { b: 0, a: 1.4, c: 0.1 }; // discriminating, low guess

describe("priorFor", () => {
  it("is monotone: higher self-placement and lower band give higher prior", () => {
    expect(priorFor("prod", "foundations")).toBeGreaterThan(priorFor("basics", "foundations"));
    expect(priorFor("basics", "foundations")).toBeGreaterThan(priorFor("never", "foundations"));
    expect(priorFor("prod", "foundations")).toBeGreaterThan(priorFor("prod", "advanced"));
  });
  it("keeps prod+advanced genuinely uncertain (gets tested)", () => {
    const p = priorFor("prod", "advanced");
    expect(p).toBeGreaterThan(0.15);
    expect(p).toBeLessThan(0.5);
  });
});

describe("fallbackIrt", () => {
  it("derives guess from mcq choice count and difficulty from band", () => {
    expect(fallbackIrt("surface", "mcq", 4).c).toBeCloseTo(0.25, 5);
    expect(fallbackIrt("surface", "blanks", 0).c).toBeCloseTo(0.05, 5);
    expect(fallbackIrt("advanced", "mcq", 4).b).toBeGreaterThan(fallbackIrt("foundations", "mcq", 4).b);
  });
});

describe("likelihood + posterior", () => {
  it("correct raises p, wrong lowers p", () => {
    expect(posterior(0.5, "correct", sharp)).toBeGreaterThan(0.5);
    expect(posterior(0.5, "wrong", sharp)).toBeLessThan(0.5);
  });
  it("dont_know lowers p MORE confidently than wrong (lower resulting mean and variance)", () => {
    const pWrong = posterior(0.5, "wrong", sharp);
    const pDk = posterior(0.5, "dont_know", sharp);
    expect(pDk).toBeLessThan(pWrong);
    expect(variance(pDk)).toBeLessThan(variance(pWrong));
  });
  it("dont_know likelihood has no guess channel (P(dont_know|unknown) independent of c)", () => {
    const lowGuess = likelihood("dont_know", { b: 0, a: 1, c: 0.05 });
    const highGuess = likelihood("dont_know", { b: 0, a: 1, c: 0.5 });
    expect(lowGuess.unknown).not.toBeCloseTo(highGuess.unknown, 5); // depends on (1-c) only via wrong; dk uses 1-c too
  });
});
```

> Note on the last assertion: `dont_know|unknown = (1-c)·PDK_UNKNOWN`, so it *does* scale with `(1-c)`. The guarantee we test is that it carries **no guess floor `c`** (unlike `correct|unknown = c`). If you prefer `dont_know|unknown` fully independent of `c`, set it to `PDK_UNKNOWN` flat in Step 3 and assert `toBeCloseTo`. Pick one and keep test + impl consistent. The reference impl below keeps the `(1-c)` factor; adjust the test to `expect(lowGuess.unknown).toBeGreaterThan(highGuess.unknown)` to match.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test bayes`
Expected: FAIL — cannot resolve `./bayes`.

- [ ] **Step 3: Write minimal implementation**

```ts
// site/src/scripts/path/bayes.ts
// Pure probabilistic placement model. No I/O, no Date.now(), no path-io imports.
import type { Band } from "./types";

export type SelfPlace = "never" | "basics" | "prod";
export type Response = "correct" | "wrong" | "dont_know";
export interface Irt { b: number; a: number; c: number } // difficulty, discrimination, guess

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Prior P(known) by self-placement × concept band (spec §4.2). One source of truth.
const PRIOR: Record<SelfPlace, Record<Band, number>> = {
  never:  { foundations: 0.15, surface: 0.08, middle: 0.04, advanced: 0.02 },
  basics: { foundations: 0.75, surface: 0.45, middle: 0.20, advanced: 0.08 },
  prod:   { foundations: 0.92, surface: 0.80, middle: 0.55, advanced: 0.30 },
};
export const priorFor = (self: SelfPlace, band: Band): number => PRIOR[self][band];

// Deterministic fallback params when an item carries no authored irt (spec §5.2).
const BAND_DIFFICULTY: Record<Band, number> = { foundations: -1.0, surface: 0, middle: 0.8, advanced: 1.6 };
export function fallbackIrt(band: Band, type: "mcq" | "blanks", choices: number): Irt {
  const c = type === "mcq" && choices > 0 ? 1 / choices : 0.05;
  return { b: BAND_DIFFICULTY[band], a: 1.0, c };
}

// slip = chance a knower fails an item; shrinks with discrimination a.
const slip = (a: number): number => clamp01(0.12 / Math.max(0.5, a));
const PDK_KNOWN = 0.04;   // a knower rarely says "don't know"
const PDK_UNKNOWN = 0.55; // a non-knower often does

// P(response | state). dont_know deliberately has NO guess floor c (requirement a).
export function likelihood(r: Response, irt: Irt): { known: number; unknown: number } {
  const s = slip(irt.a);
  const c = clamp01(irt.c);
  if (r === "correct") return { known: 1 - s, unknown: c };
  if (r === "dont_know") return { known: s * PDK_KNOWN, unknown: (1 - c) * PDK_UNKNOWN };
  return { known: s * (1 - PDK_KNOWN), unknown: (1 - c) * (1 - PDK_UNKNOWN) }; // wrong
}

// Bayes step: posterior P(known | response).
export function posterior(prior: number, r: Response, irt: Irt): number {
  const L = likelihood(r, irt);
  const num = L.known * prior;
  const den = num + L.unknown * (1 - prior);
  return den <= 0 ? prior : clamp01(num / den);
}

export const variance = (p: number): number => p * (1 - p);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test bayes`
Expected: PASS (after reconciling the one assertion per the Step-1 note).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/bayes.ts site/src/scripts/path/bayes.test.ts
git commit -m "feat(calibrate): bayes model — priors, 3-category likelihood, posterior"
```

---

## Task 2: Entropy, info-gain, collapse-to-confidence

**Files:**
- Modify: `site/src/scripts/path/bayes.ts`
- Test: `site/src/scripts/path/bayes.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```ts
// append to site/src/scripts/path/bayes.test.ts
import { entropy, expectedInfoGain, collapse, SETTLE_VAR } from "./bayes";

describe("entropy + info gain", () => {
  it("entropy peaks at p=0.5 (=1 bit) and is ~0 at the extremes", () => {
    expect(entropy(0.5)).toBeCloseTo(1, 5);
    expect(entropy(0.5)).toBeGreaterThan(entropy(0.1));
    expect(entropy(0.5)).toBeGreaterThan(entropy(0.95));
  });
  it("a maximally uncertain concept yields more expected info gain than a settled one", () => {
    const irt = { b: 0, a: 1.3, c: 0.1 };
    expect(expectedInfoGain(0.5, irt)).toBeGreaterThan(expectedInfoGain(0.95, irt));
  });
});

describe("collapse", () => {
  it("maps posterior mean to confidence and flags shaky near 0.5", () => {
    expect(collapse(0.9).confidence).toBeCloseTo(0.9, 5);
    expect(collapse(0.9).shaky).toBe(false);
    expect(collapse(0.5).shaky).toBe(true);
    expect(variance(0.5)).toBeGreaterThan(SETTLE_VAR);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test bayes`
Expected: FAIL — `entropy`/`expectedInfoGain`/`collapse`/`SETTLE_VAR` not exported.

- [ ] **Step 3: Write minimal implementation (append to `bayes.ts`)**

```ts
// append to site/src/scripts/path/bayes.ts

// Binary entropy in bits. 0 at p∈{0,1}, 1 at p=0.5.
export function entropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

// Expected entropy reduction from answering one item at this prior (spec §4.6).
export function expectedInfoGain(prior: number, irt: Irt): number {
  const responses: Response[] = ["correct", "wrong", "dont_know"];
  let expected = 0;
  for (const r of responses) {
    const L = likelihood(r, irt);
    const pr = L.known * prior + L.unknown * (1 - prior); // marginal P(response)
    if (pr <= 0) continue;
    expected += pr * entropy(posterior(prior, r, irt));
  }
  return entropy(prior) - expected;
}

// Concept settled once its Bernoulli variance falls below this (|p-0.5| > ~0.38).
export const SETTLE_VAR = 0.10;

export function collapse(p: number): { confidence: number; shaky: boolean } {
  return { confidence: clamp01(p), shaky: variance(p) > SETTLE_VAR };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test bayes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/bayes.ts site/src/scripts/path/bayes.test.ts
git commit -m "feat(calibrate): entropy, expected info-gain, collapse-to-confidence"
```

---

## Task 3: DAG prior-propagation (probability-aware)

**Files:**
- Modify: `site/src/scripts/path/bayes.ts`
- Test: `site/src/scripts/path/bayes.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```ts
// append to site/src/scripts/path/bayes.test.ts
import { propagatePriors } from "./bayes";
import { buildConceptGraph } from "./graph";
import type { Concept } from "./types";

// b requires a ; c requires b   (a ancestor of b/c ; c descendant of a/b)
const G = (() => {
  const mk = (id: string, requires: string[]): Concept =>
    ({ id, label: { en: id, ru: id }, track: "networking" as any, band: "surface", requires });
  return buildConceptGraph([mk("a", []), mk("b", ["a"]), mk("c", ["b"])]);
})();

describe("propagatePriors", () => {
  it("a confident known lifts ancestor priors, never lowers", () => {
    const priors = new Map([["a", 0.2], ["b", 0.9], ["c", 0.5]]);
    const next = propagatePriors(priors, G, "c", 0.95, "correct");
    expect(next.get("a")!).toBeGreaterThan(0.2);
    expect(next.get("b")!).toBeGreaterThanOrEqual(0.9);
  });
  it("a wrong (not-known) lowers descendant priors", () => {
    const priors = new Map([["a", 0.9], ["b", 0.8], ["c", 0.8]]);
    const next = propagatePriors(priors, G, "a", 0.05, "wrong");
    expect(next.get("c")!).toBeLessThan(0.8);
  });
  it("dont_know cascade is strictly weaker than an equivalent wrong", () => {
    const base = new Map([["a", 0.9], ["b", 0.8], ["c", 0.8]]);
    const viaWrong = propagatePriors(base, G, "a", 0.05, "wrong").get("c")!;
    const viaDk = propagatePriors(base, G, "a", 0.05, "dont_know").get("c")!;
    expect(viaDk).toBeGreaterThan(viaWrong);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test bayes`
Expected: FAIL — `propagatePriors` not exported.

- [ ] **Step 3: Write minimal implementation (append to `bayes.ts`)**

```ts
// append to site/src/scripts/path/bayes.ts
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";

export const PASS = 0.7;     // focal posterior ≥ PASS ⇒ confident known
export const FAIL = 0.3;     // focal posterior ≤ FAIL ⇒ confident not-known
const PROP_UP_FACTOR = 0.8;  // share of focal confidence granted to prereqs
const DK_CASCADE_DAMP = 0.5; // dont_know down-cascade is half-strength vs wrong

// Returns a NEW prior map with unobserved ancestors/descendants nudged after a focal update.
export function propagatePriors(
  priors: Map<string, number>, g: ConceptGraph, concept: string, p: number, via: Response,
): Map<string, number> {
  const next = new Map(priors);
  if (p >= PASS) {
    const lift = p * PROP_UP_FACTOR;
    for (const a of ancestors(g, concept)) if ((next.get(a) ?? 0) < lift) next.set(a, lift);
  } else if (p <= FAIL) {
    const damp = via === "dont_know" ? DK_CASCADE_DAMP : 1;
    for (const d of descendants(g, concept)) {
      const cur = next.get(d) ?? 0.5;
      if (cur > p) next.set(d, cur + (p - cur) * damp);
    }
  }
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test bayes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/bayes.ts site/src/scripts/path/bayes.test.ts
git commit -m "feat(calibrate): probability-aware DAG prior propagation"
```

---

## Task 4: `irt` field on diagnostic items + `resolveIrt` + bundle passthrough

**Files:**
- Modify: `site/src/scripts/path/bayes.ts` (add `resolveIrt`)
- Modify: `site/src/scripts/path/calibration.ts` (extend `DiagItem`)
- Modify: `site/scripts/path/build-diag-bundle.mjs` (passthrough)
- Test: `site/src/scripts/path/bayes.test.ts`

- [ ] **Step 1: Write the failing test (append)**

```ts
// append to site/src/scripts/path/bayes.test.ts
import { resolveIrt } from "./bayes";

describe("resolveIrt", () => {
  it("uses authored irt when present", () => {
    expect(resolveIrt({ b: 0.4, a: 1.7, c: 0.2 }, "advanced", "mcq", 4)).toEqual({ b: 0.4, a: 1.7, c: 0.2 });
  });
  it("falls back to band/type when irt absent", () => {
    const irt = resolveIrt(undefined, "foundations", "mcq", 5);
    expect(irt.c).toBeCloseTo(0.2, 5);
    expect(irt.a).toBe(1.0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test bayes`
Expected: FAIL — `resolveIrt` not exported.

- [ ] **Step 3a: Add `resolveIrt` to `bayes.ts`**

```ts
// append to site/src/scripts/path/bayes.ts
export function resolveIrt(
  authored: Irt | undefined, band: Band, type: "mcq" | "blanks", choices: number,
): Irt {
  return authored ?? fallbackIrt(band, type, choices);
}
```

- [ ] **Step 3b: Extend `DiagItem` in `calibration.ts`**

```ts
// site/src/scripts/path/calibration.ts — replace the DiagItem interface
export interface DiagItem {
  id: string;
  type: "mcq" | "blanks";
  answer: number | string[];
  irt?: { b: number; a: number; c: number }; // authored IRT params (optional; bayes falls back)
}
```

- [ ] **Step 3c: Passthrough in the bundle builder**

Read `site/scripts/path/build-diag-bundle.mjs`. If items are copied via an explicit field allowlist, add `irt`:

```js
const out = { id: item.id, type: item.type, prompt: item.prompt, answer: item.answer };
if (item.choices) out.choices = item.choices;
if (item.irt) out.irt = item.irt; // <-- add
```

If the builder already spreads `...item` into the bundle, no change is needed — confirm by reading the map step and skip this edit.

- [ ] **Step 4: Run tests + regenerate bundle**

Run: `cd site && bun run test bayes`
Expected: PASS.
Run: `cd site && node scripts/path/build-diag-bundle.mjs && git diff --stat src/content/path/diagnostics-bundle.json`
Expected: no diff yet (no irt authored).

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/bayes.ts site/src/scripts/path/calibration.ts site/scripts/path/build-diag-bundle.mjs
git commit -m "feat(calibrate): optional irt field on diag items + resolveIrt fallback"
```

---

## Task 5: `DiagnosticRunner` — single concept, three-category per-item response

**Files:**
- Modify: `site/src/components/path/DiagnosticRunner.tsx`

- [ ] **Step 1: Rewrite `DiagnosticRunner` to a single-concept, response-emitting runner**

```tsx
// src/components/path/DiagnosticRunner.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { gradeMcq, gradeBlanks, type DiagItem } from "~/scripts/path/calibration";
import type { Response } from "~/scripts/path/bayes";

const L = {
  en: { dunno: "I don't know", next: "Next", concept: "Concept" },
  ru: { dunno: "Не знаю", next: "Дальше", concept: "Концепт" },
} as const;

type Props = {
  lang: Locale;
  concept: string;
  label: string;
  onResponse: (item: DiagItem, r: Response) => void; // per item
  onDone: () => void;                                 // bank exhausted
};

export default function DiagnosticRunner({ lang, concept, label, onResponse, onDone }: Props) {
  const t = L[lang];
  const bank = content.diagnostics[concept];
  const [ii, setIi] = useState(0);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  if (!bank || bank.items.length === 0) { onDone(); return null; }
  const item = bank.items[ii] as any as DiagItem & { prompt: any; choices?: any[] };

  const advance = (r: Response) => {
    onResponse(bank.items[ii], r);
    if (ii + 1 < bank.items.length) { setIi(ii + 1); setValue(""); setPicked(null); }
    else onDone();
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="text-xs uppercase tracking-wide text-stone-500">
        {label} · {t.concept} {ii + 1}/{bank.items.length}
      </div>
      <p class="font-medium text-stone-900">{(item as any).prompt[lang]}</p>
      {item.type === "mcq" ? (
        <ul class="flex flex-col gap-2">
          {(item as any).choices.map((ch: any, i: number) => (
            <li key={i}>
              <button
                class={`w-full rounded border px-3 py-2 text-left text-sm ${picked === i ? "border-sky-500 bg-sky-50" : "border-stone-300 hover:bg-stone-100"}`}
                onClick={() => setPicked(i)}
              >{ch[lang]}</button>
            </li>
          ))}
          <li class="flex gap-2">
            <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
              disabled={picked === null}
              onClick={() => advance(gradeMcq(item, picked!) ? "correct" : "wrong")}>{t.next}</button>
            <button class="rounded border border-stone-300 px-3 py-1.5 text-sm"
              onClick={() => advance("dont_know")}>{t.dunno}</button>
          </li>
        </ul>
      ) : (
        <div class="flex gap-2">
          <input class="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm" value={value}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
          <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white"
            onClick={() => advance(gradeBlanks(item, value) ? "correct" : "wrong")}>{t.next}</button>
          <button class="rounded border border-stone-300 px-3 py-1.5 text-sm"
            onClick={() => advance("dont_know")}>{t.dunno}</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check (DiagnosticRunner only; consumers updated in Task 7)**

Run: `cd site && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -i diagnosticrunner || echo "no DiagnosticRunner type errors"`
Expected: `no DiagnosticRunner type errors`. (CalibrationFlow may show errors until Task 7 — acceptable.)

- [ ] **Step 3: Commit**

```bash
git add site/src/components/path/DiagnosticRunner.tsx
git commit -m "feat(calibrate): single-concept runner with three-category response"
```

---

## Task 6: path-io wiring — band/irt/family helpers, priors, posterior write-back

**Files:**
- Modify: `site/src/scripts/path/path-io.ts`

Add these exports. They bridge the pure model to the runtime `content`/`knowledge` signals. `applyDiagnostic` and `graph` are already referenced in `path-io.ts` (used by `applyDiagnosticResult`/`nextCalibrationProbe`) — reuse those references.

- [ ] **Step 1: Imports (top of `path-io.ts`, alongside existing path imports)**

```ts
import { DOMAIN_FAMILIES } from "./mastery-field";
import {
  resolveIrt, priorFor, collapse,
  type SelfPlace, type Irt,
} from "./bayes";
import type { Band } from "./types";
```

(`buildConceptGraph`, `applyDiagnostic`, `conceptById`, `diagnosedConcepts`, `diagnostics`, `graph`, `knowledge` already exist in the file — do not re-import.)

- [ ] **Step 2: Concept/band + family + irt helpers**

```ts
// in site/src/scripts/path/path-io.ts (near other content-derived exports)

export function conceptBand(id: string): Band {
  return (conceptById.get(id)?.band ?? "surface") as Band;
}

// IRT params for a concept's first item (used to rank concepts by expected info-gain).
export function conceptIrt(id: string): Irt {
  const it: any = diagnostics[id]?.items?.[0];
  const choices = Array.isArray(it?.choices) ? it.choices.length : 0;
  return resolveIrt(it?.irt, conceptBand(id), it?.type ?? "mcq", choices);
}

// IRT for a specific answered item (used during posterior updates).
export function itemIrt(conceptId: string, item: { type: "mcq" | "blanks"; choices?: unknown[]; irt?: Irt }): Irt {
  const choices = Array.isArray(item.choices) ? item.choices.length : 0;
  return resolveIrt(item.irt, conceptBand(conceptId), item.type, choices);
}

// Diagnosable concepts of a domain family (by track membership).
export function familyConcepts(familyKey: string): string[] {
  const fam = DOMAIN_FAMILIES.find((f) => f.key === familyKey);
  if (!fam) return [];
  const tracks = new Set(fam.tracks as string[]);
  return [...diagnosedConcepts].filter((id) => tracks.has(conceptById.get(id)?.track as string));
}

export const families = () =>
  DOMAIN_FAMILIES.map((f) => ({ key: f.key, label: f.label, hue: f.hue, tracks: f.tracks as string[] }));
```

- [ ] **Step 3: Prior seeding + posterior write-back**

```ts
// in site/src/scripts/path/path-io.ts

// Initial prior map for a set of concepts from per-family self-placement.
export function seedPriors(conceptIds: string[], selfByFamily: Record<string, SelfPlace>): Map<string, number> {
  const famOf = new Map<string, string>();
  for (const f of DOMAIN_FAMILIES) for (const tr of f.tracks as string[]) famOf.set(tr, f.key);
  const priors = new Map<string, number>();
  for (const id of conceptIds) {
    const track = conceptById.get(id)?.track as string;
    const self = selfByFamily[famOf.get(track) ?? ""] ?? "never";
    priors.set(id, priorFor(self, conceptBand(id)));
  }
  return priors;
}

// Collapse a final posterior map into KnowledgeState (source "diagnostic"), reusing applyDiagnostic
// so propagation-on-write matches legacy calibrate and the existing guards hold.
export function writePlacementPosteriors(posteriors: Map<string, number>, now: number): void {
  let next = knowledge.value;
  for (const [id, p] of posteriors) {
    const { confidence } = collapse(p);
    next = applyDiagnostic(next, graph, id, confidence, now);
  }
  knowledge.value = next;
}
```

- [ ] **Step 4: Type-check**

Run: `cd site && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "path-io|bayes" || echo "no path-io/bayes type errors"`
Expected: `no path-io/bayes type errors`.

- [ ] **Step 5: Commit**

```bash
git add site/src/scripts/path/path-io.ts
git commit -m "feat(calibrate): path-io wiring — band/irt/family helpers, seedPriors, write-back"
```

---

## Task 7: `CalibrationFlow` orchestrator (Aim → Mode → Deep) + `AimStage`

**Files:**
- Create: `site/src/components/path/AimStage.tsx`
- Modify: `site/src/components/path/CalibrationFlow.tsx`

- [ ] **Step 1: Create `AimStage.tsx`**

```tsx
// src/components/path/AimStage.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content, activeGoals, setGoals, families } from "~/scripts/path/path-io";
import type { SelfPlace } from "~/scripts/path/bayes";

const L = {
  en: { title: "Where are you aiming?", goal: "Goal", place: "Mark each area",
        levels: { never: "Never touched", basics: "Basics", prod: "Used in production" }, start: "Start the test" },
  ru: { title: "Куда ты метишь?", goal: "Цель", place: "Отметь каждую область",
        levels: { never: "Не трогал", basics: "Основы", prod: "Использовал в проде" }, start: "Начать тест" },
} as const;
const LEVELS: SelfPlace[] = ["never", "basics", "prod"];

type Props = { lang: Locale; onDone: (selfByFamily: Record<string, SelfPlace>) => void };

export default function AimStage({ lang, onDone }: Props) {
  const t = L[lang];
  const goals = content.goals;
  const [goalId, setGoalId] = useState(activeGoals()[0]?.id ?? goals[0]?.id ?? "");
  const [picked, setPicked] = useState<Record<string, SelfPlace>>({});
  const fams = families();

  const submit = () => {
    if (goalId) setGoals([{ id: goalId, priority: 1 }]);
    const full: Record<string, SelfPlace> = {};
    for (const f of fams) full[f.key] = picked[f.key] ?? "never";
    onDone(full);
  };

  return (
    <div class="cal-flow">
      <h1 class="cf-title">{t.title}</h1>
      <label class="cf-lead">{t.goal}{" "}
        <select class="aim-goal" value={goalId} onChange={(e) => setGoalId((e.target as HTMLSelectElement).value)}>
          {goals.map((g) => <option key={g.id} value={g.id}>{g.label[lang]}</option>)}
        </select>
      </label>
      <p class="cf-lead">{t.place}</p>
      <div class="aim-grid">
        {fams.map((f) => (
          <div key={f.key} class="aim-row">
            <span class="aim-fam">{f.label[lang]}</span>
            <div class="seg" role="group" aria-label={f.label[lang]}>
              {LEVELS.map((lv) => (
                <button key={lv} type="button" aria-pressed={(picked[f.key] ?? "never") === lv}
                  onClick={() => setPicked((p) => ({ ...p, [f.key]: lv }))}>{t.levels[lv]}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-primary" onClick={submit}>{t.start}</button>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `CalibrationFlow.tsx`**

```tsx
// src/components/path/CalibrationFlow.tsx
import { useState, useRef } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  content, seedPriors, itemIrt, conceptIrt, familyConcepts, families,
  writePlacementPosteriors, unitProbeConcepts, applyDiagnosticResult,
} from "~/scripts/path/path-io";
import {
  posterior, propagatePriors, variance, expectedInfoGain, SETTLE_VAR, PASS, FAIL,
  type SelfPlace, type Response,
} from "~/scripts/path/bayes";
import DiagnosticRunner from "./DiagnosticRunner";
import AimStage from "./AimStage";
import PlacementResult from "./PlacementResult";
import type { DiagItem } from "~/scripts/path/calibration";

const EXPRESS_CAP = 5; // items per family in express mode
const L = {
  en: { mode: "Choose depth", express: "Express (~10 min)", full: "Full coverage", family: "Area", skip: "Skip to my path" },
  ru: { mode: "Выбери глубину", express: "Экспресс (~10 мин)", full: "Полное покрытие", family: "Область", skip: "Сразу к пути" },
} as const;

type Phase = "aim" | "mode" | "run" | "result";

export default function CalibrationFlow({ lang, unit: unitProp }: { lang: Locale; unit?: string }) {
  const unit = unitProp ?? (typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("unit") ?? undefined : undefined);

  if (unit) return <UnitMode lang={lang} unit={unit} />;

  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;
  const [phase, setPhase] = useState<Phase>("aim");
  const self = useRef<Record<string, SelfPlace> | null>(null);
  const express = useRef(false);
  const priors = useRef(new Map<string, number>());
  const order = useRef<string[]>([]);
  const famCount = useRef(new Map<string, number>());
  const [curConcept, setCurConcept] = useState<string | null>(null);
  const [, force] = useState(0); // re-render after result write

  const familyOf = (id: string): string => {
    const track = content.conceptById.get(id)?.track as string;
    for (const f of families()) if (f.tracks.includes(track)) return f.key;
    return "";
  };

  const pickNext = (): string | null => {
    let best: string | null = null, bestGain = -1;
    for (const id of order.current) {
      const p = priors.current.get(id) ?? 0.5;
      if (variance(p) < SETTLE_VAR) continue;
      if (express.current && (famCount.current.get(familyOf(id)) ?? 0) >= EXPRESS_CAP) continue;
      const gain = expectedInfoGain(p, conceptIrt(id));
      if (gain > bestGain) { bestGain = gain; best = id; }
    }
    return best;
  };

  const startDeep = () => {
    const sel = self.current!;
    const cand: string[] = [];
    for (const f of families()) {
      if ((sel[f.key] ?? "never") === "never") continue; // excluded; never asked
      cand.push(...familyConcepts(f.key));
    }
    order.current = cand;
    priors.current = seedPriors(cand, sel);
    famCount.current = new Map();
    const first = pickNext();
    if (!first) { finish(); return; }
    setCurConcept(first); setPhase("run");
  };

  const onResponse = (item: DiagItem, r: Response) => {
    const id = curConcept!;
    const p0 = priors.current.get(id) ?? 0.5;
    const p1 = posterior(p0, r, itemIrt(id, item as any));
    priors.current.set(id, p1);
    if (p1 >= PASS || p1 <= FAIL) priors.current = propagatePriors(priors.current, content.graph, id, p1, r);
    famCount.current.set(familyOf(id), (famCount.current.get(familyOf(id)) ?? 0) + 1);
  };

  const onConceptDone = () => {
    const nxt = pickNext();
    if (nxt) setCurConcept(nxt);
    else finish();
  };

  const finish = () => { writePlacementPosteriors(priors.current, Date.now()); setPhase("result"); force((n) => n + 1); };

  if (phase === "aim") return <AimStage lang={lang} onDone={(s) => { self.current = s; setPhase("mode"); }} />;

  if (phase === "mode") {
    return (
      <div class="cal-flow">
        <h1 class="cf-title">{t.mode}</h1>
        <div class="cf-actions">
          <button class="btn btn-primary" onClick={() => { express.current = true; startDeep(); }}>{t.express}</button>
          <button class="btn btn-secondary" onClick={() => { express.current = false; startDeep(); }}>{t.full}</button>
        </div>
        <a class="cf-link" href={roadmap}>{t.skip}</a>
      </div>
    );
  }

  if (phase === "run" && curConcept) {
    const label = content.conceptById.get(curConcept)?.label[lang] ?? curConcept;
    return (
      <div class="cal-flow">
        <div class="cf-family">{t.family}: {familyOf(curConcept)}</div>
        <DiagnosticRunner key={curConcept} lang={lang} concept={curConcept} label={label}
          onResponse={onResponse} onDone={onConceptDone} />
        <a class="cf-link" href={roadmap}>{t.skip}</a>
      </div>
    );
  }

  return <PlacementResult lang={lang} priors={priors.current} />;
}

// Legacy ?unit= pre-check: serve each diagnosable concept of the unit, grade by correct-fraction,
// persist via the existing applyDiagnosticResult (unchanged behavior).
function UnitMode({ lang, unit }: { lang: Locale; unit: string }) {
  const ids = unitProbeConcepts(unit);
  const [ci, setCi] = useState(0);
  const got = useRef<Response[]>([]);
  const roadmap = `/${lang}/roadmap`;
  if (ids.length === 0 || ci >= ids.length) {
    return <div class="cal-flow"><a class="btn btn-primary" href={roadmap}>OK</a></div>;
  }
  const id = ids[ci];
  const label = content.conceptById.get(id)?.label[lang] ?? id;
  const onResponse = (_item: DiagItem, r: Response) => { got.current.push(r); };
  const onDone = () => {
    const frac = got.current.length ? got.current.filter((r) => r === "correct").length / got.current.length : 0;
    applyDiagnosticResult(id, frac);
    got.current = [];
    setCi(ci + 1);
  };
  return <div class="cal-flow"><DiagnosticRunner key={id} lang={lang} concept={id} label={label}
    onResponse={onResponse} onDone={onDone} /></div>;
}
```

- [ ] **Step 3: Type-check (PlacementResult lands in Task 8)**

If `PlacementResult` is not yet created, add a temporary stub so this compiles:
```tsx
// src/components/path/PlacementResult.tsx (temporary stub — replaced in Task 8)
export default function PlacementResult(_: any) { return null; }
```
Run: `cd site && bunx tsc --noEmit -p tsconfig.json 2>&1 | grep -iE "CalibrationFlow|AimStage" || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/path/CalibrationFlow.tsx site/src/components/path/AimStage.tsx site/src/components/path/PlacementResult.tsx
git commit -m "feat(calibrate): 4-stage orchestrator (Aim → Mode → Deep) + AimStage; preserve unit mode"
```

---

## Task 8: `PlacementResult` + styles + build + visual

**Files:**
- Create/replace: `site/src/components/path/PlacementResult.tsx`
- Modify: `site/src/styles/planning-screen.css`

- [ ] **Step 1: Replace the stub with the real `PlacementResult.tsx`**

```tsx
// src/components/path/PlacementResult.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { collapse } from "~/scripts/path/bayes";
import { DOMAIN_FAMILIES } from "~/scripts/path/mastery-field";

const L = {
  en: { title: "Your placement", domains: "By area", strengths: "Strongest", gaps: "Biggest gaps", toPath: "See my path", known: "known" },
  ru: { title: "Твой уровень", domains: "По областям", strengths: "Сильнее всего", gaps: "Главные пробелы", toPath: "К моему пути", known: "знаю" },
} as const;

export default function PlacementResult({ lang, priors }: { lang: Locale; priors: Map<string, number> }) {
  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;
  const [open, setOpen] = useState<string | null>(null);

  const famOf = new Map<string, string>();
  for (const f of DOMAIN_FAMILIES) for (const tr of f.tracks as string[]) famOf.set(tr, f.key);

  const agg = new Map<string, { sum: number; n: number; nodes: { id: string; p: number }[] }>();
  for (const [id, p] of priors) {
    const track = content.conceptById.get(id)?.track as string;
    const key = famOf.get(track) ?? "";
    if (!key) continue;
    const a = agg.get(key) ?? { sum: 0, n: 0, nodes: [] };
    a.sum += p; a.n += 1; a.nodes.push({ id, p });
    agg.set(key, a);
  }

  const rows = DOMAIN_FAMILIES.map((f) => {
    const a = agg.get(f.key);
    return a && a.n ? { key: f.key, label: f.label[lang], hue: f.hue, mean: a.sum / a.n, nodes: a.nodes } : null;
  }).filter(Boolean) as { key: string; label: string; hue: string; mean: number; nodes: { id: string; p: number }[] }[];

  const all = [...priors.entries()].map(([id, p]) => ({ id, p, label: content.conceptById.get(id)?.label[lang] ?? id }));
  const strengths = [...all].sort((x, y) => y.p - x.p).slice(0, 5);
  const gaps = [...all].sort((x, y) => x.p - y.p).slice(0, 5);

  return (
    <div class="cal-flow">
      <h1 class="cf-title">{t.title}</h1>
      <h2 class="pr-h">{t.domains}</h2>
      <ul class="pr-domains">
        {rows.map((r) => (
          <li key={r.key} class="pr-dom">
            <button class="pr-dom-head" onClick={() => setOpen(open === r.key ? null : r.key)}>
              <span class="pr-dom-label">{r.label}</span>
              <span class="pr-bar" style={`--p:${Math.round(r.mean * 100)}%;--hue:var(${r.hue})`} />
              <span class="pr-pct">{Math.round(r.mean * 100)}% {t.known}</span>
            </button>
            {open === r.key && (
              <ul class="pr-drill">
                {r.nodes.slice().sort((a, b) => b.p - a.p).map((n) => {
                  const c = collapse(n.p);
                  const cls = c.shaky ? "shaky" : c.confidence >= 0.6 ? "known" : "unknown";
                  return <li key={n.id} class={`pr-node ${cls}`}>
                    {content.conceptById.get(n.id)?.label[lang] ?? n.id} · {Math.round(n.p * 100)}%
                  </li>;
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div class="pr-cols">
        <div><h3 class="pr-h">{t.strengths}</h3><ul>{strengths.map((s) => <li key={s.id}>{s.label} · {Math.round(s.p * 100)}%</li>)}</ul></div>
        <div><h3 class="pr-h">{t.gaps}</h3><ul>{gaps.map((s) => <li key={s.id}>{s.label} · {Math.round(s.p * 100)}%</li>)}</ul></div>
      </div>
      <a class="btn btn-primary cf-self" href={roadmap}>{t.toPath}</a>
    </div>
  );
}
```

- [ ] **Step 2: Add styles to `planning-screen.css`**

First grep the file for existing neutral/semantic tokens and reuse them; if absent, the fallbacks below apply:

```css
/* Calibrate v2 — aim / mode / result */
.aim-grid, .pr-domains { display: flex; flex-direction: column; gap: .5rem; }
.aim-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.aim-goal { margin-inline-start: .5rem; }
.pr-dom { border-bottom: 1px solid var(--hairline, #e7e5e4); padding: .4rem 0; }
.pr-dom-head { display: grid; grid-template-columns: 12rem 1fr auto; gap: .75rem; align-items: center; width: 100%; text-align: start; background: none; border: 0; cursor: pointer; }
.pr-bar { height: .6rem; border-radius: 999px; background: color-mix(in oklab, var(--hue) 80%, transparent); width: var(--p); min-width: 2px; }
.pr-drill { padding-inline-start: 1rem; font-size: .85rem; }
.pr-node.known { color: var(--ok, #15803d); }
.pr-node.shaky { color: var(--warn, #b45309); }
.pr-node.unknown { color: var(--muted, #78716c); }
.pr-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; }
.pr-h { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted, #78716c); }
```

- [ ] **Step 3: Build + lint**

Run: `cd site && bun run build`
Expected: build succeeds; `dist/lint-report.json` clean (0/0). Fix any reported issue before commit.

- [ ] **Step 4: Visual check (EN + RU)**

Open `/en/calibrate` and `/ru/calibrate` (dev server or `bun run preview`). Verify the funnel: Aim (goal select + 8 family rows) → Mode (Express/Full) → questions show "I don't know"/"Не знаю" → Result (per-domain bars, drill-down expands, strengths/gaps populate, CTA → `/roadmap`). Confirm `/en/calibrate?unit=<real unit id>` still runs the unit pre-check.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/path/PlacementResult.tsx site/src/styles/planning-screen.css
git commit -m "feat(calibrate): rich probabilistic result report + drill-down + styles"
```

---

## Task 9: Model-level funnel integration test

**Files:**
- Create: `site/src/scripts/path/placement-integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
// site/src/scripts/path/placement-integration.test.ts
import { describe, it, expect } from "vitest";
import { buildConceptGraph } from "./graph";
import { priorFor, posterior, propagatePriors, collapse, resolveIrt, variance, SETTLE_VAR } from "./bayes";
import type { Concept } from "./types";

const mk = (id: string, requires: string[], band: any = "surface"): Concept =>
  ({ id, label: { en: id, ru: id }, track: "backend" as any, band, requires });

describe("placement funnel (model-level integration)", () => {
  it("correct answers settle a concept as known and lift its prereqs", () => {
    const g = buildConceptGraph([mk("base", [], "foundations"), mk("mid", ["base"]), mk("adv", ["mid"], "advanced")]);
    let priors = new Map([
      ["base", priorFor("basics", "foundations")],
      ["mid", priorFor("basics", "surface")],
      ["adv", priorFor("basics", "advanced")],
    ]);
    const irt = resolveIrt(undefined, "advanced", "mcq", 4);
    let p = priors.get("adv")!;
    p = posterior(p, "correct", irt); p = posterior(p, "correct", irt);
    priors.set("adv", p);
    priors = propagatePriors(priors, g, "adv", p, "correct");
    expect(collapse(p).confidence).toBeGreaterThan(0.6);
    expect(priors.get("base")!).toBeGreaterThan(priorFor("basics", "foundations"));
  });

  it("dont_know answers settle a concept as not-known with low variance", () => {
    const irt = resolveIrt(undefined, "advanced", "mcq", 4);
    let p = priorFor("prod", "advanced");
    p = posterior(p, "dont_know", irt); p = posterior(p, "dont_know", irt);
    expect(collapse(p).confidence).toBeLessThan(0.2);
    expect(variance(p)).toBeLessThan(SETTLE_VAR);
  });
});
```

- [ ] **Step 2: Run + full gate**

Run: `cd site && bun run test placement-integration`
Expected: PASS. If FAIL, fix the model, not the test.
Run: `cd site && bun run test && bun run build`
Expected: all tests green; build + lint clean.

- [ ] **Step 3: Commit**

```bash
git add site/src/scripts/path/placement-integration.test.ts
git commit -m "test(calibrate): model-level funnel integration"
```

---

## Task 10: LLM-author IRT params across all 145 banks (accuracy upgrade)

> Additive; runs AFTER Tasks 1–9 ship a working test on fallback params. Uses the Workflow tool (subagent fan-out), not hand edits.

**Files:**
- Create: `site/scripts/path/author-irt.mjs`
- Modify: `site/src/content/path/diagnostics/*.json` (add `irt` per item)
- Regenerate: `site/src/content/path/diagnostics-bundle.json`

- [ ] **Step 1: Write the merge helper**

```js
// site/scripts/path/author-irt.mjs
// Reads { "<itemId>": { b, a, c } } maps from authoring subagents and writes irt onto matching
// items in src/content/path/diagnostics/<concept>.json. Idempotent; validates ranges.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/content/path/diagnostics";
const valid = (v) => v && typeof v.b === "number" && typeof v.a === "number" && typeof v.c === "number"
  && v.a > 0 && v.c >= 0 && v.c < 1 && Math.abs(v.b) <= 4;

const mapPath = process.argv[2];
if (!mapPath) { console.error("usage: node author-irt.mjs <params.json>"); process.exit(1); }
const params = JSON.parse(readFileSync(mapPath, "utf8"));
for (const [id, v] of Object.entries(params)) if (!valid(v)) { console.error("bad params for", id, v); process.exit(2); }

let touched = 0;
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
  const p = join(DIR, f);
  const bank = JSON.parse(readFileSync(p, "utf8"));
  let changed = false;
  for (const item of bank.items ?? []) if (params[item.id]) { item.irt = params[item.id]; changed = true; touched++; }
  if (changed) writeFileSync(p, JSON.stringify(bank, null, 2) + "\n");
}
console.log("irt applied to", touched, "items");
```

- [ ] **Step 2: Author params via Workflow (one subagent per domain family/track)**

Each subagent reads its banks' items (prompt + choices + concept band) and returns `{ itemId: {b,a,c} }` per this rubric:
- `b` (difficulty, −4…4): foundations ≈ −1.5…−0.5, surface ≈ −0.5…0.8, middle ≈ 0.6…1.6, advanced ≈ 1.4…2.5; nudge by how niche the item is.
- `a` (discrimination, 0.5…2.5): higher when the item cleanly separates knowers from non-knowers; lower for trivia.
- `c` (guess, 0…<1): MCQ ≈ 1/#choices adjusted for plausible distractors; blanks ≈ 0.02…0.08.
Merge each returned map: `node site/scripts/path/author-irt.mjs <map.json>`.

- [ ] **Step 3: Regenerate bundle + validate**

Run: `cd site && node scripts/path/build-diag-bundle.mjs && bun run test && bun run build`
Expected: bundle carries `irt`; tests green; build + lint clean. Spot-check 3 banks in `diagnostics-bundle.json` for `irt`.

- [ ] **Step 4: Commit**

```bash
git add site/src/content/path/diagnostics site/src/content/path/diagnostics-bundle.json site/scripts/path/author-irt.mjs
git commit -m "content(calibrate): author IRT params across all 145 diagnostic banks"
```

---

## Self-Review

**Spec coverage:**
- §3 Stage A (goal + self-place) → Task 7 (`AimStage`).
- §3 Stage B (gate) → realized in Task 7 `startDeep`/`pickNext`: families self-placed `never` are excluded up front, and each candidate family's keystone is naturally the first info-gain pick within it. *The literal "one gate question per ambiguous family before deep-dive" is an optional refinement* — if the reviewer wants the explicit pre-pass, add a step in Task 7 that serves exactly one concept per candidate family and, on `wrong`/`dont_know`, expands that family's candidate set to lower bands before the main loop. Flagged so it is not a silent gap.
- §3 Stage C (adaptive info-gain, express/full, dont_know) → Tasks 1–3, 5, 7.
- §3 Stage D (rich result) → Task 8.
- §4 model → Tasks 1–3; §4.5 collapse/persist → Tasks 2, 6.
- §5 irt schema/fallback/dont_know rewire/authoring → Tasks 4, 5, 10.
- §6 files → all tasks; §8 testing → Tasks 1–3, 9; §9 build order → task order matches.

**Placeholder scan:** No "TBD"/"handle edge cases". The one judgment call — `dont_know|unknown` `(1-c)` factor vs flat — is called out in Task 1 with both options and the rule "keep test + impl consistent".

**Type consistency:** `Response = "correct"|"wrong"|"dont_know"`, `SelfPlace = "never"|"basics"|"prod"`, `Irt = {b,a,c}`, `DiagItem.irt?` identical across Tasks 1/4/5/6/7. `posterior`/`propagatePriors`/`collapse`/`expectedInfoGain`/`variance`/`SETTLE_VAR`/`PASS`/`FAIL` signatures match definitions. Runner callbacks `onResponse(item, r)` + `onDone()` consistent between Tasks 5 and 7. `seedPriors`/`writePlacementPosteriors`/`familyConcepts`/`families`/`conceptIrt`/`itemIrt`/`conceptBand` defined in Task 6, consumed in Tasks 7/8. `content.graph` used for propagation in Task 7 matches `path-io`'s exported `content`.

**Executor reminders:** (1) before Task 8 commit, confirm `planning-screen.css` token names (`--hairline`/`--muted`/`--ok`/`--warn`) exist or map to the project's actual tokens; (2) verify whether `build-diag-bundle.mjs` spreads `...item` (then skip Task 4 Step 3c); (3) `content.goals` is exported on `content` — if goal labels live elsewhere, read `path-io` to confirm the accessor before Task 7.
```
