# Step C — Depth Bar + Re-grade Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the depth-audit measure honestly (teaching lessons only, foundations split out, absolute bar instead of label calibration) and add a reusable `--gate` re-grade entry point, then regenerate the committed artifact.

**Architecture:** Modify the existing tool at `site/scripts/depth-audit/`. A new `classify.ts` splits teaching vs auxiliary lessons and names the foundations tracks; `aggregate.ts` scores units over teaching lessons only (no floor); `report.ts` emits a spine/foundations split against an absolute bar; `audit.ts` drops calibration from the default path and adds a `--gate --units` mode with an exit code. `calibrate.ts`/`calibration-set.json` stay as untouched legacy (their tests keep passing).

**Tech Stack:** TypeScript under `bun`, `vitest`. Tests run **from `site/`** as `bunx vitest run scripts/depth-audit/<x>.test.ts`. Pure tests (no fs/url) need no environment annotation. Spec: `docs/superpowers/specs/2026-06-07-step-c-bar-and-regrade-design.md`. Branch `feat/senior-plus-campaign`.

**Note:** `site/scripts/depth-audit/grades.json` exists locally (gitignored, 276 units) — needed only for Task 5's regeneration.

---

## Task 1: classify.ts — teaching vs auxiliary + foundations

**Files:**
- Create: `site/scripts/depth-audit/classify.ts`
- Test: `site/scripts/depth-audit/classify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/depth-audit/classify.test.ts
import { describe, it, expect } from "vitest";
import { classifyLesson, isFoundation, trackOf, FOUNDATIONS } from "./classify";

describe("classifyLesson", () => {
  it("marks project / drill / quiz-* / start-here overviews as auxiliary", () => {
    expect(classifyLesson("databases/02-indexes/project")).toBe("auxiliary");
    expect(classifyLesson("algorithms/03-sorting-search/drill")).toBe("auxiliary");
    expect(classifyLesson("networking/03-tcp-handshake/quiz-choice")).toBe("auxiliary");
    expect(classifyLesson("networking/03-tcp-handshake/quiz-code")).toBe("auxiliary");
    expect(classifyLesson("security/00-start-here/01-overview")).toBe("auxiliary");
  });
  it("marks normal lessons as teaching", () => {
    expect(classifyLesson("networking/03-tcp-handshake/06-bbr-and-production-ops")).toBe("teaching");
    expect(classifyLesson("databases/02-indexes/01-index-anatomy")).toBe("teaching");
  });
});

describe("foundations", () => {
  it("trackOf extracts the track", () => {
    expect(trackOf("base-cs/12-time-and-concurrency")).toBe("base-cs");
  });
  it("isFoundation is true only for math/base-cs/algorithms", () => {
    expect(isFoundation("math/01-numbers")).toBe(true);
    expect(isFoundation("base-cs/12-x")).toBe(true);
    expect(isFoundation("algorithms/03-x")).toBe(true);
    expect(isFoundation("networking/03-x")).toBe(false);
    expect(FOUNDATIONS.has("math")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/classify.test.ts`
Expected: FAIL — `Cannot find module './classify'`.

- [ ] **Step 3: Write classify.ts**

```ts
// scripts/depth-audit/classify.ts
// Beginner /learn tracks — graded but reported separately, not gated against the senior bar.
export const FOUNDATIONS = new Set(["math", "base-cs", "algorithms"]);

export type LessonClass = "teaching" | "auxiliary";

/** Auxiliary = navigation/exercise entries that legitimately score low and must not
 *  count toward a unit's teaching depth: project, drill, quiz-*, 00-start-here overviews. */
export function classifyLesson(lessonKey: string): LessonClass {
  const slug = lessonKey.split("/").pop() ?? "";
  if (slug === "project" || slug === "drill" || slug.startsWith("quiz-")) return "auxiliary";
  if (lessonKey.includes("/00-start-here/")) return "auxiliary";
  return "teaching";
}

export function trackOf(unitKey: string): string {
  return unitKey.split("/")[0];
}

export function isFoundation(unitKey: string): boolean {
  return FOUNDATIONS.has(trackOf(unitKey));
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/classify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/depth-audit/classify.ts site/scripts/depth-audit/classify.test.ts
git commit -m "feat(depth-audit): classify teaching vs auxiliary lessons + foundations set"
```

---

## Task 2: aggregate.ts — teaching-only, drop floor, scored flag

**Files:**
- Modify: `site/scripts/depth-audit/aggregate.ts` (full rewrite)
- Modify: `site/scripts/depth-audit/aggregate.test.ts` (full rewrite — the FLOOR/min behavior is removed)

- [ ] **Step 1: Rewrite the test**

```ts
// scripts/depth-audit/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { aggregateUnit } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const lesson = (key: string, o: number) => ({ lessonKey: key, scores: mk(o), justification: "" });

describe("aggregateUnit (teaching-only)", () => {
  it("averages teaching lessons and ignores auxiliary entries", () => {
    const u: UnitGradeResult = {
      unitKey: "t/u", graderModel: "m",
      grades: [
        lesson("t/u/01-real", 4),
        lesson("t/u/02-real", 2),
        lesson("t/u/project", 0),     // auxiliary — excluded
        lesson("t/u/quiz-choice", 0), // auxiliary — excluded
      ],
    };
    const r = aggregateUnit(u);
    expect(r.teachingCount).toBe(2);
    expect(r.auxiliaryCount).toBe(2);
    expect(r.dimMean.seniorDepth).toBe(3); // (4+2)/2, auxiliary 0s ignored
    expect(r.overall).toBeCloseTo(3, 5);
    expect(r.scored).toBe(true);
  });

  it("passes iff teaching overall >= bar (no per-lesson floor)", () => {
    const u: UnitGradeResult = {
      unitKey: "t/u", graderModel: "m",
      grades: [lesson("t/u/01-junior-intro", 2), lesson("t/u/06-senior", 5)], // mean 3.5
    };
    const r = aggregateUnit(u);
    expect(r.overall).toBeCloseTo(3.5, 5);
    expect(r.passes(3.5)).toBe(true);   // a low junior-tier lesson does NOT fail the unit
    expect(r.passes(3.6)).toBe(false);
  });

  it("marks a unit with no teaching lessons as scored:false and not passing", () => {
    const u: UnitGradeResult = {
      unitKey: "t/u", graderModel: "m",
      grades: [lesson("t/u/project", 3), lesson("t/u/quiz-short", 4)],
    };
    const r = aggregateUnit(u);
    expect(r.scored).toBe(false);
    expect(r.teachingCount).toBe(0);
    expect(r.passes(0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/aggregate.test.ts`
Expected: FAIL (current `aggregateUnit` has no `teachingCount`/`scored`, still applies the floor).

- [ ] **Step 3: Rewrite aggregate.ts**

```ts
// scripts/depth-audit/aggregate.ts
import { DIMENSIONS, type DimScores, type UnitGradeResult } from "./types";
import { weightedOverall } from "./rubric";
import { classifyLesson } from "./classify";

export interface UnitScore {
  unitKey: string;
  scored: boolean;             // false when the unit has no teaching lessons
  teachingCount: number;
  auxiliaryCount: number;
  dimMean: DimScores;          // mean over teaching lessons (all-zero when scored:false)
  overall: number;             // teaching-only weighted mean, 0..5 (0 when scored:false)
  worstTeachingLesson: string | null;
  passes: (bar: number) => boolean;
}

export function aggregateUnit(u: UnitGradeResult): UnitScore {
  const teaching = u.grades.filter((g) => classifyLesson(g.lessonKey) === "teaching");
  const auxiliaryCount = u.grades.length - teaching.length;

  if (teaching.length === 0) {
    const zero = Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as DimScores;
    return {
      unitKey: u.unitKey, scored: false, teachingCount: 0, auxiliaryCount,
      dimMean: zero, overall: 0, worstTeachingLesson: null, passes: () => false,
    };
  }

  const n = teaching.length;
  const dimMean = Object.fromEntries(
    DIMENSIONS.map((d) => [d, teaching.reduce((s, g) => s + g.scores[d], 0) / n]),
  ) as DimScores;
  const overall = weightedOverall(dimMean);
  const worstTeachingLesson = [...teaching]
    .sort((a, b) => weightedOverall(a.scores) - weightedOverall(b.scores))[0].lessonKey;

  return {
    unitKey: u.unitKey, scored: true, teachingCount: n, auxiliaryCount,
    dimMean, overall, worstTeachingLesson,
    passes: (bar: number) => overall >= bar,
  };
}

export function aggregateAll(units: UnitGradeResult[]): UnitScore[] {
  return units.map(aggregateUnit).sort((a, b) => a.overall - b.overall);
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/aggregate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/depth-audit/aggregate.ts site/scripts/depth-audit/aggregate.test.ts
git commit -m "feat(depth-audit): aggregate teaching lessons only, drop per-lesson floor"
```

---

## Task 3: report.ts — spine/foundations split, absolute bar

**Files:**
- Modify: `site/scripts/depth-audit/report.ts` (full rewrite)
- Modify: `site/scripts/depth-audit/report.test.ts` (full rewrite)

- [ ] **Step 1: Rewrite the test**

```ts
// scripts/depth-audit/report.test.ts
import { describe, it, expect } from "vitest";
import { buildReport } from "./report";
import { aggregateUnit } from "./aggregate";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const unit = (key: string, o: number): UnitGradeResult =>
  ({ unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01-x`, scores: mk(o), justification: "j" }] });

describe("buildReport", () => {
  it("splits spine from foundations and gates spine on the absolute bar", () => {
    const scores = [
      aggregateUnit(unit("networking/03-deep", 4)),
      aggregateUnit(unit("apis/01-thin", 3)),
      aggregateUnit(unit("math/01-numbers", 2)), // foundation — not gated
    ];
    const { json, markdown } = buildReport(scores, 3.5);
    expect(json.bar).toBe(3.5);
    expect(json.scale).toBe("absolute");
    expect(json.summary.spineTotal).toBe(2);
    expect(json.summary.spineFailing).toBe(1); // apis 3.0 < 3.5
    expect(json.summary.foundationsCount).toBe(1);
    expect(json.foundations[0].unitKey).toBe("math/01-numbers");
    // spine markdown lists the failing unit and flags FAIL; foundations are in their own section
    expect(markdown).toContain("## Spine");
    expect(markdown).toContain("## Foundations");
    expect(markdown).toContain("FAIL");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/report.test.ts`
Expected: FAIL (current `buildReport` takes a `Calibration` and emits a flat `units` array).

- [ ] **Step 3: Rewrite report.ts**

```ts
// scripts/depth-audit/report.ts
import { DIMENSIONS } from "./types";
import type { UnitScore } from "./aggregate";
import { isFoundation } from "./classify";

interface UnitRow {
  unitKey: string; overall: number; passes: boolean; scored: boolean;
  teachingCount: number; auxiliaryCount: number; worstTeachingLesson: string | null;
  dimMean: Record<string, number>;
}
export interface ScoresJson {
  generatedNote: string;
  bar: number;
  scale: "absolute";
  summary: { spineTotal: number; spinePassing: number; spineFailing: number; foundationsCount: number };
  spine: UnitRow[];
  foundations: UnitRow[];
}

function toRow(s: UnitScore, bar: number): UnitRow {
  return {
    unitKey: s.unitKey, overall: Number(s.overall.toFixed(2)),
    passes: s.scored && s.passes(bar), scored: s.scored,
    teachingCount: s.teachingCount, auxiliaryCount: s.auxiliaryCount,
    worstTeachingLesson: s.worstTeachingLesson,
    dimMean: Object.fromEntries(DIMENSIONS.map((d) => [d, Number(s.dimMean[d].toFixed(2))])),
  };
}

export function buildReport(scores: UnitScore[], bar: number): { json: ScoresJson; markdown: string } {
  const sorted = [...scores].sort((a, b) => a.overall - b.overall); // worst first
  const spine = sorted.filter((s) => !isFoundation(s.unitKey)).map((s) => toRow(s, bar));
  const foundations = sorted.filter((s) => isFoundation(s.unitKey)).map((s) => toRow(s, bar));
  const spineFailing = spine.filter((u) => !u.passes).length;

  const json: ScoresJson = {
    generatedNote: "Generated by scripts/depth-audit. Do not edit by hand.",
    bar, scale: "absolute",
    summary: {
      spineTotal: spine.length, spinePassing: spine.length - spineFailing,
      spineFailing, foundationsCount: foundations.length,
    },
    spine, foundations,
  };

  const row = (u: UnitRow) =>
    `| ${u.passes ? "PASS" : "**FAIL**"} | ${u.overall.toFixed(2)} | ${u.unitKey} | ${u.teachingCount} | ${u.auxiliaryCount} | ${u.worstTeachingLesson ?? "—"} |`;
  const table = (rows: UnitRow[]) =>
    [`| status | overall | unit | teaching | aux | worst teaching lesson |`,
     `|--------|---------|------|----------|-----|-----------------------|`,
     ...rows.map(row)].join("\n");

  const markdown = [
    `# Depth audit — report`,
    ``,
    `Absolute bar = **${bar}** (teaching-lesson weighted mean). Spine: ${spineFailing}/${spine.length} units below bar. Foundations (${foundations.length}) reported separately, not gated.`,
    ``,
    `## Spine (gated)`,
    table(spine),
    ``,
    `## Foundations (not gated — beginner tracks)`,
    table(foundations),
  ].join("\n");

  return { json, markdown };
}
```

- [ ] **Step 4: Run, expect pass**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/report.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/depth-audit/report.ts site/scripts/depth-audit/report.test.ts
git commit -m "feat(depth-audit): report spine/foundations split against an absolute bar"
```

---

## Task 4: audit.ts — absolute bar default + `--gate` mode

**Files:**
- Modify: `site/scripts/depth-audit/audit.ts` (full rewrite)
- Modify: `site/scripts/depth-audit/audit.test.ts` (full rewrite — pure, inline grades, no fixtures)
- Delete: `site/scripts/depth-audit/__fixtures__/grades.json`, `site/scripts/depth-audit/__fixtures__/calibration-set.json` (only the old audit test used them)

> Keep `site/scripts/depth-audit/__fixtures__/content/...` and `__fixtures__/*.mdx` (used by `lessons.test.ts`). Only the two JSON fixtures above are removed.

- [ ] **Step 1: Rewrite the test (pure — inline grades, no fs)**

```ts
// scripts/depth-audit/audit.test.ts
import { describe, it, expect } from "vitest";
import { runAudit, gate, barFromEnv, DEFAULT_BAR } from "./audit";
import type { UnitGradeResult } from "./types";

const mk = (o: number) => ({ mechanism: o, tradeoff: o, failureMode: o, realNumbers: o, seniorDepth: o, practiceCoverage: o });
const unit = (key: string, o: number): UnitGradeResult =>
  ({ unitKey: key, graderModel: "m", grades: [{ lessonKey: `${key}/01-x`, scores: mk(o), justification: "j" }] });

const grades = [unit("networking/03-deep", 4), unit("apis/01-thin", 3), unit("math/01-numbers", 2)];

describe("runAudit", () => {
  it("gates spine units on the bar and lists foundations separately", () => {
    const { json } = runAudit(grades, 3.5);
    expect(json.summary.spineTotal).toBe(2);
    expect(json.summary.spineFailing).toBe(1);
    expect(json.summary.foundationsCount).toBe(1);
  });
});

describe("gate", () => {
  it("returns failing spine units among the named units, ignoring foundations", () => {
    const r = gate(grades, ["apis/01-thin", "math/01-numbers"], 3.5);
    expect(r.failing).toEqual(["apis/01-thin"]); // math is foundation → not gated
  });
  it("passes when the named spine unit clears the bar", () => {
    const r = gate(grades, ["networking/03-deep"], 3.5);
    expect(r.failing).toEqual([]);
  });
});

describe("barFromEnv", () => {
  it("defaults to DEFAULT_BAR and reads DEPTH_BAR when valid", () => {
    expect(barFromEnv({})).toBe(DEFAULT_BAR);
    expect(barFromEnv({ DEPTH_BAR: "4" })).toBe(4);
    expect(barFromEnv({ DEPTH_BAR: "junk" })).toBe(DEFAULT_BAR);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/audit.test.ts`
Expected: FAIL (current `runAudit({grades, labels})` signature + no `gate`/`barFromEnv`).

- [ ] **Step 3: Rewrite audit.ts**

```ts
// scripts/depth-audit/audit.ts
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateUnitGrade } from "./grade-store";
import { aggregateAll } from "./aggregate";
import { buildReport } from "./report";
import { isFoundation } from "./classify";
import type { UnitGradeResult } from "./types";

export const DEFAULT_BAR = 3.5;

export function barFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const v = Number(env.DEPTH_BAR);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_BAR;
}

function validateAll(grades: unknown[]): UnitGradeResult[] {
  return grades.map((g, i) => {
    const v = validateUnitGrade(g);
    if (!v.ok) throw new Error(`grades[${i}] invalid: ${v.error}`);
    return v.value;
  });
}

export function runAudit(grades: unknown[], bar: number) {
  return buildReport(aggregateAll(validateAll(grades)), bar);
}

/** Re-grade gate: among the named units, the failing spine unitKeys (foundations ignored). */
export function gate(grades: unknown[], unitKeys: string[], bar: number): { failing: string[]; checked: string[] } {
  const want = new Set(unitKeys);
  const scores = aggregateAll(validateAll(grades).filter((u) => want.has(u.unitKey)));
  const failing = scores
    .filter((s) => !isFoundation(s.unitKey) && s.scored && !s.passes(bar))
    .map((s) => s.unitKey);
  return { failing, checked: scores.map((s) => s.unitKey) };
}

// CLI
if (import.meta.main) {
  const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
  const argv = process.argv.slice(2);
  const grades = JSON.parse(await readFile(here("./grades.json"), "utf8"));
  const bar = barFromEnv();

  if (argv.includes("--gate")) {
    const idx = argv.indexOf("--units");
    const keys = idx >= 0 ? (argv[idx + 1] ?? "").split(",").filter(Boolean) : [];
    if (keys.length === 0) { console.error("--gate requires --units a/b,c/d"); process.exit(2); }
    const { failing, checked } = gate(grades, keys, bar);
    console.log(`gate: bar=${bar} checked ${checked.length}/${keys.length} requested; ${failing.length} below bar`);
    if (failing.length) { console.error("FAIL: " + failing.join(", ")); process.exit(1); }
    console.log("PASS");
    process.exit(0);
  }

  const { json, markdown } = runAudit(grades, bar);
  const outDir = here("../../../docs/audit");
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/depth-scores.json`, JSON.stringify(json, null, 2));
  await writeFile(`${outDir}/depth-report.md`, markdown);
  console.log(`audit: bar=${bar} spine-failing=${json.summary.spineFailing}/${json.summary.spineTotal} foundations=${json.summary.foundationsCount} -> docs/audit/`);
}
```

- [ ] **Step 4: Delete the now-unused JSON fixtures**

```bash
cd /Users/artemmac/dev/awesome-everything
git rm site/scripts/depth-audit/__fixtures__/grades.json site/scripts/depth-audit/__fixtures__/calibration-set.json
```

- [ ] **Step 5: Run, expect pass**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bunx vitest run scripts/depth-audit/audit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/depth-audit/audit.ts site/scripts/depth-audit/audit.test.ts
git commit -m "feat(depth-audit): absolute DEPTH_BAR default + --gate re-grade mode"
```

---

## Task 5: README + full suite + regenerate the committed artifact

**Files:**
- Modify: `site/scripts/depth-audit/README.md`
- Regenerate (commit): `docs/audit/depth-scores.json`, `docs/audit/depth-report.md`

- [ ] **Step 1: Update the README "Full audit" + add a "Re-grade gate" section**

Replace the `## Model` and `## Re-grade gate` sections of `site/scripts/depth-audit/README.md` so they read:

````markdown
## Bar (absolute)
Pass/fail uses an absolute bar on each unit's **teaching-lesson** weighted mean (auxiliary
entries — start-here overviews, quiz-*, project, drill — are excluded from the score).
Default `DEPTH_BAR=3.5`; override via env. Foundations tracks (math/base-cs/algorithms) are
reported separately and not gated. `calibrate.ts` + `calibration-set.json` are legacy (off
the default path).

## Re-grade gate (after authoring/editing a unit)
1. Re-grade only the changed units (the grading Workflow / cowork) and write their entries
   into `scripts/depth-audit/grades.json`.
2. `cd site && bun scripts/depth-audit/audit.ts --gate --units track/unit-a,track/unit-b`
   → exits 0 if every named spine unit's teaching mean ≥ bar, 1 otherwise (foundations are
   ignored). Use this as a content-quality gate for the capstone or any new lessons.
````

- [ ] **Step 2: Run the full suite**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run test 2>&1 | tail -6`
Expected: all suites pass, including the new `classify` test and the rewritten aggregate/report/audit tests. `calibrate.test.ts` still passes (legacy untouched).

- [ ] **Step 3: Regenerate the committed artifact from the existing grades.json**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run audit:depth`
Expected: prints `audit: bar=3.5 spine-failing=<n>/<spineTotal> foundations=<m> -> docs/audit/`. Per the verdict, `spine-failing` should be near 0.

- [ ] **Step 4: Eyeball the regenerated report**

Run: `cd /Users/artemmac/dev/awesome-everything && node -e "const s=require('./docs/audit/depth-scores.json'); console.log('bar',s.bar,'scale',s.scale, JSON.stringify(s.summary)); console.log('worst spine:', s.spine.slice(0,3).map(u=>u.unitKey+'='+u.overall+(u.passes?'':' FAIL')).join(' | '))"`
Expected: `scale absolute`, a spine/foundations summary, and the worst spine units listed (confirm any FAILs are genuine, not auxiliary-dragged).

- [ ] **Step 5: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/scripts/depth-audit/README.md docs/audit/depth-scores.json docs/audit/depth-report.md
git commit -m "feat(depth-audit): regenerate audit with absolute bar + teaching-only scoring; README"
```

---

## Self-review

**Spec coverage (spec §3):**
- §3.1 absolute bar → Task 4 (`DEFAULT_BAR`/`barFromEnv`), calibration dropped from default.
- §3.2 classify teaching/auxiliary → Task 1.
- §3.3 teaching-only aggregation, drop floor, scored flag → Task 2.
- §3.4 foundations split → Task 1 (`isFoundation`) + Task 3 (report split) + Task 4 (gate ignores foundations).
- §3.5 report spine/foundations + absolute bar → Task 3.
- §3.6 audit default + `--gate` → Task 4.
- §3.7 regenerate + commit → Task 5.
- Legacy calibrate untouched → not modified by any task; its test stays green (verified in Task 5 Step 2).

**Placeholder scan:** none — every code/test step is complete; the README step shows the exact replacement text.

**Type consistency:** `UnitScore` new shape (`scored`/`teachingCount`/`auxiliaryCount`/`overall`/`worstTeachingLesson`/`passes(bar)`) is defined in Task 2 and consumed identically in Task 3 (`toRow`) and Task 4 (`gate`). `buildReport(scores, bar:number)` signature matches between Task 3 (definition) and Task 4 (call). `classifyLesson`/`isFoundation` defined in Task 1, used in Tasks 2/3/4. `runAudit(grades, bar)` + `gate(grades, keys, bar)` + `barFromEnv` defined and tested in Task 4.

**Env-annotation note:** all four test files (classify/aggregate/report/audit) are pure (no fs/url) → no `// @vitest-environment node` needed. (The old audit.test.ts that read fixture files is fully replaced by an inline-grades test.)
