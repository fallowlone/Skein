# Tier expansion Phase A1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the verification pipeline + tier-sizing linter rules + updated `/infographic` command so subsequent piece authoring (Phase B) is gated by automated checks.

**Architecture:** Two linter rules over compiled HTML, one subagent + slash command for fact + completeness verification, one slash-command doc update. No new framework, no runtime changes to site behavior.

**Tech Stack:** TypeScript (linter rules), Vitest (tests), Markdown (commands/agents), Astro 5 build integration (existing `lintCurriculum`).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `.claude/agents/verify-piece.md` | Create | Subagent definition: read piece MDX, fetch sources, check completeness/facts/i18n |
| `.claude/commands/verify-piece.md` | Create | Slash command that dispatches the subagent with piece slug arg |
| `.claude/commands/infographic.md` | Modify | Extend pipeline: enforce new tier sizing, exercise counts, call `/verify-piece` before commit |
| `site/src/lint/rules/tier-word-budgets.ts` | Create | Per-tier word count rule (jr 200-500 / mid 2500-3500 / sr 2500-4000) |
| `site/src/lint/rules/tier-word-budgets.test.ts` | Create | Vitest cases |
| `site/src/lint/rules/exercise-counts.ts` | Create | Per-tier exercise component count rule (jr=5, mid=8, sr=7) — warnings only |
| `site/src/lint/rules/exercise-counts.test.ts` | Create | Vitest cases |
| `site/src/lint/index.ts` | Modify | Wire two new rules; tier-word as errors, exercise-counts as warnings |

8 files. ~13 tasks (each with TDD steps).

---

## Assumptions

- Linter detects tier content via existing TierAccordion DOM contract: `<div data-tier-panel="junior|middle|senior">…</div>` (rendered server-side by TierAccordion.astro).
- Exercise components are detected by tag name in compiled HTML (e.g., `astro-island` with `component-export` matching `Quiz`, `FadedExample`, etc.) OR by stable wrapper class. For Phase A1 we use **tag-name regex over compiled HTML**, listing only currently-shipped components (FadedExample, RetrievalDrawer, Sandbox); future components added in A2/A3 extend the list.
- For pieces not yet migrated to the new tier mix, exercise-count rule emits warnings, not errors. Tier-word-budget rule emits warnings when tier word count is outside budget (NOT errors) for backwards compat with current pieces. Promotion to errors happens in a follow-up commit after Phase B migrates pieces.
- Verify-piece subagent receives piece slug as input string (e.g. `networking/03-tcp-handshake`); it reads both EN and RU MDX files via standard path convention.

---

## Task 1: Verify-piece subagent definition

**Files:**
- Create: `.claude/agents/verify-piece.md`

- [ ] **Step 1: Create subagent file**

```markdown
---
name: verify-piece
description: Verifies a single curriculum piece (EN + RU) against its sources, completeness checklist, depth bar, i18n parity, and exercise inventory. Use after authoring a piece and before commit. Input is the piece slug (e.g. `networking/03-tcp-handshake`).
tools: Read, Glob, Grep, WebFetch, Bash
---

# verify-piece subagent

Verify one curriculum piece end-to-end. Read both language MDX files, fetch every source, cross-check verifiable claims, validate completeness against the tier checklist, confirm i18n parity, and emit findings.

## Input

Single argument: piece slug in form `<pillar>/<NN-piece>` (e.g. `networking/03-tcp-handshake`).

## Files to read

- `site/src/content/book/en/<pillar>/<piece>/index.mdx`
- `site/src/content/book/ru/<pillar>/<piece>/index.mdx`

If either is missing → abort with error and report missing file.

## Checks (run in order, emit findings per check)

### 1. Facts (against sources)

- Parse `sources:` array from EN frontmatter.
- For each source URL: `WebFetch` and extract content.
- Identify specific verifiable claims in the EN piece: numbers (RTT, packet sizes, timeouts, defaults), protocol behaviors (RFC mandates), version/standard specs, deprecations/dates.
- Compare each claim. Emit one line per finding:
  - `✓ <claim> — source confirms`
  - `⚠ <claim> — nuance: <issue> [source ref]`
  - `✗ <claim> — INCORRECT: <correct value> [source ref]`
  - `? missing: <important spec point> — [source ref]`

### 2. Completeness checklist

Read tier panels from MDX (`<Fragment slot="junior">…</Fragment>`, slot="middle", slot="senior").

**Junior tier checks:**
- Contains ≥1 `<PersonaTag` (persona dialog)
- Contains metaphor phrase (regex: words like "like a", "similar to", "imagine", "представь", "как" near beginning)
- Word count 200-500

Emit:
- `✓ junior: metaphor + persona dialog present`
- `⚠ junior: missing metaphor cue`
- `✗ junior: word count XX (target 200-500)`

**Middle tier checks:**
- Contains `<Crux` (1 instance, in piece body not necessarily in middle slot)
- Contains `<NumbersCard` OR `data-text-class="annot"`
- Contains `<Misconception`
- Contains ≥1 `<FadedExample`
- Contains ≥2 retrieval Q entries (look for `id: "q[0-9]` in RetrievalDrawer)
- Word count 2500-3500

**Senior tier checks:**
- Contains ≥3 RFC refs (regex `RFC \d{4}`)
- Contains kernel/tunables refs (regex `/proc/|sysctl|tcp_|net\.`)
- Word count 2500-4000

**Universal checks:**
- ≥1 `<SpiralCue` per piece
- `sources:` array ≥3 entries
- `KeyTakeaway` present (look for `<KeyTakeaway` or `data-text-class="key-takeaway"`)
- `SpacedRevisitBanner` referenced (in Topic.astro chain, can confirm via build output)

### 3. Depth-bar word budgets

Per-tier word counts within budget (see above). Emit ✗ if violated.

### 4. i18n parity

Compare EN vs RU MDX:
- Component count parity (number of `<TierAccordion`, `<FadedExample`, `<Crux`, `<KeyTakeaway`, `<NumbersCard`, `<Misconception`, `<RetrievalDrawer` blocks must match)
- Persona id sets match (extract from `id="..."` of `<PersonaTag`)
- Sources array length matches

Emit ✗ per mismatch.

### 5. Cross-link validity

- `prereqs:` slugs in frontmatter — verify each exists in `site/src/content/book/en/<pillar>/<slug>/index.mdx`.
- Source URLs (subset of 3 sampled): verify reachable via WebFetch (200 OK).

### 6. Hydration cap

Count `astro-island` tags in compiled `site/dist/<lang>/<pillar>/<piece>/index.html`. Fail if > 5.

(If `dist/` not present, skip this check and emit `? dist not built — run \`bun run build\` first`.)

### 7. Exercise mix (warnings)

Count exercise components per tier panel (Quiz, FadedExample, RetrievalDrawer, TraceScenario, DebugLog, TradeoffMatrix, DragOrder, MetaphorComplete, RFCQuiz, DesignPrompt, NumberDrill, Sandbox). Target: jr=5, mid=8, sr=7. Emit ⚠ per shortfall.

## Output

Write findings to `site/dist/verify-reports/<piece-slug-flat>.md` (create dir if missing). Slug-flat = slashes replaced by `-`. Console print: bulleted summary with counts of ✓/⚠/✗/? + path to full report.

## Output format

```
# Verify report: <slug>
Date: <ISO 2026-MM-DD>
EN file: <path>
RU file: <path>

## Facts
<bulleted findings>

## Completeness
<bulleted findings>

## Depth bar
<bulleted findings>

## i18n parity
<bulleted findings>

## Cross-links
<bulleted findings>

## Hydration
<bulleted finding>

## Exercise mix
<bulleted findings>

## Summary
✓: N
⚠: N
✗: N
?: N
```

## Termination

Subagent runs all checks. Does not exit early on first ✗. User reviews report, decides to fix or accept.
```

- [ ] **Step 2: Verify file created**

Run: `test -f .claude/agents/verify-piece.md && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/verify-piece.md
git commit -m "feat(verify): add verify-piece subagent definition"
```

---

## Task 2: Verify-piece slash command

**Files:**
- Create: `.claude/commands/verify-piece.md`

- [ ] **Step 1: Create command file**

```markdown
---
description: Verify a curriculum piece (EN + RU) against sources, completeness, i18n parity, hydration cap. Use after authoring.
argument-hint: <pillar>/<NN-piece>
allowed-tools: Agent
---

# /verify-piece — automated piece QA

**Input:** `$ARGUMENTS` — piece slug, e.g. `networking/03-tcp-handshake`.

**Behavior:**

1. Validate `$ARGUMENTS` matches `<pillar>/<NN-piece>` form. Refuse if not.
2. Confirm `site/src/content/book/en/$ARGUMENTS/index.mdx` exists. Refuse if missing.
3. Dispatch the `verify-piece` subagent with the slug:

   ```
   Agent({
     subagent_type: "verify-piece",
     description: "Verify piece <slug>",
     prompt: "Verify piece: <slug>. Run all 7 check categories per the subagent spec. Write report to site/dist/verify-reports/<slug-flat>.md. Print summary."
   })
   ```

4. After subagent completes, print:
   - Path to full report file
   - Summary counts (✓/⚠/✗/?)
   - First 5 ✗ findings (if any)
   - Suggested next action: "fix listed errors, then re-run /verify-piece" or "ok to commit"

**Hard rules:**

- Never invoke fact-corrections directly. This command is read-only verification. User decides to fix.
- Never write to MDX files. Only to `site/dist/verify-reports/`.
- If `site/dist/` is missing, instruct user to run `bun run build` first.
```

- [ ] **Step 2: Verify file created**

Run: `test -f .claude/commands/verify-piece.md && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/verify-piece.md
git commit -m "feat(verify): add /verify-piece slash command"
```

---

## Task 3: Update /infographic command with new tier requirements

**Files:**
- Modify: `.claude/commands/infographic.md` (append a new section before existing "Step 7 — Commit"; renumber as needed)

- [ ] **Step 1: Read current command file**

Run: `cat .claude/commands/infographic.md | tail -60`
Expected: see existing pipeline steps (Step 1-7 currently).

- [ ] **Step 2: Insert new requirements section**

Use Edit tool. Find the "Step 6 — Visual check" section (or its position before commit) and add a new section before the commit step.

Insert this content (replace `OLD_STR` with the actual previous step heading, `NEW_STR` is the inserted block + the old heading preserved):

OLD_STR:
```
### Step 7 — Commit
```

NEW_STR:
```
### Step 7 — Tier sizing + exercise mix

The piece MUST contain (within the TierAccordion block):

| Tier | Slot | Word budget | Required components |
|---|---|---|---|
| Junior | `<Fragment slot="junior">` | 200-500 | ≥1 PersonaTag dialog, ≥1 metaphor sentence |
| Middle | `<Fragment slot="middle">` | 2500-3500 | Mechanism + tradeoff + numbers + failure mode |
| Senior | `<Fragment slot="senior">` | 2500-4000 | ≥3 RFC refs, kernel/tunable references, edge cases |

Per-tier exercise count target (linter emits warnings):

- Junior: 5 exercises (Quiz × 2, DragOrder × 1, MetaphorComplete × 1, retrieval Q × 1)
- Middle: 8 (Quiz × 2, TraceScenario × 2, DragOrder × 1, FadedExample × 1, retrieval Q × 2)
- Senior: 7 (TraceScenario × 1, DebugLog × 1, TradeoffMatrix × 1, RFCQuiz × 1, DesignPrompt × 1, retrieval Q × 2)

If a needed exercise component does not yet exist in `site/src/components/pedagogy/`, mark with TODO comment in MDX and proceed; do not block.

### Step 8 — Verify

Run `/verify-piece <pillar>/<NN-piece>`. Address all `✗` findings. `⚠` findings: judge fix-or-accept case by case.

### Step 9 — Commit
```

(The existing commit step body content stays — just the heading shifts to Step 9.)

- [ ] **Step 3: Verify edit**

Run: `grep -n "Tier sizing + exercise mix" .claude/commands/infographic.md`
Expected: one match.

Run: `grep -n "Step 9 — Commit" .claude/commands/infographic.md`
Expected: one match.

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/infographic.md
git commit -m "feat(infographic): require tier sizing + exercise mix; call /verify-piece"
```

---

## Task 4: Tier-word-budgets rule — write failing test

**Files:**
- Create: `site/src/lint/rules/tier-word-budgets.test.ts`

- [ ] **Step 1: Write test file**

```typescript
import { describe, expect, test } from "vitest";
import { checkTierWordBudgets } from "./tier-word-budgets";

const wrap = (tier: "junior" | "middle" | "senior", words: number) => {
  const text = Array.from({ length: words }, () => "word").join(" ");
  return `<div data-tier-panel="${tier}">${text}</div>`;
};

describe("tier-word-budgets", () => {
  test("junior 200-500: 350 words passes", () => {
    expect(checkTierWordBudgets(wrap("junior", 350), "p.html")).toEqual([]);
  });
  test("junior < 200: flags", () => {
    const errs = checkTierWordBudgets(wrap("junior", 100), "p.html");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/junior.*100.*below.*200/);
  });
  test("junior > 500: flags", () => {
    const errs = checkTierWordBudgets(wrap("junior", 600), "p.html");
    expect(errs[0]).toMatch(/junior.*600.*above.*500/);
  });
  test("middle 2500-3500: 3000 passes", () => {
    expect(checkTierWordBudgets(wrap("middle", 3000), "p.html")).toEqual([]);
  });
  test("middle > 3500: flags", () => {
    expect(checkTierWordBudgets(wrap("middle", 4000), "p.html")[0]).toMatch(/middle.*4000.*above.*3500/);
  });
  test("middle < 2500: flags", () => {
    expect(checkTierWordBudgets(wrap("middle", 1000), "p.html")[0]).toMatch(/middle.*1000.*below.*2500/);
  });
  test("senior 2500-4000: 3000 passes", () => {
    expect(checkTierWordBudgets(wrap("senior", 3000), "p.html")).toEqual([]);
  });
  test("senior > 4000: flags", () => {
    expect(checkTierWordBudgets(wrap("senior", 5000), "p.html")[0]).toMatch(/senior.*5000.*above.*4000/);
  });
  test("HTML inside tier panel is stripped before counting", () => {
    const html = `<div data-tier-panel="junior"><p><strong>hello</strong> world ${"word ".repeat(298)}</p></div>`;
    expect(checkTierWordBudgets(html, "p.html")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd site && bunx vitest run src/lint/rules/tier-word-budgets.test.ts`
Expected: FAIL with "Cannot find module './tier-word-budgets'".

---

## Task 5: Tier-word-budgets rule — implementation

**Files:**
- Create: `site/src/lint/rules/tier-word-budgets.ts`

- [ ] **Step 1: Write implementation**

```typescript
type Tier = "junior" | "middle" | "senior";

const BUDGETS: Record<Tier, { min: number; max: number }> = {
  junior: { min: 200, max: 500 },
  middle: { min: 2500, max: 3500 },
  senior: { min: 2500, max: 4000 },
};

const PANEL_RE = /<div data-tier-panel="(junior|middle|senior)"[^>]*>([\s\S]*?)<\/div>/g;

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(" ").length;
}

export function checkTierWordBudgets(html: string, file: string): string[] {
  const warnings: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PANEL_RE.exec(html))) {
    const tier = m[1] as Tier;
    const inner = m[2];
    const count = countWords(inner);
    const { min, max } = BUDGETS[tier];
    if (count < min) {
      warnings.push(`${file}: ${tier} word count ${count} is below ${min}`);
    } else if (count > max) {
      warnings.push(`${file}: ${tier} word count ${count} is above ${max}`);
    }
  }
  return warnings;
}
```

- [ ] **Step 2: Run test, verify it passes**

Run: `cd site && bunx vitest run src/lint/rules/tier-word-budgets.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 3: Commit**

```bash
git add site/src/lint/rules/tier-word-budgets.ts site/src/lint/rules/tier-word-budgets.test.ts
git commit -m "feat(lint): tier-word-budgets rule + tests"
```

---

## Task 6: Exercise-counts rule — write failing test

**Files:**
- Create: `site/src/lint/rules/exercise-counts.test.ts`

- [ ] **Step 1: Write test file**

```typescript
import { describe, expect, test } from "vitest";
import { checkExerciseCounts } from "./exercise-counts";

const wrap = (tier: "junior" | "middle" | "senior", tags: string[]) => {
  return `<div data-tier-panel="${tier}">${tags.join("")}</div>`;
};

describe("exercise-counts", () => {
  test("junior with 5 components: no warning", () => {
    const tags = Array(5).fill('<astro-island component-export="Quiz"></astro-island>');
    expect(checkExerciseCounts(wrap("junior", tags), "p.html")).toEqual([]);
  });
  test("junior with 3 components: warns shortfall", () => {
    const tags = Array(3).fill('<astro-island component-export="Quiz"></astro-island>');
    const warns = checkExerciseCounts(wrap("junior", tags), "p.html");
    expect(warns).toHaveLength(1);
    expect(warns[0]).toMatch(/junior.*3.*target 5/);
  });
  test("middle with 8 components: no warning", () => {
    const tags = Array(8).fill('<astro-island component-export="FadedExample"></astro-island>');
    expect(checkExerciseCounts(wrap("middle", tags), "p.html")).toEqual([]);
  });
  test("middle with 5 components: warns shortfall", () => {
    const tags = Array(5).fill('<astro-island component-export="Quiz"></astro-island>');
    expect(checkExerciseCounts(wrap("middle", tags), "p.html")[0]).toMatch(/middle.*5.*target 8/);
  });
  test("senior with 7: no warning", () => {
    const tags = Array(7).fill('<astro-island component-export="RetrievalDrawer"></astro-island>');
    expect(checkExerciseCounts(wrap("senior", tags), "p.html")).toEqual([]);
  });
  test("counts retrieval drawer questions as one component", () => {
    const tag = '<astro-island component-export="RetrievalDrawer"></astro-island>';
    expect(checkExerciseCounts(wrap("senior", [tag]), "p.html")[0]).toMatch(/senior.*1.*target 7/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd site && bunx vitest run src/lint/rules/exercise-counts.test.ts`
Expected: FAIL with "Cannot find module './exercise-counts'".

---

## Task 7: Exercise-counts rule — implementation

**Files:**
- Create: `site/src/lint/rules/exercise-counts.ts`

- [ ] **Step 1: Write implementation**

```typescript
type Tier = "junior" | "middle" | "senior";

const TARGETS: Record<Tier, number> = {
  junior: 5,
  middle: 8,
  senior: 7,
};

const EXERCISE_COMPONENTS = new Set([
  "Quiz",
  "FadedExample",
  "RetrievalDrawer",
  "TraceScenario",
  "DebugLog",
  "TradeoffMatrix",
  "DragOrder",
  "MetaphorComplete",
  "RFCQuiz",
  "DesignPrompt",
  "NumberDrill",
  "Sandbox",
  "RequestBudgetSandbox",
]);

const PANEL_RE = /<div data-tier-panel="(junior|middle|senior)"[^>]*>([\s\S]*?)<\/div>/g;
const ISLAND_RE = /<astro-island[^>]*component-export="([^"]+)"/g;

function countExercises(panelHtml: string): number {
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = ISLAND_RE.exec(panelHtml))) {
    if (EXERCISE_COMPONENTS.has(m[1])) n++;
  }
  ISLAND_RE.lastIndex = 0;
  return n;
}

export function checkExerciseCounts(html: string, file: string): string[] {
  const warnings: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PANEL_RE.exec(html))) {
    const tier = m[1] as Tier;
    const inner = m[2];
    const count = countExercises(inner);
    const target = TARGETS[tier];
    if (count < target) {
      warnings.push(`${file}: ${tier} has ${count} exercise component(s), target ${target}`);
    }
  }
  PANEL_RE.lastIndex = 0;
  return warnings;
}
```

- [ ] **Step 2: Run test, verify it passes**

Run: `cd site && bunx vitest run src/lint/rules/exercise-counts.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 3: Commit**

```bash
git add site/src/lint/rules/exercise-counts.ts site/src/lint/rules/exercise-counts.test.ts
git commit -m "feat(lint): exercise-counts rule + tests"
```

---

## Task 8: Wire new rules into lint/index.ts

**Files:**
- Modify: `site/src/lint/index.ts`

- [ ] **Step 1: Add imports**

Use Edit. Find line:
```
import { checkPersonas } from "./rules/personas";
```

Replace with:
```
import { checkPersonas } from "./rules/personas";
import { checkTierWordBudgets } from "./rules/tier-word-budgets";
import { checkExerciseCounts } from "./rules/exercise-counts";
```

- [ ] **Step 2: Wire rule invocations in the per-file loop**

Find:
```
          errors.push(...checkPersonas(html, f));
        }
```

Replace with:
```
          errors.push(...checkPersonas(html, f));
          warnings.push(...checkTierWordBudgets(html, f));
          warnings.push(...checkExerciseCounts(html, f));
        }
```

(Both rules emit warnings, not errors, for backwards compat with current unmigrated pieces.)

- [ ] **Step 3: Run build, verify lint executes without crash**

Run: `cd site && bun run build 2>&1 | tail -20`
Expected: build completes (301 pages); lint may emit warnings about current pieces being short or having too few exercises — that's expected.

- [ ] **Step 4: Inspect lint-report.json — expect warnings, zero errors**

Run: `cat site/dist/lint-report.json | head -40`
Expected: `errors: []` ; `warnings` array contains entries from the new rules (e.g. `… junior word count 0 is below 200` and `… middle has X exercise component(s), target 8`).

(If `errors` is non-empty for unrelated reasons, debug those — but the new rules should only produce warnings.)

- [ ] **Step 5: Commit**

```bash
git add site/src/lint/index.ts
git commit -m "feat(lint): wire tier-word-budgets + exercise-counts as warnings"
```

---

## Task 9: Smoke-test verify-piece slash command

**Files:**
- None (manual run)

- [ ] **Step 1: Run /verify-piece on the simplest piece**

In Claude Code session: `/verify-piece networking/01-physical-link`

Expected:
- Subagent runs.
- Console output: path to report + summary counts.
- File created: `site/dist/verify-reports/networking-01-physical-link.md`.

- [ ] **Step 2: Inspect report**

Run: `cat site/dist/verify-reports/networking-01-physical-link.md | head -60`
Expected: structured report with sections (Facts, Completeness, Depth bar, i18n parity, Cross-links, Hydration, Exercise mix, Summary).

- [ ] **Step 3: Verify reasonableness**

Report should:
- Confirm at least some Facts (sources fetched, RFC numbers match).
- Identify completeness gaps (e.g. middle/senior tier word counts under target since pieces not yet migrated).
- Find no critical errors in cross-links (prereqs may be empty for 01).
- Not crash, no missing data.

If anything looks broken, iterate on the subagent definition.

- [ ] **Step 4: Commit verify-reports dir to gitignore**

Run: `grep -q "dist/verify-reports" site/.gitignore 2>/dev/null || echo "dist/verify-reports/" >> site/.gitignore`

```bash
git add site/.gitignore
git commit -m "chore: ignore generated verify-reports directory"
```

---

## Self-review checklist

- [ ] All 9 tasks have exact file paths.
- [ ] Every code step shows actual code (no "TBD" or "similar to").
- [ ] All commands include expected output.
- [ ] Function names consistent across tasks (`checkTierWordBudgets`, `checkExerciseCounts`).
- [ ] No spec gaps: covers /verify-piece subagent (spec § Authoring workflow), slash command (same), /infographic update (same), tier word budgets (spec § Open Q 1), exercise count linter (spec § Practice mix).
- [ ] Spec § Open Q 1 ("linter per-tier word budgets: error vs warn?") resolved as warnings for Phase A1; promotion to errors is a follow-up after Phase B migration completes.

---

## What this plan does NOT cover (deferred)

- **10 new exercise components** (Quiz, DragOrder, TraceScenario, DebugLog, TradeoffMatrix, MetaphorComplete, RFCQuiz, DesignPrompt, AnimationStep, NumberDrill) → Plan A2 + A3.
- **Migration of 8 networking pieces** to new tier shape → Plan B.
- **Hydration cap remediation** when new components push past 5 islands → addressed in Plan B during migration.
- **Pretest re-tuning** for deeper senior tier → Phase B follow-up.
- **Promotion of new linter warnings to errors** → follow-up after Phase B.
