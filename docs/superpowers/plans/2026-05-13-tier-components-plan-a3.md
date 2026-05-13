# Tier expansion Phase A3 — 5 remaining exercise components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 10-component MVP inventory by shipping MetaphorComplete, RFCQuiz, DesignPrompt, AnimationStep, and NumberDrill — all in the same Astro+vanilla JS pattern + Claude Design visual language established in A2.

**Architecture:** Zero-hydration Astro components, same shell as A2 (`rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8`), shared header convention with bbg.* dot + mono kind label + completed badge. State via localStorage under `awesome.user-state.v1 → exercises[<pieceSlug>][<exerciseId>]`.

**Tech Stack:** Astro 5, inline `<script>` per component, Tailwind utilities (existing tokens), prefers-reduced-motion respected via existing `animate-reveal-up` / `animate-check-pop` keyframes.

---

## Assumptions

- Same Astro+script pattern as A2 (no Preact, hydration cap preserved).
- All A3 components share the A2 shell + header convention. Visual language from Claude Design redesign already established.
- EXERCISE_COMPONENTS set in `site/src/lint/rules/exercise-counts.ts` already includes MetaphorComplete, RFCQuiz, DesignPrompt, NumberDrill (Sandbox covers AnimationStep — but AnimationStep is a new tag; add it to the set).
- i18n labels for new component-internal UI text added in T6.
- No tests for pure-render components. Tests only if a component extracts non-trivial helper logic.
- AnimationStep MVP: simple step-through SVG with play/pause/step buttons. Full timeline scrubber + speed controls deferred to a later iteration.

## File structure

| File | Action | Responsibility |
|---|---|---|
| `site/src/components/pedagogy/MetaphorComplete.astro` | Create | Fill-blank analogy with reveal |
| `site/src/components/pedagogy/RFCQuiz.astro` | Create | Compact MCQ specifically for RFC number recall |
| `site/src/components/pedagogy/DesignPrompt.astro` | Create | Open-ended prompt with reveal of canonical answer |
| `site/src/components/pedagogy/AnimationStep.astro` | Create | System-paced step animation wrapper (play/pause/step) |
| `site/src/components/pedagogy/NumberDrill.astro` | Create | Numeric input with tolerance check + reveal |
| `site/src/i18n/ui.json` | Modify | Add labels for new component UI text |
| `site/src/lint/rules/exercise-counts.ts` | Modify | Add `AnimationStep` to EXERCISE_COMPONENTS set if absent |
| `site/src/pages/fixtures/exercise-components-a3.astro` | Create then delete | Smoke fixture, removed after visual QA |

Total: 8 files. 8 tasks.

---

## Shared conventions (same as A2)

**Container**:
```
class="relative rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8"
```

**Header**:
```html
<header class="flex items-center justify-between mb-4">
  <div class="flex items-center gap-2.5">
    <span class="w-1.5 h-1.5 rounded-full bg-bbg-{HUE}"></span>
    <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">{KIND}</span>
  </div>
  <span data-completed-badge ... hidden>...Completed...</span>
</header>
```

**Hue per component**:
- MetaphorComplete: teal (jr, intuition)
- RFCQuiz: purple (sr, reference)
- DesignPrompt: success (sr, create)
- AnimationStep: success (mid, mechanism)
- NumberDrill: teal (mid+sr, apply)

**Reveal pattern**: `<div data-reveal hidden class="animate-reveal-up ..."> ... </div>`. Button click → `hidden = false` + persist completion.

**State persistence**: every successful completion writes `{completed: true, lastAt: Date.now()}` to localStorage.

---

## Task 1: MetaphorComplete component

**Files:**
- Create: `site/src/components/pedagogy/MetaphorComplete.astro`

MetaphorComplete: present an analogy with a blank, user fills in (free-text input), check against an accepted-answers list (case-insensitive, trimmed), reveal canonical answer + explanation on success or after 3 wrong attempts.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  setup: string;              // "TLS is like a sealed envelope. The envelope itself is the analogy. Now, the seal — what protocol-layer thing does THAT map to?"
  accepted: string[];         // ["cipher", "shared secret", "symmetric key", "session key"]
  canonical: string;          // "the symmetric key (cipher suite + session key)"
  explanation: string;        // 1-2 sentences why this mapping holds
};
```

- [ ] **Step 1: Write component**

```astro
---
import { t, type Locale } from "../../i18n";

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  setup: string;
  accepted: string[];
  canonical: string;
  explanation: string;
};

const { id, pieceSlug, lang, setup, accepted, canonical, explanation } = Astro.props;
const acceptedJson = JSON.stringify(accepted.map((s) => s.toLowerCase().trim()));
---
<section
  id={id}
  data-metaphor-complete
  data-piece-slug={pieceSlug}
  data-accepted={acceptedJson}
  class="relative rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8"
>
  <header class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2.5">
      <span class="w-1.5 h-1.5 rounded-full bg-bbg-teal"></span>
      <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">{t("metaphor.title", lang)}</span>
    </div>
    <span data-completed-badge class="inline-flex items-center gap-1 text-[11px] font-medium text-bbg-success" hidden>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
      Completed
    </span>
  </header>
  <p class="text-bbg-ink mb-4 text-[14.5px] leading-relaxed">{setup}</p>
  <div class="flex items-center gap-2">
    <input
      type="text"
      data-input
      placeholder={t("metaphor.placeholder", lang)}
      class="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-[14px] font-mono focus-visible:border-bbg-teal focus-visible:ring-2 focus-visible:ring-bbg-teal/30 outline-none"
    />
    <button
      type="button"
      data-action="check"
      class="inline-flex items-center gap-1.5 rounded-lg bg-bbg-teal text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-teal/90 transition focus-visible:ring-2 focus-visible:ring-bbg-teal focus-visible:ring-offset-2 outline-none"
    >{t("exercise.check", lang)}</button>
  </div>
  <div data-feedback class="mt-3 text-[12.5px]" hidden></div>
  <div data-reveal hidden class="mt-4 rounded-lg bg-panel-mint border-l-[3px] border-bbg-success px-4 py-3 animate-reveal-up">
    <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-success font-semibold mb-1">Answer</div>
    <div class="text-[13.5px] leading-relaxed text-green-900"><strong>{canonical}</strong> — {explanation}</div>
  </div>
</section>

<script>
  const KEY = "awesome.user-state.v1";

  function persist(pieceSlug: string, id: string) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.exercises ??= {};
      parsed.exercises[pieceSlug] ??= {};
      parsed.exercises[pieceSlug][id] = { completed: true, lastAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {}
  }

  function initMetaphor(root: HTMLElement) {
    const accepted: string[] = JSON.parse(root.dataset.accepted ?? "[]");
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const input = root.querySelector<HTMLInputElement>("[data-input]")!;
    const checkBtn = root.querySelector<HTMLButtonElement>('[data-action="check"]')!;
    const feedback = root.querySelector<HTMLElement>("[data-feedback]")!;
    const reveal = root.querySelector<HTMLElement>("[data-reveal]")!;
    const completedBadge = root.querySelector<HTMLElement>("[data-completed-badge]")!;
    let attempts = 0;
    let done = false;

    function finish() {
      done = true;
      reveal.hidden = false;
      completedBadge.hidden = false;
      root.classList.add("opacity-60");
      input.disabled = true;
      checkBtn.disabled = true;
      persist(pieceSlug, id);
    }

    checkBtn.addEventListener("click", () => {
      if (done) return;
      const v = input.value.toLowerCase().trim();
      if (!v) return;
      attempts += 1;
      if (accepted.includes(v) || accepted.some((a) => v.includes(a))) {
        feedback.hidden = false;
        feedback.textContent = "✓";
        feedback.className = "mt-3 text-[12.5px] text-bbg-success font-semibold";
        finish();
      } else if (attempts >= 3) {
        feedback.hidden = false;
        feedback.textContent = "Showing answer.";
        feedback.className = "mt-3 text-[12.5px] text-bbg-muted";
        finish();
      } else {
        feedback.hidden = false;
        feedback.textContent = `Not quite — try again (${attempts}/3).`;
        feedback.className = "mt-3 text-[12.5px] text-bbg-warn";
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkBtn.click();
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-metaphor-complete]").forEach(initMetaphor);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/MetaphorComplete.astro
git commit -m "feat(pedagogy): MetaphorComplete component (fill-blank analogy)"
```

---

## Task 2: RFCQuiz component

**Files:**
- Create: `site/src/components/pedagogy/RFCQuiz.astro`

RFCQuiz: compact "Which RFC defines X?" MCQ for senior tier. Visually similar to Quiz but tighter rows, mono RFC number badges.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  question: string;
  choices: Array<{ rfc: string; title?: string; correct?: boolean }>;
};
```

- [ ] **Step 1: Write component**

```astro
---
import { t, type Locale } from "../../i18n";

type Choice = { rfc: string; title?: string; correct?: boolean };
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  question: string;
  choices: Choice[];
};

const { id, pieceSlug, lang, question, choices } = Astro.props;
---
<section
  id={id}
  data-rfc-quiz
  data-piece-slug={pieceSlug}
  class="relative rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8"
>
  <header class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2.5">
      <span class="w-1.5 h-1.5 rounded-full bg-bbg-purple"></span>
      <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">{t("rfcQuiz.title", lang)}</span>
    </div>
    <span data-completed-badge class="inline-flex items-center gap-1 text-[11px] font-medium text-bbg-success" hidden>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
      Completed
    </span>
  </header>
  <p class="text-bbg-ink mb-4 text-[14.5px] leading-relaxed">{question}</p>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {choices.map((c, i) => (
      <button
        type="button"
        data-choice-index={i}
        data-correct={c.correct ? "true" : "false"}
        class="group text-left rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-bbg-paper hover:shadow-soft-sm px-3 py-2.5 flex items-center gap-3 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-bbg-purple focus-visible:ring-offset-2 outline-none"
      >
        <span data-badge class="font-mono shrink-0 rounded bg-gray-100 text-bbg-annot text-[11.5px] font-semibold px-2 py-0.5 tabular-nums">{c.rfc}</span>
        <span class="flex-1 text-[12.5px] leading-relaxed text-bbg-ink">{c.title ?? ""}</span>
        <span data-icon-correct class="text-bbg-success shrink-0" hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
        </span>
        <span data-icon-wrong class="text-bbg-warn shrink-0" hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </span>
      </button>
    ))}
  </div>
</section>

<script>
  const KEY = "awesome.user-state.v1";

  function persist(pieceSlug: string, id: string) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.exercises ??= {};
      parsed.exercises[pieceSlug] ??= {};
      parsed.exercises[pieceSlug][id] = { completed: true, lastAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {}
  }

  function initRfcQuiz(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const completedBadge = root.querySelector<HTMLElement>("[data-completed-badge]")!;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-choice-index]"));
    let done = false;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (done) return;
        const correct = btn.dataset.correct === "true";
        const iconC = btn.querySelector<HTMLElement>("[data-icon-correct]")!;
        const iconW = btn.querySelector<HTMLElement>("[data-icon-wrong]")!;
        const badge = btn.querySelector<HTMLElement>("[data-badge]")!;
        btn.classList.remove("border-gray-200", "bg-white", "hover:border-gray-300", "hover:bg-bbg-paper", "hover:shadow-soft-sm");
        if (correct) {
          btn.classList.add("border-bbg-success", "bg-panel-mint");
          badge.classList.remove("bg-gray-100", "text-bbg-annot");
          badge.classList.add("bg-bbg-success", "text-white");
          iconC.hidden = false;
          iconC.classList.add("animate-check-pop");
          done = true;
          completedBadge.hidden = false;
          root.classList.add("opacity-60");
          buttons.forEach((b) => { if (b !== btn) b.classList.add("opacity-50", "pointer-events-none"); });
          persist(pieceSlug, id);
        } else {
          btn.classList.add("border-bbg-warn", "bg-panel-rose");
          badge.classList.remove("bg-gray-100", "text-bbg-annot");
          badge.classList.add("bg-bbg-warn", "text-white");
          iconW.hidden = false;
        }
      });
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-rfc-quiz]").forEach(initRfcQuiz);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/RFCQuiz.astro
git commit -m "feat(pedagogy): RFCQuiz component (RFC number recall)"
```

---

## Task 3: DesignPrompt component

**Files:**
- Create: `site/src/components/pedagogy/DesignPrompt.astro`

DesignPrompt: open-ended "design X under constraints Y" prompt. Textarea for user to write their answer, "Reveal canonical answer" button shows author's reference answer with key points. No grading — self-assessment.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  prompt: string;
  constraints: string[];     // bullet list of constraints
  canonical: string;         // reference answer (multi-paragraph allowed)
  keyPoints: string[];       // 3-5 bullets the answer should cover
};
```

- [ ] **Step 1: Write component**

```astro
---
import { t, type Locale } from "../../i18n";

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  prompt: string;
  constraints: string[];
  canonical: string;
  keyPoints: string[];
};

const { id, pieceSlug, lang, prompt, constraints, canonical, keyPoints } = Astro.props;
---
<section
  id={id}
  data-design-prompt
  data-piece-slug={pieceSlug}
  class="relative rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8"
>
  <header class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2.5">
      <span class="w-1.5 h-1.5 rounded-full bg-bbg-success"></span>
      <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">{t("designPrompt.title", lang)}</span>
    </div>
    <span data-completed-badge class="inline-flex items-center gap-1 text-[11px] font-medium text-bbg-success" hidden>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
      Reviewed
    </span>
  </header>
  <h3 class="text-[15px] font-semibold text-bbg-ink leading-snug mb-3 tracking-tight">{prompt}</h3>
  {constraints.length > 0 && (
    <ul class="text-[12.5px] text-bbg-annot space-y-1 mb-4 list-disc pl-5">
      {constraints.map((c) => <li>{c}</li>)}
    </ul>
  )}
  <textarea
    data-input
    rows="5"
    placeholder={t("designPrompt.placeholder", lang)}
    class="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-[13.5px] font-sans focus-visible:border-bbg-success focus-visible:ring-2 focus-visible:ring-bbg-success/30 outline-none resize-y"
  ></textarea>
  <button
    type="button"
    data-action="reveal"
    class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-bbg-success text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-success/90 transition focus-visible:ring-2 focus-visible:ring-bbg-success focus-visible:ring-offset-2 outline-none"
  >{t("designPrompt.reveal", lang)}</button>
  <div data-reveal hidden class="mt-4 rounded-lg bg-panel-mint border-l-[3px] border-bbg-success px-4 py-3 animate-reveal-up">
    <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-success font-semibold mb-2">Reference answer</div>
    <div class="text-[13.5px] leading-relaxed text-green-900 mb-3">{canonical}</div>
    {keyPoints.length > 0 && (
      <>
        <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-success font-semibold mb-1.5">Should cover</div>
        <ul class="text-[12.5px] text-green-900 space-y-1 list-disc pl-5">
          {keyPoints.map((p) => <li>{p}</li>)}
        </ul>
      </>
    )}
  </div>
</section>

<script>
  const KEY = "awesome.user-state.v1";

  function persist(pieceSlug: string, id: string) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.exercises ??= {};
      parsed.exercises[pieceSlug] ??= {};
      parsed.exercises[pieceSlug][id] = { completed: true, lastAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {}
  }

  function initDesign(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const btn = root.querySelector<HTMLButtonElement>('[data-action="reveal"]')!;
    const reveal = root.querySelector<HTMLElement>("[data-reveal]")!;
    const completedBadge = root.querySelector<HTMLElement>("[data-completed-badge]")!;
    btn.addEventListener("click", () => {
      reveal.hidden = false;
      completedBadge.hidden = false;
      root.classList.add("opacity-60");
      btn.disabled = true;
      persist(pieceSlug, id);
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-design-prompt]").forEach(initDesign);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/DesignPrompt.astro
git commit -m "feat(pedagogy): DesignPrompt component (open-ended w/ reference reveal)"
```

---

## Task 4: AnimationStep component

**Files:**
- Create: `site/src/components/pedagogy/AnimationStep.astro`

AnimationStep: system-paced step animation wrapper. Accepts a slot containing the visual (SVG / HTML) and a list of step descriptions. Controls: Play (auto-advance every 2s) / Pause / Step / Reset. Active step highlighted; description shown under controls. Per compass § 3.4 (Höffler & Leutner d=0.31 system-paced advantage).

MVP scope: discrete steps (no continuous interpolation). Each step is a class added to the slot wrapper (`data-step-N-active`) — author writes CSS in the consuming MDX to style each step.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  title: string;
  steps: string[];            // step descriptions
  stepDuration?: number;      // ms, default 2000
};
```

(slot content = the visual)

- [ ] **Step 1: Write component**

```astro
---
import { t, type Locale } from "../../i18n";

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  title: string;
  steps: string[];
  stepDuration?: number;
};

const { id, pieceSlug, lang, title, steps, stepDuration = 2000 } = Astro.props;
---
<section
  id={id}
  data-animation-step
  data-piece-slug={pieceSlug}
  data-step-duration={stepDuration}
  data-total-steps={steps.length}
  data-current-step="0"
  class="relative rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8"
>
  <header class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2.5">
      <span class="w-1.5 h-1.5 rounded-full bg-bbg-success"></span>
      <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">{t("animationStep.title", lang)}</span>
    </div>
    <span data-step-counter class="font-mono text-[11px] text-bbg-muted tabular-nums">0/{steps.length}</span>
  </header>
  <h3 class="text-[15px] font-semibold text-bbg-ink leading-snug mb-4 tracking-tight">{title}</h3>

  <div data-stage data-step="0" class="rounded-lg border border-gray-200 bg-bbg-paper p-4 min-h-[200px] flex items-center justify-center">
    <slot />
  </div>

  <div class="mt-4 flex items-center gap-2">
    <button
      type="button"
      data-action="play"
      class="inline-flex items-center gap-1.5 rounded-lg bg-bbg-success text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-success/90 transition focus-visible:ring-2 focus-visible:ring-bbg-success focus-visible:ring-offset-2 outline-none"
    >▶ {t("animationStep.play", lang)}</button>
    <button
      type="button"
      data-action="pause"
      class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-bbg-annot text-[13px] font-medium px-3 py-2 hover:bg-gray-100 transition outline-none focus-visible:ring-2 focus-visible:ring-bbg-muted focus-visible:ring-offset-2"
      hidden
    >❚❚ {t("animationStep.pause", lang)}</button>
    <button
      type="button"
      data-action="step"
      class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white text-bbg-annot text-[13px] font-medium px-3 py-2 hover:bg-gray-100 transition outline-none focus-visible:ring-2 focus-visible:ring-bbg-muted focus-visible:ring-offset-2"
    >→ {t("animationStep.step", lang)}</button>
    <button
      type="button"
      data-action="reset"
      class="inline-flex items-center gap-1.5 rounded-lg text-bbg-muted text-[13px] font-medium px-3 py-2 hover:bg-gray-100 hover:text-bbg-ink transition outline-none focus-visible:ring-2 focus-visible:ring-bbg-muted focus-visible:ring-offset-2"
    >↻ {t("exercise.reset", lang)}</button>
  </div>

  <div data-step-desc class="mt-3 text-[13px] text-bbg-annot leading-relaxed min-h-[1.5em]"></div>
</section>

<script>
  const KEY = "awesome.user-state.v1";
  const STEPS_DATA = new WeakMap<HTMLElement, string[]>();

  function persist(pieceSlug: string, id: string) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.exercises ??= {};
      parsed.exercises[pieceSlug] ??= {};
      parsed.exercises[pieceSlug][id] = { completed: true, lastAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {}
  }

  function setStep(root: HTMLElement, n: number, descs: string[]) {
    const total = Number(root.dataset.totalSteps);
    const clamped = Math.max(0, Math.min(n, total));
    root.dataset.currentStep = String(clamped);
    const stage = root.querySelector<HTMLElement>("[data-stage]")!;
    stage.dataset.step = String(clamped);
    const counter = root.querySelector<HTMLElement>("[data-step-counter]")!;
    counter.textContent = `${clamped}/${total}`;
    const desc = root.querySelector<HTMLElement>("[data-step-desc]")!;
    desc.textContent = clamped > 0 && clamped <= descs.length ? descs[clamped - 1] : "";
  }

  function initAnimation(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const total = Number(root.dataset.totalSteps);
    const duration = Number(root.dataset.stepDuration);
    const descsAttr = root.dataset.descs;
    // descriptions are rendered by Astro but we need them as JS — store via template
    // For MVP we read them from a separate template element if present, else fallback to empty
    let descs: string[] = [];
    const tpl = root.querySelector<HTMLTemplateElement>("[data-step-descs]");
    if (tpl) {
      descs = JSON.parse(tpl.textContent ?? "[]");
    }
    STEPS_DATA.set(root, descs);

    const playBtn = root.querySelector<HTMLButtonElement>('[data-action="play"]')!;
    const pauseBtn = root.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
    const stepBtn = root.querySelector<HTMLButtonElement>('[data-action="step"]')!;
    const resetBtn = root.querySelector<HTMLButtonElement>('[data-action="reset"]')!;

    let timer: number | null = null;

    function stopTimer() {
      if (timer !== null) { clearInterval(timer); timer = null; }
      playBtn.hidden = false;
      pauseBtn.hidden = true;
    }
    function advance() {
      const cur = Number(root.dataset.currentStep);
      if (cur >= total) { stopTimer(); persist(pieceSlug, id); return; }
      setStep(root, cur + 1, descs);
      if (cur + 1 >= total) { stopTimer(); persist(pieceSlug, id); }
    }
    playBtn.addEventListener("click", () => {
      if (Number(root.dataset.currentStep) >= total) setStep(root, 0, descs);
      playBtn.hidden = true;
      pauseBtn.hidden = false;
      timer = window.setInterval(advance, duration);
    });
    pauseBtn.addEventListener("click", stopTimer);
    stepBtn.addEventListener("click", () => { stopTimer(); advance(); });
    resetBtn.addEventListener("click", () => { stopTimer(); setStep(root, 0, descs); });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-animation-step]").forEach(initAnimation);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

NOTE: To pass `steps` array to the inline script, we need a `<template data-step-descs>` element in the markup. Add this BEFORE the `<script>`:

```astro
<template data-step-descs set:html={JSON.stringify(steps)}></template>
```

Place that as a child of the section element (after the desc div, before the script attached at component scope is loaded). Update the component file accordingly.

- [ ] **Step 2: Verify template element placement**

The template tag must be inside the `<section>` so `root.querySelector("[data-step-descs]")` finds it.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/pedagogy/AnimationStep.astro
git commit -m "feat(pedagogy): AnimationStep component (system-paced play/pause/step)"
```

---

## Task 5: NumberDrill component

**Files:**
- Create: `site/src/components/pedagogy/NumberDrill.astro`

NumberDrill: numeric question with input + tolerance check. e.g. "If RTT=100ms, how many ms does 0-RTT save vs cold TLS 1.3?" Answer: 100 (±0 tolerance) or "If MSS=1460 and IW=10, max bytes in initial window?" → 14600 (±0).

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  question: string;
  expected: number;
  tolerance?: number;          // default 0
  unit?: string;               // e.g. "ms", "bytes"
  explanation: string;         // shown after correct or 3 wrong
};
```

- [ ] **Step 1: Write component**

```astro
---
import { t, type Locale } from "../../i18n";

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  question: string;
  expected: number;
  tolerance?: number;
  unit?: string;
  explanation: string;
};

const { id, pieceSlug, lang, question, expected, tolerance = 0, unit, explanation } = Astro.props;
---
<section
  id={id}
  data-number-drill
  data-piece-slug={pieceSlug}
  data-expected={expected}
  data-tolerance={tolerance}
  class="relative rounded-2xl border-2 border-gray-200 bg-white p-6 transition-opacity duration-200 my-8"
>
  <header class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2.5">
      <span class="w-1.5 h-1.5 rounded-full bg-bbg-teal"></span>
      <span class="font-mono text-[10.5px] uppercase tracking-[0.16em] text-bbg-muted font-medium">{t("numberDrill.title", lang)}</span>
    </div>
    <span data-completed-badge class="inline-flex items-center gap-1 text-[11px] font-medium text-bbg-success" hidden>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
      Completed
    </span>
  </header>
  <p class="text-bbg-ink mb-4 text-[14.5px] leading-relaxed">{question}</p>
  <div class="flex items-center gap-2">
    <input
      type="number"
      data-input
      step="any"
      class="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-[14px] font-mono tabular-nums focus-visible:border-bbg-teal focus-visible:ring-2 focus-visible:ring-bbg-teal/30 outline-none"
    />
    {unit && <span class="font-mono text-[12.5px] text-bbg-muted">{unit}</span>}
    <button
      type="button"
      data-action="check"
      class="inline-flex items-center gap-1.5 rounded-lg bg-bbg-teal text-white text-[13px] font-medium px-3.5 py-2 hover:bg-bbg-teal/90 transition focus-visible:ring-2 focus-visible:ring-bbg-teal focus-visible:ring-offset-2 outline-none"
    >{t("exercise.check", lang)}</button>
  </div>
  <div data-feedback class="mt-3 text-[12.5px]" hidden></div>
  <div data-reveal hidden class="mt-4 rounded-lg bg-panel-mint border-l-[3px] border-bbg-success px-4 py-3 animate-reveal-up">
    <div class="font-mono text-[10px] uppercase tracking-wider text-bbg-success font-semibold mb-1">Answer · {expected}{unit ? " " + unit : ""}</div>
    <div class="text-[13.5px] leading-relaxed text-green-900">{explanation}</div>
  </div>
</section>

<script>
  const KEY = "awesome.user-state.v1";

  function persist(pieceSlug: string, id: string) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.exercises ??= {};
      parsed.exercises[pieceSlug] ??= {};
      parsed.exercises[pieceSlug][id] = { completed: true, lastAt: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {}
  }

  function initDrill(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const expected = Number(root.dataset.expected);
    const tolerance = Number(root.dataset.tolerance);
    const input = root.querySelector<HTMLInputElement>("[data-input]")!;
    const checkBtn = root.querySelector<HTMLButtonElement>('[data-action="check"]')!;
    const feedback = root.querySelector<HTMLElement>("[data-feedback]")!;
    const reveal = root.querySelector<HTMLElement>("[data-reveal]")!;
    const completedBadge = root.querySelector<HTMLElement>("[data-completed-badge]")!;
    let attempts = 0;
    let done = false;

    function finish(correct: boolean) {
      done = true;
      reveal.hidden = false;
      completedBadge.hidden = false;
      root.classList.add("opacity-60");
      input.disabled = true;
      checkBtn.disabled = true;
      persist(pieceSlug, id);
    }

    checkBtn.addEventListener("click", () => {
      if (done) return;
      const v = Number(input.value);
      if (Number.isNaN(v)) return;
      attempts += 1;
      if (Math.abs(v - expected) <= tolerance) {
        feedback.hidden = false;
        feedback.textContent = "✓";
        feedback.className = "mt-3 text-[12.5px] text-bbg-success font-semibold";
        finish(true);
      } else if (attempts >= 3) {
        feedback.hidden = false;
        feedback.textContent = "Showing answer.";
        feedback.className = "mt-3 text-[12.5px] text-bbg-muted";
        finish(false);
      } else {
        feedback.hidden = false;
        feedback.textContent = `Not quite — try again (${attempts}/3).`;
        feedback.className = "mt-3 text-[12.5px] text-bbg-warn";
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkBtn.click();
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-number-drill]").forEach(initDrill);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/NumberDrill.astro
git commit -m "feat(pedagogy): NumberDrill component (numeric input + tolerance check)"
```

---

## Task 6: i18n labels for 5 new components

**Files:**
- Modify: `site/src/i18n/ui.json`

- [ ] **Step 1: Add new label keys**

Use Edit. Find the existing block ending with `"exercise.reset": "Reset"` (in `en:` block) and append before the closing `},`. Same for `ru:` block.

For `en` block, append:

```
,
"metaphor.title": "Complete the analogy",
"metaphor.placeholder": "your answer...",
"rfcQuiz.title": "Which RFC?",
"designPrompt.title": "Design challenge",
"designPrompt.placeholder": "Sketch your approach...",
"designPrompt.reveal": "Show reference answer",
"animationStep.title": "Watch the steps",
"animationStep.play": "Play",
"animationStep.pause": "Pause",
"animationStep.step": "Step",
"numberDrill.title": "Compute it"
```

For `ru` block, append:

```
,
"metaphor.title": "Закончи аналогию",
"metaphor.placeholder": "ответ...",
"rfcQuiz.title": "Какой RFC?",
"designPrompt.title": "Спроектируй",
"designPrompt.placeholder": "Опиши свой подход...",
"designPrompt.reveal": "Показать эталон",
"animationStep.title": "Посмотри по шагам",
"animationStep.play": "Запустить",
"animationStep.pause": "Пауза",
"animationStep.step": "Шаг",
"numberDrill.title": "Посчитай"
```

- [ ] **Step 2: Verify JSON parses + i18n tests pass**

Run: `bunx --bun jq '.' site/src/i18n/ui.json > /dev/null && cd site && bunx vitest run src/i18n/index.test.ts`
Expected: jq exits 0, vitest PASS.

- [ ] **Step 3: Commit**

```bash
git add site/src/i18n/ui.json
git commit -m "feat(i18n): labels for MetaphorComplete/RFCQuiz/DesignPrompt/AnimationStep/NumberDrill"
```

---

## Task 7: Update exercise-counts linter rule

**Files:**
- Modify: `site/src/lint/rules/exercise-counts.ts`

- [ ] **Step 1: Verify AnimationStep needs adding**

Run: `grep AnimationStep site/src/lint/rules/exercise-counts.ts || echo "MISSING"`

If `MISSING`, edit the file to add `"AnimationStep"` to `EXERCISE_COMPONENTS` set. Otherwise skip to step 3.

- [ ] **Step 2: Edit if missing**

Use Edit. Find:
```typescript
  "NumberDrill",
  "Sandbox",
```

Add `"AnimationStep",` before `"NumberDrill",`:
```typescript
  "AnimationStep",
  "NumberDrill",
  "Sandbox",
```

- [ ] **Step 3: Run lint rule tests**

Run: `cd site && bunx vitest run src/lint/rules/exercise-counts.test.ts`
Expected: 6/6 PASS.

- [ ] **Step 4: Commit (only if edit was needed)**

```bash
git add site/src/lint/rules/exercise-counts.ts
git commit -m "feat(lint): include AnimationStep in exercise-counts inventory"
```

---

## Task 8: Smoke-test fixture + visual QA

**Files:**
- Create: `site/src/pages/fixtures/exercise-components-a3.astro` (temporary)

- [ ] **Step 1: Write fixture page**

Create file with this content:

```astro
---
import Topic from "../../layouts/Topic.astro";
import MetaphorComplete from "../../components/pedagogy/MetaphorComplete.astro";
import RFCQuiz from "../../components/pedagogy/RFCQuiz.astro";
import DesignPrompt from "../../components/pedagogy/DesignPrompt.astro";
import AnimationStep from "../../components/pedagogy/AnimationStep.astro";
import NumberDrill from "../../components/pedagogy/NumberDrill.astro";
---
<Topic title="A3 fixture" lang="ru">
  <MetaphorComplete
    id="mc-tls-seal"
    pieceSlug="fixtures/a3"
    lang="ru"
    setup="TLS похож на запечатанный конверт. Конверт — это сама аналогия канала. А печать на конверте — какой механизм TLS она олицетворяет?"
    accepted={["симметричный ключ", "session key", "shared secret", "общий секрет", "cipher"]}
    canonical="симметричный ключ (cipher suite + session key)"
    explanation="После handshake обе стороны имеют общий симметричный ключ; всё последующее шифрование идёт им — это и есть «печать»."
  />

  <RFCQuiz
    id="rfc-tls13"
    pieceSlug="fixtures/a3"
    lang="ru"
    question="Какая RFC определяет TLS 1.3?"
    choices={[
      { rfc: "RFC 5246", title: "TLS 1.2" },
      { rfc: "RFC 8446", title: "TLS 1.3", correct: true },
      { rfc: "RFC 9000", title: "QUIC" },
      { rfc: "RFC 9114", title: "HTTP/3" },
    ]}
  />

  <DesignPrompt
    id="dp-retry"
    pieceSlug="fixtures/a3"
    lang="ru"
    prompt="Спроектируй retry-стратегию для HTTP-клиента, работающего по мобильной сети с 5% packet loss."
    constraints={[
      "RTT 200мс avg, до 1с в пиках",
      "Бюджет latency: p95 < 2с",
      "Нельзя удваивать нагрузку на сервер при retries",
    ]}
    canonical="Exponential backoff с jitter: 100мс → 200мс → 400мс → 800мс (max 4 попытки). Jitter ±30% чтобы избежать thundering herd. Retry-After header уважать. Идемпотентные методы (GET/HEAD/OPTIONS) ретраить; POST/PUT/DELETE — только если сервер вернул явный 503 с Retry-After."
    keyPoints={[
      "Exponential backoff (cap)",
      "Jitter (избегаем thundering herd)",
      "Idempotency-aware (GET vs POST)",
      "Retry-After header",
      "Circuit breaker для сервера, который явно деградировал",
    ]}
  />

  <AnimationStep
    id="as-tcp-handshake"
    pieceSlug="fixtures/a3"
    lang="ru"
    title="TCP 3-way handshake"
    steps={[
      "Клиент: отправляет SYN (seq=X)",
      "Сервер: отвечает SYN-ACK (seq=Y, ack=X+1)",
      "Клиент: подтверждает ACK (seq=X+1, ack=Y+1)",
      "Соединение установлено",
    ]}
  >
    <div class="font-mono text-[13px] text-bbg-annot">
      Stage at step <span data-stage-text>0</span>
    </div>
  </AnimationStep>

  <NumberDrill
    id="nd-iw-bytes"
    pieceSlug="fixtures/a3"
    lang="ru"
    question="MSS=1460 байт, начальное congestion window IW=10. Сколько байт TCP может отправить в первом окне до получения ACK?"
    expected={14600}
    unit="bytes"
    explanation="IW × MSS = 10 × 1460 = 14600 байт (RFC 6928)."
  />
</Topic>
```

- [ ] **Step 2: Build + check fixture renders**

Run: `cd site && bun run build 2>&1 | tail -5`
Expected: 302 pages (301 + fixture), 0 errors.

- [ ] **Step 3: Curl smoke check**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/fixtures/exercise-components-a3`
Expected: `200`.

- [ ] **Step 4: User visual QA**

User opens http://localhost:4321/fixtures/exercise-components-a3 and manually verifies all 5 components render and interact correctly. Implementer/controller pauses to ask for feedback.

- [ ] **Step 5: After approval — delete fixture**

Run: `rm site/src/pages/fixtures/exercise-components-a3.astro && rmdir site/src/pages/fixtures 2>/dev/null || true`

- [ ] **Step 6: Final build to confirm baseline**

Run: `cd site && bun run build 2>&1 | tail -3`
Expected: 301 pages.

- [ ] **Step 7: Commit deletion**

```bash
git add -A
git commit -m "chore(pedagogy): remove A3 fixture after visual QA approved"
```

---

## Self-review

- [ ] All 5 components follow A2 shell + header conventions.
- [ ] All 5 persist completion via `awesome.user-state.v1 → exercises`.
- [ ] No Preact islands (hydration cap preserved).
- [ ] AnimationStep added to EXERCISE_COMPONENTS set if missing.
- [ ] i18n keys added in both `en` and `ru` blocks.
- [ ] Fixture used for smoke test then removed.

## What this plan does NOT cover (deferred)

- **Piece migration** to use these components → Plan B.
- **Claude Design redesign pass for A3 components** if desired — separate iteration after initial implementation lands.
- **AnimationStep advanced features** (scrubber, speed controls, continuous interpolation) — MVP only.
