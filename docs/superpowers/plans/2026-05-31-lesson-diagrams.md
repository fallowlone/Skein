# Lesson Diagrams (B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an on-brand, dark-aware vector **diagram kit** for lessons, re-skin the legacy `algo/` figures to tokens, and stand up an **author → verify** AI pipeline (with a mandatory per-lesson verification bot) plus a pilot batch — the foundation for rolling explanatory diagrams out to all 1279 lessons.

**Architecture:** New static Astro components under `src/components/diagram/` (DiagramFrame + FlowDiagram + StackDiagram + SequenceDiagram), all tokenized. The 4 `algo/` figures are re-skinned in place. The pipeline is two subagent prompt templates (author, verify) dispatched per lesson with a fix loop; a pilot proves it on ~5 lessons; B3 (full rollout) is an operational batch procedure run afterward.

**Tech Stack:** Astro 5, TypeScript, vitest, inline SVG/CSS, design tokens in `src/styles/global.css`, Tailwind utilities mapped to tokens (`text-ink text-muted bg-card border-rule`).

**Spec:** `docs/superpowers/specs/2026-05-31-lesson-diagrams-design.md`

**Conventions:**
- Tests beside source as `*.test.ts`; run `bun run test <path>` from `site/`.
- Alias `~/` → `site/src/`. Astro components use scoped `<style>` or token-backed Tailwind arbitrary values; **never** raw ByteByteGo palette (`bg-white`, `bg-panel-*`, `text-bbg-*`, `border-gray-*`, `bg-bbg-*`, `rounded-2xl`) and **never** Tailwind opacity modifiers on var()-backed tokens (use `color-mix`).
- `bun run build` (from `site/`) is ~4-5 min (3976 pages); run FOREGROUND, WAIT (Bash timeout 360000). Build must stay 0 errors, lint clean.
- Every diagram figure carries `data-lesson-visual` and a `role="img"` + `aria-label`.
- Commit per task; end messages with the Co-Authored-By trailer.

---

## File Structure

**Create (B1 kit):**
- `src/components/diagram/DiagramFrame.astro` — figure wrapper + caption.
- `src/components/diagram/FlowDiagram.astro` — nodes + edges (boxes + arrows).
- `src/components/diagram/flow-layout.ts` — pure grid-placement logic (+ test).
- `src/components/diagram/StackDiagram.astro` — vertical layered boxes.
- `src/components/diagram/SequenceDiagram.astro` — lifelines + messages.

**Modify (B1 re-skin):**
- `src/components/algo/StructureFigure.astro`, `MachineFigure.astro`, `ComplexityChart.astro`, `AlgoTrace.astro` — raw palette → tokens.

**Create (B2 pipeline):**
- `.claude/commands/diagram.md` — author-bot prompt/command.
- `docs/superpowers/diagram-verify-prompt.md` — verify-bot prompt template.
- `docs/superpowers/diagram-rollout.md` — B3 batch procedure + reporting.

---

## Phase B1 — Diagram kit

### Task 1: DiagramFrame wrapper

**Files:** Create `src/components/diagram/DiagramFrame.astro`

- [ ] **Step 1: Implement**

```astro
---
// src/components/diagram/DiagramFrame.astro
interface Props { caption?: string; label: string; hue?: string; }
const { caption, label, hue } = Astro.props;
---
<figure data-lesson-visual class="dframe" style={hue ? `--d: ${hue};` : undefined} role="img" aria-label={label}>
  <div class="dframe-body"><slot /></div>
  {caption && <figcaption class="dframe-cap">{caption}</figcaption>}
</figure>
<style>
  .dframe {
    margin: 28px 0; padding: 20px 20px 16px;
    background: var(--card); border: 0.5px solid var(--hairline-2);
    border-radius: var(--r-md, 8px);
  }
  .dframe[style*="--d"] { border-left: 2.5px solid var(--d); }
  .dframe-body { overflow-x: auto; }
  .dframe-cap {
    margin-top: 12px; text-align: center; font-size: 12px;
    color: var(--muted); font-family: var(--font-body);
  }
</style>
```

- [ ] **Step 2: Commit** (build is exercised in Task 5)

```bash
git add site/src/components/diagram/DiagramFrame.astro
git commit -m "feat(diagram): DiagramFrame wrapper (tokenized, a11y)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: FlowDiagram + layout logic

**Files:**
- Create: `src/components/diagram/flow-layout.ts`
- Test: `src/components/diagram/flow-layout.test.ts`
- Create: `src/components/diagram/FlowDiagram.astro`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/diagram/flow-layout.test.ts
import { describe, it, expect } from "vitest";
import { placeNodes, type RawNode } from "./flow-layout";

describe("placeNodes", () => {
  it("auto-places nodes left-to-right when col/row omitted", () => {
    const nodes: RawNode[] = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }];
    const placed = placeNodes(nodes, 3);
    expect(placed.map((n) => n.col)).toEqual([0, 1, 2]);
    expect(placed.every((n) => n.row === 0)).toBe(true);
  });
  it("wraps to the next row past perRow", () => {
    const nodes: RawNode[] = [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }];
    const placed = placeNodes(nodes, 2);
    expect(placed.map((n) => [n.col, n.row])).toEqual([[0, 0], [1, 0], [0, 1]]);
  });
  it("respects explicit col/row", () => {
    const placed = placeNodes([{ id: "a", label: "A", col: 2, row: 1 }], 3);
    expect(placed[0]).toMatchObject({ col: 2, row: 1 });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `cd site && bun run test src/components/diagram/flow-layout.test.ts`

- [ ] **Step 3: Implement the layout**

```ts
// src/components/diagram/flow-layout.ts
export type RawNode = { id: string; label: string; col?: number; row?: number; sub?: string };
export type PlacedNode = { id: string; label: string; col: number; row: number; sub?: string };

/** Auto-place nodes left-to-right, wrapping every `perRow`, unless col/row are explicit. */
export function placeNodes(nodes: RawNode[], perRow: number): PlacedNode[] {
  let auto = 0;
  return nodes.map((n) => {
    if (n.col != null && n.row != null) return { ...n, col: n.col, row: n.row };
    const col = auto % perRow;
    const row = Math.floor(auto / perRow);
    auto++;
    return { ...n, col, row };
  });
}
```

- [ ] **Step 4: Run, expect PASS**: `cd site && bun run test src/components/diagram/flow-layout.test.ts`

- [ ] **Step 5: Implement the component**

```astro
---
// src/components/diagram/FlowDiagram.astro
import DiagramFrame from "./DiagramFrame.astro";
import { placeNodes, type RawNode } from "./flow-layout";

interface Edge { from: string; to: string; label?: string }
interface Props { nodes: RawNode[]; edges: Edge[]; caption?: string; label: string; perRow?: number; hue?: string }
const { nodes, edges, caption, label, perRow = 4, hue } = Astro.props;

const placed = placeNodes(nodes, perRow);
const cols = Math.max(...placed.map((n) => n.col)) + 1;
const rows = Math.max(...placed.map((n) => n.row)) + 1;
const CW = 130, CH = 52, GX = 46, GY = 40;
const W = cols * CW + (cols - 1) * GX;
const H = rows * CH + (rows - 1) * GY;
const cx = (c: number) => c * (CW + GX) + CW / 2;
const cy = (r: number) => r * (CH + GY) + CH / 2;
const byId = new Map(placed.map((n) => [n.id, n]));
---
<DiagramFrame caption={caption} label={label} hue={hue}>
  <svg viewBox={`0 0 ${W} ${H}`} class="flow" width={W} height={H}>
    <defs>
      <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    {edges.map((e) => {
      const a = byId.get(e.from), b = byId.get(e.to);
      if (!a || !b) return null;
      const x1 = cx(a.col), y1 = cy(a.row), x2 = cx(b.col), y2 = cy(b.row);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return (
        <g>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" stroke-width="1.4" marker-end="url(#flow-arrow)" opacity="0.8" />
          {e.label && <text x={mx} y={my - 4} text-anchor="middle" font-size="10.5" font-family="var(--font-mono)" fill="var(--faint)">{e.label}</text>}
        </g>
      );
    })}
    {placed.map((n) => (
      <g transform={`translate(${n.col * (CW + GX)} ${n.row * (CH + GY)})`}>
        <rect width={CW} height={CH} rx="7" fill="var(--card-2)" stroke="var(--hairline-strong)" stroke-width="0.8" />
        <text x={CW / 2} y={n.sub ? CH / 2 - 4 : CH / 2 + 4} text-anchor="middle" font-size="12.5" font-family="var(--font-body)" fill="var(--ink)">{n.label}</text>
        {n.sub && <text x={CW / 2} y={CH / 2 + 12} text-anchor="middle" font-size="10" font-family="var(--font-mono)" fill="var(--muted)">{n.sub}</text>}
      </g>
    ))}
  </svg>
</DiagramFrame>
<style>.flow { display: block; margin: 0 auto; max-width: 100%; height: auto; }</style>
```

- [ ] **Step 6: Commit**

```bash
git add site/src/components/diagram/flow-layout.ts site/src/components/diagram/flow-layout.test.ts site/src/components/diagram/FlowDiagram.astro
git commit -m "feat(diagram): FlowDiagram (nodes + edges, auto grid layout)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: StackDiagram

**Files:** Create `src/components/diagram/StackDiagram.astro`

- [ ] **Step 1: Implement**

```astro
---
// src/components/diagram/StackDiagram.astro
import DiagramFrame from "./DiagramFrame.astro";
interface Layer { label: string; note?: string }
interface Props { layers: Layer[]; caption?: string; label: string; hue?: string }
const { layers, caption, label, hue } = Astro.props;
---
<DiagramFrame caption={caption} label={label} hue={hue}>
  <div class="stack">
    {layers.map((l, i) => (
      <div class="stack-layer" style={`--i: ${i};`}>
        <span class="stack-label">{l.label}</span>
        {l.note && <span class="stack-note">{l.note}</span>}
      </div>
    ))}
  </div>
</DiagramFrame>
<style>
  .stack { display: flex; flex-direction: column; gap: 4px; max-width: 420px; margin: 0 auto; }
  .stack-layer {
    display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    padding: 12px 16px; border-radius: var(--r-sm, 4px);
    background: color-mix(in srgb, var(--d, var(--accent)) calc(6% + var(--i) * 2%), var(--card-2));
    border: 0.5px solid var(--hairline-2);
  }
  .stack-label { font-family: var(--font-body); font-size: 13.5px; color: var(--ink); font-weight: 500; }
  .stack-note { font-family: var(--font-mono); font-size: 11px; color: var(--muted); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/diagram/StackDiagram.astro
git commit -m "feat(diagram): StackDiagram (layered boxes)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: SequenceDiagram

**Files:** Create `src/components/diagram/SequenceDiagram.astro`

- [ ] **Step 1: Implement**

```astro
---
// src/components/diagram/SequenceDiagram.astro
import DiagramFrame from "./DiagramFrame.astro";
interface Msg { from: string; to: string; label: string }
interface Props { actors: string[]; messages: Msg[]; caption?: string; label: string; hue?: string }
const { actors, messages, caption, label, hue } = Astro.props;

const LANE = 150, TOP = 34, STEP = 44, PAD = 30;
const W = PAD * 2 + (actors.length - 1) * LANE;
const H = TOP + messages.length * STEP + 24;
const ax = (i: number) => PAD + i * LANE;
const idx = (name: string) => actors.indexOf(name);
---
<DiagramFrame caption={caption} label={label} hue={hue}>
  <svg viewBox={`0 0 ${W} ${H}`} class="seq" width={W} height={H}>
    <defs>
      <marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
      </marker>
    </defs>
    {actors.map((a, i) => (
      <g>
        <rect x={ax(i) - 54} y="6" width="108" height="24" rx="5" fill="var(--card-2)" stroke="var(--hairline-strong)" stroke-width="0.8" />
        <text x={ax(i)} y="22" text-anchor="middle" font-size="11.5" font-family="var(--font-body)" fill="var(--ink)">{a}</text>
        <line x1={ax(i)} y1="30" x2={ax(i)} y2={H - 10} stroke="var(--hairline-2)" stroke-width="1" stroke-dasharray="3 4" />
      </g>
    ))}
    {messages.map((m, k) => {
      const x1 = ax(idx(m.from)), x2 = ax(idx(m.to)), y = TOP + k * STEP + 18;
      const dir = x2 >= x1 ? 1 : -1;
      return (
        <g>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--accent)" stroke-width="1.4" marker-end="url(#seq-arrow)" />
          <text x={(x1 + x2) / 2} y={y - 5} text-anchor="middle" font-size="10.5" font-family="var(--font-mono)" fill="var(--ink-2)">{m.label}</text>
        </g>
      );
    })}
  </svg>
</DiagramFrame>
<style>.seq { display: block; margin: 0 auto; max-width: 100%; height: auto; }</style>
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/diagram/SequenceDiagram.astro
git commit -m "feat(diagram): SequenceDiagram (lifelines + messages)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Kit gallery + visual verification

**Files:** Create `src/pages/[lang]/_diagram-gallery.astro` (temporary dev page; deleted at end of task)

- [ ] **Step 1: Build a gallery page** that mounts one of each primitive with realistic data:

```astro
---
// src/pages/[lang]/_diagram-gallery.astro
import Topic from "~/layouts/Topic.astro";
import FlowDiagram from "~/components/diagram/FlowDiagram.astro";
import StackDiagram from "~/components/diagram/StackDiagram.astro";
import SequenceDiagram from "~/components/diagram/SequenceDiagram.astro";
export function getStaticPaths() { return [{ params: { lang: "en" } }]; }
---
<Topic title="Diagram gallery" lang="en">
  <div class="oa-wrap" style="padding-block: var(--s-6); max-width: 760px;">
    <FlowDiagram label="Request path" caption="A request through the edge to the origin."
      hue="var(--d-backend)"
      nodes={[{id:"c",label:"Client"},{id:"lb",label:"Load Balancer"},{id:"svc",label:"Service",sub:"x3"},{id:"db",label:"Postgres"}]}
      edges={[{from:"c",to:"lb"},{from:"lb",to:"svc"},{from:"svc",to:"db",label:"SQL"}]} />
    <StackDiagram label="Network layers" caption="Encapsulation down the stack." hue="var(--d-network)"
      layers={[{label:"HTTP",note:"app"},{label:"TLS",note:"security"},{label:"TCP",note:"transport"},{label:"IP",note:"network"}]} />
    <SequenceDiagram label="TCP handshake" caption="Three packets establish the connection." hue="var(--d-network)"
      actors={["Client","Server"]}
      messages={[{from:"Client",to:"Server",label:"SYN"},{from:"Server",to:"Client",label:"SYN-ACK"},{from:"Client",to:"Server",label:"ACK"}]} />
  </div>
</Topic>
```

- [ ] **Step 2: Build (FOREGROUND, wait, timeout 360000)**

Run: `cd site && bun run build`
Expected: success, 0 lint errors. (Page count rises by 1.)

- [ ] **Step 3: Screenshot light + dark**

Serve `dist` and screenshot `/en/_diagram-gallery/` at 820px width in light and dark (set `localStorage.awesome.theme="dark"` via `addInitScript`). Read the PNGs. Verify each primitive: boxes/arrows/lifelines render, labels readable, domain-hue accents present, **dark theme legible** (no invisible white-on-dark), no raw-palette artifacts.

- [ ] **Step 4: Delete the gallery page + scratch**

Run: `cd site && rm -f "src/pages/[lang]/_diagram-gallery.astro"`

- [ ] **Step 5: Commit** (the kit is proven; gallery removed)

```bash
git add -A site/src/pages
git commit -m "test(diagram): verify kit primitives render light+dark (gallery removed)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Re-skin StructureFigure + MachineFigure

**Files:** Modify `src/components/algo/StructureFigure.astro`, `src/components/algo/MachineFigure.astro`

- [ ] **Step 1: Replace the `fill()` helper in BOTH files**

Both files contain this exact helper:
```ts
const fill = (m?: string) =>
  m === "active" ? "bg-panel-sky border-bbg-purple"
  : m === "done" ? "bg-panel-mint border-bbg-success"
  : m === "target" ? "bg-panel-rose border-bbg-warn"
  : "bg-white border-gray-300";
```
Replace it with token-backed arbitrary values (no opacity modifiers — `color-mix` for tints):
```ts
const fill = (m?: string) =>
  m === "active" ? "bg-[color:var(--accent-ghost)] border-[color:var(--accent)]"
  : m === "done" ? "bg-[color:color-mix(in_srgb,var(--ok)_12%,var(--card))] border-[color:var(--ok)]"
  : m === "target" ? "bg-[color:color-mix(in_srgb,var(--warn)_12%,var(--card))] border-[color:var(--warn)]"
  : "bg-card border-[color:var(--hairline-strong)]";
```

- [ ] **Step 2: Swap the text classes in BOTH files**

Replace `text-bbg-ink` → `text-ink` and `text-bbg-muted` → `text-muted` (every occurrence). Leave structure/markup otherwise unchanged.

- [ ] **Step 3: Build (FOREGROUND, wait, timeout 360000)**

Run: `cd site && bun run build`
Expected: success, 0 errors.

- [ ] **Step 4: Dark screenshot of an algo lesson using these figures**

Serve dist; screenshot (dark theme) `/en/learn/base-cs/…` or any lesson importing `StructureFigure`/`MachineFigure` (find one: `grep -rln "StructureFigure\|MachineFigure" src/content/lessons/en | head -1`). Verify cells render with token colors, readable in dark, active/done/target states distinct.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/algo/StructureFigure.astro site/src/components/algo/MachineFigure.astro
git commit -m "fix(diagram): re-skin StructureFigure + MachineFigure to tokens (dark-aware)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Re-skin ComplexityChart

**Files:** Modify `src/components/algo/ComplexityChart.astro`

- [ ] **Step 1: Replace hardcoded hex colors with tokens**

In the `curves` array, replace the `color` hexes:
```ts
const curves = [
  { name: "O(1)", color: "var(--muted)", f: () => 1 },
  { name: "O(log n)", color: "var(--ok)", f: (n: number) => (n < 1 ? 0 : Math.log2(n)) },
  { name: "O(n)", color: "var(--accent)", f: (n: number) => n },
  { name: "O(n log n)", color: "var(--warn)", f: (n: number) => (n < 1 ? 0 : n * Math.log2(n)) },
  { name: "O(n²)", color: "var(--danger)", f: (n: number) => n * n },
  { name: "O(2ⁿ)", color: "var(--d-ai)", f: (n: number) => 2 ** n },
];
```
And replace the axis/label colors: the two `stroke="#cbd5e1"` → `stroke="var(--hairline-strong)"`; the three `fill="#64748b"` → `fill="var(--muted)"`.

- [ ] **Step 2: Build (FOREGROUND, wait, timeout 360000)**

Run: `cd site && bun run build`
Expected: success, 0 errors.

- [ ] **Step 3: Dark screenshot** of a lesson importing `ComplexityChart` (find via grep). Verify axes + curves + labels render in token colors, legible in dark.

- [ ] **Step 4: Commit**

```bash
git add site/src/components/algo/ComplexityChart.astro
git commit -m "fix(diagram): re-skin ComplexityChart to tokens (dark-aware)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Re-skin AlgoTrace

**Files:** Modify `src/components/algo/AlgoTrace.astro`

- [ ] **Step 1: Swap palette classes in the markup**

In `AlgoTrace.astro`:
- `border-2 border-gray-200 bg-card` (figure) → `border border-rule bg-card`
- `bg-bbg-paper` (the `<pre>`) → `bg-[color:var(--code-bg)]`
- `text-bbg-ink` → `text-ink`; `text-bbg-muted` → `text-muted` (every occurrence, incl. the buttons and status)
- `rounded-2xl` → `rounded-[8px]`; `rounded-lg` may stay (it's a radius util, not palette)
- the two nav buttons `border-2 border-gray-200 … hover:border-bbg-purple` → `border border-rule … hover:border-[color:var(--accent)]`

- [ ] **Step 2: Check the inline `<script>` for hardcoded cell colors**

Read the `<script>` block. If the JS that renders trace cells injects palette classes (e.g. `bg-panel-sky`, `bg-white`, `border-bbg-purple`), map them the same way as Task 6's `fill()` (active→accent-ghost/accent, done→ok, target→warn, default→card/hairline-strong). If the script builds class strings, update them to the token arbitrary-value equivalents. Quote the exact strings you changed in your report.

- [ ] **Step 3: Build (FOREGROUND, wait, timeout 360000)**

Run: `cd site && bun run build`
Expected: success, 0 errors.

- [ ] **Step 4: Dark screenshot + interaction** of an algo lesson with `AlgoTrace` (e.g. `learn/algorithms/08-heaps/02-heap-operations`). Verify the code block, the stepper buttons, and the trace cells render in tokens and are legible in dark; step Prev/Next still works (cells update).

- [ ] **Step 5: Commit**

```bash
git add site/src/components/algo/AlgoTrace.astro
git commit -m "fix(diagram): re-skin AlgoTrace to tokens (dark-aware)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase B2 — Authoring pipeline

### Task 9: Author-bot command

**Files:** Create `.claude/commands/diagram.md`

- [ ] **Step 1: Write the command/prompt**

```markdown
# /diagram <track>/<unit>/<lesson>

Author ONE on-brand explanatory diagram for a single lesson, EN + RU, using the
diagram kit. Additive — insert into the lesson Visual slot; never rewrite prose.

## Steps
1. Read `site/src/content/lessons/en/<track>/<unit>/<lesson>/index.mdx` and the RU mirror.
2. **Idempotency:** if either file already contains `data-lesson-visual` (any diagram/figure), STOP and report "already has a visual — skipped".
3. Choose the single best-fit primitive for the lesson's core concept:
   - `FlowDiagram` — a process / architecture / state flow (boxes + arrows).
   - `StackDiagram` — layers (encapsulation, tiers, request path).
   - `SequenceDiagram` — a time-ordered exchange (handshake, protocol, API call).
   - `StructureFigure` / `ComplexityChart` / `AlgoTrace` — only for algorithms/base-cs structure/complexity/trace lessons.
   Base the diagram ONLY on what the lesson text states. Invent nothing. If no
   primitive genuinely clarifies the concept, STOP and report "no good diagram fits"
   with a one-line reason (do not force a weak diagram).
4. Import the chosen component (`import X from "~/components/diagram/X.astro";`) and
   insert the diagram into the **Visual slot** — directly after the main Explanation,
   before Practice/Check. Use a clear `label` (a11y) and a one-sentence `caption`.
5. Mirror into the RU file: SAME diagram + structure, RU labels/caption.
6. Build: `cd site && bun run build`; confirm 0 errors and the lesson page now
   contains `data-lesson-visual`.
7. Commit: `content(diagram): <track>/<unit>/<lesson> add <Primitive> EN+RU`.

## Hard rules
- One diagram per lesson. Kit primitives + tokens only; no raw palette; no raster.
- EN/RU parity. Idempotent. Technically correct or skip.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/diagram.md
git commit -m "feat(diagram): /diagram author command

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Verify-bot prompt

**Files:** Create `docs/superpowers/diagram-verify-prompt.md`

- [ ] **Step 1: Write the verify prompt**

```markdown
# Diagram verify-bot

You verify ONE lesson's newly-authored diagram. Do NOT trust the author — read the
actual MDX and the rendered claim. Return a verdict.

## Inputs
- Lesson key `<track>/<unit>/<lesson>` and the EN + RU MDX paths.

## Checks (read the files; do not assume)
1. **Technical accuracy:** Does the diagram faithfully represent the lesson's
   concept and claims? Wrong order, wrong arrows, wrong/missing labels, or invented
   facts = FAIL. (E.g. a TCP handshake MUST be SYN→ / ←SYN-ACK / ACK→.)
2. **On-brand:** Uses only kit primitives (`~/components/diagram/*` or the re-skinned
   `algo/*`) and tokens. Any raw palette (`bg-white`, `bg-panel-*`, `text-bbg-*`,
   `border-gray-*`, hardcoded hex, `rounded-2xl`) or raster image = FAIL.
3. **Structure:** Exactly one `data-lesson-visual` added; placed in the Visual slot;
   import path correct.
4. **i18n parity:** EN and RU each have the SAME diagram with localized labels/caption.
5. **Build:** `cd site && bun run build` is green (0 errors) and the lesson page
   contains `data-lesson-visual`.

## Verdict
- **PASS** — all checks hold.
- **FIX: <specific list>** — hand back to the author (max 2 iterations).
- **FLAG: <reason>** — cannot be made correct/on-brand automatically; record for human.
Output only the verdict + the specific findings (file:line where relevant).
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/diagram-verify-prompt.md
git commit -m "feat(diagram): verify-bot prompt template

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Pilot batch (5 lessons) + negative test

**Files:** none new (runs the pipeline; commits are per-lesson content).

- [ ] **Step 1: Pick 5 pilot lessons across distinct primitives/tracks**

Choose by hand, e.g.: one networking (sequence — a handshake), one backend/deployment
(flow — request path), one browser/networking (stack — layers), one databases (flow —
query path), one algorithms (already has figures → expect "skipped"). Record the 5 keys.

- [ ] **Step 2: Run author → verify on each**

For each lesson: dispatch the author-bot (`/diagram <key>`), then the verify-bot
(`docs/superpowers/diagram-verify-prompt.md`) against the result. On `FIX`, loop the
author with the findings (max 2). On `FLAG`, record it. Do NOT commit a lesson until
its verdict is PASS (or it is an intentional "skipped").

- [ ] **Step 3: Negative test (prove the bot bites)**

Hand-edit ONE pilot lesson's diagram to introduce a deliberate technical error (e.g.
reverse two handshake messages), run ONLY the verify-bot, and confirm it returns
**FAIL/FIX** naming that error. Then revert the deliberate error.
Run: capture the verify-bot output showing the rejection.

- [ ] **Step 4: Build gate (FOREGROUND, wait, timeout 360000)**

Run: `cd site && bun run build`
Expected: 0 errors; the 4-5 piloted lessons now contain `data-lesson-visual`.

- [ ] **Step 5: Pilot report**

Write a short note (in the PR/commit body) listing the 5 lessons, their chosen
primitive, verdicts (passed/fixed/flagged/skipped), and the negative-test result.

- [ ] **Step 6: Commit any remaining**

```bash
git add -A
git commit -m "content(diagram): pilot batch — 5 lessons + verify-bot negative test

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Phase B3 — Rollout procedure (operational; run after B1+B2 accepted)

### Task 12: Document the rollout procedure

**Files:** Create `docs/superpowers/diagram-rollout.md`

- [ ] **Step 1: Write the procedure**

```markdown
# Diagram rollout (B3)

Run after the kit (B1) and pipeline (B2) are accepted. Adds one explanatory diagram
to every lesson that lacks `data-lesson-visual`, EN+RU.

## Batching
- Process by track, ~20–30 lessons per batch.
- Per lesson: author-bot (`/diagram <key>`) → verify-bot. PASS to commit; FIX loop
  (max 2); FLAG → backlog.
- Idempotent + resumable: skip lessons already carrying `data-lesson-visual`.

## Per-batch gate
- `cd site && bun run build` → 0 errors, lint clean.
- Report: `passed / fixed / flagged (with reasons) / skipped`.

## Final acceptance
- Full build (3976+ pages, 0 errors).
- Sample ~2 lessons per track in light + dark; confirm diagrams render and theme.
- Flagged backlog handed off for manual finishing.

## Coverage note
Lessons where no primitive genuinely helps are FLAGGED, not forced — quality over
coverage. Record the flagged count honestly in the final report.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/diagram-rollout.md
git commit -m "docs(diagram): B3 rollout procedure

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** B1 kit — DiagramFrame (T1), FlowDiagram (T2), StackDiagram (T3),
  SequenceDiagram (T4), visual proof (T5), re-skin 4 algo figures (T6-T8). B2 — author
  command (T9), verify prompt (T10), pilot + mandatory verify-bot + negative test
  (T11). B3 — documented batch procedure with per-batch gate + report (T12). Vector-only,
  tokens-only, `data-lesson-visual`, EN/RU parity, idempotent — all encoded in the
  components and the author/verify prompts.
- **Type consistency:** `RawNode`/`placeNodes` defined in T2 and consumed by FlowDiagram
  (same file group). DiagramFrame `Props {caption?, label, hue?}` (T1) match how
  Flow/Stack/Sequence call it (T2-T4). The `fill()` token mapping is identical in T6
  and referenced for AlgoTrace's script in T8.
- **Known verification points (not placeholders):** lesson paths for the dark
  screenshots in T6-T8 are found via grep at execution time (the exact slug varies);
  T8 Step 2 inspects the real `<script>` and maps whatever palette strings it finds
  (the inventory in the spec lists them). The pilot lesson choices in T11 are picked at
  run time to cover distinct primitives.
- **Scope:** B1+B2+pilot are bite-sized tasks here; B3 full rollout is intentionally a
  documented operational procedure (T12), not 1279 individual steps — per the spec.
