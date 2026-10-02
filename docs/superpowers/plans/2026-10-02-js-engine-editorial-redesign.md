# js-engine editorial redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the js-engine lesson pages into an editorial technical publication — article-first shell for all 41 lessons, two new interactive Tier-A schematics, visual QA proof — in EN+RU.

**Architecture:** Astro 5 server-rendered pages; `.astro` components with scoped `<style>`; EN/RU copy lives in per-component copy tables (existing `InlineCacheFig` pattern); interactivity via small progressive-enhancement scripts (semantic HTML + buttons, no new framework islands beyond the 5-island hydration cap). Width system: reading 680px / learning 840px / canvas 1120px via `SkeinFigure` `data-span`.

**Tech Stack:** Astro 5, Preact (islands only where already used), CSS custom properties from `src/styles/tokens.css`, Playwright (`scripts/shoot-batch.mjs`) for visual QA, bun for build/test.

**Spec:** `docs/superpowers/specs/2026-10-02-js-engine-editorial-redesign-design.md`

## Global Constraints

- Repository has ~1300 unrelated dirty files. NEVER `git add -A`. Stage only files this plan touches. No commit until the human asks.
- Bilingual or nothing: every copy change lands EN+RU in the same task. Linter (`bun run build` → `dist/lint-report.json`) enforces i18n parity.
- Hydration cap = 5 islands per lesson page. New interactive figures must be server-rendered HTML + at most one small `<script>` each.
- No new fonts, no new dependencies. Use existing tokens (`--font-display`, `--font-mono`, `--hairline`, `--ok`, `--warn`, `--danger`, `--accent`, `--muted`).
- Semantic color only: green=stable/optimized, amber=transition/warning, red=failed/deopt, blue=selected/active, muted=inactive. Never color alone — pair with labels/shape.
- Accessibility: semantic `<figure>`/`<figcaption>`, `aria-label` on figures, visible focus, `prefers-reduced-motion` respected, readable no-JS state.
- Responsive: 1440 / 1280 / 390px must all preserve comprehension. No font-size shrinking to fix wrapping.
- RU is first-class: check longer Russian titles at both viewports.
- Domain lock: fullstack engineering content only (already satisfied — no new content topics).
- Component imports use `~/` alias. No `..` relative segments.

## Review Focus

1. **RU text overflow** — Russian titles run 20-40% longer; a layout that works in EN may clip or wrap badly in RU. Test: shoot RU pages (`SKEIN_BASE` on a preview serving `/ru/...`) at 1440+390, compare against EN shots. (Task 8)
2. **No-JS state of interactive figures** — interaction must be progressive enhancement; the static first frame must already carry the explanation. Test: view source / disable JS in preview, confirm the initial state explains the mechanism. (Tasks 4, 5)
3. **Hydration island count regression** — adding `client:*` directives to new figures could exceed the 5-island cap on lessons that already have Quiz/RetrievalDrawer/PracticeSection. Test: count `client:` islands in rendered HTML for each reference lesson. (Tasks 4, 5)
4. **Non-editorial tracks unaffected** — `foundations`, `networking`, `base-cs` lessons use the same `Lesson.astro`; the editorial flag must not change their rendering. Test: build + spot-check one non-js-engine lesson page. (Task 1)
5. **Reduced-motion users** — steppers animate state transitions; animation must be gated behind `prefers-reduced-motion: no-preference`. Test: CSS grep + manual toggle in browser. (Tasks 4, 5)

---

### Task 1: Editorial shell for all lessons (drop the 13-key allowlist)

**Files:**
- Modify: `site/src/layouts/Lesson.astro` (lines ~155-170 allowlist; ~248-300 chrome block; end-of-lesson context block — new)
- Modify: `site/src/i18n/ui.json` (add `lesson.context.*` keys, en+ru)
- Test: `site/src/content/config.test.ts` (existing — must stay green), `bun run build` lint-report

**Interfaces:**
- Consumes: existing `editorialLessonKeys` Set, `isEditorialLesson` flag, `t()` from `~/i18n`, `PrereqLinks`/`ConceptMastery`/`MasteryLoop`/`ReturningLearner`/`AltitudeGauge` components (all keep working).
- Produces: `isEditorialLesson = true` for every lesson (the flag stays as a hook; non-js-engine tracks opt out later if needed — but per spec all lessons get the editorial header, so no opt-out is added in this task).

- [ ] **Step 1: Read the current shell**

Read `site/src/layouts/Lesson.astro` lines 150-340 to see the allowlist, editorial header, and the LMS chrome block (`{!isEditorialLesson && (...)}`).

- [ ] **Step 2: Make editorial mode universal**

In `Lesson.astro`, replace:

```ts
const isEditorialLesson = editorialLessonKeys.has(metricsKey);
```

with:

```ts
const isEditorialLesson = true;
```

Delete the now-unused `editorialLessonKeys` Set (lines ~155-169). Keep the `isEditorialLesson` const — `Topbar`, `RightRail`, and class bindings read it.

- [ ] **Step 3: Relocate LMS chrome into a Lesson Context block**

In the `{!isEditorialLesson && (...)}` block (which now never renders — delete it), the components were: `PrereqLinks`, `ConceptMastery`, `MasteryLoop`, `ReturningLearner`, and the pre-unit-check link. Replace with a single end-of-article `<details>` block rendered after the `<slot />` and before `ConnectedLessons`/`NextLessonCard` (find the existing position near the end of `<article>`):

```astro
{(concepts?.length || prereqs?.length || level) && (
  <details class="lesson-context">
    <summary>
      <span class="lk-label">{t("lesson.context.heading", lang)}</span>
      <span aria-hidden="true" class="lesson-context-chev">▸</span>
    </summary>
    <div class="lesson-context-body">
      {level && (
        <p><span class="lk-label">{t("lesson.altitude.cap", lang)}</span> {t(`lesson.altitude.${level}`, lang)}</p>
      )}
      <PrereqLinks lang={lang} links={prereqLinks} />
      <ConceptMastery lang={lang} ids={concepts ?? []} />
      <MasteryLoop lang={lang} />
      <ReturningLearner lang={lang} lessonKey={canonicalLessonKey} />
    </div>
  </details>
)}
```

Move the pre-unit-check nudge (`showPreUnitCheck`) inside the same details body, keeping its existing `<a class="pre-unit-check">` markup and `calibrateHref`.

Add scoped CSS in `Lesson.astro`'s `<style>`:

```css
.lesson-context {
  margin-top: 48px;
  border-top: 0.5px solid var(--hairline-2);
  padding-top: 16px;
}
.lesson-context summary {
  cursor: pointer; list-style: none;
  display: flex; align-items: center; gap: var(--s-2);
  font-family: var(--font-mono); font-size: var(--fs-mono-label);
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}
.lesson-context summary::-webkit-details-marker { display: none; }
.lesson-context-chev { transition: transform var(--dur-1) var(--ease); }
.lesson-context[open] .lesson-context-chev { transform: rotate(90deg); }
.lesson-context-body {
  margin-top: var(--s-4);
  display: grid; gap: var(--s-4);
  font-size: var(--fs-small); color: var(--ink-2);
}
```

- [ ] **Step 4: Add i18n keys**

In `site/src/i18n/ui.json`, add to `en`:

```json
"lesson.context.heading": "Lesson context",
```

and to `ru`:

```json
"lesson.context.heading": "Контекст урока",
```

(Keep keys alphabetical within the `lesson.*` group, matching the file's existing ordering.)

- [ ] **Step 5: Verify non-editorial tracks unaffected**

The editorial header now renders for every lesson. Spot-check that a `foundations` lesson still renders (its lessons use `lessonType: concept | coding` skeletons with their own layout — confirm by reading `site/src/pages/[lang]/learn/[track]/[unit]/[lesson].astro` and checking whether foundations pages route through `Lesson.astro` or their own layout). If foundations use their own layout, nothing changes for them. If they share `Lesson.astro`, the editorial header is the intended new default per spec — confirm no layout break (build passes, title renders once, no duplicate `<h1>`).

- [ ] **Step 6: Build + lint**

Run: `cd site && bun run build`
Expected: lint-report clean (`dist/lint-report.json`), no new warnings. Fix any i18n-parity complaint (missing RU key = build error).

- [ ] **Step 7: Stage-check (do NOT commit)**

Run: `git diff --check src/layouts/Lesson.astro src/i18n/ui.json`
Expected: no whitespace errors.

---

### Task 2: `01-how-js-runs/01-source-to-ast` — editorial rhythm pass (STRUCTURE)

**Files:**
- Modify: `site/src/content/lessons/en/js-engine/01-how-js-runs/01-source-to-ast/index.mdx`
- Modify: `site/src/content/lessons/ru/js-engine/01-how-js-runs/01-source-to-ast/index.mdx`
- Test: build lint-report; visual QA in Task 8

**Interfaces:**
- Consumes: `AstStructureFig` (existing, Tier-B learning-width AST schematic — KEEP), editorial shell from Task 1.
- Produces: lesson whose prose rhythm follows narrow prose → schematic → narrow prose → code → takeaway, with no card soup between.

- [ ] **Step 1: Read both lesson files fully**

Read EN and RU `index.mdx`. Note the current component order and where prose vs. figures sit.

- [ ] **Step 2: Verify the AST figure placement**

Confirm `<AstStructureFig lang="en" />` (EN line ~78) sits after the explanation paragraph it illustrates, not before any prose introduces the concept. If it leads the article, move it after the paragraph that asks "how does source become structure".

- [ ] **Step 3: Editorial rhythm edit (EN)**

Apply the rhythm rule: prose paragraphs ≤ ~90 words each; one idea per paragraph; headings are conceptual (serif H2), not label-like. Remove any card-like wrappers between prose and the figure. Ensure the `<Hook>` stays first (it is the article's opening paragraph — no metadata above it).

- [ ] **Step 4: Mirror edit (RU)**

Apply the same structural edit to the RU file. Do not shrink font sizes; if RU headings wrap to two lines, that is acceptable.

- [ ] **Step 5: Build**

Run: `cd site && bun run build`. Expected: clean.

---

### Task 3: `03-hidden-classes/01-shapes-and-maps` — editorial rhythm pass (TRANSFORMATION)

**Files:**
- Modify: `site/src/content/lessons/en/js-engine/03-hidden-classes/01-shapes-and-maps/index.mdx`
- Modify: `site/src/content/lessons/ru/js-engine/03-hidden-classes/01-shapes-and-maps/index.mdx`
- Test: build lint-report; visual QA in Task 8

**Interfaces:**
- Consumes: `MapAnatomyFig` + `ShapeTransitionFig` (existing schematics — KEEP both; they carry the mechanism).
- Produces: lesson where the two figures are separated by prose that states the transition question, per the visual-storytelling rule (QUESTION → MODEL → CHANGE → CONSEQUENCE → INSIGHT).

- [ ] **Step 1: Read both lesson files fully.**

- [ ] **Step 2: Sequence the figures**

Ensure the reading order is: prose posing "why do two objects with the same properties still differ internally?" → `ShapeTransitionFig` (the transition chain C0→C1→C2) → prose explaining insertion-order dependence → `MapAnatomyFig` (what a Map actually contains) → prose on object reuse (objA, objB → same Map). If figures are adjacent with no intervening prose, insert the missing connective paragraph (EN+RU).

- [ ] **Step 3: Card reduction**

Remove any `lk-panel`/`lk-callout` wrappers that restate the adjacent prose. Keep `Crux`/`KeyTakeaway` (they are the editorial bookends). Keep `Misconception` only if the lesson has a real misconception entry.

- [ ] **Step 4: Build.** Expected: clean.

---

### Task 4: New `ICStateStepper` component + integrate into `03-hidden-classes/04-inline-caches` (STATE)

**Files:**
- Create: `site/src/components/schematic/ICStateStepper.astro`
- Modify: `site/src/content/lessons/en/js-engine/03-hidden-classes/04-inline-caches/index.mdx`
- Modify: `site/src/content/lessons/ru/js-engine/03-hidden-classes/04-inline-caches/index.mdx`
- Test: `site/src/components/schematic/ICStateStepper.test.ts` (new — hydration/island count assertion), build lint-report, visual QA in Task 8

**Interfaces:**
- Consumes: `SkeinFigure` (span="canvas"), `TechnicalLabel`, `MachineValue` — all existing. Copy table pattern from `InlineCacheFig.astro`.
- Produces: `<ICStateStepper lang="en" | "ru" />` — a Tier-A canvas figure showing one property-access site evolving through three feedback states as receiver Maps are observed: MONOMORPHIC (one map) → POLYMORPHIC (two maps, slot holds both) → MEGAMORPHIC (slot gives up on shape guards, generic path). Interaction: `Step` button advances observation count; `Reset` restores. States are semantic HTML (not color-only): each state row carries a mono state label `IC STATE · MONOMORPHIC` etc.

- [ ] **Step 1: Write the test first**

Create `site/src/components/schematic/ICStateStepper.test.ts`:

```ts
import { describe, it, expect } from "vitest";
// Structural assertions on the component's static markup contract:
// the component must render its three states server-side (no-JS readable)
// and must not declare a client island.
import ICStateStepper from "./ICStateStepper.astro";

describe("ICStateStepper", () => {
  it("renders all three IC states server-side", async () => {
    const { html } = await ICStateStepper({ lang: "en" });
    expect(html).toContain("MONOMORPHIC");
    expect(html).toContain("POLYMORPHIC");
    expect(html).toContain("MEGAMORPHIC");
  });
  it("labels states with machine values, not color alone", async () => {
    const { html } = await ICStateStepper({ lang: "en" });
    expect(html).toMatch(/IC STATE · MONOMORPHIC/);
    expect(html).toMatch(/IC STATE · POLYMORPHIC/);
  });
});
```

- [ ] **Step 2: Run test — expect failure** (component does not exist).

Run: `cd site && bunx vitest run src/components/schematic/ICStateStepper.test.ts`
Expected: FAIL (cannot resolve import).

- [ ] **Step 3: Implement `ICStateStepper.astro`**

Follow the `InlineCacheFig.astro` structure exactly (copy table `{en, ru}`, `SkeinFigure` wrapper with `span="canvas" variant="canvas"`, scoped `<style>`, responsive collapse at 640px). The figure body:

- A "CALL SITE" node showing `p.x` (MachineValue).
- An "OBSERVATION FEED" row: receiver maps arriving in sequence — `M_Point, M_Point, M_Point` (monomorphic), then `M_Point, M_Rect, M_Point` (polymorphic), then `M_Point, M_Rect, M_User, M_Str, M_Arr…` (megamorphic, ellipsis via MachineValue `…`).
- A "FEEDBACKVECTOR SLOT" panel whose content changes per state:
  - MONOMORPHIC: `map: M_Point` + `handler: Smi(field #0)` (green/ok tone)
  - POLYMORPHIC: two entries `map: M_Point → Smi(field #0)` / `map: M_Rect → Smi(field #1)` (amber/warn tone — transition state)
  - MEGAMORPHIC: `state: generic lookup` (red/danger tone — optimization rejected)
- State rows are shown/hidden by the stepper script; the initial (no-JS) visible state is MONOMORPHIC with a `<noscript>`-safe note, and all three states exist in the DOM so the full mechanism is readable without JS.
- Controls: `<button class="ic-step">Step ▸</button>` and `<button class="ic-step-reset">Reset</button>` — semantic HTML, `type="button"`, visible focus styles.
- A small inline `<script is:inline>` (progressive enhancement, NOT a Preact island — zero hydration cost): advances an index 0→2, toggles `hidden` on state rows, updates `aria-live="polite"` status text. Guarded by `prefers-reduced-motion` for any transition (transitions are opacity-only, gated in CSS).

Copy tables (EN/RU) for: category `IC STATE EVOLUTION`, title, thesis, caption, labels (`CALL SITE`, `OBSERVATION FEED`, `FEEDBACKVECTOR SLOT`, `RECEIVERS OBSERVED`), state names, per-state explanations (2-3 sentences each — the teaching content: why one map enables a guarded load, why two maps still allow per-shape handlers, why diversity forces the generic path).

- [ ] **Step 4: Run test — expect pass.**

- [ ] **Step 5: Integrate into the lesson**

In EN `index.mdx`: add `import ICStateStepper from "~/components/schematic/ICStateStepper.astro";` to imports; place `<ICStateStepper lang="en" />` after the prose that explains the monomorphic→polymorphic transition and before the megamorphic discussion. The existing `InlineCacheFig` (first-execution lifecycle) stays where it is — the two figures answer different questions (lifecycle vs. state evolution).

- [ ] **Step 6: Mirror in RU** (`lang="ru"`).

- [ ] **Step 7: Verify island count**

Run: `cd site && bun run build`, then check the rendered lesson HTML (preview or dist) — count `client:` attributes on the page; must be ≤5 (the stepper's script is `is:inline`, not an island).

- [ ] **Step 8: Build.** Expected: clean.

---

### Task 5: New `EventLoopPredict` component + integrate into `07-async-deep/01-event-loop-recap` (EXECUTION + INTERACTION)

**Files:**
- Create: `site/src/components/schematic/EventLoopPredict.astro`
- Modify: `site/src/content/lessons/en/js-engine/07-async-deep/01-event-loop-recap/index.mdx`
- Modify: `site/src/content/lessons/ru/js-engine/07-async-deep/01-event-loop-recap/index.mdx`
- Test: `site/src/components/schematic/EventLoopPredict.test.ts` (new), build lint-report, visual QA in Task 8

**Interfaces:**
- Consumes: `SkeinFigure` (span="canvas"), `TechnicalLabel`, `MachineValue`. Copy-table pattern.
- Produces: `<EventLoopPredict lang="en" | "ru" />` — Tier-A interactive figure. A real code snippet (`setTimeout`, `Promise.resolve().then`, sync log) with a PREDICT step: "What runs next?" → `Run` reveals execution order step by step across three lanes: CALL STACK / MICROTASK QUEUE / TASK QUEUE. The teaching point: microtask queue drains completely before the next macrotask.

- [ ] **Step 1: Write the failing test** (`EventLoopPredict.test.ts`) — same shape as Task 4: asserts server-rendered lanes (`CALL STACK`, `MICROTASK QUEUE`, `TASK QUEUE`), the code snippet, and that the full execution order is present in static HTML (no-JS readable), and that the component declares no client island.

- [ ] **Step 2: Run test — expect failure.**

- [ ] **Step 3: Implement `EventLoopPredict.astro`**

Structure: copy table EN/RU; `SkeinFigure` canvas span; three lane columns (semantic `<section>` per lane, mono labels); the example code in a mono block; a PREDICT prompt (`<p class="elp-predict">` with the question); `Run` / `Step` / `Reset` buttons; an `aria-live="polite"` status line announcing each step ("① sync log", "② promise reaction — microtask", …). The script (`is:inline`) walks a fixed array of steps; each step highlights one lane entry (class toggle, opacity/transform only, reduced-motion gated). Static HTML contains the complete ordered execution list so no-JS readers get the full answer — the interaction replays causality, it is not the only path to the content.

Example (use this exact program — it demonstrates microtask-before-macrotask):

```js
console.log("start");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("end");
```

Expected order: `start → end → promise → timeout`.

- [ ] **Step 4: Run test — expect pass.**

- [ ] **Step 5: Integrate into lesson (EN)** — place after the prose describing the queues, before the recap. Existing `EventLoopTurnFig` stays (it shows one turn's anatomy; the new figure shows ordering causality across a whole program).

- [ ] **Step 6: Mirror in RU.**

- [ ] **Step 7: Verify island count ≤5.**

- [ ] **Step 8: Build.** Expected: clean.

---

### Task 6: `04-the-jit/05-deoptimization` — editorial rhythm + causality sequence (CAUSALITY)

**Files:**
- Modify: `site/src/content/lessons/en/js-engine/04-the-jit/05-deoptimization/index.mdx`
- Modify: `site/src/content/lessons/ru/js-engine/04-the-jit/05-deoptimization/index.mdx`
- Test: build lint-report; visual QA in Task 8

**Interfaces:**
- Consumes: `DeoptFrameFig` (existing — KEEP; it visualizes frame reconstruction).
- Produces: lesson where the causality chain (assumption → guard → fail → deopt → reconstruct → continue) is explicit in prose order, with the guard-fail sequence as a compact learning-width sequence (prose + mono annotations, no new component — use existing `MachineValue`/`TechnicalLabel` inline or a simple ordered list).

- [ ] **Step 1: Read both lesson files fully.**

- [ ] **Step 2: Verify causality order**

The prose must walk: OPTIMIZED CODE (assumption: shape == A) → runtime guard → actual: shape == B → GUARD FAILS → DEOPT → reconstruct general execution state → continue safely. If the lesson presents deopt as "the engine becomes slow" without the correctness framing, add the missing sentence (EN+RU): deoptimization is a correctness mechanism — the engine abandons an invalidated assumption and reconstructs a safe, general execution state; it is not merely a slowdown.

- [ ] **Step 3: Compact guard sequence**

Between the prose and `DeoptFrameFig`, add a learning-width sequence (an ordered list with mono values, e.g. `typeof x → Number ✓` / `receiver.map → M_Point ✗` / `guard fails → deopt`) using existing inline components only. No new figure.

- [ ] **Step 4: Card reduction** — remove panel wrappers that restate prose. Keep Crux/KeyTakeaway/Misconception where real.

- [ ] **Step 5: Build.** Expected: clean.

---

### Task 7: RU deep-check for all 5 reference lessons

**Files:**
- Modify (only if needed): the 5 RU `index.mdx` files from Tasks 2-6.
- Test: build lint-report (i18n parity rules); visual QA in Task 8

- [ ] **Step 1: RU parity lint**

Run: `cd site && bun run build` and read `dist/lint-report.json` — confirm zero i18n-parity findings for the 5 lessons (the build enforces glossary + parity; fix any reported items).

- [ ] **Step 2: RU length check**

For each of the 5 RU lessons, grep the RU titles/decks and compare character counts to EN. Any RU string >30% longer than its EN counterpart gets a wrap check at 390px in Task 8. List them now:

```bash
cd site && for u in 01-how-js-runs/01-source-to-ast 03-hidden-classes/01-shapes-and-maps 03-hidden-classes/04-inline-caches 04-the-jit/05-deoptimization 07-async-deep/01-event-loop-recap; do
  echo "== $u"; grep -m1 '^title:' src/content/lessons/ru/js-engine/$u/index.mdx; grep -m1 '^title:' src/content/lessons/en/js-engine/$u/index.mdx;
done
```

- [ ] **Step 3: Fix wrapping issues found** — structural fixes only (shorter RU deck phrasing, allowed line breaks), never font-size reduction.

- [ ] **Step 4: Build.** Expected: clean.

---

### Task 8: Visual QA — screenshots, browser inspection, validation

**Files:**
- Possibly Modify: any file from Tasks 1-7 (visual fixes only).
- Test: full `bun run build`, `git diff --check`, existing unit tests.

- [ ] **Step 1: Full build**

Run: `cd site && bun run build`. Expected: lint-report clean.

- [ ] **Step 2: Serve preview**

Run: `cd site && bun run preview -- --port 4322` (background). Wait for ready.

- [ ] **Step 3: Screenshot the reference batch (EN)**

Run: `cd site && node scripts/shoot-batch.mjs editorial 1440 1280 390`
Expected: 15 PNGs in `screenshots/batch-editorial/`, zero FAIL lines.

- [ ] **Step 4: Screenshot RU**

Temporarily point the batch at RU: `SKEIN_BASE=http://localhost:4322` with the script's URL path switched to `/ru/` (edit `shoot-batch.mjs` locally for the run, then revert — or run a one-off Playwright snippet). Produce `screenshots/batch-editorial-ru/`.

- [ ] **Step 5: Inspect every screenshot**

Check, at each width:
1. Editorial header: kicker → serif H1 → deck → quiet meta line; no LMS wall before the Hook.
2. Prose column ~680px at desktop; figure spans correct (learning vs canvas).
3. Steppers (Tasks 4-5): buttons visible, focus rings visible, initial state readable.
4. RU: no clipped/overlapping text; titles wrap acceptably.
5. Mobile 390: figures collapse (existing 640px media queries); no horizontal overflow.

- [ ] **Step 6: Fix findings** — visual/CSS fixes only, EN+RU together. Rebuild + re-shoot the affected lessons.

- [ ] **Step 7: Final validation**

```bash
cd site && bun run build && git diff --check $(git diff --name-only | grep -E 'js-engine|Lesson.astro|ui.json|schematic' | tr '\n' ' ')
```

Expected: build clean, no whitespace errors. Run existing unit tests for touched areas: `bunx vitest run src/components/diagram src/content/config.test.ts`.

- [ ] **Step 8: Report** — do NOT commit. Report to the human: lessons changed, before/after summary, screenshot paths, remaining findings.

---

## Self-Review

**Spec coverage:** editorial shell all-lessons (Task 1) ✓; typography/widths (existing tokens + SkeinFigure spans — Tasks 2-6 use them) ✓; 5-lesson visual audit (Tasks 2-6: AST KEEP, MapAnatomy+ShapeTransition KEEP, InlineCacheFig KEEP + new ICStateStepper, DeoptFrameFig KEEP + compact sequence, EventLoopTurnFig KEEP + new EventLoopPredict) ✓; 2 new interactive Tier-A figures (Tasks 4-5) ✓; EN/RU (every task bilingual; Task 7 deep-check) ✓; accessibility (tests assert no-JS readability + labels-not-color; reduced-motion in CSS) ✓; verification loop (Task 8) ✓; repository safety (Global Constraints) ✓.

**Spec deviation (noted):** the spec's per-lesson table said "REPLACE AlgoPoster" for the 5 reference lessons — inspection showed those 5 already carry real schematics (AlgoPoster was replaced in uncommitted tree work). The 28 remaining AlgoPoster embeds are in *other* js-engine lessons and are explicitly out of scope (later batch), matching the spec's "Out of scope" section.

**Placeholder scan:** no TBD/TODO; every step has concrete content or exact commands.

**Type consistency:** `ICStateStepper({ lang })` / `EventLoopPredict({ lang })` signatures match the `InlineCacheFig` prop pattern (`lang?: "en" | "ru"`); tests use the same vitest import style as existing `editorial-diagram.test.tsx`.

**Review Focus coverage:** RU overflow (Task 7 + Task 8 Step 4-5) ✓; no-JS state (Tasks 4-5 tests + Step 5 inspection) ✓; island count (Tasks 4-5 Step 7) ✓; non-editorial tracks (Task 1 Step 5) ✓; reduced-motion (Tasks 4-5 CSS gating + Task 8 inspection) ✓.
