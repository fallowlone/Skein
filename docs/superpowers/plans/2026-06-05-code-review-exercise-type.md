# Implementation Plan — `review` practice task type (P5)

**Register:** P5 of `docs/superpowers/specs/2026-06-05-senior-readiness-gaps-register.md`
**Date:** 2026-06-05
**Status:** Ready to execute
**Effort:** Small–Medium
**Severity:** Medium-High (unique, untrained muscle)

## REQUIRED SUB-SKILL

Execute this plan with **`superpowers:test-driven-development`** for every deterministic phase
(Phases 1–2: Zod schema + lint rule). Write the failing Vitest test FIRST, watch it fail for
the right reason, then implement until green. The renderer and seed phases (3–5) are not TDD
(UI + content) but must end with `bun run build` + `bun run test` green.

## Conventions

- Repo root: `/Users/artemmac/dev/awesome-everything`. Site root: `site/`. Use `bun`.
- **No git commit / branch / push unless the operator explicitly asks.** Leave the work in the
  working tree for review.
- No `console.log` in shipped code. Run `bun run build` (astro + lint) and `bun run test`
  (vitest) before claiming done — evidence before assertions.
- Follow existing patterns: study a real practice file
  (`site/src/content/practice/node/06-testing/01-unit-testing.json`) and the existing renderer
  (`site/src/components/pedagogy/PracticeSection.tsx`) before writing anything new. No
  speculative edits — change only what this plan lists.
- Bilingual or it does not ship: every `{en,ru}` pair must be genuinely translated (the lint
  parity rule flags `en === ru` on prose-length fields ≥25 chars).

## Problem & Goal

**Problem (P5).** The site teaches you to *write* code; it never has you *review* someone
else's. Review appears only as prose advice inside reveals — there is no `review` task type in
`site/src/content/practice/**`. Reviewing (spotting the bug, the missing test, the unstated
tradeoff, the simpler design) is a defining senior activity and a distinct skill from authoring.

**Goal.** A new `review` practice task type: the learner is shown a realistic diff/snippet and
must identify the planted issues (bug, missing test, unstated tradeoff, simpler design), graded
against a checklist of planted findings via objective self-check (v1). Open-ended LLM critique
is an optional later layer via P3's grader — **v1 ships fully without P3.**

## Verified anchors (confirmed by reading the repo)

- **Practice schema is in `site/src/content.config.ts`** (NOT `config.ts` — that file does not
  exist). The `review` type must be added to the `PracticeTask` discriminated union there
  (`z.discriminatedUnion("type", [...])`, ~line 128). The union is reused by BOTH the `practice`
  collection and the `lab` collection (`challenges: z.array(PracticeTask)`), so a `review` task
  becomes Lab-eligible for free — no extra wiring.
- **A mirror of the schema lives in `site/src/content/practice-schema.test.ts`** (a hand-copied
  subset used for isolated parsing tests). It must be extended in lockstep or its tests drift.
- **Lint rules: `site/src/lint/rules/practice.ts`** — the parity check (`checkPracticeParity`)
  already recurses every `{en,ru}` pair and flags whitespace-only or untranslated (`en===ru`,
  ≥25 chars) fields, so a `review` task's `findings[].label`/`explanation` get parity-checked
  automatically. There is currently **no per-type structural validation** there (Zod owns
  structure); we add ONE small structural check: every `review` task has ≥1 finding. Tests in
  `site/src/lint/rules/practice.test.ts`.
- **Renderer: `site/src/components/pedagogy/PracticeSection.tsx`** — `TaskBody` switches on
  `task.type`. Existing UI labels are inline `tt(lang, en, ru)` literals plus a `TYPE_HINT` map
  (not ui.json keys), so the `review` renderer follows the same inline pattern. The existing
  `Rubric`/`Reveal`/`pre` (diff-as-`<pre>`) building blocks are reused.
- **`PracticeTaskData` type** is exported from `content.config.ts` and consumed by the renderer —
  extending the union updates the renderer's prop type automatically.
- **i18n:** `site/src/i18n/ui.json` holds shared UI labels (`{ en: {...}, ru: {...} }`). The
  practice renderer does NOT currently read it; v1 keeps the `review` labels inline for
  consistency. (No new ui.json keys strictly required; add only if a label is reused outside the
  component.)
- **P3 grader path `site/src/scripts/practice-grade-llm.ts` does NOT exist yet** — confirmed.
  v1 must not import it. The objective grader `site/src/scripts/practice-grade.ts` (`checkBlank`)
  exists and is the model for any v1 self-check logic.
- Tests: `bun run test` (vitest, setup `site/src/test-setup.ts`). Build: `bun run build`.

---

## Phase 0 — Design the `review` task JSON shape (no code)

Decide and write down (in this plan / as the schema docstring) the shape before touching code.

**Task shape (`type: "review"`):**

```jsonc
{
  "id": "review-async-double-callback",   // ^[a-z0-9-]+$ (TaskBase rule)
  "type": "review",
  "difficulty": "apply",                   // recall | apply | stretch
  "estMin": 7,
  "title": { "en": "...", "ru": "..." },
  "prompt": { "en": "...", "ru": "..." },  // "Review this diff. What's wrong / missing?"
  "diff": {                                 // the artifact under review
    "lang": "js",                           // freeform hint string for fence label (js|ts|sql|tsx|diff|…)
    "code": "function load(cb) {\n  fs.readFile(p, (e, d) => {\n    if (e) cb(e);\n    cb(null, d);  // bug: missing return\n  });\n}"
  },
  "findings": [                             // ≥1; the planted issues, the grading key
    {
      "id": "missing-return",
      "label": { "en": "Callback invoked twice on error", "ru": "Колбэк вызывается дважды при ошибке" },
      "severity": "bug",                    // bug | missing-test | tradeoff | simplification
      "explanation": {
        "en": "`cb(e)` has no `return`, so on error `cb` fires again with `(null, d)`. Add `return cb(e)`.",
        "ru": "У `cb(e)` нет `return`, поэтому при ошибке `cb` вызывается снова с `(null, d)`. Нужен `return cb(e)`."
      },
      "planted": true                       // always true for review findings
    }
  ],
  "decoys": [                               // optional: plausible non-issues to test discrimination
    {
      "id": "var-naming",
      "label": { "en": "Rename `d` to `data`?", "ru": "Переименовать `d` в `data`?" },
      "explanation": {
        "en": "Style only — not a correctness issue. A senior review wouldn't block on this.",
        "ru": "Только стиль — не дефект корректности. Senior-ревью не блокирует на этом."
      }
    }
  ]
}
```

**Field decisions:**
- `diff` is an object `{ lang: string, code: string }`. Rationale: matches the `parametric`
  nested-object precedent; `lang` is a freeform fence hint (we do NOT constrain it to an enum —
  diffs span js/ts/sql/tsx/yaml/unified-diff and over-constraining would block authoring). `code`
  may be a unified diff (`+`/`-` lines) OR a plain snippet; the renderer shows it verbatim in a
  `<pre>` so both render fine. (Decision: single string field `code`, NOT a `before`/`after`
  pair — keeps authoring cheap and the renderer trivial; a unified diff already encodes both.)
- `findings[]` — each `{ id, label{en,ru}, severity, explanation{en,ru}, planted: true }`.
  `id` is `^[a-z0-9-]+$`. `severity` is an enum: `bug | missing-test | tradeoff | simplification`
  — this is exactly the four review dimensions the goal names, and lets the renderer badge each
  finding by category. `planted: true` is required literal (documents intent; cheap invariant).
- `decoys[]` — optional `{ id, label{en,ru}, explanation{en,ru} }` (no severity, no `planted`):
  plausible-but-wrong observations. The renderer reveals these AFTER the learner self-checks, to
  teach discrimination (what a senior would NOT block on). Omit when not useful.

**Grading decision (v1 = objective self-check):**
The renderer shows the diff, then a "What did you find?" list. v1 presents the planted findings
as a self-check reveal (same mental model as `design`/`fix` self-grade): the learner attempts on
their own (or ticks which categories they spotted), then reveals the full planted set with
severity + explanation, and the decoys with "why this is NOT an issue." Completion marks the task
`done` on reveal (mirrors `Reveal`). **No P3 dependency.** P3 (open-ended LLM critique of the
learner's written review) is a future enhancement noted in Dependencies, not built here.

**Zod addition (sketch — implemented in Phase 1):**
```ts
const Finding = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: BiText,
  severity: z.enum(["bug", "missing-test", "tradeoff", "simplification"]),
  explanation: BiText,
  planted: z.literal(true),
});
const Decoy = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: BiText,
  explanation: BiText,
});
const ReviewTask = TaskBase.extend({
  type: z.literal("review"),
  diff: z.object({ lang: z.string().min(1), code: z.string().min(1) }),
  findings: z.array(Finding).min(1),
  decoys: z.array(Decoy).optional(),
});
// add ReviewTask to the PracticeTask discriminatedUnion
```

- [ ] Write the shape + decisions above into the schema docstring location and confirm the
  field list with the operator if anything is ambiguous. No code yet.

---

## Phase 1 — Zod schema accepts `review` (TDD)

**1a. Failing tests first** — extend `site/src/content/practice-schema.test.ts`. First mirror the
new sub-schemas (`Finding`, `Decoy`, `ReviewTask`) into that file's local copy and add
`ReviewTask` to its local `PracticeTask` union, then add cases:

- [ ] `accepts a valid review task` — a `review` task with `diff`, one `finding`, parses without
  throwing.
- [ ] `rejects a review task with zero findings` — `findings: []` throws.
- [ ] `rejects a finding missing ru label` — `label: { en: "x" }` throws (BiText `.min(1)` on ru).
- [ ] `rejects a finding with an unknown severity` — `severity: "nit"` throws.
- [ ] `rejects planted !== true` — `planted: false` throws (`z.literal(true)`).
- [ ] (optional) `accepts decoys` and `rejects a decoy carrying severity` (decoy is a strict-ish
  separate object) — keep only if it does not over-constrain.

Run `bun run test` → these fail (no `review` in union yet, mirror not added). Confirm failure
reason is "no matching discriminator" / unknown key, not a typo.

**1b. Implement** in `site/src/content.config.ts`:

- [ ] Add `Finding`, `Decoy`, `ReviewTask` (per the Phase 0 sketch) above the `PracticeTask`
  union (reuse existing `BiText`/`TaskBase`).
- [ ] Add `ReviewTask` to `const PracticeTask = z.discriminatedUnion("type", [ ... ])`.
- [ ] Keep `practice` and `lab` collections untouched — they already consume `PracticeTask`, so
  `review` flows into both. Confirm `export type PracticeTaskData` still infers cleanly.

- [ ] Run `bun run test` → all schema tests green. Run `bun run build` → astro content config
  still validates existing 1500+ practice files (the union is additive, so no regressions).

---

## Phase 2 — Lint rule validates `review` structure + parity (TDD)

The parity rule already covers `findings[].label/explanation` `{en,ru}` recursively (verified:
`biTexts` recurses all objects). We add ONE structural guarantee that Zod can technically already
enforce but the lint layer should also assert for clear build-time messaging: **every `review`
task has ≥1 finding** (defense-in-depth + a human-readable lint error), and confirm the parity
rule fires on a missing/untranslated finding label.

**2a. Failing tests first** — extend `site/src/lint/rules/practice.test.ts`:

- [ ] Add a `goodReview` fixture (valid `review` task: diff + 1 finding + decoy).
- [ ] `checkPracticeParity passes a clean review task` — `[]`.
- [ ] `checkPracticeParity flags an untranslated finding label (en === ru, long)` — a long
  identical label is flagged `untranslated`.
- [ ] `checkPracticeParity flags a whitespace-only finding explanation`.
- [ ] New rule `checkPracticeReview flags a review task with zero findings` — expects ≥1 error.
- [ ] `checkPracticeReview passes a review task with ≥1 finding` — `[]`.
- [ ] `checkPracticeReview ignores non-review tasks` — a `predict` task yields `[]`.

Run `bun run test` → the `checkPracticeReview` tests fail (function does not exist); the parity
tests should already pass via the generic recursion (confirm — they document the guarantee).

**2b. Implement** in `site/src/lint/rules/practice.ts`:

- [ ] Add `export async function checkPracticeReview(siteSrc: string): Promise<string[]>` that
  reads practice files (reuse `readPractice`) and, for each `task.type === "review"`, pushes an
  error if `(task.findings?.length ?? 0) < 1`:
  `practice-review: "${file}" task "${id}" must have at least one finding`. Mirror the style of
  `checkPracticeLessonKey`.
- [ ] Wire `checkPracticeReview` into wherever the practice lint rules are aggregated (the same
  place `checkPracticeParity`/`checkPracticeLessonKey`/`checkPracticeCount` are called in the
  build lint pass — find the caller and add it as an ERROR-level check). Verify the linter still
  reports through `dist/lint-report.json`.

- [ ] Run `bun run test` → green. The seed files from Phase 5 will exercise this on a real build.

---

## Phase 3 — `review` renderer in PracticeSection (not TDD)

In `site/src/components/pedagogy/PracticeSection.tsx`:

- [ ] Add a `review` entry to `TYPE_HINT`:
  `{ en: "Review the diff. Spot the bug, the missing test, the unstated tradeoff, the simpler design — then reveal the planted findings.", ru: "Отревьюй дифф. Найди баг, недостающий тест, неназванный компромисс, более простой дизайн — затем открой заложенные находки." }`.
- [ ] Add `case "review":` to `TaskBody` returning a new `<ReviewBody>` component.
- [ ] Implement `ReviewBody({ lang, lessonKey, taskId, diff, findings, decoys, onChange })`:
  - Render the diff in a `<pre>` (reuse the existing `<pre class="text-xs bg-card-2 …">`
    pattern). Show `diff.lang` as a small mono fence-label badge above the `<pre>`. Render
    `diff.code` verbatim (`{diff.code}` text node — diffs may contain `<`/`{`, so render as a
    text child, NOT `dangerouslySetInnerHTML`).
  - A self-check prompt: list the four review dimensions as checkboxes ("bug", "missing test",
    "unstated tradeoff", "simpler design") so the learner commits to *what kind* of issues they
    found before revealing (reuse the `Rubric` checkbox visual; these are ungraded self-ticks).
  - A "Reveal findings" button (reuse `Reveal`'s done-on-reveal behavior): on click, set task
    `done` via `setTaskStatus(lessonKey, taskId, "done")`, call `onChange?.()`, and show:
    - each planted finding as a row: a severity badge (`bug`/`missing-test`/`tradeoff`/
      `simplification`, color-coded via existing tokens — `text-danger` for bug, muted for the
      rest), the `label`, and the `explanation` (render explanation via
      `dangerouslySetInnerHTML` like other reveals, since findings prose may contain inline code
      markdown — match the existing reveal rendering for consistency).
    - if `decoys` present, a separate "Not issues (a senior wouldn't block on these)" list
      showing each decoy `label` + `explanation`.
  - Bilingual: every label via `tt(lang, …)`. Add a `SEVERITY_LABEL` map
    (`bug → {en:"Bug", ru:"Баг"}`, `missing-test → {en:"Missing test", ru:"Нет теста"}`,
    `tradeoff → {en:"Unstated tradeoff", ru:"Неназванный компромисс"}`,
    `simplification → {en:"Simpler design", ru:"Проще можно"}`).
- [ ] Keep within the hydration model: this adds rendering to the single existing
  `PracticeSection` island — no new island, no `client:load`. The lab-page hydration exemption
  and the `checkPracticeSandboxBudget` cap are unaffected.

- [ ] Manual check after Phase 5 seeds exist: `bun run build` then open an EN and a RU lesson page
  that has a `review` task; verify the diff renders, the reveal shows findings + decoys, and
  completion ticks.

---

## Phase 4 — Bilingual UI labels (not TDD)

- [ ] The renderer's `review` labels (`TYPE_HINT.review`, `SEVERITY_LABEL`, "Reveal findings",
  "Not issues …", the four self-check dimension labels) are authored inline as `tt(lang, en, ru)`
  pairs, consistent with how every other label in `PracticeSection.tsx` is written. No ui.json
  change is required for v1.
- [ ] IF any of these labels is later needed outside the component, promote it to
  `site/src/i18n/ui.json` under both `en` and `ru` (the i18n parity linter enforces key parity
  across locales). For v1, do NOT add unused keys.

---

## Phase 5 — Seed 3–5 real `review` tasks across tracks (not TDD)

Add a `review` task to existing ready lessons' practice JSON (additive — append to the `tasks`
array of an existing file, or add a new task; keep each file within the 3–5 task count the
linter enforces, so prefer files currently at 3–4 tasks, or swap a weaker task). Each seed must
have concrete planted findings with real explanations, and genuinely translated RU.

Seed targets (pick the closest real ready lesson per track; verify the lessonKey exists EN+RU
before authoring):

- [ ] **Node async bug** — e.g. `node/06-testing/*` or a node async lesson: a diff with a
  double-callback / missing-`return` / unhandled-rejection bug + a *missing test* finding (the
  error path is untested) + a *simplification* (promisify). 2–3 findings + 1 decoy.
- [ ] **SQL N+1** — a `databases/*` or `sql-postgres/*` lesson: a diff doing a query-in-a-loop;
  findings = the N+1 bug, the missing index/`JOIN` simplification, an unstated tradeoff
  (eager vs lazy). 2–3 findings.
- [ ] **React effect-deps bug** — a `frontend/*` lesson on hooks/effects: a `useEffect` with a
  missing/incorrect dependency (stale closure) + a *missing test* + a *simpler design* (derive
  during render instead of effect). 2–3 findings + 1 decoy.
- [ ] **Missing-test diff** — a `node`/`backend` change that adds a feature but no test: finding =
  the untested branch (`severity: missing-test`), plus an *unstated tradeoff*. 2 findings.
- [ ] (Optional 5th) a **security/tradeoff** review — e.g. `security/*`: a diff that "works" but
  leaks a tradeoff (e.g. logging a token, broad CORS) → `bug` + `tradeoff` findings.

For each seed:
- [ ] Confirm `site/src/content/lessons/{en,ru}/<key>/index.mdx` both exist and the lesson is
  `status: ready` (so the practice-count linter applies). Use the exact `lessonKey`.
- [ ] Author the `review` task per Phase 0 shape; write genuine RU (no `en===ru` on prose).
- [ ] Keep the file at 3–5 tasks total.

- [ ] Run `bun run build` → lint clean (0 errors). Run `bun run test` → green.

---

## File structure

```
docs/superpowers/plans/2026-06-05-code-review-exercise-type.md   (this plan)

site/src/content.config.ts                     EDIT  + Finding/Decoy/ReviewTask, add to PracticeTask union
site/src/content/practice-schema.test.ts       EDIT  mirror review schema + new parse tests
site/src/lint/rules/practice.ts                EDIT  + checkPracticeReview (≥1 finding) + wire into lint pass
site/src/lint/rules/practice.test.ts           EDIT  + review parity + checkPracticeReview tests
site/src/components/pedagogy/PracticeSection.tsx EDIT + review case, ReviewBody, TYPE_HINT.review, SEVERITY_LABEL
site/src/i18n/ui.json                          (only if a label is promoted; v1 likely no change)

site/src/content/practice/node/.../<lesson>.json        EDIT/ADD  review seed (async bug)
site/src/content/practice/{databases|sql-postgres}/.../<lesson>.json  EDIT/ADD  review seed (N+1)
site/src/content/practice/frontend/.../<lesson>.json    EDIT/ADD  review seed (effect-deps)
site/src/content/practice/{node|backend}/.../<lesson>.json  EDIT/ADD  review seed (missing-test)
site/src/content/practice/security/.../<lesson>.json    EDIT/ADD  review seed (optional, tradeoff)
```

(Find the actual lint aggregation caller before editing — the lint pass that invokes
`checkPracticeParity` / `checkPracticeCount` is where `checkPracticeReview` must be registered.)

## Success criteria

- [ ] **Schema accepts `review`, rejects malformed:** a valid `review` task parses; zero
  findings, a finding missing `ru`, an unknown `severity`, and `planted !== true` all throw.
  Verified by `practice-schema.test.ts` (green).
- [ ] **Lint accepts `review`, rejects malformed:** `checkPracticeReview` errors on zero
  findings; the parity rule flags an untranslated/whitespace finding label or explanation.
  Verified by `practice.test.ts` (green).
- [ ] **Renderer shows diff + findings:** a `review` task renders the diff in a `<pre>` with a
  lang badge, a self-check prompt, and a reveal that lists every planted finding (severity badge
  + label + explanation) and any decoys; completion marks the task done. Verified by opening an
  EN + RU lesson after build.
- [ ] **Seeds pass build/lint 0/0:** 3–5 real `review` seeds across tracks; `bun run build`
  reports 0 errors in `dist/lint-report.json`; files stay within 3–5 tasks.
- [ ] **EN/RU parity:** every `{en,ru}` pair on every seed is genuinely translated (no `en===ru`
  flag); RU is fluent, not machine-literal.
- [ ] **No regressions:** existing 1500+ practice files still validate; full `bun run test`
  suite green; no new hydration island, no `client:load`.

## Dependencies

- **None required for v1.** The objective self-check grader reuses the existing
  `Reveal`/`Rubric` building blocks and `setTaskStatus`. `site/src/scripts/practice-grade-llm.ts`
  (P3) does **not** exist and must NOT be imported.
- **Optional follow-on (P3):** once the P3 LLM grader lands, a `review` task could add an
  open-ended critique mode (learner writes their review prose → graded against the planted
  findings as the rubric). This is a clean extension point (`findings[]` already encodes the
  grading key) and is explicitly out of scope here.

## Risks & mitigations

- **Schema ↔ mirror ↔ lint parity drift.** The schema exists in `content.config.ts` AND a
  hand-copy in `practice-schema.test.ts`. *Mitigation:* update both in Phase 1; the mirror's
  tests fail loudly if they diverge. The runtime lint parity rule is generic (recurses all
  `{en,ru}`), so it needs no per-field maintenance.
- **`diff.lang` enum too narrow.** Diffs span many languages/unified-diff. *Mitigation:* keep
  `lang` a freeform `z.string().min(1)` (fence hint only), not an enum — avoids blocking authors.
- **Authoring realistic diffs is the hard part.** A weak/contrived diff defeats the exercise.
  *Mitigation:* seed from real failure patterns the curriculum already teaches (double-callback,
  N+1, stale effect deps, untested error branch); reuse the depth bar; each finding must name a
  concrete, defensible issue with a real fix in `explanation`. Include ≥1 decoy where useful so
  the exercise tests *discrimination*, not just spotting.
- **Scope creep into LLM grading.** *Mitigation:* v1 is checklist/reveal only — explicitly no P3,
  no new island, no execution harness. Open-ended critique is deferred.
- **Practice-count linter (3–5 tasks).** Appending a review task can push a file to 6.
  *Mitigation:* target files currently at 3–4 tasks, or replace a weaker task; verify count after.
- **`dangerouslySetInnerHTML` on findings prose vs `<pre>` diff.** The diff `code` MUST render as
  a text child (it contains `<`/`{`); only the finding/decoy explanations use
  `dangerouslySetInnerHTML` (matching existing reveals). *Mitigation:* keep this split explicit
  in the renderer and in review.
```
