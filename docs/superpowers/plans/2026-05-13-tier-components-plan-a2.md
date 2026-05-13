# Tier expansion Phase A2 — 5 MVP exercise components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 MVP exercise components (Quiz, DragOrder, TraceScenario, DebugLog, TradeoffMatrix) as zero-hydration Astro components so future pieces can use them in TierAccordion slots without breaching the 5-island hydration cap.

**Architecture:** Each component is an `.astro` file that server-renders all interactive states into HTML, then attaches behavior via a single `<script>` block (matches the TierAccordion.astro pattern shipped in A1). State (e.g. "this quiz answered") is held in `data-*` attributes or `localStorage` under the existing `awesome.user-state.v1` key.

**Tech Stack:** Astro 5, TypeScript inline scripts, Tailwind utility classes (match existing `my-8 rounded-2xl border-2 ...` block style), Vitest for any extracted helper logic.

---

## Assumptions

- Astro components, not Preact. Each component renders all alternative panels server-side; JS toggles visibility. Same pattern as `TierAccordion.astro` (committed in A1 merge dc0f01e).
- i18n strings added to `site/src/i18n/ui.json` under keys `quiz.*`, `dragOrder.*`, `trace.*`, `debugLog.*`, `tradeoff.*`, plus shared `exercise.showAnswer`, `exercise.tryAgain`.
- Exercise component names already pre-registered in `site/src/lint/rules/exercise-counts.ts` (`EXERCISE_COMPONENTS` set). No linter change needed.
- No vitest tests for pure-render Astro components — Astro Container API testing is heavy and the rendering is trivial. Tests only for any extracted helper modules with branching logic.
- Each component takes `id: string` and `lang: Locale` as base props.
- Components must render in MDX via `<ComponentName ...>` JSX form (Astro components are valid MDX elements).
- Sample usage block at end of each component task — included in plan, MDX writer copies into piece.

## File structure

| File | Action | Responsibility |
|---|---|---|
| `site/src/components/pedagogy/Quiz.astro` | Create | MCQ with per-wrong-answer feedback |
| `site/src/components/pedagogy/DragOrder.astro` | Create | Drag-drop ordering of items into correct sequence |
| `site/src/components/pedagogy/TraceScenario.astro` | Create | Multi-step scenario walkthrough with reveal-next-step |
| `site/src/components/pedagogy/DebugLog.astro` | Create | Show log/output, hint button, reveal answer |
| `site/src/components/pedagogy/TradeoffMatrix.astro` | Create | Constraints × options grid, click row to pick, reveal feedback |
| `site/src/i18n/ui.json` | Modify | Add exercise UI labels (EN + RU) |
| `site/src/components/pedagogy/fixtures.mdx` | Create | Throwaway sample-usage fixture for smoke-test build |

Total: 7 files. 7 tasks.

---

## Shared conventions (apply across all 5 components)

**Container styling**:
```
class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6 w-full"
```

**Title row**:
```
<header class="flex items-center justify-between mb-3">
  <h3 class="font-bold text-bbg-ink">{title}</h3>
  <span class="text-xs font-mono text-bbg-muted">{type-label}</span>
</header>
```

**Button — primary**:
```
class="mt-4 px-4 py-1.5 rounded-full bg-bbg-success text-white text-sm font-semibold"
```

**Button — secondary**:
```
class="mt-4 px-4 py-1.5 rounded-full border-2 border-bbg-success text-bbg-success text-sm font-semibold"
```

**Feedback text**:
```
class="text-sm text-red-600 mt-1"  (wrong)
class="text-sm text-green-700 mt-1"  (correct)
```

**localStorage key for persistence**: `awesome.user-state.v1`, under `exercises[<piece-slug>][<exercise-id>] = { completed: bool, lastAt: number }`. Reads + writes via inline script using same defensive try/catch as TierAccordion.

---

## Task 1: Quiz component

**Files:**
- Create: `site/src/components/pedagogy/Quiz.astro`

Quiz: a single MCQ question with 2-5 answer choices. Click choice → marks correct/wrong + shows per-wrong-answer feedback (misconception text). User can change answer until correct. Once correct, persists to localStorage.

**Props:**
```typescript
type Props = {
  id: string;                    // stable ID, e.g. "syn-ack-purpose"
  pieceSlug: string;             // e.g. "networking/03-tcp-handshake"
  lang: Locale;
  question: string;
  choices: Array<{ label: string; correct?: boolean; misconception?: string }>;
};
```

- [ ] **Step 1: Write component**

Create file with this exact content:

```astro
---
import { t, type Locale } from "../../i18n";

type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  question: string;
  choices: Array<{ label: string; correct?: boolean; misconception?: string }>;
};

const { id, pieceSlug, lang, question, choices } = Astro.props;
---
<section
  id={id}
  data-quiz
  data-piece-slug={pieceSlug}
  class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6 w-full"
>
  <header class="flex items-center justify-between mb-3">
    <h3 class="font-bold text-bbg-ink">{t("quiz.title", lang)}</h3>
    <span class="text-xs font-mono text-bbg-muted">MCQ</span>
  </header>
  <p class="text-bbg-ink mb-4">{question}</p>
  <ul class="space-y-2">
    {choices.map((c, i) => (
      <li>
        <button
          type="button"
          data-choice-index={i}
          data-correct={c.correct ? "true" : "false"}
          data-misconception={c.misconception ?? ""}
          class="w-full text-left px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
        >{c.label}</button>
        <div data-feedback-for={i} class="text-sm mt-1" hidden></div>
      </li>
    ))}
  </ul>
</section>

<script>
  type State = { completed: boolean; lastAt: number };
  const KEY = "awesome.user-state.v1";

  function readExerciseState(pieceSlug: string, exerciseId: string): State | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.exercises?.[pieceSlug]?.[exerciseId] ?? null;
    } catch { return null; }
  }

  function writeExerciseState(pieceSlug: string, exerciseId: string, state: State) {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.exercises ??= {};
      parsed.exercises[pieceSlug] ??= {};
      parsed.exercises[pieceSlug][exerciseId] = state;
      localStorage.setItem(KEY, JSON.stringify(parsed));
    } catch {}
  }

  function initQuiz(root: HTMLElement) {
    const id = root.id;
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const stored = readExerciseState(pieceSlug, id);
    if (stored?.completed) {
      root.classList.add("opacity-80");
    }
    root.querySelectorAll<HTMLButtonElement>("button[data-choice-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.choiceIndex;
        const correct = btn.dataset.correct === "true";
        const misconception = btn.dataset.misconception ?? "";
        root.querySelectorAll<HTMLElement>("[data-feedback-for]").forEach((f) => {
          f.hidden = true;
          f.textContent = "";
          f.className = "text-sm mt-1";
        });
        const feedback = root.querySelector<HTMLElement>(`[data-feedback-for="${idx}"]`);
        if (!feedback) return;
        feedback.hidden = false;
        if (correct) {
          feedback.textContent = "✓";
          feedback.className = "text-sm mt-1 text-green-700 font-semibold";
          writeExerciseState(pieceSlug, id, { completed: true, lastAt: Date.now() });
          root.classList.add("opacity-80");
        } else {
          feedback.textContent = misconception || "Not quite — try another.";
          feedback.className = "text-sm mt-1 text-red-600";
        }
      });
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-quiz]").forEach(initQuiz);
  }

  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Smoke check (render a fixture)**

Defer to Task 7 — fixture renders all 5 components together.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/pedagogy/Quiz.astro
git commit -m "feat(pedagogy): Quiz component (MCQ + per-wrong-answer feedback)"
```

---

## Task 2: DragOrder component

**Files:**
- Create: `site/src/components/pedagogy/DragOrder.astro`

DragOrder: present N items in shuffled order; user drags to arrange in correct sequence; "Check" button validates. Per-item visual feedback (✓ correct position / red border wrong position).

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  prompt: string;
  items: string[];   // CORRECT order; component shuffles on mount
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
  items: string[];
};

const { id, pieceSlug, lang, prompt, items } = Astro.props;
const indexed = items.map((label, i) => ({ correctIndex: i, label }));
---
<section
  id={id}
  data-drag-order
  data-piece-slug={pieceSlug}
  data-correct-order={JSON.stringify(indexed.map((x) => x.correctIndex))}
  class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6 w-full"
>
  <header class="flex items-center justify-between mb-3">
    <h3 class="font-bold text-bbg-ink">{t("dragOrder.title", lang)}</h3>
    <span class="text-xs font-mono text-bbg-muted">{t("dragOrder.dragHint", lang)}</span>
  </header>
  <p class="text-bbg-ink mb-4">{prompt}</p>
  <ol data-items class="space-y-2">
    {indexed.map((item) => (
      <li
        draggable="true"
        data-correct-index={item.correctIndex}
        class="cursor-move px-3 py-2 border border-gray-300 rounded bg-gray-50 select-none"
      >{item.label}</li>
    ))}
  </ol>
  <div class="mt-4 flex gap-2">
    <button type="button" data-action="check" class="px-4 py-1.5 rounded-full bg-bbg-success text-white text-sm font-semibold">{t("exercise.check", lang)}</button>
    <button type="button" data-action="reset" class="px-4 py-1.5 rounded-full border-2 border-bbg-success text-bbg-success text-sm font-semibold">{t("exercise.reset", lang)}</button>
  </div>
  <div data-result class="text-sm mt-3" hidden></div>
</section>

<script>
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initDragOrder(root: HTMLElement) {
    const list = root.querySelector<HTMLOListElement>("[data-items]");
    if (!list) return;
    const original = Array.from(list.children) as HTMLElement[];

    function applyShuffle() {
      const shuffled = shuffle(original);
      list!.innerHTML = "";
      shuffled.forEach((el) => list!.appendChild(el));
    }
    applyShuffle();

    let dragged: HTMLElement | null = null;
    list.addEventListener("dragstart", (e) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "LI") dragged = t;
    });
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      const t = (e.target as HTMLElement).closest("li") as HTMLElement | null;
      if (!t || !dragged || t === dragged) return;
      const rect = t.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      list!.insertBefore(dragged, before ? t : t.nextSibling);
    });
    list.addEventListener("dragend", () => { dragged = null; });

    root.querySelector<HTMLButtonElement>('[data-action="check"]')!.addEventListener("click", () => {
      const result = root.querySelector<HTMLElement>("[data-result]")!;
      const current = Array.from(list!.children) as HTMLElement[];
      let allCorrect = true;
      current.forEach((li, pos) => {
        const correctIdx = Number(li.dataset.correctIndex);
        if (correctIdx === pos) {
          li.classList.remove("border-red-500");
          li.classList.add("border-green-500");
        } else {
          li.classList.remove("border-green-500");
          li.classList.add("border-red-500");
          allCorrect = false;
        }
      });
      result.hidden = false;
      result.textContent = allCorrect ? "✓" : "Not quite — keep trying.";
      result.className = allCorrect ? "text-sm mt-3 text-green-700 font-semibold" : "text-sm mt-3 text-red-600";
    });

    root.querySelector<HTMLButtonElement>('[data-action="reset"]')!.addEventListener("click", () => {
      applyShuffle();
      root.querySelector<HTMLElement>("[data-result]")!.hidden = true;
      list!.querySelectorAll("li").forEach((li) => li.classList.remove("border-green-500", "border-red-500"));
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-drag-order]").forEach(initDragOrder);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/DragOrder.astro
git commit -m "feat(pedagogy): DragOrder component (drag-drop sequence)"
```

---

## Task 3: TraceScenario component

**Files:**
- Create: `site/src/components/pedagogy/TraceScenario.astro`

TraceScenario: present scenario + N steps. User clicks "next" to reveal each step. Final step has "I traced it" confirmation. Persists "completed" to localStorage.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  scenario: string;
  steps: Array<{ prompt: string; reveal: string }>;
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
  scenario: string;
  steps: Array<{ prompt: string; reveal: string }>;
};

const { id, pieceSlug, lang, scenario, steps } = Astro.props;
---
<section
  id={id}
  data-trace-scenario
  data-piece-slug={pieceSlug}
  class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6 w-full"
>
  <header class="flex items-center justify-between mb-3">
    <h3 class="font-bold text-bbg-ink">{t("trace.title", lang)}</h3>
    <span data-step-counter class="text-xs font-mono text-bbg-muted">1/{steps.length}</span>
  </header>
  <p class="text-bbg-ink mb-4">{scenario}</p>
  <ol class="space-y-3" data-steps>
    {steps.map((s, i) => (
      <li data-step={i} hidden={i > 0}>
        <div class="font-semibold text-bbg-ink mb-1">{i + 1}. {s.prompt}</div>
        <div data-reveal class="text-sm text-bbg-muted" hidden>{s.reveal}</div>
        <button type="button" data-action="reveal" class="mt-2 px-3 py-1 rounded-full border border-bbg-success text-bbg-success text-xs font-semibold">{t("trace.reveal", lang)}</button>
        <button type="button" data-action="next" class="mt-2 ml-2 px-3 py-1 rounded-full bg-bbg-success text-white text-xs font-semibold" hidden>{t("trace.next", lang)}</button>
      </li>
    ))}
  </ol>
  <div data-done class="text-sm mt-4 text-green-700 font-semibold" hidden>{t("trace.done", lang)}</div>
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

  function initTrace(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const stepsList = root.querySelectorAll<HTMLLIElement>("[data-step]");
    const counter = root.querySelector<HTMLElement>("[data-step-counter]")!;
    const done = root.querySelector<HTMLElement>("[data-done]")!;
    let cursor = 0;

    function showStep(i: number) {
      stepsList.forEach((s, j) => { s.hidden = j !== i; });
      counter.textContent = `${i + 1}/${stepsList.length}`;
    }

    stepsList.forEach((step) => {
      const revealBtn = step.querySelector<HTMLButtonElement>('[data-action="reveal"]')!;
      const nextBtn = step.querySelector<HTMLButtonElement>('[data-action="next"]')!;
      const reveal = step.querySelector<HTMLElement>("[data-reveal]")!;

      revealBtn.addEventListener("click", () => {
        reveal.hidden = false;
        revealBtn.hidden = true;
        if (cursor < stepsList.length - 1) nextBtn.hidden = false;
        else {
          done.hidden = false;
          persist(pieceSlug, id);
        }
      });

      nextBtn.addEventListener("click", () => {
        cursor += 1;
        showStep(cursor);
      });
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-trace-scenario]").forEach(initTrace);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/TraceScenario.astro
git commit -m "feat(pedagogy): TraceScenario component (multi-step reveal)"
```

---

## Task 4: DebugLog component

**Files:**
- Create: `site/src/components/pedagogy/DebugLog.astro`

DebugLog: present a log/output blob + question. User can request hint (1 reveal) then full answer.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  output: string;       // log/output text (preserves whitespace)
  question: string;
  hint: string;
  answer: string;
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
  output: string;
  question: string;
  hint: string;
  answer: string;
};

const { id, pieceSlug, lang, output, question, hint, answer } = Astro.props;
---
<section
  id={id}
  data-debug-log
  data-piece-slug={pieceSlug}
  class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6 w-full"
>
  <header class="flex items-center justify-between mb-3">
    <h3 class="font-bold text-bbg-ink">{t("debugLog.title", lang)}</h3>
    <span class="text-xs font-mono text-bbg-muted">debug</span>
  </header>
  <pre class="bg-gray-900 text-gray-100 text-xs p-3 rounded overflow-x-auto"><code>{output}</code></pre>
  <p class="text-bbg-ink mt-4 mb-3">{question}</p>
  <div data-hint hidden class="text-sm text-bbg-muted bg-yellow-50 p-3 rounded mb-3">{hint}</div>
  <div data-answer hidden class="text-sm text-bbg-ink bg-green-50 p-3 rounded mb-3">{answer}</div>
  <div class="flex gap-2">
    <button type="button" data-action="hint" class="px-4 py-1.5 rounded-full border-2 border-bbg-success text-bbg-success text-sm font-semibold">{t("debugLog.hint", lang)}</button>
    <button type="button" data-action="answer" class="px-4 py-1.5 rounded-full bg-bbg-success text-white text-sm font-semibold">{t("debugLog.answer", lang)}</button>
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

  function initDebug(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    const hint = root.querySelector<HTMLElement>("[data-hint]")!;
    const answer = root.querySelector<HTMLElement>("[data-answer]")!;
    root.querySelector<HTMLButtonElement>('[data-action="hint"]')!.addEventListener("click", () => {
      hint.hidden = false;
    });
    root.querySelector<HTMLButtonElement>('[data-action="answer"]')!.addEventListener("click", () => {
      answer.hidden = false;
      persist(pieceSlug, id);
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-debug-log]").forEach(initDebug);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/DebugLog.astro
git commit -m "feat(pedagogy): DebugLog component (hint + reveal)"
```

---

## Task 5: TradeoffMatrix component

**Files:**
- Create: `site/src/components/pedagogy/TradeoffMatrix.astro`

TradeoffMatrix: list of options vs columns of constraints. User picks one option as "best fit"; reveals justification + critique of other choices.

**Props:**
```typescript
type Props = {
  id: string;
  pieceSlug: string;
  lang: Locale;
  prompt: string;
  options: Array<{
    label: string;
    correct?: boolean;
    justification: string;   // explanation: why this is/isn't best fit
  }>;
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
  options: Array<{ label: string; correct?: boolean; justification: string }>;
};

const { id, pieceSlug, lang, prompt, options } = Astro.props;
---
<section
  id={id}
  data-tradeoff
  data-piece-slug={pieceSlug}
  class="my-8 rounded-2xl border-2 border-bbg-success bg-white p-6 w-full"
>
  <header class="flex items-center justify-between mb-3">
    <h3 class="font-bold text-bbg-ink">{t("tradeoff.title", lang)}</h3>
    <span class="text-xs font-mono text-bbg-muted">tradeoff</span>
  </header>
  <p class="text-bbg-ink mb-4">{prompt}</p>
  <ul class="space-y-2">
    {options.map((o, i) => (
      <li>
        <button
          type="button"
          data-option-index={i}
          data-correct={o.correct ? "true" : "false"}
          class="w-full text-left px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
        >{o.label}</button>
        <div data-justify-for={i} class="text-sm mt-1 p-2 rounded" hidden>{o.justification}</div>
      </li>
    ))}
  </ul>
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

  function initTradeoff(root: HTMLElement) {
    const pieceSlug = root.dataset.pieceSlug ?? "";
    const id = root.id;
    root.querySelectorAll<HTMLButtonElement>("button[data-option-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.optionIndex;
        const correct = btn.dataset.correct === "true";
        root.querySelectorAll<HTMLElement>("[data-justify-for]").forEach((j) => { j.hidden = true; });
        const justify = root.querySelector<HTMLElement>(`[data-justify-for="${idx}"]`);
        if (!justify) return;
        justify.hidden = false;
        justify.className = correct
          ? "text-sm mt-1 p-2 rounded bg-green-50 text-green-900"
          : "text-sm mt-1 p-2 rounded bg-yellow-50 text-yellow-900";
        if (correct) persist(pieceSlug, id);
      });
    });
  }

  function init() {
    document.querySelectorAll<HTMLElement>("[data-tradeoff]").forEach(initTradeoff);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/pedagogy/TradeoffMatrix.astro
git commit -m "feat(pedagogy): TradeoffMatrix component (best-fit choice + justify)"
```

---

## Task 6: i18n labels for new components

**Files:**
- Modify: `site/src/i18n/ui.json`

- [ ] **Step 1: Read current ui.json**

Run: `cat site/src/i18n/ui.json | head -20`

Expected: object with top-level `en` and `ru` keys, each containing nested labels.

- [ ] **Step 2: Add new label keys**

Use Edit to add these keys under both `en:` and `ru:` blocks. Insert before the closing `}` of each block.

For `en`:

```
"quiz.title": "Quiz",
"dragOrder.title": "Order the steps",
"dragOrder.dragHint": "drag to reorder",
"trace.title": "Trace it",
"trace.reveal": "Reveal step",
"trace.next": "Next step",
"trace.done": "✓ Traced.",
"debugLog.title": "Debug this",
"debugLog.hint": "Hint",
"debugLog.answer": "Show answer",
"tradeoff.title": "Pick the best fit",
"exercise.check": "Check",
"exercise.reset": "Reset"
```

For `ru`:

```
"quiz.title": "Викторина",
"dragOrder.title": "Расставь шаги по порядку",
"dragOrder.dragHint": "перетащи, чтобы упорядочить",
"trace.title": "Проследи",
"trace.reveal": "Показать шаг",
"trace.next": "Следующий шаг",
"trace.done": "✓ Прослежено.",
"debugLog.title": "Найди ошибку",
"debugLog.hint": "Подсказка",
"debugLog.answer": "Показать ответ",
"tradeoff.title": "Выбери лучший вариант",
"exercise.check": "Проверить",
"exercise.reset": "Сброс"
```

(Place new keys alphabetically within each block if existing keys are sorted; otherwise append.)

- [ ] **Step 3: Verify JSON parses**

Run: `bunx --bun jq '.' site/src/i18n/ui.json | head -5`
Expected: pretty-printed JSON starts; no parse error.

- [ ] **Step 4: Run i18n test**

Run: `cd site && bunx vitest run src/i18n/index.test.ts`
Expected: PASS (existing tests still green).

- [ ] **Step 5: Commit**

```bash
git add site/src/i18n/ui.json
git commit -m "feat(i18n): labels for Quiz/DragOrder/TraceScenario/DebugLog/TradeoffMatrix"
```

---

## Task 7: Smoke-test fixture + build

**Files:**
- Create: `site/src/pages/fixtures/exercise-components.astro` (temporary, deletable)

- [ ] **Step 1: Write fixture page**

Create file with this content:

```astro
---
import Topic from "../../layouts/Topic.astro";
import Quiz from "../../components/pedagogy/Quiz.astro";
import DragOrder from "../../components/pedagogy/DragOrder.astro";
import TraceScenario from "../../components/pedagogy/TraceScenario.astro";
import DebugLog from "../../components/pedagogy/DebugLog.astro";
import TradeoffMatrix from "../../components/pedagogy/TradeoffMatrix.astro";
---
<Topic title="Exercise fixtures" lang="en">
  <Quiz
    id="q-syn"
    pieceSlug="fixtures/exercise-components"
    lang="en"
    question="What does the SYN flag do in a TCP handshake?"
    choices={[
      { label: "Initiates the connection", correct: true },
      { label: "Acknowledges receipt", misconception: "That's ACK, not SYN." },
      { label: "Closes the connection", misconception: "That's FIN." },
    ]}
  />
  <DragOrder
    id="do-handshake"
    pieceSlug="fixtures/exercise-components"
    lang="en"
    prompt="Order the TCP handshake packets:"
    items={["SYN (client → server)", "SYN-ACK (server → client)", "ACK (client → server)"]}
  />
  <TraceScenario
    id="ts-dns"
    pieceSlug="fixtures/exercise-components"
    lang="en"
    scenario="A user types example.com in the browser. Trace the resolver walk."
    steps={[
      { prompt: "Browser asks OS resolver for example.com IP", reveal: "OS resolver checks its cache; miss." },
      { prompt: "OS resolver queries root nameserver", reveal: "Root returns referral to .com TLD nameserver." },
      { prompt: "OS resolver queries .com TLD", reveal: "TLD returns referral to authoritative nameserver." },
      { prompt: "OS resolver queries authoritative", reveal: "Authoritative returns A record with IP. Done." },
    ]}
  />
  <DebugLog
    id="dl-syn-flood"
    pieceSlug="fixtures/exercise-components"
    lang="en"
    output={`$ ss -s
TCP:   12345 (estab 50, syn-recv 8000, ...)`}
    question="Why is syn-recv so high?"
    hint="Look at the ratio of established to syn-recv connections."
    answer="Likely SYN flood — incoming SYNs without follow-up ACK. Enable tcp_syncookies."
  />
  <TradeoffMatrix
    id="tm-protocol"
    pieceSlug="fixtures/exercise-components"
    lang="en"
    prompt="Mobile web app, 30% packet loss network, latency-sensitive API. Pick protocol:"
    options={[
      { label: "HTTP/1.1 with 6 parallel connections", justification: "Independent loss recovery per connection — survives loss but high handshake cost." },
      { label: "HTTP/2 on TCP", justification: "Single connection HOL-blocks all streams under loss. Worst on lossy mobile." },
      { label: "HTTP/3 (QUIC)", correct: true, justification: "QUIC stream independence + connection migration handle mobile loss + IP changes." },
    ]}
  />
</Topic>
```

- [ ] **Step 2: Run build**

Run: `cd site && bun run build 2>&1 | tail -10`
Expected: 302 pages built (301 + the new fixture), 0 errors. Lint emits its usual warnings but no new errors from the fixture page.

- [ ] **Step 3: Open in dev and smoke-check interactivity**

Run dev server (if not running): `cd site && bun run dev &`
Open: http://localhost:4321/fixtures/exercise-components

Manually verify each component:
- Quiz: click each choice; correct shows ✓ green, wrong shows misconception text.
- DragOrder: items are shuffled; drag to reorder; Check → ✓ when correct; Reset re-shuffles.
- TraceScenario: counter shows 1/4; click Reveal → text appears + Next becomes visible; Next → step 2/4; cycle to end → done message.
- DebugLog: hint button reveals hint box; answer button reveals answer box.
- TradeoffMatrix: click each option; reveals justification with green (correct) or yellow (others).

If any component is visually broken or non-interactive, file a fix subagent task.

- [ ] **Step 4: Delete fixture page**

Run: `rm site/src/pages/fixtures/exercise-components.astro && rmdir site/src/pages/fixtures 2>/dev/null || true`

(Fixture is throwaway — keeping it in main would generate a public page.)

- [ ] **Step 5: Final build to confirm no fixture leak**

Run: `cd site && bun run build 2>&1 | tail -3`
Expected: 301 pages (back to baseline), no errors.

- [ ] **Step 6: Commit deletion (or no commit if no other files dirty)**

Run: `git status --short`

If only the fixture page tracking is the diff and it's now deleted: nothing to commit (file was never committed — only existed during smoke test).

If anything else is dirty from accidental edits, stage + commit appropriately.

---

## Self-review

- [ ] All 5 components follow shared conventions (same border/spacing/button styling).
- [ ] All 5 components persist completion to localStorage under `awesome.user-state.v1 → exercises → <pieceSlug> → <exerciseId>`.
- [ ] All 5 components have `data-piece-slug` attribute for state targeting.
- [ ] i18n keys added in both `en` and `ru` blocks.
- [ ] No new linter rules needed — EXERCISE_COMPONENTS set in `exercise-counts.ts` already lists Quiz/DragOrder/TraceScenario/DebugLog/TradeoffMatrix.
- [ ] No Preact islands introduced (hydration cap preserved).
- [ ] Fixture used for smoke test, then deleted.

## What this plan does NOT cover

- **5 remaining components**: MetaphorComplete, RFCQuiz, DesignPrompt, AnimationStep, NumberDrill → Plan A3.
- **Piece migration** to use these components → Plan B.
- **localStorage migration**: existing user-state.ts doesn't have `exercises` field. Existing `recordVisit`/`markFaded` paths still work; new `exercises` field is independently created by these components. No migration needed because we always check + initialize defensively.
