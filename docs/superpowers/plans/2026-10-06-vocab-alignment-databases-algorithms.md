# Vocab alignment pilot (databases×algorithms) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make derived algo-links yield cross-track databases pairs by retagging 2 lessons with existing shared concept ids, plus 1 curated hashing backlog pin.

**Architecture:** Strategy A (no contract changes): reuse 8 already-registered `algorithms`-track concept ids as shared vocabulary; append them to 2 databases lessons (EN+RU, identical order); add 1 `always` pin; rebuild committed indexes; extend the corpus test. No UI, i18n, or builder-code changes.

**Tech Stack:** Bun, lesson MDX frontmatter, `bunx vitest run`, existing `build:algo-links` / `build:lesson-graph` chain.

**Spec:** `docs/superpowers/specs/2026-10-06-algo-links-design.md` (hybrid derived+curated; MIN_SHARED=2, caps 12/6, cross-track-first tie-break). Analysis (pair shortlist P1–P3, rejected P5–P9, deferred P4, empty removal list): parent chat, 2026-10-06.

## Global Constraints

- Lesson route output for lessons without links is byte-identical to today (zero component changes; blocks render only when the lesson has an index entry).
- EN/RU parity: appended concepts identical AND in identical order in EN+RU frontmatter (lesson-graph audit compares order-sensitively); all 4 files exist.
- No new Preact islands; no `console.log`; no `ui.json` change (no new copy); light+dark untouched.
- Tunables unchanged: `MIN_SHARED = 2`, `CAP_PER_ALGO = 12`, `CAP_PER_LESSON = 6`.
- Gates: `bun run lint:src` 0 errors, `bunx vitest run` green, `bun run check` 0/0/0, `bun run build:algo-links` clean, corpus test green and covering the new cross-links; `bun run build` + `dist/lint-report.json` 0 errors (lesson content changes).
- Small named commits; NO push to `origin/main` without an explicit user command. Known state: local `main` is 1 commit ahead of `origin/main` (`8aad97df` not pushed) plus unrelated dirty js-engine/astro work — do not touch, do not push.
- P4 (06-lists-stacks-queues × lock-queue-incident) is DEFERRED (would evict quiz-short from unit 06's capped row); empty pin-removal list is a recorded vacuous pass, not an omission.

## Review Focus

- EN/RU concept-order drift (audit fails on order-sensitive mismatch): Task 2 appends in one fixed order to both locales; Task 3 pins it via a clean `build:lesson-graph` run with no parity lines on stderr.
- Unexpected extra derived pairs from the new tags: Task 1 pins the exact databases-lesson key set in `index.lessons`.
- Cap-eviction surprise in units 01/03: Task 1 pins exact row lengths (8 and 9) and the new rows' shared counts.
- Non-deterministic or baseline-dirty rebuild: Task 3 step 0 rebuilds both indexes BEFORE any edit and requires an empty `git diff` on generated files.
- Curated pin typo or dangling ref: builder fail-fast + `lint:src` cover it; Task 1 asserts the pin's canonical row in the fresh (not committed) index.

---

## File structure

- `site/scripts/path/build-algo-links.test.mjs` — extend corpus test with pilot assertions (Task 1).
- `site/src/content/lessons/{en,ru}/databases/02-indexes/01-index-anatomy/index.mdx` — append `sorted, log_n_time, linear_time, logarithmic_time` to `concepts:` (Task 2).
- `site/src/content/lessons/{en,ru}/databases/03-execution-plans/03-join-algorithms/index.mdx` — append `sorted, merge, sorting` to `concepts:` (Task 2).
- `site/src/content/path/algo-links.curated.json` — append 1 `always` pin (Task 2).
- `site/src/content/path/algo-links.json`, `site/src/content/path/algo-link-titles.json` — rebuilt, committed (Task 2).
- `site/src/content/path/lesson-graph.json` — rebuilt, committed (Task 3).

---

### Task 1: Pilot assertions in the corpus test

**Files:**
- Modify: `site/scripts/path/build-algo-links.test.mjs` (append to the `corpus:` test, after the existing `expect(index).toEqual(rest)` block — new asserts run against the FRESH `index`, so they fail pre-retag even though the committed deep-equal also fails).

**Interfaces:**
- Consumes: `buildIndex`, `loadCorpus` (already imported in the file).
- Produces: failing-then-passing pilot assertions consumed by Tasks 2–3 as the definition of done.

- [ ] **Step 1: Write the failing assertions**

```js
// Pilot databases×algorithms (P1-P3): exact derived rows.
const u03 = index.units["algorithms/03-sorting-search"];
expect(u03.length).toBe(9);
expect(u03).toContainEqual({
  lesson: "databases/03-execution-plans/03-join-algorithms",
  shared: 3,
  canonical: false,
});
expect(u03).toContainEqual({
  lesson: "databases/02-indexes/01-index-anatomy",
  shared: 2,
  canonical: false,
});
const u01 = index.units["algorithms/01-thinking-complexity"];
expect(u01.length).toBe(8);
expect(u01).toContainEqual({
  lesson: "databases/02-indexes/01-index-anatomy",
  shared: 2,
  canonical: false,
});
// Hashing backlog pin renders canonical on the join lesson.
expect(index.lessons["databases/03-execution-plans/03-join-algorithms"]).toContainEqual({
  unit: "algorithms/05-hashing",
  shared: 0,
  canonical: true,
});
// No other databases lesson leaks into the index; P4-deferral guard.
expect(Object.keys(index.lessons).filter((k) => k.startsWith("databases/")).sort()).toEqual([
  "databases/02-indexes/01-index-anatomy",
  "databases/03-execution-plans/03-join-algorithms",
]);
expect(index.units["algorithms/06-lists-stacks-queues"].length).toBe(12);
expect(
  index.units["algorithms/06-lists-stacks-queues"].some((h) => h.lesson.startsWith("databases/")),
).toBe(false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd site && bunx vitest run scripts/path/build-algo-links.test.mjs`
Expected: FAIL on the new assertions (no databases rows in fresh index, no pin).

- [ ] **Step 3: Commit nothing** — red state stays uncommitted by design; Task 2 turns it green.

### Task 2: Retag 2 lessons + hashing pin + rebuild algo-links

**Files:**
- Modify: 4 lesson files (list in File structure), `site/src/content/path/algo-links.curated.json`
- Rebuild: `site/src/content/path/algo-links.json`, `site/src/content/path/algo-link-titles.json`
- Test: Task 1 assertions (now green)

**Interfaces:**
- Consumes: Task 1 assertions as done-criteria.
- Produces: green corpus test; commit 1 (authored files); commit 2 (generated files) — see steps.

- [ ] **Step 1: Retag `01-index-anatomy` EN+RU** — append exactly `- sorted`, `- log_n_time`, `- linear_time`, `- logarithmic_time` (this order) at the END of the `concepts:` list in `site/src/content/lessons/{en,ru}/databases/02-indexes/01-index-anatomy/index.mdx`. No other frontmatter or body change.
- [ ] **Step 2: Retag `03-join-algorithms` EN+RU** — append exactly `- sorted`, `- merge`, `- sorting` (this order) at the END of the `concepts:` list in `site/src/content/lessons/{en,ru}/databases/03-execution-plans/03-join-algorithms/index.mdx`. No other change.
- [ ] **Step 3: Add the hashing backlog pin** — append to `site/src/content/path/algo-links.curated.json`:

```json
{
  "algo": "algorithms/05-hashing",
  "lesson": "databases/03-execution-plans/03-join-algorithms",
  "kind": "always",
  "note": "Hash join builds a hash table on the build side and probes it."
}
```

- [ ] **Step 4: Rebuild and verify green**

Run: `cd site && bun run build:algo-links && bunx vitest run scripts/path/build-algo-links.test.mjs`
Expected: PASS (all pilot assertions + pre-existing deep-equal/titles checks).

- [ ] **Step 5: Commit 1 (authored)**

```bash
git add site/scripts/path/build-algo-links.test.mjs \
  site/src/content/lessons/en/databases/02-indexes/01-index-anatomy/index.mdx \
  site/src/content/lessons/ru/databases/02-indexes/01-index-anatomy/index.mdx \
  site/src/content/lessons/en/databases/03-execution-plans/03-join-algorithms/index.mdx \
  site/src/content/lessons/ru/databases/03-execution-plans/03-join-algorithms/index.mdx \
  site/src/content/path/algo-links.curated.json \
  && git commit -m "content(databases): shared algo concept tags on index-anatomy and join-algorithms EN+RU, hashing backlog pin"
```

- [ ] **Step 6: Commit 2 (generated)**

```bash
git add site/src/content/path/algo-links.json site/src/content/path/algo-link-titles.json \
  && git commit -m "feat(links): rebuild algo-links index with databases pilot pairs"
```

### Task 3: Lesson-graph rebuild + full gates + diff review

**Files:**
- Rebuild: `site/src/content/path/lesson-graph.json`
- Test: full suite + build (no file changes expected from verification itself)

**Interfaces:**
- Consumes: Task 2 commits.
- Produces: commit 3 (lesson-graph rebuild); gate evidence for the final report.

- [ ] **Step 0 (baseline hygiene, before Task 2 edits): Rebuild both indexes on the untouched tree and require an empty diff**

Run: `cd site && bun run build:algo-links && bun run build:lesson-graph && cd .. && git status --short -- site/src/content/path/`
Expected: no output (proves deterministic regen; if dirty, stop and report).

- [ ] **Step 1: Rebuild lesson-graph after Task 2**

Run: `cd site && bun run build:lesson-graph`
Expected: exit 0; stderr contains no `missing from concepts.json` and no parity-mismatch lines.

- [ ] **Step 2: Review the diff**

Run: `cd .. && git diff --stat -- site/src/content/path/ && git diff -- site/src/content/path/lesson-graph.json | head -60`
Expected: only additive `related`/concept entries touching the 2 retagged lessons; any unrelated hunk → stop and report.

- [ ] **Step 3: Run the gates**

Run: `cd site && bun run lint:src`
Expected: 0 errors.

Run: `cd site && bunx vitest run`
Expected: all pass (baseline 1827; new asserts included).

Run: `cd site && bun run check`
Expected: 0 errors / 0 warnings (matching prior 0/0/0).

- [ ] **Step 4: Full build (lesson content changed)**

Run: `cd site && bun run build` (allow up to 300000ms) and inspect `dist/lint-report.json` errors == 0.
Expected: build succeeds; 0 errors (warnings may remain at the pre-existing level).

- [ ] **Step 5: Commit 3 (generated)**

```bash
git add site/src/content/path/lesson-graph.json \
  && git commit -m "chore(path): rebuild lesson graph after databases retag"
```

- [ ] **Step 6: Confirm no push**

Run: `cd .. && git status -sb | head -5`
Expected: local commits present, nothing pushed (push only on explicit user command).

## Self-Review

1. **Spec coverage:** hybrid derived+curated (§1 — derived P1–P3 via shared ids, curated hashing pin; MIN_SHARED/caps/ranking untouched); build (§2 — `build:algo-links` before lint, committed diff reviewable); UI (§3 — no changes, blocks appear only for newly linked lessons); lint (§4 — curated refs validated by existing rule + fail-fast builder); verification (§5 — corpus deep-equal + titles + new targeted asserts; screenshots N/A — no visual change). Out-of-scope respected (no island/visualizer/assessment changes; no concept-vocabulary edits — all 8 ids pre-registered).
2. **Step scan:** each step names one action + exact command/expectation; the one deliberate exception (Task 1 commits nothing while red) is stated explicitly.
3. **Type consistency:** lesson keys, unit keys, `{lesson, shared, canonical}` / `{unit, shared, canonical}` shapes match `algo-links-core.mjs` exactly; appended concept ids verified present in `concepts.json` (track `algorithms`) and in the respective algo-unit `teaches`.
4. **Review Focus:** all five lines have owning checks (parity → build stderr review; extra pairs → key-set assert; eviction → length asserts incl. unit-06 guard; baseline → step 0 empty-diff; pin typo → canonical-row assert + lint).
5. **Proportion:** plan is shorter than the spec + analysis it implements; code blocks are assertions and one JSON pin only.
