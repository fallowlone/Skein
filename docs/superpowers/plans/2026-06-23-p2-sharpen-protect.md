# P2 — Sharpen + Protect the Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Sharpen what the P1 living-rank aims at (a focused `senior-fullstack` frontier instead of "every middle+ concept in every track"), and protect the solo learner's model during the sprint (streak grace + full localStorage export/import).

**Architecture:** Three independent units. Unit 1 is a `goals.json` rule swap reusing the already-tested `track-band>=middle` resolver. Unit 2 adds an optional consumable `freezes` field to the pure `streak.ts`. Unit 3 adds a pure `model-backup.ts` (serialize/restore an app localStorage snapshot) wired into the existing `SettingsDrawer` island (no new island).

**Tech Stack:** TypeScript, Preact + signals, Astro 5, Vitest (`vitest run`), bun.

**Design note (scope correction from approved design):** the approved design framed Unit 1 as "graph-derived hub selection." Verifying the code showed `senior-fullstack` uses `target.rule = "band>=middle"`, whose resolver branch matches concepts in **all** tracks (not the goal's tracks). The high-leverage, low-risk fix is therefore to scope the frontier to the goal's senior-defining tracks via the existing `track-band>=middle` rule — no new graph computation. Graph out-degree hub-ranking is dropped (YAGNI); it can return as a later refinement if the scoped frontier proves too broad.

## Global Constraints

- Imports use the `~/` alias; never `..` segments.
- Hydration cap = 5 islands per page; add NO new island (Unit 3 extends the existing `SettingsDrawer`).
- Reader-facing strings bilingual EN + RU on `lang`.
- Pure functions take no clock; tests pass explicit values. `streak.ts` already isolates the clock in `todayISO(d = new Date())` — keep that; tests pass `today` explicitly.
- No `console.log` in committed code.
- GATE (from `/Users/artemmac/dev/awesome-everything/site`): `bun run test` MUST pass; `bun run check` MUST not add NEW errors in touched files (the repo has a ~39-error pre-existing `check` baseline — judge only touched files); for the component task also `bun run lint:src` MUST pass. DO NOT run `bun run build` (its full astro build OOMs locally).
- Commit after each task. Branch `feat/adaptive-loop-activation` (continue the P1 branch).

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/content/path/goals.json` | goal frontier defs | Modify — `senior-fullstack` rule + weights |
| `src/scripts/path/goal-resolve.test.ts` | resolver tests | Create/append — assert the scoped frontier |
| `src/scripts/progression/streak.ts` | streak logic | Modify — add consumable `freezes` grace |
| `src/scripts/progression/streak.test.ts` | streak tests | Create/append |
| `src/scripts/user-state.ts` | progression init + recordActiveDay | Modify — init `freezes: 0`; optional toast on grace |
| `src/scripts/model-backup.ts` | pure snapshot/restore of app localStorage | Create |
| `src/scripts/model-backup.test.ts` | backup tests | Create |
| `src/components/pedagogy/SettingsDrawer.tsx` | settings island | Modify — Export/Import buttons |

Verified anchors: `resolveGoalTargets` `goal-resolve.ts:11-51` (branches: `track-band>=`, `track-band=lo..hi`, `band>=`; "core track" = `trackWeights` entry with weight ≥ 1); `BAND_RANK` `goal-resolve.ts:9` = `{foundations:0, surface:1, middle:2, advanced:3}`; `Concept = {id,label,track,band,requires:string[]}` `types.ts:7-13`; senior-defining tracks present = `distributed, databases, system-design, backend, security, observability, performance` (+ `networking, frontend` as breadth); `streak.ts` full file (`Streak {lastActiveDay,count,best}`, `updateStreak`, `todayISO`, `daysBetween`); `recordActiveDay` `user-state.ts:169-181`; progression streak init `user-state.ts:41` = `{lastActiveDay:"",count:0,best:0}`; app localStorage keys all prefixed `awesome.` or `atlas.` (`awesome.user-state.v1`, `awesome.path-knowledge.v1`, `awesome.path-config.v1`, `awesome.path-overrides.v1`, `awesome.theme`, `awesome.density`, `awesome.drill.v1`, `awesome.capstone.*`, `awesome.metrics.id`, `atlas.practice.*`, `atlas.practice-attempts.*`, `atlas.review.v1`); `SettingsDrawer.tsx` is a Preact island (theme toggle :67, density :76) — extend it, do not add an island.

---

### Task 1: Scope the `senior-fullstack` frontier to its senior-defining tracks

**Files:**
- Modify: `src/content/path/goals.json` (the `senior-fullstack` entry)
- Create/append: `src/scripts/path/goal-resolve.test.ts`

**Interfaces:**
- Consumes: existing `resolveGoalTargets(goal, concepts)` `track-band>=` branch.
- Produces: `senior-fullstack.target.rule = "track-band>=middle"` and core (weight 1) tracks = `distributed, databases, system-design, backend, security, observability, performance`.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/path/goal-resolve.test.ts` (append the block if the file exists):

```ts
import { describe, it, expect } from "vitest";
import { resolveGoalTargets } from "./goal-resolve";
import type { Concept, Goal } from "./types";

const C = (id: string, track: string, band: string): Concept =>
  ({ id, label: { en: id, ru: id }, track: track as any, band: band as any, requires: [] });

const seniorGoal: Goal = {
  id: "senior-fullstack",
  label: { en: "", ru: "" },
  target: { rule: "track-band>=middle" },
  trackWeights: { distributed: 1, databases: 1, "system-design": 1, backend: 1, security: 1, observability: 1, performance: 1, networking: 0.9, frontend: 0.8 },
};

describe("senior-fullstack frontier is scoped to its senior-defining tracks", () => {
  const concepts: Concept[] = [
    C("paxos", "distributed", "middle"),
    C("mvcc", "databases", "advanced"),
    C("cap", "system-design", "middle"),
    C("idx-foundations", "databases", "foundations"), // below middle → excluded
    C("flexbox", "frontend", "middle"),                // support track (0.8) → excluded
    C("hooks", "react", "advanced"),                   // off-frontier track → excluded
    C("tracing", "observability", "middle"),           // promoted to core → included
  ];
  it("includes only middle+ concepts in core (weight>=1) tracks", () => {
    const ids = new Set(resolveGoalTargets(seniorGoal, concepts));
    expect(ids).toEqual(new Set(["paxos", "mvcc", "cap", "tracing"]));
  });
  it("excludes below-middle bands and support/off-frontier tracks", () => {
    const ids = new Set(resolveGoalTargets(seniorGoal, concepts));
    expect(ids.has("idx-foundations")).toBe(false);
    expect(ids.has("flexbox")).toBe(false);
    expect(ids.has("hooks")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/path/goal-resolve.test.ts`
Expected: PASS already if the resolver is correct, but the production goal still says `band>=middle` — this test uses a literal goal object, so it validates the RULE behavior. If it passes, proceed to wire the production goal in Step 3 (the real change is goals.json). If the resolver branch is wrong it FAILS here.

- [ ] **Step 3: Update the production goal in `goals.json`**

In `src/content/path/goals.json`, change the `senior-fullstack` entry's `target` and `trackWeights`:

```json
{
  "id": "senior-fullstack",
  "label": { "en": "Become senior fullstack", "ru": "Стать senior fullstack" },
  "target": { "rule": "track-band>=middle" },
  "trackWeights": {
    "distributed": 1,
    "databases": 1,
    "system-design": 1,
    "backend": 1,
    "security": 1,
    "observability": 1,
    "performance": 1,
    "networking": 0.9,
    "frontend": 0.8
  }
}
```

(Only `target.rule` changed from `band>=middle` to `track-band>=middle`, and `security`/`observability`/`performance` promoted from 0.9/0.8/0.8 to 1 so they are part of the senior frontier; `networking`/`frontend` stay as breadth bias.)

- [ ] **Step 4: Run tests**

Run: `bunx vitest run src/scripts/path/goal-resolve.test.ts` then `bun run test`
Expected: PASS; no regressions (any existing goal-resolve / planner tests still green).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything/site
git add src/content/path/goals.json src/scripts/path/goal-resolve.test.ts
git commit -m "feat(path): scope senior-fullstack frontier to its senior-defining tracks"
```

---

### Task 2: Streak grace via a consumable freeze

**Files:**
- Modify: `src/scripts/progression/streak.ts`
- Create/append: `src/scripts/progression/streak.test.ts`

**Interfaces:**
- Produces: `Streak` gains optional `freezes?: number`; `updateStreak(prev, today)` forgives a single missed day when a freeze is available, earns a freeze every 7 (cap 2).

- [ ] **Step 1: Write the failing test**

Create `src/scripts/progression/streak.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { updateStreak, type Streak } from "./streak";

const S = (lastActiveDay: string, count: number, best = count, freezes = 0): Streak => ({ lastActiveDay, count, best, freezes });

describe("updateStreak freeze grace", () => {
  it("consecutive day increments the count", () => {
    expect(updateStreak(S("2026-06-01", 3), "2026-06-02").count).toBe(4);
  });
  it("earns a freeze every 7th day, capped at 2", () => {
    const r = updateStreak(S("2026-06-06", 6, 6, 0), "2026-06-07"); // count -> 7
    expect(r.count).toBe(7);
    expect(r.freezes).toBe(1);
    const capped = updateStreak(S("2026-06-13", 13, 13, 2), "2026-06-14"); // count -> 14, already at cap
    expect(capped.freezes).toBe(2);
  });
  it("one missed day is forgiven when a freeze is available (count holds, freeze consumed)", () => {
    const r = updateStreak(S("2026-06-01", 5, 5, 1), "2026-06-03"); // gap 2
    expect(r.count).toBe(5);
    expect(r.freezes).toBe(0);
    expect(r.lastActiveDay).toBe("2026-06-03");
  });
  it("missed day with no freeze resets the streak to 1", () => {
    expect(updateStreak(S("2026-06-01", 5, 5, 0), "2026-06-03").count).toBe(1);
  });
  it("two or more missed days always resets even with a freeze", () => {
    expect(updateStreak(S("2026-06-01", 5, 5, 2), "2026-06-05").count).toBe(1); // gap 4
  });
  it("same day is a no-op", () => {
    const prev = S("2026-06-01", 5, 5, 1);
    expect(updateStreak(prev, "2026-06-01")).toBe(prev);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/progression/streak.test.ts`
Expected: FAIL — current `updateStreak` resets on gap 2 and has no `freezes`.

- [ ] **Step 3: Update `streak.ts`**

Replace the `Streak` interface and `updateStreak` in `src/scripts/progression/streak.ts` (keep `todayISO` and `daysBetween` unchanged):

```ts
export interface Streak { lastActiveDay: string; count: number; best: number; freezes?: number; }

const FREEZE_CAP = 2;
const FREEZE_EARN_EVERY = 7;

export function updateStreak(prev: Streak, today: string): Streak {
  if (prev.lastActiveDay === today) return prev;
  const freezes = prev.freezes ?? 0;
  if (!prev.lastActiveDay) return { lastActiveDay: today, count: 1, best: Math.max(1, prev.best), freezes };
  const gap = daysBetween(prev.lastActiveDay, today);
  if (gap === 1) {
    const count = prev.count + 1;
    const earned = count % FREEZE_EARN_EVERY === 0 ? Math.min(FREEZE_CAP, freezes + 1) : freezes;
    return { lastActiveDay: today, count, best: Math.max(prev.best, count), freezes: earned };
  }
  if (gap === 2 && freezes > 0) {
    // One missed day forgiven: the streak holds and one freeze is consumed.
    return { lastActiveDay: today, count: prev.count, best: prev.best, freezes: freezes - 1 };
  }
  return { lastActiveDay: today, count: 1, best: Math.max(prev.best, 1), freezes };
}
```

- [ ] **Step 4: Run tests**

Run: `bunx vitest run src/scripts/progression/streak.test.ts` then `bun run test`
Expected: PASS; no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/progression/streak.ts src/scripts/progression/streak.test.ts
git commit -m "feat(progression): streak one-day grace via consumable freeze"
```

---

### Task 3: Initialize `freezes` and surface grace in the daily toast

**Files:**
- Modify: `src/scripts/user-state.ts` (progression init `:41` + `recordActiveDay` `:169-181`)

**Interfaces:**
- Consumes: `updateStreak` (Task 2). Produces: new progression starts with `freezes: 0`; the toast notes when a freeze saved the streak.

- [ ] **Step 1: Add `freezes: 0` to the streak initializers**

In `src/scripts/user-state.ts`, update the two streak initializers (the inline default at `:41` and `defaultProgression()` at `:124-126`) to include `freezes: 0`:

```ts
streak: { lastActiveDay: "", count: 0, best: 0, freezes: 0 },
```

- [ ] **Step 2: Note the grace in `recordActiveDay`**

In `recordActiveDay` (`:169-181`), detect a consumed freeze (freezes went down while count held) and adjust the toast:

```ts
export function recordActiveDay() {
  const p = userState.value.progression;
  const streak = updateStreak(p.streak, todayISO());
  if (streak === p.streak) return;
  const usedFreeze = streak.count === p.streak.count && (streak.freezes ?? 0) < (p.streak.freezes ?? 0);
  userState.value = { ...userState.value, progression: { ...p, streak } };
  if (typeof window !== "undefined") {
    const ru = userState.value.lang === "ru";
    const msg = usedFreeze
      ? (ru ? `❄️ Заморозка спасла серию: ${streak.count} дн.` : `❄️ Freeze saved your ${streak.count}-day streak`)
      : (ru ? `🔥 Серия ${streak.count} дн.` : `🔥 ${streak.count}-day streak`);
    window.dispatchEvent(new CustomEvent("toast", { detail: { msg, kind: "ok" } }));
  }
}
```

- [ ] **Step 3: Run the gate**

Run: `bun run test` then `bun run check`
Expected: PASS; no new type errors in `user-state.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/scripts/user-state.ts
git commit -m "feat(progression): init streak freezes + freeze-saved toast"
```

---

### Task 4: Pure model backup — snapshot + restore app localStorage

**Files:**
- Create: `src/scripts/model-backup.ts`
- Create: `src/scripts/model-backup.test.ts`

**Interfaces:**
- Produces: `exportModel(store: StorageLike): string` (JSON of all app-prefixed entries with a version+timestamp wrapper) and `importModel(store: StorageLike, json: string): { restored: number }` (validates and writes back only app-prefixed keys).
- `StorageLike` is the minimal subset of `Storage` needed, so tests can pass a Map-backed fake.

- [ ] **Step 1: Write the failing test**

Create `src/scripts/model-backup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { exportModel, importModel, type StorageLike } from "./model-backup";

function fakeStore(init: Record<string, string> = {}): StorageLike {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

describe("model backup", () => {
  it("exports only app-prefixed keys as a versioned JSON blob", () => {
    const s = fakeStore({ "awesome.user-state.v1": "{\"x\":1}", "atlas.review.v1": "[]", "thirdparty.foo": "nope" });
    const json = exportModel(s);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.data["awesome.user-state.v1"]).toBe("{\"x\":1}");
    expect(parsed.data["atlas.review.v1"]).toBe("[]");
    expect(parsed.data["thirdparty.foo"]).toBeUndefined();
  });
  it("imports app-prefixed keys and reports the restored count", () => {
    const s = fakeStore();
    const blob = JSON.stringify({ version: 1, data: { "awesome.user-state.v1": "{\"x\":2}", "atlas.review.v1": "[]", "evil.key": "x" } });
    const r = importModel(s, blob);
    expect(r.restored).toBe(2);
    expect(s.getItem("awesome.user-state.v1")).toBe("{\"x\":2}");
    expect(s.getItem("evil.key")).toBeNull(); // non-app key refused
  });
  it("throws on malformed JSON", () => {
    expect(() => importModel(fakeStore(), "not json")).toThrow();
  });
  it("throws when the blob shape is wrong", () => {
    expect(() => importModel(fakeStore(), JSON.stringify({ nope: true }))).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run src/scripts/model-backup.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/scripts/model-backup.ts`:

```ts
/** Minimal Storage subset so the logic is unit-testable with a fake. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const APP_PREFIXES = ["awesome.", "atlas."];
const BACKUP_VERSION = 1;

function isAppKey(k: string): boolean {
  return APP_PREFIXES.some((p) => k.startsWith(p));
}

export interface BackupBlob { version: number; exportedAt?: number; data: Record<string, string> }

/** Snapshot every app-prefixed localStorage entry into a versioned JSON string. */
export function exportModel(store: StorageLike): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (!k || !isAppKey(k)) continue;
    const v = store.getItem(k);
    if (v !== null) data[k] = v;
  }
  const blob: BackupBlob = { version: BACKUP_VERSION, data };
  return JSON.stringify(blob);
}

/** Restore app-prefixed entries from a backup blob; ignores non-app keys. Throws on bad input. */
export function importModel(store: StorageLike, json: string): { restored: number } {
  let blob: unknown;
  try {
    blob = JSON.parse(json);
  } catch {
    throw new Error("Invalid backup file: not valid JSON");
  }
  const b = blob as Partial<BackupBlob>;
  if (!b || typeof b !== "object" || b.version !== BACKUP_VERSION || typeof b.data !== "object" || b.data === null) {
    throw new Error("Invalid backup file: unexpected shape");
  }
  let restored = 0;
  for (const [k, v] of Object.entries(b.data)) {
    if (!isAppKey(k) || typeof v !== "string") continue;
    store.setItem(k, v);
    restored++;
  }
  return { restored };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run src/scripts/model-backup.test.ts` then `bun run test`
Expected: PASS; no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/model-backup.ts src/scripts/model-backup.test.ts
git commit -m "feat(state): pure export/import of the app localStorage model"
```

---

### Task 5: Export/Import buttons in `SettingsDrawer`

**Files:**
- Modify: `src/components/pedagogy/SettingsDrawer.tsx`

**Interfaces:**
- Consumes: `exportModel`/`importModel` (Task 4). Produces: a "Your data" section with Export (download JSON) and Import (file picker → restore → reload) controls inside the existing settings island.

- [ ] **Step 1: Add the import**

Near the top of `SettingsDrawer.tsx`:

```ts
import { exportModel, importModel } from "~/scripts/model-backup";
```

- [ ] **Step 2: Add the handlers inside the component**

Add these handlers (place beside the existing theme/density handlers; uses browser APIs which are fine in this client island):

```ts
const handleExport = () => {
  const json = exportModel(localStorage);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `awesome-progress-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleImport = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const { restored } = importModel(localStorage, String(reader.result));
      const ru = lang === "ru";
      window.dispatchEvent(new CustomEvent("toast", { detail: { msg: ru ? `Восстановлено ключей: ${restored}. Перезагрузка…` : `Restored ${restored} keys. Reloading…`, kind: "ok" } }));
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      const ru = lang === "ru";
      window.dispatchEvent(new CustomEvent("toast", { detail: { msg: ru ? "Неверный файл резервной копии" : "Invalid backup file", kind: "err" } }));
    }
  };
  reader.readAsText(file);
};
```

Add the `todayISO` import if not present: `import { todayISO } from "~/scripts/progression/streak";`

- [ ] **Step 3: Render the "Your data" section**

In the drawer's JSX, after the density control, add a section (match the file's existing section markup/classes; this is a structural guide):

```tsx
<section class="settings-section">
  <h3>{lang === "ru" ? "Твои данные" : "Your data"}</h3>
  <p class="settings-hint">{lang === "ru" ? "Прогресс хранится в этом браузере. Сохрани резервную копию." : "Your progress lives in this browser. Keep a backup."}</p>
  <button type="button" onClick={handleExport}>{lang === "ru" ? "Экспорт прогресса" : "Export progress"}</button>
  <label class="settings-import">
    {lang === "ru" ? "Импорт" : "Import"}
    <input type="file" accept="application/json" onChange={handleImport} />
  </label>
</section>
```

- [ ] **Step 4: Gate**

Run: `bun run lint:src` then `bun run check`
Expected: PASS; no new errors in `SettingsDrawer.tsx`; no new client island created (the buttons live inside the existing island).

- [ ] **Step 5: Dev-curl smoke + Commit**

Run `bun run dev`, then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/en/settings
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/ru/settings
```
(Use the route that hosts `SettingsDrawer`; if `/settings` 404s find it under `src/pages/`. Expected: 200.)

```bash
git add src/components/pedagogy/SettingsDrawer.tsx
git commit -m "feat(settings): export/import progress backup controls"
```

---

## Final verification (after all tasks)

- [ ] `bun run test` — all green incl. `goal-resolve.test.ts`, `streak.test.ts`, `model-backup.test.ts`.
- [ ] `bun run check` — no NEW errors in touched files (vs the pre-existing baseline).
- [ ] `bun run lint:src` — clean.
- [ ] Manual: senior-fullstack path now targets the senior-defining tracks; a one-day gap with a freeze holds the streak; Export downloads a JSON, Import restores it and reloads.

## Self-Review notes (author)

- **Spec coverage:** sharpen frontier → Task 1; streak grace → Tasks 2-3; export/import → Tasks 4-5. All three approved P2 units mapped.
- **Type consistency:** `Streak.freezes?`, `StorageLike`, `BackupBlob`, `exportModel`/`importModel` signatures consistent across module, tests, and `SettingsDrawer` wiring.
- **Scope honesty:** Unit 1 simplified from graph-hub derivation to a rule swap after verifying the production rule matched all tracks; documented above.
