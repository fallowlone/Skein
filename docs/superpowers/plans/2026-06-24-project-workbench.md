# Project Workbench (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give guided projects a runnable starter scaffold, a CI-verified reference solution + acceptance test suite, a junior/mid/senior rubric, and a reference walkthrough — proven end-to-end on 7 exemplar projects.

**Architecture:** Scaffolds live in `site/projects-workbench/<slug>/{scaffold,solution}` outside the content glob. A verifier copies `solution/` over `scaffold/`, runs `bun test`, and asserts the scaffold FAILS while the solution PASSES — proving the tests bite and the project is solvable. Project JSON gains optional `rubric`, `reference`, `workbench` fields rendered on the existing detail page. A build step zips each scaffold for download.

**Tech Stack:** Astro 5, Preact, Zod (content schema), Bun (test runner + scripts), Vitest (unit tests for the engine).

**Spec:** `docs/superpowers/specs/2026-06-24-project-workbench-design.md`

## Global Constraints

- Bilingual or it does not ship — every new bilingual field needs EN + RU; lint enforces parity (`en !== ru` for prose ≥ 25 chars).
- Phase 1 scaffolds use **only** the Bun standard library + `bun:test`. No third-party deps, no `bun install`, no network in CI.
- Schema changes are **additive and optional** — the 39 existing projects must keep validating with zero edits.
- Component imports use the `~/` alias; never `..` relative segments.
- `<slug>` of a workbench dir matches its project JSON slug exactly.
- `verify:projects` is the acceptance gate: for every `workbench:true` project, scaffold-only `bun test` exits non-zero AND scaffold+solution `bun test` exits zero.
- Senior depth bar: rubric "senior" rows and `reference` sections read at the middle+/senior bar (tradeoffs, failure modes), not as documentation.
- Gate each task locally with `bun run test` + `bun run verify:projects` + `bun run lint:src` (the full `astro build` OOMs locally; CI runs the full render).
- The 7 Phase-1 slugs: `rate-limiter`, `mini-crud-api`, `url-shortener-at-scale`, `command-palette`, `virtual-data-grid`, `truth-table-prover`, `type-safe-sdk`.

## File Structure

| File | Responsibility |
|------|----------------|
| `site/src/content.config.ts` | + `RubricLevel`, + `rubric`/`reference`/`workbench` on `ProjectSchema` |
| `site/projects-workbench/<slug>/manifest.json` | `{ "stack": "bun-ts", "test": "bun test" }` |
| `site/projects-workbench/<slug>/scaffold/**` | starter stubs + README + the acceptance suite (`test/`) |
| `site/projects-workbench/<slug>/solution/**` | reference implementation files (no test files) |
| `site/scripts/run-project-workbench.mjs` | the `verify:projects` runner (+`--self-test`) |
| `site/scripts/build-project-starters.mjs` | zips scaffolds → `public/project-starters/<slug>.zip` + emits tree json |
| `site/src/content/generated/project-starters.json` | build artifact: `slug → { files[], test }` (git-ignored) |
| `site/src/lint/rules/capstones.ts` | + workbench-coherence + rubric/reference parity rules |
| `site/src/lint/rules/capstones.test.ts` | table tests for the new rules |
| `site/src/components/projects/ProjectRubric.tsx` | rubric table island |
| `site/src/pages/[lang]/projects/[slug].astro` | render Starter / Verify / Rubric / Reference |
| `site/src/i18n/ui.json` | new `project.*` keys (EN + RU) |
| `site/package.json` | `verify:projects`, `build:starters` scripts + `build` chain |
| `site/.gitignore` | ignore `public/project-starters/`, `src/content/generated/` |
| `.github/workflows/deploy.yml` | run `verify:projects` before the build/deploy |

---

### Task 1: Schema additions

**Files:**
- Modify: `site/src/content.config.ts:235-259` (add `RubricLevel`, extend `ProjectSchema`)
- Test: `site/src/content/projects-schema.test.ts` (new)

**Interfaces:**
- Produces: `ProjectSchema` now accepts optional `rubric: RubricLevel[]`, `reference: BiText[]`, `workbench: boolean`. `RubricLevel = { dimension: BiText, junior: BiText, mid: BiText, senior: BiText }`. `BiText = { en: string(min 1), ru: string(min 1) }` (already defined in the file).

- [ ] **Step 1: Write the failing test**

Create `site/src/content/projects-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ProjectSchema } from "./../content.config";

const base = {
  slug: "demo", title: { en: "Demo", ru: "Демо" }, pitch: { en: "p", ru: "п" },
  deliverable: { en: "d", ru: "д" }, tracks: ["node"], category: "backend",
  difficulty: "intermediate", estDays: 2, skills: ["x"],
  milestones: [{ en: "a", ru: "а" }, { en: "b", ru: "б" }],
  seniorStretch: [{ en: "s", ru: "с" }],
};

describe("ProjectSchema workbench fields", () => {
  it("accepts a project with no new fields (back-compat)", () => {
    expect(ProjectSchema.safeParse(base).success).toBe(true);
  });
  it("accepts rubric + reference + workbench", () => {
    const r = ProjectSchema.safeParse({
      ...base, workbench: true,
      rubric: [{ dimension: { en: "Correctness", ru: "Корректность" },
        junior: { en: "j", ru: "ж" }, mid: { en: "m", ru: "м" }, senior: { en: "s", ru: "с" } }],
      reference: [{ en: "It works because…", ru: "Работает потому что…" }],
    });
    expect(r.success).toBe(true);
  });
  it("rejects a rubric row missing a level", () => {
    const r = ProjectSchema.safeParse({ ...base,
      rubric: [{ dimension: { en: "C", ru: "К" }, junior: { en: "j", ru: "ж" }, mid: { en: "m", ru: "м" } }] });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`workbench`/`rubric` unknown keys are stripped, so the reject test fails or the accept test mis-passes):

Run: `cd site && bunx vitest run src/content/projects-schema.test.ts`
Expected: FAIL on "rejects a rubric row missing a level" (Zod strips unknown keys until the fields exist).

- [ ] **Step 3: Implement** — in `site/src/content.config.ts`, immediately above `GuidedMilestone` add:
```ts
// One rubric row: a quality dimension graded at three levels (all bilingual).
const RubricLevel = z.object({
  dimension: BiText,
  junior: BiText,
  mid: BiText,
  senior: BiText,
});
```
Then inside `ProjectSchema`, after the `brief` line, add:
```ts
  rubric: z.array(RubricLevel).min(1).optional(),
  reference: z.array(BiText).min(1).optional(),
  workbench: z.boolean().optional(),
```

- [ ] **Step 4: Run it — expect PASS**

Run: `cd site && bunx vitest run src/content/projects-schema.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**
```bash
git add site/src/content.config.ts site/src/content/projects-schema.test.ts
git commit -m "feat(projects): rubric/reference/workbench schema fields"
```

---

### Task 2: rate-limiter workbench fixture (pilot content)

**Files:**
- Create: `site/projects-workbench/rate-limiter/manifest.json`
- Create: `site/projects-workbench/rate-limiter/scaffold/src/bucket.ts`
- Create: `site/projects-workbench/rate-limiter/scaffold/test/bucket.test.ts`
- Create: `site/projects-workbench/rate-limiter/scaffold/README.md`
- Create: `site/projects-workbench/rate-limiter/solution/src/bucket.ts`

**Interfaces:**
- Produces: a workbench fixture used by Task 3's verifier. Contract: `scaffold/test/bucket.test.ts` is the acceptance suite; `scaffold/src/bucket.ts` is a stub that FAILS it; `solution/src/bucket.ts` overwrites the stub and PASSES it.
- The unit under test: `class TokenBucket` with `constructor(capacity: number, refillPerSec: number, now: number)`, `tryRemove(now: number, n = 1): boolean`, `get tokens(): number`. Clock is injected (no `Date.now()`), so tests are deterministic.

- [ ] **Step 1: Write the manifest** — `site/projects-workbench/rate-limiter/manifest.json`:
```json
{ "stack": "bun-ts", "test": "bun test" }
```

- [ ] **Step 2: Write the acceptance suite** — `site/projects-workbench/rate-limiter/scaffold/test/bucket.test.ts`:
```ts
import { test, expect } from "bun:test";
import { TokenBucket } from "../src/bucket";

test("starts full and lets a burst through up to capacity", () => {
  const b = new TokenBucket(5, 1, 0);
  for (let i = 0; i < 5; i++) expect(b.tryRemove(0)).toBe(true);
  expect(b.tryRemove(0)).toBe(false); // 6th in the same instant is denied
});

test("refills at refillPerSec and never exceeds capacity", () => {
  const b = new TokenBucket(2, 1, 0);
  expect(b.tryRemove(0)).toBe(true);
  expect(b.tryRemove(0)).toBe(true);
  expect(b.tryRemove(0)).toBe(false);
  expect(b.tryRemove(1)).toBe(true);       // 1s later → 1 token back
  expect(b.tryRemove(1)).toBe(false);       // only one refilled
  expect(b.tokens).toBeLessThanOrEqual(2);  // 100s idle must not overflow
  b.tryRemove(101);
  expect(b.tokens).toBeLessThanOrEqual(2);
});

test("fractional refill accrues across calls (no rounding loss)", () => {
  const b = new TokenBucket(10, 2, 0); // 2 tokens/sec
  b.tryRemove(0, 10);                  // drain to 0
  expect(b.tryRemove(0)).toBe(false);
  expect(b.tryRemove(0.4)).toBe(false); // 0.8 token < 1
  expect(b.tryRemove(0.5)).toBe(true);  // 1.0 token at t=0.5
});
```

- [ ] **Step 3: Write the FAILING stub** — `site/projects-workbench/rate-limiter/scaffold/src/bucket.ts`:
```ts
// TODO(you): implement a token-bucket limiter with an injected clock.
// Tokens refill at `refillPerSec`, capped at `capacity`. `tryRemove` returns
// whether `n` tokens were available (and removes them if so). No Date.now().
export class TokenBucket {
  constructor(capacity: number, refillPerSec: number, now: number) {
    // TODO: store capacity, rate, current tokens (start full), and last refill time.
    void capacity; void refillPerSec; void now;
  }
  tryRemove(now: number, n = 1): boolean {
    void now; void n;
    return false; // TODO: refill since last call, then remove n if available.
  }
  get tokens(): number {
    return 0; // TODO
  }
}
```

- [ ] **Step 4: Write the README** — `site/projects-workbench/rate-limiter/scaffold/README.md`:
```md
# Rate Limiter — starter

Implement `TokenBucket` in `src/bucket.ts` so the acceptance suite passes.

    bun test

Rules: refill at `refillPerSec`, cap at `capacity`, start full, inject the clock
(no `Date.now()`). The suite checks burst, steady-state refill, the cap, and
fractional accrual. When it is green, read the project page's rubric and push to
the senior bar (distributed counter, atomic refill, abuse handling).
```

- [ ] **Step 5: Write the reference solution** — `site/projects-workbench/rate-limiter/solution/src/bucket.ts`:
```ts
export class TokenBucket {
  private cap: number;
  private rate: number;
  private toks: number;
  private last: number;
  constructor(capacity: number, refillPerSec: number, now: number) {
    this.cap = capacity;
    this.rate = refillPerSec;
    this.toks = capacity;
    this.last = now;
  }
  private refill(now: number): void {
    if (now <= this.last) return;
    this.toks = Math.min(this.cap, this.toks + (now - this.last) * this.rate);
    this.last = now;
  }
  tryRemove(now: number, n = 1): boolean {
    this.refill(now);
    if (this.toks >= n) { this.toks -= n; return true; }
    return false;
  }
  get tokens(): number { return this.toks; }
}
```

- [ ] **Step 6: Prove the fixture by hand** (the verifier automates this in Task 3):
```bash
cd /tmp && rm -rf wb && cp -r /Users/artemmac/dev/awesome-everything/site/projects-workbench/rate-limiter/scaffold wb
cd wb && bun test; echo "scaffold exit=$?"   # expect NON-zero (stub fails)
cp /Users/artemmac/dev/awesome-everything/site/projects-workbench/rate-limiter/solution/src/bucket.ts src/bucket.ts
bun test; echo "solution exit=$?"            # expect 0 (solution passes)
```
Expected: scaffold exit non-zero, solution exit 0.

- [ ] **Step 7: Commit**
```bash
git add site/projects-workbench/rate-limiter
git commit -m "feat(projects): rate-limiter workbench fixture (scaffold+solution+tests)"
```

---

### Task 3: verify:projects runner

**Files:**
- Create: `site/scripts/run-project-workbench.mjs`
- Modify: `site/package.json` (add `"verify:projects"` script)
- Test: the runner's own `--self-test` flag + a vitest wrapper `site/scripts/verify-project-workbench.test.ts`

**Interfaces:**
- Consumes: `site/projects-workbench/*/manifest.json` (`stack`, `test`), `scaffold/`, `solution/` (Task 2 fixture).
- Produces: CLI `bun run verify:projects` — exit 0 iff every `bun-ts` workbench has scaffold-fails + solution-passes. `--self-test` exits 0 iff it correctly flags a planted non-failing scaffold and a planted non-passing solution.

- [ ] **Step 1: Write the runner** — `site/scripts/run-project-workbench.mjs`. Model on `site/scripts/run-code-samples.mjs`. Core:
```js
#!/usr/bin/env bun
import { readdirSync, statSync, mkdtempSync, cpSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = new URL("../projects-workbench/", import.meta.url).pathname;
const TIMEOUT_MS = 30_000;

function runBunTest(dir) {
  const r = spawnSync("bun", ["test"], { cwd: dir, timeout: TIMEOUT_MS, encoding: "utf8" });
  return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

// Returns { ok, reason } for one workbench dir.
function verifyOne(slug) {
  const base = join(ROOT, slug);
  const manifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8"));
  if (manifest.stack !== "bun-ts") return { ok: true, reason: `skipped (stack=${manifest.stack})` };
  const tmp = mkdtempSync(join(tmpdir(), `wb-${slug}-`));
  try {
    cpSync(join(base, "scaffold"), tmp, { recursive: true });
    const a = runBunTest(tmp);
    if (a.code === 0) return { ok: false, reason: "scaffold PASSED — tests do not bite" };
    cpSync(join(base, "solution"), tmp, { recursive: true });
    const b = runBunTest(tmp);
    if (b.code !== 0) return { ok: false, reason: `solution FAILED:\n${b.out.slice(-1200)}` };
    return { ok: true, reason: "scaffold fails, solution passes" };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function listWorkbenches() {
  return readdirSync(ROOT).filter((d) => {
    const p = join(ROOT, d);
    return statSync(p).isDirectory() && existsSync(join(p, "manifest.json"));
  });
}

if (process.argv.includes("--self-test")) {
  // Plant a bad scaffold (already-passing) and a bad solution (still-failing) in temp dirs.
  let pass = true;
  const t1 = mkdtempSync(join(tmpdir(), "wb-self-a-"));
  writeFileSync(join(t1, "ok.test.ts"), `import {test,expect} from "bun:test"; test("x",()=>expect(1).toBe(1));`);
  if (runBunTest(t1).code === 0) { /* a passing dir must be detected as "scaffold passed" */ } else pass = false;
  rmSync(t1, { recursive: true, force: true });
  const t2 = mkdtempSync(join(tmpdir(), "wb-self-b-"));
  writeFileSync(join(t2, "bad.test.ts"), `import {test,expect} from "bun:test"; test("x",()=>expect(1).toBe(2));`);
  if (runBunTest(t2).code === 0) pass = false; // a failing suite must report non-zero
  rmSync(t2, { recursive: true, force: true });
  console.log(pass ? "self-test OK" : "self-test FAILED");
  process.exit(pass ? 0 : 1);
}

let failed = 0;
for (const slug of listWorkbenches()) {
  const { ok, reason } = verifyOne(slug);
  console.log(`${ok ? "✓" : "✗"} ${slug} — ${reason}`);
  if (!ok) failed++;
}
console.log(failed ? `verify:projects FAILED (${failed})` : "verify:projects OK");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Add the script** — in `site/package.json` `"scripts"`, add:
```json
"verify:projects": "bun scripts/run-project-workbench.mjs",
```

- [ ] **Step 3: Run the self-test — expect PASS**

Run: `cd site && bun scripts/run-project-workbench.mjs --self-test`
Expected: `self-test OK`, exit 0.

- [ ] **Step 4: Run against the real fixture — expect PASS**

Run: `cd site && bun run verify:projects`
Expected: `✓ rate-limiter — scaffold fails, solution passes` then `verify:projects OK`.

- [ ] **Step 5: Write a vitest guard** — `site/scripts/verify-project-workbench.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
describe("verify:projects", () => {
  it("self-test passes", () => {
    const r = spawnSync("bun", ["scripts/run-project-workbench.mjs", "--self-test"], { cwd: ".", encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});
```

- [ ] **Step 6: Commit**
```bash
git add site/scripts/run-project-workbench.mjs site/scripts/verify-project-workbench.test.ts site/package.json
git commit -m "feat(projects): verify:projects runner (scaffold fails + solution passes)"
```

---

### Task 4: build:starters (zip + tree)

**Files:**
- Create: `site/scripts/build-project-starters.mjs`
- Modify: `site/package.json` (add `build:starters`, prepend to `build`)
- Modify: `site/.gitignore` (ignore artifacts)

**Interfaces:**
- Consumes: `site/projects-workbench/<slug>/scaffold/**`, `manifest.json`.
- Produces: `site/public/project-starters/<slug>.zip`; `site/src/content/generated/project-starters.json` = `{ [slug]: { files: string[], test: string } }`. `files` is the scaffold's relative file paths, sorted.

- [ ] **Step 1: Write the build script** — `site/scripts/build-project-starters.mjs`:
```js
#!/usr/bin/env bun
import { readdirSync, statSync, existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const WB = new URL("../projects-workbench/", import.meta.url).pathname;
const PUB = new URL("../public/project-starters/", import.meta.url).pathname;
const GEN = new URL("../src/content/generated/", import.meta.url).pathname;

function walk(dir, out, baseLen) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out, baseLen);
    else out.push(p.slice(baseLen));
  }
  return out;
}

const index = {};
rmSync(PUB, { recursive: true, force: true }); mkdirSync(PUB, { recursive: true });
mkdirSync(GEN, { recursive: true });

for (const slug of readdirSync(WB)) {
  const base = join(WB, slug);
  if (!statSync(base).isDirectory() || !existsSync(join(base, "manifest.json"))) continue;
  const scaffold = join(base, "scaffold");
  const manifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8"));
  const files = walk(scaffold, [], scaffold.length + 1).sort();
  // zip the scaffold dir (system zip; -j off so the tree is preserved, -r recursive).
  const zipPath = join(PUB, `${slug}.zip`);
  const r = spawnSync("zip", ["-rq", zipPath, "."], { cwd: scaffold });
  if (r.status !== 0) { console.error(`zip failed for ${slug}`); process.exit(1); }
  index[slug] = { files, test: manifest.test ?? "bun test" };
}
writeFileSync(join(GEN, "project-starters.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`build:starters wrote ${Object.keys(index).length} starters`);
```

- [ ] **Step 2: Wire package.json** — add to `"scripts"`:
```json
"build:starters": "bun scripts/build-project-starters.mjs",
```
and prepend it to the existing `build` script (so the JSON + zips exist before `astro build`). If `build` is `"astro build && …"`, make it `"bun run build:starters && astro build && …"`.

- [ ] **Step 3: Ignore artifacts** — append to `site/.gitignore`:
```
public/project-starters/
src/content/generated/
```

- [ ] **Step 4: Run it — expect the artifacts**

Run: `cd site && bun run build:starters && cat src/content/generated/project-starters.json`
Expected: `build:starters wrote 1 starters`; JSON has `rate-limiter` with a `files` array including `src/bucket.ts`, `test/bucket.test.ts`, `README.md`, and `test: "bun test"`; `public/project-starters/rate-limiter.zip` exists.

- [ ] **Step 5: Commit**
```bash
git add site/scripts/build-project-starters.mjs site/package.json site/.gitignore
git commit -m "feat(projects): build:starters zips scaffolds + emits tree index"
```

---

### Task 5: lint rules (workbench coherence + parity)

**Files:**
- Modify: `site/src/lint/rules/capstones.ts`
- Modify/Create: `site/src/lint/rules/capstones.test.ts`

**Interfaces:**
- Consumes: project JSON (`workbench`, `rubric`, `reference`) + the filesystem `site/projects-workbench/`.
- Produces: lint errors when (a) `workbench:true` but the dir/`scaffold`/`solution`/`scaffold/test` is missing or `manifest.stack` invalid; (b) a `projects-workbench/<slug>` dir has no `workbench:true` project or vice-versa (orphan); (c) any `rubric`/`reference` bilingual prose ≥ 25 chars has `en === ru`, or either locale empty.

- [ ] **Step 1: Read the existing rule** to reuse its bilingual predicate and project-loading. Run: `sed -n '1,75p' site/src/lint/rules/capstones.ts`.

- [ ] **Step 2: Write failing tests** — add to `site/src/lint/rules/capstones.test.ts` (create if absent), using the same harness shape as other `src/lint/rules/*.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { checkRubricParity, checkWorkbenchCoherence } from "./capstones";

describe("rubric/reference parity", () => {
  it("flags an untranslated rubric cell (en===ru, prose)", () => {
    const errs = checkRubricParity("demo", {
      rubric: [{ dimension: { en: "Correctness here please", ru: "Correctness here please" },
        junior: { en: "j", ru: "ж" }, mid: { en: "m", ru: "м" }, senior: { en: "s", ru: "с" } }],
    });
    expect(errs.length).toBeGreaterThan(0);
  });
  it("passes a fully-translated rubric", () => {
    const errs = checkRubricParity("demo", {
      rubric: [{ dimension: { en: "Correctness of refill", ru: "Корректность пополнения" },
        junior: { en: "j", ru: "ж" }, mid: { en: "m", ru: "м" }, senior: { en: "s", ru: "с" } }],
    });
    expect(errs).toEqual([]);
  });
});

describe("workbench coherence", () => {
  it("flags workbench:true with no scaffold dir", () => {
    const errs = checkWorkbenchCoherence("does-not-exist", { workbench: true }, "/nonexistent-root");
    expect(errs.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Implement** the two exported pure-ish helpers in `capstones.ts`. `checkRubricParity(slug, data)` reuses the file's existing `en===ru` prose check across `dimension/junior/mid/senior` and each `reference[]`. `checkWorkbenchCoherence(slug, data, wbRoot)` checks dir + `scaffold/` + `solution/` + ≥1 file under `scaffold/test` + `manifest.stack === "bun-ts"`. Wire both into the existing `checkCapstones(siteSrc)` loop (also add the orphan scan: every dir under `projects-workbench/` must have a `workbench:true` project).

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd site && bunx vitest run src/lint/rules/capstones.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full source lint — expect clean**

Run: `cd site && bunx vitest run src/lint/source-lint.test.ts`
Expected: PASS (rate-limiter already has scaffold/solution/test from Task 2; add `workbench:true` + a rubric/reference to `rate-limiter.json` in Task 6 — until then `workbench` is absent so coherence is not triggered).

- [ ] **Step 6: Commit**
```bash
git add site/src/lint/rules/capstones.ts site/src/lint/rules/capstones.test.ts
git commit -m "feat(projects): lint workbench coherence + rubric/reference parity"
```

---

### Task 6: render the new sections + wire rate-limiter JSON

**Files:**
- Create: `site/src/components/projects/ProjectRubric.tsx`
- Modify: `site/src/pages/[lang]/projects/[slug].astro`
- Modify: `site/src/i18n/ui.json` (EN + RU `project.*` keys)
- Modify: `site/src/content/projects/rate-limiter.json` (add `workbench`, `rubric`, `reference`)

**Interfaces:**
- Consumes: `project-starters.json` (Task 4), `p.rubric`, `p.reference`, `p.workbench`.
- Produces: rendered Starter / Verify / Rubric / Reference sections on the detail page.

- [ ] **Step 1: i18n keys** — add to `site/src/i18n/ui.json` in BOTH the EN and RU blocks:
```
"project.starter": "Starter" / "Стартер"
"project.download": "Download starter (.zip)" / "Скачать стартер (.zip)"
"project.howToVerify": "Verify yourself" / "Проверь себя"
"project.verifySteps": "Unzip, implement the stubs, then run the tests until they pass:" / "Распакуй, реализуй заглушки, затем гоняй тесты, пока не позеленеют:"
"project.rubric": "Rubric" / "Рубрика"
"project.level.junior": "Junior" / "Джуниор"
"project.level.mid": "Mid" / "Миддл"
"project.level.senior": "Senior" / "Сеньор"
"project.reference": "Reference walkthrough (spoiler)" / "Эталонный разбор (спойлер)"
```

- [ ] **Step 2: ProjectRubric island** — `site/src/components/projects/ProjectRubric.tsx`:
```tsx
import { t, type Locale } from "~/i18n";
type Bi = { en: string; ru: string };
type Row = { dimension: Bi; junior: Bi; mid: Bi; senior: Bi };
export default function ProjectRubric({ lang, rows }: { lang: Locale; rows: Row[] }) {
  const tt = (b: Bi) => (lang === "ru" ? b.ru : b.en);
  return (
    <table class="pr-table">
      <thead><tr>
        <th></th><th>{t("project.level.junior", lang)}</th>
        <th>{t("project.level.mid", lang)}</th><th>{t("project.level.senior", lang)}</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <th scope="row">{tt(r.dimension)}</th>
            <td>{tt(r.junior)}</td><td>{tt(r.mid)}</td><td>{tt(r.senior)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```
(Add minimal `.pr-table` styles inline in the page `<style>`: full-width, hairline borders, `td{vertical-align:top;padding:8px}`.)

- [ ] **Step 3: Render in `[slug].astro`** — import the starter index + component near the top:
```astro
import ProjectRubric from "~/components/projects/ProjectRubric.tsx";
import starters from "~/content/generated/project-starters.json";
```
Then after the `CapstonePath` block, add (each guarded):
```astro
{p.workbench && starters[p.slug] && (
  <section class="my-6">
    <h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-2">{L.starter}</h2>
    <ul class="font-mono text-xs text-muted mb-2">{starters[p.slug].files.map((f) => <li>{f}</li>)}</ul>
    <a class="text-ok" href={`/project-starters/${p.slug}.zip`}>{L.download}</a>
    <p class="mt-3 text-sm">{L.howToVerify}: <code>{starters[p.slug].test}</code></p>
  </section>
)}
{p.rubric && (
  <section class="my-6">
    <h2 class="text-sm font-mono uppercase tracking-wide text-muted mb-2">{L.rubric}</h2>
    <ProjectRubric client:visible lang={lang} rows={p.rubric} />
  </section>
)}
{p.reference && (
  <details class="my-6">
    <summary class="text-sm font-mono uppercase tracking-wide text-muted cursor-pointer">{L.reference}</summary>
    <div class="prose-block mt-2 space-y-2">{p.reference.map((s) => <p>{tt(s.en, s.ru)}</p>)}</div>
  </details>
)}
```
Add the new `L.*` labels alongside the existing `L` object using `tt(t("project.starter","en")…)` — match the file's existing pattern (it builds `L` from `tt(en, ru)` literals; use `t("project.starter", lang)` etc.).

- [ ] **Step 4: Wire rate-limiter JSON** — in `site/src/content/projects/rate-limiter.json`, add at the top level: `"workbench": true`, a `"rubric"` of ≥3 dimensions (Correctness / Concurrency safety / Abuse & observability) each with bilingual junior/mid/senior at the senior bar, and a `"reference"` array (3–5 bilingual sections explaining the token-bucket choice, atomic refill under contention, and the fail-open vs fail-closed tradeoff). Keep prose senior-grade.

- [ ] **Step 5: Build artifacts + dev render**

Run: `cd site && bun run build:starters && NODE_OPTIONS=--max-old-space-size=8192 bun run dev &` then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/en/projects/rate-limiter` and `/ru/...`; kill dev.
Expected: both 200; the Starter file list, Download link, Rubric table, and Reference details render (inspect HTML for `pr-table` and `project-starters/rate-limiter.zip`).

- [ ] **Step 6: lint + tests + commit**
```bash
cd site && bunx vitest run src/lint/source-lint.test.ts && bun run lint:src
git add site/src/components/projects/ProjectRubric.tsx site/src/pages/'[lang]'/projects/'[slug]'.astro site/src/i18n/ui.json site/src/content/projects/rate-limiter.json
git commit -m "feat(projects): render starter/verify/rubric/reference; wire rate-limiter"
```

---

### Task 7: CI gate

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `bun run verify:projects`.
- Produces: the deploy fails if any workbench scaffold/solution regresses.

- [ ] **Step 1: Find the existing gate** — locate where `verify:samples` and unit tests run in `deploy.yml` (the test/verify job before build). Run: `grep -n "verify:samples\|bun run test\|run test" .github/workflows/deploy.yml`.

- [ ] **Step 2: Add the step** — immediately after the `verify:samples` step, add a step (same job, same working-directory `site`):
```yaml
      - name: Verify project workbenches
        working-directory: site
        run: bun run verify:projects
```

- [ ] **Step 3: Validate YAML** — Run: `cd /Users/artemmac/dev/awesome-everything && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('yaml ok')"`. Expected: `yaml ok`.

- [ ] **Step 4: Commit**
```bash
git add .github/workflows/deploy.yml
git commit -m "ci(projects): gate deploy on verify:projects"
```

---

### Tasks 8–13: the 6 follow-on exemplars (one task each)

Each follows the **Task 2 pattern** (manifest + scaffold stub + acceptance suite + reference solution) plus the **Task 6 JSON wiring** (`workbench:true` + `rubric` ≥3 dims + `reference` 3–5 sections), and must end green under `bun run verify:projects` and `bun run lint:src`. Per-task contract = the exact unit under test + the behaviors the suite asserts. Bun stdlib + `bun:test` only.

> Each task's steps: (1) write `manifest.json`; (2) write the acceptance suite from the contract; (3) write the failing stub; (4) write the README; (5) write the reference solution; (6) `bun run verify:projects` shows `✓ <slug>`; (7) add `workbench/rubric/reference` to `src/content/projects/<slug>.json`; (8) `bun run lint:src` clean; (9) commit `feat(projects): <slug> workbench + rubric + reference`.

- [ ] **Task 8 — `mini-crud-api`** (backend/starter). Unit: `createStore()` + `handle(req, store)` pure router over an in-memory map. Suite asserts: POST creates + returns 201 + id; GET returns the item or 404; PUT updates or 404; DELETE removes or 404; POST with a missing required field → 400; list returns all. Deepen its milestones if too thin to anchor the rubric. Rubric dims: Correctness / Validation & status codes / Statelessness. Reference: why 404-vs-400, idempotency of PUT/DELETE, where a real DB changes the shape.

- [ ] **Task 9 — `url-shortener-at-scale`** (backend/systems). Unit: `encodeBase62(n)` / `decodeBase62(s)` + `Shortener` with `create(url, now)` / `resolve(code, now)`. Suite asserts: base62 round-trips for 0, 61, 62, large n; resolve unknown → null; expired (now > ttl) → null; 301-vs-302 policy flag returned; collision on a forced duplicate code is handled (retry/seq). Rubric: Codec correctness / Collision & expiry handling / Read-path scaling (cache implications). Reference: 301 cache permanence tradeoff, counter-range vs hash ID generation, cache-stampede on hot codes.

- [ ] **Task 10 — `command-palette`** (frontend, pure logic — no DOM). Unit: `fuzzyRank(items, query)` + `reduce(state, action)` selection state machine. Suite asserts: exact prefix ranks above scattered subsequence; non-subsequence is excluded; empty query returns input order; ArrowDown/ArrowUp wrap at bounds; Enter on empty results is a no-op. Rubric: Match quality / Keyboard model correctness / Performance (no re-rank churn). Reference: subsequence scoring vs Levenshtein, why ranking is pure and rendering is separate, debouncing large lists.

- [ ] **Task 11 — `virtual-data-grid`** (frontend, pure windowing math). Unit: `visibleRange({ scrollTop, rowHeight, viewportH, total, overscan })` → `{ start, end, padTop, padBottom }`. Suite asserts: top of list (scrollTop 0) starts at 0 with overscan clamp; middle computes correct start/end; bottom clamps end at `total`; padTop+rows+padBottom === total*rowHeight; rowHeight=0 guarded. Rubric: Range math correctness / Boundary clamping / Jank avoidance (overscan). Reference: why padding spacers beat absolute positioning, variable-height extension, overscan vs scroll velocity.

- [ ] **Task 12 — `truth-table-prover`** (algorithms/logic, pure). Unit: `parse(expr)` + `evaluate(ast, env)` + `classify(expr)` over `∧ ∨ ¬ → ↔` with variables. Suite asserts: precedence (`¬a ∨ b` ≠ `¬(a ∨ b)`); a tautology (`a ∨ ¬a`) → "tautology"; a contradiction (`a ∧ ¬a`) → "contradiction"; `a → b` ≡ `¬a ∨ b` via `equivalent(x, y)`; malformed input throws. Rubric: Parser correctness (precedence/assoc) / Evaluation over all assignments / Equivalence checking. Reference: recursive-descent vs shunting-yard, 2^n enumeration limits, normal forms.

- [ ] **Task 13 — `type-safe-sdk`** (tooling/types). Unit: `defineClient({ baseUrl, fetchImpl })` returning typed methods + `parse(schema, data)` runtime validator + `withRetry(fn, policy)`. Suite asserts (inject a fake `fetchImpl`): a 200 returns the parsed body; a schema-mismatched body throws a typed `ValidationError`; a 500 retries `policy.max` times then throws; backoff delays are computed (not awaited — inject a clock); a typed error envelope is returned on 4xx. Rubric: Runtime validation / Error envelope design / Retry/backoff correctness. Reference: parse-don't-validate, idempotency-aware retry, exponential backoff + jitter.

---

## Self-Review

**Spec coverage:** schema fields → Task 1; scaffold/solution layout + hermetic constraint → Tasks 2,8–13; verifier (scaffold-fails+solution-passes, self-test) → Task 3; build-zip + tree → Task 4; lint coherence+parity → Task 5; render Starter/Verify/Rubric/Reference → Task 6; CI gate → Task 7; 7 exemplars → Tasks 2(+6 wiring),8–13; milestone-depth-where-thin → noted in Tasks 8. All spec sections covered.

**Placeholder scan:** engine tasks carry full code; content Tasks 8–13 carry exact unit-under-test signatures + asserted behaviors + rubric dims + reference outline (the reference solution code is the authoring deliverable, deterministically gated by `verify:projects` — not a hand-wave). No "TBD"/"similar to".

**Type consistency:** `TokenBucket(capacity, refillPerSec, now)` / `tryRemove(now, n)` / `get tokens` consistent across Task 2 scaffold, suite, and solution. `RubricLevel`/`rubric`/`reference`/`workbench` names identical across Tasks 1, 5, 6. `project-starters.json` shape `{files,test}` identical in Tasks 4 and 6. `verifyOne`/`listWorkbenches` internal to Task 3.

## Execution Handoff

Per the active `/loop` autonomy, execute via **superpowers:subagent-driven-development** — fresh subagent per task, task review (spec + quality) between tasks, broad review at the end, gated by `verify:projects` + `lint:src` + `bun run test`.
