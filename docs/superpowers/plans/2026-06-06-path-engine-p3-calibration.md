# Path Engine P3 — Cold-Start Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the engine personalize for a new learner — seed `KnowledgeState` from the existing pretest, add an adaptive `/calibrate` diagnostic onboarding, and a pre-unit "quick check" that skips a unit on pass.

**Architecture:** Two new pure modules (`pretest-seed.ts`, `calibration.ts`) reuse the P0 `applyDiagnostic`/`nextProbe`/`targetFrontier`/`graph` primitives — no P0 core edits. A shared `DiagnosticRunner` island grades the committed objective banks client-side; `CalibrationFlow` (route `/calibrate`) drives a `pickProbe` loop; the roadmap card quick-check reuses the runner; the lesson-page hook is a server-rendered link (0 islands). `path-io.ts` seeds on load and exposes the calibration surface.

**Tech Stack:** Astro 5, Preact + `@preact/signals` (read `signal.value` in render), Tailwind, Vitest, bun. `~`→`src/`. Reference spec: `docs/superpowers/specs/2026-06-06-path-engine-p3-calibration-design.md`. Conventions: islands use inline bilingual `L={en,ru}` label objects (not ui.json); `Path`/`Schedule`/`Concept`/`KnowledgeState` types live in `src/scripts/path/types.ts`.

---

## File Structure

- `src/scripts/path/pretest-seed.ts` (+ `.test.ts`) — `PRETEST_CONCEPT_MAP` + `seedFromPretest` (pure).
- `src/scripts/path/calibration.ts` (+ `.test.ts`) — `pickProbe` + grading helpers `gradeMcq`/`gradeBlanks`/`fracOf` (pure).
- `scripts/path/build-path-data.mjs` — **modify**: emit `src/content/path/diagnostics-bundle.json`.
- `src/content/path/diagnostics-bundle.json` — **generated**: `{ "<concept>": { concept, items } }`.
- `src/scripts/path/path-io.ts` — **modify**: graph, seed-on-load, `content.diagnostics`, `applyDiagnosticResult`, `nextCalibrationProbe`, `unitProbeConcepts`, `activeGoals`.
- `src/components/path/DiagnosticRunner.tsx` — **create**: shared client-graded item runner.
- `src/components/path/CalibrationFlow.tsx` — **create**: the onboarding island.
- `src/pages/[lang]/calibrate.astro` — **create**: the `/calibrate` route.
- `src/components/path/PathView.tsx` + `PathCard.tsx` — **modify**: card quick-check modal + cold-start CTA.
- `src/layouts/Lesson.astro` — **modify**: gated server-rendered pre-unit link.

All paths relative to `site/`. On branch `feat/path-engine-p3-calibration`.

---

## Task 1: `pretest-seed.ts` — map + seed (TDD)

**Files:** Create `src/scripts/path/pretest-seed.ts`, `src/scripts/path/pretest-seed.test.ts`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/scripts/path/pretest-seed.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRETEST_CONCEPT_MAP, seedFromPretest } from "./pretest-seed";
import { buildConceptGraph } from "./graph";
import { emptyState, masteryOf } from "./knowledge";
import type { Concept } from "./types";

const C = (id: string, requires: string[] = []): Concept =>
  ({ id, label: { en: id, ru: id }, track: "networking", band: "middle", requires });
const concepts = [C("ports-sockets"), C("tcp-handshake", ["ports-sockets"]), C("b-tree-index")];
const g = buildConceptGraph(concepts);
// Minimal question banks mirroring src/scripts/pretest-questions.ts shape.
const Q = (id: string) => ({ id, prompt: { en: "", ru: "" }, choices: [
  { label: { en: "", ru: "" }, weight: 0 as const }, { label: { en: "", ru: "" }, weight: 1 as const },
  { label: { en: "", ru: "" }, weight: 2 as const }, { label: { en: "", ru: "" }, weight: 3 as const }] });
const stage1 = [Q("tcp"), Q("db-index")];
const stage2: ReturnType<typeof Q>[] = [];

describe("pretest-seed", () => {
  it("PRETEST_CONCEPT_MAP targets all exist in concepts.json", () => {
    const ids = new Set((JSON.parse(readFileSync("src/content/path/concepts.json", "utf8")) as { id: string }[]).map((c) => c.id));
    for (const targets of Object.values(PRETEST_CONCEPT_MAP)) for (const t of targets) expect(ids.has(t)).toBe(true);
  });

  it("a weight-3 answer seeds high confidence and lifts prereqs", () => {
    const pretest = { takenAt: 0, stage1: { score: 0, answers: [3, 0] }, rating: 0, rank: "x", confidence: "high" as const };
    const s = seedFromPretest(emptyState(), g, pretest, stage1, stage2, 0);
    expect(masteryOf(s, "tcp-handshake")).toBeCloseTo(0.85, 5);
    expect(masteryOf(s, "ports-sockets")).toBeGreaterThan(0); // down-closure lift
  });

  it("a weight-0 answer seeds nothing", () => {
    const pretest = { takenAt: 0, stage1: { score: 0, answers: [0, 0] }, rating: 0, rank: "x", confidence: "high" as const };
    const s = seedFromPretest(emptyState(), g, pretest, stage1, stage2, 0);
    expect(s.size).toBe(0);
  });

  it("maps db-index to b-tree-index", () => {
    const pretest = { takenAt: 0, stage1: { score: 0, answers: [0, 2] }, rating: 0, rank: "x", confidence: "high" as const };
    const s = seedFromPretest(emptyState(), g, pretest, stage1, stage2, 0);
    expect(masteryOf(s, "b-tree-index")).toBeCloseTo(0.6, 5);
  });
});
```

- [ ] **Step 2: Run — verify fail.** `bunx vitest run src/scripts/path/pretest-seed.test.ts` → FAIL (cannot find module).

- [ ] **Step 3: Implement.**

```ts
// src/scripts/path/pretest-seed.ts
import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { applyDiagnostic } from "./knowledge";

// questionId → concept ids. Every target verified to exist in concepts.json (asserted in tests).
export const PRETEST_CONCEPT_MAP: Record<string, string[]> = {
  tcp:              ["tcp-handshake"],
  "db-index":       ["b-tree-index"],
  react:            ["reconciliation"],
  http:             ["http"],
  "adv-mvcc":       ["mvcc"],
  "adv-consensus":  ["consensus"],
  "adv-http-cache": ["cache-aside", "stale-while-revalidate"],
  "adv-event-loop": ["event-loop"],
  "adv-tls-0rtt":   ["0-rtt", "tls"],
  "adv-cap":        ["eventual-consistency"],
};

// chosen choice weight (0..3) → seeded confidence; weight 0 = no signal.
const WEIGHT_FRAC = [0, 0.3, 0.6, 0.85];

type Question = { id: string; choices: { weight: number }[] };
interface PretestLike { stage1: { answers: number[] }; stage2?: { answers: number[] } }

export function seedFromPretest(
  state: KnowledgeState, graph: ConceptGraph, pretest: PretestLike,
  stage1Questions: Question[], stage2Questions: Question[], now: number,
): KnowledgeState {
  let s = state;
  const fold = (questions: Question[], answers: number[]) => {
    answers.forEach((choiceIdx, i) => {
      const q = questions[i];
      if (!q) return;
      const weight = q.choices[choiceIdx]?.weight ?? 0;
      const frac = WEIGHT_FRAC[weight] ?? 0;
      if (frac <= 0) return;
      for (const concept of PRETEST_CONCEPT_MAP[q.id] ?? []) s = applyDiagnostic(s, graph, concept, frac, now);
    });
  };
  fold(stage1Questions, pretest.stage1.answers);
  if (pretest.stage2) fold(stage2Questions, pretest.stage2.answers);
  return s;
}
```

- [ ] **Step 4: Run — verify pass.** `bunx vitest run src/scripts/path/pretest-seed.test.ts` → PASS (4). NOTE: the map test reads `concepts.json` relative to `site/` (the Vitest cwd); if it can't find the file, the cwd is wrong — run from `site/`.

- [ ] **Step 5: Commit.**
```bash
git add site/src/scripts/path/pretest-seed.ts site/src/scripts/path/pretest-seed.test.ts
git commit -m "feat(path): P3 pretest-seed map + seedFromPretest (reuses applyDiagnostic)"
```

---

## Task 2: `calibration.ts` — pickProbe + grading helpers (TDD)

**Files:** Create `src/scripts/path/calibration.ts`, `src/scripts/path/calibration.test.ts`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/scripts/path/calibration.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS } from "./__fixtures__/mini-graph";
import { buildConceptGraph } from "./graph";
import { emptyState, applyDiagnostic } from "./knowledge";
import { pickProbe, gradeMcq, gradeBlanks, fracOf } from "./calibration";

const g = buildConceptGraph(CONCEPTS);
const frontier = ["consensus", "tls", "mvcc"];

describe("pickProbe", () => {
  it("only picks concepts that have a diagnostic (the diagnosed set)", () => {
    const diagnosed = new Set(["tls", "mvcc"]); // consensus NOT diagnosable
    const picked = pickProbe(emptyState(), g, frontier, diagnosed, 0.6);
    expect(["tls", "mvcc"]).toContain(picked);
    expect(picked).not.toBe("consensus");
  });

  it("returns null when every diagnosable concept is already known", () => {
    const diagnosed = new Set(["tls", "mvcc"]);
    let s = emptyState();
    for (const c of [...diagnosed, ...CONCEPTS.map((x) => x.id)]) s = applyDiagnostic(s, g, c, 1, 0);
    expect(pickProbe(s, g, frontier, diagnosed, 0.6)).toBeNull();
  });

  it("is deterministic under ties", () => {
    const d = new Set(["tls", "mvcc"]);
    expect(pickProbe(emptyState(), g, ["tls", "mvcc"], d, 0.6)).toBe(pickProbe(emptyState(), g, ["mvcc", "tls"], d, 0.6));
  });
});

describe("grading", () => {
  it("gradeMcq is true only for the answer index", () => {
    const item = { type: "mcq", answer: 2 } as any;
    expect(gradeMcq(item, 2)).toBe(true);
    expect(gradeMcq(item, 1)).toBe(false);
  });
  it("gradeBlanks matches case/space-insensitively against the accepted set", () => {
    const item = { type: "blanks", answer: ["zero", "0"] } as any;
    expect(gradeBlanks(item, " Zero ")).toBe(true);
    expect(gradeBlanks(item, "one")).toBe(false);
  });
  it("fracOf is correct/total", () => {
    expect(fracOf([true, false, true])).toBeCloseTo(2 / 3, 5);
    expect(fracOf([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run — verify fail.** `bunx vitest run src/scripts/path/calibration.test.ts` → FAIL.

- [ ] **Step 3: Implement.**

```ts
// src/scripts/path/calibration.ts
import type { KnowledgeState } from "./types";
import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";
import { masteryOf } from "./knowledge";

const AMBIG_LO = 0.3, AMBIG_HI = 0.7;

// Like nextProbe, but restricted to the `diagnosed` set (only concepts we can objectively test).
// Picks the unknown/ambiguous diagnosable concept whose answer prunes the most graph. Null = calibrated.
export function pickProbe(
  state: KnowledgeState, g: ConceptGraph, frontier: string[], diagnosed: Set<string>, _threshold: number,
): string | null {
  const candidates = new Set<string>();
  for (const f of frontier) { candidates.add(f); for (const a of ancestors(g, f)) candidates.add(a); }
  let best: string | null = null, bestGain = -1;
  for (const id of [...candidates].sort()) {
    if (!diagnosed.has(id)) continue;
    const conf = masteryOf(state, id);
    const ambiguous = !state.has(id) || (conf > AMBIG_LO && conf < AMBIG_HI);
    if (!ambiguous) continue;
    const gain = ancestors(g, id).size + descendants(g, id).size;
    if (gain > bestGain) { bestGain = gain; best = id; }
  }
  return best;
}

// ── objective grading (client-side, no runtime LLM) ──
export interface DiagItem { id: string; type: "mcq" | "blanks"; answer: number | string[]; }
export const gradeMcq = (item: DiagItem, selected: number): boolean => item.answer === selected;
export const gradeBlanks = (item: DiagItem, value: string): boolean =>
  Array.isArray(item.answer) && item.answer.some((a) => String(a).trim().toLowerCase() === value.trim().toLowerCase());
export const fracOf = (results: boolean[]): number => (results.length ? results.filter(Boolean).length / results.length : 0);
```

- [ ] **Step 4: Run — verify pass.** `bunx vitest run src/scripts/path/calibration.test.ts` → PASS (6).

- [ ] **Step 5: Commit.**
```bash
git add site/src/scripts/path/calibration.ts site/src/scripts/path/calibration.test.ts
git commit -m "feat(path): P3 calibration — pickProbe (diagnosable filter) + objective grading helpers"
```

---

## Task 3: emit `diagnostics-bundle.json`

**Files:** Modify `scripts/path/build-path-data.mjs`.

- [ ] **Step 1: Add the bundle emit.** In `main()`, immediately after the `diagnostics-index.json` write (added in P2), insert:

```js
  // Full diagnostic banks keyed by concept — the calibration island imports this (it can't readdir).
  const diagBundle = {};
  for (const id of diagnosedIds) {
    diagBundle[id] = JSON.parse(readFileSync(join(OUT, "diagnostics", `${id}.json`), "utf8"));
  }
  writeFileSync(join(OUT, "diagnostics-bundle.json"), JSON.stringify(diagBundle, null, 2) + "\n");
```

- [ ] **Step 2: Run + verify.**
Run: `bun scripts/path/build-path-data.mjs`
Then: `bun -e 'const b=require("./src/content/path/diagnostics-bundle.json"); console.log(Object.keys(b).length, "concepts;", b["idempotency"].items.length, "items in idempotency")'`
Expected: `35 concepts; <n> items in idempotency` (n is 2 or 3).

- [ ] **Step 3: Commit.**
```bash
git add site/scripts/path/build-path-data.mjs site/src/content/path/diagnostics-bundle.json
git commit -m "feat(path): P3 emit diagnostics-bundle.json (full banks for the calibration island)"
```

---

## Task 4: `path-io.ts` wiring (seed-on-load + calibration surface)

**Files:** Modify `src/scripts/path/path-io.ts`, `src/scripts/path/path-io.test.ts`.

- [ ] **Step 1: Add imports.** After the existing line `import { masteryOf } from "./knowledge";` (line ~16) add:
```ts
import diagnosticsBundle from "~/content/path/diagnostics-bundle.json";
import { buildConceptGraph } from "./graph";
import { userState } from "~/scripts/user-state";
import { pretestQuestions, advancedQuestions } from "~/scripts/pretest-questions";
import { seedFromPretest } from "./pretest-seed";
import { pickProbe } from "./calibration";
import { targetFrontier } from "./planner";
```
And extend the existing `import { emptyState, applySelfDeclare } from "./knowledge";` line to:
```ts
import { emptyState, applySelfDeclare, applyDiagnostic } from "./knowledge";
```

- [ ] **Step 2: Build the graph + expose the bundle.** Immediately before the `export const content = {...}` line (~90), add:
```ts
const graph = buildConceptGraph(concepts);
const diagnostics = diagnosticsBundle as Record<string, { concept: string; items: import("./calibration").DiagItem[] }>;
```
and change the `content` export to include `diagnostics` and the graph:
```ts
export const content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, quickCheckUnits, unitTitleById, trackOrder, diagnostics, graph };
```

- [ ] **Step 3: Seed from pretest on load.** Replace the whole `loadKnowledge` function (currently ~lines 97-101) with:
```ts
function loadKnowledge(): KnowledgeState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(K_KEY);
    if (raw) return deserializeKnowledge(JSON.parse(raw));
  } catch { /* fall through to seed */ }
  // Empty state + a prior pretest → seed concept confidences from it (cold-start personalization).
  const pretest = userState.value.pretest;
  if (pretest) return seedFromPretest(emptyState(), graph, pretest, pretestQuestions, advancedQuestions, Date.now());
  return emptyState();
}
```
(`graph`, `userState`, `pretestQuestions`, `advancedQuestions`, `seedFromPretest` are all module-level above this function.)

- [ ] **Step 4: Add the calibration surface.** Append at the end of the mutation-helpers section (after `resetPath`):
```ts
export function activeGoals() {
  return config.value.goals.map((g) => goalById.get(g.id)).filter(Boolean) as import("./types").Goal[];
}
export function applyDiagnosticResult(concept: string, correctFrac: number): void {
  knowledge.value = applyDiagnostic(knowledge.value, graph, concept, correctFrac, Date.now());
}
export function nextCalibrationProbe(): string | null {
  const frontier = targetFrontier(activeGoals(), config.value, concepts);
  return pickProbe(knowledge.value, graph, frontier, diagnosedConcepts, config.value.weights.masteryThreshold);
}
export function unitProbeConcepts(unitId: string): string[] {
  return (teachesByUnit.get(unitId) ?? []).filter((c) => diagnosedConcepts.has(c));
}
```

- [ ] **Step 5: Add a wiring test** to `path-io.test.ts`:
```ts
import { content, nextCalibrationProbe, unitProbeConcepts } from "./path-io";

describe("path-io calibration surface", () => {
  it("exposes the diagnostics bundle for the 35 diagnosed concepts", () => {
    expect(Object.keys(content.diagnostics).length).toBe(35);
    expect(content.diagnostics["idempotency"].items.length).toBeGreaterThanOrEqual(2);
  });
  it("nextCalibrationProbe returns a diagnosed concept (cold-start)", () => {
    const p = nextCalibrationProbe();
    expect(p === null || content.diagnosedConcepts.has(p)).toBe(true);
  });
  it("unitProbeConcepts filters a unit's teaches to diagnosed concepts", () => {
    const withProbe = content.units.find((u) => u.teaches.some((c) => content.diagnosedConcepts.has(c)));
    expect(withProbe).toBeDefined();
    const probes = unitProbeConcepts(withProbe!.unit);
    expect(probes.every((c) => content.diagnosedConcepts.has(c))).toBe(true);
    expect(probes.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Run + typecheck.**
Run: `bunx vitest run src/scripts/path/` → all green (prior 60 + new).
Run: `bun run check 2>&1 | grep -E "path-io" || echo "no path-io errors"` → `no path-io errors`.

- [ ] **Step 7: Commit.**
```bash
git add site/src/scripts/path/path-io.ts site/src/scripts/path/path-io.test.ts
git commit -m "feat(path): P3 path-io — seed-on-load + calibration surface (probe, diagnostics bundle)"
```

---

## Task 5: `DiagnosticRunner.tsx` — shared client-graded runner

**Files:** Create `src/components/path/DiagnosticRunner.tsx`.

- [ ] **Step 1: Create the component.**

```tsx
// src/components/path/DiagnosticRunner.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content } from "~/scripts/path/path-io";
import { gradeMcq, gradeBlanks, fracOf } from "~/scripts/path/calibration";

const L = {
  en: { skip: "Not sure", next: "Next", concept: "Concept", of: "of", done: "Done" },
  ru: { skip: "Не уверен(а)", next: "Дальше", concept: "Концепт", of: "из", done: "Готово" },
} as const;

type Props = { lang: Locale; conceptIds: string[]; onConcept: (concept: string, correctFrac: number) => void; onDone: () => void };

export default function DiagnosticRunner({ lang, conceptIds, onConcept, onDone }: Props) {
  const t = L[lang];
  const ids = conceptIds.filter((id) => content.diagnostics[id]); // only diagnosable
  const [ci, setCi] = useState(0);       // current concept index
  const [ii, setIi] = useState(0);       // current item index
  const [results, setResults] = useState<boolean[]>([]);
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<number | null>(null);

  if (ids.length === 0) { onDone(); return null; }
  const bank = content.diagnostics[ids[ci]];
  const item = bank.items[ii] as any;
  const label = content.conceptById.get(ids[ci])?.label[lang] ?? ids[ci];

  const advance = (correct: boolean) => {
    const nextResults = [...results, correct];
    if (ii + 1 < bank.items.length) {
      setResults(nextResults); setIi(ii + 1); setValue(""); setPicked(null); return;
    }
    onConcept(ids[ci], fracOf(nextResults));
    if (ci + 1 < ids.length) { setCi(ci + 1); setIi(0); setResults([]); setValue(""); setPicked(null); }
    else onDone();
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="text-xs uppercase tracking-wide text-stone-500">{label} · {t.concept} {ci + 1} {t.of} {ids.length}</div>
      <p class="font-medium text-stone-900">{item.prompt[lang]}</p>
      {item.type === "mcq" ? (
        <ul class="flex flex-col gap-2">
          {item.choices.map((ch: any, i: number) => (
            <li key={i}>
              <button class={`w-full rounded border px-3 py-2 text-left text-sm ${picked === i ? "border-sky-500 bg-sky-50" : "border-stone-300 hover:bg-stone-100"}`} onClick={() => setPicked(i)}>{ch[lang]}</button>
            </li>
          ))}
          <li class="flex gap-2">
            <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white disabled:opacity-40" disabled={picked === null} onClick={() => advance(gradeMcq(item, picked!))}>{t.next}</button>
            <button class="rounded border border-stone-300 px-3 py-1.5 text-sm" onClick={() => advance(false)}>{t.skip}</button>
          </li>
        </ul>
      ) : (
        <div class="flex gap-2">
          <input class="flex-1 rounded border border-stone-300 px-3 py-1.5 text-sm" value={value} onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
          <button class="rounded bg-sky-600 px-3 py-1.5 text-sm text-white" onClick={() => advance(gradeBlanks(item, value))}>{t.next}</button>
          <button class="rounded border border-stone-300 px-3 py-1.5 text-sm" onClick={() => advance(false)}>{t.skip}</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck.** `bun run check 2>&1 | grep -E "DiagnosticRunner" || echo "no DiagnosticRunner errors"` → `no DiagnosticRunner errors`.

- [ ] **Step 3: Commit.**
```bash
git add site/src/components/path/DiagnosticRunner.tsx
git commit -m "feat(path): P3 DiagnosticRunner — client-graded mcq/blanks item runner"
```

---

## Task 6: CalibrationFlow + `/calibrate` route + cold-start CTA

**Files:** Create `src/components/path/CalibrationFlow.tsx`, `src/pages/[lang]/calibrate.astro`; modify `src/components/path/PathView.tsx`.

- [ ] **Step 1: Create `CalibrationFlow.tsx`.**

```tsx
// src/components/path/CalibrationFlow.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { knowledge, content, nextCalibrationProbe, unitProbeConcepts, applyDiagnosticResult } from "~/scripts/path/path-io";
import DiagnosticRunner from "./DiagnosticRunner";

const MAX_PROBES = 8;
const L = {
  en: { title: "Quick calibration", intro: "Answer a few checks so we can skip what you already know. About 5 minutes — you can stop anytime.", start: "Start", skip: "Skip to my path", done: "All set", doneBody: "Calibrated. Your path now reflects what you know.", toPath: "See my path", probed: "checks done" },
  ru: { title: "Быстрая калибровка", intro: "Ответь на несколько проверок, чтобы мы пропустили то, что ты уже знаешь. Около 5 минут — можно остановиться в любой момент.", start: "Начать", skip: "Сразу к пути", done: "Готово", doneBody: "Откалибровано. Твой путь теперь учитывает то, что ты знаешь.", toPath: "К моему пути", probed: "проверок пройдено" },
} as const;

export default function CalibrationFlow({ lang, unit }: { lang: Locale; unit?: string }) {
  const t = L[lang];
  const roadmap = `/${lang}/roadmap`;
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [probes, setProbes] = useState(0);
  // current concept(s) to run: unit mode = all that unit's diagnosable concepts at once; goal mode = one probe.
  const [current, setCurrent] = useState<string[]>([]);

  const nextProbe = () => {
    if (unit) return null; // unit mode runs once over the whole set
    if (probes >= MAX_PROBES) return null;
    const p = nextCalibrationProbe();
    return p ? [p] : null;
  };

  const begin = () => {
    if (unit) { setCurrent(unitProbeConcepts(unit)); setPhase("run"); return; }
    const first = nextCalibrationProbe();
    if (!first) { setPhase("done"); return; }
    setCurrent([first]); setPhase("run");
  };

  const onConcept = (concept: string, frac: number) => applyDiagnosticResult(concept, frac);
  const onDone = () => {
    const np = nextProbe();
    setProbes((n) => n + current.length);
    if (np) setCurrent(np);
    else setPhase("done");
  };

  if (phase === "intro") {
    const noProbes = (unit ? unitProbeConcepts(unit) : (nextCalibrationProbe() ? [1] : [])).length === 0;
    return (
      <div class="max-w-xl flex flex-col gap-4">
        <h1 class="text-3xl font-extrabold">{t.title}</h1>
        <p class="text-stone-600">{t.intro}</p>
        <div class="flex gap-3">
          {!noProbes && <button class="rounded bg-sky-600 px-4 py-2 text-white" onClick={begin}>{t.start}</button>}
          <a class="rounded border border-stone-300 px-4 py-2" href={roadmap}>{t.skip}</a>
        </div>
      </div>
    );
  }
  if (phase === "run") {
    return (
      <div class="max-w-xl flex flex-col gap-4">
        <h1 class="text-2xl font-bold">{t.title}</h1>
        <DiagnosticRunner lang={lang} conceptIds={current} onConcept={onConcept} onDone={onDone} />
        <a class="text-sm text-stone-500 underline" href={roadmap}>{t.skip}</a>
      </div>
    );
  }
  return (
    <div class="max-w-xl flex flex-col gap-4">
      <h1 class="text-3xl font-extrabold">{t.done}</h1>
      <p class="text-stone-600">{t.doneBody} · {probes} {t.probed} · {knowledge.value.size} concepts touched.</p>
      <a class="rounded bg-sky-600 px-4 py-2 text-white w-fit" href={roadmap}>{t.toPath}</a>
    </div>
  );
}
```

- [ ] **Step 2: Create the route `src/pages/[lang]/calibrate.astro`.**

```astro
---
import Topic from "../../layouts/Topic.astro";
import CalibrationFlow from "../../components/path/CalibrationFlow.tsx";
import { type Locale, isLocale, t } from "../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
// The ?unit= param is read client-side (static route); pass nothing here.
---
<Topic title={t("roadmap.title", lang)} lang={lang}>
  <CalibrationFlow client:only="preact" lang={lang} />
</Topic>
```

- [ ] **Step 3: Read `?unit` client-side.** In `CalibrationFlow.tsx`, the route passes no `unit` prop; instead read the query param. Replace the component signature line `export default function CalibrationFlow({ lang, unit }: { lang: Locale; unit?: string }) {` with:
```tsx
export default function CalibrationFlow({ lang, unit: unitProp }: { lang: Locale; unit?: string }) {
  const unit = unitProp ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("unit") ?? undefined : undefined);
```
(and delete the old `const t = L[lang];`-preceding signature line's closing — i.e. keep the body; just ensure `unit` is defined from the query when no prop. The rest of the body references `unit` unchanged.)

- [ ] **Step 4: Add the cold-start CTA in `PathView.tsx`.** In the cold-start `<section>` block, after the `<p>` with `{t.coldBody}`, add a CTA link. Add `coldCta` to the `L` labels (`en: "Calibrate (5 min)"`, `ru: "Калибровка (5 мин)"`) and render:
```tsx
          <a class="mt-3 inline-block rounded bg-sky-600 px-4 py-2 text-sm text-white" href={`/${lang}/calibrate`}>{t.coldCta}</a>
```

- [ ] **Step 5: Gates.**
Run: `bunx vitest run src/scripts/path/` → green.
Run: `bun run check 2>&1 | grep -E "CalibrationFlow|calibrate|PathView" || echo "no errors"` → `no errors`.

- [ ] **Step 6: Commit.**
```bash
git add site/src/components/path/CalibrationFlow.tsx "site/src/pages/[lang]/calibrate.astro" site/src/components/path/PathView.tsx
git commit -m "feat(path): P3 CalibrationFlow + /calibrate route + cold-start CTA"
```

---

## Task 7: Pre-unit quick-check (roadmap card modal + lesson link)

**Files:** Modify `src/components/path/PathCard.tsx`, `src/components/path/PathView.tsx`, `src/layouts/Lesson.astro`.

- [ ] **Step 1: Make the PathCard badge a button.** In `PathCard.tsx`, add `onQuickCheck: () => void` to the `Props` type, and replace the badge line:
```tsx
        {hasQuickCheck && <span class="ml-auto rounded bg-emerald-50 px-2 py-1 text-emerald-700">✓ {t.quick}</span>}
```
with:
```tsx
        {hasQuickCheck && <button class="ml-auto rounded bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100" onClick={onQuickCheck}>✓ {t.quick}</button>}
```

- [ ] **Step 2: Wire a quick-check modal in `PathView.tsx`.** Add imports:
```tsx
import DiagnosticRunner from "./DiagnosticRunner";
import { unitProbeConcepts, applyDiagnosticResult } from "~/scripts/path/path-io";
```
Add modal state after the existing `const [drawer, setDrawer] = useState<...>(null);`:
```tsx
  const [quickUnit, setQuickUnit] = useState<string | null>(null);
```
Pass the handler to each `PathCard` (add the prop in the `<PathCard ... />` JSX):
```tsx
            onQuickCheck={() => setQuickUnit(s.unit)}
```
Render the modal near the drawers (before the closing `</div>`):
```tsx
      {quickUnit && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQuickUnit(null)}>
          <div class="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <DiagnosticRunner lang={lang} conceptIds={unitProbeConcepts(quickUnit)}
              onConcept={(c, f) => applyDiagnosticResult(c, f)} onDone={() => setQuickUnit(null)} />
          </div>
        </div>
      )}
```

- [ ] **Step 3: Add the lesson-page link in `Lesson.astro`.** Near the top frontmatter (after the existing imports), add a module-scope import + a per-lesson gate:
```astro
import diagnosticsIndex from "~/content/path/diagnostics-index.json";
import unitConcepts from "~/content/path/unit-concepts.json";
```
After the `const { title, lang, trackSlug, unitSlug, ... }` destructure, compute:
```astro
const _diagSet = new Set(diagnosticsIndex as string[]);
const _unitTeaches = ((unitConcepts as Record<string, { teaches: string[] }>)[`${trackSlug}/${unitSlug}`]?.teaches) ?? [];
const showPreUnitCheck = order === 1 && _unitTeaches.some((c) => _diagSet.has(c));
const calibrateHref = `/${lang}/calibrate?unit=${trackSlug}/${unitSlug}`;
```
Then in the template, at the very top of the lesson body (before the first `<slot />` or main content), add:
```astro
{showPreUnitCheck && (
  <a href={calibrateHref} class="mb-4 block rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 no-underline">
    {lang === "en" ? "Already know this unit? Take a 1-minute quick check →" : "Уже знаешь этот юнит? Пройди быструю проверку за минуту →"}
  </a>
)}
```
(Place it inside the existing article/main wrapper so it inherits layout width. It is a plain `<a>` — **0 hydration islands**.)

- [ ] **Step 4: Gates.**
Run: `bunx vitest run src/scripts/path/` → green.
Run: `bun run check 2>&1 | grep -E "PathCard|PathView|Lesson.astro" || echo "no errors"` → `no errors`.

- [ ] **Step 5: Commit.**
```bash
git add site/src/components/path/PathCard.tsx site/src/components/path/PathView.tsx site/src/layouts/Lesson.astro
git commit -m "feat(path): P3 pre-unit quick-check (roadmap card modal + zero-island lesson link)"
```

---

## Task 8: Full build + bilingual verification

- [ ] **Step 1: Full build.**
Run: `cd site && NODE_OPTIONS=--max-old-space-size=10240 bun run build`
Expected: `lint: clean — 0 errors, 0 warnings`; page count ≈ 4849 (adds `/en/calibrate` + `/ru/calibrate`).

- [ ] **Step 2: Bilingual visual verification** (`bun run preview`):
- Fresh localStorage → `/en/roadmap` cold-start banner shows a "Calibrate" CTA → `/en/calibrate` → answer a few checks → return to `/roadmap` → path is shorter (known concepts dropped).
- Take the pretest (via SettingsDrawer) first → `/roadmap` path already reflects it (seed-on-load).
- Roadmap card "✓ quick check" button → modal runs the unit's diagnostic → on pass the unit drops from the path.
- A unit's first lesson page shows the green "quick check" link → `/calibrate?unit=…`.
- Repeat on `/ru/…` — all strings Russian, no English leakage.

- [ ] **Step 3: Commit (if any verification tweaks).** Otherwise the feature is complete on the branch.

---

## Self-Review (completed during authoring)

**Spec coverage:**
- Pretest→concept seed (map + weight→frac + reuse applyDiagnostic + seed-on-load) → Tasks 1, 4. ✓
- DiagnosticRunner (mcq/blanks, client-graded, skip/not-sure) → Tasks 2 (helpers) + 5. ✓
- diagnostics-bundle.json emit → Task 3. ✓
- CalibrationFlow (nextProbe loop, 8-probe cap, skippable/resumable, unit mode via ?unit) + /calibrate route → Task 6. ✓
- pickProbe (diagnosable filter, info-gain) → Task 2. ✓
- Pre-unit quick-check: roadmap card modal + zero-island lesson link → Task 7. ✓
- path-io wiring (graph, content.diagnostics, applyDiagnosticResult, nextCalibrationProbe, unitProbeConcepts, activeGoals) → Task 4. ✓
- No P0 core edits (seed reuses applyDiagnostic; pickProbe reuses graph closures + masteryOf) → Tasks 1, 2. ✓
- Tests: seed weight/skip/lift + map-targets-exist; pickProbe filter/null/tie; grading mcq/blanks/frac → Tasks 1, 2. ✓

**Placeholder scan:** none — every code step is complete. Task 6 Step 3's edit note is an explicit, concrete replacement (query-param read), not a placeholder.

**Type consistency:** `seedFromPretest(state, graph, pretest, stage1Questions, stage2Questions, now)`, `pickProbe(state, g, frontier, diagnosed, threshold)`, `gradeMcq/gradeBlanks/fracOf`, `applyDiagnosticResult(concept, frac)`, `nextCalibrationProbe()`, `unitProbeConcepts(unitId)`, `content.diagnostics`/`content.graph` — names identical across defining and consuming tasks. `DiagItem` is defined in `calibration.ts` and imported where needed. Engine reuse matches P0 signatures: `applyDiagnostic(state, g, concept, frac, now)`, `targetFrontier(goals, config, concepts)`, `buildConceptGraph(concepts)`, `ancestors/descendants(g, id)`, `masteryOf(state, id)`.
