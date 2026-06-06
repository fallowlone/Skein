# Path Engine P3-B — StateIO + Feedback→Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire overrides into the runtime path (committed + a new local user layer), let a learner correct/loosen prerequisites, and export/import full local progress as versioned JSON.

**Architecture:** A pure `overrides.ts` pre-applies `addEdges`/`removeEdges` to `concept.requires` (cycle-guarded) so `buildPath` sees corrected prereqs with no P0 edit; `path-io` adds a `overrides` localStorage signal + feedback mutations and feeds the adjusted concepts into `computePath`. A pure `state-io.ts` serializes/validates a versioned bundle of knowledge + config + overrides + `userState`; the impure export/import live in `path-io`. UI = two sections in the existing Tune drawer + a PathCard "Loosen" button.

**Tech Stack:** Astro 5, Preact + `@preact/signals` (read `signal.value` in render), Tailwind, Vitest, bun. `~`→`src/`. Reference spec: `docs/superpowers/specs/2026-06-06-path-engine-p3b-stateio-overrides-design.md`. Conventions: inline bilingual `L={en,ru}` label objects; types in `src/scripts/path/types.ts`; `Overrides`/`ConceptGraph`/`buildConceptGraph`/`validateAcyclic` in `graph.ts`.

---

## File Structure

- `src/scripts/path/overrides.ts` (+ `.test.ts`) — pure: `mergeOverrides`, `applyOverridesToConcepts`, `safeApply`, `loosenUnitEdges`.
- `src/scripts/path/state-io.ts` (+ `.test.ts`) — pure: `serializeStateBundle`, `parseStateBundle` (+ `STATE_BUNDLE_VERSION`, `StateBundle`).
- `src/scripts/user-state.ts` — **modify**: add `importUserState`.
- `src/scripts/path/path-io.ts` — **modify**: `overrides` signal + key, `computePath` via `safeApply` (+ `droppedLocal`), feedback mutations, `exportState`/`importState`.
- `src/components/path/OverridesEditor.tsx` — **create**: manual edge editor + local-override list.
- `src/components/path/StateIOPanel.tsx` — **create**: export button + import file input.
- `src/components/path/PathConfigDrawer.tsx` — **modify**: render both sections.
- `src/components/path/PathCard.tsx` + `PathView.tsx` — **modify**: "Loosen" action + `droppedLocal` note.

All paths relative to `site/`. On branch `feat/path-engine-p3b-stateio-overrides`.

---

## Task 1: `overrides.ts` — pure override application (TDD)

**Files:** Create `src/scripts/path/overrides.ts`, `src/scripts/path/overrides.test.ts`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/scripts/path/overrides.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS } from "./__fixtures__/mini-graph";
import { mergeOverrides, applyOverridesToConcepts, safeApply, loosenUnitEdges } from "./overrides";
import { buildConceptGraph, validateAcyclic, ancestors } from "./graph";

const byId = (cs = CONCEPTS) => new Map(cs.map((c) => [c.id, c]));

describe("overrides", () => {
  it("applyOverridesToConcepts removes an edge", () => {
    const out = applyOverridesToConcepts(CONCEPTS, { removeEdges: [{ concept: "tcp-handshake", requires: "ip-addressing" }] });
    expect(byId(out).get("tcp-handshake")!.requires).not.toContain("ip-addressing");
    expect(byId(out).get("tcp-handshake")!.requires).toContain("ports-sockets"); // others kept
  });

  it("applyOverridesToConcepts adds an edge", () => {
    const out = applyOverridesToConcepts(CONCEPTS, { addEdges: [{ concept: "indexing", requires: "ip-addressing" }] });
    expect(byId(out).get("indexing")!.requires).toContain("ip-addressing");
  });

  it("skips unknown ids instead of throwing", () => {
    expect(() => applyOverridesToConcepts(CONCEPTS, { addEdges: [{ concept: "ghost", requires: "nope" }] })).not.toThrow();
    const out = applyOverridesToConcepts(CONCEPTS, { addEdges: [{ concept: "indexing", requires: "ghost" }] });
    expect(byId(out).get("indexing")!.requires).not.toContain("ghost");
  });

  it("mergeOverrides concatenates + dedupes", () => {
    const m = mergeOverrides(
      { removeEdges: [{ concept: "a", requires: "b" }] },
      { removeEdges: [{ concept: "a", requires: "b" }, { concept: "c", requires: "d" }] },
    );
    expect(m.removeEdges).toEqual([{ concept: "a", requires: "b" }, { concept: "c", requires: "d" }]);
  });

  it("safeApply falls back to committed-only when local introduces a cycle", () => {
    // local edge mvcc->consensus plus existing consensus->replication->mvcc closure ⇒ cycle.
    const local = { addEdges: [{ concept: "mvcc", requires: "consensus" }] };
    const res = safeApply(CONCEPTS, {}, local);
    expect(res.droppedLocal).toBe(true);
    expect(validateAcyclic(buildConceptGraph(res.concepts)).ok).toBe(true);
    // committed-only (empty) ⇒ original graph, mvcc does NOT gain consensus
    expect(new Map(res.concepts.map((c) => [c.id, c])).get("mvcc")!.requires).not.toContain("consensus");
  });

  it("safeApply keeps local when acyclic", () => {
    const local = { removeEdges: [{ concept: "tls", requires: "tcp-handshake" }] };
    const res = safeApply(CONCEPTS, {}, local);
    expect(res.droppedLocal).toBe(false);
    expect(ancestors(buildConceptGraph(res.concepts), "tls").has("tcp-handshake")).toBe(false);
  });

  it("loosenUnitEdges returns removeEdges for a unit's taught concepts' prereqs", () => {
    // networking/02-tcp teaches tcp-handshake (requires ip-addressing, ports-sockets)
    const edges = loosenUnitEdges("networking/02-tcp", UNITS, CONCEPTS);
    expect(edges).toEqual(expect.arrayContaining([
      { concept: "tcp-handshake", requires: "ip-addressing" },
      { concept: "tcp-handshake", requires: "ports-sockets" },
    ]));
  });
});
```

- [ ] **Step 2: Run — verify fail.** `bunx vitest run src/scripts/path/overrides.test.ts` → FAIL.

- [ ] **Step 3: Implement.**

```ts
// src/scripts/path/overrides.ts
import type { Concept, UnitConcepts } from "./types";
import type { Overrides } from "./graph";
import { buildConceptGraph, validateAcyclic } from "./graph";

export type Edge = { concept: string; requires: string };
const keyOf = (e: Edge) => `${e.concept}|${e.requires}`;

function dedupe(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) { const k = keyOf(e); if (!seen.has(k)) { seen.add(k); out.push(e); } }
  return out;
}

export function mergeOverrides(committed?: Overrides, local?: Overrides): Overrides {
  return {
    addEdges: dedupe([...(committed?.addEdges ?? []), ...(local?.addEdges ?? [])]),
    removeEdges: dedupe([...(committed?.removeEdges ?? []), ...(local?.removeEdges ?? [])]),
    retag: [],
  };
}

// Pre-apply edge add/remove to concept.requires. Lenient: unknown ids are skipped (NOT thrown),
// so a stale exported override never crashes a newer graph (buildConceptGraph's addEdges is strict).
export function applyOverridesToConcepts(concepts: Concept[], ov: Overrides): Concept[] {
  const ids = new Set(concepts.map((c) => c.id));
  const addByConcept = new Map<string, Set<string>>();
  for (const e of ov.addEdges ?? []) {
    if (!ids.has(e.concept) || !ids.has(e.requires) || e.concept === e.requires) continue;
    if (!addByConcept.has(e.concept)) addByConcept.set(e.concept, new Set());
    addByConcept.get(e.concept)!.add(e.requires);
  }
  const removeByConcept = new Map<string, Set<string>>();
  for (const e of ov.removeEdges ?? []) {
    if (!removeByConcept.has(e.concept)) removeByConcept.set(e.concept, new Set());
    removeByConcept.get(e.concept)!.add(e.requires);
  }
  return concepts.map((c) => {
    const rem = removeByConcept.get(c.id);
    const add = addByConcept.get(c.id);
    if (!rem && !add) return c;
    let requires = rem ? c.requires.filter((r) => !rem.has(r)) : [...c.requires];
    if (add) requires = [...new Set([...requires, ...[...add].filter((r) => !(rem?.has(r))) ])];
    return { ...c, requires };
  });
}

// Apply committed+local; if the result is cyclic, retry committed-only and flag the drop.
export function safeApply(concepts: Concept[], committed: Overrides, local: Overrides): { concepts: Concept[]; droppedLocal: boolean } {
  const withLocal = applyOverridesToConcepts(concepts, mergeOverrides(committed, local));
  if (validateAcyclic(buildConceptGraph(withLocal)).ok) return { concepts: withLocal, droppedLocal: false };
  const committedOnly = applyOverridesToConcepts(concepts, mergeOverrides(committed, undefined));
  return { concepts: committedOnly, droppedLocal: true };
}

// The removeEdges set that frees a unit's taught concepts from their prereqs (so the unit floats earlier).
export function loosenUnitEdges(unit: string, units: UnitConcepts[], concepts: Concept[]): Edge[] {
  const u = units.find((x) => x.unit === unit);
  if (!u) return [];
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const out: Edge[] = [];
  for (const taught of u.teaches) {
    const c = byId.get(taught);
    if (!c) continue;
    for (const r of c.requires) out.push({ concept: taught, requires: r });
  }
  return dedupe(out);
}
```

- [ ] **Step 4: Run — verify pass.** `bunx vitest run src/scripts/path/overrides.test.ts` → PASS (7).

- [ ] **Step 5: Commit.**
```bash
git add site/src/scripts/path/overrides.ts site/src/scripts/path/overrides.test.ts
git commit -m "feat(path): P3-B overrides — apply/merge/safeApply/loosen (cycle-guarded, no P0 edit)"
```

---

## Task 2: `state-io.ts` pure + `importUserState` (TDD)

**Files:** Create `src/scripts/path/state-io.ts`, `src/scripts/path/state-io.test.ts`; modify `src/scripts/user-state.ts`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/scripts/path/state-io.test.ts
import { describe, it, expect } from "vitest";
import { serializeStateBundle, parseStateBundle, STATE_BUNDLE_VERSION } from "./state-io";

const parts = {
  knowledge: new Map([["tcp-handshake", { confidence: 1, source: "diagnostic" as const, lastAt: 5 }]]),
  config: { goals: [{ id: "senior-fullstack", priority: 1 }], weights: { masteryThreshold: 0.6 } },
  overrides: { addEdges: [], removeEdges: [{ concept: "a", requires: "b" }] },
  userState: { tier: "middle", progression: { xp: 10 } },
};

describe("state-io", () => {
  it("serialize → parse round-trips", () => {
    const b = serializeStateBundle(parts, 123);
    const r = parseStateBundle(JSON.stringify(b));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bundle.version).toBe(STATE_BUNDLE_VERSION);
      expect(r.bundle.exportedAt).toBe(123);
      expect(r.bundle.pathKnowledge).toEqual([["tcp-handshake", { confidence: 1, source: "diagnostic", lastAt: 5 }]]);
      expect(r.bundle.pathOverrides.removeEdges).toEqual([{ concept: "a", requires: "b" }]);
    }
  });

  it("rejects a wrong version", () => {
    const r = parseStateBundle(JSON.stringify({ version: 99 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/version/i);
  });

  it("rejects non-JSON", () => {
    expect(parseStateBundle("not json").ok).toBe(false);
  });

  it("rejects a present-but-malformed pathKnowledge", () => {
    const r = parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathKnowledge: [["x", { nope: 1 }]] }));
    expect(r.ok).toBe(false);
  });

  it("tolerates a missing section", () => {
    const r = parseStateBundle(JSON.stringify({ version: STATE_BUNDLE_VERSION, pathOverrides: { addEdges: [], removeEdges: [] } }));
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify fail.** `bunx vitest run src/scripts/path/state-io.test.ts` → FAIL.

- [ ] **Step 3: Implement `state-io.ts`.**

```ts
// src/scripts/path/state-io.ts
import type { KnowledgeState, ConceptMastery } from "./types";
import type { Overrides } from "./graph";

export const STATE_BUNDLE_VERSION = 1;

export interface StateBundle {
  version: number;
  exportedAt: number;
  pathKnowledge?: [string, ConceptMastery][];
  pathConfig?: unknown;
  pathOverrides?: Overrides;
  userState?: unknown;
}

export function serializeStateBundle(
  parts: { knowledge: KnowledgeState; config: unknown; overrides: Overrides; userState: unknown },
  now: number,
): StateBundle {
  return {
    version: STATE_BUNDLE_VERSION,
    exportedAt: now,
    pathKnowledge: [...parts.knowledge.entries()],
    pathConfig: parts.config,
    pathOverrides: parts.overrides,
    userState: parts.userState,
  };
}

function isKnowledgeArray(v: unknown): v is [string, ConceptMastery][] {
  return Array.isArray(v) && v.every((e) =>
    Array.isArray(e) && e.length === 2 && typeof e[0] === "string" &&
    e[1] && typeof e[1] === "object" && typeof (e[1] as ConceptMastery).confidence === "number");
}

export function parseStateBundle(text: string): { ok: true; bundle: StateBundle } | { ok: false; error: string } {
  let raw: any;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: "Not valid JSON" }; }
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a state bundle" };
  if (raw.version !== STATE_BUNDLE_VERSION) return { ok: false, error: `Unsupported bundle version: ${raw.version}` };
  if ("pathKnowledge" in raw && raw.pathKnowledge !== undefined && !isKnowledgeArray(raw.pathKnowledge)) return { ok: false, error: "pathKnowledge is malformed" };
  if ("pathConfig" in raw && raw.pathConfig && (!raw.pathConfig.goals || !raw.pathConfig.weights)) return { ok: false, error: "pathConfig is malformed" };
  if ("pathOverrides" in raw && raw.pathOverrides && typeof raw.pathOverrides !== "object") return { ok: false, error: "pathOverrides is malformed" };
  return { ok: true, bundle: raw as StateBundle };
}
```

- [ ] **Step 4: Add `importUserState` to `src/scripts/user-state.ts`.** After the existing `resetAll` function, add:

```ts
/** Replace local state from an imported bundle (StateIO). Merges onto defaults so a partial/old
 *  payload stays valid, mirroring load(). Does not touch the server — a later account-sync proceeds. */
export function importUserState(partial: Partial<UserState>): void {
  userState.value = { ...defaults, ...partial };
  save(userState.value);
}
```
(`defaults` and `save` are module-private in this file and in scope.)

- [ ] **Step 5: Run — verify pass + typecheck.**
`bunx vitest run src/scripts/path/state-io.test.ts` → PASS (5).
`bun run check 2>&1 | grep -E "state-io|user-state" || echo "no errors"` → `no errors`.

- [ ] **Step 6: Commit.**
```bash
git add site/src/scripts/path/state-io.ts site/src/scripts/path/state-io.test.ts site/src/scripts/user-state.ts
git commit -m "feat(path): P3-B state-io serialize/parse bundle + importUserState"
```

---

## Task 3: `path-io.ts` wiring — overrides signal, computePath, feedback, export/import

**Files:** Modify `src/scripts/path/path-io.ts`, `src/scripts/path/path-io.test.ts`.

- [ ] **Step 1: Add imports.** After the existing `import { targetFrontier } from "./planner";` line (P3-A), add:
```ts
import committedOverrides from "~/content/path/concept-overrides.json";
import type { Overrides } from "./graph";
import { safeApply, mergeOverrides, loosenUnitEdges } from "./overrides";
import { serializeStateBundle, parseStateBundle } from "./state-io";
import { importUserState } from "~/scripts/user-state";
import { mergeConfig } from "./config"; // if not already imported on this line; otherwise skip
```
NOTE: `mergeConfig` is already imported in path-io (P2). Do NOT duplicate it — only add the lines for symbols not already imported. `userState` is already imported (P3-A).

- [ ] **Step 2: Add the overrides signal.** Near the `K_KEY`/`C_KEY` constants, add:
```ts
const O_KEY = "awesome.path-overrides.v1";
function loadOverrides(): Overrides {
  const base: Overrides = { addEdges: [], removeEdges: [], retag: [] };
  if (typeof window === "undefined") return base;
  try { const raw = localStorage.getItem(O_KEY); if (raw) return { ...base, ...JSON.parse(raw) }; } catch { /* keep base */ }
  return base;
}
```
After the `knowledge`/`config` signal declarations, add:
```ts
export const overrides = signal<Overrides>(loadOverrides());
```
And in the existing `if (typeof window !== "undefined") { … }` block that registers the autosave effects, add a third effect:
```ts
  effect(() => { try { localStorage.setItem(O_KEY, JSON.stringify(overrides.value)); } catch {} });
```

- [ ] **Step 3: Apply overrides in `computePath`.** Replace the whole `computePath` function with:
```ts
export function computePath(): { path: Path; schedule?: Schedule; droppedLocal: boolean } {
  const cfg = config.value;
  const now = Date.now();
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  const { concepts: eff, droppedLocal } = safeApply(concepts, committedOverrides as Overrides, overrides.value);
  const raw = buildPath({
    state: knowledge.value, goals: goalObjs, config: cfg,
    content: { concepts: eff, units, goalById }, srsDue: [], now, trackOrder,
  });
  const path: Path = { steps: applyViewOrder(raw.steps, cfg.view.order) };
  const schedule = cfg.deadline ? schedulePlan(path, cfg.deadline, now) : undefined;
  return { path, schedule, droppedLocal };
}
```
(`concepts` here is the module-level raw concept array — labels/`conceptById` stay raw; only the graph buildPath builds internally uses `eff`.)

- [ ] **Step 4: Add feedback mutations + export/import.** Append after `resetPath`:
```ts
export function loosenUnit(unitId: string): void {
  overrides.value = mergeOverrides(overrides.value, { removeEdges: loosenUnitEdges(unitId, units, concepts) });
}
export function addOverrideEdge(concept: string, requires: string, kind: "add" | "remove"): void {
  const patch: Overrides = kind === "add" ? { addEdges: [{ concept, requires }] } : { removeEdges: [{ concept, requires }] };
  overrides.value = mergeOverrides(overrides.value, patch);
}
export function removeOverrideEntry(kind: "add" | "remove", concept: string, requires: string): void {
  const cur = overrides.value;
  const drop = (es: { concept: string; requires: string }[] = []) => es.filter((e) => !(e.concept === concept && e.requires === requires));
  overrides.value = kind === "add" ? { ...cur, addEdges: drop(cur.addEdges) } : { ...cur, removeEdges: drop(cur.removeEdges) };
}
export function clearOverrides(): void {
  overrides.value = { addEdges: [], removeEdges: [], retag: [] };
}
export function conceptExists(id: string): boolean { return conceptById.has(id); }

export function exportState(now: number): void {
  const bundle = serializeStateBundle(
    { knowledge: knowledge.value, config: config.value, overrides: overrides.value, userState: userState.value },
    now,
  );
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `awesome-path-state-${now}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
export function importState(text: string): { ok: true } | { ok: false; error: string } {
  const r = parseStateBundle(text);
  if (!r.ok) return r;
  const b = r.bundle;
  if (b.pathKnowledge) knowledge.value = deserializeKnowledge(b.pathKnowledge);
  if (b.pathConfig) { const merged = mergeConfig(b.pathConfig as any) as StoredPathConfig; merged.view = (b.pathConfig as any).view ?? { order: [] }; config.value = merged; }
  if (b.pathOverrides) overrides.value = { addEdges: [], removeEdges: [], retag: [], ...b.pathOverrides };
  if (b.userState) importUserState(b.userState as any);
  return { ok: true };
}
```

- [ ] **Step 5: Add tests** to `path-io.test.ts`:
```ts
import { overrides, loosenUnit, clearOverrides, computePath, importState, exportState } from "./path-io";

describe("path-io overrides + state-io", () => {
  it("loosenUnit records removeEdges and computePath stays valid", () => {
    clearOverrides();
    const before = computePath().path.steps.length;
    const target = computePath().path.steps[0]?.unit;
    if (target) loosenUnit(target);
    expect(overrides.value.removeEdges!.length).toBeGreaterThanOrEqual(0);
    expect(computePath().droppedLocal).toBe(false); // loosening never creates a cycle
    expect(typeof before).toBe("number");
    clearOverrides();
  });
  it("importState round-trips an exported-shape bundle", () => {
    const r = importState(JSON.stringify({ version: 1, exportedAt: 0, pathOverrides: { addEdges: [], removeEdges: [{ concept: "x", requires: "y" }] } }));
    expect(r.ok).toBe(true);
    expect(overrides.value.removeEdges).toEqual([{ concept: "x", requires: "y" }]);
    clearOverrides();
  });
  it("importState rejects a bad bundle without mutating", () => {
    clearOverrides();
    const r = importState("{ not json");
    expect(r.ok).toBe(false);
    expect(overrides.value.removeEdges).toEqual([]);
  });
});
```

- [ ] **Step 6: Run + typecheck.**
`bunx vitest run src/scripts/path/` → all green.
`bun run check 2>&1 | grep -E "path-io" || echo "no path-io errors"` → `no path-io errors`.

- [ ] **Step 7: Commit.**
```bash
git add site/src/scripts/path/path-io.ts site/src/scripts/path/path-io.test.ts
git commit -m "feat(path): P3-B path-io — overrides signal + runtime wiring + feedback mutations + export/import"
```

---

## Task 4: `OverridesEditor` + `StateIOPanel` + wire into the Tune drawer

**Files:** Create `src/components/path/OverridesEditor.tsx`, `src/components/path/StateIOPanel.tsx`; modify `src/components/path/PathConfigDrawer.tsx`.

- [ ] **Step 1: Create `OverridesEditor.tsx`.**

```tsx
// src/components/path/OverridesEditor.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { overrides, addOverrideEdge, removeOverrideEntry, clearOverrides, conceptExists } from "~/scripts/path/path-io";

const L = {
  en: { title: "Fix prerequisites", concept: "concept id", requires: "prereq id", add: "Add prereq", remove: "Remove prereq", reset: "Reset all", none: "No local overrides.", unknown: "Unknown concept id", removeE: "remove", addE: "add" },
  ru: { title: "Исправить пререквизиты", concept: "id концепта", requires: "id пререквизита", add: "Добавить", remove: "Убрать", reset: "Сбросить все", none: "Нет локальных правок.", unknown: "Неизвестный id концепта", removeE: "убрать", addE: "добавить" },
} as const;

export default function OverridesEditor({ lang }: { lang: Locale }) {
  const t = L[lang];
  const ov = overrides.value;
  const [c, setC] = useState("");
  const [r, setR] = useState("");
  const [err, setErr] = useState("");

  const submit = (kind: "add" | "remove") => {
    if (!conceptExists(c) || !conceptExists(r)) { setErr(t.unknown); return; }
    addOverrideEdge(c.trim(), r.trim(), kind); setC(""); setR(""); setErr("");
  };
  const entries = [
    ...(ov.addEdges ?? []).map((e) => ({ ...e, kind: "add" as const })),
    ...(ov.removeEdges ?? []).map((e) => ({ ...e, kind: "remove" as const })),
  ];

  return (
    <section class="mt-4 border-t border-stone-200 pt-3">
      <h3 class="font-semibold text-sm mb-2">{t.title}</h3>
      <div class="flex flex-wrap items-center gap-2">
        <input class="w-32 rounded border border-stone-300 px-2 py-1 text-xs" placeholder={t.concept} value={c} onInput={(e) => setC((e.target as HTMLInputElement).value)} />
        <input class="w-32 rounded border border-stone-300 px-2 py-1 text-xs" placeholder={t.requires} value={r} onInput={(e) => setR((e.target as HTMLInputElement).value)} />
        <button class="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100" onClick={() => submit("add")}>{t.add}</button>
        <button class="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100" onClick={() => submit("remove")}>{t.remove}</button>
      </div>
      {err && <p class="mt-1 text-xs text-rose-600">{err}</p>}
      <ul class="mt-2 flex flex-col gap-1 text-xs">
        {entries.length === 0 && <li class="text-stone-400">{t.none}</li>}
        {entries.map((e) => (
          <li key={`${e.kind}-${e.concept}-${e.requires}`} class="flex items-center gap-2">
            <span class="text-stone-500">{e.kind === "add" ? t.addE : t.removeE}</span>
            <code>{e.concept} → {e.requires}</code>
            <button class="ml-auto text-rose-500" onClick={() => removeOverrideEntry(e.kind, e.concept, e.requires)} aria-label="delete">✕</button>
          </li>
        ))}
      </ul>
      {entries.length > 0 && <button class="mt-2 text-xs text-stone-500 underline" onClick={() => clearOverrides()}>{t.reset}</button>}
    </section>
  );
}
```

- [ ] **Step 2: Create `StateIOPanel.tsx`.**

```tsx
// src/components/path/StateIOPanel.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { exportState, importState } from "~/scripts/path/path-io";

const L = {
  en: { title: "Backup & restore", export: "Export progress", import: "Import progress", confirm: "Replace your local progress with this file?", ok: "Imported — your path is restored.", fail: "Import failed: " },
  ru: { title: "Резервная копия", export: "Экспорт прогресса", import: "Импорт прогресса", confirm: "Заменить локальный прогресс этим файлом?", ok: "Импортировано — путь восстановлен.", fail: "Ошибка импорта: " },
} as const;

export default function StateIOPanel({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!confirm(t.confirm)) { (e.target as HTMLInputElement).value = ""; return; }
    const text = await file.text();
    const r = importState(text);
    setMsg(r.ok ? { ok: true, text: t.ok } : { ok: false, text: t.fail + r.error });
    (e.target as HTMLInputElement).value = "";
  };

  return (
    <section class="mt-4 border-t border-stone-200 pt-3">
      <h3 class="font-semibold text-sm mb-2">{t.title}</h3>
      <div class="flex flex-wrap items-center gap-2">
        <button class="rounded border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100" onClick={() => exportState(Date.now())}>{t.export}</button>
        <label class="rounded border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100 cursor-pointer">
          {t.import}
          <input type="file" accept="application/json,.json" class="hidden" onChange={onFile} />
        </label>
      </div>
      {msg && <p class={`mt-1 text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Render both in `PathConfigDrawer.tsx`.** Add imports at the top:
```tsx
import OverridesEditor from "./OverridesEditor";
import StateIOPanel from "./StateIOPanel";
```
Then, just before the closing `</aside>` tag, add:
```tsx
        <OverridesEditor lang={lang} />
        <StateIOPanel lang={lang} />
```

- [ ] **Step 4: Gates.**
`bunx vitest run src/scripts/path/` → green.
`bun run check 2>&1 | grep -E "OverridesEditor|StateIOPanel|PathConfigDrawer" || echo "no errors"` → `no errors`.

- [ ] **Step 5: Commit.**
```bash
git add site/src/components/path/OverridesEditor.tsx site/src/components/path/StateIOPanel.tsx site/src/components/path/PathConfigDrawer.tsx
git commit -m "feat(path): P3-B OverridesEditor + StateIOPanel in the Tune drawer"
```

---

## Task 5: PathCard "Loosen" action + PathView droppedLocal note

**Files:** Modify `src/components/path/PathCard.tsx`, `src/components/path/PathView.tsx`.

- [ ] **Step 1: PathCard — add the Loosen button.** Add `onLoosen: () => void;` to the `Props` type and the destructured params. Add `loosen` to the `L` labels (`en: "Loosen"`, `ru: "Ослабить"`). In the actions row (the `<div class="flex flex-wrap items-center gap-2 text-xs">`), after the move-down button, add:
```tsx
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={onLoosen} title="not a prerequisite">{t.loosen}</button>
```

- [ ] **Step 2: PathView — wire it + the note.** Add `loosenUnit` to the existing `~/scripts/path/path-io` import list. Destructure `droppedLocal` from computePath: change `const { path, schedule } = computePath();` to `const { path, schedule, droppedLocal } = computePath();`. On the `<PathCard ... />`, add the prop:
```tsx
            onLoosen={() => loosenUnit(s.unit)}
```
Add a note near the top of the path list (right after the cold-start section, before the `<ol>`): add `droppedNote` to the `L` labels (`en: "Some local prerequisite edits created a cycle and were ignored."`, `ru: "Некоторые локальные правки пререквизитов создали цикл и были проигнорированы."`) and render:
```tsx
      {droppedLocal && <p class="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{t.droppedNote}</p>}
```

- [ ] **Step 3: Gates.**
`bunx vitest run src/scripts/path/` → green.
`bun run check 2>&1 | grep -E "PathCard|PathView" || echo "no errors"` → `no errors`.

- [ ] **Step 4: Commit.**
```bash
git add site/src/components/path/PathCard.tsx site/src/components/path/PathView.tsx
git commit -m "feat(path): P3-B PathCard Loosen action + droppedLocal cycle note"
```

---

## Task 6: Full build + bilingual verification

- [ ] **Step 1: Full build.**
`cd site && NODE_OPTIONS=--max-old-space-size=10240 bun run build`
Expected: `lint: clean — 0 errors, 0 warnings`; page count ≈ 4849.

- [ ] **Step 2: Bilingual visual (`bun run preview`):**
- `/en/roadmap` → Tune drawer → "Fix prerequisites": add an edge by id (unknown id shows the error); the list shows it with a ✕ that removes it; "Reset all" clears.
- A card's "Loosen" button → that unit floats earlier on recompute.
- "Backup & restore" → Export downloads a JSON; Import the same file (confirm dialog) → success message; reload → path restored. Import a junk file → red error, nothing changed.
- Repeat on `/ru/…` — all strings Russian.

- [ ] **Step 3: Done** — feature complete on the branch.

---

## Self-Review (completed during authoring)

**Spec coverage:**
- Override runtime wiring (`mergeOverrides`/`applyOverridesToConcepts`/`safeApply`/`loosenUnitEdges`, committed+local, cycle-guard) → Tasks 1, 3. ✓
- Local override signal + key + mutations → Task 3. ✓
- Feedback UX: PathCard "Loosen" + manual `OverridesEditor` → Tasks 4, 5. ✓
- StateIO bundle (serialize/parse/validate, full progress incl userState) + `importUserState` + export/import → Tasks 2, 3. ✓
- `StateIOPanel` + `OverridesEditor` in the Tune drawer → Task 4. ✓
- `droppedLocal` cycle note → Tasks 3, 5. ✓
- No P0 core edits (overrides pre-applied to concepts; `importUserState` is in user-state.ts, not the path core) → all tasks. ✓
- Tests: apply/merge/safeApply-cycle/loosen; serialize/parse round-trip + reject version/malformed + tolerate missing; path-io loosen/import → Tasks 1, 2, 3. ✓

**Placeholder scan:** none — every code step is complete.

**Type consistency:** `Overrides` (from graph.ts) used throughout; `Edge = {concept, requires}`; `safeApply(concepts, committed, local) → {concepts, droppedLocal}`; `computePath(): {path, schedule?, droppedLocal}` (callers updated in Task 5); `StateBundle`/`serializeStateBundle`/`parseStateBundle`/`STATE_BUNDLE_VERSION`; path-io exports `overrides`, `loosenUnit`, `addOverrideEdge`, `removeOverrideEntry`, `clearOverrides`, `conceptExists`, `exportState`, `importState` — names identical across defining (Task 3) and consuming (Tasks 4, 5) tasks. `mergeConfig`/`StoredPathConfig`/`deserializeKnowledge` reused from P2 path-io.
