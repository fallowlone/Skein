# Lesson Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 7 reusable, theme-aware, zero-hydration diagram components for lessons (and pieces), backed by a shared color contract and pure layout helpers, plus re-activate the dead lesson visual lint and ship 4 reference lessons.

**Architecture:** Pure TypeScript layout helpers (`*-layout.ts`, `palette.ts`) compute geometry and are unit-tested; thin `.astro` wrappers map props → geometry → static SVG (flow/sequence/tree/topology) or Tailwind divs (stack/compare/cells). Color flows through one resolver to CSS vars, so light/dark/colorblind retheme touches only `global.css`. A path-bug fix in `lessons.ts` makes the existing `data-lesson-visual` contract fire on real unit-scoped routes.

**Tech Stack:** Astro 6.3.5, Preact (not used here — zero islands), Tailwind 3.4.0, Vitest + jsdom, TypeScript 5.6.

**Spec:** `docs/superpowers/specs/2026-05-23-lesson-diagrams-design.md`

**Conventions for every task:**
- Work in `/Users/artemmac/dev/awesome-everything/site`.
- Run tests with `bun run test` (Vitest). A single file: `bun run test -- src/components/figures/palette.test.ts`.
- Verify a build via `bun run build` then **read `dist/lint-report.json`** — success = `{"errors":[],"warnings":[]}`. NEVER trust build stdout (a proxy mangles it).
- Imports inside `src/` use the `~/` alias (`~` → `site/src/`). Components in the same folder may use `./`.
- Commit messages: conventional commits, no co-author footer unless asked.

---

## File structure

```
site/src/components/figures/
  palette.ts              FigColor union + resolve() → {stroke,fill} CSS-var paint     (Task 1)
  palette.test.ts         resolver unit tests                                          (Task 1)
  flow-layout.ts          layoutFlow() geometry for FlowDiagram                        (Task 2)
  flow-layout.test.ts                                                                  (Task 2)
  sequence-layout.ts      layoutSequence() geometry for SequenceDiagram               (Task 3)
  sequence-layout.test.ts                                                             (Task 3)
  tree-layout.ts          layoutTree() geometry for TreeDiagram                        (Task 4)
  tree-layout.test.ts                                                                 (Task 4)
  figures.css             shared opt-in @keyframes (reduced-motion guarded)           (Task 5)
  FlowDiagram.astro                                                                    (Task 6)
  SequenceDiagram.astro                                                                (Task 7)
  TreeDiagram.astro                                                                    (Task 8)
  TopologyDiagram.astro   inline grid placement (no separate helper)                  (Task 9)
  LayerStack.astro                                                                     (Task 10)
  ComparePanels.astro                                                                  (Task 11)
  DataCells.astro                                                                      (Task 12)

site/src/lint/rules/lessons.ts        path-bug fix (lessonInfoFromPath)               (Task 13)
site/src/lint/rules/lessons.test.ts   updated paths + regression test                 (Task 13)

site/src/content/lessons/{en,ru}/...  4 reference lessons get a real figure           (Task 14)
.claude/commands/diagram.md           /diagram authoring command                      (Task 15)
```

---

## Task 1: palette.ts — the color contract

**Files:**
- Create: `site/src/components/figures/palette.ts`
- Test: `site/src/components/figures/palette.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/figures/palette.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { resolve } from "./palette";

describe("resolve", () => {
  test("pillar color maps to --p-X stroke and --p-X-bg fill", () => {
    expect(resolve("mint")).toEqual({ stroke: "var(--p-mint)", fill: "var(--p-mint-bg)" });
    expect(resolve("lilac")).toEqual({ stroke: "var(--p-lilac)", fill: "var(--p-lilac-bg)" });
  });

  test("neutral maps to structural tokens", () => {
    expect(resolve("neutral")).toEqual({ stroke: "var(--rule-strong)", fill: "var(--card-2)" });
  });

  test("status colors use the status var for stroke and a color-mix fill", () => {
    expect(resolve("ok")).toEqual({
      stroke: "var(--ok)",
      fill: "color-mix(in oklch, var(--ok) 16%, transparent)",
    });
    expect(resolve("danger")).toEqual({
      stroke: "var(--danger)",
      fill: "color-mix(in oklch, var(--danger) 16%, transparent)",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/components/figures/palette.test.ts`
Expected: FAIL — `Failed to resolve import "./palette"`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/components/figures/palette.ts`:

```ts
export type FigColor =
  | "lilac" | "mint" | "peach" | "sky" | "rose"   // pillar palette
  | "neutral"                                       // structural
  | "ok" | "warn" | "danger";                       // status

export interface FigPaint {
  stroke: string;
  fill: string;
}

const STATUS = new Set(["ok", "warn", "danger"]);

export function resolve(color: FigColor): FigPaint {
  if (color === "neutral") {
    return { stroke: "var(--rule-strong)", fill: "var(--card-2)" };
  }
  if (STATUS.has(color)) {
    return {
      stroke: `var(--${color})`,
      fill: `color-mix(in oklch, var(--${color}) 16%, transparent)`,
    };
  }
  return { stroke: `var(--p-${color})`, fill: `var(--p-${color}-bg)` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/components/figures/palette.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/components/figures/palette.ts site/src/components/figures/palette.test.ts
git commit -m "feat(figures): add FigColor palette resolver"
```

---

## Task 2: flow-layout.ts — FlowDiagram geometry

**Files:**
- Create: `site/src/components/figures/flow-layout.ts`
- Test: `site/src/components/figures/flow-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/figures/flow-layout.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { layoutFlow } from "./flow-layout";

const nodes = [{ label: "A" }, { label: "B" }, { label: "C" }];

describe("layoutFlow", () => {
  test("row: N rects, N-1 arrows, even horizontal spacing", () => {
    const g = layoutFlow(nodes, undefined, "row");
    expect(g.rects).toHaveLength(3);
    expect(g.arrows).toHaveLength(2);
    const dx1 = g.rects[1].x - g.rects[0].x;
    const dx2 = g.rects[2].x - g.rects[1].x;
    expect(dx1).toBe(dx2);
    // all rects share the same y in a row
    expect(g.rects[0].y).toBe(g.rects[2].y);
  });

  test("col: rects vary in y, share x", () => {
    const g = layoutFlow(nodes, undefined, "col");
    expect(g.rects[0].x).toBe(g.rects[2].x);
    expect(g.rects[1].y).toBeGreaterThan(g.rects[0].y);
  });

  test("unspecified node color defaults to neutral", () => {
    const g = layoutFlow([{ label: "A" }], undefined, "row");
    expect(g.rects[0].color).toBe("neutral");
  });

  test("edge labels and dashed flags carry through", () => {
    const g = layoutFlow(nodes, [{ label: "req" }, { label: "res", dashed: true }], "row");
    expect(g.arrows[0].label).toBe("req");
    expect(g.arrows[1].dashed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/components/figures/flow-layout.test.ts`
Expected: FAIL — cannot resolve `./flow-layout`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/components/figures/flow-layout.ts`:

```ts
import type { FigColor } from "./palette";

export interface FlowNode { label: string; color?: FigColor; sub?: string; }
export interface FlowEdge { label?: string; dashed?: boolean; }

export interface FlowRect {
  x: number; y: number; w: number; h: number;
  cx: number; cy: number;
  label: string; color: FigColor; sub?: string;
}
export interface FlowArrow {
  x1: number; y1: number; x2: number; y2: number;
  label?: string; dashed: boolean;
}
export interface FlowGeometry {
  width: number; height: number;
  rects: FlowRect[]; arrows: FlowArrow[];
}

const NODE_W = 120;
const NODE_H = 40;
const GAP = 56;
const PAD = 10;

export function layoutFlow(
  nodes: FlowNode[],
  edges: FlowEdge[] | undefined,
  direction: "row" | "col",
): FlowGeometry {
  const row = direction === "row";
  const rects: FlowRect[] = nodes.map((n, i) => {
    const x = row ? PAD + i * (NODE_W + GAP) : PAD;
    const y = row ? PAD : PAD + i * (NODE_H + GAP);
    return {
      x, y, w: NODE_W, h: NODE_H,
      cx: x + NODE_W / 2, cy: y + NODE_H / 2,
      label: n.label, color: n.color ?? "neutral", sub: n.sub,
    };
  });

  const arrows: FlowArrow[] = [];
  for (let i = 0; i < rects.length - 1; i++) {
    const a = rects[i];
    const b = rects[i + 1];
    const e = edges?.[i];
    arrows.push(
      row
        ? { x1: a.x + a.w, y1: a.cy, x2: b.x, y2: b.cy, label: e?.label, dashed: !!e?.dashed }
        : { x1: a.cx, y1: a.y + a.h, x2: b.cx, y2: b.y, label: e?.label, dashed: !!e?.dashed },
    );
  }

  const width = row
    ? PAD * 2 + nodes.length * NODE_W + (nodes.length - 1) * GAP
    : PAD * 2 + NODE_W;
  const height = row
    ? PAD * 2 + NODE_H
    : PAD * 2 + nodes.length * NODE_H + (nodes.length - 1) * GAP;

  return { width, height, rects, arrows };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/components/figures/flow-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/components/figures/flow-layout.ts site/src/components/figures/flow-layout.test.ts
git commit -m "feat(figures): add flow-layout geometry"
```

---

## Task 3: sequence-layout.ts — SequenceDiagram geometry

**Files:**
- Create: `site/src/components/figures/sequence-layout.ts`
- Test: `site/src/components/figures/sequence-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/figures/sequence-layout.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { layoutSequence } from "./sequence-layout";

const actors = [
  { id: "c", label: "Client" },
  { id: "s", label: "Server" },
];
const steps = [
  { from: "c", to: "s", label: "SYN" },
  { from: "s", to: "c", label: "SYN-ACK", return: true },
  { from: "c", to: "s", label: "ACK" },
];

describe("layoutSequence", () => {
  test("one lane per actor, one message per step", () => {
    const g = layoutSequence(actors, steps);
    expect(g.lanes).toHaveLength(2);
    expect(g.messages).toHaveLength(3);
  });

  test("messages drop top to bottom in order", () => {
    const g = layoutSequence(actors, steps);
    expect(g.messages[0].y).toBeLessThan(g.messages[1].y);
    expect(g.messages[1].y).toBeLessThan(g.messages[2].y);
  });

  test("direction follows from/to lane order; return is dashed", () => {
    const g = layoutSequence(actors, steps);
    expect(g.messages[0].toRight).toBe(true);   // c -> s (left to right)
    expect(g.messages[1].toRight).toBe(false);  // s -> c (right to left)
    expect(g.messages[1].dashed).toBe(true);    // return step
    expect(g.messages[2].dashed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/components/figures/sequence-layout.test.ts`
Expected: FAIL — cannot resolve `./sequence-layout`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/components/figures/sequence-layout.ts`:

```ts
import type { FigColor } from "./palette";

export interface SeqActor { id: string; label: string; color?: FigColor; }
export interface SeqStep {
  from: string; to: string; label: string;
  dashed?: boolean; return?: boolean;
}

export interface SeqLane { id: string; label: string; color: FigColor; x: number; }
export interface SeqMessage {
  x1: number; x2: number; y: number;
  label: string; dashed: boolean; toRight: boolean;
  color: FigColor;
}
export interface SeqGeometry {
  width: number; height: number;
  headH: number; lifelineBottom: number;
  lanes: SeqLane[]; messages: SeqMessage[];
}

const LANE_W = 120;
const HEAD_H = 26;
const TOP = HEAD_H + 18;
const STEP_GAP = 30;
const PAD = 10;

export function layoutSequence(actors: SeqActor[], steps: SeqStep[]): SeqGeometry {
  const lanes: SeqLane[] = actors.map((a, i) => ({
    id: a.id,
    label: a.label,
    color: a.color ?? "neutral",
    x: PAD + LANE_W / 2 + i * LANE_W,
  }));
  const laneOf = (id: string) => lanes.find((l) => l.id === id)!;

  const messages: SeqMessage[] = steps.map((s, i) => {
    const from = laneOf(s.from);
    const to = laneOf(s.to);
    return {
      x1: from.x,
      x2: to.x,
      y: TOP + i * STEP_GAP,
      label: s.label,
      dashed: !!s.dashed || !!s.return,
      toRight: to.x > from.x,
      color: s.return ? from.color : "neutral",
    };
  });

  const height = TOP + steps.length * STEP_GAP + PAD;
  return {
    width: PAD * 2 + actors.length * LANE_W,
    height,
    headH: HEAD_H,
    lifelineBottom: height - PAD,
    lanes,
    messages,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/components/figures/sequence-layout.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/components/figures/sequence-layout.ts site/src/components/figures/sequence-layout.test.ts
git commit -m "feat(figures): add sequence-layout geometry"
```

---

## Task 4: tree-layout.ts — TreeDiagram geometry

**Files:**
- Create: `site/src/components/figures/tree-layout.ts`
- Test: `site/src/components/figures/tree-layout.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/components/figures/tree-layout.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { layoutTree } from "./tree-layout";

describe("layoutTree", () => {
  test("single node: 1 node, 0 edges", () => {
    const g = layoutTree({ label: "root" });
    expect(g.nodes).toHaveLength(1);
    expect(g.edges).toHaveLength(0);
  });

  test("node count equals total nodes; edges = nodes - 1", () => {
    const g = layoutTree({
      label: "50",
      children: [
        { label: "30", children: [{ label: "20" }, { label: "40" }] },
        { label: "70" },
      ],
    });
    expect(g.nodes).toHaveLength(5);
    expect(g.edges).toHaveLength(4);
  });

  test("y increases with depth", () => {
    const g = layoutTree({ label: "r", children: [{ label: "c", children: [{ label: "g" }] }] });
    const byLabel = (l: string) => g.nodes.find((n) => n.label === l)!;
    expect(byLabel("r").y).toBeLessThan(byLabel("c").y);
    expect(byLabel("c").y).toBeLessThan(byLabel("g").y);
  });

  test("leaves are ordered left to right by x", () => {
    const g = layoutTree({ label: "r", children: [{ label: "L" }, { label: "R" }] });
    const byLabel = (l: string) => g.nodes.find((n) => n.label === l)!;
    expect(byLabel("L").x).toBeLessThan(byLabel("R").x);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- src/components/figures/tree-layout.test.ts`
Expected: FAIL — cannot resolve `./tree-layout`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/components/figures/tree-layout.ts`:

```ts
import type { FigColor } from "./palette";

export interface TreeNodeInput {
  label: string;
  color?: FigColor;
  children?: TreeNodeInput[];
}

export interface TreeLaidNode { x: number; y: number; label: string; color: FigColor; }
export interface TreeEdge { x1: number; y1: number; x2: number; y2: number; }
export interface TreeGeometry {
  width: number; height: number;
  nodes: TreeLaidNode[]; edges: TreeEdge[];
}

const X_GAP = 70;
const Y_GAP = 64;
const PAD = 24;

export function layoutTree(root: TreeNodeInput): TreeGeometry {
  const nodes: TreeLaidNode[] = [];
  const edges: TreeEdge[] = [];
  let leaf = 0;

  // Returns the laid-out x for the subtree root.
  function place(node: TreeNodeInput, depth: number): number {
    const y = PAD + depth * Y_GAP;
    let x: number;
    if (node.children && node.children.length) {
      const childXs = node.children.map((c) => place(c, depth + 1));
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
      for (const cx of childXs) {
        edges.push({ x1: x, y1: y, x2: cx, y2: PAD + (depth + 1) * Y_GAP });
      }
    } else {
      x = PAD + leaf * X_GAP;
      leaf++;
    }
    nodes.push({ x, y, label: node.label, color: node.color ?? "neutral" });
    return x;
  }

  place(root, 0);

  const maxX = Math.max(...nodes.map((n) => n.x));
  const maxY = Math.max(...nodes.map((n) => n.y));
  return { width: maxX + PAD, height: maxY + PAD, nodes, edges };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- src/components/figures/tree-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add site/src/components/figures/tree-layout.ts site/src/components/figures/tree-layout.test.ts
git commit -m "feat(figures): add tree-layout geometry"
```

---

## Task 5: figures.css — shared opt-in motion

**Files:**
- Create: `site/src/components/figures/figures.css`

No test (CSS only). Verified by the build in later tasks.

- [ ] **Step 1: Create the stylesheet**

Create `site/src/components/figures/figures.css`:

```css
/* Opt-in reveal for figures. Apply class "fig-reveal" on the <figure> root.
   No motion unless the user allows it; zero JS. */
@media (prefers-reduced-motion: no-preference) {
  .fig-reveal {
    animation: fig-fade-in 0.45s ease both;
  }
  @keyframes fig-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/figures/figures.css
git commit -m "feat(figures): add shared opt-in motion stylesheet"
```

---

## Task 6: FlowDiagram.astro

**Files:**
- Create: `site/src/components/figures/FlowDiagram.astro`

No unit test (`.astro` render is not unit-tested in this repo). Verified by Task 14 build + browser.

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/FlowDiagram.astro`:

```astro
---
import "./figures.css";
import { resolve, type FigColor } from "./palette";
import { layoutFlow, type FlowNode, type FlowEdge } from "./flow-layout";

interface Props {
  title: string;
  direction?: "row" | "col";
  nodes: FlowNode[];
  edges?: FlowEdge[];
  reveal?: boolean;
}
const { title, direction = "row", nodes, edges, reveal = false } = Astro.props;
const g = layoutFlow(nodes, edges, direction);
const uid = "fa-" + Math.random().toString(36).slice(2, 8);
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6", reveal && "fig-reveal"]}
>
  <svg viewBox={`0 0 ${g.width} ${g.height}`} width="100%" style="max-width:100%">
    <defs>
      <marker id={uid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
      </marker>
    </defs>
    {g.arrows.map((a) => (
      <>
        <line
          x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke="var(--ink)" stroke-width="2"
          stroke-dasharray={a.dashed ? "5 3" : undefined}
          marker-end={`url(#${uid})`}
        />
        {a.label && (
          <text
            x={(a.x1 + a.x2) / 2} y={(a.y1 + a.y2) / 2 - 6}
            text-anchor="middle" font-family="ui-monospace,monospace"
            font-size="10" fill="var(--muted)"
          >{a.label}</text>
        )}
      </>
    ))}
    {g.rects.map((r) => {
      const p = resolve(r.color);
      return (
        <>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8" fill={p.fill} stroke={p.stroke} stroke-width="2" />
          <text x={r.cx} y={r.cy + 4} text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" fill="var(--ink)">{r.label}</text>
        </>
      );
    })}
  </svg>
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `FlowDiagram.astro` (read the printed summary; ignore pre-existing unrelated warnings).

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/FlowDiagram.astro
git commit -m "feat(figures): add FlowDiagram component"
```

---

## Task 7: SequenceDiagram.astro

**Files:**
- Create: `site/src/components/figures/SequenceDiagram.astro`

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/SequenceDiagram.astro`:

```astro
---
import "./figures.css";
import { resolve, type FigColor } from "./palette";
import { layoutSequence, type SeqActor, type SeqStep } from "./sequence-layout";

interface Props {
  title: string;
  actors: SeqActor[];
  steps: SeqStep[];
  reveal?: boolean;
}
const { title, actors, steps, reveal = false } = Astro.props;
const g = layoutSequence(actors, steps);
const uid = "sa-" + Math.random().toString(36).slice(2, 8);
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6", reveal && "fig-reveal"]}
>
  <svg viewBox={`0 0 ${g.width} ${g.height}`} width="100%" style="max-width:100%">
    <defs>
      <marker id={uid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
      </marker>
    </defs>
    {g.lanes.map((l) => {
      const p = resolve(l.color);
      return (
        <>
          <rect x={l.x - 46} y="2" width="92" height={g.headH} rx="5" fill={p.fill} stroke={p.stroke} stroke-width="2" />
          <text x={l.x} y={g.headH / 2 + 5} text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" fill="var(--ink)">{l.label}</text>
          <line x1={l.x} y1={g.headH + 2} x2={l.x} y2={g.lifelineBottom} stroke="var(--rule)" stroke-width="1.5" stroke-dasharray="3 3" />
        </>
      );
    })}
    {g.messages.map((m) => {
      const stroke = m.color === "neutral" ? "var(--ink)" : resolve(m.color).stroke;
      return (
        <>
          <line
            x1={m.x1} y1={m.y} x2={m.x2} y2={m.y}
            stroke={stroke} stroke-width="2"
            stroke-dasharray={m.dashed ? "5 3" : undefined}
            marker-end={`url(#${uid})`}
          />
          <text x={(m.x1 + m.x2) / 2} y={m.y - 6} text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="var(--muted)">{m.label}</text>
        </>
      );
    })}
  </svg>
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `SequenceDiagram.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/SequenceDiagram.astro
git commit -m "feat(figures): add SequenceDiagram component"
```

---

## Task 8: TreeDiagram.astro

**Files:**
- Create: `site/src/components/figures/TreeDiagram.astro`

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/TreeDiagram.astro`:

```astro
---
import "./figures.css";
import { resolve } from "./palette";
import { layoutTree, type TreeNodeInput } from "./tree-layout";

interface Props {
  title: string;
  root: TreeNodeInput;
  reveal?: boolean;
}
const { title, root, reveal = false } = Astro.props;
const g = layoutTree(root);
const R = 16;
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6", reveal && "fig-reveal"]}
>
  <svg viewBox={`0 0 ${g.width} ${g.height}`} width="100%" style="max-width:100%">
    {g.edges.map((e) => (
      <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--ink)" stroke-width="1.6" />
    ))}
    {g.nodes.map((n) => {
      const p = resolve(n.color);
      return (
        <>
          <circle cx={n.x} cy={n.y} r={R} fill={p.fill} stroke={p.stroke} stroke-width="2" />
          <text x={n.x} y={n.y + 4} text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" fill="var(--ink)">{n.label}</text>
        </>
      );
    })}
  </svg>
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `TreeDiagram.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/TreeDiagram.astro
git commit -m "feat(figures): add TreeDiagram component"
```

---

## Task 9: TopologyDiagram.astro

**Files:**
- Create: `site/src/components/figures/TopologyDiagram.astro`

Grid placement math is simple and lives inline (no separate helper, per spec). No unit test.

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/TopologyDiagram.astro`:

```astro
---
import "./figures.css";
import { resolve, type FigColor } from "./palette";

interface TopoNode { id: string; label: string; color?: FigColor; row: number; col: number; }
interface TopoEdge { from: string; to: string; label?: string; dashed?: boolean; dir?: boolean; }
interface Props {
  title: string;
  nodes: TopoNode[];
  edges: TopoEdge[];
  reveal?: boolean;
}
const { title, nodes, edges, reveal = false } = Astro.props;

const CELL_W = 116;
const CELL_H = 72;
const NODE_W = 88;
const NODE_H = 32;
const PAD = 10;

const maxRow = Math.max(...nodes.map((n) => n.row));
const maxCol = Math.max(...nodes.map((n) => n.col));

const placed = nodes.map((n) => {
  const cx = PAD + n.col * CELL_W + CELL_W / 2;
  const cy = PAD + n.row * CELL_H + CELL_H / 2;
  return { ...n, cx, cy, x: cx - NODE_W / 2, y: cy - NODE_H / 2 };
});
const byId = (id: string) => placed.find((p) => p.id === id)!;

const width = PAD * 2 + (maxCol + 1) * CELL_W;
const height = PAD * 2 + (maxRow + 1) * CELL_H;
const uid = "ta-" + Math.random().toString(36).slice(2, 8);
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6", reveal && "fig-reveal"]}
>
  <svg viewBox={`0 0 ${width} ${height}`} width="100%" style="max-width:100%">
    <defs>
      <marker id={uid} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
      </marker>
    </defs>
    {edges.map((e) => {
      const a = byId(e.from);
      const b = byId(e.to);
      return (
        <>
          <line
            x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
            stroke="var(--ink)" stroke-width="1.8"
            stroke-dasharray={e.dashed ? "5 3" : undefined}
            marker-end={e.dir ? `url(#${uid})` : undefined}
          />
          {e.label && (
            <text x={(a.cx + b.cx) / 2} y={(a.cy + b.cy) / 2 - 5} text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" fill="var(--muted)">{e.label}</text>
          )}
        </>
      );
    })}
    {placed.map((n) => {
      const p = resolve(n.color ?? "neutral");
      return (
        <>
          <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx="7" fill={p.fill} stroke={p.stroke} stroke-width="2" />
          <text x={n.cx} y={n.cy + 4} text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" fill="var(--ink)">{n.label}</text>
        </>
      );
    })}
  </svg>
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `TopologyDiagram.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/TopologyDiagram.astro
git commit -m "feat(figures): add TopologyDiagram component"
```

---

## Task 10: LayerStack.astro

**Files:**
- Create: `site/src/components/figures/LayerStack.astro`

div + Tailwind for layout; color via inline style from `resolve()`. `numbered` counts up from the bottom (bottom layer = 1), but layers are printed top-first.

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/LayerStack.astro`:

```astro
---
import "./figures.css";
import { resolve, type FigColor } from "./palette";

interface Layer { label: string; sub?: string; color?: FigColor; }
interface Props {
  title: string;
  layers: Layer[];
  numbered?: boolean;
  reveal?: boolean;
}
const { title, layers, numbered = false, reveal = false } = Astro.props;
const n = layers.length;
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6 flex flex-col gap-1.5", reveal && "fig-reveal"]}
>
  {layers.map((l, i) => {
    const p = resolve(l.color ?? "neutral");
    const num = n - i; // top printed first; numbering counts up from bottom
    return (
      <div
        class="flex items-baseline gap-3 rounded-lg px-4 py-2.5 border-2"
        style={`background:${p.fill};border-color:${p.stroke}`}
      >
        {numbered && <span class="font-mono text-[12px] text-[var(--muted)]">{num}</span>}
        <span class="font-medium text-[14px] text-[var(--ink)]">{l.label}</span>
        {l.sub && <span class="ml-auto font-mono text-[12px] text-[var(--muted)]">{l.sub}</span>}
      </div>
    );
  })}
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `LayerStack.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/LayerStack.astro
git commit -m "feat(figures): add LayerStack component"
```

---

## Task 11: ComparePanels.astro

**Files:**
- Create: `site/src/components/figures/ComparePanels.astro`

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/ComparePanels.astro`:

```astro
---
import "./figures.css";
import { resolve, type FigColor } from "./palette";

interface PanelSide { title: string; items?: string[]; body?: string; }
interface Props {
  title: string;
  left: PanelSide;
  right: PanelSide;
  leftTone?: FigColor;
  rightTone?: FigColor;
  reveal?: boolean;
}
const { title, left, right, leftTone = "danger", rightTone = "ok", reveal = false } = Astro.props;
const sides = [
  { side: left, paint: resolve(leftTone) },
  { side: right, paint: resolve(rightTone) },
];
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6 grid grid-cols-1 sm:grid-cols-2 gap-3", reveal && "fig-reveal"]}
>
  {sides.map(({ side, paint }) => (
    <div class="rounded-xl px-4 py-3 border-2" style={`background:${paint.fill};border-color:${paint.stroke}`}>
      <h4 class="m-0 mb-2 text-[13px] font-semibold" style={`color:${paint.stroke}`}>{side.title}</h4>
      {side.body && <p class="m-0 text-[12px] leading-relaxed text-[var(--ink-2)]">{side.body}</p>}
      {side.items && (
        <ul class="m-0 pl-4 list-disc">
          {side.items.map((it) => <li class="text-[12px] leading-relaxed text-[var(--ink-2)]">{it}</li>)}
        </ul>
      )}
    </div>
  ))}
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `ComparePanels.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/ComparePanels.astro
git commit -m "feat(figures): add ComparePanels component"
```

---

## Task 12: DataCells.astro

**Files:**
- Create: `site/src/components/figures/DataCells.astro`

Generalizes `algo/StructureFigure.astro` to the theme-token palette. `cells` accept a plain string or `{value, mark?, addr?}`; unmarked → neutral.

- [ ] **Step 1: Create the component**

Create `site/src/components/figures/DataCells.astro`:

```astro
---
import "./figures.css";
import { resolve, type FigColor } from "./palette";

type Cell = string | { value: string; mark?: FigColor; addr?: string };
interface Props {
  title: string;
  cells: Cell[];
  indices?: boolean;
  caption?: string;
  reveal?: boolean;
}
const { title, cells, indices = false, caption, reveal = false } = Astro.props;
const norm = cells.map((c) => (typeof c === "string" ? { value: c } : c));
---
<figure
  data-lesson-visual
  role="img"
  aria-label={title}
  class:list={["my-6", reveal && "fig-reveal"]}
>
  <div class="flex gap-1.5 justify-center flex-wrap">
    {norm.map((c, i) => {
      const p = resolve(c.mark ?? "neutral");
      const bg = c.mark ? p.fill : "var(--card)";
      const bd = c.mark ? p.stroke : "var(--rule-strong)";
      return (
        <div class="flex flex-col items-center gap-1">
          {c.addr && <span class="font-mono text-[10px] text-[var(--muted-2)]">{c.addr}</span>}
          <div class="w-12 h-12 grid place-items-center rounded-lg border-2 font-mono text-[14px] text-[var(--ink)]" style={`background:${bg};border-color:${bd}`}>
            {c.value}
          </div>
          {indices && <span class="font-mono text-[10px] text-[var(--muted)]">{i}</span>}
        </div>
      );
    })}
  </div>
  {caption && <figcaption class="mt-2 text-center text-[12px] text-[var(--muted)]">{caption}</figcaption>}
</figure>
```

- [ ] **Step 2: Type-check**

Run: `bun run check`
Expected: no new errors referencing `DataCells.astro`.

- [ ] **Step 3: Commit**

```bash
git add site/src/components/figures/DataCells.astro
git commit -m "feat(figures): add DataCells component"
```

---

## Task 13: Re-activate the lesson visual lint (path-bug fix) — CHECKPOINT TASK

**Files:**
- Modify: `site/src/lint/rules/lessons.ts:27-33` (`lessonInfoFromPath`)
- Modify: `site/src/lint/rules/lessons.ts:86` (forward-link regex — unit-scoped href shape)
- Modify: `site/src/lint/rules/lessons.test.ts` (path constants → 7-segment; add regression test)

**Why this is a checkpoint:** `lessonInfoFromPath` currently returns `null` for every real lesson (it expects a 6-segment `dist/<lang>/learn/<track>/<lesson>/index.html`, but the route is unit-scoped → 7 segments). So the lesson visual + section-order + practice rules are dead in production. Re-activating them runs every lesson rule against ~599 real lessons that have never been linted. This may surface a large backlog. The task ends with a build and an explicit decision gate.

- [ ] **Step 1: Update the test path constants (failing first)**

In `site/src/lint/rules/lessons.test.ts`, change the four path constants to the real unit-scoped 7-segment shape:

```ts
const LESSON_PATH = "dist/en/learn/math/01-numbers/01-counting/index.html";
```
```ts
const ALGO_PATH = "dist/en/learn/algorithms/01-thinking-complexity/01-what-is-an-algorithm/index.html";
```
```ts
const BASECS_PATH = "dist/en/learn/base-cs/01-foundations/01-bits-and-binary/index.html";
```
```ts
const TOPIC_PATH = "dist/en/learn/networking/01-fundamentals/01-networking/index.html";
```

- [ ] **Step 2: Add the regression test**

Append to `site/src/lint/rules/lessons.test.ts` (the function is not exported; assert behavior through `checkLessonRules`, which returns `[]` when the path is not recognized as a lesson):

```ts
describe("lessonInfoFromPath via checkLessonRules — path shape", () => {
  const complete = skeleton(); // a valid math lesson body

  test("7-segment unit-scoped path is recognized (rules run)", () => {
    // a complete lesson at a 7-seg path yields no errors (recognized + valid)
    expect(checkLessonRules(complete, "dist/en/learn/math/01-numbers/01-counting/index.html")).toEqual([]);
    // and an incomplete one DOES error (proves the rules actually ran)
    expect(
      checkLessonRules(skeleton({ recap: false }), "dist/en/learn/math/01-numbers/01-counting/index.html")
        .some((e) => /recap/.test(e)),
    ).toBe(true);
  });

  test("stale 6-segment path is no longer treated as a lesson", () => {
    expect(checkLessonRules(skeleton({ recap: false }), "dist/en/learn/math/01-counting/index.html")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun run test -- src/lint/rules/lessons.test.ts`
Expected: FAIL — the 7-segment paths are not recognized yet (`lessonInfoFromPath` still wants 6 segments), so the many "flags missing X" tests now get `[]` and assertions fail.

- [ ] **Step 4: Fix `lessonInfoFromPath`**

In `site/src/lint/rules/lessons.ts`, replace the function body (lines 27-33):

```ts
/** Built lesson page: dist/<lang>/learn/<track>/<unit>/<lesson>/index.html — else null. */
function lessonInfoFromPath(file: string): { slug: string; track: string } | null {
  const seg = file.split(/[\\/]/).filter(Boolean);
  if (seg.length === 7 && seg[0] === "dist" && seg[2] === "learn" && seg[6].startsWith("index.")) {
    return { track: seg[3], slug: seg[5] };
  }
  return null;
}
```

- [ ] **Step 5: Fix the forward-link regex for unit-scoped hrefs**

The forward-link check (line 86) parses hrefs as `/learn/<track>/<lesson>/`, but real lesson hrefs are `/learn/<track>/<unit>/<lesson>/`. Update the regex so the lesson slug (not the unit) is captured. Replace line 86:

```ts
  const linkRe = /href="\/(?:en|ru)\/learn\/([a-z-]+)\/\d{2}-[a-z0-9-]+\/(\d{2}-[a-z0-9-]+)\/?"/g;
```

This keeps `m[1]` = track and `m[2]` = the lesson slug (the final segment). The existing forward-link test (`<a href="/en/learn/math/99-future-lesson/">`) uses the OLD 2-segment href shape and would no longer match. Update that test's href to the unit-scoped shape so it still exercises the rule:

In the `"flags a forward link to a higher-ordered lesson family"` test, change the href:

```ts
    const html = skeleton() + `<a href="/en/learn/math/09-future-unit/99-future-lesson/">x</a>`;
```

And in the algorithms `"a cross-track link to a math lesson is not a forward link"` test, change the href:

```ts
    const html = algoSkeleton() + `<a href="/en/learn/math/08-growth/02-logarithms/">x</a>`;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test -- src/lint/rules/lessons.test.ts`
Expected: PASS (all describe blocks, including the two new path-shape tests).

- [ ] **Step 7: Run the full test suite**

Run: `bun run test`
Expected: PASS. No regression in other suites.

- [ ] **Step 8: CHECKPOINT — build and catalog reactivated lint**

Run: `bun run build`
Then read `site/dist/lint-report.json`.

Decision gate:
- **If `errors` is empty:** proceed to Step 9.
- **If `errors` contains only the 4 reference lessons from Task 14** (not yet authored at this point — unlikely, since they currently fake visuals with existing widgets) **or a handful (≤ ~10) of trivially-fixable cases:** fix them inline within this task, re-build, confirm `errors:[]`.
- **If `errors` is widespread (dozens of real lessons across tracks):** STOP. Do not re-disable the rule and do not mass-edit lessons here (out of scope per spec). Write the catalogued error list to the task notes and report back to the user: the reactivation revealed a lesson-compliance backlog that is its own work item (P6-style), separate from the diagrams feature. Ask whether to (a) land the diagrams components now and track the backlog separately, or (b) hold the lint fix on a branch. The figure components, palette, and helpers (Tasks 1–12) do not depend on this gate being on.

- [ ] **Step 9: Commit**

```bash
git add site/src/lint/rules/lessons.ts site/src/lint/rules/lessons.test.ts
git commit -m "fix(lint): recognize unit-scoped lesson routes so visual rules fire"
```

---

## Task 14: Reference lessons — one figure per render strategy

**Files (each lesson = EN + RU `index.mdx`):**
- Modify: `site/src/content/lessons/{en,ru}/networking/03-tcp-handshake/01-the-three-way-handshake/index.mdx` (SequenceDiagram)
- Modify: `site/src/content/lessons/{en,ru}/algorithms/07-trees/05-binary-search-trees/index.mdx` (TreeDiagram)
- Modify: `site/src/content/lessons/{en,ru}/networking/12-putting-it-together/01-the-twelve-layers/index.mdx` (LayerStack)
- Modify: `site/src/content/lessons/{en,ru}/algorithms/03-sorting-search/05-binary-search/index.mdx` (DataCells)

For each lesson: add the import to the frontmatter import block (use the `~/` alias), then insert the figure in the lesson's visual slot (in algorithms lessons that is inside/after the `trace` section; in math/topic lessons after the `step`/explanation, before the worked example). Keep author-written content; only add the figure.

- [ ] **Step 1: SequenceDiagram into the TCP three-way-handshake lesson (EN)**

In `site/src/content/lessons/en/networking/03-tcp-handshake/01-the-three-way-handshake/index.mdx`, add to the import block:

```mdx
import SequenceDiagram from "~/components/figures/SequenceDiagram.astro";
```

Insert in the lesson body where the handshake is first explained:

```mdx
<SequenceDiagram
  title="TCP three-way handshake"
  actors={[
    { id: "c", label: "Client", color: "mint" },
    { id: "s", label: "Server", color: "sky" },
  ]}
  steps={[
    { from: "c", to: "s", label: "SYN seq=x" },
    { from: "s", to: "c", label: "SYN-ACK seq=y ack=x+1", return: true },
    { from: "c", to: "s", label: "ACK ack=y+1" },
  ]}
/>
```

- [ ] **Step 2: SequenceDiagram into the RU twin**

In `site/src/content/lessons/ru/networking/03-tcp-handshake/01-the-three-way-handshake/index.mdx`, add the same import, and insert the figure with Russian labels:

```mdx
<SequenceDiagram
  title="Тройное рукопожатие TCP"
  actors={[
    { id: "c", label: "Клиент", color: "mint" },
    { id: "s", label: "Сервер", color: "sky" },
  ]}
  steps={[
    { from: "c", to: "s", label: "SYN seq=x" },
    { from: "s", to: "c", label: "SYN-ACK seq=y ack=x+1", return: true },
    { from: "c", to: "s", label: "ACK ack=y+1" },
  ]}
/>
```

- [ ] **Step 3: TreeDiagram into the binary-search-trees lesson (EN + RU)**

Add to both `…/algorithms/07-trees/05-binary-search-trees/index.mdx` import blocks:

```mdx
import TreeDiagram from "~/components/figures/TreeDiagram.astro";
```

Insert in the visual slot (EN `title`, then RU twin with `title="Дерево двоичного поиска"`):

```mdx
<TreeDiagram
  title="Binary search tree"
  root={{
    label: "50", color: "lilac",
    children: [
      { label: "30", color: "mint", children: [{ label: "20" }, { label: "40" }] },
      { label: "70", color: "mint", children: [{ label: "60" }, { label: "80" }] },
    ],
  }}
/>
```

- [ ] **Step 4: LayerStack into the twelve-layers lesson (EN + RU)**

Add to both `…/networking/12-putting-it-together/01-the-twelve-layers/index.mdx` import blocks:

```mdx
import LayerStack from "~/components/figures/LayerStack.astro";
```

Insert (EN shown; RU twin uses translated labels and `title="Стек: запрос сверху вниз"`):

```mdx
<LayerStack
  title="Request stack, top to bottom"
  numbered
  layers={[
    { label: "Application", sub: "HTTP / gRPC", color: "peach" },
    { label: "TLS", sub: "encryption", color: "rose" },
    { label: "Transport", sub: "TCP", color: "lilac" },
    { label: "Network", sub: "IP", color: "mint" },
    { label: "Link", sub: "Ethernet / Wi-Fi" },
  ]}
/>
```

- [ ] **Step 5: DataCells into the binary-search lesson (EN + RU)**

Add to both `…/algorithms/03-sorting-search/05-binary-search/index.mdx` import blocks:

```mdx
import DataCells from "~/components/figures/DataCells.astro";
```

Insert (EN shown; RU twin uses `title="Окно двоичного поиска"` and `caption="lo=2, hi=4 — окно поиска"`):

```mdx
<DataCells
  title="Binary search window"
  indices
  caption="lo=2, hi=4 — current search window"
  cells={[
    "1", "3",
    { value: "5", mark: "lilac" },
    "7",
    { value: "9", mark: "mint" },
    "11", "13",
  ]}
/>
```

- [ ] **Step 6: Build and verify lint clean**

Run: `bun run build`
Then read `site/dist/lint-report.json`.
Expected: `{"errors":[],"warnings":[]}` (or warnings unrelated to these 4 lessons). If a reference lesson now errors on section ordering (figure placed in the wrong slot), move the figure to the correct slot per the track's section order (visual after step/idea-code-trace, before worked-example/practice) and re-build.

- [ ] **Step 7: Visual check in the browser**

Run: `bun run dev` and open each lesson in EN and RU:
- `http://localhost:4321/en/learn/networking/03-tcp-handshake/01-the-three-way-handshake/`
- `http://localhost:4321/ru/learn/algorithms/07-trees/05-binary-search-trees/`
- `http://localhost:4321/en/learn/networking/12-putting-it-together/01-the-twelve-layers/`
- `http://localhost:4321/ru/learn/algorithms/03-sorting-search/05-binary-search/`

Verify each figure renders on-brand, and toggle dark mode (settings) to confirm colors flip correctly. Stop the dev server when done.

- [ ] **Step 8: Commit**

```bash
git add site/src/content/lessons/en site/src/content/lessons/ru
git commit -m "content(figures): add reference diagrams to 4 lessons (EN+RU)"
```

---

## Task 15: `/diagram` authoring command

**Files:**
- Create: `.claude/commands/diagram.md`

Mirror the structure of `.claude/commands/infographic.md`. Defines the `/diagram <target> <archetype>` workflow.

- [ ] **Step 1: Create the command definition**

Create `/Users/artemmac/dev/awesome-everything/.claude/commands/diagram.md`:

```markdown
# /diagram <target> <archetype>

Insert one reusable figure into an existing lesson or piece, with bilingual parity.

**Target forms:**
- `lessons/<track>/<unit>/<lesson>`  → edits `site/src/content/lessons/{en,ru}/<track>/<unit>/<lesson>/index.mdx`
- `book/<pillar>/<chapter>/<piece>`   → edits `site/src/content/book/{en,ru}/<pillar>/<piece>/index.mdx`

**Archetypes (one of):** `flow` `sequence` `tree` `topology` `stack` `compare` `cells`
→ components in `site/src/components/figures/` (FlowDiagram, SequenceDiagram, TreeDiagram, TopologyDiagram, LayerStack, ComparePanels, DataCells).

**Rules:**
- Bilingual or refuse: the figure is inserted into BOTH the EN and RU files, with translated labels (use `site/src/i18n/glossary.json` for terms).
- Color via `FigColor` only (`lilac mint peach sky rose neutral ok warn danger`) — never hex.
- Figures are zero-hydration; they never count against the 5-island lesson cap.
- Place the figure in the track's visual slot (after explanation/step or idea→code→trace, before worked-example/practice) so section-ordering lint passes.
- Refuse: off-domain target, missing target, or a target that already contains the requested figure.

**Pipeline:**
1. Resolve the target; confirm both language files exist.
2. Pick the archetype (from the argument, else propose from the 7 with a one-line rationale).
3. Read the lesson/piece content; derive the figure data (nodes / steps / cells / layers) from what the prose already describes.
4. Add the `import …` line (via the `~/` alias) and insert the `<Component …/>` into both language files.
5. Build: `cd site && bun run build`, then read `dist/lint-report.json` — require `errors:[]`. (Never trust stdout.)
6. Visual check both languages in a browser; toggle dark mode.
7. Stop. Commit only when the user explicitly asks.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/diagram.md
git commit -m "feat(figures): add /diagram authoring command"
```

---

## Self-Review

**1. Spec coverage:**
- Spec §A file structure → Tasks 1–12, 15 (all files created). ✓
- Spec §B palette / FigColor → Task 1. ✓
- Spec §C component APIs (7) → Tasks 6–12 (props match spec signatures). ✓
- Spec §D lint (no new rules; TS guards color; path-bug fix) → Task 13. ✓
- Spec §E `/diagram` → Task 15. ✓
- Spec §F 4 reference lessons → Task 14. ✓
- Spec Testing (5 test files) → palette (T1), flow (T2), sequence (T3), tree (T4), lessons regression (T13). ✓
- Spec Risk (reactivation backlog) → Task 13 Step 8 checkpoint gate. ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to". Every code step shows complete code. ✓

**3. Type consistency:**
- `FigColor` defined in Task 1, imported by every layout helper (T2–T4) and component (T6–T12). ✓
- `resolve()` returns `{stroke, fill}` — used identically in all components. ✓
- `layoutFlow(nodes, edges, direction)` signature matches FlowDiagram call (T6). ✓
- `layoutSequence(actors, steps)` returns `lanes/messages/headH/lifelineBottom/width/height` — all consumed in SequenceDiagram (T7). ✓
- `layoutTree(root)` returns `nodes/edges/width/height` — consumed in TreeDiagram (T8). ✓
- `lessonInfoFromPath` 7-segment fix consistent with the route confirmed in the spec anchors. ✓

**Note for the executor:** Task 13 is the one task that can balloon. Treat its Step 8 as a hard stop if the reactivated lint reveals a wide backlog — that is expected and is not part of this deliverable.
