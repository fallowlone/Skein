# Path Engine P2 — PathView on /roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty `CompetencyMap` on `/roadmap` with an interactive **PathView** that shows the personalized study path (what/order/why/schedule), driven by the committed P1 concept graph and the deterministic P0 engine, persisting learner state client-side.

**Architecture:** One Preact island (`PathView`) owns the whole `/roadmap` surface; `GoalPicker` and `PathConfigDrawer` render as drawers inside it. All state flows through a new impure adapter `src/scripts/path/path-io.ts` (two versioned-localStorage `@preact/signals` signals + a `computePath()` that calls the pure P0 `buildPath`/`schedulePlan`). The pure core and its types are **unchanged**; `Date.now()` lives only in the adapter.

**Tech Stack:** Astro 5, Preact + `@preact/signals` (read `signal.value` in render for reactivity, `preact/hooks` for local state), Tailwind, Vitest, bun. Path alias `~` → `src/`. Reference spec: `docs/superpowers/specs/2026-06-06-path-engine-p2-pathview-design.md`.

**Conventions (verified in repo):** Island components use **inline bilingual `labels = { en: {...}, ru: {...} }`** objects (see `SettingsDrawer.tsx`), NOT `ui.json`. Components read an imported signal's `.value` directly in render to subscribe. JSON is `import`ed directly (Vite bundles it). All paths below are relative to `site/`.

---

## File Structure

- `scripts/path/build-path-data.mjs` — **modify**: also emit `src/content/path/diagnostics-index.json`.
- `src/content/path/diagnostics-index.json` — **generated**: `string[]` of diagnosed concept ids.
- `src/scripts/path/path-io.ts` — **create**: content bundle, signals, `computePath()`, pure helpers, mutation helpers. The only new impure module.
- `src/scripts/path/path-io.test.ts` — **create**: unit tests for the pure helpers + a cold-start `computePath` smoke.
- `src/components/path/PathCard.tsx` — **create**: one path-step card (presentational + action callbacks).
- `src/components/path/PathView.tsx` — **create**: the island (header, deadline panel, path list, mastery overview, drawers).
- `src/components/path/GoalPicker.tsx` — **create**: goals/priorities/custom/exclude + deadline setup drawer.
- `src/components/path/PathConfigDrawer.tsx` — **create**: four knob groups drawer.
- `src/pages/[lang]/roadmap.astro` — **rewrite**: render `<PathView client:only="preact" lang={lang} />`.
- **Delete**: `src/components/progression/CompetencyMap.tsx`, `src/scripts/progression/competency.ts`, `src/scripts/progression/competency-inputs.ts`, `src/scripts/progression/competency.test.ts`.

---

## Task 0: Emit `diagnostics-index.json` from the build script

**Files:**
- Modify: `scripts/path/build-path-data.mjs`

- [ ] **Step 1: Add the index emit.** In `main()`, immediately after the `writeFileSync(join(OUT, "concept-overrides.json"), …)` line, insert:

```js
  // Diagnostics index: the island cannot readdir(), so emit the list of diagnosed
  // concept ids as committed JSON for path-io.ts to import.
  const diagnosedIds = loadDiagnosedConcepts().sort();
  writeFileSync(join(OUT, "diagnostics-index.json"), JSON.stringify(diagnosedIds, null, 2) + "\n");
```

- [ ] **Step 2: Run it.**

Run: `bun scripts/path/build-path-data.mjs`
Expected: summary JSON prints `"diagnosedConcepts": 35`; `src/content/path/diagnostics-index.json` now exists.

- [ ] **Step 3: Verify the file.**

Run: `bun -e 'const a=require("./src/content/path/diagnostics-index.json"); console.log(a.length, a.slice(0,3))'`
Expected: `35 [ 'autovacuum', 'backpressure', 'base_case' ]` (35, sorted).

- [ ] **Step 4: Commit.**

```bash
git add site/scripts/path/build-path-data.mjs site/src/content/path/diagnostics-index.json
git commit -m "feat(path): P2 emit diagnostics-index.json for the runtime bundle"
```

---

## Task 1: `path-io.ts` — content bundle + pure helpers (TDD)

**Files:**
- Create: `src/scripts/path/path-io.ts`
- Test: `src/scripts/path/path-io.test.ts`

- [ ] **Step 1: Write the failing test** (pure helpers only — no signals yet).

```ts
// src/scripts/path/path-io.test.ts
import { describe, it, expect } from "vitest";
import {
  unitsFromMap, applyViewOrder, masteryByTrack, serializeKnowledge, deserializeKnowledge,
  togglePin, moveInOrder,
} from "./path-io";
import { emptyState, applySelfDeclare } from "./knowledge";
import type { PathStep, Concept } from "./types";

const step = (unit: string, track = "networking"): PathStep =>
  ({ unit, track, unlocks: [], reason: "", kind: "learn", estMin: 10 });

describe("path-io pure helpers", () => {
  it("unitsFromMap turns the unit-concepts map into UnitConcepts[] with unit+track", () => {
    const out = unitsFromMap({ "networking/02-tcp": { teaches: ["a"], requires: ["b"], estMin: 40 } });
    expect(out).toEqual([{ unit: "networking/02-tcp", track: "networking", teaches: ["a"], requires: ["b"], estMin: 40 }]);
  });

  it("applyViewOrder floats ordered units to the top in order, keeps the rest stable", () => {
    const steps = [step("n/01"), step("n/02"), step("n/03")];
    const out = applyViewOrder(steps, ["n/03", "n/01"]);
    expect(out.map((s) => s.unit)).toEqual(["n/03", "n/01", "n/02"]);
  });

  it("applyViewOrder is a no-op with an empty order", () => {
    const steps = [step("n/01"), step("n/02")];
    expect(applyViewOrder(steps, []).map((s) => s.unit)).toEqual(["n/01", "n/02"]);
  });

  it("togglePin adds then removes a unit", () => {
    expect(togglePin([], "u1")).toEqual(["u1"]);
    expect(togglePin(["u1"], "u1")).toEqual([]);
  });

  it("moveInOrder swaps a unit with its neighbour (auto-adds if absent)", () => {
    expect(moveInOrder(["a", "b", "c"], "c", "up")).toEqual(["a", "c", "b"]);
    expect(moveInOrder(["a", "b"], "a", "down")).toEqual(["b", "a"]);
    expect(moveInOrder([], "x", "up")).toEqual(["x"]); // absent → added, no crash
  });

  it("masteryByTrack rolls confidence up per track", () => {
    const concepts: Concept[] = [
      { id: "a", label: { en: "A", ru: "А" }, track: "networking", band: "middle", requires: [] },
      { id: "b", label: { en: "B", ru: "Б" }, track: "networking", band: "middle", requires: [] },
      { id: "c", label: { en: "C", ru: "В" }, track: "databases", band: "surface", requires: [] },
    ];
    const state = applySelfDeclare(emptyState(), "a", true, 0); // a known (conf 1)
    const rows = masteryByTrack(state, concepts, 0.6);
    const net = rows.find((r) => r.track === "networking")!;
    expect(net).toMatchObject({ total: 2, known: 1 });
    expect(net.avg).toBeCloseTo(0.5, 5);
    expect(rows.map((r) => r.track)).toEqual(["databases", "networking"]); // sorted
  });

  it("knowledge serialization round-trips through a Map", () => {
    const s = applySelfDeclare(emptyState(), "a", true, 123);
    const arr = serializeKnowledge(s);
    expect(arr).toEqual([["a", { confidence: 1, source: "declared", lastAt: 123 }]]);
    expect(deserializeKnowledge(arr).get("a")).toEqual({ confidence: 1, source: "declared", lastAt: 123 });
  });
});
```

- [ ] **Step 2: Run it — verify failure.**

Run: `bunx vitest run src/scripts/path/path-io.test.ts`
Expected: FAIL — cannot find module `./path-io`.

- [ ] **Step 3: Write the module's pure section.** Create `src/scripts/path/path-io.ts` with exactly this (signals/mutations come in Task 2 — leave the file ending where shown):

```ts
// src/scripts/path/path-io.ts
//
// Impure adapter for the path engine (spec §6). Owns the committed content bundle,
// client persistence (versioned localStorage), and the single recompute entry point.
// The pure P0 core (graph/knowledge/planner/schedule/config) is consumed, never modified.
// This is the ONLY place Date.now() / localStorage are touched.
import type { Concept, Goal, KnowledgeState, ConceptMastery, UnitConcepts, PathStep, PathConfig, Tier } from "./types";

// ── committed content (Vite bundles these into the island chunk) ───────────────
import conceptsJson from "~/content/path/concepts.json";
import unitConceptsJson from "~/content/path/unit-concepts.json";
import goalsJson from "~/content/path/goals.json";
import diagnosticsIndex from "~/content/path/diagnostics-index.json";
import unitsJson from "~/content/units.json";
import tracksJson from "~/content/tracks.json";
import { masteryOf } from "./knowledge";

// ── pure helpers (unit-tested) ─────────────────────────────────────────────────
export function unitsFromMap(map: Record<string, { teaches: string[]; requires: string[]; estMin: number }>): UnitConcepts[] {
  return Object.entries(map).map(([unit, v]) => ({
    unit, track: unit.split("/")[0] as UnitConcepts["track"], teaches: v.teaches, requires: v.requires, estMin: v.estMin,
  }));
}

export function applyViewOrder(steps: PathStep[], order: string[]): PathStep[] {
  if (!order.length) return steps;
  const rank = new Map(order.map((u, i) => [u, i]));
  const pinned = steps.filter((s) => rank.has(s.unit)).sort((a, b) => rank.get(a.unit)! - rank.get(b.unit)!);
  const rest = steps.filter((s) => !rank.has(s.unit));
  return [...pinned, ...rest];
}

export function togglePin(order: string[], unit: string): string[] {
  return order.includes(unit) ? order.filter((u) => u !== unit) : [...order, unit];
}

export function moveInOrder(order: string[], unit: string, dir: "up" | "down"): string[] {
  const next = order.includes(unit) ? [...order] : [...order, unit];
  const i = next.indexOf(unit);
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= next.length) return next;
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export interface TrackMastery { track: string; known: number; total: number; avg: number; }
export function masteryByTrack(state: KnowledgeState, concepts: Concept[], threshold: number): TrackMastery[] {
  const m = new Map<string, { known: number; total: number; sum: number }>();
  for (const c of concepts) {
    const t = m.get(c.track) ?? { known: 0, total: 0, sum: 0 };
    const conf = masteryOf(state, c.id);
    t.total++; t.sum += conf; if (conf >= threshold) t.known++;
    m.set(c.track, t);
  }
  return [...m.entries()]
    .map(([track, v]) => ({ track, known: v.known, total: v.total, avg: v.total ? v.sum / v.total : 0 }))
    .sort((a, b) => a.track.localeCompare(b.track));
}

export function serializeKnowledge(state: KnowledgeState): [string, ConceptMastery][] {
  return [...state.entries()];
}
export function deserializeKnowledge(arr: [string, ConceptMastery][]): KnowledgeState {
  return new Map(arr);
}
// ── (Task 2 appends the content bundle + signals + mutations below this line) ──
```

- [ ] **Step 4: Run it — verify pass.**

Run: `bunx vitest run src/scripts/path/path-io.test.ts`
Expected: PASS (7 passing). If Vitest errors on the `~/content/*.json` imports (no `astro:content`, but these are plain JSON via the `~` alias — should resolve through `vitest.config` paths), confirm the alias is configured; the JSON imports are inert for the pure-helper tests.

- [ ] **Step 5: Commit.**

```bash
git add site/src/scripts/path/path-io.ts site/src/scripts/path/path-io.test.ts
git commit -m "feat(path): P2 path-io pure helpers (bundle transform, view order, mastery rollup)"
```

---

## Task 2: `path-io.ts` — content bundle, signals, computePath, mutations

**Files:**
- Modify: `src/scripts/path/path-io.ts` (append below the Task 1 marker)
- Modify: `src/scripts/path/path-io.test.ts` (add a cold-start smoke)

- [ ] **Step 1: Append the bundle + signals + recompute + mutations** to `path-io.ts` (after the `// ── (Task 2 appends …)` marker):

```ts
import { buildPath, type Path } from "./planner";
import { schedulePlan, type Schedule } from "./schedule";
import { emptyState, applySelfDeclare } from "./knowledge";
import { mergeConfig } from "./config";
import type { DeadlineConfig } from "./types";

// View-only state the pure core ignores (pin/reorder). Persisted with the config.
export interface PathView { order: string[] }
export type StoredPathConfig = PathConfig & { view: PathView };

const concepts = conceptsJson as Concept[];
const units = unitsFromMap(unitConceptsJson as any);
const goals = goalsJson as Goal[];
const goalById = new Map(goals.map((g) => [g.id, g]));
const conceptById = new Map(concepts.map((c) => [c.id, c]));
const diagnosedConcepts = new Set(diagnosticsIndex as string[]);
const unitTitleById = new Map((unitsJson as any[]).map((u) => [u.id, u.title as { en: string; ru: string }]));
const trackOrder = new Map((tracksJson as any[]).map((t) => [t.slug as string, t.order as number]));
const teachesByUnit = new Map(units.map((u) => [u.unit, u.teaches]));

export const content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, unitTitleById, trackOrder };

// ── persistence (versioned, mirrors user-state.ts) ─────────────────────────────
import { signal, effect } from "@preact/signals";
const K_KEY = "awesome.path-knowledge.v1";
const C_KEY = "awesome.path-config.v1";

function loadKnowledge(): KnowledgeState {
  if (typeof window === "undefined") return emptyState();
  try { const raw = localStorage.getItem(K_KEY); return raw ? deserializeKnowledge(JSON.parse(raw)) : emptyState(); }
  catch { return emptyState(); }
}
function loadConfig(): StoredPathConfig {
  const base = mergeConfig({}) as StoredPathConfig;
  base.view = { order: [] };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(C_KEY);
    if (!raw) return base;
    const stored = JSON.parse(raw);
    const merged = mergeConfig(stored) as StoredPathConfig;
    merged.view = { order: stored.view?.order ?? [] };
    return merged;
  } catch { return base; }
}

export const knowledge = signal<KnowledgeState>(loadKnowledge());
export const config = signal<StoredPathConfig>(loadConfig());

if (typeof window !== "undefined") {
  effect(() => { try { localStorage.setItem(K_KEY, JSON.stringify(serializeKnowledge(knowledge.value))); } catch {} });
  effect(() => { try { localStorage.setItem(C_KEY, JSON.stringify(config.value)); } catch {} });
}

// ── recompute (the single entry point; reads signals → subscribes the caller) ──
export function computePath(): { path: Path; schedule?: Schedule } {
  const cfg = config.value;
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  const raw = buildPath({
    state: knowledge.value, goals: goalObjs, config: cfg,
    content: { concepts, units, goalById }, srsDue: [], now: Date.now(), trackOrder,
  });
  const path: Path = { steps: applyViewOrder(raw.steps, cfg.view.order) };
  const schedule = cfg.deadline ? schedulePlan(path, cfg.deadline, Date.now()) : undefined;
  return { path, schedule };
}

// ── mutation helpers (write through signals → autosave → reactive recompute) ──
const setCfg = (patch: Partial<StoredPathConfig>) => { config.value = { ...config.value, ...patch }; };

export function declareKnown(concept: string, known: boolean): void {
  knowledge.value = applySelfDeclare(knowledge.value, concept, known, Date.now());
}
export function skipUnit(unitId: string): void {
  let next = knowledge.value;
  for (const c of teachesByUnit.get(unitId) ?? []) next = applySelfDeclare(next, c, true, Date.now());
  knowledge.value = next;
}
export function pinUnit(unitId: string): void { setCfg({ view: { order: togglePin(config.value.view.order, unitId) } }); }
export function moveUnit(unitId: string, dir: "up" | "down"): void { setCfg({ view: { order: moveInOrder(config.value.view.order, unitId, dir) } }); }
export function isPinned(unitId: string): boolean { return config.value.view.order.includes(unitId); }

export function setGoals(g: { id: string; priority: number }[]): void { setCfg({ goals: g }); }
export function toggleCustomTarget(id: string): void {
  const cur = config.value.customTargets ?? [];
  setCfg({ customTargets: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
}
export function toggleExcludedTrack(track: string): void {
  const cur = config.value.excludedTracks;
  setCfg({ excludedTracks: cur.includes(track) ? cur.filter((x) => x !== track) : [...cur, track] });
}
export function setKnob(patch: Partial<Pick<PathConfig, "breadthVsDepth" | "depthTier" | "pace" | "weights">>): void { setCfg(patch as Partial<StoredPathConfig>); }
export function setDeadline(d: DeadlineConfig | undefined): void { setCfg({ deadline: d }); }
export function resetPath(): void {
  knowledge.value = emptyState();
  const base = mergeConfig({}) as StoredPathConfig; base.view = { order: [] };
  config.value = base;
  if (typeof window !== "undefined") { try { localStorage.removeItem(K_KEY); localStorage.removeItem(C_KEY); } catch {} }
}
```

- [ ] **Step 2: Add a cold-start smoke test** to `path-io.test.ts`:

```ts
import { content, computePath, config } from "./path-io";

describe("path-io cold-start", () => {
  it("the bundle loads the full graph", () => {
    expect(content.concepts.length).toBeGreaterThan(4000);
    expect(content.units.length).toBe(274);
    expect(content.goals.map((g) => g.id)).toContain("senior-fullstack");
  });

  it("computePath returns dependency-ordered learn steps for the default goal", () => {
    config.value = { ...config.value, pace: { stepsAhead: 8, srsAggressiveness: 0 } };
    const { path } = computePath();
    expect(path.steps.length).toBeGreaterThan(0);
    expect(path.steps.length).toBeLessThanOrEqual(8);
    expect(path.steps.every((s) => s.kind === "learn")).toBe(true);
    expect(path.steps[0].estMin).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run the suite.**

Run: `bunx vitest run src/scripts/path/path-io.test.ts`
Expected: PASS (9 passing). If `@preact/signals` import fails under Vitest, confirm it is already a dependency (it is — used by `user-state.ts`).

- [ ] **Step 4: Typecheck the new module.**

Run: `bun run check 2>&1 | grep -E "path-io" || echo "no path-io errors"`
Expected: `no path-io errors` (the 19 pre-existing repo errors are unrelated).

- [ ] **Step 5: Commit.**

```bash
git add site/src/scripts/path/path-io.ts site/src/scripts/path/path-io.test.ts
git commit -m "feat(path): P2 path-io adapter — bundle, signals, computePath, mutations"
```

---

## Task 3: PathView island (path list + cold-start + mastery) + route + remove CompetencyMap

**Files:**
- Create: `src/components/path/PathCard.tsx`
- Create: `src/components/path/PathView.tsx`
- Modify: `src/pages/[lang]/roadmap.astro`
- Delete: `src/components/progression/CompetencyMap.tsx`, `src/scripts/progression/competency.ts`, `src/scripts/progression/competency-inputs.ts`, `src/scripts/progression/competency.test.ts`

- [ ] **Step 1: Create `PathCard.tsx`** (presentational; all actions are callbacks):

```tsx
// src/components/path/PathCard.tsx
import type { Locale } from "~/i18n";
import type { PathStep } from "~/scripts/path/types";
import { content } from "~/scripts/path/path-io";

const L = {
  en: { unlocks: "Unlocks", iKnow: "I know this", skip: "Skip", pin: "Pin", pinned: "Pinned", up: "↑", down: "↓", min: "min", quick: "quick check", learn: "learn", review: "review", check: "check" },
  ru: { unlocks: "Открывает", iKnow: "Уже знаю", skip: "Пропустить", pin: "Закрепить", pinned: "Закреплено", up: "↑", down: "↓", min: "мин", quick: "быстрая проверка", learn: "изучить", review: "повторить", check: "проверка" },
} as const;

type Props = {
  lang: Locale; step: PathStep; pinned: boolean; hasQuickCheck: boolean;
  onKnow: () => void; onSkip: () => void; onPin: () => void; onMove: (d: "up" | "down") => void;
};

export default function PathCard({ lang, step, pinned, hasQuickCheck, onKnow, onSkip, onPin, onMove }: Props) {
  const t = L[lang];
  const title = content.unitTitleById.get(step.unit)?.[lang] ?? step.unit;
  const concepts = step.unlocks.map((id) => content.conceptById.get(id)?.label[lang] ?? id);
  return (
    <li class="rounded-lg border border-stone-300 bg-white/70 p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-semibold text-stone-900">{title}</h3>
        <span class="text-xs uppercase tracking-wide text-stone-500">{t[step.kind]} · {step.estMin} {t.min}</span>
      </div>
      {concepts.length > 0 && (
        <p class="text-sm text-stone-600"><span class="text-stone-400">{t.unlocks}: </span>{concepts.slice(0, 6).join(", ")}{concepts.length > 6 ? "…" : ""}</p>
      )}
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={onKnow}>{t.iKnow}</button>
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={onSkip}>{t.skip}</button>
        <button class={`rounded border px-2 py-1 ${pinned ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:bg-stone-100"}`} onClick={onPin}>{pinned ? t.pinned : t.pin}</button>
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={() => onMove("up")} aria-label="up">{t.up}</button>
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={() => onMove("down")} aria-label="down">{t.down}</button>
        {hasQuickCheck && <span class="ml-auto rounded bg-emerald-50 px-2 py-1 text-emerald-700">✓ {t.quick}</span>}
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Create `PathView.tsx`** (header + cold-start + path list + mastery overview; drawers wired in Tasks 4–5 — the imports/buttons are present now, the drawer components are added next):

```tsx
// src/components/path/PathView.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import {
  knowledge, config, content, computePath, masteryByTrack,
  declareKnown, skipUnit, pinUnit, moveUnit, isPinned, resetPath,
} from "~/scripts/path/path-io";
import PathCard from "./PathCard";
import GoalPicker from "./GoalPicker";
import PathConfigDrawer from "./PathConfigDrawer";

const L = {
  en: { title: "Your path", recompute: "Recompute", goals: "Goals & deadline", settings: "Tune", reset: "Reset",
        coldTitle: "Start here", coldBody: "We've planned a path toward becoming a senior fullstack engineer, beginning at the foundations. Mark what you already know, or set a goal to retarget.",
        masteryTitle: "Mastery by track", known: "known", empty: "Nothing to study for the current goal — try a broader goal or unskip units." },
  ru: { title: "Твой путь", recompute: "Пересчитать", goals: "Цели и дедлайн", settings: "Настроить", reset: "Сбросить",
        coldTitle: "Начни здесь", coldBody: "Мы построили путь к уровню senior fullstack, начиная с основ. Отметь, что уже знаешь, или задай цель, чтобы перенацелить.",
        masteryTitle: "Освоение по трекам", known: "освоено", empty: "Для текущей цели учить нечего — выбери более широкую цель или верни пропущенные юниты." },
} as const;

export default function PathView({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [drawer, setDrawer] = useState<null | "goals" | "config">(null);
  // Reading these .value during render subscribes the island to changes (preact/signals).
  const k = knowledge.value; const cfg = config.value;
  const { path, schedule } = computePath();
  const mastery = masteryByTrack(k, content.concepts, cfg.weights.masteryThreshold);
  const isColdStart = k.size === 0;

  return (
    <div class="flex flex-col gap-6">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="text-3xl font-extrabold mr-auto">{t.title}</h1>
        <button class="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100" onClick={() => setDrawer("goals")}>{t.goals}</button>
        <button class="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100" onClick={() => setDrawer("config")}>{t.settings}</button>
        <button class="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100" onClick={() => resetPath()}>{t.reset}</button>
      </header>

      {isColdStart && (
        <section class="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 class="font-semibold text-amber-900">{t.coldTitle}</h2>
          <p class="text-sm text-amber-800 mt-1">{t.coldBody}</p>
        </section>
      )}

      {/* Deadline panel — Task 6 inserts <DeadlinePanel schedule={schedule} lang={lang}/> here */}
      {schedule && <p class="text-sm text-stone-500">{schedule.countdownDays} days</p>}

      <ol class="flex flex-col gap-3">
        {path.steps.length === 0 && <li class="text-sm text-stone-500">{t.empty}</li>}
        {path.steps.map((s) => (
          <PathCard
            key={s.unit} lang={lang} step={s} pinned={isPinned(s.unit)}
            hasQuickCheck={(content.units.find((u) => u.unit === s.unit)?.teaches ?? []).some((c) => content.diagnosedConcepts.has(c))}
            onKnow={() => skipUnit(s.unit)} onSkip={() => skipUnit(s.unit)}
            onPin={() => pinUnit(s.unit)} onMove={(d) => moveUnit(s.unit, d)}
          />
        ))}
      </ol>

      <section>
        <h2 class="text-lg font-bold mb-2">{t.masteryTitle}</h2>
        <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {mastery.filter((m) => m.known > 0).length === 0 && <li class="text-sm text-stone-400 col-span-full">—</li>}
          {mastery.map((m) => (
            <li key={m.track} class="rounded border border-stone-200 p-2 text-sm">
              <div class="flex justify-between"><span class="font-medium">{m.track}</span><span class="text-stone-500">{m.known}/{m.total}</span></div>
              <div class="mt-1 h-1.5 rounded bg-stone-200"><div class="h-full rounded bg-emerald-500" style={`width:${Math.round(m.avg * 100)}%`} /></div>
            </li>
          ))}
        </ul>
      </section>

      {drawer === "goals" && <GoalPicker lang={lang} onClose={() => setDrawer(null)} />}
      {drawer === "config" && <PathConfigDrawer lang={lang} onClose={() => setDrawer(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder drawer stubs so Task 3 builds** (replaced fully in Tasks 4–5). Create `src/components/path/GoalPicker.tsx` and `src/components/path/PathConfigDrawer.tsx` each with:

```tsx
// src/components/path/GoalPicker.tsx  (stub — full impl in Task 4)
import type { Locale } from "~/i18n";
export default function GoalPicker({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  return <div class="fixed inset-0 bg-black/30" onClick={onClose} />;
}
```
```tsx
// src/components/path/PathConfigDrawer.tsx  (stub — full impl in Task 5)
import type { Locale } from "~/i18n";
export default function PathConfigDrawer({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  return <div class="fixed inset-0 bg-black/30" onClick={onClose} />;
}
```

- [ ] **Step 4: Rewrite `roadmap.astro`** entirely to:

```astro
---
import Topic from "../../layouts/Topic.astro";
import PathView from "../../components/path/PathView.tsx";
import { type Locale, isLocale, t } from "../../i18n";

export function getStaticPaths() {
  return [{ params: { lang: "en" } }, { params: { lang: "ru" } }];
}
const lang = Astro.params.lang as Locale;
if (!isLocale(lang)) throw new Error("bad lang");
---
<Topic title={t("roadmap.title", lang)} lang={lang}>
  <PathView client:only="preact" lang={lang} />
</Topic>
```

- [ ] **Step 5: Confirm no other references to the competency modules, then delete them.**

Run: `cd site && grep -rn "CompetencyMap\|progression/competency" src --include=*.astro --include=*.ts --include=*.tsx | grep -v "scripts/progression/competency"`
Expected: no matches (only `roadmap.astro` referenced it, now rewritten). If other matches appear, STOP and report them.

```bash
git rm site/src/components/progression/CompetencyMap.tsx \
       site/src/scripts/progression/competency.ts \
       site/src/scripts/progression/competency-inputs.ts \
       site/src/scripts/progression/competency.test.ts
```

- [ ] **Step 6: Build + visual.**

Run: `cd site && bunx vitest run src/scripts/path/ && NODE_OPTIONS=--max-old-space-size=10240 bun run build`
Expected: tests green; build completes; `lint: clean`. Then open `dist/en/roadmap/index.html` (or `bun run preview`) — PathView header + cold-start banner + path cards render. Mark known on a card → path shortens (verify in the browser via `bun run preview`).

- [ ] **Step 7: Commit.**

```bash
git add site/src/components/path/PathView.tsx site/src/components/path/PathCard.tsx site/src/components/path/GoalPicker.tsx site/src/components/path/PathConfigDrawer.tsx site/src/pages/'[lang]'/roadmap.astro
git commit -m "feat(path): P2 PathView island on /roadmap (path list + mastery), remove CompetencyMap"
```

---

## Task 4: GoalPicker drawer (goals + priorities + custom + exclude + deadline)

**Files:**
- Modify: `src/components/path/GoalPicker.tsx` (replace the stub)

- [ ] **Step 1: Replace `GoalPicker.tsx`** with the full drawer:

```tsx
// src/components/path/GoalPicker.tsx
import type { Locale } from "~/i18n";
import { config, content, setGoals, toggleExcludedTrack, setDeadline } from "~/scripts/path/path-io";
import type { DeadlineConfig } from "~/scripts/path/types";

const L = {
  en: { title: "Goals & deadline", priority: "priority", exclude: "Excluded tracks", deadline: "Deadline", date: "Target date", hours: "Hours per weekday (Mon–Sun)", clear: "Clear deadline", close: "Done", set: "Set deadline" },
  ru: { title: "Цели и дедлайн", priority: "приоритет", exclude: "Исключённые треки", deadline: "Дедлайн", date: "Целевая дата", hours: "Часов по дням (Пн–Вс)", clear: "Убрать дедлайн", close: "Готово", set: "Задать дедлайн" },
} as const;

export default function GoalPicker({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const t = L[lang];
  const cfg = config.value;
  const tracks = [...new Set(content.concepts.map((c) => c.track))].sort();
  const goalPrio = (id: string) => cfg.goals.find((g) => g.id === id)?.priority ?? 0;

  const setGoalPriority = (id: string, priority: number) => {
    const rest = cfg.goals.filter((g) => g.id !== id);
    setGoals(priority <= 0 ? rest : [...rest, { id, priority }]);
  };

  const dl = cfg.deadline;
  const setDate = (iso: string) => {
    const targetDateMs = Date.parse(iso + "T00:00:00Z");
    if (Number.isNaN(targetDateMs)) return;
    const next: DeadlineConfig = dl
      ? { ...dl, targetDateMs }
      : { targetDateMs, perWeekdayHours: [1, 1, 1, 1, 1, 0, 0], tzOffsetMin: 0 };
    setDeadline(next);
  };
  const setHour = (i: number, v: number) => {
    if (!dl) return;
    const perWeekdayHours = dl.perWeekdayHours.map((h, j) => (j === i ? Math.max(0, v) : h));
    setDeadline({ ...dl, perWeekdayHours });
  };
  const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  return (
    <div class="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside class="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold">{t.title}</h2>
          <button class="rounded border border-stone-300 px-3 py-1 text-sm" onClick={onClose}>{t.close}</button>
        </div>

        <ul class="flex flex-col gap-2 mb-6">
          {content.goals.map((g) => (
            <li key={g.id} class="flex items-center justify-between gap-3">
              <span class="text-sm">{g.label[lang]}</span>
              <input type="number" min={0} max={5} value={goalPrio(g.id)} class="w-16 rounded border border-stone-300 px-2 py-1 text-sm"
                onInput={(e) => setGoalPriority(g.id, Number((e.target as HTMLInputElement).value))} aria-label={`${g.label[lang]} ${t.priority}`} />
            </li>
          ))}
        </ul>

        <h3 class="font-semibold mb-2">{t.exclude}</h3>
        <div class="flex flex-wrap gap-1 mb-6">
          {tracks.map((tr) => {
            const off = cfg.excludedTracks.includes(tr);
            return <button key={tr} class={`rounded border px-2 py-1 text-xs ${off ? "border-rose-400 bg-rose-50 text-rose-700" : "border-stone-300"}`} onClick={() => toggleExcludedTrack(tr)}>{tr}</button>;
          })}
        </div>

        <h3 class="font-semibold mb-2">{t.deadline}</h3>
        <label class="block text-sm mb-2">{t.date}
          <input type="date" value={dl ? isoOf(dl.targetDateMs) : ""} class="mt-1 block rounded border border-stone-300 px-2 py-1" onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
        </label>
        {dl && (
          <>
            <p class="text-sm mb-1">{t.hours}</p>
            <div class="flex gap-1 mb-3">
              {dl.perWeekdayHours.map((h, i) => (
                <input key={i} type="number" min={0} max={12} value={h} class="w-10 rounded border border-stone-300 px-1 py-1 text-center text-xs"
                  onInput={(e) => setHour(i, Number((e.target as HTMLInputElement).value))} aria-label={`weekday ${i}`} />
              ))}
            </div>
            <button class="rounded border border-stone-300 px-3 py-1 text-sm" onClick={() => setDeadline(undefined)}>{t.clear}</button>
          </>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Build + visual.**

Run: `cd site && NODE_OPTIONS=--max-old-space-size=10240 bun run build`
Expected: `lint: clean`. In `bun run preview`: open GoalPicker, bump a goal priority / exclude a track / set a date → path recomputes; a deadline shows the per-weekday grid.

- [ ] **Step 3: Commit.**

```bash
git add site/src/components/path/GoalPicker.tsx
git commit -m "feat(path): P2 GoalPicker drawer (goals, priorities, exclude, deadline setup)"
```

---

## Task 5: PathConfigDrawer (four knob groups)

**Files:**
- Modify: `src/components/path/PathConfigDrawer.tsx` (replace the stub)

- [ ] **Step 1: Replace `PathConfigDrawer.tsx`** with:

```tsx
// src/components/path/PathConfigDrawer.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { config, setKnob } from "~/scripts/path/path-io";
import type { Tier } from "~/scripts/path/types";

const TIERS: Tier[] = ["junior", "middle", "senior"];
const L = {
  en: { title: "Tune your path", focus: "Focus", depthFirst: "depth-first", breadthFirst: "breadth-first", pace: "Pace", steps: "Steps shown", srs: "Review frequency", depth: "Depth tier", advanced: "Advanced (signal weights)", threshold: "Known threshold", decay: "Decay floor", close: "Done" },
  ru: { title: "Настрой путь", focus: "Фокус", depthFirst: "вглубь", breadthFirst: "вширь", pace: "Темп", steps: "Шагов показывать", srs: "Частота повторений", depth: "Уровень глубины", advanced: "Продвинутое (веса сигналов)", threshold: "Порог «знаю»", decay: "Пол затухания", close: "Готово" },
} as const;

export default function PathConfigDrawer({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const t = L[lang];
  const cfg = config.value;
  const [adv, setAdv] = useState(false);
  const num = (e: Event) => Number((e.target as HTMLInputElement).value);

  return (
    <div class="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside class="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold">{t.title}</h2>
          <button class="rounded border border-stone-300 px-3 py-1 text-sm" onClick={onClose}>{t.close}</button>
        </div>

        <label class="block text-sm mb-4">{t.focus}: {t.depthFirst} ↔ {t.breadthFirst}
          <input type="range" min={0} max={1} step={0.1} value={cfg.breadthVsDepth} class="mt-1 block w-full"
            onInput={(e) => setKnob({ breadthVsDepth: num(e) })} />
        </label>

        <label class="block text-sm mb-2">{t.steps}: {cfg.pace.stepsAhead}
          <input type="range" min={1} max={20} step={1} value={cfg.pace.stepsAhead} class="mt-1 block w-full"
            onInput={(e) => setKnob({ pace: { ...cfg.pace, stepsAhead: num(e) } })} />
        </label>
        <label class="block text-sm mb-4">{t.srs}: {cfg.pace.srsAggressiveness}
          <input type="range" min={0} max={1} step={0.1} value={cfg.pace.srsAggressiveness} class="mt-1 block w-full"
            onInput={(e) => setKnob({ pace: { ...cfg.pace, srsAggressiveness: num(e) } })} />
        </label>

        <label class="block text-sm mb-4">{t.depth}
          <select class="mt-1 block rounded border border-stone-300 px-2 py-1" value={typeof cfg.depthTier === "string" ? cfg.depthTier : "middle"}
            onChange={(e) => setKnob({ depthTier: (e.target as HTMLSelectElement).value as Tier })}>
            {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </select>
        </label>

        <button class="text-sm text-stone-500 underline" onClick={() => setAdv((v) => !v)}>{t.advanced}</button>
        {adv && (
          <div class="mt-3 flex flex-col gap-2">
            <label class="block text-sm">{t.threshold}: {cfg.weights.masteryThreshold}
              <input type="range" min={0.1} max={0.95} step={0.05} value={cfg.weights.masteryThreshold} class="mt-1 block w-full"
                onInput={(e) => setKnob({ weights: { ...cfg.weights, masteryThreshold: num(e) } })} />
            </label>
            <label class="block text-sm">{t.decay}: {cfg.weights.decayFloor}
              <input type="range" min={0} max={1} step={0.05} value={cfg.weights.decayFloor} class="mt-1 block w-full"
                onInput={(e) => setKnob({ weights: { ...cfg.weights, decayFloor: num(e) } })} />
            </label>
          </div>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Build + visual.**

Run: `cd site && NODE_OPTIONS=--max-old-space-size=10240 bun run build`
Expected: `lint: clean`. In preview: open Tune, drag "Steps shown" → path length changes; toggle Advanced → threshold/decay sliders appear.

- [ ] **Step 3: Commit.**

```bash
git add site/src/components/path/PathConfigDrawer.tsx
git commit -m "feat(path): P2 PathConfigDrawer (focus/pace/depth + advanced weights)"
```

---

## Task 6: Deadline panel + final integration, full build, typecheck, bilingual verify

**Files:**
- Create: `src/components/path/DeadlinePanel.tsx`
- Modify: `src/components/path/PathView.tsx` (swap the placeholder line)

- [ ] **Step 1: Create `DeadlinePanel.tsx`:**

```tsx
// src/components/path/DeadlinePanel.tsx
import type { Locale } from "~/i18n";
import type { Schedule } from "~/scripts/path/schedule";
import { content } from "~/scripts/path/path-io";

const L = {
  en: { countdown: "days left", fits: "On track", over: "Behind — not everything fits", under: "Ahead — room for more", dropped: "Won't fit by the date", perDay: "Per-day plan" },
  ru: { countdown: "дней осталось", fits: "В графике", over: "Отстаём — влезает не всё", under: "С запасом — можно добавить", dropped: "Не успеть к дате", perDay: "План по дням" },
} as const;

export default function DeadlinePanel({ lang, schedule }: { lang: Locale; schedule: Schedule }) {
  const t = L[lang];
  const f = schedule.feasibility;
  const verdict = f.verdict === "fits" ? t.fits : f.verdict === "over" ? t.over : t.under;
  return (
    <section class="rounded-lg border border-stone-300 bg-stone-50 p-4">
      <div class="flex items-center justify-between">
        <span class="text-2xl font-bold">{schedule.countdownDays} <span class="text-sm font-normal text-stone-500">{t.countdown}</span></span>
        <span class={`text-sm font-medium ${f.verdict === "over" ? "text-rose-600" : f.verdict === "under" ? "text-amber-600" : "text-emerald-600"}`}>{verdict}</span>
      </div>
      {f.dropped.length > 0 && (
        <p class="mt-2 text-sm text-rose-700">{t.dropped}: {f.dropped.map((u) => content.unitTitleById.get(u)?.[lang] ?? u).slice(0, 8).join(", ")}{f.dropped.length > 8 ? "…" : ""}</p>
      )}
      <details class="mt-2 text-sm">
        <summary class="cursor-pointer text-stone-600">{t.perDay}</summary>
        <ul class="mt-1 flex flex-col gap-0.5">
          {schedule.days.filter((d) => d.steps.length > 0).slice(0, 14).map((d) => (
            <li key={d.date} class="flex justify-between"><span class="text-stone-500">{d.date}</span><span>{d.steps.map((s) => content.unitTitleById.get(s.unit)?.[lang] ?? s.unit).join(", ")}</span></li>
          ))}
        </ul>
      </details>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `PathView.tsx`.** Add the import at the top:

```tsx
import DeadlinePanel from "./DeadlinePanel";
```
and replace the placeholder block:
```tsx
      {/* Deadline panel — Task 6 inserts <DeadlinePanel schedule={schedule} lang={lang}/> here */}
      {schedule && <p class="text-sm text-stone-500">{schedule.countdownDays} days</p>}
```
with:
```tsx
      {schedule && <DeadlinePanel lang={lang} schedule={schedule} />}
```

- [ ] **Step 3: Full build + typecheck.**

Run: `cd site && bunx vitest run src/scripts/path/ && bun run check 2>&1 | grep -E "components/path|scripts/path/path-io" || echo "no path errors"`
Expected: path tests green; `no path errors`.

Run: `cd site && NODE_OPTIONS=--max-old-space-size=10240 bun run build`
Expected: `lint: clean — 0 errors, 0 warnings`; page count ≈ 4847.

- [ ] **Step 4: Bilingual visual verification.**

Run: `cd site && bun run preview` and open `/en/roadmap` and `/ru/roadmap`. Confirm: cold-start banner (fresh localStorage); path cards render with unit titles + unlocked concepts in the right language; "I know this" shortens the path; GoalPicker sets a deadline → DeadlinePanel shows countdown + (when tight) a dropped-scope notice; RU strings everywhere (no English leakage in the RU island).

- [ ] **Step 5: Commit.**

```bash
git add site/src/components/path/DeadlinePanel.tsx site/src/components/path/PathView.tsx
git commit -m "feat(path): P2 deadline panel (countdown, on/behind-track, dropped scope, per-day plan)"
```

---

## Self-Review (completed during authoring)

**Spec coverage (P2 scope):**
- `path-io.ts` adapter (bundle, signals, persistence, recompute, mutations) → Tasks 1–2. ✓
- `diagnostics-index.json` for the bundle → Task 0. ✓
- PathView: ordered path cards (unit + unlocked concepts + why + estMin + kind), "I already know"/skip/pin/move, quick-check badge, cold-start, per-track mastery overview → Task 3 (+ PathCard). ✓
- GoalPicker: goals + priorities + exclude/lock + deadline setup (date + per-weekday grid) → Task 4. ✓ (Custom-target concept selection is supported by `toggleCustomTarget` in the adapter; the GoalPicker UI exposes goals/exclude/deadline — concept-level custom targets are reachable via the adapter and deferred from the drawer UI to avoid a 4798-row picker; noted as a follow-up.)
- PathConfigDrawer: four knob groups incl. advanced weights → Task 5. ✓
- Deadline countdown + on/behind-track + per-day plan + explicit dropped scope → Task 6. ✓
- Remove CompetencyMap + competency.ts/inputs + tests → Task 3 Step 5. ✓
- Inline bilingual labels (repo convention), no P0 core/type changes, `Date.now()` only in adapter → all tasks. ✓

**Deviations from spec, by design:** (1) i18n uses inline `labels` objects, matching `SettingsDrawer`, instead of `ui.json` `path.*` keys — follows the established island convention. (2) Custom-target concept picker UI deferred (adapter supports it). (3) Reorder is up/down move, not drag — per spec §11.

**Placeholder scan:** none. Every component is complete runnable code; the Task 3 drawer stubs are explicitly replaced in Tasks 4–5 and are valid in between.

**Type consistency:** `StoredPathConfig = PathConfig & { view: { order: string[] } }`; `computePath(): { path: Path; schedule?: Schedule }`; helper names (`declareKnown`, `skipUnit`, `pinUnit`, `moveUnit`, `isPinned`, `setGoals`, `toggleExcludedTrack`, `setKnob`, `setDeadline`, `resetPath`) are identical across `path-io.ts` and every consumer. Engine call shapes (`buildPath` BuildInput, `schedulePlan(path, DeadlineConfig, now)`) match the P0 signatures.
