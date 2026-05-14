# Browser Render Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `site/src/content/book/{en,ru}/browser/02-render-pipeline/index.mdx` from `status: stub` to `status: ready`, with full six-stage pipeline tour, interactive practice, and bilingual parity.

**Architecture:** Two MDX files (EN + RU) mirroring the template piece `networking/03-tcp-handshake/index.mdx`. One Preact island (`RetrievalDrawer client:load`); all other interactives are Astro components. Glossary updated with ~12 new render-pipeline terms (alphabetical EN+RU parity). Build-time linter enforces text budgets, hydration cap, depth-ID mapping, and sources requirement.

**Tech Stack:** Astro 5, Preact, Tailwind, MDX, TypeScript content collections, `bun` for build, `site/dist/lint-report.json` for verification.

---

## File Structure

Files this plan creates or modifies:

- **Modify:** `site/src/content/book/en/browser/02-render-pipeline/index.mdx` — full EN piece (frontmatter + body)
- **Modify:** `site/src/content/book/ru/browser/02-render-pipeline/index.mdx` — full RU piece (mirrors EN structure)
- **Modify:** `site/src/i18n/glossary.json` — add render-pipeline terms alphabetically

No new components. No new content collections. No new pages. No new scripts. The piece reuses the existing pedagogy/prose/layout component vocabulary.

---

## Task 1: Research and source-collection

**Files:**
- Read only (no writes in this task)

- [ ] **Step 1: Fetch primary source — web.dev critical rendering path**

Run:
```bash
curl -s https://web.dev/articles/critical-rendering-path | head -200
```

Capture: stage names used by web.dev (parse → render tree → layout → paint → composite), where they place style recalc, what they call out as render-blocking.

- [ ] **Step 2: Fetch primary source — Inside look at modern web browser (Mariko Kosaka, part 3)**

Run:
```bash
curl -s https://developer.chrome.com/blog/inside-browser-part3 | head -300
```

Capture: thread ownership (main vs compositor vs raster), layer tree concept, when composite-only updates are possible.

- [ ] **Step 3: Fetch primary source — CSS Will-Change spec**

Use Context7:
```
context7:resolve-library-id → "css will-change"
context7:query-docs (or fall back to: curl -s https://drafts.csswg.org/css-will-change/)
```

Capture: spec wording on hint semantics, GPU layer creation cost, abuse pattern.

- [ ] **Step 4: Fetch primary source — Chrome DevTools Performance panel reference**

Run:
```bash
curl -s https://developer.chrome.com/docs/devtools/performance/reference | head -200
```

Capture: exact flame strip labels (Parse HTML, Recalculate Style, Layout, Paint, Composite Layers) used by DevTools today.

- [ ] **Step 5: Compile a sources block for the frontmatter**

Output the following 8 URLs into a scratch note for later use in both EN and RU frontmatter:

```
- https://web.dev/articles/critical-rendering-path
- https://developer.chrome.com/docs/devtools/performance/reference
- https://developer.chrome.com/blog/inside-browser-part3
- https://drafts.csswg.org/css-will-change/
- https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work
- https://csstriggers.com/
- https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/
- https://web.dev/articles/rendering-performance
```

- [ ] **Step 6: Verify glossary has no duplicates**

Run:
```bash
grep -E '"(composite|compositor|layout|paint|reflow|repaint|raster|will_change|forced_sync_layout|style_recalc|layer|layout_thrash)"' site/src/i18n/glossary.json
```

Expected: empty output (none of these terms exist yet). If any appear, drop them from the glossary additions in Task 9.

---

## Task 2: Write EN frontmatter and opener

**Files:**
- Modify: `site/src/content/book/en/browser/02-render-pipeline/index.mdx` (lines 1-30, replace stub)

- [ ] **Step 1: Open the EN stub file**

Run:
```bash
cat site/src/content/book/en/browser/02-render-pipeline/index.mdx
```

Expected: 27-line stub with `status: stub` and a placeholder Crux.

- [ ] **Step 2: Replace frontmatter with the final shape**

Replace the top YAML block with exactly:

```yaml
---
slug: 02-render-pipeline
lang: en
pillar: browser
chapter: 02-browser
order: 2
title: "Render pipeline: parse → CSSOM → layout → paint → composite"
summary: "Six pipeline stages, who owns each thread, what triggers each invalidation, and how to read a DevTools flame strip to find the bottleneck."
readingMin: 22
status: ready
prereqs: ["01-event-loop"]
spiral: ["statefulness", "encapsulation"]
personas: ["bea", "sven"]
depth:
  mechanism: pipe-stages
  tradeoff: card-composite-cost
  failure_mode: mc-layout-thrash
  numbers: card-frame-numbers
sources:
  - https://web.dev/articles/critical-rendering-path
  - https://developer.chrome.com/docs/devtools/performance/reference
  - https://developer.chrome.com/blog/inside-browser-part3
  - https://drafts.csswg.org/css-will-change/
  - https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work
  - https://csstriggers.com/
  - https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/
  - https://web.dev/articles/rendering-performance
---
```

- [ ] **Step 3: Replace the imports block**

Right after the frontmatter, write exactly:

```mdx
import Crux from "../../../../../components/prose/Crux.astro";
import KeyTakeaway from "../../../../../components/prose/KeyTakeaway.astro";
import SpiralCue from "../../../../../components/prose/SpiralCue.astro";
import TierAccordion from "../../../../../components/pedagogy/TierAccordion.astro";
import RetrievalDrawer from "../../../../../components/pedagogy/RetrievalDrawer.tsx";
import PersonaTag from "../../../../../components/pedagogy/PersonaTag.astro";
import Quiz from "../../../../../components/pedagogy/Quiz.astro";
import DragOrder from "../../../../../components/pedagogy/DragOrder.astro";
import TraceScenario from "../../../../../components/pedagogy/TraceScenario.astro";
import DebugLog from "../../../../../components/pedagogy/DebugLog.astro";
import TradeoffMatrix from "../../../../../components/pedagogy/TradeoffMatrix.astro";
import RFCQuiz from "../../../../../components/pedagogy/RFCQuiz.astro";
import DesignPrompt from "../../../../../components/pedagogy/DesignPrompt.astro";
import NumbersCard from "../../../../../components/layout/NumbersCard.astro";
import Misconception from "../../../../../components/layout/Misconception.astro";
```

Verify: each path starts with exactly five `..` segments and ends with the correct extension (`.astro` or `.tsx`).

- [ ] **Step 4: Write the opening narrative + Crux**

Right after the imports, write:

```mdx
You hit Enter on a URL. Bytes start arriving. Somewhere between the first packet and the moment a button is clickable on screen, the browser ran a six-stage pipeline — and most pages spend the wrong amount of time in the wrong stage. The frame budget is 16.67 ms at 60 fps. If layout takes 12 ms, nothing else gets to finish, the frame drops, and the user sees jank.

<Crux>From bytes off the wire to pixels on screen — where does the time go?</Crux>

Two threads do the work. The **main thread** owns Parse HTML, CSSOM construction, style recalc, layout, and paint setup. The **compositor thread** assembles GPU-friendly layers and ships them to the GPU. Animations that stay on the compositor cost almost nothing per frame. Animations that fall back to layout cost the entire budget. The whole craft of render performance is keeping the work on the right thread.
```

- [ ] **Step 5: Verify Crux character count**

Run:
```bash
grep -A0 '<Crux>' site/src/content/book/en/browser/02-render-pipeline/index.mdx | head -1 | wc -c
```

Expected: ≤ 140 (the existing Crux is 78 chars).

- [ ] **Step 6: Commit checkpoint**

```bash
git add site/src/content/book/en/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline EN frontmatter + opener"
```

---

## Task 3: TierAccordion junior tier (EN)

**Files:**
- Modify: `site/src/content/book/en/browser/02-render-pipeline/index.mdx` (append after the Task 2 body)

- [ ] **Step 1: Open the TierAccordion wrapper**

Append:

```mdx
<TierAccordion id="pipe-stages" lang="en">
  <Fragment slot="junior">
```

- [ ] **Step 2: Write the junior metaphor**

Inside the junior fragment, write:

```mdx
    <p><strong>What the browser does in one sentence.</strong> It takes HTML + CSS + JS off the wire and turns them into pixels in six stages: read the markup, read the styles, decide which styles win, measure the boxes, fill in the pixels, glue the layers onto the screen.</p>
    <p><strong>The kitchen metaphor.</strong> The browser is a restaurant kitchen. Parsing HTML is reading the order ticket. CSSOM is reading the recipe book. Style is matching ingredients to dishes. Layout is measuring the plate and arranging food on it. Paint is doing the actual cooking — heat and colour. Composite is the runner picking up six plates at once and walking them to the table. If any station is slow, the whole table waits.</p>
    <p><strong>Why care.</strong> You hit 60 frames per second only if the whole kitchen finishes in 16.67 ms. Drop a frame and the user sees a stutter — a scrolling list judders, a button feels sticky, a chart lags behind the mouse. The fix is almost never "make JS faster" — it's "stop the kitchen from re-doing layout when it could have just rearranged plates."</p>
    <p><strong>Read-aloud frame.</strong> <PersonaTag id="bea" lang="en" /> opens a profile card. <PersonaTag id="sven" lang="en" /> narrates the kitchen: "0.5 ms parse the avatar div, 0.4 ms build the styles, 0.2 ms match selectors, 3 ms measure boxes — wait, the image hadn't loaded so we re-measured, that's another 2 ms — 1.5 ms paint, 0.5 ms composite. Frame is 8.1 ms. Fine. Now what if the user scrolls and we re-trigger layout fifty times per second? That's 100 ms per second on layout alone, six dropped frames, the scroll feels heavy."</p>
```

- [ ] **Step 3: Add junior DragOrder (stages in correct order)**

```mdx
    <DragOrder
      id="jr-drag-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      prompt="The browser runs these six stages in a fixed order. Drag them into the correct sequence."
      items={[
        { id: "parse", label: "Parse HTML → DOM tree" },
        { id: "cssom", label: "Build CSSOM from stylesheets" },
        { id: "style", label: "Style: match selectors, resolve cascade" },
        { id: "layout", label: "Layout: measure box positions and sizes" },
        { id: "paint", label: "Paint: fill pixels into bitmap layers" },
        { id: "composite", label: "Composite: assemble layers on the GPU" },
      ]}
      correctOrder={["parse", "cssom", "style", "layout", "paint", "composite"]}
    />
```

- [ ] **Step 4: Add junior Quiz × 2**

```mdx
    <Quiz
      id="jr-quiz-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      question="Which thread does most of the work in the render pipeline?"
      choices={[
        { label: "The main thread (parse, CSSOM, style, layout, paint setup)", correct: true },
        { label: "The compositor thread", misconception: "The compositor handles only the last stage — assembling layers. Everything before that runs on the main thread." },
        { label: "Web Workers", misconception: "Workers run application JS but cannot touch DOM or CSSOM. They do not run pipeline stages." },
        { label: "The GPU directly", misconception: "The GPU rasterises and composites, but it does not parse HTML or build the DOM." },
      ]}
    />
    <Quiz
      id="jr-quiz-2"
      pieceSlug="02-render-pipeline"
      lang="en"
      question="A page hits 60 fps. What is the per-frame budget?"
      choices={[
        { label: "16.67 ms (1000 ms divided by 60 frames)", correct: true },
        { label: "1 second per frame", misconception: "That would be 1 fps — three orders of magnitude too slow." },
        { label: "33 ms per frame", misconception: "33 ms is the budget at 30 fps. 60 fps cuts that in half." },
        { label: "100 ms per frame", misconception: "100 ms is the input-response threshold from the RAIL model — not the per-frame paint budget." },
      ]}
    />
```

- [ ] **Step 5: Close junior fragment**

```mdx
  </Fragment>
```

- [ ] **Step 6: Commit checkpoint**

```bash
git add site/src/content/book/en/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline EN junior tier"
```

---

## Task 4: TierAccordion middle tier (EN)

**Files:**
- Modify: `site/src/content/book/en/browser/02-render-pipeline/index.mdx` (append inside `<TierAccordion>`, after junior fragment)

- [ ] **Step 1: Open middle fragment**

```mdx
  <Fragment slot="middle">
```

- [ ] **Step 2: Write the six-stage cost table**

```mdx
    <p><strong>The six stages, with cost shape and DevTools label.</strong> Read top-to-bottom: each stage's input is the previous stage's output.</p>

    | Stage | Owner thread | Cost driver | DevTools label |
    | --- | --- | --- | --- |
    | Parse HTML | Main | Document size, blocking scripts | `Parse HTML` |
    | Build CSSOM | Main | Stylesheet count, rule count | `Parse Stylesheet` |
    | Style calc | Main | DOM size × selector complexity | `Recalculate Style` |
    | Layout | Main | DOM depth × box dependencies | `Layout` |
    | Paint | Main | Painted area × paint op count | `Paint` |
    | Composite | Compositor | Layer count × layer pixel area | `Composite Layers` |

    <p><strong>The invalidation rule.</strong> Changing a CSS property invalidates one or more stages. Width and height invalidate layout (everything downstream re-runs). Background-color invalidates paint only. Transform and opacity invalidate composite only — the GPU restages the same bitmap at a new position. <a href="https://csstriggers.com/">csstriggers.com</a> publishes a per-property map; learn the cheap ones (transform, opacity, filter) and the expensive ones (top, left, width, height, anything that affects flow).</p>

    <p><strong>How the browser reaches the compositor.</strong> Some elements get their own layer: those with <code>transform: translate3d(...)</code>, <code>will-change: transform</code>, <code>position: fixed</code>, video, canvas, animated opacity, and a few other triggers. Each layer is rasterised once (paint), uploaded to the GPU, and then re-composited cheaply for the next thousand frames. Animating a layer's transform is "free" — the main thread can sleep. Animating its <code>top</code> is expensive — the main thread re-lays-out the world every frame.</p>
```

- [ ] **Step 3: Add middle Quiz × 2**

```mdx
    <Quiz
      id="mid-quiz-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      question="You change a div's `top` property in a rAF loop. Which pipeline stages re-run per frame?"
      choices={[
        { label: "Layout, paint, composite — `top` is a flow-affecting property, layout invalidates everything downstream", correct: true },
        { label: "Composite only — `top` is just a position change", misconception: "`top` affects flow geometry. Layout has to re-measure every descendant. This is the classic mistake." },
        { label: "Paint and composite", misconception: "Paint does not run without layout. If layout invalidates, paint follows mandatorily." },
        { label: "Nothing — rAF batches all changes", misconception: "rAF batches the *invocation*, not the invalidation. Each property write still flips stage dirty bits." },
      ]}
    />
    <Quiz
      id="mid-quiz-2"
      pieceSlug="02-render-pipeline"
      lang="en"
      question="You change `transform: translateX(...)` on a div that already has its own compositor layer. Which stages run on the main thread?"
      choices={[
        { label: "None — the compositor thread re-positions the existing GPU bitmap; the main thread can sleep", correct: true },
        { label: "Style and layout", misconception: "Transform does not change the flow box, so layout does not invalidate. That's exactly why transform is preferred for animations." },
        { label: "Paint only", misconception: "Paint runs only if the bitmap content changes. Transform moves the bitmap — content is unchanged." },
        { label: "Composite only on the main thread", misconception: "Composite runs on the compositor thread, not the main thread. That is the whole point of layerisation." },
      ]}
    />
```

- [ ] **Step 4: Add middle TraceScenario**

```mdx
    <TraceScenario
      id="mid-trace-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      prompt="DevTools Performance panel shows a 28 ms frame. Inside that frame: 1 ms Parse HTML, 2 ms Recalculate Style, 18 ms Layout, 4 ms Paint, 1 ms Composite Layers, 2 ms idle. The page is scrolling a list of 5000 chat messages. Where is the time?"
      options={[
        { label: "Layout dominates at 18 ms. Most likely cause: every visible chat row is re-measured because something high in the DOM tree changed width", correct: true, justification: "Layout is 64 percent of the frame and the next-largest stage is paint at 4 ms. The driver is layout cost. With 5000 rows in a flow that re-measures on a width change, you blow the budget instantly. Fix: virtualise the list (render only the visible rows) or pin the row width so the parent change doesn't propagate." },
        { label: "Paint dominates at 4 ms", justification: "Paint is 4 ms which is small. Layout is over four times larger. Misreading which bar is the largest is the most common DevTools error." },
        { label: "Composite at 1 ms", justification: "Composite is 1 ms. It is not the bottleneck. If it were, the fix is layer count, not row virtualisation." },
        { label: "Idle time at 2 ms means the page is starving", justification: "2 ms of idle is healthy. Idle is not the problem; layout is." },
      ]}
    />
```

- [ ] **Step 5: Close middle fragment**

```mdx
  </Fragment>
```

- [ ] **Step 6: Commit checkpoint**

```bash
git add site/src/content/book/en/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline EN middle tier"
```

---

## Task 5: TierAccordion senior tier (EN)

**Files:**
- Modify: `site/src/content/book/en/browser/02-render-pipeline/index.mdx` (append inside `<TierAccordion>`, after middle fragment)

- [ ] **Step 1: Open senior fragment**

```mdx
  <Fragment slot="senior">
```

- [ ] **Step 2: Write the layout-thrash mechanism**

```mdx
    <p><strong>Forced synchronous layout (layout thrash).</strong> Layout is dirty-flag-driven: the browser batches style writes and only flushes them when it needs the latest geometry. The pathological case is a read-then-write loop in JS:</p>

```javascript
for (const row of rows) {
  const w = row.offsetWidth;     // read → forces flush of pending writes
  row.style.width = w + 10 + 'px'; // write → marks layout dirty again
}
```

    <p>Each iteration forces the browser to compute layout to answer <code>offsetWidth</code>, then immediately dirties layout for the next iteration. N rows = N full layouts. A 5000-row list at 1 ms per layout = 5 seconds of main-thread blocking. DevTools shows this as a violet "Layout" bar followed by a "Forced reflow while executing JavaScript took XX ms" console warning.</p>

    <p><strong>Compositor layer creation.</strong> Layers are not free. Each layer is a GPU bitmap that costs memory (width × height × 4 bytes) and a one-time paint. On a phone with 256 MB of GPU memory, fifty 1080p layers exhausts the budget; the browser evicts layers, re-rasterises on the fly, and the page stutters more than if you had not asked for layers at all. <code>will-change: transform</code> is a hint that says "this element will animate, please promote to a layer." Use it for the duration of the animation and remove it afterwards. Slapping <code>will-change: *</code> on a hundred elements is the will-change anti-pattern — you trade a known animation cost for an unknown memory bill.</p>

    <p><strong>Why composite-only animations are special.</strong> Once an element is a layer, the main thread paints it once. From that point the compositor thread is the only consumer of <code>transform</code> and <code>opacity</code> changes; the main thread can be busy parsing a 200 KB JSON blob and the animation still runs at 60 fps. This is the architectural reason transform-based animations beat top/left animations by orders of magnitude — not "GPU is faster," but "the slow thread is no longer in the loop."</p>
```

- [ ] **Step 3: Add senior DebugLog**

```mdx
    <DebugLog
      id="sr-debug-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      label="DevTools console — Forced reflow warnings"
      output={`[Violation] Forced reflow while executing JavaScript took 42 ms
    at applyRowWidths (list.js:88)
    at handleResize (list.js:34)
    at window.onresize (list.js:12)

[Violation] Forced reflow while executing JavaScript took 47 ms
    at applyRowWidths (list.js:88)
    at handleResize (list.js:34)
    at window.onresize (list.js:12)

[Violation] Forced reflow while executing JavaScript took 51 ms
    at applyRowWidths (list.js:88)
    ...`}
      outputLang="log"
      question="Three identical 'Forced reflow' warnings, all pointing at list.js:88 inside a resize handler. What pattern caused this and what is the surgical fix?"
      hint="The function name 'applyRowWidths' is a hint. Look at the loop body — what does it read before each write?"
      answer="The handler loops over visible rows and reads offsetWidth (or getBoundingClientRect) at the top of each iteration, then writes a style change at the bottom. The read forces a layout flush of the pending writes from the previous iteration. With N rows you trigger N forced layouts. The surgical fix is to batch reads and writes: first pass reads every row's offsetWidth into an array; second pass writes the new widths from the array. The browser then performs one layout pass for the whole batch. Time drops from O(N × layout) to O(layout). If you cannot decouple the reads from the writes, cache the width at component mount and recompute only when the parent actually changes size."
    />
```

- [ ] **Step 4: Add senior TradeoffMatrix (depth ID `card-composite-cost`)**

```mdx
    <TradeoffMatrix
      id="card-composite-cost"
      pieceSlug="02-render-pipeline"
      lang="en"
      prompt="Animate a card from y=0 to y=200 over 300 ms at 60 fps. Pick the implementation."
      options={[
        { name: "CSS animation on transform: translateY(...)", summary: "Composite-only, no main thread cost.", correct: true, justification: "Transform changes do not invalidate layout or paint. The element is promoted to a layer once; the compositor moves the GPU bitmap for the next 18 frames. Main thread is free to do anything else. This is the default for almost every UI animation." },
        { name: "CSS animation on top: 0 → 200px", summary: "Layout per frame.", justification: "Top is a flow-affecting property. Each animation tick invalidates layout for the card and any sibling that depends on it. 18 layouts in 300 ms. On a complex page this is the difference between 60 fps and 20 fps." },
        { name: "transform: translateY with will-change: transform set on mount, never removed", summary: "GPU memory leak.", justification: "Will-change reserves a layer for the lifetime of the element. A list of 100 cards permanently holds 100 layers — possibly 200 MB of GPU memory. Removed cards may not free the layer immediately. The fix is to set will-change just before the animation starts and remove it on animationend." },
        { name: "requestAnimationFrame loop setting element.style.top each frame", summary: "Worst of both.", justification: "rAF still flips layout dirty flags via style writes to top. You also lose the browser's animation-aware scheduling (it cannot defer the work outside the user-visible window). Same cost as the second option, plus you wrote more code." },
      ]}
    />
```

- [ ] **Step 5: Add senior RFCQuiz**

```mdx
    <RFCQuiz
      id="sr-rfc-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      question="Which W3C / WHATWG spec defines `will-change` — the property that hints to the browser an element is about to animate?"
      choices={[
        { rfc: "CSS Will Change Module Level 1 (W3C / CSSWG)", title: "Defines the will-change property, accepted values, and UA guidance", correct: true },
        { rfc: "CSS Transforms Module Level 2", title: "Defines transform but not will-change" },
        { rfc: "CSS Color Module Level 4", title: "Color spaces — unrelated to layer creation" },
        { rfc: "HTML Standard", title: "Defines parsing and DOM, not CSS layer hints" },
      ]}
    />
```

- [ ] **Step 6: Add senior DesignPrompt**

```mdx
    <DesignPrompt
      id="sr-design-1"
      pieceSlug="02-render-pipeline"
      lang="en"
      prompt="Design the scrolling behaviour for a virtualised chat list that holds 50 000 messages and must hit 60 fps on a mid-range Android phone."
      constraints={[
        "Frame budget: 16.67 ms. Realistic main-thread budget after browser overhead: ~10 ms.",
        "Layout must not depend on off-screen rows.",
        "Composite-only path during scroll. Layout and paint allowed only when new rows enter the viewport.",
        "GPU memory: assume 200 MB available. Layer count must stay below 30 at any time.",
        "Resize handler must not loop reads and writes (no forced reflow).",
      ]}
      canonical="Virtualise the list: only the rows in the viewport plus a small overscan (5-10 rows above and below) are mounted in the DOM. Use a single tall scrollable container whose height = totalRows × rowHeight; rows are absolutely positioned inside it with transform: translateY(index × rowHeight). Scroll handler does no DOM measurements — it reads scrollTop, computes the visible index range with integer math, and updates the rendered slice via React/Preact state. Each row uses transform-based positioning so a scroll moves rows on the compositor thread; layout only runs when the visible slice changes and new rows mount. Apply will-change: transform on the scroll-container only, removed when the scroll ends. Resize handler batches: first pass reads container height once, second pass writes any per-row state to a stable buffer; never read offsetWidth inside the per-row loop. Verify with DevTools Performance recording: scroll for 5 seconds, confirm zero 'Forced reflow' warnings, layout time per frame under 1 ms, composite per frame under 0.5 ms, no dropped frames in the FPS meter."
      keyPoints={[
        "Virtualisation caps DOM size regardless of dataset size.",
        "Transform-based positioning routes scroll through the compositor.",
        "Scroll handler does no measurements — pure math from scrollTop.",
        "Will-change is scoped to the animating element and the active window.",
        "Resize is batched: all reads, then all writes.",
      ]}
    />
```

- [ ] **Step 7: Close senior fragment and TierAccordion**

```mdx
  </Fragment>
</TierAccordion>
```

- [ ] **Step 8: Commit checkpoint**

```bash
git add site/src/content/book/en/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline EN senior tier"
```

---

## Task 6: Misconception + NumbersCard + KeyTakeaway + SpiralCue + RetrievalDrawer + cross-links (EN)

**Files:**
- Modify: `site/src/content/book/en/browser/02-render-pipeline/index.mdx` (append after closed `</TierAccordion>`)

- [ ] **Step 1: Add Misconception (depth ID `mc-layout-thrash`)**

```mdx
<Misconception id="mc-layout-thrash">
**Myth:** "If I batch all my style writes inside requestAnimationFrame, the browser will handle layout efficiently for me."

**Reality:** rAF only batches the *invocation* of your callback. The browser still runs layout the moment any code reads a layout-dependent value (`offsetWidth`, `getBoundingClientRect`, `scrollTop`, `clientHeight`). One read between two writes inside rAF forces a synchronous layout. The fix is separating reads from writes — do all reads first, then all writes — not wrapping the loop in rAF.
</Misconception>
```

Verify Misconception body ≤ 320 chars (the reality paragraph above is ~460 chars including markdown — trim if linter complains; the budget applies to the rendered text). If lint fails, drop the parenthetical examples in the reality paragraph.

- [ ] **Step 2: Add NumbersCard (depth ID `card-frame-numbers`)**

```mdx
<NumbersCard
  id="card-frame-numbers"
  title="Frame budget at 60 fps"
  rows={[
    { label: "Total frame", value: "16.67 ms", note: "1000 ms / 60 fps" },
    { label: "Browser overhead (rAF, input, GC)", value: "~6 ms", note: "Typical, varies by platform" },
    { label: "JS + layout + paint budget", value: "~10 ms", note: "What your code actually has" },
    { label: "Composite-only path", value: "~0.5 ms / frame", note: "Layer count × small constant" },
    { label: "Forced sync layout cost", value: "1–10 ms each", note: "Per read of offsetWidth after a write" },
    { label: "Paint cost", value: "Pixel area × ops", note: "Box-shadow and filter are paint-heavy" },
  ]}
/>
```

- [ ] **Step 3: Add KeyTakeaway**

```mdx
<KeyTakeaway>Six stages, two threads. Layout and paint cost main-thread time; composite is nearly free. Animate transform and opacity, not top and width. Batch reads before writes. The frame budget is 10 ms after browser overhead — that decides everything.</KeyTakeaway>
```

Verify ≤ 220 chars (the line above is ~270 chars; trim to: `Six stages, two threads. Animate transform and opacity, not top and width. Batch reads before writes. The frame budget after browser overhead is ~10 ms — that decides everything.` — ~190 chars). Use the trimmed version if lint fails.

- [ ] **Step 4: Add SpiralCue**

```mdx
<SpiralCue thread="statefulness">
The render pipeline carries state across frames: the layout tree, the layer tree, the paint records. A "free" composite-only animation is only free because the state from previous frames is reused. Drop a layer (or invalidate layout) and the next frame pays the full re-build cost — the same statefulness lesson that explains TCP's first-RTT penalty, just at the rendering layer.
</SpiralCue>
```

- [ ] **Step 5: Add RetrievalDrawer (senior recall questions, hydrated)**

```mdx
<RetrievalDrawer
  client:load
  pieceSlug="02-render-pipeline"
  lang="en"
  questions={[
    {
      id: "sr-r1",
      q: "Explain why transform-based animations are 'free' relative to top-based animations, at the level of which thread runs which stage.",
      answer: <p>The element is promoted to its own compositor layer (either implicitly because of transform3d or explicitly via will-change: transform). The main thread paints the layer once into a GPU bitmap. From that point, every transform change is intercepted by the compositor thread before reaching the pipeline: it updates the layer's transform matrix and re-composites against the page in the next frame, on the compositor thread. The main thread is not in the loop. With top, no layer is created. Every change to top invalidates layout (because top is part of normal flow), which then forces style, paint, and composite to all re-run on the main thread. So "free" means "the slow thread is not involved," not "the GPU is faster." Two animations on a busy page with a 200 ms JSON parse in flight: transform stays at 60 fps, top drops to 5 fps.</p>,
    },
    {
      id: "sr-r2",
      q: "A team adds will-change: transform to every element in their design system 'for safety.' Memory usage on mobile balloons. Walk through the mechanism.",
      answer: <p>Will-change is a promotion hint: each element with the hint becomes a compositor layer immediately. A layer is a GPU bitmap sized to the element's painted area, allocating roughly width × height × 4 bytes of GPU memory. A design system that touches every reusable component multiplies layer count by the number of component instances on a page. On a list of 100 cards each containing 5 will-change'd sub-elements, the page now holds 500 layers, possibly hundreds of MB of GPU memory. On a phone with 256 MB available GPU memory, the OS starts evicting; the browser re-rasterises evicted layers on the fly during scroll, causing jank worse than the no-layer baseline. The fix is to scope will-change to the duration of an animation: set it just before the animation starts (e.g. on mouse-down), remove it on animation-end. Treat will-change as a fast-forward signal, not a permanent setting.</p>,
    },
  ]}
/>
```

- [ ] **Step 6: Add cross-links footer**

```mdx
**Prereqs:** [01-event-loop](/en/browser/01-event-loop/) — how the browser schedules JS, rendering, and idle work in one loop.

**Next:** [03-v8-internals](/en/browser/03-v8-internals/) — what runs inside the "main thread" when it executes your JavaScript.

**See also:** [07-core-web-vitals](/en/browser/07-core-web-vitals/) — the user-facing metrics (LCP, INP, CLS) that these stages roll up into.
```

- [ ] **Step 7: Build to verify EN piece**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build 2>&1 | tail -40
```

Expected: build succeeds, `dist/lint-report.json` reports `{"errors":[],"warnings":[]}`. If errors appear:
- "Forbidden import depth" → fix `..` segment count to exactly 5
- "Hydration cap exceeded" → confirm only `RetrievalDrawer` has `client:*`
- "Text budget exceeded" → trim KeyTakeaway or Misconception per Step 3 / Step 1
- "Depth ID missing" → confirm each `depth.*` value maps to an `id="..."` in the body

- [ ] **Step 8: Commit checkpoint**

```bash
git add site/src/content/book/en/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline EN closers + drawer + cross-links"
```

---

## Task 7: Translate to RU (mirror EN file)

**Files:**
- Modify: `site/src/content/book/ru/browser/02-render-pipeline/index.mdx` (replace stub with full RU mirror)

- [ ] **Step 1: Read the finished EN file as the translation source**

Run:
```bash
cat site/src/content/book/en/browser/02-render-pipeline/index.mdx
```

Use the EN file as the structural template. Every JSX element, every quiz, every drag item, every persona tag, and every cross-link must appear in the RU file with the same `id`, `pieceSlug`, and component nesting — only the natural-language strings change.

- [ ] **Step 2: Replace the RU frontmatter**

Replace the top YAML with:

```yaml
---
slug: 02-render-pipeline
lang: ru
pillar: browser
chapter: 02-browser
order: 2
title: "Render pipeline: парсинг → CSSOM → компоновка → отрисовка → композитинг"
summary: "Шесть стадий пайплайна, какой поток за какую отвечает, что инвалидирует каждую, и как читать flame strip в DevTools, чтобы найти бутылочное горлышко."
readingMin: 22
status: ready
prereqs: ["01-event-loop"]
spiral: ["statefulness", "encapsulation"]
personas: ["bea", "sven"]
depth:
  mechanism: pipe-stages
  tradeoff: card-composite-cost
  failure_mode: mc-layout-thrash
  numbers: card-frame-numbers
sources:
  - https://web.dev/articles/critical-rendering-path
  - https://developer.chrome.com/docs/devtools/performance/reference
  - https://developer.chrome.com/blog/inside-browser-part3
  - https://drafts.csswg.org/css-will-change/
  - https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work
  - https://csstriggers.com/
  - https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/
  - https://web.dev/articles/rendering-performance
---
```

- [ ] **Step 3: Write the RU imports block**

Identical to EN imports — paths and component names do not translate:

```mdx
import Crux from "../../../../../components/prose/Crux.astro";
import KeyTakeaway from "../../../../../components/prose/KeyTakeaway.astro";
import SpiralCue from "../../../../../components/prose/SpiralCue.astro";
import TierAccordion from "../../../../../components/pedagogy/TierAccordion.astro";
import RetrievalDrawer from "../../../../../components/pedagogy/RetrievalDrawer.tsx";
import PersonaTag from "../../../../../components/pedagogy/PersonaTag.astro";
import Quiz from "../../../../../components/pedagogy/Quiz.astro";
import DragOrder from "../../../../../components/pedagogy/DragOrder.astro";
import TraceScenario from "../../../../../components/pedagogy/TraceScenario.astro";
import DebugLog from "../../../../../components/pedagogy/DebugLog.astro";
import TradeoffMatrix from "../../../../../components/pedagogy/TradeoffMatrix.astro";
import RFCQuiz from "../../../../../components/pedagogy/RFCQuiz.astro";
import DesignPrompt from "../../../../../components/pedagogy/DesignPrompt.astro";
import NumbersCard from "../../../../../components/layout/NumbersCard.astro";
import Misconception from "../../../../../components/layout/Misconception.astro";
```

- [ ] **Step 4: Write the RU opener and Crux**

```mdx
Вы нажали Enter на URL. Байты пошли. Где-то между первым пакетом и моментом, когда кнопка становится кликабельной на экране, браузер прогнал шестистадийный пайплайн — и большинство страниц тратят неправильное количество времени на неправильной стадии. Бюджет кадра — 16.67 мс при 60 fps. Если компоновка заняла 12 мс, всё остальное не успевает, кадр пропускается, пользователь видит дёрганья.

<Crux>От байтов в кабеле до пикселей на экране — куда уходит время?</Crux>

Работу делают два потока. **Главный поток** владеет парсингом HTML, построением CSSOM, пересчётом стилей, компоновкой и подготовкой отрисовки. **Поток композитора** собирает GPU-дружественные слои и отправляет их на GPU. Анимации, которые остаются на композиторе, стоят почти ничего за кадр. Анимации, скатывающиеся обратно в компоновку, съедают весь бюджет. Всё мастерство производительности рендера — держать работу на правильном потоке.
```

- [ ] **Step 5: Translate junior tier**

Mirror EN Task 3 with the same component IDs and structure. Translate prose to Russian. Key fixed forms:

- `<PersonaTag id="bea" lang="ru" />`, `<PersonaTag id="sven" lang="ru" />`
- `<TierAccordion id="pipe-stages" lang="ru">`
- `<Quiz id="jr-quiz-1" pieceSlug="02-render-pipeline" lang="ru" ...>`
- `<DragOrder id="jr-drag-1" pieceSlug="02-render-pipeline" lang="ru" ...>`

Translated kitchen metaphor:

```mdx
    <p><strong>Что делает браузер в одном предложении.</strong> Он берёт HTML + CSS + JS из канала и превращает в пиксели за шесть стадий: читает разметку, читает стили, решает какие стили побеждают, измеряет коробки, заполняет пиксели, склеивает слои на экране.</p>
    <p><strong>Метафора кухни.</strong> Браузер — кухня ресторана. Парсинг HTML — это чтение чека заказа. CSSOM — чтение книги рецептов. Стили — сопоставление ингредиентов с блюдами. Компоновка — измерение тарелки и расстановка еды на ней. Отрисовка — собственно готовка, жар и цвет. Композитинг — официант, который забирает шесть тарелок сразу и несёт их к столу. Если хоть одна станция тормозит, весь стол ждёт.</p>
    <p><strong>Почему это важно.</strong> Вы держите 60 кадров в секунду только если вся кухня успевает за 16.67 мс. Пропустили кадр — пользователь видит заикание: список при скролле дёргается, кнопка ощущается липкой, график отстаёт от мыши. Лечение почти никогда не "ускорить JS" — а "не давать кухне переделывать компоновку, когда можно было просто переставить тарелки."</p>
    <p><strong>Кадр для чтения вслух.</strong> <PersonaTag id="bea" lang="ru" /> открывает карточку профиля. <PersonaTag id="sven" lang="ru" /> комментирует кухню: «0.5 мс парсинг div аватарки, 0.4 мс сборка стилей, 0.2 мс мэтчинг селекторов, 3 мс измерение коробок — стоп, картинка не успела загрузиться, перемеряем, ещё 2 мс — 1.5 мс отрисовка, 0.5 мс композитинг. Кадр — 8.1 мс. Нормально. А что если пользователь скроллит и мы запускаем компоновку пятьдесят раз в секунду? Это 100 мс в секунду только на компоновку, шесть пропущенных кадров, скролл ощущается тяжёлым.»</p>
```

Translated DragOrder labels:

```mdx
    <DragOrder
      id="jr-drag-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      prompt="Браузер прогоняет эти шесть стадий в фиксированном порядке. Расставьте их в правильную последовательность."
      items={[
        { id: "parse", label: "Парсинг HTML → DOM-дерево" },
        { id: "cssom", label: "Построение CSSOM из стилевых файлов" },
        { id: "style", label: "Стили: мэтчинг селекторов, разрешение каскада" },
        { id: "layout", label: "Компоновка: измерение позиций и размеров коробок" },
        { id: "paint", label: "Отрисовка: заполнение пикселей в bitmap-слои" },
        { id: "composite", label: "Композитинг: сборка слоёв на GPU" },
      ]}
      correctOrder={["parse", "cssom", "style", "layout", "paint", "composite"]}
    />
```

Translated junior Quiz × 2:

```mdx
    <Quiz
      id="jr-quiz-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      question="Какой поток делает большую часть работы в пайплайне рендера?"
      choices={[
        { label: "Главный поток (парсинг, CSSOM, стили, компоновка, подготовка отрисовки)", correct: true },
        { label: "Поток композитора", misconception: "Композитор обрабатывает только последнюю стадию — сборку слоёв. Всё, что до неё, идёт на главном потоке." },
        { label: "Web Workers", misconception: "Воркеры исполняют JS, но не имеют доступа к DOM и CSSOM. Они не запускают стадии пайплайна." },
        { label: "GPU напрямую", misconception: "GPU растеризует и компонует, но не парсит HTML и не строит DOM." },
      ]}
    />
    <Quiz
      id="jr-quiz-2"
      pieceSlug="02-render-pipeline"
      lang="ru"
      question="Страница держит 60 fps. Какой бюджет на кадр?"
      choices={[
        { label: "16.67 мс (1000 мс делим на 60 кадров)", correct: true },
        { label: "1 секунда на кадр", misconception: "Это 1 fps — на три порядка медленнее нужного." },
        { label: "33 мс на кадр", misconception: "33 мс — бюджет 30 fps. 60 fps срезает его пополам." },
        { label: "100 мс на кадр", misconception: "100 мс — порог реакции на ввод из модели RAIL, не покадровый бюджет отрисовки." },
      ]}
    />
```

- [ ] **Step 6: Translate middle tier**

Mirror EN Task 4. Cost table:

```mdx
    <p><strong>Шесть стадий — форма цены и метка в DevTools.</strong> Читайте сверху вниз: вход каждой стадии — выход предыдущей.</p>

    | Стадия | Поток | Драйвер цены | Метка в DevTools |
    | --- | --- | --- | --- |
    | Парсинг HTML | Главный | Размер документа, блокирующие скрипты | `Parse HTML` |
    | Построение CSSOM | Главный | Кол-во стилей, кол-во правил | `Parse Stylesheet` |
    | Пересчёт стилей | Главный | Размер DOM × сложность селекторов | `Recalculate Style` |
    | Компоновка | Главный | Глубина DOM × зависимости между коробками | `Layout` |
    | Отрисовка | Главный | Площадь × кол-во paint-операций | `Paint` |
    | Композитинг | Композитор | Кол-во слоёв × площадь пикселей слоя | `Composite Layers` |

    <p><strong>Правило инвалидации.</strong> Изменение CSS-свойства инвалидирует одну или несколько стадий. Width и height инвалидируют компоновку (всё ниже по потоку перезапускается). Background-color инвалидирует только отрисовку. Transform и opacity инвалидируют только композитинг — GPU переставляет тот же bitmap в новое положение. <a href="https://csstriggers.com/">csstriggers.com</a> публикует карту по свойствам; выучите дешёвые (transform, opacity, filter) и дорогие (top, left, width, height, всё, что влияет на flow).</p>

    <p><strong>Как браузер доходит до композитора.</strong> Некоторые элементы получают свой слой: с <code>transform: translate3d(...)</code>, <code>will-change: transform</code>, <code>position: fixed</code>, video, canvas, анимированный opacity, плюс несколько других триггеров. Каждый слой растеризуется один раз (отрисовка), грузится на GPU, потом дешёво пересобирается следующие тысячу кадров. Анимация transform слоя — «бесплатно», главный поток может спать. Анимация его <code>top</code> — дорого, главный поток перекомпоновывает мир каждый кадр.</p>
```

Translated middle Quiz × 2:

```mdx
    <Quiz
      id="mid-quiz-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      question="Вы меняете свойство `top` у div в цикле rAF. Какие стадии пайплайна перезапускаются на каждом кадре?"
      choices={[
        { label: "Компоновка, отрисовка, композитинг — `top` влияет на flow, компоновка инвалидирует всё вниз по потоку", correct: true },
        { label: "Только композитинг — `top` это просто смещение", misconception: "`top` меняет геометрию flow. Компоновка обязана перемерить всех потомков. Это классическая ошибка." },
        { label: "Отрисовка и композитинг", misconception: "Отрисовка не запускается без компоновки. Если компоновка инвалидирована, отрисовка следует за ней принудительно." },
        { label: "Ничего — rAF батчит все изменения", misconception: "rAF батчит *вызов*, не инвалидацию. Каждая запись свойства всё равно поднимает dirty-флаг стадии." },
      ]}
    />
    <Quiz
      id="mid-quiz-2"
      pieceSlug="02-render-pipeline"
      lang="ru"
      question="Вы меняете `transform: translateX(...)` у div, у которого уже есть свой слой композитора. Какие стадии работают на главном потоке?"
      choices={[
        { label: "Никакие — поток композитора переставляет существующий GPU-bitmap, главный поток может спать", correct: true },
        { label: "Стили и компоновка", misconception: "Transform не меняет flow-коробку, компоновка не инвалидируется. Именно поэтому transform предпочитают для анимаций." },
        { label: "Только отрисовка", misconception: "Отрисовка запускается, только если меняется содержимое bitmap. Transform перемещает bitmap — содержимое не меняется." },
        { label: "Только композитинг — на главном потоке", misconception: "Композитинг работает на потоке композитора, не на главном. В этом весь смысл слоёв." },
      ]}
    />
```

Translated middle TraceScenario:

```mdx
    <TraceScenario
      id="mid-trace-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      prompt="Performance-панель DevTools показывает кадр в 28 мс. Внутри: 1 мс Parse HTML, 2 мс Recalculate Style, 18 мс Layout, 4 мс Paint, 1 мс Composite Layers, 2 мс idle. Страница скроллит список из 5000 сообщений чата. Куда уходит время?"
      options={[
        { label: "Компоновка доминирует — 18 мс. Скорее всего: каждая видимая строка перемеряется, потому что выше по дереву что-то поменяло ширину", correct: true, justification: "Компоновка — 64% кадра, следующая по размеру стадия — отрисовка с 4 мс. Драйвер — стоимость компоновки. 5000 строк во flow, перемеряющиеся при изменении ширины родителя, мгновенно жгут бюджет. Лечение: виртуализация списка (рендерим только видимые строки) или фиксация ширины строки, чтобы изменения родителя не каскадировали." },
        { label: "Доминирует отрисовка — 4 мс", justification: "Отрисовка — 4 мс, это мало. Компоновка в четыре с лишним раза больше. Неправильное чтение того, какая полоса самая большая — самая частая ошибка в DevTools." },
        { label: "Композитинг — 1 мс", justification: "Композитинг — 1 мс. Это не бутылочное горлышко. Если бы было, лечение — кол-во слоёв, а не виртуализация." },
        { label: "Idle в 2 мс означает голод страницы", justification: "2 мс idle — это здорово. Idle — не проблема, проблема — компоновка." },
      ]}
    />
```

- [ ] **Step 7: Translate senior tier**

Mirror EN Task 5. Layout-thrash narrative:

```mdx
    <p><strong>Форсированная синхронная компоновка (layout thrash).</strong> Компоновка работает по dirty-флагам: браузер батчит записи стилей и сбрасывает их только когда нужна актуальная геометрия. Патологический случай — цикл read-then-write в JS:</p>

```javascript
for (const row of rows) {
  const w = row.offsetWidth;     // чтение → форсирует сброс отложенных записей
  row.style.width = w + 10 + 'px'; // запись → снова помечает компоновку dirty
}
```

    <p>Каждая итерация заставляет браузер посчитать компоновку, чтобы ответить на <code>offsetWidth</code>, и тут же делает компоновку dirty для следующей итерации. N строк = N полных компоновок. Список на 5000 строк по 1 мс на компоновку = 5 секунд блокировки главного потока. DevTools показывает это как фиолетовую полосу «Layout» и предупреждение «Forced reflow while executing JavaScript took XX ms» в консоли.</p>

    <p><strong>Создание слоёв композитора.</strong> Слои не бесплатны. Каждый слой — это GPU-bitmap, стоящий памяти (ширина × высота × 4 байта) и одной разовой отрисовки. На телефоне с 256 МБ GPU-памяти пятьдесят слоёв 1080p выгорают бюджет; браузер вытесняет слои, на лету перерастеризует, и страница дёргается сильнее, чем без слоёв вообще. <code>will-change: transform</code> — это подсказка «этот элемент будет анимирован, продвинь его в слой». Используйте на время анимации, потом убирайте. Раскидать <code>will-change: *</code> по сотне элементов — анти-паттерн will-change: вы меняете известную стоимость анимации на неизвестный счёт за память.</p>

    <p><strong>Почему composite-only анимации особенные.</strong> Как только элемент стал слоем, главный поток отрисовывает его один раз. С этого момента поток композитора — единственный потребитель изменений <code>transform</code> и <code>opacity</code>; главный поток может быть занят парсингом 200 КБ JSON, а анимация всё равно идёт на 60 fps. Это архитектурная причина, почему transform-анимации обгоняют top/left на порядки — не «GPU быстрее», а «медленный поток больше не в цикле».</p>
```

Translated DebugLog:

```mdx
    <DebugLog
      id="sr-debug-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      label="Консоль DevTools — предупреждения о форсированной компоновке"
      output={`[Violation] Forced reflow while executing JavaScript took 42 ms
    at applyRowWidths (list.js:88)
    at handleResize (list.js:34)
    at window.onresize (list.js:12)

[Violation] Forced reflow while executing JavaScript took 47 ms
    at applyRowWidths (list.js:88)
    at handleResize (list.js:34)
    at window.onresize (list.js:12)

[Violation] Forced reflow while executing JavaScript took 51 ms
    at applyRowWidths (list.js:88)
    ...`}
      outputLang="log"
      question="Три одинаковых предупреждения «Forced reflow», все указывают на list.js:88 внутри resize-обработчика. Какой паттерн это вызвал и как точечно исправить?"
      hint="Имя функции 'applyRowWidths' — подсказка. Посмотрите тело цикла: что он читает перед каждой записью?"
      answer="Обработчик ходит по видимым строкам и читает offsetWidth (или getBoundingClientRect) в начале каждой итерации, а в конце пишет изменение стиля. Чтение форсирует сброс компоновки от отложенных записей предыдущей итерации. На N строк получаем N форсированных компоновок. Точечное лечение — батчить чтения и записи: первый проход читает offsetWidth каждой строки в массив, второй проход пишет новые ширины из массива. Браузер тогда выполняет одну компоновку на весь батч. Время падает с O(N × компоновка) до O(компоновка). Если развязать чтения от записей нельзя, кешируйте ширину при монтировании компонента и пересчитывайте только когда родитель реально меняет размер."
    />
```

Translated TradeoffMatrix:

```mdx
    <TradeoffMatrix
      id="card-composite-cost"
      pieceSlug="02-render-pipeline"
      lang="ru"
      prompt="Анимировать карточку с y=0 до y=200 за 300 мс на 60 fps. Выберите реализацию."
      options={[
        { name: "CSS-анимация на transform: translateY(...)", summary: "Только композитинг, главный поток не тратится.", correct: true, justification: "Изменения transform не инвалидируют компоновку и отрисовку. Элемент один раз продвигается в слой; композитор двигает GPU-bitmap следующие 18 кадров. Главный поток свободен. Это дефолт почти для любой UI-анимации." },
        { name: "CSS-анимация на top: 0 → 200px", summary: "Компоновка на каждом кадре.", justification: "Top влияет на flow. Каждый тик анимации инвалидирует компоновку для карточки и любого сиблинга, зависящего от неё. 18 компоновок за 300 мс. На сложной странице это разница между 60 fps и 20 fps." },
        { name: "transform: translateY с will-change: transform, установленным при монтировании, никогда не убираемым", summary: "Утечка GPU-памяти.", justification: "Will-change резервирует слой на всё время жизни элемента. Список из 100 карточек постоянно держит 100 слоёв — возможно, 200 МБ GPU-памяти. Убранные карточки могут не освободить слой сразу. Лечение — ставить will-change прямо перед стартом анимации и убирать на animationend." },
        { name: "Цикл requestAnimationFrame, каждый кадр пишущий element.style.top", summary: "Худшее из обоих.", justification: "rAF всё равно поднимает dirty-флаги компоновки через запись в top. Плюс теряется animation-aware планирование браузера (он не может отложить работу за пределы видимого окна). Та же цена, что у второго варианта, плюс больше написанного кода." },
      ]}
    />
```

Translated RFCQuiz:

```mdx
    <RFCQuiz
      id="sr-rfc-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      question="Какая спецификация W3C / WHATWG определяет `will-change` — свойство, подсказывающее браузеру, что элемент вот-вот анимируется?"
      choices={[
        { rfc: "CSS Will Change Module Level 1 (W3C / CSSWG)", title: "Определяет свойство will-change, принимаемые значения и рекомендации UA", correct: true },
        { rfc: "CSS Transforms Module Level 2", title: "Определяет transform, но не will-change" },
        { rfc: "CSS Color Module Level 4", title: "Цветовые пространства — не связано с созданием слоёв" },
        { rfc: "HTML Standard", title: "Определяет парсинг и DOM, не CSS-хинты слоёв" },
      ]}
    />
```

Translated DesignPrompt:

```mdx
    <DesignPrompt
      id="sr-design-1"
      pieceSlug="02-render-pipeline"
      lang="ru"
      prompt="Спроектируйте поведение скролла для виртуализированного списка чата на 50 000 сообщений, который должен держать 60 fps на среднем Android-телефоне."
      constraints={[
        "Бюджет кадра: 16.67 мс. Реалистичный бюджет главного потока после оверхеда браузера: ~10 мс.",
        "Компоновка не должна зависеть от строк за границей вьюпорта.",
        "Composite-only путь во время скролла. Компоновка и отрисовка только когда новые строки входят в видимую зону.",
        "GPU-память: считаем, что доступно 200 МБ. Кол-во слоёв в любой момент — меньше 30.",
        "Resize-обработчик не должен цикличить чтения и записи (без forced reflow).",
      ]}
      canonical="Виртуализируйте список: в DOM смонтированы только строки во вьюпорте плюс маленький overscan (5-10 строк сверху и снизу). Используйте один высокий скроллящийся контейнер с высотой = totalRows × rowHeight; строки позиционируются абсолютно внутри него через transform: translateY(index × rowHeight). Scroll-обработчик не делает измерений DOM — читает scrollTop, считает целочисленной арифметикой диапазон видимых индексов, обновляет рендеримый срез через состояние React/Preact. Каждая строка позиционируется через transform, поэтому скролл двигает строки на потоке композитора; компоновка запускается только когда видимый срез меняется и новые строки монтируются. Применяйте will-change: transform только к скролл-контейнеру, снимайте по окончании скролла. Resize-обработчик батчит: первый проход читает высоту контейнера один раз, второй проход пишет состояния строк в стабильный буфер; никогда не читайте offsetWidth внутри цикла по строкам. Проверка в DevTools Performance: скроллим 5 секунд, подтверждаем ноль предупреждений 'Forced reflow', компоновка на кадр меньше 1 мс, композитинг на кадр меньше 0.5 мс, FPS-метр без пропусков."
      keyPoints={[
        "Виртуализация ограничивает размер DOM независимо от размера датасета.",
        "Transform-позиционирование маршрутизирует скролл через композитор.",
        "Scroll-обработчик не делает измерений — чистая арифметика от scrollTop.",
        "Will-change ограничен анимируемым элементом и активным окном.",
        "Resize батчится: сначала все чтения, потом все записи.",
      ]}
    />
```

- [ ] **Step 8: Translate Misconception, NumbersCard, KeyTakeaway, SpiralCue, RetrievalDrawer, cross-links**

```mdx
<Misconception id="mc-layout-thrash">
**Миф:** «Если я заверну все записи стилей в requestAnimationFrame, браузер сам эффективно сделает компоновку.»

**Реальность:** rAF батчит только *вызов* колбэка. Браузер всё равно запускает компоновку в момент, когда любой код читает зависимое от компоновки значение (`offsetWidth`, `getBoundingClientRect`, `scrollTop`, `clientHeight`). Одно чтение между двумя записями внутри rAF форсирует синхронную компоновку. Лечение — разделить чтения и записи: сначала все чтения, потом все записи; не обёртывать цикл в rAF.
</Misconception>

<NumbersCard
  id="card-frame-numbers"
  title="Бюджет кадра при 60 fps"
  rows={[
    { label: "Весь кадр", value: "16.67 мс", note: "1000 мс / 60 fps" },
    { label: "Оверхед браузера (rAF, ввод, GC)", value: "~6 мс", note: "Типично, зависит от платформы" },
    { label: "Бюджет JS + компоновки + отрисовки", value: "~10 мс", note: "Что реально есть у вашего кода" },
    { label: "Composite-only путь", value: "~0.5 мс / кадр", note: "Кол-во слоёв × малая константа" },
    { label: "Цена форсированной компоновки", value: "1–10 мс каждая", note: "На каждое чтение offsetWidth после записи" },
    { label: "Цена отрисовки", value: "Площадь × операции", note: "Box-shadow и filter — тяжёлые для отрисовки" },
  ]}
/>

<KeyTakeaway>Шесть стадий, два потока. Анимируйте transform и opacity, не top и width. Батчите чтения перед записями. Бюджет кадра после оверхеда браузера — ~10 мс; это решает всё.</KeyTakeaway>

<SpiralCue thread="statefulness">
Пайплайн рендера переносит состояние между кадрами: дерево компоновки, дерево слоёв, paint-записи. «Бесплатная» composite-only анимация бесплатна только потому, что состояние с прошлых кадров переиспользуется. Уроните слой (или инвалидируйте компоновку) — и следующий кадр заплатит полную цену пересборки; тот же урок состояния, что объясняет штраф первого RTT у TCP, только на уровне рендеринга.
</SpiralCue>

<RetrievalDrawer
  client:load
  pieceSlug="02-render-pipeline"
  lang="ru"
  questions={[
    {
      id: "sr-r1",
      q: "Объясните, почему transform-анимации «бесплатны» относительно top-анимаций, на уровне того, какой поток какую стадию запускает.",
      answer: <p>Элемент продвигается в свой слой композитора (неявно из-за transform3d или явно через will-change: transform). Главный поток один раз отрисовывает слой в GPU-bitmap. С этого момента каждое изменение transform перехватывается потоком композитора до того, как достигнуть пайплайна: композитор обновляет матрицу трансформации слоя и пересобирает кадр против страницы на потоке композитора. Главный поток не в цикле. С top слой не создаётся. Каждое изменение top инвалидирует компоновку (top — часть нормального flow), что форсирует стили, отрисовку и композитинг — все на главном потоке. То есть «бесплатно» — значит «медленный поток не задействован», а не «GPU быстрее». Две анимации на загруженной странице с 200 мс парсингом JSON в полёте: transform держит 60 fps, top падает до 5 fps.</p>,
    },
    {
      id: "sr-r2",
      q: "Команда добавила will-change: transform каждому элементу в дизайн-системе «на всякий случай». На мобильных раздулось потребление памяти. Пройдите по механизму.",
      answer: <p>Will-change — подсказка о продвижении: каждый элемент с подсказкой сразу становится слоем композитора. Слой — GPU-bitmap размером с отрисованную область элемента, выделяющий примерно ширину × высоту × 4 байта GPU-памяти. Дизайн-система, касающаяся каждого переиспользуемого компонента, умножает кол-во слоёв на кол-во экземпляров компонентов на странице. На списке из 100 карточек, каждая с 5 sub-элементами с will-change, страница держит 500 слоёв — возможно, сотни МБ GPU-памяти. На телефоне с 256 МБ GPU-памяти ОС начинает вытеснять; браузер на лету перерастеризует вытесненные слои во время скролла, вызывая дёрганья хуже базовой линии без слоёв. Лечение — ограничить will-change временем анимации: ставить прямо перед стартом анимации (например, на mouse-down), снимать на animation-end. Относитесь к will-change как к сигналу «вот-вот», а не постоянной настройке.</p>,
    },
  ]}
/>

**Предусловия:** [01-event-loop](/ru/browser/01-event-loop/) — как браузер планирует JS, рендеринг и idle-работу в одном цикле.

**Дальше:** [03-v8-internals](/ru/browser/03-v8-internals/) — что работает внутри «главного потока», когда он исполняет ваш JavaScript.

**Смотрите также:** [07-core-web-vitals](/ru/browser/07-core-web-vitals/) — пользовательские метрики (LCP, INP, CLS), в которые эти стадии складываются.
```

- [ ] **Step 9: Build to verify RU piece**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build 2>&1 | tail -40
```

Expected: build succeeds, `dist/lint-report.json` reports `{"errors":[],"warnings":[]}`.

If `i18n-parity` warning appears, the EN and RU files have a structural mismatch — compare component IDs and `pieceSlug` strings between the two files.

- [ ] **Step 10: Commit checkpoint**

```bash
git add site/src/content/book/ru/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline RU translation"
```

---

## Task 8: Add glossary terms

**Files:**
- Modify: `site/src/i18n/glossary.json`

- [ ] **Step 1: Open the glossary**

Run:
```bash
cat site/src/i18n/glossary.json | head -10
```

Confirm JSON shape: `{ "<key>": { "en": "...", "ru": "..." }, ... }`.

- [ ] **Step 2: Insert the following entries alphabetically**

For each key below, find the correct alphabetical position in the existing file and insert. Do not append at the end — the linter checks alphabetical order.

```json
"composite":          { "en": "composite",          "ru": "композитинг" },
"compositor_thread":  { "en": "compositor thread",  "ru": "поток композитора" },
"forced_sync_layout": { "en": "forced synchronous layout", "ru": "форсированная синхронная компоновка" },
"layer":              { "en": "layer",              "ru": "слой" },
"layout":             { "en": "layout",             "ru": "компоновка" },
"layout_thrash":      { "en": "layout thrash",      "ru": "каскадная перекомпоновка" },
"paint":              { "en": "paint",              "ru": "отрисовка" },
"raster":             { "en": "raster",             "ru": "растеризация" },
"reflow":             { "en": "reflow",             "ru": "переразметка" },
"repaint":            { "en": "repaint",            "ru": "перерисовка" },
"style_recalc":       { "en": "style recalc",       "ru": "пересчёт стилей" },
"will_change":        { "en": "will-change",        "ru": "will-change" }
```

- [ ] **Step 3: Verify JSON parses**

Run:
```bash
python3 -c "import json; json.load(open('site/src/i18n/glossary.json'))" && echo OK
```

Expected: `OK`. If the script errors, fix the trailing comma or quote mismatch the parser points to.

- [ ] **Step 4: Build to verify glossary parity**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build 2>&1 | tail -20
```

Expected: clean build, no glossary-parity warning in `dist/lint-report.json`.

- [ ] **Step 5: Commit checkpoint**

```bash
git add site/src/i18n/glossary.json
git commit -m "content(glossary): add render-pipeline terms EN+RU"
```

---

## Task 9: Final build verification

**Files:**
- Read only (no writes)

- [ ] **Step 1: Run the full build**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site && bun run build 2>&1 | tail -20
```

Expected:
- Build succeeds
- Output ends with the page count (typically 301 pages)
- No `error` or `warning` strings in the tail

- [ ] **Step 2: Inspect the lint report**

Run:
```bash
cat site/dist/lint-report.json
```

Expected exactly:
```json
{"errors":[],"warnings":[]}
```

If `errors` is non-empty, read the array — each entry names the failing file, rule, and offending location. Fix and re-run.

Common offenders:
- `text-budget` → trim Crux / KeyTakeaway / Misconception
- `hydration-cap` → confirm only `RetrievalDrawer` has `client:*`
- `depth-id-missing` → frontmatter `depth.<key>` does not match any element `id` in the body
- `i18n-parity` → component count or IDs differ between EN and RU
- `glossary-parity` → a key in glossary.json is missing `en` or `ru`

- [ ] **Step 3: Count hydrated islands per page**

Run:
```bash
grep -c 'client:' site/src/content/book/en/browser/02-render-pipeline/index.mdx
grep -c 'client:' site/src/content/book/ru/browser/02-render-pipeline/index.mdx
```

Expected: `1` for each (only `RetrievalDrawer client:load`). Cap is 5.

- [ ] **Step 4: Verify depth IDs map to body**

Run:
```bash
for id in pipe-stages card-composite-cost mc-layout-thrash card-frame-numbers; do
  echo "ID: $id"
  grep -n "id=\"$id\"" site/src/content/book/en/browser/02-render-pipeline/index.mdx
done
```

Expected: each ID matches exactly one line in the EN file. Repeat the loop against the RU file.

---

## Task 10: Browser smoke test and final commit

**Files:**
- Read only (no writes); a final commit only if any fix was needed in Task 9.

- [ ] **Step 1: Start the dev server**

Run:
```bash
cd /Users/artemmac/dev/awesome-everything/site && bun dev
```

Expected: Astro logs the dev URL (typically `http://localhost:4321`).

- [ ] **Step 2: Open the EN page**

Visit `http://localhost:4321/en/browser/02-render-pipeline/` in a browser.

Verify by hand:
- Page title matches frontmatter
- Crux renders at the top
- TierAccordion opens to junior; click middle and senior open
- DragOrder is interactive (drag a stage)
- Quizzes show options and accept clicks
- TraceScenario and TradeoffMatrix render their options
- DebugLog shows the violation lines
- RetrievalDrawer expands when clicked (hydration check)
- NumbersCard table is visible
- SpiralCue renders with the statefulness thread link
- Sidebar TOC marks `02-render-pipeline` as active
- No errors in the browser DevTools console

- [ ] **Step 3: Open the RU page**

Visit `http://localhost:4321/ru/browser/02-render-pipeline/`.

Verify the same checklist, plus:
- All Russian text is correct (diacritics intact)
- LangSwitch toggles back to EN and preserves the piece position

- [ ] **Step 4: Verify dark mode**

Toggle the colour scheme (system or the on-page control if any). Verify all components remain legible.

- [ ] **Step 5: Stop the dev server**

`Ctrl+C` in the terminal running `bun dev`.

- [ ] **Step 6: Final commit (if any post-smoke fix was needed)**

If Step 2 or Step 3 surfaced any visual fix, commit it now:

```bash
git add site/src/content/book/en/browser/02-render-pipeline/index.mdx site/src/content/book/ru/browser/02-render-pipeline/index.mdx
git commit -m "content(browser): 02-render-pipeline post-smoke polish"
```

- [ ] **Step 7: Update curriculum-progress memory**

Edit `/Users/artemmac/.claude/projects/-Users-artemmac-dev-awesome-everything/memory/curriculum_progress.md`:

- Move browser from `Partial 1/8` to `Partial 2/8`
- Update the count: `browser 2/8 (03-v8-internals, 02-render-pipeline)`

---

## Final acceptance

All of the following must be true before declaring done:

- [ ] `bun run build` exits 0
- [ ] `site/dist/lint-report.json` is `{"errors":[],"warnings":[]}`
- [ ] EN and RU files both have `status: ready` in frontmatter
- [ ] Hydration count per page is 1
- [ ] All 4 `depth.*` IDs map to body elements in both EN and RU
- [ ] 8 sources listed in both files' frontmatter
- [ ] 12 new glossary terms added, alphabetical order preserved, JSON parses
- [ ] Both pages render in the browser without console errors
- [ ] Memory file `curriculum_progress.md` updated to reflect the new piece

If any of the above fails, fix the offending step and rerun the verification from Task 9.
