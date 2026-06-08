# Senior-Scenario Practice Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `incident`, `debug`, and `review` practice tasks to full coverage across the 808 teaching spine lessons — original, senior-grade, self-contained scenarios — so a learner practises the operational + code-judgment muscles a senior actually uses, not just recall/apply.

**Architecture:** A deterministic `scenario-audit` tool (reusing depth-audit's `classify.ts`/`lessons.ts`) inventories which teaching spine lessons already have each scenario type and emits a per-type worklist + a `--gate` done-check. Two approved exemplars (`debug`: LRU recency bug; `incident`: cache-stampede) are landed first as the canonical templates. Content is then authored in per-type, per-track waves (a first in-session calibration wave via Workflow, then volume via Claude cowork), each batch gated by the existing build (Zod schema + `practice.ts` lint: i18n-parity, lessonKey, review-findings, debug no-leak) plus a new `verify:scenario` that executes every `debug` starter through the real QuickJS runner and asserts a real bug exists. The build runs **incrementally** (`build:incremental`, ~130s) since each wave only edits practice JSON — the campaign dogfoods the build cache shipped on 2026-06-08.

**Tech Stack:** Bun, Vitest, TypeScript, `quickjs-emscripten` (via `src/scripts/debug-runner.ts`), the practice content collection (`src/content.config.ts`), Claude cowork + in-session Workflow for authoring volume.

**Grounding (verified 2026-06-08):**
- 808 teaching spine lessons have a practice file. Coverage today: **incident 56% (455), debug 0% (1), review 0% (4)**; for context diagnose 98% / predict 96% / design 76% / fix 59% / sandbox 53%.
- Empty-incident tracks: `typescript` (41), `system-design` (34), `system-design-cases` (22); near-empty: `sql-postgres` 4%, `data-engineering` 25%, `engineering-practice` 29%, `python` 33%, `apis` 38%, `js-engine` 43%, `frontend` 46%.
- Reusable: `scripts/depth-audit/classify.ts` (`FOUNDATIONS` set, `classifyLesson(lessonKey): "teaching"|"auxiliary"`, `trackOf(unitKey)`, `isFoundation(unitKey)`); `scripts/depth-audit/lessons.ts` (`enumerateUnits(siteSrc): Promise<UnitRef[]>`, each `LessonRef` = `{lessonKey, track, unitKey, slug, status, level, path, practicePath}`); `scripts/depth-audit/types.ts` (`Level = "zero"|"junior"|"middle"|"senior"`).
- Task schemas: `IncidentTask` (steps[3..6] of `{label,prompt,reveal}` BiText), `DebugTask` (`starter`,`setup?`,`verify`,`check: ExecCheck`,`evidence`,`hints[1..4]`,`reveal`), `ReviewTask` (`diff{lang,code}`,`findings[≥1]`,`decoys?`) in `src/content.config.ts`.
- `src/scripts/debug-runner.ts` exports `runDebug({setup?, learnerCode, verify, check}): Promise<{status:"pass"|"fail"|"error"; ...}>`, headless (`quickjs-emscripten`), sync-only (no Promise draining). Tested in `src/scripts/debug-runner.test.ts`.
- Existing gates (run by `bun run build`): Zod content-collection validation + `src/lint/rules/practice.ts` → `practice-parity` (en≠ru on ≥25-char prose), `practice-lessonkey` (lessonKey resolves to EN+RU lesson), `practice-review` (≥1 finding), `practice-debug` (starter+verify present AND verify not leaked into starter/prompt/reveal/hints).

---

## Targeting policy (drives the worklist)

A lesson is a **candidate** for a type when it is a teaching spine lesson (`classifyLesson == "teaching"`, `!isFoundation`) that lacks that type AND fits it:

- **incident** — `level ∈ {middle, senior}` OR `level == null` (most spine lessons are operational at middle+). Excludes `zero`/`junior`. Incidents are senior operational reasoning.
- **debug** — the lesson teaches runnable code: `lessonType == "coding"` OR it already has a `sandbox`/`fix` task whose runtime is `js` or `sql` (proves a runnable, debuggable topic). Debug is a sync JS/SQL bug.
- **review** — the lesson teaches a design/implementation judgment: it already has a `design` OR `fix` task, OR `level == senior`. Review = critique a diff for planted findings.

These are computed by the audit (Phase 1). "Full coverage" = every candidate gets ≥1 task of that type. A lesson already at the 8-task cap is reported as `at-cap` and skipped (never exceed 8).

---

## File Structure

**New (tooling):**
- `site/scripts/scenario-audit/inventory.ts` — merge practice task-type sets with lesson refs (+ `lessonType`). One responsibility: "what types does each teaching spine lesson have?"
- `site/scripts/scenario-audit/inventory.test.ts`
- `site/scripts/scenario-audit/worklist.ts` — apply the targeting policy → candidate lists per type. Pure.
- `site/scripts/scenario-audit/worklist.test.ts`
- `site/scripts/scenario-audit/audit.ts` — CLI: print coverage report, write `docs/audit/scenario-worklist.json`, `--gate` mode.
- `site/scripts/verify-scenario.mjs` — execute every `debug` starter through `runDebug`, assert it does NOT already pass; `--self-test`.
- `site/scripts/verify-scenario.test.ts` — vitest over the runner gate using a fixture.

**New (campaign ops):**
- `docs/scenario-campaign/COWORK-RUN.md` — the dense authoring brief cowork agents follow.
- `docs/audit/scenario-coverage.md` — generated report (committed each re-audit).
- `docs/audit/scenario-worklist.json` — generated worklist (gitignored or committed; committed for traceability).

**Modified:**
- `site/package.json` — add `audit:scenario` + `verify:scenario` scripts.
- `.github/workflows/deploy.yml` — add `verify:scenario` to the `gates` job (next to `verify:samples`).
- Many `site/src/content/practice/**/*.json` — appended/created tasks (the content).

**Reused unchanged:** `scripts/depth-audit/classify.ts`, `scripts/depth-audit/lessons.ts`, `scripts/depth-audit/types.ts`, `src/scripts/debug-runner.ts`, `src/lint/rules/practice.ts`.

---

## Phase 1 — Targeting + gate tooling (TDD)

### Task 1: Coverage inventory (`scenario-audit/inventory.ts`)

**Files:**
- Create: `site/scripts/scenario-audit/inventory.ts`
- Create: `site/scripts/scenario-audit/inventory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/scripts/scenario-audit/inventory.test.ts
import { describe, it, expect } from "vitest";
import { typesByLesson, type LessonCoverage } from "./inventory";

describe("typesByLesson", () => {
  it("maps each practice file's lessonKey to its set of task types", () => {
    const files = [
      { lessonKey: "networking/01-x/01-a", track: "networking", tasks: [{ type: "diagnose" }, { type: "incident" }] },
      { lessonKey: "math/01-x/01-a", track: "math", tasks: [{ type: "diagnose" }] },
    ];
    const got = typesByLesson(files as any);
    expect(got.get("networking/01-x/01-a")?.types).toEqual(new Set(["diagnose", "incident"]));
  });

  it("flags a lesson at the 8-task cap", () => {
    const files = [{ lessonKey: "n/01/01", track: "networking", tasks: Array(8).fill({ type: "fix" }) }];
    const got = typesByLesson(files as any);
    expect(got.get("n/01/01")?.atCap).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- scenario-audit/inventory`
Expected: FAIL — `Cannot find module './inventory'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// site/scripts/scenario-audit/inventory.ts
// Pure: turn parsed practice files into a per-lesson type-coverage map.
export interface PracticeFile {
  lessonKey: string;
  track: string;
  tasks: { type: string }[];
}

export interface LessonCoverage {
  lessonKey: string;
  track: string;
  types: Set<string>;
  taskCount: number;
  atCap: boolean;
}

export function typesByLesson(files: PracticeFile[]): Map<string, LessonCoverage> {
  const out = new Map<string, LessonCoverage>();
  for (const f of files) {
    out.set(f.lessonKey, {
      lessonKey: f.lessonKey,
      track: f.track,
      types: new Set(f.tasks.map((t) => t.type)),
      taskCount: f.tasks.length,
      atCap: f.tasks.length >= 8,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- scenario-audit/inventory`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/scenario-audit/inventory.ts site/scripts/scenario-audit/inventory.test.ts
git commit -m "feat(scenario-audit): per-lesson task-type coverage inventory"
```

---

### Task 2: Targeting worklist (`scenario-audit/worklist.ts`)

**Files:**
- Create: `site/scripts/scenario-audit/worklist.ts`
- Create: `site/scripts/scenario-audit/worklist.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// site/scripts/scenario-audit/worklist.test.ts
import { describe, it, expect } from "vitest";
import { candidatesFor, type LessonMeta } from "./worklist";

const base = { taskCount: 4, atCap: false };

describe("candidatesFor incident", () => {
  it("targets middle/senior/null-level teaching spine lessons lacking incident", () => {
    const lessons: LessonMeta[] = [
      { lessonKey: "backend/01/01", track: "backend", level: "senior", lessonType: "topic", types: new Set(["diagnose"]), ...base },
      { lessonKey: "backend/01/02", track: "backend", level: "junior", lessonType: "topic", types: new Set(["diagnose"]), ...base },
      { lessonKey: "backend/01/03", track: "backend", level: "senior", lessonType: "topic", types: new Set(["incident"]), ...base },
      { lessonKey: "math/01/01", track: "math", level: "senior", lessonType: "topic", types: new Set([]), ...base },
    ];
    const got = candidatesFor("incident", lessons).map((l) => l.lessonKey);
    expect(got).toEqual(["backend/01/01"]); // junior excluded, has-incident excluded, foundation excluded
  });
});

describe("candidatesFor debug", () => {
  it("targets coding lessons OR lessons with a js/sql sandbox/fix, lacking debug", () => {
    const lessons: LessonMeta[] = [
      { lessonKey: "js-engine/01/01", track: "js-engine", level: "middle", lessonType: "coding", types: new Set(["predict"]), ...base },
      { lessonKey: "frontend/01/01", track: "frontend", level: "middle", lessonType: "topic", types: new Set(["sandbox-js"]), ...base },
      { lessonKey: "apis/01/01", track: "apis", level: "middle", lessonType: "topic", types: new Set(["design"]), ...base },
      { lessonKey: "js-engine/01/02", track: "js-engine", level: "middle", lessonType: "coding", types: new Set(["debug"]), ...base },
    ];
    const got = candidatesFor("debug", lessons).map((l) => l.lessonKey);
    expect(got).toEqual(["js-engine/01/01", "frontend/01/01"]); // design-only excluded, has-debug excluded
  });
});

describe("candidatesFor never exceeds cap", () => {
  it("skips at-cap lessons", () => {
    const lessons: LessonMeta[] = [
      { lessonKey: "backend/01/01", track: "backend", level: "senior", lessonType: "topic", types: new Set(["diagnose"]), taskCount: 8, atCap: true },
    ];
    expect(candidatesFor("incident", lessons)).toEqual([]);
  });
});
```

Note: `types` here is the lesson's coverage set, EXTENDED so a `sandbox`/`fix` task whose runtime is js/sql is recorded as the marker `sandbox-js`/`sandbox-sql`/`fix-js`/`fix-sql` (the inventory in Task 3 derives these markers when it reads the raw task; for the pure `worklist` unit we pass them directly).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- scenario-audit/worklist`
Expected: FAIL — `Cannot find module './worklist'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// site/scripts/scenario-audit/worklist.ts
// Pure targeting policy: which teaching spine lessons should get which scenario type.
import { isFoundation } from "../depth-audit/classify";

export type ScenarioType = "incident" | "debug" | "review";

export interface LessonMeta {
  lessonKey: string;
  track: string;
  level: "zero" | "junior" | "middle" | "senior" | null;
  lessonType: "concept" | "coding" | "topic" | null;
  /** coverage set, incl. runtime markers: "sandbox-js","sandbox-sql","fix-js","fix-sql" */
  types: Set<string>;
  taskCount: number;
  atCap: boolean;
}

const hasAny = (s: Set<string>, ...keys: string[]) => keys.some((k) => s.has(k));

export function candidatesFor(type: ScenarioType, lessons: LessonMeta[]): LessonMeta[] {
  return lessons.filter((l) => {
    if (isFoundation(l.lessonKey)) return false;        // spine only
    if (l.atCap) return false;                          // never exceed 8
    if (l.types.has(type)) return false;                // already covered
    switch (type) {
      case "incident":
        return l.level === "middle" || l.level === "senior" || l.level === null;
      case "debug":
        return l.lessonType === "coding" || hasAny(l.types, "sandbox-js", "sandbox-sql", "fix-js", "fix-sql");
      case "review":
        return l.level === "senior" || hasAny(l.types, "design", "fix", "fix-js", "fix-sql");
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- scenario-audit/worklist`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/scripts/scenario-audit/worklist.ts site/scripts/scenario-audit/worklist.test.ts
git commit -m "feat(scenario-audit): per-type targeting worklist policy"
```

---

### Task 3: Audit CLI + report + gate (`scenario-audit/audit.ts`)

**Files:**
- Create: `site/scripts/scenario-audit/audit.ts`
- Modify: `site/package.json` (scripts)

- [ ] **Step 1: Write the CLI**

```ts
// site/scripts/scenario-audit/audit.ts
#!/usr/bin/env bun
// Inventory incident/debug/review coverage across teaching spine lessons,
// print a per-track report, write docs/audit/scenario-worklist.json, and
// (with --gate) exit 1 if any candidate lesson still lacks its target type.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateUnits } from "../depth-audit/lessons";
import { classifyLesson, isFoundation } from "../depth-audit/classify";
import { typesByLesson, type PracticeFile } from "./inventory";
import { candidatesFor, type LessonMeta, type ScenarioType } from "./worklist";

const siteRoot = fileURLToPath(new URL("../../", import.meta.url));
const siteSrc = join(siteRoot, "src");
const PRACTICE = join(siteSrc, "content/practice");
const DOCS = join(siteRoot, "..", "docs", "audit");

const fm = (body: string, key: string) => {
  const m = body.match(new RegExp(`^${key}:[ \\t]*["']?([^"'\\n]+?)["']?[ \\t]*$`, "m"));
  return m ? m[1].trim() : null;
};

async function walkJson(dir: string, acc: string[] = []): Promise<string[]> {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walkJson(p, acc);
    else if (it.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

// ---- read practice files, derive runtime markers for the worklist ----
const files: PracticeFile[] = [];
const markerTypes = new Map<string, Set<string>>();
for (const p of await walkJson(PRACTICE)) {
  let data: any;
  try { data = JSON.parse(await readFile(p, "utf8")); } catch { continue; }
  if (!data?.lessonKey) continue;
  files.push({ lessonKey: data.lessonKey, track: data.track, tasks: data.tasks ?? [] });
  const markers = new Set<string>();
  for (const t of data.tasks ?? []) {
    markers.add(t.type);
    if ((t.type === "sandbox" || t.type === "fix") && (t.runtime === "js" || t.runtime === "sql")) {
      markers.add(`${t.type}-${t.runtime}`);
    }
  }
  markerTypes.set(data.lessonKey, markers);
}
const coverage = typesByLesson(files);

// ---- merge with lesson refs (level, lessonType) ----
const units = await enumerateUnits(siteSrc);
const enRoot = join(PRACTICE); // practice keys are lang-free; level/lessonType come from EN lesson
const lessons: LessonMeta[] = [];
for (const u of units) {
  for (const l of u.lessons) {
    if (classifyLesson(l.lessonKey) !== "teaching") continue;
    if (isFoundation(l.lessonKey)) continue;
    const body = await readFile(l.path, "utf8").catch(() => "");
    const lessonType = fm(body, "lessonType") as LessonMeta["lessonType"] | null;
    const cov = coverage.get(l.lessonKey);
    lessons.push({
      lessonKey: l.lessonKey,
      track: l.track,
      level: l.level,
      lessonType,
      types: markerTypes.get(l.lessonKey) ?? new Set(),
      taskCount: cov?.taskCount ?? 0,
      atCap: cov?.atCap ?? false,
    });
  }
}

const TYPES: ScenarioType[] = ["incident", "debug", "review"];
const worklist: Record<ScenarioType, string[]> = { incident: [], debug: [], review: [] };
for (const t of TYPES) worklist[t] = candidatesFor(t, lessons).map((l) => l.lessonKey);

// ---- per-track report ----
const byTrack = new Map<string, { n: number; inc: number; dbg: number; rev: number }>();
for (const l of lessons) {
  const b = byTrack.get(l.track) ?? { n: 0, inc: 0, dbg: 0, rev: 0 };
  b.n++;
  if (l.types.has("incident")) b.inc++;
  if (l.types.has("debug")) b.dbg++;
  if (l.types.has("review")) b.rev++;
  byTrack.set(l.track, b);
}
let report = `# Scenario coverage (teaching spine lessons)\n\nLessons: ${lessons.length}\n\n`;
report += `Candidates remaining — incident: ${worklist.incident.length}, debug: ${worklist.debug.length}, review: ${worklist.review.length}\n\n`;
report += `| track | #les | inc% | dbg% | rev% |\n|---|---|---|---|---|\n`;
for (const track of [...byTrack.keys()].sort()) {
  const b = byTrack.get(track)!;
  const pct = (x: number) => `${Math.round((100 * x) / b.n)}%`;
  report += `| ${track} | ${b.n} | ${pct(b.inc)} | ${pct(b.dbg)} | ${pct(b.rev)} |\n`;
}

await mkdir(DOCS, { recursive: true });
await writeFile(join(DOCS, "scenario-coverage.md"), report);
await writeFile(join(DOCS, "scenario-worklist.json"), JSON.stringify(worklist, null, 2));
console.log(report);

// ---- gate mode: exit 1 if any candidate remains for the named types ----
if (process.argv.includes("--gate")) {
  const want = process.argv.slice(process.argv.indexOf("--gate") + 1).filter((a) => !a.startsWith("--"));
  const checkTypes = (want.length ? want : TYPES) as ScenarioType[];
  const remaining = checkTypes.flatMap((t) => worklist[t].map((k) => `${t}:${k}`));
  if (remaining.length) {
    console.error(`scenario gate: ${remaining.length} candidate(s) still missing a target type.`);
    process.exit(1);
  }
  console.log("scenario gate: OK — all targeted lessons covered.");
}
```

- [ ] **Step 2: Add package.json script**

In `site/package.json` `scripts`, after `"audit:depth"`:

```json
    "audit:scenario": "bun scripts/scenario-audit/audit.ts",
```

- [ ] **Step 3: Smoke-test against the real tree**

Run: `cd site && bun run audit:scenario | head -40`
Expected: prints the coverage table; `docs/audit/scenario-worklist.json` exists with non-empty `incident`/`debug`/`review` arrays (debug/review large, incident moderate). Confirm the counts are in the expected ballpark (incident candidates in the low hundreds, debug/review in the hundreds).

- [ ] **Step 4: Commit**

```bash
git add site/scripts/scenario-audit/audit.ts site/package.json docs/audit/scenario-coverage.md docs/audit/scenario-worklist.json
git commit -m "feat(scenario-audit): coverage report + worklist + --gate CLI"
```

---

### Task 4: Debug-execution gate (`verify-scenario.mjs`)

**Files:**
- Create: `site/scripts/verify-scenario.mjs`
- Create: `site/scripts/verify-scenario.test.ts`
- Modify: `site/package.json` (scripts)

- [ ] **Step 1: Write the failing test**

```ts
// site/scripts/verify-scenario.test.ts
import { describe, it, expect } from "vitest";
import { starterMustFail } from "./verify-scenario.mjs";

describe("starterMustFail", () => {
  it("returns ok=false when the starter ALREADY passes its own check (no real bug)", async () => {
    const task = {
      id: "no-bug",
      starter: "function f(){ return 2; }",
      verify: "console.log(f() === 2 ? 'PASS' : 'FAIL');",
      check: { kind: "stdout-contains", value: "PASS" },
    };
    const r = await starterMustFail(task);
    expect(r.ok).toBe(false);
  });

  it("returns ok=true when the starter fails its check (a real bug exists)", async () => {
    const task = {
      id: "real-bug",
      starter: "function f(){ return 1; }",
      verify: "console.log(f() === 2 ? 'PASS' : 'FAIL');",
      check: { kind: "stdout-contains", value: "PASS" },
    };
    const r = await starterMustFail(task);
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bun run test -- verify-scenario`
Expected: FAIL — `Cannot find module './verify-scenario.mjs'`.

- [ ] **Step 3: Write the implementation**

```js
// site/scripts/verify-scenario.mjs
#!/usr/bin/env bun
// Executes every `debug` practice task's STARTER through the real QuickJS runner
// and asserts it does NOT already pass its hidden check — i.e. a real bug exists
// and the verify/check are wired. The lint already checks structure + no-leak;
// this adds the one thing only execution can prove.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDebug } from "../src/scripts/debug-runner.ts";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const PRACTICE = join(siteRoot, "src/content/practice");

/** A debug task is well-formed iff its STARTER fails the check (a bug to fix). */
export async function starterMustFail(task) {
  const r = await runDebug({ setup: task.setup, learnerCode: task.starter, verify: task.verify, check: task.check });
  return { ok: r.status !== "pass", status: r.status, id: task.id };
}

async function walk(dir, acc = []) {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walk(p, acc);
    else if (it.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

if (process.argv.includes("--self-test")) {
  const bad = await starterMustFail({ id: "x", starter: "function f(){return 2}", verify: "console.log(f()===2?'PASS':'FAIL')", check: { kind: "stdout-contains", value: "PASS" } });
  if (bad.ok) { console.error("self-test FAILED: a passing starter was accepted"); process.exit(1); }
  console.log("verify-scenario self-test: OK"); process.exit(0);
}

// Default: scan all practice, gate every debug task.
const failures = [];
for (const p of await walk(PRACTICE)) {
  let data;
  try { data = JSON.parse(await readFile(p, "utf8")); } catch { continue; }
  for (const task of data.tasks ?? []) {
    if (task.type !== "debug") continue;
    const r = await starterMustFail(task);
    if (!r.ok) failures.push(`${data.lessonKey}#${task.id} (starter status=${r.status}, expected a fail)`);
  }
}
if (failures.length) {
  console.error(`verify:scenario FAIL — ${failures.length} debug task(s) whose starter does not present a real bug:`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("verify:scenario OK — every debug starter fails its check (a real bug to fix).");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd site && bun run test -- verify-scenario`
Expected: PASS (2 assertions). Then `cd site && bun scripts/verify-scenario.mjs --self-test` → `OK`.

- [ ] **Step 5: Add package.json script + run over the current tree**

In `site/package.json` `scripts`, after `"verify:samples"`:

```json
    "verify:scenario": "bun scripts/verify-scenario.mjs",
```

Run: `cd site && bun run verify:scenario`
Expected: `OK` (today there is ~1 debug task; it must pass, or fix it before proceeding).

- [ ] **Step 6: Commit**

```bash
git add site/scripts/verify-scenario.mjs site/scripts/verify-scenario.test.ts site/package.json
git commit -m "feat(scenario-audit): verify:scenario debug-starter execution gate"
```

---

### Task 5: Wire `verify:scenario` into CI

**Files:**
- Modify: `.github/workflows/deploy.yml` (the `gates` job)

- [ ] **Step 1: Add the step after "Execute runnable code samples"**

In the `gates` job steps, after the `verify:samples` step, add:

```yaml
      - name: Verify debug-task starters present a real bug
        run: bun run verify:scenario
        working-directory: site
```

- [ ] **Step 2: Validate YAML**

Run: `cd /Users/artemmac/dev/awesome-everything && python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml')); print('yaml ok')"`
Expected: `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(scenario): gate deploys on verify:scenario"
```

---

## Phase 2 — Format lock (canonical exemplars)

### Task 6: Land the two approved exemplars

The two exemplars were approved in session: `debug` = "LRU cache evicts the wrong key" (`id: lru-recency-eviction`), `incident` = "A single expiring cache key takes down the database" (`id: cache-stampede-db-overload`). Place each in an audit-identified GAP lesson (not a lesson that already teaches the same point) so they double as real coverage.

**Files:**
- Modify: two `site/src/content/practice/<key>.json` chosen from `docs/audit/scenario-worklist.json`.

- [ ] **Step 1: Pick targets from the worklist**

Run: `cd site && bun run audit:scenario >/dev/null && node -e "const w=require('../docs/audit/scenario-worklist.json'); console.log('debug sample:', w.debug.slice(0,8)); console.log('incident sample:', w.incident.filter(k=>k.startsWith('caching')||k.startsWith('distributed')||k.startsWith('queues')).slice(0,8))"`
Choose:
- a `debug` candidate that teaches an in-memory cache / data-structure (e.g. a `node`, `js-engine`, `caching`, or `base-cs`-adjacent spine lesson) for the LRU task — NOT `system-design/05-caching-at-scale/02-eviction-and-ttl` (it already teaches LRU-vs-FIFO + TTL jitter; would be redundant).
- an `incident` candidate on a caching/queues/distributed lesson about TTL/expiry/load for the stampede task — again avoid a lesson already covering stampede.

Record the two chosen `lessonKey`s.

- [ ] **Step 2: Append the exemplar task to each chosen practice file**

Open each chosen `src/content/practice/<key>.json` and append the matching exemplar object (the full EN+RU JSON authored in session) to its `tasks` array. Ensure: the task `id` is unique within the file; the file's `tasks` length stays ≤ 8; the exemplar's `verify` string does not appear in its `starter`/`prompt`/`reveal`/`hints` (the `practice-debug` lint forbids leaking it — the LRU exemplar already complies).

(The exemplar JSON is the canonical text recorded in `docs/scenario-campaign/COWORK-RUN.md` in Task 7; paste it verbatim.)

- [ ] **Step 3: Gate — schema + lint + debug execution + render**

Run:
```bash
cd site
bun run verify:scenario          # LRU starter must fail (real bug) → OK
bun run build:incremental        # Zod schema + full practice lint + renders ONLY the 2 changed lessons (~130s)
```
Expected: `verify:scenario OK`; `build:incremental` ends with `lint: clean — 0 errors, 0 warnings` and `incremental done — N page(s)` (N = 2× the number of changed lessons, en+ru). If lint flags `practice-debug` leak or `practice-parity`, fix the task text and re-run.

- [ ] **Step 4: Visual render check**

Run: `cd site && bun run preview &` then open the two lessons' `/en/learn/<key>` and `/ru/learn/<key>` — confirm the Debug editor renders with the starter + Run + hint ladder, and the Incident renders its 5 steps with per-step reveal. Stop preview.

- [ ] **Step 5: Commit**

```bash
git add site/src/content/practice
git commit -m "content(scenario): land LRU debug + cache-stampede incident exemplars"
```

---

## Phase 3 — Authoring waves

Each wave authors one type across the worklist, batched by track, gated identically. Authoring uses Claude cowork for volume (per the established hybrid playbook) driven by a dense brief; the FIRST wave is a small in-session Workflow calibration to prove the brief + gates before scaling.

### Task 7: Author the cowork brief + run the calibration wave

**Files:**
- Create: `docs/scenario-campaign/COWORK-RUN.md`
- Content: ~12 tasks across `incident`/`debug`/`review` on 3–4 tracks (in-session Workflow).

- [ ] **Step 1: Write `docs/scenario-campaign/COWORK-RUN.md`**

It must contain, in full (no abbreviation):
1. **The two canonical exemplars** (LRU debug + cache-stampede incident) as the format reference — the complete EN+RU JSON.
2. **A third canonical exemplar for `review`** — author one now: a senior diff-review task (e.g. a subtly wrong retry/backoff or an N+1 in an ORM query) with 2–3 planted `findings` (`severity` ∈ bug/missing-test/tradeoff/simplification, each `planted:true`) + 1–2 `decoys`, EN+RU. Validate it builds before finalizing the brief.
3. **Rules (verbatim):**
   - Self-contained: all material embedded; never reference an external repo/project.
   - Original: incidents may be *inspired by* public postmortems/RFCs but the text must be original — never copy copyrighted wording. Reconstruct the scenario in your own words.
   - `debug` is **synchronous only** (QuickJS does not drain Promises) — logic/boundary/state bugs, not races/timers/async.
   - `debug` `verify` must NOT appear in `starter`/`prompt`/`reveal`/`hints` (the build lint rejects a leak). The starter must actually fail its `check` (the `verify:scenario` gate runs it).
   - Senior bar: real senior pitfalls (stampede, LRU recency, retry amplification, pool exhaustion, N+1, consistent-hash wraparound, head-of-line blocking, lock ordering, idempotency gaps), not toy exercises.
   - i18n: every BiText field has a genuine RU translation distinct from EN (the `practice-parity` lint rejects en===ru on ≥25-char prose).
   - Append to the lesson's existing `src/content/practice/<key>.json` `tasks` array (create the file if absent, with `lessonKey` + `track` + `tasks`); keep `tasks` ≤ 8; unique task `id`.
4. **The worklist**: point at `docs/audit/scenario-worklist.json`; one batch = one track.
5. **Per-batch gate the controller runs** (copy/paste): `bun run verify:scenario && bun run build:incremental` then a spot-review.

- [ ] **Step 2: Run the in-session calibration wave (Workflow)**

Dispatch a Workflow that authors ~12 tasks: pick 4 tracks from the worklist (one with an empty incident track, e.g. `typescript`; one code track for `debug`, e.g. `js-engine`; one senior track for `review`, e.g. `backend`; one mixed). For each, an agent authors the targeted task per the brief + exemplars and returns the JSON object (schema-shaped). The controller appends them to the right files.

- [ ] **Step 3: Gate the calibration wave**

Run:
```bash
cd site
bun run verify:scenario
bun run build:incremental
```
Expected: `verify:scenario OK`; build lint clean. Then dispatch a spot-review subagent over the 12 authored tasks for: senior depth, originality (not copied), correctness of each `reveal`, RU quality. Fix flagged tasks; re-gate.

- [ ] **Step 4: Re-audit + commit**

Run: `cd site && bun run audit:scenario | head -20`
Expected: the candidate counts dropped by ~12.
```bash
git add site/src/content/practice docs/scenario-campaign/COWORK-RUN.md docs/audit/scenario-coverage.md docs/audit/scenario-worklist.json
git commit -m "content(scenario): cowork brief + calibration wave (incident/debug/review)"
```

---

### Task 8: Incident wave (full coverage)

**Files:** `site/src/content/practice/**/*.json` (incident candidates).

- [ ] **Step 1: Drive cowork over `worklist.incident`, batched by track**

Hand cowork the brief + the `incident` slice of `docs/audit/scenario-worklist.json`. One track per batch (start with the empty tracks: `typescript`, `system-design`, `system-design-cases`, then `sql-postgres`, `data-engineering`, `engineering-practice`, …). Each lesson gets exactly one original `incident` task appended.

- [ ] **Step 2: Gate each returned batch**

For each batch the controller pulls back:
```bash
cd site
bun run build:incremental      # Zod + practice lint (parity/lessonkey) + renders only the changed lessons
```
Expected: `lint: clean`. Then dispatch a spot-review subagent over a sample (≥20%) of the batch for senior depth + originality + RU quality. Fix flagged; re-gate.

- [ ] **Step 3: Commit per batch + re-audit periodically**

```bash
git add site/src/content/practice
git commit -m "content(scenario): incident tasks — <track> batch"
```
Every few batches: `cd site && bun run audit:scenario | head -20` and confirm `incident` candidate count is falling toward 0.

- [ ] **Step 4: Loop until the incident gate passes**

Run: `cd site && bun run audit:scenario --gate incident`
Expected: `scenario gate: OK` (no incident candidates remain). If not, continue batches. Commit the regenerated `docs/audit/scenario-coverage.md`.

---

### Task 9: Debug wave (full coverage)

**Files:** `site/src/content/practice/**/*.json` (debug candidates).

- [ ] **Step 1: Drive cowork over `worklist.debug`, batched by track**

Same protocol as Task 8 but for `debug`. Reinforce in each dispatch: synchronous-only bug; starter must fail; no verify leak; a `check` of `{kind:"stdout-contains", value:"PASS"}` with a `verify` that logs `PASS`/diagnostics is the house pattern (per the LRU exemplar).

- [ ] **Step 2: Gate each returned batch (adds the execution check)**

```bash
cd site
bun run verify:scenario        # every new debug starter MUST fail its check
bun run build:incremental      # schema + lint (incl. practice-debug no-leak) + render
```
Expected: both green. A debug task whose starter already passes, or that leaks the verify, is rejected here — fix and re-gate. Spot-review a sample for solvability (a correct fix exists and the reveal describes it).

- [ ] **Step 3: Commit per batch**

```bash
git add site/src/content/practice
git commit -m "content(scenario): debug tasks — <track> batch"
```

- [ ] **Step 4: Loop until the debug gate passes**

Run: `cd site && bun run audit:scenario --gate debug`
Expected: `scenario gate: OK`.

---

### Task 10: Review wave (full coverage)

**Files:** `site/src/content/practice/**/*.json` (review candidates).

- [ ] **Step 1: Drive cowork over `worklist.review`, batched by track**

Same protocol. Each `review` task ships an inline `diff` (`{lang, code}`), ≥1 `planted:true` finding with a `severity`, and ideally 1–2 `decoys` (plausible non-issues that test discrimination), EN+RU.

- [ ] **Step 2: Gate each returned batch**

```bash
cd site
bun run build:incremental      # schema + practice-review (≥1 finding) + parity lint + render
```
Expected: green. Spot-review a sample: the planted findings are real senior issues, the decoys are genuinely-not-issues, the diff is realistic.

- [ ] **Step 3: Commit per batch**

```bash
git add site/src/content/practice
git commit -m "content(scenario): review tasks — <track> batch"
```

- [ ] **Step 4: Loop until the review gate passes**

Run: `cd site && bun run audit:scenario --gate review`
Expected: `scenario gate: OK`.

---

## Phase 4 — Done-check

### Task 11: Final gate + full build + memory

**Files:** none (verification) + memory.

- [ ] **Step 1: All scenario gates pass**

Run: `cd site && bun run audit:scenario --gate`
Expected: `scenario gate: OK — all targeted lessons covered.`

- [ ] **Step 2: Authoritative full gates**

Run:
```bash
cd site
bun run test
bun run verify:scenario
bun run verify:samples
FORCE_FULL_BUILD=1 bun run build:incremental    # one full build over the whole tree, lint 0/0
```
Expected: tests green; both verifies green; full build `lint: clean — 0 errors, 0 warnings`, 4859 pages.

- [ ] **Step 3: Final spot-review summary**

Dispatch one reviewer subagent over a random ≥3% sample spanning all three types and ≥10 tracks: confirm senior depth, originality (no copied postmortem text), correctness of reveals/findings, RU quality. Record the verdict in `docs/audit/scenario-coverage.md`.

- [ ] **Step 4: Update memory + commit**

Update `project_senior-plus-campaign.md` (or a new `project_scenario-practice-campaign.md`) + `MEMORY.md` with: shipped scope, the audit tool + gates, final coverage, and the dogfooding of the build cache.
```bash
git add docs/audit/scenario-coverage.md
git commit -m "content(scenario): full incident/debug/review coverage — done-check"
```

---

## Self-Review

**1. Spec/goal coverage:** incident/debug/review full coverage → Tasks 8/9/10 (gated by Task 3's `--gate`). Targeting policy → Task 2. Measurement/done-check → Tasks 3 + 11. Format lock → Tasks 6 + 7. Novel debug-execution safety → Task 4. Originality/self-contained/sync-only/i18n rules → Task 7 brief. CI gate → Task 5. Dogfooding the build cache (validate waves via `build:incremental`) → Tasks 6–10. ✓

**2. Placeholder scan:** Tooling tasks (1–4) carry complete code + tests. Wave tasks (7–10) are content authoring, not code — they specify the exact brief content, the exact gate commands, and the exact loop-exit condition (`audit:scenario --gate <type>` → OK), which is the correct granularity for a cowork-driven content campaign. No "TBD"/"handle edge cases". The one deliberately deferred authoring artifact (the `review` exemplar) is assigned as concrete work in Task 7 Step 1 with its schema constraints. ✓

**3. Type/name consistency:** `LessonCoverage`/`PracticeFile` (Task 1) reused in Task 3; `LessonMeta`/`ScenarioType`/`candidatesFor` (Task 2) reused in Task 3; `starterMustFail` (Task 4) reused in its test; `enumerateUnits`/`classifyLesson`/`isFoundation`/`runDebug`/`Level` referenced with the signatures verified from the codebase. The worklist runtime markers (`sandbox-js`/`fix-sql`/…) are produced in Task 3 and consumed by Task 2's policy — consistent. ✓

**Risk note:** the worklist's `incident` candidate set depends on lessons having a `level` of middle/senior/null; a spine lesson mistakenly marked `junior` would be skipped (under-coverage, not wrong content) — acceptable, and visible in the coverage report. `debug` solvability (a correct fix exists) is gated by spot-review, not automation, because the schema has no canonical-solution field; the `verify:scenario` gate proves only that a real bug exists.
