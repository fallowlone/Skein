# Live Debug Simulation — interactive "debug this" task type (P6 MVP)

**Date:** 2026-06-05
**Plan ID:** P6 of register `docs/superpowers/specs/2026-06-05-senior-readiness-gaps-register.md`
**Status:** Not started
**Effort:** Medium–Large
**Severity:** Medium-High

## REQUIRED SUB-SKILL

> Before any code phase, invoke **`superpowers:test-driven-development`**. The two
> deterministic phases (verification runner, schema+lint) are strict red→green→refactor:
> write the failing Vitest first with a real broken/fixed code sample, watch it fail,
> then implement. Do not write implementation before a failing test exists.

---

## Conventions for the executing agent

- **No git commits unless the user explicitly asks.** Author files, run the build/tests,
  report. Leave the working tree for the user to review.
- **Bun only.** `cd site && bun run build` (Astro build + linter), `bun run test` (Vitest).
- **Import alias.** Use `~/` (→ `site/src/`) in components; never `..` relative climbs.
- **No console.log** left in shipped component/util code.
- **Bilingual or it doesn't ship.** Every learner-facing string is `{ en, ru }`. The
  practice parity lint (`practice.ts`) fails the build on `en === ru` prose ≥ 25 chars.
- **Reuse before you build.** This plan deliberately reuses the QuickJS execution model
  already in `JsSandbox.tsx` and the `applyExecCheck` grader in `practice-grade.ts`.
  Do not introduce a second JS runtime.
- Verify each phase against its success criteria before moving on.

## This is an MVP — read the scope boundary first

The register flags this as the **highest build-cost item**. Resist scope creep. The MVP is:

- **JS/TS in the existing in-browser QuickJS sandbox ONLY.** This is the one runtime
  the learner already runs code in (`JsSandbox.tsx`, `quickjs-emscripten`, WASM, code-split).
- **Synchronous logic only.** Known gotcha (memory `project_deep-tracks`, and visible in
  `JsSandbox.tsx`): the QuickJS context does **not** drain the Promise job queue, so
  `await`/`setTimeout`/microtasks never resolve. Every MVP debug task must be a bug in
  **synchronous** code (closures, off-by-one, wrong comparator, mutation-during-iteration,
  bad boundary condition). Async bugs are explicitly out of scope for the MVP.
- **3–4 seed tasks**, converted from existing high-value `incident` content.

**Explicitly deferred to follow-up plans (NOT in this MVP):**
- SQL "debug this" via `SqlSandbox`/pglite.
- Debug-by-logs (a failing artifact whose evidence is a log/trace, not a code file).
- Async/timer/event-loop bugs (blocked by the QuickJS job-draining limitation).
- A full multi-file editor or syntax-highlighted IDE. The MVP editor is the existing
  `<textarea>`-based one from `JsSandbox.tsx`.
- Hypothesis critique by the P3 LLM grader (optional compose point, see Dependencies).

---

## Problem & goal

**Problem (P6).** "Incident" practice is static prose: 398 `incident` + 1008 `diagnose`
tasks are text reveals. The learner reads a postmortem; they never investigate a real
failing artifact, even though live sandboxes exist.

**Goal.** An interactive **`debug`** task type: the learner is handed a runnable but
**broken** JS artifact plus **evidence** (the error / wrong output / failing assertion),
forms a hypothesis, edits the code in a live sandbox, and re-runs until it works. The task
is **verified by running a hidden assertion** against the learner's edited code in the
same in-browser engine `JsSandbox` already uses. Pass = the assertion holds with no error.

**Why it matters.** Senior judgment is forged in incidents — debugging unfamiliar failures
under uncertainty. Running the investigation ≠ reading the writeup.

---

## How `debug` differs from existing types (design grounding)

Read these before designing (all confirmed):

- `site/src/content.config.ts` — Zod schema. `SandboxTask` (`type:"sandbox"`,
  `runtime:"sql"|"js"|"parametric"`, `setup?`, `expected?: ExecCheck`) pairs a prompt with
  a runnable sandbox and an `ExecCheck`. `FixTask` (`type:"fix"`, `grading.mode:"exec"`,
  `runtime`, `setup?`, `check: ExecCheck`) ships a broken `starter` string but renders it
  as a **read-only `<pre>`**, then gives a *blank* JsSandbox to rewrite into.
- `IncidentTask` — `steps[]` of `{label,prompt,reveal}` BiText; pure text reveal. **These
  are the scenario seeds.**
- `site/src/components/pedagogy/JsSandbox.tsx` — the execution model to reuse:
  `getQuickJS()` → `newContext()` → wire `console.log` capture → `evalCode(setup + "\n" + code)`
  → on `result.error` throw the dumped message; else apply `check` via `applyExecCheck`.
- `site/src/scripts/practice-grade.ts` — `applyExecCheck(check, result)` + `ExecCheck`
  kinds (`stdout-equals|stdout-contains|rows-equal|no-error`). Reuse as-is.
- `site/src/components/pedagogy/PracticeSection.tsx` — the host. `TaskBody` switches on
  `task.type` and dispatches to a renderer; `TYPE_HINT` carries the per-type bilingual hint.

**`debug` = `sandbox` + a broken pre-filled starter the learner edits in place + a hidden
verify assertion run after their edit.** Concretely it differs from the two neighbours:

| | `fix` (exec) | `sandbox` | **`debug` (new)** |
|---|---|---|---|
| starter shown | read-only `<pre>` | none | **editable, pre-filled** |
| learner writes | from-scratch in blank box | from-scratch | **edits the broken artifact** |
| evidence panel | none | none | **yes — the error/log/wrong output** |
| verification | `check` (visible in JSON, run on learner output) | `expected` | **hidden `verify` assertion appended after learner code** |
| hints ladder | no | no | **yes — progressive** |
| reveal (full fix) | model | no | **yes — the corrected code + explanation** |

The key new mechanic vs. `sandbox`/`fix`: the learner edits a **pre-seeded broken file**,
and verification runs a **hidden assertion** they cannot see in the editor.

---

## Phase 0 — Design the `debug` task shape & verification mechanism

No code. Produce the decisions below and record them inline in this plan's "Decisions"
addendum or in the schema comment. These bind the later phases.

- [ ] **Task shape.** Define the `debug` task object (extends `TaskBase`: `id`, `difficulty`,
      `estMin`, `title{en,ru}`, `prompt{en,ru}`). New fields:
  - `starter: string` — the **broken** runnable JS the learner sees pre-filled in the editor.
    (Language-neutral code; one string, not BiText — same as `FixTask.starter`.)
  - `evidence: { en, ru }` — the failure the learner is shown: error text, wrong output,
    or failing-assertion message. BiText (the *narration* may differ per locale; raw
    machine output may legitimately be identical — note the lint `LANG_NEUTRAL_FIELDS`
    exemption already covers a field literally named `evidence`, reuse that name).
  - `setup?: string` — optional shared prelude prepended before learner code (helpers,
    fixtures). Same role as `SandboxTask.setup`.
  - `verify: string` — the **hidden** assertion appended *after* the learner's code. It
    runs in the same VM and must `throw` (or `console.log` a sentinel) when the bug is
    unfixed. Never rendered in the editor or any reveal.
  - `check: ExecCheck` — reuse the existing grader. Decision: the `verify` snippet should
    `console.log("__PASS__")` on success and the `check` is `{kind:"stdout-contains",
    value:"__PASS__"}`; an unfixed bug makes `verify` throw → `applyExecCheck` returns false
    on `result.error`. This reuses `applyExecCheck` verbatim with zero changes.
  - `hints: { en, ru }[]` — ordered, progressive hint ladder (revealed one at a time).
    Min 1, max 4.
  - `reveal: { en, ru }` — the full corrected code + why-it-broke explanation, shown only
    after pass or on explicit "show solution".
- [ ] **Verification mechanism (reuse JsSandbox's engine).** Program assembled and run is:
      `setup + "\n" + learnerCode + "\n" + verify`. Same `getQuickJS → newContext → console
      capture → evalCode` path as `JsSandbox.tsx`. Pass iff no VM error **and** `check`
      holds. This guarantees the learner's *actual edited code* satisfies the assertion —
      not a textual diff.
- [ ] **Keeping `verify` hidden but runnable.** The learner-facing editor binds only to
      `starter`; `verify`/`setup` are concatenated **inside the runner**, never put in the
      textarea and never sent to any reveal/hint string. (They live in the JSON, which is a
      build-time artifact bundled into the page — acceptable: this is a learning site, not a
      CTF; the threat model is "don't make it trivially copy-pasteable from the visible
      editor", not cryptographic secrecy. Document this limitation explicitly.)
- [ ] **Async limitation → scope.** Reconfirm every seed task is synchronous. Add a one-line
      comment in the schema near the `debug` definition: *"MVP: synchronous logic only —
      QuickJS does not drain the Promise job queue."*
- [ ] **Renderer placement.** Decide: a new `Debug` component **inside `PracticeSection.tsx`**
      (mirrors `Incident`/`Blanks` which live there), reusing a small shared runner util.
      The runner util is extracted so it is unit-testable headless (Phase 1).

**Phase 0 done when:** the field list, the `verify`→`check` convention, and the
hidden-assertion concatenation strategy are written down and the async scope line is set.

---

## Phase 1 — TDD the verification runner (deterministic, pure)

Extract the JsSandbox execution model into a **pure, headless-testable** runner so the
"run learner code + hidden assertion → pass/fail/error" logic is covered by Vitest with
**real code samples**, exactly mirroring how `JsSandbox.test.tsx` exists today.

New file: `site/src/scripts/debug-runner.ts`

```ts
export type DebugRunResult =
  | { status: "pass" }
  | { status: "fail"; stdout: string }      // ran clean but assertion not met
  | { status: "error"; message: string };   // threw / syntax error

// Assembles setup + learnerCode + verify, runs in QuickJS (same engine as JsSandbox),
// applies the ExecCheck. Pure async fn; no DOM.
export async function runDebug(args: {
  setup?: string;
  learnerCode: string;
  verify: string;
  check: ExecCheck;
}): Promise<DebugRunResult>;
```

- [ ] **Write `site/src/scripts/debug-runner.test.ts` FIRST (red).** Use real, executable
      samples — not mocks. Mirror the style of `JsSandbox.test.tsx`. At minimum:
  - **broken sample fails:** a known-broken closure-in-loop snippet
    (`for (var i...) arr.push(()=>i)`) + a `verify` asserting `arr.map(f=>f())` equals
    `[0,1,2]` → expect `status: "fail"` or `"error"` (whichever the verify produces).
  - **fixed sample passes:** the corrected snippet (`let i`) + same `verify` →
    expect `status: "pass"`.
  - **syntax error reports an error:** `learnerCode = "const x ="` → expect
    `status: "error"` with a non-empty `message`.
  - **verify hidden from output:** assert the returned object contains no copy of the
    `verify` source (defensive — the runner must not leak it into `stdout`/`message`).
  - Run `bun run test` and **watch these fail** (runner not implemented).
- [ ] **Implement `runDebug` (green).** Lift the QuickJS block from `JsSandbox.tsx`
      (`getQuickJS`, `newContext`, console capture, `evalCode(program)`, dispose discipline).
      `program = (setup?setup+"\n":"") + learnerCode + "\n" + verify`. On `result.error`
      → `{status:"error", message}`. Else apply `check` via `applyExecCheck`; pass →
      `{status:"pass"}`, else `{status:"fail", stdout}`. **Refactor `JsSandbox.tsx` to call
      `runDebug`/a shared core** so there is a single execution path (avoid drift) — but keep
      `JsSandbox`'s public props identical so `fix`/`sandbox` rendering is unchanged.
- [ ] Run `bun run test` → **green**.

**Phase 1 done when:** broken→fail, fixed→pass, syntax→error all pass headlessly, and
`JsSandbox.test.tsx` still passes (no regression in the shared engine).

---

## Phase 2 — TDD schema + lint for the `debug` type (deterministic)

- [ ] **Extend Zod in `site/src/content.config.ts`.** Add `DebugTask`:
  ```ts
  const DebugTask = TaskBase.extend({
    type: z.literal("debug"),
    starter: z.string().min(1),
    setup: z.string().optional(),
    verify: z.string().min(1),
    check: ExecCheck,
    evidence: BiText,
    hints: z.array(BiText).min(1).max(4),
    reveal: BiText,
  });
  ```
  Add `DebugTask` to the `PracticeTask` discriminated union. (No change to the
  `practice`/`lab` collections — both already accept `PracticeTask[]`.)
- [ ] **TDD the lint additions (write failing tests first in
      `site/src/lint/rules/practice.test.ts`).** New `debug`-specific rules in
      `practice.ts` (and call them from the existing build lint pass):
  - **`debug` requires `starter` ≠ a no-op / non-empty** (already min(1) at schema, but add
    a lint that `starter` and `verify` are both present for `debug` tasks — defensive against
    hand-edits). Test: a `debug` task with empty `verify` is flagged.
  - **`verify` must not appear inside any learner-visible field** (`starter`, `reveal.en`,
    `reveal.ru`, `prompt`, `hints`) — guards the "hidden assertion stays hidden" invariant.
    Test: a task whose `reveal.en` contains the `verify` string is flagged.
  - **parity:** confirm `evidence` keeps its existing `LANG_NEUTRAL_FIELDS` exemption (a
    `debug` task with identical machine-output `evidence` must NOT be flagged) and that
    `hints`/`reveal` BiText ARE still parity-checked. Add a test mirroring the existing
    evidence test in `practice.test.ts`.
- [ ] Implement the lint rules → run `bun run test` → green.
- [ ] Confirm `debug` is **not** force-required anywhere: `PRACTICE_REQUIRED_TRACKS` /
      `checkPracticeCount` count any task type; no change needed (a lesson can satisfy its
      3–5 count with or without a `debug` task).

**Phase 2 done when:** schema accepts a valid `debug` task and rejects a malformed one;
the new lint tests pass; the hidden-assertion-leak guard is enforced.

---

## Phase 3 — `debug` renderer in PracticeSection (non-TDD, UI)

Add a `Debug` component **inside `PracticeSection.tsx`** (alongside `Incident`, `Blanks`)
and wire it into the `TaskBody` switch. Reuse existing classes/buttons (`oa-btn`,
`bg-card-2`, `border-hairline`) — no new design tokens.

- [ ] **`TaskBody` switch:** add `case "debug":` → `<Debug ... />`. Add a `TYPE_HINT.debug`
      bilingual entry (e.g. EN: "Read the evidence, form a hypothesis, edit the code, and
      re-run until the check passes." / RU equivalent).
- [ ] **`Debug` component layout:**
  - **Evidence panel** — render `task.evidence` (BiText) in the same `<pre>` style the
    `diagnose`/`fix` evidence uses (`bg-card-2 border-hairline`). Label it "Evidence" /
    "Что наблюдаем".
  - **Editor + Run** — reuse `JsSandbox`'s editor mechanic. Simplest path: render a
    `JsSandbox` seeded with `initialCode = task.starter`, but the **Run** must execute via
    the new `runDebug` path with `setup`+`verify`+`check`, not the plain `check`. Two clean
    options — pick one in Phase 0:
    1. Extend `JsSandbox` with an optional `verify?: string` prop; when present it appends
       it after learner code (uses the shared core from Phase 1). Preferred — minimal new UI.
    2. A bespoke editor in `Debug` that calls `runDebug` directly. Use only if (1) muddies
       `JsSandbox`'s props.
  - **Verdict** — pass → green "✓ fixed" / "✓ починено", mark task `done` via
    `setTaskStatus(lessonKey, task.id, "done")` + `onChange()`. Fail → "✗ not yet" + show
    captured stdout/error (never the `verify` source).
  - **Progressive hints** — a "Hint" button revealing `task.hints[i]` one at a time
    (mirror the `Incident` step-reveal pattern). On first hint, set status `attempted`.
  - **Reveal solution** — a `Reveal`-style button showing `task.reveal` (corrected code +
    explanation). Revealing the solution does NOT auto-mark `done` (the learner must still
    run a passing fix) — or marks `done` to match the `fix(self)`/`Reveal` convention; pick
    one in Phase 0 and be consistent. (Recommend: reveal does not grant `done`; only a green
    run does, since this is a *runnable* type.)
- [ ] **Hydration budget.** `debug` adds no new island — it renders inside the single
      `PracticeSection` island (already `client:visible`). `checkPracticeSandboxBudget`
      needs no change. Confirm the lab page exemption still holds.
- [ ] No `console.log` left in the component.

**Phase 3 done when:** a `debug` task renders evidence + editable broken code + Run + hints
+ reveal, and a correct edit turns the verdict green and marks the task done.

---

## Phase 4 — Seed 3–4 `debug` tasks from existing `incident` content

Convert high-value, **synchronous-bug** incidents into runnable `debug` tasks. Each is a new
or appended task in a real practice JSON whose `lessonKey` maps to a ready EN+RU lesson
(so `checkPracticeLessonKey` passes). Keep each lesson's task count in 3–5.

Pick 3–4 classic synchronous bugs (each must run & break in QuickJS; verify sync only):

- [ ] **Closure-in-loop** (`var` vs `let` capturing the loop index). Source seed: any
      JS-engine / base-cs closures lesson. `verify` asserts the produced array of results.
- [ ] **Off-by-one** (boundary in a slice/loop, e.g. a windowing or pagination helper
      returning one element too few/many). `verify` asserts exact output for a fixture.
- [ ] **Wrong comparator sort** (`arr.sort()` lexicographic on numbers, or a comparator
      returning a boolean). Convert from an algorithms/sorting incident. `verify` asserts
      numeric ordering.
- [ ] **Mutation-during-iteration** (splicing an array inside its own `for`/`forEach`,
      skipping elements). `verify` asserts the filtered result is correct.

For each task:
- [ ] Author `starter` (the broken code), `setup` (fixtures if needed), `verify`
      (`console.log("__PASS__")` on success; throws/omits on failure), `check`
      (`{kind:"stdout-contains", value:"__PASS__"}`).
- [ ] Bilingual `title`, `prompt`, `evidence`, `hints[]`, `reveal` (EN+RU). Reuse the
      narrative from the seeding `incident` so prose quality stays senior-grade.
- [ ] **Manually verify in QuickJS semantics:** the *broken* `starter` + `verify` must
      FAIL, and the *intended fix* + `verify` must PASS. (Lift both through the Phase-1
      runner in a scratch test or the browser before committing the JSON.)

**Phase 4 done when:** 3–4 `debug` tasks exist in real practice files, each broken→edit→pass
works in the browser, parity lint clean.

---

## File structure

```
site/src/scripts/
  debug-runner.ts                     NEW — pure runDebug(setup,learnerCode,verify,check) over QuickJS
  debug-runner.test.ts                NEW — TDD: broken→fail, fixed→pass, syntax→error
  practice-grade.ts                   reuse applyExecCheck/ExecCheck (no change, or tiny re-export)

site/src/content.config.ts            EDIT — add DebugTask to PracticeTask union

site/src/lint/rules/
  practice.ts                         EDIT — debug-specific rules (verify present, no-leak)
  practice.test.ts                    EDIT — failing tests first for the above

site/src/components/pedagogy/
  PracticeSection.tsx                 EDIT — case "debug" + <Debug> component + TYPE_HINT.debug
  JsSandbox.tsx                       EDIT — call shared core (Phase 1) and/or accept verify? prop

site/src/content/practice/<track>/<unit>/<lesson>.json   EDIT — 3–4 seeded debug tasks
docs/superpowers/plans/2026-06-05-live-debug-simulation.md   (this file)
```

---

## Success criteria

- [ ] `bun run test` green, including: `debug-runner.test.ts` (broken→fail, fixed→pass,
      syntax→error, no-leak) and the new `practice.test.ts` debug lint cases.
- [ ] A `debug` task end-to-end **in the browser**: broken starter shown + evidence,
      learner edits, Run → hidden `verify` runs in QuickJS, correct fix turns verdict
      green and marks the task done; wrong fix stays red with stdout/error (no `verify` leak).
- [ ] Schema accepts a well-formed `debug` task and rejects a malformed one (missing
      `verify`/`starter`/`evidence`).
- [ ] Lint: hidden-assertion-leak guard flags a `verify` string appearing in a visible field;
      `evidence` keeps its language-neutral exemption; `hints`/`reveal` are parity-checked.
- [ ] `cd site && bun run build` green (Astro build + linter), no new hydration/budget
      warnings beyond the known baseline; page count unchanged or +0 (no new routes).
- [ ] 3–4 seeded `debug` tasks live, each synchronous, each broken→fix verified.
- [ ] No `console.log` in shipped code; `~/` imports only.

---

## Dependencies, risks, scope guards

**Dependencies**
- **Hard:** reuses `JsSandbox.tsx`'s QuickJS execution model (`quickjs-emscripten`) and
  `applyExecCheck`/`ExecCheck` from `practice-grade.ts`. No new runtime, no new dependency.
- **Optional compose:** P3 (LLM judgment feedback) could later critique the learner's
  *written hypothesis* before they edit. Out of scope here — `debug` ships pass/fail by
  assertion only. Leave a `// P3 hook:` comment if a hypothesis textarea is added later.

**Risks & mitigations**
- **Sandbox async limitation** — QuickJS doesn't drain the Promise job queue; `await`/timers
  never resolve. *Mitigation:* MVP is synchronous-only, enforced by author discipline +
  the schema comment + Phase-4 manual verification. Async debug is a follow-up plan.
- **Hiding the `verify` assertion** — the JSON is bundled into the page, so `verify` is not
  cryptographically secret. *Mitigation:* keep it out of the visible editor and all reveal
  strings (lint-enforced no-leak guard); document that the threat model is "not trivially
  visible in the editor", not "unrecoverable". Acceptable for a learning site.
- **Editor UX** — the MVP reuses the existing `<textarea>` editor (no syntax highlighting).
  *Mitigation:* keep starters short and self-contained; defer a richer editor.
- **Engine drift** — refactoring `JsSandbox` to share the runner core risks regressing
  `fix`/`sandbox`. *Mitigation:* keep `JsSandbox` props identical; `JsSandbox.test.tsx`
  must stay green after the refactor.
- **Security** — executing learner code: the QuickJS WASM VM already isolates execution from
  the host page; no `eval` on the main realm, no network/FS. No new surface added.

**Scope guard (repeat):** JS/TS browser sandbox, synchronous bugs, 3–4 seeds. SQL, logs,
async, multi-file editor, and LLM hypothesis critique are all follow-ups. Ship the tight MVP.
