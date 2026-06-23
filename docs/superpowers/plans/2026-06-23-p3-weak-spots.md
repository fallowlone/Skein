# P3 — Targeted-Weakness Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Surface the learner's real weak spots — units that teach goal-frontier concepts still below mastery AND carry failure evidence (practice struggle or SRS lapses) — ranked by remediation priority, in a "Weak spots" block on the planning page, so they drill exactly what they keep failing before fresh study.

**Architecture:** A new PURE module `src/scripts/path/weak-spots.ts` ranks units from existing per-unit signals. A thin `currentWeakSpots()` selector in `path-io.ts` assembles the live inputs (effective knowledge, goal frontier, struggle fractions, review health). `TodayFocus` renders a "Weak spots" section reusing the existing `startHref` lesson-link pattern. Empty result → nothing renders → the normal path drives (no remediation trap).

**Tech Stack:** TypeScript, Preact + signals, Astro 5, Vitest (`vitest run`), bun.

## Global Constraints

- Imports use the `~/` alias; never `..` segments.
- Hydration cap = 5 islands/page; add NO new island (the block lives inside the existing `TodayFocus` island).
- Reader-facing strings bilingual EN + RU on `lang`.
- Pure functions take no clock; `weak-spots.ts` receives all inputs (no `Date.now()` inside it — the selector in `path-io.ts` may call `Date.now()`).
- No `console.log`.
- GATE (from `/Users/artemmac/dev/awesome-everything/site`): `bun run test` MUST pass; `bun run check` must add NO NEW errors in touched files (repo has a ~39-error pre-existing `check` baseline — judge only touched files); for the `TodayFocus` task also `bun run lint:src` MUST pass. DO NOT run `bun run build` (full astro build OOMs locally).
- Commit after each task with the exact plan message. Branch `feat/adaptive-loop-activation` (continues P1+P2).

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/scripts/path/weak-spots.ts` | PURE ranking of weak units | Create |
| `src/scripts/path/weak-spots.test.ts` | unit tests | Create |
| `src/scripts/path/path-io.ts` | `currentWeakSpots()` selector | Modify |
| `src/components/path/planning/TodayFocus.tsx` | "Weak spots" block | Modify |

Verified anchors (do not re-derive): `unitStruggleFractions(attempts, lessonCounts): Map<unitId,{doneFrac,struggleFrac}>` `practice-signal.ts:16-49` (struggle = attempted-never-passed OR last fail); `readAttemptsAll(): Map<lessonKey, Record<taskId,AttemptRec>>` `path-io.ts:322-334`; `unitReviewHealth(cards, now): Map<unitId, healthFrac>` `path-io.ts:370-385` (healthFrac = healthy/reviewed; healthy = reps≥2 && !due && lapses===0); `allCards(): Card[]` `review-state.ts:89`; `teachesByUnit: Map<unitId, conceptId[]>` `path-io.ts:159`; `unitLessonCounts: Map<unitId, number>` `path-io.ts:243-245`; `content.unitTitleById: Map<unitId,{en,ru}>`; `masteryOf(state, c) = state.get(c)?.confidence ?? 0` `knowledge.ts:20-22`; `config.value.weights.masteryThreshold` `path-io.ts:478`; `effectiveKnowledge(): KnowledgeState` `path-io.ts:501-503`; `targetFrontier(goals, config, concepts): string[]` (in scope via `./planner`); `goalById`, `concepts` in path-io scope; selector style `currentPace()`/`currentFixes()` `path-io.ts:747-825` (guard `typeof window`, read signals, return plain data); TodayFocus link `startHref(lang, unitId): string|null` `TodayFocus.tsx:15-18` → `/${lang}/learn/${track}/${slug}/${firstLesson}`; do-now row markup `<li class="dn-row"><a class="dn-link" href><span class="dn-title"/><span class="dn-reason"/></a></li>` `TodayFocus.tsx:106-108`.

---

### Task 1: Pure `weak-spots.ts` — rank units by frontier-weakness × failure evidence

**Files:**
- Create: `src/scripts/path/weak-spots.ts`
- Test: `src/scripts/path/weak-spots.test.ts`

**Interfaces:**
- Consumes: `KnowledgeState` from `./types`.
- Produces:
  - `interface WeakSpot { unitId: string; score: number; struggleFrac: number; lapseFrac: number; weakConceptCount: number }`
  - `interface WeakSpotInputs { frontier: Set<string>; knowledge: KnowledgeState; masteryThreshold: number; teachesByUnit: Map<string, string[]>; struggleByUnit: Map<string, { struggleFrac: number; doneFrac: number }>; healthByUnit: Map<string, number> }`
  - `rankWeakSpots(inp: WeakSpotInputs, opts?: { topK?: number }): WeakSpot[]`

- [ ] **Step 1: Write the failing test**

Create `src/scripts/path/weak-spots.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { KnowledgeState } from "./types";
import { rankWeakSpots, type WeakSpotInputs } from "./weak-spots";

const K = (pairs: Record<string, number>): KnowledgeState =>
  new Map(Object.entries(pairs).map(([id, confidence]) => [id, { confidence, source: "activity" as const, lastAt: 0 }]));

const base = (over: Partial<WeakSpotInputs> = {}): WeakSpotInputs => ({
  frontier: new Set(["paxos", "mvcc"]),
  knowledge: K({ paxos: 0.2, mvcc: 0.2 }),
  masteryThreshold: 0.6,
  teachesByUnit: new Map([["distributed/01", ["paxos"]], ["databases/01", ["mvcc"]]]),
  struggleByUnit: new Map(),
  healthByUnit: new Map(),
  ...over,
});

describe("rankWeakSpots", () => {
  it("surfaces a unit teaching a below-mastery frontier concept WITH struggle evidence", () => {
    const r = rankWeakSpots(base({ struggleByUnit: new Map([["distributed/01", { struggleFrac: 0.5, doneFrac: 1 }]]) }));
    expect(r.map((w) => w.unitId)).toEqual(["distributed/01"]);
    expect(r[0].weakConceptCount).toBe(1);
    expect(r[0].score).toBeGreaterThan(0);
  });
  it("excludes a unit whose frontier concept is already mastered, even with struggle", () => {
    const r = rankWeakSpots(base({ knowledge: K({ paxos: 0.9, mvcc: 0.2 }), struggleByUnit: new Map([["distributed/01", { struggleFrac: 0.9, doneFrac: 1 }]]) }));
    expect(r.map((w) => w.unitId)).not.toContain("distributed/01");
  });
  it("excludes a unit teaching only off-frontier concepts", () => {
    const r = rankWeakSpots(base({ teachesByUnit: new Map([["react/01", ["hooks"]]]), struggleByUnit: new Map([["react/01", { struggleFrac: 0.9, doneFrac: 1 }]]) }));
    expect(r).toHaveLength(0);
  });
  it("excludes a below-mastery frontier unit with NO failure signal (just unlearned)", () => {
    const r = rankWeakSpots(base()); // no struggle, no lapses
    expect(r).toHaveLength(0);
  });
  it("counts SRS lapses (low health) as failure evidence", () => {
    const r = rankWeakSpots(base({ healthByUnit: new Map([["databases/01", 0.25]]) })); // lapseFrac 0.75
    expect(r.map((w) => w.unitId)).toEqual(["databases/01"]);
    expect(r[0].lapseFrac).toBeCloseTo(0.75);
  });
  it("ranks by struggle×weakCount desc and caps at topK", () => {
    const inp = base({
      frontier: new Set(["paxos", "mvcc", "raft"]),
      knowledge: K({ paxos: 0.1, mvcc: 0.1, raft: 0.1 }),
      teachesByUnit: new Map([["distributed/01", ["paxos", "raft"]], ["databases/01", ["mvcc"]]]),
      struggleByUnit: new Map([["distributed/01", { struggleFrac: 0.4, doneFrac: 1 }], ["databases/01", { struggleFrac: 0.9, doneFrac: 1 }]]),
    });
    const r = rankWeakSpots(inp, { topK: 1 });
    expect(r).toHaveLength(1);
    // distributed/01: 0.4 * 2 weak concepts = 0.8 ; databases/01: 0.9 * 1 = 0.9 → databases first
    expect(r[0].unitId).toBe("databases/01");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/weak-spots.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/scripts/path/weak-spots.ts`:

```ts
import type { KnowledgeState } from "./types";

export interface WeakSpot {
  unitId: string;
  score: number;
  struggleFrac: number;
  lapseFrac: number;        // 1 - reviewHealthFrac
  weakConceptCount: number; // goal-frontier concepts this unit teaches that are still below mastery
}

export interface WeakSpotInputs {
  frontier: Set<string>;
  knowledge: KnowledgeState;                 // effective (decayed) knowledge
  masteryThreshold: number;                  // a concept is "known" at/above this confidence
  teachesByUnit: Map<string, string[]>;      // unitId -> concept ids it teaches
  struggleByUnit: Map<string, { struggleFrac: number; doneFrac: number }>;
  healthByUnit: Map<string, number>;         // unitId -> review healthFrac (1 = all healthy)
}

/** Rank units that teach a below-mastery goal-frontier concept AND carry failure evidence
 *  (practice struggle or SRS lapses). Units with no failure signal are left to the normal path. */
export function rankWeakSpots(inp: WeakSpotInputs, opts: { topK?: number } = {}): WeakSpot[] {
  const topK = opts.topK ?? 3;
  const out: WeakSpot[] = [];
  // Consider every unit that has any failure signal.
  const candidateUnits = new Set<string>([...inp.struggleByUnit.keys(), ...inp.healthByUnit.keys()]);
  for (const unitId of candidateUnits) {
    const taught = inp.teachesByUnit.get(unitId) ?? [];
    const weakConcepts = taught.filter(
      (c) => inp.frontier.has(c) && (inp.knowledge.get(c)?.confidence ?? 0) < inp.masteryThreshold,
    );
    if (weakConcepts.length === 0) continue; // off-frontier or already mastered → not a frontier weakness
    const struggleFrac = inp.struggleByUnit.get(unitId)?.struggleFrac ?? 0;
    const lapseFrac = 1 - (inp.healthByUnit.get(unitId) ?? 1);
    if (struggleFrac <= 0 && lapseFrac <= 0) continue; // below mastery but no failure evidence → leave to path
    const score = (struggleFrac + lapseFrac) * weakConcepts.length;
    out.push({ unitId, score, struggleFrac, lapseFrac, weakConceptCount: weakConcepts.length });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, Math.max(0, topK));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/path/weak-spots.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything/site
git add src/scripts/path/weak-spots.ts src/scripts/path/weak-spots.test.ts
git commit -m "feat(path): weak-spots ranking — frontier weakness x failure evidence"
```

---

### Task 2: `currentWeakSpots()` selector in `path-io.ts`

**Files:**
- Modify: `src/scripts/path/path-io.ts`

**Interfaces:**
- Consumes: `rankWeakSpots`/`WeakSpot` (Task 1); in-scope `config`, `goalById`, `concepts`, `targetFrontier`, `effectiveKnowledge`, `unitStruggleFractions`, `readAttemptsAll`, `unitLessonCounts`, `unitReviewHealth`, `allCards`, `teachesByUnit`.
- Produces: `export function currentWeakSpots(): WeakSpot[]` — live ranked weak spots; SSR-safe (returns `[]` on server).

- [ ] **Step 1: Add the import**

Near the other `./` imports in `path-io.ts`:

```ts
import { rankWeakSpots, type WeakSpot } from "./weak-spots";
```

(Confirm `unitStruggleFractions`, `readAttemptsAll`, `unitReviewHealth`, `allCards`, `teachesByUnit`, `unitLessonCounts`, `goalById`, `concepts`, `targetFrontier`, `effectiveKnowledge` are already imported/declared in this module — they are, per the verified anchors. `Goal` too.)

- [ ] **Step 2: Add the selector**

Add near `currentPace`/`currentFixes` (after the existing selectors, ~`path-io.ts:825`):

```ts
/** Live weak-spots for the planning UI: units teaching below-mastery goal-frontier concepts
 *  that the learner keeps failing (practice struggle or SRS lapses), ranked by priority.
 *  Empty when there is no failure signal — the normal path then drives (no remediation trap). */
export function currentWeakSpots(): WeakSpot[] {
  if (typeof window === "undefined") return [];
  const cfg = config.value; // subscribe
  const goalObjs = cfg.goals.map((g) => goalById.get(g.id)).filter(Boolean) as Goal[];
  if (!goalObjs.length) {
    const fallback = goalById.get("senior-fullstack");
    if (fallback) goalObjs.push(fallback);
  }
  const frontier = new Set(targetFrontier(goalObjs, cfg, concepts));
  return rankWeakSpots({
    frontier,
    knowledge: effectiveKnowledge(), // subscribes to knowledge via decay(knowledge.value, …)
    masteryThreshold: cfg.weights.masteryThreshold,
    teachesByUnit,
    struggleByUnit: unitStruggleFractions(readAttemptsAll(), unitLessonCounts),
    healthByUnit: unitReviewHealth(allCards(), Date.now()),
  });
}
```

- [ ] **Step 3: Gate**

Run: `bun run test` then `bun run check`
Expected: PASS; no new type errors in `path-io.ts` (the selector's argument object matches `WeakSpotInputs`).

- [ ] **Step 4: Commit**

```bash
git add src/scripts/path/path-io.ts
git commit -m "feat(path): currentWeakSpots selector over struggle + lapse signals"
```

---

### Task 3: "Weak spots" block in `TodayFocus`

**Files:**
- Modify: `src/components/path/planning/TodayFocus.tsx`

**Interfaces:**
- Consumes: `currentWeakSpots()` (Task 2); the existing in-file `startHref(lang, unitId)` and `content.unitTitleById`.
- Produces: a bilingual "Weak spots" section rendered before the lead/next-task rows; each row links to the unit's first lesson. No new island.

- [ ] **Step 1: Add the import**

In `TodayFocus.tsx`, add `currentWeakSpots` to the existing `~/scripts/path/path-io` import (the one that already brings in `config`, `computePath`, `currentPace`, etc.).

- [ ] **Step 2: Build the weak-spot rows**

Inside the component, after the existing `leadRows` are built (near `TodayFocus.tsx:93`), add:

```tsx
const weakRows = currentWeakSpots()
  .map((w) => ({ key: w.unitId, href: startHref(lang, w.unitId), title: content.unitTitleById.get(w.unitId)?.[lang] ?? w.unitId }))
  .filter((r) => r.href) as { key: string; href: string; title: string }[];
```

- [ ] **Step 3: Render the section**

In the returned JSX, render a "Weak spots" section just before the lead/next-step rows (match the existing `dn-row`/`dn-link`/`dn-title`/`dn-reason` markup). Add the bilingual label inline:

```tsx
{weakRows.length > 0 && (
  <section class="dn-weak">
    <h4 class="dn-head">{lang === "ru" ? "Слабые места" : "Weak spots"}</h4>
    <ul class="dn-list">
      {weakRows.map((r) => (
        <li key={`w:${r.key}`} class="dn-row">
          <a class="dn-link" href={r.href}>
            <span class="dn-title">{r.title}</span>
            <span class="dn-reason">{lang === "ru" ? "тут стабильно ошибаешься" : "you keep missing this"}</span>
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

(If `TodayFocus` already wraps its rows in a specific list/section element, mirror that structure exactly so styling stays consistent. Do not introduce a new hydrated island.)

- [ ] **Step 4: Gate + dev-curl**

Run: `bun run lint:src` then `bun run check`
Expected: PASS; no new errors; no new island.

Run `bun run dev`, then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/en/roadmap
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/ru/roadmap
```
Expected: 200 each (the block renders only when there is failure signal; SSR has none, so it is hidden — confirm no render error).

- [ ] **Step 5: Commit**

```bash
git add src/components/path/planning/TodayFocus.tsx
git commit -m "feat(path): TodayFocus weak-spots remediation block"
```

---

## Final verification (after all tasks)

- [ ] `bun run test` — all green incl. `weak-spots.test.ts`.
- [ ] `bun run check` — no NEW errors in touched files.
- [ ] `bun run lint:src` — clean.
- [ ] Manual: with a few failed practice attempts on a frontier unit, the "Weak spots" block lists that unit and links to its first lesson; with no failures, the block is absent and the normal path shows.

## Self-Review notes (author)

- **Spec coverage:** weak-spots read-model over struggle + lapses → Task 1; live selector assembling existing signals → Task 2; remediate block with no-trap fallback → Task 3. The approved P3 unit is fully mapped.
- **Scope honesty:** difficulty-matching of the next task is DEFERRED (YAGNI — needs per-task difficulty data and a separate matching model); P3 delivers the weak-spot identification + remediation surface, which is the high-value core. Noted for a possible later refinement.
- **Type consistency:** `WeakSpot`/`WeakSpotInputs`/`rankWeakSpots` signatures identical across module, selector, and component.
