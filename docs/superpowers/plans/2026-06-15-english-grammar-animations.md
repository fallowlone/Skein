# English Grammar Animations (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every one of the 122 grammar topics a clean, animated visual via **parametric TypeScript generators** that emit Bodymovin (Lottie) JSON, rendered with **lottie-web** in a `client:visible` island, with a `prefers-reduced-motion` static-poster fallback.

**Architecture:** A small `builder.ts` carries all the Bodymovin detail as scene primitives (axis, node row, two-box, transform, stack, branch, swap, map, highlight). Nine thin archetype generators compose those primitives from a topic's `archetypeParams.labels`. An `archetype-map.ts` registry resolves `GrammarTopic.archetype` (with aliases for the rare singletons) to a generator. `GrammarAnimation.tsx` builds the doc on the client and feeds it to a dynamically-imported lottie-web player. A `verify:anim --gate` build script asserts every topic resolves to a generator that emits valid, slot-filled, deterministic Bodymovin.

**Tech Stack:** TypeScript, Preact (islands), Astro 5, lottie-web (SVG renderer, dynamic import), Vitest, bun.

**Decisions locked (from the P4 bake-off):**
- Authoring = **parametric TS generators** (user chose "A" over LLM/text-to-lottie). The text-to-lottie skill targets Skottie/CanvasKit and its slot/properties-panel feature is inert in lottie-web, so it is not used.
- Renderer = **lottie-web** (SVG), dynamic import, mounted `client:visible`. NOT Skottie/CanvasKit (wasm too heavy for CWV).
- `prefers-reduced-motion` → render a **single held frame** via `goToAndStop(lastFrame, true)` (no separate poster asset).
- **9 generators** cover all 122 topics; the 4 rare singleton archetypes are **aliased** in `archetype-map.ts` (no topic-data churn): `comparison → contrast-pair`, `fill-gap → slot-fill`, `cycle → transformation`, `tree → scale`.
- Keystones (bespoke marquee Lotties) are **out of scope for P4** (YAGNI; revisit in a later pass if a concept is undersold).
- UI mounting into Grammar Atlas / Topic pages is **P5**, not P4. P4 ends with: generators + player component + green gate, plus an optional throwaway demo route used only for visual verification.

**Archetype usage (data is source of truth):** `slot-fill`(27), `contrast-pair`(22), `timeline`(17), `transformation`(15), `scale`(12), `branch`(10), `swap`(9), `map`(4), `highlight`(2); singletons `tree`/`fill-gap`/`cycle`/`comparison`(1 each).

**`archetypeParams` shape:** every topic has `labels: string[]`; 18 topics also carry `items: string[]`. Generators read `labels` (and `items` where present); they must degrade gracefully for any `n = labels.length` (including 1).

---

## File Structure

```
site/
  package.json                                    + "lottie-web" dep, + "verify:anim" script
  src/english/animations/
    lottie-types.ts        LottieDoc + layer/keyframe TS types (loose but useful)
    tokens.ts              composition constants + color palette (0–1 RGBA)
    builder.ts             scene primitives → layer[]; doc() wrapper; font block
    builder.test.ts
    archetypes/
      timeline.ts          buildTimeline({labels})        (ported from the bake-off)
      slot-fill.ts         buildSlotFill({labels})
      contrast-pair.ts     buildContrastPair({labels})
      transformation.ts    buildTransformation({labels})
      scale.ts             buildScale({labels})
      branch.ts            buildBranch({labels})
      swap.ts              buildSwap({labels})
      map.ts               buildMap({labels, items})
      highlight.ts         buildHighlight({labels})
      archetypes.test.ts   one parametrized suite over all 9 generators
    archetype-map.ts       registry + aliases + resolveAnimation(topic)
    archetype-map.test.ts
    index.ts               public exports
  src/components/english/
    GrammarAnimation.tsx   lottie-web player island (dynamic import, reduced-motion poster)
    GrammarAnimation.test.tsx
  scripts/grammar-anim/
    verify-anim.ts         build gate: every topic → valid, slot-filled, deterministic doc
```

**Why these boundaries:** `builder.ts` owns every Bodymovin construction detail so the 9 generators stay declarative (~10–30 lines each) — change motion language once, all topics update. `archetype-map.ts` is the single resolution point (alias logic lives here, not in topic data). `GrammarAnimation.tsx` is the only file that touches lottie-web. `verify-anim.ts` mirrors the existing `audit-grammar.ts` discipline: **never import the corpus barrel** (`import.meta.glob` throws under bun) — readdir + dynamic-import topic modules instead.

---

## Conventions every task follows

- Test runner is **`bun run test`** (= `vitest run`), NOT `bun test`. Run a single file with `bun run test <path>`.
- Colors are **0–1 RGBA** arrays. Positions/sizes are within the composition `w`×`h`.
- Every shape primitive/fill is wrapped in a `ty:"gr"` group whose `it[]` ends with a `tr` transform (portable across renderers).
- Keyframe `s` values are **arrays** (even scalars: `[100]`).
- Generators are **pure + deterministic**: same params → deep-equal output. No `Date.now()`/`Math.random()`.
- Commit after each task with `git add <files> && git commit -m "<msg>"` (NO Co-Authored-By trailer). Branch is `feat/english-grammar-system` (already checked out; do NOT push).

---

### Task 1: Lottie types + tokens + builder primitives

**Files:**
- Create: `site/src/english/animations/lottie-types.ts`
- Create: `site/src/english/animations/tokens.ts`
- Create: `site/src/english/animations/builder.ts`
- Test: `site/src/english/animations/builder.test.ts`
- Modify: `site/package.json` (add `lottie-web` dependency)

- [ ] **Step 1: Add the lottie-web dependency**

Run (in `site/`):
```bash
bun add lottie-web@^5.12.2
```
Expected: `package.json` gains `"lottie-web": "^5.12.2"` under `dependencies`; lockfile updates.

- [ ] **Step 2: Write the failing builder test**

Create `site/src/english/animations/builder.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { doc, axisScene, nodeRowScene, twoBoxScene } from "./builder";
import { COMP } from "./tokens";
import type { LottieDoc } from "./lottie-types";

function isValidDoc(d: LottieDoc): boolean {
  return (
    d.v === "5.7.0" && d.fr > 0 && d.op > d.ip && d.w > 0 && d.h > 0 &&
    Array.isArray(d.layers) && d.layers.length > 0 &&
    d.layers.every((l) => l.op > l.ip) &&
    // JSON round-trips (no undefined / cycles)
    JSON.parse(JSON.stringify(d)) != null
  );
}

describe("builder", () => {
  it("doc() wraps layers into a valid composition", () => {
    const d = doc(axisScene(["a", "b", "c"]));
    expect(isValidDoc(d)).toBe(true);
    expect(d.w).toBe(COMP.W);
    expect(d.h).toBe(COMP.H);
  });

  it("every scene renders its labels as text layers", () => {
    const labels = ["before", "when", "while"];
    const d = doc(axisScene(labels));
    const texts = d.layers.filter((l) => l.ty === 5).map((l) => l.t!.d.k[0].s.t);
    for (const lbl of labels) expect(texts).toContain(lbl);
  });

  it("no text layer is empty", () => {
    const d = doc(nodeRowScene(["x", "y"], { mode: "stack" }));
    const empties = d.layers.filter((l) => l.ty === 5 && !l.t!.d.k[0].s.t.trim());
    expect(empties.length).toBe(0);
  });

  it("twoBoxScene places exactly two labelled boxes", () => {
    const d = doc(twoBoxScene("PAST", "PERFECT"));
    const texts = d.layers.filter((l) => l.ty === 5).map((l) => l.t!.d.k[0].s.t);
    expect(texts).toEqual(expect.arrayContaining(["PAST", "PERFECT"]));
  });

  it("is deterministic", () => {
    expect(doc(axisScene(["a", "b"]))).toEqual(doc(axisScene(["a", "b"])));
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun run test src/english/animations/builder.test.ts`
Expected: FAIL — `Cannot find module './builder'` (and `./tokens`, `./lottie-types`).

- [ ] **Step 4: Write `lottie-types.ts`**

```ts
// Loose-but-useful TS surface for the Bodymovin docs our generators emit.
// Not exhaustive — only what the builder/player/gate touch.
export type Vec = number[];
export type Scalar = number;

export type Prop<T = Vec | Scalar> =
  | { a: 0; k: T }
  | { a: 1; k: Array<{ t: number; s: number[]; i?: { x: number[] | number; y: number[] | number }; o?: { x: number[] | number; y: number[] | number } }> };

export type ShapeItem = Record<string, unknown> & { ty: string };

export type TextDoc = { s: number; f: string; t: string; j: number; tr: number; lh: number; ls: number; fc: number[] };

export type Layer = {
  ty: 0 | 1 | 2 | 4 | 5;
  nm?: string;
  ip: number;
  op: number;
  st: number;
  ks: {
    o: Prop; p: Prop; a: Prop; s: Prop; r: Prop;
  };
  shapes?: ShapeItem[];
  t?: { d: { k: Array<{ t: number; s: TextDoc }> }; p: Record<string, unknown>; m: Record<string, unknown>; a: unknown[] };
};

export type LottieDoc = {
  v: "5.7.0";
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  assets: unknown[];
  fonts?: { list: Array<{ fName: string; fFamily: string; fStyle: string; fWeight: string; ascent: number }> };
  layers: Layer[];
};
```

- [ ] **Step 5: Write `tokens.ts`**

```ts
// Composition constants + palette (0–1 RGBA). One place to restyle every archetype.
export const COMP = { W: 800, H: 450, FR: 30, OP: 90 } as const;

export const COLOR = {
  bg: [0.99, 0.99, 1, 1],
  ink: [0.13, 0.16, 0.22, 1],
  muted: [0.55, 0.58, 0.66, 1],
  line: [0.8, 0.82, 0.88, 1],
  accent: [0.36, 0.4, 0.95, 1],
  good: [0.2, 0.7, 0.45, 1],
  warn: [0.9, 0.45, 0.2, 1],
  surface: [0.95, 0.96, 0.99, 1],
} as const;

export const EASE_IN = { x: [0.34], y: [1] };
export const EASE_OUT = { x: [0.4], y: [0] };

export const FONT = {
  list: [{ fName: "sans", fFamily: "Inter, system-ui, Arial, sans-serif", fStyle: "SemiBold", fWeight: "600", ascent: 72 }],
};
```

- [ ] **Step 6: Write `builder.ts`**

```ts
import { COMP, COLOR, EASE_IN, EASE_OUT, FONT } from "./tokens";
import type { Layer, LottieDoc, ShapeItem, Prop } from "./lottie-types";

const { W, H, FR, OP } = COMP;
type RGBA = readonly number[];

export const st = <T>(k: T): { a: 0; k: T } => ({ a: 0, k });
const identityTr = (): ShapeItem => ({ ty: "tr", p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100) });

/** opacity 0→100 + scale pop, starting at frame `at`. */
export function reveal(at: number): { o: Prop; s: Prop } {
  return {
    o: { a: 1, k: [{ t: at, s: [0], i: EASE_IN, o: EASE_OUT }, { t: at + 8, s: [100] }] },
    s: { a: 1, k: [{ t: at, s: [60, 60, 100], i: EASE_IN, o: EASE_OUT }, { t: at + 10, s: [100, 100, 100] }] },
  };
}

const group = (it: ShapeItem[]): ShapeItem => ({ ty: "gr", it: [...it, identityTr()] });
const ellipse = (d: number, c: RGBA, o = 100): ShapeItem[] => [
  { ty: "el", p: st([0, 0]), s: st([d, d]) },
  { ty: "fl", c: st([...c]), o: st(o) },
];
const rect = (w: number, h: number, r: number, c: RGBA, o = 100): ShapeItem[] => [
  { ty: "rc", p: st([0, 0]), s: st([w, h]), r: st(r) },
  { ty: "fl", c: st([...c]), o: st(o) },
];

// ---- base layers -----------------------------------------------------------

export function bgLayer(): Layer {
  return {
    ty: 4, nm: "bg", ip: 0, op: OP, st: 0,
    ks: { o: st(100), p: st([W / 2, H / 2, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    shapes: [group(rect(W, H, 0, COLOR.bg))],
  };
}

export function textLayer(text: string, x: number, y: number, at: number, size = 28, fc: RGBA = COLOR.ink): Layer {
  const { o } = reveal(at);
  return {
    ty: 5, nm: `label:${text}`, ip: 0, op: OP, st: 0,
    ks: { o, p: st([x, y, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    t: { d: { k: [{ t: 0, s: { s: size, f: "sans", t: text, j: 2, tr: 0, lh: size + 6, ls: 0, fc: [fc[0], fc[1], fc[2]] } } ] }, p: {}, m: { g: 1, a: st([0, 0]) }, a: [] },
  };
}

export function dotLayer(x: number, y: number, at: number, d = 20, c: RGBA = COLOR.ink): Layer {
  const { o, s } = reveal(at);
  return {
    ty: 4, nm: "dot", ip: 0, op: OP, st: 0,
    ks: { o, p: st([x, y, 0]), a: st([0, 0, 0]), s, r: st(0) },
    shapes: [group(ellipse(d, c))],
  };
}

export function chipLayer(text: string, x: number, y: number, at: number, w = 130, fill: RGBA = COLOR.surface, fc: RGBA = COLOR.ink): Layer[] {
  const { o, s } = reveal(at);
  const box: Layer = {
    ty: 4, nm: `chip:${text}`, ip: 0, op: OP, st: 0,
    ks: { o, p: st([x, y, 0]), a: st([0, 0, 0]), s, r: st(0) },
    shapes: [group(rect(w, 58, 12, fill))],
  };
  return [textLayer(text, x, y - 9, at + 2, 26, fc), box];
}

// ---- scene primitives (return layers top→bottom; caller appends bg) --------

const spread = (n: number, x0: number, x1: number): number[] =>
  n === 1 ? [(x0 + x1) / 2] : Array.from({ length: n }, (_, i) => x0 + (i * (x1 - x0)) / (n - 1));

/** axis with evenly spaced nodes + labels + a traveling playhead (timeline). */
export function axisScene(labels: string[]): Layer[] {
  const X0 = 90, X1 = 710, Y = 260;
  const xs = spread(labels.length, X0, X1);
  const playhead: Layer = {
    ty: 4, nm: "playhead", ip: 0, op: OP, st: 0,
    ks: {
      o: { a: 1, k: [{ t: 8, s: [0], i: EASE_IN, o: EASE_OUT }, { t: 16, s: [100] }, { t: 78, s: [100], i: EASE_IN, o: EASE_OUT }, { t: 88, s: [0] }] },
      p: { a: 1, k: [{ t: 12, s: [X0, Y, 0], i: EASE_IN, o: EASE_OUT }, { t: 80, s: [X1, Y, 0] }] },
      a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0),
    },
    shapes: [group([...ellipse(34, COLOR.accent, 35), ...ellipse(16, COLOR.accent)])],
  };
  const axis: Layer = {
    ty: 4, nm: "axis", ip: 0, op: OP, st: 0,
    ks: { o: st(100), p: st([X0, Y, 0]), a: st([0, 0, 0]), r: st(0),
          s: { a: 1, k: [{ t: 0, s: [0, 100, 100], i: EASE_IN, o: EASE_OUT }, { t: 16, s: [100, 100, 100] }] } },
    shapes: [{ ty: "gr", it: [{ ty: "rc", p: st([(X1 - X0) / 2, 0]), s: st([X1 - X0, 4]), r: st(2) }, { ty: "fl", c: st([...COLOR.line]), o: st(100) }, identityTr()] }],
  };
  return [
    playhead,
    ...labels.map((t, i) => textLayer(t, xs[i], Y - 42, 14 + i * 7)),
    ...xs.map((x, i) => dotLayer(x, Y, 12 + i * 7)),
    axis,
  ];
}

/** evenly spaced labelled nodes; mode "row" (horizontal) or "stack" (vertical, growing). */
export function nodeRowScene(labels: string[], opts: { mode: "row" | "stack" } = { mode: "row" }): Layer[] {
  if (opts.mode === "stack") {
    const ys = spread(labels.length, 120, 360);
    return labels.flatMap((t, i) => chipLayer(t, W / 2, ys[i], 10 + i * 8, 220));
  }
  const xs = spread(labels.length, 150, 650);
  return labels.flatMap((t, i) => chipLayer(t, xs[i], H / 2, 10 + i * 8));
}

/** two labelled boxes side by side with a divider (contrast). */
export function twoBoxScene(left: string, right: string): Layer[] {
  const divider: Layer = {
    ty: 4, nm: "divider", ip: 0, op: OP, st: 0,
    ks: { o: { a: 1, k: [{ t: 6, s: [0] }, { t: 16, s: [100] }] }, p: st([W / 2, H / 2, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    shapes: [group(rect(3, 200, 1, COLOR.line))],
  };
  return [
    textLayer(left, W / 2 - 180, H / 2, 12, 30, COLOR.accent),
    textLayer(right, W / 2 + 180, H / 2, 20, 30, COLOR.warn),
    {
      ty: 4, nm: "boxL", ip: 0, op: OP, st: 0,
      ks: { ...reveal(8), p: st([W / 2 - 180, H / 2, 0]), a: st([0, 0, 0]), r: st(0) } as Layer["ks"],
      shapes: [group(rect(280, 150, 16, COLOR.surface))],
    },
    {
      ty: 4, nm: "boxR", ip: 0, op: OP, st: 0,
      ks: { ...reveal(16), p: st([W / 2 + 180, H / 2, 0]), a: st([0, 0, 0]), r: st(0) } as Layer["ks"],
      shapes: [group(rect(280, 150, 16, COLOR.surface))],
    },
    divider,
  ];
}

/** source → arrow → result (transformation). */
export function transformScene(from: string, to: string): Layer[] {
  const arrow: Layer = {
    ty: 4, nm: "arrow", ip: 0, op: OP, st: 0,
    ks: { o: st(100), p: st([W / 2 - 80, H / 2, 0]), a: st([0, 0, 0]), r: st(0),
          s: { a: 1, k: [{ t: 18, s: [0, 100, 100], i: EASE_IN, o: EASE_OUT }, { t: 34, s: [100, 100, 100] }] } },
    shapes: [{ ty: "gr", it: [{ ty: "rc", p: st([80, 0]), s: st([160, 8] ), r: st(4) }, { ty: "fl", c: st([...COLOR.accent]), o: st(100) }, identityTr()] }],
  };
  return [
    ...chipLayer(from, W / 2 - 220, H / 2, 10, 200, COLOR.surface, COLOR.ink),
    arrow,
    ...chipLayer(to, W / 2 + 220, H / 2, 36, 200, COLOR.surface, COLOR.accent),
  ];
}

/** root forks into branches (conditionals). labels[0]=root, rest=branches. */
export function branchScene(root: string, branches: string[]): Layer[] {
  const ys = spread(branches.length, 140, 360);
  const connectors: Layer[] = branches.map((_, i) => ({
    ty: 4, nm: `conn:${i}`, ip: 0, op: OP, st: 0,
    ks: { o: { a: 1, k: [{ t: 18 + i * 6, s: [0] }, { t: 28 + i * 6, s: [100] }] }, p: st([330, (H / 2 + ys[i]) / 2, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    shapes: [group(rect(120, 3, 1, COLOR.line))],
  }));
  return [
    ...chipLayer(root, 200, H / 2, 8, 180, COLOR.surface, COLOR.accent),
    ...branches.flatMap((t, i) => chipLayer(t, 560, ys[i], 22 + i * 8, 200)),
    ...connectors,
  ];
}

/** two chips swap positions (word-order inversion). */
export function swapScene(a: string, b: string): Layer[] {
  const xL = W / 2 - 150, xR = W / 2 + 150;
  const mk = (text: string, fromX: number, toX: number): Layer[] => {
    const { o } = reveal(8);
    const box: Layer = {
      ty: 4, nm: `swap:${text}`, ip: 0, op: OP, st: 0,
      ks: { o, a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0),
            p: { a: 1, k: [{ t: 20, s: [fromX, H / 2, 0], i: EASE_IN, o: EASE_OUT }, { t: 50, s: [toX, H / 2, 0], i: EASE_IN, o: EASE_OUT }, { t: 80, s: [fromX, H / 2, 0] }] } },
      shapes: [group(rect(150, 64, 14, COLOR.surface))],
    };
    return [box];
  };
  return [
    textLayer(a, xL, H / 2 - 9, 10, 26, COLOR.accent),
    textLayer(b, xR, H / 2 - 9, 10, 26, COLOR.warn),
    ...mk(a, xL, xR),
    ...mk(b, xR, xL),
  ];
}

/** two-column mapping rows (e.g. pronoun ↔ possessive). pairs from labels/items. */
export function mapScene(pairs: Array<[string, string]>): Layer[] {
  const ys = spread(pairs.length, 110, 360);
  return pairs.flatMap(([l, r], i) => [
    ...chipLayer(l, W / 2 - 150, ys[i], 8 + i * 6, 180, COLOR.surface, COLOR.ink),
    ...chipLayer(r, W / 2 + 150, ys[i], 14 + i * 6, 180, COLOR.surface, COLOR.accent),
    {
      ty: 4, nm: `arrow:${i}`, ip: 0, op: OP, st: 0,
      ks: { o: { a: 1, k: [{ t: 16 + i * 6, s: [0] }, { t: 26 + i * 6, s: [100] }] }, p: st([W / 2, ys[i], 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
      shapes: [group(rect(110, 3, 1, COLOR.line))],
    } as Layer,
  ]);
}

/** a phrase with one token highlighted by a pulsing underline (agreement). */
export function highlightScene(tokens: string[], focusIndex: number): Layer[] {
  const xs = spread(tokens.length, 170, 630);
  const fx = xs[Math.min(focusIndex, xs.length - 1)];
  const pulse: Layer = {
    ty: 4, nm: "pulse", ip: 0, op: OP, st: 0,
    ks: { p: st([fx, H / 2 + 26, 0]), a: st([0, 0, 0]), r: st(0),
          o: { a: 1, k: [{ t: 20, s: [0] }, { t: 30, s: [100] }] },
          s: { a: 1, k: [{ t: 30, s: [100, 100], i: EASE_IN, o: EASE_OUT }, { t: 55, s: [130, 100], i: EASE_IN, o: EASE_OUT }, { t: 80, s: [100, 100] }] } },
    shapes: [group(rect(120, 6, 3, COLOR.accent))],
  };
  return [...tokens.map((t, i) => textLayer(t, xs[i], H / 2, 8 + i * 5, 30, i === focusIndex ? COLOR.accent : COLOR.ink)), pulse];
}

// ---- doc wrapper -----------------------------------------------------------

export function doc(layers: Layer[]): LottieDoc {
  return { v: "5.7.0", fr: FR, ip: 0, op: OP, w: W, h: H, assets: [], fonts: FONT, layers: [...layers, bgLayer()] };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `bun run test src/english/animations/builder.test.ts`
Expected: PASS (5/5).

- [ ] **Step 8: Commit**

```bash
git add site/package.json site/bun.lockb site/src/english/animations/lottie-types.ts site/src/english/animations/tokens.ts site/src/english/animations/builder.ts site/src/english/animations/builder.test.ts
git commit -m "feat(english): lottie animation builder primitives + types + tokens"
```

---

### Task 2: The 9 archetype generators

**Files:**
- Create: `site/src/english/animations/archetypes/timeline.ts`
- Create: `site/src/english/animations/archetypes/slot-fill.ts`
- Create: `site/src/english/animations/archetypes/contrast-pair.ts`
- Create: `site/src/english/animations/archetypes/transformation.ts`
- Create: `site/src/english/animations/archetypes/scale.ts`
- Create: `site/src/english/animations/archetypes/branch.ts`
- Create: `site/src/english/animations/archetypes/swap.ts`
- Create: `site/src/english/animations/archetypes/map.ts`
- Create: `site/src/english/animations/archetypes/highlight.ts`
- Test: `site/src/english/animations/archetypes/archetypes.test.ts`

Each generator has signature `(params: { labels: string[]; items?: string[] }) => LottieDoc`. The canonical alias `AnimParams` is declared in `archetype-map.ts` (Task 3); for this task inline the param type as `{ labels: string[]; items?: string[] }` so the generators are standalone.

- [ ] **Step 1: Write the parametrized failing test**

Create `site/src/english/animations/archetypes/archetypes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildTimeline } from "./timeline";
import { buildSlotFill } from "./slot-fill";
import { buildContrastPair } from "./contrast-pair";
import { buildTransformation } from "./transformation";
import { buildScale } from "./scale";
import { buildBranch } from "./branch";
import { buildSwap } from "./swap";
import { buildMap } from "./map";
import { buildHighlight } from "./highlight";
import type { LottieDoc } from "../lottie-types";

const GENS: Array<[string, (p: { labels: string[]; items?: string[] }) => LottieDoc]> = [
  ["timeline", buildTimeline],
  ["slot-fill", buildSlotFill],
  ["contrast-pair", buildContrastPair],
  ["transformation", buildTransformation],
  ["scale", buildScale],
  ["branch", buildBranch],
  ["swap", buildSwap],
  ["map", buildMap],
  ["highlight", buildHighlight],
];

const LABELS = ["alpha", "bravo", "charlie", "delta"];

function valid(d: LottieDoc): boolean {
  return d.v === "5.7.0" && d.op > d.ip && d.w > 0 && d.h > 0 &&
    d.layers.length > 0 && d.layers.every((l) => l.op > l.ip) &&
    JSON.parse(JSON.stringify(d)) != null;
}

describe("archetype generators", () => {
  for (const [name, gen] of GENS) {
    it(`${name}: emits valid Bodymovin`, () => {
      expect(valid(gen({ labels: LABELS, items: LABELS }))).toBe(true);
    });
    it(`${name}: renders at least one label as text`, () => {
      const d = gen({ labels: LABELS, items: LABELS });
      const texts = d.layers.filter((l) => l.ty === 5).map((l) => l.t!.d.k[0].s.t);
      expect(texts.some((t) => LABELS.includes(t))).toBe(true);
    });
    it(`${name}: no empty text layer`, () => {
      const d = gen({ labels: LABELS, items: LABELS });
      expect(d.layers.filter((l) => l.ty === 5 && !l.t!.d.k[0].s.t.trim()).length).toBe(0);
    });
    it(`${name}: deterministic`, () => {
      expect(gen({ labels: LABELS })).toEqual(gen({ labels: LABELS }));
    });
    it(`${name}: survives n=1 and n=2`, () => {
      expect(valid(gen({ labels: ["solo"] }))).toBe(true);
      expect(valid(gen({ labels: ["a", "b"] }))).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/english/animations/archetypes/archetypes.test.ts`
Expected: FAIL — cannot find `./timeline` (and the other 8 modules).

- [ ] **Step 3: Write the 9 generators**

`timeline.ts`:
```ts
import { doc, axisScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildTimeline(p: { labels: string[]; items?: string[] }): LottieDoc {
  return doc(axisScene(p.labels.length ? p.labels : ["—"]));
}
```

`slot-fill.ts` (word order / sentence building — a horizontal row of slots filling in sequence):
```ts
import { doc, nodeRowScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildSlotFill(p: { labels: string[]; items?: string[] }): LottieDoc {
  return doc(nodeRowScene(p.labels.length ? p.labels : ["—"], { mode: "row" }));
}
```

`contrast-pair.ts` (X vs Y; first two labels):
```ts
import { doc, twoBoxScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildContrastPair(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [a = "X", b = "Y"] = p.labels;
  return doc(twoBoxScene(a, b));
}
```

`transformation.ts` (source → arrow → result):
```ts
import { doc, transformScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildTransformation(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [from = "before", to = "after"] = p.labels;
  return doc(transformScene(from, to));
}
```

`scale.ts` (stacking / building a phrase — vertical growing stack):
```ts
import { doc, nodeRowScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildScale(p: { labels: string[]; items?: string[] }): LottieDoc {
  return doc(nodeRowScene(p.labels.length ? p.labels : ["—"], { mode: "stack" }));
}
```

`branch.ts` (root forks into branches):
```ts
import { doc, branchScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildBranch(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [root = "if", ...rest] = p.labels;
  return doc(branchScene(root, rest.length ? rest : ["then"]));
}
```

`swap.ts` (two tokens swap positions):
```ts
import { doc, swapScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildSwap(p: { labels: string[]; items?: string[] }): LottieDoc {
  const [a = "A", b = "B"] = p.labels;
  return doc(swapScene(a, b));
}
```

`map.ts` (two-column mapping; pair labels with items, or pair adjacent labels):
```ts
import { doc, mapScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildMap(p: { labels: string[]; items?: string[] }): LottieDoc {
  const left = p.labels;
  const right = p.items && p.items.length === left.length ? p.items : left.map((_, i) => left[(i + 1) % left.length]);
  const pairs = left.map((l, i): [string, string] => [l, right[i] ?? l]);
  return doc(mapScene(pairs.length ? pairs : [["—", "—"]]));
}
```

`highlight.ts` (a phrase with one token pulsing — focus the last token by default):
```ts
import { doc, highlightScene } from "../builder";
import type { LottieDoc } from "../lottie-types";
export function buildHighlight(p: { labels: string[]; items?: string[] }): LottieDoc {
  const tokens = p.labels.length ? p.labels : ["—"];
  return doc(highlightScene(tokens, tokens.length - 1));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/english/animations/archetypes/archetypes.test.ts`
Expected: PASS (45 assertions: 9 generators × 5 cases).

- [ ] **Step 5: Commit**

```bash
git add site/src/english/animations/archetypes/
git commit -m "feat(english): 9 parametric lottie archetype generators"
```

---

### Task 3: Archetype map (registry + aliases + resolver)

**Files:**
- Create: `site/src/english/animations/archetype-map.ts`
- Create: `site/src/english/animations/index.ts`
- Test: `site/src/english/animations/archetype-map.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/english/animations/archetype-map.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveAnimation, ARCHETYPE_BUILDERS, ALIASES } from "./archetype-map";
import type { GrammarTopic } from "~/english/grammar-types";

const topic = (archetype: string, params?: GrammarTopic["archetypeParams"]): GrammarTopic =>
  ({ id: "t", archetype, archetypeParams: params } as unknown as GrammarTopic);

describe("archetype-map", () => {
  it("resolves a core archetype to its builder + a valid doc", () => {
    const r = resolveAnimation(topic("timeline", { labels: ["a", "b"] }));
    expect(r).not.toBeNull();
    expect(r!.archetype).toBe("timeline");
    expect(r!.doc().layers.length).toBeGreaterThan(0);
  });

  it("resolves each alias to its canonical builder", () => {
    expect(resolveAnimation(topic("comparison", { labels: ["a", "b"] }))!.archetype).toBe("contrast-pair");
    expect(resolveAnimation(topic("fill-gap", { labels: ["a"] }))!.archetype).toBe("slot-fill");
    expect(resolveAnimation(topic("cycle", { labels: ["a", "b"] }))!.archetype).toBe("transformation");
    expect(resolveAnimation(topic("tree", { labels: ["a"] }))!.archetype).toBe("scale");
  });

  it("defaults missing params to an empty labels array (never throws)", () => {
    const r = resolveAnimation(topic("timeline"));
    expect(r!.doc().layers.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown archetype", () => {
    expect(resolveAnimation(topic("does-not-exist", { labels: ["a"] }))).toBeNull();
  });

  it("every alias target exists in the builder registry", () => {
    for (const target of Object.values(ALIASES)) expect(ARCHETYPE_BUILDERS[target]).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/english/animations/archetype-map.test.ts`
Expected: FAIL — cannot find `./archetype-map`.

- [ ] **Step 3: Write `archetype-map.ts`**

```ts
import type { GrammarTopic } from "~/english/grammar-types";
import type { LottieDoc } from "./lottie-types";
import { buildTimeline } from "./archetypes/timeline";
import { buildSlotFill } from "./archetypes/slot-fill";
import { buildContrastPair } from "./archetypes/contrast-pair";
import { buildTransformation } from "./archetypes/transformation";
import { buildScale } from "./archetypes/scale";
import { buildBranch } from "./archetypes/branch";
import { buildSwap } from "./archetypes/swap";
import { buildMap } from "./archetypes/map";
import { buildHighlight } from "./archetypes/highlight";

export type AnimParams = { labels: string[]; items?: string[] };
export type AnimBuilder = (p: AnimParams) => LottieDoc;

/** The 9 generators we actually build. */
export const ARCHETYPE_BUILDERS: Record<string, AnimBuilder> = {
  "timeline": buildTimeline,
  "slot-fill": buildSlotFill,
  "contrast-pair": buildContrastPair,
  "transformation": buildTransformation,
  "scale": buildScale,
  "branch": buildBranch,
  "swap": buildSwap,
  "map": buildMap,
  "highlight": buildHighlight,
};

/** Rare singleton archetypes folded onto a canonical neighbor (no topic-data churn). */
export const ALIASES: Record<string, string> = {
  "comparison": "contrast-pair",
  "fill-gap": "slot-fill",
  "cycle": "transformation",
  "tree": "scale",
};

function paramsOf(topic: GrammarTopic): AnimParams {
  const raw = topic.archetypeParams ?? {};
  const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return { labels: asArray(raw.labels), items: asArray(raw.items) };
}

export type ResolvedAnimation = { archetype: string; doc: () => LottieDoc };

/** Resolve a topic to its canonical archetype + a thunk that builds the doc. null if unmapped. */
export function resolveAnimation(topic: GrammarTopic): ResolvedAnimation | null {
  const canonical = ALIASES[topic.archetype] ?? topic.archetype;
  const builder = ARCHETYPE_BUILDERS[canonical];
  if (!builder) return null;
  const params = paramsOf(topic);
  return { archetype: canonical, doc: () => builder(params) };
}
```

- [ ] **Step 4: Write `index.ts`**

```ts
export { resolveAnimation, ARCHETYPE_BUILDERS, ALIASES } from "./archetype-map";
export type { AnimParams, AnimBuilder, ResolvedAnimation } from "./archetype-map";
export type { LottieDoc } from "./lottie-types";
```

- [ ] **Step 5: Run to verify it passes**

Run: `bun run test src/english/animations/archetype-map.test.ts`
Expected: PASS (5/5).

- [ ] **Step 6: Commit**

```bash
git add site/src/english/animations/archetype-map.ts site/src/english/animations/index.ts site/src/english/animations/archetype-map.test.ts
git commit -m "feat(english): archetype-map registry + alias resolver"
```

---

### Task 4: `GrammarAnimation.tsx` player island

**Files:**
- Create: `site/src/components/english/GrammarAnimation.tsx`
- Test: `site/src/components/english/GrammarAnimation.test.tsx`

**Behavior contract:**
- Props: `{ doc: LottieDoc; reducedMotion?: boolean; label?: string }` (the caller resolves the doc via `resolveAnimation` and passes the built doc — this keeps the component free of corpus imports and trivially testable).
- On mount (Preact `useEffect`): dynamically `import("lottie-web")`, call `loadAnimation({ container, renderer: "svg", loop: !reduced, autoplay: !reduced, animationData: doc })`.
- If `reducedMotion` (prop OR `window.matchMedia("(prefers-reduced-motion: reduce)").matches`): after `DOMLoaded`, `goToAndStop(doc.op, true)` to hold a static poster frame (no playback).
- On unmount: `anim.destroy()`.
- Container `div` is `role="img"` with an `aria-label` (default "Grammar animation"), `aspect-ratio` from the doc.

- [ ] **Step 1: Write the failing test**

Create `site/src/components/english/GrammarAnimation.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { doc, axisScene } from "~/english/animations/builder";

const loadAnimation = vi.fn();
const destroy = vi.fn();
const goToAndStop = vi.fn();
vi.mock("lottie-web", () => ({
  default: { loadAnimation: (...a: unknown[]) => { loadAnimation(...a); return { destroy, goToAndStop, addEventListener: (_e: string, cb: () => void) => cb() }; } },
}));

import { GrammarAnimation } from "./GrammarAnimation";

beforeEach(() => { loadAnimation.mockClear(); destroy.mockClear(); goToAndStop.mockClear(); });

describe("GrammarAnimation", () => {
  it("loads the animation with the provided doc", async () => {
    render(<GrammarAnimation doc={doc(axisScene(["a", "b"]))} />);
    await vi.waitFor(() => expect(loadAnimation).toHaveBeenCalledTimes(1));
    const opts = loadAnimation.mock.calls[0][0] as { animationData: unknown; renderer: string };
    expect(opts.renderer).toBe("svg");
    expect(opts.animationData).toBeDefined();
  });

  it("holds a static frame when reducedMotion is set", async () => {
    render(<GrammarAnimation doc={doc(axisScene(["a"]))} reducedMotion />);
    await vi.waitFor(() => expect(goToAndStop).toHaveBeenCalled());
    const opts = loadAnimation.mock.calls[0][0] as { autoplay: boolean; loop: boolean };
    expect(opts.autoplay).toBe(false);
    expect(opts.loop).toBe(false);
  });

  it("destroys the animation on unmount", async () => {
    const { unmount } = render(<GrammarAnimation doc={doc(axisScene(["a"]))} />);
    await vi.waitFor(() => expect(loadAnimation).toHaveBeenCalled());
    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test src/components/english/GrammarAnimation.test.tsx`
Expected: FAIL — cannot find `./GrammarAnimation`.

- [ ] **Step 3: Write `GrammarAnimation.tsx`**

```tsx
import { useEffect, useRef } from "preact/hooks";
import type { LottieDoc } from "~/english/animations/lottie-types";

type Props = { doc: LottieDoc; reducedMotion?: boolean; label?: string };

function prefersReduced(forced?: boolean): boolean {
  if (forced) return true;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function GrammarAnimation({ doc, reducedMotion, label = "Grammar animation" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReduced(reducedMotion);
    let anim: { destroy: () => void; goToAndStop: (f: number, isFrame: boolean) => void; addEventListener: (e: string, cb: () => void) => void } | null = null;
    let cancelled = false;

    import("lottie-web").then((mod) => {
      if (cancelled || !ref.current) return;
      anim = mod.default.loadAnimation({
        container: ref.current,
        renderer: "svg",
        loop: !reduced,
        autoplay: !reduced,
        animationData: doc,
      });
      if (reduced && anim) anim.addEventListener("DOMLoaded", () => anim && anim.goToAndStop(doc.op, true));
    });

    return () => { cancelled = true; if (anim) anim.destroy(); };
  }, [doc, reducedMotion]);

  return <div ref={ref} role="img" aria-label={label} style={{ width: "100%", aspectRatio: `${doc.w} / ${doc.h}` }} />;
}

export default GrammarAnimation;
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun run test src/components/english/GrammarAnimation.test.tsx`
Expected: PASS (3/3). If `@testing-library/preact` is not the util the repo uses for island tests, grep an existing `*.test.tsx` under `src/components/english/` and mirror its render import.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/english/GrammarAnimation.tsx site/src/components/english/GrammarAnimation.test.tsx
git commit -m "feat(english): GrammarAnimation lottie-web player island"
```

---

### Task 5: `verify:anim` build gate

**Files:**
- Create: `site/scripts/grammar-anim/verify-anim.ts`
- Modify: `site/package.json` (add `"verify:anim"` script)

**Contract:** Like `audit-grammar.ts`, **do not import the corpus barrel** (`import.meta.glob` throws under bun). Readdir `src/english/data/grammar/*.ts`, dynamic-import each, read `mod.topic`. For every topic: resolve via `resolveAnimation`; assert non-null (no unmapped archetype), build twice + assert deep-equal (determinism), assert structural validity, assert every text layer non-empty. With `--gate`, exit 1 on any failure.

- [ ] **Step 1: Write `verify-anim.ts`**

```ts
// verify:anim — every grammar topic must resolve to an archetype generator that emits
// valid, slot-filled, deterministic Bodymovin. Mirrors audit-grammar.ts: it must NOT import
// the corpus barrel (import.meta.glob throws under bun), so it loads topic modules by
// readdir + dynamic import.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { GrammarTopic } from "~/english/grammar-types";
import type { LottieDoc } from "~/english/animations/lottie-types";
import { resolveAnimation } from "~/english/animations/archetype-map";

const GRAMMAR_DIR = resolve(import.meta.dir, "../../src/english/data/grammar");

type Problem = { id: string; archetype: string; issues: string[] };

function structurallyValid(d: LottieDoc): string[] {
  const issues: string[] = [];
  if (d.v !== "5.7.0") issues.push("bad version");
  if (!(d.op > d.ip)) issues.push("op<=ip");
  if (!(d.w > 0 && d.h > 0)) issues.push("zero size");
  if (!Array.isArray(d.layers) || d.layers.length === 0) issues.push("no layers");
  if (d.layers?.some((l) => !(l.op > l.ip))) issues.push("layer op<=ip");
  const emptyText = d.layers?.filter((l) => l.ty === 5 && !l.t?.d.k[0]?.s.t.trim()).length ?? 0;
  if (emptyText > 0) issues.push(`${emptyText} empty text layer(s)`);
  try { JSON.parse(JSON.stringify(d)); } catch { issues.push("not JSON-serializable"); }
  return issues;
}

async function loadTopics(): Promise<GrammarTopic[]> {
  const files = readdirSync(GRAMMAR_DIR).filter((f) => f.endsWith(".ts") && !f.includes(".test.") && f !== "index.ts" && f !== "families.ts");
  const topics: GrammarTopic[] = [];
  for (const f of files) {
    const mod = await import(join(GRAMMAR_DIR, f));
    if (mod.topic) topics.push(mod.topic as GrammarTopic);
  }
  return topics;
}

async function main() {
  const gate = process.argv.includes("--gate");
  const topics = await loadTopics();
  const problems: Problem[] = [];
  const byArchetype = new Map<string, number>();

  for (const t of topics) {
    const r = resolveAnimation(t);
    if (!r) { problems.push({ id: t.id, archetype: t.archetype, issues: ["unmapped archetype"] }); continue; }
    byArchetype.set(r.archetype, (byArchetype.get(r.archetype) ?? 0) + 1);
    const issues = structurallyValid(r.doc());
    if (JSON.stringify(r.doc()) !== JSON.stringify(r.doc())) issues.push("non-deterministic");
    if (issues.length) problems.push({ id: t.id, archetype: r.archetype, issues });
  }

  console.log(`grammar-anim: ${topics.length} topics`);
  for (const [a, n] of [...byArchetype.entries()].sort((x, y) => y[1] - x[1])) console.log(`  ${a}: ${n}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem topic(s):`);
    for (const p of problems) console.error(`  ${p.id} [${p.archetype}] — ${p.issues.join("; ")}`);
    if (gate) process.exit(1);
  } else {
    console.log("all topics resolve to a valid, deterministic animation ✓");
  }
}

main();
```

> Note: `import.meta.dir` is a bun global used by the existing grammar-gen scripts. If `scripts/grammar-gen/verify-grammar.ts` resolves `GRAMMAR_DIR` differently, mirror that idiom.

- [ ] **Step 2: Add the package.json script**

In `site/package.json` `scripts`, after `"audit:grammar"`, add:
```json
    "verify:anim": "bun scripts/grammar-anim/verify-anim.ts",
```

- [ ] **Step 3: Run the gate**

Run (in `site/`): `bun run verify:anim --gate`
Expected: prints `122 topics`, a per-archetype histogram summing to 122, and `all topics resolve to a valid, deterministic animation ✓`; exit 0.
If a topic prints `unmapped archetype`, the printed `archetype` value is in neither `ARCHETYPE_BUILDERS` nor `ALIASES` — add an alias (preferred) or a generator.

- [ ] **Step 4: Commit**

```bash
git add site/scripts/grammar-anim/verify-anim.ts site/package.json
git commit -m "feat(english): verify:anim build gate — every topic emits valid Bodymovin"
```

---

### Task 6: Temporary visual-verification route (throwaway)

**Files:**
- Create: `site/src/pages/_anim-preview.astro` (underscore prefix → Astro does not emit a public route)

**Purpose:** Eyeball a handful of archetypes in a real browser via lottie-web before P5 wiring. Deleted at the end of P4.

- [ ] **Step 1: Write the preview page**

```astro
---
import { resolveAnimation } from "~/english/animations/archetype-map";
import type { GrammarTopic } from "~/english/grammar-types";
const samples: Array<Pick<GrammarTopic, "id" | "archetype" | "archetypeParams">> = [
  { id: "timeline", archetype: "timeline", archetypeParams: { labels: ["before", "when", "while", "after", "until"] } },
  { id: "slot-fill", archetype: "slot-fill", archetypeParams: { labels: ["Subject", "Verb", "Object"] } },
  { id: "contrast", archetype: "contrast-pair", archetypeParams: { labels: ["PAST SIMPLE", "PRESENT PERFECT"] } },
  { id: "transform", archetype: "transformation", archetypeParams: { labels: ["active", "passive"] } },
  { id: "scale", archetype: "scale", archetypeParams: { labels: ["big", "old", "red", "car"] } },
  { id: "branch", archetype: "branch", archetypeParams: { labels: ["if", "result", "else"] } },
  { id: "swap", archetype: "swap", archetypeParams: { labels: ["Auxiliary", "Subject"] } },
  { id: "map", archetype: "map", archetypeParams: { labels: ["I", "you", "he"], items: ["my", "your", "his"] } },
  { id: "highlight", archetype: "highlight", archetypeParams: { labels: ["She", "works", "here"] } },
];
const docs = samples.map((s) => ({ id: s.id, doc: resolveAnimation(s as GrammarTopic)!.doc() }));
---
<html><head><meta charset="utf-8" /><title>anim preview</title>
<style>body{font-family:system-ui;background:#eef0f4;margin:0;padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px}.c{background:#fff;border-radius:12px;padding:12px}.c h2{font-size:13px;margin:0 0 8px}.lot{width:100%;aspect-ratio:800/450}</style>
</head><body>
{docs.map((d) => <div class="c"><h2>{d.id}</h2><div class="lot" id={`a-${d.id}`}></div></div>)}
<script src="https://unpkg.com/lottie-web@5.12.2/build/player/lottie.min.js" is:inline></script>
<script is:inline define:vars={{ docs }}>
  for (const d of docs) lottie.loadAnimation({ container: document.getElementById("a-" + d.id), renderer: "svg", loop: true, autoplay: true, animationData: d.doc });
</script>
</body></html>
```

> If `lottie` is undefined at run time, ensure the loader `<script src>` precedes the init script (it does above). Throwaway page — do not over-engineer.

- [ ] **Step 2: Build, verify in a browser**

Run (in `site/`): `bun run build`
Then `bunx serve dist` and visit `/_anim-preview` (or open `dist/_anim-preview/index.html`). Confirm all 9 archetypes render a non-blank, looping animation with legible labels. Report findings.

- [ ] **Step 3: If a generator looks wrong, fix it in `builder.ts`/the generator**

Adjust the relevant scene primitive (positions, timing, sizes), re-run its unit test, rebuild. Keep fixes in `builder.ts`/the generator, never the preview page.

- [ ] **Step 4: Delete the preview page + commit**

```bash
git rm site/src/pages/_anim-preview.astro
git commit -m "chore(english): drop throwaway anim-preview page"
```

---

### Task 7: Full build + final review

- [ ] **Step 1: Full build (lint + all pages)**

Run (in `site/`): `bun run build`
Expected: ~5531 pages, lint clean (0/0). Animations are not yet mounted on public pages (P5), so page count is unchanged; this confirms types compile and nothing regressed.

- [ ] **Step 2: Full test suite**

Run (in `site/`): `bun run test`
Expected: previous green count + the new animation tests (builder 5, archetypes 45, archetype-map 5, GrammarAnimation 3) all pass.

- [ ] **Step 3: Final code review**

Dispatch a code-quality review over the diff (`builder.ts` correctness, generator determinism, player cleanup/leak safety, gate coverage). Address CRITICAL/HIGH findings.

- [ ] **Step 4: Update project memory**

Append the P4 outcome to `~/.claude/projects/-Users-artemmac-dev-awesome-everything/memory/project_english-grammar-system-2026-06-15.md` (generators shipped, gate green, player built, P5 = wiring into UI surfaces). Update the MEMORY.md hook line.

---

## Self-Review

**Spec coverage:** P4 spec items — parametric archetypes (Task 2 ✓), archetype-map with alias resolution (Task 3 ✓), lottie-web dynamic-import `client:visible` player (Task 4 ✓), reduced-motion poster (Task 4 ✓), one island/topic within hydration cap (Task 4 — single island; P5 enforces the cap at mount), build gate mirroring verify:samples/audit:grammar (Task 5 ✓). Keystones explicitly deferred (stated in goal). text-to-lottie skill dropped with rationale (stated in goal).

**Type consistency:** `AnimParams = { labels: string[]; items?: string[] }` used in generators (inline) and re-exported from `archetype-map.ts`; `LottieDoc` is the single doc type from `lottie-types.ts`; `resolveAnimation` returns `{ archetype, doc: () => LottieDoc }` and is consumed identically in the gate, the P5 caller, and the preview page. Builder names referenced in tests (`axisScene`, `nodeRowScene`, `twoBoxScene`, `transformScene`, `branchScene`, `swapScene`, `mapScene`, `highlightScene`, `doc`, `reveal`, `st`) match Task 1 definitions.

**Placeholder scan:** no TBD/TODO; every code step has complete code. The two "mirror the existing idiom" notes (gate root resolution; island test render util) point at named existing files to grep — correct for an unfamiliar codebase, not placeholders.

**Risks called out inline:** bun root-resolution idiom (Task 5 note), island test util import (Task 4 Step 4 note), `is:inline` loader ordering (Task 6 note).
