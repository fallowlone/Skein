# Path Engine P3-C — Roadmap UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a custom-target concept picker, native drag-and-drop path reordering, and a derived step-completion XP bonus that feeds the global level — on `/roadmap`, without touching P0 core.

**Architecture:** Three independent additive features. (1) Two pure helpers (`searchConcepts`, `reorderList`) + a `reorderPath` mutator in `path-io`, surfaced in `GoalPicker` (picker) and `PathCard`/`PathView` (native HTML5 DnD over `view.order`). (2) A pure `pathStepBonusXp` (a unit is "complete" when all its `teaches` concepts are known) added as an optional 4th arg to `xpFromState`. (3) A shared `currentXp()` assembler so `/profile` and the new `/roadmap` progress strip show the identical global number.

**Tech Stack:** TypeScript, Preact + @preact/signals, Vitest, Astro 5, `bun`. P0 core files untouched.

**Spec:** `docs/superpowers/specs/2026-06-06-path-engine-p3c-roadmap-ux-design.md`

**Conventions / gotchas (project memory `[[project_path-engine]]`):**
- P0 NOT modified: `graph.ts`, `types.ts`, `knowledge.ts`, `planner.ts`, `schedule.ts`, `config.ts`, `diagnostic-select.ts`.
- Islands use inline bilingual `L = { en, ru }` label objects (NOT ui.json). Reactivity = read `signal.value` in render (auto-subscribe), no `useComputed`.
- `bun run check` has ~19 PRE-EXISTING errors in unrelated files (content.config.ts etc.) — not ours; full `astro build` does not fail on them.
- Full `astro build` ~600s — run once at the end (Task 7), in background. During tasks use `bunx vitest run src/scripts/path/ src/scripts/progression/` + targeted `bun run check` grep.
- Vitest scans `src/**/*.test.{ts,tsx}`. `~` alias → `src/`.
- All work on branch `feat/path-engine-p3c-roadmap-ux` (already created off `main`).

**Key facts (verified in the codebase):**
- `isKnown(state: KnowledgeState, concept: string, threshold: number): boolean` — `src/scripts/path/knowledge.ts:21`.
- `xpFromState(state, drillsSolved, englishKnown = 0)` — `src/scripts/progression/xp.ts:6`; `levelFromXp(xp)` at line 22.
- path-io exports: `knowledge`, `config` signals; `content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, quickCheckUnits, unitTitleById, trackOrder, diagnostics, graph }` (line 106); `toggleCustomTarget`, `setGoals`, `setDeadline`, `toggleExcludedTrack`, `conceptExists`. `config.value.weights.masteryThreshold` is the "known" cutoff. `config.value.customTargets?: string[]`. `setCfg` is private; the existing `pinUnit`/`moveUnit` show the `setCfg({ view: { order } })` pattern.
- `applyViewOrder(steps, order)` emits ordered-first then the rest (path-io.ts:36).
- ProfilePanel computes `const xp = xpFromState(s, drillsSolved, englishKnownTotal());` (`src/components/progression/ProfilePanel.tsx:31`); `s = userState.value`; `drillsSolved` from `loadStore()`. Only ProfilePanel consumes `xpFromState` for display.

---

## File structure

| File | Responsibility | Task |
|------|----------------|------|
| `site/src/scripts/progression/path-xp.ts` | **new** — `PATH_STEP_BONUS`, `completedStepCount`, `pathStepBonusXp` (pure) | 1 |
| `site/src/scripts/progression/path-xp.test.ts` | **new** — tests | 1 |
| `site/src/scripts/progression/xp.ts` | optional `pathStepBonus` param | 2 |
| `site/src/scripts/progression/xp.test.ts` | bonus-param test | 2 |
| `site/src/scripts/path/path-io.ts` | `taughtConcepts` in `content`; pure `searchConcepts` + `reorderList`; `reorderPath` mutator | 3 |
| `site/src/scripts/path/path-io.test.ts` | tests for the two pure helpers | 3 |
| `site/src/components/path/GoalPicker.tsx` | custom-targets section (search + chips) | 4 |
| `site/src/components/path/PathCard.tsx` | `draggable` + drag props (keep ↑/↓) | 5 |
| `site/src/components/path/PathView.tsx` | DnD wiring (Task 5) + progress strip (Task 6) | 5,6 |
| `site/src/scripts/progression/current.ts` | **new** — shared `currentXp()` assembler | 6 |
| `site/src/components/progression/ProfilePanel.tsx` | adopt `currentXp()` | 6 |

P0 core is not in this list.

---

## Task 1: `path-xp.ts` — derived step-completion bonus

**Files:**
- Create: `site/src/scripts/progression/path-xp.ts`
- Test: `site/src/scripts/progression/path-xp.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/scripts/progression/path-xp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { completedStepCount, pathStepBonusXp, PATH_STEP_BONUS } from "./path-xp";
import type { KnowledgeState, UnitConcepts, ConceptMastery } from "~/scripts/path/types";

const known = (ids: string[]): KnowledgeState =>
  new Map(ids.map((id) => [id, { confidence: 1, source: "declared", lastAt: 0 } as ConceptMastery]));

const U = (unit: string, teaches: string[]): UnitConcepts =>
  ({ unit, track: "networking" as UnitConcepts["track"], teaches, requires: [], estMin: 10 });

const UNITS = [U("a/01", ["x", "y"]), U("a/02", ["z"]), U("a/03", [])];

describe("path-xp", () => {
  it("counts a unit whose every taught concept is known", () => {
    expect(completedStepCount(known(["x", "y"]), UNITS, 0.6)).toBe(1);
  });
  it("does not count a partially-known unit", () => {
    expect(completedStepCount(known(["x"]), UNITS, 0.6)).toBe(0);
  });
  it("never counts a unit that teaches nothing", () => {
    expect(completedStepCount(known(["x", "y", "z"]), UNITS, 0.6)).toBe(2); // a/01 + a/02, not a/03
  });
  it("respects the threshold", () => {
    const weak: KnowledgeState = new Map([["z", { confidence: 0.4, source: "activity", lastAt: 0 }]]);
    expect(completedStepCount(weak, [U("a/02", ["z"])], 0.6)).toBe(0);
    expect(completedStepCount(weak, [U("a/02", ["z"])], 0.3)).toBe(1);
  });
  it("pathStepBonusXp = count * PATH_STEP_BONUS", () => {
    expect(pathStepBonusXp(known(["x", "y", "z"]), UNITS, 0.6)).toBe(2 * PATH_STEP_BONUS);
    expect(PATH_STEP_BONUS).toBe(20);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/progression/path-xp.test.ts`
Expected: FAIL — cannot resolve `./path-xp`.

- [ ] **Step 3: Implement**

Create `site/src/scripts/progression/path-xp.ts`:

```ts
import type { KnowledgeState, UnitConcepts } from "~/scripts/path/types";
import { isKnown } from "~/scripts/path/knowledge";

export const PATH_STEP_BONUS = 20;

// A path step (unit) is "complete" when every concept it teaches is known at the threshold.
// Units that teach nothing never count. Pure — no I/O.
export function completedStepCount(knowledge: KnowledgeState, units: UnitConcepts[], threshold: number): number {
  let n = 0;
  for (const u of units) {
    if (!u.teaches.length) continue;
    if (u.teaches.every((c) => isKnown(knowledge, c, threshold))) n++;
  }
  return n;
}

export function pathStepBonusXp(knowledge: KnowledgeState, units: UnitConcepts[], threshold: number): number {
  return completedStepCount(knowledge, units, threshold) * PATH_STEP_BONUS;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/progression/path-xp.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Type-check**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run check 2>&1 | grep -E "path-xp" || echo "no new path-xp errors"`
Expected: `no new path-xp errors`.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/scripts/progression/path-xp.ts site/src/scripts/progression/path-xp.test.ts
git commit -m "feat(path): pathStepBonusXp — derived step-completion XP (concepts-known)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `xpFromState` optional bonus param

**Files:**
- Modify: `site/src/scripts/progression/xp.ts`
- Test: `site/src/scripts/progression/xp.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `site/src/scripts/progression/xp.test.ts` (the file already imports `xpFromState`; reuse its existing imports/fixtures style). Add:

```ts
describe("xpFromState path bonus param", () => {
  const base = { pretest: null, history: {}, retrieval: {}, progression: undefined } as any;
  it("adds the path bonus when provided", () => {
    expect(xpFromState(base, 0, 0, 40)).toBe(40);
  });
  it("defaults to 0 (omitted param leaves the total unchanged)", () => {
    expect(xpFromState(base, 0, 0)).toBe(xpFromState(base, 0, 0, 0));
    expect(xpFromState(base, 0, 0)).toBe(0);
  });
  it("ignores a negative bonus", () => {
    expect(xpFromState(base, 0, 0, -100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/progression/xp.test.ts`
Expected: FAIL — the `40` case returns `0` (4th arg ignored).

- [ ] **Step 3: Implement**

In `site/src/scripts/progression/xp.ts`, change the `xpFromState` signature and add the term. Replace:

```ts
export function xpFromState(
  state: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">,
  drillsSolved: number,
  englishKnown = 0,
): number {
  let xp = 0;
  if (state.pretest) xp += XP.pretest;
  if (state.pretest?.stage2) xp += XP.stage2;
  xp += Object.keys(state.history ?? {}).length * XP.lesson;
  xp += Object.keys(state.retrieval ?? {}).length * XP.retrieval;
  xp += Object.keys(state.progression?.achievements ?? {}).length * XP.achievement;
  xp += Math.max(0, drillsSolved) * XP.drill;
  xp += englishXp(englishKnown);
  return xp;
}
```

with:

```ts
export function xpFromState(
  state: Pick<UserState, "pretest" | "history" | "retrieval" | "progression">,
  drillsSolved: number,
  englishKnown = 0,
  pathStepBonus = 0,
): number {
  let xp = 0;
  if (state.pretest) xp += XP.pretest;
  if (state.pretest?.stage2) xp += XP.stage2;
  xp += Object.keys(state.history ?? {}).length * XP.lesson;
  xp += Object.keys(state.retrieval ?? {}).length * XP.retrieval;
  xp += Object.keys(state.progression?.achievements ?? {}).length * XP.achievement;
  xp += Math.max(0, drillsSolved) * XP.drill;
  xp += englishXp(englishKnown);
  xp += Math.max(0, pathStepBonus);
  return xp;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/progression/xp.test.ts`
Expected: PASS (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/scripts/progression/xp.ts site/src/scripts/progression/xp.test.ts
git commit -m "feat(path): xpFromState accepts optional path-step bonus (default 0)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: path-io pure helpers (`searchConcepts`, `reorderList`) + `reorderPath`

**Files:**
- Modify: `site/src/scripts/path/path-io.ts`
- Test: `site/src/scripts/path/path-io.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `site/src/scripts/path/path-io.test.ts`. Add `searchConcepts, reorderList` to the existing `from "./path-io"` import. Then append:

```ts
describe("searchConcepts", () => {
  const taught = new Set(["tcp-handshake", "indexing", "--junk"]);
  const concepts = [
    { id: "tcp-handshake", label: { en: "TCP handshake", ru: "TCP-рукопожатие" }, track: "networking", band: "middle", requires: [] },
    { id: "indexing", label: { en: "Indexing", ru: "Индексы" }, track: "databases", band: "middle", requires: [] },
    { id: "--junk", label: { en: " junk", ru: " junk" }, track: "x", band: "advanced", requires: [] },
    { id: "untaught", label: { en: "Untaught", ru: "—" }, track: "x", band: "middle", requires: [] },
  ] as any;

  it("matches on label and respects the taught + clean-label filter", () => {
    const r = searchConcepts(concepts, taught, "tcp", "en", 20);
    expect(r.map((c) => c.id)).toEqual(["tcp-handshake"]);
  });
  it("matches on id too", () => {
    expect(searchConcepts(concepts, taught, "indexing", "en").map((c) => c.id)).toEqual(["indexing"]);
  });
  it("excludes junk-id / leading-space-label and untaught concepts", () => {
    const r = searchConcepts(concepts, taught, "junk", "en");
    expect(r).toEqual([]);
    expect(searchConcepts(concepts, taught, "untaught", "en")).toEqual([]); // not taught
  });
  it("empty query returns []", () => {
    expect(searchConcepts(concepts, taught, "  ", "en")).toEqual([]);
  });
  it("caps the result count", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      ({ id: `c${i}`, label: { en: `match ${i}`, ru: `m ${i}` }, track: "x", band: "middle", requires: [] }));
    const t = new Set(many.map((c) => c.id));
    expect(searchConcepts(many as any, t, "match", "en", 20)).toHaveLength(20);
  });
});

describe("reorderList", () => {
  it("moves a unit before the drop target (down)", () => {
    expect(reorderList(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
  });
  it("moves a unit before the drop target (up)", () => {
    expect(reorderList(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });
  it("no-op when from === to", () => {
    expect(reorderList(["a", "b", "c"], "b", "b")).toEqual(["a", "b", "c"]);
  });
  it("returns the input unchanged when an id is missing", () => {
    expect(reorderList(["a", "b"], "z", "a")).toEqual(["a", "b"]);
    expect(reorderList(["a", "b"], "a", "z")).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/path/path-io.test.ts`
Expected: FAIL — `searchConcepts`/`reorderList` not exported.

- [ ] **Step 3: Implement the pure helpers + `taughtConcepts` + `reorderPath`**

Edit 1 — add the `taughtConcepts` set near the other `content` members (after line 96 `const teachesByUnit = ...`):

```ts
const taughtConcepts = new Set(units.flatMap((u) => u.teaches));
```

Edit 2 — add `taughtConcepts` to the exported `content` object (line 106). Change:

```ts
export const content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, quickCheckUnits, unitTitleById, trackOrder, diagnostics, graph };
```

to:

```ts
export const content = { concepts, units, goals, goalById, conceptById, diagnosedConcepts, quickCheckUnits, unitTitleById, trackOrder, diagnostics, graph, taughtConcepts };
```

Edit 3 — add the two pure helpers near the other pure helpers (e.g. right after `moveInOrder`, around line 55). `Concept` is already imported in this file:

```ts
// Searchable target picker: taught + clean-label concepts matching the query on label[lang] or id.
// "Clean" mirrors the keystone filter — drops long-tail junk ids/labels (e.g. "--cpu-prof", " foo").
export function searchConcepts(concepts: Concept[], taught: Set<string>, query: string, lang: "en" | "ru", limit = 20): Concept[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const clean = (c: Concept) =>
    taught.has(c.id) && /^[a-z0-9]/i.test(c.id) && c.label[lang] === c.label[lang].trim() && c.label[lang].length > 1;
  const out: Concept[] = [];
  for (const c of concepts) {
    if (!clean(c)) continue;
    if (c.label[lang].toLowerCase().includes(q) || c.id.toLowerCase().includes(q)) out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

// Move `from` to sit immediately before `to` in the full visible unit-id sequence.
// No-op if from === to or either id is absent.
export function reorderList(unitIds: string[], from: string, to: string): string[] {
  if (from === to || !unitIds.includes(from) || !unitIds.includes(to)) return unitIds;
  const arr = unitIds.filter((u) => u !== from);
  const ti = arr.indexOf(to);
  arr.splice(ti, 0, from);
  return arr;
}
```

Edit 4 — add the `reorderPath` mutator near the other view mutators (after `moveUnit`, around line 209). It writes the FULL reordered visible sequence into `view.order` via the same setter `pinUnit`/`moveUnit` use:

```ts
export function reorderPath(unitIds: string[], from: string, to: string): void { setCfg({ view: { order: reorderList(unitIds, from, to) } }); }
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/path/path-io.test.ts`
Expected: PASS (existing + new).

- [ ] **Step 5: Type-check**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run check 2>&1 | grep -E "path-io\.ts" || echo "no new path-io errors"`
Expected: `no new path-io errors`.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/scripts/path/path-io.ts site/src/scripts/path/path-io.test.ts
git commit -m "feat(path): searchConcepts + reorderList/reorderPath + content.taughtConcepts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Custom-target picker in `GoalPicker`

**Files:**
- Modify: `site/src/components/path/GoalPicker.tsx`

No new unit test (UI wiring over the Task-3 pure helper); verification is type-check + the Task 7 build/visual pass.

- [ ] **Step 1: Add the imports + state**

In `site/src/components/path/GoalPicker.tsx`:
- Add `useState` import: `import { useState } from "preact/hooks";`
- Extend the `from "~/scripts/path/path-io"` import to include `content, toggleCustomTarget, searchConcepts`.
- Add these keys to BOTH locales of the `L` object:
  - en: `targets: "Custom targets", search: "Search concepts to target…", remove: "remove"`
  - ru: `targets: "Свои цели", search: "Найти концепты для цели…", remove: "убрать"`

- [ ] **Step 2: Add the section markup**

Inside `GoalPicker`, after `const t = L[lang];` add:

```tsx
  const [q, setQ] = useState("");
  const custom = cfg.customTargets ?? [];
  const results = searchConcepts(content.concepts, content.taughtConcepts, q, lang, 20)
    .filter((c) => !custom.includes(c.id));
```

Then insert this block in the returned markup, right after the preset-goals `<ul>` (before the `{t.exclude}` heading):

```tsx
        <h3 class="font-semibold mb-2">{t.targets}</h3>
        <div class="flex flex-wrap gap-1 mb-2">
          {custom.map((id) => (
            <button key={id} class="rounded border border-sky-400 bg-sky-50 px-2 py-1 text-xs text-sky-800"
              onClick={() => toggleCustomTarget(id)} title={t.remove}>
              {content.conceptById.get(id)?.label[lang] ?? id} ✕
            </button>
          ))}
        </div>
        <input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder={t.search}
          class="mb-2 block w-full rounded border border-stone-300 px-2 py-1 text-sm" />
        {results.length > 0 && (
          <ul class="mb-6 max-h-48 overflow-y-auto rounded border border-stone-200">
            {results.map((c) => (
              <li key={c.id}>
                <button class="flex w-full items-center justify-between px-2 py-1 text-left text-sm hover:bg-stone-100"
                  onClick={() => { toggleCustomTarget(c.id); setQ(""); }}>
                  <span>{c.label[lang]}</span>
                  <span class="text-xs text-stone-400">{c.track}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run check 2>&1 | grep -E "GoalPicker" || echo "no new GoalPicker errors"`
Expected: `no new GoalPicker errors`.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/components/path/GoalPicker.tsx
git commit -m "feat(path): custom-target concept picker in GoalPicker (search + chips)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Native DnD reorder (`PathCard` + `PathView`)

**Files:**
- Modify: `site/src/components/path/PathCard.tsx`
- Modify: `site/src/components/path/PathView.tsx`

No new unit test (the reorder math is `reorderList`, tested in Task 3); verification is type-check + Task 7 visual.

- [ ] **Step 1: PathCard — make the card draggable**

In `site/src/components/path/PathCard.tsx`:
- Add `import { useState } from "preact/hooks";` at the top.
- Add three props to the `Props` type (after `onMove`): `onDragStart: () => void; onDrop: () => void;`
- Add them to the destructured params.
- Replace the root `<li ...>` opening tag:

```tsx
    <li class="rounded-lg border border-stone-300 bg-white/70 p-4 flex flex-col gap-2">
```

with a draggable version that highlights on drag-over:

```tsx
    <li
      draggable
      onDragStart={() => onDragStart()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(); }}
      class={`rounded-lg border bg-white/70 p-4 flex flex-col gap-2 ${over ? "border-sky-500 ring-2 ring-sky-200" : "border-stone-300"}`}
    >
```

- Add the local state at the top of the component body (after `const t = L[lang];`):

```tsx
  const [over, setOver] = useState(false);
```

(Keep the existing ↑/↓ buttons and `onMove` unchanged — they remain the accessibility fallback.)

- [ ] **Step 2: PathView — track the dragged unit and wire reorder**

In `site/src/components/path/PathView.tsx`:
- Add `reorderPath` to the `from "~/scripts/path/path-io"` import.
- Add drag state after the existing `useState` lines (near line 31):

```tsx
  const [dragUnit, setDragUnit] = useState<string | null>(null);
```

- Update the `<PathCard ... />` render to pass the two new props (add to the existing prop list):

```tsx
            onDragStart={() => setDragUnit(s.unit)}
            onDrop={() => {
              if (dragUnit && dragUnit !== s.unit) reorderPath(path.steps.map((x) => x.unit), dragUnit, s.unit);
              setDragUnit(null);
            }}
```

- [ ] **Step 3: Type-check**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run check 2>&1 | grep -E "PathCard|PathView" || echo "no new PathCard/PathView errors"`
Expected: `no new PathCard/PathView errors`.

- [ ] **Step 4: Run the path suite (no regressions)**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/path/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/components/path/PathCard.tsx site/src/components/path/PathView.tsx
git commit -m "feat(path): native drag-and-drop path reorder (keeps up/down fallback)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Step-XP — shared `currentXp()` + ProfilePanel adopt + roadmap progress strip

**Files:**
- Create: `site/src/scripts/progression/current.ts`
- Modify: `site/src/components/progression/ProfilePanel.tsx`
- Modify: `site/src/components/path/PathView.tsx`

- [ ] **Step 1: Create the shared assembler**

Create `site/src/scripts/progression/current.ts`:

```ts
// Canonical global XP: the single source both /profile and /roadmap read, so the displayed
// level is identical. Assembles user-state + drills + english + the derived path-step bonus.
import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { englishKnownTotal } from "~/english/state";
import { xpFromState } from "./xp";
import { pathStepBonusXp } from "./path-xp";
import { knowledge, content, config } from "~/scripts/path/path-io";

export function currentXp(): number {
  const drillsSolved = Object.values(loadStore()).filter((e: any) => e?.status === "solved").length;
  const bonus = pathStepBonusXp(knowledge.value, content.units, config.value.weights.masteryThreshold);
  return xpFromState(userState.value, drillsSolved, englishKnownTotal(), bonus);
}
```

- [ ] **Step 2: ProfilePanel adopts `currentXp()`**

In `site/src/components/progression/ProfilePanel.tsx`:
- Add `import { currentXp } from "~/scripts/progression/current";`
- Replace line 31:

```ts
  const xp = xpFromState(s, drillsSolved, englishKnownTotal());
```

with:

```ts
  const xp = currentXp();
```

(Leave the separate `drillsSolved`/`englishKnownTotal()` computations — they still feed `ctx`/achievements. The `xpFromState` import may now be unused; if `bun run check` flags it as unused, remove that import line.)

- [ ] **Step 3: Add the roadmap progress strip**

In `site/src/components/path/PathView.tsx`:
- Add imports:

```tsx
import { currentXp } from "~/scripts/progression/current";
import { levelFromXp } from "~/scripts/progression/xp";
import { completedStepCount, PATH_STEP_BONUS } from "~/scripts/progression/path-xp";
```

- Add these keys to BOTH locales of `L`:
  - en: `level: "Level", steps: "Steps completed", xp: "XP"`
  - ru: `level: "Уровень", steps: "Шагов пройдено", xp: "XP"`
- Compute after `const isColdStart = ...`:

```tsx
  const xp = currentXp();
  const lvl = levelFromXp(xp);
  const doneSteps = completedStepCount(k, content.units, cfg.weights.masteryThreshold);
```

- Insert the strip right after the `<header>` block (before the cold-start section):

```tsx
      <section class="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-stone-200 bg-white/60 px-4 py-2 text-sm">
        <span><span class="font-semibold">{t.level} {lvl.level}</span> · {xp} {t.xp}</span>
        <span class="text-stone-500">+{lvl.intoLevel} / {lvl.intoLevel + lvl.toNext}</span>
        <span class="ml-auto text-stone-600">{t.steps}: {doneSteps} <span class="text-emerald-600">(+{doneSteps * PATH_STEP_BONUS} {t.xp})</span></span>
      </section>
```

- [ ] **Step 4: Type-check**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run check 2>&1 | grep -E "current\.ts|ProfilePanel|PathView" || echo "no new errors"`
Expected: `no new errors`.

- [ ] **Step 5: Run the suites**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/path/ src/scripts/progression/`
Expected: PASS (including Task 1/2 tests; ProfilePanel/PathView are not unit-tested but must compile).

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/scripts/progression/current.ts site/src/components/progression/ProfilePanel.tsx site/src/components/path/PathView.tsx
git commit -m "feat(path): step-completion XP bonus in global level + roadmap progress strip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Final integration gate

**Files:** none (verification only).

- [ ] **Step 1: Full progression + path suites**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run src/scripts/path/ src/scripts/progression/`
Expected: all PASS.

- [ ] **Step 2: Full build (background, once)**

Run (background): `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: ~4849 pages, lint clean (`dist/lint-report.json` → 0 errors / 0 warnings).

- [ ] **Step 3: Visual check**

Open `/en/roadmap` (and `/ru/roadmap`): the progress strip shows level/XP/steps; cards drag-reorder with a drop highlight; `Goals & deadline` drawer has the custom-target search + chips. Open `/en/profile`: level reflects the same XP (including any path-step bonus). Confirm no console errors.

- [ ] **Step 4: Opus review of the whole diff**

Run a final opus review over `git diff main...HEAD` before requesting merge. Address findings; re-run Steps 1–2 if code changed.

- [ ] **Step 5: Stop — await owner**

Do NOT FF-merge or push. Report branch ready + evidence (test/build counts). Merge happens only on the owner's explicit command.

---

## Self-review notes

- **Spec coverage:** §3.1 picker → Task 3 (searchConcepts) + Task 4 (GoalPicker UI). §3.2 DnD → Task 3 (reorderList/reorderPath) + Task 5 (PathCard/PathView). §3.3 step XP → Task 1 (path-xp) + Task 2 (xp param) + Task 6 (current.ts + ProfilePanel + strip). §4 file list ↔ the File structure table. §5 testing → Tasks 1/2/3 unit tests + Task 7 build/visual. Decisions A (BONUS=20, Task 1), B (global level via currentXp, Task 6), C (full view.order, Task 3 reorderList + Task 5 wiring) all implemented.
- **Type consistency:** `pathStepBonusXp(knowledge, units, threshold)` and `completedStepCount(knowledge, units, threshold)` — same arg order in Task 1 def/tests, Task 6 `current.ts`/strip (note: no `concepts` param — `isKnown` works on ids). `currentXp()` zero-arg, used in ProfilePanel + PathView. `searchConcepts(concepts, taught, query, lang, limit?)` and `reorderList(unitIds, from, to)` consistent across Task 3 def/tests and Task 4/5 call sites. `reorderPath(unitIds, from, to)` matches the PathView call.
- **No placeholders:** every code/edit step shows full content; commands have expected output.
- **P0 untouched:** no task edits `graph.ts`/`planner.ts`/`knowledge.ts`/`types.ts`/etc. `knowledge.ts` is only *imported* (`isKnown`), not modified.
- **Note for executor:** Task 5 and Task 6 both edit `PathView.tsx`; run them in order (5 then 6) so the second subagent reads the post-Task-5 file.
